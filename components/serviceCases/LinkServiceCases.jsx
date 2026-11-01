import { useEffect, useMemo, useState } from "react";
import { arrayRemove, arrayUnion, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { fetchCollectionCached, invalidateCollections } from "../../lib/collectionCache";
import { SERVICE_CASE_COLLECTION, caseTypeLabel } from "../../lib/serviceCaseTypes";
import { matchesServiceSearch } from "../../lib/serviceCaseFilters";

/**
 * Links loan / mailing cases to a customer. Kept apart from the insurance link
 * (customers.cases -> users) because the two kinds of case live in different
 * collections: customers.serviceCases -> serviceCases.
 */
export default function LinkServiceCases({ customerId }) {
  const [customer, setCustomer] = useState(null);
  const [cases, setCases] = useState([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const refreshCustomer = async () => {
    const snap = await getDoc(doc(db, "customers", customerId));
    setCustomer(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [list, snap] = await Promise.all([
          fetchCollectionCached("serviceCases"),
          getDoc(doc(db, "customers", customerId)),
        ]);
        if (cancelled) return;
        setCases(list);
        setCustomer(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load loan and mailing cases");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const linkedIds = useMemo(
    () => (Array.isArray(customer?.serviceCases) ? customer.serviceCases : []),
    [customer]
  );
  const linked = cases.filter((c) => linkedIds.includes(c.id));
  const candidates = cases
    .filter((c) => !linkedIds.includes(c.id) && matchesServiceSearch(c, query))
    .slice(0, 30);

  const change = async (caseId, link) => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const caseRef = doc(db, SERVICE_CASE_COLLECTION, caseId);
      await updateDoc(doc(db, "customers", customerId), {
        serviceCases: link ? arrayUnion(caseId) : arrayRemove(caseId),
      });
      await updateDoc(caseRef, { customerUserId: link ? customerId : "" });
      invalidateCollections(["customers", "serviceCases"]);
      setCases(await fetchCollectionCached("serviceCases", { forceRefresh: true }));
      await refreshCustomer();
      setInfo(link ? "Linked." : "Delinked.");
    } catch (err) {
      setError(err.message || "Failed to update link");
    } finally {
      setBusy(false);
    }
  };

  const row = (c, action) => (
    <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
      <div className="min-w-0">
        <p className="font-medium text-slate-900">
          {c.name || "—"} <span className="text-xs text-slate-500">· {caseTypeLabel(c.caseType)}</span>
        </p>
        <p className="text-xs text-slate-600">{c.email || c.mobile || "—"}</p>
        <p className="font-mono text-[10px] text-slate-500">{c.id}</p>
      </div>
      {action}
    </li>
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm space-y-4">
      <p className="font-semibold text-gray-800">Loan &amp; mailing cases linked: {linked.length}</p>
      {linked.length > 0 && (
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {linked.map((c) =>
            row(
              c,
              <button
                type="button"
                disabled={busy}
                onClick={() => change(c.id, false)}
                className="shrink-0 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              >
                Delink
              </button>
            )
          )}
        </ul>
      )}

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search loan / mailing cases to link..."
        className="ui-input w-full"
      />
      <ul className="space-y-2 max-h-64 overflow-y-auto">
        {candidates.map((c) =>
          row(
            c,
            <button
              type="button"
              disabled={busy}
              onClick={() => change(c.id, true)}
              className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Link
            </button>
          )
        )}
      </ul>
      {info && <p className="text-green-600">{info}</p>}
      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
}
