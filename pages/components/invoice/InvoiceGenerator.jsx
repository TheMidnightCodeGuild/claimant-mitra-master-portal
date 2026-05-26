import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc,
  getDocs,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../../lib/firebase";
import {
  parseClaimAmount,
  calculateSuccessFees,
  formatInr,
} from "../../../lib/successFees";

const inputClass =
  "ui-input w-full rounded-lg border border-slate-300/90 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/35";

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export default function InvoiceGenerator() {
  const [tab, setTab] = useState("create");
  const [invoices, setInvoices] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [cases, setCases] = useState([]);
  const [caseSearch, setCaseSearch] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [claimInput, setClaimInput] = useState("");
  const [billTo, setBillTo] = useState({ name: "", email: "", address: "" });
  const [claimNo, setClaimNo] = useState("");
  const [policyNo, setPolicyNo] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [viewUrl, setViewUrl] = useState(null);
  const [emailModal, setEmailModal] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  const claimAmount = useMemo(() => parseClaimAmount(claimInput), [claimInput]);
  const breakdown = useMemo(
    () => (claimAmount != null ? calculateSuccessFees(claimAmount) : null),
    [claimAmount]
  );

  useEffect(() => {
    const q = query(collection(db, "invoices"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setInvoices(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        );
        setLoadingList(false);
      },
      (err) => {
        console.error(err);
        setLoadingList(false);
        setError("Failed to load invoices");
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    async function loadCases() {
      try {
        const snap = await getDocs(collection(db, "users"));
        setCases(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Failed to load cases", e);
      }
    }
    loadCases();
  }, []);

  const filteredCases = useMemo(() => {
    const q = caseSearch.trim().toLowerCase();
    if (!q) return cases.slice(0, 8);
    return cases
      .filter((c) => {
        const name = (c.name || "").toLowerCase();
        const email = (c.email || "").toLowerCase();
        const claim = String(c.claimNo || "").toLowerCase();
        return name.includes(q) || email.includes(q) || claim.includes(q);
      })
      .slice(0, 8);
  }, [cases, caseSearch]);

  const applyCase = useCallback((c) => {
    setSelectedCaseId(c.id);
    setBillTo({
      name: c.name || "",
      email: c.email || "",
      address: c.address || "",
    });
    setClaimNo(c.claimNo || "");
    setPolicyNo(c.policyNo || "");
    if (c.estimatedClaimAmount != null && c.estimatedClaimAmount !== "") {
      setClaimInput(String(c.estimatedClaimAmount));
    }
    setCaseSearch(c.name || c.claimNo || "");
  }, []);

  const clearCase = () => {
    setSelectedCaseId("");
    setCaseSearch("");
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setSuccess(null);

    try {
      if (!breakdown) {
        throw new Error("Enter a valid claim amount");
      }
      if (!billTo.name.trim() || !billTo.email.trim()) {
        throw new Error("Bill-to name and email are required");
      }

      const res = await fetch("/api/invoices/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          claimAmount,
          billTo,
          caseId: selectedCaseId || undefined,
          claimNo: claimNo || undefined,
          policyNo: policyNo || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate invoice");
      }

      const { pdfBase64, invoiceDraft } = data;
      const docRef = await addDoc(collection(db, "invoices"), {
        ...invoiceDraft,
        createdAt: serverTimestamp(),
        emailSentAt: null,
        storagePath: null,
      });

      const storagePath = `invoices/${docRef.id}/${invoiceDraft.pdfFileName}`;
      const pdfBytes = base64ToUint8Array(pdfBase64);
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, pdfBytes, {
        contentType: "application/pdf",
      });

      await updateDoc(doc(db, "invoices", docRef.id), { storagePath });

      setSuccess(`Invoice ${invoiceDraft.invoiceNumber} saved.`);
      setTab("list");
      setClaimInput("");
      setBillTo({ name: "", email: "", address: "" });
      setClaimNo("");
      setPolicyNo("");
      clearCase();
    } catch (err) {
      setError(err.message || "Failed to create invoice");
    } finally {
      setCreating(false);
    }
  };

  const openView = async (invoice) => {
    if (!invoice.storagePath) {
      setError("PDF not available for this invoice");
      return;
    }
    try {
      const url = await getDownloadURL(ref(storage, invoice.storagePath));
      setViewUrl(url);
    } catch (err) {
      setError(err.message || "Failed to load PDF");
    }
  };

  const openDownload = async (invoice) => {
    if (!invoice.storagePath) return;
    try {
      const url = await getDownloadURL(ref(storage, invoice.storagePath));
      const a = document.createElement("a");
      a.href = url;
      a.download = invoice.pdfFileName || `${invoice.invoiceNumber}.pdf`;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
    } catch (err) {
      setError(err.message || "Failed to download");
    }
  };

  const sendInvoiceEmail = async () => {
    if (!emailModal) return;
    setSendingEmail(true);
    setError(null);
    try {
      let downloadUrl = null;
      if (emailModal.storagePath) {
        downloadUrl = await getDownloadURL(
          ref(storage, emailModal.storagePath)
        );
      }

      const res = await fetch("/api/invoices/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          recipientEmail: emailModal.email,
          invoiceNumber: emailModal.invoiceNumber,
          billToName: emailModal.billToName,
          downloadUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send email");
      }

      await updateDoc(doc(db, "invoices", emailModal.id), {
        emailSentAt: serverTimestamp(),
      });

      setEmailModal(null);
      setSuccess(`Invoice emailed to ${emailModal.email}`);
    } catch (err) {
      setError(err.message || "Failed to send email");
    } finally {
      setSendingEmail(false);
    }
  };

  const formatCreated = (ts) => {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="ui-content-max space-y-6">
      <div className="ui-page-intro">
        <p className="ui-section-eyebrow">Billing</p>
        <h2 className="ui-section-title mt-1">Invoice Generator</h2>
        <p className="mt-2 text-sm text-slate-600">
          Success fee is 20% of the claim amount. PDFs are stored in Firebase
          and can be emailed to customers.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
          {success}
        </p>
      )}

      <div className="flex flex-wrap gap-2 border-b border-indigo-100/80 pb-2">
        <button
          type="button"
          onClick={() => setTab("create")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tab === "create"
              ? "bg-indigo-600 text-white shadow-md"
              : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-indigo-50"
          }`}
        >
          Create invoice
        </button>
        <button
          type="button"
          onClick={() => setTab("list")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tab === "list"
              ? "bg-indigo-600 text-white shadow-md"
              : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-indigo-50"
          }`}
        >
          All invoices ({invoices.length})
        </button>
      </div>

      {tab === "create" && (
        <form onSubmit={handleCreate} className="ui-card-padded space-y-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Link to case (optional)
            </label>
            <input
              type="search"
              value={caseSearch}
              onChange={(e) => {
                setCaseSearch(e.target.value);
                setSelectedCaseId("");
              }}
              placeholder="Search by name, email, or claim no."
              className={inputClass}
            />
            {caseSearch && filteredCases.length > 0 && (
              <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-indigo-100 bg-white shadow-md">
                {filteredCases.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => applyCase(c)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-indigo-50"
                    >
                      <span className="font-medium text-slate-900">
                        {c.name || "Unnamed"}
                      </span>
                      {c.claimNo && (
                        <span className="ml-2 text-slate-500">
                          Claim: {c.claimNo}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {selectedCaseId && (
              <button
                type="button"
                onClick={clearCase}
                className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-800"
              >
                Clear linked case
              </button>
            )}
          </div>

          <div>
            <label htmlFor="claimAmount" className="mb-1 block text-sm font-medium text-slate-700">
              Total claim amount (₹)
            </label>
            <input
              id="claimAmount"
              type="number"
              min="0"
              step="0.01"
              value={claimInput}
              onChange={(e) => setClaimInput(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          {breakdown && (
            <dl className="ui-section-indigo space-y-3">
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-sm text-slate-600">Success fee (20%)</dt>
                <dd className="text-sm font-semibold text-slate-900">
                  {formatInr(breakdown.successFee)}
                </dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2 border-t border-indigo-200/80 pt-3">
                <dt className="text-sm font-medium text-slate-800">Total</dt>
                <dd className="text-base font-semibold text-indigo-900">
                  {formatInr(breakdown.total)}
                </dd>
              </div>
            </dl>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="billName" className="mb-1 block text-sm font-medium text-slate-700">
                Bill-to name
              </label>
              <input
                id="billName"
                value={billTo.name}
                onChange={(e) =>
                  setBillTo((b) => ({ ...b, name: e.target.value }))
                }
                className={inputClass}
                required
              />
            </div>
            <div>
              <label htmlFor="billEmail" className="mb-1 block text-sm font-medium text-slate-700">
                Bill-to email
              </label>
              <input
                id="billEmail"
                type="email"
                value={billTo.email}
                onChange={(e) =>
                  setBillTo((b) => ({ ...b, email: e.target.value }))
                }
                className={inputClass}
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="billAddress" className="mb-1 block text-sm font-medium text-slate-700">
              Bill-to address
            </label>
            <textarea
              id="billAddress"
              rows={3}
              value={billTo.address}
              onChange={(e) =>
                setBillTo((b) => ({ ...b, address: e.target.value }))
              }
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={creating || !breakdown}
            className="ui-btn-primary w-full sm:w-auto disabled:opacity-50"
          >
            {creating ? "Generating…" : "Generate & save invoice"}
          </button>
        </form>
      )}

      {tab === "list" && (
        <div className="space-y-4">
          {loadingList && (
            <div className="flex justify-center py-12">
              <div className="ui-spinner" />
            </div>
          )}
          {!loadingList && invoices.length === 0 && (
            <p className="ui-empty-state">No invoices yet. Create one above.</p>
          )}
          {!loadingList &&
            invoices.map((inv) => (
              <div
                key={inv.id}
                className="ui-list-card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {inv.invoiceNumber}
                  </p>
                  <p className="text-sm text-slate-600">
                    {inv.billTo?.name} · {formatInr(inv.total)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatCreated(inv.createdAt)}
                    {inv.emailSentAt ? " · Emailed" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openView(inv)}
                    className="ui-btn-secondary text-sm"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => openDownload(inv)}
                    className="ui-btn-secondary text-sm"
                  >
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEmailModal({
                        id: inv.id,
                        email: inv.billTo?.email || "",
                        invoiceNumber: inv.invoiceNumber,
                        billToName: inv.billTo?.name,
                        storagePath: inv.storagePath,
                      })
                    }
                    className="ui-btn-primary text-sm"
                  >
                    Email
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {viewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setViewUrl(null)}
        >
          <div
            className="flex h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="font-semibold text-slate-900">Invoice preview</h3>
              <button
                type="button"
                onClick={() => setViewUrl(null)}
                className="ui-btn-secondary text-sm"
              >
                Close
              </button>
            </div>
            <iframe
              title="Invoice PDF"
              src={viewUrl}
              className="min-h-0 flex-1 w-full rounded-b-xl"
            />
          </div>
        </div>
      )}

      {emailModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !sendingEmail && setEmailModal(null)}
        >
          <div
            className="ui-card-padded w-full max-w-md space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="ui-section-title text-base">Send invoice by email</h3>
            <p className="text-sm text-slate-600">
              Invoice {emailModal.invoiceNumber} will be attached as PDF.
            </p>
            <div>
              <label htmlFor="sendEmail" className="mb-1 block text-sm font-medium text-slate-700">
                Recipient email
              </label>
              <input
                id="sendEmail"
                type="email"
                value={emailModal.email}
                onChange={(e) =>
                  setEmailModal((m) => ({ ...m, email: e.target.value }))
                }
                className={inputClass}
                required
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setEmailModal(null)}
                disabled={sendingEmail}
                className="ui-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={sendInvoiceEmail}
                disabled={sendingEmail || !emailModal.email?.trim()}
                className="ui-btn-primary disabled:opacity-50"
              >
                {sendingEmail ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
