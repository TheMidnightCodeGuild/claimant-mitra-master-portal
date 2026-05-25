import { requireSession } from "../../../lib/apiAuth";
import { sendEmail } from "../../../lib/mailer";
import { INVOICE_ISSUER } from "../../../lib/invoiceIssuer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = requireSession(req, res);
  if (!session) return;

  try {
    const {
      recipientEmail,
      invoiceNumber,
      billToName,
      downloadUrl,
      pdfBase64,
    } = req.body;

    const to = recipientEmail?.trim();
    if (!to) {
      return res.status(400).json({ error: "Recipient email is required" });
    }

    let attachments = [];
    if (pdfBase64) {
      attachments = [
        {
          filename: `${(invoiceNumber || "invoice").replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`,
          content: Buffer.from(pdfBase64, "base64"),
          contentType: "application/pdf",
        },
      ];
    } else if (downloadUrl) {
      const pdfRes = await fetch(downloadUrl);
      if (!pdfRes.ok) {
        return res.status(400).json({ error: "Could not fetch invoice PDF" });
      }
      const buffer = Buffer.from(await pdfRes.arrayBuffer());
      attachments = [
        {
          filename: `${(invoiceNumber || "invoice").replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`,
          content: buffer,
          contentType: "application/pdf",
        },
      ];
    } else {
      return res.status(400).json({
        error: "Provide pdfBase64 or downloadUrl for the attachment",
      });
    }

    const name = billToName || "Customer";
    const linkBlock = downloadUrl
      ? `<p>You can also <a href="${downloadUrl}">view or download your invoice</a>.</p>`
      : "";

    await sendEmail({
      to,
      subject: `Invoice ${invoiceNumber || ""} — ${INVOICE_ISSUER.legalName}`.trim(),
      text: `Dear ${name},\n\nPlease find your invoice attached.\n\nRegards,\n${INVOICE_ISSUER.legalName}`,
      html: `
        <p>Dear ${name},</p>
        <p>Please find your invoice <strong>${invoiceNumber || ""}</strong> attached.</p>
        ${linkBlock}
        <p>Regards,<br>${INVOICE_ISSUER.legalName}</p>
      `,
      attachments,
    });

    return res.status(200).json({ message: "Invoice sent successfully" });
  } catch (error) {
    console.error("Invoice send-email error:", error);
    return res.status(500).json({
      error: error.message || "Failed to send invoice email",
    });
  }
}
