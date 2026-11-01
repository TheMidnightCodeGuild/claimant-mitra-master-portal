import { useState, useEffect, useCallback } from "react";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "../../lib/firebase";
import { invalidateCollection } from "../../lib/collectionCache";
import {
  CASE_TYPES,
  NEXT_STAGES,
  SERVICE_CASE_COLLECTION,
  STAFF_FIELDS,
  STAGE_LABELS,
  caseTypeLabel,
} from "../../lib/serviceCaseTypes";
import { stageOf } from "../../lib/serviceCaseFilters";
import { computeServiceFee, describeFeeBasis } from "../../lib/serviceFees";
import { formatInr } from "../../lib/successFees";
import DocumentViewer from "../../pages/components/DocumentViewer";
import ServiceCaseField from "./ServiceCaseFields";
import Correspondence from "./correspondence";

const CONTACT_FIELDS = [
  { name: "name", label: "Customer name", required: true },
  { name: "mobile", label: "Mobile" },
  { name: "email", label: "Email" },
  { name: "address", label: "Address" },
  { name: "aadharNo", label: "Aadhaar number" },
  { name: "partnerRef", label: "Partner reference" },
];

function formatDate(value) {
  if (!value) return "-";
  const d = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString("en-IN");
}

function numeric(fields, data) {
  const out = { ...data };
  for (const f of fields) {
    if (f.type === "number") out[f.name] = out[f.name] === "" || out[f.name] == null ? "" : Number(out[f.name]);
  }
  return out;
}

