import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import SendToReview from "./caseStatus/sendToReview";
import usePartnerRefNameMap from "../../lib/usePartnerRefNameMap";
import { resolvePartnerDisplayName } from "../../lib/partnerLookup";

export default function ViewLatestLeads() {
  const { partnerMap } = usePartnerRefNameMap();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    async function fetchLatestLeads() {
      try {
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        twoDaysAgo.setHours(0, 0, 0, 0);
        const twoDaysAgoStr = twoDaysAgo.toISOString();

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        const yesterdayStr = yesterday.toISOString();

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString();

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const tomorrowStr = tomorrow.toISOString();

        const usersRef = collection(db, "users");
        
        const twoDaysAgoQuery = query(
          usersRef,
          where("complaintDate", ">=", twoDaysAgoStr),
          where("complaintDate", "<", yesterdayStr)
        );

        const yesterdayQuery = query(
          usersRef,
          where("complaintDate", ">=", yesterdayStr),
          where("complaintDate", "<", todayStr)
        );

        const todayQuery = query(
          usersRef,
          where("complaintDate", ">=", todayStr),
          where("complaintDate", "<", tomorrowStr)
        );

        const [twoDaysAgoSnapshot, yesterdaySnapshot, todaySnapshot] = await Promise.all([
          getDocs(twoDaysAgoQuery),
          getDocs(yesterdayQuery),
          getDocs(todayQuery)
        ]);

        const twoDaysAgoLeads = twoDaysAgoSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const yesterdayLeads = yesterdaySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const todayLeads = todaySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const allLeads = [...twoDaysAgoLeads, ...yesterdayLeads, ...todayLeads];
        allLeads.sort(
          (a, b) => new Date(b.complaintDate) - new Date(a.complaintDate)
        );

        setLeads(allLeads);
      } catch (err) {
        console.error("Error fetching leads:", err);
        setError("Failed to fetch latest leads. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchLatestLeads();
  }, []);

  const handleDeleteLead = async (e, lead) => {
    e.stopPropagation();
    const ok = window.confirm(
      `Delete case "${lead.name || "Unnamed Lead"}"? This cannot be undone.`
    );
    if (!ok) return;
    try {
      setDeletingId(lead.id);
      await deleteDoc(doc(db, "users", lead.id));
      setLeads((prev) => prev.filter((l) => l.id !== lead.id));
      if (selectedLeadId === lead.id) setSelectedLeadId(null);
    } catch (err) {
      alert("Failed to delete lead: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] sm:min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-4 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[50vh] sm:min-h-screen flex items-center justify-center p-4">
        <div className="text-red-600 text-center">
          <p className="text-lg sm:text-xl font-semibold mb-2">⚠️ Error</p>
          <p className="text-sm sm:text-base">{error}</p>
        </div>
      </div>
    );
  }

  if (selectedLeadId) {
    return (
      <div className="max-w-[1300px] mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <button
          onClick={() => setSelectedLeadId(null)}
          className="mb-4 sm:mb-6 px-4 sm:px-6 py-2 text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-2 transition-colors text-sm sm:text-base"
        >
          <span>←</span>
          <span>Back to Leads</span>
        </button>
        <SendToReview
          docId={selectedLeadId}
          onComplete={() => setSelectedLeadId(null)}
        />
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="min-h-[50vh] sm:min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-lg sm:text-xl font-semibold text-slate-700 mb-2 sm:mb-3">
            No New Leads Found
          </p>
          <p className="text-sm sm:text-base text-slate-500">
            Search period:{" "}
            {new Date(Date.now() - 172800000).toLocaleDateString()} to{" "}
            {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full lg:max-w-[1300px] mx-auto px-3 sm:px-0 py-4 sm:py-0">
      <div className="ui-page-intro mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div>
            <p className="ui-section-eyebrow">Intake</p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-center sm:text-left">
              Latest Leads
            </h2>
          </div>
        </div>
        <span className="ui-stat-pill justify-center">
          {leads.length} {leads.length === 1 ? "Lead" : "Leads"}
        </span>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {leads.map((lead) => (
          <div
            key={lead.id}
            onClick={() => setSelectedLeadId(lead.id)}
            className="ui-list-card"
          >
            <div className="space-y-2 sm:space-y-3">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0">
                <h3 className="font-semibold text-lg sm:text-xl text-slate-800 break-words">
                  {lead.name || "Unnamed Lead"}
                </h3>
                <span className="text-xs sm:text-sm text-slate-500 whitespace-nowrap">
                  {new Date(lead.complaintDate).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 rounded-full text-xs sm:text-sm font-medium ${
                    lead.status === "Under Review"
                      ? "bg-yellow-100 text-yellow-800"
                      : lead.status === "Rejected"
                      ? "bg-red-100 text-red-800"
                      : lead.status === "Solved"
                      ? "bg-green-100 text-green-800"
                      : "bg-slate-100 text-slate-800"
                  }`}
                >
                  {lead.status || "New Lead"}
                </span>
              </div>

              {lead.estimatedClaimAmount && (
                <p className="text-slate-700 flex items-center gap-2 text-sm sm:text-base">
                  <span className="font-medium">Claim Amount:</span>
                  <span>
                    ₹{Number(lead.estimatedClaimAmount).toLocaleString()}
                  </span>
                </p>
              )}

              {lead.partnerRef && (
                <p className="text-slate-700 flex items-center gap-2 text-sm sm:text-base">
                  <span className="font-medium">Partner:</span>
                  <span className="break-all">{resolvePartnerDisplayName(lead.partnerRef, partnerMap)}</span>
                </p>
              )}

              {lead.mobile && (
                <p className="text-slate-700 flex items-center gap-2 text-sm sm:text-base">
                  <span className="font-medium">Mobile:</span>
                  <span>{lead.mobile}</span>
                </p>
              )}

              <button
                type="button"
                onClick={(e) => handleDeleteLead(e, lead)}
                disabled={deletingId === lead.id}
                className="ui-btn-danger text-sm mt-2 disabled:opacity-50"
              >
                {deletingId === lead.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
