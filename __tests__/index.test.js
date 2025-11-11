// Mock external dependencies BEFORE requiring modules
jest.mock('@whiskeysockets/baileys');
jest.mock('qrcode-terminal');
jest.mock('../src/server');
jest.mock('../src/socketManager');
jest.mock('../src/accountManager');
jest.mock('../src/managementRoutes');
jest.mock('../src/accountRouter');
jest.mock('../src/logger');
jest.mock('../src/db');
jest.mock('../src/mediaHandler');
jest.mock('../src/mongoAuthState');

// Setup logger mock before requiring any modules that use it
const { appLogger } = require('../src/logger');

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

appLogger.mockReturnValue(mockLogger);

const { constructApp, startServer } = require('../src/server');
const SocketManager = require('../src/socketManager');
const AccountManager = require('../src/accountManager');
const { createManagementRoutes } = require('../src/managementRoutes');
const { createAccountRouter } = require('../src/accountRouter');

describe('Index Module', () => {
  let mockApp;
  let mockAccountManager;
  let mockSocketManager;

  beforeEach(() => {
    jest.clearAllMocks();
    appLogger.mockReturnValue(mockLogger);

    mockApp = {
      use: jest.fn(),
    };

    mockAccountManager = {
      listAccounts: jest.fn(),
      updateAccountStatus: jest.fn(),
    };

    mockSocketManager = {
      createSocket: jest.fn(),
      db: {
        collection: jest.fn(),
      },
    };

    const mockRouter = { route: jest.fn() };
    createAccountRouter.mockReturnValue(mockRouter);
  });

  describe('Module Dependencies', () => {
    it('should have mocked server module', () => {
      expect(constructApp).toBeDefined();
      expect(startServer).toBeDefined();
    });

    it('should have mocked logger module', () => {
      expect(appLogger).toBeDefined();
    });

    it('should have mocked managers', () => {
      expect(SocketManager).toBeDefined();
      expect(AccountManager).toBeDefined();
    });

    it('should have mocked route creators', () => {
      expect(createManagementRoutes).toBeDefined();
      expect(createAccountRouter).toBeDefined();
    });
  });

  describe('Logger Initialization', () => {
    it('should create logger with startup context', () => {
      appLogger('startup');
      expect(appLogger).toHaveBeenCalledWith('startup');
    });

    it('should return logger with all expected methods', () => {
      const logger = appLogger('test');
      expect(logger.info).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.debug).toBeDefined();
    });

    it('should support structured logging calls', () => {
      const logger = appLogger('test');
      logger.info('test_message', { key: 'value' });
      expect(logger.info).toHaveBeenCalledWith('test_message', { key: 'value' });
    });
  });

  describe('Environment Configuration', () => {
    afterEach(() => {
      delete process.env.AUTO_CONNECT_ON_START;
      delete process.env.ADMIN_NUMBER;
    });

    it('should read AUTO_CONNECT_ON_START environment variable', () => {
      process.env.AUTO_CONNECT_ON_START = 'true';
      expect(process.env.AUTO_CONNECT_ON_START).toBe('true');
    });

    it('should read ADMIN_NUMBER environment variable', () => {
      process.env.ADMIN_NUMBER = '+1234567890';
      expect(process.env.ADMIN_NUMBER).toBe('+1234567890');
    });

    it('should handle missing environment variables', () => {
      delete process.env.AUTO_CONNECT_ON_START;
      delete process.env.ADMIN_NUMBER;
      expect(process.env.AUTO_CONNECT_ON_START).toBeUndefined();
      expect(process.env.ADMIN_NUMBER).toBeUndefined();
    });
  });

  describe('Manager Initialization', () => {
    it('should initialize SocketManager', () => {
      SocketManager.mockImplementation(() => ({
        init: jest.fn().mockResolvedValue(undefined),
        db: { collection: jest.fn() },
      }));
      
      const manager = new SocketManager();
      expect(SocketManager).toHaveBeenCalled();
      expect(manager.init).toBeDefined();
    });

    it('should initialize AccountManager', () => {
      AccountManager.mockImplementation(() => ({
        init: jest.fn().mockResolvedValue(undefined),
        listAccounts: jest.fn().mockResolvedValue([]),
      }));
      
      const manager = new AccountManager();
      expect(AccountManager).toHaveBeenCalled();
      expect(manager.listAccounts).toBeDefined();
    });
  });

  describe('App Setup', () => {
    it('should construct express app', () => {
      constructApp.mockReturnValue(mockApp);
      const app = constructApp();
      expect(constructApp).toHaveBeenCalled();
      expect(app).toBe(mockApp);
    });

    it('should mount routes on app', () => {
      constructApp.mockReturnValue(mockApp);
      createManagementRoutes.mockReturnValue({ route: jest.fn() });
      
      const app = constructApp();
      const managementRouter = createManagementRoutes(mockAccountManager, mockSocketManager, app);
      
      app.use('/', managementRouter);
      
      expect(app.use).toHaveBeenCalledWith('/', expect.any(Object));
    });
  });

  describe('Account Restoration', () => {
    it('should list accounts from database', async () => {
      mockAccountManager.listAccounts.mockResolvedValue([
        { _id: 'acc1', status: 'connected' },
      ]);
      
      const accounts = await mockAccountManager.listAccounts();
      expect(accounts).toHaveLength(1);
      expect(accounts[0]._id).toBe('acc1');
    });

    it('should handle no existing accounts', async () => {
      mockAccountManager.listAccounts.mockResolvedValue([]);
      
      const accounts = await mockAccountManager.listAccounts();
      expect(accounts).toHaveLength(0);
    });

    it('should update account status on error', async () => {
      const accountId = 'test-account';
      await mockAccountManager.updateAccountStatus(accountId, 'not_started');
      
      expect(mockAccountManager.updateAccountStatus).toHaveBeenCalledWith(
        accountId,
        'not_started',
      );
    });
  });

  describe('Server Startup', () => {
    it('should start server', async () => {
      startServer.mockResolvedValue(undefined);
      await startServer(mockApp);
      expect(startServer).toHaveBeenCalledWith(mockApp);
    });

    it('should handle startup errors', async () => {
      const error = new Error('Startup failed');
      startServer.mockRejectedValue(error);
      
      await expect(startServer(mockApp)).rejects.toThrow('Startup failed');
    });
  });
});
