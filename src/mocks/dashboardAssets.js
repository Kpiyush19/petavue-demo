// Self-contained dashboard assets served by the mock file-serving layer.
// The dashboard HTML is fully inline (no external scripts/links) so it renders
// inside an iframe via `srcdoc` with no network dependency.

// Phosphor (regular) inline-SVG icons for the self-contained dashboards.
const PH_ICONS = {
  "chart-bar": "<path d=\"M224,200h-8V40a8,8,0,0,0-8-8H152a8,8,0,0,0-8,8V80H96a8,8,0,0,0-8,8v40H48a8,8,0,0,0-8,8v64H32a8,8,0,0,0,0,16H224a8,8,0,0,0,0-16ZM160,48h40V200H160ZM104,96h40V200H104ZM56,144H88v56H56Z\"/>",
  "lightning": "<path d=\"M215.79,118.17a8,8,0,0,0-5-5.66L153.18,90.9l14.66-73.33a8,8,0,0,0-13.69-7l-112,120a8,8,0,0,0,3,13l57.63,21.61L88.16,238.43a8,8,0,0,0,13.69,7l112-120A8,8,0,0,0,215.79,118.17ZM109.37,214l10.47-52.38a8,8,0,0,0-5-9.06L62,132.71l84.62-90.66L136.16,94.43a8,8,0,0,0,5,9.06l52.8,19.8Z\"/>",
  "table": "<path d=\"M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48ZM40,112H80v32H40Zm56,0H216v32H96ZM216,64V96H40V64ZM40,160H80v32H40Zm176,32H96V160H216v32Z\"/>",
  "video": "<path d=\"M251.77,73a8,8,0,0,0-8.21.39L208,97.05V72a16,16,0,0,0-16-16H32A16,16,0,0,0,16,72V184a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V159l35.56,23.71A8,8,0,0,0,248,184a8,8,0,0,0,8-8V80A8,8,0,0,0,251.77,73ZM192,184H32V72H192V184Zm48-22.95-32-21.33V116.28L240,95Z\"/>",
  "function": "<path d=\"M208,40a8,8,0,0,1-8,8H170.71a24,24,0,0,0-23.62,19.71L137.59,120H184a8,8,0,0,1,0,16H134.68l-10,55.16A40,40,0,0,1,85.29,224H56a8,8,0,0,1,0-16H85.29a24,24,0,0,0,23.62-19.71l9.5-52.29H72a8,8,0,0,1,0-16h49.32l10-55.16A40,40,0,0,1,170.71,32H200A8,8,0,0,1,208,40Z\"/>",
  "info": "<path d=\"M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-40a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40A8,8,0,0,1,144,176ZM112,84a12,12,0,1,1,12,12A12,12,0,0,1,112,84Z\"/>",
  "funnel": "<path d=\"M230.6,49.53A15.81,15.81,0,0,0,216,40H40A16,16,0,0,0,28.19,66.76l.08.09L96,139.17V216a16,16,0,0,0,24.87,13.32l32-21.34A16,16,0,0,0,160,194.66V139.17l67.74-72.32.08-.09A15.8,15.8,0,0,0,230.6,49.53ZM40,56h0Zm108.34,72.28A15.92,15.92,0,0,0,144,139.17v55.49L112,216V139.17a15.92,15.92,0,0,0-4.32-10.94L40,56H216Z\"/>",
  "warning": "<path d=\"M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8ZM120,144V104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,180Z\"/>",
  "buildings": "<path d=\"M240,208H224V96a16,16,0,0,0-16-16H144V32a16,16,0,0,0-24.88-13.32L39.12,72A16,16,0,0,0,32,85.34V208H16a8,8,0,0,0,0,16H240a8,8,0,0,0,0-16ZM208,96V208H144V96ZM48,85.34,128,32V208H48ZM112,112v16a8,8,0,0,1-16,0V112a8,8,0,1,1,16,0Zm-32,0v16a8,8,0,0,1-16,0V112a8,8,0,1,1,16,0Zm0,56v16a8,8,0,0,1-16,0V168a8,8,0,0,1,16,0Zm32,0v16a8,8,0,0,1-16,0V168a8,8,0,0,1,16,0Z\"/>",
  "target": "<path d=\"M221.87,83.16A104.1,104.1,0,1,1,195.67,49l22.67-22.68a8,8,0,0,1,11.32,11.32l-96,96a8,8,0,0,1-11.32-11.32l27.72-27.72a40,40,0,1,0,17.87,31.09,8,8,0,1,1,16-.9,56,56,0,1,1-22.38-41.65L184.3,60.39a87.88,87.88,0,1,0,23.13,29.67,8,8,0,0,1,14.44-6.9Z\"/>",
  "trend-up": "<path d=\"M240,56v64a8,8,0,0,1-16,0V75.31l-82.34,82.35a8,8,0,0,1-11.32,0L96,123.31,29.66,189.66a8,8,0,0,1-11.32-11.32l72-72a8,8,0,0,1,11.32,0L136,140.69,212.69,64H168a8,8,0,0,1,0-16h64A8,8,0,0,1,240,56Z\"/>",
  "dollar": "<path d=\"M152,120H136V56h8a32,32,0,0,1,32,32,8,8,0,0,0,16,0,48.05,48.05,0,0,0-48-48h-8V24a8,8,0,0,0-16,0V40h-8a48,48,0,0,0,0,96h8v64H104a32,32,0,0,1-32-32,8,8,0,0,0-16,0,48.05,48.05,0,0,0,48,48h16v16a8,8,0,0,0,16,0V216h16a48,48,0,0,0,0-96Zm-40,0a32,32,0,0,1,0-64h8v64Zm40,80H136V136h16a32,32,0,0,1,0,64Z\"/>",
  "trophy": "<path d=\"M232,64H208V56a16,16,0,0,0-16-16H64A16,16,0,0,0,48,56v8H24A16,16,0,0,0,8,80V96a40,40,0,0,0,40,40h3.65A80.13,80.13,0,0,0,120,191.61V216H96a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16H136V191.58c31.94-3.23,58.44-25.64,68.08-55.58H208a40,40,0,0,0,40-40V80A16,16,0,0,0,232,64ZM48,120A24,24,0,0,1,24,96V80H48v32q0,4,.39,8Zm144-8.9c0,35.52-28.49,64.64-63.51,64.9H128a64,64,0,0,1-64-64V56H192ZM232,96a24,24,0,0,1-24,24h-.5a81.81,81.81,0,0,0,.5-8.9V80h24Z\"/>",
  "users": "<path d=\"M117.25,157.92a60,60,0,1,0-66.5,0A95.83,95.83,0,0,0,3.53,195.63a8,8,0,1,0,13.4,8.74,80,80,0,0,1,134.14,0,8,8,0,0,0,13.4-8.74A95.83,95.83,0,0,0,117.25,157.92ZM40,108a44,44,0,1,1,44,44A44.05,44.05,0,0,1,40,108Zm210.14,98.7a8,8,0,0,1-11.07-2.33A79.83,79.83,0,0,0,172,168a8,8,0,0,1,0-16,44,44,0,1,0-16.34-84.87,8,8,0,1,1-5.94-14.85,60,60,0,0,1,55.53,105.64,95.83,95.83,0,0,1,47.22,37.71A8,8,0,0,1,250.14,206.7Z\"/>",
  "search": "<path d=\"M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z\"/>",
  "cursor": "<path d=\"M169.64,134.33l44.77-19.46A16,16,0,0,0,213,85.07L52.92,32.8A16,16,0,0,0,32.8,52.92L85.07,213a15.83,15.83,0,0,0,14.41,11l.79,0a15.83,15.83,0,0,0,14.6-9.59h0l19.46-44.77L184,219.31a16,16,0,0,0,22.63,0l12.68-12.68a16,16,0,0,0,0-22.63Zm-69.48,73.76.06-.05Zm95.15-.09-49.66-49.67a16,16,0,0,0-26,4.94l-19.42,44.65L48,48l159.87,52.21-44.64,19.41a16,16,0,0,0-4.94,26L208,195.31ZM88,24V16a8,8,0,0,1,16,0v8a8,8,0,0,1-16,0ZM8,96a8,8,0,0,1,8-8h8a8,8,0,0,1,0,16H16A8,8,0,0,1,8,96ZM120.85,28.42l8-16a8,8,0,0,1,14.31,7.16l-8,16a8,8,0,1,1-14.31-7.16Zm-81.69,96a8,8,0,0,1-3.58,10.74l-16,8a8,8,0,0,1-7.16-14.31l16-8A8,8,0,0,1,39.16,124.42Z\"/>",
  "envelope": "<path d=\"M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48Zm-96,85.15L52.57,64H203.43ZM98.71,128,40,181.81V74.19Zm11.84,10.85,12,11.05a8,8,0,0,0,10.82,0l12-11.05,58,53.15H52.57ZM157.29,128,216,74.18V181.82Z\"/>",
  "clock": "<path d=\"M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm64-88a8,8,0,0,1-8,8H128a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v48h48A8,8,0,0,1,192,128Z\"/>",
  "database": "<path d=\"M128,24C74.17,24,32,48.6,32,80v96c0,31.4,42.17,56,96,56s96-24.6,96-56V80C224,48.6,181.83,24,128,24Zm80,104c0,9.62-7.88,19.43-21.61,26.92C170.93,163.35,150.19,168,128,168s-42.93-4.65-58.39-13.08C55.88,147.43,48,137.62,48,128V111.36c17.06,15,46.23,24.64,80,24.64s62.94-9.68,80-24.64ZM69.61,53.08C85.07,44.65,105.81,40,128,40s42.93,4.65,58.39,13.08C200.12,60.57,208,70.38,208,80s-7.88,19.43-21.61,26.92C170.93,115.35,150.19,120,128,120s-42.93-4.65-58.39-13.08C55.88,99.43,48,89.62,48,80S55.88,60.57,69.61,53.08ZM186.39,202.92C170.93,211.35,150.19,216,128,216s-42.93-4.65-58.39-13.08C55.88,195.43,48,185.62,48,176V159.36c17.06,15,46.23,24.64,80,24.64s62.94-9.68,80-24.64V176C208,185.62,200.12,195.43,186.39,202.92Z\"/>",
  "gauge": "<path d=\"M207.06,80.67A111.24,111.24,0,0,0,128,48h-.4C66.07,48.21,16,99,16,161.13V184a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V160A111.25,111.25,0,0,0,207.06,80.67ZM224,184H119.71l54.76-75.3a8,8,0,0,0-12.94-9.42L99.92,184H32V161.13c0-3.08.15-6.12.43-9.13H56a8,8,0,0,0,0-16H35.27c10.32-38.86,44-68.24,84.73-71.66V88a8,8,0,0,0,16,0V64.33A96.14,96.14,0,0,1,221,136H200a8,8,0,0,0,0,16h23.67c.21,2.65.33,5.31.33,8Z\"/>",
  "arrow-up": "<path d=\"M205.66,117.66a8,8,0,0,1-11.32,0L136,59.31V216a8,8,0,0,1-16,0V59.31L61.66,117.66a8,8,0,0,1-11.32-11.32l72-72a8,8,0,0,1,11.32,0l72,72A8,8,0,0,1,205.66,117.66Z\"/>",
  "percent": "<path d=\"M205.66,61.64l-144,144a8,8,0,0,1-11.32-11.32l144-144a8,8,0,0,1,11.32,11.31ZM50.54,101.44a36,36,0,0,1,50.92-50.91h0a36,36,0,0,1-50.92,50.91ZM56,76A20,20,0,1,0,90.14,61.84h0A20,20,0,0,0,56,76ZM216,180a36,36,0,1,1-10.54-25.46h0A35.76,35.76,0,0,1,216,180Zm-16,0a20,20,0,1,0-5.86,14.14A19.87,19.87,0,0,0,200,180Z\"/>",
  "crosshair": "<path d=\"M232,120h-8.34A96.14,96.14,0,0,0,136,32.34V24a8,8,0,0,0-16,0v8.34A96.14,96.14,0,0,0,32.34,120H24a8,8,0,0,0,0,16h8.34A96.14,96.14,0,0,0,120,223.66V232a8,8,0,0,0,16,0v-8.34A96.14,96.14,0,0,0,223.66,136H232a8,8,0,0,0,0-16Zm-96,87.6V200a8,8,0,0,0-16,0v7.6A80.15,80.15,0,0,1,48.4,136H56a8,8,0,0,0,0-16H48.4A80.15,80.15,0,0,1,120,48.4V56a8,8,0,0,0,16,0V48.4A80.15,80.15,0,0,1,207.6,120H200a8,8,0,0,0,0,16h7.6A80.15,80.15,0,0,1,136,207.6ZM128,88a40,40,0,1,0,40,40A40,40,0,0,0,128,88Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,152Z\"/>",
};
const ic = (n, s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 256 256" fill="currentColor" style="display:inline-block;vertical-align:-0.15em;flex-shrink:0">${PH_ICONS[n] || ""}</svg>`;

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
  .wrap{max-width:none;margin:0;padding:28px 26px 72px;}
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
      <div class="method-title">${ic('info',15)} Methodology &amp; Honest Limits</div>
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
// ─────────────────────────────────────────────────────────────────────────
// Creative & Ad Performance dashboard — cross-platform (Facebook / Google /
// LinkedIn) creative + spend view. Mock data: numbers are invented and do not
// represent any real account. No customer/company names appear (platform-level
// only); campaign names are generic stock labels.
// ─────────────────────────────────────────────────────────────────────────
const CAP_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
  :root{--fb:#7B61FF;--gg:#08BD50;--li:#2F6BFF;--ink:#1a1f36;--muted:#6b7280;--line:#e9ebf2;--bg:#f4f6fb;--card:#fff;--warn:#E0A422;--down:#E5484D;--up:#12b76a;--radius:14px;}
  *{box-sizing:border-box;}
  body{margin:0;font-family:'Poppins',system-ui,sans-serif;color:var(--ink);background:var(--bg);-webkit-font-smoothing:antialiased;font-size:13px;}
  .wrap{max-width:none;margin:0;padding:24px 26px 72px;display:flex;flex-direction:column;gap:22px;}
  .card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:22px 24px;}
  .sec-title{display:flex;align-items:center;gap:9px;font-size:17px;font-weight:700;margin:0;}
  .sec-sub{font-size:12.5px;color:var(--muted);margin:4px 0 18px;}
  .sec-sub i{font-style:italic;}
  .two{display:grid;grid-template-columns:1fr 1fr;gap:22px;align-items:stretch;}
  .num{text-align:right;font-variant-numeric:tabular-nums;}
  .up{color:var(--up);}.down{color:var(--down);}
  s{color:var(--muted);}

  /* hero */
  .hero{border-radius:18px;padding:26px 30px;color:#fff;background:linear-gradient(120deg,#3a2c86 0%,#241a68 60%,#1c1550 100%);position:relative;overflow:hidden;}
  .hero-top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;}
  .hero h1{margin:0;font-size:26px;font-weight:700;display:flex;align-items:center;gap:10px;}
  .hero-win{margin:6px 0 0;font-size:13px;color:rgba(255,255,255,.72);}
  .hero-win b{color:#fff;font-weight:600;}
  .plats{display:flex;gap:8px;}
  .plat{padding:8px 16px;border-radius:10px;font-size:13px;font-weight:600;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.14);}
  .plat.fb{box-shadow:inset 0 -2px 0 var(--fb);}.plat.gg{box-shadow:inset 0 -2px 0 var(--gg);}.plat.li{box-shadow:inset 0 -2px 0 var(--li);}
  .hero-warn{margin-top:20px;background:rgba(224,164,34,.14);border:1px solid rgba(224,164,34,.4);border-radius:12px;padding:13px 16px;font-size:12.5px;color:#ffe9bd;line-height:1.55;}
  .hero-warn b{color:#fff;}

  /* key metrics */
  .km-head{display:flex;align-items:baseline;gap:10px;margin-bottom:16px;}
  .km-head .t{font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px;}
  .km-head .m{font-size:12px;color:var(--muted);}
  .kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(215px,1fr));gap:14px;}
  .kpi{background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px 18px;}
  .kpi.warn{border:1px solid rgba(224,164,34,.5);background:#fffdf6;}
  .kpi-lbl{font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);}
  .kpi-val{font-size:28px;font-weight:700;margin:6px 0 4px;letter-spacing:-.02em;}
  .kpi-d{font-size:12.5px;font-weight:600;}
  .kpi-cap{font-size:11.5px;color:var(--muted);font-style:italic;margin-top:8px;line-height:1.45;}
  .kpi-warn-txt{font-size:12px;color:var(--warn);font-weight:600;margin-top:4px;}

  /* platform spend mini-cards */
  .pcards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px;}
  .pcard{border:1px solid var(--line);border-radius:12px;padding:14px 16px;background:#fbfbfe;}
  .pcard .p{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);}
  .pcard .v{font-size:24px;font-weight:700;margin:6px 0 2px;}
  .pcard .s{font-size:11.5px;color:var(--muted);}

  /* tables */
  table.t{width:100%;border-collapse:collapse;font-size:12.5px;}
  table.t th{text-align:left;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);padding:8px 10px;border-bottom:1px solid var(--line);}
  table.t td{padding:11px 10px;border-bottom:1px solid var(--line);vertical-align:top;}
  table.t tr:last-child td{border-bottom:none;}
  table.t .cap{display:block;font-size:10.5px;color:var(--muted);font-style:italic;margin-top:2px;}
  table.t .rowh{font-weight:600;}
  .th-fb{color:var(--fb);}.th-gg{color:var(--gg);}.th-li{color:var(--li);}
  .foot{font-size:11px;color:var(--muted);font-style:italic;margin-top:12px;line-height:1.5;}
  .warnmini{color:var(--warn);font-weight:600;}
  .pcomp-scroll{max-height:238px;overflow-y:auto;}
  .pcomp-scroll table.t thead th{position:sticky;top:0;background:#fff;z-index:1;}

  /* weekly grouped table */
  .scroll{overflow-x:auto;}
  table.wk{width:100%;border-collapse:collapse;font-size:12px;min-width:1040px;}
  table.wk th{padding:7px 9px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:var(--muted);border-bottom:1px solid var(--line);text-align:right;}
  table.wk th.w,table.wk td.w{text-align:left;}
  table.wk th.gfb{color:var(--fb);border-left:3px solid var(--fb);}
  table.wk th.ggg{color:var(--gg);border-left:3px solid var(--gg);}
  table.wk th.gli{color:var(--li);border-left:3px solid var(--li);}
  table.wk td{padding:9px 9px;border-bottom:1px solid var(--line);text-align:right;font-variant-numeric:tabular-nums;}
  table.wk td.gfb{border-left:3px solid var(--fb);}table.wk td.ggg{border-left:3px solid var(--gg);}table.wk td.gli{border-left:3px solid var(--li);}
  table.wk tr:nth-child(even) td{background:#fafbfe;}

  /* engagement */
  .eng-bar{height:8px;border-radius:6px;background:#eef0f6;overflow:hidden;}
  .eng-bar span{display:block;height:100%;border-radius:6px;}

  /* video info cards */
  .vids{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;}
  .vcard{border-radius:12px;padding:13px 15px;font-size:12px;line-height:1.5;}
  .vcard.fb{background:#f4f1ff;border:1px solid #e3dcff;}
  .vcard.li{background:#eef3ff;border:1px solid #d9e5ff;}
  .vcard .h{font-weight:700;margin-bottom:6px;}
  .vcard.fb .h{color:var(--fb);}.vcard.li .h{color:var(--li);}
  .vcard .note{color:var(--muted);font-style:italic;margin-top:6px;}

  /* campaigns */
  .cbar{display:inline-block;width:70px;height:5px;border-radius:4px;background:#eef0f6;overflow:hidden;vertical-align:middle;margin-right:10px;}
  .cbar span{display:block;height:100%;background:var(--fb);border-radius:4px;}
  .banner-ok{display:flex;align-items:center;gap:8px;background:#eafaf1;border:1px solid #bfe9cf;color:#137a43;border-radius:10px;padding:10px 14px;font-size:12.5px;margin-bottom:10px;}
  .banner-flag{font-size:11.5px;color:var(--muted);margin-bottom:12px;}

  /* metric defs */
  .defs{display:flex;flex-wrap:wrap;gap:10px;}
  .def{background:#f3f1fb;border:1px solid #e6e2f6;border-radius:10px;padding:9px 14px;font-family:'SFMono-Regular',ui-monospace,Menlo,monospace;font-size:12px;color:#4b3fa6;}
  .def b{color:var(--ink);font-weight:600;}

  /* caveats */
  .cav-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
  .cav{border:1px solid var(--line);border-radius:12px;padding:15px 16px;background:#fff;}
  .cav .h{font-weight:700;font-size:13px;margin-bottom:6px;}
  .cav .b{font-size:11.5px;color:var(--muted);line-height:1.55;}
  @media(max-width:1100px){.two,.vids{grid-template-columns:1fr;}.cav-grid{grid-template-columns:1fr 1fr;}}
`;

const CAP_KPIS = [
  { lbl: "Total Spend", val: "$84,210", d: "+16.1% vs prior 30d", up: true, cap: "", ac: "var(--fb)" },
  { lbl: "FB Link Clicks", val: "71,940", d: "-31.8% vs prior 30d", up: false, cap: "Facebook: inline link clicks", ac: "var(--fb)" },
  { lbl: "Google Clicks", val: "142,880", d: "+64.2% vs prior 30d", up: true, cap: "Google: all clicks", ac: "var(--gg)" },
  { lbl: "LinkedIn Clicks", val: "6,410", d: "+4.1% vs prior 30d", up: true, cap: "LinkedIn: clicks (excl. Message Ads from rates)", ac: "var(--li)" },
  { lbl: "FB Reach", val: "6,912,540", d: "-35.4% vs prior 30d", up: false, cap: "Facebook only — Google & LinkedIn: N/A", ac: "var(--fb)" },
  { lbl: "FB Primary Convs", val: "1,602", d: "-23.1% vs prior 30d", up: false, cap: "Facebook: leads (on-site + off-site)", ac: "var(--fb)" },
  { lbl: "Google Convs", val: "0", warn: "0 reported conversions — verify tracking status", cap: "Google: conversions (0 in L30d; 8,704 historically)", ac: "var(--gg)", warnCard: true },
  { lbl: "LinkedIn Convs", val: "163", d: "-14.2% vs prior 30d", up: false, cap: "LinkedIn: conversion events (on-site leads + ext. website)", ac: "var(--li)" },
  { lbl: "FB CPL", val: "$16.40", d: "+34.5% vs prior 30d", up: false, cap: "Facebook: spend / leads", ac: "var(--fb)" },
  { lbl: "LI CPL", val: "$98.20", d: "+25.9% vs prior 30d", up: false, cap: "LinkedIn: spend / conversion events", ac: "var(--li)" },
];
const capKpis = CAP_KPIS.map((k) => k.warnCard
  ? `<div class="kpi warn"><div class="kpi-lbl">${k.lbl}</div><div class="kpi-val">${k.val} ⚠</div><div class="kpi-warn-txt">${k.warn}</div><div class="kpi-cap">${k.cap}</div></div>`
  : `<div class="kpi"><div class="kpi-lbl">${k.lbl}</div><div class="kpi-val">${k.val}</div>${k.d ? `<div class="kpi-d ${k.up ? "up" : "down"}">${k.up ? "↗" : "↘"} ${k.d}</div>` : ""}${k.cap ? `<div class="kpi-cap">${k.cap}</div>` : ""}</div>`
).join("");

// Weekly: [week, fbSpend,fbImpr,fbClk,fbLead,  ggSpend,ggImpr,ggClk,ggConv,  liSpend,liImpr,liClk,liConv]
const CAP_WEEKS = [
  ["Jul 13", "$5,140", "1.3M", "15K", 214, "$9,180", "902K", "39K", 0, "$3,620", "158K", "2K", 15],
  ["Jul 6", "$8,910", "2.0M", "18K", 348, "$13,240", "1.4M", "48K", 0, "$5,310", "241K", "1K", 39],
  ["Jun 29", "$4,880", "1.6M", "12K", 341, "$6,870", "372K", "12K", 0, "$2,470", "106K", "962", 24],
  ["Jun 22", "$7,260", "3.2M", "23K", 528, "$8,320", "1.3M", "36K", 0, "$4,690", "205K", "2K", 68],
  ["Jun 15", "$7,640", "3.7M", "27K", 519, "$10,060", "1.6M", "40K", 0, "$4,710", "184K", "2K", 56],
  ["Jun 8", "$7,660", "3.8M", "31K", 583, "$10,240", "1.2M", "33K", 0, "$4,710", "181K", "2K", 51],
  ["Jun 1", "$8,850", "5.1M", "39K", 701, "$5,540", "5K", "742", 0, "$4,710", "177K", "2K", 59],
  ["May 25", "$300", "142K", "1K", 37, "$434", "70K", "2K", 0, "$97", "2K", "17", 1],
  ["May 18", "$7,840", "3.6M", "27K", 578, "$10,820", "1.8M", "38K", 0, "$4,710", "159K", "1K", 52],
  ["May 11", "$7,070", "3.6M", "28K", 552, "$10,540", "1.9M", "44K", 0, "$4,650", "164K", "1K", 51],
  ["May 4", "$6,920", "4.0M", "29K", 544, "$11,350", "1.6M", "41K", 0, "$4,570", "165K", "1K", 39],
  ["Apr 27", "$5,940", "2.9M", "17K", 665, "$10,910", "1.4M", "42K", 0, "$4,510", "150K", "2K", 45],
  ["Apr 20", "$5,150", "2.5M", "15K", 580, "$8,690", "1.6M", "39K", 0, "$3,820", "129K", "1K", 55],
];
const capWeeks = CAP_WEEKS.map((r) => `<tr>
  <td class="w rowh">${r[0]}</td>
  <td class="gfb">${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td>
  <td class="ggg">${r[5]}</td><td>${r[6]}</td><td>${r[7]}</td><td>${r[8]}</td>
  <td class="gli">${r[9]}</td><td>${r[10]}</td><td>${r[11]}</td><td>${r[12]}</td>
</tr>`).join("");

// Engagement: [icon,label,count,pct,color]
const CAP_ENG = [
  ["▶", "Video Views", "301,240", 76.8, "var(--fb)"],
  ["🖱", "Link Clicks", "70,180", 17.9, "var(--gg)"],
  ["🗔", "LP Views", "9,510", 2.4, "var(--li)"],
  ["♡", "Reactions", "7,020", 1.8, "var(--warn)"],
  ["🗒", "Registrations", "1,602", 0.4, "var(--down)"],
  ["⛊", "Onsite Leads", "1,204", 0.3, "#9aa0ab"],
  ["👤", "Leads", "1,204", 0.3, "#9aa0ab"],
  ["🔖", "Saves", "258", 0.1, "#9aa0ab"],
  ["💬", "Comments", "66", 0.0, "#9aa0ab"],
];
const capEng = CAP_ENG.map(([ic, lb, ct, pc, cl]) => `<tr>
  <td class="rowh">${ic} ${lb}</td>
  <td class="num rowh">${ct}</td>
  <td class="num">${pc.toFixed(1)}%</td>
  <td style="width:180px"><div class="eng-bar"><span style="width:${Math.max(pc, 1.2)}%;background:${cl}"></span></div></td>
</tr>`).join("");

// Campaigns: [name, spend, spendPct, impr, reach, clicks, cpm, ctr, cpc]
const CAP_CAMPS = [
  ["FB_Prospecting_Video_Q3", "$5,410.20", 100, "381K", "259K", "2K", "$14.20", "0.59%", "$2.41"],
  ["FB_Broad_Reach_NA", "$3,020.55", 56, "372K", "295K", "3K", "$8.11", "0.72%", "$1.18"],
  ["FB_ABM_Enterprise", "$2,940.10", 54, "664K", "434K", "4K", "$3.04", "0.66%", "$0.49"],
  ["FB_Retarget_WebVisitors", "$1,988.44", 37, "108K", "88K", "545", "$18.41", "0.71%", "$1.94"],
  ["FB_Lookalike_1pct", "$1,362.90", 25, "175K", "115K", "884", "$7.30", "0.52%", "$1.44"],
  ["FB_Case_Study_Promo", "$1,318.05", 24, "104K", "89K", "534", "$12.60", "0.53%", "$2.44"],
  ["FB_Reels_Demo", "$1,206.70", 22, "116K", "95K", "492", "$11.10", "0.85%", "$0.11"],
  ["FB_Free_Trial_Push", "$1,132.40", 21, "1.0M", "742K", "5K", "$1.08", "0.51%", "$0.20"],
  ["FB_Testimonial_Video", "$1,096.15", 20, "1.0M", "781K", "5K", "$1.05", "0.49%", "$0.21"],
  ["FB_Carousel_Product", "$824.60", 15, "690K", "631K", "9K", "$1.16", "1.31%", "$0.09"],
  ["FB_Event_Webinar", "$792.30", 14, "606K", "548K", "10K", "$1.29", "1.65%", "$0.08"],
  ["FB_Interest_SaaS", "$698.15", 13, "561K", "512K", "9K", "$1.19", "1.33%", "$0.08"],
  ["FB_Brand_Awareness_NA", "$588.72", 11, "35K", "29K", "281", "$16.60", "0.79%", "$2.03"],
  ["FB_LeadGen_Whitepaper", "$561.30", 10, "63K", "50K", "372", "$8.30", "0.61%", "$1.36"],
  ["FB_Cart_Abandon_Retarget", "$524.90", 10, "30K", "24K", "268", "$17.20", "0.88%", "$1.92"],
];
const capCamps = CAP_CAMPS.map((c) => `<tr>
  <td><span class="cbar"><span style="width:${c[2]}%"></span></span>${c[0]}</td>
  <td class="num rowh">${c[1]}</td>
  <td class="num">${c[3]}</td><td class="num">${c[4]}</td><td class="num">${c[5]}</td>
  <td class="num">${c[6]}</td><td class="num">${c[7]}</td><td class="num">${c[8]}</td>
  <td class="num" style="color:var(--muted)">—</td>
</tr>`).join("");

// Caveats: [icon,color,title,body]
const CAP_CAVEATS = [
  ["cursor", "var(--fb)", "Click definitions differ by platform", "Facebook: inline link clicks (not all clicks). Google: all clicks on the ad. LinkedIn: clicks on the ad unit (Message Ads excluded from rate metrics). These are not equivalent — do not compare CTR or CPC directly across platforms."],
  ["funnel", "var(--gg)", "Primary Conversions — platform-specific definitions", "Facebook: leads (on-site lead form submissions + off-site pixel registrations). Google: conversions tracked via Google Ads tag (0 reported in L30d — verify tracking status). LinkedIn: conversion events (one-click lead form opens + external website conversions)."],
  ["users", "var(--li)", "Reach — availability and definition vary", "Facebook: platform-reported unique reach for the period. Google: not available in the current data scope. LinkedIn: approximate member reach (available at campaign level but excluded from cross-platform reach comparisons). Use N/A rather than forcing comparison."],
  ["envelope", "#E0498E", "LinkedIn Message Ads — zero-impression billing", "1,080 creative-day rows (= 910 campaign-day rows — same rows at different grain) had spend > 0 with impressions = 0. These are Message Ads billed per send, not per impression. Total affected spend: $66,120. CPM and CTR are set to null for these rows; all other metrics use full spend."],
  ["warning", "var(--warn)", "Google conversion tracking — status unknown", "Google shows 8,704 conversions ($5.1M value) historically, but zero in the current 30-day window. This is treated as a tracking-status issue, not a performance result. Verify that conversion tags are firing correctly before drawing conclusions."],
  ["clock", "var(--fb)", "Attribution windows differ", "Facebook: 7-day click, 1-day view (default). Google: 30-day click window (search), varies by channel. LinkedIn: 30-day click, 7-day view. Conversions reported under different lookback windows are not directly comparable across platforms."],
  ["video", "#0FA5A5", "Video view definitions are not equivalent", "Facebook: a video view is ≥ 3 seconds. LinkedIn: video_starts are counted on autoplay (intent not confirmed); video_views are engaged views. Completion rates are measured differently. Do not compare video engagement rates across platforms."],
  ["database", "#4b5563", "Data grain and completeness", "Facebook: campaign × date. Google: campaign × ad-group × date × device × network. LinkedIn: creative × date. Google has no ad-level creative table in scope — creative analysis is not available for Google. All windows aligned to the most recent common date across platforms."],
];
const capCaveats = CAP_CAVEATS.map(([icn, cl, h, b]) => `<div class="cav"><div class="h" style="color:${cl}">${ic(icn, 15)} ${h}</div><div class="b">${b}</div></div>`).join("");

export const CREATIVE_AD_PERF_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Creative & Ad Performance</title>
<style>${CAP_CSS}</style></head>
<body><div class="wrap">

  <div class="hero">
    <div class="hero-top">
      <div>
        <h1>${ic('chart-bar',24)} Creative &amp; Ad Performance</h1>
        <p class="hero-win">Window: <b>Last 30 days</b> (latest common date across all platforms) · vs prior 30 days</p>
      </div>
      <div class="plats"><span class="plat fb">Facebook</span><span class="plat gg">Google</span><span class="plat li">LinkedIn</span></div>
    </div>
    <div class="hero-warn">⚠ <b>Metrics are comparable within each platform only.</b> Cross-platform figures are directional: click definitions, conversion counting, reach measurement, attribution windows, and Message Ad billing differ across Facebook, Google, and LinkedIn. Do not directly rank platforms by CTR, CPC, or CPL without accounting for these differences.</div>
  </div>

  <div class="card">
    <div class="km-head"><span class="t">${ic('lightning',16)} Key Metrics</span><span class="m">Jun 21 – Jul 20, 2026 vs prior 30d · Within-platform comparison only</span></div>
    <div class="kpis">${capKpis}</div>
  </div>

  <div class="two">
    <div class="card">
      <h2 class="sec-title">${ic('table',16)} Platform Comparison</h2>
      <p class="sec-sub">Jun 21 – Jul 20, 2026 · <i>Metric definitions differ by platform — not directly comparable</i></p>
      <div class="pcards">
        <div class="pcard"><div class="p">Facebook</div><div class="v">$27,850</div><div class="s">33% of total</div></div>
        <div class="pcard"><div class="p">Google</div><div class="v">$39,410</div><div class="s">47% of total</div></div>
        <div class="pcard"><div class="p">LinkedIn</div><div class="v">$16,950</div><div class="s">20% of total</div></div>
      </div>
      <div class="pcomp-scroll">
      <table class="t">
        <thead><tr><th>Metric</th><th class="num th-fb">Facebook</th><th class="num th-gg">Google</th><th class="num th-li">LinkedIn</th></tr></thead>
        <tbody>
          <tr><td class="rowh">Spend</td><td class="num">$27,850</td><td class="num">$39,410</td><td class="num">$16,950</td></tr>
          <tr><td class="rowh">Impressions</td><td class="num">8.6M</td><td class="num">4.2M</td><td class="num">742K</td></tr>
          <tr><td class="rowh">Reach</td><td class="num">6.9M<span class="cap">Platform-reported reach</span></td><td class="num" style="color:var(--muted)">N/A<span class="cap">not available</span></td><td class="num" style="color:var(--muted)">Approx.<span class="cap">not used for cross-platform comparison</span></td></tr>
          <tr><td class="rowh">Clicks</td><td class="num">72K<span class="cap">Link Clicks</span></td><td class="num">143K<span class="cap">Clicks</span></td><td class="num">6K<span class="cap">Clicks (excl. Message Ads from rates)</span></td></tr>
          <tr><td class="rowh">Primary Conversions</td><td class="num">1,602<span class="cap">Leads (on-site + off-site)</span></td><td class="num"><span class="warnmini">0 ⚠</span><span class="cap">0 reported in L30d — verify tracking status</span></td><td class="num">163<span class="cap">Conversion events</span></td></tr>
          <tr><td class="rowh">CPM</td><td class="num">$3.24<span class="cap">All impressions</span></td><td class="num">$9.38<span class="cap">All impressions</span></td><td class="num">$22.84<span class="cap">Message Ad rows (imp=0) excluded</span></td></tr>
          <tr><td class="rowh">CTR</td><td class="num">0.84%<span class="cap">Link clicks / impressions</span></td><td class="num">3.40%<span class="cap">Clicks / impressions</span></td><td class="num">0.86%<span class="cap">Clicks / impressions, excl. Message Ads</span></td></tr>
          <tr><td class="rowh">CPC</td><td class="num">$0.39<span class="cap">Spend / link clicks</span></td><td class="num">$0.28<span class="cap">Spend / clicks</span></td><td class="num">$2.64<span class="cap">Spend / clicks (all spend)</span></td></tr>
          <tr><td class="rowh">CPL</td><td class="num">$16.40</td><td class="num" style="color:var(--muted)">—</td><td class="num">$98.20</td></tr>
        </tbody>
      </table>
      </div>
      <p class="foot">CPM/CTR/CPC are within-platform metrics only. LinkedIn rates exclude Message Ad rows (zero impressions). Google CPL unavailable — zero conversions in L30d. LinkedIn ROAS not tracked.</p>
    </div>

    <div class="card">
      <h2 class="sec-title">${ic('trend-up',16)} Spend Change vs Prior 30d</h2>
      <p class="sec-sub">Current vs prior 30-day period</p>
      <table class="t">
        <thead><tr><th>Metric</th><th class="num th-fb">Facebook</th><th class="num th-gg">Google</th><th class="num th-li">LinkedIn</th></tr></thead>
        <tbody>
          <tr><td class="rowh">${ic('dollar',13)} Spend (L30d)</td><td class="num">$27,850<span class="cap up">↗ +2.9% vs prior</span></td><td class="num">$39,410<span class="cap up">↗ +32.4% vs prior</span></td><td class="num">$16,950<span class="cap up">↗ +7.1% vs prior</span></td></tr>
          <tr><td class="rowh">${ic('target',13)} Impressions</td><td class="num">8.6M</td><td class="num">4.2M</td><td class="num">742K</td></tr>
          <tr><td class="rowh">${ic('trend-up',13)} Link Clicks</td><td class="num">72K</td><td class="num">143K</td><td class="num">6K</td></tr>
          <tr><td class="rowh">${ic('funnel',13)} Primary Convs</td><td class="num">1,602</td><td class="num warnmini">0</td><td class="num">163</td></tr>
          <tr><td class="rowh">${ic('chart-bar',13)} CPM</td><td class="num">$3.24</td><td class="num">$9.38</td><td class="num">$22.84</td></tr>
          <tr><td class="rowh">${ic('percent',13)} CTR (link)</td><td class="num">0.84%</td><td class="num">3.40%</td><td class="num">0.86%</td></tr>
          <tr><td class="rowh">${ic('cursor',13)} CPC (link)</td><td class="num">$0.39</td><td class="num">$0.28</td><td class="num">$2.64</td></tr>
          <tr><td class="rowh">${ic('crosshair',13)} CPL</td><td class="num">$16.40</td><td class="num" style="color:var(--muted)">—</td><td class="num">$98.20</td></tr>
        </tbody>
      </table>
      <p class="foot">* Google CPL unavailable — zero conversions in last 30 days  |  LinkedIn ROAS not tracked</p>
    </div>
  </div>

  <div class="card">
    <h2 class="sec-title">${ic('table',16)} Weekly Performance by Platform</h2>
    <p class="sec-sub">Last 13 weeks · Spend, Impressions, Link Clicks, Leads</p>
    <div class="scroll">
      <table class="wk">
        <thead>
          <tr>
            <th class="w">Week</th>
            <th class="gfb">FB Spend</th><th>Impr.</th><th>Link Clicks</th><th>Leads</th>
            <th class="ggg">GG Spend</th><th>Impr.</th><th>Clicks</th><th>Convs</th>
            <th class="gli">LI Spend</th><th>Impr.</th><th>Clicks</th><th>Convs</th>
          </tr>
        </thead>
        <tbody>${capWeeks}</tbody>
      </table>
    </div>
  </div>

  <div class="two">
    <div class="card">
      <h2 class="sec-title">${ic('chart-bar',16)} Engagement Breakdown (Facebook)</h2>
      <p class="sec-sub">Action types · Last 30 days · Total: 392,410</p>
      <table class="t">
        <thead><tr><th>Action Type</th><th class="num">Count</th><th class="num">% of Total</th><th>Share</th></tr></thead>
        <tbody>${capEng}</tbody>
      </table>
    </div>
    <div class="card">
      <h2 class="sec-title">${ic('video',16)} Video Performance</h2>
      <p class="sec-sub">Jun 21 – Jul 20, 2026 · <i>Facebook and LinkedIn video definitions are not equivalent — do not compare directly</i></p>
      <div class="vids">
        <div class="vcard fb"><div class="h">Facebook</div>Video views ≥ 3 seconds (ThruPlay not tracked at campaign level)<div class="note">Completion-rate breakdown not available at campaign-day grain</div></div>
        <div class="vcard li"><div class="h">LinkedIn</div>video_starts counted on autoplay; video_views = engaged views. Completion = full play.<div class="note">Starts may exceed views due to autoplay counting before intent is confirmed</div></div>
      </div>
      <table class="t">
        <thead><tr><th>Stage</th><th class="num th-fb">Facebook</th><th class="num th-li">LinkedIn (count)</th><th class="num th-li">LinkedIn (% of starts)</th></tr></thead>
        <tbody>
          <tr><td class="rowh">Video Starts</td><td class="num" style="color:var(--muted)">N/A</td><td class="num">10,240</td><td class="num" style="color:var(--muted)">—</td></tr>
          <tr><td class="rowh">Video Views</td><td class="num">301,240</td><td class="num">3,610</td><td class="num" style="color:var(--muted)">—</td></tr>
          <tr><td class="rowh">25% Viewed (Q1)</td><td class="num" style="color:var(--muted)">N/A</td><td class="num" style="color:var(--muted)">—</td><td class="num">11.8%</td></tr>
          <tr><td class="rowh">50% Viewed (Mid)</td><td class="num" style="color:var(--muted)">N/A</td><td class="num" style="color:var(--muted)">—</td><td class="num">5.1%</td></tr>
          <tr><td class="rowh">75% Viewed (Q3)</td><td class="num" style="color:var(--muted)">N/A</td><td class="num" style="color:var(--muted)">—</td><td class="num">3.2%</td></tr>
          <tr><td class="rowh">Completions (100%)</td><td class="num" style="color:var(--muted)">N/A</td><td class="num">168</td><td class="num">1.6%</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="card">
    <h2 class="sec-title">${ic('table',16)} Top Facebook Campaigns</h2>
    <p class="sec-sub">Jun 21 – Jul 20, 2026 · Click/CTR/CPC = link clicks only · Sorted by spend</p>
    <div class="banner-ok">✓ All 20 campaigns exceed minimum volume thresholds (Spend ≥ $100, Impressions ≥ 1,000).</div>
    <p class="banner-flag">⚑ Low-volume flags: <b>Spend &lt; $100</b> or <b>Impressions &lt; 1,000</b> — CTR/CPC may be statistically unreliable.</p>
    <table class="t">
      <thead><tr><th>Campaign</th><th class="num">Spend ↓</th><th class="num">Impr.</th><th class="num">Reach</th><th class="num">Link Clicks</th><th class="num">CPM</th><th class="num">CTR (link)</th><th class="num">CPC (link)</th><th class="num">Flags</th></tr></thead>
      <tbody>${capCamps}</tbody>
    </table>
  </div>

  <div class="card">
    <h2 class="sec-title">${ic('function',16)} Metric Definitions <span style="font-size:12px;font-weight:400;color:var(--muted)">(applied consistently within each platform)</span></h2>
    <div class="defs" style="margin-top:10px">
      <span class="def"><b>CTR_link</b> = link_clicks / impressions</span>
      <span class="def"><b>CPC_link</b> = spend / link_clicks</span>
      <span class="def"><b>CPM</b> = spend / impressions × 1,000</span>
      <span class="def"><b>CVR</b> = primary_conversions / clicks</span>
      <span class="def"><b>CPL</b> = spend / primary_conversions</span>
      <span class="def"><b>ROAS</b> = conversion_value / spend</span>
    </div>
  </div>

  <div class="card">
    <h2 class="sec-title">${ic('info',16)} Platform Caveats &amp; Data Notes</h2>
    <div class="cav-grid" style="margin-top:16px">${capCaveats}</div>
  </div>

</div></body></html>`;

// ─────────────────────────────────────────────────────────────────────────
// Target Account Journey — ABM account funnel (first ad impression → closed-won),
// named target accounts only, across all paid channels. Mock data: numbers are
// invented/tweaked for demo and do not represent any real account. Company names
// are generic stock/faker-style labels.
// ─────────────────────────────────────────────────────────────────────────
const TAJ_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
  :root{--pc:#7C5CFC;--mql:#5B6EF0;--sql:#3B82F6;--ao:#F59E0B;--cl:#EF5350;--cw:#22C55E;--g:#34A853;--li:#2F6BFF;--me:#4267B2;--ink:#151a2e;--muted:#6b7280;--line:#e9ebf2;--bg:#f4f6fb;--radius:14px;}
  *{box-sizing:border-box;}
  body{margin:0;font-family:'Poppins',system-ui,sans-serif;color:var(--ink);background:var(--bg);-webkit-font-smoothing:antialiased;font-size:13px;}
  .wrap{max-width:none;margin:0;padding:22px 26px 72px;display:flex;flex-direction:column;gap:20px;}
  .card{background:#fff;border:1px solid var(--line);border-radius:var(--radius);padding:20px 22px;}
  .sec-title{display:flex;align-items:center;gap:8px;font-size:16px;font-weight:700;margin:0;}
  .sec-sub{font-size:12px;color:var(--muted);margin:4px 0 16px;}
  .two{display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:stretch;}
  .num{text-align:right;font-variant-numeric:tabular-nums;}
  .badge{font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;background:#eef1f8;color:var(--muted);}

  /* hero */
  .hero{border-radius:16px;padding:24px 28px;color:#fff;background:linear-gradient(120deg,#6d4be0 0%,#5b47d6 45%,#4536b8 100%);display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;}
  .hero .eyebrow{font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:rgba(255,255,255,.75);display:flex;align-items:center;gap:6px;}
  .hero h1{margin:6px 0 6px;font-size:26px;font-weight:700;}
  .hero .sub{font-size:13px;color:rgba(255,255,255,.8);}
  .hero-right{text-align:right;font-size:12px;color:rgba(255,255,255,.8);}
  .hero-right .as{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:rgba(255,255,255,.6);}
  .hero-right .d{font-size:17px;font-weight:700;color:#fff;margin:2px 0 8px;}

  /* kpis */
  .kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:14px;}
  .kpi{background:#fff;border:1px solid var(--line);border-radius:12px;padding:15px 16px;}
  .kpi.warn{border-color:rgba(245,158,11,.4);background:#fffdf6;}
  .kpi .ic{width:30px;height:30px;border-radius:8px;background:#f1f0fb;color:var(--pc);display:flex;align-items:center;justify-content:center;font-size:15px;margin-bottom:10px;}
  .kpi.warn .ic{background:#fdf3e0;color:var(--ao);}
  .kpi .v{font-size:26px;font-weight:700;letter-spacing:-.02em;}
  .kpi .l{font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);margin:3px 0 4px;}
  .kpi .s{font-size:11.5px;color:var(--muted);line-height:1.4;}
  .kpi .v.up{color:var(--cw);}

  /* funnel */
  .funnel{display:flex;flex-direction:column;align-items:center;gap:3px;margin:6px 0 16px;}
  .fstage{color:#fff;text-align:center;padding:11px 8px;border-radius:6px;font-weight:600;line-height:1.15;}
  .fstage .fn{font-size:13px;}
  .fstage .fc{font-size:15px;font-weight:700;}
  .fconv{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
  .fconv div{font-size:11.5px;color:var(--muted);}
  .fconv b{color:var(--ink);}

  /* stalled */
  .stall-card{border:1px solid rgba(239,83,80,.35);border-radius:var(--radius);}
  .stall-head{display:flex;justify-content:space-between;align-items:center;padding:16px 20px 6px;}
  .stall-head .t{display:flex;align-items:center;gap:8px;font-size:16px;font-weight:700;color:#c0392b;}
  .stall-head .b{font-size:11px;font-weight:600;color:#c0392b;background:#fdecea;padding:3px 10px;border-radius:20px;}
  .stall-list{padding:4px 12px 12px;display:flex;flex-direction:column;gap:8px;}
  .stall{display:flex;justify-content:space-between;align-items:center;gap:12px;border:1px solid var(--line);border-radius:10px;padding:11px 14px;}
  .stall-n{font-size:13.5px;font-weight:600;}
  .stall-m{font-size:11.5px;color:var(--muted);margin-top:2px;}
  .stall-r{text-align:right;}
  .stall-days{font-size:12.5px;font-weight:700;color:var(--cl);}
  .stall-riskrow{display:flex;align-items:center;gap:8px;justify-content:flex-end;margin-top:3px;}
  .stall-risk{font-size:11.5px;color:var(--muted);}

  /* channel chips */
  .chch{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;color:var(--muted);border:1px solid var(--line);border-radius:20px;padding:2px 8px;}
  .chdot{width:6px;height:6px;border-radius:50%;display:inline-block;}

  /* on-path */
  .op-tabs{display:inline-flex;gap:4px;background:#f4f5f9;border-radius:8px;padding:3px;margin-bottom:12px;}
  .op-tab{font-size:11.5px;font-weight:600;padding:5px 11px;border-radius:6px;color:var(--muted);}
  .op-tab.on{background:#fff;color:var(--pc);box-shadow:0 1px 2px rgba(0,0,0,.06);}
  .op{border-top:1px solid var(--line);padding:12px 2px;}
  .op-top{display:flex;justify-content:space-between;align-items:baseline;gap:10px;}
  .op-nm{font-size:13.5px;font-weight:600;display:flex;align-items:center;gap:8px;}
  .op-won{font-size:10px;font-weight:700;color:var(--cw);background:#e8f9ef;padding:2px 7px;border-radius:5px;}
  .op-meta{font-size:11.5px;color:var(--muted);margin-top:3px;}
  .op-score{font-size:12px;font-weight:700;}
  .op-sub{font-size:11px;color:var(--muted);}
  .op-bar{height:3px;border-radius:3px;background:#eef0f6;margin-top:8px;overflow:hidden;}
  .op-bar span{display:block;height:100%;background:var(--cw);border-radius:3px;}

  /* spend bars */
  .spend{display:flex;align-items:flex-end;justify-content:space-around;gap:24px;height:230px;padding:16px 8px 0;}
  .sp-col{display:flex;flex-direction:column;align-items:center;gap:8px;flex:1;height:100%;justify-content:flex-end;}
  .sp-v{font-size:14px;font-weight:700;}
  .sp-bar{width:70%;border-radius:8px 8px 0 0;}
  .sp-l{font-size:12px;font-weight:600;color:var(--muted);}

  /* industry stacked */
  .ind-wrap{display:flex;align-items:flex-end;gap:18px;height:210px;padding:8px 8px 0;overflow-x:auto;}
  .ind-col{display:flex;flex-direction:column;align-items:center;gap:8px;flex:1;min-width:64px;}
  .ind-bar{width:40px;height:180px;display:flex;flex-direction:column;justify-content:flex-end;border-radius:4px;overflow:hidden;}
  .ind-lbl{font-size:10.5px;color:var(--muted);text-align:center;transform:rotate(-12deg);white-space:nowrap;}
  .legend{display:flex;flex-wrap:wrap;gap:14px;justify-content:center;margin-top:14px;font-size:11px;color:var(--muted);}
  .legend span{display:inline-flex;align-items:center;gap:6px;}
  .ldot{width:9px;height:9px;border-radius:3px;}

  /* table */
  .tbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px;}
  .search{flex:1;min-width:240px;height:34px;border:1px solid var(--line);border-radius:8px;background:#fbfbfe;display:flex;align-items:center;gap:8px;padding:0 12px;color:var(--muted);font-size:12.5px;}
  .stabs{display:flex;gap:5px;flex-wrap:wrap;}
  .stab{font-size:11px;font-weight:600;padding:5px 11px;border-radius:20px;background:#f2f3f8;color:var(--muted);}
  .stab.on{background:var(--pc);color:#fff;}
  table.t{width:100%;border-collapse:collapse;font-size:12.5px;}
  table.t th{text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);padding:9px 10px;border-bottom:1px solid var(--line);}
  table.t td{padding:11px 10px;border-bottom:1px solid var(--line);}
  table.t tr:nth-child(even) td{background:#fafbfe;}
  .stpill{font-size:11px;font-weight:600;padding:3px 10px;border-radius:6px;background:#e8f9ef;color:#178a4e;}
  .won{color:var(--cw);font-weight:600;}
  .tfoot{display:flex;justify-content:space-between;align-items:center;font-size:11.5px;color:var(--muted);margin-top:12px;}
  @media(max-width:1100px){.kpis{grid-template-columns:repeat(3,1fr);}.two{grid-template-columns:1fr;}}
`;

const tajCh = (ch) => { const c = ch === "Google" ? "var(--g)" : ch === "LinkedIn" ? "var(--li)" : "var(--me)"; return `<span class="chch"><span class="chdot" style="background:${c}"></span>${ch}</span>`; };

const TAJ_KPIS = [
  { ic: "buildings", v: "124", l: "Target Accounts", s: "124 named accounts" },
  { ic: "target", v: "97.6%", l: "Paid Coverage", s: "121 of 124 accounts reached" },
  { ic: "trend-up", v: "112", l: "Progressed to SQL+", s: "92.6% of paid-reached accounts", up: true },
  { ic: "dollar", v: "$1.12M", l: "Active Pipeline", s: "10 accounts with open opps" },
  { ic: "trophy", v: "$1.24M", l: "Won Revenue", s: "29 accounts · 42.0% opp win rate" },
  { ic: "warning", v: "8", l: "Stalled / At Risk", s: "Active opps, 60+ days no movement", warn: true },
];
const tajKpis = TAJ_KPIS.map((k) => `<div class="kpi${k.warn ? " warn" : ""}"><div class="ic">${ic(k.ic, 16)}</div><div class="v${k.up ? " up" : ""}">${k.v}</div><div class="l">${k.l}</div><div class="s">${k.s}</div></div>`).join("");

const TAJ_FUNNEL = [
  { n: "Paid Contact", c: 121, w: 100, col: "var(--pc)" },
  { n: "MQL", c: 119, w: 95, col: "var(--mql)" },
  { n: "SQL", c: 112, w: 87, col: "var(--sql)" },
  { n: "Active Opportunity", c: 78, w: 62, col: "var(--ao)" },
  { n: "Closed Won", c: 29, w: 32, col: "var(--cw)" },
];
const tajFunnel = TAJ_FUNNEL.map((f) => `<div class="fstage" style="width:${f.w}%;background:${f.col}"><div class="fn">${f.n}</div><div class="fc">${f.c}</div></div>`).join("");

const TAJ_STALLED = [
  ["Acme Corp", "Finance · NA-East", "Proposal", "131d stuck", "$98K at risk", ["Google", "LinkedIn"]],
  ["Ferrell, Jones and Lewis", "Media · NA-East", "Proposal", "142d stuck", "$116K at risk", ["Google", "LinkedIn", "Meta"]],
  ["Garcia-James", "Manufacturing · NA-East", "Proposal", "149d stuck", "$144K at risk", ["Google", "LinkedIn", "Meta"]],
  ["Henderson-Bernard", "Technology · APAC", "Demo", "188d stuck", "$14K at risk", ["Google"]],
  ["Jones-Young", "Healthcare · NA-East", "Demo", "171d stuck", "$71K at risk", ["Google", "LinkedIn", "Meta"]],
  ["Nolan and Sons", "Technology · NA-East", "Discovery", "158d stuck", "$37K at risk", ["Google"]],
  ["Perez Inc", "Manufacturing · APAC", "Negotiation", "139d stuck", "$112K at risk", ["LinkedIn", "Meta"]],
  ["Tran, Jordan and Williams", "Education · EMEA", "Discovery", "118d stuck", "$196K at risk", ["Google", "LinkedIn", "Meta"]],
];
const tajStalled = TAJ_STALLED.map(([n, m, st, d, r, chs]) => `<div class="stall">
  <div><div class="stall-n">${n}</div><div class="stall-m">${m} · Stage: <b>${st}</b></div></div>
  <div class="stall-r"><div class="stall-days">${d}</div><div class="stall-riskrow"><span class="stall-risk">${r}</span>${chs.map(tajCh).join("")}</div></div>
</div>`).join("");

const TAJ_ONPATH = [
  ["Doyle Ltd", "Education · NA-East", 100, "9 contacts"],
  ["Novak PLC", "Education · APAC", 97, "13 contacts"],
  ["Hoffman, Baker and Richa…", "Media · APAC", 80, "8 contacts"],
  ["Patterson, Smith and Jones", "Finance · NA-East", 80, "9 contacts"],
  ["Shields, Cochran and Adams", "Finance · NA-West", 80, "8 contacts"],
  ["Frazier Inc", "Healthcare · NA-East", 79, "6 contacts"],
];
const tajOnpath = TAJ_ONPATH.map(([n, m, sc, ct]) => `<div class="op">
  <div class="op-top"><div class="op-nm">${n} <span class="op-won">Closed Won</span></div><div class="op-score">Score: ${sc}</div></div>
  <div class="op-top"><div class="op-meta">${m}</div><div class="op-sub">${ct}</div></div>
  <div class="op-bar"><span style="width:${sc}%"></span></div>
</div>`).join("");

const TAJ_SPEND = [["Google", 624, "$624K", "var(--g)"], ["LinkedIn", 508, "$508K", "var(--li)"], ["Meta", 208, "$208K", "var(--me)"]];
const SP_MAX = 640;
const tajSpend = TAJ_SPEND.map(([n, v, lbl, c]) => `<div class="sp-col"><div class="sp-v">${lbl}</div><div class="sp-bar" style="height:${(v / SP_MAX * 190).toFixed(0)}px;background:${c}"></div><div class="sp-l">${n}</div></div>`).join("");

// industry stacks: [pc, mql, sql, ao, cl, cw]
const TAJ_IND = [
  ["Education", [3, 2, 2, 2, 3, 4]], ["Finance", [2, 2, 3, 3, 3, 5]], ["Healthcare", [4, 3, 3, 4, 5, 4]],
  ["Manufacturing", [3, 3, 4, 4, 4, 6]], ["Media", [2, 1, 2, 2, 3, 3]], ["Professional Services", [2, 1, 1, 1, 2, 2]],
  ["Retail", [1, 1, 1, 1, 2, 2]], ["Technology", [2, 2, 2, 3, 3, 4]],
];
const IND_MAX = 24, IND_H = 180;
const IND_COL = { pc: "var(--pc)", mql: "var(--mql)", sql: "var(--sql)", ao: "var(--ao)", cl: "var(--cl)", cw: "var(--cw)" };
const tajInd = TAJ_IND.map(([name, d]) => {
  const [pc, mql, sql, ao, cl, cw] = d;
  const seg = (v, c) => v > 0 ? `<div style="height:${(v / IND_MAX * IND_H).toFixed(1)}px;background:${c}"></div>` : "";
  return `<div class="ind-col"><div class="ind-bar">${seg(cw, IND_COL.cw)}${seg(cl, IND_COL.cl)}${seg(ao, IND_COL.ao)}${seg(sql, IND_COL.sql)}${seg(mql, IND_COL.mql)}${seg(pc, IND_COL.pc)}</div><div class="ind-lbl">${name}</div></div>`;
}).join("");

// table: [account, industry, region, contacts, channels[], score, oppValue, won]
const TAJ_TABLE = [
  ["Anderson Group", "Manufacturing", "NA-East", 5, ["Google"], 61, "$128K", "$119K"],
  ["Baxter Inc", "Media", "NA-West", 11, ["Google", "LinkedIn", "Meta"], 55, "$88K", "$8K"],
  ["Dickson-Brady", "Finance", "NA-West", 9, ["Google", "Meta"], 72, "$9K", "$9K"],
  ["Doyle Ltd", "Education", "NA-East", 9, ["Google", "LinkedIn", "Meta"], 100, "$10K", "$10K"],
  ["Dudley Group", "Manufacturing", "EMEA", 6, ["Google", "LinkedIn"], 62, "$92K", "$10K"],
  ["Edwards, Baker and Anderson", "Finance", "NA-East", 6, ["Google"], 54, "$22K", "$22K"],
  ["Frazier Inc", "Healthcare", "NA-East", 7, ["Google", "LinkedIn"], 79, "$11K", "$11K"],
  ["Gonzalez Group", "Manufacturing", "NA-West", 9, ["Google", "Meta"], 66, "$42K", "$42K"],
  ["Guzman, Hoffman and Baldwin", "Technology", "NA-West", 5, ["LinkedIn", "Meta"], 73, "$198K", "$31K"],
  ["Harrell LLC", "Manufacturing", "EMEA", 4, ["Google"], 55, "$15K", "$15K"],
  ["Hoffman, Baker and Richards", "Media", "APAC", 8, ["Google"], 81, "$102K", "$102K"],
  ["House-Glover", "Healthcare", "NA-East", 8, ["Google", "LinkedIn", "Meta"], 78, "$26K", "$13K"],
  ["Martin, Rose and Obrien", "Healthcare", "NA-East", 6, ["Google"], 56, "$47K", "$47K"],
  ["Mckee, Gardner and Davenport", "Finance", "NA-East", 5, ["LinkedIn"], 60, "$110K", "$110K"],
  ["Newton and Sons", "Technology", "NA-West", 8, ["Google", "LinkedIn"], 78, "$10K", "$10K"],
];
const tajTable = TAJ_TABLE.map((r) => `<tr>
  <td style="font-weight:600">${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td>
  <td><span class="stpill">Closed Won</span></td>
  <td class="num">${r[3]}</td>
  <td>${r[4].map(tajCh).join(" ")}</td>
  <td class="num">${r[5]}</td>
  <td class="num">${r[6]}</td>
  <td class="num won">${r[7]}</td>
</tr>`).join("");

export const TARGET_ACCOUNT_JOURNEY_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Target Account Journey</title>
<style>${TAJ_CSS}</style></head>
<body><div class="wrap">

  <div class="hero">
    <div>
      <div class="eyebrow">${ic('funnel',13)} ABM Account Funnel</div>
      <h1>Target Account Journey</h1>
      <div class="sub">First ad impression through closed-won · Named target accounts only · All paid channels</div>
    </div>
    <div class="hero-right"><div class="as">As of</div><div class="d">Aug 10, 2026</div><div>ICP: target_account__c = True</div></div>
  </div>

  <div class="kpis">${tajKpis}</div>

  <div class="two">
    <div class="card">
      <h2 class="sec-title">${ic('funnel',16)} ABM Funnel — All 124 Target Accounts</h2>
      <p class="sec-sub">Accounts at each stage = reached that stage or higher · Closed Lost (40) excluded from flow</p>
      <div class="funnel">${tajFunnel}</div>
      <div class="fconv">
        <div>↳ Paid Contact → MQL: <b>98.3%</b></div>
        <div>↳ MQL → SQL: <b>94.1%</b></div>
        <div>↳ SQL → Active Opportunity: <b>69.6%</b></div>
        <div>↳ Active Opportunity → Closed Won: <b>37.2%</b></div>
      </div>
    </div>

    <div class="card stall-card" style="padding:0">
      <div class="stall-head"><span class="t">${ic('warning',16)} Stalled Accounts</span><span class="b">8 accounts</span></div>
      <p class="sec-sub" style="padding:0 20px">Active opportunities with no stage movement for 60+ days — needs sales attention</p>
      <div class="stall-list">${tajStalled}</div>
    </div>
  </div>

  <div class="card">
    <h2 class="sec-title">${ic('chart-bar',16)} Funnel Stage by Industry</h2>
    <p class="sec-sub">How target accounts are distributed across funnel stages, by industry</p>
    <div class="ind-wrap">${tajInd}</div>
    <div class="legend">
      <span><span class="ldot" style="background:var(--pc)"></span>Paid Contact</span>
      <span><span class="ldot" style="background:var(--mql)"></span>MQL</span>
      <span><span class="ldot" style="background:var(--sql)"></span>SQL</span>
      <span><span class="ldot" style="background:var(--ao)"></span>Active Opportunity</span>
      <span><span class="ldot" style="background:var(--cl)"></span>Closed Lost</span>
      <span><span class="ldot" style="background:var(--cw)"></span>Closed Won</span>
    </div>
  </div>

  <div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center"><h2 class="sec-title">${ic('table',16)} All Target Accounts — Funnel Position</h2><span class="badge">124 accounts</span></div>
    <p class="sec-sub">Every named target account ranked by highest funnel stage reached · Sorted by stage (highest first)</p>
    <div class="tbar">
      <div class="search">${ic('search',15)} Search account or industry…</div>
      <div class="stabs"><span class="stab on">All</span><span class="stab">Closed Won</span><span class="stab">Active Opportunity</span><span class="stab">SQL</span><span class="stab">MQL</span><span class="stab">Paid Contact</span><span class="stab">Closed Lost</span></div>
    </div>
    <table class="t">
      <thead><tr><th>Account</th><th>Industry</th><th>Region</th><th>Stage</th><th class="num">Contacts</th><th>Paid Channels</th><th class="num">Lead Score</th><th class="num">Opp Value</th><th class="num">Won</th></tr></thead>
      <tbody>${tajTable}</tbody>
    </table>
    <div class="tfoot"><span>Page 1 of 8 · 124 accounts</span><span>Prev · Next</span></div>
  </div>

</div></body></html>`;

export const DASHBOARD_FILES = {
  "output/dashboard/target_account_journey.html": { content: TARGET_ACCOUNT_JOURNEY_HTML, contentType: "text/html" },
  "output/dashboard/creative_ad_performance.html": { content: CREATIVE_AD_PERF_HTML, contentType: "text/html" },
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
