import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Download, Calendar as CalendarIcon } from "lucide-react";

// Mock Data
const volumeData = [
  { month: "Oct", incidents: 120, escalated: 15 },
  { month: "Nov", incidents: 145, escalated: 12 },
  { month: "Dec", incidents: 132, escalated: 10 },
  { month: "Jan", incidents: 165, escalated: 22 },
  { month: "Feb", incidents: 150, escalated: 18 },
  { month: "Mar", incidents: 110, escalated: 8 },
];

const severityData = [
  { name: "P1 Critical", value: 10, color: "#ef4444" },
  { name: "P2 High", value: 45, color: "#f59e0b" },
  { name: "P3 Medium", value: 120, color: "#3b82f6" },
  { name: "P4 Low", value: 85, color: "#94a3b8" },
];

const serviceData = [
  { name: "api-gateway", value: 85 },
  { name: "postgres-db", value: 62 },
  { name: "worker-pool", value: 48 },
  { name: "redis-cache", value: 25 },
  { name: "payment-svc", value: 15 },
  { name: "auth-svc", value: 10 },
];

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("6m");

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2>Analytics & Reports</h2>
          <p>System reliability and team performance metrics</p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--bg-card)", padding: "4px 8px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
            <CalendarIcon size={16} color="var(--text-muted)" />
            <select
              style={{ background: "transparent", color: "var(--text-primary)", border: "none", outline: "none", fontSize: "14px", cursor: "pointer" }}
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="6m">Last 6 Months</option>
            </select>
          </div>
          <button className="btn btn-ghost" style={{ padding: "8px 16px" }}>
            <Download size={18} /> Export CSV
          </button>
        </div>
      </div>

      <div className="grid-2">
        {/* Incident Volume Trend */}
        <div className="card">
          <div className="card-header">
            <h3>Incident Volume Trend</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={volumeData}>
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: "#1a1f35", border: "1px solid rgba(148,163,184,0.1)", borderRadius: "8px", color: "#f1f5f9" }}
                />
                <Legend iconType="circle" />
                <Line type="monotone" dataKey="incidents" name="Total Incidents" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="escalated" name="Escalated to P2/P1" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Incidents by Severity */}
        <div className="card">
          <div className="card-header">
            <h3>Incidents by Severity</h3>
          </div>
          <div className="chart-container" style={{ display: "flex", justifyContent: "center" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#1a1f35", border: "1px solid rgba(148,163,184,0.1)", borderRadius: "8px", color: "#f1f5f9" }}
                  itemStyle={{ color: "#f1f5f9" }}
                />
                <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Noisy Services */}
        <div className="card">
          <div className="card-header">
            <h3>Top Noisy Services</h3>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>By alert count</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Service Name</th>
                <th>Incident Count</th>
                <th>% of Total</th>
              </tr>
            </thead>
            <tbody>
              {serviceData.map((svc, i) => (
                <tr key={svc.name}>
                  <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{svc.name}</td>
                  <td>{svc.value}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "12px", width: "30px" }}>{Math.round((svc.value / 245) * 100)}%</span>
                      <div style={{ flex: 1, height: "6px", background: "var(--bg-card-hover)", borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(svc.value / 85) * 100}%`, background: "var(--accent-secondary)", borderRadius: "3px" }} />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SLA & MTTR Report */}
        <div className="card">
          <div className="card-header">
            <h3>Response SLA Performance</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ padding: "16px", background: "var(--bg-card-hover)", borderRadius: "var(--radius-md)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>P1 Acknowledgment SLA</span>
                <span style={{ color: "var(--success)", fontWeight: 600 }}>98.5% Met</span>
              </div>
              <div style={{ height: "8px", background: "var(--bg-card)", borderRadius: "4px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: "98.5%", background: "var(--success)", borderRadius: "4px" }} />
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px" }}>Target: &lt; 5 minutes</p>
            </div>

            <div style={{ padding: "16px", background: "var(--bg-card-hover)", borderRadius: "var(--radius-md)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>P2 Acknowledgment SLA</span>
                <span style={{ color: "var(--warning)", fontWeight: 600 }}>82.1% Met</span>
              </div>
              <div style={{ height: "8px", background: "var(--bg-card)", borderRadius: "4px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: "82.1%", background: "var(--warning)", borderRadius: "4px" }} />
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px" }}>Target: &lt; 15 minutes</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "8px" }}>
              <div style={{ padding: "16px", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", textAlign: "center" }}>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Avg Time to Ack</div>
                <div style={{ fontSize: "24px", fontWeight: 700 }}>4m 12s</div>
              </div>
              <div style={{ padding: "16px", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", textAlign: "center" }}>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Avg Time to Resolve</div>
                <div style={{ fontSize: "24px", fontWeight: 700 }}>28m 45s</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
