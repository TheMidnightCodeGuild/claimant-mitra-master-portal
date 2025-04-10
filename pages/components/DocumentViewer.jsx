import { useState } from 'react';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';

export default function DocumentViewer({ files }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleDownload = async (fileUrl) => {
        try {
            setLoading(true);
            setError(null);
            const storage = getStorage();
            const fileRef = ref(storage, fileUrl);
            const downloadUrl = await getDownloadURL(fileRef);
            
            // Create a temporary anchor element to trigger download
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.target = '_blank';
            link.download = fileUrl.split('/').pop(); // Extract filename from URL
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('Error downloading file:', err);
            setError('Failed to download file');
        } finally {
            setLoading(false);
        }
    };

    if (!files || files.length === 0) {
        return <div className="text-gray-500">No documents available</div>;
    }

    return (
        <div className="space-y-4">
            {error && (
                <div className="text-red-500 text-sm">{error}</div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {files.map((fileUrl, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="text-sm text-gray-600 truncate">
                                    {fileUrl.split('/').pop()}
                                </span>
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => window.open(fileUrl, '_blank')}
                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                    View
                                </button>
                                <button
                                    onClick={() => handleDownload(fileUrl)}
                                    disabled={loading}
                                    className="text-green-600 hover:text-green-800 text-sm font-medium disabled:text-gray-400"
                                >
                                    {loading ? 'Downloading...' : 'Download'}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
} 