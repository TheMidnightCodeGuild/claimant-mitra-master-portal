import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function ViewAllCases() {
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchAllCases() {
            try {
                const usersRef = collection(db, 'users');
                const querySnapshot = await getDocs(usersRef);
                const casesData = [];

                querySnapshot.forEach((doc) => {
                    casesData.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });

                // Sort cases by complaintDate in descending order (newest first)
                casesData.sort((a, b) => {
                    return new Date(b.complaintDate) - new Date(a.complaintDate);
                });

                setCases(casesData);
            } catch (err) {
                console.error('Error fetching cases:', err);
                setError('Failed to fetch cases: ' + err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchAllCases();
    }, []);

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

    if (cases.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-500">No cases found</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h2 className="text-2xl font-bold mb-6">All Cases ({cases.length})</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {cases.map((case_) => (
                    <div 
                        key={case_.id} 
                        className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
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
                            <p className="text-gray-600">
                                <span className="font-medium">Case ID:</span> {case_.id}
                            </p>
                            {case_.policyNumber && (
                                <p className="text-gray-600">
                                    <span className="font-medium">Policy:</span> {case_.policyNumber}
                                </p>
                            )}
                            {case_.status && (
                                <p className="text-gray-600">
                                    <span className="font-medium">Status:</span> {case_.status}
                                </p>
                            )}
                            {case_.phoneNumber && (
                                <p className="text-gray-600">
                                    <span className="font-medium">Contact:</span> {case_.phoneNumber}
                                </p>
                            )}
                            {case_.email && (
                                <p className="text-gray-600">
                                    <span className="font-medium">Email:</span> {case_.email}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
