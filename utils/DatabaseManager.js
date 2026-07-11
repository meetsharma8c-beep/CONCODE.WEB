const fs = require('fs');
const path = require('path');

let admin = null;
try {
  admin = require('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp();
  }
} catch (e) {
  console.log('DatabaseManager: firebase-admin not available/loaded, using local JSON database fallback.');
}

class DatabaseManager {
  constructor() {
    // If running in a Firebase environment with credentials configured, use Firestore. Otherwise, use local JSON fallback.
    this.useFirestore = (process.env.USE_FIRESTORE === 'true') && admin && admin.apps.length > 0;
    if (this.useFirestore) {
      this.db = admin.firestore();
      console.log('DatabaseManager: Connected to Cloud Firestore.');
    } else {
      this.baseDir = path.join(__dirname, '../data');
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
      console.log('DatabaseManager: Initialized local JSON database fallback.');
    }
  }

  /**
   * Reads all documents in a collection.
   * @param {string} collection - The collection name.
   * @returns {Promise<Array>} A list of documents.
   */
  async read(collection) {
    if (this.useFirestore) {
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
      const file = path.join(this.baseDir, `${collection}.json`);
      if (!fs.existsSync(file)) return [];
      try {
        const data = fs.readFileSync(file, 'utf8');
        return JSON.parse(data || '[]');
      } catch (e) {
        console.error(`Local database error reading file "${collection}":`, e);
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
    document.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    document.createdAt = new Date().toISOString();

    if (this.useFirestore) {
      try {
        await this.db.collection(collection).doc(document.id).set(document);
        return document;
      } catch (e) {
        console.error(`Firestore error writing to "${collection}":`, e);
        return document;
      }
    } else {
      const items = await this.read(collection);
      items.push(document);
      const file = path.join(this.baseDir, `${collection}.json`);
      try {
        fs.writeFileSync(file, JSON.stringify(items, null, 2), 'utf8');
      } catch (e) {
        console.error(`Local database error writing to file "${collection}":`, e);
      }
      return document;
    }
  }
}

module.exports = DatabaseManager;
