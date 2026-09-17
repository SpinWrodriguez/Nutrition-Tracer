import { useEffect, useState } from 'react';

/* ── build-version check ──
   There is no service worker: the browser (and the iOS home-screen shell) caches the last bundle
   and only picks up a new deploy when its own cache expires. Vite stamps __BUILD_ID__ into the
   bundle and emits dist/version.json with the same id; comparing the two on focus tells us a
   newer deploy exists so the user can reload on demand instead of closing the app twice. */
export function useUpdateCheck(intervalMs = 30 * 60 * 1000) {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV || typeof __BUILD_ID__ === 'undefined') return;
    let stopped = false;
    const check = async () => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const { build } = await res.json();
        if (!stopped && build && build !== __BUILD_ID__) setUpdateAvailable(true);
      } catch { /* offline or blocked — try again next time */ }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    check();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);
    const t = setInterval(check, intervalMs);
    return () => { stopped = true; clearInterval(t); document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('focus', check); };
  }, [intervalMs]);

  return { updateAvailable, reload: () => window.location.reload() };
}
