/**
 * The decision queue.
 *
 * Every string and number here is transcribed from handoff v4 Part III. Nothing
 * is generated, and nothing is rounded: the finding rows add up to the headline
 * figure on purpose, because a table whose totals do not reconcile is the exact
 * thing that makes a recommendation read as an unsupported AI claim.
 *
 * The shape is deliberately flat and content-shaped rather than goal-shaped.
 * These used to live inside `goals.js`, hanging off check-ins and conditions
 * from the retired goals model, which had no room for a symptom, a scope line,
 * or actual offending rows.
 *
 * Urgency and lifecycle are separate axes and must stay that way. Urgency is
 * how soon this should be decided; lifecycle is where the decision has got to.
 * Collapsing them is what produced a queue where a deferred item read as
 * "acted".
 */

export const URGENCY = {
  "act-now": { key: "act-now", label: "Act now" },
  "this-week": { key: "this-week", label: "This week" },
  monitor: { key: "monitor", label: "Monitor" },
};

export const LIFECYCLE = {
  "needs-decision": { key: "needs-decision", label: "Needs your decision" },
  approved: { key: "approved", label: "Approved" },
  applying: { key: "applying", label: "Applying" },
  applied: { key: "applied", label: "Applied" },
  confirmed: { key: "confirmed", label: "Confirmed in platform" },
  "impact-ready": { key: "impact-ready", label: "Impact assessed" },
  held: { key: "held", label: "On hold" },
  rejected: { key: "rejected", label: "Rejected" },
  superseded: { key: "superseded", label: "Superseded" },
  expired: { key: "expired", label: "Expired" },
  failed: { key: "failed", label: "Failed" },
};

