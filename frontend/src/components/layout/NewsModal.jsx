import { motion } from 'framer-motion';
import { Calendar, ImageOff, Loader2, Newspaper, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../services/api';

const NewsModal = ({ symbol, onClose }) => {
  const [news, setNews] = useState([]);
  const [summary, setSummary] = useState(""); // State for summary
  const [loading, setLoading] = useState(true);

  const formatTimeAgo = (unixTime) => {
    const seconds = Math.floor((new Date() - unixTime * 1000) / 1000);
    if (seconds > 86400) return Math.floor(seconds / 86400) + "d ago";
    if (seconds > 3600) return Math.floor(seconds / 3600) + "h ago";
    return Math.floor(seconds / 60) + "m ago";
  };

  useEffect(() => {
    const loadNews = async () => {
        setLoading(true);
        try {
            const data = await api.fetchNews(symbol);
            // Handle the new response format { summary, feed }
            setNews(data.feed || []);
            setSummary(data.summary || "No summary available.");
        } catch (e) {
            console.error("Failed to load news", e);
        } finally {
            setLoading(false);
        }
    };

    if (symbol) {
        loadNews();
    }
  }, [symbol]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-[#0f172a] border border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                <Newspaper size={20} className="text-indigo-400" />
            </div>
            <div>
                <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    {symbol} News 
                    <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700">LIVE</span>
                </h3>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          
          {loading ? (
             <div className="flex flex-col items-center justify-center h-40 gap-3 text-slate-500">
                <Loader2 size={30} className="animate-spin text-indigo-500" />
                <span className="text-xs font-medium">Analyzing market data...</span>
             </div>
          ) : (
            <>
              {/* --- NEW: SUMMARY CARD --- */}
              {summary && news.length > 0 && (
                <div className="bg-gradient-to-br from-indigo-900/20 to-slate-900 border border-indigo-500/20 rounded-lg p-4 mb-2">
                    <div className="flex items-center gap-2 mb-2 text-indigo-400">
                        <Sparkles size={14} />
                        <span className="text-xs font-bold uppercase tracking-wider">AI Brief</span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed font-medium">
                        {summary}
                    </p>
                </div>
              )}

              {news.length === 0 && (
                 <div className="text-center py-12 text-slate-500">
                    <p>No relevant news found for {symbol} in the last 7 days.</p>
                 </div>
              )}

              {/* News Feed List */}
              {news.map((item) => (
                <a 
                    key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
                    className="block group bg-slate-900/40 border border-slate-800 hover:border-indigo-500/30 hover:bg-slate-800/60 rounded-lg overflow-hidden transition-all"
                >
                  <div className="flex flex-col sm:flex-row gap-4 p-4">
                    {item.image ? (
                        <div className="w-full sm:w-32 h-20 sm:h-20 shrink-0 rounded-md overflow-hidden bg-slate-950 border border-slate-800 relative">
                            <img src={item.image} alt="News" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        </div>
                    ) : (
                        <div className="w-full sm:w-32 h-20 sm:h-20 shrink-0 rounded-md bg-slate-800 flex items-center justify-center text-slate-600">
                            <ImageOff size={20} />
                        </div>
                    )}

                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1.5">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide bg-indigo-500/10 px-1.5 rounded">{item.source}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-slate-500 whitespace-nowrap">
                                <Calendar size={10} />
                                <span>{formatTimeAgo(item.datetime)}</span>
                            </div>
                        </div>
                        <h4 className="text-sm font-bold text-slate-200 group-hover:text-white leading-snug mb-2 line-clamp-2">{item.headline}</h4>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed opacity-80 group-hover:opacity-100">{item.summary}</p>
                    </div>
                  </div>
                </a>
              ))}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default NewsModal;