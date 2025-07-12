import { useState, useEffect } from "react";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import DocumentViewer from "../DocumentViewer";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/router";
import UpdateCase from "../caseStatus/updateCases";
import Image from "next/image";
import Link from "next/link";

export default function FullCase({ docId }) {
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
          if (data.signature && data.signature.length >= 15) {
            const signatureRef = ref(storage, data.signature);
            const signatureUrl = await getDownloadURL(signatureRef);
            setSignatureUrl(signatureUrl);
          } else if (data.signature) {
            setSignatureUrl(data.signature);
          }
          if (data.contractSignature && data.contractSignature.length >= 15) {
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

  if (showUpdateCase) {
    return <UpdateCase docId={docId} />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
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

      <div className="bg-white rounded-lg shadow-md p-6">
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
                Partner Reference
              </label>
              <p className="mt-1 text-gray-900">
                {caseData?.parnerRef || "N/A"}
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
                {renderLogs(caseData?.mainLogs?.slice(0, 3))}
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
                {renderLogs(caseData?.internalLogs?.slice(0, 3))}
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
                {renderLogs(caseData?.igmsLogs?.slice(0, 3))}
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
                {renderLogs(caseData?.ombudsmanLogs?.slice(0, 3))}
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
                  {signatureUrl.length >= 15 ? (
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
                  {contractSignatureUrl.length >= 15 ? (
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
