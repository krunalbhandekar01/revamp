import { useCallback, useEffect, useState } from 'react';

export type ThemeChoice = 'light' | 'dark' | 'system';

const KEY = 'bf-theme';

function readStored(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    /* storage unavailable */
  }
  return 'system';
}

/**
 * Theme choice. `system` removes the attribute so the media query in
 * `index.css` takes over; an explicit choice stamps `data-theme`, which wins
 * over the OS in both directions.
 */
export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(readStored);

  useEffect(() => {
    const root = document.documentElement;
    if (choice === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', choice);
    try {
      if (choice === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, choice);
    } catch {
      /* non-fatal */
    }
  }, [choice]);

  const cycle = useCallback(() => {
    setChoice((c) => (c === 'light' ? 'dark' : c === 'dark' ? 'system' : 'light'));
  }, []);

  return { choice, setChoice, cycle };
}
