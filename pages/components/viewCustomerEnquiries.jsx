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
        inReimbursement: false,
        isPending: false,

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

  if (loading) return <div className="flex min-h-[30vh] items-center justify-center"><div className="ui-spinner" /></div>;
  if (error) return <div className="ui-empty-state border-rose-200 text-rose-700">{error}</div>;

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto">
        <div className="ui-page-intro mb-6">
          <p className="ui-section-eyebrow">CRM</p>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Customer Enquiries</h2>
        </div>
        <div className="grid gap-6">
          {enquiries.map((enquiry) => (
            <div key={enquiry.id} className="ui-card-padded border-indigo-100/80 shadow-md transition hover:shadow-lg">
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
                {/* <div>
                  <h3 className="font-semibold">Policy Type</h3>
                  <p>{enquiry.policyType}</p>
                </div> */}
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
                    type="button"
                    onClick={() => handleTakeAsComplaint(enquiry)}
                    disabled={processingId === enquiry.id}
                    className="ui-btn-primary disabled:opacity-50"
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
