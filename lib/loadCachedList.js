import { fetchCollectionCached, invalidateCollection } from "./collectionCache";

export function toSortTimestamp(value) {
  if (!value) return 0;
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

/** Cached collection fetch with client-side date sort (replaces ordered onSnapshot). */
export async function loadCachedListSorted(
  collectionKey,
  { dateField = "createdAt", forceRefresh = false } = {}
) {
  const rows = await fetchCollectionCached(collectionKey, { forceRefresh });
  return [...rows].sort(
    (a, b) => toSortTimestamp(b[dateField]) - toSortTimestamp(a[dateField])
  );
}

export function invalidateCachedList(collectionKey) {
  invalidateCollection(collectionKey);
}
