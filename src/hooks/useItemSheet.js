import { useState, useRef } from 'react';
import { SLOTS, toArr, one, searchAFCD } from '../constants.js';
import {
  searchUSDA, fetchUSDAfoodDetail,
  aiEstimate, aiEstimateFromImage,
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
  const [usdaHits,       setUsdaHits]       = useState([]);
  const [usdaLoading,    setUsdaLoading]    = useState(false);
  const [fetchingDetail, setFetchingDetail] = useState(false);
  const [imgPreview,     setImgPreview]     = useState(null);
  const [generatingSlot, setGeneratingSlot] = useState(null);
  const [photoErr,       setPhotoErr]       = useState(null);
  const usdaTimer = useRef(null);
  const camRef    = useRef(null);

  const slotMeta    = SLOTS.find(s => s.key === open);
  const unit        = isLiquid ? 'ml' : 'g';
  const scaledDraft = pick ? (() => {
    const g = Math.max(1, parseFloat(grams) || 150), sc = g / 100;
    return { custom:true, n:pick.name.slice(0, 28),
      k:Math.round(pick.kcal*sc), p:Math.round(pick.p*sc), c:Math.round(pick.c*sc), f:Math.round(pick.f*sc) };
  })() : null;

  const reset = () => {
    setQuery(''); setHits([]); setUsdaHits([]); setUsdaLoading(false);
    setFetchingDetail(false); setImgPreview(null); setPick(null);
    setGrams('150'); setDraft(null); setQty('1'); setAiErr(null); setBusy(false);
    setIsLiquid(false); setEditIdx(null);
    if (usdaTimer.current) clearTimeout(usdaTimer.current);
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
      setDraft({ custom:true, n:o.n, k:o.k, p:o.p, c:o.c, f:o.f });
    }
  };

  const closeSheet = () => { setOpen(null); reset(); };

  const onQuery = val => {
    setQuery(val); setAiErr(null); setPick(null); setQty('1');
    setHits(val.trim().length >= 2 ? searchAFCD(val) : []);
    setUsdaHits([]);
    if (usdaTimer.current) clearTimeout(usdaTimer.current);
    if (val.trim().length >= 2) {
      setUsdaLoading(true);
      usdaTimer.current = setTimeout(async () => {
        try { setUsdaHits(await searchUSDA(val)); } catch {}
        setUsdaLoading(false);
      }, 500);
    } else {
      setUsdaLoading(false);
    }
  };

  const handlePickAFCD = item => { setPick(item); setIsLiquid(false); };

  const handlePickUSDA = async item => {
    setFetchingDetail(true);
    try {
      const detail = await fetchUSDAfoodDetail(item.fdcId);
      setPick(detail); setIsLiquid(detail.isLiquid || false);
      if (detail.servingSize) setGrams(String(detail.servingSize));
    } catch {
      setPick(item); setIsLiquid(item.isLiquid || false);
      if (item.servingSize) setGrams(String(item.servingSize));
    }
    setFetchingDetail(false);
  };

  const clearPick = () => { setPick(null); setIsLiquid(false); setHits(searchAFCD(query)); };

  const runAI = async () => {
    if (!query.trim()) return;
    setBusy(true); setAiErr(null); setQty('1');
    try { setDraft(await aiEstimate(query)); }
    catch { setAiErr("Couldn't estimate — edit numbers manually."); setDraft({ custom:true, n:query.slice(0,28)||'Custom', k:0,p:0,c:0,f:0 }); }
    setBusy(false);
  };

  const handleImageCapture = async file => {
    const reader = new FileReader();
    reader.onload = async ev => {
      const raw = ev.target.result;
      setImgPreview(raw); setDraft(null); setAiErr(null); setBusy(true); setQty('1');
      try { setDraft(await aiEstimateFromImage(raw.split(',')[1], file.type)); }
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
      _servingG:     Math.max(1, parseFloat(grams) || 100),
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
      k: Math.round(draft.k * q),
      p: Math.round(draft.p * q),
      c: Math.round(draft.c * q),
      f: Math.round(draft.f * q),
    };
    const photo = imgPreview ? await compressImage(imgPreview) : null;
    if (!onConfirmItem && saveMeal) saveMeal({ n: final.n, k: final.k, p: final.p, c: final.c, f: final.f }, photo);
    confirmItem(open, final, photo);
  };

  const confirmCatalog = id => confirmItem(open, id);

  const confirmSavedMeal = meal => confirmItem(
    open,
    { custom:true, n:meal.n, k:meal.k, p:meal.p, c:meal.c, f:meal.f },
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
    usdaHits, usdaLoading, fetchingDetail,
    imgPreview, setImgPreview, isLiquid, setIsLiquid,
    generatingSlot, photoErr, setPhotoErr,
    camRef,
    savedMeals: savedMeals || [],
    openSheet, closeSheet, onQuery,
    handlePickAFCD, handlePickUSDA, clearPick,
    runAI, handleImageCapture,
    confirmScaled, confirmDraft, confirmSavedMeal,
    handleGeneratePhoto,
  };
}
