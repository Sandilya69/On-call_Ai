import { useState } from "react";
import { Search, Filter, CheckCircle, XCircle } from "lucide-react";

const mockIncidents = [
  { id: "inc-001", title: "API Gateway 503 errors spike", severity: "P1", service: "api-gateway", status: "open", assignee: "Alice Chen", createdAt: "2026-03-23T17:15:00Z", mttr: null },
  { id: "inc-002", title: "High CPU on worker-03 (95%)", severity: "P2", service: "worker-pool", status: "acknowledged", assignee: "Bob Kumar", createdAt: "2026-03-23T17:00:00Z", mttr: null },
  { id: "inc-003", title: "Slow queries on users-db > 5s", severity: "P3", service: "postgres", status: "open", assignee: null, createdAt: "2026-03-23T16:45:00Z", mttr: null },
  { id: "inc-004", title: "TLS certificate expiring in 7 days", severity: "P4", service: "nginx", status: "open", assignee: null, createdAt: "2026-03-23T16:30:00Z", mttr: null },
  { id: "inc-005", title: "Redis memory utilization at 85%", severity: "P2", service: "redis", status: "resolved", assignee: "Charlie Patel", createdAt: "2026-03-23T15:00:00Z", mttr: 18 },
  { id: "inc-006", title: "Payment service timeout errors", severity: "P1", service: "payment-svc", status: "resolved", assignee: "Alice Chen", createdAt: "2026-03-23T12:00:00Z", mttr: 12 },
  { id: "inc-007", title: "Kafka consumer lag on events topic", severity: "P3", service: "kafka", status: "resolved", assignee: "Bob Kumar", createdAt: "2026-03-23T10:00:00Z", mttr: 45 },
  { id: "inc-008", title: "Disk usage at 92% on logs-01", severity: "P2", service: "elasticsearch", status: "resolved", assignee: "Diana Reyes", createdAt: "2026-03-22T22:00:00Z", mttr: 8 },
];

export default function Incidents() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = mockIncidents.filter((inc) => {
    if (filter !== "all" && inc.status !== filter) return false;
    if (search && !inc.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>Incidents</h2>
        <p>Manage and track all incidents across your services</p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: "400px" }}>
          <Search size={18} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search incidents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%", padding: "10px 12px 10px 40px", background: "var(--bg-card)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)", color: "var(--text-primary)", fontSize: "14px", fontFamily: "var(--font-family)",
              outline: "none",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {["all", "open", "acknowledged", "resolved"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`btn ${filter === f ? "btn-primary" : "btn-ghost"}`}
              style={{ fontSize: "13px", padding: "8px 16px", textTransform: "capitalize" }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Incidents Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Severity</th>
              <th>Title</th>
              <th>Service</th>
              <th>Assignee</th>
              <th>Status</th>
              <th>Created</th>
              <th>MTTR</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((inc) => (
              <tr key={inc.id} style={{ cursor: "pointer" }}>
                <td><span className={`badge badge-${inc.severity.toLowerCase()}`}>{inc.severity}</span></td>
                <td>
                  <div style={{ fontWeight: 500 }}>{inc.title}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{inc.id}</div>
                </td>
                <td style={{ color: "var(--text-secondary)", fontSize: "13px" }}>{inc.service}</td>
                <td style={{ color: inc.assignee ? "var(--text-primary)" : "var(--text-muted)", fontSize: "13px" }}>
                  {inc.assignee || "Unassigned"}
                </td>
                <td><span className={`badge badge-${inc.status}`}>{inc.status}</span></td>
                <td style={{ color: "var(--text-muted)", fontSize: "13px", whiteSpace: "nowrap" }}>{formatTime(inc.createdAt)}</td>
                <td style={{ color: inc.mttr ? "var(--text-secondary)" : "var(--text-muted)", fontSize: "13px" }}>
                  {inc.mttr ? `${inc.mttr} min` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px", color: "var(--text-muted)" }}>
            <CheckCircle size={40} style={{ marginBottom: "12px", opacity: 0.4 }} />
            <p>No incidents match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
