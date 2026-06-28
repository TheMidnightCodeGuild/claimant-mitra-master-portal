import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { COLLECTION_PATHS, DEFAULT_LIST_TTL_MS } from "./cacheConfig";
import {
  readServerCache,
  writeServerCache,
  invalidateServerCache,
} from "./serverCache";

function mapSnapshot(snap) {
  return snap.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data(),
  }));
}

export async function fetchCollectionFromFirestore(collectionKey) {
  const path = COLLECTION_PATHS[collectionKey];
  if (!path) {
    throw new Error(`Unknown collection cache key: ${collectionKey}`);
  }
  const snap = await getDocs(collection(db, path));
  return mapSnapshot(snap);
}

export async function fetchCollectionServerCached(
  collectionKey,
  { ttlMs = DEFAULT_LIST_TTL_MS, forceRefresh = false } = {}
) {
  const cacheKey = `collection:${collectionKey}`;
  if (!forceRefresh) {
    const hit = readServerCache(cacheKey, ttlMs);
    if (hit) {
      return {
        data: hit.data,
        fetchedAt: hit.fetchedAt,
        fromCache: true,
      };
    }
  }

  const data = await fetchCollectionFromFirestore(collectionKey);
  const fetchedAt = Date.now();
  writeServerCache(cacheKey, data);
  return { data, fetchedAt, fromCache: false };
}

export function invalidateServerCollectionCache(collectionKeys) {
  invalidateServerCache(collectionKeys.map((k) => `collection:${k}`));
  invalidateServerCache(["notice:count"]);
}
