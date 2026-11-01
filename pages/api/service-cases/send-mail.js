import { requireSession } from "../../../lib/apiAuth";
import { sendEmail } from "../../../lib/mailer";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseAddresses(value) {
  return String(value || "")
    .split(/[,;\s]+/)
    .map((a) => a.trim())
    .filter(Boolean);
}

/**
 * Sends one email for a service case. It only sends: the caller records the
 * entry on the case's correspondence log, the way every other screen in this
 * portal writes to Firestore.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = requireSession(req, res);
  if (!session) return;

  const { to, cc, subject, body } = req.body || {};
  const toList = parseAddresses(to);
  const ccList = parseAddresses(cc);

  if (toList.length === 0 || ![...toList, ...ccList].every((a) => EMAIL_PATTERN.test(a))) {
    return res.status(400).json({ error: "Enter valid email addresses" });
  }
  if (!String(subject || "").trim() || !String(body || "").trim()) {
    return res.status(400).json({ error: "Subject and message are required" });
  }

  try {
    await sendEmail({
      to: toList.join(", "),
      cc: ccList.length ? ccList.join(", ") : undefined,
      subject: String(subject).trim(),
      text: String(body),
    });
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("service-cases send-mail:", error);
    return res.status(500).json({ error: error.message || "Failed to send email" });
  }
}
