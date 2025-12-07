import { motion } from 'framer-motion';
import {
    BarChart,
    Briefcase,
    Eye,
    EyeOff,
    Newspaper // Import Newspaper Icon
    ,
    TrendingDown,
    TrendingUp,
    Volume2
} from 'lucide-react';

const SignalCard = ({ item, onTogglePortfolio, onToggleWatchlist, onToggleIgnore, isSpeaking, onOpenChart, onOpenNews }) => {
  const isBuy = item.is_buy;
  
  const formatChange = (val) => {
    if (!val || isNaN(val)) return '0.00%';
    return `${val > 0 ? '+' : ''}${val.toFixed(2)}%`;
  };

  const ChangeBadge = ({ val, icon: Icon, label }) => {
    const isPos = val > 0;
    const isNeg = val < 0;
    const colorClass = isPos ? 'text-emerald-400' : isNeg ? 'text-rose-400' : 'text-slate-500';
    
    if (!val && val !== 0) return null;

    return (
      <div 
        title={`${label} change since the last scan`} 
        className={`cursor-help flex items-center gap-1 text-[10px] font-mono ${colorClass} bg-slate-900/50 px-1.5 py-0.5 rounded border border-slate-800`}
      >
        {Icon && <Icon size={10} />}
        <span>{label}</span>
        <span className="font-bold">{formatChange(val)}</span>
      </div>
    );
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1, borderColor: isSpeaking ? '#34d399' : 'rgba(30, 41, 59, 0.5)' }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      className={`relative bg-[#0b1120] border ${isSpeaking ? 'border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]' : 'border-slate-800'} rounded-xl p-4 shadow-lg overflow-hidden group`}
    >
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${isBuy ? 'from-emerald-500/10' : 'from-rose-500/10'} to-transparent rounded-bl-full pointer-events-none`} />

      <div className="flex justify-between items-start mb-3 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-black text-slate-100 tracking-tight">{item.symbol}</h3>
            {isSpeaking && <Volume2 size={14} className="text-emerald-400 animate-pulse" title="Currently Speaking" />}
          </div>
          <div className="flex items-baseline gap-2 mt-0.5">
             <span className="text-xl font-bold text-white tracking-tighter">${item.price.toFixed(2)}</span>
             <span className="text-[10px] text-slate-500 font-mono" title="Sector">{item.sector}</span>
          </div>
        </div>
        
        <div 
            title={`Signal Type: ${isBuy ? 'Buy' : 'Sell'}`}
            className={`flex items-center gap-1 px-2 py-1 rounded-md border shadow-sm ${isBuy ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}
        >
          {isBuy ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span className="text-xs font-bold uppercase">{isBuy ? 'BUY' : 'SELL'}</span>
        </div>
      </div>

      <p className="text-xs text-slate-400 mb-4 line-clamp-2 min-h-[2.5em] leading-relaxed" title={item.reason}>
        {item.reason}
      </p>

      <div className="flex items-center gap-2 mb-4">
        <ChangeBadge val={item.priceChange} label="Price" />
        <ChangeBadge val={item.volChange} icon={BarChart} label="Vol" />
      </div>

      {/* Actions Footer - Updated to GRID-COLS-5 */}
      <div className="grid grid-cols-5 gap-2 pt-3 border-t border-slate-800/50">
        <button 
            title={item.is_in_portfolio ? "Remove from Portfolio" : "Add to Portfolio"}
            onClick={() => onTogglePortfolio(item.symbol, item.is_in_portfolio)} 
            className={`col-span-1 flex items-center justify-center p-1.5 rounded transition-colors ${item.is_in_portfolio ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'}`}
        >
          <Briefcase size={16} />
        </button>

        <button 
            title={item.is_watched ? "Remove from Watchlist" : "Add to Watchlist"}
            onClick={() => onToggleWatchlist(item.symbol, item.is_watched)} 
            className={`col-span-1 flex items-center justify-center p-1.5 rounded transition-colors ${item.is_watched ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'}`}
        >
          <Eye size={16} />
        </button>

        <button 
            title="Open Detailed Chart"
            onClick={() => onOpenChart(item.symbol)} 
            className="col-span-1 flex items-center justify-center p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
        >
          <BarChart size={16} />
        </button>

        {/* NEW BUTTON: NEWS */}
        <button 
            title="View Latest News"
            onClick={() => onOpenNews(item.symbol)} 
            className="col-span-1 flex items-center justify-center p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
        >
          <Newspaper size={16} />
        </button>

        <button 
            title="Ignore/Hide this Stock"
            onClick={() => onToggleIgnore(item.symbol)} 
            className="col-span-1 flex items-center justify-center p-1.5 rounded bg-slate-800 hover:bg-rose-900/30 text-slate-400 hover:text-rose-400 transition-colors"
        >
          <EyeOff size={16} />
        </button>
      </div>
    </motion.div>
  );
};

export default SignalCard;