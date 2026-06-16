import { useState } from 'react';
import { X, Wand2 } from 'lucide-react';
import { T, NF, sf, SLOTS } from '../constants.js';
import { generateFoodPhoto } from '../api.js';

const SHORT_LABEL = {
  breakfast:      'Breakfast',
  morningSnack:   'Morn snack',
  lunch:          'Lunch',
  afternoonSnack: 'Aftn snack',
  dinner:         'Dinner',
  snack:          'Eve snack',
};

export function SavedMealsTab({ savedMeals, removeSavedMeal, setSavedMealPhoto, addItem, setSlotPhoto }) {
  const [generatingId, setGeneratingId] = useState(null);
  const [genErr,       setGenErr]       = useState(null);
  // { [mealId]: Set<slotKey> } — tracks all selected slots per meal
  const [added, setAdded] = useState({});

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

  const handleAddToSlot = (meal, slotKey) => {
    addItem(slotKey, { custom:true, n:meal.n, k:meal.k, p:meal.p, c:meal.c, f:meal.f });
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

  if (savedMeals.length === 0) {
    return (
      <div style={{ padding:'48px 24px', textAlign:'center' }}>
        <div style={{ fontSize:36, marginBottom:12 }}>🍽️</div>
        <div style={{ fontSize:16, fontWeight:700, color:T.ink, marginBottom:8 }}>No saved meals yet</div>
        <div style={{ fontSize:14, color:T.muted, lineHeight:1.5 }}>
          Add a meal using "Estimate macros with AI" and it'll be saved here automatically for future use.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding:'16px 16px 8px' }}>
      <div style={{ ...NF, fontSize:11, letterSpacing:1.5, color:T.gold, fontWeight:700, marginBottom:12 }}>
        SAVED MEALS — {savedMeals.length}
      </div>

      {savedMeals.map(meal => {
        const selectedSlots = added[meal.id] || new Set();
        return (
          <div key={meal.id} style={{ background:T.surface, borderRadius:18, marginBottom:10,
            boxShadow:'0 1px 6px rgba(0,0,0,0.05)', overflow:'hidden' }}>

            {/* photo area */}
            {meal.photo ? (
              <div style={{ position:'relative' }}>
                <img src={meal.photo} alt={meal.n}
                  style={{ width:'100%', height:120, objectFit:'cover', display:'block' }} />
              </div>
            ) : (
              <div style={{ height:72, background:T.goldLight, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                {generatingId === meal.id ? (
                  <>
                    <Wand2 size={14} color={T.gold} />
                    <span style={{ fontSize:12, color:T.gold, fontWeight:600 }}>Generating…</span>
                  </>
                ) : (
                  <button onClick={() => handleGeneratePhoto(meal)}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:10,
                      border:`1.5px solid ${T.gold}`, background:'transparent', cursor:'pointer',
                      fontSize:12, fontWeight:600, color:T.gold, ...sf }}>
                    <Wand2 size={13} /> Generate photo
                  </button>
                )}
                {genErr === meal.id && <span style={{ fontSize:11, color:T.over }}>Failed — try again</span>}
              </div>
            )}

            {/* info row */}
            <div style={{ padding:'12px 14px 10px', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:15, fontWeight:700, color:T.ink, marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{meal.n}</div>
                <div style={{ ...NF, fontSize:12, color:T.muted }}>{meal.k} kcal · {meal.p}P · {meal.c}C · {meal.f}F</div>
              </div>
              <button onClick={() => removeSavedMeal(meal.id)}
                style={{ background:'none', border:'none', cursor:'pointer', padding:4, flexShrink:0, display:'flex', alignItems:'center' }}>
                <X size={15} color={T.faint} />
              </button>
            </div>

            {/* add-to-slot buttons */}
            <div style={{ display:'flex', borderTop:`1px solid ${T.border}` }}>
              {SLOTS.map((s, i) => {
                const isAdded = selectedSlots.has(s.key);
                return (
                  <button key={s.key} onClick={() => handleAddToSlot(meal, s.key)}
                    style={{ flex:1, padding:'8px 3px', border:'none',
                      background: isAdded ? 'rgba(42,122,80,0.12)' : 'transparent',
                      borderLeft: i > 0 ? `1px solid ${T.border}` : 'none',
                      borderBottom: isAdded ? `2px solid ${T.ok}` : '2px solid transparent',
                      cursor:'pointer', color: isAdded ? T.ok : T.accentSoft,
                      display:'flex', flexDirection:'column', alignItems:'center', gap:2,
                      transition:'background 0.15s, color 0.15s' }}>
                    <span style={{ fontSize:9, fontWeight: isAdded ? 800 : 700, textAlign:'center',
                      lineHeight:1.3, fontFamily:'ui-sans-serif,system-ui,sans-serif' }}>
                      {SHORT_LABEL[s.key] || s.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
