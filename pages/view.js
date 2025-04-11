import { useRouter } from 'next/router';
import { useState } from 'react';
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
import ViewCustomerEnquiries from './components/viewCustomerEnquiries';
import Contract from './components/contract';
import Consent from './components/consent';


export default function View() {
    const router = useRouter();
    const { type } = router.query;

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
            case 'partnerIssues':
                return <ViewPartnerIssues />;
            case 'partnerApplications':
                return <PartnerApplications />;
            case 'createPartner':
                return <CreatePartner />;
            case 'customerEnquiries':
                return <ViewCustomerEnquiries />;
            case 'sendContract':
                return <Contract />;
            case 'sendConsent':
                return <Consent />;
            default:
                return <div>Invalid component type</div>;
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Back button */}
            <div className="p-4">
                <button
                    onClick={handleBack}
                    className="flex items-center text-blue-600 hover:text-blue-800"
                >
                    <svg
                        className="w-5 h-5 mr-2"
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

            {/* Component container */}
            <div className="container mx-auto px-4 py-8">
                {renderComponent()}
            </div>
        </div>
    );
}
