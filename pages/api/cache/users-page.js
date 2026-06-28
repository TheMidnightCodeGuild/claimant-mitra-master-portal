import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { requireSession } from "../../../lib/apiAuth";

function parseDateValue(value) {
  if (!value) return null;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "object" && typeof value.toDate === "function") {
    return value.toDate();
  }
  return null;
}

function getSortTime(case_) {
  const d =
    parseDateValue(case_.complaintDate) || parseDateValue(case_.createdAt);
  return d ? d.getTime() : 0;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = requireSession(req, res);
  if (!session) return;

  const pageSize = Math.min(
    Math.max(parseInt(req.query.limit, 10) || 50, 1),
    100
  );
  const startAfterId = req.query.startAfterId || null;

  try {
    let q = query(
      collection(db, "users"),
      orderBy("complaintDate", "desc"),
      limit(pageSize)
    );

    if (startAfterId) {
      const cursorSnap = await getDoc(doc(db, "users", startAfterId));
      if (cursorSnap.exists()) {
        q = query(
          collection(db, "users"),
          orderBy("complaintDate", "desc"),
          startAfter(cursorSnap),
          limit(pageSize)
        );
      }
    }

    let snap;
    try {
      snap = await getDocs(q);
    } catch (indexErr) {
      // Fallback if complaintDate index missing: fetch page via createdAt or full scan sort
      console.warn("users-page complaintDate query failed, using fallback:", indexErr?.message);
      const allSnap = await getDocs(collection(db, "users"));
      const all = allSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      all.sort((a, b) => getSortTime(b) - getSortTime(a));
      let startIdx = 0;
      if (startAfterId) {
        const idx = all.findIndex((c) => c.id === startAfterId);
        startIdx = idx >= 0 ? idx + 1 : 0;
      }
      const slice = all.slice(startIdx, startIdx + pageSize);
      const last = slice[slice.length - 1];
      return res.status(200).json({
        data: slice,
        hasMore: startIdx + pageSize < all.length,
        lastId: last?.id || null,
      });
    }

    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const last = data[data.length - 1];

    return res.status(200).json({
      data,
      hasMore: data.length === pageSize,
      lastId: last?.id || null,
    });
  } catch (error) {
    console.error("users-page API:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch users page" });
  }
}
