import { useState, useRef } from 'react';
import { SLOTS, toArr, one } from '../constants.js';
import {
  searchFatSecret, fetchFatSecretFoodDetail,
  groundedEstimate,
  generateFoodPhoto, compressImage,
} from '../api.js';

export function useItemSheet({ sel, day, addItem, replaceItem, setSlotPhoto, saveMeal, syncPhotoToMealLib, savedMeals, onConfirmItem }) {
  const [open,           setOpen]           = useState(null);
  const [editIdx,        setEditIdx]        = useState(null);
  const [query,          setQuery]          = useState('');
  const [hits,           setHits]           = useState([]);
  const [pick,           setPick]           = useState(null);
  const [grams,          setGrams]          = useState('150');
  const [isLiquid,       setIsLiquid]       = useState(false);
  const [draft,          setDraft]          = useState(null);
  const [qty,            setQty]            = useState('1');
  const [busy,           setBusy]           = useState(false);
  const [aiErr,          setAiErr]          = useState(null);
  const [fatSecretHits,  setFatSecretHits]  = useState([]);
  const [fatSecretLoading, setFatSecretLoading] = useState(false);
  const [fetchingDetail, setFetchingDetail] = useState(false);
  const [imgPreview,     setImgPreview]     = useState(null);
  const [generatingSlot, setGeneratingSlot] = useState(null);
  const [photoErr,       setPhotoErr]       = useState(null);
  const fatSecretTimer = useRef(null);
  const camRef    = useRef(null);

  const slotMeta    = SLOTS.find(s => s.key === open);
  const unit        = isLiquid ? 'ml' : 'g';
  const scaledDraft = pick ? (() => {
    const g = parseFloat(grams);
    if (!Number.isFinite(g) || g <= 0) return null;
    const sc = g / 100;
    return { custom:true, n:pick.name.slice(0, 28),
      k:Math.round(pick.kcal*sc), p:Math.round(pick.p*sc), c:Math.round(pick.c*sc), f:Math.round(pick.f*sc) };
  })() : null;

  const reset = () => {
    setQuery(''); setHits([]); setFatSecretHits([]); setFatSecretLoading(false);
    setFetchingDetail(false); setImgPreview(null); setPick(null);
    setGrams('150'); setDraft(null); setQty('1'); setAiErr(null); setBusy(false);
    setIsLiquid(false); setEditIdx(null);
    if (fatSecretTimer.current) clearTimeout(fatSecretTimer.current);
  };

  const confirmItem = (slot, val, photo = null) => {
    if (onConfirmItem) {
      onConfirmItem(val, photo);
    } else {
      if (editIdx !== null) { replaceItem(slot, editIdx, val); }
      else { addItem(slot, val); }
      if (photo) setSlotPhoto(slot, photo);
    }
    reset(); setOpen(null);
  };

  /* ── public handlers ── */
  const openSheet = (slot, editItemIdx = null, initialDraft = null) => {
    reset();
    setOpen(slot);
    setDraft(initialDraft || { custom: true, n: '', k: 0, p: 0, c: 0, f: 0 });
    if (editItemIdx === null) return;
    setEditIdx(editItemIdx);
    const items = toArr(sel[slot]);
    const o = one(items[editItemIdx]);
    if (!o || o.skip) return;
    if (o._base) {
      setPick({ name: o.n, kcal: o._base.kcal, p: o._base.p, c: o._base.c, f: o._base.f,
        servingSize: o._servingSize, servingLabel: o._servingLabel });
      setGrams(String(o._servingG || 100));
      setIsLiquid(o._isLiquid || false);
    } else {
      setDraft({ custom:true, n:o.n, k:o.k, p:o.p, c:o.c, f:o.f,
        ...(o.analysis ? { analysis: o.analysis } : {}), ...(o.aiChat ? { aiChat: o.aiChat } : {}) });
    }
  };

  const closeSheet = () => { setOpen(null); reset(); };

  const onQuery = val => {
    setQuery(val); setAiErr(null); setPick(null); setQty('1');
    setHits([]);
    setFatSecretHits([]);
    if (fatSecretTimer.current) clearTimeout(fatSecretTimer.current);
    if (val.trim().length >= 2) {
      setFatSecretLoading(true);
      fatSecretTimer.current = setTimeout(async () => {
        try { setFatSecretHits(await searchFatSecret(val)); } catch {}
        setFatSecretLoading(false);
      }, 500);
    } else {
      setFatSecretLoading(false);
    }
  };

  const handlePickFatSecret = async item => {
    setFetchingDetail(true);
    try {
      const detail = await fetchFatSecretFoodDetail(item.foodId);
      setPick(detail); setIsLiquid(detail.isLiquid || false);
      if (detail.servingSize) setGrams(String(detail.servingSize));
    } catch {
      setPick(item); setIsLiquid(item.isLiquid || false);
      if (item.servingSize) setGrams(String(item.servingSize));
    }
    setFetchingDetail(false);
  };

  const clearPick = () => { setPick(null); setIsLiquid(false); };

  const runAI = async () => {
    if (!query.trim()) return;
    setBusy(true); setAiErr(null); setQty('1');
    try { setDraft(await groundedEstimate(query)); }
    catch { setAiErr("Couldn't estimate — edit numbers manually."); setDraft({ custom:true, n:query.slice(0,28)||'Custom', k:0,p:0,c:0,f:0 }); }
    setBusy(false);
  };

  const handleImageCapture = async file => {
    const reader = new FileReader();
    reader.onload = async ev => {
      const raw = ev.target.result;
      setImgPreview(raw); setDraft(null); setAiErr(null); setBusy(true); setQty('1');
      try { setDraft(await groundedEstimate(null, [raw])); }
      catch { setAiErr("Couldn't estimate — edit numbers manually."); setDraft({ custom:true, n:'Photo meal', k:0, p:0, c:0, f:0 }); }
      setBusy(false);
    };
    reader.readAsDataURL(file);
  };

  const confirmScaled = () => {
    if (!scaledDraft || !pick) return;
    confirmItem(open, {
      ...scaledDraft,
      _base:         { kcal: pick.kcal, p: pick.p, c: pick.c, f: pick.f },
      _servingG:     Math.max(0.1, parseFloat(grams) || 100),
      _isLiquid:     isLiquid,
      _servingSize:  pick.servingSize,
      _servingLabel: pick.servingLabel,
    });
  };

  const confirmDraft = async () => {
    if (!draft) return;
    const q = Math.max(0.1, parseFloat(qty) || 1);
    const final = {
      ...draft,
      k: Math.max(0, Math.round((+draft.k || 0) * q)),
      p: Math.max(0, Math.round((+draft.p || 0) * q)),
      c: Math.max(0, Math.round((+draft.c || 0) * q)),
      f: Math.max(0, Math.round((+draft.f || 0) * q)),
    };
    const photo = imgPreview ? await compressImage(imgPreview) : null;
    confirmItem(open, final, photo);
  };

  const confirmCatalog = id => confirmItem(open, id);

  const confirmSavedMeal = meal => confirmItem(
    open,
    { custom:true, n:meal.n, k:meal.k, p:meal.p, c:meal.c, f:meal.f,
      ...(meal.analysis ? { analysis: meal.analysis } : {}), ...(meal.aiChat ? { aiChat: meal.aiChat } : {}) },
    meal.photo || null,
  );

  const handleGeneratePhoto = async slotKey => {
    const items = toArr(sel[slotKey]);
    const realItems = items.filter(v => one(v) && !one(v)?.skip);
    const names = realItems.map(v => one(v).n).join(', ');
    if (!names || generatingSlot) return;
    setGeneratingSlot(slotKey); setPhotoErr(null);
    try {
      const photo = await generateFoodPhoto(names);
      setSlotPhoto(slotKey, photo);
      // Only sync to saved meals library when the slot has exactly one item
      if (realItems.length === 1 && syncPhotoToMealLib) syncPhotoToMealLib(slotKey, photo);
    } catch (err) { setPhotoErr(err.message); console.error('Photo generation failed:', err); }
    setGeneratingSlot(null);
  };

  return {
    open, slotMeta, editIdx,
    query, hits, pick, grams, setGrams, unit, scaledDraft,
    draft, setDraft, qty, setQty, busy, aiErr,
    fatSecretHits, fatSecretLoading, fetchingDetail,
    imgPreview, setImgPreview, isLiquid, setIsLiquid,
    generatingSlot, photoErr, setPhotoErr,
    camRef,
    savedMeals: savedMeals || [],
    openSheet, closeSheet, onQuery,
    handlePickFatSecret, clearPick,
    runAI, handleImageCapture,
    confirmScaled, confirmDraft, confirmSavedMeal,
    handleGeneratePhoto,
  };
}
