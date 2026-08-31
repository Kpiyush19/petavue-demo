import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, useParams, useRouteError } from "react-router-dom";

function BubbleError() {
  throw useRouteError();
}

// Retired /petavue/<page> URLs → their natural equivalents (bookmarks/back-compat).
function PetavueLegacyRedirect() {
  const params = useParams();
  const seg = (params["*"] || "").split("/")[0];
  const map = {
    settings: "/settings",
    profile: "/profile",
    "data-hub": "/data-hub",
    dashboards: "/dashboards",
    "dashboard-view": "/dashboards",
    chat: "/new",
    skills: "/skills",
    home: "/new",
  };
  return <Navigate to={map[seg] || "/new"} replace />;
}

import AuthGuard from "./pages/auth/AuthGuard";
import LoginPage from "./pages/auth/LoginPage";
import LoginAs from "./pages/auth/LoginAs";
import PetavueGuard from "./components/PetavueGuard";
import HomeGuard from "./components/HomeGuard";
import { MOCK_ENABLED } from "./mocks";
import IndexRedirect from "./components/IndexRedirect";
import { SessionProvider } from "./contexts/SessionContext";
import LegacyRedirect from "./pages/LegacyRedirect";
import PageSkeleton from "./components/PageSkeleton";

// lazy() but resilient to stale dynamic-import chunks. When a chunk hash is
// invalidated (Vite HMR/rebuild in dev, or a new deploy in prod), the dynamic
// import rejects with "Failed to fetch dynamically imported module" and the
// route renders blank until a manual hard refresh. This auto-performs that
// refresh exactly once so navigation recovers on its own.
function lazyWithRetry(importer) {
  const RELOAD_KEY = "lazy-chunk-reloaded";
  return lazy(async () => {
    try {
      const mod = await importer();
      window.sessionStorage.removeItem(RELOAD_KEY);
      return mod;
    } catch (err) {
      if (!window.sessionStorage.getItem(RELOAD_KEY)) {
        window.sessionStorage.setItem(RELOAD_KEY, "1");
        window.location.reload();
        // Stall render until the reload kicks in (avoids flashing an error).
        return new Promise(() => {});
      }
      throw err;
    }
  });
}

// Petavue design-system pages (router-driven wrapper). Wrapped with retry
// because this is a large, separate chunk and the most common victim of the
// stale-chunk blank-screen-on-navigation problem.
const PetavueRoutes = lazyWithRetry(() => import("./PetavueRoutes"));

const ClaudeAuthPage = lazy(() => import("./pages/auth/ClaudeAuthPage"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage"));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"));
const SalesforceCallback = lazy(() => import("./pages/callbacks/SalesforceCallback"));
const GainsightCallback = lazy(() => import("./pages/callbacks/GainsightCallback"));
const SlackCallback = lazy(() => import("./pages/callbacks/SlackCallback"));
const HubspotCallback = lazy(() => import("./pages/callbacks/HubspotCallback"));
const LinkedinCallback = lazy(() => import("./pages/callbacks/LinkedinCallback"));
const GoogleSheetsCallback = lazy(() => import("./pages/callbacks/GoogleSheetsCallback"));
const EmailCallback = lazy(() => import("./pages/callbacks/EmailCallback"));
const GoogleAnalyticsCallback = lazy(() => import("./pages/callbacks/GoogleAnalyticsCallback"));
const GoogleAnalyticsRedirect = lazy(() => import("./pages/callbacks/GoogleAnalyticsRedirect"));

