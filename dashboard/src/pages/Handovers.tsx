import { useState } from "react";
import { PlayCircle, FileText, CheckCircle, Clock } from "lucide-react";

const mockHandovers = [
  { id: "ho-001", team: "Platform Team", shiftDate: "2026-03-23 08:00", outgoing: "Charlie Patel", incoming: "Alice Chen", openIncidents: 2, resolvedIncidents: 5, status: "delivered", hasAudio: true, createdAt: "2026-03-23T08:05:00Z" },
  { id: "ho-002", team: "Platform Team", shiftDate: "2026-03-22 16:00", outgoing: "Bob Kumar", incoming: "Charlie Patel", openIncidents: 0, resolvedIncidents: 1, status: "delivered", hasAudio: true, createdAt: "2026-03-22T16:05:00Z" },
  { id: "ho-003", team: "Platform Team", shiftDate: "2026-03-22 08:00", outgoing: "Alice Chen", incoming: "Bob Kumar", openIncidents: 3, resolvedIncidents: 2, status: "delivered", hasAudio: true, createdAt: "2026-03-22T08:02:00Z" },
  { id: "ho-004", team: "Platform Team", shiftDate: "2026-03-21 16:00", outgoing: "Diana Reyes", incoming: "Alice Chen", openIncidents: 1, resolvedIncidents: 4, status: "delivered", hasAudio: false, createdAt: "2026-03-21T16:01:00Z" },
  { id: "ho-005", team: "API Services", shiftDate: "2026-03-23 09:00", outgoing: "Eve Carter", incoming: "Frank Doe", openIncidents: 0, resolvedIncidents: 0, status: "pending", hasAudio: false, createdAt: "2026-03-23T09:00:00Z" },
];

export default function Handovers() {
  const [selected, setSelected] = useState(mockHandovers[0]);

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>Shift Handovers</h2>
        <p>AI-generated briefings for smooth on-call transitions</p>
      </div>

      <div className="grid-2">
        {/* Handovers List */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="card-header" style={{ padding: "20px 24px" }}>
            <h3 style={{ margin: 0 }}>Recent Briefings</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Team</th>
                <th>Transition</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {mockHandovers.map((ho) => (
                <tr
                  key={ho.id}
                  onClick={() => setSelected(ho)}
                  style={{
                    cursor: "pointer",
                    background: selected?.id === ho.id ? "var(--bg-card-hover)" : undefined,
                    borderLeft: selected?.id === ho.id ? "3px solid var(--accent-primary)" : "3px solid transparent",
                  }}
                >
                  <td style={{ fontSize: "13px" }}>{ho.shiftDate}</td>
                  <td style={{ fontWeight: 500 }}>{ho.team}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-secondary)" }}>
                      <span>{ho.outgoing.split(" ")[0]}</span>
                      <span>→</span>
                      <span>{ho.incoming.split(" ")[0]}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge-${ho.status === "delivered" ? "resolved" : "p2"}`}>{ho.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Handover Details */}
        {selected ? (
          <div className="card" style={{ position: "sticky", top: "24px" }}>
            <div className="card-header" style={{ borderBottom: "1px solid var(--border)", paddingBottom: "16px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
                <div>
                  <h3 style={{ fontSize: "18px", marginBottom: "4px" }}>{selected.team} Briefing</h3>
                  <div style={{ fontSize: "13px", color: "var(--text-muted)", display: "flex", gap: "12px" }}>
                    <span>{selected.shiftDate}</span>
                    <span>•</span>
                    <span>{formatTime(selected.createdAt)}</span>
                  </div>
                </div>
                <span className={`badge badge-${selected.status === "delivered" ? "resolved" : "p2"}`}>{selected.status}</span>
              </div>
            </div>

            {/* Audio Player (Mock) */}
            {selected.hasAudio ? (
              <div style={{
                background: "rgba(99, 102, 241, 0.1)", border: "1px solid rgba(99, 102, 241, 0.2)",
                padding: "16px", borderRadius: "var(--radius-md)", marginBottom: "24px",
                display: "flex", alignItems: "center", gap: "16px"
              }}>
                <button
                  className="btn btn-primary"
                  style={{ borderRadius: "50%", width: "48px", height: "48px", padding: 0, display: "flex", justifyContent: "center", alignItems: "center" }}
                >
                  <PlayCircle size={24} />
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>AI Voice Briefing</div>
                  <div style={{ height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", position: "relative" }}>
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "35%", background: "var(--accent-primary)", borderRadius: "2px" }} />
                    <div style={{ position: "absolute", left: "35%", top: "-3px", width: "10px", height: "10px", borderRadius: "50%", background: "#fff", boxShadow: "0 0 5px rgba(0,0,0,0.5)" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)", marginTop: "6px" }}>
                    <span>0:14</span>
                    <span>1:02</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{
                background: "var(--bg-card-hover)", padding: "16px", borderRadius: "var(--radius-md)",
                marginBottom: "24px", display: "flex", alignItems: "center", gap: "12px", color: "var(--text-muted)", fontSize: "14px"
              }}>
                <Clock size={20} />
                Audio not generated or still processing.
              </div>
            )}

            {/* Briefing Text */}
            <div style={{ background: "var(--bg-secondary)", padding: "20px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
              <h4 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "var(--text-secondary)", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <FileText size={16} /> Briefing Transcript
              </h4>

              <div style={{ fontSize: "15px", lineHeight: "1.7", color: "var(--text-primary)" }}>
                <p style={{ marginBottom: "16px" }}>
                  Hello {selected.incoming.split(" ")[0]}. This is {selected.outgoing.split(" ")[0]} handing over the {selected.team} shift.
                </p>

                {selected.openIncidents > 0 ? (
                  <p style={{ marginBottom: "16px" }}>
                    There are currently <strong style={{ color: "var(--warning)" }}>{selected.openIncidents} open incidents</strong>. Include a P2 regarding high CPU utilization on the worker pool that we've been tracking for the last two hours. It's acknowledged but not resolved.
                  </p>
                ) : (
                  <p style={{ marginBottom: "16px", color: "var(--success)" }}>
                    <CheckCircle size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                    The queue is totally clear. There are zero open incidents.
                  </p>
                )}

                <p style={{ marginBottom: "16px" }}>
                  During my shift, we resolved {selected.resolvedIncidents} incidents. The most notable was an API Gateway spike that was resolved by scaling up the ingress pods.
                </p>

                <p style={{ marginBottom: "16px" }}>
                  Keep an eye on the <code>users-db</code> service — query latency has been slightly elevated but hasn't breached the critical threshold yet. Have a good shift!
                </p>
              </div>
            </div>

          </div>
        ) : (
          <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", minHeight: "400px" }}>
            Select a handover briefing to view details
          </div>
        )}
      </div>
    </div>
  );
}
