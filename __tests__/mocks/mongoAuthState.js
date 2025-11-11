// Mock for src/mongoAuthState
module.exports = jest.fn().mockResolvedValue({
  state: { creds: {} },
  saveCreds: jest.fn(),
});
