import { useEffect, useState } from 'react';

import { getAssessment, type Assessment } from '@/lib/api';
import { isFresh, readCache, REFRESH_MS, writeCache } from '@/lib/cache';

export const PENDING = ['queued', 'processing'];

/**
 * An assessment, shown from the phone's saved copy first. Polls every few seconds while the
 * server is still working on it; once finished, fetches again only after REFRESH_MS.
 */
export function useAssessment(id: string | null) {
  const key = id && `assessment.${id}`;
  const [assessment, setAssessment] = useState(() => (key ? readCache<Assessment>(key)?.data : undefined));
  useEffect(() => {
    if (!id || !key) return;
    let timer: ReturnType<typeof setTimeout>;
    let live = true;
    async function load() {
      const hit = readCache<Assessment>(key!);
      if (hit && !PENDING.includes(hit.data.status) && isFresh(hit)) {
        timer = setTimeout(load, REFRESH_MS - (Date.now() - hit.at));
        return;
      }
      try {
        const a = await getAssessment(id!);
        writeCache(key!, a);
        if (!live) return;
        setAssessment(a);
        timer = setTimeout(load, PENDING.includes(a.status) ? 3000 : REFRESH_MS);
      } catch {
        if (live) timer = setTimeout(load, 10000); // server down: keep trying quietly
      }
    }
    load();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [id, key]);
  return assessment;
}
