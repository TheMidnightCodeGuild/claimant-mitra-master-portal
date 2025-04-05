import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function ViewPartners() {
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editValues, setEditValues] = useState({});

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
            } catch (err) {
                console.error('Error fetching partners:', err);
                setError('Failed to fetch partners');
            } finally {
                setLoading(false);
            }
        }

        fetchPartners();
    }, []);

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
            <h2 className="text-2xl font-bold mb-6">Partners ({partners.length})</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {partners.map((partner) => (
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
                                <p className="text-gray-600">
                                    <span className="font-medium">Total Cases:</span>{' '}
                                    {partner.cases || 0}
                                </p>
                                <p className="text-gray-600">
                                    <span className="font-medium">Cases Referred:</span>{' '}
                                    {partner.casesReferred || 0}
                                </p>
                                <p className="text-gray-600">
                                    <span className="font-medium">Total Earnings:</span>{' '}
                                    ₹{partner.earning || 0}
                                </p>
                                <p className="text-gray-600">
                                    <span className="font-medium">Joined On:</span>{' '}
                                    {formatDate(partner.createdAt)}
                                </p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
