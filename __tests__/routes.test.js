const { routes } = require('../routes');
const { appLogger } = require('../logger');
const { connectToDB } = require('../db');
const { GridFSBucket, ObjectId } = require('mongodb');

jest.mock('../logger');
jest.mock('../db');
jest.mock('mongodb');

describe('Routes Module', () => {
  let mockLogger;
  let mockDb;
  let mockBucket;
  let mockStream;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };
    
    appLogger.mockReturnValue(mockLogger);
    
    mockStream = {
      pipe: jest.fn()
    };
    
    mockBucket = {
      find: jest.fn(),
      openDownloadStream: jest.fn(() => mockStream)
    };
    
    mockDb = {
      collection: jest.fn()
    };
    
    connectToDB.mockResolvedValue(mockDb);
    GridFSBucket.mockImplementation(() => mockBucket);
  });

  describe('routes structure', () => {
    it('should export routes array', () => {
      expect(Array.isArray(routes)).toBe(true);
    });

    it('should have correct route definitions', () => {
      expect(routes.length).toBeGreaterThan(0);
      
      routes.forEach(route => {
        expect(route).toHaveProperty('method');
        expect(route).toHaveProperty('path');
        expect(route).toHaveProperty('handler');
        expect(typeof route.handler).toBe('function');
      });
    });

    it('should include POST /message/send route', () => {
      const sendRoute = routes.find(r => r.path === '/message/send' && r.method === 'post');
      expect(sendRoute).toBeDefined();
    });

    it('should include GET /ping route', () => {
      const pingRoute = routes.find(r => r.path === '/ping' && r.method === 'get');
      expect(pingRoute).toBeDefined();
    });

    it('should include POST /webhooks route', () => {
      const webhooksRoute = routes.find(r => r.path === '/webhooks' && r.method === 'post');
      expect(webhooksRoute).toBeDefined();
    });

    it('should include GET /files/:id route', () => {
      const filesRoute = routes.find(r => r.path === '/files/:id' && r.method === 'get');
      expect(filesRoute).toBeDefined();
    });
  });

  describe('sendMessage handler', () => {
    let handler, req, res;

    beforeEach(() => {
      const sendRoute = routes.find(r => r.path === '/message/send');
      handler = sendRoute.handler;

      req = {
        app: {
          locals: {
            whatsapp_socket: {
              sendMessage: jest.fn()
            }
          }
        },
        body: {}
      };

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
    });

    it('should return 400 when to is missing', async () => {
      req.body = { message: 'test' };
      
      await handler(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'to and message are required'
      });
    });

    it('should return 400 when message is missing', async () => {
      req.body = { to: '1234567890@s.whatsapp.net' };
      
      await handler(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'to and message are required'
      });
    });

    it('should return 400 when both to and message are missing', async () => {
      req.body = {};
      
      await handler(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should send message successfully', async () => {
      req.body = { to: '1234567890@s.whatsapp.net', message: 'Hello' };
      req.app.locals.whatsapp_socket.sendMessage.mockResolvedValue({
        key: { id: 'msg123' }
      });
      
      await handler(req, res);
      
      expect(req.app.locals.whatsapp_socket.sendMessage).toHaveBeenCalledWith(
        '1234567890@s.whatsapp.net',
        { text: 'Hello' }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        messageId: 'msg123'
      });
    });

    it('should handle socket errors with structured logging', async () => {
      req.body = { to: '1234567890@s.whatsapp.net', message: 'Hello' };
      req.app.locals.whatsapp_socket.sendMessage.mockRejectedValue(
        new Error('Socket error')
      );
      
      await handler(req, res);
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'send_message_error',
        { error: 'Socket error' }
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'internal_error'
      });
    });
  });

  describe('ping handler', () => {
    let handler, req, res;

    beforeEach(() => {
      const pingRoute = routes.find(r => r.path === '/ping');
      handler = pingRoute.handler;

      req = {};
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
    });

    it('should return pong response', () => {
      handler(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          pong: true
        })
      );
    });

    it('should include ISO timestamp', () => {
      handler(req, res);
      
      const jsonCall = res.json.mock.calls[0][0];
      expect(jsonCall.time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('fetchFile handler', () => {
    let handler, req, res;

    beforeEach(() => {
      const filesRoute = routes.find(r => r.path === '/files/:id');
      handler = filesRoute.handler;

      req = {
        params: {}
      };

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        set: jest.fn()
      };
    });

    it('should return 400 when id is missing', async () => {
      req.params = {};
      
      await handler(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'id is required'
      });
    });

    it('should return 404 when file not found', async () => {
      req.params = { id: '507f1f77bcf86cd799439011' };
      mockBucket.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([])
      });
      
      await handler(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'file not found'
      });
    });

    it('should stream file successfully', async () => {
      req.params = { id: '507f1f77bcf86cd799439011' };
      const mockFile = {
        _id: new ObjectId('507f1f77bcf86cd799439011'),
        contentType: 'image/jpeg',
        length: 12345
      };
      
      mockBucket.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([mockFile])
      });
      
      await handler(req, res);
      
      expect(res.set).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
      expect(res.set).toHaveBeenCalledWith('Content-Length', 12345);
      expect(mockBucket.openDownloadStream).toHaveBeenCalledWith(mockFile._id);
      expect(mockStream.pipe).toHaveBeenCalledWith(res);
    });

    it('should use default content type when not specified', async () => {
      req.params = { id: '507f1f77bcf86cd799439011' };
      const mockFile = {
        _id: new ObjectId('507f1f77bcf86cd799439011'),
        length: 12345
      };
      
      mockBucket.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([mockFile])
      });
      
      await handler(req, res);
      
      expect(res.set).toHaveBeenCalledWith('Content-Type', 'application/octet-stream');
    });

    it('should handle database errors with structured logging', async () => {
      req.params = { id: '507f1f77bcf86cd799439011' };
      connectToDB.mockRejectedValue(new Error('DB connection failed'));
      
      await handler(req, res);
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'fetch_file_error',
        { error: 'DB connection failed' }
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'internal_error'
      });
    });
  });

  describe('webhooks handler', () => {
    let handler, req, res;

    beforeEach(() => {
      const webhooksRoute = routes.find(r => r.path === '/webhooks');
      handler = webhooksRoute.handler;

      req = {
        body: {}
      };

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
    });

    it('should return 400 when url is missing', async () => {
      req.body = {};
      
      await handler(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'url is required and must be a string'
      });
    });

    it('should return 400 when url is not a string', async () => {
      req.body = { url: 123 };
      
      await handler(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'url is required and must be a string'
      });
    });

    it('should return 400 for invalid URL format', async () => {
      req.body = { url: 'not-a-valid-url' };
      
      await handler(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'invalid URL'
      });
    });

    it('should return 400 for non-http/https protocols', async () => {
      req.body = { url: 'ftp://example.com' };
      
      await handler(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'only http/https URLs are allowed'
      });
    });

    it('should register new webhook successfully', async () => {
      req.body = { url: 'https://example.com/webhook' };
      
      const mockCollection = {
        updateOne: jest.fn().mockResolvedValue({
          upsertedId: 'new-id',
          upsertedCount: 1
        })
      };
      
      mockDb.collection.mockReturnValue(mockCollection);
      
      await handler(req, res);
      
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { url: 'https://example.com/webhook' },
        { $setOnInsert: expect.objectContaining({ url: 'https://example.com/webhook' }) },
        { upsert: true }
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        url: 'https://example.com/webhook',
        created: true
      });
    });

    it('should return 200 for existing webhook', async () => {
      req.body = { url: 'https://example.com/webhook' };
      
      const mockCollection = {
        updateOne: jest.fn().mockResolvedValue({
          upsertedId: null,
          upsertedCount: 0
        })
      };
      
      mockDb.collection.mockReturnValue(mockCollection);
      
      await handler(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        url: 'https://example.com/webhook',
        created: false
      });
    });

    it('should handle database errors with structured logging', async () => {
      req.body = { url: 'https://example.com/webhook' };
      connectToDB.mockRejectedValue(new Error('DB error'));
      
      await handler(req, res);
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'webhook_register_error',
        { error: 'DB error' }
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'internal_error'
      });
    });

    it('should accept http URLs', async () => {
      req.body = { url: 'http://example.com/webhook' };
      
      const mockCollection = {
        updateOne: jest.fn().mockResolvedValue({
          upsertedId: 'new-id',
          upsertedCount: 1
        })
      };
      
      mockDb.collection.mockReturnValue(mockCollection);
      
      await handler(req, res);
      
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should set createdAt timestamp', async () => {
      req.body = { url: 'https://example.com/webhook' };
      
      const mockCollection = {
        updateOne: jest.fn().mockResolvedValue({
          upsertedId: 'new-id'
        })
      };
      
      mockDb.collection.mockReturnValue(mockCollection);
      
      await handler(req, res);
      
      const updateCall = mockCollection.updateOne.mock.calls[0][1];
      expect(updateCall.$setOnInsert.createdAt).toBeInstanceOf(Date);
    });
  });
});