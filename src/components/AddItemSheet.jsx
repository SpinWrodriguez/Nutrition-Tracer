import { Database, Droplets, Plus, X, ScanSearch } from 'lucide-react';
import { T, NF, inp } from '../constants.js';

export function AddItemSheet({ sheet, onOpenAnalyze, forceEditMode = false }) {
  const {
    open, slotMeta, editIdx,
    query, hits, pick, grams, setGrams, unit, scaledDraft,
    draft, setDraft, qty, setQty,
    usdaHits, usdaLoading, fetchingDetail,
    isLiquid, setIsLiquid,
    savedMeals,
    closeSheet, onQuery,
    handlePickAFCD, handlePickUSDA, clearPick,
    confirmScaled, confirmDraft, confirmSavedMeal,
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
                {editIdx !== null || forceEditMode ? 'EDITING' : 'ADDING TO'}
              </div>
              <div style={{ fontSize:17, fontWeight:700, color:T.ink }}>{slotMeta?.label}</div>
            </div>
            <button onClick={closeSheet}
              style={{ width:36, height:36, borderRadius:10, border:`1.5px solid ${T.border}`,
                background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <X size={16} color={T.muted} />
            </button>
          </div>

          {/* search */}
          <div style={{ position:'relative', marginBottom:12 }}>
            <Database size={16} color={T.faint} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)' }} />
            <input value={query} onChange={e => onQuery(e.target.value)}
              placeholder="Search foods…"
              style={{ ...inp, paddingLeft:38 }} autoFocus />
          </div>

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
                    <Plus size={16} /> {editIdx !== null || forceEditMode ? 'Save changes' : `Add to ${slotMeta?.label.toLowerCase()}`}
                  </button>
                </>
              )}
            </div>
          )}

          {/* analyze with AI */}
          {!pick && (
            <button onClick={onOpenAnalyze}
              style={{ width:'100%', padding:'13px', borderRadius:12, border:'none',
                background:T.accent, color:'#fff',
                fontSize:14, fontWeight:600, cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginBottom:8 }}>
              <ScanSearch size={15} />
              Analyze photo with AI
            </button>
          )}

          {/* draft editor — always visible when no food is picked from search */}
          {!pick && draft && (
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
                <Plus size={16} /> {editIdx !== null || forceEditMode ? 'Save changes' : `Add to ${slotMeta?.label.toLowerCase()}`}
              </button>
            </div>
          )}

          {/* saved meals — hidden when editing or when in saved meals context */}
          {editIdx === null && slotMeta?.key !== 'saved' && (
            <div style={{ marginBottom:8 }}>
              <div style={{ fontSize:11, color:T.muted, fontWeight:600, letterSpacing:1, marginBottom:8 }}>
                SAVED MEALS
              </div>
              {savedMeals.length === 0 ? (
                <p style={{ fontSize:13, color:T.faint, textAlign:'center', padding:'16px 0' }}>
                  No saved meals yet — analyze a photo or add manually above.
                </p>
              ) : (
                savedMeals
                  .filter(m => !query.trim() || m.n.toLowerCase().includes(query.toLowerCase()))
                  .map(meal => (
                    <button key={meal.id} onClick={() => confirmSavedMeal(meal)}
                      style={{ width:'100%', textAlign:'left', padding:'12px 14px', marginBottom:6,
                        borderRadius:12, border:`1.5px solid ${T.border}`, background:T.surface, cursor:'pointer',
                        display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:500, color:T.ink,
                          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{meal.n}</div>
                        <div style={{ ...NF, fontSize:12, color:T.muted, marginTop:1 }}>
                          {meal.k} kcal · {meal.p}P · {meal.c}C · {meal.f}F
                        </div>
                      </div>
                      {meal.photo && (
                        <img src={meal.photo} alt="" style={{ width:36, height:36, borderRadius:8, objectFit:'cover', flexShrink:0 }} />
                      )}
                      <Plus size={14} color={T.accentSoft} style={{ flexShrink:0 }} />
                    </button>
                  ))
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
