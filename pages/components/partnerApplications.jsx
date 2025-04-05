import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

function PartnerApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const requestsCollection = collection(db, 'requests');
        const querySnapshot = await getDocs(requestsCollection);
        const applicationsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setApplications(applicationsList);
      } catch (error) {
        console.error('Error fetching applications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading applications...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">New Partner Applications</h1>
        
        <div className="grid gap-6">
          {applications.map((application) => (
            <div 
              key={application.id}
              className="bg-white p-6 rounded-lg shadow-md"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h2 className="text-xl font-semibold mb-2">
                    {application.source || 'Unnamed Source'}
                  </h2>
                  <p className="text-gray-600">
                    <span className="font-medium">Email:</span> {application.email}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">Phone:</span> {application.phoneNumber}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">
                    <span className="font-medium">Application Date:</span>{' '}
                    {new Date(application.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">Status:</span>{' '}
                    <span className={`px-2 py-1 rounded-full text-sm ${
                      application.status === 'pending' 
                        ? 'bg-yellow-100 text-yellow-800'
                        : application.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {application.status || 'pending'}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {applications.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            No applications found
          </div>
        )}
      </div>
    </div>
  );
}

export default PartnerApplications;
