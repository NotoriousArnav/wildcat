# Unit Tests for Wildcat API

This directory contains comprehensive unit tests for the logging cleanup refactor in the `feature/logging-cleanup` branch.

## Test Coverage

### Files Tested

- `logger.js` - Structured logging implementation
- `server.js` - Express app construction and server startup
- `routes.js` - Legacy route handlers
- `index.js` - Application initialization and account restoration
- `managementRoutes.js` - Account and webhook management routes
- `socketManager.js` - WhatsApp socket lifecycle management

### Test Categories

1. **Logger Module (`logger.test.js`)**
   - appLogger functionality (info, warn, error, debug)
   - httpLogger middleware
   - wireSocketLogging event handlers
   - File stream management
   - Error handling

2. **Server Module (`server.test.js`)**
   - Express app construction
   - Middleware configuration order
   - Environment variable handling
   - Structured logging integration

3. **Routes Module (`routes.test.js`)**
   - Message sending endpoint
   - Ping health check
   - File fetching from GridFS
   - Webhook registration
   - Input validation
   - Error handling with structured logging

4. **Index Module (`index.test.js`)**
   - Account restoration on startup
   - Auto-connect policy logic
   - Structured logging patterns
   - Error recovery

5. **Management Routes (`managementRoutes.test.js`)**
   - Account CRUD operations
   - Webhook management
   - Message and media listing
   - Pagination handling
   - Status tracking

6. **Socket Manager (`socketManager.test.js`)**
   - Socket creation and lifecycle
   - Connection state management
   - QR code generation
   - Message processing
   - Media handling
   - Reconnection logic
   - Text extraction from various message types

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Philosophy

These tests focus on:
1. **Structured Logging**: Verifying console.log calls were replaced with appLogger
2. **Error Handling**: Ensuring errors are logged with proper context
3. **Edge Cases**: Testing boundary conditions and error scenarios
4. **Happy Paths**: Validating normal operation flows
5. **Integration Points**: Testing how components interact

## Coverage Goals

- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

## Key Testing Patterns

### Mocking

All external dependencies (DB, sockets, file system) are mocked to ensure unit test isolation.

### Structured Logging Verification

```javascript
expect(mockLogger.info).toHaveBeenCalledWith(
  'event_name',
  { contextKey: 'value' }
);
```

### Error Scenarios

Each handler tests both success and failure paths, ensuring errors are logged with appropriate context.

### Async/Await

All async operations use proper async/await patterns in tests.