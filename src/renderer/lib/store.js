// Tiny persistence layer. Uses the Electron-side store via the preload bridge
// when available, otherwise falls back to localStorage so the renderer can
// also be opened in a regular browser for quick previews.

const KEY_PREFIX = 'eden:';

function hasElectron() {
  return typeof window !== 'undefined' && window.eden && window.eden.store;
}

export async function getValue(key, fallback = null) {
  try {
    if (hasElectron()) {
      const v = await window.eden.store.get(key);
      return v === undefined || v === null ? fallback : v;
    }
    const raw = localStorage.getItem(KEY_PREFIX + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch (err) {
    console.warn('[store] get failed', key, err);
    return fallback;
  }
}

export async function setValue(key, value) {
  try {
    if (hasElectron()) {
      await window.eden.store.set(key, value);
      return true;
    }
    localStorage.setItem(KEY_PREFIX + key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn('[store] set failed', key, err);
    return false;
  }
}
