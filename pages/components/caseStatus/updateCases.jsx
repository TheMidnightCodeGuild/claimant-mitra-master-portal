import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import DocumentViewer from "../DocumentViewer";
import { storage } from "../../../lib/firebase";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import Image from "next/image";
import Link from "next/link";

export default function FullCase({ docId }) {
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("basic");
  const [showAllMainLogs, setShowAllMainLogs] = useState(false);
  const [showAllInternalLogs, setShowAllInternalLogs] = useState(false);
  const [showAllIGMSLogs, setShowAllIGMSLogs] = useState(false);
  const [showAllOmbudsmanLogs, setShowAllOmbudsmanLogs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState("");
  const [uploading, setUploading] = useState(false);
  const [consentFormUrl, setConsentFormUrl] = useState("");
  const [contractUrl, setContractUrl] = useState("");
  const [signatureUrl, setSignatureUrl] = useState("");
  const [contractSignatureUrl, setContractSignatureUrl] = useState("");
  const [sendingConsent, setSendingConsent] = useState(false);
  const [sendingContract, setSendingContract] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [verificationLinkCopied, setVerificationLinkCopied] = useState(false);
  const [showVerificationPanel, setShowVerificationPanel] = useState(false);
  const [verificationUrl, setVerificationUrl] = useState("");
  const [verificationScriptForm, setVerificationScriptForm] = useState({
    name: "",
    insuranceCompany: "",
    claimNo: "",
    policyNo: "",
    hospitalName: "",
    claimAmount: "",
  });
  const [showVerificationMedia, setShowVerificationMedia] = useState(false);
  const [verificationActionLoading, setVerificationActionLoading] = useState(false);

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

  const handleFileUpload = async (e, fileType) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      let filePath;

      if (fileType === "consentForm") {
        filePath = `cases/${docId}/consentForm/${file.name}`;
      } else if (fileType === "contract") {
        filePath = `cases/${docId}/contract/${file.name}`;
      } else {
        filePath = `cases/${docId}/${file.name}`;
      }

      const storageRef = ref(storage, filePath);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      const docRef = doc(db, "users", docId);

      if (fileType === "consentForm" || fileType === "contract") {
        await updateDoc(docRef, {
          [fileType]: filePath,
        });

        if (fileType === "consentForm") {
          setConsentFormUrl(downloadURL);
        } else {
          setContractUrl(downloadURL);
        }
      } else {
        const newFile = {
          name: file.name,
          url: downloadURL,
          uploadedAt: new Date().toISOString(),
        };

        const updatedFiles = [...(caseData?.fileBucket || []), newFile];

        await updateDoc(docRef, {
          fileBucket: updatedFiles,
        });

        setCaseData((prev) => ({
          ...prev,
          fileBucket: updatedFiles,
        }));
      }

      alert("File uploaded successfully");
    } catch (err) {
      console.error("Error uploading file:", err);
      alert("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileName, fileUrl) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    try {
      const storageRef = ref(storage, `cases/${docId}/${fileName}`);
      await deleteObject(storageRef);

      const updatedFiles = caseData.fileBucket.filter(
        (file) => file.url !== fileUrl
      );

      const docRef = doc(db, "users", docId);
      await updateDoc(docRef, {
        fileBucket: updatedFiles,
      });

      setCaseData((prev) => ({
        ...prev,
        fileBucket: updatedFiles,
      }));

      alert("File deleted successfully");
    } catch (err) {
      console.error("Error deleting file:", err);
      alert("Failed to delete file");
    }
  };

  const handleDeleteCase = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this case? This action cannot be undone."
      )
    )
      return;

    try {
      const docRef = doc(db, "users", docId);
      await deleteDoc(docRef);
      alert("Case deleted successfully");
      window.location.href = "/"; // Redirect to home page after deletion
    } catch (err) {
      console.error("Error deleting case:", err);
      alert("Failed to delete case");
    }
  };

  // New: handleRejectCase function
  const handleRejectCase = async () => {
    if (
      !confirm(
        "Are you sure you want to reject this case? This will mark the case as rejected."
      )
    )
      return;

    try {
      setRejecting(true);
      const docRef = doc(db, "users", docId);
      await updateDoc(docRef, {
        rejected: true,
      });
      setCaseData((prev) => ({
        ...prev,
        rejected: true,
      }));
      alert("Case marked as rejected.");
    } catch (err) {
      console.error("Error rejecting case:", err);
      alert("Failed to reject case");
    } finally {
      setRejecting(false);
    }
  };

  const handleInputChange = async (field, value) => {
    try {
      setSaving(true);
      const docRef = doc(db, "users", docId);
      await updateDoc(docRef, {
        [field]: value,
      });
      setCaseData((prev) => ({
        ...prev,
        [field]: value,
      }));
      setEditingField(null);
    } catch (err) {
      console.error("Error updating field:", err);
      alert("Failed to update field");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    // If already in YYYY-MM-DD or YYYY-MM-DDTHH:mm, return as is
    if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) return dateString;
    return new Date(dateString).toISOString().split("T")[0];
  };

  // Fix: renderLogs should handle each log array separately, not assume a "logs" array
  const renderLogs = (logs, logType) => {
    if (!logs || logs.length === 0) return "No logs available";

    return (
      <div className="space-y-3">
        {logs.map((log, index) => (
          <div key={index} className="border-b pb-2 last:border-b-0">
            <div className="flex justify-between text-sm text-gray-500">
              <input
                type="datetime-local"
                value={formatDate(log.date)}
                onChange={(e) =>
                  handleLogInputChange(logType, index, "date", e.target.value)
                }
                className="border rounded px-2 py-1"
              />
            </div>
            <input
              type="text"
              value={log.remark}
              onChange={(e) =>
                handleLogInputChange(logType, index, "remark", e.target.value)
              }
              className="mt-1 w-full border rounded px-2 py-1"
            />
          </div>
        ))}
      </div>
    );
  };

  // Fix: handle log field update for each log type
  const handleLogInputChange = async (logType, index, field, value) => {
    try {
      setSaving(true);
      const docRef = doc(db, "users", docId);
      const logsArr = Array.isArray(caseData?.[logType])
        ? [...caseData[logType]]
        : [];
      logsArr[index] = { ...logsArr[index], [field]: value };
      await updateDoc(docRef, {
        [logType]: logsArr,
      });
      setCaseData((prev) => ({
        ...prev,
        [logType]: logsArr,
      }));
    } catch (err) {
      console.error("Error updating log:", err);
      alert("Failed to update log");
    } finally {
      setSaving(false);
    }
  };

  const renderField = (label, field, type = "text", prefix = "") => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        {editingField !== field && (
          <button
            onClick={() => {
              setEditingField(field);
              setTempValue(
                caseData?.[field] || (type === "checkbox" ? false : "")
              );
            }}
            className="text-blue-600 text-sm hover:text-blue-800"
          >
            Edit
          </button>
        )}
      </div>
      {editingField === field ? (
        <div className="flex gap-2">
          {type === "checkbox" ? (
            <input
              type="checkbox"
              checked={!!tempValue}
              onChange={(e) => setTempValue(e.target.checked)}
              className="mt-1 rounded"
            />
          ) : type === "date" ? (
            <input
              type="date"
              value={formatDate(tempValue)}
              onChange={(e) => setTempValue(e.target.value)}
              className="mt-1 block w-full border rounded-md shadow-sm px-3 py-2"
            />
          ) : (
            <div className="relative flex-1">
              {prefix && (
                <span className="absolute left-3 top-2">{prefix}</span>
              )}
              <input
                type={type}
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                className={`mt-1 block w-full border rounded-md shadow-sm px-3 py-2 ${
                  prefix ? "pl-6" : ""
                }`}
              />
            </div>
          )}
          <button
            onClick={() => handleInputChange(field, tempValue)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Save
          </button>
        </div>
      ) : (
        <div className="mt-1 text-gray-900">
          {type === "checkbox"
            ? caseData?.[field]
              ? "Yes"
              : "No"
            : prefix + (caseData?.[field] || "Not set")}
        </div>
      )}
    </div>
  );

  const handleSendConsent = async () => {
    if (!caseData.email || !consentFormUrl) {
      alert("Email address or consent form not available");
      return;
    }

    try {
      setSendingConsent(true);
      const response = await fetch("/api/send-consent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: caseData.email,
          consentFormUrl: consentFormUrl,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send consent form");
      }

      alert("Consent form sent successfully");
    } catch (error) {
      console.error("Error sending consent form:", error);
      alert("Failed to send consent form: " + error.message);
    } finally {
      setSendingConsent(false);
    }
  };

  const handleSendContract = async () => {
    if (!caseData.email || !contractUrl) {
      alert("Email address or contract not available");
      return;
    }

    try {
      setSendingContract(true);
      const response = await fetch("/api/send-contract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: caseData.email,
          contractUrl: contractUrl,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send contract");
      }

      alert("Contract sent successfully");
    } catch (error) {
      console.error("Error sending contract:", error);
      alert("Failed to send contract: " + error.message);
    } finally {
      setSendingContract(false);
    }
  };

  // Back button handler
  const handleBack = () => {
    window.location.href = "/view?type=allCases";
  };

  const getVerificationScriptData = () => {
    const formName = verificationScriptForm.name?.trim();
    const formInsuranceCompany = verificationScriptForm.insuranceCompany?.trim();
    const formClaimNo = verificationScriptForm.claimNo?.trim();
    const formPolicyNo = verificationScriptForm.policyNo?.trim();
    const formHospitalName = verificationScriptForm.hospitalName?.trim();
    const formClaimAmount = verificationScriptForm.claimAmount?.toString().trim();

    return {
      name: formName || caseData?.name || "N/A",
      insuranceCompany: formInsuranceCompany || caseData?.companyName || "____",
      claimNo: formClaimNo || caseData?.claimNo || "N/A",
      policyNo: formPolicyNo || caseData?.policyNo || "N/A",
      hospitalName: formHospitalName || "____",
      claimAmount:
        formClaimAmount ||
        caseData?.estimatedClaimAmount?.toString() ||
        caseData?.claim?.toString() ||
        "____",
    };
  };

  const getVerificationMonologue = () => {
    const {
      name,
      insuranceCompany,
      claimNo,
      policyNo,
      hospitalName,
      claimAmount,
    } = getVerificationScriptData();
    return `1. मेरा नाम "${name}" है।
2. मेरी ${insuranceCompany} Insurance Company की पॉलिसी है।
3. मेरा Claim No. "${claimNo}" तथा Policy No. "${policyNo}" है।
4. बीमा कंपनी ने मेरे ${hospitalName} Hospital के ₹${claimAmount} के क्लेम को अस्वीकृत कर दिया है।
5. मुझे क्लेम प्रक्रिया की पूरी जानकारी नहीं है।
6. इसलिए मैं CLAIMANT MITRA को अपना अधिकृत सलाहकार नियुक्त करता/करती हूँ।
7. मैं यह शपथपूर्वक स्वीकार करता/करती हूँ कि सफल क्लेम राशि प्राप्त होने पर मैं CLAIMANT MITRA को क्लेम राशि का 20% शुल्क प्रदान करूँगा/करूँगी।
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
          claimNo: caseData?.claimNo || "",
          policyNo: caseData?.policyNo || "",
          hospitalName: "",
          claimAmount:
            caseData?.estimatedClaimAmount?.toString() ||
            caseData?.claim?.toString() ||
            "",
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

    const verificationPath = `/requestVerification/${docId}`;
    const verificationUrl = `${window.location.origin}${verificationPath}`;

    try {
      const docRef = doc(db, "users", docId);
      const scriptData = getVerificationScriptData();
      await updateDoc(docRef, {
        requestVerificationRequestedAt: new Date().toISOString(),
        requestVerificationScriptData: scriptData,
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
        const storageRef = ref(storage, fileToDelete.path);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
          >
            &larr; Back to All Cases
          </button>
          <h2 className="text-2xl font-bold">Full Case Details</h2>
        </div>
        <div className="flex items-center gap-4">
          {saving && <span className="text-blue-500">Saving...</span>}
          <button
            onClick={handleDeleteCase}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Delete Case
          </button>
          <button
            onClick={handleRequestVerification}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            Request Verification
          </button>
          <button
            onClick={handleRejectCase}
            className={`bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 ${
              rejecting || caseData?.rejected ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={rejecting || caseData?.rejected}
            title={caseData?.rejected ? "Case is already rejected" : "Reject this case"}
          >
            {rejecting
              ? "Rejecting..."
              : caseData?.rejected
              ? "Rejected"
              : "Reject"}
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
                Hospital Name
              </label>
              <input
                type="text"
                value={verificationScriptForm.hospitalName}
                onChange={(e) =>
                  setVerificationScriptForm((prev) => ({
                    ...prev,
                    hospitalName: e.target.value,
                  }))
                }
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Claim Amount (₹)
              </label>
              <input
                type="text"
                value={verificationScriptForm.claimAmount}
                onChange={(e) =>
                  setVerificationScriptForm((prev) => ({
                    ...prev,
                    claimAmount: e.target.value,
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
              <div className="bg-white border rounded-md px-3 py-2 text-sm text-gray-900 break-all">
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

        <div className="flex flex-wrap gap-2">
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
                  className="bg-white border rounded-md p-3 space-y-2"
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
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        {activeTab === "basic" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {renderField("Name", "name")}
              {renderField("Address", "address")}
              {renderField("Policy Holder", "policyHolder")}
              {renderField(
                "Estimated Claim Amount",
                "estimatedClaimAmount",
                "number",
                "₹"
              )}
              {renderField("Partner Reference", "partnerRef")}
              {renderField("Mobile", "mobile", "tel")}
              {renderField("Email", "email", "email")}
              {renderField("Aadhar Number", "aadharNo")}
              {renderField("Complaint Date", "complaintDate", "date")}
              {renderField("Taken For Review", "takenForReview", "checkbox")}
              {renderField("Status", "status")}
              {renderField("Document Short", "documentShort", "checkbox")}
              {renderField("Case Rejection Reason", "caseRejectionReason")}
              {renderField("Case Rejection Date", "caseRejectionDate", "date")}
              {renderField(
                "Case Acceptance Date",
                "caseAcceptanceDate",
                "date"
              )}
              {renderField("Rejected", "rejected", "checkbox")}
              {renderField("Company Name", "companyName")}
              {renderField("Claim Number", "claimNo")}
              {renderField("Policy Number", "policyNo")}
              {renderField("IGMS Status", "igms", "checkbox")}
              {renderField("IGMS Date", "igmsDate", "date")}
              {renderField("IGMS Follow Up Date", "igmsFollowUpDate", "date")}
              {renderField("IGMS Rejection Reason", "igmsRejectionReason")}
              {renderField("Ombudsman Status", "ombudsman", "checkbox")}
              {renderField("Ombudsman Date", "ombudsmanDate", "date")}
              {renderField(
                "Ombudsman Courier Date",
                "ombudsmanCourierDate",
                "date"
              )}
              {renderField(
                "Ombudsman Follow Up Date",
                "ombudsmanFollowUpDate",
                "date"
              )}
              {renderField(
                "Ombudsman Complaint Number",
                "ombudsmanComplaintNumber"
              )}
              {renderField(
                "6A Form Submitted",
                "sixAFormSubmitted",
                "checkbox"
              )}
              {renderField("Ombudsman Mode", "ombudsmanMode")}
              {renderField(
                "Ombudsman Rejection Reason",
                "ombudsmanRejectionReason"
              )}
              {renderField("Solved", "solved", "checkbox")}
              {renderField("Solved Date", "solvedDate", "date")}
              {renderField("Claim Amount", "claim", "number", "₹")}
              {renderField(
                "Commission Received",
                "commisionReceived",
                "number",
                "₹"
              )}
              {renderField(
                "Partner Commission",
                "partnerCommision",
                "number",
                "₹"
              )}
            </div>

            <div className="col-span-2 space-y-4 mt-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Case Documents</h3>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    onChange={(e) => handleFileUpload(e)}
                    className="hidden"
                    id="fileUpload"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="fileUpload"
                    className={`cursor-pointer bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 ${
                      uploading ? "opacity-50" : ""
                    }`}
                  >
                    {uploading ? "Uploading..." : "Upload Document"}
                  </label>
                </div>
              </div>
              <DocumentViewer
                files={caseData?.fileBucket || []}
                onDelete={handleDeleteFile}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Consent Form
                  </label>
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      onChange={(e) => handleFileUpload(e, "consentForm")}
                      className="hidden"
                      id="consentFormUpload"
                      disabled={uploading}
                    />
                    <label
                      htmlFor="consentFormUpload"
                      className={`cursor-pointer bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 block w-fit ${
                        uploading ? "opacity-50" : ""
                      }`}
                    >
                      {uploading ? "Uploading..." : "Upload Consent Form"}
                    </label>
                    {consentFormUrl && (
                      <div className="flex flex-col gap-2">
                        <Link
                          href={consentFormUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Download Consent Form
                        </Link>
                        <button
                          onClick={handleSendConsent}
                          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 w-fit flex items-center"
                          disabled={!caseData?.email || sendingConsent}
                        >
                          {sendingConsent ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Sending...
                            </>
                          ) : (
                            "Send Consent from Database to Email"
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Contract
                  </label>
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      onChange={(e) => handleFileUpload(e, "contract")}
                      className="hidden"
                      id="contractUpload"
                      disabled={uploading}
                    />
                    <label
                      htmlFor="contractUpload"
                      className={`cursor-pointer bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 block w-fit ${
                        uploading ? "opacity-50" : ""
                      }`}
                    >
                      {uploading ? "Uploading..." : "Upload Contract"}
                    </label>
                    {contractUrl && (
                      <div className="flex flex-col gap-2">
                        <Link
                          href={contractUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Download Contract
                        </Link>
                        <button
                          onClick={handleSendContract}
                          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 w-fit flex items-center"
                          disabled={!caseData?.email || sendingContract}
                        >
                          {sendingContract ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Sending...
                            </>
                          ) : (
                            "Send Contract from Database to Email"
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {signatureUrl && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Consent Signature
                    </label>
                    {signatureUrl.length >= 25 ? (
                      <>
                        <Image
                          src={signatureUrl}
                          alt="Signature"
                          width={200}
                          height={100}
                          className="max-w-xs border rounded-md"
                        />
                        <Link
                          href={signatureUrl}
                          download="consent_signature"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 block mt-2"
                        >
                          Download Signature
                        </Link>
                      </>
                    ) : (
                      <div className="mt-1 text-gray-900">{signatureUrl}</div>
                    )}
                  </div>
                )}

                {contractSignatureUrl && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Contract Signature
                    </label>
                    {contractSignatureUrl.length >= 25 ? (
                      <>
                        <Image
                          src={contractSignatureUrl}
                          alt="Contract Signature"
                          width={200}
                          height={100}
                          className="max-w-xs border rounded-md"
                        />
                        <Link
                          href={contractSignatureUrl}
                          download="contract_signature"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 block mt-2"
                        >
                          Download Signature
                        </Link>
                      </>
                    ) : (
                      <div className="mt-1 text-gray-900">
                        {contractSignatureUrl}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === "logs" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Main Logs</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                {renderLogs(
                  showAllMainLogs
                    ? caseData?.mainLogs
                    : caseData?.mainLogs?.slice(0, 3),
                  "mainLogs"
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
                    : caseData?.internalLogs?.slice(0, 3),
                  "internalLogs"
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
                    : caseData?.igmsLogs?.slice(0, 3),
                  "igmsLogs"
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
                    : caseData?.ombudsmanLogs?.slice(0, 3),
                  "ombudsmanLogs"
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
            {renderField(
              "Estimated Claim Amount",
              "estimatedClaimAmount",
              "number",
              "₹"
            )}
            {renderField("Actual Claim Amount", "claim", "number", "₹")}
            {renderField(
              "Commission Received",
              "commisionReceived",
              "number",
              "₹"
            )}
            {renderField(
              "Partner Commission",
              "partnerCommision",
              "number",
              "₹"
            )}
          </div>
        )}
      </div>
    </div>
  );
}
