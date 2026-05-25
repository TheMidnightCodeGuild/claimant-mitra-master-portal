import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let cache = null;
let inFlightPromise = null;

export function invalidateKpiCache() {
  cache = null;
  inFlightPromise = null;
}

async function fetchFromFirestore() {
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

  return {
    users,
    partners,
    notices,
    fetchedAt,
    fromCache: false,
    fromInFlight: false,
  };
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
      fromInFlight: false,
    };
  }

  if (inFlightPromise && !forceRefresh) {
    const result = await inFlightPromise;
    return { ...result, fromInFlight: true };
  }

  if (forceRefresh) {
    cache = null;
  }

  inFlightPromise = fetchFromFirestore().finally(() => {
    inFlightPromise = null;
  });

  return inFlightPromise;
}
