import { motion } from 'framer-motion';
import { X } from 'lucide-react';

const ChartModal = ({ symbol, onClose }) => {
  if (!symbol) return null;
  
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-6xl h-[80vh] bg-[#0f172a] rounded-xl border border-slate-700 shadow-2xl overflow-hidden relative" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-3 border-b border-slate-700 bg-slate-900">
          <div className="flex items-center gap-2"><h2 className="text-lg font-bold text-white">{symbol}</h2><span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">LIVE VIEW</span></div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"><X size={20} /></button>
        </div>
        <iframe title="TradingView" className="w-full h-full" src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_1&symbol=${symbol}&interval=D&hidesidetoolbar=1&symboledit=1&saveimage=1&toolbarbg=F1F3F6&studies=[]&theme=dark&style=1&timezone=Etc%2FUTC`} allowTransparency="true" scrolling="no" allowFullScreen />
      </motion.div>
    </motion.div>
  );
};

export default ChartModal;