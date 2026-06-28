import { useEffect, useState, useCallback } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import {
  invalidateCollection,
} from "../../lib/collectionCache";
import { loadCachedListSorted } from "../../lib/loadCachedList";

function clampRating(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 5;
  return Math.min(5, Math.max(1, n));
}

function StarRatingDisplay({ rating }) {
  const stars = clampRating(rating);
  return (
    <span className="inline-flex gap-0.5 text-amber-500" aria-label={`${stars} stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= stars ? "opacity-100" : "opacity-25"}>
          ★
        </span>
      ))}
    </span>
  );
}

function isValidHttpUrl(value) {
  if (!value || typeof value !== "string") return false;
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

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

export default function ManageCustomerReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [successMessage, setSuccessMessage] = useState(null);

  const [reviewerName, setReviewerName] = useState("");
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [googleReviewUrl, setGoogleReviewUrl] = useState("");

  const loadReviews = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const rows = await loadCachedListSorted("customerReviews", { forceRefresh });
      setReviews(rows);
    } catch (err) {
      console.error("Error loading reviews:", err);
      setError("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = reviewerName.trim();
    const trimmedText = reviewText.trim();
    const trimmedUrl = googleReviewUrl.trim();

    if (!trimmedName || !trimmedText) {
      setError("Reviewer name and review text are required.");
      return;
    }
    if (!isValidHttpUrl(trimmedUrl)) {
      setError("Google review URL must be a valid http(s) link.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await addDoc(collection(db, "customerReviews"), {
        reviewerName: trimmedName,
        rating: clampRating(rating),
        reviewText: trimmedText,
        googleReviewUrl: trimmedUrl,
        createdAt: new Date(),
        active: true,
      });
      setReviewerName("");
      setRating(5);
      setReviewText("");
      setGoogleReviewUrl("");
      showSuccess("Review added successfully.");
      invalidateCollection("customerReviews");
      await loadReviews(true);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to add review.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (review) => {
    const ok = window.confirm(
      `Delete review from ${review.reviewerName || "this customer"}?`
    );
    if (!ok) return;
    try {
      setDeletingId(review.id);
      await deleteDoc(doc(db, "customerReviews", review.id));
      invalidateCollection("customerReviews");
      await loadReviews(true);
      showSuccess("Review deleted.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to delete review.");
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
          Customer Reviews
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Add Google reviews shown to customers in the CCM app.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="ui-card-padded space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Add review</h3>

        <div>
          <label htmlFor="reviewerName" className="ui-label">
            Reviewer name
          </label>
          <input
            id="reviewerName"
            type="text"
            value={reviewerName}
            onChange={(e) => setReviewerName(e.target.value)}
            className="ui-input mt-1"
            required
          />
        </div>

        <div>
          <label htmlFor="rating" className="ui-label">
            Star rating
          </label>
          <select
            id="rating"
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="ui-input mt-1 sm:max-w-[120px]"
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} star{n !== 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="reviewText" className="ui-label">
            Review text
          </label>
          <textarea
            id="reviewText"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            rows={4}
            className="ui-input mt-1 min-h-[100px]"
            required
          />
        </div>

        <div>
          <label htmlFor="googleReviewUrl" className="ui-label">
            Google review URL
          </label>
          <input
            id="googleReviewUrl"
            type="url"
            value={googleReviewUrl}
            onChange={(e) => setGoogleReviewUrl(e.target.value)}
            placeholder="https://..."
            className="ui-input mt-1"
            required
          />
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
          {submitting ? "Saving…" : "Add review"}
        </button>
      </form>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">
          Published reviews ({reviews.length})
        </h3>

        {reviews.length === 0 ? (
          <div className="ui-empty-state">No reviews yet.</div>
        ) : (
          reviews.map((review) => (
            <div
              key={review.id}
              className="ui-card-padded border-indigo-100/90 shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-base font-semibold text-slate-900">
                      {review.reviewerName}
                    </p>
                    <StarRatingDisplay rating={review.rating} />
                  </div>
                  <p className="text-sm leading-relaxed text-slate-600">
                    {review.reviewText}
                  </p>
                  {review.googleReviewUrl && (
                    <a
                      href={review.googleReviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-sm font-medium text-indigo-700 hover:text-indigo-900 break-all"
                    >
                      {review.googleReviewUrl}
                    </a>
                  )}
                  <p className="text-xs text-slate-500">
                    Added {formatCreatedAt(review.createdAt)}
                    {review.active === false ? " · Hidden" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(review)}
                  disabled={deletingId === review.id}
                  className="ui-btn-danger shrink-0 text-sm"
                >
                  {deletingId === review.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
