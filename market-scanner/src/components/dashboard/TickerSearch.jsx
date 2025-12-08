import {
  BarChart2,
  Briefcase,
  ChevronDown,
  Eye,
  Loader2,
  Plus,
  Search,
  X
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';

const TickerSearch = ({ onAdd, onRemove, portfolioSet = new Set(), watchlistSet = new Set() }) => {
  const [ticker, setTicker] = useState('');
  const [target, setTarget] = useState('watchlist'); 
  const [suggestions, setSuggestions] = useState([]); 
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isTargetOpen, setIsTargetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false); 
  
  const wrapperRef = useRef(null);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (ticker.length > 1) { 
        setIsLoading(true);
        const results = await api.searchSymbols(ticker);
        setSuggestions(results);
        setIsLoading(false);
        setIsSearchOpen(true);
      } else {
        setSuggestions([]);
        setIsSearchOpen(false);
      }
    }, 500); 
    return () => clearTimeout(delayDebounceFn);
  }, [ticker]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsSearchOpen(false);
        setIsTargetOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const isAlreadyAdded = (symbol) => {
      if (target === 'portfolio') return portfolioSet.has(symbol);
      if (target === 'watchlist') return watchlistSet.has(symbol);
      return false; 
  };

  const handleSubmit = (e) => {
    e && e.preventDefault();
    const cleanTicker = ticker.toUpperCase();
    if (cleanTicker) {
      if (!isAlreadyAdded(cleanTicker)) {
          onAdd(cleanTicker, target);
      }
      setTicker('');
      setIsSearchOpen(false);
    }
  };

  const getTargetIcon = (t) => {
    switch(t) {
        case 'portfolio': return <Briefcase size={14} className="text-emerald-400" />;
        case 'watchlist': return <Eye size={14} className="text-indigo-400" />;
        case 'market': return <BarChart2 size={14} className="text-slate-400" />;
        default: return <Eye size={14} className="text-indigo-400" />;
    }
  };

  const getTargetLabel = (t) => {
      switch(t) {
          case 'portfolio': return 'Portfolio';
          case 'watchlist': return 'Watchlist';
          case 'market': return 'Market';
          default: return 'Watchlist';
      }
  }

  // --- UPDATED BADGE RENDERER ---
  const renderActionBadge = (symbol) => {
    const exists = isAlreadyAdded(symbol);

    if (target === 'portfolio') {
        if (exists) {
            return (
                <div className="flex items-center gap-1.5 bg-rose-900/30 border border-rose-500/20 px-1.5 py-0.5 rounded text-rose-400 group-hover:bg-rose-500/20">
                    <X size={10} />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Remove</span>
                </div>
            );
        }
        return (
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-400">
                <Plus size={10} />
                <span className="text-[10px] font-bold uppercase tracking-wide">Add</span>
            </div>
        );
    }
    
    if (target === 'watchlist') {
        if (exists) {
            return (
                <div className="flex items-center gap-1.5 bg-rose-900/30 border border-rose-500/20 px-1.5 py-0.5 rounded text-rose-400 group-hover:bg-rose-500/20">
                    <X size={10} />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Remove</span>
                </div>
            );
        }
        return (
            <div className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded text-indigo-400">
                <Plus size={10} />
                <span className="text-[10px] font-bold uppercase tracking-wide">Add</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-slate-300">
            <BarChart2 size={10} />
            <span className="text-[10px] font-bold uppercase tracking-wide">View</span>
        </div>
    );
  };

  return (
    <div ref={wrapperRef} className="relative group hidden sm:flex items-center bg-slate-900/50 border border-slate-700/50 rounded-md shadow-sm h-8">
      
      {/* TARGET SELECTOR */}
      <div className="relative h-full border-r border-slate-700/50">
        <button type="button" onClick={() => setIsTargetOpen(!isTargetOpen)} className="flex items-center gap-2 px-3 h-full hover:bg-slate-800/50 transition-colors cursor-pointer outline-none" title="Select where to add this ticker">
            {getTargetIcon(target)}
            <span className="text-[10px] uppercase font-bold text-slate-400 w-16 text-left">{getTargetLabel(target)}</span>
            <ChevronDown size={10} className={`text-slate-500 transition-transform ${isTargetOpen ? 'rotate-180' : ''}`}/>
        </button>
        {isTargetOpen && (
            <ul className="absolute top-full left-0 mt-1 w-36 bg-[#0f172a] border border-slate-700 rounded-lg shadow-xl z-[60] py-1 overflow-hidden">
                <li onClick={() => { setTarget('portfolio'); setIsTargetOpen(false); }} className="px-3 py-2.5 hover:bg-slate-800 cursor-pointer flex items-center gap-2 group border-b border-slate-800/50 last:border-0"><Briefcase size={14} className="text-slate-500 group-hover:text-emerald-400 transition-colors" /><span className="text-xs text-slate-300 font-medium group-hover:text-white">Portfolio</span></li>
                <li onClick={() => { setTarget('watchlist'); setIsTargetOpen(false); }} className="px-3 py-2.5 hover:bg-slate-800 cursor-pointer flex items-center gap-2 group border-b border-slate-800/50 last:border-0"><Eye size={14} className="text-slate-500 group-hover:text-indigo-400 transition-colors" /><span className="text-xs text-slate-300 font-medium group-hover:text-white">Watchlist</span></li>
                <li onClick={() => { setTarget('market'); setIsTargetOpen(false); }} className="px-3 py-2.5 hover:bg-slate-800 cursor-pointer flex items-center gap-2 group"><BarChart2 size={14} className="text-slate-500 group-hover:text-slate-300 transition-colors" /><span className="text-xs text-slate-300 font-medium group-hover:text-white">Market</span></li>
            </ul>
        )}
      </div>

      {/* INPUT */}
      <form onSubmit={handleSubmit} className="relative flex items-center h-full">
        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
          {isLoading ? <Loader2 size={14} className="text-indigo-400 animate-spin" /> : <Plus size={14} className="text-slate-500" />}
        </div>
        <input type="text" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} onFocus={() => { if(ticker.length > 1) setIsSearchOpen(true); }} placeholder="TICKER" className="bg-transparent text-slate-200 text-xs font-mono pl-7 pr-3 h-full w-24 focus:w-40 transition-all outline-none placeholder:text-slate-600 border-none ring-0" />
      </form>

      {/* RESULTS DROPDOWN */}
      {isSearchOpen && ticker.length > 0 && (
        <ul className="absolute top-full right-0 w-72 mt-1 bg-[#0f172a] border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden max-h-80 overflow-y-auto">
          {suggestions.length > 0 ? (
            suggestions.map((s) => {
              const added = isAlreadyAdded(s.symbol);
              return (
                <li 
                  key={s.symbol}
                  onClick={() => {
                    // TOGGLE LOGIC
                    if (added) {
                        onRemove(s.symbol, target);
                    } else {
                        onAdd(s.symbol, target);
                    }
                    // Don't close immediately if you want them to see the state change, 
                    // but usually closing is better UX. 
                    setIsSearchOpen(false);
                    setTicker('');
                  }}
                  className="px-4 py-3 hover:bg-slate-800 cursor-pointer flex justify-between items-center border-b border-slate-800/50 last:border-0 group transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-200 text-sm group-hover:text-white">{s.symbol}</span>
                    <span className="text-[10px] text-slate-500 group-hover:text-slate-400 line-clamp-1">{s.name}</span>
                  </div>
                  {renderActionBadge(s.symbol)}
                </li>
              );
            })
          ) : (
            <li onClick={handleSubmit} className="px-4 py-4 hover:bg-slate-800 cursor-pointer flex items-center gap-2 text-xs text-indigo-400 justify-center">
                <Search size={12} />
                <span>{isLoading ? 'Searching...' : `Search Local DB for "${ticker}"`}</span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default TickerSearch;