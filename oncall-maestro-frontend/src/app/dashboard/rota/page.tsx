import { ChevronLeft, ChevronRight } from "lucide-react";

export default function RotaPage() {
  const days = ["MON 24", "TUE 25", "WED 26", "THU 27", "FRI 28", "SAT 29", "SUN 30"];
  const shifts = [
    { day: 0, initial: 'PN', name: 'Priya N', time: '9am-9am', isToday: true },
    { day: 1, initial: 'PN', name: 'Priya N', time: '9am-9am' },
    { day: 2, initial: 'LF', name: 'Lucas F', time: '9am-9am' },
    { day: 3, initial: 'SP', name: 'Seo-y. P', time: '9am-9am' },
    { day: 4, initial: 'OH', name: 'Omar H', time: '9am-9am' },
    { day: 5, initial: 'IM', name: 'Ines M', time: '9am-9am' },
    { day: 6, initial: 'LF', name: 'Lucas F', time: '9am-9am' },
  ];

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Rota Schedule</h1>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button className="p-1 rounded-sm hover:opacity-80" style={{ backgroundColor: 'var(--color-bg-surface)', borderColor: 'var(--color-border-default)' }}><ChevronLeft size={16} color="var(--color-text-primary)" /></button>
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Mar 24–30, 2026</span>
            <button className="p-1 rounded-sm hover:opacity-80" style={{ backgroundColor: 'var(--color-bg-surface)', borderColor: 'var(--color-border-default)' }}><ChevronRight size={16} color="var(--color-text-primary)" /></button>
          </div>
          <button className="px-3 py-1.5 text-xs font-semibold rounded-sm hover:opacity-90 transition-opacity flex gap-2 items-center" style={{ backgroundColor: 'var(--color-brand-primary)', color: 'var(--color-text-inverse)' }}>
            + Add Slot
          </button>
        </div>
      </div>

      <div className="border rounded-md overflow-hidden bg-[var(--color-bg-surface)]" style={{ borderColor: 'var(--color-border-default)' }}>
        <div className="grid grid-cols-7 border-b bg-[var(--color-bg-subtle)]" style={{ borderColor: 'var(--color-border-default)' }}>
          {days.map((d, i) => (
            <div key={i} className="py-3 px-4 text-xs font-semibold uppercase tracking-wider border-r last:border-r-0" style={{ borderColor: 'var(--color-border-default)', color: i === 0 ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)' }}>
              {d}
              {i === 0 && <div className="text-[9px] mt-1 opacity-80" style={{ color: 'var(--color-brand-primary)' }}>TODAY</div>}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 min-h-[400px]">
          {shifts.map((shift, i) => (
            <div key={i} className={`p-2 border-r last:border-r-0 relative group ${shift.isToday ? 'bg-[var(--color-bg-subtle)]' : ''}`} style={{ borderColor: 'var(--color-border-default)' }}>
              <div className="p-3 border rounded-sm flex flex-col gap-2 hover:border-[var(--color-brand-primary)] hover:shadow-sm transition-all cursor-pointer bg-[var(--color-bg-base)]" style={{ borderColor: 'var(--color-border-default)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'var(--color-brand-primary)', color: 'var(--color-text-inverse)' }}>
                  {shift.initial}
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{shift.name}</div>
                  <div className="text-xs font-mono mt-1" style={{ color: 'var(--color-text-muted)' }}>{shift.time}</div>
                </div>

                <div className="opacity-0 group-hover:opacity-100 absolute bottom-4 left-4 right-4 transition-opacity">
                  <button className="w-full py-1 text-[10px] uppercase font-bold rounded-sm border" style={{ backgroundColor: 'var(--color-bg-surface)', borderColor: 'var(--color-border-strong)', color: 'var(--color-brand-primary)' }}>
                    Swap
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
