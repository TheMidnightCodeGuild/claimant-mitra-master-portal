import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import SendToOmbudsman from './caseStatus/sendToOmbudsman';
import SendFromReimbursement from './caseStatus/sendFromReimbursement';

export default function Reimbursement() {
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
                    where('inReimbursement', '==', true),
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
                <div className="ui-spinner" />
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
                    className="mb-4 px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                >
                    ← Back to Reimbursement Cases
                </button>
                <SendFromReimbursement docId={selectedCaseId} onComplete={handleBackToCases} />
            </div>
        );
    }

    if (cases.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-slate-500">
                    <p>No Reimbursement cases found</p>
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
        <div className="ui-content-max">
            <div className="ui-page-intro mb-6">
                <p className="ui-section-eyebrow">Finance</p>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Reimbursement Cases</h2>
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

                    <div className="text-sm text-slate-600">
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
                        <div className="space-y-3">
                            <div className="flex justify-between items-start">
                                <h3 className="font-semibold text-lg">
                                    {case_.name || 'No Name'}
                                </h3>
                                <span className="text-sm text-slate-500">
                                    Ref: {case_.partnerRef || 'N/A'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <p className="text-slate-600">
                                        <span className="font-medium">Mobile:</span><br />
                                        {case_.mobile || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-600">
                                        <span className="font-medium">Claim Amount:</span><br />
                                        ₹{case_.estimatedClaimAmount || 'N/A'}
                                    </p>
                                </div>
                            </div>

                            <div className="border-t pt-2 mt-2">
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <p className="text-slate-600">
                                            <span className="font-medium">Acceptance:</span><br />
                                            {formatDate(case_.caseAcceptanceDate)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                           
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
