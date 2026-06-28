import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import {
  COLLECTION_PATHS,
  DEFAULT_LIST_TTL_MS,
  SESSION_STORAGE_MAX_BYTES,
  isKnownCollectionKey,
} from "./cacheConfig";

export { DEFAULT_LIST_TTL_MS, COLLECTION_PATHS };

/** @type {Record<string, { data: Array|null, fetchedAt: number, inFlight: Promise|null }>} */
const caches = {};

function sessionKey(collectionKey) {
  return `cm-cache-${collectionKey}`;
}

function readSessionCache(collectionKey, ttlMs) {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(sessionKey(collectionKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.data || !parsed?.fetchedAt) return null;
    if (Date.now() - parsed.fetchedAt > ttlMs) {
      sessionStorage.removeItem(sessionKey(collectionKey));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeSessionCache(collectionKey, data, fetchedAt) {
  if (typeof window === "undefined") return;
  try {
    const payload = JSON.stringify({ data, fetchedAt });
    if (payload.length > SESSION_STORAGE_MAX_BYTES) return;
    sessionStorage.setItem(sessionKey(collectionKey), payload);
  } catch {
    // quota exceeded or private mode
  }
}

function clearSessionCache(collectionKey) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(sessionKey(collectionKey));
  } catch {
    // ignore
  }
}

function getEntry(collectionKey) {
  if (!isKnownCollectionKey(collectionKey)) {
    throw new Error(`Unknown collection cache key: ${collectionKey}`);
  }
  if (!caches[collectionKey]) {
    caches[collectionKey] = { data: null, fetchedAt: 0, inFlight: null };
  }
  return caches[collectionKey];
}

function mapSnapshot(snap) {
  return snap.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data(),
  }));
}

async function fetchFromFirestore(collectionKey) {
  const path = COLLECTION_PATHS[collectionKey];
  const snap = await getDocs(collection(db, path));
  return mapSnapshot(snap);
}

async function fetchFromApi(collectionKey, forceRefresh) {
  const url = forceRefresh
    ? `/api/cache/${collectionKey}?forceRefresh=1`
    : `/api/cache/${collectionKey}`;
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to load ${collectionKey}`);
  }
  const json = await res.json();
  return {
    data: json.data,
    fetchedAt: json.fetchedAt,
    fromCache: Boolean(json.fromCache),
    fromInFlight: false,
  };
}

export function invalidateCollection(collectionKey) {
  const entry = caches[collectionKey];
  if (entry) {
    entry.data = null;
    entry.fetchedAt = 0;
    entry.inFlight = null;
  }
  clearSessionCache(collectionKey);

  if (typeof window !== "undefined") {
    fetch("/api/cache/invalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ keys: [collectionKey] }),
    }).catch(() => {});
  }
}

export function invalidateCollections(collectionKeys) {
  collectionKeys.forEach(invalidateCollection);
}

/**
 * @param {string} collectionKey
 * @param {{ ttlMs?: number, forceRefresh?: boolean }} [options]
 */
export async function fetchCollectionCachedWithMeta(
  collectionKey,
  { ttlMs = DEFAULT_LIST_TTL_MS, forceRefresh = false } = {}
) {
  const entry = getEntry(collectionKey);

  if (
    !forceRefresh &&
    entry.data &&
    Date.now() - entry.fetchedAt < ttlMs
  ) {
    return {
      data: entry.data,
      fetchedAt: entry.fetchedAt,
      fromCache: true,
      fromInFlight: false,
    };
  }

  if (!forceRefresh) {
    const sessionHit = readSessionCache(collectionKey, ttlMs);
    if (sessionHit) {
      entry.data = sessionHit.data;
      entry.fetchedAt = sessionHit.fetchedAt;
      return {
        data: sessionHit.data,
        fetchedAt: sessionHit.fetchedAt,
        fromCache: true,
        fromInFlight: false,
      };
    }
  }

  if (entry.inFlight && !forceRefresh) {
    const result = await entry.inFlight;
    return { ...result, fromInFlight: true };
  }

  if (forceRefresh) {
    entry.data = null;
    entry.fetchedAt = 0;
    clearSessionCache(collectionKey);
  }

  entry.inFlight = (async () => {
    let result;
    if (typeof window !== "undefined") {
      result = await fetchFromApi(collectionKey, forceRefresh);
    } else {
      const data = await fetchFromFirestore(collectionKey);
      const fetchedAt = Date.now();
      result = { data, fetchedAt, fromCache: false, fromInFlight: false };
    }

    entry.data = result.data;
    entry.fetchedAt = result.fetchedAt;
    writeSessionCache(collectionKey, result.data, result.fetchedAt);
    return result;
  })().finally(() => {
    entry.inFlight = null;
  });

  return entry.inFlight;
}

/** @returns {Promise<Array<{ id: string, [key: string]: unknown }>>} */
export async function fetchCollectionCached(collectionKey, options = {}) {
  const result = await fetchCollectionCachedWithMeta(collectionKey, options);
  return result.data;
}

const USERS_PAGE_SIZE = 50;

/**
 * Paginated users fetch (server-side Firestore query).
 * @param {{ pageSize?: number, startAfterId?: string, forceRefresh?: boolean }} [options]
 */
export async function fetchUsersPage({
  pageSize = USERS_PAGE_SIZE,
  startAfterId = null,
  forceRefresh = false,
} = {}) {
  const params = new URLSearchParams({ limit: String(pageSize) });
  if (startAfterId) params.set("startAfterId", startAfterId);
  if (forceRefresh) params.set("forceRefresh", "1");

  const res = await fetch(`/api/cache/users-page?${params.toString()}`, {
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load cases page");
  }
  return res.json();
}

/** Referral stats from one in-memory users list (avoids N Firestore queries per partner). */
export function computePartnerReferralStats(partners, users) {
  const byPartnerRef = new Map();
  for (const user of users) {
    const ref = user.partnerRef;
    if (!ref) continue;
    const agg = byPartnerRef.get(ref) || { casesReferred: 0, totalEarnings: 0 };
    agg.casesReferred += 1;
    agg.totalEarnings += user.partnerCommision || 0;
    byPartnerRef.set(ref, agg);
  }

  const statsMap = {};
  for (const partner of partners) {
    if (!partner.partnerRef) {
      statsMap[partner.id] = {
        id: partner.id,
        casesReferred: 0,
        totalEarnings: 0,
      };
      continue;
    }
    const agg = byPartnerRef.get(partner.partnerRef) || {
      casesReferred: 0,
      totalEarnings: 0,
    };
    statsMap[partner.id] = { id: partner.id, ...agg };
  }
  return statsMap;
}
