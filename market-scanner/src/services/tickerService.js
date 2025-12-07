// src/services/tickerService.js

export const searchTickers = async (query) => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 200));

  const MOCK_DB = [
    { symbol: 'AAPL', name: 'Apple Inc.', price: 150.25 },
    { symbol: 'TSLA', name: 'Tesla, Inc.', price: 240.50 },
    { symbol: 'NVDA', name: 'NVIDIA Corp', price: 450.10 },
    { symbol: 'MSFT', name: 'Microsoft Corp', price: 312.80 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 135.60 },
  ];

  if (!query) return [];

  return MOCK_DB.filter(
    (t) =>
      t.symbol.toLowerCase().includes(query.toLowerCase()) ||
      t.name.toLowerCase().includes(query.toLowerCase())
  );
};