const ITEMS = [
  {
    id: "rec-wasted-spend-01",
    workflowId: "wasted-spend",
    agent: "demand",
    urgency: "act-now",
    lifecycle: "needs-decision",
    scope: "2 campaigns",
    run: { n: "08", at: "Sep 1, 7:02 AM" },
    title: "Add 14 negative keywords to block irrelevant search traffic",
    basis: "$2,310 of last month's $9,800 search spend went to queries with zero fit.",
    changeTitle: "Add 14 negative keywords to two campaigns",
    changeCols: ["Campaign", "Negatives to add", "Wasted spend cut"],
    changeRows: [
      ["Brand + Generic Search", '"free", "salary", "jobs", "course", "template" +4 more', "$1,480/mo"],
      ["Competitor Conquest", '"login", "pricing calculator", "support" +2 more', "$830/mo"],
    ],
    entities: "14 negative keywords",
    projection: "Spend on the blocked queries after the change: $0 per month.",
    guardrail: "Negatives are checked against the approved product and brand exception list before anything is added.",
    checkResult: "Sep 15",
    when: "Apply the change today because these queries currently spend about $77 per day.",
    expected: "Redirect 24% of search spend toward queries that have produced qualified outcomes.",
    needsFromYou: null,
    symptom: "Search spend increased 12% during the last 30 days while CRM-qualified outcomes remained flat.",
    examined:
      "The workflow analyzed 1,240 queries and $9,800 of spend from the last 30 days, then used 90 days of CRM history containing 312 outcomes to judge query quality.",
    findingCols: ["Query", "Spend", "Clicks", "Qualified outcomes"],
    findingRows: [
      ['"free crm template"', "$312", "41", "0"],
      ['"marketing manager salary"', "$288", "37", "0"],
      ['"crm course online"', "$245", "29", "0"],
      ['"competitor login"', "$198", "52", "0"],
      ["+10 more queries", "$1,267", "176", "0"],
    ],
    therefore:
      "These 14 terms consumed $2,310, or 24% of search spend, without producing a qualified outcome. Add them as negatives to the two campaigns listed above.",
  },
  {
    id: "rec-spend-to-pipeline-01",
    workflowId: "spend-to-pipeline",
    agent: "measurement",
    urgency: "this-week",
    lifecycle: "needs-decision",
    scope: "2 campaigns",
    run: { n: "11", at: "Sep 1" },
    title: "Move $7.4K/mo from CISO Cold Outreach to CISO Webinar Retargeting",
    basis:
      "Retargeting produces 2.1 times more qualified pipeline per dollar. Cold Outreach recorded 46 platform conversions but created only 5 qualified opportunities.",
    changeTitle: "The move",
    changeCols: ["Campaign", "Now", "Change", "After"],
    changeRows: [
      ["CISO Cold Outreach Q3", "$18.4K/mo", "−$7.4K", "$11.0K/mo"],
      ["CISO Webinar Retargeting", "$6.7K/mo", "+$7.4K", "$14.1K/mo"],
    ],
    entities: "$7,400 per month",
    projection: "After the change: Cold Outreach $11.0K/mo, Webinar Retargeting $14.1K/mo.",
    guardrail: "Retargeting frequency stays below the approved cap of 4.5 and the source campaign stays above its learning floor.",
    checkResult: "Sep 15",
    when: "Apply the move before Monday's budget refresh.",
    expected:
      "Add about $28,000 in influenced pipeline per quarter without increasing total spend. The workflow will measure the result after 14 days.",
    needsFromYou: null,
    symptom: "Qualified pipeline is pacing at 68% of target even though total spend is on plan.",
    examined:
      "The workflow analyzed six campaigns over 90 days and joined platform conversions to CRM opportunity stages. It excluded conversions that had not completed the 30-day maturity window.",
    findingCols: ["Campaign", "Spend (90d)", "Platform conv.", "Qualified opps", "Pipeline per $1K"],
    findingRows: [
      ["CISO Webinar Retargeting", "$20.1K", "61", "11", "$4.2K"],
      ["CISO Cold Outreach Q3", "$55.2K", "46", "5", "$2.0K"],
      ["+4 more campaigns", "$61.0K", "88", "9", "$2.6K"],
    ],
    therefore:
      "Retargeting produces 2.1 times more pipeline per dollar and its current frequency of 3.1 remains below the approved cap of 4.5. Move $7,400 per month as shown above.",
  },
  {
    id: "rec-delivery-leaks-01",
    workflowId: "delivery-leaks",
    agent: "delivery",
    urgency: "this-week",
    lifecycle: "needs-decision",
    scope: "2 campaigns",
    run: { n: "06", at: "Sep 1" },
    title: "Pause low-performing hours and locations in two campaigns",
    basis:
      "The flagged hours and locations consumed 12% of the reviewed spend but produced only one conversion in 90 days.",
    changeTitle: "Two schedule changes, one geo change",
    changeCols: ["Campaign", "Change"],
    changeRows: [
      ["US Pipeline Prospecting", "Pause delivery from 12 a.m. to 6 a.m. on weekdays and throughout Sunday"],
      ["US Pipeline Prospecting", "Exclude Wyoming, Montana, and Alaska; concentrate spend on 12 converting metros"],
      ["Brand Search", "Pause Saturday 12 a.m. to 8 a.m."],
    ],
    entities: "3 delivery changes",
    projection: "Delivery continues in the 12 converting metros during business hours.",
    guardrail: "The 12 converting metros and business-hours delivery are left untouched.",
    checkResult: "Sep 15",
    when: "Apply the changes this week.",
    expected: "Redirect about $1,120 per month into hours and locations that have produced conversions.",
    needsFromYou: null,
    symptom:
      "The cost per conversion for US Pipeline Prospecting increased 19% in 60 days even though its bids and budget did not change.",
    examined:
      "The workflow analyzed $28,400 of spend and 214 conversions over 90 days by hour, day of week, and state.",
    findingCols: ["Segment", "Spend (90d)", "Conversions", "Cost/conv"],
    findingRows: [
      ["Weekdays, 12 a.m. to 6 a.m.", "$1,840", "1", "$1,840"],
      ["Sunday, all day", "$760", "0", "None"],
      // v4 prints ":" in this cell, which is a typo in the source table. Two
      // segments produced no conversions per the Therefore line, so it reads
      // "None" like the Sunday row above it.
      ["WY + MT + AK", "$760", "0", "None"],
      ["12 converting metros, business hours", "$19.8K", "201", "$99"],
    ],
    therefore:
      "The flagged segments consumed $3,360, or 12% of the reviewed spend. Their cost per conversion was up to 19 times the account average, and two segments produced no conversions. Apply the schedule and location changes listed above.",
  },
  {
    id: "rec-icp-guardrails-01",
    workflowId: "icp-guardrails",
    agent: "demand",
    urgency: "act-now",
    lifecycle: "needs-decision",
    scope: "4 campaigns",
    run: { n: "05", at: "Sep 1, 7:04 AM" },
    title: "Exclude 12 off-ICP attributes from four campaigns",
    basis:
      "These attributes received 18% of impressions across four campaigns even though they fall outside the approved ICP bands.",
    changeTitle: "Exclusions by campaign",
    changeCols: ["Campaign", "Exclude"],
    changeRows: [
      ["CISO Awareness Q3", "Titles: Revenue Manager, Billing Analyst · Industry: Hospitality"],
      ["Security Leaders ABM", "Titles: IT Support Specialist, Help Desk · Seniority: Entry"],
      ["Webinar Promo", "Function: Administrative · Company size: 1–10"],
      ["Retargeting Pool", "Titles: Student, Intern · Function: Education"],
    ],
    revision: {
      title: "Exclude 11 off-ICP attributes from four campaigns",
      basis:
        "These attributes received 17.8% of impressions across four campaigns even though they fall outside the approved ICP bands.",
      entities: "11 title attributes",
      expected: "Shift about $2,900 per month of delivery toward ICP-aligned titles.",
      needsFromYou: null,
      awaitingYou: false,
      changeRows: [
        ["CISO Awareness Q3", "Titles: Billing Analyst · Industry: Hospitality"],
        ["Security Leaders ABM", "Titles: IT Support Specialist, Help Desk · Seniority: Entry"],
        ["Webinar Promo", "Function: Administrative · Company size: 1–10"],
        ["Retargeting Pool", "Titles: Student, Intern · Function: Education"],
      ],
      findingRows: [
        ["Title: IT Support Specialist / Help Desk", "128K", "6.7%", "Outside"],
        ["Function: Administrative", "94K", "4.9%", "Outside"],
        ["Industry: Hospitality", "61K", "3.2%", "Outside"],
        ["Titles: Student / Intern", "44K", "2.3%", "Outside"],
        ["+7 more attributes", "11K", "0.7%", "Outside"],
      ],
      therefore:
        "Eleven attributes accounted for 17.8% of paid reach outside the approved ICP. Revenue Manager stays targeted at your instruction and is no longer proposed for exclusion.",
      changed: "Revenue Manager removed from the exclusion list. 12 attributes became 11, and projected off-ICP reach fell from 18% to 17.8%.",
    },
    entities: "12 title attributes",
    projection: "Projected audience after change: 58K to 64K.",
    guardrail: "Projected audience stays above LinkedIn's minimum for all four campaigns.",
    checkResult: "Sep 15",
    when: "Apply the confirmed exclusions today before the daily 7 a.m. run.",
    expected: "Shift about $3,100 per month of delivery toward ICP-aligned titles.",
    needsFromYou:
      "Confirm whether Revenue Manager belongs in the secondary RevOps buyer group before Petavue excludes it.",
    awaitingYou: true,
    symptom: "LinkedIn engagement remained steady, but the SQL rate per 1,000 impressions fell 22% this quarter.",
    examined:
      "The workflow scored 1.9 million impressions from four campaigns over 30 days against the approved title, seniority, function, industry, and company-size bands.",
    findingCols: ["Attribute", "Impressions", "Share", "ICP band"],
    findingRows: [
      ["Title: IT Support Specialist / Help Desk", "128K", "6.7%", "Outside"],
      ["Function: Administrative", "94K", "4.9%", "Outside"],
      ["Industry: Hospitality", "61K", "3.2%", "Outside"],
      ["Titles: Student / Intern", "44K", "2.3%", "Outside"],
      ["+8 more attributes", "15K", "0.9%", "Outside"],
    ],
    therefore:
      "Twelve attributes accounted for 18% of paid reach outside the approved ICP. Exclude the confirmed attributes from the campaigns listed above.",
  },
  {
    id: "rec-icp-guardrails-02",
    workflowId: "icp-guardrails",
    agent: "demand",
    urgency: "this-week",
    lifecycle: "needs-decision",
    scope: "2 campaigns",
    run: { n: "05", at: "Sep 1, 7:04 AM" },
    title: "Add 9 buyer titles to two LinkedIn Ads campaigns",
    basis:
      "At least one contact on 61% of won deals holds a title that none of the four live campaigns currently target.",
    changeTitle: "Add the titles to two campaigns",
    changeCols: ["Campaign", "Titles to add"],
    changeRows: [
      [
        "CISO Awareness Q3",
        "Director of GRC, Head of Security Compliance, VP Information Security, IT Risk Manager, and 2 more",
      ],
      ["Security Leaders ABM", "Director of GRC, IT Risk Manager, and 3 more"],
    ],
    entities: "9 buyer titles",
    projection: "Forecast adds about 340,000 ICP-aligned impressions per month.",
    guardrail: "Both campaigns passed the audience-size forecast before the titles are added.",
    checkResult: "Sep 8",
    when: "Apply the change this week. The next daily run will score the updated audiences.",
    expected:
      "Allow the campaigns to reach titles that appeared on 61% of historical won deals. Petavue will measure the SQL rate per 1,000 impressions after the change.",
    needsFromYou: "No additional input is required because both campaigns passed the audience-size forecast.",
    symptom: "The SQL rate per 1,000 impressions fell 22% this quarter while total reach increased.",
    examined:
      "The workflow compared title fields from 214 contacts attached to won deals over 24 months with the targeting definitions of all four live campaigns.",
    findingCols: ["Title on won deals", "Deals it appears on", "Currently targeted?"],
    findingRows: [
      ["Director of GRC", "31", "No"],
      ["Head of Security Compliance", "24", "No"],
      ["VP Information Security", "19", "No"],
      ["IT Risk Manager", "14", "No"],
      ["+5 more titles", "43", "No"],
    ],
    therefore:
      "Nine titles found on won deals are available for targeting in LinkedIn Ads but are missing from the live campaigns. Add them to the two awareness campaigns. At current budgets, the forecast adds about 340,000 ICP-aligned impressions per month.",
  },
  {
    id: "rec-audience-sharpening-01",
    workflowId: "audience-sharpening",
    agent: "delivery",
    urgency: "act-now",
    lifecycle: "needs-decision",
    scope: "8 accounts",
    run: { n: "09", at: "Sep 1" },
    title: "Cap 8 saturated accounts at 200 impressions per week",
    basis: "8 accounts took 41% of impressions; 63 tier-1 targets got fewer than 50 each.",
    changeTitle: "The caps, refreshed daily by the workflow",
    changeCols: ["Action", "Accounts"],
    changeRows: [
      ["Cap at 200 imp/week", "Accenture, TCS, Infosys +5 (already engaged, no new pipeline in 60d)"],
      ["Release budget toward", "63 tier-1 accounts currently under 50 imp/week (list attached)"],
    ],
    entities: "8 account caps",
    projection: "Tier-one coverage after change: about 70%, up from 37%.",
    guardrail: "Accounts with an open opportunity or an active sales sequence are never capped.",
    checkResult: "Sep 8",
    when: "Apply the caps today. The workflow will recalculate them at 7 a.m. each day.",
    expected: "Increase tier-one account coverage from 37% to about 70% within two weeks.",
    needsFromYou: null,
    symptom:
      "Sixty-three of 170 tier-one target accounts received almost no ad exposure even though the campaigns spent their full budgets.",
    examined: "The workflow analyzed 840,000 impressions delivered to the 170-account target list over 30 days.",
    findingCols: ["Account group", "Accounts", "Impressions", "Share", "New pipeline (60d)"],
    findingRows: [
      ["Accenture, TCS, Infosys +5", "8", "344K", "41%", "$0"],
      ["Mid-exposure targets", "99", "462K", "55%", "$210K"],
      ["Under-served tier-1 (<50 imp/wk)", "63", "34K", "4%", "None"],
    ],
    therefore:
      "Eight already-engaged accounts absorbed 41% of reach and produced no new pipeline in 60 days. Cap them at 200 impressions per week and release delivery to the 63 under-served tier-one accounts.",
  },
  {
    id: "rec-sales-handoff-01",
    workflowId: "sales-handoff",
    agent: "conversion",
    urgency: "this-week",
    lifecycle: "needs-decision",
    scope: "14 accounts",
    run: { n: "04", at: "Sep 1" },
    title: "Send 14 high-intent accounts to the selected sales queue",
    basis:
      "All 14 accounts visited high-intent pages at least twice in 14 days and passed the approved composite score for contact engagement and recency.",
    changeTitle: "The list, ranked",
    changeCols: ["Rank", "Account", "Signal"],
    changeRows: [
      ["1", "Meridian Health", "Pricing page ×3, 4 engaged contacts, demo video 80%"],
      ["2", "Corville Logistics", "Comparison page ×2, CISO engaged twice"],
      ["3–14", "+12 more", "Full ranked list in the export"],
    ],
    entities: "14 accounts",
    projection: "14 tasks created in the HubSpot queue you select.",
    guardrail: "Customers, open opportunities and accounts contacted in the last 21 days stay excluded.",
    checkResult: "Sep 8",
    when: "Send the accounts this week while the activity is recent.",
    expected:
      "Give sales 14 qualified account handoffs instead of the roughly three weekly handoffs created by form fills alone.",
    needsFromYou:
      "Select the HubSpot destination, either the SDR round-robin queue or the named account executive queue.",
    awaitingYou: true,
    symptom:
      "Only about three accounts per week reach sales through form fills even though traffic to high-intent pages continues to grow.",
    examined:
      "The workflow analyzed 14 days of web sessions, LinkedIn Ads engagement, and contact activity for 170 target accounts. Two or more high-intent visits were required. Contact depth and recency contributed to the composite score.",
    findingCols: ["Signal threshold", "Accounts hitting it"],
    findingRows: [
      ["2+ high-intent page visits in 14 days", "31"],
      ["Passed the composite engagement and recency score", "23"],
      ["Already in an open opportunity (excluded)", "9"],
      ["Net-new accounts ready for sales", "14"],
    ],
    therefore:
      "Twenty-three accounts passed the composite score. Nine already had open opportunities, so Petavue excluded them. Send the remaining 14 accounts to sales in the ranked order shown above.",
  },
  {
    id: "rec-icp-guardrails-closed",
    workflowId: "icp-guardrails",
    agent: "demand",
    urgency: "act-now",
    lifecycle: "impact-ready",
    scope: "1 campaign",
    run: { n: "03", at: "Aug 29" },
    decidedAt: "Aug 29",
    readback: "LinkedIn Ads returned audience version 14 at 11:42 AM on Aug 29 and it matched the approved list.",
    impact: {
      verdict: "improved",
      measuredAt: "Sep 1",
      detail: "Spend on the excluded titles was $0 and CTR from ICP titles increased 14%.",
    },
    title: "Exclude Student and Intern titles from Retargeting Pool",
    basis: "Student and Intern titles took paid reach in a campaign meant for security decision makers.",
    changeTitle: "Exclusion applied",
    changeCols: ["Campaign", "Excluded"],
    changeRows: [["Retargeting Pool", "Titles: Student, Intern"]],
    when: "Applied Aug 29 after your approval.",
    expected: "Move delivery away from titles that cannot buy.",
    needsFromYou: null,
    symptom: "Retargeting Pool reached Student and Intern titles at a rising share of impressions.",
    examined: "The workflow scored 30 days of Retargeting Pool delivery against the approved ICP bands.",
    findingCols: ["Attribute", "Impressions", "Share", "ICP band"],
    findingRows: [["Titles: Student / Intern", "44K", "2.3%", "Outside"]],
    therefore: "Both titles sit outside the approved ICP. Exclude them from Retargeting Pool.",
  },
  {
    id: "rec-spend-to-pipeline-closed",
    workflowId: "spend-to-pipeline",
    agent: "measurement",
    urgency: "this-week",
    lifecycle: "rejected",
    scope: "2 campaigns",
    run: { n: "09", at: "Aug 18" },
    decidedAt: "Aug 18",
    note: "Cold Outreach protected for event promo until Sep 15.",
    carried: "Runs 10 and 11 preserved this constraint.",
    title: "Move $5.2K/mo out of CISO Cold Outreach",
    basis: "Cold Outreach was below the account benchmark for cost per SQL at the time of the run.",
    changeTitle: "The proposed move",
    changeCols: ["Campaign", "Change"],
    changeRows: [["CISO Cold Outreach Q3", "−$5.2K/mo"], ["CISO Webinar Retargeting", "+$5.2K/mo"]],
    when: "Proposed Aug 18.",
    expected: "Shift budget toward the campaign creating more qualified pipeline per dollar.",
    needsFromYou: null,
    symptom: "Cold Outreach cost per SQL sat above the account benchmark for three consecutive weeks.",
    examined: "The workflow compared six campaigns over 90 days on cost per SQL.",
    findingCols: ["Campaign", "Cost per SQL", "vs benchmark"],
    findingRows: [["CISO Cold Outreach Q3", "$11.0K", "Above"], ["CISO Webinar Retargeting", "$5.0K", "Below"]],
    therefore: "Cold Outreach cost more per SQL than the benchmark. Move budget to the stronger campaign.",
  },
  {
    id: "rec-sales-handoff-closed",
    workflowId: "sales-handoff",
    agent: "conversion",
    urgency: "this-week",
    lifecycle: "impact-ready",
    scope: "11 accounts",
    run: { n: "03", at: "Aug 25" },
    decidedAt: "Aug 25",
    readback: "HubSpot returned task IDs for all 11 accounts in the SDR round-robin queue.",
    impact: {
      verdict: "improved",
      measuredAt: "Sep 1",
      detail: "Sales booked four meetings during the first week.",
    },
    title: "Send 11 high-intent accounts to the SDR round-robin queue",
    basis: "Eleven accounts passed the approved composite score and had no open opportunity.",
    changeTitle: "Accounts pushed to HubSpot",
    changeCols: ["Destination", "Accounts"],
    changeRows: [["SDR round-robin queue", "11 accounts, one task each"]],
    when: "Applied Aug 25 after your approval.",
    expected: "Give sales qualified handoffs while the activity is recent.",
    needsFromYou: null,
    symptom: "High-intent page traffic was growing while form fills produced about three handoffs a week.",
    examined: "The workflow scored 14 days of activity for 170 target accounts.",
    findingCols: ["Signal threshold", "Accounts hitting it"],
    findingRows: [["Passed the composite score", "20"], ["Already in an open opportunity (excluded)", "9"], ["Net-new accounts sent", "11"]],
    therefore: "Eleven accounts passed the score with no open opportunity. Send them to the selected queue.",
  },
  {
    // Demo content, not from the handoff: Part II's three closed-loop examples
    // all improved, so nothing there exercises an inconclusive verdict. This
    // card exists to show that Petavue will say "we cannot tell yet" rather
    // than claim a win it cannot separate from another change.
    id: "rec-delivery-leaks-closed",
    workflowId: "delivery-leaks",
    agent: "delivery",
    urgency: "this-week",
    lifecycle: "impact-ready",
    scope: "1 campaign",
    run: { n: "03", at: "Aug 13" },
    decidedAt: "Aug 13",
    readback: "Google Ads returned the saved ad schedule for US Pipeline Prospecting and it matched the approved hours.",
    impact: {
      verdict: "confounded",
      measuredAt: "Sep 1",
      detail:
        "Cost per conversion fell 18% in the affected hours, but the campaign moved to a new bid strategy on Aug 15, inside the same measurement window. Petavue cannot separate the two changes, so this result is not counted.",
    },
    title: "Pause overnight delivery on US Pipeline Prospecting",
    basis: "Overnight hours took 7% of the campaign's spend and produced no conversions in 60 days.",
    changeTitle: "Schedule applied",
    changeCols: ["Campaign", "Change"],
    changeRows: [["US Pipeline Prospecting", "Pause delivery 1 a.m. to 5 a.m. on weekdays"]],
    when: "Applied Aug 13 after your approval.",
    expected: "Move overnight spend into hours that have produced conversions.",
    needsFromYou: null,
    symptom: "Overnight delivery continued at full bids while producing no conversions for two months.",
    examined: "The workflow analyzed 60 days of delivery for US Pipeline Prospecting by hour of day.",
    findingCols: ["Segment", "Spend (60d)", "Conversions", "Cost/conv"],
    findingRows: [
      ["Weekdays, 1 a.m. to 5 a.m.", "$1,190", "0", "None"],
      ["All other hours", "$15.8K", "148", "$107"],
    ],
    therefore:
      "Overnight hours took 7% of spend and produced nothing. Pause them and let the budget run in converting hours.",
  },
];

