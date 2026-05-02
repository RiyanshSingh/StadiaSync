import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import './AuthView.css';


export default function AuthView() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setSuccessMsg('Account created! Please check your email for verification.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="auth-container"
      >
        <div className="auth-header">
          <div className="auth-brand">
             <span>Stadia</span><span className="text-accent-primary">Sync</span>
          </div>
          <h3>Welcome Back.</h3>
          <p>{isSignUp ? 'Create your profile to link tickets' : 'Sign in to access your dashboard'}</p>
        </div>

        <form onSubmit={handleAuth} className="auth-form">
          <div className="input-group">
            <label className="input-label">EMAIL</label>
            <input 
              type="email" 
              placeholder="you@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">PASSWORD</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {!isSignUp && (
            <div className="forgot-link">
              <a href="#">FORGOT PASSWORD?</a>
            </div>
          )}

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="auth-error">
                {error}
              </motion.div>
            )}
            {successMsg && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="auth-error" style={{ background: 'rgba(52,199,89,0.12)', color: 'var(--accent-success)', borderColor: 'var(--accent-success)' }}>
                {successMsg}
              </motion.div>
            )}
          </AnimatePresence>

          <button type="submit" className="primary-auth-btn" disabled={loading}>
            {loading ? 'Processing...' : isSignUp ? 'Join Now' : 'Log In'}
          </button>
        </form>

        {/* Social Login */}
        <div className="social-auth-section">
          <button className="social-btn google" onClick={handleGoogleSignIn} disabled={loading}>
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09c1.98 3.93 6.01 6.62 10.71 6.62z"/>
              <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.08 15.24 0 12 0 7.3 0 3.27 2.69 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/>
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>
        <div className="auth-footer">
          <p>
            {isSignUp ? 'Already have an account?' : "Don't have a profile?"}
            <button onClick={() => setIsSignUp(!isSignUp)} className="switch-btn">
              {isSignUp ? 'Sign In' : 'Join Now'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
