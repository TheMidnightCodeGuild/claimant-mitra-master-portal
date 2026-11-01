import { STAGES } from "./serviceCaseTypes";

/** A document with no `stage` is treated as new, never dropped from every tab. */
export function stageOf(c) {
  return STAGES.includes(c.stage) ? c.stage : "new";
}

export const serviceCaseFilters = {
  all: () => true,
  ...Object.fromEntries(STAGES.map((stage) => [stage, (c) => stageOf(c) === stage])),
};

export function countByStage(cases) {
  const counts = Object.fromEntries(STAGES.map((s) => [s, 0]));
  for (const c of cases) counts[stageOf(c)] += 1;
  return counts;
}

export function matchesServiceSearch(c, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  return [c.name, c.email, c.mobile, c.lender, c.loanAccountNo, c.subject, c.counterpartyName]
    .filter(Boolean)
    .some((v) => String(v).toLowerCase().includes(q));
}
