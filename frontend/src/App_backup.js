import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle, BarChart2,
  Briefcase,
  Check,
  ChevronDown, ChevronRight,
  Clock,
  Eye, EyeOff,
  Globe,
  Layers,
  Plus,
  RefreshCw,
  Settings,
  Star,
  Trash2,
  TrendingDown,
  TrendingUp,
  Volume2, VolumeX,
  X,
  Zap
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTicker, setNewTicker] = useState("");
  const [addTarget, setAddTarget] = useState("watchlist");
  const [lastUpdated, setLastUpdated] = useState("Scanning...");
   
  const [refreshRate, setRefreshRate] = useState(60); 
  const [countdown, setCountdown] = useState(60);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);

  const [speakingTicker, setSpeakingTicker] = useState(null); 
   
  // --- CLICK OUTSIDE LOGIC FOR SETTINGS ---
  const settingsRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettings(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [settingsRef]);

  // --- SETTINGS STATE ---
  const [audioFilters, setAudioFilters] = useState(() => {
    const saved = localStorage.getItem('audioFilters');
    return saved ? JSON.parse(saved) : { portfolio: true, watchlist: true, market: true };
  });

  const [speechConfig, setSpeechConfig] = useState(() => {
    const saved = localStorage.getItem('speechConfig');
    // REMOVED: 'signalFirst' option
    return saved ? JSON.parse(saved) : { 
      price: true, 
      signal: true, 
      reason: true 
    };
  });
   
  // DB SYNCED STATE
  const [ignoredStocks, setIgnoredStocks] = useState(new Set());
  const [ignoredSectors, setIgnoredSectors] = useState(new Set());
  const [ignoredSections, setIgnoredSections] = useState(new Set());

  useEffect(() => { localStorage.setItem('audioFilters', JSON.stringify(audioFilters)); }, [audioFilters]);
  useEffect(() => { localStorage.setItem('speechConfig', JSON.stringify(speechConfig)); }, [speechConfig]);

  // --- ACTIONS ---
  const togglePortfolio = async (symbol, isInPortfolio) => {
    setData(prev => prev.map(item => item.symbol === symbol ? { ...item, is_in_portfolio: !isInPortfolio } : item));
    try {
      if (isInPortfolio) await axios.post(`${API_URL}/portfolio/remove`, { symbol });
      else await axios.post(`${API_URL}/portfolio/add`, { symbol });
    } catch (e) { console.error(e); }
  };

  const toggleWatchlist = async (symbol, isWatched) => {
    setData(prev => prev.map(item => item.symbol === symbol ? { ...item, is_watched: !isWatched } : item));
    try {
      if (isWatched) await axios.post(`${API_URL}/remove`, { symbol });
      else await axios.post(`${API_URL}/add`, { symbol, target: 'watchlist' });
    } catch (e) { console.error(e); }
  };

  const toggleIgnoreStock = (symbol) => {
    const newSet = new Set(ignoredStocks);
    if (newSet.has(symbol)) newSet.delete(symbol); else newSet.add(symbol);
    setIgnoredStocks(newSet);
    axios.post(`${API_URL}/ignore/stock`, { symbol }).catch(console.error);
  };

  const toggleIgnoreSector = (sector) => {
    const newSet = new Set(ignoredSectors);
    if (newSet.has(sector)) newSet.delete(sector); else newSet.add(sector);
    setIgnoredSectors(newSet);
    axios.post(`${API_URL}/ignore/sector`, { sector }).catch(console.error);
  };

  const toggleIgnoreSection = (section) => {
    const newSet = new Set(ignoredSections);
    if (newSet.has(section)) newSet.delete(section); else newSet.add(section);
    setIgnoredSections(newSet);
    axios.post(`${API_URL}/ignore/section`, { section }).catch(console.error);
  };

  // --- SPEECH GENERATION ---
  const generateSpeech = (item) => {
    let text = `${item.company_name || item.symbol}. `; 
    
    // Standard Order: Signal -> Price -> Reason
    if (speechConfig.signal) {
        text += item.is_buy ? "Buy Signal. " : "Sell Signal. ";
    }
    
    if (speechConfig.price) {
        text += `at ${Math.round(item.price)} dollars. `;
    }

    if (speechConfig.reason && item.reason) {
        text += `${item.reason}`;
    }

    return text;
  };

  const speakQueue = (queue, index = 0) => {
    if (index >= queue.length) { setSpeakingTicker(null); return; }
    const item = queue[index];
    setSpeakingTicker(item.symbol);

    const textToSpeak = generateSpeech(item);
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    
    utterance.rate = 1.0;
    window.currentUtterance = utterance;
    utterance.onend = () => speakQueue(queue, index + 1);
    window.speechSynthesis.speak(utterance);
  };

  const handleSpeech = useCallback((items, force = false, currentIgnoredSections = new Set()) => {
    if (!audioEnabled && !force) return;
    window.speechSynthesis.cancel();
    setSpeakingTicker(null);

    let signalsToAnnounce = items.filter(d => {
      if (!d.is_buy && !d.is_sell) return false;
      const visibleInPortfolio = d.is_in_portfolio && !currentIgnoredSections.has('portfolio');
      const visibleInWatchlist = d.is_watched && !currentIgnoredSections.has('watchlist');
      const visibleInMarket    = !d.is_in_portfolio && !d.is_watched && !currentIgnoredSections.has('market');

      if (!visibleInPortfolio && !visibleInWatchlist && !visibleInMarket) return false;
      if (d.is_in_portfolio) { if (!audioFilters.portfolio) return false; }
      else if (d.is_watched) { if (!audioFilters.watchlist) return false; }
      else { if (!audioFilters.market) return false; }
      return true;
    });

    // Helper to determine if a stock matches the current Voice Filter settings
    const isSpoken = (d) => {
        if (d.is_in_portfolio) return audioFilters.portfolio;
        if (d.is_watched) return audioFilters.watchlist;
        return audioFilters.market; 
    };

    signalsToAnnounce.sort((a, b) => {
        // PRIORITY 1: Stocks that will be Spoken
        const aSpoken = isSpoken(a);
        const bSpoken = isSpoken(b);
        if (aSpoken !== bSpoken) return bSpoken - aSpoken; 

        // PRIORITY 2: Watchlist
        if (a.is_watched !== b.is_watched) return b.is_watched - a.is_watched;
        
        // PRIORITY 3: Portfolio
        if (a.is_in_portfolio !== b.is_in_portfolio) return b.is_in_portfolio - a.is_in_portfolio;
        
        return 0;
    });

    if (signalsToAnnounce.length > 0) {
      const summary = new SpeechSynthesisUtterance(`Found ${signalsToAnnounce.length} alerts.`);
      summary.rate = 1.1; 
      summary.onend = () => speakQueue(signalsToAnnounce);
      window.speechSynthesis.speak(summary);
    }
  }, [audioEnabled, audioFilters, speechConfig]);

  // --- FETCH ---
  const fetchData = useCallback(async () => {
    if (data.length === 0) setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/scan`);
      const newData = res.data.data;
      const settings = res.data.settings;

      setData(newData);
      setLastUpdated(new Date().toLocaleTimeString());
      setCountdown(refreshRate);
       
      const dbIgnoredStocks = new Set();
      const dbIgnoredSectors = new Set();
      newData.forEach(d => {
          if (d.is_ignored) dbIgnoredStocks.add(d.symbol);
          if (d.is_sector_ignored) dbIgnoredSectors.add(d.sector);
      });
      const dbIgnoredSections = new Set(settings.ignored_sections);

      setIgnoredStocks(dbIgnoredStocks);
      setIgnoredSectors(dbIgnoredSectors);
      setIgnoredSections(dbIgnoredSections);

      handleSpeech(newData, false, dbIgnoredSections);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [refreshRate, handleSpeech]);

  const handleAddTicker = async (e) => {
    e.preventDefault();
    if (!newTicker) return;
    await axios.post(`${API_URL}/add`, { symbol: newTicker, target: addTarget });
    setNewTicker("");
    fetchData();
  };

  const handleRemoveTicker = async (symbol) => {
    await axios.post(`${API_URL}/remove`, { symbol });
    fetchData();
  };

  useEffect(() => { fetchData(); }, []); 
  useEffect(() => { const i = setInterval(() => fetchData(), refreshRate * 1000); return () => clearInterval(i); }, [refreshRate, fetchData]); 
  useEffect(() => { const t = setInterval(() => setCountdown((p) => (p > 0 ? p - 1 : 0)), 1000); return () => clearInterval(t); }, []);
  const handleRateChange = (e) => { const r = parseInt(e.target.value); setRefreshRate(r); setCountdown(r); setTimeout(fetchData, 100); };

  const toggleAudio = () => {
    if (!audioEnabled) {
      const u = new SpeechSynthesisUtterance("Audio active."); window.speechSynthesis.speak(u);
      setAudioEnabled(true);
      if (data.length > 0) setTimeout(() => handleSpeech(data, true, ignoredSections), 1000);
    } else {
      window.speechSynthesis.cancel();
      setSpeakingTicker(null);
      setAudioEnabled(false);
    }
  };

  // --- DATA FILTERING ---
  const activeSignals = data.filter(d => {
      if (!d.is_buy && !d.is_sell) return false;
       
      const visibleInPortfolio = d.is_in_portfolio && !ignoredSections.has('portfolio');
      const visibleInWatchlist = d.is_watched && !ignoredSections.has('watchlist');
      const visibleInMarket    = !d.is_in_portfolio && !d.is_watched && !ignoredSections.has('market');
       
      return visibleInPortfolio || visibleInWatchlist || visibleInMarket;
  });

  const isSpoken = (d) => {
      if (d.is_in_portfolio) return audioFilters.portfolio;
      if (d.is_watched) return audioFilters.watchlist;
      return audioFilters.market; 
  };

  activeSignals.sort((a, b) => {
      // PRIORITY 1: Stocks that will be Spoken
      const aSpoken = isSpoken(a);
      const bSpoken = isSpoken(b);
      if (aSpoken !== bSpoken) return bSpoken - aSpoken; 

      // PRIORITY 2: Watchlist
      if (a.is_watched !== b.is_watched) return b.is_watched - a.is_watched;
      
      // PRIORITY 3: Portfolio
      if (a.is_in_portfolio !== b.is_in_portfolio) return b.is_in_portfolio - a.is_in_portfolio;
      
      return 0;
  });

  const portfolio = data.filter(d => d.is_in_portfolio);
  const watchlist = data.filter(d => d.is_watched);
  const market = data.filter(d => d.sector !== 'Other' && d.sector !== 'Watchlist');

  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-indigo-500/30 pb-20">
       
      {/* CHART MODAL */}
      <AnimatePresence>
        {selectedStock && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedStock(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-6xl h-[80vh] bg-[#0f172a] rounded-xl border border-slate-700 shadow-2xl overflow-hidden relative" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center p-3 border-b border-slate-700 bg-slate-900">
                <div className="flex items-center gap-2"><h2 className="text-lg font-bold text-white">{selectedStock}</h2><span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">LIVE VIEW</span></div>
                <button onClick={() => setSelectedStock(null)} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"><X size={20} /></button>
              </div>
              <iframe title="TradingView" className="w-full h-full" src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_1&symbol=${selectedStock}&interval=D&hidesidetoolbar=1&symboledit=1&saveimage=1&toolbarbg=F1F3F6&studies=[]&theme=dark&style=1&timezone=Etc%2FUTC`} allowTransparency="true" scrolling="no" allowFullScreen />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="sticky top-0 z-50 bg-[#020617]/95 backdrop-blur-md border-b border-slate-800/80 shadow-lg h-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-lg border border-white/10 shadow-xl"><Activity size={20} className="text-white" /></div>
              <div><h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">TERMINAL<span className="text-indigo-500">.PRO</span></h1><p className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase flex items-center gap-1 mt-0.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> System Online</p></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-slate-900/50 rounded-md border border-slate-800 p-1">
                <button onClick={toggleAudio} className={`p-1.5 rounded transition ${audioEnabled ? 'text-emerald-400' : 'text-rose-400'}`}>{audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}</button>
                <div className="w-px h-4 bg-slate-700 mx-1"></div>
                
                {/* SETTINGS MENU WITH CLICK OUTSIDE REF */}
                <div className="relative" ref={settingsRef}>
                  <button onClick={() => setShowSettings(!showSettings)} className={`p-1.5 rounded transition hover:text-white ${showSettings ? 'text-indigo-400' : 'text-slate-500'}`}><Settings size={16} /></button>
                  {showSettings && (
                    <div className="absolute top-10 right-0 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-3 z-50">
                      <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">Voice Alert Filters</div>
                      <div className="space-y-2">
                        <label className="flex items-center justify-between text-xs cursor-pointer"><span className="text-slate-300">My Portfolio</span><input type="checkbox" checked={audioFilters.portfolio} onChange={(e) => setAudioFilters({...audioFilters, portfolio: e.target.checked})} className="accent-indigo-500" /></label>
                        <label className="flex items-center justify-between text-xs cursor-pointer"><span className="text-slate-300">Watchlist</span><input type="checkbox" checked={audioFilters.watchlist} onChange={(e) => setAudioFilters({...audioFilters, watchlist: e.target.checked})} className="accent-indigo-500" /></label>
                        <label className="flex items-center justify-between text-xs cursor-pointer"><span className="text-slate-300">Market Overview</span><input type="checkbox" checked={audioFilters.market} onChange={(e) => setAudioFilters({...audioFilters, market: e.target.checked})} className="accent-indigo-500" /></label>
                      </div>

                      <div className="h-px bg-slate-700 my-2"></div>

                      <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">Voice Content</div>
                      <div className="space-y-2">
                        {/* REMOVED "Signal First" option */}
                        <label className="flex items-center justify-between text-xs cursor-pointer group">
                           <div className="flex items-center gap-2"><span className="text-slate-300 group-hover:text-white">Price</span></div>
                           <input type="checkbox" checked={speechConfig.price} onChange={(e) => setSpeechConfig({...speechConfig, price: e.target.checked})} className="accent-indigo-500" />
                        </label>
                        <label className="flex items-center justify-between text-xs cursor-pointer group">
                           <div className="flex items-center gap-2"><span className="text-slate-300 group-hover:text-white">Signal Type</span></div>
                           <input type="checkbox" checked={speechConfig.signal} onChange={(e) => setSpeechConfig({...speechConfig, signal: e.target.checked})} className="accent-indigo-500" />
                        </label>
                         <label className="flex items-center justify-between text-xs cursor-pointer group">
                           <div className="flex items-center gap-2"><span className="text-slate-300 group-hover:text-white">Reason</span></div>
                           <input type="checkbox" checked={speechConfig.reason} onChange={(e) => setSpeechConfig({...speechConfig, reason: e.target.checked})} className="accent-indigo-500" />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="hidden md:flex items-center bg-slate-900/50 rounded border border-slate-800">
                <div className="flex flex-col items-end px-3 py-1 border-r border-slate-800"><span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Next Scan</span><span className={`text-xs font-mono font-bold ${countdown < 10 ? 'text-rose-400' : 'text-emerald-400'}`}>{formatTime(countdown)}</span></div>
                <div className="relative group px-2"><Clock size={14} className="text-slate-500 absolute left-2 top-2 pointer-events-none"/><select value={refreshRate} onChange={handleRateChange} className="bg-transparent text-xs font-bold text-slate-400 pl-6 pr-1 py-1.5 outline-none cursor-pointer hover:text-white appearance-none"><option value={30}>30s</option><option value={60}>1m</option><option value={120}>2m</option><option value={300}>5m</option></select></div>
              </div>
               <form onSubmit={handleAddTicker} className="relative group hidden sm:flex items-center bg-slate-900/50 border border-slate-700/50 rounded-md">
                <div className="relative border-r border-slate-700/50"><select value={addTarget} onChange={(e) => setAddTarget(e.target.value)} className="bg-transparent text-[10px] uppercase font-bold text-slate-400 pl-2 pr-6 py-1.5 outline-none cursor-pointer hover:text-indigo-400 appearance-none h-full"><option value="watchlist" className="bg-slate-900">Watchlist</option><option value="market" className="bg-slate-900">Market</option></select><ChevronDown size={10} className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"/></div>
                <div className="relative"><div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none"><Plus size={14} className="text-slate-500" /></div><input type="text" value={newTicker} onChange={(e) => setNewTicker(e.target.value.toUpperCase())} placeholder="TICKER" className="bg-transparent text-slate-200 text-xs font-mono pl-7 pr-3 py-1.5 w-24 focus:w-32 transition-all outline-none" /></div>
                <button type="submit" className="hidden"></button>
              </form>
              <button onClick={fetchData} className="p-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-indigo-600 rounded-md border border-slate-700/50 transition-all"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
       
        {/* 1. ACTIVE SIGNALS */}
        {(loading && activeSignals.length === 0) ? <SkeletonCards /> : activeSignals.length > 0 && (
          <CollapsibleSection title="Active Signals" count={activeSignals.length} icon={<Zap className="text-amber-400" size={14} />} defaultOpen={true} onToggleIgnore={() => toggleIgnoreSection('signals')} isIgnored={ignoredSections.has('signals')}>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-1">
              <AnimatePresence>
                {activeSignals.map((item) => (
                  <SignalCard 
                    key={item.symbol} item={item} 
                    onTogglePortfolio={togglePortfolio} onToggleWatchlist={toggleWatchlist} 
                    onToggleIgnore={toggleIgnoreStock} 
                    isSpeaking={speakingTicker === item.symbol} onOpenChart={() => setSelectedStock(item.symbol)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </CollapsibleSection>
        )}

        {/* 2. MY PORTFOLIO */}
        <CollapsibleSection title="My Portfolio" count={portfolio.length} icon={<Briefcase className="text-emerald-400" size={14} />} defaultOpen={true} onToggleIgnore={() => toggleIgnoreSection('portfolio')} isIgnored={ignoredSections.has('portfolio')}>
          {loading && portfolio.length === 0 ? <SkeletonTable /> : (
            <StockTable 
                data={portfolio} onRemove={(sym) => togglePortfolio(sym, true)} isPortfolio={true} 
                onTogglePortfolio={togglePortfolio} onToggleWatchlist={toggleWatchlist} onToggleIgnore={toggleIgnoreStock} 
                ignoredStocks={ignoredStocks} sectionIgnored={ignoredSections.has('portfolio')}
                onOpenChart={setSelectedStock}
            />
          )}
        </CollapsibleSection>

        {/* 3. WATCHLIST */}
        <CollapsibleSection title="Watchlist" count={watchlist.length} icon={<Globe className="text-indigo-400" size={14} />} defaultOpen={true} updated={lastUpdated} onToggleIgnore={() => toggleIgnoreSection('watchlist')} isIgnored={ignoredSections.has('watchlist')}>
          {loading && watchlist.length === 0 ? <SkeletonTable /> : (
            <StockTable 
                data={watchlist} onRemove={handleRemoveTicker} isWatchlist={true} 
                onTogglePortfolio={togglePortfolio} onToggleWatchlist={toggleWatchlist} onToggleIgnore={toggleIgnoreStock} 
                ignoredStocks={ignoredStocks} sectionIgnored={ignoredSections.has('watchlist')} 
                onOpenChart={setSelectedStock}
            />
          )}
        </CollapsibleSection>

        {/* 4. MARKET OVERVIEW */}
        {(loading && market.length === 0) ? <SkeletonTable /> : market.length > 0 && (
           <CollapsibleSection title="Market Overview" icon={<BarChart2 className="text-slate-400" size={14} />} defaultOpen={true} onToggleIgnore={() => toggleIgnoreSection('market')} isIgnored={ignoredSections.has('market')}>
              <StockTable 
                data={market} onRemove={handleRemoveTicker} isWatchlist={false} groupBySector={true} 
                onTogglePortfolio={togglePortfolio} onToggleWatchlist={toggleWatchlist} onToggleIgnore={toggleIgnoreStock} onToggleSectorIgnore={toggleIgnoreSector} 
                ignoredStocks={ignoredStocks} ignoredSectors={ignoredSectors} sectionIgnored={ignoredSections.has('market')} 
                onOpenChart={setSelectedStock}
              />
          </CollapsibleSection>
        )}
      </main>
    </div>
  );
}

// --- SUB COMPONENTS ---

// 1. QUICK ADD MENU COMPONENT
function QuickAddMenu({ item, onTogglePortfolio, onToggleWatchlist }) {
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
}

// 2. SIGNAL CARD
function SignalCard({ item, onTogglePortfolio, onToggleWatchlist, onToggleIgnore, isSpeaking, onOpenChart }) {
  const isBuy = item.is_buy;
  return (
    <motion.div 
        onClick={() => onOpenChart()}
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} 
        // CRITICAL: z-0 here allows stacking
        className={`relative rounded-lg p-3 transition-all hover:-translate-y-1 cursor-pointer group ${isSpeaking ? 'ring-2 ring-orange-500 scale-[1.02] z-10 shadow-[0_0_30px_rgba(249,115,22,0.4)]' : ''} ${isBuy ? 'bg-gradient-to-b from-[#064e3b]/30 to-[#020617] border border-emerald-500/30' : 'bg-gradient-to-b from-[#881337]/30 to-[#020617] border border-rose-500/30'}`}
    >
      <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none z-0">
         <div className={`absolute -right-6 -top-6 w-20 h-20 rounded-full blur-[40px] opacity-20 ${isBuy ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
      </div>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-2">
          <div className="overflow-hidden mr-2">
             <h3 className="text-sm font-bold text-white tracking-tight truncate leading-tight mb-0.5" title={item.company_name}>{item.company_name || item.symbol}</h3>
             <div className="flex items-center gap-1">
               <div className="text-[10px] text-slate-500 font-bold">{item.symbol}</div>
               {item.is_watched && <Star size={10} className="text-amber-400 fill-amber-400" />}
             </div>
          </div>
          <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
              <button onClick={() => onToggleIgnore(item.symbol)} className="p-1 rounded-full text-slate-500 hover:text-white hover:bg-slate-800 transition"><EyeOff size={14}/></button>
              <QuickAddMenu item={item} onTogglePortfolio={onTogglePortfolio} onToggleWatchlist={onToggleWatchlist} />
          </div>
        </div>

        <div className="flex justify-between items-center mb-2">
           <div className={`flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-sm border ${isBuy ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
              {isBuy ? <TrendingUp size={10}/> : <TrendingDown size={10}/>} {isBuy ? 'BULL' : 'BEAR'}
           </div>
           <div className="text-right shrink-0"><p className="text-sm font-mono font-bold text-slate-200">${item.price.toFixed(2)}</p></div>
        </div>

        <div className="grid grid-cols-3 gap-1 mb-2">
            <div className="bg-slate-900/50 rounded p-1 text-center border border-slate-800"><div className="text-[8px] text-slate-500 uppercase">RSI</div><div className={`text-[10px] font-bold ${item.rsi > 70 ? 'text-rose-400' : item.rsi < 30 ? 'text-emerald-400' : 'text-slate-300'}`}>{item.rsi.toFixed(0)}</div></div>
            <div className="bg-slate-900/50 rounded p-1 text-center border border-slate-800"><div className="text-[8px] text-slate-500 uppercase">MACD</div><div className={`text-[10px] font-bold ${item.macd > item.macd_sig ? 'text-emerald-400' : 'text-rose-400'}`}>{item.macd.toFixed(2)}</div></div>
            <div className="bg-slate-900/50 rounded p-1 text-center border border-slate-800"><div className="text-[8px] text-slate-500 uppercase">Vol</div><div className="text-[10px] font-bold text-slate-300">{(item.volume/1000000).toFixed(1)}M</div></div>
        </div>

        <div className={`p-1.5 rounded text-[10px] border ${isBuy ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-200/80' : 'bg-rose-500/5 border-rose-500/10 text-rose-200/80'}`}>
          <div className="flex items-start gap-1.5">
            <AlertTriangle size={10} className={`shrink-0 mt-0.5 ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`} />
            <div className="leading-tight line-clamp-3"><span className={`font-bold uppercase mr-1 ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`}>{item.status}:</span>{item.reason}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CollapsibleSection({ title, count, icon, children, defaultOpen = true, updated, onToggleIgnore, isIgnored }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <section className="mb-6 relative">
      <div className="sticky top-16 z-40 bg-[#020617] border-b border-slate-800/50 flex items-center justify-between py-2 mb-2 shadow-sm h-12">
        <div onClick={() => setIsOpen(!isOpen)} className={`flex items-center gap-2 cursor-pointer group ${isIgnored ? 'opacity-50 grayscale' : ''}`}>
          <div className="p-1 bg-slate-800/50 group-hover:bg-slate-700/50 rounded border border-slate-700 transition-colors">
            {isOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
          </div>
          <div className={`p-1 rounded border border-slate-800 bg-slate-900/50`}>{icon}</div>
          <h2 className="text-sm font-bold text-slate-100 tracking-wide uppercase group-hover:text-indigo-400 transition-colors">{title}</h2>
          {count > 0 && <span className="text-[9px] font-bold bg-amber-500 text-slate-900 px-1.5 py-0.5 rounded-sm">{count}</span>}
        </div>
        <div className="flex items-center gap-3">
          {updated && <div className="text-[10px] text-slate-500 font-mono hidden sm:block">UPDATED: {updated}</div>}
          {onToggleIgnore && <button onClick={(e) => { e.stopPropagation(); onToggleIgnore(); }} className={`p-1.5 rounded transition ${isIgnored ? 'text-rose-400 hover:bg-rose-500/10' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}>{isIgnored ? <EyeOff size={14} /> : <Eye size={14} />}</button>}
        </div>
      </div>
      <AnimatePresence>
        {isOpen && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-visible">{children}</motion.div>}
      </AnimatePresence>
    </section>
  );
}

function StockTable({ data, onRemove, isWatchlist, isPortfolio, groupBySector = false, onToggleIgnore, onToggleSectorIgnore, ignoredStocks, ignoredSectors, sectionIgnored, onTogglePortfolio, onToggleWatchlist, onOpenChart }) {
  if (data.length === 0) return <div className="p-8 text-center text-slate-500 italic text-xs">No assets available.</div>;
  let groupedData = {};
  if (groupBySector) {
    data.forEach(item => { const s = item.sector || "Other"; if (!groupedData[s]) groupedData[s] = []; groupedData[s].push(item); });
  }
  const renderRow = (row) => (<StockRow key={row.symbol} row={row} onRemove={onRemove} isWatchlist={isWatchlist} isPortfolio={isPortfolio} onToggleIgnore={onToggleIgnore} isIgnored={ignoredStocks.has(row.symbol) || sectionIgnored} onTogglePortfolio={onTogglePortfolio} onToggleWatchlist={onToggleWatchlist} onOpenChart={onOpenChart} />);
   
  return (
    <div className={`border border-slate-800 rounded-lg shadow-lg bg-[#0f172a]/40 backdrop-blur-none`}>
      <table className="w-full text-left border-collapse">
        <thead className="sticky top-28 z-30 bg-[#020617] shadow-md border-b border-slate-700">
          <tr className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">
            <th className="p-3 w-8 bg-[#020617] border-b border-slate-800"></th>
            <th className="p-3 bg-[#020617] border-b border-slate-800">Asset</th>
            <th className="p-3 text-right bg-[#020617] border-b border-slate-800">Price</th>
            <th className="p-3 text-center bg-[#020617] border-b border-slate-800">Trend</th>
            <th className="p-3 w-16 text-center bg-[#020617] border-b border-slate-800">RSI</th>
            <th className="p-3 w-16 text-center bg-[#020617] border-b border-slate-800">MACD</th>
            <th className="p-3 w-16 text-center bg-[#020617] border-b border-slate-800">Vol</th>
            <th className="p-3 hidden md:table-cell bg-[#020617] border-b border-slate-800">Analysis</th>
            <th className="p-3 w-20 bg-[#020617] border-b border-slate-800"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/40 text-xs">
          {groupBySector 
            ? Object.keys(groupedData).sort().map(sector => (
                <CollapsibleSectorGroup key={sector} sector={sector} rows={groupedData[sector]} onToggleSectorIgnore={onToggleSectorIgnore} isSectorIgnored={ignoredSectors?.has(sector)} sectionIgnored={sectionIgnored}>
                    {groupedData[sector].map(renderRow)}
                </CollapsibleSectorGroup>
              ))
            : data.map(renderRow)
          }
        </tbody>
      </table>
    </div>
  );
}

function CollapsibleSectorGroup({ sector, rows, onToggleSectorIgnore, isSectorIgnored, sectionIgnored, children }) {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <>
      <tr className={`bg-slate-900/90 border-y border-slate-800 hover:bg-slate-800/80 transition-colors ${isSectorIgnored || sectionIgnored ? 'grayscale opacity-70' : ''}`}>
        <td colSpan={9} className="p-2 pl-4 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-[10px] uppercase tracking-wider">
            {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />} <Layers size={12} /> {sector} <span className="text-slate-600 ml-1">({rows.length})</span>
            {(isSectorIgnored || sectionIgnored) && <span className="text-[9px] text-rose-400 bg-rose-500/10 px-1 rounded">IGNORED</span>}
          </div>
        </td>
        <td className="p-2 text-right">
          <button onClick={() => onToggleSectorIgnore(sector)} className={`p-1 rounded ${isSectorIgnored || sectionIgnored ? 'text-rose-400' : 'text-slate-600 hover:text-white'}`}>{isSectorIgnored || sectionIgnored ? <EyeOff size={12}/> : <Eye size={12}/>}</button>
        </td>
      </tr>
      {isOpen && children}
    </>
  );
}

function StockRow({ row, onRemove, isWatchlist, isPortfolio, onToggleIgnore, isIgnored, onTogglePortfolio, onToggleWatchlist, onOpenChart }) {
  return (
    <tr 
        onClick={() => onOpenChart(row.symbol)}
        className={`hover:bg-slate-800/30 transition-colors group cursor-pointer ${isIgnored ? 'opacity-30 grayscale' : ''}`}
    >
      <td className="p-3 text-center">
        {row.is_watched && <Star size={12} className="text-amber-400 fill-amber-400 mx-auto" />}
      </td>
      <td className="p-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-400">{row.symbol[0]}</div>
          <div className="flex flex-col"><span className="font-bold text-slate-200">{row.company_name || row.symbol}</span><span className="text-[9px] text-slate-500 uppercase">{row.symbol}</span></div>
        </div>
      </td>
      <td className="p-3 text-right"><div className="font-mono text-slate-300 font-medium">${row.price.toFixed(2)}</div></td>
      <td className="p-3 text-center"><Badge status={row.status} /></td>
      <td className="p-3 text-center"><div className={`font-mono font-bold ${row.rsi > 70 ? "text-rose-400" : row.rsi < 30 ? "text-emerald-400" : "text-slate-500"}`}>{row.rsi.toFixed(0)}</div></td>
      <td className="p-3 text-center"><div className={`font-mono font-bold ${row.macd > row.macd_sig ? 'text-emerald-400' : 'text-rose-400'}`}>{row.macd.toFixed(2)}</div></td>
      <td className="p-3 text-center"><div className="font-mono text-slate-400">{(row.volume/1000000).toFixed(1)}M</div></td>
      <td className="p-3 hidden md:table-cell"><p className="text-slate-400 max-w-xs truncate opacity-60 group-hover:opacity-100 transition-opacity">{row.reason || "-"}</p></td>
      <td className="p-3 text-right flex justify-end gap-1" onClick={e => e.stopPropagation()}>
        <QuickAddMenu item={row} onTogglePortfolio={onTogglePortfolio} onToggleWatchlist={onToggleWatchlist} />
        
        <button onClick={() => onToggleIgnore(row.symbol)} className={`p-1.5 rounded transition opacity-0 group-hover:opacity-100 ${isIgnored ? 'text-rose-400 bg-rose-500/10 opacity-100' : 'text-slate-600 hover:text-white'}`}>{isIgnored ? <EyeOff size={14}/> : <Eye size={14}/>}</button>
        {(isWatchlist || isPortfolio) && <button onClick={() => onRemove(row.symbol)} className="text-slate-600 hover:text-rose-400 p-1.5 rounded hover:bg-rose-500/10 transition opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>}
      </td>
    </tr>
  );
}

function Badge({ status }) {
  let styles = "bg-slate-800/50 text-slate-400 border-slate-700/50";
  let icon = null;
  if (status.includes("SWEET") || status.includes("Buy") || status.includes("TRINITY BUY")) {
    styles = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"; icon = <TrendingUp size={10} />;
  } else if (status.includes("Sell") || status.includes("Over") || status.includes("TRINITY SELL")) {
    styles = "bg-rose-500/10 text-rose-400 border-rose-500/20"; icon = <TrendingDown size={10} />;
  }
  return <span className={`inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-sm text-[9px] font-bold border uppercase tracking-wider ${styles}`}>{icon}{status.replace("SWEET SPOT", "SWEET").replace("TRINITY", "TRINITY ")}</span>;
}

function SkeletonCards() { return <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <div key={i} className="h-40 rounded-lg bg-slate-900/50 border border-slate-800 animate-pulse p-4"></div>)}</div>; }
function SkeletonTable() { return <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-8 w-full bg-slate-900 rounded animate-pulse"></div>)}</div>; }

export default App;