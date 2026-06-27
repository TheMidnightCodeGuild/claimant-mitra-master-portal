import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import ViewLatestLeads from './components/viewLatestLeads';
import ViewAllCases from './components/viewAllCases';
import CasesUnderReview from './components/casesUnderReview';
import IGMS from './components/igms';
import Ombudsman from './components/ombudsman';
import RejectedCases from './components/rejectedCases';
import SolvedCases from './components/solvedCases';
import CreateCase from './components/createCase';
import ViewPartners from './components/viewPartners';
import ViewPartnerIssues from './components/viewPartnerIssues';
import PartnerApplications from './components/partnerApplications';
import CreatePartner from './components/createPartner';
import CreateCustomer from './components/createCustomer';
import ViewAllCustomers from './components/viewAllCustomers';
import LinkCustomerCases from './components/linkCustomerCases';
import ViewCustomerEnquiries from './components/viewCustomerEnquiries';
import Contract from './components/contract';
import Consent from './components/consent';
import PendingCases from './components/pending';
import ReimbursementCases from './components/reimbursement';
import ViewSuperPartners from './components/viewSuperPartners';
import NoticeBoard from './components/noticeBoard';
import PolicyRequests from './components/PolicyRequest/policyRequests';
import InvoiceGenerator from './components/invoice/InvoiceGenerator';
import ManageCustomerReviews from './components/manageCustomerReviews';
import ManageTestimonialVideos from './components/manageTestimonialVideos';
import ManageParigyan from './components/manageParigyan';
import ManageGalleryImages from './components/manageGalleryImages';
import ManageFromClaimantMitraVideos from './components/manageFromClaimantMitraVideos';
import RecycleCases from './components/recycleCases';
export default function View() {
    const router = useRouter();
    const { type } = router.query;
    const [noticeCount, setNoticeCount] = useState(0);

    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, 'notice'),
            (snapshot) => {
                setNoticeCount(snapshot.size);
            },
            (err) => {
                console.error('Error listening notice count:', err);
            }
        );

        return () => unsubscribe();
    }, []);

    // Handle back button click
    const handleBack = () => {
        router.push('/dashboard');
    };

    // Render the appropriate component based on type
    const renderComponent = () => {
        if (!type) return null;

        switch (type) {
            case 'latestLeads':
                return <ViewLatestLeads />;
            case 'allCases':
                return <ViewAllCases />;
            case 'casesUnderReview':
                return <CasesUnderReview />;
            case 'igms':
                return <IGMS />;
            case 'ombudsman':
                return <Ombudsman />;
            case 'rejectedCases':
                return <RejectedCases />;
            case 'solvedCases':
                return <SolvedCases />;
            case 'createCase':
                return <CreateCase />;
            case 'viewPartners':
                return <ViewPartners />;
            case 'viewSuperPartners':
                return <ViewSuperPartners />;
            case 'partnerIssues':
                return <ViewPartnerIssues />;
            case 'partnerApplications':
                return <PartnerApplications />;
            case 'createPartner':
                return <CreatePartner />;
            case 'createCustomer':
                return <CreateCustomer />;
            case 'allCustomers':
                return <ViewAllCustomers />;
            case 'linkCustomerCases':
                return <LinkCustomerCases />;
            case 'customerEnquiries':
                return <ViewCustomerEnquiries />;
            case 'sendContract':
                return <Contract />;
            case 'sendConsent':
                return <Consent />;
            case 'pendingCases':
                return <PendingCases />;
            case 'reimbursementCases':
                return <ReimbursementCases />;
            case 'noticeBoard':
                return <NoticeBoard />;
            case 'policyRequests':
                return <PolicyRequests />;
            case 'invoices':
                return <InvoiceGenerator />;
            case 'manageCustomerReviews':
                return <ManageCustomerReviews />;
            case 'manageTestimonialVideos':
                return <ManageTestimonialVideos />;
            case 'manageParigyan':
                return <ManageParigyan />;
            case 'manageGalleryImages':
                return <ManageGalleryImages />;
            case 'manageFromClaimantMitraVideos':
                return <ManageFromClaimantMitraVideos />;
            case 'recycleCases':
                return <RecycleCases />;
            default:
                return <div>Invalid component type</div>;
        }
    };

    return (
        <div className="min-h-screen">
            <div className="border-b border-indigo-200/40 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 shadow-lg shadow-indigo-950/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="hidden" aria-hidden="true" data-notice-count={noticeCount} />
                    <button
                        type="button"
                        onClick={handleBack}
                        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-indigo-950 bg-white shadow-md ring-1 ring-white/40 hover:bg-indigo-50 hover:text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-900 transition"
                    >
                        <svg
                            className="w-5 h-5 shrink-0"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Dashboard
                    </button>
                </div>
            </div>

            <div className="ui-page-shell max-w-[1300px]">
                {renderComponent()}
            </div>
        </div>
    );
}