const RootLayout = lazy(() => import("./layouts/RootLayout"));
const WorkflowsLayout = lazy(() => import("./layouts/WorkflowsLayout"));
const DashboardsLayout = lazy(() => import("./layouts/DashboardsLayout"));
const SessionsLayout = lazy(() => import("./layouts/SessionsLayout"));
const HomeLayout = lazy(() => import("./pages/home/TempHome/HomeLayout"));
const GoalsPage = lazy(() => import("./pages/goals/GoalsPage"));
const NewGoalPage = lazy(() => import("./pages/goals/NewGoalPage"));
const RunHistoryPage = lazy(() => import("./pages/goals/RunHistoryPage"));
const GoalDetailPage = lazy(() => import("./pages/goals/GoalDetailPage"));
const HomePage = lazy(() => import("./pages/home/TempHome/HomePage"));
const SkillDetailPage = lazy(() => import("./pages/home/TempHome/SkillDetailPage"));
const SkillsLibraryPage = lazy(() => import("./pages/home/TempHome/SkillsLibraryPage"));

// Unarchived Petavue "workbook" UI — standalone reference screens, reachable by
// URL only (not in any navbar). Kept separate from the app home to avoid a clash.
const WorkbookHome = lazy(() => import("./pages/workbook/routes").then((m) => ({ default: m.WorkbookHomeRoute })));
const WorkbookChat = lazy(() => import("./pages/workbook/routes").then((m) => ({ default: m.WorkbookChatRoute })));
const WorkbookList = lazy(() => import("./pages/workbook/routes").then((m) => ({ default: m.WorkbookListRoute })));
const ExplorePage = lazy(() => import("./pages/ExplorePage"));
const SessionsPage = lazy(() => import("./pages/SessionsPage"));
const WorkspacePage = lazy(() => import("./pages/WorkspacePage"));
const SchedulesPage = lazy(() => import("./pages/SchedulesPage"));
const DashboardsPage = lazy(() => import("./pages/DashboardsPage"));
const DashboardDetailPage = lazy(() => import("./pages/DashboardDetailPage"));
const SkillsPage = lazy(() => import("./pages/SkillsPage"));
const SkillsV2ListPage = lazy(() => import("./pages/skills-v2/SkillsV2ListPage"));
const SkillsV2RunPage = lazy(() => import("./pages/skills-v2/SkillsV2RunPage"));

// A skill run now lives at /skills/run/:id (was /skills-v2/run/:id). Redirect
// old URLs — bookmarks and in-flight sessions — so they don't 404.
function LegacyRunRedirect() {
  const { sessionId } = useParams();
  return <Navigate to={`/skills/run/${sessionId}`} replace />;
}
const WorkflowEnginePage = lazy(() => import("./pages/workflow-engine"));
// Agentic workflows surface (the six paid-media pilot use cases). This owns
// /workflows; the older step-based engine page moved to /workflow-engine.
const WorkflowsPage = lazyWithRetry(() => import("./pages/workflows"));
const AgentWorkflowDetailPage = lazyWithRetry(() => import("./pages/workflows/WorkflowDetail"));
const AgentsPage = lazyWithRetry(() => import("./pages/agents"));
const WorkflowDetailPage = lazy(() => import("./pages/WorkflowDetailPage"));
const MyProfilePage = lazy(() => import("./pages/MyProfilePage"));
const ExperimentsPage = lazy(() => import("./pages/ExperimentsPage"));

// Page-navigation loading now shows a content-shaped skeleton instead of the
// petavue splash spinner. (PetavueSplash is still used for initial app boot.)
const SuspenseWrapper = ({ children, variant }) => {
  return <Suspense fallback={<PageSkeleton variant={variant} />}>{children}</Suspense>;
};

// Back-compat: old /sage/:id chat links redirect to the /chat/:id URL.
function SageToChatRedirect() {
  const { id } = useParams();
  return <Navigate to={`/chat/${id}`} replace />;
}

function AuthenticatedLayout() {
  return (
    <SessionProvider>
      <SuspenseWrapper>
        <RootLayout />
      </SuspenseWrapper>
    </SessionProvider>
  );
}

