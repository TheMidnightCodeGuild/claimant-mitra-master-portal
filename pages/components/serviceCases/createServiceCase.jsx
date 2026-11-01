import { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "../../../lib/firebase";
import { invalidateCollection } from "../../../lib/collectionCache";
import {
  CASE_TYPES,
  CASE_TYPE_KEYS,
  MOBILE_PATTERN,
  SERVICE_CASE_COLLECTION,
} from "../../../lib/serviceCaseTypes";
import DocumentViewer from "../DocumentViewer";
import ServiceCaseField from "../../../components/serviceCases/ServiceCaseFields";

const BASE_FIELDS = [
  { name: "name", label: "Customer name", required: true },
  { name: "mobile", label: "Mobile (10 digits)", required: true },
  { name: "email", label: "Email", required: true },
  { name: "address", label: "Address" },
  { name: "aadharNo", label: "Aadhaar number" },
  { name: "partnerRef", label: "Partner reference (if referred)" },
];

function emptyForm(caseType) {
  const form = { caseType, complaintDate: new Date().toISOString().slice(0, 10) };
  for (const f of BASE_FIELDS) form[f.name] = "";
  for (const f of CASE_TYPES[caseType].fields) form[f.name] = "";
  return form;
}

export default function CreateServiceCase() {
  const [formData, setFormData] = useState(() => emptyForm(CASE_TYPE_KEYS[0]));
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const typeConfig = CASE_TYPES[formData.caseType];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const changeType = (caseType) => {
    // Type-specific answers do not carry over; the customer details do.
    setFormData((prev) => ({ ...emptyForm(caseType), ...pickBase(prev) }));
  };

  const handleFileUpload = async (e) => {
    const picked = Array.from(e.target.files);
    setUploading(true);
    setError(null);
    try {
      const storage = getStorage();
      const urls = await Promise.all(
        picked.map(async (file) => {
          const storageRef = ref(storage, `serviceCases/${Date.now()}_${file.name}`);
          await uploadBytes(storageRef, file);
          return getDownloadURL(storageRef);
        })
      );
      setFiles((prev) => [...prev, ...urls]);
    } catch (err) {
      console.error("Error uploading files:", err);
      setError("Failed to upload files");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!MOBILE_PATTERN.test(formData.mobile)) {
      setError("Mobile number must be 10 digits");
      return;
    }

    setLoading(true);
    try {
      const data = { ...formData };
      for (const f of typeConfig.fields) {
        if (f.type === "number") data[f.name] = data[f.name] === "" ? "" : Number(data[f.name]);
      }
      await addDoc(collection(db, SERVICE_CASE_COLLECTION), {
        ...data,
        email: data.email.trim().toLowerCase(),
        complaintDate: new Date(data.complaintDate).toISOString(),
        stage: "new",
        source: "staff",
        fileBucket: files,
        mainLogs: [],
        internalLogs: [],
        correspondence: [],
        createdAt: new Date(),
      });
      invalidateCollection("serviceCases");
      setSuccess(true);
      setFormData(emptyForm(formData.caseType));
      setFiles([]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError("Failed to create case: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lg:max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8 py-2">
      <div className="flex items-center justify-between mb-8 border-b pb-4 border-slate-200">
        <h2 className="text-3xl font-bold text-slate-800">Create Loan / Mailing Case</h2>
      </div>

      {error && <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md border border-red-200">{error}</div>}
      {success && (
        <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-md border border-green-200">
          Case created. You can create another below.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="ui-card-padded border-slate-200/90 shadow-md">
          <h3 className="text-xl font-semibold mb-6 text-slate-700">Case type</h3>
          <div className="flex flex-wrap gap-3">
            {CASE_TYPE_KEYS.map((key) => (
              <button
                type="button"
                key={key}
                onClick={() => changeType(key)}
                className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
                  formData.caseType === key
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                {CASE_TYPES[key].label}
              </button>
            ))}
          </div>
        </div>

        <div className="ui-card-padded border-slate-200/90 shadow-md">
          <h3 className="text-xl font-semibold mb-6 text-slate-700">Customer</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {BASE_FIELDS.map((f) => (
              <ServiceCaseField key={f.name} field={f} value={formData[f.name]} onChange={handleChange} />
            ))}
            <ServiceCaseField
              field={{ name: "complaintDate", label: "Date received", required: true }}
              value={formData.complaintDate}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="ui-card-padded border-slate-200/90 shadow-md">
          <h3 className="text-xl font-semibold mb-6 text-slate-700">{typeConfig.label} details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {typeConfig.fields.map((f) => (
              <ServiceCaseField key={f.name} field={f} value={formData[f.name]} onChange={handleChange} />
            ))}
          </div>
        </div>

        <div className="ui-card-padded border-slate-200/90 shadow-md">
          <h3 className="text-xl font-semibold mb-6 text-slate-700">Documents</h3>
          <div className="space-y-4">
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-indigo-700 hover:file:bg-blue-100"
            />
            {uploading && <div className="text-indigo-600">Uploading files...</div>}
            {files.length > 0 && <DocumentViewer files={files} />}
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <button
            type="submit"
            disabled={loading || uploading}
            className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 transition shadow-md"
          >
            {loading ? "Creating Case..." : "Create Case"}
          </button>
        </div>
      </form>
    </div>
  );
}

function pickBase(form) {
  const base = { complaintDate: form.complaintDate };
  for (const f of BASE_FIELDS) base[f.name] = form[f.name];
  return base;
}
