export const DEFAULT_SUCCESS_FEE_PERCENT = 20;
export const SUCCESS_FEE_RATE = DEFAULT_SUCCESS_FEE_PERCENT / 100;

export function parseClaimAmount(input) {
  const parsed = parseFloat(String(input).replace(/,/g, ""));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export function parseSuccessFeePercent(input) {
  if (input == null || input === "") return DEFAULT_SUCCESS_FEE_PERCENT;
  const parsed = parseFloat(String(input).replace(/,/g, ""));
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100) return null;
  return parsed;
}

export function calculateSuccessFees(
  claimAmount,
  successFeePercent = DEFAULT_SUCCESS_FEE_PERCENT
) {
  if (claimAmount == null || claimAmount <= 0) return null;
  const percent = parseSuccessFeePercent(successFeePercent);
  if (percent == null) return null;
  const successFee = claimAmount * (percent / 100);
  const total = successFee;
  return { successFee, total, successFeePercent: percent };
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
