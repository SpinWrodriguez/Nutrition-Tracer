import { useState } from 'react';
import { T, NF, inp } from '../constants.js';

export function LoginScreen({ signIn, signUp }) {
  const [mode,     setMode]     = useState('signin'); // 'signin' | 'signup'
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);
    const fn  = mode === 'signin' ? signIn : signUp;
    const err = await fn(email.trim(), password);
    if (err) setError(err.message || 'Something went wrong. Please try again.');
    setLoading(false);
  };

  const switchMode = () => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError(null); };

  return (
    <div style={{ minHeight:'100svh', background:T.bg, display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', padding:24, fontFamily:'ui-sans-serif,system-ui,sans-serif' }}>
      <div style={{ width:'100%', maxWidth:360 }}>

        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ ...NF, fontSize:36, fontWeight:700, color:T.accent, lineHeight:1 }}>NUTRITION</div>
          <div style={{ ...NF, fontSize:36, fontWeight:700, color:T.gold,   lineHeight:1 }}>TRACER</div>
          <div style={{ fontSize:13, color:T.muted, marginTop:10 }}>Track your meals. Hit your goals.</div>
        </div>

        <div style={{ background:T.surface, borderRadius:24, padding:'28px 24px',
          boxShadow:'0 4px 24px rgba(0,0,0,0.08)' }}>

          <div style={{ ...NF, fontSize:11, letterSpacing:1.5, color:T.gold, fontWeight:700, marginBottom:20 }}>
            {mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
          </div>

          <form onSubmit={handleSubmit}>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Email" required autoFocus
              style={{ ...inp, width:'100%', boxSizing:'border-box', marginBottom:10 }}
            />
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'Choose a password' : 'Password'} required
              style={{ ...inp, width:'100%', boxSizing:'border-box', marginBottom:12 }}
            />
            {error && <div style={{ fontSize:12, color:T.over, marginBottom:12 }}>{error}</div>}
            <button type="submit" disabled={loading}
              style={{ width:'100%', padding:'14px', borderRadius:14, border:'none',
                background: loading ? T.border : T.accent, color:'#fff',
                fontSize:15, fontWeight:600, cursor: loading ? 'default' : 'pointer' }}>
              {loading ? '…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div style={{ textAlign:'center', marginTop:16 }}>
            <button onClick={switchMode}
              style={{ background:'none', border:'none', cursor:'pointer',
                fontSize:13, color:T.muted }}>
              {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>

        <div style={{ textAlign:'center', marginTop:24, fontSize:11, color:T.faint, lineHeight:1.6 }}>
          Your data is stored securely in the cloud<br />and syncs across all your devices.
        </div>
      </div>
    </div>
  );
}
