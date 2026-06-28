import { useState, useEffect, useCallback } from 'react';
import { fetchCollectionCached, fetchUsersPage } from '../../lib/collectionCache';
import FullCase from './caseStatus/updateCases';

function parseDateValue(value) {
    if (!value) return null;
    if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (typeof value === 'object' && typeof value.toDate === 'function') {
        return value.toDate();
    }
    return null;
}

function getCaseCreatedAt(case_) {
    return (
        parseDateValue(case_.createdAt) || parseDateValue(case_.complaintDate)
    );
}

function startOfDay(dateStr) {
    const d = new Date(`${dateStr}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
}

function endOfDay(dateStr) {
    const d = new Date(`${dateStr}T23:59:59.999`);
    return Number.isNaN(d.getTime()) ? null : d;
}

function matchesSearch(case_, searchQuery, searchField) {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
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
}

function matchesDateRange(case_, dateFrom, dateTo) {
    if (!dateFrom && !dateTo) return true;

    const created = getCaseCreatedAt(case_);
    if (!created) return false;

    if (dateFrom) {
        const from = startOfDay(dateFrom);
        if (from && created < from) return false;
    }

    if (dateTo) {
        const to = endOfDay(dateTo);
        if (to && created > to) return false;
    }

    return true;
}

function filterCases(cases, { searchQuery, searchField, dateFrom, dateTo }) {
    const filtered = cases.filter(
        (case_) =>
            matchesSearch(case_, searchQuery, searchField) &&
            matchesDateRange(case_, dateFrom, dateTo)
    );

    return [...filtered].sort((a, b) => {
        const da = getCaseCreatedAt(a);
        const db = getCaseCreatedAt(b);
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return db.getTime() - da.getTime();
    });
}

function formatDateFilterSummary(dateFrom, dateTo) {
    if (dateFrom && dateTo) return ` (created ${dateFrom} to ${dateTo})`;
    if (dateFrom) return ` (created from ${dateFrom})`;
    if (dateTo) return ` (created to ${dateTo})`;
    return '';
}

export default function ViewAllCases() {
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [selectedCaseId, setSelectedCaseId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchField, setSearchField] = useState('name');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [filteredCases, setFilteredCases] = useState([]);
    const [hasMore, setHasMore] = useState(false);
    const [lastPageId, setLastPageId] = useState(null);
    const [useFullList, setUseFullList] = useState(false);

    const hasActiveFilters = Boolean(searchQuery || dateFrom || dateTo);

    const loadPagedCases = useCallback(async (startAfterId = null, append = false) => {
        if (append) setLoadingMore(true);
        else setLoading(true);
        setError(null);
        try {
            const result = await fetchUsersPage({
                startAfterId,
                forceRefresh: false,
            });
            setCases((prev) => (append ? [...prev, ...result.data] : result.data));
            setHasMore(Boolean(result.hasMore));
            setLastPageId(result.lastId);
            setUseFullList(false);
        } catch (err) {
            console.error('Error fetching cases page:', err);
            setError('Failed to fetch cases');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    const loadFullCases = useCallback(async (forceRefresh = false) => {
        setLoading(true);
        setError(null);
        try {
            const casesData = await fetchCollectionCached('users', { forceRefresh });
            setCases(casesData);
            setHasMore(false);
            setLastPageId(null);
            setUseFullList(true);
        } catch (err) {
            console.error('Error fetching cases:', err);
            setError('Failed to fetch cases');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (hasActiveFilters) {
            loadFullCases();
        } else {
            loadPagedCases();
        }
    }, [hasActiveFilters, loadFullCases, loadPagedCases]);

    useEffect(() => {
        setFilteredCases(
            filterCases(cases, { searchQuery, searchField, dateFrom, dateTo })
        );
    }, [cases, searchQuery, searchField, dateFrom, dateTo]);

    const dateRangeInvalid =
        dateFrom &&
        dateTo &&
        startOfDay(dateFrom) &&
        startOfDay(dateTo) &&
        startOfDay(dateFrom) > startOfDay(dateTo);

    const handleCaseClick = (caseId) => {
        setSelectedCaseId(caseId);
    };

    const clearDates = () => {
        setDateFrom('');
        setDateTo('');
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

    const displayCases = dateRangeInvalid ? [] : filteredCases;
    const showLoadMore = !hasActiveFilters && !useFullList && hasMore && !dateRangeInvalid;

    const handleRefresh = () => {
        if (hasActiveFilters) loadFullCases(true);
        else loadPagedCases(null, false);
    };

    const handleLoadMore = () => {
        if (lastPageId) loadPagedCases(lastPageId, true);
    };

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
                        onClick={handleRefresh}
                        disabled={loading}
                        className="ui-btn-secondary text-sm"
                    >
                        Refresh
                    </button>
                    <span className="ui-stat-pill justify-center">
                        {useFullList || hasActiveFilters
                            ? `${filteredCases.length} shown`
                            : `${cases.length}${hasMore ? '+' : ''} loaded`}
                    </span>
                </div>
            </div>

            <div className="mb-6">
                <div className="ui-search-panel space-y-4">
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

                    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 sm:items-end">
                        <div className="flex-1 sm:max-w-[200px]">
                            <label htmlFor="dateFrom" className="ui-label">
                                Created from
                            </label>
                            <input
                                id="dateFrom"
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="ui-input mt-1"
                            />
                        </div>
                        <div className="flex-1 sm:max-w-[200px]">
                            <label htmlFor="dateTo" className="ui-label">
                                Created to
                            </label>
                            <input
                                id="dateTo"
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="ui-input mt-1"
                            />
                        </div>
                        {(dateFrom || dateTo) && (
                            <button
                                type="button"
                                onClick={clearDates}
                                className="ui-btn-secondary text-sm sm:mb-0.5"
                            >
                                Clear dates
                            </button>
                        )}
                    </div>

                    {dateRangeInvalid && (
                        <p className="text-sm text-amber-700" role="alert">
                            &quot;Created from&quot; must be on or before &quot;Created to&quot;.
                        </p>
                    )}

                    <div className="text-sm text-slate-600">
                        Found {displayCases.length} cases
                        {searchQuery && ` matching "${searchQuery}"`}
                        {!dateRangeInvalid && formatDateFilterSummary(dateFrom, dateTo)}
                    </div>
                </div>
            </div>

            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {displayCases.map((case_) => (
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
                                    {(() => {
                                        const d = getCaseCreatedAt(case_);
                                        return d
                                            ? d.toLocaleString(undefined, {
                                                  dateStyle: 'medium',
                                                  timeStyle: 'short',
                                              })
                                            : '—';
                                    })()}
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

            {showLoadMore && (
                <div className="mt-8 flex justify-center">
                    <button
                        type="button"
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="ui-btn-secondary"
                    >
                        {loadingMore ? 'Loading…' : 'Load more cases'}
                    </button>
                </div>
            )}

            {displayCases.length === 0 && (
                <div className="ui-empty-state py-8">
                    <p className="text-slate-500">
                        {hasActiveFilters
                            ? 'No cases found matching your search or date filters'
                            : 'No cases found matching your search criteria'}
                    </p>
                </div>
            )}
        </div>
    );
}
