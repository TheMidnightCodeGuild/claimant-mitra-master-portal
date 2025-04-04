import { useState } from 'react';
import dynamic from 'next/dynamic';

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
  <div onClick={onClick} className={`${bgColor} p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer`}>
    <div className="flex items-center space-x-4">
      {icon && <span className="text-2xl">{icon}</span>}
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
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

export default function Dashboard() {
  const [showLatestLeads, setShowLatestLeads] = useState(false);
  const [showAllCases, setShowAllCases] = useState(false);
  const [showCasesUnderReview, setShowCasesUnderReview] = useState(false);
  const [showIGMS, setShowIGMS] = useState(false);

  const dashboardItems = [
    { title: "View Latest Leads", onClick: () => {
      setShowLatestLeads(true);
      setShowAllCases(false);
      setShowCasesUnderReview(false);
      setShowIGMS(false);
    }, icon: "📊" },
    { title: "New Partner Application", href: "/partner/new", icon: "🤝" },
    { title: "View All Cases", onClick: () => {
      setShowAllCases(true);
      setShowLatestLeads(false);
      setShowCasesUnderReview(false);
      setShowIGMS(false);
    }, icon: "📁" },
    // { title: "Update Case Details", href: "/cases/update", icon: "📝" },
    { title: "View Partner Issues", href: "/partner/issues", icon: "⚠️" },
    { title: "Cases Under Review", onClick: () => {
      setShowCasesUnderReview(true);
      setShowAllCases(false);
      setShowLatestLeads(false);
      setShowIGMS(false);
    }, icon: "🔍" },
    { title: "IGMS", onClick: () => {
      setShowIGMS(true);
      setShowCasesUnderReview(false);
      setShowAllCases(false);
      setShowLatestLeads(false);
    }, icon: "📋" },
    { title: "Ombudsman", href: "/ombudsman", icon: "⚖️" },
    { title: "Solved Cases", href: "/cases/solved", icon: "✅" },
    { title: "Rejected Cases", href: "/cases/rejected", icon: "❌" },
    { title: "View Partners", href: "/partners", icon: "👥" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-[family-name:var(--font-geist-sans)]">
      {/* Header */}
      <header className="bg-white shadow-sm py-6 px-4">
        <h1 className="text-2xl font-bold text-gray-800 max-w-7xl mx-auto">
          Dashboard
        </h1>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {showLatestLeads ? (
          <ViewLatestLeads />
        ) : showAllCases ? (
          <ViewAllCases />
        ) : showCasesUnderReview ? (
          <CasesUnderReview />
        ) : showIGMS ? (
          <IGMS />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboardItems.map((item, index) => (
              <DashboardCard
                key={index}
                title={item.title}
                onClick={item.onClick}
                icon={item.icon}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
