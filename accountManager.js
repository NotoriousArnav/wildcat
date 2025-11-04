const { connectToDB } = require('./db');

class AccountManager {
  constructor() {
    this.db = null;
  }

  async init() {
    this.db = await connectToDB();
  }

  async createAccount(accountId, name = '', collectionName = null) {
    const collection = this.db.collection('accounts');
    const existing = await collection.findOne({ _id: accountId });
    if (existing) {
      throw new Error('Account already exists');
    }
    
    const collName = collectionName || `auth_${accountId}`;
    
    await collection.insertOne({
      _id: accountId,
      name,
      collectionName: collName,
      createdAt: new Date(),
      status: 'created',
    });
    
    return { 
      id: accountId, 
      name, 
      collectionName: collName,
      status: 'created' 
    };
  }

  async getAccount(accountId) {
    const collection = this.db.collection('accounts');
    return await collection.findOne({ _id: accountId });
  }

  async listAccounts() {
    const collection = this.db.collection('accounts');
    return await collection.find({}).toArray();
  }

  async updateAccountStatus(accountId, status) {
    const collection = this.db.collection('accounts');
    await collection.updateOne(
      { _id: accountId }, 
      { $set: { status, updatedAt: new Date() } }
    );
  }

  async deleteAccount(accountId) {
    const collection = this.db.collection('accounts');
    const account = await this.getAccount(accountId);
    if (account) {
      await collection.deleteOne({ _id: accountId });
      // Return collection name so caller can delete auth data
      return account.collectionName;
    }
    return null;
  }
}

module.exports = AccountManager;
