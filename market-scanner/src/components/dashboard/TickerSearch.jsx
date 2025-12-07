import {
    BarChart2,
    Briefcase,
    ChevronDown,
    Eye,
    Plus,
    Search
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// Mock DB for autocomplete
const TICKER_SUGGESTIONS = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corp' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'AMD', name: 'Adv. Micro Devices' },
  { symbol: 'AMZN', name: 'Amazon.com' },
  { symbol: 'MSFT', name: 'Microsoft Corp' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'META', name: 'Meta Platforms' },
  { symbol: 'SPY', name: 'SPDR S&P 500' },
  { symbol: 'QQQ', name: 'Invesco QQQ' },
];

const TickerSearch = ({ onAdd }) => {
  const [ticker, setTicker] = useState('');
  const [target, setTarget] = useState('watchlist'); // 'watchlist', 'portfolio', 'market'
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isTargetOpen, setIsTargetOpen] = useState(false);
  
  const wrapperRef = useRef(null);

  // Filter suggestions
  const suggestions = TICKER_SUGGESTIONS.filter(t => 
    t.symbol.toLowerCase().includes(ticker.toLowerCase()) || 
    t.name.toLowerCase().includes(ticker.toLowerCase())
  );

  // Click Outside to close both dropdowns
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

  const handleSubmit = (e) => {
    e && e.preventDefault();
    if (ticker.trim()) {
      onAdd(ticker.toUpperCase(), target);
      setTicker('');
      setIsSearchOpen(false);
    }
  };

  // Helper to render the active icon based on state (Target Selector)
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

  // New Helper: Renders the "Add To" Badge inside the suggestion list
  const renderActionBadge = () => {
    if (target === 'portfolio') {
        return (
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-400">
                <Briefcase size={10} />
                <span className="text-[10px] font-bold uppercase tracking-wide">Add to Portfolio</span>
            </div>
        );
    }
    if (target === 'market') {
        return (
            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-slate-300">
                <BarChart2 size={10} />
                <span className="text-[10px] font-bold uppercase tracking-wide">View Market</span>
            </div>
        );
    }
    // Default: Watchlist
    return (
        <div className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded text-indigo-400">
            <Eye size={10} />
            <span className="text-[10px] font-bold uppercase tracking-wide">Add to Watchlist</span>
        </div>
    );
  };

  return (
    <div 
      ref={wrapperRef}
      className="relative group hidden sm:flex items-center bg-slate-900/50 border border-slate-700/50 rounded-md shadow-sm h-8"
    >
      
      {/* --- CUSTOM TARGET DROPDOWN (Left Side) --- */}
      <div className="relative h-full border-r border-slate-700/50">
        <button 
            type="button"
            onClick={() => setIsTargetOpen(!isTargetOpen)}
            className="flex items-center gap-2 px-3 h-full hover:bg-slate-800/50 transition-colors cursor-pointer outline-none"
            title="Select where to add this ticker"
        >
            {getTargetIcon(target)}
            <span className="text-[10px] uppercase font-bold text-slate-400 w-16 text-left">{getTargetLabel(target)}</span>
            <ChevronDown size={10} className={`text-slate-500 transition-transform ${isTargetOpen ? 'rotate-180' : ''}`}/>
        </button>

        {isTargetOpen && (
            <ul className="absolute top-full left-0 mt-1 w-36 bg-[#0f172a] border border-slate-700 rounded-lg shadow-xl z-[60] py-1 overflow-hidden">
                <li onClick={() => { setTarget('portfolio'); setIsTargetOpen(false); }} className="px-3 py-2.5 hover:bg-slate-800 cursor-pointer flex items-center gap-2 group border-b border-slate-800/50 last:border-0">
                    <Briefcase size={14} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
                    <span className="text-xs text-slate-300 font-medium group-hover:text-white">Portfolio</span>
                </li>
                <li onClick={() => { setTarget('watchlist'); setIsTargetOpen(false); }} className="px-3 py-2.5 hover:bg-slate-800 cursor-pointer flex items-center gap-2 group border-b border-slate-800/50 last:border-0">
                    <Eye size={14} className="text-slate-500 group-hover:text-indigo-400 transition-colors" />
                    <span className="text-xs text-slate-300 font-medium group-hover:text-white">Watchlist</span>
                </li>
                <li onClick={() => { setTarget('market'); setIsTargetOpen(false); }} className="px-3 py-2.5 hover:bg-slate-800 cursor-pointer flex items-center gap-2 group">
                    <BarChart2 size={14} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
                    <span className="text-xs text-slate-300 font-medium group-hover:text-white">Market</span>
                </li>
            </ul>
        )}
      </div>

      {/* --- INPUT FIELD --- */}
      <form onSubmit={handleSubmit} className="relative flex items-center h-full">
        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
          <Plus size={14} className="text-slate-500" />
        </div>
        <input 
          type="text" 
          value={ticker} 
          onChange={(e) => {
            setTicker(e.target.value.toUpperCase());
            setIsSearchOpen(true);
            setIsTargetOpen(false); 
          }} 
          onFocus={() => setIsSearchOpen(true)}
          placeholder="TICKER" 
          className="bg-transparent text-slate-200 text-xs font-mono pl-7 pr-3 h-full w-24 focus:w-40 transition-all outline-none placeholder:text-slate-600 border-none ring-0" 
        />
      </form>

      {/* --- SEARCH SUGGESTIONS DROPDOWN (Results) --- */}
      {isSearchOpen && ticker.length > 0 && (
        <ul className="absolute top-full right-0 w-72 mt-1 bg-[#0f172a] border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden">
          {suggestions.length > 0 ? (
            suggestions.map((s) => (
              <li 
                key={s.symbol}
                onClick={() => {
                  setTicker(s.symbol);
                  onAdd(s.symbol, target);
                  setIsSearchOpen(false);
                  setTicker('');
                }}
                className="px-4 py-3 hover:bg-slate-800 cursor-pointer flex justify-between items-center border-b border-slate-800/50 last:border-0 group transition-colors"
              >
                <div className="flex flex-col">
                  <span className="font-bold text-slate-200 text-sm group-hover:text-white">{s.symbol}</span>
                  <span className="text-[10px] text-slate-500 group-hover:text-slate-400">{s.name}</span>
                </div>
                
                {/* --- THIS IS THE UPDATED BADGE SECTION --- */}
                {renderActionBadge()}

              </li>
            ))
          ) : (
            <li 
                onClick={handleSubmit}
                className="px-4 py-4 hover:bg-slate-800 cursor-pointer flex items-center gap-2 text-xs text-indigo-400 justify-center"
            >
                <Search size={12} />
                <span>Search API for "{ticker}"</span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default TickerSearch;