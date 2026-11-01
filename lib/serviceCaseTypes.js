/**
 * Non-insurance cases (loan dispute, loan settlement, credit score, mailing).
 * They live in their own collection so insurance cases in `users` are untouched.
 *
 * The same field definitions are copied into ccm, the partner portal and the
 * website (the apps share no package) - keep the four copies in step.
 */
export const SERVICE_CASE_COLLECTION = "serviceCases";

export const CASE_TYPES = {
  loan_dispute: {
    label: "Loan Dispute",
    fields: [
      { name: "lender", label: "Lender / bank", required: true },
      { name: "loanAccountNo", label: "Loan account number", required: true },
      {
        name: "loanType",
        label: "Loan type",
        type: "select",
        options: ["Personal", "Home", "Vehicle", "Business", "Education", "Credit card", "Other"],
      },
      { name: "disputedAmount", label: "Disputed amount (Rs.)", type: "number" },
      { name: "disputeNature", label: "What is the dispute about?", type: "textarea", required: true },
    ],
  },
  loan_settlement: {
    label: "Loan Settlement",
    fields: [
      { name: "lender", label: "Lender / bank", required: true },
      { name: "loanAccountNo", label: "Loan account number", required: true },
      { name: "outstandingAmount", label: "Outstanding amount (Rs.)", type: "number", required: true },
      { name: "offeredAmount", label: "Settlement offered by lender (Rs.)", type: "number" },
    ],
  },
  credit_score: {
    label: "Credit Score",
    fields: [
      {
        name: "bureau",
        label: "Credit bureau",
        type: "select",
        options: ["CIBIL", "Experian", "Equifax", "CRIF High Mark"],
        required: true,
      },
      { name: "currentScore", label: "Current score", type: "number" },
      { name: "targetScore", label: "Target score", type: "number" },
      { name: "issue", label: "What needs fixing?", type: "textarea", required: true },
    ],
  },
  mailing: {
    label: "Mailing Case",
    fields: [
      { name: "subject", label: "Subject", required: true },
      { name: "counterpartyName", label: "Other party (person / organisation)", required: true },
      { name: "counterpartyEmail", label: "Other party email" },
      { name: "counterpartyAddress", label: "Other party postal address", type: "textarea" },
      { name: "description", label: "What needs to be resolved?", type: "textarea", required: true },
    ],
  },
};

export const CASE_TYPE_KEYS = Object.keys(CASE_TYPES);

export function caseTypeLabel(caseType) {
  return CASE_TYPES[caseType]?.label || caseType || "-";
}

/** Fields only staff fill in while working a case, per type. */
export const STAFF_FIELDS = {
  loan_dispute: [
    { name: "amountSaved", label: "Amount saved / waived (Rs.)", type: "number" },
  ],
  loan_settlement: [
    { name: "settledAmount", label: "Final settled amount (Rs.)", type: "number" },
  ],
  credit_score: [
    { name: "finalScore", label: "Score after the work", type: "number" },
  ],
  mailing: [],
};

export const STAGES = ["new", "under_review", "accepted", "escalated", "resolved", "rejected"];

export const STAGE_LABELS = {
  new: "New",
  under_review: "Under Review",
  accepted: "Accepted",
  escalated: "Escalated",
  resolved: "Resolved",
  rejected: "Rejected",
};

/** Where a case may go next. Resolved and rejected are final, as for insurance cases. */
export const NEXT_STAGES = {
  new: ["under_review", "rejected"],
  under_review: ["accepted", "rejected"],
  accepted: ["escalated", "resolved", "rejected"],
  escalated: ["resolved", "rejected"],
  resolved: [],
  rejected: [],
};

export const MOBILE_PATTERN = /^[0-9]{10}$/;
