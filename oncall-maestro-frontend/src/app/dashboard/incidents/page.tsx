export default function IncidentsPage() {
  const incidents = [
    { sev: 'P1', title: 'DB replica lag > 30s', service: 'postgres-prod', time: '4m', assignee: 'P. Nair', status: 'FIRING' },
    { sev: 'P1', title: 'API p99 spike', service: 'gateway', time: '12m', assignee: 'P. Nair', status: 'FIRING' },
    { sev: 'P2', title: 'Memory usage > 90%', service: 'worker', time: '34m', assignee: 'L. Ferr.', status: 'ACKED' },
    { sev: 'P3', title: 'Disk usage > 85%', service: 'node-07', time: '2h', assignee: 'S. Park', status: 'RESOLVED' },
    { sev: 'P4', title: 'SSL Cert warning', service: 'cert-mgr', time: '5h', assignee: 'Unassigned', status: 'FIRING' },
  ];

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Incidents</h1>
        <button className="px-3 py-1.5 text-xs font-semibold rounded-sm hover:opacity-90 transition-opacity" style={{ backgroundColor: 'var(--color-brand-primary)', color: 'var(--color-text-inverse)' }}>
          + New Incident
        </button>
      </div>

      <div className="flex items-center justify-between mb-4 border-b pb-4" style={{ borderColor: 'var(--color-border-subtle)' }}>
        <div className="flex gap-4 text-sm font-medium">
          <span style={{ color: 'var(--color-text-primary)', borderBottom: '2px solid var(--color-brand-primary)' }} className="pb-4 -mb-4">All</span>
          <span style={{ color: 'var(--color-text-muted)' }} className="cursor-pointer hover:opacity-80">Firing</span>
          <span style={{ color: 'var(--color-text-muted)' }} className="cursor-pointer hover:opacity-80">Acknowledged</span>
          <span style={{ color: 'var(--color-text-muted)' }} className="cursor-pointer hover:opacity-80">Resolved</span>
        </div>
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search... ⌘F" 
            className="text-xs px-3 py-1.5 rounded border focus:outline-none focus:ring-1"
            style={{ 
              backgroundColor: 'var(--color-bg-base)', 
              borderColor: 'var(--color-border-default)',
              color: 'var(--color-text-primary)',
              outlineColor: 'var(--color-focus-ring)'
            }}
          />
        </div>
      </div>

      <div className="border rounded-sm overflow-hidden" style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-xs uppercase tracking-wider border-b" style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border-subtle)' }}>
              <th className="font-semibold py-2 px-3 w-16">Sev</th>
              <th className="font-semibold py-2 px-3">Title</th>
              <th className="font-semibold py-2 px-3 w-32">Service</th>
              <th className="font-semibold py-2 px-3 w-20">Time</th>
              <th className="font-semibold py-2 px-3 w-32">Assignee</th>
              <th className="font-semibold py-2 px-3 w-24">Status</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((inc, i) => (
              <tr 
                key={i} 
                className="group border-b last:border-0 hover:bg-[var(--color-bg-subtle)] transition-colors cursor-pointer"
                style={{ 
                  borderColor: 'var(--color-border-subtle)',
                  borderLeft: inc.status === 'FIRING' && inc.sev === 'P1' ? '2px solid var(--color-p1)' : '2px solid transparent'
                }}
              >
                <td className="py-1 px-3 h-9">
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-sm font-mono inline-block text-center min-w-[28px]" 
                    style={{ 
                      backgroundColor: `var(--color-${inc.sev.toLowerCase()}-bg)`, 
                      color: `var(--color-${inc.sev.toLowerCase()})` 
                    }}>
                    {inc.sev}
                  </span>
                </td>
                <td className="py-1 px-3 text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: 'var(--color-text-primary)' }}>{inc.title}</td>
                <td className="py-1 px-3 text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{inc.service}</td>
                <td className="py-1 px-3 text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{inc.time}</td>
                <td className="py-1 px-3 text-xs flex items-center gap-2 h-9" style={{ color: 'var(--color-text-primary)' }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: 'var(--color-border-default)', color: 'var(--color-text-primary)' }}>
                    {inc.assignee.charAt(0)}
                  </div>
                  {inc.assignee}
                </td>
                <td className="py-1 px-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ 
                    color: inc.status === 'FIRING' ? 'var(--color-firing)' : 
                           inc.status === 'ACKED' ? 'var(--color-acked)' : 
                           'var(--color-resolved)' 
                  }}>
                    {inc.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {incidents.length === 0 && (
          <div className="py-12 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            No incidents found matching current filters.
          </div>
        )}
      </div>
    </div>
  );
}
