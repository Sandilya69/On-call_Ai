import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const mockShifts = [
  { date: "2026-03-23", engineer: "Alice Chen", type: "primary", time: "08:00–16:00" },
  { date: "2026-03-23", engineer: "Bob Kumar", type: "primary", time: "16:00–00:00" },
  { date: "2026-03-24", engineer: "Charlie Patel", type: "primary", time: "00:00–08:00" },
  { date: "2026-03-24", engineer: "Alice Chen", type: "primary", time: "08:00–16:00" },
  { date: "2026-03-24", engineer: "Diana Reyes", type: "primary", time: "16:00–00:00" },
  { date: "2026-03-25", engineer: "Bob Kumar", type: "primary", time: "00:00–08:00" },
  { date: "2026-03-25", engineer: "Charlie Patel", type: "primary", time: "08:00–16:00" },
  { date: "2026-03-25", engineer: "Alice Chen", type: "primary", time: "16:00–00:00" },
  { date: "2026-03-26", engineer: "Diana Reyes", type: "primary", time: "00:00–08:00" },
  { date: "2026-03-26", engineer: "Bob Kumar", type: "primary", time: "08:00–16:00" },
  { date: "2026-03-26", engineer: "Charlie Patel", type: "primary", time: "16:00–00:00" },
  { date: "2026-03-27", engineer: "Alice Chen", type: "primary", time: "00:00–08:00" },
  { date: "2026-03-27", engineer: "Diana Reyes", type: "primary", time: "08:00–16:00" },
  { date: "2026-03-27", engineer: "Bob Kumar", type: "primary", time: "16:00–00:00" },
  { date: "2026-03-28", engineer: "Charlie Patel", type: "primary", time: "00:00–08:00" },
  { date: "2026-03-28", engineer: "Alice Chen", type: "primary", time: "08:00–16:00" },
  { date: "2026-03-29", engineer: "Diana Reyes", type: "primary", time: "08:00–16:00" },
];

const COLORS: Record<string, string> = {
  "Alice Chen": "#6366f1",
  "Bob Kumar": "#06b6d4",
  "Charlie Patel": "#f59e0b",
  "Diana Reyes": "#22c55e",
};

export default function RotaView() {
  const [weekOffset, setWeekOffset] = useState(0);

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7);

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const formatDate = (d: Date) => d.toISOString().split("T")[0];
  const formatDisplay = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2>Rota Calendar</h2>
          <p>Weekly on-call schedule for your team</p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button className="btn btn-ghost" onClick={() => setWeekOffset(weekOffset - 1)} style={{ padding: "8px" }}>
            <ChevronLeft size={20} />
          </button>
          <button className="btn btn-ghost" onClick={() => setWeekOffset(0)} style={{ fontSize: "13px", padding: "8px 14px" }}>
            Today
          </button>
          <button className="btn btn-ghost" onClick={() => setWeekOffset(weekOffset + 1)} style={{ padding: "8px" }}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
        {Object.entries(COLORS).map(([name, color]) => (
          <div key={name} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
            <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: color }} />
            <span style={{ color: "var(--text-secondary)" }}>{name}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="card" style={{ padding: "16px" }}>
        <div className="rota-calendar">
          {weekDates.map((date, i) => {
            const dateStr = formatDate(date);
            const dayShifts = mockShifts.filter((s) => s.date === dateStr);
            const isToday = formatDate(new Date()) === dateStr;

            return (
              <div
                key={i}
                className="rota-day"
                style={{
                  border: isToday ? "1px solid var(--accent-primary)" : "1px solid transparent",
                  background: isToday ? "rgba(99, 102, 241, 0.05)" : undefined,
                }}
              >
                <div className="rota-day-header">{DAYS[i]}</div>
                <div className="rota-day-date">{date.getDate()}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "8px" }}>
                  {formatDisplay(date)}
                </div>
                {dayShifts.map((shift, j) => (
                  <div
                    key={j}
                    className="rota-shift"
                    style={{
                      borderLeftColor: COLORS[shift.engineer] || "var(--accent-primary)",
                      background: `${COLORS[shift.engineer] || "var(--accent-primary)"}15`,
                    }}
                  >
                    <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "11px" }}>
                      {shift.engineer.split(" ")[0]}
                    </div>
                    <div style={{ color: "var(--text-muted)", fontSize: "10px" }}>{shift.time}</div>
                  </div>
                ))}
                {dayShifts.length === 0 && (
                  <div style={{ color: "var(--text-muted)", fontSize: "11px", fontStyle: "italic", marginTop: "8px" }}>
                    No shifts
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Shifts List */}
      <div className="card" style={{ marginTop: "24px" }}>
        <div className="card-header">
          <h3>This Week's Shifts</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Engineer</th>
              <th>Shift</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {mockShifts.slice(0, 10).map((shift, i) => (
              <tr key={i}>
                <td style={{ fontSize: "13px" }}>{shift.date}</td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{
                      width: "8px", height: "8px", borderRadius: "50%",
                      background: COLORS[shift.engineer] || "#6366f1",
                    }} />
                    <span style={{ fontWeight: 500 }}>{shift.engineer}</span>
                  </div>
                </td>
                <td style={{ color: "var(--text-secondary)", fontSize: "13px" }}>{shift.time}</td>
                <td><span className="badge badge-p3" style={{ textTransform: "capitalize" }}>{shift.type}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
