import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import FullCase from './fullCase';
import DocumentViewer from '../DocumentViewer';

export default function InOmbudsman({ docId, onComplete }) {
    const [caseData, setCaseData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAllMainLogs, setShowAllMainLogs] = useState(false);
    const [showAllInternalLogs, setShowAllInternalLogs] = useState(false);
    const [showAllIgmsLogs, setShowAllIgmsLogs] = useState(false);
    const [showAllOmbudsmanLogs, setShowAllOmbudsmanLogs] = useState(false);
    const [newMainLogRemark, setNewMainLogRemark] = useState('');
    const [newInternalLogRemark, setNewInternalLogRemark] = useState('');
    const [newIgmsLogRemark, setNewIgmsLogRemark] = useState('');
    const [newOmbudsmanLogRemark, setNewOmbudsmanLogRemark] = useState('');
    const [isAddingMainLog, setIsAddingMainLog] = useState(false);
    const [isAddingInternalLog, setIsAddingInternalLog] = useState(false);
    const [isAddingIgmsLog, setIsAddingIgmsLog] = useState(false);
    const [isAddingOmbudsmanLog, setIsAddingOmbudsmanLog] = useState(false);
    const [ombudsmanCourierDate, setOmbudsmanCourierDate] = useState('');
    const [ombudsmanComplaintNo, setOmbudsmanComplaintNo] = useState('');
    const [sixAFormSubmitted, setSixAFormSubmitted] = useState(false);
    const [ombudsmanMode, setOmbudsmanMode] = useState('');
    const [ombudsmanRejectionReason, setOmbudsmanRejectionReason] = useState('');
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
                    setOmbudsmanCourierDate(data.ombudsmanCourierDate || '');
                    setOmbudsmanComplaintNo(data.ombudsmanComplaintNo || '');
                    setSixAFormSubmitted(data.sixAFormSubmitted || false);
                    setOmbudsmanMode(data.ombudsmanMode || '');
                    setOmbudsmanRejectionReason(data.ombudsmanRejectionReason || '');
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

    // Helper for confirmation
    const confirmAction = (message = "Are you sure?") => {
        return window.confirm(message);
    };

    const handleAddMainLog = async () => {
        if (!newMainLogRemark.trim()) return;
        if (!confirmAction("Are you sure you want to add this main log?")) return;
        try {
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
        if (!newInternalLogRemark.trim()) return;
        if (!confirmAction("Are you sure you want to add this internal log?")) return;
        try {
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

    const handleAddIgmsLog = async () => {
        if (!newIgmsLogRemark.trim()) return;
        if (!confirmAction("Are you sure you want to add this IGMS log?")) return;
        try {
            const newLog = {
                date: new Date().toISOString(),
                remark: newIgmsLogRemark.trim()
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
            setNewIgmsLogRemark('');
            setIsAddingIgmsLog(false);
            alert('IGMS log added successfully');
        } catch (err) {
            console.error('Error adding IGMS log:', err);
            alert('Failed to add IGMS log');
        }
    };

    const handleAddOmbudsmanLog = async () => {
        if (!newOmbudsmanLogRemark.trim()) return;
        if (!confirmAction("Are you sure you want to add this Ombudsman log?")) return;
        try {
            const newLog = {
                date: new Date().toISOString(),
                remark: newOmbudsmanLogRemark.trim()
            };

            const updatedLogs = [...(caseData.ombudsmanLogs || []), newLog];

            const docRef = doc(db, 'users', docId);
            await updateDoc(docRef, {
                ombudsmanLogs: updatedLogs
            });

            setCaseData(prev => ({
                ...prev,
                ombudsmanLogs: updatedLogs
            }));
            setNewOmbudsmanLogRemark('');
            setIsAddingOmbudsmanLog(false);
            alert('Ombudsman log added successfully');
        } catch (err) {
            console.error('Error adding ombudsman log:', err);
            alert('Failed to add ombudsman log');
        }
    };

    const handleUpdateOmbudsmanStatus = async () => {
        if (!confirmAction("Are you sure you want to update the Ombudsman status?")) return;
        try {
            const docRef = doc(db, 'users', docId);
            await updateDoc(docRef, {
                ombudsmanCourierDate,
                ombudsmanComplaintNo,
                sixAFormSubmitted,
                ombudsmanMode,
                ombudsmanRejectionReason,
                lastUpdated: new Date().toISOString()
            });
            alert('Ombudsman status updated successfully');
        } catch (err) {
            console.error('Error updating ombudsman status:', err);
            alert('Failed to update ombudsman status');
        }
    };

    const handleCaseResolved = async () => {
        if (!confirmAction("Are you sure you want to mark this case as resolved?")) return;
        try {
            const docRef = doc(db, 'users', docId);
            await updateDoc(docRef, {
                status: 'Resolved',
                solvedDate: new Date().toISOString(),
                solved: true,
            });

            alert('Case marked as resolved');
            if (onComplete) {
                onComplete();
            }
        } catch (err) {
            console.error('Error resolving case:', err);
            alert('Failed to resolve case');
        }
    };

    const handleCaseRejected = async () => {
        if (!confirmAction("Are you sure you want to mark this case as rejected?")) return;
        try {
            const docRef = doc(db, 'users', docId);
            await updateDoc(docRef, {
                status: 'Rejected in Ombudsman',
                caseRejectionDate: new Date().toISOString(),
                rejected: true
            });

            alert('Case marked as rejected');
            if (onComplete) {
                onComplete();
            }
        } catch (err) {
            console.error('Error rejecting case:', err);
            alert('Failed to reject case');
        }
    };

    const handleDeleteCase = async () => {
        if (!confirmAction('Are you sure you want to delete this case? This action cannot be undone.')) return;
        try {
            const docRef = doc(db, 'users', docId);
            await deleteDoc(docRef);
            alert('Case deleted successfully');
            if (onComplete) {
                onComplete();
            }
        } catch (err) {
            console.error('Error deleting case:', err);
            alert('Failed to delete case');
        }
    };

    const renderLogs = (logs, isMainLog = true, isIgmsLog = false, isOmbudsmanLog = false) => {
        if (!logs || logs.length === 0) return 'No logs available';

        const sortedLogs = [...logs].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );

        const logsToShow = isMainLog ? 
            (showAllMainLogs ? sortedLogs : [sortedLogs[0]]) :
            isIgmsLog ?
            (showAllIgmsLogs ? sortedLogs : [sortedLogs[0]]) :
            isOmbudsmanLog ?
            (showAllOmbudsmanLogs ? sortedLogs : [sortedLogs[0]]) :
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
                <h2 className="text-2xl font-bold">Ombudsman Case Details</h2>
                <div className="flex space-x-4">
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
                        <label className="block text-sm font-medium text-gray-700">Company Name</label>
                        <p className="mt-1 text-gray-900">{caseData?.companyName || 'N/A'}</p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Estimated Claim Amount</label>
                        <p className="mt-1 text-gray-900">₹{caseData?.estimatedClaimAmount || 'N/A'}</p>
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
                        <label className="block text-sm font-medium text-gray-700">Policy Number</label>
                        <p className="mt-1 text-gray-900">{caseData?.policyNo || 'N/A'}</p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Claim Number</label>
                        <p className="mt-1 text-gray-900">{caseData?.claimNo || 'N/A'}</p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Partner Reference</label>
                        <p className="mt-1 text-gray-900">{caseData?.partnerRef || 'N/A'}</p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Ombudsman Date</label>
                        <p className="mt-1 text-gray-900">
                            {caseData?.ombudsmanDate ? new Date(caseData.ombudsmanDate).toLocaleString() : 'N/A'}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Case Acceptance Date</label>
                        <p className="mt-1 text-gray-900">
                            {caseData?.caseAcceptanceDate ? new Date(caseData.caseAcceptanceDate).toLocaleString() : 'N/A'}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">IGMS Rejection Reason</label>
                        <p className="mt-1 text-gray-900">{caseData?.igmsRejectionReason || 'N/A'}</p>
                    </div>

                    <div className="col-span-2 space-y-4 mt-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium">Case Documents</h3>
                        </div>
                        <DocumentViewer files={caseData?.fileBucket || []} />
                    </div>

                    {/* Ombudsman Status Update Section */}
                    <div className="col-span-2 space-y-4 border-t pt-4">
                        <h3 className="text-lg font-medium">Update Ombudsman Status</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Courier Date</label>
                                <input
                                    type="date"
                                    value={ombudsmanCourierDate}
                                    onChange={(e) => setOmbudsmanCourierDate(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Complaint Number</label>
                                <input
                                    type="text"
                                    value={ombudsmanComplaintNo}
                                    onChange={(e) => setOmbudsmanComplaintNo(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Mode</label>
                                <input
                                    type="text"
                                    value={ombudsmanMode}
                                    onChange={(e) => setOmbudsmanMode(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                />
                            </div>
    <div>
                                <label className="block text-sm font-medium text-gray-700">6A Form Submitted?</label>
                                <select
                                    value={sixAFormSubmitted}
                                    onChange={(e) => setSixAFormSubmitted(e.target.value === 'true')}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                >
                                    <option value={true}>Yes</option>
                                    <option value={false}>No</option>
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700"> Ombudsman Rejection Reason</label>
                                <textarea
                                    value={ombudsmanRejectionReason}
                                    onChange={(e) => setOmbudsmanRejectionReason(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    rows="3"
                                />
                            </div>
                        </div>
                        
                        <button
                            onClick={handleUpdateOmbudsmanStatus}
                            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            Update Status
                        </button>
                    </div>

                    {/* Logs sections */}
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
                                        onClick={() => setShowAllIgmsLogs(!showAllIgmsLogs)}
                                        className="text-sm text-blue-500 hover:text-blue-700"
                                    >
                                        {showAllIgmsLogs ? 'Show Latest' : 'View All'}
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsAddingIgmsLog(!isAddingIgmsLog)}
                                    className="text-sm text-green-500 hover:text-green-700"
                                >
                                    + Add Log
                                </button>
                            </div>
                        </div>
                        <div className="mt-1 bg-gray-50 p-3 rounded-md">
                            {isAddingIgmsLog && (
                                <div className="mb-3 space-y-2">
                                    <textarea
                                        value={newIgmsLogRemark}
                                        onChange={(e) => setNewIgmsLogRemark(e.target.value)}
                                        className="w-full p-2 border rounded-md"
                                        placeholder="Enter new log remark..."
                                        rows="2"
                                    />
                                    <div className="flex justify-end space-x-2">
                                        <button
                                            onClick={() => setIsAddingIgmsLog(false)}
                                            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleAddIgmsLog}
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

                    <div className="col-span-2 space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="block text-sm font-medium text-gray-700">Ombudsman Logs</label>
                            <div className="space-x-2">
                                {caseData?.ombudsmanLogs?.length > 1 && (
                                    <button
                                        onClick={() => setShowAllOmbudsmanLogs(!showAllOmbudsmanLogs)}
                                        className="text-sm text-blue-500 hover:text-blue-700"
                                    >
                                        {showAllOmbudsmanLogs ? 'Show Latest' : 'View All'}
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsAddingOmbudsmanLog(!isAddingOmbudsmanLog)}
                                    className="text-sm text-green-500 hover:text-green-700"
                                >
                                    + Add Log
                                </button>
                            </div>
                        </div>
                        <div className="mt-1 bg-gray-50 p-3 rounded-md">
                            {isAddingOmbudsmanLog && (
                                <div className="mb-3 space-y-2">
                                    <textarea
                                        value={newOmbudsmanLogRemark}
                                        onChange={(e) => setNewOmbudsmanLogRemark(e.target.value)}
                                        className="w-full p-2 border rounded-md"
                                        placeholder="Enter new log remark..."
                                        rows="2"
                                    />
                                    <div className="flex justify-end space-x-2">
                                        <button
                                            onClick={() => setIsAddingOmbudsmanLog(false)}
                                            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleAddOmbudsmanLog}
                                            className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
                                        >
                                            Add Log
                                        </button>
                                    </div>
                                </div>
                            )}
                            {renderLogs(caseData?.ombudsmanLogs, false, false, true)}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="col-span-2 mt-6 space-y-4">
                        <button
                            onClick={handleCaseResolved}
                            className="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                        >
                            Mark as Resolved
                        </button>
                        <button
                            onClick={handleCaseRejected}
                            className="w-full bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        >
                            Mark as Rejected
                        </button>
                    </div>
                </div>
            </div>
    </div>
    );
}
