import { useState } from "react";
import { db } from "../../../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

export default function GiveAnalysis({ policy, onBack, onSaved }) {
  const [insurerName, setInsurerName] = useState(policy?.insurerName || "");
  const [policyType, setPolicyType] = useState(policy?.policyType || "");
  const [coverageSummary, setCoverageSummary] = useState(policy?.coverageSummary || "");
  const [keyExclusions, setKeyExclusions] = useState(policy?.keyExclusions || "");
  const [recommendations, setRecommendations] = useState(policy?.recommendations || "");
  const [additionalNotes, setAdditionalNotes] = useState(policy?.additionalNotes || "");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!policy?.id) {
    return (
      <div className="ui-empty-state max-w-3xl">
        <p className="text-slate-600">
          Open Policy Requests from the dashboard to give an analysis.
        </p>
        {typeof onBack === "function" && (
          <button type="button" onClick={onBack} className="ui-btn-secondary mt-4">
            Back
          </button>
        )}
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!policy.id) {
      setError("Missing policy analysis document.");
      return;
    }

    const trimmedInsurer = insurerName.trim();
    const trimmedCoverage = coverageSummary.trim();

    if (!trimmedInsurer || !trimmedCoverage) {
      setError("Insurer name and coverage summary are required.");
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, "PolicyAnalysis", policy.id), {
        insurerName: trimmedInsurer,
        policyType: policyType.trim(),
        coverageSummary: trimmedCoverage,
        keyExclusions: keyExclusions.trim(),
        recommendations: recommendations.trim(),
        additionalNotes: additionalNotes.trim(),
        status: "completed",
        analyzed: true,
        completedAt: new Date().toISOString(),
      });
      setSuccess(true);
      if (typeof onSaved === "function") {
        setTimeout(() => onSaved(), 800);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to save analysis.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl">
      <div className="ui-page-intro mb-6">
        <p className="ui-section-eyebrow">Policy analysis</p>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Give analysis
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Policy: {policy.fileName} · Customer: {policy.customerLabel || policy.customerUserId}
        </p>
      </div>

      {success && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Analysis saved successfully.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="ui-card-padded space-y-4 border-indigo-100/80">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Insurer name <span className="text-rose-600">*</span>
          </label>
          <input
            type="text"
            value={insurerName}
            onChange={(e) => setInsurerName(e.target.value)}
            className="ui-input mt-1 w-full"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Policy type</label>
          <input
            type="text"
            value={policyType}
            onChange={(e) => setPolicyType(e.target.value)}
            className="ui-input mt-1 w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Coverage summary <span className="text-rose-600">*</span>
          </label>
          <textarea
            value={coverageSummary}
            onChange={(e) => setCoverageSummary(e.target.value)}
            rows={4}
            className="ui-input mt-1 w-full"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Key exclusions</label>
          <textarea
            value={keyExclusions}
            onChange={(e) => setKeyExclusions(e.target.value)}
            rows={3}
            className="ui-input mt-1 w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Recommendations</label>
          <textarea
            value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)}
            rows={3}
            className="ui-input mt-1 w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Additional notes</label>
          <textarea
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            rows={3}
            className="ui-input mt-1 w-full"
          />
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <button type="submit" disabled={loading || success} className="ui-btn-primary disabled:opacity-50">
            {loading ? "Saving…" : "Save analysis"}
          </button>
          <button type="button" onClick={onBack} className="ui-btn-secondary">
            Back
          </button>
        </div>
      </form>
    </div>
  );
}
