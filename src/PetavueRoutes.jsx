// Self-contained Petavue design-system pages (Settings, Profile) that bring
// their own MenuBar, so they mount OUTSIDE the app layout. They now live at
// natural top-level URLs (/settings, /profile) — the page is derived from the
// first path segment. The old /petavue/* demo screens (chat, dashboards,
// dashboard-view, data-hub) are retired: the app serves those at their real
// routes, and /petavue/* now redirects there (see router.jsx).
import { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { ProfilePage } from "./pages/standalone/profile";
import { SettingsPage } from "./pages/standalone/settings";
import { DataHub } from "./pages/standalone/data-hub";

const DEFAULT_USER = { name: "Ammie Diego", initials: "AD", email: "ammie.diego@work.com" };

export default function PetavueRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const page = location.pathname.split("/").filter(Boolean)[0] || "home";

  const [user] = useState(DEFAULT_USER);
  const [menuOpen, setMenuOpen] = useState(false);

  // MenuBar nav ids → natural app routes.
  const handleNavigate = (id) => {
    const routes = {
      home: "/new",
      "new-chat": "/new",
      skills: "/skills",
      "dashboard-live": "/dashboards",
      dashboard: "/dashboards",
      "dashboards-pv": "/dashboards",
      workflows: "/workflows",
      recommendations: "/recommendations",
      goals: "/recommendations",
      "data-hub": "/data-hub",
      settings: "/settings",
      profile: "/profile",
    };
    navigate(routes[id] || "/skills");
  };

  const menuProps = {
    user,
    onNavigate: handleNavigate,
    onNewChat: () => navigate("/new"),
    menuOpen,
    onMenuToggle: setMenuOpen,
  };

  const renderPage = () => {
    switch (page) {
      case "settings":
        return <SettingsPage {...menuProps} />;
      case "profile":
        return <ProfilePage {...menuProps} />;
      case "data-hub":
        return <DataHub {...menuProps} />;
      default:
        // Any other segment isn't a self-contained page — send it to the app
        // home, which is Workflows.
        return <Navigate to="/workflows" replace />;
    }
  };

  // .petavue-root scopes Petavue's margin/padding reset to these pages only.
  return <div className="petavue-root">{renderPage()}</div>;
}
