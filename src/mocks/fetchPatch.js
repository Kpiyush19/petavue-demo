// Patches window.fetch in mock mode to serve workspace file content for the
// raw-fetch / iframe viewers (HtmlViewer, MarkdownViewer, JsonTreeViewer,
// DataTableViewer) which bypass axios. Only intercepts `/api/sessions/:id/files/*`.

import { DASHBOARD_FILES, WIDGET_PREVIEWS, assembleSkillDashboard } from "./dashboardAssets";
import { getRun } from "./skillRun";
import { runFileContent } from "../pages/workflows/agents-run/runSession";
import { RUN_SESSION_ID } from "../pages/workflows/agents-run/data";

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function parseCsv(text) {
  const lines = text.trim().split("\n");
  const columns = lines[0].split(",");
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(",");
    const row = {};
    columns.forEach((c, i) => { row[c] = cells[i]; });
    return row;
  });
  return { columns, rows };
}

function handleFilesRequest(pathname, search) {
  // Published-dashboard / workflow-dashboard file URL (loaded by the dashboard
  // iframe). Serve the rendered dashboard HTML.
  const dashM = pathname.match(/\/api\/(?:workflows\/dashboards|published)\/[^/]+\/files\/(.+)$/);
  if (dashM) {
    const dpath = decodeURIComponent(dashM[1]);
    const dfile = DASHBOARD_FILES[dpath];
    if (dfile) return new Response(dfile.content, { status: 200, headers: { "content-type": dfile.contentType } });
    return jsonResponse({ detail: `File not found: ${dpath}` }, 404);
  }

  // /api/sessions/<sid>/files/<filepath>[/data]
  const m = pathname.match(/\/api\/sessions\/([^/]+)\/files\/(.+)$/);
  if (!m) return null;
  const sid = m[1];
  let filepath = decodeURIComponent(m[2]);

  // Files of a workflow run under review.
  if (sid === RUN_SESSION_ID) {
    const f = runFileContent(filepath);
    if (f) return new Response(f.content, { status: 200, headers: { "content-type": f.contentType } });
  }

  // Skill-flow dashboard — assembled live from the widgets the user KEPT in the
  // plan (drop a widget → it's gone here too).
  if (filepath === "output/dashboard/skill_dashboard.html") {
    const run = getRun(sid);
    return new Response(assembleSkillDashboard(run?.keptWidgetIds), { status: 200, headers: { "content-type": "text/html" } });
  }

  // Paginated data endpoint for tables.
  if (filepath.endsWith("/data")) {
    const base = filepath.slice(0, -"/data".length);
    const file = DASHBOARD_FILES[base];
    if (file && base.endsWith(".csv")) {
      const { columns, rows } = parseCsv(file.content);
      return jsonResponse({ columns, rows, total: rows.length, page: 1, page_size: rows.length });
    }
    return jsonResponse({ columns: [], rows: [], total: 0 });
  }

  // Rendered widget preview (the Verify view asks for jsx with ?preview=1).
  if (filepath.endsWith(".jsx") && /[?&]preview=1\b/.test(search) && WIDGET_PREVIEWS[filepath]) {
    return new Response(WIDGET_PREVIEWS[filepath], { status: 200, headers: { "content-type": "text/html" } });
  }

  const file = DASHBOARD_FILES[filepath];
  if (!file) return jsonResponse({ detail: `File not found: ${filepath}` }, 404);
  return new Response(file.content, { status: 200, headers: { "content-type": file.contentType } });
}

export function installFetchPatch() {
  if (typeof window === "undefined" || !window.fetch) return;
  if (window.__mockFetchPatched) return;
  window.__mockFetchPatched = true;

  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input?.url || "";
    let pathname = url;
    let search = "";
    try {
      const u = new URL(url, window.location.origin);
      pathname = u.pathname;
      search = u.search;
    } catch {
      const q = url.indexOf("?");
      if (q >= 0) { pathname = url.slice(0, q); search = url.slice(q); }
    }

    if (pathname.includes("/files/") && (pathname.includes("/api/sessions/") || pathname.includes("/dashboards/") || pathname.includes("/api/published/"))) {
      const res = handleFilesRequest(pathname, search);
      if (res) return res;
    }
    return realFetch(input, init);
  };
}
