import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import Policy from "./policy";
import GiveAnalysis from "./giveAnalysis";

async function loadAllPolicyAnalyses() {
  const snap = await getDocs(collection(db, "PolicyAnalysis"));
  const rows = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      customerUserId: data.customerUserId,
      storagePath: data.policyStoragePath,
      fileName: data.policyFileName,
      status: data.status || "pending",
      insurerName: data.insurerName || "",
      policyType: data.policyType || "",
      coverageSummary: data.coverageSummary || "",
      keyExclusions: data.keyExclusions || "",
      recommendations: data.recommendations || "",
      additionalNotes: data.additionalNotes || "",
      createdAt: data.createdAt,
    };
  });

  rows.sort((a, b) => {
    const ta = new Date(a.createdAt || 0).getTime();
    const tb = new Date(b.createdAt || 0).getTime();
    return tb - ta;
  });

  return rows;
}

async function enrichWithCustomerLabels(rows) {
  const uniqueIds = [...new Set(rows.map((r) => r.customerUserId))];
  const labelById = {};

  await Promise.all(
    uniqueIds.map(async (uid) => {
      try {
        const snap = await getDoc(doc(db, "customers", uid));
        if (snap.exists()) {
          const data = snap.data();
          labelById[uid] = data.name || data.email || uid;
        } else {
          labelById[uid] = uid;
        }
      } catch {
        labelById[uid] = uid;
      }
    })
  );

  return rows.map((row) => ({
    ...row,
    customerLabel: labelById[row.customerUserId] || row.customerUserId,
  }));
}

function StatusBadge({ status }) {
  const isCompleted = status === "completed";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        isCompleted
          ? "bg-emerald-100 text-emerald-800"
          : "bg-amber-100 text-amber-800"
      }`}
    >
      {isCompleted ? "Completed" : "Pending"}
    </span>
  );
}

export default function PolicyRequests() {
  const [view, setView] = useState("list");
  const [policies, setPolicies] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadPolicies = async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await loadAllPolicyAnalyses();
      const enriched = await enrichWithCustomerLabels(rows);
      setPolicies(enriched);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load policy requests.");
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  const handleSelectPolicy = (policy) => {
    setSelected(policy);
    setView("policy");
  };

  const handleBackToList = () => {
    setSelected(null);
    setView("list");
    loadPolicies();
  };

  const handleGiveAnalysis = () => {
    setView("analysis");
  };

  const handleAnalysisSaved = async () => {
    const rows = await loadAllPolicyAnalyses();
    const enriched = await enrichWithCustomerLabels(rows);
    setPolicies(enriched);
    if (selected?.id) {
      const updated = enriched.find((p) => p.id === selected.id);
      if (updated) setSelected(updated);
    }
    setView("policy");
  };

  if (view === "policy" && selected) {
    return (
      <Policy
        policy={selected}
        onBack={handleBackToList}
        onGiveAnalysis={handleGiveAnalysis}
      />
    );
  }

  if (view === "analysis" && selected) {
    return (
      <GiveAnalysis
        policy={selected}
        onBack={() => setView("policy")}
        onSaved={handleAnalysisSaved}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <div className="ui-spinner" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto">
        <div className="ui-page-intro mb-6">
          <p className="ui-section-eyebrow">Policies</p>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Policy Requests
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Policy requests from customer uploads
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {policies.length === 0 && !error ? (
          <div className="ui-empty-state py-12 text-sm">
            No policy requests found.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-indigo-100/80 bg-white shadow-md">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    File
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Status
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 md:table-cell">
                    Customer ID
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {policies.map((policy) => (
                  <tr
                    key={policy.id}
                    onClick={() => handleSelectPolicy(policy)}
                    className="cursor-pointer transition hover:bg-indigo-50/50"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {policy.fileName}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {policy.customerLabel}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={policy.status} />
                    </td>
                    <td className="hidden max-w-xs truncate px-4 py-3 font-mono text-xs text-slate-500 md:table-cell">
                      {policy.customerUserId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
