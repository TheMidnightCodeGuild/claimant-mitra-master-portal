import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let cache = null;

export function invalidateKpiCache() {
  cache = null;
}

export async function fetchKpiData({ forceRefresh = false } = {}) {
  if (
    !forceRefresh &&
    cache &&
    Date.now() - cache.fetchedAt < CACHE_TTL_MS
  ) {
    return {
      users: cache.users,
      partners: cache.partners,
      notices: cache.notices,
      fetchedAt: cache.fetchedAt,
      fromCache: true,
    };
  }

  const [usersSnap, partnersSnap, noticesSnap] = await Promise.all([
    getDocs(collection(db, "users")),
    getDocs(collection(db, "partners")),
    getDocs(collection(db, "notice")),
  ]);

  const users = usersSnap.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data(),
  }));
  const partners = partnersSnap.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data(),
  }));
  const notices = noticesSnap.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data(),
  }));

  const fetchedAt = Date.now();
  cache = { users, partners, notices, fetchedAt };

  return { users, partners, notices, fetchedAt, fromCache: false };
}
