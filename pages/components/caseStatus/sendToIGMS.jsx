import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export default function SendToIGMS({ docId, onComplete }) {
    const [caseData, setCaseData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reviewStatus, setReviewStatus] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [documentShort, setDocumentShort] = useState('');
    const [editingField, setEditingField] = useState(null);
    const [showAllMainLogs, setShowAllMainLogs] = useState(false);
    const [showAllInternalLogs, setShowAllInternalLogs] = useState(false);
    const [newMainLogRemark, setNewMainLogRemark] = useState('');
    const [newInternalLogRemark, setNewInternalLogRemark] = useState('');
    const [isAddingMainLog, setIsAddingMainLog] = useState(false);
    const [isAddingInternalLog, setIsAddingInternalLog] = useState(false);

    useEffect(() => {
        async function fetchCase() {
            if (!docId) return;

            try {
                const docRef = doc(db, 'users', docId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setCaseData(data);
                    setReviewStatus(data.reviewStatus || '');
                    setRejectionReason(data.rejectionReason || '');
                    setDocumentShort(data.documentShort || '');
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

    const handleFieldUpdate = async (field, value) => {
        try {
            const docRef = doc(db, 'users', docId);
            await updateDoc(docRef, {
                [field]: value
            });
            alert(`${field} updated successfully`);
            setEditingField(null);
        } catch (err) {
            console.error('Error updating field:', err);
            alert('Failed to update field');
        }
    };

    const handleSendToIGMS = async () => {
        try {
            if (!docId) return;
            
            const docRef = doc(db, 'users', docId);
            await updateDoc(docRef, {
                igmsDate: new Date().toISOString(),
                rejectionReason,
                documentShort,
                igms: true,
                caseAcceptanceDate: new Date().toISOString(),
                reviewStatus: 'Case Accepted'
            });

            alert('Case sent to IGMS successfully');
            if (onComplete) {
                onComplete();
            }
        } catch (err) {
            console.error('Error updating case:', err);
            alert('Failed to send case to IGMS');
        }
    };

    const handleRejectCase = async () => {
        try {
            if (!docId) return;
            
            const docRef = doc(db, 'users', docId);
            await updateDoc(docRef, {
                reviewStatus: 'Rejected',
                rejectionDate: new Date().toISOString()
            });

            alert('Case rejected successfully');
            if (onComplete) {
                onComplete();
            }
        } catch (err) {
            console.error('Error rejecting case:', err);
            alert('Failed to reject case');
        }
    };

    const handleAddMainLog = async () => {
        try {
            if (!newMainLogRemark.trim()) return;

            const newLog = {
                date: new Date().toISOString(),
                remark: newMainLogRemark.trim()
            };

            const updatedLogs = [...(caseData.mainLogs || []), newLog];

            const docRef = doc(db, 'users', docId);
            await updateDoc(docRef, {
                mainLogs: updatedLogs
            });

            setCaseData(prev => ({
                ...prev,
                mainLogs: updatedLogs
            }));
            setNewMainLogRemark('');
            setIsAddingMainLog(false);
            alert('Main log added successfully');
        } catch (err) {
            console.error('Error adding main log:', err);
            alert('Failed to add main log');
        }
    };

    const handleAddInternalLog = async () => {
        try {
            if (!newInternalLogRemark.trim()) return;

            const newLog = {
                date: new Date().toISOString(),
                remark: newInternalLogRemark.trim()
            };

            const updatedLogs = [...(caseData.internalLogs || []), newLog];

            const docRef = doc(db, 'users', docId);
            await updateDoc(docRef, {
                internalLogs: updatedLogs
            });

            setCaseData(prev => ({
                ...prev,
                internalLogs: updatedLogs
            }));
            setNewInternalLogRemark('');
            setIsAddingInternalLog(false);
            alert('Internal log added successfully');
        } catch (err) {
            console.error('Error adding internal log:', err);
            alert('Failed to add internal log');
        }
    };

    const renderLogs = (logs, isMainLog = true) => {
        if (!logs || logs.length === 0) return 'No logs available';

        const sortedLogs = [...logs].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );

        const logsToShow = isMainLog ? 
            (showAllMainLogs ? sortedLogs : [sortedLogs[0]]) :
            (showAllInternalLogs ? sortedLogs : [sortedLogs[0]]);

        return (
            <div className="space-y-3">
                {logsToShow.map((log, index) => (
                    <div key={index} className="border-b pb-2 last:border-b-0">
                        <div className="flex justify-between text-sm text-gray-500">
                            <span>{new Date(log.date).toLocaleString()}</span>
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

    return (
        <div className="container mx-auto px-4 py-8">
            <h2 className="text-2xl font-bold mb-6">IGMS</h2>
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Information */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Name</label>
                        <p className="mt-1 text-gray-900">{caseData?.name || 'N/A'}</p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Estimated Claim Amount</label>
                        <p className="mt-1 text-gray-900">₹{caseData?.estimatedClaimAmount || 'N/A'}</p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Partner Reference</label>
                        <p className="mt-1 text-gray-900">{caseData?.partnerRef || 'N/A'}</p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Mobile</label>
                        <p className="mt-1 text-gray-900">{caseData?.mobile || 'N/A'}</p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <p className="mt-1 text-gray-900">{caseData?.email || 'N/A'}</p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Review Status</label>
                        <p className="mt-1 text-gray-900">{reviewStatus || 'N/A'}</p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Company Name</label>
                        <p className="mt-1 text-gray-900">{caseData?.companyName || 'N/A'}</p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Policy Number</label>
                        <p className="mt-1 text-gray-900">{caseData?.policyNo || 'N/A'}</p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Claim Number</label>
                        <p className="mt-1 text-gray-900">{caseData?.claimNo || 'N/A'}</p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Rejection Reason</label>
                        <div className="flex items-center">
                            {editingField === 'rejectionReason' ? (
                                <>
                                    <input
                                        type="text"
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                    <button 
                                        onClick={() => handleFieldUpdate('rejectionReason', rejectionReason)}
                                        className="ml-2 text-blue-500 hover:text-blue-700"
                                    >
                                        ✓
                                    </button>
                                </>
                            ) : (
                                <>
                                    <span className="mt-1 text-gray-900">{rejectionReason || 'N/A'}</span>
                                    <button 
                                        onClick={() => setEditingField('rejectionReason')}
                                        className="ml-2 text-gray-500 hover:text-gray-700"
                                    >
                                        ✎
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Document Short</label>
                        <div className="flex items-center">
                            {editingField === 'documentShort' ? (
                                <>
                                    <input
                                        type="text"
                                        value={documentShort}
                                        onChange={(e) => setDocumentShort(e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                    <button 
                                        onClick={() => handleFieldUpdate('documentShort', documentShort)}
                                        className="ml-2 text-blue-500 hover:text-blue-700"
                                    >
                                        ✓
                                    </button>
                                </>
                            ) : (
                                <>
                                    <span className="mt-1 text-gray-900">{documentShort || 'N/A'}</span>
                                    <button 
                                        onClick={() => setEditingField('documentShort')}
                                        className="ml-2 text-gray-500 hover:text-gray-700"
                                    >
                                        ✎
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">File Bucket</label>
                        <p className="mt-1 text-gray-900">{caseData?.fileBucket || 'N/A'}</p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Complaint Date</label>
                        <p className="mt-1 text-gray-900">
                            {caseData?.complaintDate ? new Date(caseData.complaintDate).toLocaleString() : 'N/A'}
                        </p>
                    </div>

                    {/* Updated Logs sections */}
                    <div className="col-span-2 space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="block text-sm font-medium text-gray-700">Main Logs</label>
                            <div className="space-x-2">
                                {caseData?.mainLogs?.length > 1 && (
                                    <button
                                        onClick={() => setShowAllMainLogs(!showAllMainLogs)}
                                        className="text-sm text-blue-500 hover:text-blue-700"
                                    >
                                        {showAllMainLogs ? 'Show Latest' : 'View All'}
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsAddingMainLog(!isAddingMainLog)}
                                    className="text-sm text-green-500 hover:text-green-700"
                                >
                                    + Add Log
                                </button>
                            </div>
                        </div>
                        <div className="mt-1 bg-gray-50 p-3 rounded-md">
                            {isAddingMainLog && (
                                <div className="mb-3 space-y-2">
                                    <textarea
                                        value={newMainLogRemark}
                                        onChange={(e) => setNewMainLogRemark(e.target.value)}
                                        className="w-full p-2 border rounded-md"
                                        placeholder="Enter new log remark..."
                                        rows="2"
                                    />
                                    <div className="flex justify-end space-x-2">
                                        <button
                                            onClick={() => setIsAddingMainLog(false)}
                                            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleAddMainLog}
                                            className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
                                        >
                                            Add Log
                                        </button>
                                    </div>
                                </div>
                            )}
                            {renderLogs(caseData?.mainLogs, true)}
                        </div>
                    </div>

                    <div className="col-span-2 space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="block text-sm font-medium text-gray-700">Internal Logs</label>
                            <div className="space-x-2">
                                {caseData?.internalLogs?.length > 1 && (
                                    <button
                                        onClick={() => setShowAllInternalLogs(!showAllInternalLogs)}
                                        className="text-sm text-blue-500 hover:text-blue-700"
                                    >
                                        {showAllInternalLogs ? 'Show Latest' : 'View All'}
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsAddingInternalLog(!isAddingInternalLog)}
                                    className="text-sm text-green-500 hover:text-green-700"
                                >
                                    + Add Log
                                </button>
                            </div>
                        </div>
                        <div className="mt-1 bg-gray-50 p-3 rounded-md">
                            {isAddingInternalLog && (
                                <div className="mb-3 space-y-2">
                                    <textarea
                                        value={newInternalLogRemark}
                                        onChange={(e) => setNewInternalLogRemark(e.target.value)}
                                        className="w-full p-2 border rounded-md"
                                        placeholder="Enter new log remark..."
                                        rows="2"
                                    />
                                    <div className="flex justify-end space-x-2">
                                        <button
                                            onClick={() => setIsAddingInternalLog(false)}
                                            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleAddInternalLog}
                                            className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
                                        >
                                            Add Log
                                        </button>
                                    </div>
                                </div>
                            )}
                            {renderLogs(caseData?.internalLogs, false)}
                        </div>
                    </div>

                    <div className="col-span-2 mt-6 flex gap-4">
                        <button
                            onClick={handleSendToIGMS}
                            className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            Send to IGMS
                        </button>
                        <button
                            onClick={handleRejectCase}
                            className="flex-1 bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        >
                            Reject Case
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
