import {
  fetchCollectionCachedWithMeta,
  invalidateCollections,
} from "./collectionCache";

const KPI_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let kpiBundle = null;
let kpiInFlight = null;

export function invalidateKpiCache() {
  kpiBundle = null;
  kpiInFlight = null;
  invalidateCollections(["users", "partners", "notice"]);
}

async function fetchKpiBundleFromCache({ forceRefresh = false } = {}) {
  const [usersResult, partnersResult, noticesResult] = await Promise.all([
    fetchCollectionCachedWithMeta("users", {
      ttlMs: KPI_CACHE_TTL_MS,
      forceRefresh,
    }),
    fetchCollectionCachedWithMeta("partners", {
      ttlMs: KPI_CACHE_TTL_MS,
      forceRefresh,
    }),
    fetchCollectionCachedWithMeta("notice", {
      ttlMs: KPI_CACHE_TTL_MS,
      forceRefresh,
    }),
  ]);

  const fetchedAt = Math.max(
    usersResult.fetchedAt,
    partnersResult.fetchedAt,
    noticesResult.fetchedAt
  );

  const fromCache =
    usersResult.fromCache &&
    partnersResult.fromCache &&
    noticesResult.fromCache;

  return {
    users: usersResult.data,
    partners: partnersResult.data,
    notices: noticesResult.data,
    fetchedAt,
    fromCache,
    fromInFlight: false,
  };
}

export async function fetchKpiData({ forceRefresh = false } = {}) {
  if (
    !forceRefresh &&
    kpiBundle &&
    Date.now() - kpiBundle.fetchedAt < KPI_CACHE_TTL_MS
  ) {
    return {
      users: kpiBundle.users,
      partners: kpiBundle.partners,
      notices: kpiBundle.notices,
      fetchedAt: kpiBundle.fetchedAt,
      fromCache: true,
      fromInFlight: false,
    };
  }

  if (kpiInFlight && !forceRefresh) {
    const result = await kpiInFlight;
    return { ...result, fromInFlight: true };
  }

  if (forceRefresh) {
    kpiBundle = null;
  }

  kpiInFlight = fetchKpiBundleFromCache({ forceRefresh }).then((result) => {
    kpiBundle = {
      users: result.users,
      partners: result.partners,
      notices: result.notices,
      fetchedAt: result.fetchedAt,
    };
    return result;
  }).finally(() => {
    kpiInFlight = null;
  });

  return kpiInFlight;
}
