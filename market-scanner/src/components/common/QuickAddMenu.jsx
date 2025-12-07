import { Check, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const QuickAddMenu = ({ item, onTogglePortfolio, onToggleWatchlist }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef]);

  const inPortfolio = item.is_in_portfolio;
  const inWatchlist = item.is_watched;

  return (
    <div className="relative" ref={menuRef} onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1 rounded-full transition ${isOpen ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
      >
         <Plus size={14} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-8 w-40 bg-slate-900 border border-slate-600 rounded-md shadow-[0_10px_40px_-10px_rgba(0,0,0,1)] z-[999] flex flex-col overflow-hidden ring-1 ring-white/10">
           <div
             onClick={() => onTogglePortfolio(item.symbol, inPortfolio)}
             className="flex items-center justify-between px-4 py-3 text-xs font-bold text-slate-100 hover:bg-slate-800 cursor-pointer border-b border-slate-700/50"
           >
             <span>Portfolio</span>
             {inPortfolio && <Check size={14} className="text-emerald-400" />}
           </div>
           <div
             onClick={() => onToggleWatchlist(item.symbol, inWatchlist)}
             className="flex items-center justify-between px-4 py-3 text-xs font-bold text-slate-100 hover:bg-slate-800 cursor-pointer"
           >
             <span>Watchlist</span>
             {inWatchlist && <Check size={14} className="text-indigo-400" />}
           </div>
        </div>
      )}
    </div>
  );
};

export default QuickAddMenu;