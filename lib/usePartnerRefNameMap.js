import { useEffect, useState } from "react";
import { fetchCollectionCached } from "./collectionCache";
import { buildPartnerRefNameMap } from "./partnerLookup";

export default function usePartnerRefNameMap() {
  const [partnerMap, setPartnerMap] = useState(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const partners = await fetchCollectionCached("partners");
        if (!cancelled) {
          setPartnerMap(buildPartnerRefNameMap(partners));
        }
      } catch (err) {
        console.error("Failed to load partners for name lookup:", err);
        if (!cancelled) {
          setPartnerMap(new Map());
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { partnerMap, loading };
}