export default function ServiceCaseDetail({ docId, onBack }) {
  const [caseData, setCaseData] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [logText, setLogText] = useState("");
  const [logKind, setLogKind] = useState("internalLogs");
  const [uploading, setUploading] = useState(false);

  // Only the first load fills the form, so a note or a stage change does not
  // throw away edits somebody has typed but not saved yet.
  const load = useCallback(async () => {
    try {
      const snap = await getDoc(doc(db, SERVICE_CASE_COLLECTION, docId));
      if (!snap.exists()) {
        setError("Case not found");
        return;
      }
      const data = { id: snap.id, ...snap.data() };
      setCaseData(data);
      setForm((prev) => (Object.keys(prev).length === 0 ? data : prev));
    } catch (err) {
      console.error("Error loading case:", err);
      setError("Failed to load case");
    } finally {
      setLoading(false);
    }
  }, [docId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-indigo-600"></div>
      </div>
    );
  }
  if (!caseData) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 mb-4">{error}</p>
        <button type="button" onClick={onBack} className="ui-btn-secondary">
          Back
        </button>
      </div>
    );
  }

  const typeConfig = CASE_TYPES[caseData.caseType];
  const typeFields = typeConfig ? [...typeConfig.fields, ...(STAFF_FIELDS[caseData.caseType] || [])] : [];
  const stage = stageOf(caseData);
  const nextStages = NEXT_STAGES[stage];
  const fee = computeServiceFee(form);

  const run = async (fn) => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
      invalidateCollection("serviceCases");
      await load();
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const saveDetails = () =>
    run(async () => {
      const fields = [...CONTACT_FIELDS, ...typeFields];
      const updates = {};
      for (const f of fields) updates[f.name] = form[f.name] ?? "";
      const cleaned = numeric(fields, updates);
      cleaned.email = String(cleaned.email || "").trim().toLowerCase();
      cleaned.fee = computeServiceFee({ ...caseData, ...cleaned });
      cleaned.lastUpdated = new Date().toISOString();
      await updateDoc(doc(db, SERVICE_CASE_COLLECTION, docId), cleaned);
      setNotice("Saved");
    });

  const moveTo = (next) => {
    let reason = "";
    if (next === "rejected") {
      reason = (window.prompt("Reason for rejecting this case?") || "").trim();
      if (!reason) return;
    }
    if (!window.confirm(`Move this case to "${STAGE_LABELS[next]}"? This cannot be undone.`)) {
      return;
    }
    run(async () => {
      const now = new Date().toISOString();
      const updates = {
        stage: next,
        [`stageDates.${next}`]: now,
        lastUpdated: now,
        mainLogs: arrayUnion({
          date: now,
          remark: reason ? `Moved to ${STAGE_LABELS[next]}: ${reason}` : `Moved to ${STAGE_LABELS[next]}`,
        }),
      };
      if (next === "rejected") updates.rejectionReason = reason;
      if (next === "resolved") updates.fee = computeServiceFee(caseData);
      await updateDoc(doc(db, SERVICE_CASE_COLLECTION, docId), updates);
    });
  };

  const addLog = () => {
    const remark = logText.trim();
    if (!remark) return;
    run(async () => {
      await updateDoc(doc(db, SERVICE_CASE_COLLECTION, docId), {
        [logKind]: arrayUnion({ date: new Date().toISOString(), remark }),
      });
      setLogText("");
    });
  };

  const uploadFiles = async (e) => {
    const picked = Array.from(e.target.files);
    if (!picked.length) return;
    setUploading(true);
    await run(async () => {
      const storage = getStorage();
      const urls = await Promise.all(
        picked.map(async (file) => {
          const storageRef = ref(storage, `serviceCases/${docId}/${Date.now()}_${file.name}`);
          await uploadBytes(storageRef, file);
          return getDownloadURL(storageRef);
        })
      );
      await updateDoc(doc(db, SERVICE_CASE_COLLECTION, docId), { fileBucket: arrayUnion(...urls) });
    });
    setUploading(false);
  };

  const logList = (key, title) => (
    <div>
      <h4 className="text-sm font-semibold text-slate-600 mb-2">{title}</h4>
      {(caseData[key] || []).length === 0 ? (
        <p className="text-sm text-slate-400">Nothing yet</p>
      ) : (
        <ul className="space-y-2">
          {[...caseData[key]].reverse().map((l, i) => (
            <li key={i} className="text-sm border-l-2 border-indigo-200 pl-3">
              <span className="text-xs text-slate-500">{formatDate(l.date)}</span>
              <div className="text-slate-700 whitespace-pre-wrap">{l.remark}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="lg:max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8 py-2 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4 border-slate-200">
        <div>
          <button type="button" onClick={onBack} className="text-sm text-indigo-700 hover:underline mb-1">
            &larr; Back to cases
          </button>
          <h2 className="text-3xl font-bold text-slate-800">
            {caseTypeLabel(caseData.caseType)} &middot; {caseData.name}
          </h2>
          <p className="text-sm text-slate-500">
            Received {formatDate(caseData.complaintDate)} via {caseData.source || "unknown"}
            {caseData.originalEnquiryId ? " (from website enquiry)" : ""}
          </p>
        </div>
        <span className="px-4 py-2 rounded-full bg-indigo-100 text-indigo-800 text-sm font-semibold">
          {STAGE_LABELS[stage]}
        </span>
      </div>

      {error && <div className="p-4 bg-red-100 text-red-700 rounded-md border border-red-200">{error}</div>}
      {notice && <div className="p-4 bg-green-100 text-green-700 rounded-md border border-green-200">{notice}</div>}

      {stage === "rejected" && caseData.rejectionReason && (
        <div className="p-4 bg-rose-50 text-rose-800 rounded-md border border-rose-200">
          Rejected: {caseData.rejectionReason}
        </div>
      )}

      {nextStages.length > 0 && (
        <div className="ui-card-padded border-slate-200/90 shadow-md">
          <h3 className="text-xl font-semibold mb-4 text-slate-700">Move case</h3>
          <div className="flex flex-wrap gap-3">
            {nextStages.map((next) => (
              <button
                type="button"
                key={next}
                disabled={saving}
                onClick={() => moveTo(next)}
                className={next === "rejected" ? "ui-btn-danger" : "ui-btn-primary"}
              >
                {STAGE_LABELS[next]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="ui-card-padded border-slate-200/90 shadow-md">
        <h3 className="text-xl font-semibold mb-6 text-slate-700">Customer</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CONTACT_FIELDS.map((f) => (
            <ServiceCaseField key={f.name} field={f} value={form[f.name]} onChange={handleChange} />
          ))}
        </div>
      </div>

      <div className="ui-card-padded border-slate-200/90 shadow-md">
        <h3 className="text-xl font-semibold mb-6 text-slate-700">{caseTypeLabel(caseData.caseType)} details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {typeFields.map((f) => (
            <ServiceCaseField key={f.name} field={f} value={form[f.name]} onChange={handleChange} />
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-slate-600">
            <span className="font-semibold">Fee ({describeFeeBasis(caseData.caseType)}): </span>
            {fee ? formatInr(fee.amount) : "not worked out yet"}
          </div>
          <button type="button" disabled={saving} onClick={saveDetails} className="ui-btn-primary">
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>

      <Correspondence
        docId={docId}
        caseData={caseData}
        disabled={saving}
        onChanged={async () => {
          invalidateCollection("serviceCases");
          await load();
        }}
      />

      <div className="ui-card-padded border-slate-200/90 shadow-md">
        <h3 className="text-xl font-semibold mb-6 text-slate-700">Documents</h3>
        <input
          type="file"
          multiple
          onChange={uploadFiles}
          className="block w-full text-sm text-slate-500 mb-4 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-indigo-700 hover:file:bg-blue-100"
        />
        {uploading && <div className="text-indigo-600 mb-2">Uploading files...</div>}
        <DocumentViewer files={caseData.fileBucket || []} />
      </div>

      <div className="ui-card-padded border-slate-200/90 shadow-md">
        <h3 className="text-xl font-semibold mb-6 text-slate-700">Notes</h3>
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={logKind}
            onChange={(e) => setLogKind(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-md"
          >
            <option value="internalLogs">Internal note</option>
            <option value="mainLogs">Update for customer</option>
          </select>
          <input
            value={logText}
            onChange={(e) => setLogText(e.target.value)}
            placeholder="Write a note"
            className="flex-1 min-w-[240px] px-3 py-2 border border-slate-300 rounded-md"
          />
          <button type="button" disabled={saving || !logText.trim()} onClick={addLog} className="ui-btn-secondary">
            Add
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {logList("mainLogs", "Customer updates")}
          {logList("internalLogs", "Internal notes")}
        </div>
      </div>
    </div>
  );
}
