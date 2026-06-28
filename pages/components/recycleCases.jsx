import { useState, useEffect, useCallback } from "react";
import { fetchCollectionCached } from "../../lib/collectionCache";
import { restoreCaseFromRecycle } from "../../lib/caseRecycle";
import usePartnerRefNameMap from "../../lib/usePartnerRefNameMap";
import { resolvePartnerDisplayName } from "../../lib/partnerLookup";

export default function RecycleCases() {
  const { partnerMap } = usePartnerRefNameMap();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState("name");
  const [filteredCases, setFilteredCases] = useState([]);
  const [restoringId, setRestoringId] = useState(null);

  const loadRecycledCases = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const casesData = await fetchCollectionCached("recycle", { forceRefresh });
      casesData.sort(
        (a, b) => new Date(b.recycledAt || 0) - new Date(a.recycledAt || 0)
      );
      setCases(casesData);
      setFilteredCases(casesData);
    } catch (err) {
      console.error("Error fetching recycled cases:", err);
      setError("Failed to fetch recycled cases: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecycledCases();
  }, [loadRecycledCases]);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredCases(cases);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = cases.filter((case_) => {
      switch (searchField) {
        case "name":
          return case_.name?.toLowerCase().includes(query);
        case "email":
          return case_.email?.toLowerCase().includes(query);
        case "mobile":
          return case_.mobile?.toString().includes(query);
        case "all":
          return (
            case_.name?.toLowerCase().includes(query) ||
            case_.email?.toLowerCase().includes(query) ||
            case_.mobile?.toString().includes(query) ||
            case_.claimNo?.toString().toLowerCase().includes(query)
          );
        default:
          return true;
      }
    });

    setFilteredCases(filtered);
  }, [searchQuery, searchField, cases]);

  const handleRestore = async (e, caseId, caseName) => {
    e.stopPropagation();
    const ok = window.confirm(
      `Restore case "${caseName || "Unnamed"}" back to active cases?`
    );
    if (!ok) return;

    try {
      setRestoringId(caseId);
      await restoreCaseFromRecycle(caseId);
      setCases((prev) => prev.filter((c) => c.id !== caseId));
      setFilteredCases((prev) => prev.filter((c) => c.id !== caseId));
      alert("Case restored successfully");
    } catch (err) {
      alert("Failed to restore case: " + err.message);
    } finally {
      setRestoringId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="ui-spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="ui-content-max">
      <div className="ui-page-intro mb-6">
        <p className="ui-section-eyebrow">Cases</p>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Recycle Bin
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Cases moved here can be restored back to active cases.
        </p>
      </div>

      <div className="mb-6">
        <div className="ui-search-panel">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search recycled cases..."
                className="ui-input"
              />
            </div>

            <div className="sm:w-48">
              <select
                value={searchField}
                onChange={(e) => setSearchField(e.target.value)}
                className="ui-input sm:w-48"
              >
                <option value="all">All Fields</option>
                <option value="name">Name</option>
                <option value="email">Email</option>
                <option value="mobile">Mobile</option>
              </select>
            </div>
          </div>

          <div className="text-sm text-slate-600">
            Found {filteredCases.length} recycled case
            {filteredCases.length === 1 ? "" : "s"}
            {searchQuery && ` matching "${searchQuery}"`}
          </div>
        </div>
      </div>

      {filteredCases.length === 0 ? (
        <div className="ui-empty-state">No recycled cases found.</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCases.map((case_) => (
            <div key={case_.id} className="ui-list-card">
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-semibold text-lg">
                    {case_.name || "No Name"}
                  </h3>
                  <span className="text-sm text-slate-500 shrink-0">
                    {resolvePartnerDisplayName(case_.partnerRef, partnerMap)}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 text-sm">
                  <p className="text-slate-600">
                    <span className="font-medium">Email:</span>{" "}
                    {case_.email || "N/A"}
                  </p>
                  <p className="text-slate-600">
                    <span className="font-medium">Claim No:</span>{" "}
                    {case_.claimNo || "N/A"}
                  </p>
                  <p className="text-slate-600">
                    <span className="font-medium">Mobile:</span>{" "}
                    {case_.mobile || "N/A"}
                  </p>
                  <p className="text-slate-600">
                    <span className="font-medium">Claim Amount:</span> ₹
                    {case_.estimatedClaimAmount || "N/A"}
                  </p>
                </div>

                <div className="border-t pt-2 mt-2">
                  <p className="text-sm text-slate-600">
                    <span className="font-medium">Moved to Recycle:</span>
                    <br />
                    {formatDate(case_.recycledAt)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => handleRestore(e, case_.id, case_.name)}
                  disabled={restoringId === case_.id}
                  className="ui-btn-primary w-full text-sm disabled:opacity-50"
                >
                  {restoringId === case_.id ? "Restoring…" : "Restore Case"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
