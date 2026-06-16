import { Check, Plus, X, Pencil, Wand2, Copy, ClipboardPaste, Star } from 'lucide-react';
import { T, NF, one } from '../constants.js';
import { PhotoBanner } from './ui.jsx';

export function MealCard({
  slot, items, totals, isChecked, skipOnly,
  photo, hasFood, isGenerating, photoErr,
  clipboard, focus,
  onCheck, onAdd, onEdit, onRemoveItem, onRemovePhoto, onGeneratePhoto, onClearError, onCopy, onPaste, onCancelCopy, onSaveItem,
}) {
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
    <div style={{ background:T.surface, borderRadius:18, marginBottom:10,
      boxShadow:'0 1px 6px rgba(0,0,0,0.05)', borderLeft:`4px solid ${isChecked ? T.ok : T.border}` }}>

      {/* photo / generating banner */}
      {photo ? (
        <PhotoBanner photo={photo} onRemove={onRemovePhoto} />
      ) : isGenerating ? (
        <div style={{ height:70, background:T.goldLight, borderTopLeftRadius:14, borderTopRightRadius:14,
          display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          <Wand2 size={15} color={T.gold} />
          <span style={{ fontSize:12, color:T.gold, fontWeight:600 }}>Generating photo…</span>
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
                      <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                        <button onClick={() => onRemoveItem(idx)}
                          style={{ background:'none', border:'none', cursor:'pointer', padding:'2px', display:'flex', alignItems:'center', flexShrink:0 }}>
                          <X size={12} color={T.faint} />
                        </button>
                        <button onClick={() => onEdit(idx)}
                          style={{ background:'none', border:'none', cursor:'pointer', padding:'2px', display:'flex', alignItems:'center', flexShrink:0 }}>
                          <Pencil size={11} color={T.faint} />
                        </button>
                        <button onClick={() => onSaveItem && onSaveItem(o)} title="Save to favourites"
                          style={{ background:'none', border:'none', cursor:'pointer', padding:'2px', display:'flex', alignItems:'center', flexShrink:0 }}>
                          <Star size={11} color={T.gold} />
                        </button>
                        <span style={{ fontSize:14, fontWeight:600, color:T.ink }}>{o.n}</span>
                        {o.custom && <span style={{ fontSize:10, color:T.accentSoft, fontWeight:600 }}>CUSTOM</span>}
                      </div>
                      <div style={{ ...NF, fontSize:12, color:T.muted, paddingLeft:36 }}>
                        {macroLine(o)}
                      </div>
                    </div>
                  );
                })}
                {items.filter(v => one(v) && !one(v).skip).length > 1 && (
                  <div style={{ ...NF, fontSize:12, fontWeight:700, color:T.accentSoft,
                    marginTop:6, paddingTop:6, borderTop:`1px dashed ${T.border}`, paddingLeft:36 }}>
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
                border:`2px solid ${isChecked ? T.ok : T.border}`,
                background:isChecked ? T.ok : 'transparent',
                cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {isChecked && <Check size={20} color="#fff" strokeWidth={2.5} />}
            </button>
            {hasFood && !photo && (
              <button onClick={onGeneratePhoto} disabled={isGenerating}
                title="Generate meal photo with AI"
                style={{ width:44, height:32, borderRadius:10,
                  border:`1.5px solid ${T.gold}`, background:T.goldLight,
                  cursor:isGenerating ? 'default' : 'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  opacity:isGenerating ? 0.5 : 1 }}>
                <Wand2 size={14} color={T.gold} />
              </button>
            )}
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
  );
}
