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

    // Confirmation wrapper for destructive/important actions
    const confirmAction = async (message, action) => {
        alert(message);
        if (window.confirm('Are you sure?')) {
            await action();
        }
    };

    const handleSendToOmbudsman = async () => {
        await confirmAction(
            'You are about to send this case to Ombudsman.',
            async () => {
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
            }
        );
    };

    // New handler for sending to reimbursement
    const handleSendToReimbursement = async () => {
        await confirmAction(
            'You are about to send this case to Reimbursement.',
            async () => {
                try {
                    if (!docId) return;

                    const docRef = doc(db, 'users', docId);
                    await updateDoc(docRef, {
                        inReimbursement: true,
                        igms: false
                    });

                    alert('Case sent to Reimbursement successfully');
                    if (onComplete) {
                        onComplete();
                    }
                } catch (err) {
                    console.error('Error sending case to Reimbursement:', err);
                    alert('Failed to send case to Reimbursement');
                }
            }
        );
    };

    const handleRejectCase = async () => {
        await confirmAction(
            'You are about to reject this case.',
            async () => {
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
            }
        );
    };

    const handleMarkAsResolved = async () => {
        await confirmAction(
            'You are about to mark this case as resolved.',
            async () => {
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
            }
        );
    };

    const handleDeleteCase = async () => {
        await confirmAction(
            'You are about to delete this case. This action cannot be undone.',
            async () => {
                try {
                    if (!docId) return;

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
            }
        );
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
        await confirmAction(
            'You are about to send the contract document.',
            async () => {
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
            }
        );
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
                        <div className="flex justify-between text-sm text-slate-500">
                            <span>{new Date(log.date).toLocaleString()}</span>
                        </div>
                        <p className="mt-1 text-slate-900">{log.remark}</p>
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
                    className="mb-4 px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-6 py-4 text-rose-700 shadow-sm">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
            <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">IGMS</h2>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowFullCase(true)}
                        className="ui-btn-secondary"
                    >
                        View Entire Doc
                    </button>
                    <button
                        onClick={handleDeleteCase}
                        className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-rose-700"
                    >
                        Delete Case
                    </button>
                </div>
            </div>
            <div className="ui-card-padded">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Information */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">Name</label>
                        <p className="mt-1 text-slate-900">{caseData?.name || 'N/A'}</p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">Estimated Claim Amount</label>
                        <p className="mt-1 text-slate-900">₹{caseData?.estimatedClaimAmount || 'N/A'}</p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">Partner Reference</label>
                        <p className="mt-1 text-slate-900">{caseData?.partnerRef || 'N/A'}</p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">Mobile</label>
                        <p className="mt-1 text-slate-900">{caseData?.mobile || 'N/A'}</p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">Email</label>
                        <p className="mt-1 text-slate-900">{caseData?.email || 'N/A'}</p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">Case Acceptance Date</label>
                        <p className="mt-1 text-slate-900">
                            {caseAcceptanceDate ? new Date(caseAcceptanceDate).toLocaleString() : 'N/A'}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">IGMS Follow-up Date</label>
                        <div className="flex items-center">
                            {editingField === 'igmsFollowUpDate' ? (
                                <>
                                    <input
                                        type="datetime-local"
                                        value={igmsFollowUpDate}
                                        onChange={(e) => setIgmsFollowUpDate(e.target.value)}
                                        className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    />
                                    <button 
                                        onClick={() => handleFieldUpdate('igmsFollowUpDate', igmsFollowUpDate)}
                                        className="ml-2 text-indigo-600 hover:text-indigo-800"
                                    >
                                        ✓
                                    </button>
                                </>
                            ) : (
                                <>
                                    <span className="mt-1 text-slate-900">
                                        {igmsFollowUpDate ? new Date(igmsFollowUpDate).toLocaleString() : 'N/A'}
                                    </span>
                                    <button 
                                        onClick={() => setEditingField('igmsFollowUpDate')}
                                        className="ml-2 text-slate-500 hover:text-slate-700"
                                    >
                                        ✎
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">Company Name</label>
                        <p className="mt-1 text-slate-900">{caseData?.companyName || 'N/A'}</p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">Policy Number</label>
                        <p className="mt-1 text-slate-900">{caseData?.policyNo || 'N/A'}</p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">Claim Number</label>
                        <p className="mt-1 text-slate-900">{caseData?.claimNo || 'N/A'}</p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">Case Rejection Reason</label>
                        <div className="flex items-center">
                            {editingField === 'caseRejectionReason' ? (
                                <>
                                    <input
                                        type="text"
                                        value={caseRejectionReason}
                                        onChange={(e) => setCaseRejectionReason(e.target.value)}
                                        className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    />
                                    <button 
                                        onClick={() => handleFieldUpdate('caseRejectionReason', caseRejectionReason)}
                                        className="ml-2 text-indigo-600 hover:text-indigo-800"
                                    >
                                        ✓
                                    </button>
                                </>
                            ) : (
                                <>
                                    <span className="mt-1 text-slate-900">{caseRejectionReason || 'N/A'}</span>
                                    <button 
                                        onClick={() => setEditingField('caseRejectionReason')}
                                        className="ml-2 text-slate-500 hover:text-slate-700"
                                    >
                                        ✎
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">IGMS Rejection Reason</label>
                        <div className="flex items-center">
                            {editingField === 'igmsRejectionReason' ? (
                                <>
                                    <input
                                        type="text"
                                        value={igmsRejectionReason}
                                        onChange={(e) => setIgmsRejectionReason(e.target.value)}
                                        className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    />
                                    <button 
                                        onClick={() => handleFieldUpdate('igmsRejectionReason', igmsRejectionReason)}
                                        className="ml-2 text-indigo-600 hover:text-indigo-800"
                                    >
                                        ✓
                                    </button>
                                </>
                            ) : (
                                <>
                                    <span className="mt-1 text-slate-900">{igmsRejectionReason || 'N/A'}</span>
                                    <button 
                                        onClick={() => setEditingField('igmsRejectionReason')}
                                        className="ml-2 text-slate-500 hover:text-slate-700"
                                    >
                                        ✎
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">Complaint Date</label>
                        <p className="mt-1 text-slate-900">
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
                            <label className="block text-sm font-medium text-slate-700">Main Logs</label>
                            <div className="space-x-2">
                                {caseData?.mainLogs?.length > 1 && (
                                    <button
                                        onClick={() => setShowAllMainLogs(!showAllMainLogs)}
                                        className="text-sm text-indigo-600 hover:text-indigo-800"
                                    >
                                        {showAllMainLogs ? 'Show Latest' : 'View All'}
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsAddingMainLog(!isAddingMainLog)}
                                    className="text-sm text-emerald-600 hover:text-emerald-800"
                                >
                                    + Add Log
                                </button>
                            </div>
                        </div>
                        <div className="mt-1 rounded-lg border border-slate-100 bg-slate-50/80 p-3">
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
                                            className="px-3 py-1 text-sm text-slate-600 hover:text-slate-800"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleAddMainLog}
                                            className="rounded-md bg-indigo-600 px-3 py-1 text-sm text-white transition-colors hover:bg-indigo-700"
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
                            <label className="block text-sm font-medium text-slate-700">Internal Logs</label>
                            <div className="space-x-2">
                                {caseData?.internalLogs?.length > 1 && (
                                    <button
                                        onClick={() => setShowAllInternalLogs(!showAllInternalLogs)}
                                        className="text-sm text-indigo-600 hover:text-indigo-800"
                                    >
                                        {showAllInternalLogs ? 'Show Latest' : 'View All'}
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsAddingInternalLog(!isAddingInternalLog)}
                                    className="text-sm text-emerald-600 hover:text-emerald-800"
                                >
                                    + Add Log
                                </button>
                            </div>
                        </div>
                        <div className="mt-1 rounded-lg border border-slate-100 bg-slate-50/80 p-3">
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
                                            className="px-3 py-1 text-sm text-slate-600 hover:text-slate-800"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleAddInternalLog}
                                            className="rounded-md bg-indigo-600 px-3 py-1 text-sm text-white transition-colors hover:bg-indigo-700"
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
                            <label className="block text-sm font-medium text-slate-700">IGMS Logs</label>
                            <div className="space-x-2">
                                {caseData?.igmsLogs?.length > 1 && (
                                    <button
                                        onClick={() => setShowAllIGMSLogs(!showAllIGMSLogs)}
                                        className="text-sm text-indigo-600 hover:text-indigo-800"
                                    >
                                        {showAllIGMSLogs ? 'Show Latest' : 'View All'}
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsAddingIGMSLog(!isAddingIGMSLog)}
                                    className="text-sm text-emerald-600 hover:text-emerald-800"
                                >
                                    + Add Log
                                </button>
                            </div>
                        </div>
                        <div className="mt-1 rounded-lg border border-slate-100 bg-slate-50/80 p-3">
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
                                            className="px-3 py-1 text-sm text-slate-600 hover:text-slate-800"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleAddIGMSLog}
                                            className="rounded-md bg-indigo-600 px-3 py-1 text-sm text-white transition-colors hover:bg-indigo-700"
                                        >
                                            Add Log
                                        </button>
                                    </div>
                                </div>
                            )}
                            {renderLogs(caseData?.igmsLogs, false, true)}
                        </div>
                    </div>

                    <div className="col-span-2 mt-6 flex flex-wrap gap-2">
                        <button
                            onClick={handleSendToOmbudsman}
                            className="min-h-[42px] min-w-[160px] flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                        >
                            Send to Ombudsman
                        </button>
                        <button
                            onClick={handleSendToReimbursement}
                            className="min-h-[42px] min-w-[160px] flex-1 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
                        >
                            Send to Reimbursement
                        </button>
                        <button
                            onClick={handleSendContract}
                            className="min-h-[42px] min-w-[140px] flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                        >
                            Send Contract
                        </button>
                        <button
                            onClick={handleRejectCase}
                            className="min-h-[42px] min-w-[120px] flex-1 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
                        >
                            Reject Case
                        </button>
                        <button
                            onClick={handleMarkAsResolved}
                            className="min-h-[42px] min-w-[160px] flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
                        >
                            Mark As Resolved
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
