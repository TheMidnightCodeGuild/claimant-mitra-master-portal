import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";

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

export default function KpiDashboard() {
  const [range, setRange] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const [users, setUsers] = useState([]);
  const [partners, setPartners] = useState([]);
  const [notices, setNotices] = useState([]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const [usersSnap, partnersSnap, noticesSnap] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "partners")),
          getDocs(collection(db, "notice")),
        ]);

        setUsers(usersSnap.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
        setPartners(
          partnersSnap.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }))
        );
        setNotices(noticesSnap.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
        setLastUpdated(new Date());
      } catch (err) {
        console.error("Failed to load KPI data:", err);
        setError("Failed to load KPI metrics");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [refreshIndex]);

  const rangeStart = useMemo(() => {
    if (range === "all") return null;
    const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
    const start = new Date();
    start.setDate(start.getDate() - days);
    return start;
  }, [range]);

  const usersInRange = useMemo(
    () =>
      users.filter((item) => {
        if (!rangeStart) return true;
        const date = resolveCaseDate(item);
        return date ? date >= rangeStart : false;
      }),
    [users, rangeStart]
  );

  const noticesInRange = useMemo(
    () =>
      notices.filter((item) => {
        if (!rangeStart) return true;
        const date = resolveNoticeDate(item);
        return date ? date >= rangeStart : false;
      }),
    [notices, rangeStart]
  );

  const metrics = useMemo(() => {
    const usersSource = usersInRange;
    const totalCases = users.length;
    const newCases = usersSource.length;

    const underReview = usersSource.filter((u) => u.takenForReview === true).length;
    const pending = usersSource.filter((u) => u.isPending === true).length;
    const igms = usersSource.filter((u) => u.igms === true).length;
    const reimbursement = usersSource.filter((u) => u.inReimbursement === true).length;
    const rejected = usersSource.filter((u) => u.rejected === true).length;
    const solved = usersSource.filter((u) => {
      const status = String(u.status || "").toLowerCase();
      return status.includes("solved") || status.includes("completed");
    }).length;

    const verificationPending = usersSource.filter(
      (u) => !u.VideoVerification || u.VideoVerification === "Verification Pending"
    ).length;
    const verificationUploaded = usersSource.filter(
      (u) => u.VideoVerification === "Uploaded"
    ).length;
    const verificationApproved = usersSource.filter(
      (u) => u.VideoVerification === "Approved"
    ).length;
    const verificationRejected = usersSource.filter(
      (u) => u.VideoVerification === "Rejected"
    ).length;
    const verificationCompleted = usersSource.filter(
      (u) => u.VideoVerification === "Completed"
    ).length;

    const linksRequested = usersSource.filter((u) => !!u.requestVerificationRequestedAt).length;
    const allowUpload = usersSource.filter((u) => u.allowUpload === "allow").length;
    const restrictedUpload = usersSource.filter(
      (u) => !u.allowUpload || u.allowUpload === "restrict"
    ).length;

    const claimValues = usersSource
      .map((u) => numberValue(u.estimatedClaimAmount || u.claim))
      .filter((value) => value > 0);
    const claimTotal = claimValues.reduce((sum, value) => sum + value, 0);
    const claimAvg = claimValues.length ? claimTotal / claimValues.length : 0;
    const claimMin = claimValues.length ? Math.min(...claimValues) : 0;
    const claimMax = claimValues.length ? Math.max(...claimValues) : 0;

    const totalPartners = partners.length;
    const superPartners = partners.filter((p) => p.partnerType === "super");
    const superCount = superPartners.length;
    const normalCount = totalPartners - superCount;
    const supersWithChildren = superPartners.filter(
      (p) => Array.isArray(p.partnersUnder) && p.partnersUnder.length > 0
    ).length;
    const avgChildrenPerSuper = superCount
      ? superPartners.reduce(
          (sum, p) => sum + (Array.isArray(p.partnersUnder) ? p.partnersUnder.length : 0),
          0
        ) / superCount
      : 0;

    const totalNotices = notices.length;
    const noticesRangeCount = noticesInRange.length;
    const latestNotice = notices
      .map((n) => resolveNoticeDate(n))
      .filter(Boolean)
      .sort((a, b) => b - a)[0];

    const topNoticeUsers = Object.entries(
      notices.reduce((acc, n) => {
        const key = n.userId || "unknown";
        acc[key] = (acc[key] || { count: 0, name: n.name || key });
        acc[key].count += 1;
        return acc;
      }, {})
    )
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
  }, [users, usersInRange, partners, notices, noticesInRange]);

  const currency = (value) => `₹${Math.round(value || 0).toLocaleString("en-IN")}`;

  return (
    <section className="mb-8 bg-white border border-gray-200 rounded-xl p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">KPI Dashboard</h2>
          <p className="text-sm text-gray-600">
            Last updated: {lastUpdated ? lastUpdated.toLocaleString("en-IN") : "Not loaded yet"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setRefreshIndex((prev) => prev + 1)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-3 py-2 text-sm font-medium"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading && <p className="text-gray-600">Loading KPI metrics...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
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
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Claim Amounts (Range)</h3>
              <p className="text-sm text-gray-700">Total: {currency(metrics.claimTotal)}</p>
              <p className="text-sm text-gray-700">Average: {currency(metrics.claimAvg)}</p>
              <p className="text-sm text-gray-700">Minimum: {currency(metrics.claimMin)}</p>
              <p className="text-sm text-gray-700">Maximum: {currency(metrics.claimMax)}</p>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Verification Funnel (Range)</h3>
              <p className="text-sm text-gray-700">Pending: {metrics.verificationPending}</p>
              <p className="text-sm text-gray-700">Uploaded: {metrics.verificationUploaded}</p>
              <p className="text-sm text-gray-700">Approved: {metrics.verificationApproved}</p>
              <p className="text-sm text-gray-700">Rejected: {metrics.verificationRejected}</p>
              <p className="text-sm text-gray-700">Completed: {metrics.verificationCompleted}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Partner Metrics</h3>
              <p className="text-sm text-gray-700">Total Partners: {metrics.totalPartners}</p>
              <p className="text-sm text-gray-700">Normal Partners: {metrics.normalCount}</p>
              <p className="text-sm text-gray-700">Super Partners: {metrics.superCount}</p>
              <p className="text-sm text-gray-700">
                Super Partners with Children: {metrics.supersWithChildren}
              </p>
              <p className="text-sm text-gray-700">
                Avg Children per Super: {metrics.avgChildrenPerSuper.toFixed(2)}
              </p>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Notice Metrics</h3>
              <p className="text-sm text-gray-700">Total Notices: {metrics.totalNotices}</p>
              <p className="text-sm text-gray-700">
                Notices in Range: {metrics.noticesRangeCount}
              </p>
              <p className="text-sm text-gray-700">
                Latest Notice:{" "}
                {metrics.latestNotice ? metrics.latestNotice.toLocaleString("en-IN") : "N/A"}
              </p>
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-800">Top Notice Users</p>
                {metrics.topNoticeUsers.length === 0 ? (
                  <p className="text-sm text-gray-600">No notice users yet.</p>
                ) : (
                  <ul className="text-sm text-gray-700">
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
    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
      <p className="text-xs text-gray-600">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value ?? 0}</p>
    </div>
  );
}
