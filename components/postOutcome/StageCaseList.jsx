import { useState, useEffect } from "react";
import { fetchCollectionCached } from "../../lib/collectionCache";
import { filterCasesByKey } from "../../lib/caseFilters";
import { POST_OUTCOME_STAGES, sortByStageDate } from "../../lib/postOutcomeStages";
import usePartnerRefNameMap from "../../lib/usePartnerRefNameMap";
import { resolvePartnerDisplayName } from "../../lib/partnerLookup";
import StageCaseDetail from "./StageCaseDetail";

const formatDate = (value) => {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const daysSince = (value) => {
  if (!value) return null;
  return Math.floor((new Date() - new Date(value)) / (1000 * 60 * 60 * 24));
};

const formatRupees = (value) => {
  if (value === "" || value === undefined || value === null) return "N/A";
  return `₹${Number(value).toLocaleString("en-IN")}`;
};

/** The list of cases currently in one post-outcome stage (Additional Compensation, RTI or Consumer Court). */
export default function StageCaseList({ stageKey }) {
  const stage = POST_OUTCOME_STAGES[stageKey];
  const { partnerMap } = usePartnerRefNameMap();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState("all");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function fetchCases() {
      try {
        const allCases = await fetchCollectionCached("users");
        if (!cancelled) setCases(sortByStageDate(filterCasesByKey(allCases, stageKey), stageKey));
      } catch (err) {
        console.error(`Error fetching ${stageKey} cases:`, err);
        if (!cancelled) setError(`Failed to fetch ${stage.label} cases`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchCases();
    return () => {
      cancelled = true;
    };
  }, [stageKey, reloadKey, stage.label]);

  const handleBack = () => {
    setSelectedCaseId(null);
    setLoading(true);
    setReloadKey((n) => n + 1);
  };

  const query = searchQuery.toLowerCase();
  const filteredCases = !query
    ? cases
    : cases.filter((case_) => {
        const name = case_.name?.toLowerCase().includes(query);
        const email = case_.email?.toLowerCase().includes(query);
        const mobile = case_.mobile?.toString().includes(query);
        if (searchField === "name") return name;
        if (searchField === "email") return email;
        if (searchField === "mobile") return mobile;
        return name || email || mobile;
      });

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

  if (selectedCaseId) {
    return (
      <div>
        <button
          onClick={handleBack}
          className="mb-4 px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← Back to {stage.label} Cases
        </button>
        <StageCaseDetail docId={selectedCaseId} stageKey={stageKey} onComplete={handleBack} />
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-500 text-center">
          <p>No {stage.label} cases found</p>
          <p className="text-sm mt-1">Start one from a {stage.parentLabel} case.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ui-content-max">
      <div className="ui-page-intro mb-6">
        <p className="ui-section-eyebrow">After {stage.parentLabel}</p>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{stage.label} Cases</h2>
      </div>

      <div className="mb-6">
        <div className="ui-search-panel">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cases..."
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
            Found {filteredCases.length} cases
            {searchQuery && ` matching "${searchQuery}"`}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredCases.map((case_) => (
          <div key={case_.id} className="ui-list-card" onClick={() => setSelectedCaseId(case_.id)}>
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-lg">{case_.name || "No Name"}</h3>
                <span className="text-sm text-slate-500">
                  Partner: {resolvePartnerDisplayName(case_.partnerRef, partnerMap)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <p className="text-slate-600">
                  <span className="font-medium">Mobile:</span>
                  <br />
                  {case_.mobile || "N/A"}
                </p>
                <p className="text-slate-600">
                  <span className="font-medium">Company:</span>
                  <br />
                  {case_.companyName || "N/A"}
                </p>
                <p className="text-slate-600">
                  <span className="font-medium">Claim Amount:</span>
                  <br />
                  {formatRupees(case_.estimatedClaimAmount)}
                </p>
                {stageKey === "additionalCompensation" && (
                  <p className="text-slate-600">
                    <span className="font-medium">Extra Claimed:</span>
                    <br />
                    {formatRupees(case_.additionalCompensationClaimed)}
                  </p>
                )}
              </div>

              <div className="border-t pt-2 mt-2 text-sm text-slate-600">
                <span className="font-medium">Started:</span> {formatDate(case_[`${stageKey}Date`])}
              </div>

              {case_[`${stageKey}Date`] && (
                <div className="mt-2 bg-blue-50 p-2 rounded-md text-sm text-indigo-700">
                  Days in {stage.label}: {daysSince(case_[`${stageKey}Date`])}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
