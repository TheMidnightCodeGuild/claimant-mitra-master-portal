import { requireSession } from "../../../lib/apiAuth";
import { fetchCollectionServerCached } from "../../../lib/serverCollectionFetch";
import { readServerCache, writeServerCache } from "../../../lib/serverCache";
import { DEFAULT_LIST_TTL_MS } from "../../../lib/cacheConfig";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = requireSession(req, res);
  if (!session) return;

  try {
    const cacheKey = "notice:count";
    const hit = readServerCache(cacheKey, DEFAULT_LIST_TTL_MS);
    if (hit) {
      return res.status(200).json({
        count: hit.data,
        fetchedAt: hit.fetchedAt,
        fromCache: true,
      });
    }

    const result = await fetchCollectionServerCached("notice");
    const count = Array.isArray(result.data) ? result.data.length : 0;
    writeServerCache(cacheKey, count);
    return res.status(200).json({
      count,
      fetchedAt: Date.now(),
      fromCache: false,
    });
  } catch (error) {
    console.error("notice-count API:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch notice count" });
  }
}
