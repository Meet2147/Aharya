import { useEffect, useState } from 'react';

/** How long saved server data is trusted before it's fetched again. */
export const REFRESH_MS = 30 * 60 * 1000;

const PREFIX = 'aharya.cache.';
type Entry<T> = { at: number; data: T };

// No localStorage while the web build is statically rendered, and a corrupt entry is just a miss
export function readCache<T>(key: string): Entry<T> | null {
  try {
    return typeof localStorage === 'undefined' ? null : JSON.parse(localStorage.getItem(PREFIX + key) ?? 'null');
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, data: T) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), data }));
  } catch {}
}

/** Forget everything the app saved (data and the latest report), so the next account doesn't see it. */
export function clearCache() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith('aharya.')) localStorage.removeItem(k);
    }
  } catch {}
}

export const isFresh = (e: Entry<unknown> | null, maxAge = REFRESH_MS) => !!e && Date.now() - e.at < maxAge;

/**
 * Shows the saved copy straight away, fetches only once it's older than maxAge,
 * and refetches on that timer while the screen stays open. key = null: nothing to load yet.
 */
export function useCached<T>(key: string | null, fetcher: () => Promise<T>, maxAge = REFRESH_MS) {
  const [state, setState] = useState<{ key: string | null; data?: T }>(() => ({
    key,
    data: key ? readCache<T>(key)?.data : undefined,
  }));
  useEffect(() => {
    if (!key) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout>;
    function load() {
      const hit = readCache<T>(key!);
      // Fresh: already on screen (read during render), so just wait for it to go stale
      if (hit && isFresh(hit, maxAge)) {
        timer = setTimeout(load, maxAge - (Date.now() - hit.at));
        return;
      }
      fetcher()
        .then((data) => {
          writeCache(key!, data);
          if (live) setState({ key, data });
        })
        .catch(() => {}) // offline: keep showing the saved copy
        .finally(() => {
          if (live) timer = setTimeout(load, maxAge);
        });
    }
    load();
    return () => {
      live = false;
      clearTimeout(timer);
    };
    // fetcher is a new closure each render; the key already names what it fetches
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, maxAge]);
  return state.key === key ? state.data : key ? readCache<T>(key)?.data : undefined;
}
