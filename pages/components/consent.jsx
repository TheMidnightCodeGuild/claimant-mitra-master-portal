import { useState } from 'react';

export async function sendConsent(email, name, docId, address, policyHolder, policyNo, claimNo, complaintDate, companyName, estimatedClaimAmount) {
    try {
        const response = await fetch('/api/generateConsent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                recipientEmail: email,
                documentData: {
                    name,
                    docId,
                    address,
                    policyHolder,
                    policyNo,
                    claimNo,
                    complaintDate,
                    companyName,
                    estimatedClaimAmount
                }
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to generate consent');
        }

        return { success: true };
    } catch (err) {
        throw new Error(err.message);
    }
}

export default function Consent() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        recipientEmail: '',
        name: '',
        address: '',
        policyHolder: '',
        policyNo: '',
        claimNo: '',
        complaintDate: '',
        companyName: '',
        estimatedClaimAmount: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            await sendConsent(
                formData.recipientEmail,
                formData.name,
                formData.address,
                formData.policyHolder,
                formData.policyNo,
                formData.claimNo,
                formData.complaintDate,
                formData.companyName,
                formData.estimatedClaimAmount
            );

            setSuccess(true);
            setFormData({
                recipientEmail: '',
                name: '',
                address: '',
                policyHolder: '',
                policyNo: '',
                claimNo: '',
                complaintDate: '',
                companyName: '',
                estimatedClaimAmount: ''
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h2 className="text-2xl font-bold mb-6">Generate Document</h2>
            
            {error && (
                <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
                    {error}
                </div>
            )}
            
            {success && (
                <div className="mb-4 p-4 bg-green-100 text-green-700 rounded">
                    Document generated and sent successfully!
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Recipient Email
                    </label>
                    <input
                        type="email"
                        value={formData.recipientEmail}
                        onChange={(e) => setFormData(prev => ({
                            ...prev,
                            recipientEmail: e.target.value
                        }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Name
                    </label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({
                            ...prev,
                            name: e.target.value
                        }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Address
                    </label>
                    <textarea
                        value={formData.address}
                        onChange={(e) => setFormData(prev => ({
                            ...prev,
                            address: e.target.value
                        }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        rows={3}
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Policy Holder
                    </label>
                    <input
                        type="text"
                        value={formData.policyHolder}
                        onChange={(e) => setFormData(prev => ({
                            ...prev,
                            policyHolder: e.target.value
                        }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Policy Number
                    </label>
                    <input
                        type="text"
                        value={formData.policyNo}
                        onChange={(e) => setFormData(prev => ({
                            ...prev,
                            policyNo: e.target.value
                        }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Claim Number
                    </label>
                    <input
                        type="text"
                        value={formData.claimNo}
                        onChange={(e) => setFormData(prev => ({
                            ...prev,
                            claimNo: e.target.value
                        }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Complaint Date
                    </label>
                    <input
                        type="date"
                        value={formData.complaintDate}
                        onChange={(e) => setFormData(prev => ({
                            ...prev,
                            complaintDate: e.target.value
                        }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Company Name
                    </label>
                    <input
                        type="text"
                        value={formData.companyName}
                        onChange={(e) => setFormData(prev => ({
                            ...prev,
                            companyName: e.target.value
                        }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Estimated Claim Amount
                    </label>
                    <input
                        type="number"
                        value={formData.estimatedClaimAmount}
                        onChange={(e) => setFormData(prev => ({
                            ...prev,
                            estimatedClaimAmount: e.target.value
                        }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                        loading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                >
                    {loading ? 'Generating...' : 'Generate Document'}
                </button>
            </form>
        </div>
    );
}
