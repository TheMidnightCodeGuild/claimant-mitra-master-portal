import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import SendToOmbudsman from './caseStatus/sendToOmbudsman';

export default function IGMS() {
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCaseId, setSelectedCaseId] = useState(null);

    useEffect(() => {
        async function fetchIGMSCases() {
            try {
                const usersRef = collection(db, 'users');
                const q = query(
                    usersRef,
                    where('igms', '==', true),
                    where('ombudsman', '==', false),
                    where('solved', '==', false)
                );

                const querySnapshot = await getDocs(q);
                const casesData = [];

                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    casesData.push({
                        id: doc.id,
                        ...data
                    });
                });

                console.log('Fetched IGMS cases:', casesData.length);
                
                // Sort by caseAcceptanceDate in descending order
                casesData.sort((a, b) => {
                    return new Date(b.caseAcceptanceDate) - new Date(a.caseAcceptanceDate);
                });

                setCases(casesData);
            } catch (err) {
                console.error('Error fetching IGMS cases:', err);
                setError('Failed to fetch IGMS cases: ' + err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchIGMSCases();
    }, []);

    const handleCaseClick = (caseId) => {
        setSelectedCaseId(caseId);
    };

    const handleBackToCases = () => {
        setSelectedCaseId(null);
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

    if (selectedCaseId) {
        return (
            <div>
                <button 
                    onClick={handleBackToCases}
                    className="mb-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                    ← Back to IGMS Cases
                </button>
                <SendToOmbudsman docId={selectedCaseId} onComplete={handleBackToCases} />
            </div>
        );
    }

    if (cases.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-500">
                    <p>No IGMS cases found</p>
                </div>
            </div>
        );
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'Not set';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h2 className="text-2xl font-bold mb-6">IGMS Cases ({cases.length})</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {cases.map((case_) => (
                    <div 
                        key={case_.id} 
                        className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => handleCaseClick(case_.id)}
                    >
                        <div className="space-y-3">
                            <div className="flex justify-between items-start">
                                <h3 className="font-semibold text-lg">
                                    {case_.name || 'No Name'}
                                </h3>
                                <span className="text-sm text-gray-500">
                                    Ref: {case_.partnerRef || 'N/A'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <p className="text-gray-600">
                                        <span className="font-medium">Mobile:</span><br />
                                        {case_.mobile || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-600">
                                        <span className="font-medium">Claim Amount:</span><br />
                                        ₹{case_.estimatedClaimAmount || 'N/A'}
                                    </p>
                                </div>
                            </div>

                            <div className="border-t pt-2 mt-2">
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <p className="text-gray-600">
                                            <span className="font-medium">Acceptance:</span><br />
                                            {formatDate(case_.caseAcceptanceDate)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">
                                            <span className="font-medium">Follow-up:</span><br />
                                            {formatDate(case_.igmsFollowUpDate)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {case_.igmsFollowUpDate && new Date(case_.igmsFollowUpDate) <= new Date() && (
                                <div className="mt-2 bg-yellow-50 p-2 rounded-md text-sm text-yellow-700">
                                    Follow-up required
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
