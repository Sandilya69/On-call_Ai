'use client';

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Bell, Calendar, Users, Clock, Settings, Search } from "lucide-react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: Activity },
    { name: "Incidents", href: "/dashboard/incidents", icon: Bell },
    { name: "Rota", href: "/dashboard/rota", icon: Calendar },
    { name: "Engineers", href: "/dashboard/engineers", icon: Users },
    { name: "Handovers", href: "/dashboard/handovers", icon: Clock },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "var(--color-bg-base)", color: "var(--color-text-primary)" }}>
      {/* Sidebar - 220px */}
      <aside 
        className="w-[220px] flex-shrink-0 border-r flex flex-col transition-all" 
        style={{ backgroundColor: "var(--color-bg-surface)", borderColor: "var(--color-border-default)" }}
      >
        <div className="h-12 flex items-center px-4 border-b" style={{ borderColor: "var(--color-border-default)" }}>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-sm flex items-center justify-center font-bold text-xs" style={{ backgroundColor: "var(--color-brand-primary)", color: "var(--color-text-inverse)" }}>M</div>
            <span className="font-semibold text-sm">OnCall Maestro</span>
          </div>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-2 py-1.5 text-[13px] font-medium transition-colors hover:bg-[var(--color-bg-subtle)]"
                style={{
                  borderLeft: isActive ? "2px solid var(--color-brand-primary)" : "2px solid transparent",
                  backgroundColor: isActive ? "var(--color-bg-subtle)" : "transparent",
                  color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)"
                }}
              >
                <item.icon size={14} className="opacity-70" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t flex items-center gap-2" style={{ borderColor: "var(--color-border-default)", backgroundColor: "var(--color-bg-surface)" }}>
          <div className="w-6 h-6 rounded-full flex items-center justify-center font-semibold text-xs" style={{ backgroundColor: "var(--color-brand-primary)", color: "var(--color-text-inverse)" }}>
            PN
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-xs" style={{ color: "var(--color-text-primary)" }}>Priya Nair</span>
            <span style={{ color: "var(--color-text-muted)", fontSize: "10px" }}>Senior SRE</span>
          </div>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header - 48px */}
        <header className="h-12 border-b flex items-center justify-between px-4" style={{ backgroundColor: "var(--color-bg-surface)", borderColor: "var(--color-border-default)" }}>
          <div className="flex items-center gap-2 text-sm font-mono" style={{ color: "var(--color-text-secondary)" }}>
            <span>Maestro Team</span>
            <span style={{ color: "var(--color-text-muted)" }}>/</span>
            <span style={{ color: "var(--color-text-primary)" }}>Overview</span>
          </div>
          
          <div className="flex items-center gap-5">
            <button className="flex items-center gap-2 px-2 py-1 rounded-sm border text-xs font-mono transition-colors hover:opacity-80" style={{ backgroundColor: "var(--color-bg-base)", borderColor: "var(--color-border-default)", color: "var(--color-text-muted)" }}>
              <Search size={12} />
              <span>Search...</span>
              <span className="ml-2 border rounded-sm px-1.5 py-0.5 text-[10px]" style={{ borderColor: "var(--color-border-default)", backgroundColor: "var(--color-bg-surface)" }}>⌘K</span>
            </button>
            <Bell size={16} style={{ color: "var(--color-text-secondary)" }} className="cursor-pointer hover:opacity-80 transition-opacity" />
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8" style={{ backgroundColor: "var(--color-bg-base)" }}>
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
