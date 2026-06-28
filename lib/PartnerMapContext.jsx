import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { fetchCollectionCached } from "./collectionCache";
import { buildPartnerRefNameMap } from "./partnerLookup";

const PartnerMapContext = createContext({
  partnerMap: new Map(),
  loading: true,
});

export function PartnerMapProvider({ children }) {
  const [partnerMap, setPartnerMap] = useState(new Map());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const partners = await fetchCollectionCached("partners");
      setPartnerMap(buildPartnerRefNameMap(partners));
    } catch (err) {
      console.error("Failed to load partners for name lookup:", err);
      setPartnerMap(new Map());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <PartnerMapContext.Provider value={{ partnerMap, loading, refresh: load }}>
      {children}
    </PartnerMapContext.Provider>
  );
}

export function usePartnerMapContext() {
  return useContext(PartnerMapContext);
}

export default PartnerMapContext;
