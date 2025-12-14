import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity, BarChart2, BellOff, Briefcase,
  Check,
  ChevronDown, ChevronRight, Clock,
  Eye, EyeOff,
  Layers,
  RefreshCw, Settings, Volume2, VolumeX, Zap
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

// --- IMPORTS ---
import SignalCard from './components/dashboard/SignalCard';
import StockTable from './components/dashboard/StockTable';
import TickerSearch from './components/dashboard/TickerSearch';
import WheelHistory from './components/dashboard/WheelHistory';
import WheelSignalCard from './components/dashboard/WheelSignalCard';
import ChartModal from './components/layout/ChartModal';
import NewsModal from './components/layout/NewsModal';

import { api } from './services/api';
import { formatTime, generateSpeechText } from './utils/speech';

// --- CONSTANTS ---
const REFRESH_OPTIONS = [
  { label: '30s', value: 30 }, { label: '1m', value: 60 }, { label: '2m', value: 120 },
  { label: '5m', value: 300 }, { label: '10m', value: 600 }, { label: '15m', value: 900 },
  { label: '1h', value: 3600 }, { label: '4h', value: 14400 },
];

const STRATEGIES = [
    { id: 'MOMENTUM', label: 'Momentum & Trend' },
    { id: 'WHEEL', label: 'The Wheel Strategy' }
];

