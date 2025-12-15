import { motion } from 'framer-motion';
import { AlertTriangle, EyeOff, Star, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useRef } from 'react';
import StockActionsMenu from './StockActionsMenu';

const SignalCard = ({ item, onTogglePortfolio, onToggleWatchlist, onToggleIgnore, isSpeaking, onOpenChart, onOpenNews }) => {
  const isBuy = item.is_buy;
  
  // --- CALCULATION LOGIC ---
  const prevItemRef = useRef(item);
  const prevItem = prevItemRef.current;
  
  let pChange = 0;
  let vChange = 0;

  if (prevItem && prevItem.symbol === item.symbol) {
      if (prevItem.price && prevItem.price > 0) {
          pChange = ((item.price - prevItem.price) / prevItem.price) * 100;
      }
      if (prevItem.volume && prevItem.volume > 0) {
          vChange = ((item.volume - prevItem.volume) / prevItem.volume) * 100;
      }
  }

  useEffect(() => {
      prevItemRef.current = item;
  }, [item]);

  // --- STYLING HELPERS ---
  const hasPChange = Math.abs(pChange) > 0.001;
  const hasVChange = Math.abs(vChange) > 0.001;

  const pColor = pChange > 0 ? 'text-emerald-400' : pChange < 0 ? 'text-rose-400' : 'text-slate-500';
  const vColor = vChange > 0 ? 'text-emerald-400' : vChange < 0 ? 'text-rose-400' : 'text-slate-500';

  return (
    <motion.div 
        onClick={() => onOpenChart && onOpenChart(item.symbol)}
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} 
        // --- THE FIX: ADDED 'hover:z-30' ---
        // This lifts the card above its siblings when you interact with it, 
        // ensuring the dropdown renders ON TOP of the cards below.
        className={`relative rounded-lg p-3 transition-all hover:-translate-y-1 cursor-pointer group hover:z-30 ${isSpeaking ? 'ring-2 ring-orange-500 scale-[1.02] z-40 shadow-[0_0_30px_rgba(249,115,22,0.4)]' : ''} ${isBuy ? 'bg-gradient-to-b from-[#064e3b]/30 to-[#020617] border border-emerald-500/30' : 'bg-gradient-to-b from-[#881337]/30 to-[#020617] border border-rose-500/30'}`}
    >
      <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none z-0">
         <div className={`absolute -right-6 -top-6 w-20 h-20 rounded-full blur-[40px] opacity-20 ${isBuy ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
      </div>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-2">
          {/* Header */}
          <div className="overflow-hidden mr-2">
             <h3 className="text-sm font-bold text-white tracking-tight truncate leading-tight mb-0.5" title={item.company_name}>{item.company_name || item.symbol}</h3>
             <div className="flex items-center gap-1">
               <div className="text-[10px] text-slate-500 font-bold">{item.symbol}</div>
               {item.is_watched && <Star size={10} className="text-amber-400 fill-amber-400" />}
             </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
              <button onClick={() => onToggleIgnore(item.symbol)} className="p-1 rounded-full text-slate-500 hover:text-white hover:bg-slate-800 transition">
                <EyeOff size={14}/>
              </button>
              
              <StockActionsMenu 
                item={item}
                onTogglePortfolio={onTogglePortfolio}
                onToggleWatchlist={onToggleWatchlist}
                onToggleIgnore={onToggleIgnore}
                onOpenChart={onOpenChart}
                onOpenNews={onOpenNews}
              />
          </div>
        </div>

        {/* Price Row */}
        <div className="flex justify-between items-center mb-2">
           <div className={`flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-sm border ${isBuy ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
              {isBuy ? <TrendingUp size={10}/> : <TrendingDown size={10}/>} {isBuy ? 'BULL' : 'BEAR'}
           </div>
           
           <div className="text-right shrink-0">
             <p className="text-sm font-mono font-bold text-slate-200">${item.price?.toFixed(2)}</p>
             <p className={`text-[9px] font-mono ${pColor}`}>
                {pChange > 0 ? '+' : ''}{pChange.toFixed(2)}%
             </p>
           </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-1 mb-2">
            <div className="bg-slate-900/50 rounded p-1 text-center border border-slate-800">
                <div className="text-[8px] text-slate-500 uppercase">RSI</div>
                <div className={`text-[10px] font-bold ${item.rsi > 70 ? 'text-rose-400' : item.rsi < 30 ? 'text-emerald-400' : 'text-slate-300'}`}>{item.rsi?.toFixed(0)}</div>
            </div>
            <div className="bg-slate-900/50 rounded p-1 text-center border border-slate-800">
                <div className="text-[8px] text-slate-500 uppercase">MACD</div>
                <div className={`text-[10px] font-bold ${item.macd > item.macd_sig ? 'text-emerald-400' : 'text-rose-400'}`}>{item.macd?.toFixed(2)}</div>
            </div>
            
            <div className="bg-slate-900/50 rounded p-1 text-center border border-slate-800 relative">
                <div className="flex justify-between px-1">
                    <span className="text-[8px] text-slate-500 uppercase">Vol</span>
                    <span className={`text-[7px] ${vColor}`}>
                       {vChange > 0 ? '↑' : vChange < 0 ? '↓' : ''}{Math.abs(vChange).toFixed(0)}%
                    </span>
                </div>
                <div className="text-[10px] font-bold text-slate-300">{(item.volume/1000000).toFixed(1)}M</div>
            </div>
        </div>

        {/* Reason Footer */}
        <div className={`p-1.5 rounded text-[10px] border ${isBuy ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-200/80' : 'bg-rose-500/5 border-rose-500/10 text-rose-200/80'}`}>
          <div className="flex items-start gap-1.5">
            <AlertTriangle size={10} className={`shrink-0 mt-0.5 ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`} />
            <div className="leading-tight line-clamp-3"><span className={`font-bold uppercase mr-1 ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`}>{item.status}:</span>{item.reason}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SignalCard;