import { useCallback, useEffect, useState } from 'react';
import type { VisibilityState } from '@tanstack/react-table';

export type Density = 'compact' | 'comfortable' | 'relaxed';

interface Prefs {
  density: Density;
  columnVisibility: VisibilityState;
}

const DEFAULTS: Prefs = { density: 'comfortable', columnVisibility: {} };

/**
 * Per-viewer table preferences: density and which columns are shown.
 *
 * This is exactly the kind of state that belongs in localStorage — a personal
 * convenience, not shared data. Every read and write is guarded, because in a
 * private window or with site data blocked the accessor throws, and a column
 * picker must never take the page down with it.
 */
export function useTablePrefs(tableId: string, defaultHiddenColumns: string[] = []) {
  const key = `bf-table:${tableId}`;

  const [prefs, setPrefs] = useState<Prefs>(() => {
    const seeded: Prefs = {
      ...DEFAULTS,
      columnVisibility: Object.fromEntries(defaultHiddenColumns.map((id) => [id, false])),
    };
    try {
      const raw = localStorage.getItem(key);
      // A saved layout always wins — the viewer chose it.
      if (raw) return { ...seeded, ...(JSON.parse(raw) as Partial<Prefs>) };
    } catch {
      /* unreadable storage — fall back to the seeded defaults */
    }
    return seeded;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(prefs));
    } catch {
      /* non-fatal: preferences simply do not persist */
    }
  }, [key, prefs]);

  const setDensity = useCallback((density: Density) => setPrefs((p) => ({ ...p, density })), []);
  const setColumnVisibility = useCallback(
    (columnVisibility: VisibilityState) => setPrefs((p) => ({ ...p, columnVisibility })),
    [],
  );

  return { ...prefs, setDensity, setColumnVisibility };
}
