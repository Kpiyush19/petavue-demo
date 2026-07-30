// Self-contained dashboard assets served by the mock file-serving layer.
// The dashboard HTML is fully inline (no external scripts/links) so it renders
// inside an iframe via `srcdoc` with no network dependency.

export const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Q2 Revenue Dashboard</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f7f8fa; color: #1a2233; padding: 24px; }
  .head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 20px; }
  .head h1 { font-size: 20px; font-weight: 600; }
  .head .sub { font-size: 12px; color: #6b7280; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 14px; }
  .kpi { background: #fff; border: 1px solid #eceef1; border-radius: 12px; padding: 16px; }
  .kpi .label { font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: #8b93a1; margin-bottom: 8px; }
  .kpi .val { font-size: 24px; font-weight: 600; }
  .kpi .delta { font-size: 12px; font-weight: 600; margin-top: 4px; }
  .delta.up { color: #16a34a; } .delta.down { color: #dc2626; } .delta.flat { color: #6b7280; }
  .grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 14px; margin-bottom: 14px; }
  .grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 14px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
  .card { background: #fff; border: 1px solid #eceef1; border-radius: 12px; padding: 18px; }
  .card h3 { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
  .card .cap { font-size: 12px; color: #8b93a1; margin-bottom: 14px; }
  .bars { display: flex; align-items: flex-end; gap: 12px; height: 180px; padding-top: 10px; }
  .bar { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; justify-content: flex-end; }
  .bar .col { width: 100%; max-width: 46px; background: linear-gradient(180deg, #6366f1, #818cf8); border-radius: 6px 6px 0 0; }
  .bar .m { font-size: 10px; color: #6b7280; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; color: #8b93a1; font-weight: 600; padding: 8px 6px; border-bottom: 1px solid #eceef1; text-transform: uppercase; font-size: 10px; letter-spacing: .03em; }
  td { padding: 9px 6px; border-bottom: 1px solid #f1f2f4; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .pill { font-size: 10px; padding: 2px 7px; border-radius: 999px; font-weight: 600; }
  .pill.win { background: #dcfce7; color: #166534; } .pill.risk { background: #fef3c7; color: #92400e; } .pill.neu { background: #e0e7ff; color: #3730a3; }
  .hbars { display: flex; flex-direction: column; gap: 13px; padding-top: 4px; }
  .hrow { display: flex; align-items: center; gap: 10px; font-size: 12px; }
  .hrow .lbl { width: 92px; color: #6b7280; flex-shrink: 0; }
  .hrow .track { flex: 1; height: 10px; background: #f1f2f4; border-radius: 999px; overflow: hidden; }
  .hrow .fill { height: 100%; background: linear-gradient(90deg, #6366f1, #818cf8); border-radius: 999px; }
  .hrow .v { width: 56px; text-align: right; font-variant-numeric: tabular-nums; color: #1a2233; font-weight: 600; }
  .donut-wrap { display: flex; align-items: center; gap: 20px; padding-top: 6px; }
  .donut { width: 124px; height: 124px; border-radius: 50%; flex-shrink: 0; background: conic-gradient(#4f46e5 0 52%, #818cf8 52% 83%, #c7d2fe 83% 100%); position: relative; }
  .donut::after { content: ""; position: absolute; inset: 24px; background: #fff; border-radius: 50%; }
  .donut .ctr { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 1; }
  .donut .ctr .b { font-size: 18px; font-weight: 600; } .donut .ctr .s { font-size: 10px; color: #8b93a1; text-transform: uppercase; letter-spacing: .04em; }
  .legend { display: flex; flex-direction: column; gap: 10px; font-size: 12px; }
  .legend .li { display: flex; align-items: center; gap: 8px; }
  .legend .dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
  .legend .ln { flex: 1; color: #4b5563; } .legend .lv { font-weight: 600; font-variant-numeric: tabular-nums; }
  .spark { width: 100%; height: 150px; display: block; }
  .gauges { display: flex; flex-direction: column; gap: 16px; padding-top: 4px; }
  .gauge .gtop { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px; }
  .gauge .gtop .gl { color: #6b7280; } .gauge .gtop .gv { font-weight: 600; }
  .gauge .gtrack { height: 8px; background: #f1f2f4; border-radius: 999px; overflow: hidden; }
  .gauge .gfill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #4f46e5, #818cf8); }
  .gauge .gfill.ok { background: linear-gradient(90deg, #16a34a, #4ade80); }
  .gauge .gfill.warn { background: linear-gradient(90deg, #d97706, #fbbf24); }
</style>
</head>
<body>
  <div id="root">
    <div class="head">
      <div>
        <h1>Q2 Revenue Dashboard</h1>
        <div class="sub">Fiscal Q2 2026 · refreshed automatically on data sync</div>
      </div>
      <div class="sub">Generated by Analytics Agent</div>
    </div>

    <div class="kpis">
      <div class="kpi"><div class="label">Total Revenue</div><div class="val">$4.82M</div><div class="delta up">▲ 14.2% QoQ</div></div>
      <div class="kpi"><div class="label">New ARR</div><div class="val">$1.13M</div><div class="delta up">▲ 9.6% QoQ</div></div>
      <div class="kpi"><div class="label">Win Rate</div><div class="val">27.4%</div><div class="delta down">▼ 1.8 pts</div></div>
      <div class="kpi"><div class="label">Avg Deal Size</div><div class="val">$38.6K</div><div class="delta up">▲ 5.1% QoQ</div></div>
    </div>

    <div class="kpis">
      <div class="kpi"><div class="label">Pipeline Coverage</div><div class="val">3.2x</div><div class="delta up">▲ 0.4x QoQ</div></div>
      <div class="kpi"><div class="label">Net Revenue Retention</div><div class="val">112%</div><div class="delta up">▲ 3 pts</div></div>
      <div class="kpi"><div class="label">Avg Sales Cycle</div><div class="val">48 days</div><div class="delta up">▼ 6 days</div></div>
      <div class="kpi"><div class="label">Quota Attainment</div><div class="val">86%</div><div class="delta flat">— vs plan</div></div>
    </div>

    <div class="grid">
      <div class="card">
        <h3>Revenue by Month</h3>
        <div class="cap">Closed-won bookings, trailing 6 months ($K)</div>
        <div class="bars">
          <div class="bar"><div class="col" style="height:58%"></div><div class="m">Apr</div></div>
          <div class="bar"><div class="col" style="height:72%"></div><div class="m">May</div></div>
          <div class="bar"><div class="col" style="height:91%"></div><div class="m">Jun</div></div>
          <div class="bar"><div class="col" style="height:64%"></div><div class="m">Jul</div></div>
          <div class="bar"><div class="col" style="height:80%"></div><div class="m">Aug</div></div>
          <div class="bar"><div class="col" style="height:100%"></div><div class="m">Sep</div></div>
        </div>
      </div>
      <div class="card">
        <h3>Top Accounts</h3>
        <div class="cap">By annual recurring revenue</div>
        <table>
          <thead><tr><th>Account</th><th class="num">ARR</th><th>Status</th></tr></thead>
          <tbody>
            <tr><td>Northwind Traders</td><td class="num">$412K</td><td><span class="pill win">Expanding</span></td></tr>
            <tr><td>Contoso Ltd</td><td class="num">$388K</td><td><span class="pill win">Expanding</span></td></tr>
            <tr><td>Globex Corp</td><td class="num">$301K</td><td><span class="pill risk">At risk</span></td></tr>
            <tr><td>Initech</td><td class="num">$276K</td><td><span class="pill neu">Stable</span></td></tr>
            <tr><td>Umbrella Inc</td><td class="num">$198K</td><td><span class="pill risk">At risk</span></td></tr>
            <tr><td>Soylent Corp</td><td class="num">$164K</td><td><span class="pill win">Expanding</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="grid3">
      <div class="card">
        <h3>Pipeline by Stage</h3>
        <div class="cap">Open opportunities ($)</div>
        <div class="hbars">
          <div class="hrow"><span class="lbl">Prospecting</span><span class="track"><span class="fill" style="width:100%"></span></span><span class="v">$2.1M</span></div>
          <div class="hrow"><span class="lbl">Qualification</span><span class="track"><span class="fill" style="width:76%"></span></span><span class="v">$1.6M</span></div>
          <div class="hrow"><span class="lbl">Proposal</span><span class="track"><span class="fill" style="width:57%"></span></span><span class="v">$1.2M</span></div>
          <div class="hrow"><span class="lbl">Negotiation</span><span class="track"><span class="fill" style="width:40%"></span></span><span class="v">$840K</span></div>
          <div class="hrow"><span class="lbl">Commit</span><span class="track"><span class="fill" style="width:25%"></span></span><span class="v">$520K</span></div>
        </div>
      </div>
      <div class="card">
        <h3>Revenue by Segment</h3>
        <div class="cap">Share of closed-won ARR</div>
        <div class="donut-wrap">
          <div class="donut"><div class="ctr"><div class="b">$4.82M</div><div class="s">Total</div></div></div>
          <div class="legend">
            <div class="li"><span class="dot" style="background:#4f46e5"></span><span class="ln">Enterprise</span><span class="lv">52%</span></div>
            <div class="li"><span class="dot" style="background:#818cf8"></span><span class="ln">Mid-Market</span><span class="lv">31%</span></div>
            <div class="li"><span class="dot" style="background:#c7d2fe"></span><span class="ln">SMB</span><span class="lv">17%</span></div>
          </div>
        </div>
      </div>
      <div class="card">
        <h3>Win Rate Trend</h3>
        <div class="cap">Closed-won %, trailing 6 months</div>
        <svg class="spark" viewBox="0 0 300 150" preserveAspectRatio="none">
          <defs><linearGradient id="wr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6366f1" stop-opacity="0.22"/><stop offset="1" stop-color="#6366f1" stop-opacity="0"/></linearGradient></defs>
          <path d="M0,104 L60,86 L120,96 L180,64 L240,72 L300,48 L300,150 L0,150 Z" fill="url(#wr)"/>
          <polyline points="0,104 60,86 120,96 180,64 240,72 300,48" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
          <circle cx="300" cy="48" r="3.5" fill="#6366f1"/>
        </svg>
      </div>
    </div>

    <div class="grid2">
      <div class="card">
        <h3>Rep Leaderboard</h3>
        <div class="cap">Closed-won this quarter vs quota</div>
        <table>
          <thead><tr><th>Rep</th><th class="num">Closed Won</th><th class="num">Quota</th><th>Status</th></tr></thead>
          <tbody>
            <tr><td>Priya Nair</td><td class="num">$642K</td><td class="num">118%</td><td><span class="pill win">Ahead</span></td></tr>
            <tr><td>Marcus Lee</td><td class="num">$571K</td><td class="num">104%</td><td><span class="pill win">Ahead</span></td></tr>
            <tr><td>Dana White</td><td class="num">$498K</td><td class="num">91%</td><td><span class="pill neu">On track</span></td></tr>
            <tr><td>Tom Alvarez</td><td class="num">$402K</td><td class="num">73%</td><td><span class="pill risk">Behind</span></td></tr>
            <tr><td>Sara Kim</td><td class="num">$355K</td><td class="num">65%</td><td><span class="pill risk">Behind</span></td></tr>
          </tbody>
        </table>
      </div>
      <div class="card">
        <h3>Pipeline by Source</h3>
        <div class="cap">Sourced pipeline mix this quarter</div>
        <div class="hbars">
          <div class="hrow"><span class="lbl">Outbound</span><span class="track"><span class="fill" style="width:100%"></span></span><span class="v">34%</span></div>
          <div class="hrow"><span class="lbl">Inbound</span><span class="track"><span class="fill" style="width:79%"></span></span><span class="v">27%</span></div>
          <div class="hrow"><span class="lbl">Partner</span><span class="track"><span class="fill" style="width:53%"></span></span><span class="v">18%</span></div>
          <div class="hrow"><span class="lbl">Events</span><span class="track"><span class="fill" style="width:38%"></span></span><span class="v">13%</span></div>
          <div class="hrow"><span class="lbl">Product-led</span><span class="track"><span class="fill" style="width:24%"></span></span><span class="v">8%</span></div>
        </div>
        <div class="gauges" style="margin-top:18px">
          <div class="gauge"><div class="gtop"><span class="gl">Quarterly target</span><span class="gv">86%</span></div><div class="gtrack"><div class="gfill warn" style="width:86%"></div></div></div>
          <div class="gauge"><div class="gtop"><span class="gl">Forecast confidence</span><span class="gv">High</span></div><div class="gtrack"><div class="gfill ok" style="width:78%"></div></div></div>
        </div>
      </div>
    </div>
  </div>
  <!-- runtime hook for React-dashboard detection: ./runtime/app.js -->
</body>
</html>`;

// Rendered, self-contained previews for each widget — served for `?preview=1`
// so the Verify view shows the actual widget instead of its source.
const WIDGET_SHELL = (inner) => `<!DOCTYPE html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f7f8fa; color: #1a2233; padding: 16px; }
  .card { background: #fff; border: 1px solid #eceef1; border-radius: 12px; padding: 16px; }
  .card h3 { font-size: 14px; font-weight: 600; margin-bottom: 14px; }
  .kpis { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .kpi { background: #fff; border: 1px solid #eceef1; border-radius: 12px; padding: 14px; }
  .kpi .label { font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #8b93a1; margin-bottom: 6px; }
  .kpi .val { font-size: 20px; font-weight: 600; }
  .kpi .delta { font-size: 12px; font-weight: 600; margin-top: 4px; }
  .delta.up { color: #16a34a; } .delta.down { color: #dc2626; }
  .bars { display: flex; align-items: flex-end; gap: 12px; height: 180px; padding-top: 10px; }
  .bar { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; justify-content: flex-end; }
  .bar .col { width: 100%; max-width: 40px; background: linear-gradient(180deg, #6366f1, #818cf8); border-radius: 6px 6px 0 0; }
  .bar .m { font-size: 10px; color: #6b7280; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; color: #8b93a1; font-weight: 600; padding: 8px 6px; border-bottom: 1px solid #eceef1; text-transform: uppercase; font-size: 10px; letter-spacing: .03em; }
  td { padding: 9px 6px; border-bottom: 1px solid #f1f2f4; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .pill { font-size: 10px; padding: 2px 7px; border-radius: 999px; font-weight: 600; }
  .pill.win { background: #dcfce7; color: #166534; } .pill.risk { background: #fef3c7; color: #92400e; }
</style></head><body>${inner}</body></html>`;

export const WIDGET_PREVIEWS = {
  "output/dashboard/widgets/scoreboard.jsx": WIDGET_SHELL(`
    <div class="kpis">
      <div class="kpi"><div class="label">Total Revenue</div><div class="val">$4.82M</div><div class="delta up">▲ 14.2% QoQ</div></div>
      <div class="kpi"><div class="label">New ARR</div><div class="val">$1.13M</div><div class="delta up">▲ 9.6% QoQ</div></div>
      <div class="kpi"><div class="label">Win Rate</div><div class="val">27.4%</div><div class="delta down">▼ 1.8 pts</div></div>
      <div class="kpi"><div class="label">Avg Deal Size</div><div class="val">$38.6K</div><div class="delta up">▲ 5.1% QoQ</div></div>
    </div>`),
  "output/dashboard/widgets/revenue_trend.jsx": WIDGET_SHELL(`
    <div class="card">
      <h3>Revenue by Month</h3>
      <div class="bars">
        <div class="bar"><div class="col" style="height:58%"></div><div class="m">Apr</div></div>
        <div class="bar"><div class="col" style="height:72%"></div><div class="m">May</div></div>
        <div class="bar"><div class="col" style="height:91%"></div><div class="m">Jun</div></div>
        <div class="bar"><div class="col" style="height:64%"></div><div class="m">Jul</div></div>
        <div class="bar"><div class="col" style="height:80%"></div><div class="m">Aug</div></div>
        <div class="bar"><div class="col" style="height:100%"></div><div class="m">Sep</div></div>
      </div>
    </div>`),
  "output/dashboard/widgets/top_accounts.jsx": WIDGET_SHELL(`
    <div class="card">
      <h3>Top Accounts</h3>
      <table>
        <thead><tr><th>Account</th><th class="num">ARR</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td>Northwind Traders</td><td class="num">$412K</td><td><span class="pill win">Expanding</span></td></tr>
          <tr><td>Contoso Ltd</td><td class="num">$388K</td><td><span class="pill win">Expanding</span></td></tr>
          <tr><td>Globex Corp</td><td class="num">$301K</td><td><span class="pill risk">At risk</span></td></tr>
          <tr><td>Initech</td><td class="num">$276K</td><td><span class="pill win">Stable</span></td></tr>
          <tr><td>Umbrella Inc</td><td class="num">$198K</td><td><span class="pill risk">At risk</span></td></tr>
        </tbody>
      </table>
    </div>`),
};

export const DASHBOARD_MANIFEST = {
  version: "2.0",
  title: "Paid Media ROI",
  created_at: "2026-06-01T10:00:00Z",
  // The verifiable sections of the Paid Media ROI dashboard — surfaced as the
  // widget list in the Verify & Publish modal (order = display order).
  widgets: {
    header: { id: "header", file: "widgets/header.html", name: "Header", data_source: "data/kpis.json", verified: false, verified_at: null },
    channel_truth: { id: "channel_truth", file: "widgets/channel_truth.html", name: "Channel Truth", data_source: "data/channel_roas.csv", verified: false, verified_at: null },
    actions: { id: "actions", file: "widgets/actions.html", name: "Actions", data_source: "data/moves.csv", verified: false, verified_at: null },
    movers: { id: "movers", file: "widgets/movers.html", name: "Movers", data_source: "data/wow_movers.csv", verified: false, verified_at: null },
    icp_handoff: { id: "icp_handoff", file: "widgets/icp_handoff.html", name: "ICP Hand-off", data_source: "data/icp_queue.csv", verified: false, verified_at: null },
    journeys: { id: "journeys", file: "widgets/journeys.html", name: "Journeys", data_source: "data/journeys.csv", verified: false, verified_at: null },
    honest_limits: { id: "honest_limits", file: "widgets/honest_limits.html", name: "Honest Limits", data_source: "data/methodology.json", verified: false, verified_at: null },
  },
};

// Paid Media ROI dashboard — self-contained HTML rendered in the artifact
// iframe. Built data-driven from the six-section spec (KPIs, ROAS truth, this
// week's moves, what moved, ICP hand-off queue, plays that close).
const PMR_KPIS = [
  { label: "Spend · This Week", value: "$13.6K", sub: "15 live campaigns", hl: false },
  { label: "True ROAS · 90d", value: "3.61×", sub: "Platforms claim <s>0.96×</s>", hl: true },
  { label: "Pipeline Influenced · 90d", value: "$2.72M", sub: "16.7× on paid spend", hl: false },
  { label: "Closed-Won Attributed", value: "$588.5K", sub: "9 deals from paid", hl: false },
];

const PMR_CHANNELS = [
  { name: "Google", campaigns: "6 campaigns", accent: "#08BD50", roasColor: "#08BD50", roas: "4.81×", claim: "0.65×", delta: "+4.16×", dir: "up", spend: "$77.4K", won: "$372.6K · 4", pipe: "$1.04M · 22 deals · 13.5× on spend" },
  { name: "LinkedIn", campaigns: "5 campaigns", accent: "#1B3A8B", roasColor: "#3661ED", roas: "3.14×", claim: "1.28×", delta: "+1.87×", dir: "up", spend: "$61.0K", won: "$191.7K · 2", pipe: "$870.9K · 13 deals · 14.3× on spend" },
  { name: "Meta", campaigns: "4 campaigns", accent: "#3661ED", roasColor: "#3661ED", roas: "0.98×", claim: "1.18×", delta: "−0.20×", dir: "down", spend: "$24.7K", won: "$24.3K · 3", pipe: "$805.5K · 18 deals · 32.6× on spend" },
];

const PMR_MOVES = [
  { n: 1, color: "#F93D3D", bg: "#FFF2F2", tag: "Pause & rotate", camp: "G_Search_NonBrand_Automation", line: "<b>Google — Non-Brand / Search</b> · sharp ROAS decline WoW — investigate audience or creative", stats: "7d spend $2,285 · platform ROAS 0.31× · WoW −50%", rLabel: "Waste Avoided · 7d", rValue: "$1.1K", rColor: "#F93D3D" },
  { n: 2, color: "#08BD50", bg: "#EBFFF3", tag: "Shift spend", camp: "G_Display_Prospecting", line: "<b>Google — Display</b> · highest CRM-grounded ROAS channel (4.8×)", stats: "Move $2K/wk from underperforming Meta channel · projected +$9,623 pipeline", rLabel: "Projected · 30d", rValue: "+$41.4K", rColor: "#08BD50" },
  { n: 3, color: "#E0A422", bg: "#FEF3D5", tag: "Flag for review", camp: "All Meta Ads campaigns", line: "<b>Meta Ads portfolio</b> · CRM ROAS (0.98×) barely covers spend — closed-won revenue does not justify current investment", stats: "$24,722 spent · $24,273 closed-won · portfolio-wide 7d spend $2,371", rLabel: "Spend at Risk · 7d", rValue: "$2.4K", rColor: "#B7791F" },
];

const PMR_MOVED = [
  { dot: "#08BD50", chan: "Google · Non-Brand / Search", camp: "G_Search_NonBrand_Automation", spend: "$2.3K", from: "0.31×", to: "4.81×", wow: "−50%", dir: "down", pipe: "$11.0K" },
  { dot: "#3661ED", chan: "Meta · Other", camp: "Meta_Summer_Promo_V3", spend: "$700", from: "0.72×", to: "0.98×", wow: "−85%", dir: "down", pipe: "$687" },
  { dot: "#3661ED", chan: "Meta · Retargeting", camp: "Meta_Retarget_WebVisitors", spend: "$667", from: "1.01×", to: "0.98×", wow: "+39%", dir: "up", pipe: "$655" },
  { dot: "#08BD50", chan: "Google · Display", camp: "G_Display_Prospecting", spend: "$437", from: "1.00×", to: "4.81×", wow: "+36%", dir: "up", pipe: "$2.1K" },
];

const PMR_ACCOUNTS = [
  { name: "Walter, Edwards and Rios", buyers: 9, meta: "Education · 345 employees · EMEA", li: 1, em: 6, sql: "5 SQL+", cta: "assign" },
  { name: "Rodriguez LLC", buyers: 7, meta: "Manufacturing · 109 employees · EMEA", li: 2, em: 3, sql: "3 SQL+", cta: "assign" },
  { name: "Jones Inc", buyers: 6, meta: "Professional Services · 316 employees · NA-East", li: 2, em: 3, sql: "3 SQL+", cta: "assign" },
  { name: "Novak PLC", buyers: 5, meta: "Education · 412 employees · APAC", li: 3, em: 2, sql: "4 SQL+", cta: "assign" },
  { name: "Ferrell, Rice and Maddox", buyers: 5, meta: "Professional Services · 551 employees · NA-East", li: 2, em: 3, sql: "1 SQL+", cta: "assign" },
  { name: "Johnson-Doyle", buyers: 5, meta: "Media · 112 employees · NA-West", li: 1, em: 1, sql: "5 SQL+", cta: "assign" },
  { name: "Powell LLC", buyers: 5, meta: "Finance · 995 employees · EMEA", li: 4, em: 1, sql: "1 SQL+", cta: "assign" },
  { name: "Baker and Sons", buyers: 4, meta: "Retail · 124 employees · NA-East", li: 1, em: 2, sql: "2 SQL+", cta: "assign" },
  { name: "Mcclure, Ward and Lee", buyers: 5, meta: "Healthcare · 77 employees · NA-West", li: 1, em: 2, sql: "", cta: "review" },
  { name: "Dyer, Potter and Mack", buyers: 4, meta: "Media · 351 employees · NA-West", li: 2, em: 1, sql: "1 SQL+", cta: "assign" },
  { name: "Moore-Bass", buyers: 4, meta: "Retail · 247 employees · APAC", li: 1, em: 1, sql: "4 SQL+", cta: "assign" },
  { name: "Henderson, Ramirez and Lewis", buyers: 4, meta: "Finance · 50 employees · EMEA", li: 3, em: 1, sql: "3 SQL+", cta: "assign" },
];

const PMR_PATHS = [
  { rank: "#1 · Highest volume", meta: "2 deals · avg $108.8K", value: "$217.7K", chips: [["Google Ads", "g"], ["Meta Ads", "m"], ["Google Ads", "g"], ["Closed Won", "w"]] },
  { rank: "#2 · Highest value", meta: "4 deals · avg $48.7K", value: "$195.0K", chips: [["Google Ads", "g"], ["LinkedIn Ads", "l"], ["Organic Search", "o"], ["Closed Won", "w"]] },
  { rank: "#3 · Runner-up", meta: "3 deals · avg $61.3K", value: "$184.0K", chips: [["Google Ads", "g"], ["Email", "e"], ["Closed Won", "w"]] },
];

const pmrKpis = PMR_KPIS.map((k) => `
  <div class="kpi ${k.hl ? "kpi--hl" : ""}">
    <div class="kpi-lbl">${k.label}</div>
    <div class="kpi-val">${k.value}</div>
    <div class="kpi-sub">${k.sub}</div>
  </div>`).join("");

const pmrChannels = PMR_CHANNELS.map((c) => `
  <div class="chan" style="border-left:4px solid ${c.accent}">
    <div class="chan-top"><span class="chan-name">${c.name}</span><span class="chan-camps">${c.campaigns}</span></div>
    <div class="chan-claim">Platform claims <s>${c.claim}</s></div>
    <div class="chan-roas-row"><span class="chan-roas" style="color:${c.roasColor}">${c.roas}</span><span class="delta delta-${c.dir}">${c.dir === "up" ? "↑" : "↓"} ${c.delta}</span></div>
    <div class="chan-sw"><div><div class="mini-lbl">Spend</div><div class="mini-val">${c.spend}</div></div><div><div class="mini-lbl">Won</div><div class="mini-val">${c.won}</div></div></div>
    <div class="chan-pipe"><div class="mini-lbl">Open Pipeline</div><div class="mini-val">${c.pipe}</div></div>
  </div>`).join("");

const pmrMoves = PMR_MOVES.map((m) => `
  <div class="move">
    <div class="move-num" style="color:${m.color};border-color:${m.color};background:${m.bg}">${m.n}</div>
    <div class="move-body">
      <div class="move-head"><span class="tag" style="background:${m.bg};color:${m.color}">${m.tag}</span><span class="move-camp">${m.camp}</span></div>
      <div class="move-line">${m.line}</div>
      <div class="move-stats">${m.stats}</div>
    </div>
    <div class="move-right"><div class="mini-lbl">${m.rLabel}</div><div class="move-val" style="color:${m.rColor}">${m.rValue}</div></div>
  </div>`).join("");

const pmrMoved = PMR_MOVED.map((r) => `
  <tr>
    <td><span class="cdot" style="background:${r.dot}"></span>${r.chan}</td>
    <td>${r.camp}</td>
    <td class="num">${r.spend}</td>
    <td class="num"><s>${r.from}</s> <span class="arrow">→</span> <b style="color:var(--primary)">${r.to}</b></td>
    <td class="num wow-${r.dir}">${r.dir === "up" ? "↗" : "↘"} ${r.wow}</td>
    <td class="num">${r.pipe}</td>
  </tr>`).join("");

const pmrAccounts = PMR_ACCOUNTS.map((a) => `
  <div class="acct">
    <div class="acct-top"><span class="acct-name">${a.name}</span><span class="acct-buyers">${a.buyers} buyers</span></div>
    <div class="acct-meta">${a.meta}</div>
    <div class="acct-sig"><span class="sig sig-li">in ${a.li}</span><span class="sig sig-ml">✉ ${a.em}</span>${a.sql ? `<span class="sig sig-sql">${a.sql}</span>` : ""}</div>
    <div class="acct-foot">
      <div><div class="mini-lbl">Est. Potential</div><div class="acct-pot">$55K</div></div>
      ${a.cta === "assign" ? '<span class="acct-cta">→ Assign to SDR — active SQL</span>' : '<span class="acct-cta acct-cta--review">⌕ Review</span>'}
    </div>
  </div>`).join("");

const pmrPaths = PMR_PATHS.map((p) => {
  const chips = p.chips.map(([label, k], i) => `${i ? '<span class="chip-arrow">›</span>' : ""}<span class="chip chip-${k}">${label}</span>`).join("");
  return `
  <div class="path">
    <div class="path-left">
      <div class="path-head"><span class="rankpill">${p.rank}</span><span class="path-meta">${p.meta}</span></div>
      <div class="path-chips">${chips}</div>
    </div>
    <div class="path-val">${p.value}</div>
  </div>`;
}).join("");

// Shared styles + per-section bodies, so the FULL dashboard and each individual
// widget (previewed one-by-one in the Verify & Publish modal) render the exact
// same real markup — nothing is a placeholder.
const PMR_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
  :root{--ink:#232532;--muted:#757A97;--muted2:#8E93AF;--line:#EEF0F7;--line2:#E3E7F2;--primary:#3661ED;--purple:#6E56CF;--purple-bg:#F5F3FF;--purple-line:#D9CFF5;--green:#08BD50;--green-bg:#EBFFF3;--red:#F93D3D;--red-bg:#FFF2F2;}
  *{box-sizing:border-box;}
  body{margin:0;font-family:'Poppins',system-ui,-apple-system,sans-serif;color:var(--ink);background:#fff;-webkit-font-smoothing:antialiased;}
  .wrap{max-width:1080px;margin:0 auto;padding:28px 26px 72px;}
  .mini-lbl{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted2);font-weight:600;}
  .mini-val{font-size:13px;font-weight:600;color:var(--ink);margin-top:3px;}
  s{color:var(--muted);}
  .hero{background:linear-gradient(180deg,#F6F5FC,#FBFBFE);border:1px solid var(--line2);border-radius:20px;padding:26px 26px 22px;margin-bottom:20px;}
  .hero-top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;}
  .hero h1{font-size:28px;font-weight:600;margin:0;}
  .hero-pills{display:flex;gap:8px;flex-wrap:wrap;}
  .pill{background:#ECE8FA;color:var(--purple);font-size:12px;font-weight:500;padding:6px 12px;border-radius:999px;white-space:nowrap;}
  .hero-sub{color:var(--muted);font-size:14px;margin:6px 0 20px;max-width:760px;}
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}
  .kpi{background:#fff;border:1px solid var(--line2);border-radius:14px;padding:16px 18px;}
  .kpi--hl{background:var(--purple-bg);border:1.5px solid var(--purple-line);}
  .kpi-lbl{font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);font-weight:600;}
  .kpi-val{font-size:28px;font-weight:600;margin:8px 0 4px;}
  .kpi--hl .kpi-val{color:var(--purple);}
  .kpi-sub{font-size:12px;color:var(--muted);}
  .section{border-radius:18px;padding:26px 26px 24px;margin-bottom:20px;}
  .section--solid{border:1.5px solid var(--primary);}
  .section--dashed{border:1.5px dashed #C7CCDE;}
  .eyebrow{display:inline-block;background:#EEEAFB;color:var(--purple);font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:5px 10px;border-radius:7px;margin-bottom:12px;}
  .section h2{font-size:21px;font-weight:600;margin:0 0 6px;}
  .section-sub{color:var(--muted);font-size:14px;margin:0 0 20px;max-width:840px;}
  .section-sub b{color:var(--ink);}
  .hl-green{color:var(--green);font-weight:600;}
  .chan-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
  .chan{background:#FBFBFD;border:1px solid var(--line2);border-radius:14px;padding:16px 18px;}
  .chan-top{display:flex;justify-content:space-between;align-items:baseline;}
  .chan-name{font-size:16px;font-weight:600;}
  .chan-camps{font-size:12px;color:var(--muted);}
  .chan-claim{font-size:12.5px;color:var(--muted);margin:12px 0 6px;}
  .chan-roas-row{display:flex;align-items:center;gap:10px;margin-bottom:16px;}
  .chan-roas{font-size:34px;font-weight:700;line-height:1;}
  .delta{font-size:12px;font-weight:600;padding:3px 9px;border-radius:999px;}
  .delta-up{color:var(--green);background:var(--green-bg);}
  .delta-down{color:var(--red);background:var(--red-bg);}
  .chan-sw{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding-top:12px;border-top:1px solid var(--line);}
  .chan-pipe{margin-top:12px;}
  .blended{display:flex;justify-content:space-between;align-items:center;gap:16px;background:var(--purple-bg);border-radius:12px;padding:14px 18px;margin-top:14px;flex-wrap:wrap;}
  .blended-lbl{font-size:11px;font-weight:700;letter-spacing:.05em;color:var(--purple);text-transform:uppercase;}
  .blended-stats{font-size:13px;color:#5b4bb0;margin-top:3px;}
  .blended-right{display:flex;align-items:center;gap:12px;}
  .blended-right s{font-size:15px;}
  .blended-roas{font-size:28px;font-weight:700;color:var(--purple);}
  .callout{border-left:3px solid var(--primary);background:#FAFBFF;border-radius:0 10px 10px 0;padding:14px 16px;font-size:13.5px;color:#3a3f52;margin-top:16px;line-height:1.55;}
  .move{display:flex;align-items:flex-start;gap:14px;background:#FAFAFC;border:1px solid var(--line);border-radius:14px;padding:16px 18px;margin-bottom:12px;}
  .move-num{flex-shrink:0;width:34px;height:34px;border:2px solid;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;}
  .move-body{flex:1;min-width:0;}
  .move-head{display:flex;align-items:center;gap:10px;margin-bottom:5px;flex-wrap:wrap;}
  .tag{font-size:11px;font-weight:600;padding:3px 9px;border-radius:6px;}
  .move-camp{font-size:14px;font-weight:600;}
  .move-line{font-size:13.5px;color:#3a3f52;margin-bottom:4px;}
  .move-line b{color:var(--ink);}
  .move-stats{font-size:12px;color:var(--muted);}
  .move-right{flex-shrink:0;text-align:right;}
  .move-val{font-size:22px;font-weight:700;margin-top:3px;}
  .tbl{width:100%;border-collapse:collapse;font-size:13.5px;}
  .tbl th{text-align:left;font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);font-weight:600;padding:0 12px 10px;border-bottom:1px solid var(--line2);}
  .tbl th.num,.tbl td.num{text-align:right;}
  .tbl td{padding:12px;border-bottom:1px solid var(--line);}
  .cdot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:8px;vertical-align:middle;}
  .arrow{color:#B7BCD0;}
  .wow-up{color:var(--green);font-weight:600;}
  .wow-down{color:var(--red);font-weight:600;}
  .tbl-foot{display:flex;justify-content:space-between;align-items:center;padding:14px 12px 0;font-size:13px;color:var(--muted);}
  .tbl-foot b{color:var(--ink);}
  .icp-wrap{border-left:3px solid var(--red);background:#FCFBFC;border-radius:0 12px 12px 0;padding:16px;}
  .icp-head{display:flex;align-items:center;gap:10px;margin-bottom:14px;}
  .icp-pill{background:var(--red-bg);color:var(--red);font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:4px 10px;border-radius:7px;}
  .icp-count{font-size:13px;color:var(--muted);}
  .acct-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}
  .acct{background:#fff;border:1px solid var(--line2);border-radius:12px;padding:14px;}
  .acct-top{display:flex;justify-content:space-between;align-items:baseline;gap:8px;}
  .acct-name{font-size:13.5px;font-weight:600;line-height:1.25;}
  .acct-buyers{font-size:12px;font-weight:600;color:var(--red);white-space:nowrap;}
  .acct-meta{font-size:11.5px;color:var(--muted);margin:6px 0 10px;}
  .acct-sig{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;}
  .sig{font-size:11px;font-weight:600;padding:2px 7px;border-radius:6px;}
  .sig-li{background:#E7EEFC;color:#1B3A8B;}
  .sig-ml{background:#F0F1F6;color:#52577A;}
  .sig-sql{background:var(--green-bg);color:var(--green);}
  .acct-foot{display:flex;justify-content:space-between;align-items:flex-end;gap:8px;border-top:1px solid var(--line);padding-top:10px;}
  .acct-pot{font-size:15px;font-weight:600;margin-top:2px;}
  .acct-cta{font-size:11.5px;font-weight:600;color:var(--green);}
  .acct-cta--review{color:var(--muted);}
  .path{display:flex;justify-content:space-between;align-items:center;gap:16px;background:#FAFAFC;border:1px solid var(--line);border-radius:14px;padding:16px 18px;margin-bottom:12px;flex-wrap:wrap;}
  .path-head{display:flex;align-items:center;gap:10px;margin-bottom:12px;}
  .rankpill{background:#EEEAFB;color:var(--purple);font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:4px 9px;border-radius:6px;}
  .path-meta{font-size:12.5px;color:var(--muted);}
  .path-chips{display:flex;align-items:center;gap:4px;flex-wrap:wrap;}
  .chip{display:inline-flex;align-items:center;padding:6px 13px;border-radius:999px;font-size:13px;font-weight:600;border:1.5px solid;background:#fff;}
  .chip-g{color:var(--green);border-color:#9BE7BC;}
  .chip-m{color:var(--primary);border-color:#B8C9F6;}
  .chip-l{color:#1B3A8B;border-color:#9DB2E8;}
  .chip-o{color:var(--purple);border-color:#C9BEF0;}
  .chip-e{color:#D9880A;border-color:#F3D9A0;}
  .chip-w{color:var(--green);border-color:#9BE7BC;background:#F1FBF5;}
  .chip-arrow{color:#C2C7D8;margin:0 2px;font-size:15px;}
  .path-val{font-size:22px;font-weight:700;color:var(--green);}
  .method{background:#FAFAFC;border:1px solid var(--line2);border-radius:16px;padding:22px 24px;}
  .method-title{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:14px;}
  .method ul{margin:0;padding:0;list-style:none;}
  .method li{font-size:13px;color:#3a3f52;padding:5px 0 5px 18px;position:relative;line-height:1.5;}
  .method li:before{content:'·';position:absolute;left:4px;color:var(--muted2);font-weight:700;}
  .method-foot{display:flex;justify-content:space-between;gap:12px;margin-top:16px;padding-top:14px;border-top:1px solid var(--line);font-size:11.5px;color:var(--muted);flex-wrap:wrap;}
  @media (max-width:820px){.kpis,.chan-grid{grid-template-columns:1fr 1fr;}.acct-grid{grid-template-columns:1fr 1fr;}}
`;

const pmrDoc = (inner) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Paid Media ROI</title>
<style>${PMR_CSS}</style>
</head><body><div class="wrap">${inner}</div></body></html>`;

const PMR_SEC_HEADER = `
    <div class="hero">
      <div class="hero-top">
        <h1>Paid Media ROI</h1>
        <div class="hero-pills">
          <span class="pill">◎ Attribution: opp.leadsource (U-shaped)</span>
          <span class="pill">🗓 90d · anchored 2026-04-13</span>
        </div>
      </div>
      <p class="hero-sub">The real ROAS across LinkedIn, Google, and Meta — graded against closed-won revenue, not platform pixels.</p>
      <div class="kpis">${pmrKpis}</div>
    </div>`;

const PMR_SEC_CHANNEL = `
    <div class="section section--solid">
      <span class="eyebrow">02 · The ROAS Truth</span>
      <h2>Every platform marks its own homework. Here's what the CRM says.</h2>
      <p class="section-sub">Per-channel ROAS: what the platform reports vs. closed-won revenue attributed via opportunity.leadsource.</p>
      <div class="chan-grid">${pmrChannels}</div>
      <div class="blended">
        <div><div class="blended-lbl">Blended · all paid channels</div><div class="blended-stats">$163.1K spend · $588.5K closed-won · 9 deals</div></div>
        <div class="blended-right"><s>0.96×</s><span class="blended-roas">3.61×</span></div>
      </div>
      <div class="callout">Google is doing the heaviest lifting at 4.8× CRM-grounded ROAS while its own platform reports 0.65×. Meta is the opposite story — the platform claims 1.18× but closed-won revenue barely covers spend at 0.98×.</div>
    </div>`;

const PMR_SEC_ACTIONS = `
    <div class="section section--solid">
      <span class="eyebrow">03 · This Week's Moves</span>
      <h2>Three moves for this week</h2>
      <p class="section-sub">Ranked by dollars at risk &amp; upside. Projected impact: <span class="hl-green">+$41.4K pipeline / 30d</span>, $1.1K savings avoided this week.</p>
      ${pmrMoves}
    </div>`;

const PMR_SEC_MOVERS = `
    <div class="section section--dashed">
      <span class="eyebrow">04 · What Moved This Week</span>
      <h2>4 campaigns moved ≥15% WoW</h2>
      <p class="section-sub">Sorted by dollars at risk. Everything else is folded into the stable row below.</p>
      <table class="tbl">
        <thead><tr><th>Channel</th><th>Campaign</th><th class="num">Spend · 7d</th><th class="num">Platform → True ROAS</th><th class="num">WoW Δ</th><th class="num">Pipeline · 7d (est)</th></tr></thead>
        <tbody>${pmrMoved}</tbody>
      </table>
      <div class="tbl-foot"><span>✓ <b>11 stable campaigns</b> · $9.5K/wk · avg 1.11× platform ROAS</span><span>No action needed</span></div>
    </div>`;

const PMR_SEC_ICP = `
    <div class="section section--solid">
      <span class="eyebrow">05 · ICP Hand-off Queue</span>
      <h2>In-market, no open pipeline · 12 ICP accounts engaging with your ads</h2>
      <p class="section-sub">ICP accounts (target_account = True) with paid-engaged contacts, filtered to exclude accounts with open opps or recent wins. Ranked by engagement intensity. Total potential: <b>$666K</b>.</p>
      <div class="icp-wrap">
        <div class="icp-head"><span class="icp-pill">Strongly Engaged</span><span class="icp-count">12 accounts</span></div>
        <div class="acct-grid">${pmrAccounts}</div>
      </div>
    </div>`;

const PMR_SEC_JOURNEYS = `
    <div class="section section--dashed">
      <span class="eyebrow">06 · The Plays That Close</span>
      <h2>The 3 paths your closed-won deals actually ran</h2>
      <p class="section-sub">Reconstructed from contact lead sources on won accounts (last 90d). Every path terminates at Closed Won.</p>
      ${pmrPaths}
    </div>`;

const PMR_SEC_METHOD = `
    <div class="method">
      <div class="method-title">ⓘ Methodology &amp; Honest Limits</div>
      <ul>
        <li>~78% of closed-won deals have no paid lead source and aren't credited to paid channels.</li>
        <li>Attribution follows opportunity.leadsource (tenant-defined) — a channel is credited fully to the leadsource on the opportunity.</li>
        <li>Ad data ends 2026-04-13, 85 days behind today. 90d window = 2026-01-13 → 2026-04-13.</li>
        <li>Campaign-level Petavue ROAS is a platform-level allocation; CRM does not carry campaign IDs.</li>
        <li>Dark social and word-of-mouth touches are not captured.</li>
        <li>Meta platform ROAS overstates real closed-won impact; Google under-reports.</li>
      </ul>
      <div class="method-foot"><span>Attribution: U-shaped (40/20/40) — collapses to opp.leadsource for this tenant</span><span>Window: 90d · anchor 2026-04-13</span></div>
    </div>`;

export const PAID_MEDIA_ROI_HTML = pmrDoc(
  PMR_SEC_HEADER + PMR_SEC_CHANNEL + PMR_SEC_ACTIONS + PMR_SEC_MOVERS + PMR_SEC_ICP + PMR_SEC_JOURNEYS + PMR_SEC_METHOD
);

// The weekly AI summary rendered in the Verify & Publish "Generate AI summary"
// preview (and the Slack preview). Full GFM markdown — TL;DR + all section tables.
export const PMR_SUMMARY_MD = `# Paid Media ROI — Weekly GTM Summary

**Period:** Jan 13 – Apr 13, 2026 (90-day trailing window) · **Generated:** Jul 13, 2026
**Attribution model:** U-shaped (40 / 20 / 40) via \`opportunity.leadsource\`

---

## TL;DR

Paid media is generating real return — **3.6× CRM-grounded ROAS on $163K spend** — but platform dashboards are systematically lying about where it's coming from. Google is massively under-credited; Meta is over-credited and barely breaking even. One campaign needs to be paused this week. Twelve ICP accounts are warm and have no open opportunity.

## 01 · Headline KPIs

| Metric | Value |
| --- | --- |
| Total spend (90d) | $163,128 |
| Closed-won revenue (paid-sourced) | $588,508 |
| Petavue ROAS (CRM-grounded) | 3.61× |
| Platform-reported ROAS | 0.96× |
| Pipeline influenced | $2.72M |
| Won deals attributed to paid | 9 |
| Open paid-influenced deals | 53 |
| Active campaigns | 15 |
| This-week spend run rate | $13,583 / wk |

The 3.6× Petavue ROAS vs 0.96× platform ROAS gap is not a rounding error. Platform pixels attribute revenue to clicks; CRM attribution follows closed-won opportunity leadsource. The two numbers are measuring different things — and the platform number is the wrong one to optimize against.

## 02 · Channel Breakdown: Platform vs Reality

| Channel | Spend (90d) | Platform ROAS | Petavue ROAS | Won Revenue | Won Deals | Open Pipeline |
| --- | --- | --- | --- | --- | --- | --- |
| Google Ads | $77,434 | 0.65× | 4.81× | $372,571 | 4 | $1,044,419 |
| LinkedIn Ads | $60,973 | 1.28× | 3.14× | $191,664 | 2 | $870,876 |
| Meta Ads | $24,722 | 1.18× | 0.98× | $24,273 | 3 | $805,469 |
| **Blended** | **$163,128** | **0.96×** | **3.61×** | **$588,508** | **9** | **$2,720,764** |

**Key signal:** Meta is the only channel where platform overstates real ROAS (+16.6% gap). Google understates it by −644%. If you're running budget allocation off platform dashboards, you are shifting money away from your best-performing channel toward your worst.

## 03 · Three Moves for This Week

**🔴 #1 — PAUSE: G_Search_NonBrand_Automation (Google Ads)**
7-day spend: $2,285 · 7-day platform ROAS: 0.31× (vs channel avg 4.81×)
WoW change: −50% ROAS decline · Root cause: audience saturation or creative fatigue.
**Action:** Pause immediately; rotate creative or refresh targeting before reactivating. Est. weekly savings ~$1,143.

**🟡 #2 — SHIFT SPEND TO: G_Display_Prospecting (Google Ads)**
7-day spend: $437 · WoW change: +36% · CRM ROAS 4.81× (highest) · Platform ROAS 1.00×.
**Action:** Move ~$2K/week from underperforming Meta budget here. Projected 30-day pipeline uplift ~$41,379.

**🟠 #3 — FLAG FOR REVIEW: All Meta Ads campaigns**
90-day spend: $24,722 · closed-won $24,273 → CRM ROAS 0.98×. Weekly spend at risk: $2,371.
**Action:** Don't cut blindly — Meta carries $805K open pipeline. Run a 2-week hold test on Meta_Summer_Promo_V3 (WoW −85%) first; re-evaluate if closed-won ROAS stays below 1.2×.

## 04 · Campaign Movers (WoW ≥ ±15%)

| Campaign | Platform | 7d Spend | Platform ROAS | WoW Δ | Signal |
| --- | --- | --- | --- | --- | --- |
| G_Search_NonBrand_Automation | Google | $2,285 | 0.31× | −50% | ⚠️ Pause candidate |
| Meta_Summer_Promo_V3 | Meta | $700 | 0.72× | −85% | ⚠️ Deteriorating fast |
| Meta_Retarget_WebVisitors | Meta | $667 | 1.01× | +39% | Improving — monitor |
| G_Display_Prospecting | Google | $437 | 1.00× | +36% | Scale candidate |

11 campaigns are stable (combined $9,494/wk · avg platform ROAS 1.11×).

## 05 · ICP Accounts Ready for SDR Outreach

12 target accounts are paid-engaged, have no open opportunity, and no recent closed-won deal. Top 5 by engagement intensity:

| Account | Industry | Region | Paid Contacts | SQLs | Suggested Action |
| --- | --- | --- | --- | --- | --- |
| Walter, Edwards and Rios | Education | EMEA | 9 | 5 | Assign to SDR — active SQL |
| Rodriguez LLC | Manufacturing | EMEA | 7 | 3 | Assign to SDR — active SQL |
| Jones Inc | Professional Services | NA-East | 6 | 3 | Assign to SDR — active SQL |
| Novak PLC | Education | APAC | 5 | 4 | Assign to SDR — active SQL |
| Ferrell, Rice and Maddox | Professional Services | NA-East | 5 | 1 | Assign to SDR — active SQL |

7 additional accounts available in the full ICP queue. Deal potential benchmark: $55,480 per account.

## 06 · Winning Journey Patterns

All three top closed-won paths start with Google Ads — consistent with its 4.81× ROAS leadership.

| Journey | Frequency | Avg Deal Size | Total Revenue |
| --- | --- | --- | --- |
| Google Ads → Meta Ads → Google Ads → Closed Won | 2 deals | $108,838 | $217,675 (highest value) |
| Google Ads → LinkedIn Ads → Organic Search → Closed Won | 4 deals | $48,738 | $194,952 (highest frequency) |
| Google Ads → Email → Closed Won | 3 deals | $61,345 | $184,035 (fastest cycle) |

**Implication:** Google is the entry point for your best deals regardless of what closes them. Cutting Google Non-Brand broadly would break the top of every winning funnel.

## 07 · Methodology & Honest Limits

- **Attribution:** opportunity.leadsource (last-touch, tenant-defined standard). No unified touch table — cross-channel multi-touch is a proxy only.
- **Untracked closed-won share:** ~78%. Only 22% of closed-won deals carry a paid leadsource — a floor, not a ceiling, on paid media's contribution.
- **Ad data freshness:** ad-platform data ends 2026-04-13 (91 days behind today); all metrics anchor to that date, not the current week.
- **ICP engagement signals** are based on contact leadsource, not ad impressions; account-level frequency is unavailable.
- **ROAS calculations** use closed-won revenue only. Open pipeline figures are unadjusted (no stage weighting).

*Questions? Contact the Analytics team. Full interactive dashboard available internally.*
`;

// Per-section documents — real markup for each widget's preview in the V&P modal.
export const PMR_WIDGET_FILES = {
  header: pmrDoc(PMR_SEC_HEADER),
  channel_truth: pmrDoc(PMR_SEC_CHANNEL),
  actions: pmrDoc(PMR_SEC_ACTIONS),
  movers: pmrDoc(PMR_SEC_MOVERS),
  icp_handoff: pmrDoc(PMR_SEC_ICP),
  journeys: pmrDoc(PMR_SEC_JOURNEYS),
  honest_limits: pmrDoc(PMR_SEC_METHOD),
};

// ── Skill-flow dashboard: "Paid Media Performance" ────────────────────────
// A DIFFERENT dashboard from the chat-flow Paid Media ROI — a card-grid
// operational view. ONE registry drives the plan widgets, the Verify & Publish
// review widgets, the per-widget previews, AND the assembled final dashboard,
// so dropping a widget in the plan removes it from the built dashboard.
const SKILL_DASH_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
  :root{--ink:#1F2430;--muted:#6B7280;--line:#EAECEF;--teal:#0D787F;--teal-bg:#E6F4F5;--blue:#3661ED;--green:#08BD50;--red:#F93D3D;--amber:#E0A422;}
  *{box-sizing:border-box;}
  body{margin:0;font-family:'Poppins',system-ui,sans-serif;color:var(--ink);background:#F6F8FA;-webkit-font-smoothing:antialiased;}
  .sd-wrap{max-width:1120px;margin:0 auto;padding:12px;}
  .sd-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:20px;}
  .sd-head h1{font-size:24px;font-weight:600;margin:0;}
  .sd-head p{margin:4px 0 0;font-size:13px;color:var(--muted);}
  .sd-pill{background:var(--teal-bg);color:var(--teal);font-size:12px;font-weight:600;padding:6px 12px;border-radius:8px;white-space:nowrap;}
  .sd-inner{padding:10px;border:1px solid #d4d9ea;border-radius:8px;}
  .sd-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;}
  .sd-card{background:#fff;border:1px solid #eef0f7;border-radius:14px;padding:18px;box-shadow:0 1px 2px rgba(16,24,40,.04);}
  .sd-card--wide{grid-column:1 / -1;}
  .sd-card h3{font-size:14px;font-weight:600;margin:0 0 2px;}
  .sd-card .sub{font-size:11.5px;color:var(--muted);margin:0 0 14px;}
  .sd-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
  .sd-kpi .lbl{font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);font-weight:600;}
  .sd-kpi .val{font-size:22px;font-weight:700;margin-top:4px;}
  .sd-kpi .val.good{color:var(--green);}.sd-kpi .val.bad{color:var(--red);}
  .sd-bar-row{display:flex;align-items:center;gap:10px;margin-bottom:9px;font-size:12.5px;}
  .sd-bar-row .name{width:110px;flex-shrink:0;color:var(--ink);font-weight:500;}
  .sd-bar-track{flex:1;height:10px;background:#F0F2F5;border-radius:999px;overflow:hidden;}
  .sd-bar-fill{height:100%;border-radius:999px;}
  .sd-bar-row .amt{width:64px;text-align:right;flex-shrink:0;font-weight:600;font-variant-numeric:tabular-nums;}
  .sd-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;}
  table.sd-tbl{width:100%;border-collapse:collapse;font-size:12.5px;min-width:340px;}
  table.sd-tbl th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);font-weight:600;padding:0 10px 8px;border-bottom:1px solid var(--line);}
  table.sd-tbl th.num,table.sd-tbl td.num{text-align:right;}
  table.sd-tbl td{padding:9px 10px;border-bottom:1px solid var(--line);}
  .sd-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:7px;vertical-align:middle;}
  .sd-list-item{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--line);font-size:12.5px;}
  .sd-list-item:last-child{border-bottom:none;}
  .sd-tag{font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:6px;}
  .sd-tag.up{color:var(--green);background:#EBFFF3;}.sd-tag.down{color:var(--red);background:#FFF2F2;}.sd-tag.flat{color:var(--muted);background:#F0F2F5;}
  .sd-spark{display:flex;align-items:flex-end;gap:5px;height:56px;margin-top:4px;}
  .sd-spark span{flex:1;background:var(--teal);border-radius:4px 4px 0 0;opacity:.85;}
  @media (max-width:760px){.sd-grid{grid-template-columns:1fr;}.sd-kpis{grid-template-columns:1fr 1fr;}}
`;

const SKILL_DASH_WIDGETS = [
  {
    id: "scorecard", name: "Performance scorecard", kind: "stats",
    desc: "The headline paid-media KPIs — spend, ROAS, CPL, conversions — as a scorecard row.",
    body: `<section class="sd-card sd-card--wide"><h3>Performance scorecard</h3><p class="sub">Trailing 90 days · across Google, LinkedIn, Meta</p>
      <div class="sd-kpis">
        <div class="sd-kpi"><div class="lbl">Total spend</div><div class="val">$163.1K</div></div>
        <div class="sd-kpi"><div class="lbl">True ROAS</div><div class="val good">3.61×</div></div>
        <div class="sd-kpi"><div class="lbl">Cost per lead</div><div class="val">$182</div></div>
        <div class="sd-kpi"><div class="lbl">Conversions</div><div class="val">896</div></div>
        <div class="sd-kpi"><div class="lbl">Closed-won</div><div class="val">$588.5K</div></div>
        <div class="sd-kpi"><div class="lbl">Blended CTR</div><div class="val">2.4%</div></div>
      </div></section>`,
  },
  {
    id: "spend_by_channel", name: "Spend by channel", kind: "bars",
    desc: "How the 90-day budget is split across paid channels.",
    body: `<section class="sd-card"><h3>Spend by channel</h3><p class="sub">$163.1K total</p>
      <div class="sd-bar-row"><span class="name">Google</span><div class="sd-bar-track"><div class="sd-bar-fill" style="width:47%;background:#0D787F"></div></div><span class="amt">$77.4K</span></div>
      <div class="sd-bar-row"><span class="name">LinkedIn</span><div class="sd-bar-track"><div class="sd-bar-fill" style="width:37%;background:#1B3A8B"></div></div><span class="amt">$61.0K</span></div>
      <div class="sd-bar-row"><span class="name">Meta</span><div class="sd-bar-track"><div class="sd-bar-fill" style="width:15%;background:#3661ED"></div></div><span class="amt">$24.7K</span></div></section>`,
  },
  {
    id: "roas_trend", name: "ROAS trend", kind: "line",
    desc: "CRM-grounded ROAS week over week across the window.",
    body: `<section class="sd-card"><h3>ROAS trend</h3><p class="sub">True ROAS, last 12 weeks</p>
      <div class="sd-spark">${[38,42,40,47,51,49,55,52,58,60,57,61].map((h) => `<span style="height:${h}%"></span>`).join("")}</div>
      <div class="sd-bar-row" style="margin-top:12px"><span class="name">This week</span><div class="sd-bar-track"><div class="sd-bar-fill" style="width:72%;background:#08BD50"></div></div><span class="amt">3.61×</span></div></section>`,
  },
  {
    id: "channel_table", name: "Channel performance", kind: "table",
    desc: "Per-channel spend, conversions, CPA and true ROAS in one table.",
    body: `<section class="sd-card sd-card--wide"><h3>Channel performance</h3><p class="sub">Platform-reported vs CRM-grounded</p>
      <div class="sd-scroll"><table class="sd-tbl"><thead><tr><th>Channel</th><th class="num">Spend</th><th class="num">Conv.</th><th class="num">CPA</th><th class="num">Platform ROAS</th><th class="num">True ROAS</th></tr></thead><tbody>
      <tr><td><span class="sd-dot" style="background:#0D787F"></span>Google</td><td class="num">$77.4K</td><td class="num">512</td><td class="num">$151</td><td class="num">0.65×</td><td class="num"><b>4.81×</b></td></tr>
      <tr><td><span class="sd-dot" style="background:#1B3A8B"></span>LinkedIn</td><td class="num">$61.0K</td><td class="num">208</td><td class="num">$293</td><td class="num">1.28×</td><td class="num"><b>3.14×</b></td></tr>
      <tr><td><span class="sd-dot" style="background:#3661ED"></span>Meta</td><td class="num">$24.7K</td><td class="num">176</td><td class="num">$140</td><td class="num">1.18×</td><td class="num"><b>0.98×</b></td></tr>
      </tbody></table></div></section>`,
  },
  {
    id: "top_campaigns", name: "Top campaigns", kind: "list",
    desc: "Campaigns ranked by true ROAS, with week-over-week movement.",
    body: `<section class="sd-card"><h3>Top campaigns</h3><p class="sub">By true ROAS</p>
      <div class="sd-list-item"><span>G_Display_Prospecting</span><span><b>4.9×</b> <span class="sd-tag up">▲ 36%</span></span></div>
      <div class="sd-list-item"><span>LI_ABM_Enterprise</span><span><b>3.6×</b> <span class="sd-tag up">▲ 12%</span></span></div>
      <div class="sd-list-item"><span>G_Brand_Search</span><span><b>3.2×</b> <span class="sd-tag flat">— 2%</span></span></div>
      <div class="sd-list-item"><span>G_Search_NonBrand_Automation</span><span><b>0.3×</b> <span class="sd-tag down">▼ 50%</span></span></div></section>`,
  },
  {
    id: "audience_perf", name: "Audience performance", kind: "bars",
    desc: "ROAS by audience segment, so you know who to scale into.",
    body: `<section class="sd-card"><h3>Audience performance</h3><p class="sub">True ROAS by segment</p>
      <div class="sd-bar-row"><span class="name">ICP · Enterprise</span><div class="sd-bar-track"><div class="sd-bar-fill" style="width:90%;background:#08BD50"></div></div><span class="amt">4.5×</span></div>
      <div class="sd-bar-row"><span class="name">ICP · Mid-Market</span><div class="sd-bar-track"><div class="sd-bar-fill" style="width:66%;background:#0D787F"></div></div><span class="amt">3.3×</span></div>
      <div class="sd-bar-row"><span class="name">Retargeting</span><div class="sd-bar-track"><div class="sd-bar-fill" style="width:40%;background:#3661ED"></div></div><span class="amt">2.0×</span></div>
      <div class="sd-bar-row"><span class="name">Broad / Prospect</span><div class="sd-bar-track"><div class="sd-bar-fill" style="width:19%;background:#F93D3D"></div></div><span class="amt">0.9×</span></div></section>`,
  },
  {
    id: "budget_pacing", name: "Budget pacing", kind: "list",
    desc: "Spend vs budget per channel with end-of-period projection.",
    body: `<section class="sd-card"><h3>Budget pacing</h3><p class="sub">Month to date vs plan</p>
      <div class="sd-bar-row"><span class="name">Google</span><div class="sd-bar-track"><div class="sd-bar-fill" style="width:78%;background:#0D787F"></div></div><span class="amt">78%</span></div>
      <div class="sd-bar-row"><span class="name">LinkedIn</span><div class="sd-bar-track"><div class="sd-bar-fill" style="width:64%;background:#1B3A8B"></div></div><span class="amt">64%</span></div>
      <div class="sd-bar-row"><span class="name">Meta</span><div class="sd-bar-track"><div class="sd-bar-fill" style="width:103%;background:#F93D3D"></div></div><span class="amt">103%</span></div>
      <p class="sub" style="margin:10px 0 0">Meta is pacing 3% over plan — the one to trim.</p></section>`,
  },
];

const skillDashDoc = (bodies) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Paid Media Performance</title>
<style>${SKILL_DASH_CSS}</style></head>
<body><div class="sd-wrap">
  <div class="sd-inner">
    <div class="sd-head">
      <div><h1>Paid Media Performance</h1><p>Operational view across Google, LinkedIn &amp; Meta — CRM-grounded, refreshed daily.</p></div>
      <span class="sd-pill">◷ 90d · updated today</span>
    </div>
    <div class="sd-grid">${bodies}</div>
  </div>
</div></body></html>`;

// Assemble the final dashboard from the KEPT widgets (drop in the plan → gone here).
export function assembleSkillDashboard(keptIds) {
  const kept = Array.isArray(keptIds) && keptIds.length
    ? SKILL_DASH_WIDGETS.filter((w) => keptIds.includes(w.id))
    : SKILL_DASH_WIDGETS;
  return skillDashDoc(kept.map((w) => w.body).join("\n"));
}
// Per-widget docs (single card) for the plan / V&P previews.
export const SKILL_WIDGET_DOCS = Object.fromEntries(
  SKILL_DASH_WIDGETS.map((w) => [w.id, skillDashDoc(w.body)])
);
// Plan / review metadata (id + name + desc + schematic kind), the single source.
export const SKILL_DASH_META = SKILL_DASH_WIDGETS.map((w) => ({ id: w.id, name: w.name, desc: w.desc, kind: w.kind }));

// Re-point the Verify & Publish review manifest at the skill dashboard's
// widgets, so plan, review, and the built dashboard all show the same set.
DASHBOARD_MANIFEST.title = "Paid Media Performance";
DASHBOARD_MANIFEST.widgets = Object.fromEntries(
  SKILL_DASH_META.map((w) => [w.id, { id: w.id, file: `widgets/${w.id}.html`, name: w.name, data_source: "data/paid_media.json", verified: false, verified_at: null }])
);

// Extra workspace files the viewers/tree may request.
export const DASHBOARD_FILES = {
  // Skill-flow dashboard (assembled default) + its per-widget previews.
  "output/dashboard/skill_dashboard.html": { content: assembleSkillDashboard(), contentType: "text/html" },
  ...Object.fromEntries(SKILL_DASH_META.map((w) => [`output/dashboard/widgets/${w.id}.html`, { content: SKILL_WIDGET_DOCS[w.id], contentType: "text/html" }])),
  "output/dashboard/paid_media_roi.html": { content: PAID_MEDIA_ROI_HTML, contentType: "text/html" },
  // Per-widget sections rendered in the Verify & Publish widget preview.
  "output/dashboard/widgets/header.html": { content: PMR_WIDGET_FILES.header, contentType: "text/html" },
  "output/dashboard/widgets/channel_truth.html": { content: PMR_WIDGET_FILES.channel_truth, contentType: "text/html" },
  "output/dashboard/widgets/actions.html": { content: PMR_WIDGET_FILES.actions, contentType: "text/html" },
  "output/dashboard/widgets/movers.html": { content: PMR_WIDGET_FILES.movers, contentType: "text/html" },
  "output/dashboard/widgets/icp_handoff.html": { content: PMR_WIDGET_FILES.icp_handoff, contentType: "text/html" },
  "output/dashboard/widgets/journeys.html": { content: PMR_WIDGET_FILES.journeys, contentType: "text/html" },
  "output/dashboard/widgets/honest_limits.html": { content: PMR_WIDGET_FILES.honest_limits, contentType: "text/html" },
  "output/dashboard/revenue_dashboard.html": { content: DASHBOARD_HTML, contentType: "text/html" },
  "output/dashboard/index.html": { content: DASHBOARD_HTML, contentType: "text/html" },
  "output/dashboard/manifest.json": { content: JSON.stringify(DASHBOARD_MANIFEST, null, 2), contentType: "application/json" },
  "output/dashboard/runtime/app.js": { content: "/* mock dashboard runtime */", contentType: "application/javascript" },
  "output/dashboard/widgets/scoreboard.jsx": { content: "export default function Scoreboard({ data }) {\n  return <div className=\"scoreboard\">{/* KPI cards */}</div>\n}\n", contentType: "text/plain" },
  "output/dashboard/widgets/revenue_trend.jsx": { content: "export default function RevenueTrend({ data }) {\n  return <div className=\"revenue-trend\">{/* bar chart */}</div>\n}\n", contentType: "text/plain" },
  "output/dashboard/widgets/top_accounts.jsx": { content: "export default function TopAccounts({ data }) {\n  return <table>{/* top accounts */}</table>\n}\n", contentType: "text/plain" },
  "data/kpis.json": { content: JSON.stringify({ total_revenue: 4820000, new_arr: 1130000, win_rate: 0.274, avg_deal: 38600 }, null, 2), contentType: "application/json" },
  "data/revenue_by_month.csv": { content: "month,revenue\nApr,612000\nMay,758000\nJun,961000\nJul,672000\nAug,840000\nSep,1052000\n", contentType: "text/csv" },
  "data/top_accounts.csv": { content: "account,arr,status\nNorthwind Traders,412000,Expanding\nContoso Ltd,388000,Expanding\nGlobex Corp,301000,At risk\nInitech,276000,Stable\nUmbrella Inc,198000,At risk\n", contentType: "text/csv" },
};
