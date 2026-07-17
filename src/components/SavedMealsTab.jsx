import { useState, useRef } from 'react';
import { X, Wand2, ImagePlus, Pencil, Plus, Search } from 'lucide-react';
import { T, NF, sf, inp, SLOTS } from '../constants.js';
import { generateFoodPhoto, compressImage } from '../api.js';

const SHORT_LABEL = {
  breakfast:      'Breakfast',
  morningSnack:   'Morn snack',
  lunch:          'Lunch',
  afternoonSnack: 'Aftn snack',
  dinner:         'Dinner',
  snack:          'Eve snack',
};

export function SavedMealsTab({ savedMeals, removeSavedMeal, setSavedMealPhoto, addItem, setSlotPhoto, onOpenAddSheet, onEditSavedMeal, onViewAnalysis }) {
  const [generatingId, setGeneratingId] = useState(null);
  const [genErr,       setGenErr]       = useState(null);
  const [added,        setAdded]        = useState({});
  const [filter,       setFilter]       = useState('');
  const [kindFilter,   setKindFilter]   = useState('all'); // 'all' | 'meal' | 'ingredient'
  const fileRefs = useRef({});

  const matches     = m => !filter.trim() || m.n.toLowerCase().includes(filter.trim().toLowerCase());
  const meals       = savedMeals.filter(m => m.kind !== 'ingredient' && matches(m));
  const ingredients = savedMeals.filter(m => m.kind === 'ingredient' && matches(m));
  const showMeals   = kindFilter !== 'ingredient';
  const showIngs    = kindFilter !== 'meal';

  const handleGeneratePhoto = async (meal) => {
    setGeneratingId(meal.id); setGenErr(null);
    try {
      const photo = await generateFoodPhoto(meal.n);
      setSavedMealPhoto(meal.id, photo);
    } catch (err) {
      setGenErr(meal.id);
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
    // Ingredients go in as one serving, with the basis in the name for clarity
    const name = meal.kind === 'ingredient' && meal.per ? `${meal.n} (${meal.per})` : meal.n;
    const item = { custom: true, n: name, k: meal.k, p: meal.p, c: meal.c, f: meal.f };
    if (meal.analysis) item.analysis = meal.analysis;
    if (meal.aiChat) item.aiChat = meal.aiChat;
    addItem(slotKey, item);
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

  return (
    <div style={{ padding: '16px 16px 8px' }}>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ ...NF, fontSize: 11, letterSpacing: 1.5, color: T.gold, fontWeight: 700 }}>
          LIBRARY — {savedMeals.length}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => onOpenAddSheet()}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 10,
              border: `1.5px solid ${T.accent}`, background: 'transparent',
              cursor: 'pointer', fontSize: 12, fontWeight: 600, color: T.accent, ...sf }}>
            <Plus size={13} /> Meal
          </button>
          <button onClick={() => onOpenAddSheet('ingredient')}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 10,
              border: `1.5px solid ${T.gold}`, background: 'transparent',
              cursor: 'pointer', fontSize: 12, fontWeight: 600, color: T.gold, ...sf }}>
            <Plus size={13} /> Ingredient
          </button>
        </div>
      </div>

      {/* search + type filter */}
      {savedMeals.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <Search size={15} color={T.faint} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} />
            <input value={filter} onChange={e => setFilter(e.target.value)}
              placeholder="Filter by name…"
              style={{ ...inp, paddingLeft: 36, fontSize: 14 }} />
            {filter && (
              <button onClick={() => setFilter('')}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
                <X size={14} color={T.faint} />
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { key: 'all',        label: `All (${meals.length + ingredients.length})` },
              { key: 'meal',       label: `Meals (${meals.length})` },
              { key: 'ingredient', label: `Ingredients (${ingredients.length})` },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setKindFilter(key)}
                style={{ padding: '6px 12px', borderRadius: 99, cursor: 'pointer', fontSize: 12, fontWeight: 600, ...sf,
                  border: `1.5px solid ${kindFilter === key ? T.accent : T.border}`,
                  background: kindFilter === key ? T.accentLight : 'transparent',
                  color: kindFilter === key ? T.accent : T.muted }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {savedMeals.length === 0 && (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🍽️</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.ink, marginBottom: 8 }}>No saved meals yet</div>
          <div style={{ fontSize: 14, color: T.muted, lineHeight: 1.5 }}>
            Tap "Add meal" to search foods, analyze a photo with AI, or enter macros manually.
          </div>
        </div>
      )}

      {showMeals && meals.length > 0 && kindFilter === 'all' && (
        <div style={{ ...NF, fontSize: 11, letterSpacing: 1.5, color: T.gold, fontWeight: 700, marginBottom: 12 }}>
          MEALS — {meals.length}
        </div>
      )}
      {showMeals && meals.map(renderCard)}

      {/* ingredients — same cards, own section; used by the AI as personal ground truth */}
      {showIngs && ingredients.length > 0 && kindFilter === 'all' && (
        <div style={{ ...NF, fontSize: 11, letterSpacing: 1.5, color: T.gold, fontWeight: 700, margin: '20px 0 12px' }}>
          INGREDIENTS — {ingredients.length}
        </div>
      )}
      {showIngs && ingredients.map(renderCard)}

      {savedMeals.length > 0 && (showMeals ? meals.length : 0) + (showIngs ? ingredients.length : 0) === 0 && (
        <p style={{ fontSize: 13, color: T.faint, textAlign: 'center', padding: '32px 0' }}>
          Nothing matches "{filter}".
        </p>
      )}
    </div>
  );

  function renderCard(meal) {
    const selectedSlots = added[meal.id] || new Set();
    const isGenerating = generatingId === meal.id;

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

            {/* photo header — mirrors MealCard exactly */}
            {meal.photo ? (
              <div style={{ position: 'relative', borderTopLeftRadius: 14, borderTopRightRadius: 14, overflow: 'hidden' }}>
                <img src={meal.photo} alt={meal.n}
                  style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
                {isGenerating ? (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Wand2 size={14} color={T.gold} />
                    <span style={{ fontSize: 12, color: T.gold, fontWeight: 600 }}>Generating…</span>
                  </div>
                ) : (
                  <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 5 }}>
                    <button onClick={() => handleGeneratePhoto(meal)}
                      style={{ width: 26, height: 26, borderRadius: '50%', border: 'none',
                        background: 'rgba(0,0,0,0.5)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Wand2 size={13} color={T.gold} />
                    </button>
                    <button onClick={() => fileRefs.current[meal.id]?.click()}
                      style={{ width: 26, height: 26, borderRadius: '50%', border: 'none',
                        background: 'rgba(0,0,0,0.5)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ImagePlus size={13} color="#fff" />
                    </button>
                  </div>
                )}
              </div>
            ) : isGenerating ? (
              <div style={{ height: 70, background: T.goldLight, borderTopLeftRadius: 14, borderTopRightRadius: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Wand2 size={15} color={T.gold} />
                <span style={{ fontSize: 12, color: T.gold, fontWeight: 600 }}>Generating photo…</span>
              </div>
            ) : (
              <div style={{ borderTopLeftRadius: 14, borderTopRightRadius: 14, display: 'flex',
                alignItems: 'center', justifyContent: 'flex-end', gap: 6,
                padding: '8px 12px', borderBottom: `1px solid ${T.border}` }}>
                <button onClick={() => handleGeneratePhoto(meal)}
                  style={{ width: 30, height: 30, borderRadius: '50%', border: `1.5px solid ${T.gold}`,
                    background: T.goldLight, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wand2 size={14} color={T.gold} />
                </button>
                <button onClick={() => fileRefs.current[meal.id]?.click()}
                  style={{ width: 30, height: 30, borderRadius: '50%', border: `1.5px solid ${T.border}`,
                    background: 'transparent', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ImagePlus size={14} color={T.muted} />
                </button>
                {genErr === meal.id && (
                  <span style={{ fontSize: 11, color: T.over }}>Failed</span>
                )}
              </div>
            )}

            {/* info row */}
            <div style={{ padding: '12px 14px 10px', display: 'flex', alignItems: 'flex-start',
              justifyContent: 'space-between', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div onClick={() => meal.analysis && onViewAnalysis && onViewAnalysis(meal)}
                  style={{ fontSize: 15, fontWeight: 700, color: T.ink, marginBottom: 4,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    cursor: meal.analysis ? 'pointer' : 'default' }}>{meal.n}</div>
                <div style={{ ...NF, fontSize: 12, color: T.muted }}>
                  {meal.kind === 'ingredient' && meal.per ? `per ${meal.per} — ` : ''}{meal.k} kcal · {meal.p}P · {meal.c}C · {meal.f}F
                </div>
              </div>
              <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                <button onClick={() => onEditSavedMeal(meal)}
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

            {/* add-to-slot strip */}
            {(
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
  }
}
