import { useRef, useState } from 'react';
import { Check, Plus, X, Pencil, Wand2, Copy, ClipboardPaste, Star, ImagePlus } from 'lucide-react';
import { T, NF, one } from '../constants.js';
import { AnalysisModal } from './ui.jsx';

export function MealCard({
  slot, items, totals, isChecked, skipOnly,
  photo, hasFood, isGenerating, photoErr,
  clipboard, focus, savedMealNames,
  onCheck, onAdd, onEdit, onRemoveItem, onRemovePhoto, onGeneratePhoto, onPickPhoto, onClearError, onCopy, onPaste, onCancelCopy, onSaveItem, onUnsaveItem,
}) {
  const fileRef = useRef(null);
  const [viewAnalysis, setViewAnalysis] = useState(null);
  const handleFilePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onPickPhoto?.(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };
  const macroLine = (o) => focus === 'protein'
    ? `${o.p}P · ${o.c}C · ${o.f}F · ${o.k} kcal`
    : `${o.k} kcal · ${o.p}P · ${o.c}C · ${o.f}F`;
  const totalLine = focus === 'protein'
    ? `Total: ${totals.p}P · ${totals.c}C · ${totals.f}F · ${totals.k} kcal`
    : `Total: ${totals.k} kcal · ${totals.p}P · ${totals.c}C · ${totals.f}F`;
  const canPaste = !!clipboard;

  // Empty optional slots: compact dashed add-row instead of full card
  if (slot.optional && items.length === 0 && !canPaste) {
    return (
      <button onClick={onAdd}
        style={{ width:'100%', padding:'10px 18px', borderRadius:16, marginBottom:10,
          border:`1.5px dashed ${T.border}`, background:'transparent', color:T.faint,
          display:'flex', alignItems:'center', gap:8, cursor:'pointer', textAlign:'left',
          fontSize:13, fontFamily:'ui-sans-serif,system-ui,sans-serif' }}>
        <Plus size={14} />
        <span>Add {slot.label.toLowerCase()}</span>
      </button>
    );
  }

  return (
    <>
    <div style={{ background:T.surface, borderRadius:18, marginBottom:10,
      boxShadow:'0 1px 6px rgba(0,0,0,0.05)', borderLeft:`4px solid ${isChecked ? T.accent : T.border}` }}>

      {/* photo header */}
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFilePick} style={{ display:'none' }} />
      {photo ? (
        <div style={{ position:'relative', borderTopLeftRadius:14, borderTopRightRadius:14, overflow:'hidden' }}>
          <img src={photo} alt="meal" style={{ width:'100%', height:140, objectFit:'cover', display:'block' }} />
          <div style={{ position:'absolute', top:6, right:6, display:'flex', gap:5 }}>
            <button onClick={onGeneratePhoto} disabled={isGenerating}
              title="Regenerate AI photo"
              style={{ width:26, height:26, borderRadius:'50%', border:'none',
                background:'rgba(0,0,0,0.5)', cursor:isGenerating ? 'default' : 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center',
                opacity:isGenerating ? 0.5 : 1 }}>
              <Wand2 size={13} color={T.gold} />
            </button>
            <button onClick={() => fileRef.current?.click()} title="Upload from photos"
              style={{ width:26, height:26, borderRadius:'50%', border:'none',
                background:'rgba(0,0,0,0.5)', cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
              <ImagePlus size={13} color="#fff" />
            </button>
            <button onClick={onRemovePhoto} title="Remove photo"
              style={{ width:26, height:26, borderRadius:'50%', border:'none',
                background:'rgba(0,0,0,0.5)', cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
              <X size={13} color="#fff" />
            </button>
          </div>
        </div>
      ) : isGenerating ? (
        <div style={{ height:70, background:T.goldLight, borderTopLeftRadius:14, borderTopRightRadius:14,
          display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          <Wand2 size={15} color={T.gold} />
          <span style={{ fontSize:12, color:T.gold, fontWeight:600 }}>Generating photo…</span>
        </div>
      ) : hasFood ? (
        <div style={{ borderTopLeftRadius:14, borderTopRightRadius:14, display:'flex', alignItems:'center',
          justifyContent:'flex-end', gap:6, padding:'8px 12px', borderBottom:`1px solid ${T.border}` }}>
          <button onClick={onGeneratePhoto} disabled={isGenerating}
            title="Generate AI photo"
            style={{ width:30, height:30, borderRadius:'50%', border:`1.5px solid ${T.gold}`,
              background:T.goldLight, cursor:isGenerating ? 'default' : 'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              opacity:isGenerating ? 0.5 : 1 }}>
            <Wand2 size={14} color={T.gold} />
          </button>
          <button onClick={() => fileRef.current?.click()} title="Upload from photos"
            style={{ width:30, height:30, borderRadius:'50%', border:`1.5px solid ${T.border}`,
              background:'transparent', cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
            <ImagePlus size={14} color={T.muted} />
          </button>
        </div>
      ) : null}

      <div style={{ padding:'14px 14px 12px' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>

          {/* left: label + food list */}
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
              <span style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, color:T.muted, textTransform:'uppercase' }}>{slot.label}</span>
              <span style={{ fontSize:11, color:T.faint }}>· {slot.time}</span>
            </div>

            {items.length === 0 ? (
              <p style={{ fontSize:14, color:T.faint, fontStyle:'italic', margin:0 }}>Nothing added yet</p>
            ) : skipOnly ? (
              <p style={{ fontSize:14, color:T.muted, fontStyle:'italic', margin:0 }}>{one(items[0])?.n || 'Skip'}</p>
            ) : (
              <div>
                {items.map((v, idx) => {
                  const o = one(v);
                  if (!o || o.skip) return null;
                  return (
                    <div key={idx} style={{ marginBottom:5 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:0 }}>
                        <button onClick={() => onRemoveItem(idx)}
                          style={{ width:32, height:32, background:'none', border:'none', cursor:'pointer', flexShrink:0,
                            display:'flex', alignItems:'center', justifyContent:'center', borderRadius:8 }}>
                          <X size={14} color={T.faint} />
                        </button>
                        <span onClick={() => o.analysis && setViewAnalysis(o)}
                          style={{ flex:1, fontSize:14, fontWeight:600, color:T.ink, minWidth:0,
                            cursor: o.analysis ? 'pointer' : 'default' }}>
                          {o.n}
                        </span>
                        {o.custom && <span style={{ fontSize:10, color:T.accentSoft, fontWeight:600, marginRight:2 }}>CUSTOM</span>}
                        <button onClick={() => onEdit(idx)}
                          style={{ width:32, height:32, background:'none', border:'none', cursor:'pointer', flexShrink:0,
                            display:'flex', alignItems:'center', justifyContent:'center', borderRadius:8 }}>
                          <Pencil size={13} color={T.faint} />
                        </button>
                        {(() => {
                          const isSaved = savedMealNames?.has(o.n.toLowerCase()) ?? false;
                          return (
                            <button
                              onClick={() => isSaved ? onUnsaveItem && onUnsaveItem(o) : onSaveItem && onSaveItem(o)}
                              title={isSaved ? 'Remove from favourites' : 'Save to favourites'}
                              style={{ width:32, height:32, background:'none', border:'none', cursor:'pointer', flexShrink:0,
                                display:'flex', alignItems:'center', justifyContent:'center', borderRadius:8 }}>
                              <Star size={13} color={T.gold} fill={isSaved ? T.gold : 'none'} />
                            </button>
                          );
                        })()}
                      </div>
                      <div style={{ ...NF, fontSize:12, color:T.muted, paddingLeft:32 }}>
                        {macroLine(o)}
                      </div>
                    </div>
                  );
                })}
                {items.filter(v => one(v) && !one(v).skip).length > 1 && (
                  <div style={{ ...NF, fontSize:12, fontWeight:700, color:T.accentSoft,
                    marginTop:6, paddingTop:6, borderTop:`1px dashed ${T.border}`, paddingLeft:32 }}>
                    {totalLine}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* right: check + wand buttons */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, flexShrink:0 }}>
            <button onClick={onCheck}
              style={{ width:44, height:44, borderRadius:13,
                border:`2px solid ${isChecked ? T.accent : T.border}`,
                background:isChecked ? T.accent : 'transparent',
                cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {isChecked && <Check size={20} color="#fff" strokeWidth={2.5} />}
            </button>
            {photoErr && !isGenerating && (
              <div style={{ fontSize:9, color:T.over, maxWidth:44, textAlign:'center', lineHeight:1.2,
                wordBreak:'break-all', cursor:'pointer' }}
                title={photoErr} onClick={onClearError}>
                error ✕
              </div>
            )}
          </div>
        </div>
      </div>

      {/* footer: add + copy + paste */}
      <div style={{ borderTop:`1px solid ${T.border}` }}>
        <div style={{ display:'flex', alignItems:'stretch' }}>
          <button onClick={onAdd}
            style={{ flex:1, display:'flex', alignItems:'center', gap:6, padding:'10px 18px',
              background:T.accentLight, border:'none', borderBottomLeftRadius:14,
              cursor:'pointer', color:T.accentSoft }}>
            <Plus size={14} />
            <span style={{ fontSize:13, fontWeight:600 }}>Add item</span>
          </button>
          <button onClick={onCopy} title="Copy this meal"
            style={{ padding:'10px 14px', background:T.accentLight, border:'none',
              borderLeft:`1px solid ${T.border}`, borderBottomRightRadius:14,
              cursor:'pointer', display:'flex', alignItems:'center' }}>
            <Copy size={14} color={T.muted} />
          </button>
        </div>

        {/* paste bar — visible when clipboard has content */}
        {canPaste && (
          <div style={{ display:'flex', alignItems:'stretch', borderTop:`1px solid ${T.border}` }}>
            <button onClick={onPaste}
              style={{ flex:1, display:'flex', alignItems:'center', gap:6, padding:'8px 18px',
                background:T.goldLight, border:'none', borderBottomLeftRadius:14,
                cursor:'pointer', color:T.gold }}>
              <ClipboardPaste size={13} />
              <span style={{ fontSize:12, fontWeight:600 }}>
                Paste {clipboard.label} from {clipboard.fromDay}
              </span>
            </button>
            <button onClick={onCancelCopy} title="Cancel copy"
              style={{ padding:'8px 14px', background:T.goldLight, border:'none',
                borderLeft:`1px solid ${T.border}`, borderBottomRightRadius:14,
                cursor:'pointer', display:'flex', alignItems:'center' }}>
              <X size={14} color={T.gold} />
            </button>
          </div>
        )}
      </div>
    </div>

    {viewAnalysis && (
      <AnalysisModal name={viewAnalysis.n} text={viewAnalysis.analysis} onClose={() => setViewAnalysis(null)} />
    )}
    </>
  );
}
