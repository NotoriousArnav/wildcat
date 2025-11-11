/**
 * MongoDB Authentication State Handler for Baileys
 * 
 * This file contains code adapted from the mongo-baileys package:
 * https://github.com/hacxk/mongo-baileys
 * 
 * Original Author: HACXK
 * Original License: MIT
 * 
 * Modifications made:
 * - Simplified implementation for specific use case
 * - Removed TypeScript-specific features
 * - Modified BufferJSON handling
 * - Adjusted storage keys and structure
 * 
 * Original MIT License:
 * Copyright (c) HACXK
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

 
 
 
const { proto } = require('@whiskeysockets/baileys/WAProto');
const {
  Curve,
  signedKeyPair,
} = require('@whiskeysockets/baileys/lib/Utils/crypto');
const {
  generateRegistrationId,
} = require('@whiskeysockets/baileys/lib/Utils/generics');
const { randomBytes } = require('crypto');

const initAuthCreds = () => {
  const identityKey = Curve.generateKeyPair();
  return {
    noiseKey: Curve.generateKeyPair(),
    signedIdentityKey: identityKey,
    signedPreKey: signedKeyPair(identityKey, 1),
    registrationId: generateRegistrationId(),
    advSecretKey: randomBytes(32).toString('base64'),
    processedHistoryMessages: [],
    nextPreKeyId: 1,
    firstUnuploadedPreKeyId: 1,
    accountSettings: {
      unarchiveChats: false,
    },
  };
};

const BufferJSON = {
  replacer: (k, value) => {
    if (
      Buffer.isBuffer(value) ||
      value instanceof Uint8Array ||
      value?.type === 'Buffer'
    ) {
      return {
        type: 'Buffer',
        data: Buffer.from(value?.data || value).toString('base64'),
      };
    }

    return value;
  },

  reviver: (_, value) => {
    if (
      typeof value === 'object' &&
      !!value &&
      (value.buffer === true || value.type === 'Buffer')
    ) {
      const val = value.data || value.value;
      return typeof val === 'string'
        ? Buffer.from(val, 'base64')
        : Buffer.from(val || []);
    }

    return value;
  },
};

module.exports = useMongoDBAuthState = async (collection) => {
  const writeData = (data, id) => {
    const informationToStore = JSON.parse(
      JSON.stringify(data, BufferJSON.replacer),
    );
    const update = {
      $set: {
        ...informationToStore,
      },
    };
    return collection.updateOne({ _id: id }, update, { upsert: true });
  };
  const readData = async (id) => {
    try {
      const data = JSON.stringify(await collection.findOne({ _id: id }));
      return JSON.parse(data, BufferJSON.reviver);
    } catch (error) { // eslint-disable-line no-unused-vars
      return null;
    }
  };
  const removeData = async (id) => {
    try {
      await collection.deleteOne({ _id: id });
    } catch (_a) { // eslint-disable-line no-unused-vars
    }
  };
  const creds = (await readData('creds')) || (0, initAuthCreds)();
  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`);
              if (type === 'app-state-sync-key' && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            }),
          );
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const category of Object.keys(data)) {
            for (const id of Object.keys(data[category])) {
              const value = data[category][id];
              const key = `${category}-${id}`;
              tasks.push(value ? writeData(value, key) : removeData(key));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: () => {
      return writeData(creds, 'creds');
    },
  };
};
