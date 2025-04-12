import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, where, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';

export default function ViewPartners() {
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editValues, setEditValues] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [searchField, setSearchField] = useState('name');
    const [filteredPartners, setFilteredPartners] = useState([]);
    const [passwordResetLoading, setPasswordResetLoading] = useState(false);
    const [partnerStats, setPartnerStats] = useState({});

    useEffect(() => {
        async function fetchPartners() {
            try {
                const partnersRef = collection(db, 'partners');
                const querySnapshot = await getDocs(partnersRef);
                const partnersData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setPartners(partnersData);
                setFilteredPartners(partnersData);
                
                // Fetch stats for each partner
                const statsPromises = partnersData.map(async partner => {
                    if (partner.partnerRef) {
                        const usersRef = collection(db, 'users');
                        const q = query(usersRef, where('partnerRef', '==', partner.partnerRef));
                        const querySnapshot = await getDocs(q);
                        
                        let totalCommission = 0;
                        querySnapshot.forEach((doc) => {
                            const userData = doc.data();
                            totalCommission += userData.partnerCommision || 0;
                        });
                        
                        return {
                            id: partner.id,
                            casesReferred: querySnapshot.size,
                            totalEarnings: totalCommission
                        };
                    }
                    return { id: partner.id, casesReferred: 0, totalEarnings: 0 };
                });
                
                const stats = await Promise.all(statsPromises);
                const statsMap = {};
                stats.forEach(stat => {
                    statsMap[stat.id] = stat;
                });
                
                setPartnerStats(statsMap);
            } catch (err) {
                console.error('Error fetching partners:', err);
                setError('Failed to fetch partners');
            } finally {
                setLoading(false);
            }
        }

        fetchPartners();
    }, []);

    useEffect(() => {
        if (!searchQuery) {
            setFilteredPartners(partners);
            return;
        }

        const query = searchQuery.toLowerCase();
        const filtered = partners.filter(partner => {
            switch (searchField) {
                case 'name':
                    return partner.name?.toLowerCase().includes(query);
                case 'email':
                    return partner.email?.toLowerCase().includes(query);
                case 'phone':
                    return partner.phoneNumber?.toString().includes(query);
                case 'source':
                    return partner.source?.toLowerCase().includes(query);
                case 'partnerRef':
                    return partner.partnerRef?.toLowerCase().includes(query);
                case 'all':
                    return (
                        partner.name?.toLowerCase().includes(query) ||
                        partner.email?.toLowerCase().includes(query) ||
                        partner.phoneNumber?.toString().includes(query) ||
                        partner.source?.toLowerCase().includes(query) ||
                        partner.partnerRef?.toLowerCase().includes(query)
                    );
                default:
                    return true;
            }
        });

        setFilteredPartners(filtered);
    }, [searchQuery, searchField, partners]);

    const handleEdit = (partner) => {
        setEditingId(partner.id);
        setEditValues(partner);
    };

    const handleSave = async (id) => {
        try {
            const partnerRef = doc(db, 'partners', id);
            await updateDoc(partnerRef, editValues);
            
            setPartners(partners.map(p => 
                p.id === id ? { ...p, ...editValues } : p
            ));
            setEditingId(null);
        } catch (err) {
            console.error('Error updating partner:', err);
            alert('Failed to update partner');
        }
    };

    const handleChange = (field, value) => {
        setEditValues(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handlePasswordReset = async (email) => {
        if (!email) {
            alert('Partner has no email address');
            return;
        }

        try {
            setPasswordResetLoading(true);
            const auth = getAuth();
            await sendPasswordResetEmail(auth, email);
            alert(`Password reset email sent to ${email}`);
        } catch (err) {
            console.error('Error sending password reset:', err);
            alert(`Failed to send password reset: ${err.message}`);
        } finally {
            setPasswordResetLoading(false);
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
            year: 'numeric'
        });
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h2 className="text-2xl font-bold mb-6">Partners ({filteredPartners.length})</h2>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search partners..."
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
                            <option value="phone">Phone</option>
                            <option value="source">Source</option>
                            <option value="partnerRef">Partner Ref</option>
                        </select>
                    </div>
                </div>

                <div className="text-sm text-gray-600">
                    Found {filteredPartners.length} partners
                    {searchQuery && ` matching "${searchQuery}"`}
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredPartners.map((partner) => (
                    <div key={partner.id} className="bg-white rounded-lg shadow-md p-6">
                        {editingId === partner.id ? (
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    value={editValues.name || ''}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                    className="w-full p-2 border rounded"
                                    placeholder="Name"
                                />
                                <input
                                    type="email"
                                    value={editValues.email || ''}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    className="w-full p-2 border rounded"
                                    placeholder="Email"
                                />
                                <input
                                    type="tel"
                                    value={editValues.phoneNumber || ''}
                                    onChange={(e) => handleChange('phoneNumber', e.target.value)}
                                    className="w-full p-2 border rounded"
                                    placeholder="Phone Number"
                                />
                                <input
                                    type="text"
                                    value={editValues.source || ''}
                                    onChange={(e) => handleChange('source', e.target.value)}
                                    className="w-full p-2 border rounded"
                                    placeholder="Source"
                                />
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => setEditingId(null)}
                                        className="px-4 py-2 bg-gray-200 rounded"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleSave(partner.id)}
                                        className="px-4 py-2 bg-blue-500 text-white rounded"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex justify-between items-start">
                                    <h3 className="font-semibold text-lg">
                                        Partner Ref: {partner.partnerRef || 'N/A'}
                                    </h3>
                                    <button
                                        onClick={() => handleEdit(partner)}
                                        className="text-blue-500 hover:text-blue-700"
                                    >
                                        Edit
                                    </button>
                                </div>
                                <p className="text-gray-600">
                                    <span className="font-medium">Name:</span>{' '}
                                    {partner.name || 'N/A'}
                                </p>
                                <p className="text-gray-600">
                                    <span className="font-medium">Email:</span>{' '}
                                    {partner.email || 'N/A'}
                                </p>
                                <p className="text-gray-600">
                                    <span className="font-medium">Phone:</span>{' '}
                                    {partner.phoneNumber || 'N/A'}
                                </p>
                                <p className="text-gray-600">
                                    <span className="font-medium">Source:</span>{' '}
                                    {partner.source || 'N/A'}
                                </p>
                                {/* <p className="text-gray-600">
                                    <span className="font-medium">Total Cases:</span>{' '}
                                    {partner.cases || 0}
                                </p> */}
                                <p className="text-gray-600">
                                    <span className="font-medium">Cases Referred:</span>{' '}
                                    {partnerStats[partner.id]?.casesReferred || 0}
                                </p>
                                <p className="text-gray-600">
                                    <span className="font-medium">Total Earnings:</span>{' '}
                                    ₹{partnerStats[partner.id]?.totalEarnings || 0}
                                </p>
                                <p className="text-gray-600">
                                    <span className="font-medium">Joined On:</span>{' '}
                                    {formatDate(partner.createdAt)}
                                </p>
                                <div className="mt-4 pt-2 border-t border-gray-200">
                                    <button
                                        onClick={() => handlePasswordReset(partner.email)}
                                        disabled={passwordResetLoading || !partner.email}
                                        className="w-full px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                    >
                                        {passwordResetLoading ? 'Sending...' : 'Change Password'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {filteredPartners.length === 0 && (
                <div className="text-center text-gray-500 mt-8">
                    {searchQuery ? 'No matching partners found' : 'No partners found'}
                </div>
            )}
        </div>
    );
}
