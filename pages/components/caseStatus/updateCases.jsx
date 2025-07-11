import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import DocumentViewer from '../DocumentViewer';
import { storage } from '../../../lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export default function FullCase({ docId }) {
    const [caseData, setCaseData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('basic');
    const [showAllMainLogs, setShowAllMainLogs] = useState(false);
    const [showAllInternalLogs, setShowAllInternalLogs] = useState(false);
    const [showAllIGMSLogs, setShowAllIGMSLogs] = useState(false);
    const [showAllOmbudsmanLogs, setShowAllOmbudsmanLogs] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingField, setEditingField] = useState(null);
    const [tempValue, setTempValue] = useState('');
    const [uploading, setUploading] = useState(false);
    const [consentFormUrl, setConsentFormUrl] = useState('');
    const [contractUrl, setContractUrl] = useState('');
    const [signatureUrl, setSignatureUrl] = useState('');
    const [contractSignatureUrl, setContractSignatureUrl] = useState('');
    const [sendingConsent, setSendingConsent] = useState(false);
    const [sendingContract, setSendingContract] = useState(false);

    useEffect(() => {
        async function fetchCase() {
            if (!docId) return;

            try {
                const docRef = doc(db, 'users', docId);
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
                        const contractSignatureUrl = await getDownloadURL(contractSignatureRef);
                        setContractSignatureUrl(contractSignatureUrl);
                    } else if (data.contractSignature) {
                        setContractSignatureUrl(data.contractSignature);
                    }
                } else {
                    setError('Case not found');
                }
            } catch (err) {
                console.error('Error fetching case:', err);
                setError('Failed to fetch case details');
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
            
            if (fileType === 'consentForm') {
                filePath = `cases/${docId}/consentForm/${file.name}`;
            } else if (fileType === 'contract') {
                filePath = `cases/${docId}/contract/${file.name}`;
            } else {
                filePath = `cases/${docId}/${file.name}`;
            }

            const storageRef = ref(storage, filePath);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            const docRef = doc(db, 'users', docId);

            if (fileType === 'consentForm' || fileType === 'contract') {
                await updateDoc(docRef, {
                    [fileType]: filePath
                });

                if (fileType === 'consentForm') {
                    setConsentFormUrl(downloadURL);
                } else {
                    setContractUrl(downloadURL);
                }
            } else {
                const newFile = {
                    name: file.name,
                    url: downloadURL,
                    uploadedAt: new Date().toISOString()
                };

                const updatedFiles = [...(caseData?.fileBucket || []), newFile];

                await updateDoc(docRef, {
                    fileBucket: updatedFiles
                });

                setCaseData(prev => ({
                    ...prev,
                    fileBucket: updatedFiles
                }));
            }

            alert('File uploaded successfully');
        } catch (err) {
            console.error('Error uploading file:', err);
            alert('Failed to upload file');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteFile = async (fileName, fileUrl) => {
        if (!confirm('Are you sure you want to delete this file?')) return;

        try {
            const storageRef = ref(storage, `cases/${docId}/${fileName}`);
            await deleteObject(storageRef);

            const updatedFiles = caseData.fileBucket.filter(file => file.url !== fileUrl);

            const docRef = doc(db, 'users', docId);
            await updateDoc(docRef, {
                fileBucket: updatedFiles
            });

            setCaseData(prev => ({
                ...prev,
                fileBucket: updatedFiles
            }));

            alert('File deleted successfully');
        } catch (err) {
            console.error('Error deleting file:', err);
            alert('Failed to delete file');
        }
    };

    const handleDeleteCase = async () => {
        if (!confirm('Are you sure you want to delete this case? This action cannot be undone.')) return;

        try {
            const docRef = doc(db, 'users', docId);
            await deleteDoc(docRef);
            alert('Case deleted successfully');
            window.location.href = '/'; // Redirect to home page after deletion
        } catch (err) {
            console.error('Error deleting case:', err);
            alert('Failed to delete case');
        }
    };

    const handleInputChange = async (field, value) => {
        try {
            setSaving(true);
            const docRef = doc(db, 'users', docId);
            await updateDoc(docRef, {
                [field]: value
            });
            setCaseData(prev => ({
                ...prev,
                [field]: value
            }));
            setEditingField(null);
        } catch (err) {
            console.error('Error updating field:', err);
            alert('Failed to update field');
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toISOString().split('T')[0];
    };

    const renderLogs = (logs) => {
        if (!logs || logs.length === 0) return 'No logs available';

        return (
            <div className="space-y-3">
                {logs.map((log, index) => (
                    <div key={index} className="border-b pb-2 last:border-b-0">
                        <div className="flex justify-between text-sm text-gray-500">
                            <input 
                                type="datetime-local"
                                value={formatDate(log.date)}
                                onChange={(e) => handleInputChange(`logs.${index}.date`, e.target.value)}
                                className="border rounded px-2 py-1"
                            />
                        </div>
                        <input
                            type="text"
                            value={log.remark}
                            onChange={(e) => handleInputChange(`logs.${index}.remark`, e.target.value)}
                            className="mt-1 w-full border rounded px-2 py-1"
                        />
                    </div>
                ))}
            </div>
        );
    };

    const renderField = (label, field, type = "text", prefix = "") => (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700">{label}</label>
                {editingField !== field && (
                    <button 
                        onClick={() => {
                            setEditingField(field);
                            setTempValue(caseData?.[field] || '');
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
                            checked={tempValue}
                            onChange={(e) => setTempValue(e.target.checked)}
                            className="mt-1 rounded"
                        />
                    ) : type === "date" ? (
                        <input
                            type="datetime-local"
                            value={formatDate(tempValue)}
                            onChange={(e) => setTempValue(e.target.value)}
                            className="mt-1 block w-full border rounded-md shadow-sm px-3 py-2"
                        />
                    ) : (
                        <div className="relative flex-1">
                            {prefix && <span className="absolute left-3 top-2">{prefix}</span>}
                            <input
                                type={type}
                                value={tempValue}
                                onChange={(e) => setTempValue(e.target.value)}
                                className={`mt-1 block w-full border rounded-md shadow-sm px-3 py-2 ${prefix ? 'pl-6' : ''}`}
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
                    {type === "checkbox" ? (
                        caseData?.[field] ? "Yes" : "No"
                    ) : (
                        prefix + (caseData?.[field] || 'Not set')
                    )}
                </div>
            )}
        </div>
    );

    const handleSendConsent = async () => {
        if (!caseData.email || !consentFormUrl) {
            alert('Email address or consent form not available');
            return;
        }

        try {
            setSendingConsent(true);
            const response = await fetch('/api/send-consent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: caseData.email,
                    consentFormUrl: consentFormUrl
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to send consent form');
            }

            alert('Consent form sent successfully');
        } catch (error) {
            console.error('Error sending consent form:', error);
            alert('Failed to send consent form: ' + error.message);
        } finally {
            setSendingConsent(false);
        }
    };

    const handleSendContract = async () => {
        if (!caseData.email || !contractUrl) {
            alert('Email address or contract not available');
            return;
        }

        try {
            setSendingContract(true);
            const response = await fetch('/api/send-contract', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: caseData.email,
                    contractUrl: contractUrl
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to send contract');
            }

            alert('Contract sent successfully');
        } catch (error) {
            console.error('Error sending contract:', error);
            alert('Failed to send contract: ' + error.message);
        } finally {
            setSendingContract(false);
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
                <h2 className="text-2xl font-bold">Full Case Details</h2>
                <div className="flex items-center gap-4">
                    {saving && <span className="text-blue-500">Saving...</span>}
                    <button
                        onClick={handleDeleteCase}
                        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                    >
                        Delete Case
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="mb-6 border-b">
                <nav className="flex space-x-4">
                    <button
                        onClick={() => setActiveTab('basic')}
                        className={`py-2 px-4 ${activeTab === 'basic' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                    >
                        Basic Information
                    </button>
                    <button
                        onClick={() => setActiveTab('logs')}
                        className={`py-2 px-4 ${activeTab === 'logs' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                    >
                        Logs
                    </button>
                    <button
                        onClick={() => setActiveTab('financial')}
                        className={`py-2 px-4 ${activeTab === 'financial' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                    >
                        Financial Details
                    </button>
                </nav>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
                {activeTab === 'basic' && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {renderField("Name", "name")}
                            {renderField("Address", "address")}
                            {renderField("Policy Holder", "policyHolder")}
                            {renderField("Estimated Claim Amount", "estimatedClaimAmount", "number", "₹")}
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
                            {renderField("Case Acceptance Date", "caseAcceptanceDate", "date")}
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
                            {renderField("Ombudsman Courier Date", "ombudsmanCourierDate", "date")}
                            {renderField("Ombudsman Follow Up Date", "ombudsmanFollowUpDate", "date")}
                            {renderField("Ombudsman Complaint Number", "ombudsmanComplaintNumber")}
                            {renderField("6A Form Submitted", "sixAFormSubmitted", "checkbox")}
                            {renderField("Ombudsman Mode", "ombudsmanMode")}
                            {renderField("Ombudsman Rejection Reason", "ombudsmanRejectionReason")}
                            {renderField("Solved", "solved", "checkbox")}
                            {renderField("Solved Date", "solvedDate", "date")}
                            {renderField("Claim Amount", "claim", "number", "₹")}
                            {renderField("Commission Received", "commisionReceived", "number", "₹")}
                            {renderField("Partner Commission", "partnerCommision", "number", "₹")}
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
                                        className={`cursor-pointer bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 ${uploading ? 'opacity-50' : ''}`}
                                    >
                                        {uploading ? 'Uploading...' : 'Upload Document'}
                                    </label>
                                </div>
                            </div>
                            <DocumentViewer 
                                files={caseData?.fileBucket || []} 
                                onDelete={handleDeleteFile}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">Consent Form</label>
                                    <div className="flex flex-col gap-2">
                                        <input
                                            type="file"
                                            onChange={(e) => handleFileUpload(e, 'consentForm')}
                                            className="hidden"
                                            id="consentFormUpload"
                                            disabled={uploading}
                                        />
                                        <label
                                            htmlFor="consentFormUpload"
                                            className={`cursor-pointer bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 block w-fit ${uploading ? 'opacity-50' : ''}`}
                                        >
                                            {uploading ? 'Uploading...' : 'Upload Consent Form'}
                                        </label>
                                        {consentFormUrl && (
                                            <div className="flex flex-col gap-2">
                                                <a 
                                                    href={consentFormUrl} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:text-blue-800"
                                                >
                                                    Download Consent Form
                                                </a>
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
                                                        'Send Consent from Database to Email'
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">Contract</label>
                                    <div className="flex flex-col gap-2">
                                        <input
                                            type="file"
                                            onChange={(e) => handleFileUpload(e, 'contract')}
                                            className="hidden"
                                            id="contractUpload"
                                            disabled={uploading}
                                        />
                                        <label
                                            htmlFor="contractUpload"
                                            className={`cursor-pointer bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 block w-fit ${uploading ? 'opacity-50' : ''}`}
                                        >
                                            {uploading ? 'Uploading...' : 'Upload Contract'}
                                        </label>
                                        {contractUrl && (
                                            <div className="flex flex-col gap-2">
                                                <a 
                                                    href={contractUrl} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:text-blue-800"
                                                >
                                                    Download Contract
                                                </a>
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
                                                        'Send Contract from Database to Email'
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                {signatureUrl && (
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">Consent Signature</label>
                                        {signatureUrl.length >= 15 ? (
                                            <>
                                                <img 
                                                    src={signatureUrl} 
                                                    alt="Signature" 
                                                    className="max-w-xs border rounded-md"
                                                />
                                                <a 
                                                    href={signatureUrl}
                                                    download="consent_signature"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:text-blue-800 block mt-2"
                                                >
                                                    Download Signature
                                                </a>
                                            </>
                                        ) : (
                                            <div className="mt-1 text-gray-900">{signatureUrl}</div>
                                        )}
                                    </div>
                                )}
                                
                                {contractSignatureUrl && (
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">Contract Signature</label>
                                        {contractSignatureUrl.length >= 15 ? (
                                            <>
                                                <img 
                                                    src={contractSignatureUrl} 
                                                    alt="Contract Signature" 
                                                    className="max-w-xs border rounded-md"
                                                />
                                                <a
                                                    href={contractSignatureUrl}
                                                    download="contract_signature" 
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:text-blue-800 block mt-2"
                                                >
                                                    Download Signature
                                                </a>
                                            </>
                                        ) : (
                                            <div className="mt-1 text-gray-900">{contractSignatureUrl}</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'logs' && (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-lg font-medium">Main Logs</h3>
                            <div className="bg-gray-50 p-4 rounded-md">
                                {renderLogs(showAllMainLogs ? caseData?.mainLogs : caseData?.mainLogs?.slice(0, 3))}
                                {caseData?.mainLogs?.length > 3 && (
                                    <button 
                                        className="mt-2 text-blue-600 hover:text-blue-800"
                                        onClick={() => setShowAllMainLogs(prev => !prev)}
                                    >
                                        {showAllMainLogs ? 'Show Less' : 'View All'}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-lg font-medium">Internal Logs</h3>
                            <div className="bg-gray-50 p-4 rounded-md">
                                {renderLogs(showAllInternalLogs ? caseData?.internalLogs : caseData?.internalLogs?.slice(0, 3))}
                                {caseData?.internalLogs?.length > 3 && (
                                    <button 
                                        className="mt-2 text-blue-600 hover:text-blue-800"
                                        onClick={() => setShowAllInternalLogs(prev => !prev)}
                                    >
                                        {showAllInternalLogs ? 'Show Less' : 'View All'}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-lg font-medium">IGMS Logs</h3>
                            <div className="bg-gray-50 p-4 rounded-md">
                                {renderLogs(showAllIGMSLogs ? caseData?.igmsLogs : caseData?.igmsLogs?.slice(0, 3))}
                                {caseData?.igmsLogs?.length > 3 && (
                                    <button 
                                        className="mt-2 text-blue-600 hover:text-blue-800"
                                        onClick={() => setShowAllIGMSLogs(prev => !prev)}
                                    >
                                        {showAllIGMSLogs ? 'Show Less' : 'View All'}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-lg font-medium">Ombudsman Logs</h3>
                            <div className="bg-gray-50 p-4 rounded-md">
                                {renderLogs(showAllOmbudsmanLogs ? caseData?.ombudsmanLogs : caseData?.ombudsmanLogs?.slice(0, 3))}
                                {caseData?.ombudsmanLogs?.length > 3 && (
                                    <button 
                                        className="mt-2 text-blue-600 hover:text-blue-800"
                                        onClick={() => setShowAllOmbudsmanLogs(prev => !prev)}
                                    >
                                        {showAllOmbudsmanLogs ? 'Show Less' : 'View All'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'financial' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {renderField("Estimated Claim Amount", "estimatedClaimAmount", "number", "₹")}
                        {renderField("Actual Claim Amount", "claim", "number", "₹")}
                        {renderField("Commission Received", "commisionReceived", "number", "₹")}
                        {renderField("Partner Commission", "partnerCommision", "number", "₹")}
                    </div>
                )}
            </div>
        </div>
    );
}
