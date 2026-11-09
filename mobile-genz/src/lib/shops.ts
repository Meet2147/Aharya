/**
 * Getting the weekly haul into a grocery app.
 *
 * None of these apps has a public add-to-cart API, so each item opens that app's search for it
 * and the user adds it there. When a partnership brings a real cart API, it plugs in here.
 */
import type { GroceryItem } from '@/lib/api';
import { C } from '@/components/ui';

export type Shop = { id: string; name: string; color: string; text: string; search: (q: string) => string; home: string };

const q = encodeURIComponent;

export const SHOPS: Shop[] = [
  { id: 'blinkit', name: 'Blinkit', color: '#F8CB46', text: C.ink, search: (s) => `https://blinkit.com/s/?q=${q(s)}`, home: 'https://blinkit.com' },
  { id: 'zepto', name: 'Zepto', color: '#7B2FF7', text: '#FFFFFF', search: (s) => `https://www.zepto.com/search?query=${q(s)}`, home: 'https://www.zepto.com' },
  { id: 'instamart', name: 'Instamart', color: '#FC8019', text: '#FFFFFF', search: (s) => `https://www.swiggy.com/instamart/search?custom_back=true&query=${q(s)}`, home: 'https://www.swiggy.com/instamart' },
  { id: 'bigbasket', name: 'BigBasket', color: '#84C225', text: C.ink, search: (s) => `https://www.bigbasket.com/ps/?q=${q(s)}`, home: 'https://www.bigbasket.com' },
];

export const shopById = (id: string) => SHOPS.find((s) => s.id === id) ?? SHOPS[0];

// The plan names ingredients the way a recipe does; stores list them the way shoppers search.
const SEARCH: Record<string, string> = {
  'whole wheat flour': 'whole wheat atta',
  'bajra flour': 'bajra atta',
  'jowar flour': 'jowar atta',
  'ragi flour': 'ragi atta',
  'mixed vegetables': 'fresh vegetables',
  'mixed sambar vegetables': 'sambar vegetables',
  'salad vegetables': 'salad vegetables',
  'seasonal fruit': 'fresh fruits',
  'mint and coriander': 'coriander leaves',
  'fresh methi': 'methi leaves',
  'whole wheat khakhra': 'khakhra',
  'idli batter': 'idli dosa batter',
};
export const searchTerm = (name: string) => SEARCH[name.toLowerCase()] ?? name;

export const CATEGORIES: Record<string, { label: string; emoji: string; color: string }> = {
  vegetables: { label: 'sabzi', emoji: '🥬', color: '#BFF0D4' },
  fruits: { label: 'fruits', emoji: '🍎', color: '#FFD3DF' },
  pulses: { label: 'dal & pulses', emoji: '🫘', color: C.butter },
  grains: { label: 'grains & atta', emoji: '🌾', color: '#FFE0B8' },
  dairy: { label: 'dairy', emoji: '🥛', color: '#DDEBFF' },
  protein: { label: 'protein', emoji: '🍗', color: '#FFD0C4' },
  nuts_seeds: { label: 'nuts & seeds', emoji: '🥜', color: '#F0E0C8' },
  pantry: { label: 'pantry', emoji: '🫙', color: '#E6DEFF' },
};
export const category = (c: string) => CATEGORIES[c] ?? { label: c.replace('_', ' '), emoji: '🛍️', color: C.paper };
export const CATEGORY_ORDER = Object.keys(CATEGORIES);

function weight(g: number, unit: 'g' | 'ml') {
  const big = unit === 'g' ? 'kg' : 'L';
  return g >= 1000 ? `${+(g / 1000).toFixed(1)} ${big}` : `${Math.round(g)} ${unit}`;
}

/** How much the week needs, e.g. "450 g". */
export function need(item: GroceryItem) {
  if (item.unit === 'g' || item.unit === 'ml') return weight(item.quantity, item.unit);
  if (item.unit === 'kg') return weight(item.quantity * 1000, 'g');
  return `${+item.quantity.toFixed(1)} ${item.unit}`;
}

const PACKS = [100, 200, 250, 500, 1000];

/** What to put in the cart when it differs from the need: the nearest pack size. null = buy as needed. */
export function pack(item: GroceryItem): string | null {
  const loose = item.category === 'vegetables' || item.category === 'fruits';
  const grams = item.unit === 'kg' ? item.quantity * 1000 : item.quantity;
  if (item.unit === 'g' || item.unit === 'kg' || item.unit === 'ml') {
    const unit = item.unit === 'ml' ? 'ml' : 'g';
    if (loose) return null;
    const size = PACKS.find((p) => p >= grams);
    return size ? `a ${weight(size, unit)} pack` : `${Math.ceil(grams / 1000)} × 1 ${unit === 'g' ? 'kg' : 'L'} packs`;
  }
  if (item.name.toLowerCase() === 'eggs') return item.quantity <= 6 ? 'a 6-egg pack' : item.quantity <= 12 ? 'a 12-egg pack' : 'a 30-egg tray';
  if (item.unit === 'slices') return 'a loaf';
  if (item.unit === 'bags') return 'a box';
  return null;
}

/** The haul as a message a kirana can read at a glance. */
export function kiranaMessage(week: number, items: GroceryItem[], name?: string) {
  const lines = [`🛒 Grocery list${name ? ` for ${name}` : ''} (week ${week})`, ''];
  for (const key of CATEGORY_ORDER.concat(items.map((i) => i.category))) {
    const group = items.filter((i) => i.category === key);
    if (!group.length || lines.includes(`*${category(key).label}*`)) continue;
    lines.push(`*${category(key).label}*`);
    for (const i of group) lines.push(`• ${i.name} — ${need(i)}`);
    lines.push('');
  }
  lines.push('Please share the total and delivery time 🙏');
  return lines.join('\n');
}

/** WhatsApp link: straight to the kirana's chat when their number is saved, else the contact picker. */
export function whatsappUrl(text: string, phone?: string) {
  const digits = (phone ?? '').replace(/\D/g, '').replace(/^0+/, '');
  const to = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}
