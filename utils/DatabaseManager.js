const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let admin = null;
if (process.env.USE_FIRESTORE === 'true') {
  try {
    admin = require('firebase-admin');
    if (!admin.apps.length) {
      const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, '../config/firebase-service-account.json');
      if (fs.existsSync(serviceAccountPath)) {
        admin.initializeApp({
          credential: admin.credential.cert(require(serviceAccountPath))
        });
        console.log('DatabaseManager: Connected using Firebase Service Account key.');
      } else {
        admin.initializeApp();
        console.log('DatabaseManager: Connected using Firebase default environment credentials.');
      }
    }
  } catch (e) {
    console.log('DatabaseManager: firebase-admin not available/loaded or failed to initialize, using local JSON database fallback:', e.message);
  }
}


let MongoClient = null;
try {
  const mongodb = require('mongodb');
  MongoClient = mongodb.MongoClient;
} catch (e) {
  console.log('DatabaseManager: mongodb package not available, using other fallbacks.');
}

class DatabaseManager {
  constructor() {
    this.useMongo = !!process.env.MONGO_URI && !!MongoClient;
    this.useFirestore = !this.useMongo && (process.env.USE_FIRESTORE === 'true') && admin && admin.apps.length > 0;

    if (this.useMongo) {
      this.client = new MongoClient(process.env.MONGO_URI);
      this.client.connect()
        .then(() => {
          this.mongoDb = this.client.db();
          console.log('DatabaseManager: Connected to self-hosted MongoDB.');
        })
        .catch(err => {
          console.error('DatabaseManager: MongoDB connection failed, falling back to local JSON database:', err.message);
          this.useMongo = false;
          this.initLocalFallback();
        });
    } else if (this.useFirestore) {
      this.db = admin.firestore();
      console.log('DatabaseManager: Connected to Cloud Firestore.');
    } else {
      this.initLocalFallback();
    }
  }

  initLocalFallback() {
    this.memoryStore = new Map();
    this._writeLocks = new Map(); // Per-collection mutex locks
    this.baseDir = path.join(__dirname, '../data');
    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
    } catch (e) {
      console.log('DatabaseManager: Read-only filesystem detected; using in-memory store.');
    }
    console.log('DatabaseManager: Initialized local JSON database fallback.');
  }

  /**
   * Acquires a per-collection write lock to prevent race conditions.
   */
  async _acquireLock(collection) {
    while (this._writeLocks && this._writeLocks.get(collection)) {
      await new Promise(resolve => setTimeout(resolve, 5));
    }
    if (this._writeLocks) this._writeLocks.set(collection, true);
  }

  _releaseLock(collection) {
    if (this._writeLocks) this._writeLocks.set(collection, false);
  }

  /**
   * Reads all documents in a collection.
   * @param {string} collection - The collection name.
   * @returns {Promise<Array>} A list of documents.
   */
  async read(collection) {
    if (this.useMongo && this.mongoDb) {
      try {
        const items = await this.mongoDb.collection(collection).find({}).toArray();
        return items.map(item => {
          const doc = { ...item };
          if (item._id) {
            doc.id = item.id || item._id.toString();
            delete doc._id;
          }
          return doc;
        });
      } catch (e) {
        console.error(`MongoDB error reading collection "${collection}":`, e.message);
        return [];
      }
    } else if (this.useFirestore) {
      try {
        const snapshot = await this.db.collection(collection).orderBy('createdAt', 'asc').get();
        const items = [];
        snapshot.forEach(doc => {
          items.push({ id: doc.id, ...doc.data() });
        });
        return items;
      } catch (e) {
        console.error(`Firestore error reading collection "${collection}":`, e);
        return [];
      }
    } else {
      if (this.memoryStore && this.memoryStore.has(collection)) {
        return this.memoryStore.get(collection);
      }
      const file = path.join(this.baseDir, `${collection}.json`);
      if (!fs.existsSync(file)) return [];
      try {
        const data = fs.readFileSync(file, 'utf8');
        const items = JSON.parse(data || '[]');
        if (this.memoryStore) this.memoryStore.set(collection, items);
        return items;
      } catch (e) {
        console.error(`Local database error reading file "${collection}":`, e.message);
        return [];
      }
    }
  }

  /**
   * Inserts a document into a collection.
   * @param {string} collection - The collection name.
   * @param {Object} document - The document object.
   * @returns {Promise<Object>} The inserted document with id and createdAt populated.
   */
  async insert(collection, document) {
    document.id = crypto.randomUUID();
    document.createdAt = new Date().toISOString();

    if (this.useMongo && this.mongoDb) {
      try {
        const docToInsert = { ...document, _id: document.id };
        await this.mongoDb.collection(collection).insertOne(docToInsert);
        return document;
      } catch (e) {
        console.error(`MongoDB error writing to "${collection}":`, e.message);
        return document;
      }
    } else if (this.useFirestore) {
      try {
        await this.db.collection(collection).doc(document.id).set(document);
        return document;
      } catch (e) {
        console.error(`Firestore error writing to "${collection}":`, e);
        return document;
      }
    } else {
      await this._acquireLock(collection);
      try {
        const items = await this.read(collection);
        items.push(document);
        if (this.memoryStore) this.memoryStore.set(collection, items);
        const file = path.join(this.baseDir, `${collection}.json`);
        try {
          fs.writeFileSync(file, JSON.stringify(items, null, 2), 'utf8');
        } catch (e) {
          console.log(`Local database file write bypassed (in-memory saved for "${collection}")`);
        }
        return document;
      } finally {
        this._releaseLock(collection);
      }
    }
  }

  /**
   * Deletes a document from a collection by ID.
   * @param {string} collection - The collection name.
   * @param {string} docId - The document ID.
   * @returns {Promise<boolean>} True if successful.
   */
  async delete(collection, docId) {
    if (this.useMongo && this.mongoDb) {
      try {
        await this.mongoDb.collection(collection).deleteOne({ _id: docId });
        return true;
      } catch (e) {
        console.error(`MongoDB error deleting from "${collection}":`, e.message);
        return false;
      }
    } else if (this.useFirestore) {
      try {
        await this.db.collection(collection).doc(docId).delete();
        return true;
      } catch (e) {
        console.error(`Firestore error deleting from "${collection}":`, e);
        return false;
      }
    } else {
      await this._acquireLock(collection);
      try {
        const items = await this.read(collection);
        const filtered = items.filter(item => item.id !== docId);
        if (this.memoryStore) this.memoryStore.set(collection, filtered);
        const file = path.join(this.baseDir, `${collection}.json`);
        try {
          fs.writeFileSync(file, JSON.stringify(filtered, null, 2), 'utf8');
        } catch (e) {
          console.log(`Local database file write bypassed (in-memory updated for "${collection}")`);
        }
        return true;
      } finally {
        this._releaseLock(collection);
      }
    }
  }
}

// Singleton instance to prevent duplicate DB connections across modules
const _singleton = new DatabaseManager();

module.exports = DatabaseManager;
module.exports.instance = _singleton;
