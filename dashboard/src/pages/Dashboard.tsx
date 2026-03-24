import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { AlertTriangle, CheckCircle, Clock, TrendingUp } from "lucide-react";

// Mock data (replace with API calls once backend is connected)
const mockStats = {
  openIncidents: 3,
  acknowledgedIncidents: 2,
  mttrMinutes: 18,
  escalationRate: 12,
};

const mockAlertVolume = [
  { day: "Mon", P1: 1, P2: 3, P3: 5, P4: 8 },
  { day: "Tue", P1: 0, P2: 2, P3: 7, P4: 6 },
  { day: "Wed", P1: 2, P2: 4, P3: 3, P4: 9 },
  { day: "Thu", P1: 0, P2: 1, P3: 6, P4: 5 },
  { day: "Fri", P1: 1, P2: 3, P3: 4, P4: 7 },
  { day: "Sat", P1: 0, P2: 0, P3: 2, P4: 3 },
  { day: "Sun", P1: 0, P2: 1, P3: 1, P4: 2 },
];

const mockMttrTrend = [
  { week: "W1", mttr: 24 },
  { week: "W2", mttr: 21 },
  { week: "W3", mttr: 19 },
  { week: "W4", mttr: 18 },
  { week: "W5", mttr: 15 },
  { week: "W6", mttr: 18 },
];

const mockRecentIncidents = [
  { id: "inc-001", title: "API Gateway 503 errors", severity: "P1", service: "api-gateway", status: "open", createdAt: "2 min ago" },
  { id: "inc-002", title: "High CPU on worker-03", severity: "P2", service: "worker-pool", status: "acknowledged", createdAt: "15 min ago" },
  { id: "inc-003", title: "Slow queries on users-db", severity: "P3", service: "postgres", status: "open", createdAt: "32 min ago" },
  { id: "inc-004", title: "Certificate expiring in 7d", severity: "P4", service: "nginx", status: "open", createdAt: "1 hr ago" },
  { id: "inc-005", title: "Redis memory at 85%", severity: "P2", service: "redis", status: "resolved", createdAt: "2 hr ago" },
];

export default function Dashboard() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setTimeout(() => setLoaded(true), 100);
  }, []);

  return (
    <div className={loaded ? "fade-in" : ""}>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Real-time overview of your on-call operations</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Open Incidents</div>
          <div className="stat-value" style={{ color: "var(--danger)" }}>{mockStats.openIncidents}</div>
          <div className="stat-change negative">
            <AlertTriangle size={14} /> 1 P1 active
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Acknowledged</div>
          <div className="stat-value" style={{ color: "var(--warning)" }}>{mockStats.acknowledgedIncidents}</div>
          <div className="stat-change positive">
            <CheckCircle size={14} /> All within SLA
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg MTTR</div>
          <div className="stat-value">{mockStats.mttrMinutes}<span style={{ fontSize: "16px", color: "var(--text-secondary)" }}>min</span></div>
          <div className="stat-change positive">
            <TrendingUp size={14} /> -16% vs last week
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Escalation Rate</div>
          <div className="stat-value">{mockStats.escalationRate}<span style={{ fontSize: "16px", color: "var(--text-secondary)" }}>%</span></div>
          <div className="stat-change positive">
            <TrendingUp size={14} /> -3% vs last week
          </div>
        </div>
      </div>

      {/* Charts + Recent Incidents */}
      <div className="grid-2" style={{ marginBottom: "24px" }}>
        <div className="card">
          <div className="card-header">
            <h3>Alert Volume (This Week)</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockAlertVolume} barGap={2}>
                <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: "#1a1f35", border: "1px solid rgba(148,163,184,0.1)", borderRadius: "8px", color: "#f1f5f9" }}
                />
                <Bar dataKey="P1" fill="#ef4444" radius={[3, 3, 0, 0]} />
                <Bar dataKey="P2" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                <Bar dataKey="P3" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="P4" fill="#64748b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>MTTR Trend (Weeks)</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockMttrTrend}>
                <defs>
                  <linearGradient id="mttrGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="week" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} unit="m" />
                <Tooltip
                  contentStyle={{ background: "#1a1f35", border: "1px solid rgba(148,163,184,0.1)", borderRadius: "8px", color: "#f1f5f9" }}
                />
                <Area type="monotone" dataKey="mttr" stroke="#6366f1" fill="url(#mttrGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Incidents Table */}
      <div className="card">
        <div className="card-header">
          <h3>Recent Incidents</h3>
          <button className="btn btn-ghost" style={{ fontSize: "13px", padding: "6px 14px" }}>View All →</button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Severity</th>
              <th>Title</th>
              <th>Service</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {mockRecentIncidents.map((inc) => (
              <tr key={inc.id}>
                <td><span className={`badge badge-${inc.severity.toLowerCase()}`}>{inc.severity}</span></td>
                <td style={{ fontWeight: 500 }}>{inc.title}</td>
                <td style={{ color: "var(--text-secondary)" }}>{inc.service}</td>
                <td><span className={`badge badge-${inc.status}`}>{inc.status}</span></td>
                <td style={{ color: "var(--text-muted)", fontSize: "13px" }}>{inc.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
