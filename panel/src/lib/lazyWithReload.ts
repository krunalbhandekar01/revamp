import { lazy } from 'react';

/**
 * `React.lazy`, but survives a deploy.
 *
 * Every page here is code-split, so navigating fetches a hashed chunk such as
 * `/assets/Deals-BbAlJJaV.js`. When a new version is deployed the hashes change
 * and the old chunks disappear — but a tab that was already open still holds
 * the previous `index.html`, which references the files that are now gone.
 *
 * The failure is quiet and confusing: React Router wraps navigation in a
 * transition, so when the chunk import rejects React keeps the *previous* page
 * on screen. The URL changes, nothing else does, and the only way out is a
 * manual refresh.
 *
 * So: if a chunk fails to load, reload the page once to pick up the current
 * `index.html`. The one-shot flag is what stops a genuinely broken deploy from
 * turning into a reload loop — a second consecutive failure is re-thrown and
 * handled by the error boundary instead.
 */

const RELOAD_FLAG = 'bf-chunk-reload';

function readFlag(): boolean {
  try {
    return sessionStorage.getItem(RELOAD_FLAG) === '1';
  } catch {
    // Private mode or blocked storage: treat as "not yet reloaded" but the
    // write below will also fail, so we simply never auto-reload. Better than
    // looping.
    return true;
  }
}

function setFlag(): boolean {
  try {
    sessionStorage.setItem(RELOAD_FLAG, '1');
    return true;
  } catch {
    return false;
  }
}

/** Called once a chunk has loaded successfully, so a later deploy can heal too. */
export function clearChunkReloadFlag(): void {
  try {
    sessionStorage.removeItem(RELOAD_FLAG);
  } catch {
    /* non-fatal */
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithReload<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      const mod = await factory();
      clearChunkReloadFlag();
      return mod;
    } catch (error) {
      if (!readFlag() && setFlag()) {
        window.location.reload();
        // Resolve never: the reload replaces this document, and returning a
        // pending promise keeps React on the fallback rather than flashing an
        // error the user would never have time to read.
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }
  });
}
