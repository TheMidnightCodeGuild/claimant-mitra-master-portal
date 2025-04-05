import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import FullCase from './caseStatus/fullCase';

export default function SolvedCases() {
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCaseId, setSelectedCaseId] = useState(null);

    useEffect(() => {
        async function fetchSolvedCases() {
            try {
                const usersRef = collection(db, 'users');
                const q = query(
                    usersRef,
                    where('solved', '==', true)
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

                console.log('Fetched solved cases:', casesData.length);
                
                // Sort by most recently solved first
                casesData.sort((a, b) => {
                    return new Date(b.solvedDate) - new Date(a.solvedDate);
                });

                setCases(casesData);
            } catch (err) {
                console.error('Error fetching solved cases:', err);
                setError('Failed to fetch solved cases: ' + err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchSolvedCases();
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
                    ← Back to Solved Cases
                </button>
                <FullCase docId={selectedCaseId} />
            </div>
        );
    }

    if (cases.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-500">
                    <p>No solved cases found</p>
                </div>
            </div>
        );
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'Not set';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatCurrency = (amount) => {
        if (!amount) return 'N/A';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h2 className="text-2xl font-bold mb-6">Solved Cases ({cases.length})</h2>
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

                            <div className="grid grid-cols-1 gap-2 text-sm">
                                <p className="text-gray-600">
                                    <span className="font-medium">Claim Amount:</span>{' '}
                                    {formatCurrency(case_.claim)}
                                </p>
                                
                                <p className="text-gray-600">
                                    <span className="font-medium">Company:</span>{' '}
                                    {case_.companyName || 'N/A'}
                                </p>

                                <p className="text-gray-600">
                                    <span className="font-medium">Policy No:</span>{' '}
                                    {case_.policyNo || 'N/A'}
                                </p>

                                <p className="text-gray-600">
                                    <span className="font-medium">Mobile:</span>{' '}
                                    {case_.mobile || 'N/A'}
                                </p>
                            </div>

                            <div className="border-t pt-2 mt-2">
                                <div className="grid grid-cols-1 gap-2 text-sm">
                                    <p className="text-gray-600">
                                        <span className="font-medium">Complaint Date:</span><br />
                                        {formatDate(case_.complaintDate)}
                                    </p>
                                    <p className="text-gray-600">
                                        <span className="font-medium">Case Acceptance:</span><br />
                                        {formatDate(case_.caseAcceptanceDate)}
                                    </p>
                                    <p className="text-gray-600">
                                        <span className="font-medium">Solved On:</span><br />
                                        {formatDate(case_.solvedDate)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
