import { useState, useEffect } from "react";

import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import {
  fetchCollectionCached,
  computePartnerReferralStats,
  invalidateCollection,
} from "../../lib/collectionCache";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";

export default function ViewSuperPartners() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState("name");
  const [filteredPartners, setFilteredPartners] = useState([]);
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);
  const [partnerStats, setPartnerStats] = useState({});
  const [deleting, setDeleting] = useState(false);
  const [showDeleteMessage, setShowDeleteMessage] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [connectTargetByPartner, setConnectTargetByPartner] = useState({});
  const [showConnectPanelByPartner, setShowConnectPanelByPartner] = useState({});
  const [selectedUnderBySuper, setSelectedUnderBySuper] = useState({});
  const [showAddUnderBySuper, setShowAddUnderBySuper] = useState({});

  useEffect(() => {
    async function fetchPartners() {
      try {
        const [partnersData, usersData] = await Promise.all([
          fetchCollectionCached("partners"),
          fetchCollectionCached("users"),
        ]);
        setPartners(partnersData);
        setFilteredPartners(partnersData);
        setPartnerStats(computePartnerReferralStats(partnersData, usersData));
      } catch (err) {
        console.error("Error fetching partners:", err);
        setError("Failed to fetch partners");
      } finally {
        setLoading(false);
      }
    }

    fetchPartners();
  }, []);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredPartners(partners);
      return;
    }

    const queryText = searchQuery.toLowerCase();
    const filtered = partners.filter((partner) => {
      switch (searchField) {
        case "name":
          return partner.name?.toLowerCase().includes(queryText);
        case "email":
          return partner.email?.toLowerCase().includes(queryText);
        case "phone":
          return partner.phoneNumber?.toString().includes(queryText);
        case "source":
          return partner.source?.toLowerCase().includes(queryText);
        case "partnerRef":
          return partner.partnerRef?.toLowerCase().includes(queryText);
        case "all":
          return (
            partner.name?.toLowerCase().includes(queryText) ||
            partner.email?.toLowerCase().includes(queryText) ||
            partner.phoneNumber?.toString().includes(queryText) ||
            partner.source?.toLowerCase().includes(queryText) ||
            partner.partnerRef?.toLowerCase().includes(queryText)
          );
        default:
          return true;
      }
    });

    setFilteredPartners(filtered);
  }, [searchQuery, searchField, partners]);

  const normalizePartnerType = (partner) =>
    partner?.partnerType === "super" ? "super" : "normal";

  const superPartners = filteredPartners.filter(
    (partner) => normalizePartnerType(partner) === "super"
  );
  const normalPartners = partners.filter(
    (partner) => normalizePartnerType(partner) === "normal"
  );

  const handleEdit = (partner) => {
    setEditingId(partner.id);
    setEditValues(partner);
  };

  const handleSave = async (id) => {
    try {
      const partnerRef = doc(db, "partners", id);
      await updateDoc(partnerRef, editValues);
      invalidateCollection("partners");
      setPartners((prev) => prev.map((p) => (p.id === id ? { ...p, ...editValues } : p)));
      setEditingId(null);
    } catch (err) {
      console.error("Error updating partner:", err);
      alert("Failed to update partner");
    }
  };

  const handleChange = (field, value) => {
    setEditValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePasswordReset = async (email) => {
    if (!email) {
      alert("Partner has no email address");
      return;
    }
    try {
      setPasswordResetLoading(true);
      const auth = getAuth();
      await sendPasswordResetEmail(auth, email);
      alert(`Password reset email sent to ${email}`);
    } catch (err) {
      console.error("Error sending password reset:", err);
      alert(`Failed to send password reset: ${err.message}`);
    } finally {
      setPasswordResetLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Do you really wanna delete this entry?");
    if (!confirmDelete) return;
    try {
      setDeleting(true);
      await deleteDoc(doc(db, "partners", id));
      invalidateCollection("partners");
      setPartners((prev) => prev.filter((p) => p.id !== id));
      setFilteredPartners((prev) => prev.filter((p) => p.id !== id));
      setShowDeleteMessage(true);
      setTimeout(() => setShowDeleteMessage(false), 3000);
    } catch (err) {
      console.error("Error deleting partner:", err);
      alert("Failed to delete partner");
    } finally {
      setDeleting(false);
    }
  };

  const reassignSinglePartner = async (childPartner, targetSuperId) => {
    const currentSuperId = childPartner?.superPartner;
    if (currentSuperId && currentSuperId !== targetSuperId) {
      const oldSuper = partners.find((p) => p.id === currentSuperId);
      const oldSuperName = oldSuper?.name || oldSuper?.partnerRef || currentSuperId;
      const newSuper = partners.find((p) => p.id === targetSuperId);
      const newSuperName = newSuper?.name || newSuper?.partnerRef || targetSuperId;
      const confirmChange = window.confirm(
        `Change super partner from ${oldSuperName} to ${newSuperName}?`
      );
      if (!confirmChange) return false;

      await updateDoc(doc(db, "partners", currentSuperId), {
        partnersUnder: arrayRemove(childPartner.id),
      });
    }

    await updateDoc(doc(db, "partners", targetSuperId), {
      partnersUnder: arrayUnion(childPartner.id),
      partnerType: "super",
    });

    await updateDoc(doc(db, "partners", childPartner.id), {
      superPartner: targetSuperId,
    });
    invalidateCollection("partners");

    setPartners((prev) =>
      prev.map((item) => {
        if (item.id === childPartner.id) {
          return { ...item, superPartner: targetSuperId };
        }
        if (item.id === targetSuperId) {
          const existing = Array.isArray(item.partnersUnder) ? item.partnersUnder : [];
          return {
            ...item,
            partnerType: "super",
            partnersUnder: existing.includes(childPartner.id)
              ? existing
              : [...existing, childPartner.id],
          };
        }
        if (item.id === currentSuperId) {
          const existing = Array.isArray(item.partnersUnder) ? item.partnersUnder : [];
          return {
            ...item,
            partnersUnder: existing.filter((id) => id !== childPartner.id),
          };
        }
        return item;
      })
    );

    return true;
  };

  const handleConnectToSuper = async (childPartner) => {
    const targetSuperId = connectTargetByPartner[childPartner.id];
    if (!targetSuperId) {
      alert("Please select a super partner");
      return;
    }
    try {
      setActionLoadingId(childPartner.id);
      const didUpdate = await reassignSinglePartner(childPartner, targetSuperId);
      if (!didUpdate) return;
      setShowConnectPanelByPartner((prev) => ({ ...prev, [childPartner.id]: false }));
      setConnectTargetByPartner((prev) => ({ ...prev, [childPartner.id]: "" }));
      alert("Super partner linked successfully");
    } catch (err) {
      console.error("Error connecting to super partner:", err);
      alert("Failed to connect partner");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAddPartnersUnder = async (superPartner) => {
    const selectedNormalIds = selectedUnderBySuper[superPartner.id] || [];
    if (!selectedNormalIds.length) {
      alert("Please select at least one normal partner");
      return;
    }
    try {
      setActionLoadingId(superPartner.id);
      for (const normalPartnerId of selectedNormalIds) {
        const childPartner = partners.find((p) => p.id === normalPartnerId);
        if (!childPartner) continue;
        await reassignSinglePartner(childPartner, superPartner.id);
      }
      setShowAddUnderBySuper((prev) => ({ ...prev, [superPartner.id]: false }));
      setSelectedUnderBySuper((prev) => ({ ...prev, [superPartner.id]: [] }));
      alert("Normal partners linked under super partner");
    } catch (err) {
      console.error("Error adding partners under super partner:", err);
      alert("Failed to add partners under super partner");
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="ui-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="ui-content-max">
      {showDeleteMessage && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded shadow-lg">
          Partner deleted successfully!
        </div>
      )}

      <div className="ui-page-intro mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="ui-section-eyebrow">Directory</p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Super Partners</h2>
        </div>
        <span className="ui-stat-pill">{superPartners.length} listed</span>
      </div>

      <div className="ui-search-panel mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search partners..."
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
              <option value="phone">Phone</option>
              <option value="source">Source</option>
              <option value="partnerRef">Partner Ref</option>
            </select>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          Found {superPartners.length} super partners
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {superPartners.map((partner) => (
          <div
            key={partner.id}
            className="ui-card-padded border-purple-300/90 bg-gradient-to-br from-purple-50 via-white to-indigo-50 shadow-xl ring-2 ring-purple-400/30 transition hover:scale-[1.01] hover:shadow-2xl"
          >
            {editingId === partner.id ? (
              <div className="space-y-4">
                <input
                  type="text"
                  value={editValues.name || ""}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="Name"
                />
                <input
                  type="email"
                  value={editValues.email || ""}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="Email"
                />
                <input
                  type="tel"
                  value={editValues.phoneNumber || ""}
                  onChange={(e) => handleChange("phoneNumber", e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="Phone Number"
                />
                <input
                  type="text"
                  value={editValues.source || ""}
                  onChange={(e) => handleChange("source", e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="Source"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-4 py-2 bg-gray-200 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSave(partner.id)}
                    className="px-4 py-2 bg-blue-500 text-white rounded"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-lg">
                    Partner Ref: {partner.partnerRef || "N/A"}
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(partner)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(partner.id)}
                      disabled={deleting}
                      className="text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-purple-700 text-white">
                  Super Partner
                </span>

                <p className="text-gray-600">
                  <span className="font-medium">Name:</span> {partner.name || "N/A"}
                </p>
                <p className="text-gray-600">
                  <span className="font-medium">Email:</span> {partner.email || "N/A"}
                </p>
                <p className="text-gray-600">
                  <span className="font-medium">Phone:</span> {partner.phoneNumber || "N/A"}
                </p>
                <p className="text-gray-600">
                  <span className="font-medium">Source:</span> {partner.source || "N/A"}
                </p>
                <p className="text-gray-600">
                  <span className="font-medium">Cases Referred:</span>{" "}
                  {partnerStats[partner.id]?.casesReferred || 0}
                </p>
                <p className="text-gray-600">
                  <span className="font-medium">Total Earnings:</span> ₹
                  {partnerStats[partner.id]?.totalEarnings || 0}
                </p>
                <p className="text-gray-600">
                  <span className="font-medium">Joined On:</span> {formatDate(partner.createdAt)}
                </p>
                <p className="text-gray-600">
                  <span className="font-medium">Super Partner:</span>{" "}
                  {partner.superPartner || "Not assigned"}
                </p>
                <p className="text-gray-600">
                  <span className="font-medium">Partners Under:</span>{" "}
                  {Array.isArray(partner.partnersUnder) ? partner.partnersUnder.length : 0}
                </p>

                <div className="mt-4 pt-2 border-t border-gray-200">
                  <button
                    onClick={() => handlePasswordReset(partner.email)}
                    disabled={passwordResetLoading || !partner.email}
                    className="w-full px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {passwordResetLoading ? "Sending..." : "Change Password"}
                  </button>
                </div>

                <div className="pt-2 border-t border-gray-200 space-y-2">
                  <button
                    onClick={() =>
                      setShowConnectPanelByPartner((prev) => ({
                        ...prev,
                        [partner.id]: !prev[partner.id],
                      }))
                    }
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Connect to Super Partner
                  </button>
                  {showConnectPanelByPartner[partner.id] && (
                    <div className="space-y-2">
                      <select
                        value={connectTargetByPartner[partner.id] || ""}
                        onChange={(e) =>
                          setConnectTargetByPartner((prev) => ({
                            ...prev,
                            [partner.id]: e.target.value,
                          }))
                        }
                        className="w-full p-2 border rounded"
                      >
                        <option value="">Select super partner</option>
                        {superPartners
                          .filter((superP) => superP.id !== partner.id)
                          .map((superP) => (
                            <option key={superP.id} value={superP.id}>
                              {superP.name || superP.partnerRef || superP.id}
                            </option>
                          ))}
                      </select>
                      <button
                        onClick={() => handleConnectToSuper(partner)}
                        disabled={actionLoadingId === partner.id}
                        className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-300"
                      >
                        {actionLoadingId === partner.id ? "Saving..." : "Save Super Partner"}
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-gray-200 space-y-2">
                  <button
                    onClick={() =>
                      setShowAddUnderBySuper((prev) => ({
                        ...prev,
                        [partner.id]: !prev[partner.id],
                      }))
                    }
                    className="w-full px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                  >
                    Add Normal Partners Under
                  </button>
                  {showAddUnderBySuper[partner.id] && (
                    <div className="ui-card-compact max-h-48 space-y-2 overflow-y-auto p-2">
                      {normalPartners
                        .filter((normalP) => normalP.id !== partner.id)
                        .map((normalP) => {
                          const selected =
                            selectedUnderBySuper[partner.id]?.includes(normalP.id) || false;
                          return (
                            <label
                              key={`${partner.id}-${normalP.id}`}
                              className="flex items-center gap-2 text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={(e) => {
                                  setSelectedUnderBySuper((prev) => {
                                    const prevList = prev[partner.id] || [];
                                    return {
                                      ...prev,
                                      [partner.id]: e.target.checked
                                        ? [...prevList, normalP.id]
                                        : prevList.filter((id) => id !== normalP.id),
                                    };
                                  });
                                }}
                              />
                              <span>{normalP.name || normalP.partnerRef || normalP.id}</span>
                            </label>
                          );
                        })}
                      <button
                        onClick={() => handleAddPartnersUnder(partner)}
                        disabled={actionLoadingId === partner.id}
                        className="w-full mt-2 px-4 py-2 bg-emerald-700 text-white rounded hover:bg-emerald-800 disabled:bg-gray-300"
                      >
                        {actionLoadingId === partner.id ? "Saving..." : "Save Partners Under"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {superPartners.length === 0 && (
        <div className="text-center text-gray-500 mt-8">
          {searchQuery ? "No matching super partners found" : "No super partners found"}
        </div>
      )}
    </div>
  );
}
