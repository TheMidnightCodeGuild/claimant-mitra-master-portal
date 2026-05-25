import { useEffect, useMemo, useState } from "react";
import { fetchKpiData } from "../../lib/kpiCache";

const RANGE_OPTIONS = [
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "all", label: "All time" },
];

const parseDateValue = (value) => {
  if (!value) return null;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "object" && typeof value.toDate === "function") {
    return value.toDate();
  }
  return null;
};

const resolveCaseDate = (item) =>
  parseDateValue(item?.createdAt) ||
  parseDateValue(item?.uploadCompletedAt) ||
  parseDateValue(item?.complaintDate) ||
  parseDateValue(item?.requestVerificationRequestedAt);

const resolveNoticeDate = (item) => parseDateValue(item?.uploadedAt);

const numberValue = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

function isInRange(item, rangeStart, resolveDate) {
  if (!rangeStart) return true;
  const date = resolveDate(item);
  return date ? date >= rangeStart : false;
}

function computeMetrics(users, partners, notices, rangeStart) {
  const totalCases = users.length;
  let newCases = 0;
  let underReview = 0;
  let pending = 0;
  let igms = 0;
  let reimbursement = 0;
  let rejected = 0;
  let solved = 0;
  let verificationPending = 0;
  let verificationUploaded = 0;
  let verificationApproved = 0;
  let verificationRejected = 0;
  let verificationCompleted = 0;
  let linksRequested = 0;
  let allowUpload = 0;
  let restrictedUpload = 0;
  const claimValues = [];

  for (const u of users) {
    if (!isInRange(u, rangeStart, resolveCaseDate)) continue;
    newCases += 1;

    if (u.takenForReview === true) underReview += 1;
    if (u.isPending === true) pending += 1;
    if (u.igms === true) igms += 1;
    if (u.inReimbursement === true) reimbursement += 1;
    if (u.rejected === true) rejected += 1;

    const status = String(u.status || "").toLowerCase();
    if (status.includes("solved") || status.includes("completed")) solved += 1;

    const vv = u.VideoVerification;
    if (!vv || vv === "Verification Pending") verificationPending += 1;
    else if (vv === "Uploaded") verificationUploaded += 1;
    else if (vv === "Approved") verificationApproved += 1;
    else if (vv === "Rejected") verificationRejected += 1;
    else if (vv === "Completed") verificationCompleted += 1;

    if (u.requestVerificationRequestedAt) linksRequested += 1;
    if (u.allowUpload === "allow") allowUpload += 1;
    if (!u.allowUpload || u.allowUpload === "restrict") restrictedUpload += 1;

    const claim = numberValue(u.estimatedClaimAmount || u.claim);
    if (claim > 0) claimValues.push(claim);
  }

  const claimTotal = claimValues.reduce((sum, v) => sum + v, 0);
  const claimAvg = claimValues.length ? claimTotal / claimValues.length : 0;
  const claimMin = claimValues.length ? Math.min(...claimValues) : 0;
  const claimMax = claimValues.length ? Math.max(...claimValues) : 0;

  let superCount = 0;
  let normalCount = 0;
  let supersWithChildren = 0;
  let childrenSum = 0;

  for (const p of partners) {
    if (p.partnerType === "super") {
      superCount += 1;
      const under = Array.isArray(p.partnersUnder) ? p.partnersUnder.length : 0;
      childrenSum += under;
      if (under > 0) supersWithChildren += 1;
    } else {
      normalCount += 1;
    }
  }

  const totalPartners = partners.length;
  const avgChildrenPerSuper = superCount ? childrenSum / superCount : 0;

  const totalNotices = notices.length;
  let noticesRangeCount = 0;
  let latestNotice = null;
  const noticeUserAcc = {};

  for (const n of notices) {
    const date = resolveNoticeDate(n);
    if (date && (!latestNotice || date > latestNotice)) {
      latestNotice = date;
    }
    if (isInRange(n, rangeStart, resolveNoticeDate)) {
      noticesRangeCount += 1;
    }
    const key = n.userId || "unknown";
    if (!noticeUserAcc[key]) {
      noticeUserAcc[key] = { count: 0, name: n.name || key };
    }
    noticeUserAcc[key].count += 1;
  }

  const topNoticeUsers = Object.entries(noticeUserAcc)
    .map(([userId, info]) => ({ userId, ...info }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalCases,
    newCases,
    underReview,
    pending,
    igms,
    reimbursement,
    solved,
    rejected,
    verificationPending,
    verificationUploaded,
    verificationApproved,
    verificationRejected,
    verificationCompleted,
    linksRequested,
    allowUpload,
    restrictedUpload,
    claimTotal,
    claimAvg,
    claimMin,
    claimMax,
    totalPartners,
    superCount,
    normalCount,
    supersWithChildren,
    avgChildrenPerSuper,
    totalNotices,
    noticesRangeCount,
    latestNotice,
    topNoticeUsers,
  };
}

export default function KpiDashboard({ onClose }) {
  const [range, setRange] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const [users, setUsers] = useState([]);
  const [partners, setPartners] = useState([]);
  const [notices, setNotices] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { users: u, partners: p, notices: n, fetchedAt } =
          await fetchKpiData({
            forceRefresh: refreshIndex > 0,
          });

        if (cancelled) return;

        setUsers(u);
        setPartners(p);
        setNotices(n);
        setLastUpdated(new Date(fetchedAt));
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load KPI data:", err);
        setError("Failed to load KPI metrics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshIndex]);

  const rangeStart = useMemo(() => {
    if (range === "all") return null;
    const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
    const start = new Date();
    start.setDate(start.getDate() - days);
    return start;
  }, [range]);

  const metrics = useMemo(() => {
    if (loading) return null;
    return computeMetrics(users, partners, notices, rangeStart);
  }, [loading, users, partners, notices, rangeStart]);

  const currency = (value) => `₹${Math.round(value || 0).toLocaleString("en-IN")}`;

  return (
    <section className="ui-section-indigo mb-2 overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <p className="ui-section-eyebrow">Performance</p>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">KPI Dashboard</h2>
          <p className="text-sm text-slate-600 mt-1">
            Last updated: {lastUpdated ? lastUpdated.toLocaleString("en-IN") : "Not loaded yet"}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            disabled={loading}
            className="ui-input w-auto min-w-[160px] border-indigo-200/80 bg-white/90 disabled:opacity-50"
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setRefreshIndex((prev) => prev + 1)}
            disabled={loading}
            className="ui-btn-primary disabled:opacity-50"
          >
            Refresh
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="ui-btn-secondary"
            >
              Hide
            </button>
          )}
        </div>
      </div>

      {loading && <p className="text-slate-600">Loading KPI metrics...</p>}
      {error && <p className="text-rose-600 font-medium">{error}</p>}

      {!loading && !error && metrics && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
            <KpiCard label="Total Cases" value={metrics.totalCases} />
            <KpiCard label="New Cases (Range)" value={metrics.newCases} />
            <KpiCard label="Under Review" value={metrics.underReview} />
            <KpiCard label="Pending" value={metrics.pending} />
            <KpiCard label="IGMS" value={metrics.igms} />
            <KpiCard label="Reimbursement" value={metrics.reimbursement} />
            <KpiCard label="Solved/Completed" value={metrics.solved} />
            <KpiCard label="Rejected" value={metrics.rejected} />
            <KpiCard label="Verification Completed" value={metrics.verificationCompleted} />
            <KpiCard label="Links Requested" value={metrics.linksRequested} />
            <KpiCard label="Upload Allowed" value={metrics.allowUpload} />
            <KpiCard label="Upload Restricted" value={metrics.restrictedUpload} />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="ui-card-padded border-cyan-100/80 bg-gradient-to-br from-white via-cyan-50/30 to-white">
              <h3 className="ui-section-title mb-3 text-indigo-950">Claim Amounts (Range)</h3>
              <p className="text-sm text-slate-700">Total: {currency(metrics.claimTotal)}</p>
              <p className="text-sm text-slate-700">Average: {currency(metrics.claimAvg)}</p>
              <p className="text-sm text-slate-700">Minimum: {currency(metrics.claimMin)}</p>
              <p className="text-sm text-slate-700">Maximum: {currency(metrics.claimMax)}</p>
            </div>

            <div className="ui-card-padded border-violet-100/80 bg-gradient-to-br from-white via-violet-50/40 to-white">
              <h3 className="ui-section-title mb-3 text-indigo-950">Verification Funnel (Range)</h3>
              <p className="text-sm text-slate-700">Pending: {metrics.verificationPending}</p>
              <p className="text-sm text-slate-700">Uploaded: {metrics.verificationUploaded}</p>
              <p className="text-sm text-slate-700">Approved: {metrics.verificationApproved}</p>
              <p className="text-sm text-slate-700">Rejected: {metrics.verificationRejected}</p>
              <p className="text-sm text-slate-700">Completed: {metrics.verificationCompleted}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="ui-section-slate">
              <h3 className="ui-section-title mb-3">Partner Metrics</h3>
              <p className="text-sm text-slate-700">Total Partners: {metrics.totalPartners}</p>
              <p className="text-sm text-slate-700">Normal Partners: {metrics.normalCount}</p>
              <p className="text-sm text-slate-700">Super Partners: {metrics.superCount}</p>
              <p className="text-sm text-slate-700">
                Super Partners with Children: {metrics.supersWithChildren}
              </p>
              <p className="text-sm text-slate-700">
                Avg Children per Super: {metrics.avgChildrenPerSuper.toFixed(2)}
              </p>
            </div>

            <div className="ui-section-slate">
              <h3 className="ui-section-title mb-3">Notice Metrics</h3>
              <p className="text-sm text-slate-700">Total Notices: {metrics.totalNotices}</p>
              <p className="text-sm text-slate-700">
                Notices in Range: {metrics.noticesRangeCount}
              </p>
              <p className="text-sm text-slate-700">
                Latest Notice:{" "}
                {metrics.latestNotice ? metrics.latestNotice.toLocaleString("en-IN") : "N/A"}
              </p>
              <div className="mt-2">
                <p className="text-sm font-medium text-slate-800">Top Notice Users</p>
                {metrics.topNoticeUsers.length === 0 ? (
                  <p className="text-sm text-slate-600">No notice users yet.</p>
                ) : (
                  <ul className="text-sm text-slate-700 space-y-1">
                    {metrics.topNoticeUsers.map((item) => (
                      <li key={item.userId}>
                        {item.name} ({item.userId}): {item.count}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function KpiCard({ label, value }) {
  return (
    <div className="ui-kpi-tile transition hover:scale-[1.01]">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-xl font-bold bg-gradient-to-r from-slate-900 to-indigo-900 bg-clip-text text-transparent">
        {value ?? 0}
      </p>
    </div>
  );
}
