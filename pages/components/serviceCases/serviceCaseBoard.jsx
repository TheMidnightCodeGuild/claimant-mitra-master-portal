import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchCollectionCached } from "../../../lib/collectionCache";
import {
  CASE_TYPES,
  CASE_TYPE_KEYS,
  STAGES,
  STAGE_LABELS,
  caseTypeLabel,
} from "../../../lib/serviceCaseTypes";
import { countByStage, matchesServiceSearch, serviceCaseFilters, stageOf } from "../../../lib/serviceCaseFilters";
import ServiceCaseDetail from "../../../components/serviceCases/serviceCaseDetail";

function toDate(value) {
  if (!value) return null;
  if (typeof value === "object" && typeof value.toDate === "function") return value.toDate();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function receivedAt(c) {
  return toDate(c.complaintDate) || toDate(c.createdAt);
}

export default function ServiceCaseBoard({ initialStage = "all" }) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stage, setStage] = useState(initialStage);
  const [caseType, setCaseType] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      setCases(await fetchCollectionCached("serviceCases", { forceRefresh }));
    } catch (err) {
      console.error("Error fetching service cases:", err);
      setError("Failed to fetch cases");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const ofType = useMemo(
    () => cases.filter((c) => caseType === "all" || c.caseType === caseType),
    [cases, caseType]
  );
  const counts = useMemo(() => countByStage(ofType), [ofType]);

  const visible = useMemo(
    () =>
      ofType
        .filter(serviceCaseFilters[stage] || serviceCaseFilters.all)
        .filter((c) => matchesServiceSearch(c, query))
        .sort((a, b) => (receivedAt(b)?.getTime() || 0) - (receivedAt(a)?.getTime() || 0)),
    [ofType, stage, query]
  );

  if (selectedId) {
    return (
      <ServiceCaseDetail
        docId={selectedId}
        onBack={() => {
          setSelectedId(null);
          load(true);
        }}
      />
    );
  }

  return (
    <div className="lg:max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8 py-2">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 border-b pb-4 border-slate-200">
        <h2 className="text-3xl font-bold text-slate-800">Loan &amp; Mailing Cases</h2>
        <button type="button" onClick={() => load(true)} className="ui-btn-secondary">
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {["all", ...STAGES].map((s) => (
          <button
            type="button"
            key={s}
            onClick={() => setStage(s)}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
              stage === s
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
            }`}
          >
            {s === "all" ? "All" : STAGE_LABELS[s]} ({s === "all" ? ofType.length : counts[s]})
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={caseType}
          onChange={(e) => setCaseType(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-md"
        >
          <option value="all">All case types</option>
          {CASE_TYPE_KEYS.map((k) => (
            <option key={k} value={k}>
              {CASE_TYPES[k].label}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, mobile, lender, account no."
          className="flex-1 min-w-[240px] px-3 py-2 border border-slate-300 rounded-md"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-indigo-600"></div>
        </div>
      ) : error ? (
        <div className="text-center text-red-600 py-10">{error}</div>
      ) : visible.length === 0 ? (
        <div className="ui-empty-state py-10">No cases found</div>
      ) : (
        <div className="overflow-x-auto ui-card-padded border-slate-200/90 shadow-md">
          <table className="min-w-full text-sm text-left">
            <thead className="text-xs uppercase text-slate-500 border-b">
              <tr>
                <th className="py-2 pr-4">Customer</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Stage</th>
                <th className="py-2 pr-4">Subject</th>
                <th className="py-2 pr-4">Source</th>
                <th className="py-2 pr-4">Received</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className="border-b last:border-0 hover:bg-indigo-50/60 cursor-pointer"
                >
                  <td className="py-3 pr-4">
                    <div className="font-medium text-slate-800">{c.name || "-"}</div>
                    <div className="text-xs text-slate-500">{c.email || c.mobile}</div>
                  </td>
                  <td className="py-3 pr-4">{caseTypeLabel(c.caseType)}</td>
                  <td className="py-3 pr-4">{STAGE_LABELS[stageOf(c)]}</td>
                  <td className="py-3 pr-4">{c.lender || c.subject || c.bureau || "-"}</td>
                  <td className="py-3 pr-4 capitalize">{c.source || "-"}</td>
                  <td className="py-3 pr-4">{receivedAt(c)?.toLocaleDateString("en-IN") || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
