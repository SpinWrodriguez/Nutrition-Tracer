import { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Trash2 } from 'lucide-react';
import { T, sf } from '../constants.js';
import { aiDayChat } from '../api.js';

export function AiChat({ dayContext }) {
  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: 'user', text }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const reply = await aiDayChat(next, dayContext);
      setMessages(m => [...m, { role: 'assistant', text: reply }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', text: "Couldn't reach AI — check your connection and try again." }]);
    }
    setLoading(false);
  };

  const close = () => { setOpen(false); };

  return (
    <>
      {/* FAB */}
      <button onClick={() => setOpen(true)} title="AI assistant"
        style={{ position:'fixed', bottom:76, right:16, zIndex:30,
          width:46, height:46, borderRadius:'50%', background:T.accent,
          border:'none', cursor:'pointer', display:'flex', alignItems:'center',
          justifyContent:'center', boxShadow:'0 3px 14px rgba(0,0,0,0.22)' }}>
        <Sparkles size={19} color="#fff" />
      </button>

      {/* Backdrop */}
      {open && <div onClick={close}
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.3)', zIndex:100 }} />}

      {/* Sheet */}
      {open && (
        <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:101,
          background:T.surface, borderRadius:'22px 22px 0 0',
          maxHeight:'72vh', display:'flex', flexDirection:'column',
          boxShadow:'0 -4px 30px rgba(0,0,0,0.14)' }}>

          {/* handle + header */}
          <div style={{ padding:'10px 16px 0', flexShrink:0 }}>
            <div style={{ width:36, height:4, background:T.border, borderRadius:2, margin:'0 auto 10px' }} />
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10,
              paddingBottom:10, borderBottom:`1px solid ${T.border}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                <Sparkles size={15} color={T.gold} />
                <span style={{ fontSize:14, fontWeight:700, color:T.ink }}>AI Assistant</span>
                <span style={{ fontSize:11, color:T.faint }}>— {dayContext.dayName}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                {messages.length > 0 && (
                  <button onClick={() => setMessages([])} title="Clear history"
                    style={{ background:'none', border:'none', cursor:'pointer', padding:4,
                      display:'flex', alignItems:'center' }}>
                    <Trash2 size={15} color={T.faint} />
                  </button>
                )}
                <button onClick={close}
                  style={{ background:'none', border:'none', cursor:'pointer', padding:4,
                    display:'flex', alignItems:'center' }}>
                  <X size={17} color={T.muted} />
                </button>
              </div>
            </div>
          </div>

          {/* messages */}
          <div style={{ flex:1, overflowY:'auto', padding:'4px 16px 8px' }}>
            {messages.length === 0 && (
              <p style={{ textAlign:'center', color:T.faint, fontSize:13, padding:'20px 0', lineHeight:1.5 }}>
                Ask anything about today's meals, macros, or goals.{'\n'}
                <span style={{ fontSize:12 }}>e.g. "How much Chobani for 40g protein?"</span>
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ marginBottom:10,
                display:'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth:'82%', padding:'9px 13px', fontSize:14, lineHeight:1.5,
                  borderRadius: m.role === 'user' ? '16px 16px 3px 16px' : '16px 16px 16px 3px',
                  background: m.role === 'user' ? T.accent : T.bg,
                  color: m.role === 'user' ? '#fff' : T.ink, ...sf }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:10 }}>
                <div style={{ padding:'9px 14px', background:T.bg, borderRadius:'16px 16px 16px 3px',
                  fontSize:13, color:T.faint, ...sf }}>
                  Thinking…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* input row */}
          <div style={{ padding:'10px 16px',
            paddingBottom:'calc(10px + env(safe-area-inset-bottom))',
            borderTop:`1px solid ${T.border}`, flexShrink:0, display:'flex', gap:8, alignItems:'flex-end' }}>
            <textarea ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask about meals, protein, calories…"
              rows={1}
              style={{ flex:1, padding:'9px 13px', borderRadius:13, border:`1.5px solid ${T.border}`,
                fontSize:14, color:T.ink, background:T.bg, resize:'none', outline:'none',
                fontFamily:'ui-sans-serif,system-ui,sans-serif', lineHeight:1.4,
                maxHeight:90, overflowY:'auto' }} />
            <button onClick={send} disabled={!input.trim() || loading}
              style={{ width:38, height:38, borderRadius:11, border:'none', flexShrink:0,
                background: input.trim() && !loading ? T.accent : T.border,
                cursor: input.trim() && !loading ? 'pointer' : 'default',
                display:'flex', alignItems:'center', justifyContent:'center',
                transition:'background 0.15s' }}>
              <Send size={15} color="#fff" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
