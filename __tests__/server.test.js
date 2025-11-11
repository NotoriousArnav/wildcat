const express = require('express');
const helmet = require('helmet');
const { constructApp, startServer } = require('../src/server');
const { httpLogger, appLogger } = require('../src/logger');

jest.mock('express');
jest.mock('helmet');
jest.mock('../src/logger');

describe('Server Module', () => {
  let mockApp;
  let mockLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockApp = {
      disable: jest.fn(),
      use: jest.fn(),
      listen: jest.fn((port, host, callback) => {
        callback();
      }),
    };
    
    express.mockReturnValue(mockApp);
    express.json = jest.fn();
    helmet.mockReturnValue('helmet-middleware');
    
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };
    
    appLogger.mockReturnValue(mockLogger);
    httpLogger.mockReturnValue('http-logger-middleware');
  });

  describe('constructApp', () => {
    it('should create and configure express app', () => {
      const app = constructApp();
      
      expect(express).toHaveBeenCalled();
      expect(app).toBe(mockApp);
    });

    it('should disable x-powered-by header', () => {
      constructApp();
      
      expect(mockApp.disable).toHaveBeenCalledWith('x-powered-by');
    });

    it('should use helmet middleware', () => {
      constructApp();
      
      expect(helmet).toHaveBeenCalled();
      expect(mockApp.use).toHaveBeenCalledWith('helmet-middleware');
    });

    it('should use express.json middleware', () => {
      constructApp();
      
      expect(express.json).toHaveBeenCalled();
      expect(mockApp.use).toHaveBeenCalledWith(express.json());
    });

    it('should use http logger middleware with redactBody: false', () => {
      constructApp();
      
      expect(httpLogger).toHaveBeenCalledWith({ redactBody: false });
      expect(mockApp.use).toHaveBeenCalledWith('http-logger-middleware');
    });

    it('should configure middleware in correct order', () => {
      constructApp();
      
      const useCallOrder = mockApp.use.mock.calls.map(call => call[0]);
      
      // Helmet should be first
      expect(useCallOrder[0]).toBe('helmet-middleware');
      // JSON parser should be second
      expect(useCallOrder[1]).toBe(express.json());
      // HTTP logger should be third
      expect(useCallOrder[2]).toBe('http-logger-middleware');
    });
  });

  describe('startServer', () => {
    beforeEach(() => {
      delete process.env.PORT;
      delete process.env.HOST;
    });

    it('should start server on default port and host', async () => {
      await startServer(mockApp);
      
      expect(mockApp.listen).toHaveBeenCalledWith(
        3000,
        '0.0.0.0',
        expect.any(Function),
      );
    });

    it('should use PORT from environment variable', async () => {
      process.env.PORT = '8080';
      
      await startServer(mockApp);
      
      expect(mockApp.listen).toHaveBeenCalledWith(
        '8080',
        '0.0.0.0',
        expect.any(Function),
      );
    });

    it('should use HOST from environment variable', async () => {
      process.env.HOST = '127.0.0.1';
      
      await startServer(mockApp);
      
      expect(mockApp.listen).toHaveBeenCalledWith(
        3000,
        '127.0.0.1',
        expect.any(Function),
      );
    });

    it('should log server startup with structured logging', async () => {
      await startServer(mockApp);
      
      expect(appLogger).toHaveBeenCalledWith('server');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'server_running',
        { host: '0.0.0.0', port: 3000 },
      );
    });

    it('should log with custom port and host', async () => {
      process.env.PORT = '9000';
      process.env.HOST = 'localhost';
      
      await startServer(mockApp);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'server_running',
        { host: 'localhost', port: '9000' },
      );
    });

    it('should create app logger with server context', async () => {
      await startServer(mockApp);
      
      expect(appLogger).toHaveBeenCalledWith('server');
    });
  });
});