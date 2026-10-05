import { useRef, useState, useEffect, useCallback } from "react";
import {
  File,
  GitBranch,
  X,
  DotsThree,
  SealCheck,
  Sparkle,
  FlowArrow,
  FilePdf,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { Button, Popper } from "@/ui";
import { getCurrentUser, getApiBase, getAuthToken, apiGet } from "../../api";
import { MOCK_ENABLED } from "../../mocks";
import ArtifactTabs from "./components/ArtifactTabs";
import LineageDrawer from "./components/LineageDrawer";
import WidgetFocusModal from "./components/WidgetFocusModal";
import VerifyPublishModal from "./components/VerifyPublishModal";
import HtmlViewer from "./viewers/HtmlViewer";
import MarkdownViewer from "./viewers/MarkdownViewer";
import ImageViewer from "./viewers/ImageViewer";
import DataTableViewer from "./viewers/DataTableViewer";
import JsonTreeViewer from "./viewers/JsonTreeViewer";
import { RunChangesView, RunBoardView } from "../../pages/workflows/agents-run/RunViews";

// Dashboard entry file. In frontend-only mode it's named revenue_dashboard.html
// instead of index.html.
const DASHBOARD_ENTRY = MOCK_ENABLED
  ? "output/dashboard/revenue_dashboard.html"
  : "output/dashboard/index.html";

function DownloadCard({ sessionId, path, title, onLoadComplete }) {
  const downloadRef = useRef(null);
  const downloadUrl = `${getApiBase()}/api/sessions/${sessionId}/files/${path}?token=${encodeURIComponent(getAuthToken() || "")}`;

  useEffect(() => {
    onLoadComplete?.();
  }, [onLoadComplete]);

  const handleDownload = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (downloadRef.current) {
      downloadRef.current.href = downloadUrl;
      downloadRef.current.download = title || path.split("/").pop();
      downloadRef.current.click();
    }
  };

  return (
    <div className="s-download-card">
      <a ref={downloadRef} style={{ display: "none" }} aria-hidden="true" />
      <div className="s-download-card__icon">
        <File size={22} weight="light" />
      </div>
      <span className="s-download-card__title">{title}</span>
      <Button variant="primary" size="lg" label="Download" onClick={handleDownload} />
    </div>
  );
}

function ViewerContent({ tab, sessionId, htmlIframeRef, onLoadComplete }) {
  const { contentType, path, title } = tab;
  switch (contentType) {
    // A workflow run's draft and its board: views, not files.
    case "run-changes":
      return <RunChangesView onLoadComplete={onLoadComplete} />;
    case "run-board":
      return <RunBoardView onLoadComplete={onLoadComplete} />;
    case "html":
      return <HtmlViewer ref={htmlIframeRef} sessionId={sessionId} path={path} onLoadComplete={onLoadComplete} />;
    case "csv":
    case "jsonl":
      return <DataTableViewer sessionId={sessionId} path={path} type={contentType} onLoadComplete={onLoadComplete} />;
    case "json":
      return <JsonTreeViewer sessionId={sessionId} path={path} type={contentType} onLoadComplete={onLoadComplete} />;
    case "image":
      return <ImageViewer sessionId={sessionId} path={path} onLoadComplete={onLoadComplete} />;
    case "markdown":
    case "text":
      return <MarkdownViewer sessionId={sessionId} path={path} onLoadComplete={onLoadComplete} />;
    default:
      return <DownloadCard sessionId={sessionId} path={path} title={title} onLoadComplete={onLoadComplete} />;
  }
}

