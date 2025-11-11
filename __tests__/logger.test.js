const fs = require('fs');
const { appLogger, httpLogger, wireSocketLogging } = require('../src/logger');

// Mock fs module
jest.mock('fs');

describe('Logger Module', () => {
  let mockWriteStream;
  let testFileCounter = 0;
  
  beforeEach(() => {
    jest.clearAllMocks();
    testFileCounter++;
    mockWriteStream = {
      write: jest.fn(),
    };
    
    fs.existsSync.mockReturnValue(true);
    fs.createWriteStream.mockReturnValue(mockWriteStream);
  });

  describe('appLogger', () => {
    it('should create logger with context', () => {
      const logger = appLogger('test-context');
      
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
    });

    it('should log info messages with context and metadata', () => {
      const logger = appLogger('test-context', `test${testFileCounter}.log`);
      logger.info('test_message', { key: 'value' });
      
      expect(mockWriteStream.write).toHaveBeenCalled();
      const call = mockWriteStream.write.mock.calls[0][0];
      expect(call).toContain('test-context');
      expect(call).toContain('info');
    });

    it('should log warn messages', () => {
      const logger = appLogger('test-context', `test${testFileCounter}.log`);
      logger.warn('warning_message', { warning: true });
      
      expect(mockWriteStream.write).toHaveBeenCalledWith(
        expect.stringContaining('warning_message'),
      );
    });

    it('should log error messages', () => {
      const logger = appLogger('test-context', `test${testFileCounter}.log`);
      logger.error('error_message', { error: 'test error' });
      
      expect(mockWriteStream.write).toHaveBeenCalledWith(
        expect.stringContaining('error_message'),
      );
    });

    it('should log debug messages', () => {
      const logger = appLogger('test-context', `test${testFileCounter}.log`);
      logger.debug('debug_message', { debug: true });
      
      expect(mockWriteStream.write).toHaveBeenCalledWith(
        expect.stringContaining('debug_message'),
      );
    });

    it('should handle write errors gracefully', () => {
      const logger = appLogger('test-context', `test${testFileCounter}.log`);
      const writeError = new Error('Write failed');
      mockWriteStream.write.mockImplementation(() => {
        throw writeError;
      });
      
      // Should not throw
      expect(() => logger.info('test')).not.toThrow();
    });

    it('should create logs directory if it does not exist', () => {
      fs.existsSync.mockReturnValueOnce(false);
      // Must call getStream to trigger ensureLogsDir
      const logger = appLogger('test-context', `test${testFileCounter}.log`);
      logger.info('test');
      
      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ recursive: true }));
    });

    it('should use default filename app.log when not specified', () => {
      const logger = appLogger('test-context');
      logger.info('test');
      
      expect(fs.createWriteStream).toHaveBeenCalledWith(
        expect.stringContaining('app.log'),
        expect.any(Object),
      );
    });

    it('should log without metadata', () => {
      const logger = appLogger('test-context', `test${testFileCounter}.log`);
      logger.info('test_message');
      
      expect(mockWriteStream.write).toHaveBeenCalledWith(
        expect.stringContaining('test_message'),
      );
    });

    it('should include ISO timestamp in log entries', () => {
      const logger = appLogger('test-context', `test${testFileCounter}.log`);
      logger.info('test_message');
      
      expect(mockWriteStream.write).toHaveBeenCalled();
      const call = mockWriteStream.write.mock.calls[0][0];
      expect(call).toMatch(/"\d{4}-\d{2}-\d{2}T/);
    });

    it('should reuse existing stream for same file', () => {
      const logger1 = appLogger('context1', 'same-file.log');
      logger1.info('msg1');
      
      const logger2 = appLogger('context2', 'same-file.log');
      logger2.info('msg2');
      
      // Should have been called twice for the same file but stream reused
      expect(fs.createWriteStream).toHaveBeenCalledTimes(1);
    });
  });

  describe('httpLogger', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        method: 'GET',
        url: '/test',
        headers: {
          'user-agent': 'test-agent',
          'x-forwarded-for': '127.0.0.1',
        },
        body: { test: 'data' },
        socket: { remoteAddress: '127.0.0.1' },
      };

      res = {
        statusCode: 200,
        on: jest.fn(),
        setHeader: jest.fn().mockReturnThis(),
      };

      next = jest.fn();

      mockWriteStream = {
        write: jest.fn(),
      };

      fs.createWriteStream.mockReturnValue(mockWriteStream);
    });

    it('should return middleware function', () => {
      const middleware = httpLogger();
      expect(typeof middleware).toBe('function');
    });

    it('should log HTTP requests with default options', () => {
      const middleware = httpLogger();
      middleware(req, res, next);

      // Simulate response finish event
      const finishCallback = res.on.mock.calls.find(c => c[0] === 'finish');
      if (finishCallback) {
        finishCallback[1]();
      }

      expect(mockWriteStream.write).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should log to custom file when specified', () => {
      const middleware = httpLogger({ file: 'custom-http.log' });
      middleware(req, res, next);

      // Simulate response finish event to trigger logging
      const finishCallback = res.on.mock.calls.find(c => c[0] === 'finish');
      if (finishCallback) {
        finishCallback[1]();
      }

      expect(fs.createWriteStream).toHaveBeenCalledWith(
        expect.stringContaining('custom-http.log'),
        expect.any(Object),
      );
    });

    it('should register finish listener on response', () => {
      const middleware = httpLogger();
      middleware(req, res, next);

      // Check that 'finish' event listener was registered
      const finishListener = res.on.mock.calls.find(c => c[0] === 'finish');
      expect(finishListener).toBeDefined();
    });

    it('should call next middleware', () => {
      const middleware = httpLogger();
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('wireSocketLogging', () => {
    let mockSocket;
    let mockLogger;

    beforeEach(() => {
      mockSocket = {
        ev: {
          on: jest.fn(),
        },
      };

      mockLogger = {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
      };
    });

    it('should attach connection.update listener', () => {
      wireSocketLogging(mockSocket, mockLogger);

      expect(mockSocket.ev.on).toHaveBeenCalledWith(
        'connection.update',
        expect.any(Function),
      );
    });

    it('should attach creds.update listener', () => {
      wireSocketLogging(mockSocket, mockLogger);

      expect(mockSocket.ev.on).toHaveBeenCalledWith(
        'creds.update',
        expect.any(Function),
      );
    });

    it('should attach messages.upsert listener', () => {
      wireSocketLogging(mockSocket, mockLogger);

      expect(mockSocket.ev.on).toHaveBeenCalledWith(
        'messages.upsert',
        expect.any(Function),
      );
    });

    it('should attach messages.update listener', () => {
      wireSocketLogging(mockSocket, mockLogger);

      expect(mockSocket.ev.on).toHaveBeenCalledWith(
        'messages.update',
        expect.any(Function),
      );
    });

    it('should log connection updates', () => {
      wireSocketLogging(mockSocket, mockLogger);

      const connectionUpdate = mockSocket.ev.on.mock.calls.find(
        c => c[0] === 'connection.update',
      );
      const handler = connectionUpdate[1];
      handler({ connection: 'open' });

      expect(mockLogger.info).toHaveBeenCalledWith('connection.update', {
        connection: 'open',
        lastDisconnectCode: undefined,
      });
    });

    it('should log credentials updates', () => {
      wireSocketLogging(mockSocket, mockLogger);

      const credsUpdate = mockSocket.ev.on.mock.calls.find(
        c => c[0] === 'creds.update',
      );
      const handler = credsUpdate[1];
      handler();

      expect(mockLogger.info).toHaveBeenCalledWith('creds.update');
    });

    it('should log messages upsert with count', () => {
      wireSocketLogging(mockSocket, mockLogger);

      const messagesUpsert = mockSocket.ev.on.mock.calls.find(
        c => c[0] === 'messages.upsert',
      );
      const handler = messagesUpsert[1];
      handler({ messages: [{ key: 1 }, { key: 2 }] });

      expect(mockLogger.info).toHaveBeenCalledWith('messages.upsert', {
        count: 2,
        type: undefined,
      });
    });

    it('should log messages update with count', () => {
      wireSocketLogging(mockSocket, mockLogger);

      const messagesUpdate = mockSocket.ev.on.mock.calls.find(
        c => c[0] === 'messages.update',
      );
      const handler = messagesUpdate[1];
      handler([{ key: 1 }]);

      expect(mockLogger.info).toHaveBeenCalledWith('messages.update', {
        count: 1,
      });
    });

    it('should use default logger when not provided', () => {
      // Should not throw
      expect(() => wireSocketLogging(mockSocket)).not.toThrow();
    });

    it('should handle empty messages array', () => {
      wireSocketLogging(mockSocket, mockLogger);

      const messagesUpsert = mockSocket.ev.on.mock.calls.find(
        c => c[0] === 'messages.upsert',
      );
      const handler = messagesUpsert[1];
      handler({ messages: [] });

      expect(mockLogger.info).toHaveBeenCalledWith('messages.upsert', {
        count: 0,
        type: undefined,
      });
    });

    it('should handle undefined messages in upsert', () => {
      wireSocketLogging(mockSocket, mockLogger);

      const messagesUpsert = mockSocket.ev.on.mock.calls.find(
        c => c[0] === 'messages.upsert',
      );
      const handler = messagesUpsert[1];
      handler({});

      expect(mockLogger.info).toHaveBeenCalledWith('messages.upsert', {
        count: 0,
        type: undefined,
      });
    });

    it('should handle lastDisconnect error codes', () => {
      wireSocketLogging(mockSocket, mockLogger);

      const connectionUpdate = mockSocket.ev.on.mock.calls.find(
        c => c[0] === 'connection.update',
      );
      const handler = connectionUpdate[1];
      handler({
        connection: 'close',
        lastDisconnect: { error: { output: { statusCode: 401 } } },
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'connection.update',
        expect.objectContaining({ lastDisconnectCode: 401 }),
      );
    });
  });
});