function App() {
  const [data, setData] = useState([]);
  const [wheelHistory, setWheelHistory] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  const prevDataRef = useRef(new Map());

  const [lastUpdated, setLastUpdated] = useState("Scanning...");
  const [refreshRate, setRefreshRate] = useState(60); 
  const [countdown, setCountdown] = useState(60);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [currentStrategy, setCurrentStrategy] = useState('MOMENTUM'); 
  
  // UI States
  const [showSettings, setShowSettings] = useState(false);
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [isStrategyOpen, setIsStrategyOpen] = useState(false); 
  const [selectedStock, setSelectedStock] = useState(null);
  const [viewingNewsTicker, setViewingNewsTicker] = useState(null);
  const [speakingTicker, setSpeakingTicker] = useState(null); 
   
  const settingsRef = useRef(null);
  const timerRef = useRef(null);
  const strategyRef = useRef(null);

  // --- SETTINGS STATE ---
  const [audioFilters, setAudioFilters] = useState(() => {
    const saved = localStorage.getItem('audioFilters');
    return saved ? JSON.parse(saved) : { portfolio: true, watchlist: true, market: true };
  });

  const [speechConfig, setSpeechConfig] = useState(() => {
    const saved = localStorage.getItem('speechConfig');
    return saved ? JSON.parse(saved) : { price: true, signal: true, reason: true };
  });
   
  // DB SYNCED STATE
  const [ignoredStocks, setIgnoredStocks] = useState(new Set());
  const [ignoredSectors, setIgnoredSectors] = useState(new Set());
  const [ignoredSections, setIgnoredSections] = useState(new Set());

  useEffect(() => { localStorage.setItem('audioFilters', JSON.stringify(audioFilters)); }, [audioFilters]);
  useEffect(() => { localStorage.setItem('speechConfig', JSON.stringify(speechConfig)); }, [speechConfig]);

  // --- CLICK OUTSIDE HANDLER ---
  useEffect(() => {
    function handleClickOutside(event) {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) setShowSettings(false);
      if (timerRef.current && !timerRef.current.contains(event.target)) setIsTimerOpen(false);
      if (strategyRef.current && !strategyRef.current.contains(event.target)) setIsStrategyOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [settingsRef, timerRef, strategyRef]);

  // --- SORTING LOGIC ---
  const checkIsSpoken = useCallback((d) => {
      if (d.is_in_portfolio) return audioFilters.portfolio;
      if (d.is_watched) return audioFilters.watchlist;
      return audioFilters.market; 
  }, [audioFilters]);

  const sortStocksByPriority = useCallback((a, b) => {
      const aHasSignal = a.is_buy || a.is_sell;
      const bHasSignal = b.is_buy || b.is_sell;
      const aSpoken = aHasSignal && checkIsSpoken(a);
      const bSpoken = bHasSignal && checkIsSpoken(b);
      if (aSpoken !== bSpoken) return bSpoken - aSpoken; 
      if (aHasSignal !== bHasSignal) return bHasSignal - aHasSignal;
      return a.symbol.localeCompare(b.symbol);
  }, [checkIsSpoken]);

  // --- SPEECH GENERATION ---
  const speakQueue = (queue, index = 0) => {
    if (index >= queue.length) { setSpeakingTicker(null); return; }
    const item = queue[index];
    setSpeakingTicker(item.symbol);

    const textToSpeak = generateSpeechText(item, speechConfig);
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

    signalsToAnnounce.sort(sortStocksByPriority);

    if (signalsToAnnounce.length > 0) {
      console.log(`[APP] 🗣️ Announcing ${signalsToAnnounce.length} signals.`);
      const summary = new SpeechSynthesisUtterance(`Found ${signalsToAnnounce.length} alerts.`);
      summary.rate = 1.1; 
      summary.onend = () => speakQueue(signalsToAnnounce);
      window.speechSynthesis.speak(summary);
    }
  }, [audioEnabled, audioFilters, speechConfig, sortStocksByPriority]);

  // --- FETCH ---
  const fetchData = useCallback(async () => {
    // Only show loading spinner on empty state or major refresh
    if (data.length === 0) setLoading(true); 
    
    try {
      console.log(`[APP] 📥 Fetching data... (Strategy: ${currentStrategy})`);
      const res = await api.scan(currentStrategy);
      const rawData = res.data.data || [];
      const historyData = res.data.history || [];
      const settings = res.data.settings || {};

      console.log(`[APP] ✅ Data received: ${rawData.length} items`);

      const processedData = rawData.map(item => {
        const prev = prevDataRef.current.get(item.symbol);
        let priceChange = 0; let volChange = 0;
        if (prev) {
            if (prev.price) priceChange = ((item.price - prev.price) / prev.price) * 100;
            if (prev.volume) volChange = ((item.volume - prev.volume) / prev.volume) * 100;
        }
        return { ...item, priceChange, volChange };
      });

      const newMap = new Map();
      processedData.forEach(d => newMap.set(d.symbol, d));
      prevDataRef.current = newMap;

      setData(processedData);
      setWheelHistory(historyData); 
      setLastUpdated(new Date().toLocaleTimeString());
      setCountdown(refreshRate); 
       
      const dbIgnoredStocks = new Set();
      const dbIgnoredSectors = new Set();
      processedData.forEach(d => {
          if (d.is_ignored) dbIgnoredStocks.add(d.symbol);
          if (d.is_sector_ignored) dbIgnoredSectors.add(d.sector);
      });
      const dbIgnoredSections = new Set(settings.ignored_sections);

      setIgnoredStocks(dbIgnoredStocks);
      setIgnoredSectors(dbIgnoredSectors);
      setIgnoredSections(dbIgnoredSections);

      if (currentStrategy === 'MOMENTUM') {
          handleSpeech(processedData, false, dbIgnoredSections);
      }
    } catch (err) { 
        console.error("[APP] ❌ Fetch Error:", err); 
    }
    setLoading(false);
  }, [refreshRate, handleSpeech, data.length, currentStrategy]);

  // --- EFFECT LOOPS ---
  useEffect(() => {
    fetchData(); 
    const interval = setInterval(fetchData, refreshRate * 1000);
    const countdownInterval = setInterval(() => setCountdown((p) => (p > 0 ? p - 1 : 0)), 1000);
    return () => { clearInterval(interval); clearInterval(countdownInterval); };
  }, [refreshRate, fetchData]); 

  // --- ACTIONS HANDLERS ---
  const handleStrategyChange = (strat) => {
      console.log(`[APP] Switching strategy to: ${strat}`);
      setCurrentStrategy(strat);
      setIsStrategyOpen(false);
      setLoading(true);
      setData([]); // Clear data to trigger skeleton loader
      setTimeout(fetchData, 100);
  };

  const handleLogWheelTrade = async (trade) => {
      await api.logWheelTrade(trade);
      fetchData(); 
  };

  const handleAddTicker = async (symbol, target) => {
    if (!symbol) return;
    try {
        setLoading(true);
        if (target === 'portfolio') await api.addToPortfolio(symbol);
        else await api.addTicker(symbol, 'watchlist');
        
        if (target === 'portfolio') await api.addTicker(symbol, 'portfolio');
        
        await fetchData(); 
    } catch (e) { console.error(e); setLoading(false); }
  };

  const handleRemoveTicker = async (symbol, target) => {
    if (!symbol) return;
    try {
        setLoading(true);
        if (target === 'portfolio') await api.removeFromPortfolio(symbol);
        else await api.removeTicker(symbol);
        await fetchData();
    } catch (e) { console.error(e); setLoading(false); }
  };

  const togglePortfolio = async (symbol, isInPortfolio) => {
    try {
      if (isInPortfolio) await api.removeFromPortfolio(symbol);
      else await api.addToPortfolio(symbol);
      fetchData(); 
    } catch (e) { console.error(e); }
  };

  const toggleWatchlist = async (symbol, isWatched) => {
    try {
      if (isWatched) await api.removeTicker(symbol);
      else await api.addTicker(symbol, 'watchlist');
      fetchData(); 
    } catch (e) { console.error(e); }
  };

  const toggleIgnoreStock = async (symbol) => {
    const newSet = new Set(ignoredStocks);
    if (newSet.has(symbol)) newSet.delete(symbol); else newSet.add(symbol);
    setIgnoredStocks(newSet);
    await api.ignoreStock(symbol).catch(console.error);
    fetchData(); 
  };

  const toggleIgnoreSector = async (sector) => {
    const newSet = new Set(ignoredSectors);
    if (newSet.has(sector)) newSet.delete(sector); else newSet.add(sector);
    setIgnoredSectors(newSet);
    await api.ignoreSector(sector).catch(console.error);
    fetchData(); 
  };

  const toggleIgnoreSection = async (section) => {
    const newSet = new Set(ignoredSections);
    if (newSet.has(section)) newSet.delete(section); else newSet.add(section);
    setIgnoredSections(newSet);
    await api.ignoreSection(section).catch(console.error);
    fetchData(); 
  };

  const toggleAudio = () => {
    if (!audioEnabled) {
      const u = new SpeechSynthesisUtterance("Audio active."); window.speechSynthesis.speak(u);
      setAudioEnabled(true);
      setTimeout(() => fetchData(), 500); 
    } else {
      window.speechSynthesis.cancel();
      setSpeakingTicker(null);
      setAudioEnabled(false);
    }
  };

  const handleRateChange = (newRate) => {
    console.log(`[APP] Timer changed to: ${newRate}s`);
    setRefreshRate(parseInt(newRate));
    setCountdown(newRate);
    setTimeout(fetchData, 100);
    setIsTimerOpen(false); 
  };

  // --- DATA FILTERING ---
  const isMomentum = currentStrategy === 'MOMENTUM';
  
  const activeSignals = data.filter(d => (d.is_buy || d.is_sell) && !ignoredStocks.has(d.symbol)).sort(sortStocksByPriority);
  const activeSpoken = activeSignals.filter(s => checkIsSpoken(s));
  const activeSilent = activeSignals.filter(s => !checkIsSpoken(s));
  
  const portfolio = data.filter(d => d.is_in_portfolio).sort(sortStocksByPriority);
  const watchlist = data.filter(d => d.is_watched).sort(sortStocksByPriority);
  const market = data.filter(d => !d.is_in_portfolio && !d.is_watched).sort(sortStocksByPriority);

  const wheelOpportunities = data.filter(d => d.wheel_suggestion);

  const portfolioSet = new Set(portfolio.map(d => d.symbol));
  const watchlistSet = new Set(watchlist.map(d => d.symbol));

  const SkeletonCards = () => <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <div key={i} className="h-40 rounded-lg bg-slate-900/50 border border-slate-800 animate-pulse p-4"></div>)}</div>;
  const SkeletonTable = () => <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-8 w-full bg-slate-900 rounded animate-pulse"></div>)}</div>;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-indigo-500/30 pb-20">
       
      <AnimatePresence>
        {selectedStock && <ChartModal symbol={selectedStock} onClose={() => setSelectedStock(null)} />}
        {viewingNewsTicker && <NewsModal symbol={viewingNewsTicker} onClose={() => setViewingNewsTicker(null)} />}
      </AnimatePresence>

      <nav className="sticky top-0 z-50 bg-[#020617]/95 backdrop-blur-md border-b border-slate-800/80 shadow-lg h-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-lg border border-white/10 shadow-xl"><Activity size={20} className="text-white" /></div>
                <div className="hidden md:block"><h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">TERMINAL<span className="text-indigo-500">.PRO</span></h1></div>
              </div>

              {/* STRATEGY SELECTOR */}
              <div className="relative" ref={strategyRef}>
                <button onClick={() => setIsStrategyOpen(!isStrategyOpen)} className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-md text-xs font-bold text-indigo-300 hover:border-indigo-500 transition-colors">
                    <Layers size={14} />
                    <span>{STRATEGIES.find(s => s.id === currentStrategy).label}</span>
                    <ChevronDown size={12} className={`transition-transform ${isStrategyOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                    {isStrategyOpen && (
                        <motion.ul initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full left-0 mt-2 w-48 bg-[#0f172a] border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                            {STRATEGIES.map(s => (
                                <li key={s.id} onClick={() => handleStrategyChange(s.id)} className="px-4 py-3 hover:bg-slate-800 cursor-pointer flex items-center justify-between text-xs font-medium text-slate-300 border-b border-slate-800/50 last:border-0">
                                    {s.label}
                                    {currentStrategy === s.id && <Check size={14} className="text-emerald-400" />}
                                </li>
                            ))}
                        </motion.ul>
                    )}
                </AnimatePresence>
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-slate-900/50 rounded-md border border-slate-800 p-1">
                <button onClick={toggleAudio} className={`p-1.5 rounded transition ${audioEnabled ? 'text-emerald-400' : 'text-rose-400'}`}>{audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}</button>
                <div className="w-px h-4 bg-slate-700 mx-1"></div>
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
                        <label className="flex items-center justify-between text-xs cursor-pointer group"><div className="flex items-center gap-2"><span className="text-slate-300 group-hover:text-white">Price</span></div><input type="checkbox" checked={speechConfig.price} onChange={(e) => setSpeechConfig({...speechConfig, price: e.target.checked})} className="accent-indigo-500" /></label>
                        <label className="flex items-center justify-between text-xs cursor-pointer group"><div className="flex items-center gap-2"><span className="text-slate-300 group-hover:text-white">Signal Type</span></div><input type="checkbox" checked={speechConfig.signal} onChange={(e) => setSpeechConfig({...speechConfig, signal: e.target.checked})} className="accent-indigo-500" /></label>
                         <label className="flex items-center justify-between text-xs cursor-pointer group"><div className="flex items-center gap-2"><span className="text-slate-300 group-hover:text-white">Reason</span></div><input type="checkbox" checked={speechConfig.reason} onChange={(e) => setSpeechConfig({...speechConfig, reason: e.target.checked})} className="accent-indigo-500" /></label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="hidden md:flex items-center bg-slate-900/50 rounded border border-slate-800">
                <div className="flex flex-col items-end px-3 py-1 border-r border-slate-800"><span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Next Scan</span><span className={`text-xs font-mono font-bold ${countdown < 10 ? 'text-rose-400' : 'text-emerald-400'}`}>{formatTime(countdown)}</span></div>
                <div className="relative group" ref={timerRef}>
                    <button onClick={() => setIsTimerOpen(!isTimerOpen)} className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors">
                        <Clock size={14} /><span>{REFRESH_OPTIONS.find(o => o.value === refreshRate)?.label || '1m'}</span><ChevronDown size={10} className={`transition-transform ${isTimerOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                        {isTimerOpen && (
                            <motion.ul initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full right-0 mt-2 w-24 bg-[#0f172a] border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                                {REFRESH_OPTIONS.map((opt) => (<li key={opt.label} onClick={() => handleRateChange(opt.value)} className="flex items-center justify-between px-3 py-2 hover:bg-slate-800 cursor-pointer text-xs text-slate-300 hover:text-white border-b border-slate-800/50 last:border-0"><span>{opt.label}</span>{refreshRate === opt.value && <Check size={12} className="text-emerald-400" />}</li>))}
                            </motion.ul>
                        )}
                    </AnimatePresence>
                </div>
              </div>
               
              <TickerSearch 
                onAdd={handleAddTicker} 
                onRemove={handleRemoveTicker} 
                portfolioSet={portfolioSet} 
                watchlistSet={watchlistSet} 
              />

              <button onClick={fetchData} className="p-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-indigo-600 rounded-md border border-slate-700/50 transition-all"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {isMomentum && (
            <>
                {(loading && activeSignals.length === 0) ? <SkeletonCards /> : activeSignals.length > 0 && (
                  <CollapsibleSection title="Active Signals" count={activeSignals.length} icon={<Zap className="text-amber-400" size={14} />} defaultOpen={true} onToggleIgnore={() => toggleIgnoreSection('signals')} isIgnored={ignoredSections.has('signals')}>
                    <SignalSubsection title="Priority Alerts (Voice Active)" icon={<Volume2 size={12} className="text-emerald-400"/>} data={activeSpoken} defaultOpen={true}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-1">
                        {activeSpoken.map((item) => (<SignalCard key={item.symbol} item={item} onTogglePortfolio={togglePortfolio} onToggleWatchlist={toggleWatchlist} onToggleIgnore={toggleIgnoreStock} isSpeaking={speakingTicker === item.symbol} onOpenChart={() => setSelectedStock(item.symbol)} onOpenNews={(sym) => setViewingNewsTicker(sym)} />))}
                      </div>
                    </SignalSubsection>
                    <SignalSubsection title="Silent Alerts" icon={<BellOff size={12} className="text-slate-400"/>} data={activeSilent} defaultOpen={true}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-1">
                        {activeSilent.map((item) => (<SignalCard key={item.symbol} item={item} onTogglePortfolio={togglePortfolio} onToggleWatchlist={toggleWatchlist} onToggleIgnore={toggleIgnoreStock} isSpeaking={speakingTicker === item.symbol} onOpenChart={() => setSelectedStock(item.symbol)} onOpenNews={(sym) => setViewingNewsTicker(sym)} />))}
                      </div>
                    </SignalSubsection>
                  </CollapsibleSection>
                )}

                <CollapsibleSection title="My Portfolio" count={portfolio.length} icon={<Briefcase className="text-emerald-400" size={14} />} defaultOpen={true} onToggleIgnore={() => toggleIgnoreSection('portfolio')} isIgnored={ignoredSections.has('portfolio')}>
                  {loading && portfolio.length === 0 ? <SkeletonTable /> : (<StockTable data={portfolio} onRemove={(sym) => togglePortfolio(sym, true)} isPortfolio={true} onTogglePortfolio={togglePortfolio} onToggleWatchlist={toggleWatchlist} onToggleIgnore={toggleIgnoreStock} ignoredStocks={ignoredStocks} sectionIgnored={ignoredSections.has('portfolio')} onOpenChart={setSelectedStock} onOpenNews={(sym) => setViewingNewsTicker(sym)} />)}
                </CollapsibleSection>

                <CollapsibleSection title="Watchlist" count={watchlist.length} icon={<Eye className="text-indigo-400" size={14} />} defaultOpen={true} updated={lastUpdated} onToggleIgnore={() => toggleIgnoreSection('watchlist')} isIgnored={ignoredSections.has('watchlist')}>
                  {loading && watchlist.length === 0 ? <SkeletonTable /> : (<StockTable data={watchlist} onRemove={(sym) => handleRemoveTicker(sym, 'watchlist')} isWatchlist={true} onTogglePortfolio={togglePortfolio} onToggleWatchlist={toggleWatchlist} onToggleIgnore={toggleIgnoreStock} ignoredStocks={ignoredStocks} sectionIgnored={ignoredSections.has('watchlist')} onOpenChart={setSelectedStock} onOpenNews={(sym) => setViewingNewsTicker(sym)} />)}
                </CollapsibleSection>

                {(loading && market.length === 0) ? <SkeletonTable /> : market.length > 0 && (<CollapsibleSection title="Market Overview" icon={<BarChart2 className="text-slate-400" size={14} />} defaultOpen={true} onToggleIgnore={() => toggleIgnoreSection('market')} isIgnored={ignoredSections.has('market')}><StockTable data={market} onRemove={handleRemoveTicker} isWatchlist={false} groupBySector={true} onTogglePortfolio={togglePortfolio} onToggleWatchlist={toggleWatchlist} onToggleIgnore={toggleIgnoreStock} onToggleSectorIgnore={toggleIgnoreSector} ignoredStocks={ignoredStocks} ignoredSectors={ignoredSectors} sectionIgnored={ignoredSections.has('market')} onOpenChart={setSelectedStock} onOpenNews={(sym) => setViewingNewsTicker(sym)} /></CollapsibleSection>)}
            </>
        )}

        {!isMomentum && (
            <>
                <CollapsibleSection title="Wheel Opportunities" count={wheelOpportunities.length} icon={<Activity className="text-indigo-400" size={14} />}>
                    <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-lg mb-4 text-xs text-indigo-300">
                        <strong>Strategy:</strong> Sell Cash Secured Puts (CSP) on oversold high-quality stocks. Sell Covered Calls (CC) on overbought stocks you own.
                    </div>
                    {loading ? <SkeletonCards /> : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-1">
                            {wheelOpportunities.map(item => (
                                <WheelSignalCard key={item.symbol} item={item} onLogTrade={handleLogWheelTrade} />
                            ))}
                        </div>
                    )}
                </CollapsibleSection>

                <CollapsibleSection title="Active Wheel Trades" count={wheelHistory.length} icon={<Briefcase className="text-emerald-400" size={14} />}>
                    <WheelHistory history={wheelHistory} />
                </CollapsibleSection>
            </>
        )}

      </main>
    </div>
  );
}

