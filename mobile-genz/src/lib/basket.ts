import type { GroceryItem } from '@/lib/api';
import { useStored } from '@/lib/store';

export type Basket = { have: string[]; added: string[] };

/** Per week: items already at home, and items already put in a store's cart. */
export function useBasket(week: number, items: GroceryItem[]) {
  const [basket, setBasket] = useStored<Basket>(`basket.w${week}`, { have: [], added: [] });
  const toggle = (list: keyof Basket, name: string) =>
    setBasket((b) => ({ ...b, [list]: b[list].includes(name) ? b[list].filter((n) => n !== name) : [...b[list], name] }));
  const toBuy = items.filter((i) => !basket.have.includes(i.name));
  const left = toBuy.filter((i) => !basket.added.includes(i.name));
  return {
    basket,
    toBuy,
    left,
    toggleHave: (name: string) => toggle('have', name),
    markAdded: (name: string) => setBasket((b) => (b.added.includes(name) ? b : { ...b, added: [...b.added, name] })),
    resetAdded: () => setBasket((b) => ({ ...b, added: [] })),
  };
}
