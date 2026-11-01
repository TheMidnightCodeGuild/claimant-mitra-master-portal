/**
 * Fee per service-case type.
 *
 * PLACEHOLDER VALUES: the percentages reuse the insurance default (20%) and the
 * flat fees are unset. Replace them with the real rates. A flat fee left as
 * `null` makes computeServiceFee return null, so the screen says "not set"
 * rather than quietly charging nothing.
 */
export const SERVICE_FEE_CONFIG = {
  loan_dispute: { basis: "percent", percent: 20 },
  loan_settlement: { basis: "percent", percent: 20 },
  credit_score: { basis: "flat", amount: null },
  mailing: { basis: "flat", amount: null },
};

/** The amount a percentage fee is charged on. */
export function amountSaved(c) {
  if (c.caseType === "loan_settlement") {
    const outstanding = Number(c.outstandingAmount);
    const settled = Number(c.settledAmount);
    if (!Number.isFinite(outstanding) || !Number.isFinite(settled) || c.settledAmount === "" || c.settledAmount == null) {
      return null;
    }
    return Math.max(outstanding - settled, 0);
  }
  if (c.caseType === "loan_dispute") {
    const saved = Number(c.amountSaved);
    return c.amountSaved === "" || c.amountSaved == null || !Number.isFinite(saved) ? null : Math.max(saved, 0);
  }
  return null;
}

/** @returns {{basis: string, percent?: number, amount: number}|null} null when it cannot be worked out yet */
export function computeServiceFee(c) {
  const config = SERVICE_FEE_CONFIG[c.caseType];
  if (!config) return null;

  if (config.basis === "flat") {
    return config.amount == null ? null : { basis: "flat", amount: config.amount };
  }

  const saved = amountSaved(c);
  if (saved == null) return null;
  return {
    basis: "percent",
    percent: config.percent,
    amount: Math.round(saved * config.percent) / 100,
  };
}

export function describeFeeBasis(caseType) {
  const config = SERVICE_FEE_CONFIG[caseType];
  if (!config) return "";
  if (config.basis === "flat") {
    return config.amount == null ? "Flat fee (not set)" : "Flat fee";
  }
  return `${config.percent}% of the amount saved`;
}
