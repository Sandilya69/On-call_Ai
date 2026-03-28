import { Search } from "lucide-react";

export default function EngineersPage() {
  const engineers = [
    { initial: 'PN', name: 'Priya Nair', role: 'Senior SRE', skills: ['postgres', 'rds', 'query-opt'], tz: 'UTC+5.5', status: 'ON-CALL' },
    { initial: 'LF', name: 'Lucas Ferreira', role: 'Backend Eng', skills: ['node', 'react', 'typescript'], tz: 'UTC-3', status: 'STANDBY' },
    { initial: 'SP', name: 'Seo-yun Park', role: 'Platform Eng', skills: ['kubernetes', 'docker', 'aws'], tz: 'UTC+9', status: 'OFF' },
    { initial: 'OH', name: 'Omar Hassan', role: 'Systems Eng', skills: ['linux', 'networking', 'redis'], tz: 'UTC+2', status: 'STANDBY' },
    { initial: 'IM', name: 'Ines Martinez', role: 'Data Eng', skills: ['elasticsearch', 'kafka', 'python'], tz: 'UTC+1', status: 'OFF' }
  ];

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Engineers (5)</h1>
        <button className="px-3 py-1.5 text-xs font-semibold rounded-sm hover:opacity-90 transition-opacity" style={{ backgroundColor: 'var(--color-brand-primary)', color: 'var(--color-text-inverse)' }}>
          + Add Engineer
        </button>
      </div>

      <div className="relative mb-6 w-72">
        <Search className="absolute left-3 top-2.5 opacity-50" size={14} style={{ color: 'var(--color-text-primary)' }} />
        <input 
          type="text" 
          placeholder="Search engineers..." 
          className="w-full text-sm pl-9 pr-4 py-2 rounded-sm border focus:outline-none focus:ring-1"
          style={{ 
            backgroundColor: 'var(--color-bg-base)', 
            borderColor: 'var(--color-border-default)',
            color: 'var(--color-text-primary)',
            outlineColor: 'var(--color-focus-ring)'
          }}
        />
      </div>

      <div className="border rounded-sm overflow-hidden" style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider border-b bg-[var(--color-bg-subtle)]" style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border-subtle)' }}>
              <th className="font-semibold py-3 px-4 w-12"></th>
              <th className="font-semibold py-3 px-4">Name / Role</th>
              <th className="font-semibold py-3 px-4">Skills</th>
              <th className="font-semibold py-3 px-4 w-24">TZ</th>
              <th className="font-semibold py-3 px-4 w-32">Status</th>
            </tr>
          </thead>
          <tbody>
            {engineers.map((eng, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-[var(--color-bg-subtle)] transition-colors cursor-pointer" style={{ borderColor: 'var(--color-border-subtle)' }}>
                <td className="py-2 px-4 h-12">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'var(--color-border-default)', color: 'var(--color-text-primary)' }}>
                    {eng.initial}
                  </div>
                </td>
                <td className="py-2 px-4">
                  <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{eng.name}</div>
                  <div className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{eng.role}</div>
                </td>
                <td className="py-2 px-4">
                  <div className="flex gap-1.5 flex-wrap">
                    {eng.skills.map((skill, j) => (
                      <span key={j} className="text-[10px] font-mono px-2 py-0.5 rounded border" style={{ backgroundColor: 'var(--color-bg-base)', borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-2 px-4 text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                  {eng.tz}
                </td>
                <td className="py-2 px-4">
                  <span className="text-[10px] font-bold px-2 py-1 rounded-sm tracking-wider" style={{ 
                    backgroundColor: eng.status === 'ON-CALL' ? 'var(--color-brand-primary)' : 'var(--color-border-default)',
                    color: eng.status === 'ON-CALL' ? 'var(--color-text-inverse)' : 'var(--color-text-muted)'
                  }}>
                    {eng.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
