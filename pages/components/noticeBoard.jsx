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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
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

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-6">Notice Board ({notices.length})</h2>

      {notices.length === 0 ? (
        <div className="text-gray-500 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          No notices found.
        </div>
      ) : (
        <div className="space-y-4">
          {notices.map((notice) => (
            <div
              key={notice.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-base font-semibold text-gray-900">
                    {notice.name || "Unknown User"}
                  </p>
                  <p className="text-sm text-gray-600">{notice.message || "No message"}</p>
                  <p className="text-xs text-gray-500">
                    <span className="font-medium">User ID:</span> {notice.userId || "N/A"}
                  </p>
                  <p className="text-xs text-gray-500">
                    <span className="font-medium">Uploaded At:</span>{" "}
                    {formatDate(notice.uploadedAt)}
                  </p>
                </div>

                <button
                  onClick={() => handleDeleteNotice(notice.id)}
                  disabled={deletingId === notice.id}
                  className="px-3 py-2 rounded-md bg-red-500 hover:bg-red-600 text-white text-sm disabled:bg-gray-300"
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
