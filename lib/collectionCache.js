import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export const DEFAULT_LIST_TTL_MS = 5 * 60 * 1000;

const COLLECTION_PATHS = {
  users: "users",
  customers: "customers",
  partners: "partners",
  policyAnalysis: "PolicyAnalysis",
  notice: "notice",
};

/** @type {Record<string, { data: Array|null, fetchedAt: number, inFlight: Promise|null }>} */
const caches = {};

function getEntry(collectionKey) {
  if (!COLLECTION_PATHS[collectionKey]) {
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

export function invalidateCollection(collectionKey) {
  const entry = caches[collectionKey];
  if (!entry) return;
  entry.data = null;
  entry.fetchedAt = 0;
  entry.inFlight = null;
}

export function invalidateCollections(collectionKeys) {
  collectionKeys.forEach(invalidateCollection);
}

/**
 * @param {string} collectionKey
 * @param {{ ttlMs?: number, forceRefresh?: boolean }} [options]
 * @returns {Promise<{ data: Array, fetchedAt: number, fromCache: boolean, fromInFlight: boolean }>}
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

  if (entry.inFlight && !forceRefresh) {
    const result = await entry.inFlight;
    return { ...result, fromInFlight: true };
  }

  if (forceRefresh) {
    entry.data = null;
    entry.fetchedAt = 0;
  }

  entry.inFlight = (async () => {
    const data = await fetchFromFirestore(collectionKey);
    const fetchedAt = Date.now();
    entry.data = data;
    entry.fetchedAt = fetchedAt;
    return {
      data,
      fetchedAt,
      fromCache: false,
      fromInFlight: false,
    };
  })().finally(() => {
    entry.inFlight = null;
  });

  return entry.inFlight;
}

/** @returns {Promise<Array<{ id: string, [key: string]: unknown }>>} */
export async function fetchCollectionCached(
  collectionKey,
  options = {}
) {
  const result = await fetchCollectionCachedWithMeta(collectionKey, options);
  return result.data;
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
