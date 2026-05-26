export const SUCCESS_FEE_RATE = 0.2;

export function parseClaimAmount(input) {
  const parsed = parseFloat(String(input).replace(/,/g, ""));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export function calculateSuccessFees(claimAmount) {
  if (claimAmount == null || claimAmount <= 0) return null;
  const successFee = claimAmount * SUCCESS_FEE_RATE;
  const total = successFee;
  return { successFee, total };
}

export function formatInr(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** pdf-lib standard fonts (WinAnsi) cannot render ₹ — use Rs. prefix */
export function formatInrForPdf(amount) {
  const n = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `Rs. ${n}`;
}

/** Strip/replace characters unsupported by Helvetica WinAnsi encoding */
export function textForPdf(str) {
  return String(str ?? "")
    .replace(/\u20b9/g, "Rs.")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x09\x0a\x0d\x20-\x7e\xa0-\xff]/g, "");
}
