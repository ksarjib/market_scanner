import {
  ChevronDown, ChevronRight, Eye, EyeOff, Layers, Star, Trash2,
  TrendingDown, TrendingUp
} from 'lucide-react';
import { useState } from 'react';
// IMPORT THE NEW COMPONENT
import StockActionsMenu from './StockActionsMenu';

// --- HELPER: STATUS BADGE ---
const Badge = ({ status }) => {
  let styles = "bg-slate-800/50 text-slate-400 border-slate-700/50";
  let icon = null;
  const safeStatus = status || "UNKNOWN";
  
  if (safeStatus.includes("SWEET") || safeStatus.includes("Buy") || safeStatus.includes("TRINITY BUY")) {
    styles = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"; 
    icon = <TrendingUp size={10} />;
  } else if (safeStatus.includes("Sell") || safeStatus.includes("Over") || safeStatus.includes("TRINITY SELL")) {
    styles = "bg-rose-500/10 text-rose-400 border-rose-500/20"; 
    icon = <TrendingDown size={10} />;
  }
  return (
    <span className={`inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-sm text-[9px] font-bold border uppercase tracking-wider ${styles}`}>
      {icon}{safeStatus.replace("SWEET SPOT", "SWEET").replace("TRINITY", "TRINITY ")}
    </span>
  );
};

// --- COMPONENT: ROW WITH DROPDOWN ---
const StockRow = ({ 
  row, 
  onRemove, 
  isWatchlist, 
  isPortfolio, 
  onToggleIgnore, 
  isIgnored, 
  onTogglePortfolio, 
  onToggleWatchlist, 
  onOpenChart,
  onOpenNews 
}) => {
  if (!row) return null;

  // Percentage Change Helpers
  const pChange = row.priceChange || 0;
  const pColor = pChange > 0 ? 'text-emerald-400' : pChange < 0 ? 'text-rose-400' : 'text-slate-500';
  const vChange = row.volChange || 0;
  const vColor = vChange > 0 ? 'text-emerald-500' : vChange < 0 ? 'text-rose-500' : 'text-slate-500';

  return (
    <tr className={`hover:bg-slate-800/30 transition-colors group ${isIgnored ? 'opacity-30 grayscale' : ''}`}>
      
      <td className="p-3 text-center cursor-pointer" onClick={() => onOpenChart(row.symbol)}>
        {row.is_watched && <Star size={12} className="text-amber-400 fill-amber-400 mx-auto" />}
      </td>

      <td className="p-3 cursor-pointer" onClick={() => onOpenChart(row.symbol)}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-400">
            {row.symbol ? row.symbol[0] : '?'}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-200">{row.company_name || row.symbol}</span>
            <span className="text-[9px] text-slate-500 uppercase">{row.symbol}</span>
          </div>
        </div>
      </td>

      <td className="p-3 text-right">
        <div className="flex flex-col items-end">
            <div className="font-mono text-slate-300 font-medium">
            ${typeof row.price === 'number' ? row.price.toFixed(2) : '---'}
            </div>
            {pChange !== 0 && (
                <div className={`text-[9px] font-mono font-bold ${pColor}`}>
                    {pChange > 0 ? '+' : ''}{pChange.toFixed(2)}%
                </div>
            )}
        </div>
      </td>

      <td className="p-3 text-center"><Badge status={row.status} /></td>

      <td className="p-3 text-center"><div className={`font-mono font-bold ${row.rsi > 70 ? "text-rose-400" : row.rsi < 30 ? "text-emerald-400" : "text-slate-500"}`}>{typeof row.rsi === 'number' ? row.rsi.toFixed(0) : '-'}</div></td>
      <td className="p-3 text-center"><div className={`font-mono font-bold ${row.macd > row.macd_sig ? 'text-emerald-400' : 'text-rose-400'}`}>{typeof row.macd === 'number' ? row.macd.toFixed(2) : '-'}</div></td>
      
      <td className="p-3 text-center">
        <div className="flex flex-col items-center">
            <div className="font-mono text-slate-400">
            {typeof row.volume === 'number' ? (row.volume/1000000).toFixed(1) + 'M' : '-'}
            </div>
            {vChange !== 0 && (
                <div className={`text-[9px] font-mono ${vColor}`}>
                    {vChange > 0 ? '↑' : '↓'} {Math.abs(vChange).toFixed(0)}%
                </div>
            )}
        </div>
      </td>

      <td className="p-3 hidden md:table-cell">
        <p className="text-slate-400 max-w-xs truncate opacity-60 group-hover:opacity-100 transition-opacity">
          {row.reason || "-"}
        </p>
      </td>

      {/* 9. ACTIONS (Shared Component) */}
      <td className="p-3 text-right relative" onClick={e => e.stopPropagation()}>
        <div className="flex justify-end items-center gap-1">
          
          {/* USE SHARED MENU COMPONENT */}
          <StockActionsMenu 
            item={row}
            onTogglePortfolio={onTogglePortfolio}
            onToggleWatchlist={onToggleWatchlist}
            onToggleIgnore={onToggleIgnore}
            onOpenChart={onOpenChart}
            onOpenNews={onOpenNews}
          />

          <button 
            onClick={() => onToggleIgnore(row.symbol)} 
            className={`p-1.5 rounded transition opacity-0 group-hover:opacity-100 ${isIgnored ? 'text-rose-400 bg-rose-500/10 opacity-100' : 'text-slate-600 hover:text-white'}`}
            title="Ignore"
          >
            {isIgnored ? <EyeOff size={14}/> : <Eye size={14}/>}
          </button>

          {(isWatchlist || isPortfolio) && (
            <button 
                onClick={() => onRemove(row.symbol)} 
                className="text-slate-600 hover:text-rose-400 p-1.5 rounded hover:bg-rose-500/10 transition opacity-0 group-hover:opacity-100"
                title="Remove from list"
            >
                <Trash2 size={14} />
            </button>
          )}

        </div>
      </td>
    </tr>
  );
};

