const { createManagementRoutes } = require('../src/managementRoutes');
const { createAccountRouter } = require('../src/accountRouter');
const { appLogger } = require('../src/logger');
const { connectToDB } = require('../src/db');
const { GridFSBucket, ObjectId } = require('mongodb');

jest.mock('express');
jest.mock('../src/accountRouter');
jest.mock('../src/logger');
jest.mock('../src/db');
jest.mock('mongodb');

describe('Management Routes', () => {
  let express, mockRouter, mockApp, mockAccountManager, mockSocketManager, mockDb, mockLog;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Express router
    express = require('express');
    mockRouter = {
      post: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
      use: jest.fn(),
    };
    express.Router.mockReturnValue(mockRouter);

    // Mock app
    mockApp = {
      use: jest.fn(),
    };

    // Mock logger
    mockLog = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };
    appLogger.mockReturnValue(mockLog);

    // Mock db
    mockDb = {
      collection: jest.fn(),
    };
    connectToDB.mockResolvedValue(mockDb);

    // Mock managers
    mockAccountManager = {
      createAccount: jest.fn(),
      listAccounts: jest.fn(),
      getAccount: jest.fn(),
      deleteAccount: jest.fn(),
    };

    mockSocketManager = {
      createSocket: jest.fn(),
      getAllSockets: jest.fn(),
      getSocket: jest.fn(),
      removeSocket: jest.fn(),
      deleteAccountData: jest.fn(),
    };

    // Mock createAccountRouter
    require('../src/accountRouter').createAccountRouter.mockReturnValue({});
  });

  describe('POST /accounts handler', () => {
    let handler, req, res;

    beforeEach(() => {
      createManagementRoutes(mockAccountManager, mockSocketManager, mockApp);
      handler = mockRouter.post.mock.calls.find(call => call[0] === '/accounts')[1];

      req = { body: { id: 'acc1', name: 'Test Account', collectionName: 'test_col' } };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
    });

    it('should create account successfully', async () => {
      mockAccountManager.createAccount.mockResolvedValue({ _id: 'acc1', name: 'Test Account', collectionName: 'test_col' });
      mockSocketManager.createSocket.mockResolvedValue({});

      await handler(req, res);

      expect(mockAccountManager.createAccount).toHaveBeenCalledWith('acc1', 'Test Account', 'test_col');
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 when id is missing', async () => {
      req.body = {};
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle creation errors', async () => {
      mockAccountManager.createAccount.mockRejectedValue(new Error('Account exists'));
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('GET /accounts handler', () => {
    let handler, req, res;

    beforeEach(() => {
      createManagementRoutes(mockAccountManager, mockSocketManager, mockApp);
      handler = mockRouter.get.mock.calls.find(call => call[0] === '/accounts')[1];

      req = { query: {} };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
    });

    it('should list accounts with status', async () => {
      const mockAccounts = [{ _id: 'acc1', name: 'Account 1' }];
      mockAccountManager.listAccounts.mockResolvedValue(mockAccounts);
      mockSocketManager.getAllSockets.mockReturnValue([{ id: 'acc1', status: 'connected', qr: null }]);

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          accounts: expect.arrayContaining([
            expect.objectContaining({
              _id: 'acc1',
              currentStatus: 'connected',
            }),
          ]),
        })
      );
    });

    it('should handle list errors', async () => {
      mockAccountManager.listAccounts.mockRejectedValue(new Error('DB error'));

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('GET /accounts/:accountId handler', () => {
    let handler, req, res;

    beforeEach(() => {
      createManagementRoutes(mockAccountManager, mockSocketManager, mockApp);
      const getCalls = mockRouter.get.mock.calls;
      const getCall = getCalls.find(call => call[0] === '/accounts/:accountId');
      handler = getCall[1];

      req = { params: { accountId: 'acc1' } };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
    });

    it('should get account by id', async () => {
      mockAccountManager.getAccount.mockResolvedValue({ _id: 'acc1', name: 'Account 1' });
      mockSocketManager.getSocket.mockReturnValue({ status: 'connected', qr: null });

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 when account not found', async () => {
      mockAccountManager.getAccount.mockResolvedValue(null);

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should handle retrieval errors', async () => {
      mockAccountManager.getAccount.mockRejectedValue(new Error('DB error'));

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('DELETE /accounts/:accountId handler', () => {
    let handler, req, res;

    beforeEach(() => {
      createManagementRoutes(mockAccountManager, mockSocketManager, mockApp);
      const deleteCalls = mockRouter.delete.mock.calls;
      const deleteCall = deleteCalls.find(call => call[0] === '/accounts/:accountId');
      handler = deleteCall[1];

      req = { params: { accountId: 'acc1' } };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
    });

    it('should delete account successfully', async () => {
      mockSocketManager.deleteAccountData.mockResolvedValue({});
      mockSocketManager.removeSocket.mockResolvedValue({});
      mockAccountManager.deleteAccount.mockResolvedValue('test_col');
      mockDb.collection.mockReturnValue({
        drop: jest.fn().mockResolvedValue({}),
      });

      await handler(req, res);

      expect(mockSocketManager.deleteAccountData).toHaveBeenCalledWith('acc1');
      expect(mockAccountManager.deleteAccount).toHaveBeenCalledWith('acc1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ ok: true })
      );
    });

    it('should handle deleteAccountData errors', async () => {
      mockSocketManager.deleteAccountData.mockRejectedValue(new Error('Drop error'));
      
      await handler(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should handle deletion errors', async () => {
      mockAccountManager.deleteAccount.mockRejectedValue(new Error('DB error'));
      
      await handler(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('GET /messages handler', () => {
    let handler, req, res;

    beforeEach(() => {
      createManagementRoutes(mockAccountManager, mockSocketManager, mockApp);
      const getCalls = mockRouter.get.mock.calls;
      const messagesCall = getCalls.find(call => call[0] === '/messages');
      handler = messagesCall[1];

      req = { query: {} };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
    });

    it('should list messages with pagination', async () => {
      const mockMessages = [{ messageId: 'msg1' }, { messageId: 'msg2' }];
      mockDb.collection.mockReturnValue({
        find: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockMessages),
        countDocuments: jest.fn().mockResolvedValue(100),
      });

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          messages: mockMessages,
        })
      );
    });

    it('should filter by accountId when provided', async () => {
      req.query = { accountId: 'test-account' };
      const mockCollection = {
        find: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
        countDocuments: jest.fn().mockResolvedValue(0),
      };

      mockDb.collection.mockReturnValue(mockCollection);

      await handler(req, res);

      expect(mockCollection.find).toHaveBeenCalledWith({ accountId: 'test-account' });
    });

    it('should respect limit parameter', async () => {
      req.query = { limit: '10' };
      const mockCollection = {
        find: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
        countDocuments: jest.fn().mockResolvedValue(0),
      };

      mockDb.collection.mockReturnValue(mockCollection);

      await handler(req, res);

      expect(mockCollection.limit).toHaveBeenCalledWith(10);
    });

    it('should cap limit at 500', async () => {
      req.query = { limit: '1000' };
      const mockCollection = {
        find: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
        countDocuments: jest.fn().mockResolvedValue(0),
      };

      mockDb.collection.mockReturnValue(mockCollection);

      await handler(req, res);

      expect(mockCollection.limit).toHaveBeenCalledWith(500);
    });

    it('should handle errors with structured logging', async () => {
      // Mock collection with a failed promise that doesn't trigger unhandled rejection
      const failingCollection = {
        find: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                toArray: jest.fn().mockRejectedValue(new Error('DB error')),
              }),
            }),
          }),
        }),
      };
      
      mockDb.collection.mockReturnValue(failingCollection);

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
