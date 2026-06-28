import { requireSession } from "../../../lib/apiAuth";
import { invalidateServerCollectionCache } from "../../../lib/serverCollectionFetch";
import { isKnownCollectionKey } from "../../../lib/cacheConfig";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = requireSession(req, res);
  if (!session) return;

  const { keys } = req.body || {};
  if (!Array.isArray(keys) || keys.length === 0) {
    return res.status(400).json({ error: "keys array required" });
  }

  const valid = keys.filter(isKnownCollectionKey);
  if (valid.length === 0) {
    return res.status(400).json({ error: "No valid collection keys" });
  }

  invalidateServerCollectionCache(valid);
  return res.status(200).json({ ok: true, invalidated: valid });
}
