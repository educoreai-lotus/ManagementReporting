// Browser cache management for user preferences and temporary data

const CACHE_PREFIX = 'mr_';

export const browserCache = {
  // User preferences
  setPreference: (key, value) => {
    try {
      localStorage.setItem(`${CACHE_PREFIX}pref_${key}`, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving preference:', error);
    }
  },

  getPreference: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(`${CACHE_PREFIX}pref_${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error reading preference:', error);
      return defaultValue;
    }
  },

  // Temporary data cache (sessionStorage for short-term, localStorage for persistent)
  setTempData: (key, value, ttl = 300000) => { // 5 minutes default
    try {
      const data = {
        value,
        expires: Date.now() + ttl,
      };
      sessionStorage.setItem(`${CACHE_PREFIX}temp_${key}`, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving temp data:', error);
    }
  },

  getTempData: (key) => {
    try {
      const item = sessionStorage.getItem(`${CACHE_PREFIX}temp_${key}`);
      if (!item) return null;

      const data = JSON.parse(item);
      if (Date.now() > data.expires) {
        sessionStorage.removeItem(`${CACHE_PREFIX}temp_${key}`);
        return null;
      }
      return data.value;
    } catch (error) {
      console.error('Error reading temp data:', error);
      return null;
    }
  },

  // Persistent data cache (localStorage - survives browser close)
  setPersistentData: (key, value) => {
    try {
      const data = {
        value,
        savedAt: Date.now(),
      };
      localStorage.setItem(`${CACHE_PREFIX}persist_${key}`, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving persistent data:', error);
    }
  },

  getPersistentData: (key) => {
    try {
      const item = localStorage.getItem(`${CACHE_PREFIX}persist_${key}`);
      if (!item) return null;

      const data = JSON.parse(item);
      return data.value;
    } catch (error) {
      console.error('Error reading persistent data:', error);
      return null;
    }
  },

  // Clear cache
  clear: (prefix) => {
    if (!prefix) {
      localStorage.clear();
      return;
    }
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(prefix)) localStorage.removeItem(key);
    });
  },
};

