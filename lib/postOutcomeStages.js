// Stages that come after a case has ended: Additional Compensation after Solved, RTI and Consumer Court
// after Rejected. They sit on top of the `solved` / `rejected` flags (which stay true), the same way
// `ombudsman` sits on top of `igms`.
//
// For a stage key X the case document carries:
//   X, XDate                              started, and when
//   XClosed, XClosedDate, XOutcome, XOutcomeNote   ended, when, and how
//   XLogs[]                               staff notes, {date, remark}
// Starting and ending also set `status` and add one entry to `mainLogs`. Both are shown to customers and
// partners, so the wording here is fixed and never contains amounts or staff notes.

export const POST_OUTCOME_STAGES = {
  additionalCompensation: {
    key: "additionalCompensation",
    label: "Additional Compensation",
    parentFlag: "solved",
    parentLabel: "Solved",
    startLog: "Additional compensation process has been started for your case.",
    outcomes: [
      { value: "received", label: "Received" },
      { value: "not_received", label: "Not received" },
      { value: "withdrawn", label: "Withdrawn" },
    ],
  },
  rti: {
    key: "rti",
    label: "RTI",
    parentFlag: "rejected",
    parentLabel: "Rejected",
    startLog: "An RTI (Right to Information) process has been started for your case.",
    outcomes: [
      { value: "reply_received", label: "Reply received" },
      { value: "no_reply", label: "No reply" },
      { value: "withdrawn", label: "Withdrawn" },
    ],
  },
  consumerCourt: {
    key: "consumerCourt",
    label: "Consumer Court",
    parentFlag: "rejected",
    parentLabel: "Rejected",
    startLog: "Consumer Court process has been started for your case.",
    outcomes: [
      { value: "won", label: "Won" },
      { value: "lost", label: "Lost" },
      { value: "settled", label: "Settled" },
      { value: "withdrawn", label: "Withdrawn" },
    ],
  },
};

export const POST_OUTCOME_KEYS = Object.keys(POST_OUTCOME_STAGES);

const AMOUNT_OUTCOMES = {
  additionalCompensation: ["received"],
  consumerCourt: ["won", "settled"],
};

function stageOf(key) {
  const stage = POST_OUTCOME_STAGES[key];
  if (!stage) throw new Error(`Unknown stage: ${key}`);
  return stage;
}

export function stageStatusText(key) {
  return `${stageOf(key).label} In Progress`;
}

export function outcomeLabel(key, outcome) {
  return stageOf(key).outcomes.find((o) => o.value === outcome)?.label || "";
}

export function outcomeTakesAmount(key, outcome) {
  return (AMOUNT_OUTCOMES[key] || []).includes(outcome);
}

export function isStageActive(case_, key) {
  const stage = stageOf(key);
  return case_?.[stage.parentFlag] === true && case_?.[key] === true && case_?.[`${key}Closed`] !== true;
}

export function isStageClosed(case_, key) {
  return case_?.[key] === true && case_?.[`${key}Closed`] === true;
}

export function canStartStage(case_, key) {
  return case_?.[stageOf(key).parentFlag] === true && !isStageActive(case_, key);
}

/** Blank -> null, otherwise a non-negative number. Throws on anything else so bad input never reaches Firestore. */
export function parseAmount(value) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const n = Number(String(value).replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n < 0) throw new Error("Enter a valid amount (numbers only).");
  return n;
}

function appendLog(list, date, remark) {
  return [...(Array.isArray(list) ? list : []), { date, remark }];
}

