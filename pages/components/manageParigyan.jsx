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
import { db } from "../../lib/firebase";

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

export default function ManageParigyan() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [successMessage, setSuccessMessage] = useState(null);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  useEffect(() => {
    const q = query(collection(db, "parigyan"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setItems(
          snapshot.docs.map((docItem) => ({
            id: docItem.id,
            ...docItem.data(),
          }))
        );
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error loading parigyan:", err);
        setError("Failed to load Parigyan entries");
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedQuestion = question.trim();
    const trimmedAnswer = answer.trim();

    if (!trimmedQuestion || !trimmedAnswer) {
      setError("Question and answer are required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await addDoc(collection(db, "parigyan"), {
        question: trimmedQuestion,
        answer: trimmedAnswer,
        createdAt: new Date(),
        active: true,
      });
      setQuestion("");
      setAnswer("");
      showSuccess("Parigyan entry added successfully.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to add entry.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    const ok = window.confirm(
      `Delete this Q&A?\n\n"${(item.question || "").slice(0, 80)}${(item.question || "").length > 80 ? "…" : ""}"`
    );
    if (!ok) return;
    try {
      setDeletingId(item.id);
      await deleteDoc(doc(db, "parigyan", item.id));
      showSuccess("Entry deleted.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to delete entry.");
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
          Parigyan
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Add Q&A entries shown to customers in the CCM Parigyan page.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="ui-card-padded space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Add Q&A</h3>

        <div>
          <label htmlFor="parigyanQuestion" className="ui-label">
            Question
          </label>
          <input
            id="parigyanQuestion"
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="ui-input mt-1"
            required
          />
        </div>

        <div>
          <label htmlFor="parigyanAnswer" className="ui-label">
            Answer
          </label>
          <textarea
            id="parigyanAnswer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={5}
            className="ui-input mt-1 min-h-[120px]"
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
          {submitting ? "Saving…" : "Add entry"}
        </button>
      </form>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">
          Published entries ({items.length})
        </h3>

        {items.length === 0 ? (
          <div className="ui-empty-state">No Parigyan entries yet.</div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="ui-card-padded border-indigo-100/90 shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-base font-semibold text-slate-900">
                    {item.question}
                  </p>
                  <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">
                    {item.answer}
                  </p>
                  <p className="text-xs text-slate-500">
                    Added {formatCreatedAt(item.createdAt)}
                    {item.active === false ? " · Hidden" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  disabled={deletingId === item.id}
                  className="ui-btn-danger shrink-0 text-sm"
                >
                  {deletingId === item.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
