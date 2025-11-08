const SocketManager = require('../socketManager');
const makeWASocket = require('@whiskeysockets/baileys').default;
const { DisconnectReason } = require('@whiskeysockets/baileys');
const useMongoDBAuthState = require('../mongoAuthState');
const { connectToDB } = require('../db');
const { wireSocketLogging, appLogger } = require('../logger');
const MediaHandler = require('../mediaHandler');

jest.mock('@whiskeysockets/baileys');
jest.mock('../mongoAuthState');
jest.mock('../db');
jest.mock('../logger');
jest.mock('../mediaHandler');
jest.mock('qrcode-terminal');

describe('SocketManager', () => {
  let socketManager;
  let mockDb;
  let mockMediaHandler;
  let mockLogger;
  let mockSocket;
  let mockCollection;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };

    appLogger.mockReturnValue(mockLogger);
    wireSocketLogging.mockImplementation(() => {});

    mockCollection = {
      updateOne: jest.fn().mockResolvedValue({}),
      findOne: jest.fn(),
      find: jest.fn(),
      drop: jest.fn(),
      insertOne: jest.fn()
    };

    mockDb = {
      collection: jest.fn(() => mockCollection)
    };

    connectToDB.mockResolvedValue(mockDb);

    mockMediaHandler = {
      hasMedia: jest.fn(() => false),
      downloadAndStoreMedia: jest.fn(),
      extractQuotedMessage: jest.fn(() => null),
      extractMentions: jest.fn(() => []),
      getMediaUrl: jest.fn()
    };

    MediaHandler.mockImplementation(() => mockMediaHandler);

    mockSocket = {
      ev: {
        on: jest.fn()
      },
      sendMessage: jest.fn(),
      logout: jest.fn(),
      updateMediaMessage: jest.fn(),
      loadMessage: jest.fn()
    };

    makeWASocket.mockReturnValue(mockSocket);

    useMongoDBAuthState.mockResolvedValue({
      state: { creds: {} },
      saveCreds: jest.fn()
    });

    socketManager = new SocketManager();
  });

  describe('constructor', () => {
    it('should initialize with empty sockets map', () => {
      expect(socketManager.sockets).toBeInstanceOf(Map);
      expect(socketManager.sockets.size).toBe(0);
    });

    it('should initialize db and mediaHandler as null', () => {
      expect(socketManager.db).toBeNull();
      expect(socketManager.mediaHandler).toBeNull();
    });
  });

  describe('init', () => {
    it('should connect to database', async () => {
      await socketManager.init();

      expect(connectToDB).toHaveBeenCalled();
      expect(socketManager.db).toBe(mockDb);
    });

    it('should initialize media handler', async () => {
      await socketManager.init();

      expect(MediaHandler).toHaveBeenCalledWith(mockDb);
      expect(socketManager.mediaHandler).toBe(mockMediaHandler);
    });
  });

  describe('createSocket', () => {
    beforeEach(async () => {
      await socketManager.init();
    });

    it('should return existing socket if already created', async () => {
      const accountId = 'test-account';
      const existingSocket = { socket: {}, status: 'connected' };
      socketManager.sockets.set(accountId, existingSocket);

      const result = await socketManager.createSocket(accountId);

      expect(result).toBe(existingSocket);
      expect(makeWASocket).not.toHaveBeenCalled();
    });

    it('should create new socket for account', async () => {
      const accountId = 'test-account';

      await socketManager.createSocket(accountId);

      expect(makeWASocket).toHaveBeenCalledWith({
        auth: { creds: {} },
        syncFullHistory: true
      });
      expect(socketManager.sockets.has(accountId)).toBe(true);
    });

    it('should use custom collection name', async () => {
      const accountId = 'test-account';
      const collectionName = 'custom_auth';

      await socketManager.createSocket(accountId, collectionName);

      expect(mockDb.collection).toHaveBeenCalledWith('custom_auth');
      const socketInfo = socketManager.sockets.get(accountId);
      expect(socketInfo.collection).toBe('custom_auth');
    });

    it('should use default collection name pattern', async () => {
      const accountId = 'test-account';

      await socketManager.createSocket(accountId);

      expect(mockDb.collection).toHaveBeenCalledWith('auth_test-account');
    });

    it('should wire socket logging', async () => {
      const accountId = 'test-account';

      await socketManager.createSocket(accountId);

      expect(wireSocketLogging).toHaveBeenCalledWith(mockSocket);
    });

    it('should set initial socket status to connecting', async () => {
      const accountId = 'test-account';

      await socketManager.createSocket(accountId);

      const socketInfo = socketManager.sockets.get(accountId);
      expect(socketInfo.status).toBe('connecting');
      expect(socketInfo.qr).toBeNull();
      expect(socketInfo.lastDisconnect).toBeNull();
    });

    it('should attach connection.update listener', async () => {
      const accountId = 'test-account';

      await socketManager.createSocket(accountId);

      expect(mockSocket.ev.on).toHaveBeenCalledWith('connection.update', expect.any(Function));
    });

    it('should attach creds.update listener', async () => {
      const accountId = 'test-account';

      await socketManager.createSocket(accountId);

      expect(mockSocket.ev.on).toHaveBeenCalledWith('creds.update', expect.any(Function));
    });

    it('should attach messages.upsert listener', async () => {
      const accountId = 'test-account';

      await socketManager.createSocket(accountId);

      expect(mockSocket.ev.on).toHaveBeenCalledWith('messages.upsert', expect.any(Function));
    });
  });

  describe('connection lifecycle', () => {
    let connectionUpdateHandler;
    let accountId;

    beforeEach(async () => {
      accountId = 'test-account';
      await socketManager.init();
      await socketManager.createSocket(accountId);

      connectionUpdateHandler = mockSocket.ev.on.mock.calls.find(
        call => call[0] === 'connection.update'
      )[1];
    });

    it('should update status on connection open', async () => {
      await connectionUpdateHandler({ connection: 'open' });

      const socketInfo = socketManager.sockets.get(accountId);
      expect(socketInfo.status).toBe('connected');
      expect(mockLogger.info).toHaveBeenCalledWith('account_connected', { accountId });
    });

    it('should update account status in database on connection', async () => {
      await connectionUpdateHandler({ connection: 'open' });

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: accountId },
        { $set: { status: 'connected', updatedAt: expect.any(Date) } }
      );
    });

    it('should log QR code generation', async () => {
      const qr = 'test-qr-code';
      await connectionUpdateHandler({ qr });

      const socketInfo = socketManager.sockets.get(accountId);
      expect(socketInfo.qr).toBe(qr);
      expect(mockLogger.info).toHaveBeenCalledWith('qr_generated', { accountId });
    });

    it('should handle connection close with reconnect', async () => {
      jest.useFakeTimers();

      await connectionUpdateHandler({
        connection: 'close',
        lastDisconnect: {
          error: {
            output: { statusCode: 500 }
          }
        }
      });

      expect(socketManager.sockets.has(accountId)).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith('reconnecting_account', { accountId, delaySeconds: 5 });

      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      jest.useRealTimers();
    });

    it('should handle logout disconnect', async () => {
      await connectionUpdateHandler({
        connection: 'close',
        lastDisconnect: {
          error: {
            output: { statusCode: DisconnectReason.loggedOut }
          }
        }
      });

      const socketInfo = socketManager.sockets.get(accountId);
      expect(socketInfo.status).toBe('logged_out');
      expect(mockLogger.info).toHaveBeenCalledWith('account_logged_out', { accountId });
    });

    it('should update status to connecting', async () => {
      await connectionUpdateHandler({ connection: 'connecting' });

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: accountId },
        { $set: { status: 'connecting', updatedAt: expect.any(Date) } }
      );
    });

    it('should send admin notification on connection', async () => {
      process.env.ADMIN_NUMBER = '+1234567890@s.whatsapp.net';

      await connectionUpdateHandler({ connection: 'open' });

      expect(mockSocket.sendMessage).toHaveBeenCalledWith(
        '+1234567890@s.whatsapp.net',
        expect.objectContaining({
          text: expect.stringContaining('connected successfully')
        })
      );

      delete process.env.ADMIN_NUMBER;
    });
  });

  describe('message processing', () => {
    let messagesUpsertHandler;
    let accountId;

    beforeEach(async () => {
      accountId = 'test-account';
      await socketManager.init();
      await socketManager.createSocket(accountId);

      messagesUpsertHandler = mockSocket.ev.on.mock.calls.find(
        call => call[0] === 'messages.upsert'
      )[1];
    });

    it('should ignore non-notify messages', async () => {
      await messagesUpsertHandler({ type: 'append', messages: [{}] });

      expect(mockCollection.insertOne).not.toHaveBeenCalled();
    });

    it('should process notify messages', async () => {
      const message = {
        key: { id: 'msg1', remoteJid: 'chat1', fromMe: false },
        messageTimestamp: 1234567890,
        message: { conversation: 'Hello' }
      };

      mockCollection.find = jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([])
      });

      await messagesUpsertHandler({ type: 'notify', messages: [message] });

      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId,
          messageId: 'msg1',
          chatId: 'chat1',
          type: 'text'
        })
      );
    });

    it('should extract text content from message', async () => {
      const message = {
        key: { id: 'msg1', remoteJid: 'chat1', fromMe: false },
        messageTimestamp: 1234567890,
        message: { conversation: 'Test message' }
      };

      socketManager._extractTextContent = jest.fn(() => 'Test message');
      mockCollection.find = jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([])
      });

      await messagesUpsertHandler({ type: 'notify', messages: [message] });

      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Test message'
        })
      );
    });

    it('should handle media messages', async () => {
      const message = {
        key: { id: 'msg1', remoteJid: 'chat1', fromMe: false },
        messageTimestamp: 1234567890,
        message: { imageMessage: { caption: 'Image' } }
      };

      mockMediaHandler.hasMedia.mockReturnValue(true);
      mockMediaHandler.downloadAndStoreMedia.mockResolvedValue({
        mediaType: 'image',
        gridFsId: 'gridfs123',
        size: 12345,
        mimetype: 'image/jpeg',
        fileName: 'image.jpg'
      });
      mockMediaHandler.getMediaUrl.mockReturnValue('/media/msg1');

      mockCollection.find = jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([])
      });

      await messagesUpsertHandler({ type: 'notify', messages: [message] });

      expect(mockMediaHandler.downloadAndStoreMedia).toHaveBeenCalledWith(
        message,
        accountId,
        mockSocket.updateMediaMessage
      );

      expect(mockLogger.info).toHaveBeenCalledWith('media_stored', {
        accountId,
        messageId: 'msg1',
        mediaType: 'image'
      });
    });

    it('should handle media download errors', async () => {
      const message = {
        key: { id: 'msg1', remoteJid: 'chat1', fromMe: false },
        messageTimestamp: 1234567890,
        message: { imageMessage: {} }
      };

      mockMediaHandler.hasMedia.mockReturnValue(true);
      mockMediaHandler.downloadAndStoreMedia.mockRejectedValue(new Error('Download failed'));

      mockCollection.find = jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([])
      });

      await messagesUpsertHandler({ type: 'notify', messages: [message] });

      expect(mockLogger.error).toHaveBeenCalledWith('media_download_failed', {
        accountId,
        messageId: 'msg1',
        error: 'Download failed'
      });
    });

    it('should handle message processing errors', async () => {
      const message = {
        key: { id: 'msg1', remoteJid: 'chat1', fromMe: false },
        messageTimestamp: 1234567890
      };

      mockCollection.insertOne.mockRejectedValue(new Error('Insert failed'));
      mockCollection.find = jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([])
      });

      await messagesUpsertHandler({ type: 'notify', messages: [message] });

      expect(mockLogger.error).toHaveBeenCalledWith('message_processing_error', {
        accountId,
        messageId: 'msg1',
        error: 'Insert failed'
      });
    });
  });

  describe('getSocket', () => {
    it('should return socket info for account', async () => {
      const accountId = 'test-account';
      await socketManager.init();
      await socketManager.createSocket(accountId);

      const result = socketManager.getSocket(accountId);

      expect(result).toBeDefined();
      expect(result.socket).toBe(mockSocket);
    });

    it('should return undefined for non-existent account', () => {
      const result = socketManager.getSocket('non-existent');

      expect(result).toBeUndefined();
    });
  });

  describe('getAllSockets', () => {
    it('should return array of socket info', async () => {
      await socketManager.init();
      await socketManager.createSocket('acc1');
      await socketManager.createSocket('acc2');

      const result = socketManager.getAllSockets();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('status');
      expect(result[0]).toHaveProperty('qr');
      expect(result[0]).toHaveProperty('collection');
    });

    it('should return empty array when no sockets', () => {
      const result = socketManager.getAllSockets();

      expect(result).toEqual([]);
    });
  });

  describe('removeSocket', () => {
    it('should logout and remove socket', async () => {
      const accountId = 'test-account';
      await socketManager.init();
      await socketManager.createSocket(accountId);

      await socketManager.removeSocket(accountId);

      expect(mockSocket.logout).toHaveBeenCalled();
      expect(socketManager.sockets.has(accountId)).toBe(false);
    });

    it('should handle logout errors', async () => {
      const accountId = 'test-account';
      await socketManager.init();
      await socketManager.createSocket(accountId);

      mockSocket.logout.mockRejectedValue(new Error('Logout failed'));

      await socketManager.removeSocket(accountId);

      expect(mockLogger.error).toHaveBeenCalledWith('logout_error', {
        accountId,
        error: 'Logout failed'
      });
      expect(socketManager.sockets.has(accountId)).toBe(false);
    });

    it('should do nothing if socket does not exist', async () => {
      await socketManager.removeSocket('non-existent');

      expect(mockSocket.logout).not.toHaveBeenCalled();
    });
  });

  describe('deleteAccountData', () => {
    it('should drop auth collection', async () => {
      const accountId = 'test-account';
      await socketManager.init();
      await socketManager.createSocket(accountId, 'auth_test');

      await socketManager.deleteAccountData(accountId);

      expect(mockDb.collection).toHaveBeenCalledWith('auth_test');
      expect(mockCollection.drop).toHaveBeenCalled();
    });

    it('should do nothing if socket does not exist', async () => {
      await socketManager.init();
      await socketManager.deleteAccountData('non-existent');

      expect(mockCollection.drop).not.toHaveBeenCalled();
    });
  });

  describe('_extractTextContent', () => {
    it('should extract conversation text', () => {
      const message = {
        message: { conversation: 'Hello' }
      };

      const result = socketManager._extractTextContent(message);

      expect(result).toBe('Hello');
    });

    it('should extract extended text message', () => {
      const message = {
        message: { extendedTextMessage: { text: 'Extended' } }
      };

      const result = socketManager._extractTextContent(message);

      expect(result).toBe('Extended');
    });

    it('should extract image caption', () => {
      const message = {
        message: { imageMessage: { caption: 'Image caption' } }
      };

      const result = socketManager._extractTextContent(message);

      expect(result).toBe('Image caption');
    });

    it('should extract video caption', () => {
      const message = {
        message: { videoMessage: { caption: 'Video caption' } }
      };

      const result = socketManager._extractTextContent(message);

      expect(result).toBe('Video caption');
    });

    it('should extract document caption', () => {
      const message = {
        message: { documentMessage: { caption: 'Document caption' } }
      };

      const result = socketManager._extractTextContent(message);

      expect(result).toBe('Document caption');
    });

    it('should return null for empty message', () => {
      const message = { message: {} };

      const result = socketManager._extractTextContent(message);

      expect(result).toBeNull();
    });

    it('should return null when message is undefined', () => {
      const message = {};

      const result = socketManager._extractTextContent(message);

      expect(result).toBeNull();
    });
  });
});