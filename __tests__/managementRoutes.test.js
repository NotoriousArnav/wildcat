const express = require('express');
const { createManagementRoutes } = require('../managementRoutes');
const { createAccountRouter } = require('../accountRouter');
const { appLogger } = require('../logger');
const { connectToDB } = require('../db');
const { GridFSBucket, ObjectId } = require('mongodb');

jest.mock('express');
jest.mock('../accountRouter');
jest.mock('../logger');
jest.mock('../db');
jest.mock('mongodb');

describe('Management Routes Module', () => {
  let mockRouter;
  let mockAccountManager;
  let mockSocketManager;
  let mockApp;
  let mockLogger;
  let mockDb;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };

    appLogger.mockReturnValue(mockLogger);

    mockRouter = {
      post: jest.fn(),
      get: jest.fn(),
      delete: jest.fn()
    };

    express.Router = jest.fn(() => mockRouter);

    mockAccountManager = {
      createAccount: jest.fn(),
      listAccounts: jest.fn(),
      getAccount: jest.fn(),
      deleteAccount: jest.fn()
    };

    mockSocketManager = {
      createSocket: jest.fn(),
      getSocket: jest.fn(),
      getAllSockets: jest.fn(),
      removeSocket: jest.fn(),
      deleteAccountData: jest.fn()
    };

    mockApp = {
      use: jest.fn()
    };

    mockDb = {
      collection: jest.fn()
    };

    connectToDB.mockResolvedValue(mockDb);
    createAccountRouter.mockReturnValue({});
  });

  describe('createManagementRoutes', () => {
    it('should create and return express router', () => {
      const router = createManagementRoutes(mockAccountManager, mockSocketManager, mockApp);
      
      expect(express.Router).toHaveBeenCalled();
      expect(router).toBe(mockRouter);
    });

    it('should create app logger with management context', () => {
      createManagementRoutes(mockAccountManager, mockSocketManager, mockApp);
      
      expect(appLogger).toHaveBeenCalledWith('management');
    });

    it('should register POST /accounts route', () => {
      createManagementRoutes(mockAccountManager, mockSocketManager, mockApp);
      
      expect(mockRouter.post).toHaveBeenCalledWith('/accounts', expect.any(Function));
    });

    it('should register GET /accounts route', () => {
      createManagementRoutes(mockAccountManager, mockSocketManager, mockApp);
      
      expect(mockRouter.get).toHaveBeenCalledWith('/accounts', expect.any(Function));
    });

    it('should register GET /accounts/:accountId route', () => {
      createManagementRoutes(mockAccountManager, mockSocketManager, mockApp);
      
      expect(mockRouter.get).toHaveBeenCalledWith('/accounts/:accountId', expect.any(Function));
    });

    it('should register DELETE /accounts/:accountId route', () => {
      createManagementRoutes(mockAccountManager, mockSocketManager, mockApp);
      
      expect(mockRouter.delete).toHaveBeenCalledWith('/accounts/:accountId', expect.any(Function));
    });

    it('should register GET /ping route', () => {
      createManagementRoutes(mockAccountManager, mockSocketManager, mockApp);
      
      expect(mockRouter.get).toHaveBeenCalledWith('/ping', expect.any(Function));
    });

    it('should register POST /webhooks route', () => {
      createManagementRoutes(mockAccountManager, mockSocketManager, mockApp);
      
      expect(mockRouter.post).toHaveBeenCalledWith('/webhooks', expect.any(Function));
    });

    it('should register GET /messages route', () => {
      createManagementRoutes(mockAccountManager, mockSocketManager, mockApp);
      
      expect(mockRouter.get).toHaveBeenCalledWith('/messages', expect.any(Function));
    });

    it('should register GET /media route', () => {
      createManagementRoutes(mockAccountManager, mockSocketManager, mockApp);
      
      expect(mockRouter.get).toHaveBeenCalledWith('/media', expect.any(Function));
    });

    it('should register GET /media/:id route', () => {
      createManagementRoutes(mockAccountManager, mockSocketManager, mockApp);
      
      expect(mockRouter.get).toHaveBeenCalledWith('/media/:id', expect.any(Function));
    });
  });

  describe('POST /accounts handler', () => {
    let handler, req, res;

    beforeEach(() => {
      createManagementRoutes(mockAccountManager, mockSocketManager, mockApp);
      handler = mockRouter.post.mock.calls.find(call => call[0] === '/accounts')[1];

      req = { body: {} };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
    });

    it('should return 400 when id is missing', async () => {
      req.body = { name: 'Test' };
      
      await handler(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'id is required'
      });
    });

    it('should create account successfully', async () => {
      req.body = { id: 'test-account', name: 'Test Account' };
      const mockAccount = { _id: 'test-account', name: 'Test Account', collectionName: 'auth_test-account' };
      
      mockAccountManager.createAccount.mockResolvedValue(mockAccount);
      mockSocketManager.createSocket.mockResolvedValue({});
      
      await handler(req, res);
      
      expect(mockAccountManager.createAccount).toHaveBeenCalledWith('test-account', 'Test Account', undefined);
      expect(createAccountRouter).toHaveBeenCalledWith('test-account', mockSocketManager);
      expect(mockApp.use).toHaveBeenCalledWith('/accounts/test-account', {});
      expect(mockSocketManager.createSocket).toHaveBeenCalledWith('test-account', 'auth_test-account');
      expect(mockLogger.info).toHaveBeenCalledWith('account_created', { accountId: 'test-account' });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ ok: true, account: mockAccount });
    });

    it('should handle account creation errors', async () => {
      req.body = { id: 'test-account' };
      mockAccountManager.createAccount.mockRejectedValue(new Error('Account exists'));
      
      await handler(req, res);
      
      expect(mockLogger.error).toHaveBeenCalledWith('account_create_error', { error: 'Account exists' });
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'Account exists' });
    });

    it('should use custom collectionName when provided', async () => {
      req.body = { id: 'test-account', name: 'Test', collectionName: 'custom_auth' };
      mockAccountManager.createAccount.mockResolvedValue({ _id: 'test-account', collectionName: 'custom_auth' });
      mockSocketManager.createSocket.mockResolvedValue({});
      
      await handler(req, res);
      
      expect(mockAccountManager.createAccount).toHaveBeenCalledWith('test-account', 'Test', 'custom_auth');
      expect(mockSocketManager.createSocket).toHaveBeenCalledWith('test-account', 'custom_auth');
    });
  });

  describe('GET /accounts handler', () => {
    let handler, req, res;

    beforeEach(() => {
      createManagementRoutes(mockAccountManager, mockSocketManager, mockApp);
      handler = mockRouter.get.mock.calls.find(call => call[0] === '/accounts')[1];

      req = {};
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
    });

    it('should list all accounts with current status', async () => {
      const accounts = [
        { _id: 'acc1', name: 'Account 1' },
        { _id: 'acc2', name: 'Account 2' }
      ];
      const sockets = [
        { id: 'acc1', status: 'connected', qr: null },
        { id: 'acc2', status: 'connecting', qr: 'qr-code' }
      ];
      
      mockAccountManager.listAccounts.mockResolvedValue(accounts);
      mockSocketManager.getAllSockets.mockReturnValue(sockets);
      
      await handler(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        accounts: [
          { _id: 'acc1', name: 'Account 1', currentStatus: 'connected', hasQR: false },
          { _id: 'acc2', name: 'Account 2', currentStatus: 'connecting', hasQR: true }
        ]
      });
    });

    it('should mark accounts as not_started when socket not found', async () => {
      const accounts = [{ _id: 'acc1', name: 'Account 1' }];
      
      mockAccountManager.listAccounts.mockResolvedValue(accounts);
      mockSocketManager.getAllSockets.mockReturnValue([]);
      
      await handler(req, res);
      
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        accounts: [{ _id: 'acc1', name: 'Account 1', currentStatus: 'not_started', hasQR: false }]
      });
    });

    it('should handle list errors', async () => {
      mockAccountManager.listAccounts.mockRejectedValue(new Error('DB error'));
      
      await handler(req, res);
      
      expect(mockLogger.error).toHaveBeenCalledWith('accounts_list_error', { error: 'DB error' });
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'internal_error' });
    });
  });

  describe('GET /ping handler', () => {
    let handler, req, res;

    beforeEach(() => {
      createManagementRoutes(mockAccountManager, mockSocketManager, mockApp);
      handler = mockRouter.get.mock.calls.find(call => call[0] === '/ping')[1];

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

  describe('DELETE /accounts/:accountId handler', () => {
    let handler, req, res;

    beforeEach(() => {
      createManagementRoutes(mockAccountManager, mockSocketManager, mockApp);
      handler = mockRouter.delete.mock.calls.find(call => call[0] === '/accounts/:accountId')[1];

      req = { params: {} };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
    });

    it('should delete account successfully', async () => {
      req.params = { accountId: 'test-account' };
      mockAccountManager.deleteAccount.mockResolvedValue('auth_test-account');
      mockSocketManager.deleteAccountData.mockResolvedValue(undefined);
      mockSocketManager.removeSocket.mockResolvedValue(undefined);
      
      const mockCollection = {
        drop: jest.fn().mockResolvedValue(true)
      };
      mockDb.collection.mockReturnValue(mockCollection);
      
      await handler(req, res);
      
      expect(mockSocketManager.deleteAccountData).toHaveBeenCalledWith('test-account');
      expect(mockSocketManager.removeSocket).toHaveBeenCalledWith('test-account');
      expect(mockAccountManager.deleteAccount).toHaveBeenCalledWith('test-account');
      expect(mockDb.collection).toHaveBeenCalledWith('auth_test-account');
      expect(mockCollection.drop).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('collection_dropped', { collectionName: 'auth_test-account' });
      expect(mockLogger.info).toHaveBeenCalledWith('account_deleted', { accountId: 'test-account' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Account deleted',
        deletedCollection: 'auth_test-account'
      });
    });

    it('should handle collection drop errors gracefully', async () => {
      req.params = { accountId: 'test-account' };
      mockAccountManager.deleteAccount.mockResolvedValue('auth_test-account');
      
      const mockCollection = {
        drop: jest.fn().mockRejectedValue(new Error('Collection not found'))
      };
      mockDb.collection.mockReturnValue(mockCollection);
      
      await handler(req, res);
      
      expect(mockLogger.info).toHaveBeenCalledWith('collection_drop_not_required', { collectionName: 'auth_test-account' });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle deletion errors', async () => {
      req.params = { accountId: 'test-account' };
      mockSocketManager.deleteAccountData.mockRejectedValue(new Error('Delete error'));
      
      await handler(req, res);
      
      expect(mockLogger.error).toHaveBeenCalledWith('account_delete_error', { accountId: 'test-account', error: 'Delete error' });
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'internal_error' });
    });
  });

  describe('POST /webhooks handler', () => {
    let handler, req, res;

    beforeEach(() => {
      createManagementRoutes(mockAccountManager, mockSocketManager, mockApp);
      handler = mockRouter.post.mock.calls.find(call => call[0] === '/webhooks')[1];

      req = { body: {} };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
    });

    it('should validate URL is required', async () => {
      req.body = {};
      
      await handler(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'url is required and must be a string'
      });
    });

    it('should register webhook and log', async () => {
      req.body = { url: 'https://example.com/webhook' };
      
      const mockCollection = {
        updateOne: jest.fn().mockResolvedValue({
          upsertedId: 'new-id',
          upsertedCount: 1
        })
      };
      
      mockDb.collection.mockReturnValue(mockCollection);
      
      await handler(req, res);
      
      expect(mockLogger.info).toHaveBeenCalledWith('webhook_registered', { url: 'https://example.com/webhook', created: true });
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('GET /messages handler', () => {
    let handler, req, res;

    beforeEach(() => {
      createManagementRoutes(mockAccountManager, mockSocketManager, mockApp);
      handler = mockRouter.get.mock.calls.find(call => call[0] === '/messages')[1];

      req = { query: {} };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
    });

    it('should list messages with pagination', async () => {
      const mockMessages = [{ messageId: 'msg1' }, { messageId: 'msg2' }];
      const mockCollection = {
        find: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockMessages),
        countDocuments: jest.fn().mockResolvedValue(100)
      };
      
      mockDb.collection.mockReturnValue(mockCollection);
      
      await handler(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        messages: mockMessages,
        pagination: {
          skip: 0,
          limit: 50,
          total: 100,
          hasMore: true
        }
      });
    });

    it('should filter by accountId when provided', async () => {
      req.query = { accountId: 'test-account' };
      
      const mockCollection = {
        find: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
        countDocuments: jest.fn().mockResolvedValue(0)
      };
      
      mockDb.collection.mockReturnValue(mockCollection);
      
      await handler(req, res);
      
      expect(mockCollection.find).toHaveBeenCalledWith({ accountId: 'test-account' });
    });

    it('should respect limit parameter', async () => {
      req.query = { limit: '100' };
      
      const mockCollection = {
        find: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
        countDocuments: jest.fn().mockResolvedValue(0)
      };
      
      mockDb.collection.mockReturnValue(mockCollection);
      
      await handler(req, res);
      
      expect(mockCollection.limit).toHaveBeenCalledWith(100);
    });

    it('should cap limit at 500', async () => {
      req.query = { limit: '1000' };
      
      const mockCollection = {
        find: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
        countDocuments: jest.fn().mockResolvedValue(0)
      };
      
      mockDb.collection.mockReturnValue(mockCollection);
      
      await handler(req, res);
      
      expect(mockCollection.limit).toHaveBeenCalledWith(500);
    });

    it('should handle errors with structured logging', async () => {
      connectToDB.mockRejectedValue(new Error('DB error'));
      
      await handler(req, res);
      
      expect(mockLogger.error).toHaveBeenCalledWith('messages_list_error', { error: 'DB error' });
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});