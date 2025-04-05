import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export default function FullCase({ docId }) {
    const [caseData, setCaseData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('basic'); // basic, logs, financial

    useEffect(() => {
        async function fetchCase() {
            if (!docId) return;

            try {
                const docRef = doc(db, 'users', docId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setCaseData(docSnap.data());
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

    const formatDate = (dateString) => {
        if (!dateString) return 'Not set';
        return new Date(dateString).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const renderLogs = (logs) => {
        if (!logs || logs.length === 0) return 'No logs available';

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

    return (
        <div className="container mx-auto px-4 py-8">
            <h2 className="text-2xl font-bold mb-6">Full Case Details</h2>

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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                            <p className="mt-1 text-gray-900">{caseData?.parnerRef || 'N/A'}</p>
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
                            <label className="block text-sm font-medium text-gray-700">Complaint Date</label>
                            <p className="mt-1 text-gray-900">{formatDate(caseData?.complaintDate)}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Taken For Review</label>
                            <p className="mt-1 text-gray-900">{caseData?.takenForReview ? 'Yes' : 'No'}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Status</label>
                            <p className="mt-1 text-gray-900">{caseData?.status || 'N/A'}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Document Short</label>
                            <p className="mt-1 text-gray-900">{caseData?.documentShort ? 'Yes' : 'No'}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Case Rejection Reason</label>
                            <p className="mt-1 text-gray-900">{caseData?.caseRejectionReason || 'N/A'}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Case Rejection Date</label>
                            <p className="mt-1 text-gray-900">{formatDate(caseData?.caseRejectionDate)}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Case Acceptance Date</label>
                            <p className="mt-1 text-gray-900">{formatDate(caseData?.caseAcceptanceDate)}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Rejected</label>
                            <p className="mt-1 text-gray-900">{caseData?.rejected ? 'Yes' : 'No'}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Company Name</label>
                            <p className="mt-1 text-gray-900">{caseData?.companyName || 'N/A'}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Claim Number</label>
                            <p className="mt-1 text-gray-900">{caseData?.claimNo || 'N/A'}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Policy Number</label>
                            <p className="mt-1 text-gray-900">{caseData?.policyNo || 'N/A'}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">IGMS Status</label>
                            <p className="mt-1 text-gray-900">{caseData?.igms ? 'Yes' : 'No'}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">IGMS Date</label>
                            <p className="mt-1 text-gray-900">{formatDate(caseData?.igmsDate)}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">IGMS Follow Up Date</label>
                            <p className="mt-1 text-gray-900">{formatDate(caseData?.igmsFollowUpDate)}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">IGMS Rejection Reason</label>
                            <p className="mt-1 text-gray-900">{caseData?.igmsRejectionReason || 'N/A'}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Ombudsman Status</label>
                            <p className="mt-1 text-gray-900">{caseData?.ombudsman ? 'Yes' : 'No'}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Ombudsman Date</label>
                            <p className="mt-1 text-gray-900">{formatDate(caseData?.ombudsmanDate)}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Ombudsman Courier Date</label>
                            <p className="mt-1 text-gray-900">{formatDate(caseData?.ombudsmanCourierDate)}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Ombudsman Follow Up Date</label>
                            <p className="mt-1 text-gray-900">{formatDate(caseData?.ombudsmanFollowUpDate)}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Ombudsman Complaint Number</label>
                            <p className="mt-1 text-gray-900">{caseData?.ombudsmanComplaintNumber || 'N/A'}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">6A Form Submitted</label>
                            <p className="mt-1 text-gray-900">{caseData?.sixAFormSubmitted ? 'Yes' : 'No'}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Ombudsman Mode</label>
                            <p className="mt-1 text-gray-900">{caseData?.ombudsmanMode || 'N/A'}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Ombudsman Rejection Reason</label>
                            <p className="mt-1 text-gray-900">{caseData?.ombudsmanRejectionReason || 'N/A'}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Solved</label>
                            <p className="mt-1 text-gray-900">{caseData?.solved ? 'Yes' : 'No'}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Solved Date</label>
                            <p className="mt-1 text-gray-900">{formatDate(caseData?.solvedDate)}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Claim Amount</label>
                            <p className="mt-1 text-gray-900">₹{caseData?.claim || 'N/A'}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Commission Received</label>
                            <p className="mt-1 text-gray-900">₹{caseData?.commisionReceived || 'N/A'}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Partner Commission</label>
                            <p className="mt-1 text-gray-900">₹{caseData?.partnerCommision || 'N/A'}</p>
                        </div>
                    </div>
                )}

                {activeTab === 'logs' && (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-lg font-medium">Main Logs</h3>
                            <div className="bg-gray-50 p-4 rounded-md">
                                {renderLogs(caseData?.mainLogs?.slice(0, 3))}
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
                                {renderLogs(caseData?.internalLogs?.slice(0, 3))}
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
                                {renderLogs(caseData?.igmsLogs?.slice(0, 3))}
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
                                {renderLogs(caseData?.ombudsmanLogs?.slice(0, 3))}
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
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Estimated Claim Amount</label>
                            <p className="mt-1 text-gray-900">₹{caseData?.estimatedClaimAmount || 'N/A'}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Actual Claim Amount</label>
                            <p className="mt-1 text-gray-900">₹{caseData?.claim || 'N/A'}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Commission Received</label>
                            <p className="mt-1 text-gray-900">₹{caseData?.commisionReceived || 'N/A'}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Partner Commission</label>
                            <p className="mt-1 text-gray-900">₹{caseData?.partnerCommision || 'N/A'}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
