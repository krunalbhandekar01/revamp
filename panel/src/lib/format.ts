import { format, formatDistanceToNowStrict, isValid, parseISO } from 'date-fns';
import type { ISODate, Paisa } from '@/types/domain';

/* ------------------------------------------------------------------- money */

/** Paisa → rupees. Rounds at the boundary; never let float drift into a total. */
export const toRupees = (paisa: Paisa): number => Math.round(paisa) / 100;

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const inrPrecise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** ₹12,34,567 — the default for tables and tiles. */
export const money = (paisa: Paisa): string => inr.format(toRupees(paisa));

/** ₹12,34,567.89 — for anything that must reconcile to the rupee. */
export const moneyExact = (paisa: Paisa): string => inrPrecise.format(toRupees(paisa));

/**
 * Indian short scale: ₹1.2 Cr / ₹34.5 L / ₹12.3 K.
 * Used on axis ticks and hero figures, never where a number must reconcile.
 */
export function moneyCompact(paisa: Paisa): string {
  const r = toRupees(paisa);
  const abs = Math.abs(r);
  const sign = r < 0 ? '-' : '';
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(abs / 1e7 >= 100 ? 0 : 1)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(abs / 1e5 >= 100 ? 0 : 1)} L`;
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(0)} K`;
  return `${sign}₹${abs.toFixed(0)}`;
}

/** Same scale as moneyCompact but without the currency mark — for axis ticks. */
export function numberCompact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e7) return `${sign}${(abs / 1e7).toFixed(1)}Cr`;
  if (abs >= 1e5) return `${sign}${(abs / 1e5).toFixed(1)}L`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(0)}K`;
  return `${sign}${abs}`;
}

/* ------------------------------------------------------------------ numbers */

const dec = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
export const qty = (n: number, unit?: string): string => `${dec.format(n)}${unit ? ` ${unit}` : ''}`;
export const percent = (n: number, digits = 1): string => `${n.toFixed(digits)}%`;

/** +4.2% / −1.8% — the delta shown on a stat tile. */
export function signedPercent(n: number, digits = 1): string {
  const s = n > 0 ? '+' : n < 0 ? '−' : '';
  return `${s}${Math.abs(n).toFixed(digits)}%`;
}

/* -------------------------------------------------------------------- dates */

function parse(d: ISODate | Date | null | undefined): Date | null {
  if (!d) return null;
  const v = typeof d === 'string' ? parseISO(d) : d;
  return isValid(v) ? v : null;
}

export const shortDate = (d: ISODate | Date | null | undefined): string => {
  const v = parse(d);
  return v ? format(v, 'dd MMM yyyy') : '—';
};

export const shortDateTime = (d: ISODate | Date | null | undefined): string => {
  const v = parse(d);
  return v ? format(v, 'dd MMM, HH:mm') : '—';
};

export const dayMonth = (d: ISODate | Date | null | undefined): string => {
  const v = parse(d);
  return v ? format(v, 'dd MMM') : '—';
};

export const relative = (d: ISODate | Date | null | undefined): string => {
  const v = parse(d);
  return v ? `${formatDistanceToNowStrict(v)} ago` : '—';
};

/** "12 days overdue" / "due in 4 days" / "due today". */
export function dueLabel(days: number): string {
  if (days === 0) return 'due today';
  if (days > 0) return `${days} day${days === 1 ? '' : 's'} overdue`;
  return `due in ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}`;
}

export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
