import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes, resolving conflicts. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

export function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

export function sumBy<T>(xs: T[], pick: (x: T) => number): number {
  return xs.reduce((a, b) => a + pick(b), 0);
}

export function groupBy<T>(xs: T[], key: (x: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const x of xs) (out[key(x)] ??= []).push(x);
  return out;
}

export function uniq<T>(xs: T[]): T[] {
  return Array.from(new Set(xs));
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
