import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function ViewPartnerIssues() {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        async function fetchIssues() {
            try {
                const issuesRef = collection(db, 'issues');
                const querySnapshot = await getDocs(issuesRef);
                const issuesData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setIssues(issuesData);
            } catch (err) {
                console.error('Error fetching issues:', err);
                setError('Failed to fetch issues');
            } finally {
                setLoading(false);
            }
        }

        fetchIssues();
    }, []);

    const handleStatusUpdate = async (id, newStatus) => {
        try {
            const issueRef = doc(db, 'issues', id);
            await updateDoc(issueRef, {
                status: newStatus
            });
            
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
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
        <div className="container mx-auto px-4 py-8">
            <h2 className="text-2xl font-bold mb-6">Partner Issues ({issues.length})</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {issues.map((issue) => (
                    <div key={issue.id} className="bg-white rounded-lg shadow-md p-6">
                        <div className="space-y-3">
                            <p className="text-gray-600">
                                <span className="font-medium">Date:</span>{' '}
                                {formatDate(issue.date)}
                            </p>
                            <p className="text-gray-600">
                                <span className="font-medium">Partner Ref:</span>{' '}
                                {issue.partnerRef || 'N/A'}
                            </p>
                            <p className="text-gray-600">
                                <span className="font-medium">Message:</span>{' '}
                                {issue.message || 'N/A'}
                            </p>
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-600">Status:</span>
                                {editingId === issue.id ? (
                                    <select 
                                        value={issue.status || ''}
                                        onChange={(e) => handleStatusUpdate(issue.id, e.target.value)}
                                        className="ml-2 p-2 border rounded"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="in-progress">In Progress</option>
                                        <option value="resolved">Resolved</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 rounded text-sm ${
                                            issue.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                            issue.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                            issue.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {issue.status || 'pending'}
                                        </span>
                                        <button
                                            onClick={() => setEditingId(issue.id)}
                                            className="text-blue-500 hover:text-blue-700"
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
