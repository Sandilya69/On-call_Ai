import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { Shield, Activity, Users, Calendar, Clock, FileText, CreditCard, Bell } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import Incidents from "./pages/Incidents";
import RotaView from "./pages/RotaView";
import Handovers from "./pages/Handovers";
import Analytics from "./pages/Analytics";
import "./index.css";

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-icon">🛡️</div>
            <h1>OnCall Maestro</h1>
          </div>
          <nav className="sidebar-nav">
            <div className="nav-section-label">Overview</div>
            <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <Activity className="nav-icon" size={20} /> Dashboard
            </NavLink>
            <NavLink to="/incidents" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <Bell className="nav-icon" size={20} /> Incidents
            </NavLink>

            <div className="nav-section-label">Scheduling</div>
            <NavLink to="/rota" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <Calendar className="nav-icon" size={20} /> Rota Calendar
            </NavLink>
            <NavLink to="/handovers" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <Clock className="nav-icon" size={20} /> Handovers
            </NavLink>

            <div className="nav-section-label">Insights</div>
            <NavLink to="/analytics" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <FileText className="nav-icon" size={20} /> Analytics
            </NavLink>
          </nav>

          <div style={{ padding: "16px 12px", borderTop: "1px solid var(--border)" }}>
            <div className="nav-link" style={{ cursor: "default", opacity: 0.6 }}>
              <Shield className="nav-icon" size={20} />
              <span style={{ fontSize: "12px" }}>v1.0.0 · Pro Plan</span>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/incidents" element={<Incidents />} />
            <Route path="/rota" element={<RotaView />} />
            <Route path="/handovers" element={<Handovers />} />
            <Route path="/analytics" element={<Analytics />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
