import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import FullCase from './fullCase';
import DocumentViewer from '../DocumentViewer';

export default function SendToReview({ docId, onComplete }) {
    const [caseData, setCaseData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showFullCase, setShowFullCase] = useState(false);
    const [sendingToReview, setSendingToReview] = useState(false);

    useEffect(() => {
        async function fetchCase() {
            if (!docId) return;

            try {
                const docRef = doc(db, 'users', docId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.complaintDate) {
                        data.complaintDate = new Date(data.complaintDate);
                    }
                    setCaseData(data);
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

    const handleSendToReview = async () => {
        try {
            if (!docId) return;
            
            setSendingToReview(true);
            const docRef = doc(db, 'users', docId);
            await updateDoc(docRef, {
                takenForReview: true,
                status: 'Under Review',
                reviewDate: new Date().toISOString()
            });

            if (onComplete) {
                onComplete();
            }
        } catch (err) {
            console.error('Error updating case:', err);
            setError('Failed to send case for review');
        } finally {
            setSendingToReview(false);
        }
    };

    if (showFullCase) {
        return (
            <div className="container mx-auto px-4 ">
                <button 
                    onClick={() => setShowFullCase(false)}
                    className="mb-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-2 transition-colors duration-200"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    Back to Details
                </button>
                <FullCase docId={docId} />
            </div>
        );
    }

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-screen flex items-center justify-center">
                <div className="bg-red-50 text-red-600 px-6 py-4 rounded-lg shadow-sm border border-red-200">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="lg:max-w-[1300px] mx-auto px-4 py-2 max-w-5xl">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-3xl font-bold text-gray-800">Case Details</h2>
                <button
                    onClick={() => setShowFullCase(true)}
                    className="px-6 py-2.5 text-sm font-medium text-blue-600 hover:text-white hover:bg-blue-600 border-2 border-blue-600 rounded-lg transition-all duration-200 flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                    </svg>
                    View Complete Case
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {[
                        { label: "Name", value: caseData?.name },
                        { label: "Complaint Date", value: caseData?.complaintDate?.toLocaleString() },
                        { label: "Estimated Claim Amount", value: caseData?.estimatedClaimAmount ? `₹${caseData.estimatedClaimAmount}` : null },
                        { label: "Partner Reference", value: caseData?.partnerRef },
                        { label: "Mobile", value: caseData?.mobile },
                        { label: "Email", value: caseData?.email },
                        { label: "Claim Number", value: caseData?.claimNo },
                        { label: "Policy Number", value: caseData?.policyNo },
                        { label: "Company Name", value: caseData?.companyName },
                        { label: "Documents", value: caseData?.documentShort ? 'Incomplete' : 'Complete' },
                        // { label: "File Bucket", value: caseData?.fileBucket }
                    ].map((field, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg">
                            <label className="text-sm font-medium text-gray-600">{field.label}</label>
                            <p className="mt-2 text-lg text-gray-900">{field.value || 'N/A'}</p>
                        </div>
                    ))}
                </div>

                <div className="col-span-2 space-y-4 mt-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">Case Documents</h3>
                    </div>
                    <DocumentViewer files={caseData?.fileBucket || []} />
                </div>

                <div className="mt-10">
                    <button
                        onClick={handleSendToReview}
                        disabled={sendingToReview}
                        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200 text-lg font-medium shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                    >
                        {sendingToReview ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                <span>Sending to Review...</span>
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                Send to Review
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
