import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import SendToIGMS from './caseStatus/sendToIGMS';

export default function CasesUnderReview() {
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
                    where('takenForReview', '==', true),
                    where('igms', '==', false),
                    where('inReimbursement', '==', false),
                    where('rejected', '==', false),
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

    const calculateDaysElapsed = (dateString) => {
        if (!dateString) return null;
        const days = Math.floor((new Date() - new Date(dateString)) / (1000 * 60 * 60 * 24));
        return days;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="ui-spinner"></div>
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
                    type="button"
                    onClick={handleBackToCases}
                    className="ui-btn-secondary mb-4"
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
        <div className="ui-content-max">
            <div className="ui-page-intro mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="ui-section-eyebrow">Review queue</p>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Cases Under Review</h2>
                </div>
            </div>

            <div className="mb-6">
                {/* Search Section */}
                <div className="ui-search-panel">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search cases..."
                                className="ui-input"
                            />
                        </div>
                        
                        <div className="sm:w-48">
                            <select
                                value={searchField}
                                onChange={(e) => setSearchField(e.target.value)}
                                className="ui-input sm:w-48"
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
                        className="ui-list-card"
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
                            {typeof case_.claimScore === 'number' && !Number.isNaN(case_.claimScore) && (
                                <p className="text-gray-600">
                                    <span className="font-medium">Claim score:</span>{' '}
                                    {case_.claimScore}%
                                </p>
                            )}
                            {case_.reviewDate && (
                                <div className="mt-2 bg-blue-50 p-2 rounded-md text-sm text-blue-700">
                                    Days in Review: {calculateDaysElapsed(case_.reviewDate)}
                                </div>
                            )}
                            <div className="mt-2">
                                <span className="font-medium text-gray-700">Video Verification:</span>{" "}
                                <span
                                    className={`text-sm font-semibold ${
                                        (case_.VideoVerification || 'Verification Pending') === 'Completed'
                                            ? 'text-green-700'
                                            : 'text-amber-700'
                                    }`}
                                >
                                    {case_.VideoVerification || 'Verification Pending'}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
