import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function CreateCase() {
    const [formData, setFormData] = useState({
        name: '',
        estimatedClaimAmount: '',
        partnerRef: '',
        mobile: '',
        email: '',
        complaintDate: '',
        companyName: '',
        claimNo: '',
        policyNo: '',
        takenForReview: false,
        status: '',
        documentShort: false,
        caseRejectionReason: '',
        caseRejectionDate: '',
        caseAcceptanceDate: '',
        rejected: false,
        igms: false,
        igmsDate: '',
        igmsFollowUpDate: '',
        igmsRejectionReason: '',
        ombudsman: false,
        ombudsmanDate: '',
        ombudsmanCourierDate: '',
        ombudsmanFollowUpDate: '',
        ombudsmanComplaintNumber: '',
        sixAFormSubmitted: false,
        ombudsmanMode: '',
        ombudsmanRejectionReason: '',
        solved: false,
        solvedDate: '',
        claim: '',
        commisionReceived: '',
        partnerCommision: '',
        reviewDate: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const caseData = {
                ...formData,
                estimatedClaimAmount: Number(formData.estimatedClaimAmount),
                mobile: Number(formData.mobile),
                complaintDate: new Date(formData.complaintDate),
                mainLogs: [],
                internalLogs: [],
                igmsLogs: [],
                ombudsmanLogs: [],
                createdAt: new Date()
            };

            await addDoc(collection(db, 'users'), caseData);
            setSuccess(true);
            setFormData({
                name: '',
                estimatedClaimAmount: '',
                partnerRef: '',
                mobile: '',
                email: '',
                complaintDate: '',
                companyName: '',
                claimNo: '',
                policyNo: '',
                takenForReview: false,
                status: '',
                documentShort: false,
                caseRejectionReason: '',
                caseRejectionDate: '',
                caseAcceptanceDate: '',
                rejected: false,
                igms: false,
                igmsDate: '',
                igmsFollowUpDate: '',
                igmsRejectionReason: '',
                ombudsman: false,
                ombudsmanDate: '',
                ombudsmanCourierDate: '',
                ombudsmanFollowUpDate: '',
                ombudsmanComplaintNumber: '',
                sixAFormSubmitted: false,
                ombudsmanMode: '',
                ombudsmanRejectionReason: '',
                solved: false,
                solvedDate: '',
                claim: '',
                commisionReceived: '',
                partnerCommision: '',
                reviewDate: ''
            });
        } catch (err) {
            setError('Failed to create case: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h2 className="text-2xl font-bold mb-6">Create New Case</h2>
            
            {error && (
                <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
                    {error}
                </div>
            )}
            
            {success && (
                <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-md">
                    Case created successfully!
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.keys(formData).map(field => (
                        <div key={field}>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}
                            </label>
                            {typeof formData[field] === 'boolean' ? (
                                <select
                                    name={field}
                                    value={formData[field]}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                >
                                    <option value={false}>No</option>
                                    <option value={true}>Yes</option>
                                </select>
                            ) : (
                                <input
                                    type={field.includes('Date') ? 'date' : field.includes('Amount') || field.includes('mobile') ? 'number' : 'text'}
                                    name={field}
                                    value={formData[field]}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                    >
                        {loading ? 'Creating...' : 'Create Case'}
                    </button>
                </div>
            </form>
        </div>
    );
}
