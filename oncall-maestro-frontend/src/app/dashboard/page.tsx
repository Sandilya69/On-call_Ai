import { AlertCircle } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="animate-in fade-in duration-300">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold font-sans">Dashboard</h1>
        <button className="px-3 py-1.5 text-xs font-medium rounded-sm hover:opacity-90 transition-opacity cursor-pointer" style={{ backgroundColor: 'var(--color-brand-primary)', color: 'var(--color-text-inverse)' }}>
          Generate Handover
        </button>
      </div>

      <div className="grid grid-cols-4 gap-0 border rounded-sm mb-8 overflow-hidden shadow-sm" style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}>
        <MetricCard label="Active P1 Incidents" value="1" trend="↑ 1 from last hour" color="var(--color-p1)" bg="var(--color-bg-surface)" />
        <MetricCard label="MTTA Avg" value="4.2 min" trend="↓ 12% vs last week" color="var(--color-text-primary)" bg="var(--color-bg-surface)" borderLeft />
        <MetricCard label="On-call right now" value="Priya Nair" trend="Shift ends in 4 hrs" color="var(--color-text-primary)" bg="var(--color-bg-surface)" borderLeft />
        <MetricCard label="Open Total" value="8" trend="Normal volume" color="var(--color-text-primary)" bg="var(--color-bg-surface)" borderLeft />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Active Incidents Feed (Live)</h2>
          <div className="border rounded-sm overflow-hidden shadow-sm flex flex-col" style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}>
            <div className="p-3 text-xs font-medium border-b flex justify-between uppercase tracking-wider" style={{ borderColor: 'var(--color-border-subtle)', color: 'var(--color-text-muted)' }}>
              <span>Incident</span>
              <span>Duration</span>
            </div>
            
            {/* P1 Item */}
            <div className="flex justify-between items-center p-3 border-b border-l-2 hover:bg-[var(--color-bg-subtle)] transition-colors cursor-pointer" style={{ borderLeftColor: 'var(--color-p1)', borderBottomColor: 'var(--color-border-subtle)' }}>
              <div className="flex items-center gap-3">
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-sm font-mono" style={{ backgroundColor: 'var(--color-p1-bg)', color: 'var(--color-p1)' }}>P1</span>
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>DB replica lag &gt; 30s</div>
                  <div className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>postgres-prod</div>
                </div>
              </div>
              <div className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>4m</div>
            </div>
            
            {/* P2 Item */}
            <div className="flex justify-between items-center p-3 border-l-2 hover:bg-[var(--color-bg-subtle)] transition-colors cursor-pointer" style={{ borderLeftColor: 'var(--color-p2)' }}>
              <div className="flex items-center gap-3">
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-sm font-mono" style={{ backgroundColor: 'var(--color-p2-bg)', color: 'var(--color-p2)' }}>P2</span>
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Elevated 500s on checkout</div>
                  <div className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>pay-service</div>
                </div>
              </div>
              <div className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>14m</div>
            </div>
          </div>
        </div>

        <div>
           <h2 className="text-sm font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Recent Activity log</h2>
           <div className="border rounded-sm p-4 flex items-center justify-center flex-col min-h-[220px]" style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}>
              <AlertCircle size={24} style={{ color: 'var(--color-text-muted)' }} className="mb-2" />
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>All clear. No recent status changes logged.</p>
           </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, trend, color, bg, borderLeft }: { label: string, value: string, trend: string, color: string, bg: string, borderLeft?: boolean }) {
  return (
    <div className={`p-5 ${borderLeft ? 'border-l' : ''}`} style={{ backgroundColor: bg, borderColor: borderLeft ? 'var(--color-border-default)' : 'transparent' }}>
      <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
      <div className="text-3xl font-bold font-mono" style={{ color }}>{value}</div>
      <div className="text-xs mt-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>{trend}</div>
    </div>
  );
}
