/** Shared collection keys for client + server cache layers */
export const COLLECTION_PATHS = {
  users: "users",
  customers: "customers",
  partners: "partners",
  policyAnalysis: "PolicyAnalysis",
  notice: "notice",
  recycle: "recycle",
  enquiries: "enquiries",
  issues: "issues",
  partnerApplications: "requests",
  customerReviews: "customerReviews",
  testimonialVideos: "testimonialVideos",
  galleryImages: "galleryImages",
  parigyan: "parigyan",
  fromClaimantMitraVideos: "fromClaimantMitraVideos",
  invoices: "invoices",
};

export const DEFAULT_LIST_TTL_MS = 20 * 60 * 1000;
export const SESSION_STORAGE_MAX_BYTES = 5 * 1024 * 1024;

export function isKnownCollectionKey(key) {
  return Boolean(COLLECTION_PATHS[key]);
}
