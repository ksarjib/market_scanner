import { motion } from 'framer-motion';
import { PlusCircle } from 'lucide-react';

const WheelSignalCard = ({ item, onLogTrade }) => {
  const suggestion = item.wheel_suggestion;
  if (!suggestion) return null;

  const isPut = suggestion.type === 'CSP';
  const colorClass = isPut ? 'emerald' : 'indigo'; // Green for Puts, Indigo for Calls

  return (
    <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} 
        className={`relative rounded-xl p-4 border bg-gradient-to-b from-[#0f172a] to-[#020617] shadow-lg group hover:ring-1 hover:ring-${colorClass}-500/50 transition-all border-slate-800`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
            <h3 className="text-lg font-bold text-white tracking-tight">{item.symbol}</h3>
            <p className="text-xs text-slate-500 font-mono">${item.price.toFixed(2)}</p>
        </div>
        <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase border bg-${colorClass}-500/10 border-${colorClass}-500/20 text-${colorClass}-400`}>
            {isPut ? 'Sell Put' : 'Sell Call'}
        </div>
      </div>

      {/* Suggestion Box */}
      <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800 mb-3">
        <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-400">Strike</span>
            <span className={`text-sm font-bold font-mono text-${colorClass}-300`}>${suggestion.strike}</span>
        </div>
        <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-400">Premium</span>
            <span className="text-sm font-bold font-mono text-white">${suggestion.premium}</span>
        </div>
        <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Expiry</span>
            <span className="text-xs font-mono text-slate-300">{suggestion.expiry}</span>
        </div>
      </div>

      {/* Reason */}
      <p className="text-[10px] text-slate-500 mb-4 border-l-2 border-slate-700 pl-2 italic">
        "{suggestion.reason}"
      </p>

      {/* Action Button */}
      <button 
        onClick={() => onLogTrade({ 
            symbol: item.symbol, 
            type: suggestion.type, 
            strike: suggestion.strike, 
            premium: suggestion.premium,
            expiry: suggestion.expiry
        })}
        className={`w-full py-2 rounded flex items-center justify-center gap-2 text-xs font-bold transition-all bg-${colorClass}-600 hover:bg-${colorClass}-500 text-white shadow-lg shadow-${colorClass}-900/20`}
      >
        <PlusCircle size={14} />
        <span>Log This Trade</span>
      </button>
    </motion.div>
  );
};

export default WheelSignalCard;