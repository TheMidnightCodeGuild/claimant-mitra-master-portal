import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import SendToIGMS from './caseStatus/sendToIGMS';

export default function CasesUnderReview() {
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCaseId, setSelectedCaseId] = useState(null);

    useEffect(() => {
        async function fetchCases() {
            try {
                const usersRef = collection(db, 'users');
                const q = query(
                    usersRef,
                    where('takenForReview', '==', true),
                    where('igms', '==', false),
                    where('rejected','==',false)
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

                console.log('Fetched cases under review:', casesData.length);
                
                // Sort by complaintDate in descending order
                casesData.sort((a, b) => {
                    return new Date(b.complaintDate) - new Date(a.complaintDate);
                });

                setCases(casesData);
            } catch (err) {
                console.error('Error fetching cases:', err);
                setError('Failed to fetch cases under review: ' + err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchCases();
    }, []);

    const handleCaseClick = (caseId) => {
        setSelectedCaseId(caseId);
    };

    const handleBackToCases = () => {
        setSelectedCaseId(null);
    };

    const calculateDaysElapsed = (dateString) => {
        if (!dateString) return null;
        const days = Math.floor((new Date() - new Date(dateString)) / (1000 * 60 * 60 * 24));
        return days;
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
                    ← Back to Cases
                </button>
                <SendToIGMS docId={selectedCaseId} onComplete={handleBackToCases} />
            </div>
        );
    }

    if (cases.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-500">
                    <p>No cases currently under review</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h2 className="text-2xl font-bold mb-6">Cases Under Review ({cases.length})</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {cases.map((case_) => (
                    <div 
                        key={case_.id} 
                        className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => handleCaseClick(case_.id)}
                    >
                        <div className="space-y-2">
                            <div className="flex justify-between items-start">
                                <h3 className="font-semibold text-lg">
                                    {case_.name || 'No Name'}
                                </h3>
                                <span className="text-sm text-gray-500">
                                    {new Date(case_.complaintDate).toLocaleString()}
                                </span>
                            </div>
                            {case_.estimatedClaimAmount && (
                                <p className="text-gray-600">
                                    <span className="font-medium">Estimated Claim:</span> ₹{case_.estimatedClaimAmount}
                                </p>
                            )}
                            {case_.partnerRef && (
                                <p className="text-gray-600">
                                    <span className="font-medium">Ref:</span> {case_.partnerRef}
                                </p>
                            )}
                            {case_.mobile && (
                                <p className="text-gray-600">
                                    <span className="font-medium">Mobile:</span> {case_.mobile}
                                </p>
                            )}
                            {case_.reviewDate && (
                                <p className="text-gray-600">
                                    <span className="font-medium">Review Date:</span> {new Date(case_.reviewDate).toLocaleString()}
                                </p>
                            )}
                            {case_.reviewDate && (
                                <div className="mt-2 bg-blue-50 p-2 rounded-md text-sm text-blue-700">
                                    Days in Review: {calculateDaysElapsed(case_.reviewDate)}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
