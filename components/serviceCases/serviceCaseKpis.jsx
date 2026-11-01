import { useEffect, useMemo, useState } from "react";
import { fetchCollectionCached } from "../../lib/collectionCache";
import { CASE_TYPES, CASE_TYPE_KEYS, STAGES, STAGE_LABELS } from "../../lib/serviceCaseTypes";
import { stageOf } from "../../lib/serviceCaseFilters";

function receivedAt(c) {
  const v = c.createdAt || c.complaintDate;
  if (!v) return null;
  const d = typeof v?.toDate === "function" ? v.toDate() : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Loan and mailing cases, counted apart from insurance cases: they sit in a
 * different collection, and their money (a share of what was saved, or a flat
 * fee) is not an insurance claim amount.
 */
export default function ServiceCaseKpis({ rangeStart, refreshIndex }) {
  const [cases, setCases] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchCollectionCached("serviceCases", { forceRefresh: refreshIndex > 0 })
      .then((list) => !cancelled && setCases(list))
      .catch((err) => {
        console.error("Failed to load service case KPIs:", err);
        if (!cancelled) setError("Failed to load loan and mailing case metrics");
      });
    return () => {
      cancelled = true;
    };
  }, [refreshIndex]);

  const rows = useMemo(() => {
    const inRange = cases.filter((c) => {
      if (!rangeStart) return true;
      const d = receivedAt(c);
      return d ? d >= rangeStart : false;
    });
    return CASE_TYPE_KEYS.map((key) => {
      const ofType = inRange.filter((c) => c.caseType === key);
      const byStage = Object.fromEntries(STAGES.map((s) => [s, 0]));
      let fees = 0;
      for (const c of ofType) {
        byStage[stageOf(c)] += 1;
        if (stageOf(c) === "resolved" && c.fee?.amount) fees += Number(c.fee.amount) || 0;
      }
      return { key, total: ofType.length, byStage, fees };
    });
  }, [cases, rangeStart]);

  return (
    <div className="ui-section-slate">
      <h3 className="ui-section-title mb-3">Loan &amp; Mailing Cases (Range)</h3>
      {error ? (
        <p className="text-sm text-rose-600">{error}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-1 pr-4">Type</th>
                <th className="py-1 pr-4">Total</th>
                {STAGES.map((s) => (
                  <th key={s} className="py-1 pr-4">
                    {STAGE_LABELS[s]}
                  </th>
                ))}
                <th className="py-1 pr-4">Fees on resolved</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-t border-slate-200">
                  <td className="py-2 pr-4 font-medium text-slate-800">{CASE_TYPES[r.key].label}</td>
                  <td className="py-2 pr-4">{r.total}</td>
                  {STAGES.map((s) => (
                    <td key={s} className="py-2 pr-4">
                      {r.byStage[s]}
                    </td>
                  ))}
                  <td className="py-2 pr-4">₹{Math.round(r.fees).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
