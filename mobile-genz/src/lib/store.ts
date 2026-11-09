import { useState } from 'react';

// Everything this app keeps lives on the phone, under one prefix so "start over" clears it all.
const PREFIX = 'genz.';

export function read<T>(key: string, fallback: T): T {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(PREFIX + key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function write<T>(key: string, value: T) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {}
}

export function clearAll() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX)) localStorage.removeItem(k);
    }
  } catch {}
}

/** useState that is saved on the phone under key. */
export function useStored<T>(key: string, fallback: T) {
  const [state, setState] = useState(() => ({ key, value: read(key, fallback) }));
  const value = state.key === key ? state.value : read(key, fallback);
  const set = (next: T | ((prev: T) => T)) => {
    const v = typeof next === 'function' ? (next as (prev: T) => T)(value) : next;
    write(key, v);
    setState({ key, value: v });
  };
  return [value, set] as const;
}

export type Profile = {
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  diet_type: 'veg' | 'eggetarian' | 'non_veg' | 'jain' | 'vegan';
  cuisine: 'north' | 'south' | 'west' | 'east';
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active';
  alcohol: boolean;
  smoker: boolean;
  height_cm?: number;
  weight_kg?: number;
  waist_cm?: number;
  allergies: string;
  email: string;
  phone: string;
};

export const getProfile = () => read<Profile | null>('profile', null);
export const saveProfile = (p: Profile) => write('profile', p);
