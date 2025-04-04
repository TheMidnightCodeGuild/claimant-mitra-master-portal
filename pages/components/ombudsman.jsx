import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import SendToIGMS from './caseStatus/sendToIGMS';

export default function Ombudsman() {
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCaseId, setSelectedCaseId] = useState(null);

    useEffect(() => {
        async function fetchOmbudsmanCases() {
            try {
                const usersRef = collection(db, 'users');
                const q = query(
                    usersRef,
                    where('ombudsman', '==', true)
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

                console.log('Fetched Ombudsman cases:', casesData.length);
                
                // Sort by ombudsmanDate in descending order
                casesData.sort((a, b) => {
                    return new Date(b.ombudsmanDate) - new Date(a.ombudsmanDate);
                });

                setCases(casesData);
            } catch (err) {
                console.error('Error fetching Ombudsman cases:', err);
                setError('Failed to fetch Ombudsman cases: ' + err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchOmbudsmanCases();
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
                    ← Back to Ombudsman Cases
                </button>
                <SendToIGMS docId={selectedCaseId} onComplete={handleBackToCases} />
            </div>
        );
    }

    if (cases.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-500">
                    <p>No Ombudsman cases found</p>
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

    const calculateDaysElapsed = (dateString) => {
        if (!dateString) return null;
        const days = Math.floor((new Date() - new Date(dateString)) / (1000 * 60 * 60 * 24));
        return days;
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h2 className="text-2xl font-bold mb-6">Ombudsman Cases ({cases.length})</h2>
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
                                    ID: {case_.id.slice(-4)}
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
                                            <span className="font-medium">Case Acceptance:</span><br />
                                            {formatDate(case_.caseAcceptanceDate)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">
                                            <span className="font-medium">Ombudsman Date:</span><br />
                                            {formatDate(case_.ombudsmanDate)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {case_.ombudsmanDate && (
                                <div className="mt-2 bg-blue-50 p-2 rounded-md text-sm text-blue-700">
                                    Days in Ombudsman: {calculateDaysElapsed(case_.ombudsmanDate)}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
