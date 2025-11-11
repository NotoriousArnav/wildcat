// Mock for @whiskeysockets/baileys and all its sub-modules
module.exports = {
  default: jest.fn(),
  DisconnectReason: {
    connectionClosed: 1,
    connectionLost: 2,
    connectionReplaced: 3,
    loggedOut: 401,
    restartRequired: 5,
    timedOut: 6,
  },
  makeCacheableSignalKeyStore: jest.fn(),
  // Additional exports for mongoAuthState
  proto: {
    Message: {},
  },
  Curve: {
    generateKeyPair: jest.fn(),
    sharedSecret: jest.fn(),
    sign: jest.fn(),
  },
  signedKeyPair: jest.fn(),
  generateRegistrationId: jest.fn(),
  jidDecode: jest.fn(),
  jidNormalizedUser: jest.fn(),
};