// --- COMPONENT: SECTOR GROUP ---
const CollapsibleSectorGroup = ({ sector, rows = [], onToggleSectorIgnore, isSectorIgnored, sectionIgnored, children }) => {
  const [isOpen, setIsOpen] = useState(true);
  const count = (rows && Array.isArray(rows)) ? rows.length : 0;

  return (
    <>
      <tr className={`bg-slate-900/90 border-y border-slate-800 hover:bg-slate-800/80 transition-colors ${isSectorIgnored || sectionIgnored ? 'grayscale opacity-70' : ''}`}>
        <td colSpan={9} className="p-2 pl-4 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-[10px] uppercase tracking-wider">
            {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />} 
            <Layers size={12} /> 
            {sector} 
            <span className="text-slate-600 ml-1">({count})</span>
            {(isSectorIgnored || sectionIgnored) && <span className="text-[9px] text-rose-400 bg-rose-500/10 px-1 rounded">IGNORED</span>}
          </div>
        </td>
        <td className="p-2 text-right">
          <button onClick={() => onToggleSectorIgnore(sector)} className={`p-1 rounded ${isSectorIgnored || sectionIgnored ? 'text-rose-400' : 'text-slate-600 hover:text-white'}`}>
            {isSectorIgnored || sectionIgnored ? <EyeOff size={12}/> : <Eye size={12}/>}
          </button>
        </td>
      </tr>
      {isOpen && children}
    </>
  );
};

// --- MAIN COMPONENT: STOCK TABLE ---
const StockTable = ({ 
  data = [], 
  onRemove, 
  isWatchlist, 
  isPortfolio, 
  groupBySector = false, 
  onToggleIgnore, 
  onToggleSectorIgnore, 
  ignoredStocks, 
  ignoredSectors, 
  sectionIgnored, 
  onTogglePortfolio, 
  onToggleWatchlist, 
  onOpenChart,
  onOpenNews 
}) => {
  if (!data || !Array.isArray(data)) {
    console.error("Invalid data passed to StockTable:", data);
    return null; // Render nothing if data is invalid
  }

  const safeData = (data && Array.isArray(data)) ? data : [];

  if (safeData.length === 0) {
    return <div className="p-8 text-center text-slate-500 italic text-xs">No assets available.</div>;
  }
  
  let groupedData = {};
  if (groupBySector) {
    safeData.forEach(item => { 
      if (!item) return;
      const s = item.sector || "Other"; 
      if (!groupedData[s]) groupedData[s] = []; 
      groupedData[s].push(item); 
    });
  }

  const renderRow = (row) => (
    <StockRow 
        key={row.symbol} 
        row={row} 
        onRemove={onRemove} 
        isWatchlist={isWatchlist} 
        isPortfolio={isPortfolio} 
        onToggleIgnore={onToggleIgnore} 
        isIgnored={ignoredStocks ? ignoredStocks.has(row.symbol) : false} 
        onTogglePortfolio={onTogglePortfolio} 
        onToggleWatchlist={onToggleWatchlist} 
        onOpenChart={onOpenChart}
        onOpenNews={onOpenNews} 
    />
  );
   
  return (
    <div className={`border border-slate-800 rounded-lg shadow-lg bg-[#0f172a]/40 backdrop-blur-none`}>
      <table className="w-full text-left border-collapse">
        <thead className="sticky top-16 z-30 bg-[#020617] shadow-md border-b border-slate-700">
          <tr className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">
            <th className="p-3 w-8 bg-[#020617] border-b border-slate-800"></th>
            <th className="p-3 bg-[#020617] border-b border-slate-800">Asset</th>
            <th className="p-3 text-right bg-[#020617] border-b border-slate-800">Price</th>
            <th className="p-3 text-center bg-[#020617] border-b border-slate-800">Trend</th>
            <th className="p-3 w-16 text-center bg-[#020617] border-b border-slate-800">RSI</th>
            <th className="p-3 w-16 text-center bg-[#020617] border-b border-slate-800">MACD</th>
            <th className="p-3 w-16 text-center bg-[#020617] border-b border-slate-800">Vol</th>
            <th className="p-3 hidden md:table-cell bg-[#020617] border-b border-slate-800">Analysis</th>
            <th className="p-3 w-28 bg-[#020617] border-b border-slate-800"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/40 text-xs">
          {groupBySector 
            ? Object.keys(groupedData).sort().map(sector => (
                <CollapsibleSectorGroup 
                    key={sector} 
                    sector={sector} 
                    rows={groupedData[sector]} 
                    onToggleSectorIgnore={onToggleSectorIgnore} 
                    isSectorIgnored={ignoredSectors ? ignoredSectors.has(sector) : false} 
                    sectionIgnored={sectionIgnored}
                >
                    {groupedData[sector].map(renderRow)}
                </CollapsibleSectorGroup>
              ))
            : safeData.map(renderRow)
          }
        </tbody>
      </table>
    </div>
  );
};

export default StockTable;