const DB_NAME = 'TokoBelanjaDB';
const DB_VERSION = 2;
const STORE_NAME = 'favorites';

class IndexedDB {
  constructor() {
    this.db = null;
  }

  // Open database
  async open() {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Delete old 'stories' store if exists
        if (db.objectStoreNames.contains('stories')) {
          db.deleteObjectStore('stories');
        }
        
        // Create 'favorites' store
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
          });
          objectStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  // Add story to favorites
  async addFavorite(story) {
    try {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(story);

        request.onsuccess = () => {
          console.log('Story added to favorites:', story.id);
          resolve(story);
        };

        request.onerror = () => {
          reject(new Error('Failed to add story to favorites'));
        };
      });
    } catch (error) {
      console.error('Error adding story to favorites:', error);
      throw error;
    }
  }

  // Remove story from favorites
  async removeFavorite(id) {
    try {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => {
          console.log('Story removed from favorites:', id);
          resolve(id);
        };

        request.onerror = () => {
          reject(new Error('Failed to remove story from favorites'));
        };
      });
    } catch (error) {
      console.error('Error removing story from favorites:', error);
      throw error;
    }
  }

  // Check if story is favorite
  async isFavorite(id) {
    try {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
          resolve(!!request.result);
        };

        request.onerror = () => {
          reject(new Error('Failed to check favorite status'));
        };
      });
    } catch (error) {
      console.error('Error checking favorite status:', error);
      throw error;
    }
  }

  // Get all favorites
  async getAllFavorites() {
    try {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          console.log('Favorites retrieved from IndexedDB:', request.result.length);
          resolve(request.result);
        };

        request.onerror = () => {
          reject(new Error('Failed to get favorites from IndexedDB'));
        };
      });
    } catch (error) {
      console.error('Error getting favorites from IndexedDB:', error);
      throw error;
    }
  }

  // Get single favorite by ID
  async getFavorite(id) {
    try {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          reject(new Error('Failed to get favorite from IndexedDB'));
        };
      });
    } catch (error) {
      console.error('Error getting favorite from IndexedDB:', error);
      throw error;
    }
  }

  // Clear all favorites
  async clearAllFavorites() {
    try {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
          console.log('All favorites cleared from IndexedDB');
          resolve();
        };

        request.onerror = () => {
          reject(new Error('Failed to clear favorites from IndexedDB'));
        };
      });
    } catch (error) {
      console.error('Error clearing favorites from IndexedDB:', error);
      throw error;
    }
  }
}

export default new IndexedDB();

