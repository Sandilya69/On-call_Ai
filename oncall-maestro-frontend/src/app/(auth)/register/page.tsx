'use client';

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, Eye, EyeOff, Plus } from "lucide-react";
// import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    mobile: "",
    timezone: "UTC",
    skills: [] as string[]
  });
  const [newSkill, setNewSkill] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleOAuth = async (provider: 'google' | 'github' | 'apple') => {
    console.log(`signInWithOAuth: ${provider}`);
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData({ ...formData, skills: [...formData.skills, newSkill.trim()] });
      setNewSkill("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match"); return;
    }
    setLoading(true);
    // Supabase auth registration integration
    setTimeout(() => {
      setLoading(false);
      router.push('/dashboard');
    }, 1500);
  };

  return (
    <div className="relative min-h-screen w-full overflow-y-auto py-12">
      {/* 🎬 Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-0"
      >
        <source src="/videos/space.mp4" type="video/mp4" />
      </video>

      {/* 🌑 Overlay for readability */}
      <div className="fixed inset-0 bg-black/40 z-0"></div>

      {/* 🧊 Glass Register Card */}
      <div className="relative z-10 flex items-center justify-center min-h-full">
        <div className="glass-card w-[520px] p-8 mt-12 text-center flex flex-col items-center">
          
          <div className="w-10 h-10 mb-3 flex items-center justify-center rounded-xl bg-white/10 border border-white/20 backdrop-blur-md cursor-pointer hover:bg-white/20 transition-colors" onClick={() => router.push('/')}>
            <Shield size={20} className="text-white" />
          </div>

          <h1 className="text-2xl font-semibold mb-1 text-white text-center">
            OnCall Maestro
          </h1>
          <p className="text-sm font-medium text-white/70 mb-6">
            Create your account
          </p>

          {/* OAuth Buttons */}
          <div className="grid grid-cols-3 gap-2 w-full mb-6">
            <button type="button" onClick={() => handleOAuth('google')} className="flex items-center justify-center gap-2 p-2.5 bg-white/10 hover:bg-white/20 transition-colors border border-white/20 rounded-lg text-white text-xs font-medium" title="Google">
               <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
               Google
            </button>
            <button type="button" onClick={() => handleOAuth('apple')} className="flex items-center justify-center gap-2 p-2.5 bg-white/10 hover:bg-white/20 transition-colors border border-white/20 rounded-lg text-white text-xs font-medium" title="Apple">
              <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.67-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.56-1.701z" />
              </svg> Apple
            </button>
            <button type="button" onClick={() => handleOAuth('github')} className="flex items-center justify-center gap-2 p-2.5 bg-white/10 hover:bg-white/20 transition-colors border border-white/20 rounded-lg text-white text-xs font-medium" title="GitHub">
              <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
              </svg> GitHub
            </button>
          </div>

          <div className="flex items-center w-full mb-6 text-white/50">
            <div className="flex-1 h-px bg-white/20"></div>
            <span className="px-4 text-xs font-semibold uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-white/20"></div>
          </div>

          <form onSubmit={handleSubmit} className="w-full flex flex-col text-left gap-4">
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="Full Name" required className="input" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} />
              <input type="text" placeholder="Username" required className="input" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} />
            </div>

            <input type="email" placeholder="Work Email" required className="input" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />

            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <input type={showPassword ? "text" : "password"} placeholder="Password" required className="input w-full" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-white/50 hover:text-white" tabIndex={-1}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <input type={showPassword ? "text" : "password"} placeholder="Confirm Password" required className="input" value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} />
            </div>

            <div className="h-px bg-white/10 my-2"></div>

            <div className="grid grid-cols-2 gap-4">
              <input type="tel" placeholder="Mobile Number" className="input" value={formData.mobile} onChange={(e) => setFormData({...formData, mobile: e.target.value})} />
              <select className="input appearance-none text-white/90" value={formData.timezone} onChange={(e) => setFormData({...formData, timezone: e.target.value})}>
                <option value="UTC" className="bg-zinc-800 text-white">UTC</option>
                <option value="EST" className="bg-zinc-800 text-white">EST</option>
                <option value="IST" className="bg-zinc-800 text-white">IST</option>
              </select>
            </div>

            {/* Skill Tags */}
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Skill Tags (e.g. postgres)" 
                className="input flex-1" 
                value={newSkill} 
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
              />
              <button type="button" onClick={handleAddSkill} className="bg-white/10 border border-white/20 px-3 rounded-lg text-white hover:bg-white/20 flex items-center justify-center">
                <Plus size={18} />
              </button>
            </div>
            
            {formData.skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-[-4px]">
                {formData.skills.map((s, i) => (
                  <span key={i} className="bg-white/20 border border-white/30 text-white px-2 py-1 text-xs rounded-md shadow-sm flex items-center gap-1 font-mono">
                    {s} <button type="button" className="opacity-60 hover:opacity-100" onClick={() => setFormData({...formData, skills: formData.skills.filter(sk => sk !== s)})}>×</button>
                  </span>
                ))}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary mt-4 w-full flex items-center justify-center disabled:opacity-70">
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-2 text-sm text-center">
            <p className="text-white/70">
              Already have an account?{' '}
              <Link href="/login" className="text-white font-medium hover:underline">
                Sign in →
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
