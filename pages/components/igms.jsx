import { useState, useEffect } from 'react';
import { fetchCollectionCached } from '../../lib/collectionCache';
import { filterCasesByKey } from '../../lib/caseFilters';
import SendToOmbudsman from './caseStatus/sendToOmbudsman';
import usePartnerRefNameMap from '../../lib/usePartnerRefNameMap';
import { resolvePartnerDisplayName } from '../../lib/partnerLookup';

export default function IGMS() {
    const { partnerMap } = usePartnerRefNameMap();
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
                const allCases = await fetchCollectionCached('users');
                const casesData = filterCasesByKey(allCases, 'igms');
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
                    type="button"
                    className="ui-btn-secondary mb-4"
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
                <div className="text-slate-500">
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
    const calculateDaysElapsed = (dateString) => {
        if (!dateString) return null;
        const days = Math.floor((new Date() - new Date(dateString)) / (1000 * 60 * 60 * 24));
        return days;
    };

    return (
        <div className="ui-content-max">
            <div className="ui-page-intro flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="ui-section-eyebrow">Pipeline</p>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">IGMS Cases</h2>
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
                                    Partner: {resolvePartnerDisplayName(case_.partnerRef, partnerMap)}
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

                            <div className="ui-divider-accent pt-2 mt-2">
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <p className="text-slate-600">
                                            <span className="font-medium">Acceptance:</span><br />
                                            {formatDate(case_.caseAcceptanceDate)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-slate-600">
                                            <span className="font-medium">Follow-up:</span><br />
                                            {formatDate(case_.igmsFollowUpDate)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {case_.igmsFollowUpDate && new Date(case_.igmsFollowUpDate) <= new Date() && (
                                <div className="mt-2">
                                    <span className="ui-badge-amber">Follow-up required</span>
                                </div>
                            )}

                            {case_.igmsDate && (
                                <div className="mt-2">
                                    <span className="ui-badge-cyan">Days in IGMS: {calculateDaysElapsed(case_.igmsDate)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
