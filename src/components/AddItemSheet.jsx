import { Camera, Database, Droplets, Plus, Sparkles, X } from 'lucide-react';
import { T, NF, inp, OPT } from '../constants.js';

export function AddItemSheet({ sheet }) {
  const {
    open, slotMeta, editIdx,
    query, hits, pick, grams, setGrams, unit, scaledDraft,
    draft, setDraft, qty, setQty, busy, aiErr,
    usdaHits, usdaLoading, fetchingDetail,
    imgPreview, setImgPreview, isLiquid, setIsLiquid,
    camRef,
    closeSheet, onQuery,
    handlePickAFCD, handlePickUSDA, clearPick,
    runAI, handleImageCapture,
    confirmScaled, confirmDraft, confirmCatalog,
  } = sheet;

  return (
    <>
      <div onClick={closeSheet}
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:100 }} />

      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:101,
        background:T.surface, borderRadius:'24px 24px 0 0',
        paddingBottom:'calc(20px + env(safe-area-inset-bottom))',
        maxHeight:'88vh', overflowY:'auto', boxShadow:'0 -6px 40px rgba(0,0,0,0.15)' }}>

        <div style={{ width:40, height:4, background:T.border, borderRadius:2, margin:'12px auto 0' }} />

        <div style={{ padding:'12px 18px 0' }}>

          {/* header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div>
              <div style={{ ...NF, fontSize:11, letterSpacing:1.5, color:T.muted, fontWeight:600 }}>
                {editIdx !== null ? 'EDITING' : 'ADDING TO'}
              </div>
              <div style={{ fontSize:17, fontWeight:700, color:T.ink }}>{slotMeta?.label}</div>
            </div>
            <button onClick={closeSheet}
              style={{ width:36, height:36, borderRadius:10, border:`1.5px solid ${T.border}`,
                background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <X size={16} color={T.muted} />
            </button>
          </div>

          {/* search + camera */}
          <div style={{ position:'relative', marginBottom:12 }}>
            <Database size={16} color={T.faint} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)' }} />
            <input value={query} onChange={e => onQuery(e.target.value)}
              placeholder="Search foods or describe a meal…"
              style={{ ...inp, paddingLeft:38, paddingRight:44 }} autoFocus />
            <button onClick={() => camRef.current?.click()}
              style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                background:'none', border:'none', cursor:'pointer', padding:4, display:'flex', alignItems:'center' }}>
              <Camera size={18} color={T.muted} />
            </button>
            <input ref={camRef} type="file" accept="image/*" capture="environment"
              style={{ display:'none' }}
              onChange={async e => {
                const file = e.target.files?.[0];
                if (file) await handleImageCapture(file);
                e.target.value = '';
              }}
            />
          </div>

          {/* image preview */}
          {imgPreview && (
            <div style={{ position:'relative', marginBottom:12 }}>
              <img src={imgPreview} alt="food" style={{ width:'100%', maxHeight:160, objectFit:'cover', borderRadius:12 }} />
              <button onClick={() => { setImgPreview(null); setDraft(null); }}
                style={{ position:'absolute', top:6, right:6, background:'rgba(0,0,0,0.5)', border:'none',
                  borderRadius:'50%', width:24, height:24, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <X size={13} color="#fff" />
              </button>
              {busy && (
                <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.35)', borderRadius:12,
                  display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:13, fontWeight:600 }}>
                  Estimating…
                </div>
              )}
            </div>
          )}

          {/* AFCD results */}
          {hits.length > 0 && !pick && (
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:11, color:T.muted, fontWeight:600, letterSpacing:1, marginBottom:6 }}>AFCD DATABASE MATCHES</div>
              <div style={{ border:`1.5px solid ${T.border}`, borderRadius:14, overflow:'hidden' }}>
                {hits.map((item, i) => (
                  <button key={i} onClick={() => handlePickAFCD(item)}
                    style={{ width:'100%', textAlign:'left', padding:'12px 14px',
                      border:'none', borderBottom: i < hits.length-1 ? `1px solid ${T.border}` : 'none',
                      background:'transparent', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:14, color:T.ink }}>{item.name}</span>
                    <span style={{ ...NF, fontSize:12, color:T.muted, flexShrink:0, marginLeft:10 }}>{item.kcal} kcal/100g</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* USDA results */}
          {!pick && query.trim().length >= 2 && (usdaLoading || usdaHits.length > 0) && (
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:11, color:T.muted, fontWeight:600, letterSpacing:1, marginBottom:6 }}>
                USDA DATABASE {usdaLoading ? '· searching…' : 'MATCHES'}
              </div>
              {!usdaLoading && (
                <div style={{ border:`1.5px solid ${T.border}`, borderRadius:14, overflow:'hidden' }}>
                  {usdaHits.map((item, i) => (
                    <button key={i} disabled={fetchingDetail} onClick={() => handlePickUSDA(item)}
                      style={{ width:'100%', textAlign:'left', padding:'12px 14px',
                        border:'none', borderBottom: i < usdaHits.length-1 ? `1px solid ${T.border}` : 'none',
                        background:'transparent', cursor:fetchingDetail ? 'default' : 'pointer',
                        display:'flex', justifyContent:'space-between', alignItems:'center', opacity:fetchingDetail ? 0.5 : 1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        {item.isLiquid && <Droplets size={12} color={T.blue} />}
                        <span style={{ fontSize:13, color:T.ink }}>{item.name}</span>
                      </div>
                      <span style={{ ...NF, fontSize:12, color:T.muted, flexShrink:0, marginLeft:10 }}>
                        {item.kcal} kcal/100{item.isLiquid ? 'ml' : 'g'}
                      </span>
                    </button>
                  ))}
                  {fetchingDetail && (
                    <div style={{ padding:'10px 14px', fontSize:12, color:T.muted, textAlign:'center' }}>Loading serving info…</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* gram / ml adjuster */}
          {pick && (
            <div style={{ border:`2px solid ${T.accentLight}`, borderRadius:16, padding:14, marginBottom:12, background:T.accentLight }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <div style={{ fontSize:14, fontWeight:700, color:T.accent, flex:1 }}>{pick.name}</div>
                {!pick.servingLabel && (
                  <button onClick={() => setIsLiquid(v => !v)}
                    style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 8px', borderRadius:8,
                      border:`1.5px solid ${isLiquid ? T.blue : T.border}`,
                      background:isLiquid ? '#EBF3FA' : 'transparent',
                      cursor:'pointer', fontSize:11, fontWeight:600, color:isLiquid ? T.blue : T.muted }}>
                    <Droplets size={12} /> {isLiquid ? 'ml' : 'liquid?'}
                  </button>
                )}
              </div>

              {pick.servingSize && pick.servingLabel ? (
                /* USDA with a known unit — show a serving COUNT, e.g. "2 × 1 egg (96g each)" */
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10, flexWrap:'wrap' }}>
                  <span style={{ fontSize:13, color:T.muted, flexShrink:0 }}>Servings</span>
                  <input
                    value={(() => {
                      const c = parseFloat(grams) / pick.servingSize;
                      return isNaN(c) ? '1' : String(Math.round(c * 10) / 10);
                    })()}
                    onChange={e => {
                      const count = parseFloat(e.target.value);
                      if (count > 0) setGrams(String(Math.round(count * pick.servingSize)));
                    }}
                    inputMode="decimal"
                    style={{ ...inp, width:70, textAlign:'center', padding:'8px' }}
                  />
                  <span style={{ fontSize:13, color:T.muted }}>× {pick.servingLabel}</span>
                  <span style={{ fontSize:12, color:T.faint }}>({pick.servingSize}{isLiquid ? 'ml' : 'g'} ea)</span>
                  <button onClick={clearPick}
                    style={{ marginLeft:'auto', fontSize:12, color:T.muted, background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>
                    change
                  </button>
                </div>
              ) : (
                /* AFCD or bare USDA — show raw gram/ml input */
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                  <span style={{ fontSize:13, color:T.muted, flexShrink:0 }}>Amount</span>
                  <input value={grams} onChange={e => setGrams(e.target.value)} inputMode="decimal"
                    style={{ ...inp, width:80, textAlign:'center', padding:'8px' }} />
                  <span style={{ fontSize:13, color:T.muted }}>{unit}</span>
                  <button onClick={clearPick}
                    style={{ marginLeft:'auto', fontSize:12, color:T.muted, background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>
                    change
                  </button>
                </div>
              )}

              {scaledDraft && (
                <>
                  <div style={{ ...NF, fontSize:13, color:T.accentSoft, marginBottom:10 }}>
                    {scaledDraft.k} kcal · {scaledDraft.p}g P · {scaledDraft.c}g C · {scaledDraft.f}g F
                  </div>
                  <button onClick={confirmScaled}
                    style={{ width:'100%', padding:'13px', borderRadius:12, border:'none',
                      background:T.accent, color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer',
                      display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                    <Plus size={16} /> {editIdx !== null ? 'Save changes' : `Add to ${slotMeta?.label.toLowerCase()}`}
                  </button>
                </>
              )}
            </div>
          )}

          {/* AI estimate button */}
          {!pick && (
            <>
              <button onClick={runAI} disabled={busy || !query.trim()}
                style={{ width:'100%', padding:'13px', borderRadius:12, border:'none',
                  background: busy || !query.trim() ? T.border : T.ink,
                  color: busy || !query.trim() ? T.muted : '#fff',
                  fontSize:14, fontWeight:600, cursor: busy || !query.trim() ? 'default' : 'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginBottom:8 }}>
                <Sparkles size={15} />
                {busy ? 'Estimating…' : hits.length > 0 ? 'Not a match — estimate with AI' : 'Estimate macros with AI'}
              </button>
              {aiErr && <p style={{ fontSize:12, color:T.over, marginBottom:8 }}>{aiErr}</p>}
            </>
          )}

          {/* draft editor — shown after AI estimate or when editing a custom item */}
          {draft && !pick && (
            <div style={{ border:`1.5px solid ${T.border}`, borderRadius:16, padding:14, marginBottom:12 }}>
              <input value={draft.n} onChange={e => setDraft(d => ({ ...d, n: e.target.value }))}
                style={{ ...inp, fontWeight:700, fontSize:15, marginBottom:10 }} placeholder="Meal name" />

              {/* macros grid */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8, marginBottom:10 }}>
                {[['k','kcal'],['p','Protein'],['c','Carbs'],['f','Fat']].map(([key, lbl]) => (
                  <div key={key}>
                    <div style={{ fontSize:10, color:T.muted, textAlign:'center', marginBottom:4 }}>{lbl}</div>
                    <input value={draft[key]}
                      onChange={e => {
                        const raw = e.target.value;
                        if (/^\d*\.?\d*$/.test(raw)) setDraft(d => ({ ...d, [key]: raw }));
                      }}
                      inputMode="decimal" style={{ ...inp, textAlign:'center', padding:'8px 4px', fontSize:14 }} />
                  </div>
                ))}
              </div>

              {/* quantity row */}
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10,
                padding:'8px 12px', background:T.bg, borderRadius:10 }}>
                <span style={{ fontSize:13, color:T.muted, flexShrink:0 }}>Portions ×</span>
                <input value={qty} onChange={e => setQty(e.target.value)} inputMode="decimal"
                  style={{ ...inp, width:60, textAlign:'center', padding:'6px 8px', fontSize:14 }} />
                <span style={{ fontSize:12, color:T.faint }}>
                  = {Math.round(draft.k * (parseFloat(qty)||1))} kcal
                </span>
              </div>

              <button onClick={confirmDraft}
                style={{ width:'100%', padding:'13px', borderRadius:12, border:'none',
                  background:T.ok, color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                <Plus size={16} /> {editIdx !== null ? 'Save changes' : `Add to ${slotMeta?.label.toLowerCase()}`}
              </button>
            </div>
          )}

          {/* catalog — hidden when editing */}
          {editIdx === null && (
            <div style={{ marginBottom:8 }}>
              <div style={{ fontSize:11, color:T.muted, fontWeight:600, letterSpacing:1, marginBottom:8 }}>
                {query ? 'OR PICK FROM PLAN' : 'PICK FROM PLAN'}
              </div>
              {(slotMeta?.opts || []).map(id => {
                const oo = OPT[id];
                return (
                  <button key={id} onClick={() => confirmCatalog(id)}
                    style={{ width:'100%', textAlign:'left', padding:'12px 14px', marginBottom:6,
                      borderRadius:12, border:`1.5px solid ${T.border}`, background:T.surface, cursor:'pointer',
                      display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:500, color:oo.skip ? T.muted : T.ink }}>{oo.n}</div>
                      {!oo.skip && <div style={{ ...NF, fontSize:12, color:T.muted, marginTop:1 }}>{oo.k} kcal · {oo.p}P · {oo.c}C · {oo.f}F</div>}
                    </div>
                    <Plus size={14} color={T.accentSoft} style={{ flexShrink:0, marginLeft:8 }} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
