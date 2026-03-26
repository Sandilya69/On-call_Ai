import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '40px', background: 'var(--bg-primary)' }}>
      <div style={{ textAlign: 'center', maxWidth: '800px', animation: 'fadeIn 0.6s ease-out' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '96px', height: '96px', borderRadius: '24px', background: 'var(--accent-gradient)', marginBottom: '32px', boxShadow: 'var(--shadow-glow)' }}>
          <Shield size={48} color="white" />
        </div>
        <h1 style={{ fontSize: '72px', fontWeight: '800', marginBottom: '24px', lineHeight: '1.2', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          OnCall Maestro
        </h1>
        <p style={{ fontSize: '24px', color: 'var(--text-secondary)', marginBottom: '48px', lineHeight: '1.6' }}>
          AI-Powered On-Call Scheduler, Escalation Bot & Voice Handover Platform.
        </p>
        <button 
          className="btn btn-primary" 
          style={{ fontSize: '18px', padding: '16px 42px', borderRadius: '30px', fontWeight: '600' }}
          onClick={() => navigate('/auth')}
        >
          Get Started
        </button>
      </div>

      <div style={{ display: 'flex', gap: '40px', marginTop: '100px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { title: "Intelligent Routing", desc: "AI directs alerts to the exact right engineer, reducing noise." },
          { title: "Voice Handovers", desc: "Automated, spoken briefings at the end of every shift." },
          { title: "Smart Scheduling", desc: "Timezone-aware rotas with conflict-free scheduling rules." }
        ].map((feature, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', padding: '32px', borderRadius: '16px', maxWidth: '300px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '20px', marginBottom: '12px' }}>{feature.title}</h3>
            <p style={{ color: 'var(--text-secondary)' }}>{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
