import { doc, runTransaction } from "firebase/firestore";
import { db } from "./firebase";
import { invalidateCollections } from "./collectionCache";

export async function moveCaseToRecycle(caseId) {
  const userRef = doc(db, "users", caseId);
  const recycleRef = doc(db, "recycle", caseId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) throw new Error("Case not found");
    tx.set(recycleRef, {
      ...snap.data(),
      recycledAt: new Date().toISOString(),
    });
    tx.delete(userRef);
  });

  invalidateCollections(["users", "recycle"]);
}

export async function restoreCaseFromRecycle(caseId) {
  const userRef = doc(db, "users", caseId);
  const recycleRef = doc(db, "recycle", caseId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(recycleRef);
    if (!snap.exists()) throw new Error("Recycled case not found");
    const { recycledAt, ...caseData } = snap.data();
    tx.set(userRef, caseData);
    tx.delete(recycleRef);
  });

  invalidateCollections(["users", "recycle"]);
}