// In-memory, like the rest of the mock layer: decisions survive navigation but
// not a reload. Kept as a separate map so the transcribed content above is
// never mutated by a demo click.
const decisions = new Map();

const APPLY_STAGES = [
  { at: 0, lifecycle: "approved" },
  { at: 1200, lifecycle: "applying" },
  { at: 3000, lifecycle: "applied" },
  { at: 4800, lifecycle: "confirmed" },
];

function withApplyStage(rec) {
  if (!rec.approvedAt) return rec;
  const elapsed = Date.now() - rec.approvedAt;
  const stage = [...APPLY_STAGES].reverse().find((s) => elapsed >= s.at) || APPLY_STAGES[0];
  return { ...rec, lifecycle: stage.lifecycle };
}

export function listRecommendations() {
  return ITEMS.map((r) => withApplyStage({ ...r, ...(decisions.get(r.id) || {}) }));
}

/**
 * Add context and rerun. The original is marked Superseded and a revised copy
 * takes its place in the queue: the customer's constraint is visible in the
 * audit trail rather than silently editing the recommendation they rejected.
 */
export function addContext(id, note) {
  const item = ITEMS.find((r) => r.id === id);
  if (!item) return null;
  decisions.set(id, { lifecycle: "superseded", note: note || null, decidedAt: "Just now" });
  const revised = {
    ...item,
    // A rerun that produces an identical card has not reran anything. Where a
    // card defines what the rerun finds, the revised version carries it.
    ...(item.revision || {}),
    revision: undefined,
    id: `${item.id}-revised`,
    supersedes: item.id,
    context: note || null,
    changed: item.revision?.changed || null,
    lifecycle: "needs-decision",
  };
  if (!ITEMS.find((r) => r.id === revised.id)) ITEMS.splice(ITEMS.indexOf(item) + 1, 0, revised);
  return revised;
}

/**
 * Proposing a test is not a decision on the change: the card stays in the queue
 * and the test state runs on its own axis beside the lifecycle.
 */
export function proposeTest(id) {
  const item = ITEMS.find((r) => r.id === id);
  if (!item) return null;
  const prev = decisions.get(id) || {};
  decisions.set(id, { ...prev, test: "proposed" });
  return { ...item, ...decisions.get(id) };
}

export function decide(id, lifecycle, note) {
  const item = ITEMS.find((r) => r.id === id);
  if (!item) return null;
  const entry = { lifecycle, note: note || null, decidedAt: "Just now" };
  if (lifecycle === "approved") entry.approvedAt = Date.now();
  decisions.set(id, entry);
  return withApplyStage({ ...item, ...entry });
}

/**
 * Counts for the queue chips, one per workflow in workflow order, including the
 * workflows with nothing pending. A zero is information: it says the workflow
 * ran and found nothing worth changing.
 */
export function pendingCountsByWorkflow(workflowIds) {
  const open = listRecommendations().filter((r) => r.lifecycle === "needs-decision");
  const counts = {};
  for (const id of workflowIds) counts[id] = open.filter((r) => r.workflowId === id).length;
  return counts;
}
