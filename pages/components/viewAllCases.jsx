import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import FullCase from './caseStatus/updateCases';

export default function ViewAllCases() {
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
                const querySnapshot = await getDocs(collection(db, 'users'));
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

    if (selectedCaseId) {
        return <FullCase docId={selectedCaseId} />;
    }

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

    if (cases.length === 0) {
        return (
            <div className="min-h-[50vh] sm:min-h-screen flex items-center justify-center p-4">
                <div className="text-center">
                    <p className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">No Cases Found</p>
                    <p className="text-sm sm:text-base text-gray-500">There are currently no cases in the system.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full lg:max-w-[1300px] mx-auto px-3 sm:px-0 py-4 sm:py-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-8 mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 uppercase underline text-center sm:text-left">All Cases</h2>
                <span className="bg-blue-100 text-blue-800 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-medium text-sm sm:text-base text-center">
                    {cases.length} {cases.length === 1 ? 'Case' : 'Cases'}
                </span>
            </div>

            <div className="mb-6">
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

            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {filteredCases.map((case_) => (
                    <div 
                        key={case_.id}
                        className="bg-white rounded-lg sm:rounded-xl shadow-sm hover:shadow-md p-4 sm:p-6 border border-gray-800 transition-all duration-200 cursor-pointer"
                        onClick={() => handleCaseClick(case_.id)}
                    >
                        <div className="space-y-2 sm:space-y-3">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0">
                                <h3 className="font-semibold text-lg sm:text-xl text-gray-800 break-words">
                                    {case_.name || 'Unnamed Case'}
                                </h3>
                                <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                                    {new Date(case_.complaintDate).toLocaleString(undefined, {
                                        dateStyle: 'medium',
                                        timeStyle: 'short'
                                    })}
                                </span>
                            </div>

                            <p className="text-gray-700 flex items-center gap-2 text-sm sm:text-base">
                                <span className="font-medium">Case ID:</span>
                                <span className="break-all">{case_.id}</span>
                            </p>

                            {case_.policyNumber && (
                                <p className="text-gray-700 flex items-center gap-2 text-sm sm:text-base">
                                    <span className="font-medium">Policy:</span>
                                    <span className="break-all">{case_.policyNumber}</span>
                                </p>
                            )}

                            {case_.status && (
                                <p className="text-gray-700 flex items-center gap-2 text-sm sm:text-base">
                                    <span className="font-medium">Status:</span>
                                    <span>{case_.status}</span>
                                </p>
                            )}

                            {case_.mobile && (
                                <p className="text-gray-700 flex items-center gap-2 text-sm sm:text-base">
                                    <span className="font-medium">Contact:</span>
                                    <span>{case_.mobile}</span>
                                </p>
                            )}

                            {case_.email && (
                                <p className="text-gray-700 flex items-center gap-2 text-sm sm:text-base">
                                    <span className="font-medium">Email:</span>
                                    <span className="break-all">{case_.email}</span>
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {filteredCases.length === 0 && (
                <div className="text-center py-8">
                    <p className="text-gray-500">No cases found matching your search criteria</p>
                </div>
            )}
        </div>
    );
}
