/**
 * Deterministic pseudo-random source.
 *
 * Every generator below is seeded, so the dataset is identical on every reload
 * and across machines. That matters for a demo: screenshots stay stable and a
 * number you quote in a review is still there tomorrow.
 */

export function makeRng(seed: number) {
  // mulberry32 — small, fast, good enough for fixtures.
  let a = seed >>> 0;
  return function rng(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = ReturnType<typeof makeRng>;

export const int = (rng: Rng, lo: number, hi: number): number => Math.floor(rng() * (hi - lo + 1)) + lo;

export const float = (rng: Rng, lo: number, hi: number): number => rng() * (hi - lo) + lo;

export const pick = <T,>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];

export function pickWeighted<T>(rng: Rng, xs: readonly (readonly [T, number])[]): T {
  const total = xs.reduce((a, [, w]) => a + w, 0);
  let r = rng() * total;
  for (const [v, w] of xs) {
    r -= w;
    if (r <= 0) return v;
  }
  return xs[xs.length - 1][0];
}

export const bool = (rng: Rng, pTrue = 0.5): boolean => rng() < pTrue;

export function sample<T>(rng: Rng, xs: readonly T[], n: number): T[] {
  const pool = [...xs];
  const out: T[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
}

/** Days offset from the fixed "today" the dataset is built around. */
export const TODAY = new Date('2026-09-28T09:00:00+05:30');

export function dayOffset(days: number): Date {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + days);
  return d;
}

export const iso = (d: Date): string => d.toISOString();

export const isoDayOffset = (days: number): string => iso(dayOffset(days));

/* ------------------------------------------------------------------ corpora */

export const STATES = [
  'Maharashtra',
  'Gujarat',
  'Tamil Nadu',
  'Karnataka',
  'Uttar Pradesh',
  'Punjab',
  'Haryana',
  'Madhya Pradesh',
  'Rajasthan',
  'Telangana',
  'Andhra Pradesh',
  'West Bengal',
] as const;

export const CITY_BY_STATE: Record<string, string[]> = {
  Maharashtra: ['Pune', 'Nagpur', 'Nashik', 'Aurangabad'],
  Gujarat: ['Ahmedabad', 'Surat', 'Rajkot', 'Vadodara'],
  'Tamil Nadu': ['Coimbatore', 'Erode', 'Salem', 'Tiruppur'],
  Karnataka: ['Bengaluru', 'Hubli', 'Mysuru', 'Belagavi'],
  'Uttar Pradesh': ['Kanpur', 'Lucknow', 'Meerut', 'Agra'],
  Punjab: ['Ludhiana', 'Jalandhar', 'Patiala', 'Amritsar'],
  Haryana: ['Panipat', 'Faridabad', 'Hisar', 'Karnal'],
  'Madhya Pradesh': ['Indore', 'Bhopal', 'Jabalpur', 'Ujjain'],
  Rajasthan: ['Jaipur', 'Kota', 'Bhilwara', 'Udaipur'],
  Telangana: ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar'],
  'Andhra Pradesh': ['Vijayawada', 'Visakhapatnam', 'Guntur', 'Nellore'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Siliguri'],
};

export interface ProductDef {
  id: string;
  name: string;
  unit: string;
  /** Typical purchase price per unit, in paisa. */
  basePrice: number;
  category: 'Solid' | 'Liquid' | 'Waste';
}

export const PRODUCTS: ProductDef[] = [
  { id: 'p1', name: 'Biomass Briquettes', unit: 'MT', basePrice: 720000, category: 'Solid' },
  { id: 'p2', name: 'Wood Pellets', unit: 'MT', basePrice: 940000, category: 'Solid' },
  { id: 'p3', name: 'Rice Husk', unit: 'MT', basePrice: 410000, category: 'Solid' },
  { id: 'p4', name: 'Used Cooking Oil', unit: 'KL', basePrice: 6100000, category: 'Liquid' },
  { id: 'p5', name: 'Biodiesel B100', unit: 'KL', basePrice: 8450000, category: 'Liquid' },
  { id: 'p6', name: 'Bagasse', unit: 'MT', basePrice: 290000, category: 'Solid' },
  { id: 'p7', name: 'Mustard Husk', unit: 'MT', basePrice: 540000, category: 'Solid' },
  { id: 'p8', name: 'Industrial Sludge', unit: 'MT', basePrice: 180000, category: 'Waste' },
];

const BUYER_PREFIX = [
  'Shree',
  'Anand',
  'Veer',
  'Deccan',
  'Sahyadri',
  'Ganga',
  'Kaveri',
  'Narmada',
  'Bharat',
  'Prime',
  'Nova',
  'Surya',
  'Aditya',
  'Konark',
  'Vidarbha',
  'Malwa',
  'Sagar',
  'Trident',
];

const BUYER_SUFFIX = [
  'Paper Mills',
  'Textiles',
  'Cement Works',
  'Sugar Industries',
  'Chemicals',
  'Steel Rolling',
  'Ceramics',
  'Dairy',
  'Distillery',
  'Processing',
  'Agro Industries',
  'Power',
];

const SELLER_SUFFIX = [
  'Biofuels',
  'Biomass Traders',
  'Agro Residue',
  'Green Energy',
  'Pellets',
  'Renewables',
  'Fuel Supply',
  'Organics',
];

export function companyName(rng: Rng, kind: 'Buyer' | 'Seller'): string {
  const suffix = kind === 'Buyer' ? pick(rng, BUYER_SUFFIX) : pick(rng, SELLER_SUFFIX);
  const tail = pick(rng, ['Pvt Ltd', 'Ltd', 'LLP', '& Co', 'Industries']);
  return `${pick(rng, BUYER_PREFIX)} ${suffix} ${tail}`;
}

const FIRST = [
  'Krunal',
  'Aditi',
  'Rohan',
  'Meera',
  'Vikram',
  'Sneha',
  'Arjun',
  'Priya',
  'Nikhil',
  'Kavya',
  'Rahul',
  'Divya',
  'Sameer',
  'Anjali',
  'Karthik',
  'Neha',
];
const LAST = [
  'Shah',
  'Iyer',
  'Patel',
  'Nair',
  'Reddy',
  'Joshi',
  'Mehta',
  'Desai',
  'Kulkarni',
  'Rao',
  'Gupta',
  'Menon',
];

export const personName = (rng: Rng): string => `${pick(rng, FIRST)} ${pick(rng, LAST)}`;

export function gstin(rng: Rng, state: string): string {
  const code = String(11 + STATES.indexOf(state as (typeof STATES)[number])).padStart(2, '0');
  const letters = () =>
    Array.from({ length: 5 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[int(rng, 0, 25)]).join('');
  return `${code}${letters()}${int(rng, 1000, 9999)}${'ABCDEFGHJ'[int(rng, 0, 8)]}1Z${int(rng, 0, 9)}`;
}

export function vehicleNo(rng: Rng): string {
  const st = pick(rng, ['MH', 'GJ', 'TN', 'KA', 'UP', 'PB', 'HR', 'MP', 'RJ', 'TS']);
  const letters = `${'ABCDEFGHJKLMNPQRSTUVWXYZ'[int(rng, 0, 23)]}${'ABCDEFGHJKLMNPQRSTUVWXYZ'[int(rng, 0, 23)]}`;
  return `${st}${String(int(rng, 1, 48)).padStart(2, '0')}${letters}${int(rng, 1000, 9999)}`;
}
