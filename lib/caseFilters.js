import { isStageActive } from "./postOutcomeStages";

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

function dayBounds(daysOffsetFromToday = 0) {
  const start = new Date();
  start.setDate(start.getDate() + daysOffsetFromToday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function complaintInRange(case_, start, end) {
  const d = parseDateValue(case_.complaintDate);
  if (!d) return false;
  return d >= start && d < end;
}

export const caseFilters = {
  underReview: (c) =>
    c.takenForReview === true &&
    c.igms !== true &&
    c.inReimbursement !== true &&
    c.rejected !== true,

  igms: (c) =>
    c.igms === true &&
    c.inReimbursement !== true &&
    c.ombudsman !== true &&
    c.rejected !== true &&
    c.solved !== true,

  ombudsman: (c) =>
    c.ombudsman === true && c.rejected !== true && c.solved !== true,

  pending: (c) => c.rejected !== true && c.isPending === true,

  reimbursement: (c) =>
    c.inReimbursement === true && c.rejected !== true && c.solved !== true,

  // A case running a post-outcome stage is listed under that stage, and returns here when the stage closes.
  solved: (c) => c.solved === true && !isStageActive(c, "additionalCompensation"),

  rejected: (c) =>
    c.rejected === true && !isStageActive(c, "rti") && !isStageActive(c, "consumerCourt"),

  additionalCompensation: (c) => isStageActive(c, "additionalCompensation"),

  rti: (c) => isStageActive(c, "rti"),

  consumerCourt: (c) => isStageActive(c, "consumerCourt"),

  latestLeads: (c) => {
    const twoDays = dayBounds(-2);
    const yesterday = dayBounds(-1);
    const today = dayBounds(0);
    return (
      complaintInRange(c, twoDays.start, twoDays.end) ||
      complaintInRange(c, yesterday.start, yesterday.end) ||
      complaintInRange(c, today.start, today.end)
    );
  },
};

export function filterCasesByKey(allCases, filterKey) {
  const fn = caseFilters[filterKey];
  if (!fn) return allCases;
  return allCases.filter(fn);
}

export function sortLatestLeads(cases) {
  return [...cases].sort(
    (a, b) =>
      (parseDateValue(b.complaintDate)?.getTime() || 0) -
      (parseDateValue(a.complaintDate)?.getTime() || 0)
  );
}

// Cases solved from Reimbursement used to be saved with `resolvedDate` instead of `solvedDate`.
export function solvedDateOf(case_) {
  return case_?.solvedDate || case_?.resolvedDate || "";
}

export function sortSolvedCases(cases) {
  return [...cases].sort(
    (a, b) =>
      (parseDateValue(solvedDateOf(b))?.getTime() || 0) -
      (parseDateValue(solvedDateOf(a))?.getTime() || 0)
  );
}

export function sortRejectedCases(cases) {
  return [...cases].sort(
    (a, b) =>
      (parseDateValue(b.rejectionDate)?.getTime() ||
        parseDateValue(b.caseRejectionDate)?.getTime() ||
        0) -
      (parseDateValue(a.rejectionDate)?.getTime() ||
        parseDateValue(a.caseRejectionDate)?.getTime() ||
        0)
  );
}