export const router = createBrowserRouter([
  {
    // Settings & Profile are self-contained (own MenuBar) so they mount OUTSIDE
    // the app layout — now at natural URLs (/settings, /profile).
    path: "/settings/*",
    element: (
      <SuspenseWrapper>
        <PetavueRoutes />
      </SuspenseWrapper>
    ),
    errorElement: <BubbleError />
  },
  {
    path: "/profile/*",
    element: (
      <SuspenseWrapper>
        <PetavueRoutes />
      </SuspenseWrapper>
    ),
    errorElement: <BubbleError />
  },
  {
    // Data Hub — the petavue source-cards page (self-contained, own MenuBar).
    path: "/data-hub/*",
    element: (
      <SuspenseWrapper>
        <PetavueRoutes />
      </SuspenseWrapper>
    ),
    errorElement: <BubbleError />
  },
  {
    // Back-compat: retire the old /petavue/* URLs → send to their natural home.
    path: "/petavue/*",
    element: <PetavueLegacyRedirect />,
    errorElement: <BubbleError />
  },
  {
    // Unarchived workbook reference screens — URL-only, no navbar, standalone
    // (each renders its own MenuBar). Kept off "/" so the app home is untouched.
    path: "/workbook",
    element: <SuspenseWrapper><WorkbookHome /></SuspenseWrapper>,
    errorElement: <BubbleError />
  },
  {
    path: "/workbook/list",
    element: <SuspenseWrapper><WorkbookList /></SuspenseWrapper>,
    errorElement: <BubbleError />
  },
  {
    path: "/workbook/chat",
    element: <SuspenseWrapper><WorkbookChat /></SuspenseWrapper>,
    errorElement: <BubbleError />
  },
  {
    // Frontend-only mode has no auth — /login just bounces into the app.
    path: "/login",
    element: MOCK_ENABLED ? <Navigate to="/" replace /> : <LoginPage />,
    errorElement: <BubbleError />
  },
  {
    path: "/authenticate",
    element: <LoginAs />,
    errorElement: <BubbleError />
  },
  {
    path: "/claude/oauth/authorize",
    element: (
      <SuspenseWrapper>
        <ClaudeAuthPage />
      </SuspenseWrapper>
    ),
    errorElement: <BubbleError />
  },
  {
    path: "/auth/invite/accept",
    element: (
      <SuspenseWrapper>
        <RegisterPage />
      </SuspenseWrapper>
    ),
    errorElement: <BubbleError />
  },
  {
    path: "/auth/reset-password",
    element: (
      <SuspenseWrapper>
        <ResetPasswordPage />
      </SuspenseWrapper>
    ),
    errorElement: <BubbleError />
  },
  {
    path: "/salesforce/callback",
    element: (
      <SuspenseWrapper>
        <SalesforceCallback />
      </SuspenseWrapper>
    ),
    errorElement: <BubbleError />
  },
  {
    path: "/gainsight/callback",
    element: (
      <SuspenseWrapper>
        <GainsightCallback />
      </SuspenseWrapper>
    ),
    errorElement: <BubbleError />
  },
  {
    path: "/slack/callback",
    element: (
      <SuspenseWrapper>
        <SlackCallback />
      </SuspenseWrapper>
    ),
    errorElement: <BubbleError />
  },
  {
    path: "/hubspot/callback",
    element: (
      <SuspenseWrapper>
        <HubspotCallback />
      </SuspenseWrapper>
    ),
    errorElement: <BubbleError />
  },
  {
    path: "/linkedin/callback",
    element: (
      <SuspenseWrapper>
        <LinkedinCallback />
      </SuspenseWrapper>
    ),
    errorElement: <BubbleError />
  },
  {
    path: "/google-sheets/callback",
    element: (
      <SuspenseWrapper>
        <GoogleSheetsCallback />
      </SuspenseWrapper>
    ),
    errorElement: <BubbleError />
  },
  {
    path: "/report/*",
    element: (
      <SuspenseWrapper>
        <EmailCallback />
      </SuspenseWrapper>
    ),
    errorElement: <BubbleError />
  },
  {
    path: "/google-analytics/callback",
    element: (
      <SuspenseWrapper>
        <GoogleAnalyticsCallback />
      </SuspenseWrapper>
    ),
    errorElement: <BubbleError />
  },
  {
    path: "/google-analytics/redirect",
    element: (
      <SuspenseWrapper>
        <GoogleAnalyticsRedirect />
      </SuspenseWrapper>
    ),
    errorElement: <BubbleError />
  },
  {
    path: "/",
    element: <AuthGuard />,
    errorElement: <BubbleError />,
    children: [
      {
        element: <AuthenticatedLayout />,
        children: [
          {
            index: true,
            element: <IndexRedirect />
          },
          {
            element: (
              <SuspenseWrapper>
                <SessionsLayout />
              </SuspenseWrapper>
            ),
            children: [
              {
                path: "sessions",
                element: (
                  <SuspenseWrapper variant="list">
                    <SessionsPage />
                  </SuspenseWrapper>
                )
              },
              {
                path: "session/:id",
                element: (
                  <SuspenseWrapper>
                    <WorkspacePage />
                  </SuspenseWrapper>
                )
              },
              {
                // The main chat session (clean URL).
                path: "chat/:id",
                element: (
                  <SuspenseWrapper>
                    <WorkspacePage />
                  </SuspenseWrapper>
                )
              },
              {
                // Back-compat: old /sage/:id links → /chat/:id.
                path: "sage/:id",
                element: <SageToChatRedirect />
              }
            ]
          },
          {
            path: "schedules",
            element: (
              <SuspenseWrapper>
                <SchedulesPage />
              </SuspenseWrapper>
            )
          },
          {
            path: "dashboards",
            element: (
              <SuspenseWrapper>
                <DashboardsLayout />
              </SuspenseWrapper>
            ),
            children: [
              {
                index: true,
                element: (
                  <SuspenseWrapper variant="list">
                    <DashboardsPage />
                  </SuspenseWrapper>
                )
              },
              {
                path: ":id",
                element: (
                  <SuspenseWrapper>
                    <DashboardDetailPage />
                  </SuspenseWrapper>
                )
              }
            ]
          },
          // Legacy /home links now land on the Create-New page (/new).
          { path: "home", element: <Navigate to="/new" replace /> },
          { path: "home/skills", element: <Navigate to="/skills" replace /> },
          // Frontend-only mode: /new is the Create-New home (greeting + composer
          // + skills), no flag gate. Otherwise it's gated by HomeGuard.
          MOCK_ENABLED
            ? {
                path: "new",
                element: (
                  <SuspenseWrapper variant="none">
                    <HomeLayout />
                  </SuspenseWrapper>
                ),
                children: [
                  {
                    index: true,
                    element: (
                      <SuspenseWrapper variant="none">
                        <HomePage />
                      </SuspenseWrapper>
                    )
                  },
                  { path: "workstreams", element: <Navigate to="/new" replace /> },
                  { path: "workstreams/:workstreamId", element: <Navigate to="/new" replace /> },
                  { path: "skill", element: <Navigate to="/new" replace /> },
                  // Legacy — the skills catalog + detail now live at top-level /skills.
                  { path: "skills", element: <Navigate to="/skills" replace /> }
                ]
              }
            : {
                element: <HomeGuard />,
                children: [
                  {
                    path: "home",
                    element: (
                      <SuspenseWrapper variant="none">
                        <HomeLayout />
                      </SuspenseWrapper>
                    ),
                    children: [
                      {
                        index: true,
                        element: (
                          <SuspenseWrapper variant="none">
                            <HomePage />
                          </SuspenseWrapper>
                        )
                      },
                      { path: "workstreams", element: <Navigate to="/new" replace /> },
                      { path: "workstreams/:workstreamId", element: <Navigate to="/new" replace /> },
                      { path: "skill", element: <Navigate to="/new" replace /> },
                      {
                        path: "skill/:id",
                        element: (
                          <SuspenseWrapper>
                            <SkillDetailPage />
                          </SuspenseWrapper>
                        )
                      }
                    ]
                  }
                ]
              },
          {
            // The section is Recommendations now — goals stopped being the
            // organising axis in the Aug-2026 pivot. /goals still resolves so
            // older links and the goal detail pages below keep working.
            path: "recommendations",
            element: (
              <SuspenseWrapper variant="goals">
                <GoalsPage />
              </SuspenseWrapper>
            )
          },
          {
            path: "goals",
            element: <Navigate to="/recommendations" replace />
          },
          {
            path: "goals/new",
            element: (
              <SuspenseWrapper>
                <NewGoalPage />
              </SuspenseWrapper>
            )
          },
          {
            path: "goals/:id/runs",
            element: (
              <SuspenseWrapper>
                <RunHistoryPage />
              </SuspenseWrapper>
            )
          },
          {
            path: "goals/:id",
            element: (
              <SuspenseWrapper>
                <GoalDetailPage />
              </SuspenseWrapper>
            )
          },
          {
            element: <PetavueGuard />,
            children: [
              {
                path: "agents",
                element: (
                  <SuspenseWrapper variant="list">
                    <AgentsPage />
                  </SuspenseWrapper>
                )
              },
              {
                path: "workflows",
                children: [
                  {
                    index: true,
                    element: (
                      <SuspenseWrapper variant="list">
                        <WorkflowsPage />
                      </SuspenseWrapper>
                    )
                  },
                  {
                    path: ":id",
                    element: (
                      <SuspenseWrapper>
                        <AgentWorkflowDetailPage />
                      </SuspenseWrapper>
                    )
                  }
                ]
              },
              // The original step-based workflow engine, moved off /workflows
              // but otherwise untouched.
              {
                path: "workflow-engine",
                element: (
                  <SuspenseWrapper>
                    <WorkflowsLayout />
                  </SuspenseWrapper>
                ),
                children: [
                  {
                    index: true,
                    element: (
                      <SuspenseWrapper variant="list">
                        <WorkflowEnginePage />
                      </SuspenseWrapper>
                    )
                  },
                  {
                    path: ":id",
                    element: (
                      <SuspenseWrapper>
                        <WorkflowDetailPage />
                      </SuspenseWrapper>
                    )
                  }
                ]
              },
              {
                path: "skills",
                element: (
                  <SuspenseWrapper>
                    <HomeLayout />
                  </SuspenseWrapper>
                ),
                children: [
                  {
                    index: true,
                    element: (
                      <SuspenseWrapper variant="grid">
                        <SkillsLibraryPage />
                      </SuspenseWrapper>
                    )
                  },
                  {
                    path: ":id",
                    element: (
                      <SuspenseWrapper>
                        <SkillDetailPage />
                      </SuspenseWrapper>
                    )
                  }
                ]
              },
              {
                path: "skills-v2",
                element: (
                  <SuspenseWrapper variant="grid">
                    <SkillsV2ListPage />
                  </SuspenseWrapper>
                )
              }
            ]
          },
          {
            path: "skills/run/:sessionId",
            element: (
              // The run page renders its own PLANNING / "setting up" UI, so a
              // generic page skeleton here just flashes a mismatched layout.
              <SuspenseWrapper variant="none">
                <SkillsV2RunPage />
              </SuspenseWrapper>
            )
          },
          {
            // Legacy path — redirect /skills-v2/run/:id → /skills/run/:id.
            path: "skills-v2/run/:sessionId",
            element: <LegacyRunRedirect />
          },
          {
            path: "my-profile",
            element: (
              <SuspenseWrapper>
                <MyProfilePage />
              </SuspenseWrapper>
            )
          },
          {
            path: "experiments",
            element: (
              <SuspenseWrapper>
                <ExperimentsPage />
              </SuspenseWrapper>
            )
          }
        ]
      }
    ]
  },
  {
    path: "*",
    element: <LegacyRedirect />,
    errorElement: <BubbleError />
  }
]);
