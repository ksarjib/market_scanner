// src/components/dashboard/Watchlist.jsx
import { useState } from 'react';
import TickerSearch from './TickerSearch'; // Import sibling component

const Watchlist = () => {
  const [watchlist, setWatchlist] = useState([]);

  const handleAdd = (ticker) => {
    // Avoid duplicates
    if (!watchlist.find((t) => t.symbol === ticker.symbol)) {
      setWatchlist([...watchlist, ticker]);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">My Portfolio</h2>
        
        {/* The Search Component sits here */}
        <TickerSearch onAddTicker={handleAdd} />
      </div>

      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b text-gray-500 text-sm uppercase">
            <th className="py-2">Symbol</th>
            <th className="py-2">Name</th>
            <th className="py-2 text-right">Price</th>
          </tr>
        </thead>
        <tbody>
          {watchlist.map((t) => (
            <tr key={t.symbol} className="border-b hover:bg-gray-50">
              <td className="py-3 font-semibold">{t.symbol}</td>
              <td className="py-3 text-gray-600">{t.name}</td>
              <td className="py-3 text-right text-green-600 font-mono">
                ${t.price.toFixed(2)}
              </td>
            </tr>
          ))}
          {watchlist.length === 0 && (
             <tr>
               <td colSpan="3" className="py-8 text-center text-gray-400">
                 No stocks in watchlist. Add one above.
               </td>
             </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Watchlist;