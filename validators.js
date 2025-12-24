/**
 * Validation utilities for WhatsApp-related data
 * 
 * This module provides validation functions for WhatsApp JIDs (Jabber IDs),
 * message content, and other WhatsApp-specific data formats.
 */

/**
 * Validates a WhatsApp JID (Jabber ID) format.
 * 
 * Valid formats:
 * - Individual: {countrycode}{number}@s.whatsapp.net (e.g., 919547400579@s.whatsapp.net)
 * - Group: {groupid}@g.us (e.g., 120363320392546922@g.us)
 * - Broadcast: {broadcastid}@broadcast (e.g., 123456789@broadcast)
 * - Status: status@broadcast
 * 
 * @param {string} jid - The JID to validate
 * @returns {boolean} True if valid JID format, false otherwise
 */
function isValidJID(jid) {
  if (!jid || typeof jid !== 'string') {
    return false;
  }

  // Individual user: digits@s.whatsapp.net
  const individualPattern = /^\d+@s\.whatsapp\.net$/;
  
  // Group: digits@g.us
  const groupPattern = /^\d+@g\.us$/;
  
  // Broadcast list: digits@broadcast
  const broadcastPattern = /^\d+@broadcast$/;
  
  // Status broadcast: status@broadcast
  const statusPattern = /^status@broadcast$/;

  return individualPattern.test(jid) || 
         groupPattern.test(jid) || 
         broadcastPattern.test(jid) ||
         statusPattern.test(jid);
}

/**
 * Validates a phone number and converts it to WhatsApp JID format.
 * 
 * Accepts formats like:
 * - +919547400579
 * - 919547400579
 * - 9547400579 (with country code parameter)
 * 
 * @param {string} phoneNumber - The phone number to validate
 * @param {string} [defaultCountryCode] - Default country code if not included in number
 * @returns {string|null} Valid JID string or null if invalid
 */
function phoneToJID(phoneNumber, defaultCountryCode = null) {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return null;
  }

  // Remove all non-digit characters
  let digits = phoneNumber.replace(/\D/g, '');

  // If no digits, invalid
  if (digits.length === 0) {
    return null;
  }

  // Add default country code if provided and number seems too short
  if (defaultCountryCode && digits.length < 10) {
    digits = defaultCountryCode.replace(/\D/g, '') + digits;
  }

  // Basic validation: should be between 7 and 15 digits (international standard)
  if (digits.length < 7 || digits.length > 15) {
    return null;
  }

  return `${digits}@s.whatsapp.net`;
}

/**
 * Validates message content length according to WhatsApp limits.
 * WhatsApp text messages have a 65536 character limit.
 * 
 * @param {string} message - The message text to validate
 * @returns {boolean} True if message length is valid, false otherwise
 */
function isValidMessageLength(message) {
  if (!message || typeof message !== 'string') {
    return false;
  }

  // WhatsApp's maximum message length
  const MAX_MESSAGE_LENGTH = 65536;

  return message.length > 0 && message.length <= MAX_MESSAGE_LENGTH;
}

/**
 * Validates an array of JIDs (for mentions, etc.)
 * 
 * @param {Array<string>} jids - Array of JIDs to validate
 * @returns {boolean} True if all JIDs are valid, false otherwise
 */
function isValidJIDArray(jids) {
  if (!Array.isArray(jids)) {
    return false;
  }

  if (jids.length === 0) {
    return true; // Empty array is valid
  }

  return jids.every(jid => isValidJID(jid));
}

/**
 * Extracts the phone number from a JID.
 * 
 * @param {string} jid - The JID to parse
 * @returns {string|null} The phone number without @s.whatsapp.net suffix, or null if invalid
 */
function jidToPhoneNumber(jid) {
  if (!isValidJID(jid)) {
    return null;
  }

  // Extract number from individual JID
  const match = jid.match(/^(\d+)@s\.whatsapp\.net$/);
  if (match) {
    return match[1];
  }

  return null;
}

/**
 * Validates if a JID is an individual user (not a group or broadcast).
 * 
 * @param {string} jid - The JID to check
 * @returns {boolean} True if JID is an individual user, false otherwise
 */
function isIndividualJID(jid) {
  if (!jid || typeof jid !== 'string') {
    return false;
  }
  return /^\d+@s\.whatsapp\.net$/.test(jid);
}

/**
 * Validates if a JID is a group.
 * 
 * @param {string} jid - The JID to check
 * @returns {boolean} True if JID is a group, false otherwise
 */
function isGroupJID(jid) {
  if (!jid || typeof jid !== 'string') {
    return false;
  }
  return /^\d+@g\.us$/.test(jid);
}

module.exports = {
  isValidJID,
  phoneToJID,
  isValidMessageLength,
  isValidJIDArray,
  jidToPhoneNumber,
  isIndividualJID,
  isGroupJID,
};
