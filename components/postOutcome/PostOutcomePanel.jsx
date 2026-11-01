import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { invalidateCollection } from "../../lib/collectionCache";
import {
  POST_OUTCOME_KEYS,
  POST_OUTCOME_STAGES,
  badgesFor,
  buildStartUpdate,
  canStartStage,
} from "../../lib/postOutcomeStages";

const formatRupees = (value) => {
  if (value === "" || value === undefined || value === null) return "N/A";
  return `₹${Number(value).toLocaleString("en-IN")}`;
};

/**
 * Shown above the full case on the Solved and Rejected screens. Offers the stages that can follow:
 * Additional Compensation for a solved case, RTI and Consumer Court for a rejected one.
 */
export default function PostOutcomePanel({ docId, onStarted }) {
  const [caseData, setCaseData] = useState(null);
  const [openKey, setOpenKey] = useState("");
  const [form, setForm] = useState({ amountReceived: "", extraClaimed: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!docId) return;
      try {
        const snap = await getDoc(doc(db, "users", docId));
        if (!cancelled && snap.exists()) setCaseData(snap.data());
      } catch (err) {
        console.error("Error loading case for post-outcome stages:", err);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [docId]);

  if (!caseData) return null;

  const startable = POST_OUTCOME_KEYS.filter((key) => canStartStage(caseData, key));
  const badges = badgesFor(caseData);
  if (startable.length === 0 && badges.length === 0) return null;

  const open = (key) => {
    setError("");
    setOpenKey(key);
    setForm({
      amountReceived: caseData.claim === undefined || caseData.claim === null ? "" : String(caseData.claim),
      extraClaimed: "",
      note: "",
    });
  };

  const handleStart = async () => {
    const stage = POST_OUTCOME_STAGES[openKey];
    setError("");
    let update;
    try {
      update = buildStartUpdate(openKey, caseData, form);
    } catch (err) {
      setError(err.message);
      return;
    }
    if (!window.confirm(`Start ${stage.label} for this case? The customer will see the new status.`)) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, "users", docId), update);
      invalidateCollection("users");
      alert(`${stage.label} started`);
      if (onStarted) onStarted();
    } catch (err) {
      console.error(`Error starting ${openKey}:`, err);
      setError(`Failed to start ${stage.label}. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  const stage = openKey ? POST_OUTCOME_STAGES[openKey] : null;

  return (
    <div className="ui-search-panel mb-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-slate-800">After this case</span>
        {startable.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => open(key)}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Start {POST_OUTCOME_STAGES[key].label}
          </button>
        ))}
        {badges.map((badge) => (
          <span
            key={badge.key}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              badge.tone === "active" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"
            }`}
          >
            {badge.text}
          </span>
        ))}
      </div>

      {stage && (
        <div className="mt-4 space-y-3 border-t pt-4">
          <h3 className="font-semibold text-slate-900">Start {stage.label}</h3>

          {openKey === "additionalCompensation" && (
            <>
              <p className="text-sm text-slate-600">
                Amount claimed from the insurer: {formatRupees(caseData.estimatedClaimAmount)}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Amount the client actually received (₹)</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.amountReceived}
                    onChange={(e) => setForm({ ...form, amountReceived: e.target.value })}
                    className="ui-input mt-1"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Extra compensation we are claiming (₹)</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.extraClaimed}
                    onChange={(e) => setForm({ ...form, extraClaimed: e.target.value })}
                    className="ui-input mt-1"
                  />
                </label>
              </div>
            </>
          )}

          <label className="block text-sm">
            <span className="font-medium text-slate-700">Note (staff only, optional)</span>
            <textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              rows={2}
              className="ui-input mt-1"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleStart}
              disabled={saving}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              {saving ? "Starting..." : `Start ${stage.label}`}
            </button>
            <button
              type="button"
              onClick={() => setOpenKey("")}
              disabled={saving}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
