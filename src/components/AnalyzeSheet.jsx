import { useRef, useState, useEffect } from 'react';
import { Camera, Send, Plus, X, ImagePlus } from 'lucide-react';
import { T, NF, inp } from '../constants.js';
import { aiAnalyzeFood, compressImage } from '../api.js';

export function AnalyzeSheet({ open, slotMeta, onClose, onConfirm, initial = null, confirmLabel = null, learnedLibrary = [] }) {
  const [photos,      setPhotos]      = useState([]); // array of data URLs
  const [displayMsgs, setDisplayMsgs] = useState([]);
  const [apiMsgs,     setApiMsgs]     = useState([]);
  const [macros,      setMacros]      = useState(null);
  const [bestPhotoIdx, setBestPhotoIdx] = useState(-1);
  const [photosSent,  setPhotosSent]  = useState(false);
  const [input,       setInput]       = useState('');
  const [busy,        setBusy]        = useState(false);
  const [err,         setErr]         = useState(null);
  const fileRef  = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) {
      // Seed from a prior analysis (continue-conversation mode) or start fresh
      const history = initial?.history || [];
      setPhotos(initial?.photos || []);
      setDisplayMsgs(history);
      setApiMsgs(history.map(m => ({ role: m.role, content: m.text })));
      setMacros(initial?.macros ? {
        n: initial.macros.n || '',
        k: String(initial.macros.k ?? 0), p: String(initial.macros.p ?? 0),
        c: String(initial.macros.c ?? 0), f: String(initial.macros.f ?? 0),
      } : null);
      setInput(''); setErr(null); setBusy(false); setBestPhotoIdx(-1);
      setPhotosSent(false); // seeded photos are re-sent on the next message so the AI can see them
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMsgs, busy]);

  const send = async (text) => {
    const isFirst = apiMsgs.length === 0;
    if (!text.trim() && (!isFirst || !photos.length)) return;
    setBusy(true); setErr(null);

    const displayText = text || 'Analyze these photos and estimate the macros.';
    setDisplayMsgs(prev => [...prev, { role: 'user', text: displayText }]);
    setInput('');

    try {
      // Photos ride on the first message that hasn't sent them yet — history provides context after that
      const attachPhotos = photos.length > 0 && !photosSent;
      const userMsg = attachPhotos
        ? { role: 'user', content: [
            ...photos.map(url => ({ type: 'image_url', image_url: { url } })),
            { type: 'text', text: displayText },
          ]}
        : { role: 'user', content: displayText };

      const nextApiMsgs = [...apiMsgs, userMsg];
      const result = await aiAnalyzeFood(nextApiMsgs, learnedLibrary);
      const replyText = result.reply || `${result.name}: ${result.k} kcal, ${result.p}g P, ${result.c}g C, ${result.f}g F`;

      setDisplayMsgs(prev => [...prev, { role: 'assistant', text: replyText }]);
      setMacros({ n: result.name || '', k: String(result.k ?? 0), p: String(result.p ?? 0), c: String(result.c ?? 0), f: String(result.f ?? 0) });
      if (attachPhotos && result.photo_index >= 0) setBestPhotoIdx(result.photo_index);
      if (attachPhotos) setPhotosSent(true);
      setApiMsgs([...nextApiMsgs, { role: 'assistant', content: JSON.stringify(result) }]);
    } catch (e) {
      setErr(e.message || 'Something went wrong');
    }
    setBusy(false);
  };

  const handleFilePick = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = '';
    const compressed = await Promise.all(files.map(file => new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = async (ev) => resolve(await compressImage(ev.target.result, 800, 0.8));
      reader.readAsDataURL(file);
    })));
    setPhotos(prev => [...prev, ...compressed]);
  };

  const canSend = !busy && (input.trim() || (apiMsgs.length === 0 && photos.length > 0));

  const handleConfirm = () => {
    if (!macros) return;
    const item = {
      custom: true,
      n: macros.n || 'Custom meal',
      k: Math.max(0, Math.round(+macros.k || 0)),
      p: Math.max(0, Math.round(+macros.p || 0)),
      c: Math.max(0, Math.round(+macros.c || 0)),
      f: Math.max(0, Math.round(+macros.f || 0)),
    };
    const lastReply = [...displayMsgs].reverse().find(m => m.role === 'assistant');
    if (lastReply) item.analysis = lastReply.text;
    if (displayMsgs.length) item.aiChat = displayMsgs; // full conversation, so it can be resumed later
    const bestPhoto = bestPhotoIdx >= 0 && photos[bestPhotoIdx] ? photos[bestPhotoIdx] : null;
    onConfirm(item, bestPhoto);
  };

  if (!open) return null;

  const hasEstimate = macros !== null;

  return (
    <>
      <div onClick={onClose}
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:110 }} />

      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:111,
        background:T.surface, borderRadius:'24px 24px 0 0',
        maxHeight:'92vh', display:'flex', flexDirection:'column',
        boxShadow:'0 -6px 40px rgba(0,0,0,0.18)',
        paddingBottom:'env(safe-area-inset-bottom)' }}>

        {/* drag handle */}
        <div style={{ width:40, height:4, background:T.border, borderRadius:2, margin:'12px auto 4px', flexShrink:0 }} />

        {/* header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'8px 18px 12px', flexShrink:0, borderBottom:`1px solid ${T.border}` }}>
          <div>
            <div style={{ ...NF, fontSize:11, letterSpacing:1.5, color:T.muted, fontWeight:600 }}>ANALYZE FOR</div>
            <div style={{ fontSize:17, fontWeight:700, color:T.ink }}>{slotMeta?.label}</div>
          </div>
          <button onClick={onClose}
            style={{ width:36, height:36, borderRadius:10, border:`1.5px solid ${T.border}`,
              background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <X size={16} color={T.muted} />
          </button>
        </div>

        {/* scrollable body */}
        <div style={{ flex:1, overflowY:'auto', padding:'14px 18px 8px' }}>

          {/* hidden file input — multiple */}
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFilePick} style={{ display:'none' }} />

          {/* photo thumbnails */}
          {photos.length > 0 ? (
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
              {photos.map((src, i) => (
                <div key={i} style={{ position:'relative', width:90, height:90, flexShrink:0 }}>
                  <img src={src} alt="food"
                    style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:10, display:'block' }} />
                  <button onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                    style={{ position:'absolute', top:4, right:4, width:20, height:20, borderRadius:'50%',
                      border:'none', background:'rgba(0,0,0,0.55)', cursor:'pointer',
                      display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <X size={11} color="#fff" />
                  </button>
                </div>
              ))}
              {/* add more */}
              <button onClick={() => fileRef.current?.click()}
                style={{ width:90, height:90, borderRadius:10, border:`2px dashed ${T.border}`,
                  background:T.bg, cursor:'pointer', display:'flex', flexDirection:'column',
                  alignItems:'center', justifyContent:'center', gap:4, flexShrink:0 }}>
                <ImagePlus size={18} color={T.faint} />
                <span style={{ fontSize:10, color:T.faint }}>Add more</span>
              </button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()}
              style={{ width:'100%', height:110, borderRadius:14, border:`2px dashed ${T.border}`,
                background:T.bg, cursor:'pointer', display:'flex', flexDirection:'column',
                alignItems:'center', justifyContent:'center', gap:8, marginBottom:14 }}>
              <Camera size={26} color={T.faint} />
              <span style={{ fontSize:13, color:T.faint }}>Tap to add photos of your food</span>
            </button>
          )}

          {/* chat messages */}
          {displayMsgs.map((m, i) => (
            <div key={i} style={{ marginBottom:8, display:'flex',
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth:'82%', padding:'9px 13px', fontSize:13, lineHeight:1.45,
                borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: m.role === 'user' ? T.accent : T.bg,
                color: m.role === 'user' ? '#fff' : T.ink,
              }}>{m.text}</div>
            </div>
          ))}

          {busy && (
            <div style={{ display:'flex', marginBottom:8 }}>
              <div style={{ padding:'9px 13px', borderRadius:'16px 16px 16px 4px',
                background:T.bg, fontSize:13, color:T.muted }}>Analyzing…</div>
            </div>
          )}
          {err && <p style={{ fontSize:12, color:T.over, marginBottom:8 }}>{err}</p>}
          <div ref={bottomRef} />
        </div>

        {/* sticky footer */}
        <div style={{ flexShrink:0, borderTop:`1px solid ${T.border}`, padding:'10px 18px 14px' }}>

          {/* editable macro row — appears after first estimate */}
          {hasEstimate && (
            <div style={{ marginBottom:10 }}>
              <input value={macros.n} onChange={e => setMacros(m => ({ ...m, n: e.target.value }))}
                placeholder="Food name"
                style={{ ...inp, fontWeight:700, fontSize:14, marginBottom:8 }} />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:6 }}>
                {[['k','kcal'],['p','Prot'],['c','Carbs'],['f','Fat']].map(([key, lbl]) => (
                  <div key={key}>
                    <div style={{ fontSize:10, color:T.muted, textAlign:'center', marginBottom:3 }}>{lbl}</div>
                    <input value={macros[key]}
                      onChange={e => { if (/^\d*\.?\d*$/.test(e.target.value)) setMacros(m => ({ ...m, [key]: e.target.value })); }}
                      inputMode="decimal"
                      style={{ ...inp, textAlign:'center', padding:'7px 4px', fontSize:13 }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* text input + send */}
          <div style={{ display:'flex', gap:8, marginBottom: hasEstimate ? 8 : 0 }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && canSend) send(input); }}
              placeholder={displayMsgs.length === 0 ? 'Add photos above, type context, then send…' : 'Refine: "label says 320 kcal", "add extra cheese"…'}
              style={{ ...inp, flex:1, fontSize:13 }}
              disabled={busy} />
            <button onClick={() => send(input)} disabled={!canSend}
              style={{ width:44, height:44, borderRadius:12, border:'none', flexShrink:0,
                background: canSend ? T.accent : T.border,
                cursor: canSend ? 'pointer' : 'default',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Send size={16} color="#fff" />
            </button>
          </div>

          {/* confirm button */}
          {hasEstimate && (
            <button onClick={handleConfirm}
              style={{ width:'100%', padding:'13px', borderRadius:12, border:'none',
                background:T.ok, color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              <Plus size={16} /> {confirmLabel || `Add to ${slotMeta?.label?.toLowerCase()}`}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
