import { useNavigate } from "react-router-dom";
import { Shield, ArrowRight } from "lucide-react";
import { useState } from "react";

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate auth & validation
    navigate('/dashboard');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Form Side */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 10%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', cursor: 'pointer', width: 'max-content' }} onClick={() => navigate('/')}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={20} color="white" />
          </div>
          <h2 style={{ fontSize: '24px', margin: 0, fontWeight: 700 }}>OnCall Maestro</h2>
        </div>
        
        <div className="fade-in">
          <h1 style={{ fontSize: '42px', marginBottom: '12px', fontWeight: 800 }}>{isLogin ? 'Welcome back' : 'Create an account'}</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '40px', fontSize: '18px' }}>
            {isLogin ? 'Enter your credentials to access your dashboard.' : 'Sign up to start managing your on-call schedules.'}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '440px' }}>
            {!isLogin && (
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Full Name</label>
                <input type="text" required style={{ width: '100%', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none', fontSize: '16px' }} placeholder="John Doe" />
              </div>
            )}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Email</label>
              <input type="email" required style={{ width: '100%', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none', fontSize: '16px' }} placeholder="you@company.com" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Password</label>
              <input type="password" required style={{ width: '100%', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none', fontSize: '16px' }} placeholder="••••••••" />
            </div>
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '12px', padding: '14px', fontSize: '16px' }}>
              {isLogin ? 'Sign In' : 'Sign Up'} <ArrowRight size={18} />
            </button>
          </form>

          <p style={{ marginTop: '32px', color: 'var(--text-secondary)', fontSize: '15px' }}>
            {isLogin ? 'Don\'t have an account?' : 'Already have an account?'}
            <button onClick={() => setIsLogin(!isLogin)} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: 600, marginLeft: '8px', cursor: 'pointer', fontSize: '15px' }}>
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>

      {/* Graphic Side */}
      <div style={{ flex: 1, background: 'var(--bg-card)', borderLeft: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', position: 'relative', overflow: 'hidden' }}>
        {/* Glow effect */}
        <div style={{ position: 'absolute', width: '600px', height: '600px', background: 'var(--accent-primary)', opacity: 0.1, filter: 'blur(100px)', borderRadius: '50%', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}></div>
        
        <div style={{ maxWidth: '480px', textAlign: 'center', position: 'relative', zIndex: 1 }} className="fade-in">
          <div style={{ width: '100%', height: '320px', background: 'var(--bg-primary)', borderRadius: '24px', border: '1px solid var(--border)', marginBottom: '40px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-lg)' }}>
             <Shield size={120} color="var(--accent-primary)" opacity={0.6} />
          </div>
          <h3 style={{ fontSize: '32px', marginBottom: '20px', fontWeight: 700 }}>Master Your Rotations</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '18px', lineHeight: '1.6' }}>
            Reduce alert fatigue by 90% with AI-powered intelligent routing, voice handovers, and targeted escalation flows.
          </p>
        </div>
      </div>
    </div>
  );
}
