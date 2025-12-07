import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  BarChart2,
  BellOff,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye, EyeOff,
  RefreshCw,
  Settings,
  Volume2, VolumeX,
  Zap
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

// --- IMPORTS ---
import SignalCard from './components/dashboard/SignalCard';
import StockTable from './components/dashboard/StockTable';
import TickerSearch from './components/dashboard/TickerSearch';
import ChartModal from './components/layout/ChartModal';
import NewsModal from './components/layout/NewsModal'; // IMPORT NEWS MODAL
import { api } from './services/api';
import { formatTime, generateSpeechText } from './utils/speech';

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const prevDataRef = useRef(new Map());

  const [lastUpdated, setLastUpdated] = useState("Scanning...");
  const [refreshRate, setRefreshRate] = useState(60); 
  const [countdown, setCountdown] = useState(60);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [viewingNewsTicker, setViewingNewsTicker] = useState(null); // NEWS STATE
  const [speakingTicker, setSpeakingTicker] = useState(null); 
   
  const settingsRef = useRef(null);

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

  // --- CLICK OUTSIDE SETTINGS ---
  useEffect(() => {
    function handleClickOutside(event) {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettings(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [settingsRef]);

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
      const summary = new SpeechSynthesisUtterance(`Found ${signalsToAnnounce.length} alerts.`);
      summary.rate = 1.1; 
      summary.onend = () => speakQueue(signalsToAnnounce);
      window.speechSynthesis.speak(summary);
    }
  }, [audioEnabled, audioFilters, speechConfig, sortStocksByPriority]);

  // --- ACTIONS ---
  const togglePortfolio = async (symbol, isInPortfolio) => {
    setData(prev => prev.map(item => item.symbol === symbol ? { ...item, is_in_portfolio: !isInPortfolio } : item));
    try {
      if (isInPortfolio) await api.removeFromPortfolio(symbol);
      else await api.addToPortfolio(symbol);
    } catch (e) { console.error(e); }
  };

  const toggleWatchlist = async (symbol, isWatched) => {
    setData(prev => prev.map(item => item.symbol === symbol ? { ...item, is_watched: !isWatched } : item));
    try {
      if (isWatched) await api.removeTicker(symbol);
      else await api.addTicker(symbol, 'watchlist');
    } catch (e) { console.error(e); }
  };

  const toggleIgnoreStock = (symbol) => {
    const newSet = new Set(ignoredStocks);
    if (newSet.has(symbol)) newSet.delete(symbol); else newSet.add(symbol);
    setIgnoredStocks(newSet);
    api.ignoreStock(symbol).catch(console.error);
  };

  const toggleIgnoreSector = (sector) => {
    const newSet = new Set(ignoredSectors);
    if (newSet.has(sector)) newSet.delete(sector); else newSet.add(sector);
    setIgnoredSectors(newSet);
    api.ignoreSector(sector).catch(console.error);
  };

  const toggleIgnoreSection = (section) => {
    const newSet = new Set(ignoredSections);
    if (newSet.has(section)) newSet.delete(section); else newSet.add(section);
    setIgnoredSections(newSet);
    api.ignoreSection(section).catch(console.error);
  };

  const handleAddTicker = async (symbol, target) => {
    if (!symbol) return;
    try {
        await api.addTicker(symbol, target);
        fetchData();
    } catch (e) { console.error("Failed to add ticker", e); }
  };

  const handleRemoveTicker = async (symbol) => {
    await api.removeTicker(symbol);
    fetchData();
  };

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

  // --- FETCH ---
  const fetchData = useCallback(async () => {
    if (data.length === 0) setLoading(true);
    try {
      const res = await api.scan();
      const rawData = res.data.data;

      // Ensure news property exists for each stock
      const enrichedData = rawData.map(item => ({
        ...item,
        news: item.news || [] // Add fallback for missing news
      }));

      setData(enrichedData);
      setLoading(false);
    } catch (e) {
      console.error("Failed to fetch data", e);
      setLoading(false);
    }
  }, [data]);

  useEffect(() => { fetchData(); }, []); 
  useEffect(() => { const i = setInterval(() => fetchData(), refreshRate * 1000); return () => clearInterval(i); }, [refreshRate, fetchData]); 
  useEffect(() => { const t = setInterval(() => setCountdown((p) => (p > 0 ? p - 1 : 0)), 1000); return () => clearInterval(t); }, []);
  const handleRateChange = (e) => { const r = parseInt(e.target.value); setRefreshRate(r); setCountdown(r); setTimeout(fetchData, 100); };


  // --- DATA PREPARATION ---
  const activeSignals = data
    .filter(d => {
      if (!d.is_buy && !d.is_sell) return false;
      if (ignoredStocks.has(d.symbol)) return false; 
      if (ignoredSectors.has(d.sector)) return false;
      return true;
    })
    .sort(sortStocksByPriority);

  const activeSpoken = activeSignals.filter(s => checkIsSpoken(s));
  const activeSilent = activeSignals.filter(s => !checkIsSpoken(s));

  const portfolio = data.filter(d => d.is_in_portfolio).sort(sortStocksByPriority);
  const watchlist = data.filter(d => d.is_watched).sort(sortStocksByPriority);
  const market = data
    .filter(d => d.sector !== 'Other' && d.sector !== 'Watchlist' && !d.is_in_portfolio && !d.is_watched)
    .sort(sortStocksByPriority);

  const SkeletonCards = () => <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <div key={i} className="h-40 rounded-lg bg-slate-900/50 border border-slate-800 animate-pulse p-4"></div>)}</div>;
  const SkeletonTable = () => <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-8 w-full bg-slate-900 rounded animate-pulse"></div>)}</div>;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-indigo-500/30 pb-20">
       
      <AnimatePresence>
        {selectedStock && <ChartModal symbol={selectedStock} onClose={() => setSelectedStock(null)} />}
        {/* NEW: NEWS MODAL */}
        {viewingNewsTicker && 
          <NewsModal
            ticker={viewingNewsTicker}
            onClose={() => setViewingNewsTicker(null)}
            newsData={viewingNewsTicker ? data.find(d => d.symbol === viewingNewsTicker)?.news || [] : []} // Validate news data
          />
        }
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
                <button 
                    onClick={toggleAudio} 
                    title={audioEnabled ? "Mute Voice Alerts" : "Enable Voice Alerts"}
                    className={`p-1.5 rounded transition ${audioEnabled ? 'text-emerald-400' : 'text-rose-400'}`}
                >
                    {audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
                <div className="w-px h-4 bg-slate-700 mx-1"></div>
                
                <div className="relative" ref={settingsRef}>
                  <button 
                    onClick={() => setShowSettings(!showSettings)} 
                    title="Open Settings & Filters"
                    className={`p-1.5 rounded transition hover:text-white ${showSettings ? 'text-indigo-400' : 'text-slate-500'}`}
                  >
                    <Settings size={16} />
                  </button>
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
                <div className="relative group px-2" title="Change Refresh Rate">
                    <Clock size={14} className="text-slate-500 absolute left-2 top-2 pointer-events-none"/>
                    <select value={refreshRate} onChange={handleRateChange} className="bg-transparent text-xs font-bold text-slate-400 pl-6 pr-1 py-1.5 outline-none cursor-pointer hover:text-white appearance-none"><option value={30}>30s</option><option value={60}>1m</option><option value={120}>2m</option><option value={300}>5m</option></select>
                </div>
              </div>
               
              <TickerSearch onAdd={handleAddTicker} />

              <button 
                onClick={fetchData} 
                title="Force Refresh Data"
                className="p-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-indigo-600 rounded-md border border-slate-700/50 transition-all"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
       
        {(loading && activeSignals.length === 0) ? <SkeletonCards /> : activeSignals.length > 0 && (
          <CollapsibleSection 
            title="Active Signals" 
            count={activeSignals.length} 
            icon={<Zap className="text-amber-400" size={14} />} 
            defaultOpen={true} 
            onToggleIgnore={() => toggleIgnoreSection('signals')} 
            isIgnored={ignoredSections.has('signals')}
          >
            <SignalSubsection 
              title="Priority Alerts (Voice Active)" 
              icon={<Volume2 size={12} className="text-emerald-400"/>} 
              data={activeSpoken} 
              defaultOpen={true}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-1">
                {activeSpoken.map((item) => (
                  <SignalCard 
                    key={item.symbol} item={item} 
                    onTogglePortfolio={togglePortfolio} onToggleWatchlist={toggleWatchlist} 
                    onToggleIgnore={toggleIgnoreStock} 
                    isSpeaking={speakingTicker === item.symbol} onOpenChart={() => setSelectedStock(item.symbol)}
                    onOpenNews={(sym) => setViewingNewsTicker(sym)} // PASS HANDLER
                  />
                ))}
              </div>
            </SignalSubsection>

            <SignalSubsection 
              title="Silent Alerts" 
              icon={<BellOff size={12} className="text-slate-400"/>} 
              data={activeSilent} 
              defaultOpen={true}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-1">
                {activeSilent.map((item) => (
                  <SignalCard 
                    key={item.symbol} item={item} 
                    onTogglePortfolio={togglePortfolio} onToggleWatchlist={toggleWatchlist} 
                    onToggleIgnore={toggleIgnoreStock} 
                    isSpeaking={speakingTicker === item.symbol} onOpenChart={() => setSelectedStock(item.symbol)}
                    onOpenNews={(sym) => setViewingNewsTicker(sym)} // PASS HANDLER
                  />
                ))}
              </div>
            </SignalSubsection>

          </CollapsibleSection>
        )}

        <CollapsibleSection title="My Portfolio" count={portfolio.length} icon={<Briefcase className="text-emerald-400" size={14} />} defaultOpen={true} onToggleIgnore={() => toggleIgnoreSection('portfolio')} isIgnored={ignoredSections.has('portfolio')}>
          {loading && portfolio.length === 0 ? <SkeletonTable /> : (
            <StockTable 
                data={portfolio} onRemove={(sym) => togglePortfolio(sym, true)} isPortfolio={true} 
                onTogglePortfolio={togglePortfolio} onToggleWatchlist={toggleWatchlist} onToggleIgnore={toggleIgnoreStock} 
                ignoredStocks={ignoredStocks} sectionIgnored={ignoredSections.has('portfolio')}
                onOpenChart={setSelectedStock}
                onOpenNews={(sym) => setViewingNewsTicker(sym)} // PASS HANDLER
            />
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Watchlist" count={watchlist.length} icon={<Eye className="text-indigo-400" size={14} />} defaultOpen={true} updated={lastUpdated} onToggleIgnore={() => toggleIgnoreSection('watchlist')} isIgnored={ignoredSections.has('watchlist')}>
          {loading && watchlist.length === 0 ? <SkeletonTable /> : (
            <StockTable 
                data={watchlist} onRemove={handleRemoveTicker} isWatchlist={true} 
                onTogglePortfolio={togglePortfolio} onToggleWatchlist={toggleWatchlist} onToggleIgnore={toggleIgnoreStock} 
                ignoredStocks={ignoredStocks} sectionIgnored={ignoredSections.has('watchlist')} 
                onOpenChart={setSelectedStock}
                onOpenNews={(sym) => setViewingNewsTicker(sym)} // PASS HANDLER
            />
          )}
        </CollapsibleSection>

        {(loading && market.length === 0) ? <SkeletonTable /> : market.length > 0 && (
           <CollapsibleSection title="Market Overview" icon={<BarChart2 className="text-slate-400" size={14} />} defaultOpen={true} onToggleIgnore={() => toggleIgnoreSection('market')} isIgnored={ignoredSections.has('market')}>
              <StockTable 
                data={market} onRemove={handleRemoveTicker} isWatchlist={false} groupBySector={true} 
                onTogglePortfolio={togglePortfolio} onToggleWatchlist={toggleWatchlist} onToggleIgnore={toggleIgnoreStock} onToggleSectorIgnore={toggleIgnoreSector} 
                ignoredStocks={ignoredStocks} ignoredSectors={ignoredSectors} sectionIgnored={ignoredSections.has('market')} 
                onOpenChart={setSelectedStock}
                onOpenNews={(sym) => setViewingNewsTicker(sym)} // PASS HANDLER
              />
          </CollapsibleSection>
        )}
      </main>
    </div>
  );
}

function CollapsibleSection({ title, count, icon, children, defaultOpen = true, updated, onToggleIgnore, isIgnored }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <section className="mb-6 relative">
      <div className="sticky top-16 z-40 bg-[#020617] border-b border-slate-800/50 flex items-center justify-between py-2 mb-2 shadow-sm h-12">
        <div onClick={() => setIsOpen(!isOpen)} title="Collapse/Expand Section" className={`flex items-center gap-2 cursor-pointer group ${isIgnored ? 'opacity-50 grayscale' : ''}`}>
          <div className="p-1 bg-slate-800/50 group-hover:bg-slate-700/50 rounded border border-slate-700 transition-colors">
            {isOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
          </div>
          <div className={`p-1 rounded border border-slate-800 bg-slate-900/50`}>{icon}</div>
          <h2 className="text-sm font-bold text-slate-100 tracking-wide uppercase group-hover:text-indigo-400 transition-colors">{title}</h2>
          {count > 0 && <span className="text-[9px] font-bold bg-amber-500 text-slate-900 px-1.5 py-0.5 rounded-sm">{count}</span>}
        </div>
        <div className="flex items-center gap-3">
          {updated && <div className="text-[10px] text-slate-500 font-mono hidden sm:block">UPDATED: {updated}</div>}
          {onToggleIgnore && <button onClick={(e) => { e.stopPropagation(); onToggleIgnore(); }} title={isIgnored ? "Enable this section" : "Ignore/Hide this section"} className={`p-1.5 rounded transition ${isIgnored ? 'text-rose-400 hover:bg-rose-500/10' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}>{isIgnored ? <EyeOff size={14} /> : <Eye size={14} />}</button>}
        </div>
      </div>
      <AnimatePresence>
        {isOpen && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-visible">{children}</motion.div>}
      </AnimatePresence>
    </section>
  );
}

function SignalSubsection({ title, icon, data, children, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  if (!data || data.length === 0) return null;
  return (
    <div className="mb-4">
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        title="Toggle Subsection"
        className="flex items-center gap-2 mb-2 px-1 cursor-pointer group select-none"
      >
        <div className="text-slate-500 group-hover:text-white transition-colors">
            {isOpen ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider group-hover:text-indigo-400 transition-colors">
            {icon}
            {title} <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 rounded">{data.length}</span>
        </div>
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: "auto", opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }} 
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;