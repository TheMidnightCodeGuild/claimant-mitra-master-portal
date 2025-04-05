import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import SendToReview from './caseStatus/sendToReview';

export default function ViewLatestLeads() {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedLeadId, setSelectedLeadId] = useState(null);

    useEffect(() => {
        async function fetchLatestLeads() {
            try {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                yesterday.setHours(0, 0, 0, 0);
                const yesterdayStr = yesterday.toISOString();

                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todayStr = today.toISOString();

                const usersRef = collection(db, 'users');
                const q = query(
                    usersRef,
                    where('complaintDate', '>=', yesterdayStr),
                    where('complaintDate', '<', todayStr)
                );

                const querySnapshot = await getDocs(q);
                const leadsData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                leadsData.sort((a, b) => new Date(b.complaintDate) - new Date(a.complaintDate));
                setLeads(leadsData);
            } catch (err) {
                console.error('Error fetching leads:', err);
                setError('Failed to fetch latest leads. Please try again.');
            } finally {
                setLoading(false);
            }
        }

        fetchLatestLeads();
    }, []);

    if (loading) {
        return (
            <div className="min-h-[50vh] sm:min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-4 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-[50vh] sm:min-h-screen flex items-center justify-center p-4">
                <div className="text-red-600 text-center">
                    <p className="text-lg sm:text-xl font-semibold mb-2">⚠️ Error</p>
                    <p className="text-sm sm:text-base">{error}</p>
                </div>
            </div>
        );
    }

    if (selectedLeadId) {
        return (
            <div className="max-w-[1300px] mx-auto px-3 sm:px-4 py-4 sm:py-6">
                <button 
                    onClick={() => setSelectedLeadId(null)}
                    className="mb-4 sm:mb-6 px-4 sm:px-6 py-2 text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2 transition-colors text-sm sm:text-base"
                >
                    <span>←</span>
                    <span>Back to Leads</span>
                </button>
                <SendToReview docId={selectedLeadId} onComplete={() => setSelectedLeadId(null)} />
            </div>
        );
    }

    if (leads.length === 0) {
        return (
            <div className="min-h-[50vh] sm:min-h-screen flex items-center justify-center p-4">
                <div className="text-center">
                    <p className="text-lg sm:text-xl font-semibold text-gray-700 mb-2 sm:mb-3">No New Leads Found</p>
                    <p className="text-sm sm:text-base text-gray-500">
                        Search period: {new Date(Date.now() - 86400000).toLocaleDateString()} to {new Date().toLocaleDateString()}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full lg:max-w-[1300px] mx-auto px-3 sm:px-0 py-4 sm:py-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-8 mb-6 sm:mb-8">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => window.history.back()}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 uppercase underline text-center sm:text-left">Latest Leads</h2>
                </div>
                <span className="bg-blue-100 text-blue-800 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-medium text-sm sm:text-base text-center">
                    {leads.length} {leads.length === 1 ? 'Lead' : 'Leads'}
                </span>
            </div>

            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {leads.map((lead) => (
                    <div 
                        key={lead.id} 
                        onClick={() => setSelectedLeadId(lead.id)}
                        className="bg-white rounded-lg sm:rounded-xl shadow-sm hover:shadow-md p-4 sm:p-6 border border-gray-800 transition-all duration-200 cursor-pointer"
                    >
                        <div className="space-y-2 sm:space-y-3">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0">
                                <h3 className="font-semibold text-lg sm:text-xl text-gray-800 break-words">
                                    {lead.name || 'Unnamed Lead'}
                                </h3>
                                <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                                    {new Date(lead.complaintDate).toLocaleString(undefined, {
                                        dateStyle: 'medium',
                                        timeStyle: 'short'
                                    })}
                                </span>
                            </div>

                            {lead.estimatedClaimAmount && (
                                <p className="text-gray-700 flex items-center gap-2 text-sm sm:text-base">
                                    <span className="font-medium">Claim Amount:</span>
                                    <span>₹{Number(lead.estimatedClaimAmount).toLocaleString()}</span>
                                </p>
                            )}

                            {lead.partnerRef && (
                                <p className="text-gray-700 flex items-center gap-2 text-sm sm:text-base">
                                    <span className="font-medium">Partner Ref:</span>
                                    <span className="break-all">{lead.partnerRef}</span>
                                </p>
                            )}

                            {lead.mobile && (
                                <p className="text-gray-700 flex items-center gap-2 text-sm sm:text-base">
                                    <span className="font-medium">Mobile:</span>
                                    <span>{lead.mobile}</span>
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
