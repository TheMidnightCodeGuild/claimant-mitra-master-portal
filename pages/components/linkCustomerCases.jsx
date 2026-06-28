import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import {
  fetchCollectionCached,
  invalidateCollections,
} from "../../lib/collectionCache";
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
} from "firebase/firestore";

function parseIds(text) {
  if (!text || !String(text).trim()) return [];
  return String(text)
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function filterCustomersBySearch(customers, searchQuery, searchField) {
  if (!searchQuery) return customers;
  const q = searchQuery.toLowerCase();
  return customers.filter((customer) => {
    switch (searchField) {
      case "name":
        return customer.name?.toLowerCase().includes(q);
      case "email":
        return customer.email?.toLowerCase().includes(q);
      case "mobile":
        return customer.mobile?.toString().includes(q);
      case "id":
        return customer.id?.toLowerCase().includes(q);
      case "all":
        return (
          customer.name?.toLowerCase().includes(q) ||
          customer.email?.toLowerCase().includes(q) ||
          customer.mobile?.toString().includes(q) ||
          customer.id?.toLowerCase().includes(q)
        );
      default:
        return true;
    }
  });
}

function filterCasesBySearch(cases, searchQuery, searchField) {
  if (!searchQuery) {
    return cases;
  }
  const q = searchQuery.toLowerCase();
  return cases.filter((case_) => {
    switch (searchField) {
      case "name":
        return case_.name?.toLowerCase().includes(q);
      case "email":
        return case_.email?.toLowerCase().includes(q);
      case "mobile":
        return case_.mobile?.toString().includes(q);
      case "all":
        return (
          case_.name?.toLowerCase().includes(q) ||
          case_.email?.toLowerCase().includes(q) ||
          case_.mobile?.toString().includes(q)
        );
      default:
        return true;
    }
  });
}

function resolveLinkedCaseDetails(caseIds, cases) {
  const byId = new Map(cases.map((c) => [c.id, c]));
  const details = {};
  for (const caseId of caseIds) {
    const caseData = byId.get(caseId);
    if (caseData) {
      details[caseId] = {
        name: caseData.name || "—",
        email: caseData.email || "—",
      };
    } else {
      details[caseId] = { name: "—", email: "—", missing: true };
    }
  }
  return details;
}

export default function LinkCustomerCases() {
  const [customers, setCustomers] = useState([]);
  const [selectedUid, setSelectedUid] = useState("");
  const [customerSnap, setCustomerSnap] = useState(null);
  const [singleId, setSingleId] = useState("");
  const [bulkIds, setBulkIds] = useState("");
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupResult, setLookupResult] = useState(null);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [cases, setCases] = useState([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [casesFetchError, setCasesFetchError] = useState(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customerSearchField, setCustomerSearchField] = useState("name");
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [linkedCaseDetails, setLinkedCaseDetails] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState("name");
  const [filteredCases, setFilteredCases] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function loadCustomers() {
      setLoadingList(true);
      try {
        const rows = await fetchCollectionCached("customers");
        rows.sort((a, b) =>
          String(a.name || a.email || "").localeCompare(
            String(b.name || b.email || ""),
            undefined,
            { sensitivity: "base" }
          )
        );
        if (!cancelled) setCustomers(rows);
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load customers");
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    }
    loadCustomers();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchCases() {
      setLoadingCases(true);
      setCasesFetchError(null);
      try {
        const casesData = await fetchCollectionCached("users");
        if (!cancelled) {
          setCases(casesData);
        }
      } catch (err) {
        console.error("Error fetching cases:", err);
        if (!cancelled) {
          setCasesFetchError("Failed to fetch cases");
          setCases([]);
          setFilteredCases([]);
        }
      } finally {
        if (!cancelled) setLoadingCases(false);
      }
    }
    fetchCases();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setFilteredCustomers(
      filterCustomersBySearch(customers, customerSearchQuery, customerSearchField)
    );
  }, [customerSearchQuery, customerSearchField, customers]);

  useEffect(() => {
    setFilteredCases(filterCasesBySearch(cases, searchQuery, searchField));
  }, [searchQuery, searchField, cases]);

  useEffect(() => {
    let cancelled = false;
    async function loadSelected() {
      if (!selectedUid) {
        setCustomerSnap(null);
        setLinkedCaseDetails({});
        return;
      }
      try {
        const ref = doc(db, "customers", selectedUid);
        const snap = await getDoc(ref);
        if (!cancelled && snap.exists()) {
          const data = { id: snap.id, ...snap.data() };
          setCustomerSnap(data);

          const caseIds = Array.isArray(data.cases) ? data.cases : [];
          if (!cancelled) {
            setLinkedCaseDetails(resolveLinkedCaseDetails(caseIds, cases));
          }
        } else if (!cancelled) {
          setCustomerSnap(null);
          setLinkedCaseDetails({});
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    }
    loadSelected();
    return () => {
      cancelled = true;
    };
  }, [selectedUid, cases]);

  const refreshSelectedCustomer = async () => {
    if (!selectedUid) return;
    const snap = await getDoc(doc(db, "customers", selectedUid));
    if (snap.exists()) {
      const data = { id: snap.id, ...snap.data() };
      setCustomerSnap(data);
      const caseIds = Array.isArray(data.cases) ? data.cases : [];
      setLinkedCaseDetails(resolveLinkedCaseDetails(caseIds, cases));
    }
  };

  const delinkCaseFromCustomer = async (caseId) => {
    if (!selectedUid) {
      setError("Select a customer first");
      return;
    }
    const label = linkedCaseDetails[caseId]?.name || caseId;
    const ok = window.confirm(
      `Delink case "${label}" from this customer?\n\nThis removes the case from the customer's list and clears customerUserId on the case.`
    );
    if (!ok) return;

    setLoadingAction(true);
    setError(null);
    setInfo(null);

    try {
      const userRef = doc(db, "users", caseId);
      const userSnap = await getDoc(userRef);
      let warning = null;
      if (!userSnap.exists()) {
        warning = `Case document ${caseId} was not found; removed from customer only.`;
      }

      await updateDoc(doc(db, "customers", selectedUid), {
        cases: arrayRemove(caseId),
      });

      if (userSnap.exists()) {
        await updateDoc(userRef, {
          customerUserId: "",
        });
      }

      invalidateCollections(["customers", "users"]);
      setInfo(warning || `Delinked case ${caseId}.`);
      await refreshSelectedCustomer();
    } catch (e) {
      setError(e.message || "Failed to delink case");
    } finally {
      setLoadingAction(false);
    }
  };

  const linkIdsToCustomer = async (ids) => {
    if (!selectedUid) {
      setError("Select a customer first");
      return;
    }
    const unique = [...new Set(ids)];
    if (unique.length === 0) return;

    setLoadingAction(true);
    setError(null);
    setInfo(null);

    try {
      const customerRef = doc(db, "customers", selectedUid);

      for (const id of unique) {
        const userRef = doc(db, "users", id);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          setError(`Case document not found: ${id}`);
          setLoadingAction(false);
          return;
        }

        await updateDoc(customerRef, {
          cases: arrayUnion(id),
        });

        await updateDoc(userRef, {
          customerUserId: selectedUid,
        });
      }

      invalidateCollections(["customers", "users"]);
      setInfo(`Linked ${unique.length} case(s).`);
      setSingleId("");
      setBulkIds("");
      await refreshSelectedCustomer();
    } catch (e) {
      setError(e.message || "Failed to link cases");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleAddSingle = (e) => {
    e.preventDefault();
    const id = singleId.trim();
    if (!id) return;
    linkIdsToCustomer([id]);
  };

  const handleBulkLink = (e) => {
    e.preventDefault();
    linkIdsToCustomer(parseIds(bulkIds));
  };

  const handleLookup = async (e) => {
    e.preventDefault();
    setLookupResult(null);
    setError(null);
    const email = lookupEmail.trim().toLowerCase();
    if (!email) return;

    setLoadingAction(true);
    try {
      const q = query(
        collection(db, "users"),
        where("email", "==", email),
        limit(5)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setLookupResult({ kind: "none", email });
      } else if (snap.size === 1) {
        const d = snap.docs[0];
        setLookupResult({
          kind: "one",
          id: d.id,
          name: d.data()?.name,
        });
      } else {
        setLookupResult({
          kind: "many",
          docs: snap.docs.map((d) => ({
            id: d.id,
            name: d.data()?.name,
          })),
        });
      }
    } catch (err) {
      setError(err.message || "Lookup failed");
    } finally {
      setLoadingAction(false);
    }
  };

  const casesArray = Array.isArray(customerSnap?.cases)
    ? customerSnap.cases
    : [];

  const formatComplaintDate = (value) => {
    if (!value) return "—";
    try {
      const d = value?.toDate?.() ? value.toDate() : new Date(value);
      return d.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return "—";
    }
  };

  return (
    <div className="mt-5 flex min-h-[50vh] flex-col items-center bg-gradient-to-b from-slate-100/80 to-indigo-50/40 px-4 pb-12">
      <div className="ui-card-padded w-full max-w-[1300px] space-y-6 !p-8 shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            Link cases to customer
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Attach <code className="rounded bg-gray-100 px-1">users</code>{" "}
            case IDs to a customer&apos;s{" "}
            <code className="rounded bg-gray-100 px-1">cases</code> array.
          </p>
        </div>

        <div className="border-b border-gray-200 pb-6">
          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            Search customers
          </h3>
          <p className="mb-4 text-sm text-gray-600">
            Find a customer and click Select. Same search pattern as cases below.
          </p>

          {loadingList ? (
            <p className="text-center text-gray-600">Loading customers…</p>
          ) : (
            <>
              <div className="ui-search-panel mb-4">
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      placeholder="Search customers..."
                      className="ui-input w-full"
                    />
                  </div>
                  <div className="sm:w-48">
                    <select
                      value={customerSearchField}
                      onChange={(e) => setCustomerSearchField(e.target.value)}
                      className="ui-input w-full sm:w-48"
                    >
                      <option value="all">All Fields</option>
                      <option value="name">Name</option>
                      <option value="email">Email</option>
                      <option value="mobile">Mobile</option>
                      <option value="id">Customer ID</option>
                    </select>
                  </div>
                </div>
                <p className="text-sm text-slate-600">
                  Found {filteredCustomers.length} customers
                  {customerSearchQuery && ` matching "${customerSearchQuery}"`}
                </p>
              </div>

              <div className="max-h-64 overflow-y-auto overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                  <thead className="sticky top-0 bg-slate-100">
                    <tr>
                      <th className="px-3 py-2 font-semibold text-slate-700">
                        Name
                      </th>
                      <th className="px-3 py-2 font-semibold text-slate-700">
                        Email
                      </th>
                      <th className="hidden px-3 py-2 font-semibold text-slate-700 sm:table-cell">
                        Mobile
                      </th>
                      <th className="px-3 py-2 font-semibold text-slate-700">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredCustomers.map((c) => (
                      <tr
                        key={c.id}
                        className={
                          selectedUid === c.id
                            ? "bg-indigo-50 hover:bg-indigo-50"
                            : "hover:bg-slate-50"
                        }
                      >
                        <td className="max-w-[10rem] truncate px-3 py-2 text-slate-900">
                          {c.name || "—"}
                        </td>
                        <td className="max-w-[12rem] truncate px-3 py-2 text-slate-700">
                          {c.email || "—"}
                        </td>
                        <td className="hidden px-3 py-2 text-slate-700 sm:table-cell">
                          {c.mobile ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUid(c.id);
                              setInfo(`Selected ${c.name || c.email || c.id}`);
                            }}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium text-white ${
                              selectedUid === c.id
                                ? "bg-indigo-800"
                                : "bg-indigo-600 hover:bg-indigo-700"
                            }`}
                          >
                            {selectedUid === c.id ? "Selected" : "Select"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {customerSnap && (
            <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50/50 p-4 text-sm">
              <p className="font-semibold text-gray-900">Selected customer</p>
              <p className="mt-1 text-gray-800">
                {customerSnap.name || "—"} · {customerSnap.email || "—"}
              </p>
              <p className="mt-1 font-mono text-xs text-gray-600">
                UID: {customerSnap.id}
              </p>
            </div>
          )}
        </div>

        {customerSnap && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
            <p className="font-semibold text-gray-800">
              Linked cases: {casesArray.length}
            </p>
            {casesArray.length === 0 ? (
              <p className="mt-2 text-gray-600">No cases linked yet.</p>
            ) : (
              <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                {casesArray.map((id) => {
                  const meta = linkedCaseDetails[id] || {};
                  return (
                    <li
                      key={id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">
                          {meta.name || "—"}
                          {meta.missing && (
                            <span className="ml-2 text-xs text-amber-700">
                              (case doc missing)
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-600">
                          {meta.email || "—"}
                        </p>
                        <p className="font-mono text-[10px] text-slate-500">
                          {id}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={loadingAction}
                        onClick={() => delinkCaseFromCustomer(id)}
                        className="shrink-0 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                      >
                        Delink
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        <div className="border-t border-gray-200 pt-6">
          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            Search cases
          </h3>
          <p className="mb-4 text-sm text-gray-600">
            Same search as &quot;View All Cases&quot;. Select a customer in the
            search above, then find a case and click Link.
          </p>
          {!selectedUid && (
            <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Select a customer above to enable linking.
            </p>
          )}

          {loadingCases && (
            <p className="text-center text-gray-600">Loading cases…</p>
          )}

          {casesFetchError && (
            <p className="text-center text-red-600">{casesFetchError}</p>
          )}

          {!loadingCases && !casesFetchError && cases.length === 0 && (
            <p className="text-center text-slate-600">
              There are currently no cases in the system.
            </p>
          )}

          {!loadingCases && !casesFetchError && cases.length > 0 && (
            <>
              <div className="ui-search-panel mb-4">
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search cases..."
                      className="ui-input w-full"
                    />
                  </div>
                  <div className="sm:w-48">
                    <select
                      value={searchField}
                      onChange={(e) => setSearchField(e.target.value)}
                      className="ui-input w-full sm:w-48"
                    >
                      <option value="all">All Fields</option>
                      <option value="name">Name</option>
                      <option value="email">Email</option>
                      <option value="mobile">Mobile</option>
                    </select>
                  </div>
                </div>
                <div className="text-sm text-slate-600">
                  Found {filteredCases.length} cases
                  {searchQuery && ` matching "${searchQuery}"`}
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                  <thead className="sticky top-0 bg-slate-100">
                    <tr>
                      <th className="px-3 py-2 font-semibold text-slate-700">
                        Name
                      </th>
                      <th className="px-3 py-2 font-semibold text-slate-700">
                        Case ID
                      </th>
                      <th className="hidden px-3 py-2 font-semibold text-slate-700 md:table-cell">
                        Email
                      </th>
                      <th className="hidden px-3 py-2 font-semibold text-slate-700 sm:table-cell">
                        Mobile
                      </th>
                      <th className="hidden px-3 py-2 font-semibold text-slate-700 lg:table-cell">
                        Status
                      </th>
                      <th className="hidden px-3 py-2 font-semibold text-slate-700 xl:table-cell">
                        Complaint date
                      </th>
                      <th className="px-3 py-2 font-semibold text-slate-700">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredCases.map((case_) => (
                      <tr key={case_.id} className="hover:bg-slate-50">
                        <td className="max-w-[10rem] truncate px-3 py-2 text-slate-900">
                          {case_.name || "—"}
                        </td>
                        <td className="max-w-[9rem] break-all px-3 py-2 font-mono text-xs text-slate-700">
                          {case_.id}
                        </td>
                        <td className="hidden max-w-[12rem] truncate px-3 py-2 text-slate-700 md:table-cell">
                          {case_.email || "—"}
                        </td>
                        <td className="hidden px-3 py-2 text-slate-700 sm:table-cell">
                          {case_.mobile ?? "—"}
                        </td>
                        <td className="hidden px-3 py-2 text-slate-700 lg:table-cell">
                          {case_.status || "—"}
                        </td>
                        <td className="hidden whitespace-nowrap px-3 py-2 text-slate-600 xl:table-cell">
                          {formatComplaintDate(case_.complaintDate)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          <button
                            type="button"
                            disabled={
                              loadingAction || !selectedUid
                            }
                            onClick={() => linkIdsToCustomer([case_.id])}
                            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Link
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h3 className="mb-3 text-lg font-semibold text-gray-900">
            Lookup case by claimant email
          </h3>
          <form onSubmit={handleLookup} className="flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              value={lookupEmail}
              onChange={(e) => setLookupEmail(e.target.value)}
              placeholder="Claimant email on case"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
            />
            <button
              type="submit"
              disabled={loadingAction || !lookupEmail.trim()}
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Lookup
            </button>
          </form>
          {lookupResult?.kind === "one" && (
            <p className="mt-2 text-sm text-green-700">
              Found ID:{" "}
              <button
                type="button"
                className="font-mono underline"
                onClick={() => {
                  setSingleId(lookupResult.id);
                  setInfo(`Resolved ID ${lookupResult.id} — add below.`);
                }}
              >
                {lookupResult.id}
              </button>
              {lookupResult.name ? ` (${lookupResult.name})` : ""}
            </p>
          )}
          {lookupResult?.kind === "many" && (
            <ul className="mt-2 space-y-1 text-sm">
              {lookupResult.docs.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    className="font-mono text-blue-700 underline"
                    onClick={() => {
                      setSingleId(d.id);
                      setInfo(`Selected ${d.id}`);
                    }}
                  >
                    {d.id}
                  </button>
                  {d.name ? ` — ${d.name}` : ""}
                </li>
              ))}
            </ul>
          )}
          {lookupResult?.kind === "none" && (
            <p className="mt-2 text-sm text-amber-700">
              No case found with email matching exactly in Firestore.
            </p>
          )}
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h3 className="mb-3 text-lg font-semibold text-gray-900">
            Add one case ID
          </h3>
          <form onSubmit={handleAddSingle} className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={singleId}
              onChange={(e) => setSingleId(e.target.value)}
              placeholder="Firestore users document ID"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900"
            />
            <button
              type="submit"
              disabled={loadingAction || !selectedUid || !singleId.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Add case
            </button>
          </form>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h3 className="mb-3 text-lg font-semibold text-gray-900">
            Bulk paste IDs
          </h3>
          <p className="mb-2 text-xs text-gray-500">
            Separate with commas, spaces, or new lines.
          </p>
          <textarea
            value={bulkIds}
            onChange={(e) => setBulkIds(e.target.value)}
            rows={4}
            placeholder="id1&#10;id2,id3"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900"
          />
          <button
            type="button"
            onClick={handleBulkLink}
            disabled={loadingAction || !selectedUid || !bulkIds.trim()}
            className="mt-3 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 sm:w-auto"
          >
            Link all IDs
          </button>
        </div>

        {info && <p className="text-center text-sm text-green-600">{info}</p>}
        {error && <p className="text-center text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
