import { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../../lib/firebase";

export default function NoticeBoard() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState("");

  useEffect(() => {
    const noticesQuery = query(collection(db, "notice"), orderBy("uploadedAt", "desc"));
    const unsubscribe = onSnapshot(
      noticesQuery,
      (snapshot) => {
        const noticeList = snapshot.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }));
        setNotices(noticeList);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading notices:", err);
        setError("Failed to load notices");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleDeleteNotice = async (noticeId) => {
    const shouldDelete = window.confirm("Delete this notice?");
    if (!shouldDelete) return;

    try {
      setDeletingId(noticeId);
      await deleteDoc(doc(db, "notice", noticeId));
      alert("Notice deleted successfully");
    } catch (err) {
      console.error("Error deleting notice:", err);
      alert("Failed to delete notice");
    } finally {
      setDeletingId("");
    }
  };

  const formatDate = (value) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("en-IN");
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="ui-empty-state border-rose-200 bg-rose-50/80 text-rose-700">
        {error}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <p className="ui-section-eyebrow">Alerts</p>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
          Notice Board{" "}
          <span className="text-lg font-semibold text-indigo-600">({notices.length})</span>
        </h2>
      </div>

      {notices.length === 0 ? (
        <div className="ui-empty-state">No notices found.</div>
      ) : (
        <div className="space-y-4">
          {notices.map((notice) => (
            <div
              key={notice.id}
              className="ui-card-padded border-indigo-100/90 shadow-md transition hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-base font-semibold text-slate-900">
                    {notice.name || "Unknown User"}
                  </p>
                  <p className="text-sm leading-relaxed text-slate-600">{notice.message || "No message"}</p>
                  <p className="text-xs text-slate-500">
                    <span className="font-medium text-slate-700">User ID:</span> {notice.userId || "N/A"}
                  </p>
                  <p className="text-xs text-slate-500">
                    <span className="font-medium text-slate-700">Uploaded At:</span>{" "}
                    {formatDate(notice.uploadedAt)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteNotice(notice.id)}
                  disabled={deletingId === notice.id}
                  className="ui-btn-danger shrink-0 text-sm"
                >
                  {deletingId === notice.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
