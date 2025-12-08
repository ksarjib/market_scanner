import axios from 'axios';

const API_URL = "http://127.0.0.1:8000";

// 1. Read from the environment variable
const API_KEY = process.env.REACT_APP_FINNHUB_API_KEY;

// Safety Check (Optional but helpful)
if (!API_KEY) {
  console.warn("Missing Finnhub API Key. Search will not work. Check your .env file.");
}

export const api = {
  scan: () => axios.get(`${API_URL}/scan`),
  addTicker: (symbol, target) => axios.post(`${API_URL}/add`, { symbol, target }),
  removeTicker: (symbol) => axios.post(`${API_URL}/remove`, { symbol }),
  
  // Portfolio
  addToPortfolio: (symbol) => axios.post(`${API_URL}/portfolio/add`, { symbol }),
  removeFromPortfolio: (symbol) => axios.post(`${API_URL}/portfolio/remove`, { symbol }),
  
  // Ignore
  ignoreStock: (symbol) => axios.post(`${API_URL}/ignore/stock`, { symbol }),
  ignoreSector: (sector) => axios.post(`${API_URL}/ignore/sector`, { sector }),
  ignoreSection: (section) => axios.post(`${API_URL}/ignore/section`, { section }),
  // NEW: Search for tickers using Finnhub
  searchSymbols: async (query) => {
    if (!query) return [];
    try {
      const response = await fetch(
        `https://finnhub.io/api/v1/search?q=${query}&token=${API_KEY}`
      );
      const data = await response.json();
      
      // Finnhub returns { count: 10, result: [...] }
      // We map it to match your app's format { symbol, name }
      return data.result
        .filter(item => !item.symbol.includes('.')) // Optional: Filter out non-US tickers if desired
        .map(item => ({
          symbol: item.displaySymbol,
          name: item.description,
        }))
        .slice(0, 10); // Limit to top 10 results
    } catch (error) {
      console.error("Search failed:", error);
      return [];
    }
  },
};

