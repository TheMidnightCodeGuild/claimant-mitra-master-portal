import { requireSession } from "../../../lib/apiAuth";
import { calculateSuccessFees } from "../../../lib/successFees";
import { generateInvoicePdf } from "../../../lib/invoicePdf";
import { allocateInvoiceNumber } from "../../../lib/invoiceNumber";

function formatDateIso() {
  return new Date().toISOString();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = requireSession(req, res);
  if (!session) return;

  try {
    const {
      claimAmount,
      billTo,
      caseId,
      claimNo,
      policyNo,
    } = req.body;

    if (!billTo?.name?.trim() || !billTo?.email?.trim()) {
      return res.status(400).json({ error: "Bill-to name and email are required" });
    }

    const amount = Number(claimAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: "Valid claim amount is required" });
    }

    const fees = calculateSuccessFees(amount);
    if (!fees) {
      return res.status(400).json({ error: "Could not calculate fees" });
    }

    const invoiceNumber = await allocateInvoiceNumber();
    const issueDate = formatDateIso();

    const pdfBuffer = await generateInvoicePdf({
      invoiceNumber,
      issueDate: new Date(issueDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      billTo: {
        name: billTo.name.trim(),
        email: billTo.email.trim(),
        address: (billTo.address || "").trim(),
      },
      claimAmount: amount,
      successFee: fees.successFee,
      total: fees.total,
      claimNo: claimNo || undefined,
      policyNo: policyNo || undefined,
    });

    const pdfBase64 = pdfBuffer.toString("base64");
    const safeNumber = invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, "_");

    const invoiceDraft = {
      invoiceNumber,
      issueDate,
      billTo: {
        name: billTo.name.trim(),
        email: billTo.email.trim(),
        address: (billTo.address || "").trim(),
      },
      caseId: caseId || null,
      claimNo: claimNo || null,
      policyNo: policyNo || null,
      claimAmount: amount,
      successFee: fees.successFee,
      total: fees.total,
      createdBy: session,
      pdfFileName: `${safeNumber}.pdf`,
    };

    return res.status(200).json({ pdfBase64, invoiceDraft });
  } catch (error) {
    console.error("Invoice create error:", error);
    return res.status(500).json({
      error: error.message || "Failed to generate invoice",
    });
  }
}
