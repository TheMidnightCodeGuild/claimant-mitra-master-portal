import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { invalidateCollection } from "../../lib/collectionCache";
import {
  POST_OUTCOME_STAGES,
  buildAmountsUpdate,
  buildEndUpdate,
  buildLogUpdate,
  outcomeLabel,
  outcomeTakesAmount,
} from "../../lib/postOutcomeStages";
import { solvedDateOf } from "../../lib/caseFilters";
import usePartnerRefNameMap from "../../lib/usePartnerRefNameMap";
import { resolvePartnerDisplayName } from "../../lib/partnerLookup";
import FullCase from "../../pages/components/caseStatus/fullCase";

const formatDate = (value) => {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatRupees = (value) => {
  if (value === "" || value === undefined || value === null) return "N/A";
  return `₹${Number(value).toLocaleString("en-IN")}`;
};

/** One case inside Additional Compensation, RTI or Consumer Court: details, staff notes, and how it ended. */
export default function StageCaseDetail({ docId, stageKey, onComplete }) {
  const stage = POST_OUTCOME_STAGES[stageKey];
  const { partnerMap } = usePartnerRefNameMap();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFull, setShowFull] = useState(false);
  const [logRemark, setLogRemark] = useState("");
  const [amounts, setAmounts] = useState({ amountReceived: "", extraClaimed: "" });
  const [outcome, setOutcome] = useState("");
  const [outcomeForm, setOutcomeForm] = useState({ amountReceived: "", note: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const snap = await getDoc(doc(db, "users", docId));
        if (cancelled) return;
        if (!snap.exists()) {
          setError("Case not found");
          return;
        }
        const data = snap.data();
        setCaseData(data);
        setAmounts({
          amountReceived: data.claim === undefined || data.claim === null ? "" : String(data.claim),
          extraClaimed:
            data.additionalCompensationClaimed === undefined || data.additionalCompensationClaimed === null
              ? ""
              : String(data.additionalCompensationClaimed),
        });
      } catch (err) {
        console.error("Error loading stage case:", err);
        if (!cancelled) setError("Failed to load this case");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [docId]);

  const save = async (update, doneMessage) => {
    setBusy(true);
    try {
      await updateDoc(doc(db, "users", docId), update);
      invalidateCollection("users");
      setCaseData((prev) => ({ ...prev, ...update }));
      alert(doneMessage);
      return true;
    } catch (err) {
      console.error("Error saving stage update:", err);
      alert("Failed to save. Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleAddLog = async () => {
    let update;
    try {
      update = buildLogUpdate(stageKey, caseData, logRemark);
    } catch (err) {
      alert(err.message);
      return;
    }
    if (await save(update, "Note added")) setLogRemark("");
  };

  const handleSaveAmounts = async () => {
    let update;
    try {
      update = buildAmountsUpdate(caseData, amounts);
    } catch (err) {
      alert(err.message);
      return;
    }
    await save(update, "Amounts saved");
  };

  const handleEnd = async () => {
    let update;
    try {
      update = buildEndUpdate(stageKey, caseData, outcome, outcomeForm);
    } catch (err) {
      alert(err.message);
      return;
    }
    if (
      !window.confirm(
        `Close ${stage.label} as "${outcomeLabel(stageKey, outcome)}"? The case will go back to ${stage.parentLabel} Cases.`
      )
    ) {
      return;
    }
    if ((await save(update, `${stage.label} closed`)) && onComplete) onComplete();
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

  if (showFull) {
    return (
      <div>
        <button
          onClick={() => setShowFull(false)}
          className="mb-4 px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← Back to {stage.label} details
        </button>
        <FullCase docId={docId} />
      </div>
    );
  }

  const logs = caseData[`${stageKey}Logs`] || [];
  const received = Number(caseData.claim);
  const claimed = Number(caseData.estimatedClaimAmount);
  const shortfall = Number.isFinite(received) && Number.isFinite(claimed) && claimed > received ? claimed - received : null;
  const closed = caseData[`${stageKey}Closed`] === true;

  return (
    <div className="ui-content-max space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="ui-section-eyebrow">After {stage.parentLabel}</p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            {stage.label}: {caseData.name || "No Name"}
          </h2>
          <p className="text-sm text-slate-500">
            Partner: {resolvePartnerDisplayName(caseData.partnerRef, partnerMap)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowFull(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          View Entire Case
        </button>
      </div>

      <div className="ui-search-panel">
        <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-3">
          <p><span className="font-medium">Mobile:</span> {caseData.mobile || "N/A"}</p>
          <p><span className="font-medium">Email:</span> {caseData.email || "N/A"}</p>
          <p><span className="font-medium">Company:</span> {caseData.companyName || "N/A"}</p>
          <p><span className="font-medium">Policy No:</span> {caseData.policyNo || "N/A"}</p>
          <p><span className="font-medium">Claim Amount:</span> {formatRupees(caseData.estimatedClaimAmount)}</p>
          <p><span className="font-medium">Status:</span> {caseData.status || "N/A"}</p>
          {stage.parentFlag === "solved" ? (
            <p><span className="font-medium">Solved On:</span> {formatDate(solvedDateOf(caseData))}</p>
          ) : (
            <>
              <p><span className="font-medium">Rejected On:</span> {formatDate(caseData.caseRejectionDate)}</p>
              <p className="sm:col-span-2">
                <span className="font-medium">Rejection Reason:</span>{" "}
                {caseData.caseRejectionReason || caseData.rejectionReason || "N/A"}
              </p>
            </>
          )}
          <p><span className="font-medium">{stage.label} started:</span> {formatDate(caseData[`${stageKey}Date`])}</p>
        </div>
      </div>

      {stageKey === "additionalCompensation" && (
        <div className="ui-search-panel space-y-3">
          <h3 className="font-semibold text-slate-900">Amounts</h3>
          {shortfall !== null && (
            <p className="text-sm text-slate-600">
              Shortfall from the original claim: {formatRupees(shortfall)}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Amount the client actually received (₹)</span>
              <input
                type="text"
                inputMode="numeric"
                value={amounts.amountReceived}
                onChange={(e) => setAmounts({ ...amounts, amountReceived: e.target.value })}
                className="ui-input mt-1"
                disabled={closed}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Extra compensation we are claiming (₹)</span>
              <input
                type="text"
                inputMode="numeric"
                value={amounts.extraClaimed}
                onChange={(e) => setAmounts({ ...amounts, extraClaimed: e.target.value })}
                className="ui-input mt-1"
                disabled={closed}
              />
            </label>
          </div>
          <p className="text-sm text-slate-600">
            Extra compensation received: {formatRupees(caseData.additionalCompensationReceived)}
          </p>
          {!closed && (
            <button
              type="button"
              onClick={handleSaveAmounts}
              disabled={busy}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              Save Amounts
            </button>
          )}
        </div>
      )}

      <div className="ui-search-panel space-y-3">
        <h3 className="font-semibold text-slate-900">Staff notes</h3>
        {logs.length === 0 && <p className="text-sm text-slate-500">No notes yet.</p>}
        <ul className="space-y-2">
          {logs.map((log, i) => (
            <li key={i} className="rounded-md bg-slate-50 p-2 text-sm text-slate-700">
              <span className="text-xs text-slate-500">{formatDate(log.date)}</span>
              <br />
              {log.remark}
            </li>
          ))}
        </ul>
        <textarea
          value={logRemark}
          onChange={(e) => setLogRemark(e.target.value)}
          rows={2}
          placeholder="Add a note (only staff see this)"
          className="ui-input"
        />
        <button
          type="button"
          onClick={handleAddLog}
          disabled={busy || !logRemark.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          Add Note
        </button>
      </div>

      <div className="ui-search-panel space-y-3">
        <h3 className="font-semibold text-slate-900">How did {stage.label} end?</h3>
        <div className="flex flex-wrap gap-4">
          {stage.outcomes.map((o) => (
            <label key={o.value} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="outcome"
                value={o.value}
                checked={outcome === o.value}
                onChange={() => setOutcome(o.value)}
              />
              {o.label}
            </label>
          ))}
        </div>

        {outcomeTakesAmount(stageKey, outcome) && (
          <label className="block text-sm sm:w-72">
            <span className="font-medium text-slate-700">
              {stageKey === "additionalCompensation"
                ? "Extra compensation received (₹)"
                : "Amount received (₹, optional)"}
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={outcomeForm.amountReceived}
              onChange={(e) => setOutcomeForm({ ...outcomeForm, amountReceived: e.target.value })}
              className="ui-input mt-1"
            />
          </label>
        )}

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Note (staff only, optional)</span>
          <textarea
            value={outcomeForm.note}
            onChange={(e) => setOutcomeForm({ ...outcomeForm, note: e.target.value })}
            rows={2}
            className="ui-input mt-1"
          />
        </label>

        <button
          type="button"
          onClick={handleEnd}
          disabled={busy || !outcome}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          Close {stage.label}
        </button>
      </div>
    </div>
  );
}
