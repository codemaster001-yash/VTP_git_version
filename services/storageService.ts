
import { Trip } from '../types';

const DB_NAME = 'VisualTripPlannerDB';
const DB_VERSION = 2; // Incremented version to trigger upgrade
const STORE_CURRENT = 'current_trip';
const STORE_HISTORY = 'trip_history';
const STORE_SETTINGS = 'user_settings';

// Open the Database
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_CURRENT)) {
        db.createObjectStore(STORE_CURRENT);
      }
      if (!db.objectStoreNames.contains(STORE_HISTORY)) {
        db.createObjectStore(STORE_HISTORY);
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS);
      }
    };
  });
};

// Generic Save
const saveToStore = async (storeName: string, key: string, data: any) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data, key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Generic Load
const loadFromStore = async (storeName: string, key: string) => {
  const db = await openDB();
  return new Promise<any>((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const storageService = {
  saveCurrentTrip: async (trip: Trip) => {
    try {
      await saveToStore(STORE_CURRENT, 'active', trip);
    } catch (e) {
      console.error("Failed to save current trip to IDB", e);
    }
  },

  loadCurrentTrip: async (): Promise<Trip | null> => {
    try {
      return await loadFromStore(STORE_CURRENT, 'active');
    } catch (e) {
      console.error("Failed to load current trip from IDB", e);
      return null;
    }
  },

  saveHistory: async (trips: Trip[]) => {
    try {
      await saveToStore(STORE_HISTORY, 'list', trips);
    } catch (e) {
      console.error("Failed to save history to IDB", e);
    }
  },

  loadHistory: async (): Promise<Trip[]> => {
    try {
      const result = await loadFromStore(STORE_HISTORY, 'list');
      return result || [];
    } catch (e) {
      console.error("Failed to load history from IDB", e);
      return [];
    }
  },

  saveApiKey: async (key: string) => {
    try {
      await saveToStore(STORE_SETTINGS, 'api_key', key);
    } catch (e) {
      console.error("Failed to save API key", e);
    }
  },

  loadApiKey: async (): Promise<string | null> => {
    try {
      return await loadFromStore(STORE_SETTINGS, 'api_key');
    } catch (e) {
      return null;
    }
  }
};
