import { useState } from "react";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "../../lib/firebase";
import { SERVICE_CASE_COLLECTION } from "../../lib/serviceCaseTypes";
import DocumentViewer from "../../pages/components/DocumentViewer";

function formatDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString("en-IN");
}

const EMPTY_EMAIL = { to: "", cc: "", subject: "", body: "" };
const EMPTY_POST = {
  direction: "sent",
  party: "",
  subject: "",
  body: "",
  trackingNo: "",
  date: "",
};

/**
 * The chain of emails and posted mail on one case. Emails are sent from here
 * and logged; letters sent or received by post are logged by hand, with a scan.
 */
export default function Correspondence({ docId, caseData, disabled, onChanged }) {
  const [mode, setMode] = useState(null);
  const [email, setEmail] = useState({
    ...EMPTY_EMAIL,
    to: caseData.counterpartyEmail || "",
    subject: caseData.subject || "",
  });
  const [post, setPost] = useState(EMPTY_POST);
  const [scans, setScans] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const append = (entry) =>
    updateDoc(doc(db, SERVICE_CASE_COLLECTION, docId), {
      correspondence: arrayUnion(entry),
      lastUpdated: new Date().toISOString(),
    });

  const sendEmailEntry = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/service-cases/send-mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(email),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to send email");

      try {
        await append({
          date: new Date().toISOString(),
          direction: "sent",
          channel: "email",
          party: email.to,
          cc: email.cc,
          subject: email.subject.trim(),
          body: email.body,
          trackingNo: "",
          attachments: [],
        });
      } catch (logErr) {
        console.error(logErr);
        setError("The email was sent, but it could not be added to the log. Add it by hand.");
        return;
      }
      setEmail({ ...EMPTY_EMAIL, to: email.to, subject: `Re: ${email.subject.replace(/^Re:\s*/i, "")}` });
      setMode(null);
      await onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const uploadScans = async (e) => {
    const picked = Array.from(e.target.files);
    setBusy(true);
    setError(null);
    try {
      const storage = getStorage();
      const urls = await Promise.all(
        picked.map(async (file) => {
          const storageRef = ref(storage, `serviceCases/${docId}/mail/${Date.now()}_${file.name}`);
          await uploadBytes(storageRef, file);
          return getDownloadURL(storageRef);
        })
      );
      setScans((prev) => [...prev, ...urls]);
    } catch (err) {
      console.error(err);
      setError("Failed to upload scan");
    } finally {
      setBusy(false);
    }
  };

  const logPost = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await append({
        date: post.date ? new Date(post.date).toISOString() : new Date().toISOString(),
        direction: post.direction,
        channel: "post",
        party: post.party.trim(),
        subject: post.subject.trim(),
        body: post.body,
        trackingNo: post.trackingNo.trim(),
        attachments: scans,
      });
      setPost(EMPTY_POST);
      setScans([]);
      setMode(null);
      await onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const entries = [...(caseData.correspondence || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  const input = "w-full px-3 py-2 border border-slate-300 rounded-md";

  return (
    <div className="ui-card-padded border-slate-200/90 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h3 className="text-xl font-semibold text-slate-700">Emails &amp; letters</h3>
        <div className="flex gap-3">
          <button type="button" disabled={disabled} onClick={() => setMode(mode === "email" ? null : "email")} className="ui-btn-primary">
            Send email
          </button>
          <button type="button" disabled={disabled} onClick={() => setMode(mode === "post" ? null : "post")} className="ui-btn-secondary">
            Log a letter
          </button>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md border border-red-200 text-sm">{error}</div>}

      {mode === "email" && (
        <form onSubmit={sendEmailEntry} className="space-y-3 mb-8 p-4 rounded-lg bg-slate-50 border border-slate-200">
          <input required className={input} placeholder="To (comma separated)" value={email.to} onChange={(e) => setEmail({ ...email, to: e.target.value })} />
          <input className={input} placeholder="Cc (optional)" value={email.cc} onChange={(e) => setEmail({ ...email, cc: e.target.value })} />
          <input required className={input} placeholder="Subject" value={email.subject} onChange={(e) => setEmail({ ...email, subject: e.target.value })} />
          <textarea required rows={6} className={input} placeholder="Message" value={email.body} onChange={(e) => setEmail({ ...email, body: e.target.value })} />
          <button type="submit" disabled={busy} className="ui-btn-primary">
            {busy ? "Sending..." : "Send and log"}
          </button>
        </form>
      )}

      {mode === "post" && (
        <form onSubmit={logPost} className="space-y-3 mb-8 p-4 rounded-lg bg-slate-50 border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select className={input} value={post.direction} onChange={(e) => setPost({ ...post, direction: e.target.value })}>
              <option value="sent">Sent by us</option>
              <option value="received">Received</option>
            </select>
            <input required className={input} placeholder="From / to (party)" value={post.party} onChange={(e) => setPost({ ...post, party: e.target.value })} />
            <input type="date" className={input} value={post.date} onChange={(e) => setPost({ ...post, date: e.target.value })} />
          </div>
          <input required className={input} placeholder="Subject" value={post.subject} onChange={(e) => setPost({ ...post, subject: e.target.value })} />
          <input className={input} placeholder="Courier / speed-post tracking number (optional)" value={post.trackingNo} onChange={(e) => setPost({ ...post, trackingNo: e.target.value })} />
          <textarea rows={4} className={input} placeholder="Summary of the letter" value={post.body} onChange={(e) => setPost({ ...post, body: e.target.value })} />
          <input type="file" multiple onChange={uploadScans} className="block w-full text-sm text-slate-500" />
          {scans.length > 0 && <p className="text-sm text-slate-600">{scans.length} scan(s) attached</p>}
          <button type="submit" disabled={busy} className="ui-btn-primary">
            {busy ? "Saving..." : "Add to log"}
          </button>
        </form>
      )}

      {entries.length === 0 ? (
        <div className="ui-empty-state py-6 text-sm">No emails or letters yet</div>
      ) : (
        <ul className="space-y-4">
          {entries.map((en, i) => (
            <li key={i} className="border border-slate-200 rounded-lg p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1">
                <span className={`px-2 py-0.5 rounded-full font-semibold ${en.direction === "sent" ? "bg-indigo-100 text-indigo-800" : "bg-emerald-100 text-emerald-800"}`}>
                  {en.direction === "sent" ? "Sent" : "Received"} &middot; {en.channel === "post" ? "Post" : "Email"}
                </span>
                <span>{formatDate(en.date)}</span>
                {en.party && <span>{en.direction === "sent" ? "to" : "from"} {en.party}</span>}
                {en.trackingNo && <span>Tracking: {en.trackingNo}</span>}
              </div>
              <div className="font-medium text-slate-800">{en.subject}</div>
              {en.body && <p className="text-sm text-slate-600 whitespace-pre-wrap mt-1">{en.body}</p>}
              {en.attachments?.length > 0 && (
                <div className="mt-3">
                  <DocumentViewer files={en.attachments} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