// ... (CollapsibleSection and SignalSubsection are assumed to be here, unchanged from previous versions) ...
function CollapsibleSection({ title, count, icon, children, defaultOpen = true, updated, onToggleIgnore, isIgnored }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <section className="mb-6 relative">
      <div className="sticky top-16 z-40 bg-[#020617] border-b border-slate-800/50 flex items-center justify-between py-2 mb-2 shadow-sm h-12">
        <div onClick={() => setIsOpen(!isOpen)} className={`flex items-center gap-2 cursor-pointer group ${isIgnored ? 'opacity-50 grayscale' : ''}`}><div className="p-1 bg-slate-800/50 group-hover:bg-slate-700/50 rounded border border-slate-700 transition-colors">{isOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}</div><div className={`p-1 rounded border border-slate-800 bg-slate-900/50`}>{icon}</div><h2 className="text-sm font-bold text-slate-100 tracking-wide uppercase group-hover:text-indigo-400 transition-colors">{title}</h2>{count > 0 && <span className="text-[9px] font-bold bg-amber-500 text-slate-900 px-1.5 py-0.5 rounded-sm">{count}</span>}</div>
        <div className="flex items-center gap-3">{updated && <div className="text-[10px] text-slate-500 font-mono hidden sm:block">UPDATED: {updated}</div>}{onToggleIgnore && <button onClick={(e) => { e.stopPropagation(); onToggleIgnore(); }} className={`p-1.5 rounded transition ${isIgnored ? 'text-rose-400 hover:bg-rose-500/10' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}>{isIgnored ? <EyeOff size={14} /> : <Eye size={14} />}</button>}</div>
      </div>
      <AnimatePresence>{isOpen && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-visible">{children}</motion.div>}</AnimatePresence>
    </section>
  );
}

function SignalSubsection({ title, icon, data, children, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  if (!data || data.length === 0) return null;
  return (
    <div className="mb-4">
      <div onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 mb-2 px-1 cursor-pointer group select-none"><div className="text-slate-500 group-hover:text-white transition-colors">{isOpen ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}</div><div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider group-hover:text-indigo-400 transition-colors">{icon}{title} <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 rounded">{data.length}</span></div></div>
      <AnimatePresence>{isOpen && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>{children}</motion.div>)}</AnimatePresence>
    </div>
  );
}

export default App;