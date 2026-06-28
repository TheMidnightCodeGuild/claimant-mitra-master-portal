import { DEFAULT_LIST_TTL_MS } from "./cacheConfig";

/** @type {Map<string, { data: unknown, fetchedAt: number }>} */
const store = new Map();

export function readServerCache(key, ttlMs = DEFAULT_LIST_TTL_MS) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > ttlMs) {
    store.delete(key);
    return null;
  }
  return entry;
}

export function writeServerCache(key, data) {
  store.set(key, { data, fetchedAt: Date.now() });
}

export function invalidateServerCache(keys) {
  keys.forEach((key) => store.delete(key));
}
