'use client';

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` }
    });
    if (error) console.error("Google OAuth error:", error.message);
  };

  const loginWithGithub = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/dashboard` }
    });
    if (error) console.error("GitHub OAuth error:", error.message);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: identifier,
      password: password,
    });

    setLoading(false);

    if (error) {
      alert(`Login failed: ${error.message}`);
    } else if (data.session) {
      router.push('/dashboard');
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* 🎬 Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/videos/space.mp4" type="video/mp4" />
      </video>

      {/* 🌑 Overlay for readability */}
      <div className="absolute inset-0 bg-black/30"></div>

      {/* 🧊 Glass Login Card */}
      <div className="relative z-10 flex items-center justify-center h-full">
        <div className="glass-card w-[420px] p-8 text-center flex flex-col items-center">
          
          <div className="w-10 h-10 mb-3 flex items-center justify-center rounded-xl bg-white/10 border border-white/20 backdrop-blur-md cursor-pointer hover:bg-white/20 transition-colors" onClick={() => router.push('/')}>
            <Shield size={20} className="text-white" />
          </div>

          <h1 className="text-2xl font-semibold mb-1 text-white text-center">
            OnCall Maestro
          </h1>
          <p className="text-sm font-medium text-white/70 mb-6">
            Sign in to your workspace
          </p>

          {/* OAuth Buttons */}
          <div className="flex flex-col gap-3 w-full mb-6">
            <button type="button" onClick={loginWithGoogle} className="flex items-center justify-center gap-3 w-full py-2.5 bg-white/10 hover:bg-white/20 transition-colors border border-white/20 rounded-lg text-white text-sm font-medium">
              <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
            <button type="button" onClick={loginWithGithub} className="flex items-center justify-center gap-3 w-full py-2.5 bg-white/10 hover:bg-white/20 transition-colors border border-white/20 rounded-lg text-white text-sm font-medium">
              <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
              </svg>
              Continue with GitHub
            </button>
          </div>

          <div className="flex items-center w-full mb-6 text-white/50">
            <div className="flex-1 h-px bg-white/20"></div>
            <span className="px-4 text-xs font-semibold uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-white/20"></div>
          </div>

          <form onSubmit={handleSubmit} className="w-full flex flex-col text-left">
            <div className="mb-4">
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Email / Username"
                className="input"
                required
              />
            </div>

            <div className="relative mb-6">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="input w-full"
                required
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-3 top-2.5 text-white/50 hover:text-white transition-colors"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center disabled:opacity-70">
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-2 text-sm text-center">
            <button type="button" className="text-white/70 hover:text-white transition-colors cursor-pointer text-sm">
              Forgot password?
            </button>
            <p className="text-white/70">
              Don't have an account?{' '}
              <Link href="/register" className="text-white font-medium hover:underline">
                Register →
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
