import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import FullCase from './fullCase';
import { sendContract } from '../contract';
import DocumentViewer from '../DocumentViewer';

export default function SendToOmbudsman({ docId, onComplete }) {
    const [caseData, setCaseData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [caseRejectionReason, setCaseRejectionReason] = useState('');
    const [igmsRejectionReason, setIgmsRejectionReason] = useState('');
    const [editingField, setEditingField] = useState(null);
    const [showAllMainLogs, setShowAllMainLogs] = useState(false);
    const [showAllInternalLogs, setShowAllInternalLogs] = useState(false);
    const [showAllIGMSLogs, setShowAllIGMSLogs] = useState(false);
    const [newMainLogRemark, setNewMainLogRemark] = useState('');
    const [newInternalLogRemark, setNewInternalLogRemark] = useState('');
    const [newIGMSLogRemark, setNewIGMSLogRemark] = useState('');
    const [isAddingMainLog, setIsAddingMainLog] = useState(false);
    const [isAddingInternalLog, setIsAddingInternalLog] = useState(false);
    const [isAddingIGMSLog, setIsAddingIGMSLog] = useState(false);
    const [caseAcceptanceDate, setCaseAcceptanceDate] = useState('');
    const [igmsFollowUpDate, setIgmsFollowUpDate] = useState('');
    const [showFullCase, setShowFullCase] = useState(false);

    useEffect(() => {
        async function fetchCase() {
            if (!docId) return;

            try {
                const docRef = doc(db, 'users', docId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setCaseData(data);
                    setCaseRejectionReason(data.caseRejectionReason || '');
                    setIgmsRejectionReason(data.igmsRejectionReason || '');
                    setCaseAcceptanceDate(data.caseAcceptanceDate || '');
                    setIgmsFollowUpDate(data.igmsFollowUpDate || '');
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

    const handleSendToOmbudsman = async () => {
        try {
            if (!docId) return;
            
            const docRef = doc(db, 'users', docId);
            await updateDoc(docRef, {
                caseRejectionReason,
                igmsRejectionReason,
                ombudsman: true,
                ombudsmanDate: new Date().toISOString(),
                status: "Sent in Ombudsman"
            });

            alert('Case sent to Ombudsman successfully');
            if (onComplete) {
                onComplete();
            }
        } catch (err) {
            console.error('Error updating case:', err);
            alert('Failed to send case to Ombudsman');
        }
    };

    const handleRejectCase = async () => {
        try {
            if (!docId) return;
            
            const docRef = doc(db, 'users', docId);
            await updateDoc(docRef, {
                status: 'Rejected in IGMS',
                caseRejectionDate: new Date().toISOString(),
                rejected: true
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

    const handleMarkAsResolved = async () => {
        try {
            const docRef = doc(db, 'users', docId);
            await updateDoc(docRef, {
                solved: true,
                solvedDate: new Date().toISOString(),
                status: 'Resolved'
            });
            
            // Update the local state
            setCaseData(prev => ({
                ...prev,
                solved: true,
                solvedDate: new Date().toISOString(),
                status: 'Resolved'
            }));

            alert('Case marked as resolved successfully');
            if (onComplete) {
                onComplete();
            }
        } catch (err) {
            console.error('Error marking case as resolved:', err);
            alert('Failed to mark case as resolved');
        }
    };

    const handleDeleteCase = async () => {
        try {
            if (!docId) return;

            if (window.confirm('Are you sure you want to delete this case? This action cannot be undone.')) {
                const docRef = doc(db, 'users', docId);
                await deleteDoc(docRef);
                alert('Case deleted successfully');
                if (onComplete) {
                    onComplete();
                }
            }
        } catch (err) {
            console.error('Error deleting case:', err);
            alert('Failed to delete case');
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

    const handleAddIGMSLog = async () => {
        try {
            if (!newIGMSLogRemark.trim()) return;

            const newLog = {
                date: new Date().toISOString(),
                remark: newIGMSLogRemark.trim()
            };

            const updatedLogs = [...(caseData.igmsLogs || []), newLog];

            const docRef = doc(db, 'users', docId);
            await updateDoc(docRef, {
                igmsLogs: updatedLogs
            });

            setCaseData(prev => ({
                ...prev,
                igmsLogs: updatedLogs
            }));
            setNewIGMSLogRemark('');
            setIsAddingIGMSLog(false);
            alert('IGMS log added successfully');
        } catch (err) {
            console.error('Error adding IGMS log:', err);
            alert('Failed to add IGMS log');
        }
    };

    const handleSendContract = async () => {
        try {
            // Check if all required fields exist
            const requiredFields = [
                'email', 'name', 'address', 'aadharNo'
            ];
            
            const missingFields = requiredFields.filter(field => !caseData?.[field]);
            
            if (missingFields.length > 0) {
                alert(`Missing required fields: ${missingFields.join(', ')}`);
                return;
            }

            await sendContract(
                caseData.email,
                caseData.name, 
                caseData.address,
                caseData.aadharNo,
                docId
            );
            alert('Contract document sent successfully');
        } catch (err) {
            console.error('Error sending contract:', err);
            alert('Failed to send contract document');
        }
    };

    const renderLogs = (logs, isMainLog = true, isIGMSLog = false) => {
        if (!logs || logs.length === 0) return 'No logs available';

        const sortedLogs = [...logs].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );

        const logsToShow = isMainLog ? 
            (showAllMainLogs ? sortedLogs : [sortedLogs[0]]) :
            isIGMSLog ?
            (showAllIGMSLogs ? sortedLogs : [sortedLogs[0]]) :
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

    if (showFullCase) {
        return (
            <div>
                <button 
                    onClick={() => setShowFullCase(false)}
                    className="mb-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                    ← Back to Details
                </button>
                <FullCase docId={docId} />
            </div>
        );
    }

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
                <h2 className="text-2xl font-bold">IGMS</h2>
                <div className="flex gap-4">
                    <button
                        onClick={() => setShowFullCase(true)}
                        className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-600 rounded-md"
                    >
                        View Entire Doc
                    </button>
                    <button
                        onClick={handleDeleteCase}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
                    >
                        Delete Case
                    </button>
                </div>
            </div>
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
                        <label className="block text-sm font-medium text-gray-700">Case Acceptance Date</label>
                        <p className="mt-1 text-gray-900">
                            {caseAcceptanceDate ? new Date(caseAcceptanceDate).toLocaleString() : 'N/A'}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">IGMS Follow-up Date</label>
                        <div className="flex items-center">
                            {editingField === 'igmsFollowUpDate' ? (
                                <>
                                    <input
                                        type="datetime-local"
                                        value={igmsFollowUpDate}
                                        onChange={(e) => setIgmsFollowUpDate(e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                    <button 
                                        onClick={() => handleFieldUpdate('igmsFollowUpDate', igmsFollowUpDate)}
                                        className="ml-2 text-blue-500 hover:text-blue-700"
                                    >
                                        ✓
                                    </button>
                                </>
                            ) : (
                                <>
                                    <span className="mt-1 text-gray-900">
                                        {igmsFollowUpDate ? new Date(igmsFollowUpDate).toLocaleString() : 'N/A'}
                                    </span>
                                    <button 
                                        onClick={() => setEditingField('igmsFollowUpDate')}
                                        className="ml-2 text-gray-500 hover:text-gray-700"
                                    >
                                        ✎
                                    </button>
                                </>
                            )}
                        </div>
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
                        <label className="block text-sm font-medium text-gray-700">Case Rejection Reason</label>
                        <div className="flex items-center">
                            {editingField === 'caseRejectionReason' ? (
                                <>
                                    <input
                                        type="text"
                                        value={caseRejectionReason}
                                        onChange={(e) => setCaseRejectionReason(e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                    <button 
                                        onClick={() => handleFieldUpdate('caseRejectionReason', caseRejectionReason)}
                                        className="ml-2 text-blue-500 hover:text-blue-700"
                                    >
                                        ✓
                                    </button>
                                </>
                            ) : (
                                <>
                                    <span className="mt-1 text-gray-900">{caseRejectionReason || 'N/A'}</span>
                                    <button 
                                        onClick={() => setEditingField('caseRejectionReason')}
                                        className="ml-2 text-gray-500 hover:text-gray-700"
                                    >
                                        ✎
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">IGMS Rejection Reason</label>
                        <div className="flex items-center">
                            {editingField === 'igmsRejectionReason' ? (
                                <>
                                    <input
                                        type="text"
                                        value={igmsRejectionReason}
                                        onChange={(e) => setIgmsRejectionReason(e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                    <button 
                                        onClick={() => handleFieldUpdate('igmsRejectionReason', igmsRejectionReason)}
                                        className="ml-2 text-blue-500 hover:text-blue-700"
                                    >
                                        ✓
                                    </button>
                                </>
                            ) : (
                                <>
                                    <span className="mt-1 text-gray-900">{igmsRejectionReason || 'N/A'}</span>
                                    <button 
                                        onClick={() => setEditingField('igmsRejectionReason')}
                                        className="ml-2 text-gray-500 hover:text-gray-700"
                                    >
                                        ✎
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Complaint Date</label>
                        <p className="mt-1 text-gray-900">
                            {caseData?.complaintDate ? new Date(caseData.complaintDate).toLocaleString() : 'N/A'}
                        </p>
                    </div>

                    <div className="col-span-2 space-y-4 mt-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium">Case Documents</h3>
                        </div>
                        <DocumentViewer files={caseData?.fileBucket || []} />
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

                    <div className="col-span-2 space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="block text-sm font-medium text-gray-700">IGMS Logs</label>
                            <div className="space-x-2">
                                {caseData?.igmsLogs?.length > 1 && (
                                    <button
                                        onClick={() => setShowAllIGMSLogs(!showAllIGMSLogs)}
                                        className="text-sm text-blue-500 hover:text-blue-700"
                                    >
                                        {showAllIGMSLogs ? 'Show Latest' : 'View All'}
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsAddingIGMSLog(!isAddingIGMSLog)}
                                    className="text-sm text-green-500 hover:text-green-700"
                                >
                                    + Add Log
                                </button>
                            </div>
                        </div>
                        <div className="mt-1 bg-gray-50 p-3 rounded-md">
                            {isAddingIGMSLog && (
                                <div className="mb-3 space-y-2">
                                    <textarea
                                        value={newIGMSLogRemark}
                                        onChange={(e) => setNewIGMSLogRemark(e.target.value)}
                                        className="w-full p-2 border rounded-md"
                                        placeholder="Enter new log remark..."
                                        rows="2"
                                    />
                                    <div className="flex justify-end space-x-2">
                                        <button
                                            onClick={() => setIsAddingIGMSLog(false)}
                                            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleAddIGMSLog}
                                            className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
                                        >
                                            Add Log
                                        </button>
                                    </div>
                                </div>
                            )}
                            {renderLogs(caseData?.igmsLogs, false, true)}
                        </div>
                    </div>

                    <div className="col-span-2 mt-6 flex gap-4">
                        <button
                            onClick={handleSendToOmbudsman}
                            className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            Send to Ombudsman
                        </button>
                        <button
                            onClick={handleSendContract}
                            className="flex-1 bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                        >
                            Send Contract
                        </button>
                        <button
                            onClick={handleRejectCase}
                            className="flex-1 bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        >
                            Reject Case
                        </button>
                        <button
                            onClick={handleMarkAsResolved}
                            disabled={caseData?.solved}
                            className={`flex-1 py-2 px-4 rounded-md text-white font-medium 
                                ${caseData?.solved 
                                    ? 'bg-green-300 cursor-not-allowed' 
                                    : 'bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2'}`}
                        >
                            {caseData?.solved ? 'Already Resolved' : 'Mark as Resolved'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
