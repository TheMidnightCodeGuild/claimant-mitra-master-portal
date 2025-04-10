import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function CreateCase() {
    const initialFormState = {
        // Basic Information
        name: '',
        mobile: '',
        email: '',
        address: '',
        policyHolder: '',
        companyName: '',
        claimNo: '',
        policyNo: '',
        estimatedClaimAmount: '',
        complaintDate: '',
        partnerRef: '',

        // Case Status
        takenForReview: false,
        status: '',
        documentShort: false,
        rejected: false,
        solved: false,

        // Case Dates & Details
        reviewDate: '',
        caseRejectionDate: '',
        caseAcceptanceDate: '',
        caseRejectionReason: '',
        solvedDate: '',
        claim: '',
        commisionReceived: '',
        partnerCommision: '',

        // IGMS Details
        igms: false,
        igmsDate: '',
        igmsFollowUpDate: '',
        igmsRejectionReason: '',

        // Ombudsman Details
        ombudsman: false,
        ombudsmanDate: '',
        ombudsmanCourierDate: '',
        ombudsmanFollowUpDate: '',
        ombudsmanComplaintNumber: '',
        sixAFormSubmitted: false,
        ombudsmanMode: '',
        ombudsmanRejectionReason: ''
    };

    const [formData, setFormData] = useState(initialFormState);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? e.target.checked : value
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
                estimatedClaimAmount: Number(formData.estimatedClaimAmount) || 0,
                mobile: Number(formData.mobile) || 0,
                complaintDate: new Date(formData.complaintDate),
                mainLogs: [],
                internalLogs: [],
                igmsLogs: [],
                ombudsmanLogs: [],
                createdAt: new Date()
            };

            await addDoc(collection(db, 'users'), caseData);
            setSuccess(true);
            setFormData(initialFormState);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            setError('Failed to create case: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const renderField = (field) => {
        const label = field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1');
        const isBoolean = typeof formData[field] === 'boolean';
        const isDate = field.includes('Date');
        const isNumber = field.includes('Amount') || field.includes('mobile');

        return (
            <div key={field} className="flex flex-col space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                    {label}
                    {field === 'mobile' && <span className="text-xs text-gray-500 ml-2">(10 digits)</span>}
                    {isNumber && field !== 'mobile' && <span className="text-xs text-gray-500 ml-2">(in Rs.)</span>}
                </label>
                {isBoolean ? (
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            name={field}
                            checked={formData[field]}
                            onChange={(e) => setFormData(prev => ({...prev, [field]: e.target.checked}))}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600">Yes</span>
                    </div>
                ) : (
                    <input
                        type={isDate ? 'date' : isNumber ? 'number' : 'text'}
                        name={field}
                        value={formData[field]}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                        placeholder={`Enter ${label.toLowerCase()}`}
                        min={isDate ? "2000-01-01" : undefined}
                        max={isDate ? "2100-12-31" : undefined}
                        pattern={field === 'mobile' ? "[0-9]{10}" : undefined}
                    />
                )}
            </div>
        );
    };

    const fieldGroups = {
        'Basic Information': ['name', 'mobile', 'email', 'address', 'policyHolder', 'companyName', 'claimNo', 'policyNo', 'estimatedClaimAmount', 'complaintDate', 'partnerRef'],
        'Case Status': ['takenForReview', 'status', 'documentShort', 'rejected', 'solved'],
        'Case Details': ['reviewDate', 'caseRejectionDate', 'caseAcceptanceDate', 'caseRejectionReason', 'solvedDate', 'claim', 'commisionReceived', 'partnerCommision'],
        'IGMS Details': ['igms', 'igmsDate', 'igmsFollowUpDate', 'igmsRejectionReason'],
        'Ombudsman Details': ['ombudsman', 'ombudsmanDate', 'ombudsmanCourierDate', 'ombudsmanFollowUpDate', 'ombudsmanComplaintNumber', 'sixAFormSubmitted', 'ombudsmanMode', 'ombudsmanRejectionReason']
    };

    return (
        <div className="lg:max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="flex items-center justify-between mb-8 border-b pb-4 border-gray-200">
                <h2 className="text-3xl font-bold text-gray-800">Create New Case</h2>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2 transition-colors"
                >
                    <span>←</span>
                    <span>Back to Dashboard</span>
                </button>
            </div>
            
            {error && (
                <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md border border-red-200 animate-fade-in">
                    {error}
                </div>
            )}
            
            {success && (
                <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-md border border-green-200 animate-fade-in">
                    Case created successfully! You can create another case below.
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                {Object.entries(fieldGroups).map(([groupName, fields]) => (
                    <div key={groupName} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h3 className="text-xl font-semibold mb-6 text-gray-700">{groupName}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {fields.map(renderField)}
                        </div>
                    </div>
                ))}

                <div className="flex justify-end pt-6">
                    <button
                        type="button"
                        onClick={() => setFormData(initialFormState)}
                        className="px-6 py-3 mr-4 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition duration-200 ease-in-out shadow-sm"
                    >
                        Reset Form
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 transition duration-200 ease-in-out shadow-md flex items-center"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Creating Case...
                            </>
                        ) : 'Create Case'}
                    </button>
                </div>
            </form>
        </div>
    );
}
