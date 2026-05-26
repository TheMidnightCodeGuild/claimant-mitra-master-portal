import { useState, useEffect, useCallback } from 'react';
import { fetchCollectionCached } from '../../lib/collectionCache';
import FullCase from './caseStatus/updateCases';

export default function ViewAllCases() {
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCaseId, setSelectedCaseId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchField, setSearchField] = useState('name');
    const [filteredCases, setFilteredCases] = useState([]);

    const loadCases = useCallback(async (forceRefresh = false) => {
        setLoading(true);
        setError(null);
        try {
            const casesData = await fetchCollectionCached('users', { forceRefresh });
            setCases(casesData);
            setFilteredCases(casesData);
        } catch (err) {
            console.error('Error fetching cases:', err);
            setError('Failed to fetch cases');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCases();
    }, [loadCases]);

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
                <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-4 border-indigo-600"></div>
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
                    <p className="text-lg sm:text-xl font-semibold text-slate-700 mb-2">No Cases Found</p>
                    <p className="text-sm sm:text-base text-slate-500">There are currently no cases in the system.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full lg:max-w-[1300px] mx-auto px-3 sm:px-0 py-4 sm:py-0">
            <div className="ui-page-intro mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="ui-section-eyebrow">Registry</p>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-center sm:text-left">All Cases</h2>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
                    <button
                        type="button"
                        onClick={() => loadCases(true)}
                        disabled={loading}
                        className="ui-btn-secondary text-sm"
                    >
                        Refresh
                    </button>
                    <span className="ui-stat-pill justify-center">
                        {cases.length} {cases.length === 1 ? 'Case' : 'Cases'}
                    </span>
                </div>
            </div>

            <div className="mb-6">
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

            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {filteredCases.map((case_) => (
                    <div 
                        key={case_.id}
                        className="ui-list-card"
                        onClick={() => handleCaseClick(case_.id)}
                    >
                        <div className="space-y-2 sm:space-y-3">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0">
                                <h3 className="font-semibold text-lg sm:text-xl text-slate-800 break-words">
                                    {case_.name || 'Unnamed Case'}
                                </h3>
                                <span className="text-xs sm:text-sm text-slate-500 whitespace-nowrap">
                                    {new Date(case_.complaintDate).toLocaleString(undefined, {
                                        dateStyle: 'medium',
                                        timeStyle: 'short'
                                    })}
                                </span>
                            </div>

                            <p className="text-slate-700 flex items-center gap-2 text-sm sm:text-base">
                                <span className="font-medium">Case ID:</span>
                                <span className="break-all">{case_.id}</span>
                            </p>

                            {case_.policyNumber && (
                                <p className="text-slate-700 flex items-center gap-2 text-sm sm:text-base">
                                    <span className="font-medium">Policy:</span>
                                    <span className="break-all">{case_.policyNumber}</span>
                                </p>
                            )}

                            {case_.status && (
                                <p className="text-slate-700 flex items-center gap-2 text-sm sm:text-base">
                                    <span className="font-medium">Status:</span>
                                    <span>{case_.status}</span>
                                </p>
                            )}

                            {case_.mobile && (
                                <p className="text-slate-700 flex items-center gap-2 text-sm sm:text-base">
                                    <span className="font-medium">Contact:</span>
                                    <span>{case_.mobile}</span>
                                </p>
                            )}

                            {case_.email && (
                                <p className="text-slate-700 flex items-center gap-2 text-sm sm:text-base">
                                    <span className="font-medium">Email:</span>
                                    <span className="break-all">{case_.email}</span>
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {filteredCases.length === 0 && (
                <div className="ui-empty-state py-8">
                    <p className="text-slate-500">No cases found matching your search criteria</p>
                </div>
            )}
        </div>
    );
}
