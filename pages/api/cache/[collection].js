import { requireSession } from "../../../lib/apiAuth";
import {
  fetchCollectionServerCached,
  invalidateServerCollectionCache,
} from "../../../lib/serverCollectionFetch";
import { isKnownCollectionKey } from "../../../lib/cacheConfig";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = requireSession(req, res);
  if (!session) return;

  const { collection } = req.query;
  if (!collection || !isKnownCollectionKey(collection)) {
    return res.status(400).json({ error: "Invalid collection" });
  }

  try {
    const forceRefresh = req.query.forceRefresh === "1";
    const result = await fetchCollectionServerCached(collection, { forceRefresh });
    return res.status(200).json(result);
  } catch (error) {
    console.error(`Cache API [${collection}]:`, error);
    return res.status(500).json({ error: error.message || "Failed to fetch collection" });
  }
}
