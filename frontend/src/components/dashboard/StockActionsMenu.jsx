import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart2,
  Briefcase,
  Check,
  Eye,
  EyeOff,
  Newspaper,
  Plus
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const StockActionsMenu = ({ item, onTogglePortfolio, onToggleWatchlist, onOpenChart, onOpenNews, onToggleIgnore }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef]);

  if (!item) return null;

  // Helper to safely handle clicks
  const handleAction = (e, action) => {
      e.stopPropagation(); // <--- CRITICAL FIX: Stops the card from opening
      action();
      setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef} onClick={e => e.stopPropagation()}>
      <button 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className={`p-1.5 rounded-md transition-colors ${isOpen ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
      >
        <Plus size={16} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 5, x: 0 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 5 }}
            className="absolute right-0 top-full mt-2 w-48 bg-[#0f172a] border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden"
          >
            <button 
              onClick={(e) => handleAction(e, () => onTogglePortfolio(item.symbol, item.is_in_portfolio))}
              className="w-full text-left px-4 py-3 hover:bg-slate-800 flex items-center justify-between group border-b border-slate-800/50"
            >
              <div className="flex items-center gap-3">
                <Briefcase size={16} className="text-emerald-400" />
                <span className="text-xs font-bold text-slate-300 group-hover:text-white">Portfolio</span>
              </div>
              {item.is_in_portfolio && <Check size={14} className="text-emerald-400" />}
            </button>

            <button 
              onClick={(e) => handleAction(e, () => onToggleWatchlist(item.symbol, item.is_watched))}
              className="w-full text-left px-4 py-3 hover:bg-slate-800 flex items-center justify-between group border-b border-slate-800/50"
            >
              <div className="flex items-center gap-3">
                <Eye size={16} className="text-indigo-400" />
                <span className="text-xs font-bold text-slate-300 group-hover:text-white">Watchlist</span>
              </div>
              {item.is_watched && <Check size={14} className="text-indigo-400" />}
            </button>

            <button 
              onClick={(e) => handleAction(e, () => onOpenChart(item.symbol))}
              className="w-full text-left px-4 py-3 hover:bg-slate-800 flex items-center gap-3 group border-b border-slate-800/50"
            >
              <BarChart2 size={16} className="text-slate-400 group-hover:text-blue-400" />
              <span className="text-xs font-bold text-slate-300 group-hover:text-white">View Chart</span>
            </button>

            <button 
              onClick={(e) => handleAction(e, () => onOpenNews(item.symbol))}
              className="w-full text-left px-4 py-3 hover:bg-slate-800 flex items-center gap-3 group border-b border-slate-800/50"
            >
              <Newspaper size={16} className="text-slate-400 group-hover:text-indigo-400" />
              <span className="text-xs font-bold text-slate-300 group-hover:text-white">Latest News</span>
            </button>

            <button 
                onClick={(e) => handleAction(e, () => onToggleIgnore(item.symbol))}
                className="w-full text-left px-4 py-3 hover:bg-rose-900/20 flex items-center gap-3 group"
              >
                <EyeOff size={16} className="text-slate-500 group-hover:text-rose-400" />
                <span className="text-xs font-bold text-slate-400 group-hover:text-rose-400">Ignore Stock</span>
              </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StockActionsMenu;