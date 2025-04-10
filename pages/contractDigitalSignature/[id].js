import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import SignatureCanvas from 'react-signature-canvas';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

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
            if (!id) return;

            let signatureData;
            if (signatureType === 'draw') {
                if (signatureRef.current.isEmpty()) {
                    alert('Please provide a signature');
                    return;
                }
                signatureData = signatureRef.current.toDataURL();
            } else {
                if (!typedSignature.trim()) {
                    alert('Please type your signature');
                    return;
                }
                signatureData = typedSignature;
            }

            const docRef = doc(db, 'users', id);
            await updateDoc(docRef, {
                contractSignature: signatureData,
                contractSignatureDate: new Date().toISOString(),
                contractSigned: true
            });

            setSignatureComplete(true);
        } catch (err) {
            console.error('Error saving signature:', err);
            alert('Failed to save signature');
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
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                        Save Signature
                    </button>
                </div>
            </div>
        </div>
    );
}