export default function ArtifactPanel({
  tabs,
  activeTabId,
  activeTab,
  sessionId,
  onSelectTab,
  onCloseTab,
  onClose,
  onCreateWorkflow,
  onCreateWorkflowAi,
  onSendFeedback,
  sessionStatus,
  openLineageFor,
  consumeOpenLineageFor,
  openVerifyPublishFor,
  consumeOpenVerifyPublishFor,
  liveMessages,
}) {
  const isPetavueUser = (getCurrentUser()?.email || "").includes("@petavue.com");
  const htmlIframeRef = useRef(null);
  const downloadRef = useRef(null);
  const panelRef = useRef(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lineagePath, setLineagePath] = useState(null);
  const [verifyPublishOpen, setVerifyPublishOpen] = useState(false);
  const [isReactDashboard, setIsReactDashboard] = useState(false);
  const [lineageWidth, setLineageWidth] = useState(340);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // When on, the GitBranch icon and bridge-pill triggers open
  // WidgetFocusModal instead of the legacy LineageDrawer overlay. Effective
  // flag = tenant OR user (matches LineageDrawer's resolution). Treated as
  // false until the fetch resolves, so first-paint clicks fall through to
  // the legacy drawer (existing behavior, no surprise regression).
  const [widgetChatEnabled, setWidgetChatEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiGet("/api/users/me/feature-flags").catch(() => ({})),
      apiGet("/api/tenant/feature-flags").catch(() => ({})),
    ]).then(([userData, tenantData]) => {
      if (cancelled) return;
      const userFlag = !!(userData?.feature_flags?.widget_chat_enabled);
      const tenantFlag = !!(tenantData?.feature_flags?.widget_chat_enabled);
      setWidgetChatEnabled(tenantFlag || userFlag);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setLineagePath(null);
    setIsLoading(true);
  }, [activeTabId, refreshKey]);

  // Detect React dashboard when viewing output/dashboard/index.html
  useEffect(() => {
    setIsReactDashboard(false);
    if (!sessionId || !activeTab?.path) return;
    if (activeTab.path !== DASHBOARD_ENTRY) return;
    let cancelled = false;
    apiGet(`/api/sessions/${sessionId}/dashboard-info`)
      .then((data) => {
        if (!cancelled) setIsReactDashboard(!!data?.is_react_dashboard);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [sessionId, activeTab?.path]);

  // Bridge pill auto-opens lineage drawer. When parent sets
  // openLineageFor (via useArtifactPanel.openWidgetLineage), wait for the
  // matching tab to become active, then flip lineagePath and clear the
  // pending request. Two-step: openWidgetLineage opens the tab on render N,
  // and this effect reacts on render N+1 once activeTab.path matches.
  //
  // ⚠ Effect-order dependency: the reset effect above (deps [activeTabId])
  // ALSO sets lineagePath = null on tab change, and runs in the SAME commit
  // as this one when openWidgetLineage triggers a new active tab. React
  // runs effects in declaration order, so the reset runs FIRST and this
  // effect runs SECOND, winning the lineagePath race. If anyone reorders
  // these effects in the future, the auto-open will be silently nullified
  // by the reset. Keep this effect AFTER the reset effect.
  useEffect(() => {
    if (openLineageFor && activeTab?.path === openLineageFor) {
      setLineagePath(openLineageFor);
      if (consumeOpenLineageFor) consumeOpenLineageFor();
    }
  }, [openLineageFor, activeTab?.path, consumeOpenLineageFor]);

  // Auto-open V&P modal once dashboard tab is active + runtime check passes.
  // Used by post-skill-run handoff: the "Verify & Publish" button on the
  // run page sets `openVerifyPublishFor` on the artifact panel; we wait
  // for the dashboard tab to mount AND for the React-dashboard manifest
  // check to resolve before flipping the modal open. The dashboard path
  // check mirrors the trigger gate on the dropdown button below (line
  // ~250) so we never open V&P on a non-dashboard tab.
  useEffect(() => {
    if (!openVerifyPublishFor) return;
    if (!isReactDashboard) return;
    if (activeTab?.path !== DASHBOARD_ENTRY) return;
    setVerifyPublishOpen(true);
    if (consumeOpenVerifyPublishFor) consumeOpenVerifyPublishFor();
  }, [openVerifyPublishFor, isReactDashboard, activeTab?.path, consumeOpenVerifyPublishFor]);

  const handleLoadComplete = useCallback(() => {
    setIsLoading(false);
  }, []);

  const onResizeStart = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    const panelRect = panelRef.current?.getBoundingClientRect();
    const onMove = (ev) => {
      if (!panelRect) return;
      const newWidth = panelRect.right - ev.clientX;
      setLineageWidth(Math.max(280, Math.min(newWidth, panelRect.width - 40)));
    };
    const onUp = () => {
      setIsDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  const isWidget = activeTab?.path?.startsWith("output/dashboard/widgets/") && activeTab?.path?.endsWith(".jsx");
  // The dashboard actions menu shows for any dashboard HTML artifact (the React
  // dashboard entry OR a published dashboard like Paid Media ROI).
  const isDashboardHtml =
    !activeTab?.pinned &&
    activeTab?.contentType === "html" &&
    activeTab?.path?.startsWith("output/dashboard/") &&
    activeTab?.path?.endsWith(".html");

  // Print the dashboard iframe to PDF (browser print dialog → Save as PDF).
  const handleSavePdf = useCallback(() => {
    const win = htmlIframeRef.current?.contentWindow;
    if (win) {
      win.focus();
      win.print();
    } else {
      window.print();
    }
  }, []);

  if (!activeTab) {
    return (
      <div className="s-artifact-panel">
        <div className="s-artifact-panel__header">
          <span className="s-artifact-panel__title">Preview</span>
          <div className="s-artifact-panel__actions">
            <Button variant="ghost" size="sm" className="p-1" onClick={onClose} title="Close panel">
              <X size={14} weight="bold" />
            </Button>
          </div>
        </div>
        <div className="s-artifact-panel__content">
          <div className="s-artifact-panel__empty-state">
            <div className="s-artifact-panel__empty-icon">
              <File size={24} weight="light" />
            </div>
            <span>Select a file to preview</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={panelRef} className="s-artifact-panel">
      <a ref={downloadRef} style={{ display: "none" }} aria-hidden="true" />

      <div className="s-artifact-panel__header">
        <ArtifactTabs tabs={tabs} activeTabId={activeTabId} onSelectTab={onSelectTab} onCloseTab={onCloseTab} inline />

        <div className="s-artifact-panel__actions">
          {isDashboardHtml && (
            <Popper
              placement="bottom-end"
              btnColor="transparent"
              btnSize="sm"
              buttonClassName="p-1"
              popperClassName="min-w-[220px]"
              buttonChildren={<DotsThree size={18} weight="bold" />}
            >
              {({ close }) => {
                const items = [
                  { label: "Verify & Publish", icon: SealCheck, onClick: () => setVerifyPublishOpen(true) },
                  { label: "Create with AI", icon: Sparkle, beta: true, onClick: () => onCreateWorkflowAi && onCreateWorkflowAi() },
                  { label: "Create workflow", icon: FlowArrow, onClick: () => onCreateWorkflow && onCreateWorkflow() },
                  { label: "Save as PDF", icon: FilePdf, onClick: handleSavePdf },
                  { label: "Refresh", icon: ArrowsClockwise, onClick: () => setRefreshKey((k) => k + 1) },
                ];
                return (
                  <div className="flex flex-col py-1">
                    {items.map(({ label, icon: Icon, beta, onClick }) => (
                      <button
                        key={label}
                        type="button"
                        className="flex w-full items-center gap-2.5 px-3.5 py-2 text-[13px] text-left text-[var(--text-primary)] bg-transparent border-0 cursor-pointer hover:bg-[var(--color-grey-50)]"
                        onClick={() => { onClick(); close(); }}
                      >
                        <Icon size={16} weight="regular" className="shrink-0 text-[var(--color-grey-600)]" />
                        <span className="flex-1">{label}</span>
                        {beta && (
                          <span className="text-[9px] font-semibold tracking-wide text-[var(--accent)] bg-[var(--color-primary-50)] px-1.5 py-0.5 rounded">
                            BETA
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                );
              }}
            </Popper>
          )}
          {isWidget && (
            <Button
              onClick={() => setLineagePath(lineagePath ? null : activeTab.path)}
              disabled={isLoading}
              variant="ghost"
              size="sm"
              className="p-1"
              title={lineagePath ? "Hide lineage" : "How it's built"}
            >
              <GitBranch size={14} weight="bold" />
            </Button>
          )}
          <Button variant="ghost" size="sm" className="p-1" onClick={onClose} title="Close panel">
            <X size={16} weight="bold" />
          </Button>
        </div>
      </div>

      <div className="s-artifact-panel__content">
        <ViewerContent
          key={`${activeTabId}-${refreshKey}`}
          tab={activeTab}
          sessionId={sessionId}
          htmlIframeRef={htmlIframeRef}
          onLoadComplete={handleLoadComplete}
        />

        {isDragging && <div className="s-artifact-panel__drag-shield" />}

        {/* Widget chat: flag-on → focus modal (rendered via portal at
            body root). Flag-off → legacy drawer overlay (unchanged).
            Both branches are driven by the same `lineagePath` state, so
            the GitBranch icon + bridge-pill auto-open paths work in
            either mode without further branching upstream. */}
        {lineagePath && !widgetChatEnabled && (
          <div className="s-artifact-panel__lineage-overlay" style={{ width: lineageWidth }}>
            <div onMouseDown={onResizeStart} className="s-artifact-panel__lineage-resize" />
            <LineageDrawer
              sessionId={sessionId}
              widgetPath={lineagePath}
              onSendFeedback={onSendFeedback}
              onClose={() => setLineagePath(null)}
              sessionStatus={sessionStatus}
              liveMessages={liveMessages}
            />
          </div>
        )}
      </div>

      {lineagePath && widgetChatEnabled && (
        <WidgetFocusModal
          isOpen={true}
          onClose={() => setLineagePath(null)}
          sessionId={sessionId}
          widgetPath={lineagePath}
          sessionStatus={sessionStatus}
          liveMessages={liveMessages}
          onSendFeedback={onSendFeedback}
        />
      )}

      {verifyPublishOpen && (
        <VerifyPublishModal
          isOpen={true}
          onClose={() => setVerifyPublishOpen(false)}
          sessionId={sessionId}
          sessionStatus={sessionStatus}
          liveMessages={liveMessages}
          onSendFeedback={onSendFeedback}
        />
      )}
    </div>
  );
}
