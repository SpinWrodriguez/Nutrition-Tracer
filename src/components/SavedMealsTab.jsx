import { useState, useRef } from 'react';
import { X, Wand2, ImagePlus, Pencil, Plus } from 'lucide-react';
import { T, NF, sf, SLOTS, inp } from '../constants.js';
import { generateFoodPhoto, compressImage } from '../api.js';

const SHORT_LABEL = {
  breakfast:      'Breakfast',
  morningSnack:   'Morn snack',
  lunch:          'Lunch',
  afternoonSnack: 'Aftn snack',
  dinner:         'Dinner',
  snack:          'Eve snack',
};

export function SavedMealsTab({ savedMeals, removeSavedMeal, setSavedMealPhoto, updateSavedMeal, createSavedMeal, addItem, setSlotPhoto }) {
  const [generatingId, setGeneratingId] = useState(null);
  const [genErr,       setGenErr]       = useState(null);
  const [added,        setAdded]        = useState({});
  const [editingId,    setEditingId]    = useState(null);
  const [editDraft,    setEditDraft]    = useState(null);
  const [showAdd,      setShowAdd]      = useState(false);
  const [newMeal,      setNewMeal]      = useState({ n: '', k: '', p: '', c: '', f: '' });
  const fileRefs   = useRef({});
  const newFileRef = useRef(null);

  const handleGeneratePhoto = async (meal) => {
    setGeneratingId(meal.id); setGenErr(null);
    try {
      const photo = await generateFoodPhoto(meal.n);
      setSavedMealPhoto(meal.id, photo);
    } catch (err) {
      setGenErr(meal.id);
      console.error(err);
    }
    setGeneratingId(null);
  };

  const handleUploadPhoto = (meal, file) => {
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const compressed = await compressImage(ev.target.result, 600, 0.75);
      setSavedMealPhoto(meal.id, compressed);
    };
    reader.readAsDataURL(file);
  };

  const handleAddToSlot = (meal, slotKey) => {
    addItem(slotKey, { custom: true, n: meal.n, k: meal.k, p: meal.p, c: meal.c, f: meal.f });
    if (meal.photo && setSlotPhoto) setSlotPhoto(slotKey, meal.photo);
    setAdded(prev => {
      const cur = new Set(prev[meal.id] || []);
      cur.add(slotKey);
      return { ...prev, [meal.id]: cur };
    });
    setTimeout(() => setAdded(prev => {
      const cur = new Set(prev[meal.id] || []);
      cur.delete(slotKey);
      return { ...prev, [meal.id]: cur };
    }), 600);
  };

  const startEdit = (meal) => {
    setEditingId(meal.id);
    setEditDraft({ n: meal.n, k: String(meal.k), p: String(meal.p), c: String(meal.c), f: String(meal.f) });
  };

  const confirmEdit = (id) => {
    if (!editDraft) return;
    updateSavedMeal(id, {
      n: editDraft.n || 'Custom meal',
      k: Math.max(0, Math.round(+editDraft.k || 0)),
      p: Math.max(0, Math.round(+editDraft.p || 0)),
      c: Math.max(0, Math.round(+editDraft.c || 0)),
      f: Math.max(0, Math.round(+editDraft.f || 0)),
    });
    setEditingId(null);
    setEditDraft(null);
  };

  const handleCreateMeal = () => {
    if (!newMeal.n.trim()) return;
    createSavedMeal({
      n: newMeal.n.trim(),
      k: Math.max(0, Math.round(+newMeal.k || 0)),
      p: Math.max(0, Math.round(+newMeal.p || 0)),
      c: Math.max(0, Math.round(+newMeal.c || 0)),
      f: Math.max(0, Math.round(+newMeal.f || 0)),
    });
    setNewMeal({ n: '', k: '', p: '', c: '', f: '' });
    setShowAdd(false);
  };

  return (
    <div style={{ padding: '16px 16px 8px' }}>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ ...NF, fontSize: 11, letterSpacing: 1.5, color: T.gold, fontWeight: 700 }}>
          SAVED MEALS — {savedMeals.length}
        </div>
        <button onClick={() => setShowAdd(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 10,
            border: `1.5px solid ${T.accent}`, background: showAdd ? T.accent : 'transparent',
            cursor: 'pointer', fontSize: 12, fontWeight: 600,
            color: showAdd ? '#fff' : T.accent, ...sf }}>
          <Plus size={13} /> Add meal
        </button>
      </div>

      {/* add new meal form */}
      {showAdd && (
        <div style={{ background: T.surface, borderRadius: 16, padding: '14px', marginBottom: 12,
          boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
          <input ref={newFileRef} type="file" accept="image/*" style={{ display: 'none' }} />
          <input value={newMeal.n} onChange={e => setNewMeal(m => ({ ...m, n: e.target.value }))}
            placeholder="Meal name"
            style={{ ...inp, fontWeight: 700, fontSize: 14, marginBottom: 8 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
            {[['k','kcal'],['p','Prot'],['c','Carbs'],['f','Fat']].map(([key, lbl]) => (
              <div key={key}>
                <div style={{ fontSize: 10, color: T.muted, textAlign: 'center', marginBottom: 3 }}>{lbl}</div>
                <input value={newMeal[key]}
                  onChange={e => { if (/^\d*\.?\d*$/.test(e.target.value)) setNewMeal(m => ({ ...m, [key]: e.target.value })); }}
                  inputMode="decimal" placeholder="0"
                  style={{ ...inp, textAlign: 'center', padding: '7px 4px', fontSize: 13 }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setShowAdd(false); setNewMeal({ n: '', k: '', p: '', c: '', f: '' }); }}
              style={{ flex: 1, padding: '9px', borderRadius: 10, border: `1px solid ${T.border}`,
                background: 'transparent', cursor: 'pointer', fontSize: 13, color: T.muted, ...sf }}>
              Cancel
            </button>
            <button onClick={handleCreateMeal} disabled={!newMeal.n.trim()}
              style={{ flex: 2, padding: '9px', borderRadius: 10, border: 'none',
                background: newMeal.n.trim() ? T.ok : T.border, color: '#fff',
                fontSize: 13, fontWeight: 600, cursor: newMeal.n.trim() ? 'pointer' : 'default', ...sf }}>
              Save meal
            </button>
          </div>
        </div>
      )}

      {savedMeals.length === 0 && !showAdd && (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🍽️</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.ink, marginBottom: 8 }}>No saved meals yet</div>
          <div style={{ fontSize: 14, color: T.muted, lineHeight: 1.5 }}>
            Tap "Add meal" above, or analyze food with AI — it saves automatically.
          </div>
        </div>
      )}

      {savedMeals.map(meal => {
        const selectedSlots = added[meal.id] || new Set();
        const isEditing     = editingId === meal.id;
        const isGenerating  = generatingId === meal.id;

        return (
          <div key={meal.id} style={{ background: T.surface, borderRadius: 18, marginBottom: 10,
            boxShadow: '0 1px 6px rgba(0,0,0,0.05)', overflow: 'hidden' }}>

            {/* hidden file input per meal */}
            <input
              ref={el => { fileRefs.current[meal.id] = el; }}
              type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => {
                if (e.target.files[0]) { handleUploadPhoto(meal, e.target.files[0]); e.target.value = ''; }
              }}
            />

            {/* photo area */}
            {meal.photo ? (
              <div style={{ position: 'relative' }}>
                <img src={meal.photo} alt={meal.n}
                  style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
                {isGenerating && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Wand2 size={14} color={T.gold} />
                    <span style={{ fontSize: 12, color: T.gold, fontWeight: 600 }}>Generating…</span>
                  </div>
                )}
                {!isGenerating && (
                  <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
                    <button onClick={() => handleGeneratePhoto(meal)}
                      style={{ width: 30, height: 30, borderRadius: '50%', border: 'none',
                        background: 'rgba(0,0,0,0.5)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Wand2 size={13} color={T.gold} />
                    </button>
                    <button onClick={() => fileRefs.current[meal.id]?.click()}
                      style={{ width: 30, height: 30, borderRadius: '50%', border: 'none',
                        background: 'rgba(0,0,0,0.5)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ImagePlus size={13} color="#fff" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ height: 72, background: T.goldLight, display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 8 }}>
                {isGenerating ? (
                  <>
                    <Wand2 size={14} color={T.gold} />
                    <span style={{ fontSize: 12, color: T.gold, fontWeight: 600 }}>Generating…</span>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleGeneratePhoto(meal)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 10,
                        border: `1.5px solid ${T.gold}`, background: 'transparent', cursor: 'pointer',
                        fontSize: 12, fontWeight: 600, color: T.gold, ...sf }}>
                      <Wand2 size={13} /> Generate
                    </button>
                    <button onClick={() => fileRefs.current[meal.id]?.click()}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 10,
                        border: `1.5px solid ${T.border}`, background: 'transparent', cursor: 'pointer',
                        fontSize: 12, fontWeight: 600, color: T.muted, ...sf }}>
                      <ImagePlus size={13} /> Upload
                    </button>
                  </>
                )}
                {genErr === meal.id && <span style={{ fontSize: 11, color: T.over }}>Failed — try again</span>}
              </div>
            )}

            {/* info / edit area */}
            {isEditing ? (
              <div style={{ padding: '12px 14px 10px' }}>
                <input value={editDraft.n} onChange={e => setEditDraft(d => ({ ...d, n: e.target.value }))}
                  placeholder="Meal name"
                  style={{ ...inp, fontWeight: 700, fontSize: 14, marginBottom: 8 }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, marginBottom: 8 }}>
                  {[['k','kcal'],['p','Prot'],['c','Carbs'],['f','Fat']].map(([key, lbl]) => (
                    <div key={key}>
                      <div style={{ fontSize: 10, color: T.muted, textAlign: 'center', marginBottom: 3 }}>{lbl}</div>
                      <input value={editDraft[key]}
                        onChange={e => { if (/^\d*\.?\d*$/.test(e.target.value)) setEditDraft(d => ({ ...d, [key]: e.target.value })); }}
                        inputMode="decimal"
                        style={{ ...inp, textAlign: 'center', padding: '7px 4px', fontSize: 13 }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setEditingId(null); setEditDraft(null); }}
                    style={{ flex: 1, padding: '8px', borderRadius: 10, border: `1px solid ${T.border}`,
                      background: 'transparent', cursor: 'pointer', fontSize: 12, color: T.muted, ...sf }}>
                    Cancel
                  </button>
                  <button onClick={() => confirmEdit(meal.id)}
                    style={{ flex: 2, padding: '8px', borderRadius: 10, border: 'none',
                      background: T.ok, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', ...sf }}>
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '12px 14px 10px', display: 'flex', alignItems: 'flex-start',
                justifyContent: 'space-between', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, marginBottom: 4,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meal.n}</div>
                  <div style={{ ...NF, fontSize: 12, color: T.muted }}>{meal.k} kcal · {meal.p}P · {meal.c}C · {meal.f}F</div>
                </div>
                <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                  <button onClick={() => startEdit(meal)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                      display: 'flex', alignItems: 'center' }}>
                    <Pencil size={14} color={T.muted} />
                  </button>
                  <button onClick={() => removeSavedMeal(meal.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                      display: 'flex', alignItems: 'center' }}>
                    <X size={15} color={T.faint} />
                  </button>
                </div>
              </div>
            )}

            {/* add-to-slot strip */}
            {!isEditing && (
              <div style={{ display: 'flex', borderTop: `1px solid ${T.border}` }}>
                {SLOTS.map((s, i) => {
                  const isAdded = selectedSlots.has(s.key);
                  return (
                    <button key={s.key} onClick={() => handleAddToSlot(meal, s.key)}
                      style={{ flex: 1, padding: '8px 3px', border: 'none',
                        background: isAdded ? 'rgba(42,122,80,0.12)' : 'transparent',
                        borderLeft: i > 0 ? `1px solid ${T.border}` : 'none',
                        borderBottom: isAdded ? `2px solid ${T.ok}` : '2px solid transparent',
                        cursor: 'pointer', color: isAdded ? T.ok : T.accentSoft,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                        transition: 'background 0.15s, color 0.15s' }}>
                      <span style={{ fontSize: 9, fontWeight: isAdded ? 800 : 700, textAlign: 'center',
                        lineHeight: 1.3, fontFamily: 'ui-sans-serif,system-ui,sans-serif' }}>
                        {SHORT_LABEL[s.key] || s.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
