import { useState } from 'react';

/** A date on the phone's clock as "2026-10-29": ticks belong to a calendar day. */
export const dateKey = (d: Date) => d.toLocaleDateString('en-CA');

// Saved per day on the phone (cleared with the rest of the app's data on sign-out)
const storageKey = (date: string) => `aharya.eaten.${date}`;

/** Positions of the meals ticked off on a date. */
export function readEaten(date: string): number[] {
  try {
    return typeof localStorage === 'undefined' ? [] : JSON.parse(localStorage.getItem(storageKey(date)) ?? '[]');
  } catch {
    return [];
  }
}

/** Which of a date's meals (by position) have been ticked off, and a toggle that saves the change. */
export function useEaten(date: string) {
  const [state, setState] = useState(() => ({ date, list: readEaten(date) }));
  // Switching to another day reads that day's ticks
  const list = state.date === date ? state.list : readEaten(date);
  const toggle = (i: number) => {
    const next = list.includes(i) ? list.filter((x) => x !== i) : [...list, i];
    setState({ date, list: next });
    try {
      localStorage.setItem(storageKey(date), JSON.stringify(next));
    } catch {}
  };
  return [list, toggle] as const;
}
