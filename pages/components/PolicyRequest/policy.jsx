import { useEffect, useState } from "react";
import { ref, getDownloadURL } from "firebase/storage";
import { storage } from "../../../lib/firebase";

function isPdfFileName(name) {
  return /\.pdf$/i.test(name || "");
}

export default function Policy({ policy, onBack, onGiveAnalysis }) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(!!policy?.storagePath);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const storagePath = policy?.storagePath;
  const fileName = policy?.fileName;
  const isPdf = isPdfFileName(fileName);

  useEffect(() => {
    if (!storagePath) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    async function loadUrl() {
      setLoading(true);
      setError(null);
      setPdfUrl(null);
      try {
        const url = await getDownloadURL(ref(storage, storagePath));
        if (!cancelled) setPdfUrl(url);
      } catch (err) {
        console.error(err);
        if (!cancelled) setError(err.message || "Failed to load document.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadUrl();
    return () => {
      cancelled = true;
    };
  }, [storagePath]);

  if (!storagePath) {
    return (
      <div className="ui-empty-state w-full">
        <p className="text-slate-600">
          Open Policy Requests from the dashboard to view a policy document.
        </p>
        {typeof onBack === "function" && (
          <button type="button" onClick={onBack} className="ui-btn-secondary mt-4">
            Back to list
          </button>
        )}
      </div>
    );
  }

  const handleDownload = async () => {
    if (!pdfUrl) return;
    setDownloading(true);
    try {
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.target = "_blank";
      link.download = fileName || "policy-document";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      setError("Failed to download file.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="ui-page-intro">
          <p className="ui-section-eyebrow">Policy document</p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            {fileName}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Customer: {policy.customerLabel || policy.customerUserId || "—"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onBack} className="ui-btn-secondary">
            Back to list
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!pdfUrl || downloading}
            className="ui-btn-secondary disabled:opacity-50"
          >
            {downloading ? "Downloading…" : "Download"}
          </button>
          <button type="button" onClick={onGiveAnalysis} className="ui-btn-primary">
            Give analysis
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="ui-spinner" />
        </div>
      )}

      {error && !loading && (
        <div className="ui-empty-state border-rose-200 text-rose-700">{error}</div>
      )}

      {!loading && !error && pdfUrl && (
        <div className="ui-card-padded border-indigo-100/80">
          {isPdf ? (
            <iframe
              src={pdfUrl}
              title={fileName}
              className="w-full min-h-[70vh] rounded-lg border border-slate-200"
            />
          ) : (
            <div className="py-8 text-center text-slate-600">
              <p className="mb-4">
                Preview is only available for PDF files. Use download to open this
                document.
              </p>
              <button type="button" onClick={handleDownload} className="ui-btn-primary">
                Download file
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
