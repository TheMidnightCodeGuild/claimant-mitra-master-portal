import { useState, useEffect } from "react";
import { doc, getDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import DocumentViewer from "../DocumentViewer";
import {
  getStorage,
  ref,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { useRouter } from "next/router";
import UpdateCase from "../caseStatus/updateCases";
import Image from "next/image";
import Link from "next/link";
import usePartnerRefNameMap from "../../../lib/usePartnerRefNameMap";
import { resolvePartnerDisplayName } from "../../../lib/partnerLookup";

export default function FullCase({ docId }) {
  const { partnerMap } = usePartnerRefNameMap();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("basic"); // basic, logs, financial, documents
  const [isDeleting, setIsDeleting] = useState(false);
  const [consentFormUrl, setConsentFormUrl] = useState("");
  const [contractUrl, setContractUrl] = useState("");
  const [signatureUrl, setSignatureUrl] = useState("");
  const [contractSignatureUrl, setContractSignatureUrl] = useState("");
  const [showUpdateCase, setShowUpdateCase] = useState(false);
  const [showAllMainLogs, setShowAllMainLogs] = useState(false);
  const [showAllInternalLogs, setShowAllInternalLogs] = useState(false);
  const [showAllIGMSLogs, setShowAllIGMSLogs] = useState(false);
  const [showAllOmbudsmanLogs, setShowAllOmbudsmanLogs] = useState(false);
  const [verificationLinkCopied, setVerificationLinkCopied] = useState(false);
  const [showVerificationPanel, setShowVerificationPanel] = useState(false);
  const [verificationUrl, setVerificationUrl] = useState("");
  const [verificationScriptForm, setVerificationScriptForm] = useState({
    name: "",
    insuranceCompany: "",
    line3Intro: "मेरा",
    claimNo: "",
    policyNo: "",
    caseDescription: "",
    feePercentage: "20",
  });
  const [showVerificationMedia, setShowVerificationMedia] = useState(false);
  const [verificationActionLoading, setVerificationActionLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchCase() {
      if (!docId) return;

      try {
        const docRef = doc(db, "users", docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setCaseData(data);

          // Fetch document URLs
          const storage = getStorage();
          if (data.consentForm) {
            const consentRef = ref(storage, data.consentForm);
            const consentUrl = await getDownloadURL(consentRef);
            setConsentFormUrl(consentUrl);
          }
          if (data.contract) {
            const contractRef = ref(storage, data.contract);
            const contractUrl = await getDownloadURL(contractRef);
            setContractUrl(contractUrl);
          }
          if (data.signature && data.signature.length >= 25) {
            const signatureRef = ref(storage, data.signature);
            const signatureUrl = await getDownloadURL(signatureRef);
            setSignatureUrl(signatureUrl);
          } else if (data.signature) {
            setSignatureUrl(data.signature);
          }
          if (data.contractSignature && data.contractSignature.length >= 25) {
            const contractSignatureRef = ref(storage, data.contractSignature);
            const contractSignatureUrl = await getDownloadURL(
              contractSignatureRef
            );
            setContractSignatureUrl(contractSignatureUrl);
          } else if (data.contractSignature) {
            setContractSignatureUrl(data.contractSignature);
          }
        } else {
          setError("Case not found");
        }
      } catch (err) {
        console.error("Error fetching case:", err);
        setError("Failed to fetch case details");
      } finally {
        setLoading(false);
      }
    }

    fetchCase();
  }, [docId]);

  const handleDelete = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this case? This action cannot be undone."
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const docRef = doc(db, "users", docId);
      await deleteDoc(docRef);
      alert("Case deleted successfully");
      // Redirect or handle post-deletion as needed
      window.location.href = "/"; // Or your desired redirect path
    } catch (err) {
      console.error("Error deleting case:", err);
      alert("Failed to delete case");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdate = () => {
    setShowUpdateCase(true);
  };

  const handleBackToAllCases = () => {
    router.push("/viewallcases");
  };

  const getVerificationScriptData = () => {
    const formName = verificationScriptForm.name?.trim();
    const formInsuranceCompany = verificationScriptForm.insuranceCompany?.trim();
    const formLine3Intro = verificationScriptForm.line3Intro?.trim();
    const formClaimNo = verificationScriptForm.claimNo?.trim();
    const formPolicyNo = verificationScriptForm.policyNo?.trim();
    const formCaseDescription = verificationScriptForm.caseDescription?.trim();
    const formFeePercentage = verificationScriptForm.feePercentage?.toString().trim();

    const fallbackClaimAmount =
      caseData?.estimatedClaimAmount?.toString() || caseData?.claim?.toString() || "____";
    const fallbackCaseDescription =
      caseData?.requestVerificationScriptData?.caseDescription ||
      (caseData?.requestVerificationScriptData?.hospitalName
        ? `बीमा कंपनी ने मेरे ${caseData.requestVerificationScriptData.hospitalName} Hospital के ₹${
            caseData?.requestVerificationScriptData?.claimAmount || fallbackClaimAmount
          } के क्लेम को अस्वीकृत कर दिया है।`
        : `बीमा कंपनी ने मेरे Hospital के ₹${fallbackClaimAmount} के क्लेम को अस्वीकृत कर दिया है।`);

    return {
      name: formName || caseData?.name || "N/A",
      insuranceCompany: formInsuranceCompany || caseData?.companyName || "____",
      line3Intro:
        formLine3Intro ||
        caseData?.requestVerificationScriptData?.line3Intro?.trim() ||
        "मेरा",
      claimNo: formClaimNo || caseData?.claimNo || "N/A",
      policyNo: formPolicyNo || caseData?.policyNo || "N/A",
      caseDescription: formCaseDescription || fallbackCaseDescription,
      feePercentage:
        formFeePercentage ||
        caseData?.requestVerificationScriptData?.feePercentage?.toString() ||
        "20",
    };
  };

  const getVerificationMonologue = () => {
    const {
      name,
      insuranceCompany,
      line3Intro,
      claimNo,
      policyNo,
      caseDescription,
      feePercentage,
    } = getVerificationScriptData();
    return `1. मेरा नाम "${name}" है।
2. मेरी ${insuranceCompany} Insurance Company की पॉलिसी है।
3. ${line3Intro} Claim No. "${claimNo}" तथा Policy No. "${policyNo}" है।
4. ${caseDescription}
5. मुझे क्लेम प्रक्रिया की पूरी जानकारी नहीं है।
6. इसलिए मैं CLAIMANT MITRA को अपना अधिकृत सलाहकार नियुक्त करता/करती हूँ।
7. मैं यह शपथपूर्वक स्वीकार करता/करती हूँ कि सफल क्लेम राशि प्राप्त होने पर मैं CLAIMANT MITRA को क्लेम राशि का ${feePercentage}% शुल्क प्रदान करूँगा/करूँगी।
8. यदि प्रक्रिया के दौरान मेरी ओर से किसी दस्तावेज़ में कमी, त्रुटि या तथ्य छुपाने के कारण क्लेम अस्वीकृत होता है, तो उसकी पूर्ण जिम्मेदारी मेरी स्वयं की होगी।
9. मैं अपनी सहमति से यह घोषणा कर रहा/रही हूँ।`;
  };

  const copyVerificationUrl = async (urlToCopy) => {
    try {
      await navigator.clipboard.writeText(urlToCopy);
      setVerificationLinkCopied(true);
      setTimeout(() => setVerificationLinkCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy verification link:", err);
      window.open(urlToCopy, "_blank");
    }
  };

  const handleRequestVerification = () => {
    setShowVerificationPanel((prev) => {
      const nextValue = !prev;
      if (nextValue) {
        setVerificationScriptForm({
          name: caseData?.name || "",
          insuranceCompany: caseData?.companyName || "",
          line3Intro:
            caseData?.requestVerificationScriptData?.line3Intro?.trim() || "मेरा",
          claimNo: caseData?.claimNo || "",
          policyNo: caseData?.policyNo || "",
          caseDescription:
            caseData?.requestVerificationScriptData?.caseDescription ||
            `बीमा कंपनी ने मेरे Hospital के ₹${
              caseData?.estimatedClaimAmount?.toString() ||
              caseData?.claim?.toString() ||
              "____"
            } के क्लेम को अस्वीकृत कर दिया है।`,
          feePercentage:
            caseData?.requestVerificationScriptData?.feePercentage?.toString() ||
            "20",
        });
      }
      return nextValue;
    });
  };

  const handleGenerateVerificationLink = async () => {
    if (!docId) {
      alert("Invalid case ID");
      return;
    }

    const verificationUrl = `https://verification.claimantmitra.com/requestVerification/${docId}`;

    try {
      const docRef = doc(db, "users", docId);
      const scriptData = getVerificationScriptData();
      await updateDoc(docRef, {
        requestVerificationRequestedAt: new Date().toISOString(),
        requestVerificationScriptData: scriptData,
        allowUpload: "allow",
      });
    } catch (err) {
      console.error("Error updating verification request timestamp:", err);
    }

    setVerificationUrl(verificationUrl);
    await copyVerificationUrl(verificationUrl);
    alert("Verification link copied to clipboard");
  };

  const handleCopyVerificationLinkAgain = async () => {
    if (!verificationUrl) return;
    await copyVerificationUrl(verificationUrl);
    alert("Verification link copied again");
  };

  const uploadAccessStatus = caseData?.allowUpload || "restrict";

  const handleSetAllowUpload = async (nextValue) => {
    if (!docId) return;
    try {
      setVerificationActionLoading(true);
      const docRef = doc(db, "users", docId);
      await updateDoc(docRef, { allowUpload: nextValue });
      setCaseData((prev) => ({
        ...prev,
        allowUpload: nextValue,
      }));
      alert(`Upload access set to ${nextValue}`);
    } catch (err) {
      console.error("Error updating allowUpload:", err);
      alert("Failed to update upload access");
    } finally {
      setVerificationActionLoading(false);
    }
  };

  const verificationMediaFiles = caseData?.requestVerificationFiles || [];
  const videoVerificationStatus = caseData?.VideoVerification || "Verification Pending";

  const handleSetVideoVerification = async (nextStatus) => {
    if (!docId) return;

    try {
      setVerificationActionLoading(true);
      const docRef = doc(db, "users", docId);
      await updateDoc(docRef, { VideoVerification: nextStatus });
      setCaseData((prev) => ({
        ...prev,
        VideoVerification: nextStatus,
      }));
      alert(`VideoVerification updated to ${nextStatus}`);
    } catch (err) {
      console.error("Error updating VideoVerification:", err);
      alert("Failed to update VideoVerification");
    } finally {
      setVerificationActionLoading(false);
    }
  };

  const handleDeleteVerificationMedia = async (fileToDelete) => {
    if (!window.confirm("Delete this verification media file?")) return;

    try {
      setVerificationActionLoading(true);
      if (fileToDelete?.path) {
        const storageInstance = getStorage();
        const storageRef = ref(storageInstance, fileToDelete.path);
        await deleteObject(storageRef);
      }

      const updatedFiles = verificationMediaFiles.filter(
        (file) =>
          !(
            file?.url === fileToDelete?.url &&
            file?.path === fileToDelete?.path &&
            file?.uploadedAt === fileToDelete?.uploadedAt
          )
      );

      const docRef = doc(db, "users", docId);
      await updateDoc(docRef, {
        requestVerificationFiles: updatedFiles,
      });

      setCaseData((prev) => ({
        ...prev,
        requestVerificationFiles: updatedFiles,
      }));
      alert("Verification media deleted");
    } catch (err) {
      console.error("Error deleting verification media:", err);
      alert("Failed to delete verification media");
    } finally {
      setVerificationActionLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderLogs = (logs) => {
    if (!logs || logs.length === 0) return "No logs available";

    return (
      <div className="space-y-3">
        {logs.map((log, index) => (
          <div key={index} className="border-b pb-2 last:border-b-0">
            <div className="flex justify-between text-sm text-gray-500">
              <span>{formatDate(log.date)}</span>
            </div>
            <p className="mt-1 text-gray-900">{log.remark}</p>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="ui-spinner"></div>
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

  if (showUpdateCase) {
    return <UpdateCase docId={docId} />;
  }

  return (
    <div className="ui-content-max">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Full Case Details</h2>
        <div className="flex space-x-4">
          <button
            onClick={handleBackToAllCases}
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            Back to All Cases
          </button>
          <button
            onClick={handleUpdate}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Update Case
          </button>
          <button
            onClick={handleRequestVerification}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
          >
            Request Verification
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded flex items-center"
          >
            {isDeleting ? (
              <>
                <span className="animate-spin mr-2">⌛</span>
                Deleting...
              </>
            ) : (
              "Delete Case"
            )}
          </button>
        </div>
      </div>

      {showVerificationPanel && (
        <div className="mb-6 bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-4">
          <h3 className="text-lg font-semibold text-purple-900">
            Request Verification Script
          </h3>
          <p className="text-gray-800 leading-relaxed whitespace-pre-line">
            {getVerificationMonologue()}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={verificationScriptForm.name}
                onChange={(e) =>
                  setVerificationScriptForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Insurance Company
              </label>
              <input
                type="text"
                value={verificationScriptForm.insuranceCompany}
                onChange={(e) =>
                  setVerificationScriptForm((prev) => ({
                    ...prev,
                    insuranceCompany: e.target.value,
                  }))
                }
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Line 3 opening (before Claim No.)
              </label>
              <input
                type="text"
                value={verificationScriptForm.line3Intro}
                onChange={(e) =>
                  setVerificationScriptForm((prev) => ({
                    ...prev,
                    line3Intro: e.target.value,
                  }))
                }
                placeholder="e.g. मेरा"
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Claim Number
              </label>
              <input
                type="text"
                value={verificationScriptForm.claimNo}
                onChange={(e) =>
                  setVerificationScriptForm((prev) => ({
                    ...prev,
                    claimNo: e.target.value,
                  }))
                }
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Policy Number
              </label>
              <input
                type="text"
                value={verificationScriptForm.policyNo}
                onChange={(e) =>
                  setVerificationScriptForm((prev) => ({
                    ...prev,
                    policyNo: e.target.value,
                  }))
                }
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Case Description
              </label>
              <input
                type="text"
                value={verificationScriptForm.caseDescription}
                onChange={(e) =>
                  setVerificationScriptForm((prev) => ({
                    ...prev,
                    caseDescription: e.target.value,
                  }))
                }
                placeholder="case description"
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fee Percentage (%)
              </label>
              <input
                type="text"
                value={verificationScriptForm.feePercentage}
                onChange={(e) =>
                  setVerificationScriptForm((prev) => ({
                    ...prev,
                    feePercentage: e.target.value,
                  }))
                }
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleGenerateVerificationLink}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
            >
              {verificationLinkCopied ? "Link Copied" : "Generate Link"}
            </button>
            {verificationUrl && (
              <button
                onClick={handleCopyVerificationLinkAgain}
                className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded"
              >
                Copy Again
              </button>
            )}
          </div>
          {verificationUrl && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Generated Verification Link
              </p>
              <div className="ui-card-compact px-3 py-2 text-sm text-gray-900 break-all">
                {verificationUrl}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-3">
        <h3 className="text-lg font-semibold text-indigo-900">
          Video Verification
        </h3>
        <p className="text-sm text-gray-700">
          Status: <span className="font-semibold">{videoVerificationStatus}</span>
        </p>
        <p className="text-sm text-gray-700">
          Upload access:{" "}
          <span className="font-semibold">{uploadAccessStatus}</span>
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleSetAllowUpload("allow")}
            disabled={verificationActionLoading}
            className="bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded disabled:opacity-60"
          >
            Allow Access
          </button>
          <button
            onClick={() => handleSetAllowUpload("restrict")}
            disabled={verificationActionLoading}
            className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-2 px-4 rounded disabled:opacity-60"
          >
            Remove Access
          </button>

          {verificationMediaFiles.length > 0 && (
            <button
              onClick={() => setShowVerificationMedia((prev) => !prev)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
            >
              {showVerificationMedia ? "Hide Media" : "View Media"}
            </button>
          )}

          {videoVerificationStatus === "Uploaded" && (
            <>
              <button
                onClick={() => handleSetVideoVerification("Approved")}
                disabled={verificationActionLoading}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-60"
              >
                Approve
              </button>
              <button
                onClick={async () => {
                  await handleSetVideoVerification("Rejected");
                  setShowVerificationPanel(true);
                }}
                disabled={verificationActionLoading}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded disabled:opacity-60"
              >
                Reject
              </button>
            </>
          )}

          {videoVerificationStatus === "Approved" && (
            <>
              <button
                onClick={() => handleSetVideoVerification("Completed")}
                disabled={verificationActionLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded disabled:opacity-60"
              >
                Complete
              </button>
            </>
          )}
        </div>

        {showVerificationMedia && verificationMediaFiles.length > 0 && (
          <div className="space-y-3 pt-2">
            {verificationMediaFiles.map((file, index) => {
              const isVideo = (file?.type || "").includes("video");
              return (
                <div
                  key={`${file?.path || file?.url || "verification-file"}-${index}`}
                  className="ui-card-compact p-3 space-y-2"
                >
                  <p className="text-sm text-gray-700">
                    {file?.name || `Verification media ${index + 1}`}
                  </p>
                  {isVideo ? (
                    <video controls className="w-full max-w-md rounded border">
                      <source src={file?.url} type={file?.type || "video/webm"} />
                    </video>
                  ) : (
                    <Image
                      src={file?.url}
                      alt={file?.name || "Verification media"}
                      width={320}
                      height={180}
                      className="rounded border max-w-full h-auto"
                    />
                  )}
                  {videoVerificationStatus === "Approved" && (
                    <button
                      onClick={() => handleDeleteVerificationMedia(file)}
                      disabled={verificationActionLoading}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded disabled:opacity-60"
                    >
                      Delete
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b">
        <nav className="flex space-x-4">
          <button
            onClick={() => setActiveTab("basic")}
            className={`py-2 px-4 ${
              activeTab === "basic"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500"
            }`}
          >
            Basic Information
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`py-2 px-4 ${
              activeTab === "logs"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500"
            }`}
          >
            Logs
          </button>
          <button
            onClick={() => setActiveTab("financial")}
            className={`py-2 px-4 ${
              activeTab === "financial"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500"
            }`}
          >
            Financial Details
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`py-2 px-4 ${
              activeTab === "documents"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500"
            }`}
          >
            Documents
          </button>
        </nav>
      </div>

      <div className="ui-card-padded">
        {activeTab === "basic" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <p className="mt-1 text-gray-900">{caseData?.name || "N/A"}</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Address
              </label>
              <p className="mt-1 text-gray-900">{caseData?.address || "N/A"}</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Policy Holder
              </label>
              <p className="mt-1 text-gray-900">
                {caseData?.policyHolder || "N/A"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Estimated Claim Amount
              </label>
              <p className="mt-1 text-gray-900">
                ₹{caseData?.estimatedClaimAmount || "N/A"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Partner
              </label>
              <p className="mt-1 text-gray-900">
                {resolvePartnerDisplayName(caseData?.partnerRef, partnerMap)}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Mobile
              </label>
              <p className="mt-1 text-gray-900">{caseData?.mobile || "N/A"}</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <p className="mt-1 text-gray-900">{caseData?.email || "N/A"}</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Aadhar Number
              </label>
              <p className="mt-1 text-gray-900">
                {caseData?.aadharNo || "N/A"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Complaint Date
              </label>
              <p className="mt-1 text-gray-900">
                {formatDate(caseData?.complaintDate)}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Taken For Review
              </label>
              <p className="mt-1 text-gray-900">
                {caseData?.takenForReview ? "Yes" : "No"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <p className="mt-1 text-gray-900">{caseData?.status || "N/A"}</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Claim score
              </label>
              <p className="mt-1 text-gray-900">
                {typeof caseData?.claimScore === "number" &&
                !Number.isNaN(caseData.claimScore)
                  ? `${caseData.claimScore}%`
                  : "Not set"}
              </p>
              {caseData?.claimScoreUpdatedAt && (
                <p className="text-xs text-gray-500">
                  Updated:{" "}
                  {new Date(caseData.claimScoreUpdatedAt).toLocaleString()}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Document Short
              </label>
              <p className="mt-1 text-gray-900">
                {caseData?.documentShort ? "Yes" : "No"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Case Rejection Reason
              </label>
              <p className="mt-1 text-gray-900">
                {caseData?.caseRejectionReason || "N/A"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Case Rejection Date
              </label>
              <p className="mt-1 text-gray-900">
                {formatDate(caseData?.caseRejectionDate)}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Case Acceptance Date
              </label>
              <p className="mt-1 text-gray-900">
                {formatDate(caseData?.caseAcceptanceDate)}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Rejected
              </label>
              <p className="mt-1 text-gray-900">
                {caseData?.rejected ? "Yes" : "No"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Company Name
              </label>
              <p className="mt-1 text-gray-900">
                {caseData?.companyName || "N/A"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Claim Number
              </label>
              <p className="mt-1 text-gray-900">{caseData?.claimNo || "N/A"}</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Policy Number
              </label>
              <p className="mt-1 text-gray-900">
                {caseData?.policyNo || "N/A"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                IGMS Status
              </label>
              <p className="mt-1 text-gray-900">
                {caseData?.igms ? "Yes" : "No"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                IGMS Date
              </label>
              <p className="mt-1 text-gray-900">
                {formatDate(caseData?.igmsDate)}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                IGMS Follow Up Date
              </label>
              <p className="mt-1 text-gray-900">
                {formatDate(caseData?.igmsFollowUpDate)}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                IGMS Rejection Reason
              </label>
              <p className="mt-1 text-gray-900">
                {caseData?.igmsRejectionReason || "N/A"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Ombudsman Status
              </label>
              <p className="mt-1 text-gray-900">
                {caseData?.ombudsman ? "Yes" : "No"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Ombudsman Date
              </label>
              <p className="mt-1 text-gray-900">
                {formatDate(caseData?.ombudsmanDate)}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Ombudsman Courier Date
              </label>
              <p className="mt-1 text-gray-900">
                {formatDate(caseData?.ombudsmanCourierDate)}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Ombudsman Follow Up Date
              </label>
              <p className="mt-1 text-gray-900">
                {formatDate(caseData?.ombudsmanFollowUpDate)}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Ombudsman Complaint Number
              </label>
              <p className="mt-1 text-gray-900">
                {caseData?.ombudsmanComplaintNumber || "N/A"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                6A Form Submitted
              </label>
              <p className="mt-1 text-gray-900">
                {caseData?.sixAFormSubmitted ? "Yes" : "No"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Ombudsman Mode
              </label>
              <p className="mt-1 text-gray-900">
                {caseData?.ombudsmanMode || "N/A"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Ombudsman Rejection Reason
              </label>
              <p className="mt-1 text-gray-900">
                {caseData?.ombudsmanRejectionReason || "N/A"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Solved
              </label>
              <p className="mt-1 text-gray-900">
                {caseData?.solved ? "Yes" : "No"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Solved Date
              </label>
              <p className="mt-1 text-gray-900">
                {formatDate(caseData?.solvedDate)}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Claim Amount
              </label>
              <p className="mt-1 text-gray-900">₹{caseData?.claim || "N/A"}</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Commission Received
              </label>
              <p className="mt-1 text-gray-900">
                ₹{caseData?.commisionReceived || "N/A"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Partner Commission
              </label>
              <p className="mt-1 text-gray-900">
                ₹{caseData?.partnerCommision || "N/A"}
              </p>
            </div>
          </div>
        )}

        {activeTab === "logs" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Main Logs</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                {renderLogs(
                  showAllMainLogs
                    ? caseData?.mainLogs
                    : caseData?.mainLogs?.slice(0, 3)
                )}
                {caseData?.mainLogs?.length > 3 && (
                  <button
                    className="mt-2 text-blue-600 hover:text-blue-800"
                    onClick={() => setShowAllMainLogs((prev) => !prev)}
                  >
                    {showAllMainLogs ? "Show Less" : "View All"}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-medium">Internal Logs</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                {renderLogs(
                  showAllInternalLogs
                    ? caseData?.internalLogs
                    : caseData?.internalLogs?.slice(0, 3)
                )}
                {caseData?.internalLogs?.length > 3 && (
                  <button
                    className="mt-2 text-blue-600 hover:text-blue-800"
                    onClick={() => setShowAllInternalLogs((prev) => !prev)}
                  >
                    {showAllInternalLogs ? "Show Less" : "View All"}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-medium">IGMS Logs</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                {renderLogs(
                  showAllIGMSLogs
                    ? caseData?.igmsLogs
                    : caseData?.igmsLogs?.slice(0, 3)
                )}
                {caseData?.igmsLogs?.length > 3 && (
                  <button
                    className="mt-2 text-blue-600 hover:text-blue-800"
                    onClick={() => setShowAllIGMSLogs((prev) => !prev)}
                  >
                    {showAllIGMSLogs ? "Show Less" : "View All"}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-medium">Ombudsman Logs</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                {renderLogs(
                  showAllOmbudsmanLogs
                    ? caseData?.ombudsmanLogs
                    : caseData?.ombudsmanLogs?.slice(0, 3)
                )}
                {caseData?.ombudsmanLogs?.length > 3 && (
                  <button
                    className="mt-2 text-blue-600 hover:text-blue-800"
                    onClick={() => setShowAllOmbudsmanLogs((prev) => !prev)}
                  >
                    {showAllOmbudsmanLogs ? "Show Less" : "View All"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "financial" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Estimated Claim Amount
              </label>
              <p className="mt-1 text-gray-900">
                ₹{caseData?.estimatedClaimAmount || "N/A"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Actual Claim Amount
              </label>
              <p className="mt-1 text-gray-900">₹{caseData?.claim || "N/A"}</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Commission Received
              </label>
              <p className="mt-1 text-gray-900">
                ₹{caseData?.commisionReceived || "N/A"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Partner Commission
              </label>
              <p className="mt-1 text-gray-900">
                ₹{caseData?.partnerCommision || "N/A"}
              </p>
            </div>
          </div>
        )}

        {activeTab === "documents" && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Case Documents</h3>
            <DocumentViewer files={caseData?.fileBucket || []} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {consentFormUrl && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Consent Form
                  </label>
                  <Link
                    href={consentFormUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Download Consent Form
                  </Link>
                </div>
              )}

              {contractUrl && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Contract
                  </label>
                  <Link
                    href={contractUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Download Contract
                  </Link>
                </div>
              )}

              {signatureUrl && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Consent Signature
                  </label>
                  {signatureUrl.length >= 25 ? (
                    <Image
                      src={signatureUrl}
                      alt="Signature"
                      width={200}
                      height={100}
                      className="max-w-xs border rounded-md"
                    />
                  ) : (
                    <p className="mt-1 text-gray-900">{signatureUrl}</p>
                  )}
                </div>
              )}

              {contractSignatureUrl && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Contract Signature
                  </label>
                  {contractSignatureUrl.length >= 25 ? (
                    <Image
                      src={contractSignatureUrl}
                      alt="Contract Signature"
                      width={200}
                      height={100}
                      className="max-w-xs border rounded-md"
                    />
                  ) : (
                    <p className="mt-1 text-gray-900">{contractSignatureUrl}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
