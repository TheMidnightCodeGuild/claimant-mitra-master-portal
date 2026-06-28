import { useState, useEffect, useCallback } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  fetchCollectionCached,
  invalidateCollection,
} from '../../lib/collectionCache';

export default function ViewPartnerIssues() {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingId, setEditingId] = useState(null);

    const loadIssues = useCallback(async (forceRefresh = false) => {
        setLoading(true);
        setError(null);
        try {
            const issuesData = await fetchCollectionCached('issues', { forceRefresh });
            setIssues(issuesData);
        } catch (err) {
            console.error('Error fetching issues:', err);
            setError('Failed to fetch issues');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadIssues();
    }, [loadIssues]);

    const handleStatusUpdate = async (id, newStatus) => {
        try {
            const issueRef = doc(db, 'issues', id);
            await updateDoc(issueRef, {
                status: newStatus
            });
            invalidateCollection('issues');
            
            setIssues(issues.map(issue =>
                issue.id === id ? { ...issue, status: newStatus } : issue
            ));
            setEditingId(null);
        } catch (err) {
            console.error('Error updating status:', err);
            alert('Failed to update status');
        }
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
            <div className="min-h-screen flex items-center justify-center text-red-600">
                {error}
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

    return (
        <div className="ui-content-max">
            <div className="ui-page-intro mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="ui-section-eyebrow">Support</p>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Partner Issues</h2>
                </div>
                <span className="ui-stat-pill">
                    {issues.length} {issues.length === 1 ? 'issue' : 'issues'}
                </span>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {issues.map((issue) => (
                    <div key={issue.id} className="ui-list-card-muted">
                        <div className="space-y-3">
                            <p className="text-slate-600">
                                <span className="font-medium">Date:</span>{' '}
                                {formatDate(issue.date)}
                            </p>
                            <p className="text-slate-600">
                                <span className="font-medium">Partner Ref:</span>{' '}
                                {issue.partnerRef || 'N/A'}
                            </p>
                            <p className="text-slate-600">
                                <span className="font-medium">Message:</span>{' '}
                                {issue.message || 'N/A'}
                            </p>
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-slate-600">Status:</span>
                                {editingId === issue.id ? (
                                    <select 
                                        value={issue.status || ''}
                                        onChange={(e) => handleStatusUpdate(issue.id, e.target.value)}
                                        className="ui-input ml-2 min-w-[9rem]"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="in-progress">In Progress</option>
                                        <option value="resolved">Resolved</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <span className={
                                            issue.status === 'resolved' ? 'ui-badge-emerald' :
                                            issue.status === 'rejected' ? 'ui-badge-rose' :
                                            issue.status === 'in-progress' ? 'ui-badge-amber' :
                                            'ui-badge-indigo'
                                        }>
                                            {issue.status || 'pending'}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setEditingId(issue.id)}
                                            className="ui-btn-secondary text-xs py-1.5"
                                        >
                                            Edit
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
