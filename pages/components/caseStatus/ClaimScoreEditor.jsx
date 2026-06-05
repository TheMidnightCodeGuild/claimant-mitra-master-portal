import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, deleteField } from "firebase/firestore";
import { db } from "../../../lib/firebase";

export default function ClaimScoreEditor({ docId, className = "" }) {
  const [claimScoreInput, setClaimScoreInput] = useState("");
  const [claimScore, setClaimScore] = useState(null);
  const [claimScoreUpdatedAt, setClaimScoreUpdatedAt] = useState(null);
  const [savingClaimScore, setSavingClaimScore] = useState(false);

  useEffect(() => {
    if (!docId) return;

    let cancelled = false;

    async function loadClaimScore() {
      try {
        const docSnap = await getDoc(doc(db, "users", docId));
        if (cancelled || !docSnap.exists()) return;

        const data = docSnap.data();
        const score = data.claimScore;
        setClaimScore(
          typeof score === "number" && !Number.isNaN(score) ? score : null
        );
        setClaimScoreUpdatedAt(data.claimScoreUpdatedAt || null);
        setClaimScoreInput(
          typeof score === "number" && !Number.isNaN(score) ? String(score) : ""
        );
      } catch (err) {
        console.error("Error loading claim score:", err);
      }
    }

    loadClaimScore();
    return () => {
      cancelled = true;
    };
  }, [docId]);

  const handleSaveClaimScore = async () => {
    const raw = claimScoreInput.trim();
    if (raw === "") {
      alert("Enter a claim score between 0 and 100.");
      return;
    }
    const score = Number(raw);
    if (!Number.isInteger(score) || score < 0 || score > 100) {
      alert("Claim score must be a whole number from 0 to 100.");
      return;
    }

    try {
      setSavingClaimScore(true);
      const updatedAt = new Date().toISOString();
      await updateDoc(doc(db, "users", docId), {
        claimScore: score,
        claimScoreUpdatedAt: updatedAt,
      });
      setClaimScore(score);
      setClaimScoreUpdatedAt(updatedAt);
      alert("Claim score saved successfully");
    } catch (err) {
      console.error("Error saving claim score:", err);
      alert("Failed to save claim score");
    } finally {
      setSavingClaimScore(false);
    }
  };

  const handleClearClaimScore = async () => {
    if (!window.confirm("Clear the claim score for this case?")) return;

    try {
      setSavingClaimScore(true);
      await updateDoc(doc(db, "users", docId), {
        claimScore: deleteField(),
        claimScoreUpdatedAt: deleteField(),
      });
      setClaimScoreInput("");
      setClaimScore(null);
      setClaimScoreUpdatedAt(null);
      alert("Claim score cleared");
    } catch (err) {
      console.error("Error clearing claim score:", err);
      alert("Failed to clear claim score");
    } finally {
      setSavingClaimScore(false);
    }
  };

  if (!docId) return null;

  return (
    <div
      className={`col-span-1 md:col-span-2 space-y-2 rounded-lg border border-indigo-200/60 bg-indigo-50/40 p-4 ${className}`.trim()}
    >
      <label className="block text-sm font-medium text-gray-700">
        Claim score
      </label>
      <p className="text-xs text-gray-600">
        Estimated % chance this case will be solved (shown to customer in CCM).
      </p>
      <div className="mt-2 flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={claimScoreInput}
            onChange={(e) => setClaimScoreInput(e.target.value)}
            className="ui-input w-24"
            placeholder="0–100"
            disabled={savingClaimScore}
          />
          <span className="text-sm text-gray-600">%</span>
        </div>
        <button
          type="button"
          onClick={handleSaveClaimScore}
          disabled={savingClaimScore}
          className="ui-btn-primary px-4 py-2 text-sm"
        >
          {savingClaimScore ? "Saving…" : "Save score"}
        </button>
        {typeof claimScore === "number" && (
          <button
            type="button"
            onClick={handleClearClaimScore}
            disabled={savingClaimScore}
            className="ui-btn-secondary px-4 py-2 text-sm"
          >
            Clear score
          </button>
        )}
      </div>
      {claimScoreUpdatedAt && (
        <p className="text-xs text-gray-500">
          Last updated: {new Date(claimScoreUpdatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
