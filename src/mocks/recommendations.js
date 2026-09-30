/**
 * The decision queue.
 *
 * Content source: doc 17 section 6 (the six pending cards, verbatim) and its
 * Lifecycle examples (the five closed cards), with the decision/comments model
 * from doc 19. Nothing is generated and nothing is rounded: finding rows add
 * up to headline figures on purpose.
 *
 * Decision model (doc 19 section 1): Accept, Reject, Hold — nothing else.
 * A decision stores who, when, and the note; notes also land in the comments
 * thread with a label. General comments change no state. Seeded decisions
 * belong to Maya Iyer, the demo mock user; anything decided in-session is
 * authored by the signed-in user.
 */
import { currentUser } from "./db";

export const URGENCY = {
  "act-now": { key: "act-now", label: "Act now" },
  "this-week": { key: "this-week", label: "This week" },
  monitor: { key: "monitor", label: "Monitor" },
};

export const DECISION = {
  accepted: { key: "accepted", label: "Accepted" },
  rejected: { key: "rejected", label: "Rejected" },
  "on-hold": { key: "on-hold", label: "On hold" },
};

export const TYPE = {
  change: { key: "change", label: "Change" },
  test: { key: "test", label: "Test" },
  handoff: { key: "handoff", label: "Handoff" },
};

const NOTE_LABEL = {
  accepted: "Note added when accepted",
  rejected: "Reason given when rejected",
  "on-hold": "Note added when put on hold",
};

