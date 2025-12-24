const {
  isValidJID,
  phoneToJID,
  isValidMessageLength,
  isValidJIDArray,
  jidToPhoneNumber,
  isIndividualJID,
  isGroupJID,
} = require('../validators');

describe('Validators', () => {
  describe('isValidJID', () => {
    it('should validate individual JIDs', () => {
      expect(isValidJID('919547400579@s.whatsapp.net')).toBe(true);
      expect(isValidJID('1234567890@s.whatsapp.net')).toBe(true);
      expect(isValidJID('91234567890123@s.whatsapp.net')).toBe(true);
    });

    it('should validate group JIDs', () => {
      expect(isValidJID('120363320392546922@g.us')).toBe(true);
      expect(isValidJID('123456789@g.us')).toBe(true);
    });

    it('should validate broadcast JIDs', () => {
      expect(isValidJID('123456789@broadcast')).toBe(true);
      expect(isValidJID('status@broadcast')).toBe(true);
    });

    it('should reject invalid JIDs', () => {
      expect(isValidJID('invalid')).toBe(false);
      expect(isValidJID('123@invalid.net')).toBe(false);
      expect(isValidJID('abc@s.whatsapp.net')).toBe(false);
      expect(isValidJID('123')).toBe(false);
      expect(isValidJID('')).toBe(false);
      expect(isValidJID(null)).toBe(false);
      expect(isValidJID(undefined)).toBe(false);
      expect(isValidJID(123)).toBe(false);
    });
  });

  describe('phoneToJID', () => {
    it('should convert phone numbers to JID', () => {
      expect(phoneToJID('919547400579')).toBe('919547400579@s.whatsapp.net');
      expect(phoneToJID('+919547400579')).toBe('919547400579@s.whatsapp.net');
      expect(phoneToJID('+91 954 740 0579')).toBe('919547400579@s.whatsapp.net');
    });

    it('should handle country codes', () => {
      expect(phoneToJID('12345678', '91')).toBe('9112345678@s.whatsapp.net');
      expect(phoneToJID('1234567', '1')).toBe('11234567@s.whatsapp.net');
    });

    it('should reject invalid phone numbers', () => {
      expect(phoneToJID('')).toBe(null);
      expect(phoneToJID('abc')).toBe(null);
      expect(phoneToJID('12345')).toBe(null); // Too short
      expect(phoneToJID('12345678901234567')).toBe(null); // Too long
      expect(phoneToJID(null)).toBe(null);
      expect(phoneToJID(undefined)).toBe(null);
    });
  });

  describe('isValidMessageLength', () => {
    it('should validate message length', () => {
      expect(isValidMessageLength('Hello')).toBe(true);
      expect(isValidMessageLength('A'.repeat(1000))).toBe(true);
      expect(isValidMessageLength('A'.repeat(65536))).toBe(true);
    });

    it('should reject empty or too long messages', () => {
      expect(isValidMessageLength('')).toBe(false);
      expect(isValidMessageLength('A'.repeat(65537))).toBe(false);
      expect(isValidMessageLength(null)).toBe(false);
      expect(isValidMessageLength(undefined)).toBe(false);
    });
  });

  describe('isValidJIDArray', () => {
    it('should validate arrays of JIDs', () => {
      expect(isValidJIDArray([])).toBe(true);
      expect(isValidJIDArray(['919547400579@s.whatsapp.net'])).toBe(true);
      expect(isValidJIDArray([
        '919547400579@s.whatsapp.net',
        '120363320392546922@g.us',
      ])).toBe(true);
    });

    it('should reject invalid JID arrays', () => {
      expect(isValidJIDArray(['invalid'])).toBe(false);
      expect(isValidJIDArray(['919547400579@s.whatsapp.net', 'invalid'])).toBe(false);
      expect(isValidJIDArray(null)).toBe(false);
      expect(isValidJIDArray(undefined)).toBe(false);
      expect(isValidJIDArray('string')).toBe(false);
    });
  });

  describe('jidToPhoneNumber', () => {
    it('should extract phone number from JID', () => {
      expect(jidToPhoneNumber('919547400579@s.whatsapp.net')).toBe('919547400579');
      expect(jidToPhoneNumber('1234567890@s.whatsapp.net')).toBe('1234567890');
    });

    it('should return null for non-individual JIDs', () => {
      expect(jidToPhoneNumber('120363320392546922@g.us')).toBe(null);
      expect(jidToPhoneNumber('123@broadcast')).toBe(null);
      expect(jidToPhoneNumber('invalid')).toBe(null);
    });
  });

  describe('isIndividualJID', () => {
    it('should identify individual JIDs', () => {
      expect(isIndividualJID('919547400579@s.whatsapp.net')).toBe(true);
      expect(isIndividualJID('120363320392546922@g.us')).toBe(false);
      expect(isIndividualJID('123@broadcast')).toBe(false);
    });
  });

  describe('isGroupJID', () => {
    it('should identify group JIDs', () => {
      expect(isGroupJID('120363320392546922@g.us')).toBe(true);
      expect(isGroupJID('919547400579@s.whatsapp.net')).toBe(false);
      expect(isGroupJID('123@broadcast')).toBe(false);
    });
  });
});
