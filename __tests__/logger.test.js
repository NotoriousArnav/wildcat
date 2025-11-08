const fs = require('fs');
const path = require('path');
const { appLogger, httpLogger, wireSocketLogging } = require('../logger');

// Mock fs module
jest.mock('fs');

describe('Logger Module', () => {
  let mockWriteStream;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockWriteStream = {
      write: jest.fn()
    };
    fs.existsSync.mockReturnValue(true);
    fs.mkdirSync.mockReturnValue(undefined);
    fs.createWriteStream.mockReturnValue(mockWriteStream);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('appLogger', () => {
    it('should create logger with context', () => {
      const logger = appLogger('test-context');
      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('error');
      expect(logger).toHaveProperty('debug');
    });

    it('should log info messages with context and metadata', () => {
      const logger = appLogger('test-context', 'test.log');
      logger.info('test_message', { key: 'value' });
      
      expect(mockWriteStream.write).toHaveBeenCalledWith(
        expect.stringContaining('"level":"info"')
      );
      expect(mockWriteStream.write).toHaveBeenCalledWith(
        expect.stringContaining('"message":"test_message"')
      );
      expect(mockWriteStream.write).toHaveBeenCalledWith(
        expect.stringContaining('"context":"test-context"')
      );
      expect(mockWriteStream.write).toHaveBeenCalledWith(
        expect.stringContaining('"key":"value"')
      );
    });

    it('should log warn messages', () => {
      const logger = appLogger('test-context', 'test.log');
      logger.warn('warning_message', { warning: true });
      
      expect(mockWriteStream.write).toHaveBeenCalledWith(
        expect.stringContaining('"level":"warn"')
      );
      expect(mockWriteStream.write).toHaveBeenCalledWith(
        expect.stringContaining('"message":"warning_message"')
      );
    });

    it('should log error messages', () => {
      const logger = appLogger('test-context', 'test.log');
      logger.error('error_message', { error: 'test error' });
      
      expect(mockWriteStream.write).toHaveBeenCalledWith(
        expect.stringContaining('"level":"error"')
      );
      expect(mockWriteStream.write).toHaveBeenCalledWith(
        expect.stringContaining('"message":"error_message"')
      );
    });

    it('should log debug messages', () => {
      const logger = appLogger('test-context', 'test.log');
      logger.debug('debug_message', { debug: true });
      
      expect(mockWriteStream.write).toHaveBeenCalledWith(
        expect.stringContaining('"level":"debug"')
      );
      expect(mockWriteStream.write).toHaveBeenCalledWith(
        expect.stringContaining('"message":"debug_message"')
      );
    });

    it('should handle write errors gracefully', () => {
      mockWriteStream.write.mockImplementation(() => {
        throw new Error('Write failed');
      });
      
      const logger = appLogger('test-context', 'test.log');
      // Should not throw
      expect(() => logger.info('test_message')).not.toThrow();
    });

    it('should create logs directory if it does not exist', () => {
      fs.existsSync.mockReturnValue(false);
      
      const logger = appLogger('test-context', 'test.log');
      logger.info('test_message');
      
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('.logs'),
        { recursive: true }
      );
    });

    it('should use default filename app.log when not specified', () => {
      const logger = appLogger('test-context');
      logger.info('test_message');
      
      expect(fs.createWriteStream).toHaveBeenCalledWith(
        expect.stringContaining('app.log'),
        expect.any(Object)
      );
    });

    it('should log without metadata', () => {
      const logger = appLogger('test-context', 'test.log');
      logger.info('test_message');
      
      expect(mockWriteStream.write).toHaveBeenCalledWith(
        expect.stringContaining('"message":"test_message"')
      );
    });

    it('should include ISO timestamp in log entries', () => {
      const logger = appLogger('test-context', 'test.log');
      logger.info('test_message');
      
      expect(mockWriteStream.write).toHaveBeenCalledWith(
        expect.stringMatching(/"ts":"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z"/)
      );
    });

    it('should reuse existing stream for same file', () => {
      const logger1 = appLogger('context1', 'shared.log');
      const logger2 = appLogger('context2', 'shared.log');
      
      logger1.info('message1');
      logger2.info('message2');
      
      // Should only create one write stream
      expect(fs.createWriteStream).toHaveBeenCalledTimes(1);
    });
  });

  describe('httpLogger', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        method: 'GET',
        url: '/test',
        headers: { 'user-agent': 'test-agent' },
        ip: '127.0.0.1',
        body: { data: 'test' }
      };
      res = {
        statusCode: 200,
        on: jest.fn((event, callback) => {
          if (event === 'finish') {
            // Simulate immediate finish for testing
            setTimeout(callback, 0);
          }
        })
      };
      next = jest.fn();
    });

    it('should return middleware function', () => {
      const middleware = httpLogger();
      expect(typeof middleware).toBe('function');
    });

    it('should log HTTP requests with default options', (done) => {
      const middleware = httpLogger();
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      
      setTimeout(() => {
        expect(mockWriteStream.write).toHaveBeenCalledWith(
          expect.stringContaining('"message":"http_request"')
        );
        expect(mockWriteStream.write).toHaveBeenCalledWith(
          expect.stringContaining('"method":"GET"')
        );
        expect(mockWriteStream.write).toHaveBeenCalledWith(
          expect.stringContaining('"url":"/test"')
        );
        expect(mockWriteStream.write).toHaveBeenCalledWith(
          expect.stringContaining('"status":200')
        );
        done();
      }, 50);
    });

    it('should redact request body by default', (done) => {
      const middleware = httpLogger();
      middleware(req, res, next);
      
      setTimeout(() => {
        const writtenData = mockWriteStream.write.mock.calls[0][0];
        expect(writtenData).not.toContain('"reqBody"');
        done();
      }, 50);
    });

    it('should include request body when redactBody is false', (done) => {
      const middleware = httpLogger({ redactBody: false });
      middleware(req, res, next);
      
      setTimeout(() => {
        expect(mockWriteStream.write).toHaveBeenCalledWith(
          expect.stringContaining('"reqBody"')
        );
        done();
      }, 50);
    });

    it('should log to custom file when specified', (done) => {
      const middleware = httpLogger({ file: 'custom-http.log' });
      middleware(req, res, next);
      
      setTimeout(() => {
        expect(fs.createWriteStream).toHaveBeenCalledWith(
          expect.stringContaining('custom-http.log'),
          expect.any(Object)
        );
        done();
      }, 50);
    });

    it('should include duration in milliseconds', (done) => {
      const middleware = httpLogger();
      middleware(req, res, next);
      
      setTimeout(() => {
        expect(mockWriteStream.write).toHaveBeenCalledWith(
          expect.stringContaining('"durationMs"')
        );
        done();
      }, 50);
    });

    it('should log user agent', (done) => {
      const middleware = httpLogger();
      middleware(req, res, next);
      
      setTimeout(() => {
        expect(mockWriteStream.write).toHaveBeenCalledWith(
          expect.stringContaining('"ua":"test-agent"')
        );
        done();
      }, 50);
    });

    it('should log client IP', (done) => {
      const middleware = httpLogger();
      middleware(req, res, next);
      
      setTimeout(() => {
        expect(mockWriteStream.write).toHaveBeenCalledWith(
          expect.stringContaining('"ip":"127.0.0.1"')
        );
        done();
      }, 50);
    });
  });

  describe('wireSocketLogging', () => {
    let mockSocket, mockLogger;

    beforeEach(() => {
      mockSocket = {
        ev: {
          on: jest.fn()
        }
      };
      mockLogger = {
        info: jest.fn()
      };
    });

    it('should attach connection.update listener', () => {
      wireSocketLogging(mockSocket, mockLogger);
      
      expect(mockSocket.ev.on).toHaveBeenCalledWith(
        'connection.update',
        expect.any(Function)
      );
    });

    it('should attach creds.update listener', () => {
      wireSocketLogging(mockSocket, mockLogger);
      
      expect(mockSocket.ev.on).toHaveBeenCalledWith(
        'creds.update',
        expect.any(Function)
      );
    });

    it('should attach messages.upsert listener', () => {
      wireSocketLogging(mockSocket, mockLogger);
      
      expect(mockSocket.ev.on).toHaveBeenCalledWith(
        'messages.upsert',
        expect.any(Function)
      );
    });

    it('should attach messages.update listener', () => {
      wireSocketLogging(mockSocket, mockLogger);
      
      expect(mockSocket.ev.on).toHaveBeenCalledWith(
        'messages.update',
        expect.any(Function)
      );
    });

    it('should log connection updates', () => {
      wireSocketLogging(mockSocket, mockLogger);
      
      const connectionUpdateHandler = mockSocket.ev.on.mock.calls.find(
        call => call[0] === 'connection.update'
      )[1];
      
      connectionUpdateHandler({ connection: 'open', lastDisconnect: null });
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'connection.update',
        expect.objectContaining({ connection: 'open' })
      );
    });

    it('should log credentials updates', () => {
      wireSocketLogging(mockSocket, mockLogger);
      
      const credsUpdateHandler = mockSocket.ev.on.mock.calls.find(
        call => call[0] === 'creds.update'
      )[1];
      
      credsUpdateHandler();
      
      expect(mockLogger.info).toHaveBeenCalledWith('creds.update');
    });

    it('should log messages upsert with count', () => {
      wireSocketLogging(mockSocket, mockLogger);
      
      const messagesUpsertHandler = mockSocket.ev.on.mock.calls.find(
        call => call[0] === 'messages.upsert'
      )[1];
      
      messagesUpsertHandler({ type: 'notify', messages: [{}, {}, {}] });
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'messages.upsert',
        expect.objectContaining({ count: 3, type: 'notify' })
      );
    });

    it('should log messages update with count', () => {
      wireSocketLogging(mockSocket, mockLogger);
      
      const messagesUpdateHandler = mockSocket.ev.on.mock.calls.find(
        call => call[0] === 'messages.update'
      )[1];
      
      messagesUpdateHandler([{}, {}]);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'messages.update',
        expect.objectContaining({ count: 2 })
      );
    });

    it('should use default logger when not provided', () => {
      // Should not throw
      expect(() => wireSocketLogging(mockSocket)).not.toThrow();
    });

    it('should handle empty messages array', () => {
      wireSocketLogging(mockSocket, mockLogger);
      
      const messagesUpsertHandler = mockSocket.ev.on.mock.calls.find(
        call => call[0] === 'messages.upsert'
      )[1];
      
      messagesUpsertHandler({ type: 'notify', messages: [] });
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'messages.upsert',
        expect.objectContaining({ count: 0 })
      );
    });

    it('should handle undefined messages in upsert', () => {
      wireSocketLogging(mockSocket, mockLogger);
      
      const messagesUpsertHandler = mockSocket.ev.on.mock.calls.find(
        call => call[0] === 'messages.upsert'
      )[1];
      
      messagesUpsertHandler({ type: 'notify' });
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'messages.upsert',
        expect.objectContaining({ count: 0 })
      );
    });

    it('should handle lastDisconnect error codes', () => {
      wireSocketLogging(mockSocket, mockLogger);
      
      const connectionUpdateHandler = mockSocket.ev.on.mock.calls.find(
        call => call[0] === 'connection.update'
      )[1];
      
      connectionUpdateHandler({
        connection: 'close',
        lastDisconnect: {
          error: {
            output: {
              statusCode: 401
            }
          }
        }
      });
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'connection.update',
        expect.objectContaining({ lastDisconnectCode: 401 })
      );
    });
  });
});