export function buildStartUpdate(key, case_, input = {}, now = new Date().toISOString()) {
  const stage = stageOf(key);
  if (case_?.[stage.parentFlag] !== true) {
    throw new Error(`Only ${stage.parentLabel} cases can start ${stage.label}.`);
  }
  if (isStageActive(case_, key)) {
    throw new Error(`${stage.label} is already in progress for this case.`);
  }

  const update = {
    [key]: true,
    [`${key}Date`]: now,
    [`${key}Closed`]: false,
    [`${key}ClosedDate`]: "",
    [`${key}Outcome`]: "",
    [`${key}OutcomeNote`]: "",
    status: stageStatusText(key),
    mainLogs: appendLog(case_.mainLogs, now, stage.startLog),
    lastUpdated: now,
  };

  if (key === "additionalCompensation") {
    const received = parseAmount(input.amountReceived);
    const claimed = parseAmount(input.extraClaimed);
    if (received !== null) update.claim = received;
    update.additionalCompensationClaimed = claimed === null ? "" : claimed;
    update.additionalCompensationReceived = "";
  }

  const note = String(input.note || "").trim();
  if (note) update[`${key}Logs`] = appendLog(case_[`${key}Logs`], now, note);

  return update;
}

export function buildEndUpdate(key, case_, outcome, input = {}, now = new Date().toISOString()) {
  const stage = stageOf(key);
  if (!isStageActive(case_, key)) {
    throw new Error(`${stage.label} is not in progress for this case.`);
  }
  const chosen = stage.outcomes.find((o) => o.value === outcome);
  if (!chosen) throw new Error(`Pick how ${stage.label} ended.`);

  const note = String(input.note || "").trim();
  const update = {
    [`${key}Closed`]: true,
    [`${key}ClosedDate`]: now,
    [`${key}Outcome`]: outcome,
    [`${key}OutcomeNote`]: note,
    mainLogs: appendLog(case_.mainLogs, now, `${stage.label}: ${chosen.label}.`),
    lastUpdated: now,
  };

  // If the other Rejected-side stage is still running, the customer-visible status should keep saying so.
  const stillRunning = POST_OUTCOME_KEYS.find((k) => k !== key && isStageActive(case_, k));
  update.status = stillRunning ? stageStatusText(stillRunning) : `${stage.label} - ${chosen.label}`;

  if (outcomeTakesAmount(key, outcome)) {
    const amount = parseAmount(input.amountReceived);
    if (key === "additionalCompensation") {
      if (amount === null) throw new Error("Enter the extra compensation received.");
      update.additionalCompensationReceived = amount;
    } else if (amount !== null) {
      update.consumerCourtAmountReceived = amount;
    }
  }

  if (note) update[`${key}Logs`] = appendLog(case_[`${key}Logs`], now, note);

  return update;
}

export function buildAmountsUpdate(case_, input = {}, now = new Date().toISOString()) {
  const update = { lastUpdated: now };
  const received = parseAmount(input.amountReceived);
  const claimed = parseAmount(input.extraClaimed);
  if (received !== null) update.claim = received;
  if (claimed !== null) update.additionalCompensationClaimed = claimed;
  return update;
}

export function buildLogUpdate(key, case_, remark, now = new Date().toISOString()) {
  const text = String(remark || "").trim();
  if (!text) throw new Error("Write a note first.");
  return { [`${key}Logs`]: appendLog(case_[`${key}Logs`], now, text) };
}

/** Short labels for the Solved / Rejected cards: finished and running stages. */
export function badgesFor(case_) {
  const badges = [];
  for (const key of POST_OUTCOME_KEYS) {
    const stage = POST_OUTCOME_STAGES[key];
    if (isStageClosed(case_, key)) {
      const label = outcomeLabel(key, case_[`${key}Outcome`]);
      badges.push({ key, text: label ? `${stage.label}: ${label}` : `${stage.label}: closed`, tone: "done" });
    } else if (isStageActive(case_, key)) {
      badges.push({ key, text: `${stage.label}: in progress`, tone: "active" });
    }
  }
  return badges;
}

export function sortByStageDate(cases, key) {
  const time = (c) => {
    const t = new Date(c?.[`${key}Date`]).getTime();
    return Number.isNaN(t) ? 0 : t;
  };
  return [...cases].sort((a, b) => time(b) - time(a));
}