const stamp = (d = new Date()) => {
  const mo = d.toLocaleString("en-US", { month: "short" });
  let h = d.getHours();
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${mo} ${d.getDate()}, ${h}:${String(d.getMinutes()).padStart(2, "0")} ${ap}`;
};

/* The full lists behind the ranked tables. The Apply modal shows every
   account it would act on, so each one can be seen and unticked. */
const ROUTED_ACCOUNTS = [
  "Meridian Health",
  "Corville Logistics",
  "Brightline Retail",
  "Pinecrest Insurance",
  "Aldermoor Health",
  "Kestrel Freight",
  "Ravenwood Retail",
  "Summitline Software",
  "Bluewater Claims",
  "Oakhaven Medical",
  "Northgate Supply",
  "Copperfield Systems",
  "Harborview Health",
  "Lattice Freightworks",
];

const LOOKALIKE_ACCOUNTS = [
  "Halden Medical Group",
  "Northway Freight",
  "Stratus Claims",
  "Ashford Health",
  "Bramblewood Freight",
  "Cedarline Insurance",
  "Driftwood Medical Group",
  "Everline Logistics",
  "Fairhaven Mutual",
  "Glenmoor Care Partners",
  "Hollis Transport",
  "Ironbridge Claims Services",
  "Juniper Software",
  "Kingsway Health Systems",
  "Larkspur Supply Chain",
  "Millbrook Assurance",
  "Northfield Analytics",
  "Orchardgate Clinics",
  "Parkline Distribution",
  "Quarrystone Risk Partners",
  "Redfern Data",
  "Silverlake Health",
  "Thornbury Freight",
  "Upland Insurance",
  "Valemont Medical Group",
  "Westbrook Logistics",
  "Yarrow Mutual",
  "Amberley Care Partners",
  "Birchwood Transport",
  "Coldspring Claims Services",
  "Dunmore Software",
  "Elmhurst Health Systems",
  "Foxglove Supply Chain",
  "Graniteview Assurance",
  "Ivywood Analytics",
  "Jasperline Clinics",
  "Kinsley Distribution",
  "Lindenwood Risk Partners",
  "Marlowe Data",
  "Pembrook Health",
  "Quillon Freight",
  "Rosemont Insurance",
  "Stonegate Medical Group",
  "Tidewater Logistics",
  "Verity Mutual",
  "Willowbrook Care Partners",
  "Wexford Transport",
  "Ardentis Claims Services",
  "Brightwater Software",
  "Clearbrook Health Systems",
  "Deerfield Supply Chain",
  "Eastvale Assurance",
  "Fernhill Analytics",
  "Goldleaf Clinics",
  "Hawthorne Distribution",
  "Inverlane Risk Partners",
  "Keswick Data",
  "Lowmoor Health",
  "Meadowcroft Freight",
  "Newhaven Insurance",
];

const ITEMS = [
  /* ── The ABM and LinkedIn cards (Camunda demo, 30 Sep).
     Source: docs/Camunda Recommendations Demo.md. These four lead the queue.
     Recommendations 1 and 2 extend the earlier handoff and cap-raise cards;
     3 and 4 are new. Each carries the systems it updates on Accept, and the
     ones with a "Needs from you" carry that question as a choice the Accept
     modal asks, so the confirmation can say exactly what was done. ── */
  {
    id: "rec-bssh-01",
    workflowId: "sales-handoff",
    agent: "conversion",
    type: "handoff",
    urgency: "this-week",
    lifecycle: "needs-decision",
    scope: "170 accounts scored",
    run: { n: "04", at: "Sep 1, 8:01 AM" },
    awaitingYou: true,
    shortTitle: "ABM",
    title: "Route 14 warm accounts to sales now",
    basis:
      "They saw our LinkedIn ads, visited pricing pages, and resemble mid-funnel opportunities. They are warm and look like they are actively evaluating, so don’t wait for form fills and risk losing them to faster competitors.",
    changeTitle: "The list, ranked",
    changeCols: ["Rank", "Account", "Signal"],
    changeRows: [
      ["1", "Meridian Health", "Pricing page ×3, 4 engaged contacts (Finance, IT, Ops), LinkedIn ad clicks ×5"],
      ["2", "Corville Logistics", "Comparison page ×2, CISO engaged twice, 3-person committee forming"],
      ["3", "Brightline Retail", "Pricing + integrations pages, VP Ops watched demo 90%"],
      ["4–14", "+11 more", "Full ranked list in the export"],
    ],
    timing:
      "Route the accounts this week. Intent is highest in the 7–10 days after pricing and comparison visits, and most of these visits happened in the last 5 days.",
    expect:
      "Sales gets 14 warm, committee-level accounts at once, instead of the roughly three weekly handoffs that form fills produce today. Reps start with context on who is engaged and what they viewed.",
    controls:
      "Before routing, Petavue re-checks each account against existing customers, open opportunities, and the last 21 days of sales activity. If a conflict appears after this run, no duplicate handoff is created and the account’s owner stays the same.",
    followUp:
      "Sep 15. That run reports first sales touches, replies, and meetings booked for the 14 accounts, compared with the form-fill baseline.",
    needsFromYou: "Choose the Salesforce queue for the tasks: the SDR round-robin queue or the named account executive queue.",
    choice: {
      question: "Which Salesforce queue should the tasks go to?",
      options: [
        { id: "sdr", label: "SDR round-robin queue" },
        { id: "ae", label: "Named account executive queue" },
      ],
    },
    noticed:
      "Traffic to high-intent pages (pricing, comparison, integrations) keeps growing, but only about three accounts a week reach sales through form fills. Most accounts showing buying behavior never fill out a form.",
    analyzed:
      "The workflow reviewed 14 days of web sessions, LinkedIn Ads engagement, and contact activity for 170 target accounts. To qualify, an account needed at least two high-intent page visits. The composite score also weighed contact depth, meaning how many distinct people from the account were engaged, and how recent the activity was.",
    found:
      "14 of the 170 accounts qualified. Each had engagement from 3 or more contacts, usually from different functions, which suggests a buying committee is forming. 11 of the 14 first engaged through a LinkedIn ad before visiting pricing. None had submitted a form.",
    whyNow:
      "These accounts are comparing options now. Pricing and comparison visits usually come late in an evaluation, so waiting for inbound gives competitors the first conversation.",
    excluded:
      "We excluded existing customers, accounts with open opportunities, accounts contacted by sales in the last 21 days, and single-visitor accounts, which are often research or job-seeker traffic.",
    confidence:
      "Confidence is high on the top 5, which have strong multi-signal activity, and moderate on ranks 6–14, where activity is recent but lighter. Web identification relies on reverse-IP and known contacts, so some visitors may be missing from the counts.",
    trace: [
      { specialist: "Account Journey Builder", agent: "measurement", text: "resolved 14 days of web sessions, LinkedIn Ads engagement, and contact activity to the 170 target accounts, using reverse-IP and known contacts." },
      { specialist: "Buying Signal Scorer", agent: "conversion", text: "scored every account on high-intent visits, contact depth, and recency, and ranked the 14 that qualified." },
      { specialist: "Sales Eligibility Validator", agent: "demand", text: "removed existing customers, open opportunities, accounts sales contacted in the last 21 days, and single-visitor accounts." },
    ],
    changes: [
      {
        system: "Salesforce", kind: "Queue", ref: "14 new tasks",
        name: { sdr: "SDR round-robin queue", ae: "Named account executive queue" },
        groups: [
          { heading: "New tasks, ranked", tone: "neutral", rows: [
            { label: "Accounts (ranked)", chips: ROUTED_ACCOUNTS.map((a, i) => `${i + 1} · ${a}`) },
          ] },
        ],
        fields: [
          { field: "Task owner", now: "—", after: { sdr: "Round-robin across the SDR team", ae: "Each account’s named AE" } },
          { field: "Attached to each task", now: "—", after: "Signals, pages viewed, engaged contacts" },
        ],
      },
      {
        system: "HubSpot", kind: "Company list", name: "ABM · Routed to sales", ref: "#list 2231", state: "Active list",
        groups: [
          { heading: "Added to list", tone: "include", rows: [
            { label: "Companies", chips: ROUTED_ACCOUNTS },
          ] },
        ],
        fields: [{ field: "Marketing nurture", now: "Enrolled", after: "Paused while sales works the account" }],
      },
    ],
    decision: null,
    comments: [],
  },
  {
    id: "rec-tarb-02",
    workflowId: "audience-sharpening",
    agent: "demand",
    type: "change",
    urgency: "act-now",
    lifecycle: "needs-decision",
    scope: "2 of 23 capped accounts",
    run: { n: "51", at: "Sep 29, 7:00 AM" },
    shortTitle: "LinkedIn Impression caps",
    title: "Raise impression caps for Trellis Software and Beacon Insurance to 400/week",
    basis:
      "They are the only capped accounts with new contact engagement. New buying committee members just joined, so they need full reach to every decision-maker during this evaluation window, or we risk losing them to faster competitors.",
    changeTitle: "Caps to raise",
    changeCols: ["Rank", "Account", "Current cap → New cap", "Signal"],
    changeRows: [
      ["1", "Trellis Software", "150 → 400/week", "3 new contacts engaged (CFO, Head of RevOps, IT Director), cap hit by Wednesday 2 weeks running"],
      ["2", "Beacon Insurance", "150 → 400/week", "2 new contacts engaged (VP Claims, Procurement lead), pricing page ×2 this week"],
    ],
    timing:
      "Raise the caps today. The new contacts joined in the last 7 days, and at the current cap the weekly impressions run out mid-week, so these people see us for only half of each week.",
    expect:
      "Both accounts get full-week coverage. The ads reach the whole buying committee, including the new members, and not only the contacts who were already engaged. Across both accounts, weekly impressions should rise from about 300 to up to 800.",
    controls:
      "The increase applies only to these two accounts. Every other capped account keeps its current limit. Petavue checks frequency per contact daily and pulls back if any single person goes above 6 impressions a week, which keeps ad fatigue down. The higher caps revert automatically after 21 days unless you extend them.",
    followUp:
      "Oct 13. That run reports impressions delivered, reach across the committee, new contact engagement, and any movement into pricing or demo pages for both accounts.",
    needsFromYou:
      "Approve the extra spend, estimated at about $50/week across both accounts, and confirm whether it comes from the existing ABM campaign budget or a separate line.",
    choice: {
      question: "Where should the extra spend of about $50/week come from?",
      options: [
        { id: "abm", label: "The existing ABM campaign budget" },
        { id: "separate", label: "A separate budget line" },
      ],
    },
    noticed:
      "Several target accounts hit their LinkedIn impression cap early in the week. For most of them that’s fine, because engagement is flat. Trellis Software and Beacon Insurance are different: new people from both companies started engaging with our ads while the cap was limiting delivery.",
    analyzed:
      "The workflow reviewed 14 days of LinkedIn Ads delivery and engagement, web sessions, and contact-level activity for all 23 accounts that are currently capped. For each account it compared how quickly the cap was reached with changes in engagement, and it flagged contacts engaging for the first time in the last 7 days.",
    found:
      "Only 2 of the 23 capped accounts showed new contact engagement. Both hit their cap by Wednesday in each of the past two weeks. The new contacts are senior or budget-holding roles (finance, procurement, operations), which usually join an evaluation as it moves toward a decision. The other 21 capped accounts showed steady or declining engagement, so raising their caps would add spend without adding reach to new people.",
    whyNow:
      "When new stakeholders join, the buying committee is widening, and these people are forming their first impression of the vendors. With the current cap, they stop seeing us partway through each week, right when they are most likely to be comparing options.",
    excluded:
      "We left out capped accounts with no new contacts, accounts that are existing customers or have open opportunities, and engagement from contacts who could not be matched to a known role at the account.",
    confidence:
      "Confidence is high that the cap is limiting reach, since delivery stops mid-week consistently. Confidence is moderate that more impressions will turn into pipeline, because LinkedIn engagement signals intent but does not confirm it. Contact matching depends on LinkedIn’s company and job-title data, which may miss or mislabel some people.",
    trace: [
      { specialist: "Account Delivery Resolver", agent: "measurement", text: "matched 14 days of LinkedIn Ads delivery to the 23 capped accounts and recorded the day each one hit its cap." },
      { specialist: "Account Reach Monitor", agent: "demand", text: "flagged contacts engaging for the first time in the last 7 days and found them at only Trellis Software and Beacon Insurance." },
      { specialist: "Cap and Rotation Coordinator", agent: "delivery", text: "set the 400/week caps for the two accounts, the 6-per-person frequency ceiling, and the 21-day automatic revert." },
    ],
    changes: [
      {
        system: "LinkedIn Ads", kind: "Campaign", name: "ABM · Tier 1 target accounts", ref: "#512330871", state: "Active",
        fields: [
          { field: "Weekly cap · Trellis Software", now: "150 impressions", after: "400 impressions", edit: true },
          { field: "Weekly cap · Beacon Insurance", now: "150 impressions", after: "400 impressions", edit: true },
          { field: "Caps revert", now: "—", after: "{revert21}" },
        ],
      },
      {
        when: "abm",
        system: "LinkedIn Ads", kind: "Campaign group", name: "ABM · FY26", ref: "#735084746", state: "Active",
        fields: [{ field: "Weekly budget", now: "$2,800", after: "$2,850", edit: true, money: "week" }],
      },
      {
        when: "separate",
        system: "LinkedIn Ads", kind: "Campaign group", name: "ABM · Committee expansion", ref: "New", state: "Active on apply",
        launches: true,
        fields: [{ field: "Weekly budget", now: "—", after: "$50", edit: true, money: "week" }],
      },
      {
        system: "Salesforce", kind: "Accounts", name: "Trellis Software, Beacon Insurance", ref: "2 owners notified",
        groups: [
          { heading: "New contacts flagged to the account owner", tone: "neutral", rows: [
            { label: "Trellis Software", chips: ["CFO", "Head of RevOps", "IT Director"] },
            { label: "Beacon Insurance", chips: ["VP Claims", "Procurement lead"] },
          ] },
        ],
      },
    ],
    decision: null,
    comments: [],
  },
  {
    id: "rec-lbtt-01",
    workflowId: "icp-guardrails",
    agent: "demand",
    type: "change",
    urgency: "act-now",
    lifecycle: "needs-decision",
    scope: "$40K/month across 7 title groups",
    run: { n: "06", at: "Sep 29, 7:00 AM" },
    shortTitle: "Title Optimization and Reduce Leakage",
    title: "Shift LinkedIn budget to CIO, VP Ops, and VP Engineering",
    basis:
      "These 3 titles account for 68% of pipeline conversions but receive only 40% of budget. Reallocating $8K/month from underperforming titles could generate $150K–$300K in additional pipeline.",
    changeTitle: "Budget by title",
    changeCols: ["Title", "Share of conversions", "Current budget", "New budget", "Change"],
    changeRows: [
      ["VP Operations", "26%", "$6.0K", "$9.0K", "+$3.0K"],
      ["CIO", "22%", "$4.8K", "$7.2K", "+$2.4K"],
      ["VP Engineering", "20%", "$5.2K", "$7.8K", "+$2.6K"],
      ["IT Manager", "12%", "$10.0K", "$7.0K", "−$3.0K"],
      ["Marketing Manager", "4%", "$6.0K", "$3.5K", "−$2.5K"],
      ["Business Analyst", "3%", "$5.0K", "$2.5K", "−$2.5K"],
      ["Other titles", "13%", "$3.0K", "$3.0K", "No change"],
    ],
    scopeNote: "Total monthly spend stays at $40K. The three high-intent titles go from 40% to 60% of budget.",
    timing:
      "Reallocate today. Many buyers are setting Q4 budgets and 2027 plans right now, and the high-intent titles are the ones who own those decisions.",
    expect:
      "The same spend reaches more of the people who actually drive deals. Cost per lead may rise slightly, because senior audiences cost more per impression, but pipeline per dollar should improve. Over the next quarter, we estimate an additional $150K–$300K in pipeline.",
    controls:
      "Total spend stays the same; only the split changes. Each reduced title keeps a floor of at least $2.5K/month so we still reach champions and evaluators who influence deals. Petavue watches audience saturation daily. If frequency for a high-intent title goes above 6 impressions per person per week, the extra budget goes back to the reduced titles. If cost per opportunity for the high-intent titles rises more than 25% above baseline for two weeks, the change reverts.",
    followUp:
      "Oct 27. That run reports spend delivered by title, frequency, cost per lead, opportunities created, and early pipeline compared with the prior 4 weeks.",
    needsFromYou:
      "Approve the reallocation and confirm that the reduced titles are acceptable to cut. In particular, IT Manager still drives 12% of conversions and often acts as a champion. If sales relies on that group, we can take more from Marketing Manager instead.",
    noticed:
      "LinkedIn spend is spread across titles roughly by audience size, not by results. The largest share goes to IT Manager and Marketing Manager audiences, while most opportunities come from a small group of senior titles.",
    analyzed:
      "The workflow reviewed 90 days of LinkedIn Ads spend and engagement by job title and matched engaged contacts to HubSpot opportunities and pipeline created. It compared each title’s share of budget with its share of conversions, and it estimated pipeline generated per dollar spent for each title.",
    found:
      "CIO, VP Ops, and VP Engineering produced 68% of pipeline conversions on 40% of spend. They generated about $22 in pipeline per dollar, compared with about $6 for the three titles we recommend reducing. Marketing Manager and Business Analyst together used 28% of the budget but produced 7% of conversions.",
    estimate:
      "If the $8K moved performed at the current gap of $22 versus $6 in pipeline per dollar, the gain would be about $128K a month, or roughly $384K over a quarter. We discounted that to $150K–$300K because returns drop as spend grows: senior audiences are smaller and reach saturation sooner, and cost per impression rises as we compete for the same people.",
    excluded:
      "We left out contacts who could not be matched to a known title, engagement from existing customers, and opportunities where LinkedIn was not a touchpoint before creation. We also left out titles with fewer than 20 engaged contacts, because too few conversions would make their results unreliable.",
    confidence:
      "Confidence is high that budget is out of line with conversions, since the gap is large and consistent over 90 days. Confidence is moderate on the pipeline estimate. LinkedIn is usually one of several touchpoints, so this attribution credits it with influence, not sole cause. Enterprise pipeline also takes weeks to show up, so early results will be partial by the follow-up date.",
    trace: [
      { specialist: "Targeting Evidence Examiner", agent: "measurement", text: "matched 90 days of LinkedIn Ads engagement by job title to HubSpot opportunities and the pipeline they created." },
      { specialist: "Title Targeting Strategist", agent: "demand", text: "compared each title’s share of budget with its share of conversions and its pipeline per dollar." },
      { specialist: "Title Delivery Reviewer", agent: "demand", text: "set the $2.5K floor for each reduced title and the saturation and cost-per-opportunity rules that pull the change back." },
      { specialist: "Buyer Outcome Validator", agent: "conversion", text: "discounted the $384K straight-line estimate to $150K–$300K for saturation and rising cost per impression." },
    ],
    changes: [
      {
        system: "LinkedIn Ads", kind: "Campaign group", name: "Title audiences · High intent", ref: "#735084801", state: "Active",
        fields: [
          { field: "VP Operations · monthly budget", now: "$6.0K", after: "$9.0K", edit: true, money: "month" },
          { field: "CIO · monthly budget", now: "$4.8K", after: "$7.2K", edit: true, money: "month" },
          { field: "VP Engineering · monthly budget", now: "$5.2K", after: "$7.8K", edit: true, money: "month" },
        ],
      },
      {
        system: "LinkedIn Ads", kind: "Campaign group", name: "Title audiences · Broad", ref: "#735084822", state: "Active",
        fields: [
          { field: "IT Manager · monthly budget", now: "$10.0K", after: "$7.0K", edit: true, money: "month" },
          { field: "Marketing Manager · monthly budget", now: "$6.0K", after: "$3.5K", edit: true, money: "month" },
          { field: "Business Analyst · monthly budget", now: "$5.0K", after: "$2.5K", edit: true, money: "month" },
        ],
      },
    ],
    decision: null,
    comments: [],
  },
  {
    id: "rec-tarb-03",
    workflowId: "audience-sharpening",
    agent: "demand",
    type: "test",
    urgency: "act-now",
    lifecycle: "needs-decision",
    scope: "60 net-new accounts",
    run: { n: "51", at: "Sep 29, 7:00 AM" },
    shortTitle: "LinkedIn Campaign with Lookalike Audience",
    title: "Launch a LinkedIn campaign to 60 lookalike accounts",
    basis:
      "The 170-account target list is close to saturation, and Audience Expansion spends about $5K/month on reach that rarely converts. Moving that budget to 60 accounts modeled on our 18 fastest-closing customers adds net-new pipeline without increasing spend.",
    changeTitle: "Lookalike accounts, ranked",
    changeCols: ["Rank", "Account", "Similarity", "Why it matches"],
    changeRows: [
      ["1", "Halden Medical Group", "0.91", "Same size and segment as Meridian Health, same CRM and data stack, hiring 4 RevOps roles"],
      ["2", "Northway Freight", "0.88", "Mid-market logistics like Corville, recent Series C, new CIO in the last 90 days"],
      ["3", "Stratus Claims", "0.86", "Insurance carrier profile close to Beacon, VP Ops and IT Director both active on LinkedIn"],
      ["4–60", "+57 more", "0.80+", "Full ranked list in the export"],
    ],
    timing:
      "Launch today. Several target accounts are already capped and engagement across the current list has flattened, so every week without new accounts means spend goes to people who have already seen the ads.",
    expect:
      "LinkedIn reach grows by about 60 accounts that closely match the customers we win fastest. Ads go to the high-intent titles from the budget recommendation (CIO, VP Ops, VP Engineering). Based on how the seed customers first engaged, we expect 6–9 lookalike accounts to reach the high-intent threshold within 6 weeks, and 3–5 of those to become opportunities.",
    controls:
      "Before upload, Petavue removes existing customers, open opportunities, current target accounts, competitors, and partners from the list. The campaign runs as its own LinkedIn campaign group so results stay separate from the core target list. Frequency is capped at 5 impressions per person per week. If click-through rate is below 50% of the core campaign’s rate after 3 weeks, the lowest-scoring third of the list is removed and its budget goes to the top 40. When a lookalike account hits the high-intent threshold (two or more high-intent visits and three or more engaged contacts), it enters the same sales routing workflow as the 14 accounts in the handoff recommendation.",
    followUp:
      "Interim check Oct 20 for delivery, match rate, and early engagement. Full check Nov 10, which reports accounts reaching high intent, meetings booked, opportunities created, and cost per engaged account compared with the core target list.",
    needsFromYou:
      "Approve turning off Audience Expansion and moving its roughly $5K/month to the lookalike campaign. Then choose how lookalikes enter HubSpot: add all 60 to the target account list now with owners assigned, or keep them marketing-only until each one reaches the high-intent threshold.",
    choice: {
      question: "How should the 60 lookalike accounts enter HubSpot?",
      options: [
        { id: "now", label: "Add all 60 to the target account list now, with owners assigned" },
        { id: "later", label: "Keep them marketing-only until each reaches the high-intent threshold" },
      ],
    },
    noticed:
      "Across the 170 target accounts, the engagement rate has been flat for four weeks while frequency keeps rising, which means we’re reaching the same people more often but no new ones. Meanwhile, Audience Expansion is turned on for three campaigns and uses about 12% of LinkedIn spend, yet it has produced one opportunity in 90 days.",
    analyzed:
      "The workflow built a seed set of 18 customers who closed in the last 12 months with a sales cycle under 90 days. For each one it pulled firmographics (industry, employee count, revenue band, region), technographics (CRM, data warehouse, marketing automation), growth signals (funding, headcount growth, open roles in RevOps and data), and buying committee coverage (whether CIO, VP Ops, and VP Engineering roles exist and are active on LinkedIn). It then scored about 4,200 companies in our ICP universe against that seed profile.",
    found:
      "187 companies scored 0.80 or higher. After exclusions, 60 net-new accounts remained. The strongest predictors of similarity were a shared tech stack, recent growth in RevOps or data hiring, and having all three high-intent titles on LinkedIn, which were also the traits the seed customers had in common before they converted. More than half of the 60 are in healthcare, logistics, and insurance, the same segments as our fastest recent wins.",
    whyNow:
      "The current target list can’t absorb more spend without adding frequency instead of reach. Many of these companies are in Q4 planning, and several show signs of new leadership or new budget, such as a new CIO or a recent funding round, which often come before a platform evaluation.",
    excluded:
      "We left out existing customers, open opportunities, closed-lost deals from the last 6 months, current target accounts, competitors, partners, and companies with fewer than 300 matchable LinkedIn members, since LinkedIn won’t serve audiences below that size.",
    confidence:
      "Confidence is high on list quality, because the seed profile is consistent and the top-ranked accounts match on several dimensions. Confidence is moderate on conversion. The seed set is small (18 customers), and lookalike accounts show no current intent, so they will take longer to warm up than the accounts in the handoff recommendation. Technographic and hiring data come from third-party sources and may be incomplete for private companies.",
    trace: [
      { specialist: "Account Delivery Resolver", agent: "measurement", text: "built the seed set of 18 customers who closed in the last 12 months with a sales cycle under 90 days." },
      { specialist: "Account Reach Monitor", agent: "demand", text: "found engagement flat for four weeks across the 170-account list and scored about 4,200 ICP companies against the seed profile." },
      { specialist: "Cap and Rotation Coordinator", agent: "delivery", text: "planned the separate campaign group, the 5-per-person weekly frequency cap, and turning off Audience Expansion on three campaigns." },
    ],
    changes: [
      {
        system: "LinkedIn Ads", kind: "Setting", name: "Audience Expansion", ref: "3 campaigns",
        fieldHead: "Campaign",
        impact: "Turning off Audience Expansion releases about $5K a month from 3 campaigns.",
        fields: [
          { field: "ABM · Tier 1 target accounts", now: "On", after: "Off" },
          { field: "ABM · Retargeting", now: "On", after: "Off" },
          { field: "Brand · Awareness", now: "On", after: "Off" },
        ],
      },
      {
        system: "LinkedIn Ads", kind: "Campaign group", name: "Lookalike accounts · Q4", ref: "New", state: "Active on apply",
        launches: true,
        platformNote: "57 of the 60 companies matched a LinkedIn company page. The other 3 were left out of the audience.",
        groups: [
          { heading: "New inclusion targeting criteria", tone: "include", rows: [
            { label: "Company list", chips: LOOKALIKE_ACCOUNTS },
            { label: "Job Titles (Current)", chips: ["Chief Information Officer", "Vice President of Operations", "Vice President of Engineering"] },
          ] },
        ],
        fields: [
          { field: "Monthly budget", now: "—", after: "$5.0K", edit: true, money: "month" },
          { field: "Frequency cap", now: "—", after: "5 per person per week", edit: true },
        ],
      },
      {
        when: "now",
        system: "HubSpot", kind: "Company list", name: "ABM · Target accounts", ref: "#list 1180", state: "Active list",
        groups: [
          { heading: "Added to list", tone: "include", rows: [
            { label: "Companies", chips: LOOKALIKE_ACCOUNTS },
          ] },
        ],
        fields: [{ field: "Owner", now: "—", after: "Assigned by territory" }],
      },
      {
        when: "later",
        system: "HubSpot", kind: "Company list", name: "Lookalike accounts · Marketing only", ref: "New list", state: "Active list",
        groups: [
          { heading: "Added to list", tone: "include", rows: [
            { label: "Companies", chips: LOOKALIKE_ACCOUNTS },
          ] },
        ],
        fields: [{ field: "Moves to the target account list", now: "—", after: "When it reaches the high-intent threshold" }],
      },
    ],
    decision: null,
    comments: [],
  },

  /* ── The earlier pending cards (doc 17 §6) ──────────────────────── */
  {
    id: "rec-sqwc-01",
    workflowId: "wasted-spend",
    agent: "demand",
    type: "change",
    urgency: "act-now",
    lifecycle: "needs-decision",
    scope: "2 campaigns",
    run: { n: "08", at: "Sep 1, 7:02 AM" },
    shortTitle: "Search Query Negative Keywords",
    title: "Add 14 negative keywords to block irrelevant search traffic",
    basis: "$2,310 of last month's $9,800 search spend went to queries with zero fit.",
    changeTitle: "Add 14 negative keywords to two campaigns",
    changeCols: ["Campaign", "Negatives to add", "Wasted spend cut"],
    changeRows: [
      ["Brand + Generic Search", '"free", "salary", "jobs", "course", "template" +4 more', "$1,480/mo"],
      ["Competitor Conquest", '"login", "pricing calculator", "support" +2 more', "$830/mo"],
    ],
    timing: "Apply the change today because these queries currently spend about $77 per day.",
    expect: "Redirect 24% of search spend toward queries that have produced qualified outcomes.",
    controls:
      "Every negative was checked against the approved product and brand exception list and against 90 days of converting queries; removing any of the 14 negatives reverses the change in one edit.",
    followUp: "Sep 15. That run verifies the blocked queries stopped spending and reports the amount redirected.",
    noticed: "Search spend increased 12% during the last 30 days while HubSpot-qualified outcomes remained flat.",
    analyzed:
      "The workflow analyzed 1,240 queries and $9,800 of spend from the last 30 days, then used 90 days of HubSpot history containing 312 outcomes to judge query quality.",
    dataCols: ["Query", "Spend", "Clicks", "Qualified outcomes"],
    dataRows: [
      ['"free crm template"', "$312", "41", "0"],
      ['"marketing manager salary"', "$288", "37", "0"],
      ['"crm course online"', "$245", "29", "0"],
      ['"competitor login"', "$198", "52", "0"],
      ["+10 more queries", "$1,267", "176", "0"],
    ],
    whyFollows:
      "These 14 terms consumed $2,310, or 24% of search spend, without producing a qualified outcome. Add them as negatives to the two campaigns listed above.",
    trace: [
      { specialist: "Qualified Outcome Analyst", agent: "measurement", text: "joined every Google Ads conversion to its HubSpot lifecycle stage over 90 days, so query quality is judged on qualified outcomes, not clicks." },
      { specialist: "Search Intent Analyst", agent: "demand", text: "classified all 1,240 queries against the 90-day qualified-outcome history and separated buying intent from noise." },
      { specialist: "Negative Keyword Planner", agent: "delivery", text: "traced each irrelevant query to its campaign, prepared the campaign-level negative lists, and checked every term against the exception list." },
    ],
    appliedPrefix: "Applied to Google Ads",
    readback: "Petavue read the saved keyword lists back from Google Ads and confirmed all 14 negatives are in place.",
    decision: null,
    comments: [],
  },
  {
    id: "rec-sqwc-02",
    workflowId: "wasted-spend",
    agent: "delivery",
    type: "test",
    urgency: "this-week",
    lifecycle: "needs-decision",
    scope: "1 campaign",
    run: { n: "08", at: "Sep 1, 7:02 AM" },
    shortTitle: "Negative Keyword Narrowing Test",
    title: "Narrow one old negative keyword that blocks converting query families",
    basis:
      'Brand Search produced 8 qualified outcomes in 90 days on checklist queries that Brand + Generic Search cannot enter, because a broad negative added manually in March 2026 blocks every query containing "checklist".',
    changeTitle: "One bounded change in one campaign",
    changeCols: ["Campaign", "Change", "Detail"],
    changeRows: [
      ["Brand + Generic Search", "Remove one broad negative", '"checklist" (added manually, March 2026)'],
      ["Brand + Generic Search", "Add two narrower phrase negatives", '"checklist pdf", "checklist download"'],
    ],
    timing: "Apply the change this week so the reopened queries gather two full weeks of traffic before the first check.",
    expect:
      "Let Brand + Generic Search enter auctions for the two query families that produced 8 qualified outcomes in Brand Search, while download-seeker queries stay blocked.",
    controls:
      'The test is capped: if the reopened queries spend $150 in Brand + Generic Search without a platform conversion, the workflow prepares the rollback. Restoring the broad negative "checklist" reverses the change in one edit.',
    followUp: "Sep 15 for the traffic and spend check; the qualified-outcome verdict follows the 30-day maturity rule on Oct 1.",
    noticed: "Brand Search converts on checklist query families that Brand + Generic Search cannot enter because of a pre-Petavue negative.",
    analyzed:
      "The workflow compared the negative keyword lists of the three search campaigns against 90 days of converting queries, and checked the proposed edits against the 14 negatives in this run's first recommendation; no term is shared between the two changes.",
    dataCols: ["Query family (observed in Brand Search, 90 days)", "Spend", "Qualified outcomes", "Status in Brand + Generic Search"],
    dataRows: [
      ['"soc 2 checklist" and variants', "$410", "5", 'Blocked by the broad negative "checklist"'],
      ['"vendor risk checklist" and variants', "$250", "3", "Blocked by the same negative"],
      ['"checklist pdf" and "checklist download" queries', "$186", "0", "Stays blocked by the two new phrase negatives"],
    ],
    whyFollows:
      "The broad negative blocks two query families with 8 qualified outcomes along with the junk it was meant to stop. Replace it with the two narrower phrase negatives and run the reopening as a capped, reversible test.",
    trace: [
      { specialist: "Qualified Outcome Analyst", agent: "measurement", text: "established the 90-day qualified-outcome history every query family is judged against." },
      { specialist: "Search Intent Analyst", agent: "demand", text: "validated the checklist query families against the outcome history and found the 8 qualified outcomes in Brand Search." },
      { specialist: "Negative Keyword Planner", agent: "delivery", text: "ran the cross-campaign conflict check both ways and flagged the broad negative that blocks converting query families." },
    ],
    appliedPrefix: "Applied to Google Ads",
    readback: "Petavue read the saved negative keyword lists back from Google Ads and confirmed the test setup.",
    decision: null,
    comments: [],
  },
  {
    id: "rec-cdlc-01",
    workflowId: "delivery-leaks",
    agent: "delivery",
    type: "change",
    urgency: "this-week",
    lifecycle: "needs-decision",
    scope: "2 campaigns",
    run: { n: "06", at: "Sep 1, 7:04 AM" },
    shortTitle: "Google Ads Schedule and Location Leakage",
    title: "Pause low-performing hours and locations in two campaigns",
    basis: "The flagged hours and locations consumed 12% of the reviewed spend but produced only one SQL in 90 days.",
    changeTitle: "Two schedule changes, one geo change",
    changeCols: ["Campaign", "Change"],
    changeRows: [
      ["US Pipeline Prospecting", "Pause delivery from 12 a.m. to 6 a.m. on weekdays and throughout Sunday"],
      ["US Pipeline Prospecting", "Exclude Wyoming, Montana, and Alaska; concentrate spend on 12 converting metros"],
      ["Brand Search", "Pause Saturday 12am–8am"],
    ],
    timing: "Apply the changes this week.",
    expect: "Redirect about $1,120 per month into hours and locations that have produced SQLs.",
    controls:
      "Every pause and exclusion reverses in one edit; if the remaining windows do not absorb the redirected spend, or their directional platform conversions fall below the pre-change pace, the next run flags the pauses for review.",
    followUp:
      "Sep 15 for the early delivery check only: read-back confirmed, spend redirected as planned, and directional platform conversions. The mature cost-per-SQL verdict follows the 30-day maturity rule on Oct 1.",
    noticed: "The cost per SQL for US Pipeline Prospecting increased 19% in 60 days even though its bids and budget did not change.",
    analyzed: "The workflow analyzed $28,400 of spend and 214 SQLs over 90 days by hour, day of week, and state.",
    dataCols: ["Segment", "Spend (90d)", "SQLs", "Cost/SQL"],
    dataRows: [
      ["Weekdays, 12 a.m. to 6 a.m.", "$1,840", "1", "$1,840"],
      ["Sunday, all day", "$760", "0", "None"],
      ["WY + MT + AK", "$760", "0", "None"],
      ["12 converting metros, business hours", "$19.8K", "201", "$99"],
    ],
    whyFollows:
      "The flagged segments consumed $3,360, or 12% of the reviewed spend. The worst segment's cost per SQL ran 18.6 times the $99 converting-metro benchmark, and two segments produced no SQLs at all. Apply the schedule and location changes listed above.",
    trace: [
      { specialist: "Delivery Outcome Mapper", agent: "measurement", text: "selected conversions past the 30-day maturity window and mapped them to time and place, so no immature data enters the comparison." },
      { specialist: "Schedule and Geography Strategist", agent: "delivery", text: "flagged the segments with enough spend to judge that converted at about 19 times the account average cost per SQL." },
      { specialist: "Spend Reallocation Planner", agent: "budget", text: "identified the business hours and 12 converting metros that can absorb the released spend." },
    ],
    appliedPrefix: "Applied to Google Ads",
    readback: "Petavue read the saved schedule and location settings back from Google Ads and confirmed the changes.",
    decision: null,
    comments: [],
  },
  {
    id: "rec-tarb-01",
    workflowId: "audience-sharpening",
    agent: "demand",
    type: "change",
    urgency: "act-now",
    lifecycle: "needs-decision",
    scope: "170-account list",
    run: { n: "23", at: "Sep 1, 7:00 AM" },
    shortTitle: "LinkedIn Account Saturation Caps",
    title: "Cap 8 saturated accounts at 200 impressions per week",
    basis: "8 accounts took 41% of impressions; 63 tier-1 targets got fewer than 50 each.",
    changeTitle: "The caps (refreshed daily by the workflow)",
    changeCols: ["Action", "Accounts"],
    changeRows: [
      ["Cap at 200 imp/week", "Accenture, TCS, Infosys +5 (already engaged, no new pipeline in 60d)"],
      ["Release budget toward", "63 tier-1 accounts currently under 50 imp/week (list attached)"],
    ],
    scopeNote:
      "Deloitte is not among the eight. The Aug 31 rejection keeps full delivery to Deloitte until the Sep 10 QBR, and this run carried that constraint forward.",
    timing: "Apply the caps today. The workflow will recalculate them at 7 a.m. each day.",
    expect: "Increase tier-one account coverage from 37% to about 70% within two weeks.",
    controls:
      "A capped account that shows new contact engagement is surfaced for a cap review the next day, so a cap never freezes a re-engaging account; every cap reverses in one edit.",
    followUp: "Sep 15. That run measures tier-one coverage against the 37% baseline.",
    noticed: "Sixty-three of 170 tier-one target accounts received almost no ad exposure even though the campaigns spent their full budgets.",
    analyzed: "The workflow analyzed 840,000 impressions delivered to the 170-account target list over 30 days.",
    dataCols: ["Account group", "Accounts", "Impressions", "Share", "New pipeline (60d)"],
    dataRows: [
      ["Accenture, TCS, Infosys +5", "8", "344K", "41%", "$0"],
      ["Mid-exposure targets", "99", "462K", "55%", "$210K"],
      ["Under-served tier-1 (<50 imp/wk)", "63", "34K", "4%", "None"],
    ],
    whyFollows:
      "Eight already-engaged accounts absorbed 41% of reach and produced no new pipeline in 60 days. Cap them at 200 impressions per week and release delivery to the 63 under-served tier-one accounts.",
    trace: [
      { specialist: "Account Delivery Resolver", agent: "measurement", text: "matched 30 days of company-level delivery to the 170-account target list and removed accounts sales already owns." },
      { specialist: "Account Reach Monitor", agent: "demand", text: "measured delivery concentration and found eight accounts absorbing 41% of impressions with no new pipeline in 60 days." },
      { specialist: "Cap and Rotation Coordinator", agent: "delivery", text: "calculated the 200-impression weekly cap that frees delivery for the 63 under-served tier-one accounts." },
    ],
    appliedPrefix: "Applied to LinkedIn Ads",
    readback: "Petavue read the saved audience settings back from LinkedIn Ads and confirmed the caps.",
    decision: null,
    comments: [],
  },

  /* ── The five closed lifecycle cards (doc 17, Lifecycle examples) ── */
  {
    id: "rec-sqwc-c1",
    workflowId: "wasted-spend",
    agent: "demand",
    type: "change",
    urgency: "this-week",
    lifecycle: "accepted",
    scope: "3 campaigns",
    run: { n: "06", at: "Aug 18, 7:01 AM" },
    shortTitle: "Search Query Negative Keywords",
    title: "Add negative keywords to block irrelevant search traffic",
    basis: "Approved Aug 18; the Sep 1 run measured irrelevant spend down $1,910 per month.",
    changeTitle: "Negative keywords added Aug 18",
    changeCols: ["Campaign", "Change"],
    changeRows: [["Brand + Generic Search, Competitor Conquest, Brand Search", "Negative keyword lists updated per the Run 06 review"]],
    timing: "Applied Aug 18, the day the run completed.",
    expect: "Redirect the flagged spend toward queries that have produced qualified outcomes.",
    controls:
      "Every negative was checked against the approved product and brand exception list and against 90 days of converting queries; removing a negative reverses the change in one edit.",
    followUp: "Sep 1, completed. That run measured irrelevant spend down $1,910 per month.",
    noticed: "Irrelevant queries were consuming search spend without producing qualified outcomes.",
    analyzed: "The Run 06 review classified the trailing 30 days of search queries against 90 days of HubSpot history.",
    whyFollows: "The flagged terms spent without producing a qualified outcome, so they were added as negatives to the affected campaigns.",
    trace: [
      { specialist: "Qualified Outcome Analyst", agent: "measurement", text: "joined every Google Ads conversion to its HubSpot lifecycle stage, so query quality was judged on qualified outcomes, not clicks." },
      { specialist: "Search Intent Analyst", agent: "demand", text: "classified the run's queries against the 90-day qualified-outcome history and separated buying intent from noise." },
      { specialist: "Negative Keyword Planner", agent: "delivery", text: "traced each irrelevant query to its campaign and checked every proposed negative against the exception list." },
    ],
    decision: { status: "accepted", by: "Maya Iyer", at: "Aug 18, 2:14 PM" },
    applied: "Applied to Google Ads on Aug 18. Petavue read the saved keyword lists back from Google Ads and confirmed the negatives are in place.",
    impact: "The Sep 1 run measured irrelevant spend down $1,910 per month.",
    comments: [
      {
        author: "Maya Iyer",
        at: "Aug 19, 9:40 AM",
        text: 'Sales asked whether "pricing calculator" also blocks the partner-pricing queries. Please confirm in the next run.',
      },
    ],
  },
  {
    id: "rec-cdlc-c1",
    workflowId: "delivery-leaks",
    agent: "delivery",
    type: "change",
    urgency: "this-week",
    lifecycle: "accepted",
    scope: "2 campaigns",
    run: { n: "04", at: "Aug 18, 7:03 AM" },
    shortTitle: "Google Ads Delivery Window Leakage",
    title: "Pause low-performing delivery windows",
    basis: "Approved Aug 18; the Sep 1 run verified the paused windows spent $0.",
    changeTitle: "Schedule and location changes applied Aug 18",
    changeCols: ["Campaign", "Change"],
    changeRows: [["US Pipeline Prospecting, Brand Search", "Schedule pauses and location exclusions per the Run 04 review"]],
    timing: "Applied Aug 18, the day the run completed.",
    expect: "Redirect the flagged spend into hours and locations that have produced SQLs.",
    controls:
      "Every pause and exclusion reverses in one edit; the next run flags the pauses for review if the remaining windows do not absorb the redirected spend.",
    followUp: "Sep 22. The mature cost-per-SQL verdict follows the 30-day maturity rule.",
    noticed: "Delivery windows and locations were spending without producing mature qualified outcomes.",
    analyzed: "The Run 04 review analyzed delivery by hour, day of week, and state against mature HubSpot-qualified outcomes.",
    whyFollows: "The flagged windows spent without mature qualified outcomes, so the schedule pauses and location exclusions were prepared and approved.",
    trace: [
      { specialist: "Delivery Outcome Mapper", agent: "measurement", text: "selected conversions past the 30-day maturity window and mapped them to time and place." },
      { specialist: "Schedule and Geography Strategist", agent: "delivery", text: "flagged the delivery segments with enough spend to judge that ran far above the converting-metro benchmark." },
      { specialist: "Spend Reallocation Planner", agent: "budget", text: "identified the converting business hours and metros that could absorb the released spend." },
    ],
    decision: { status: "accepted", by: "Maya Iyer", at: "Aug 18, 3:05 PM" },
    applied: "Applied to Google Ads on Aug 18. Petavue read the saved schedule and location settings back and confirmed the change.",
    impact: "The Sep 1 run verified the paused windows spent $0 and the converting windows absorbed the redirected spend.",
    comments: [],
  },
  {
    id: "rec-tarb-c1",
    workflowId: "audience-sharpening",
    agent: "demand",
    type: "change",
    urgency: "this-week",
    lifecycle: "rejected",
    scope: "1 account",
    run: { n: "22", at: "Aug 31, 7:00 AM" },
    shortTitle: "Deloitte Impression Cap",
    title: "Cap Deloitte at 200 impressions per week",
    basis: "Deloitte reached heavy delivery with no new pipeline in 60 days.",
    changeTitle: "The proposed cap",
    changeCols: ["Account", "Change"],
    changeRows: [["Deloitte", "Cap at 200 impressions per week"]],
    timing: "Apply the cap the day of the run; the daily 7:00 AM run recalculates it.",
    expect: "Free delivery for under-served tier-one accounts.",
    controls:
      "A capped account that shows new contact engagement is surfaced for a cap review the next day; every cap reverses in one edit.",
    noticed: "Deloitte absorbed heavy delivery while producing no new pipeline in 60 days.",
    analyzed: "The Run 22 review checked delivery concentration and engagement recency for the heaviest accounts on the 170-account target list.",
    whyFollows: "Heavy delivery with no new pipeline in 60 days met the saturation test, so the cap was proposed for review.",
    trace: [
      { specialist: "Account Delivery Resolver", agent: "measurement", text: "matched company-level delivery to the 170-account target list and removed accounts sales already owns." },
      { specialist: "Account Reach Monitor", agent: "demand", text: "applied the saturation test: heavy delivery with no new pipeline in 60 days despite recent engagement checks." },
      { specialist: "Cap and Rotation Coordinator", agent: "delivery", text: "prepared the 200-impression weekly cap for review." },
    ],
    followUp: null,
    decision: {
      status: "rejected",
      by: "Maya Iyer",
      at: "Aug 31, 10:12 AM",
      note: "Sales asked to keep full delivery to Deloitte until the QBR on Sep 10.",
    },
    carried: "Run 23 respected the constraint and left Deloitte uncapped.",
    comments: [
      {
        author: "Maya Iyer",
        at: "Aug 31, 10:12 AM",
        label: "Reason given when rejected",
        text: "Sales asked to keep full delivery to Deloitte until the QBR on Sep 10.",
      },
    ],
  },
  {
    id: "rec-tarb-c0",
    workflowId: "audience-sharpening",
    agent: "demand",
    type: "change",
    urgency: "this-week",
    lifecycle: "accepted",
    scope: "5 accounts",
    run: { n: "01", at: "Aug 10, 7:00 AM" },
    shortTitle: "LinkedIn Account Saturation Caps",
    title: "Cap 5 accounts at 200 impressions per week",
    basis: "Approved Aug 10; the Aug 24 run measured tier-one coverage up from 29% to 37%.",
    changeTitle: "Caps applied Aug 10",
    changeCols: ["Action", "Accounts"],
    changeRows: [["Cap at 200 imp/week", "5 saturated accounts from the Run 01 review"]],
    timing: "Applied Aug 10, the day the run completed.",
    expect: "Release impressions toward under-served tier-one accounts.",
    controls:
      "A capped account that shows new contact engagement is surfaced for a cap review the next day; every cap reverses in one edit.",
    followUp: "Aug 24, completed. That run measured tier-one coverage up from 29% to 37%.",
    noticed: "A small set of accounts absorbed most impressions while tier-one targets received little or no delivery.",
    analyzed: "The Run 01 review analyzed 30 days of company-level delivery against the 170-account target list.",
    whyFollows: "Five saturated accounts met the saturation test, so the 200-impression weekly cap was prepared and approved.",
    trace: [
      { specialist: "Account Delivery Resolver", agent: "measurement", text: "matched 30 days of company-level delivery to the target list and its tiers." },
      { specialist: "Account Reach Monitor", agent: "demand", text: "separated productive frequency from saturation and named the accounts being crowded out." },
      { specialist: "Cap and Rotation Coordinator", agent: "delivery", text: "calculated the cap that released impressions while preserving useful frequency." },
    ],
    decision: { status: "accepted", by: "Maya Iyer", at: "Aug 10, 1:20 PM" },
    applied: "Applied to LinkedIn Ads on Aug 10. Petavue read the saved audience settings back and confirmed the caps.",
    impact: "The Aug 24 run measured tier-one coverage up from 29% to 37%.",
    comments: [],
  },
  {
    id: "rec-bssh-c1",
    workflowId: "sales-handoff",
    agent: "conversion",
    type: "handoff",
    urgency: "this-week",
    lifecycle: "accepted",
    scope: "11 accounts",
    run: { n: "03", at: "Aug 25, 8:01 AM" },
    shortTitle: "ABM",
    title: "Send 11 high-intent accounts to the SDR round-robin queue",
    basis: "Pushed Aug 25; sales booked four meetings during the first week.",
    changeTitle: "The handoff",
    changeCols: ["Destination", "Accounts"],
    changeRows: [["SDR round-robin queue", "11 net-new accounts, ranked, with per-account signals"]],
    timing: "Pushed Aug 25, the day the run completed.",
    expect: "Give sales qualified account handoffs while the buying signals were recent.",
    controls:
      "Every account was re-checked against customers, open opportunities, and the last 21 days of sales activity at the moment of the push.",
    followUp: "Sep 1, completed. That run reported four meetings booked for the 11 accounts.",
    noticed: "High-intent accounts were not reaching sales because no form was submitted.",
    analyzed: "The Run 03 review scored 14 days of web, advertising, and contact activity for the 170 target accounts.",
    whyFollows: "Eleven net-new accounts passed the composite score and cleared suppression, so the ranked list was prepared for HubSpot.",
    trace: [
      { specialist: "Account Journey Builder", agent: "measurement", text: "resolved web, advertising, and contact activity to named accounts, counting identified activity only." },
      { specialist: "Buying Signal Scorer", agent: "conversion", text: "scored the target accounts and kept the evidence attached to each account's rank." },
      { specialist: "Sales Eligibility Validator", agent: "demand", text: "checked the shortlist against customers, open opportunities, and recent sales activity." },
    ],
    decision: { status: "accepted", by: "Maya Iyer", at: "Aug 25, 11:30 AM" },
    applied: "Pushed to HubSpot on Aug 25. Petavue created tasks for 11 accounts in the SDR round-robin queue and verified the task IDs. Confirmed in HubSpot.",
    impact: "Sales booked four meetings during the first week, measured Sep 1.",
    comments: [],
  },
];

/* ── Applying happens in the Apply modal, change by change (Ijas's design):
   Will change → Waiting → Applying → Applied, then a read-only "What changed"
   view. The card keeps the decision; an in-session decision carries no
   one-line applied text. Seeded decisions keep theirs. ── */
function withLiveApply(item) {
  const d = item.decision;
  if (!d || d.status !== "accepted" || !d.ts) return item;
  return { ...item, applied: null };
}

export function listRecommendations() {
  return ITEMS.map(withLiveApply);
}

/* One decision: accepted, rejected, or on-hold. The note is optional on
   accept and required on reject and hold (enforced in the UI); a note also
   lands in the comments thread with its decision label. */
export function decide(id, status, note, choice, applied) {
  const it = ITEMS.find((r) => r.id === id);
  if (!it || !DECISION[status]) return it || null;
  const at = stamp();
  // the "Needs from you" answer, asked by the Accept modal
  const picked = status === "accepted" ? it.choice?.options.find((o) => o.id === choice) : null;
  it.decision = {
    status, by: currentUser.name, at, ts: Date.now(), note: note || null,
    choice: picked?.id || null, choiceLabel: picked?.label || null,
    applied: status === "accepted" && Array.isArray(applied) ? applied : null,
  };
  // Each reason given in the Apply modal becomes a comment, so later runs
  // (and people) can see what was changed or left out, and why.
  for (const c of it.decision.applied || []) {
    const say = (label, text) => { it.comments = [...(it.comments || []), { author: currentUser.name, at, label, text }]; };
    if (!c.on) { if (c.reason) say("Left out when applied", `${c.name}: ${c.reason}`); continue; }
    for (const f of c.fields || []) {
      if (!f.on && f.reason) say(f.mode === "later" ? "Saved for later" : "Left out when applied", `${f.field} on ${c.name}: ${f.reason}`);
      else if (f.value !== f.rec && f.reason) say("Adjusted when applied", `${f.field} on ${c.name}, ${f.rec} → ${f.value}: ${f.reason}`);
    }
    for (const g of c.groups || []) {
      for (const r of g.rows) {
        const off = r.chips.filter((x) => !x.fixed && !x.on).map((x) => x.label);
        if (off.length && r.reason) {
          say(r.mode === "later" ? "Saved for later" : "Left out when applied", `${off.join(", ")} (${r.label}, ${c.name}): ${r.reason}`);
        }
      }
    }
  }
  it.lifecycle = status;
  if (note) {
    it.comments = [...(it.comments || []), { author: currentUser.name, at, label: NOTE_LABEL[status], text: note }];
  }
  return withLiveApply(it);
}

/* A general comment changes no state. */
export function addComment(id, text) {
  const it = ITEMS.find((r) => r.id === id);
  if (!it || !text?.trim()) return it || null;
  it.comments = [...(it.comments || []), { author: currentUser.name, at: stamp(), text: text.trim() }];
  return it;
}

export function pendingCountsByWorkflow(workflowIds) {
  const open = ITEMS.filter((r) => r.lifecycle === "needs-decision");
  return Object.fromEntries(
    (workflowIds || [...new Set(ITEMS.map((r) => r.workflowId))]).map((id) => [
      id,
      open.filter((r) => r.workflowId === id).length,
    ]),
  );
}
