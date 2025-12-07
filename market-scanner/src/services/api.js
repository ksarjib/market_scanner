import axios from 'axios';

const API_URL = "http://127.0.0.1:8000";

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
};