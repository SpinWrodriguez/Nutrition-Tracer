import { useState } from 'react';
import { Mail, ArrowLeft } from 'lucide-react';
import { T, NF, inp } from '../constants.js';

export function LoginScreen({ signIn, verifyOtp }) {
  const [email,   setEmail]   = useState('');
  const [code,    setCode]    = useState('');
  const [step,    setStep]    = useState('email'); // 'email' | 'code'
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const err = await signIn(email.trim());
    if (err) { setError(err.message); }
    else { setStep('code'); }
    setLoading(false);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setLoading(true);
    setError(null);
    const err = await verifyOtp(email.trim(), code.trim());
    if (err) { setError('Invalid or expired code. Try again.'); setCode(''); }
    setLoading(false);
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

          {step === 'email' ? (
            <form onSubmit={handleSend}>
              <div style={{ ...NF, fontSize:11, letterSpacing:1.5, color:T.gold, fontWeight:700, marginBottom:14 }}>
                SIGN IN
              </div>
              <div style={{ fontSize:13, color:T.muted, marginBottom:20, lineHeight:1.5 }}>
                Enter your email and we'll send a 6-digit code.
              </div>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com" required autoFocus
                style={{ ...inp, width:'100%', boxSizing:'border-box', marginBottom:12 }}
              />
              {error && <div style={{ fontSize:12, color:T.over, marginBottom:12 }}>{error}</div>}
              <button type="submit" disabled={loading}
                style={{ width:'100%', padding:'14px', borderRadius:14, border:'none',
                  background: loading ? T.border : T.accent, color:'#fff',
                  fontSize:15, fontWeight:600, cursor: loading ? 'default' : 'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                <Mail size={16} />
                {loading ? 'Sending…' : 'Send code'}
              </button>
            </form>

          ) : (
            <form onSubmit={handleVerify}>
              <button type="button" onClick={() => { setStep('email'); setCode(''); setError(null); }}
                style={{ background:'none', border:'none', cursor:'pointer', color:T.muted,
                  display:'flex', alignItems:'center', gap:4, fontSize:12, marginBottom:16, padding:0 }}>
                <ArrowLeft size={13} /> {email}
              </button>
              <div style={{ ...NF, fontSize:11, letterSpacing:1.5, color:T.gold, fontWeight:700, marginBottom:14 }}>
                ENTER CODE
              </div>
              <div style={{ fontSize:13, color:T.muted, marginBottom:20, lineHeight:1.5 }}>
                Check your email for a 6-digit code.
              </div>
              <input
                type="text" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000" required autoFocus
                inputMode="numeric" pattern="[0-9]*"
                style={{ ...inp, width:'100%', boxSizing:'border-box', marginBottom:12,
                  fontSize:28, textAlign:'center', letterSpacing:8, fontWeight:700 }}
              />
              {error && <div style={{ fontSize:12, color:T.over, marginBottom:12 }}>{error}</div>}
              <button type="submit" disabled={loading || code.length !== 6}
                style={{ width:'100%', padding:'14px', borderRadius:14, border:'none',
                  background: (loading || code.length !== 6) ? T.border : T.accent, color:'#fff',
                  fontSize:15, fontWeight:600, cursor: (loading || code.length !== 6) ? 'default' : 'pointer' }}>
                {loading ? 'Verifying…' : 'Verify'}
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
