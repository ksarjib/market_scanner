// src/services/api.js

// Point to your Python Backend
const API_URL = "http://127.0.0.1:8000";

export const api = {
  // --- SEARCH ---
  searchSymbols: async (query) => {
    if (!query) return [];
    try {
      const response = await fetch(`${API_URL}/search?q=${query}`);
      if (!response.ok) throw new Error("Search failed");
      return await response.json();
    } catch (error) {
      console.error(error);
      return [];
    }
  },

  // --- SCAN ---
  scan: async (strategy = 'MOMENTUM') => {
    try {
      const response = await fetch(`${API_URL}/scan?strategy=${strategy}`);
      if (!response.ok) throw new Error(`Scan failed with status ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(error);
      return { data: [], history: [], settings: { ignored_sections: [] } };
    }
  },

  // --- CRUD ACTIONS ---
  addTicker: async (symbol, target = 'watchlist') => {
    await fetch(`${API_URL}/ticker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, target })
    });
  },

  removeTicker: async (symbol) => {
    await fetch(`${API_URL}/ticker/${symbol}`, { method: 'DELETE' });
  },

  addToPortfolio: async (symbol) => {
    await fetch(`${API_URL}/portfolio/${symbol}`, { method: 'POST' });
  },

  removeFromPortfolio: async (symbol) => {
    await fetch(`${API_URL}/portfolio/${symbol}`, { method: 'DELETE' });
  },

  logWheelTrade: async (trade) => {
    await fetch(`${API_URL}/wheel/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trade)
    });
  },

  // --- NEWS ---
  fetchNews: async (symbol) => {
    try {
      const response = await fetch(`${API_URL}/news/${symbol}`);
      if (!response.ok) throw new Error("Failed to fetch news");
      return await response.json();
    } catch (error) {
      console.error(`Error fetching news for ${symbol}:`, error);
      return { summary: "Unable to load news.", feed: [] };
    }
  },

  // Mock ignore actions (unless you add backend endpoints for them)
  ignoreStock: async (symbol) => { console.log("Ignored", symbol); },
  ignoreSector: async (sector) => { console.log("Ignored Sector", sector); },
  ignoreSection: async (section) => { console.log("Ignored Section", section); },
};
