import { Play } from "lucide-react";

export default function HandoversPage() {
  const handovers = [
    { date: 'Today 09:00', fromTo: 'Priya → Lucas', items: '3 open', time: '▶ 0:42', isNew: true },
    { date: 'Yesterday 09:00', fromTo: 'Lucas → Priya', items: '1 open', time: '▶ 0:28' },
    { date: 'Mar 26 09:00', fromTo: 'Priya → Lucas', items: '0 open', time: '▶ 0:18' },
    { date: 'Mar 25 09:00', fromTo: 'Lucas → Priya', items: '2 open', time: '▶ 0:54' },
    { date: 'Mar 24 09:00', fromTo: 'Priya → Lucas', items: '1 open', time: '▶ 0:31' }
  ];

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Shift Handovers</h1>
      </div>

      <div className="border rounded-sm overflow-hidden" style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider border-b bg-[var(--color-bg-subtle)]" style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border-subtle)' }}>
              <th className="font-semibold py-3 px-4">Date</th>
              <th className="font-semibold py-3 px-4">From → To</th>
              <th className="font-semibold py-3 px-4">Items</th>
              <th className="font-semibold py-3 px-4 w-32">Audio</th>
            </tr>
          </thead>
          <tbody>
            {handovers.map((h, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-[var(--color-bg-subtle)] transition-colors cursor-pointer group" style={{ borderColor: 'var(--color-border-subtle)' }}>
                <td className="py-3 px-4 text-sm font-medium h-12 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                  {h.isNew && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-brand-primary)' }}></span>}
                  {h.date}
                </td>
                <td className="py-3 px-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {h.fromTo}
                </td>
                <td className="py-3 px-4 text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                  {h.items}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2 text-xs font-mono font-medium rounded-sm border px-2 py-1 w-max group-hover:bg-[var(--color-bg-base)] transition-colors" style={{ 
                    color: 'var(--color-brand-primary)',
                    backgroundColor: 'var(--color-bg-surface)', 
                    borderColor: 'var(--color-border-default)' 
                  }}>
                    <Play size={12} fill="currentColor" /> {h.time.replace('▶ ', '')}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
