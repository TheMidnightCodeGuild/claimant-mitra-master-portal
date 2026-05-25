import { db } from "./firebase";
import { doc, runTransaction } from "firebase/firestore";

export async function allocateInvoiceNumber() {
  const year = new Date().getFullYear();
  const counterRef = doc(db, "counters", "invoices");

  const seq = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(counterRef);
    let lastNumber = 0;
    let storedYear = year;
    if (snap.exists()) {
      const data = snap.data();
      lastNumber = data.lastNumber || 0;
      storedYear = data.year || year;
      if (storedYear !== year) {
        lastNumber = 0;
        storedYear = year;
      }
    }
    const next = lastNumber + 1;
    transaction.set(counterRef, { lastNumber: next, year: storedYear }, { merge: true });
    return next;
  });

  const padded = String(seq).padStart(5, "0");
  return `CM-INV-${year}-${padded}`;
}
