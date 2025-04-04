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
                // Get yesterday's date (start of day)
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                yesterday.setHours(0, 0, 0, 0);
                const yesterdayStr = yesterday.toISOString();

                // Get today's date (start of day)
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todayStr = today.toISOString();

                console.log('Fetching leads between:', yesterdayStr, 'and', todayStr);

                const usersRef = collection(db, 'users');
                const q = query(
                    usersRef,
                    where('complaintDate', '>=', yesterdayStr),
                    where('complaintDate', '<', todayStr)
                );

                const querySnapshot = await getDocs(q);
                const leadsData = [];

                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    console.log('Document data:', {
                        id: doc.id,
                        complaintDate: data.complaintDate,
                        ...data
                    });
                    
                    leadsData.push({
                        id: doc.id,
                        ...data
                    });
                });

                console.log('Fetched leads:', leadsData.length);
                
                // Sort leads by complaintDate in descending order (newest first)
                leadsData.sort((a, b) => {
                    return new Date(b.complaintDate) - new Date(a.complaintDate);
                });

                setLeads(leadsData);
            } catch (err) {
                console.error('Error fetching leads:', err);
                setError('Failed to fetch latest leads: ' + err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchLatestLeads();
    }, []);

    const handleLeadClick = (leadId) => {
        setSelectedLeadId(leadId);
    };

    const handleBackToLeads = () => {
        setSelectedLeadId(null);
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

    if (selectedLeadId) {
        return (
            <div>
                <button 
                    onClick={handleBackToLeads}
                    className="mb-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                    ← Back to Leads
                </button>
                <SendToReview docId={selectedLeadId} onComplete={handleBackToLeads} />
            </div>
        );
    }

    if (leads.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-500">
                    <p>No leads found from yesterday</p>
                    <p className="text-sm mt-2">
                        Search period: {new Date(Date.now() - 86400000).toLocaleDateString()} to {new Date().toLocaleDateString()}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h2 className="text-2xl font-bold mb-6">Latest Leads ({leads.length})</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {leads.map((lead) => (
                    <div 
                        key={lead.id} 
                        className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => handleLeadClick(lead.id)}
                    >
                        <div className="space-y-2">
                            <div className="flex justify-between items-start">
                                <h3 className="font-semibold text-lg">
                                    {lead.name || 'No Name'}
                                </h3>
                                <span className="text-sm text-gray-500">
                                    {new Date(lead.complaintDate).toLocaleString()}
                                </span>
                            </div>
                            {lead.estimatedClaimAmount && (
                                <p className="text-gray-600">
                                    <span className="font-medium">Estimated Claim:</span> ₹{lead.estimatedClaimAmount}
                                </p>
                            )}
                            {lead.partnerRef && (
                                <p className="text-gray-600">
                                    <span className="font-medium">Partner Reference:</span> {lead.partnerRef}
                                </p>
                            )}
                            {lead.mobile && (
                                <p className="text-gray-600">
                                    <span className="font-medium">Mobile:</span> {lead.mobile}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
