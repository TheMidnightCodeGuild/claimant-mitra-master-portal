import { useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useRouter } from 'next/router';

export async function getServerSideProps(context) {
  const { req } = context;
  const cookies = req.cookies;

  if (!cookies.session) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  return {
    props: {
      userId: cookies.session,
    },
  };
}

const DashboardCard = ({ title, onClick, bgColor = "bg-white", icon }) => (
  <div onClick={onClick} className={`${bgColor} px-4 sm:px-6 md:px-8 lg:px-10 py-6 sm:py-8 md:py-9 rounded-2xl sm:rounded-3xl md:rounded-4xl border-2 border-gray-900 hover:bg-[#19BFDD] hover:text-white hover:scale-105 transition-all duration-700 cursor-pointer w-full`}>
    <div className="flex items-center space-x-3 sm:space-x-4">
      {icon && <span className="text-xl sm:text-2xl">{icon}</span>}
      <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800">{title}</h3>
    </div>
  </div>
);

const ViewLatestLeads = dynamic(() => import('./components/viewLatestLeads'), {
  ssr: false,
});

const ViewAllCases = dynamic(() => import('./components/viewAllCases'), {
  ssr: false,
});

const CasesUnderReview = dynamic(() => import('./components/casesUnderReview'), {
  ssr: false,
});

const IGMS = dynamic(() => import('./components/igms'), {
  ssr: false,
});

const Ombudsman = dynamic(() => import('./components/ombudsman'), {
  ssr: false,
});

const RejectedCases = dynamic(() => import('./components/rejectedCases'), {
  ssr: false,
});

const SolvedCases = dynamic(() => import('./components/solvedCases'), {
  ssr: false,
});

const CreateCase = dynamic(() => import('./components/createCase'), {
  ssr: false,
});

const ViewPartners = dynamic(() => import('./components/viewPartners'), {
  ssr: false,
});

const ViewPartnerIssues = dynamic(() => import('./components/viewPartnerIssues'), {
  ssr: false,
});

const PartnerApplication = dynamic(() => import('./components/partnerApplications'), {
  ssr: false,
});

const CreatePartner = dynamic(() => import('./components/createPartner'), {
  ssr: false,
});

const ViewCustomerEnquiries = dynamic(() => import('./components/viewCustomerEnquiries'), {
  ssr: false,
});

export default function Dashboard() {
  const router = useRouter();

  const dashboardItems = [
    {
      title: "View Customer Enquiries",
      onClick: () => router.push('/view?type=customerEnquiries'),
      icon: "📝"
    },
    {
      title: "View Latest Leads",
      onClick: () => router.push('/view?type=latestLeads'),
      icon: "📊"
    },
    {
      title: "Create Case",
      onClick: () => router.push('/view?type=createCase'),
      icon: "➕"
    },
    {
      title: "View All Cases",
      onClick: () => router.push('/view?type=allCases'),
      icon: "📁"
    },
    {
      title: "Cases Under Review",
      onClick: () => router.push('/view?type=casesUnderReview'),
      icon: "🔍"
    },
    {
      title: "IGMS",
      onClick: () => router.push('/view?type=igms'),
      icon: "📋"
    },
    {
      title: "Ombudsman",
      onClick: () => router.push('/view?type=ombudsman'),
      icon: "⚖️"
    },
    {
      title: "Solved Cases",
      onClick: () => router.push('/view?type=solvedCases'),
      icon: "✅"
    },
    {
      title: "Rejected Cases",
      onClick: () => router.push('/view?type=rejectedCases'),
      icon: "❌"
    },
    {
      title: "New Partner Application",
      onClick: () => router.push('/view?type=partnerApplications'),
      icon: "🤝"
    },
    {
      title: "Create Partner",
      onClick: () => router.push('/view?type=createPartner'),
      icon: "👥"
    },

    {
      title: "View Partner Issues",
      onClick: () => router.push('/view?type=partnerIssues'),
      icon: "⚠️"
    },
   
  
    {
      title: "View Partners",
      onClick: () => router.push('/view?type=viewPartners'),
      icon: "👥"
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-2 border-gray-900 py-4 sm:py-6 px-3 sm:px-4">
        <div className="max-w-[1300px] mx-auto flex flex-row items-center justify-between">
          <div className="flex items-center gap-10">
            <Image src="/images/logo.png" width={80} height={80} alt="Logo" className="h-16 sm:h-20 w-auto" />
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold uppercase underline text-gray-800">
              Master Portal Dashboard
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-[95%] lg:max-w-[1300px] mx-auto py-4 sm:py-6 md:py-8 px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
          {dashboardItems.map((item, index) => (
            <DashboardCard
              key={index}
              title={item.title}
              onClick={item.onClick}
              icon={item.icon}
              className="border-2 border-gray-900 rounded-lg"
            />
          ))}
        </div>
      </main>
    </div>
  );
}
