import { useState } from 'react';
import { Mail } from 'lucide-react';
import { T, NF, inp } from '../constants.js';

export function LoginScreen({ signIn }) {
  const [email,   setEmail]   = useState('');
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const err = await signIn(email.trim());
    if (err) { setError(err.message); setLoading(false); }
    else { setSent(true); setLoading(false); }
  };

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
          {sent ? (
            <div style={{ textAlign:'center', padding:'8px 0' }}>
              <div style={{ fontSize:48, marginBottom:16 }}>📬</div>
              <div style={{ ...NF, fontSize:20, fontWeight:700, color:T.ink, marginBottom:10 }}>
                Check your email
              </div>
              <div style={{ fontSize:13, color:T.muted, lineHeight:1.6 }}>
                Magic link sent to <b style={{ color:T.ink }}>{email}</b>.
                <br />Tap it to sign in — no password needed.
              </div>
              <button onClick={() => setSent(false)}
                style={{ marginTop:20, background:'none', border:'none', color:T.muted,
                  fontSize:12, cursor:'pointer', textDecoration:'underline' }}>
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ ...NF, fontSize:11, letterSpacing:1.5, color:T.gold, fontWeight:700, marginBottom:14 }}>
                SIGN IN
              </div>
              <div style={{ fontSize:13, color:T.muted, marginBottom:20, lineHeight:1.5 }}>
                Enter your email and we'll send a magic link — no password required.
              </div>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com" required autoFocus
                style={{ ...inp, width:'100%', marginBottom:12 }}
              />
              {error && (
                <div style={{ fontSize:12, color:T.over, marginBottom:12 }}>{error}</div>
              )}
              <button type="submit" disabled={loading}
                style={{ width:'100%', padding:'14px', borderRadius:14, border:'none',
                  background: loading ? T.border : T.accent, color:'#fff',
                  fontSize:15, fontWeight:600, cursor: loading ? 'default' : 'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                <Mail size={16} />
                {loading ? 'Sending…' : 'Send magic link'}
              </button>
            </form>
          )}
        </div>

        <div style={{ textAlign:'center', marginTop:24, fontSize:11, color:T.faint, lineHeight:1.6 }}>
          Your data is stored securely in the cloud<br />and syncs across all your devices.
        </div>
      </div>
    </div>
  );
}
