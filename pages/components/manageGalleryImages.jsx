import { useEffect, useState, useCallback } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { db, storage } from "../../lib/firebase";
import { invalidateCollection } from "../../lib/collectionCache";
import { loadCachedListSorted } from "../../lib/loadCachedList";
import { formatBytes } from "../../lib/compressVideo";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

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
  const base = (originalName || "image.jpg").replace(/[^a-zA-Z0-9._-]/g, "_");
  return base.length > 80 ? base.slice(-80) : base;
}

export default function ManageGalleryImages() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const loadImages = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const rows = await loadCachedListSorted("galleryImages", { forceRefresh });
      setImages(rows);
    } catch (err) {
      console.error("Error loading gallery images:", err);
      setError("Failed to load gallery images.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select an image file.");
      return;
    }

    const mimeType = file.type || "";
    if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
      setError("Only JPEG, PNG, and WebP images are allowed.");
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setError(`Image must be under ${formatBytes(MAX_IMAGE_BYTES)}.`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const storagePath = `gallery-images/${Date.now()}-${safeStorageFileName(file.name)}`;
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, file, {
        contentType: mimeType,
      });
      const downloadUrl = await getDownloadURL(storageRef);

      await addDoc(collection(db, "galleryImages"), {
        title: title.trim() || "Gallery",
        storagePath,
        downloadUrl,
        fileName: file.name,
        sizeBytes: file.size,
        mimeType,
        createdAt: new Date(),
        active: true,
      });

      setTitle("");
      setFile(null);
      invalidateCollection("galleryImages");
      await loadImages(true);
      showSuccess(`Image uploaded (${formatBytes(file.size)}).`);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to upload image.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (image) => {
    const ok = window.confirm(
      `Delete gallery image "${image.title || image.fileName}"?`
    );
    if (!ok) return;

    try {
      setDeletingId(image.id);
      if (image.storagePath) {
        await deleteObject(ref(storage, image.storagePath));
      }
      await deleteDoc(doc(db, "galleryImages", image.id));
      invalidateCollection("galleryImages");
      await loadImages(true);
      showSuccess("Image deleted.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to delete image.");
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
          Gallery
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Upload images for the customer app gallery. JPEG, PNG, or WebP up to 5
          MB each.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="ui-card-padded space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Upload image</h3>

        <div>
          <label htmlFor="galleryTitle" className="ui-label">
            Title (optional)
          </label>
          <input
            id="galleryTitle"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Team event"
            className="ui-input mt-1"
          />
        </div>

        <div>
          <label htmlFor="galleryFile" className="ui-label">
            Image file
          </label>
          <input
            id="galleryFile"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="ui-input mt-1"
            required
          />
          <p className="mt-1 text-xs text-slate-500">
            Max file size: {formatBytes(MAX_IMAGE_BYTES)}.
          </p>
        </div>

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
          {submitting ? "Uploading…" : "Upload image"}
        </button>
      </form>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">
          Published images ({images.length})
        </h3>

        {images.length === 0 ? (
          <div className="ui-empty-state">No gallery images yet.</div>
        ) : (
          images.map((image) => (
            <div
              key={image.id}
              className="ui-card-padded space-y-4 border-indigo-100/90 shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-base font-semibold text-slate-900">
                    {image.title || "Gallery"}
                  </p>
                  <p className="text-sm text-slate-600">{image.fileName}</p>
                  <p className="text-xs text-slate-500">
                    {formatBytes(image.sizeBytes)} · Added{" "}
                    {formatCreatedAt(image.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(image)}
                  disabled={deletingId === image.id}
                  className="ui-btn-danger shrink-0 text-sm"
                >
                  {deletingId === image.id ? "Deleting…" : "Delete"}
                </button>
              </div>

              {image.downloadUrl && (
                <img
                  src={image.downloadUrl}
                  alt={image.title || "Gallery image"}
                  className="max-h-48 w-full rounded-lg bg-slate-100 object-contain"
                />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
