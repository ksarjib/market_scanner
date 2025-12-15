import { History } from 'lucide-react';

const WheelHistory = ({ history }) => {
  if (!history || history.length === 0) {
    return (
        <div className="p-6 text-center border border-slate-800 rounded-lg bg-[#0b1120] text-slate-500 text-xs">
            No trades logged yet. Start the wheel!
        </div>
    );
  }

  return (
    <div className="border border-slate-800 rounded-lg bg-[#0b1120] overflow-hidden">
      <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-800 flex items-center gap-2">
        <History size={14} className="text-indigo-400" />
        <h3 className="text-sm font-bold text-slate-200">Trade History</h3>
      </div>
      <table className="w-full text-left">
        <thead className="bg-slate-900/30 text-[10px] uppercase text-slate-500">
            <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Symbol</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2 text-right">Strike</th>
                <th className="px-4 py-2 text-right">Premium</th>
                <th className="px-4 py-2">Status</th>
            </tr>
        </thead>
        <tbody className="text-xs divide-y divide-slate-800/50">
            {history.map((trade) => (
                <tr key={trade.id} className="hover:bg-slate-800/20">
                    <td className="px-4 py-3 text-slate-400 font-mono">{trade.date}</td>
                    <td className="px-4 py-3 font-bold text-slate-200">{trade.symbol}</td>
                    <td className="px-4 py-3">
                        <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold ${trade.type === 'CSP' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'}`}>
                            {trade.type}
                        </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-300">${trade.strike}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-400">+${trade.premium}</td>
                    <td className="px-4 py-3">
                        <span className="text-slate-500">{trade.status}</span>
                    </td>
                </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
};

export default WheelHistory;