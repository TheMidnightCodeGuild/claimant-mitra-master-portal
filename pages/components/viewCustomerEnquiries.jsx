import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, addDoc } from 'firebase/firestore';

function ViewCustomerEnquiries() {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    const fetchEnquiries = async () => {
      try {
        const enquiriesCollection = collection(db, 'enquiries');
        const enquiriesSnapshot = await getDocs(enquiriesCollection);
        const enquiriesList = enquiriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setEnquiries(enquiriesList);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch enquiries');
        setLoading(false);
      }
    };

    fetchEnquiries();
  }, []);

  const handleTakeAsComplaint = async (enquiry) => {
    setProcessingId(enquiry.id);
    try {
      // Create initial case data using enquiry information
      const caseData = {
        // Basic Information
        name: enquiry.fullName,
        mobile: enquiry.phone,
        email: enquiry.email,
        companyName: '',
        claimNo: '',
        policyNo: '',
        estimatedClaimAmount: 0,
        complaintDate: new Date().toISOString(),
        partnerRef: '',

        // Case Status
        takenForReview: true,
        status: 'Under Review',
        documentShort: true,
        rejected: false,
        solved: false,

        // Case Dates & Details
        reviewDate: new Date().toISOString(),
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
        ombudsmanRejectionReason: '',

        // Logs
        mainLogs: [{
          date: new Date().toISOString(),
          remark: `Case created from customer enquiry. Original message: ${enquiry.message}`
        }],
        internalLogs: [],
        igmsLogs: [],
        ombudsmanLogs: [],
        
        // Additional Information from Enquiry
        insuranceType: enquiry.insuranceType,
        policyType: enquiry.policyType,
        complaintType: enquiry.complaintType,
        createdAt: new Date(),
        convertedFromEnquiry: true,
        originalEnquiryId: enquiry.id
      };

      await addDoc(collection(db, 'users'), caseData);
      alert('Enquiry successfully converted to case!');
      
      // Optionally, you could remove this enquiry from the list
      setEnquiries(prev => prev.filter(e => e.id !== enquiry.id));
    } catch (err) {
      alert('Failed to convert enquiry to case: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Customer Enquiries</h2>
        <div className="grid gap-6">
          {enquiries.map((enquiry) => (
            <div key={enquiry.id} className="bg-white shadow rounded-lg p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold">Full Name</h3>
                  <p>{enquiry.fullName}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Email</h3>
                  <p>{enquiry.email}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Phone</h3>
                  <p>{enquiry.phone}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Insurance Type</h3>
                  <p>{enquiry.insuranceType}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Policy Type</h3>
                  <p>{enquiry.policyType}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Complaint Type</h3>
                  <p>{enquiry.complaintType}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Status</h3>
                  <p className="capitalize">{enquiry.status}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Created At</h3>
                  <p>{new Date(enquiry.createdAt).toLocaleString()}</p>
                </div>
                <div className="col-span-2">
                  <h3 className="font-semibold">Message</h3>
                  <p className="whitespace-pre-wrap">{enquiry.message}</p>
                </div>
                <div className="col-span-2 mt-4">
                  <button
                    onClick={() => handleTakeAsComplaint(enquiry)}
                    disabled={processingId === enquiry.id}
                    className={`px-4 py-2 rounded-md text-white font-medium 
                      ${processingId === enquiry.id 
                        ? 'bg-blue-300 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    {processingId === enquiry.id ? 'Converting...' : 'Take as Complaint'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ViewCustomerEnquiries;
