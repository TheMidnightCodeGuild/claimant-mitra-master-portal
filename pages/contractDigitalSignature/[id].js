import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import SignatureCanvas from 'react-signature-canvas';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, storage } from '../../lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

export default function DigitalSignature() {
    const router = useRouter();
    const { id } = router.query;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [caseData, setCaseData] = useState(null);
    const [signatureType, setSignatureType] = useState('draw'); // 'draw' or 'type'
    const [typedSignature, setTypedSignature] = useState('');
    const [signatureComplete, setSignatureComplete] = useState(false);
    const signatureRef = useRef(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        async function fetchCase() {
            if (!id) return;

            try {
                const docRef = doc(db, 'users', id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setCaseData(docSnap.data());
                } else {
                    setError('Case not found');
                }
            } catch (err) {
                setError('Error fetching case details');
            } finally {
                setLoading(false);
            }
        }

        fetchCase();
    }, [id]);

    const handleSaveSignature = async () => {
        try {
            if (!id) {
                alert('Invalid case ID');
                return;
            }

            setIsProcessing(true);

            let signatureData;
            const timestamp = new Date().toISOString();

            if (signatureType === 'draw') {
                // Validate drawn signature
                if (signatureRef.current.isEmpty()) {
                    alert('Please provide a signature');
                    setIsProcessing(false);
                    return;
                }

                try {
                    // Get signature as PNG data URL
                    const dataURL = signatureRef.current.toDataURL('image/png');
                    
                    // Create unique filename
                    const filePath = `contract_signatures/${id}_${Date.now()}.png`;
                    const storageRef = ref(storage, filePath);

                    // Upload to Firebase Storage
                    await uploadString(storageRef, dataURL, 'data_url');

                    // Get the download URL
                    const downloadURL = await getDownloadURL(storageRef);

                    // Structure the signature data
                    signatureData = downloadURL;
                } catch (error) {
                    console.error('Error uploading signature image:', error);
                    alert('Failed to upload signature image');
                    setIsProcessing(false);
                    return;
                }
            } else {
                // Handle typed signature
                if (!typedSignature.trim()) {
                    alert('Please type your signature');
                    setIsProcessing(false);
                    return;
                }

                // Structure the signature data for typed signature
                signatureData = typedSignature.trim();
            }

            // Update Firestore document
            const docRef = doc(db, 'users', id);
            await updateDoc(docRef, {
                contractSignature: signatureData,
                contractSignatureDate: timestamp,
                contractSigned: true,
                lastUpdated: timestamp
            });

            setSignatureComplete(true);
        } catch (err) {
            console.error('Error saving signature:', err);
            alert('Failed to save signature');
        } finally {
            setIsProcessing(false);
        }
    };

    const clearSignature = () => {
        if (signatureType === 'draw') {
            signatureRef.current.clear();
        } else {
            setTypedSignature('');
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
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-red-500">{error}</div>
            </div>
        );
    }

    if (signatureComplete) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-green-600 mb-4">Thank You!</h2>
                    <p className="text-gray-600">Your signature has been successfully recorded.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <h1 className="text-2xl font-bold mb-6">Digital Signature</h1>
            
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-2">Case Details</h2>
                    <p className="text-gray-600">Name: {caseData?.name}</p>
                    <p className="text-gray-600">Case ID: {id}</p>
                </div>

                <div className="mb-6">
                    <div className="flex gap-4 mb-4">
                        <button
                            onClick={() => setSignatureType('draw')}
                            className={`px-4 py-2 rounded ${
                                signatureType === 'draw' 
                                    ? 'bg-blue-500 text-white' 
                                    : 'bg-gray-200'
                            }`}
                        >
                            Draw Signature
                        </button>
                        <button
                            onClick={() => setSignatureType('type')}
                            className={`px-4 py-2 rounded ${
                                signatureType === 'type' 
                                    ? 'bg-blue-500 text-white' 
                                    : 'bg-gray-200'
                            }`}
                        >
                            Type Signature
                        </button>
                    </div>

                    {signatureType === 'draw' ? (
                        <div className="border rounded-lg p-2">
                            <SignatureCanvas
                                ref={signatureRef}
                                canvasProps={{
                                    className: 'signature-canvas w-full h-64 border rounded',
                                }}
                                backgroundColor="white"
                            />
                        </div>
                    ) : (
                        <input
                            type="text"
                            value={typedSignature}
                            onChange={(e) => setTypedSignature(e.target.value)}
                            className="w-full p-2 border rounded-lg font-signature text-xl"
                            placeholder="Type your signature here"
                        />
                    )}
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={clearSignature}
                        className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100"
                    >
                        Clear
                    </button>
                    <button
                        onClick={handleSaveSignature}
                        disabled={isProcessing}
                        className={`px-4 py-2 ${
                            isProcessing 
                                ? 'bg-gray-400' 
                                : 'bg-green-500 hover:bg-green-600'
                        } text-white rounded`}
                    >
                        {isProcessing ? (
                            <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing...
                            </span>
                        ) : (
                            'Save Signature'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
