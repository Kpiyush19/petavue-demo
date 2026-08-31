import { useLocation, useNavigate } from "react-router-dom";
import { MenuBar } from "./menubar";
import RunsActivity from "./runs/RunsActivity";
import { getCurrentUser } from "../api";
import { MOCK_ENABLED } from "../mocks";
import { useSessionsQuery } from "../hooks/useSessionsQuery";
import { getSessionRowMeta } from "./sessions/sessionRowMeta";
import { timeAgo } from "@/utils/relativeTimeDiff";

// Nav items come from the design-system MenuBar's CANONICAL_NAV so the app
// navbar and the standalone-page navbar can never drift apart — they used to
// keep separate lists, which is exactly how they ended up with different items
// in a different order. Add or reorder nav items THERE, not here.
import { CANONICAL_NAV as NAV_ITEMS } from "@/ui/components/MenuBar/MenuBar";
export { NAV_ITEMS };

export const NAV_ROUTES = {
  new: "/new",
  "dashboard-live": "/dashboards",
  "dashboards-pv": "/dashboards",
  "data-hub": "/data-hub",
  skills: "/skills",
  goals: "/goals",
  workflows: "/workflows",
  agents: "/agents",
  settings: "/settings",
};

export default function MenuBarNav() {
  const currentUser = getCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();
  // Real recent sessions — used to populate the history panel when not running
  // the scripted mock demo (this nav is now the single nav in every mode).
  const { data: sessionList = [] } = useSessionsQuery();
  const name = currentUser?.name || currentUser?.username || "User";
  const initials =
    name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  const user = { name, initials, email: currentUser?.email || "" };

  // Navigate when a nav item maps to a route; otherwise it's a no-op.
  const handleItemClick = (id) => {
    const route = NAV_ROUTES[id];
    if (route) navigate(route);
  };

  // Highlight the section matching the current path. Chat routes (Sage
  // Chat sessions and the Create-New page are reached from the "Create New"
  // button, so no nav item is highlighted there.
  const { pathname } = location;
  const isChatRoute = pathname.startsWith("/chat") || pathname.startsWith("/session") || pathname.startsWith("/sage");
  // Prefer the longest matching route so nested paths (e.g. /skills/:id)
  // highlight the deeper item (Skills). The bare /new page matches nothing → no
  // highlight, which is what we want for the Create-New page.
  const activeId = isChatRoute
    ? null
    : NAV_ITEMS
        .filter((item) => { const r = NAV_ROUTES[item.id]; return r && pathname.startsWith(r); })
        .sort((a, b) => NAV_ROUTES[b.id].length - NAV_ROUTES[a.id].length)[0]?.id || null;

  // Mock demo: a scripted, populated history (only the first item opens the
  // live session). Non-mock: real recents from the sessions query, so this nav
  // fully replaces the retired Sidebar.
  const historyGroups = !MOCK_ENABLED
    ? sessionList.length
      ? [
          {
            label: "Recents",
            items: sessionList.slice(0, 20).map((s) => ({
              id: s.session_id,
              title: s.name || "Session",
              time: s.last_active_at ? timeAgo(s.last_active_at) : "",
              clickable: true,
            })),
          },
        ]
      : []
    : [
        {
          label: "Today",
          items: [{ id: "q2-revenue-dashboard", title: "Paid Media ROI", time: "now", clickable: true }],
        },
        {
          label: "Yesterday",
          items: [
            { id: "h-pipeline-q3", title: "Pipeline coverage for Q3", time: "1d" },
            { id: "h-roas-drop", title: "Why did ROAS drop last week?", time: "1d" },
          ],
        },
        {
          label: "Previous 7 Days",
          items: [
            { id: "h-at-risk", title: "Top at-risk enterprise accounts", time: "3d" },
            { id: "h-mktg-pipeline", title: "Marketing-sourced pipeline review", time: "5d" },
            { id: "h-sdr-conv", title: "SDR conversion by segment", time: "6d" },
          ],
        },
        {
          label: "Previous 30 Days",
          items: [
            { id: "h-channel-roas", title: "Channel ROAS vs target", time: "12d" },
            { id: "h-nrr-cohort", title: "Net revenue retention by cohort", time: "18d" },
            { id: "h-lead-source", title: "Lead source effectiveness", time: "24d" },
          ],
        },
      ];

  const handleHistoryClick = (id) => {
    if (MOCK_ENABLED) { navigate(`/chat/${id}`); return; }
    const s = sessionList.find((x) => x.session_id === id);
    navigate(s ? getSessionRowMeta(s).route : `/session/${id}`);
  };

  return (
    <div className="shrink-0 h-screen">
      <MenuBar
        items={NAV_ITEMS}
        activeId={activeId}
        onItemClick={handleItemClick}
        onHistoryItemClick={handleHistoryClick}
        historyGroups={historyGroups}
        user={user}
        onNewChat={() => navigate("/new")}
        onProfile={() => navigate("/profile")}
        onSettings={() => navigate("/settings")}
        defaultOpen={false}
        beforeFooter={(isOpen) => <RunsActivity expanded={isOpen} />}
      />
    </div>
  );
}
