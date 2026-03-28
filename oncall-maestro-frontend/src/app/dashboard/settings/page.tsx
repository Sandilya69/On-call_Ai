export default function SettingsPage() {
  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Settings</h1>
      </div>

      <div className="grid grid-cols-4 gap-8">
        <div className="col-span-1 border-r pr-4" style={{ borderColor: 'var(--color-border-subtle)' }}>
          <nav className="flex flex-col gap-1">
            <div className="px-3 py-1.5 text-xs font-medium rounded-sm bg-[var(--color-bg-subtle)]" style={{ color: 'var(--color-text-primary)' }}>General</div>
            <div className="px-3 py-1.5 text-xs font-medium rounded-sm hover:bg-[var(--color-bg-subtle)] cursor-pointer transition-colors" style={{ color: 'var(--color-text-secondary)' }}>Escalation Policies</div>
            <div className="px-3 py-1.5 text-xs font-medium rounded-sm hover:bg-[var(--color-bg-subtle)] cursor-pointer transition-colors" style={{ color: 'var(--color-text-secondary)' }}>Integrations</div>
          </nav>
        </div>

        <div className="col-span-3">
          <div className="max-w-md">
            <h2 className="text-sm font-semibold mb-4 pb-2 border-b uppercase tracking-wider" style={{ color: 'var(--color-text-primary)', borderColor: 'var(--color-border-subtle)' }}>Workspace Settings</h2>
            
            <div className="mb-6">
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Workspace Name</label>
              <input type="text" defaultValue="Maestro Team" className="w-full text-sm px-3 py-1.5 rounded-sm border focus:outline-none focus:ring-1" style={{ backgroundColor: 'var(--color-bg-surface)', borderColor: 'var(--color-border-default)', color: 'var(--color-text-primary)' }} />
            </div>

            <div className="mb-6">
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Default Timezone</label>
              <select className="w-full text-sm px-3 py-1.5 rounded-sm border focus:outline-none focus:ring-1" style={{ backgroundColor: 'var(--color-bg-surface)', borderColor: 'var(--color-border-default)', color: 'var(--color-text-primary)' }}>
                <option>UTC (Coordinated Universal Time)</option>
                <option>EST (Eastern Standard Time)</option>
                <option>IST (Indian Standard Time)</option>
              </select>
            </div>

            <button className="px-4 py-2 text-xs font-semibold rounded-sm hover:opacity-90 transition-opacity" style={{ backgroundColor: 'var(--color-brand-primary)', color: 'var(--color-text-inverse)' }}>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
