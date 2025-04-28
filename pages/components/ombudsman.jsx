import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import InOmbudsman from './caseStatus/inOmbudsman';

export default function Ombudsman() {
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCaseId, setSelectedCaseId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchField, setSearchField] = useState('name');
    const [filteredCases, setFilteredCases] = useState([]);

    useEffect(() => {
        async function fetchCases() {
            try {
                const q = query(
                    collection(db, 'users'),
                    where('ombudsman', '==', true),
                    where('rejected', '==', false),
                    where('solved', '==', false)
                );
                const querySnapshot = await getDocs(q);
                const casesData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setCases(casesData);
                setFilteredCases(casesData);
            } catch (err) {
                console.error('Error fetching cases:', err);
                setError('Failed to fetch cases');
            } finally {
                setLoading(false);
            }
        }

        fetchCases();
    }, []);

    useEffect(() => {
        if (!searchQuery) {
            setFilteredCases(cases);
            return;
        }

        const query = searchQuery.toLowerCase();
        const filtered = cases.filter(case_ => {
            switch (searchField) {
                case 'name':
                    return case_.name?.toLowerCase().includes(query);
                case 'email':
                    return case_.email?.toLowerCase().includes(query);
                case 'mobile':
                    return case_.mobile?.toString().includes(query);
                case 'all':
                    return (
                        case_.name?.toLowerCase().includes(query) ||
                        case_.email?.toLowerCase().includes(query) ||
                        case_.mobile?.toString().includes(query)
                    );
                default:
                    return true;
            }
        });

        setFilteredCases(filtered);
    }, [searchQuery, searchField, cases]);

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
                <InOmbudsman docId={selectedCaseId} onComplete={handleBackToCases} />
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
            <div className="mb-6">
                <h2 className="text-2xl font-bold mb-4">Ombudsman Cases</h2>
                
                {/* Search Section */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search cases..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        
                        <div className="sm:w-48">
                            <select
                                value={searchField}
                                onChange={(e) => setSearchField(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="all">All Fields</option>
                                <option value="name">Name</option>
                                <option value="email">Email</option>
                                <option value="mobile">Mobile</option>
                            </select>
                        </div>
                    </div>

                    <div className="text-sm text-gray-600">
                        Found {filteredCases.length} cases
                        {searchQuery && ` matching "${searchQuery}"`}
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredCases.map((case_) => (
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
                                            <span className="font-medium">Ombudsman Followup Date:</span><br />
                                            {formatDate(case_.ombudsmanCheckDate)}
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
