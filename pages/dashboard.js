import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

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

const DashboardCard = ({ title, onClick, icon }) => (
  <div
    onClick={onClick}
    className="group relative overflow-hidden rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-white via-slate-50/90 to-indigo-50/70 px-4 sm:px-6 md:px-8 lg:px-10 py-6 sm:py-8 md:py-9 shadow-md transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/15 cursor-pointer w-full"
  >
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-indigo-500/0 to-violet-500/0 opacity-0 transition-opacity duration-500 group-hover:from-cyan-500/5 group-hover:via-indigo-500/8 group-hover:to-violet-500/5 group-hover:opacity-100" />
    <div className="relative flex items-center space-x-3 sm:space-x-4">
      {icon && <span className="text-xl sm:text-2xl drop-shadow-sm">{icon}</span>}
      <h3 className="text-base sm:text-lg md:text-xl font-semibold text-slate-800 group-hover:text-indigo-950 transition-colors">
        {title}
      </h3>
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

const CreateCustomer = dynamic(() => import('./components/createCustomer'), {
  ssr: false,
});

const LinkCustomerCases = dynamic(() => import('./components/linkCustomerCases'), {
  ssr: false,
});

const ViewCustomerEnquiries = dynamic(() => import('./components/viewCustomerEnquiries'), {
  ssr: false,
});

const PendingCases = dynamic(() => import('./components/pending'), {
  ssr: false,
});

const ReimbursementCases = dynamic(() => import('./components/reimbursement'), {
  ssr: false,
});

const KpiDashboard = dynamic(() => import('./components/kpiDashboard'), {
  ssr: false,
});

export default function Dashboard() {
  const router = useRouter();
  const [noticeCount, setNoticeCount] = useState(0);
  const [showKpi, setShowKpi] = useState(false);

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

  const dashboardItems = [
    {
      title: "View Customer Enquiries",
      onClick: () => router.push('/view?type=customerEnquiries'),
      icon: "📝"
    },
    {
      title: "Create Customer",
      onClick: () => router.push('/view?type=createCustomer'),
      icon: "🧑‍💼"
    },
    {
      title: "Link Cases to Customer",
      onClick: () => router.push('/view?type=linkCustomerCases'),
      icon: "🔗"
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
      title: "Reimbursement Cases",
      onClick: () => router.push('/view?type=reimbursementCases'),
      icon: "🔍"
    },
    {
      title: "Pending Cases",
      onClick: () => router.push('/view?type=pendingCases'),
      icon: "🔍"
    },
    {
      title: "Send Consent",
      onClick: () => router.push('/view?type=sendConsent'),
      icon: "📨"
    },
    {
      title: "IGMS",
      onClick: () => router.push('/view?type=igms'),
      icon: "📋"
    },
    {
      title: "Send Contract",
      onClick: () => router.push('/view?type=sendContract'), 
      icon: "📄"
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
    {
      title: "View Super Partners",
      onClick: () => router.push('/view?type=viewSuperPartners'),
      icon: "👥"
    },
  ];

  return (
    <div className="min-h-screen">
      <header className="border-b border-indigo-200/50 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 py-4 sm:py-6 px-3 sm:px-4 shadow-lg shadow-indigo-950/40">
        <div className="max-w-[1300px] mx-auto flex flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6 sm:gap-10">
            <Image src="/images/logo.png" width={80} height={80} alt="Logo" className="h-14 sm:h-20 w-auto rounded-xl ring-2 ring-white/20 shadow-lg" />
            <div>
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300/90">
                Operations
              </p>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white">
                Master Portal Dashboard
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowKpi((v) => !v)}
              className={`ui-btn-primary px-5 py-2.5 text-sm shadow-lg shadow-indigo-900/40 ${
                showKpi ? "ring-2 ring-indigo-300 ring-offset-2 ring-offset-slate-900" : ""
              }`}
            >
              KPI Dashboard
            </button>
            <button
              type="button"
              onClick={() => router.push('/view?type=noticeBoard')}
              className="ui-btn-primary relative px-5 py-2.5 text-sm shadow-lg shadow-indigo-900/40"
            >
              Notice Board
              {noticeCount > 0 && (
                <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] rounded-full bg-gradient-to-br from-rose-500 to-red-600 text-white text-xs font-semibold flex items-center justify-center px-1 ring-2 ring-white">
                  {noticeCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[95%] lg:max-w-[1300px] mx-auto py-6 sm:py-8 md:py-10 px-3 sm:px-4 md:px-6 lg:px-8 space-y-8">
        {showKpi && <KpiDashboard />}
        <div>
          <p className="ui-section-eyebrow mb-2">Modules</p>
          <h2 className="text-xl font-semibold text-slate-900 mb-4 tracking-tight">
            Choose a workflow
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
          {dashboardItems.map((item, index) => (
            <DashboardCard
              key={index}
              title={item.title}
              onClick={item.onClick}
              icon={item.icon}
            />
          ))}
          </div>
        </div>
      </main>
    </div>
  );
}
