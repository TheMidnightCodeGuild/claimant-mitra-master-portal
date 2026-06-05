import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { db, storage } from "../../lib/firebase";
import {
  compressVideoForUpload,
  formatBytes,
  MAX_FALLBACK_BYTES,
} from "../../lib/compressVideo";

function formatCreatedAt(value) {
  if (!value) return "—";
  try {
    const d =
      typeof value?.toDate === "function" ? value.toDate() : new Date(value);
    return d.toLocaleString("en-IN");
  } catch {
    return "—";
  }
}

function safeStorageFileName(originalName) {
  const base = (originalName || "video.mp4").replace(/[^a-zA-Z0-9._-]/g, "_");
  return base.length > 80 ? base.slice(-80) : base;
}

export default function ManageFromClaimantMitraVideos() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [deletingId, setDeletingId] = useState("");

  useEffect(() => {
    const q = query(
      collection(db, "fromClaimantMitraVideos"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setVideos(
          snapshot.docs.map((docItem) => ({
            id: docItem.id,
            ...docItem.data(),
          }))
        );
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error loading From Claimant Mitra videos:", err);
        setError("Failed to load From Claimant Mitra videos.");
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a video file.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setStatusText("Preparing…");

    try {
      const result = await compressVideoForUpload(file, {
        onStatus: setStatusText,
        onProgress: (pct) => setStatusText(`Compressing… ${pct}%`),
      });

      setStatusText("Uploading…");

      const storagePath = `from-claimant-mitra-videos/${Date.now()}-${safeStorageFileName(result.fileName)}`;
      const storageRef = ref(storage, storagePath);
      const uploadFile =
        result.blob instanceof File
          ? result.blob
          : new File([result.blob], result.fileName, {
              type: result.blob.type || "video/mp4",
            });

      await uploadBytes(storageRef, uploadFile, {
        contentType: uploadFile.type || "video/mp4",
      });
      const downloadUrl = await getDownloadURL(storageRef);

      await addDoc(collection(db, "fromClaimantMitraVideos"), {
        title: title.trim() || "From Claimant Mitra",
        storagePath,
        downloadUrl,
        fileName: result.fileName,
        sizeBytes: result.sizeBytes,
        mimeType: uploadFile.type || "video/mp4",
        createdAt: new Date(),
        active: true,
      });

      setTitle("");
      setFile(null);

      if (result.compressionFailed) {
        showSuccess(
          `Video uploaded without compression (${formatBytes(result.sizeBytes)}). Keep originals under ${formatBytes(MAX_FALLBACK_BYTES)} when compression fails.`
        );
      } else if (result.compressed) {
        showSuccess(
          `Video compressed and uploaded (${formatBytes(result.sizeBytes)}).`
        );
      } else {
        showSuccess(`Video uploaded (${formatBytes(result.sizeBytes)}).`);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to upload video.");
    } finally {
      setSubmitting(false);
      setStatusText("");
    }
  };

  const handleDelete = async (video) => {
    const ok = window.confirm(
      `Delete video "${video.title || video.fileName}"?`
    );
    if (!ok) return;

    try {
      setDeletingId(video.id);
      if (video.storagePath) {
        await deleteObject(ref(storage, video.storagePath));
      }
      await deleteDoc(doc(db, "fromClaimantMitraVideos", video.id));
      showSuccess("Video deleted.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to delete video.");
    } finally {
      setDeletingId("");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      <div>
        <p className="ui-section-eyebrow">Content</p>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
          From Claimant Mitra
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Upload videos for the &quot;From Claimant Mitra&quot; section in the
          customer app. Files over 10 MB are compressed first (any source size).
          If compression fails, only originals up to 20 MB are accepted.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="ui-card-padded space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Upload video</h3>

        <div>
          <label htmlFor="fcmVideoTitle" className="ui-label">
            Title (optional)
          </label>
          <input
            id="fcmVideoTitle"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. How we help with claims"
            className="ui-input mt-1"
          />
        </div>

        <div>
          <label htmlFor="fcmVideoFile" className="ui-label">
            Video file
          </label>
          <input
            id="fcmVideoFile"
            type="file"
            accept="video/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="ui-input mt-1"
            required
          />
          <p className="mt-1 text-xs text-slate-500">
            Videos over 10 MB are compressed automatically. If compression
            fails, the original must be under 20 MB.
          </p>
        </div>

        {statusText && submitting && (
          <p className="text-sm font-medium text-indigo-700">{statusText}</p>
        )}

        {error && (
          <p className="ui-alert-error text-sm" role="alert">
            {error}
          </p>
        )}

        {successMessage && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {successMessage}
          </p>
        )}

        <button type="submit" disabled={submitting} className="ui-btn-primary">
          {submitting ? "Processing…" : "Upload video"}
        </button>
      </form>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">
          Published videos ({videos.length})
        </h3>

        {videos.length === 0 ? (
          <div className="ui-empty-state">No From Claimant Mitra videos yet.</div>
        ) : (
          videos.map((video) => (
            <div
              key={video.id}
              className="ui-card-padded space-y-4 border-indigo-100/90 shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-base font-semibold text-slate-900">
                    {video.title || "From Claimant Mitra"}
                  </p>
                  <p className="text-sm text-slate-600">{video.fileName}</p>
                  <p className="text-xs text-slate-500">
                    {formatBytes(video.sizeBytes)} · Added{" "}
                    {formatCreatedAt(video.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(video)}
                  disabled={deletingId === video.id}
                  className="ui-btn-danger shrink-0 text-sm"
                >
                  {deletingId === video.id ? "Deleting…" : "Delete"}
                </button>
              </div>

              {video.downloadUrl && (
                <video
                  controls
                  playsInline
                  preload="metadata"
                  className="max-h-48 w-full rounded-lg bg-slate-900 object-contain"
                  src={video.downloadUrl}
                >
                  Your browser does not support video playback.
                </video>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
