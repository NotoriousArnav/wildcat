module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!jest.config.js',
    '!coverage/**',
    '!node_modules/**',
    '!scripts/**',
  ],
  testMatch: [
    '**/__tests__/**/*.test.js',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  moduleFileExtensions: ['js', 'json'],
  testTimeout: 10000,
  verbose: true,
  moduleNameMapper: {
    '^@whiskeysockets/baileys(.*)$': '<rootDir>/__tests__/mocks/baileys.js',
    '^qrcode-terminal$': '<rootDir>/__tests__/mocks/qrcodeTerminal.js',
    '^\\./mongoAuthState$': '<rootDir>/__tests__/mocks/mongoAuthState.js',
  },
};