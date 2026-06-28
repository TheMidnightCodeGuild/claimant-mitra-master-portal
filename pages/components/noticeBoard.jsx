import { useEffect, useState, useCallback } from "react";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { fetchCollectionCached, invalidateCollection } from "../../lib/collectionCache";
import { useNoticeCount } from "../../lib/NoticeCountContext";
import { toSortTimestamp } from "../../lib/loadCachedList";

export default function NoticeBoard() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState("");
  const { refreshNoticeCount } = useNoticeCount();

  const loadNotices = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchCollectionCached("notice", { forceRefresh });
      rows.sort(
        (a, b) => toSortTimestamp(b.uploadedAt) - toSortTimestamp(a.uploadedAt)
      );
      setNotices(rows);
    } catch (err) {
      console.error("Error loading notices:", err);
      setError("Failed to load notices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotices();
  }, [loadNotices]);

  const handleDeleteNotice = async (noticeId) => {
    const shouldDelete = window.confirm("Delete this notice?");
    if (!shouldDelete) return;

    try {
      setDeletingId(noticeId);
      await deleteDoc(doc(db, "notice", noticeId));
      invalidateCollection("notice");
      await loadNotices(true);
      refreshNoticeCount();
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
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ui-section-eyebrow">Alerts</p>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Notice Board{" "}
            <span className="text-lg font-semibold text-indigo-600">({notices.length})</span>
          </h2>
        </div>
        <button
          type="button"
          onClick={() => loadNotices(true)}
          className="ui-btn-secondary text-sm"
        >
          Refresh
        </button>
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
                    {notice.name || notice.title || "Notice"}
                  </p>
                  {(notice.message || notice.content) && (
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">
                      {notice.message || notice.content}
                    </p>
                  )}
                  <p className="text-xs text-slate-500">
                    Posted: {formatDate(notice.uploadedAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteNotice(notice.id)}
                  disabled={deletingId === notice.id}
                  className="ui-btn-danger text-sm shrink-0"
                >
                  {deletingId === notice.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
