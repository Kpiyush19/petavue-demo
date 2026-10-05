import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { useSessionContext } from "../contexts/SessionContext";
import { apiGet, apiPost } from "../api";
import Header from "../components/Header";
import { ChatArea, InputArea, ArtifactPanel, WorkspaceTray } from "../components/sessions";
import ChatSkeleton from "../components/sessions/components/ChatSkeleton";
import "../components/sessions/styles.css";
import WorkflowCreateModal from "../components/WorkflowCreateModal";
import ScheduleFormModal from "../components/ScheduleFormModal";
import useSessionPanelStore from "../stores/useSessionPanelStore";
import { MOCK_ENABLED, LANDING_SESSION_ID } from "../mocks";
import { RunReviewActions } from "./workflows/agents-run/RunViews";
import useRunReviewStore from "./workflows/agents-run/useRunReviewStore";
import { CheckCircle, Prohibit } from "@phosphor-icons/react";
import { DASHBOARD_PATH } from "./workflows/agents-run/runSession";

const FILES_MIN = 200;
const FILES_MAX = 320;
const RESIZE_WIDTH = 8;
const PANEL_MAX_PERCENT_TRAY_CLOSED = 0.8;
const PANEL_MAX_PERCENT_TRAY_OPEN = 0.85;
// Workflow run review: the side panel's minimum width, and the share of the
// window it opens at.
const RUN_PANEL_MIN = 550;
const RUN_PANEL_SHARE = 0.54;

export default function WorkspacePage() {
  // On /home there's no :id — fall back to the fixed landing session so the URL
  // stays clean (no session id) while still showing the dashboard workspace.
  const { id: paramId } = useParams();
  const id = paramId || (MOCK_ENABLED ? LANDING_SESSION_ID : undefined);
  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef(null);
  const { session, connectionStatus, isThinking, artifact, tray, handleFileClick, renameSession } = useSessionContext();

  const [workflowTarget, setWorkflowTarget] = useState(null);
  const [workflowAiMode, setWorkflowAiMode] = useState(false);
  const [scheduleFormPrompt, setScheduleFormPrompt] = useState(null);
  const [scheduleTargets, setScheduleTargets] = useState([]);
  const resumeAttemptedFor = useRef(null);

  const { filesWidth, artifactWidth, setFilesWidth, setArtifactWidth } = useSessionPanelStore(
    useShallow((state) => ({
      filesWidth: state.filesWidth,
      artifactWidth: state.artifactWidth,
      setFilesWidth: state.setFilesWidth,
      setArtifactWidth: state.setArtifactWidth
    }))
  );
  const [dragging, setDragging] = useState(null);
  const prevTrayOpen = useRef(tray.isOpen);

  useEffect(() => {
    if (!id) return;
    if (session.sessionId === id) return;
    if (resumeAttemptedFor.current === id) return;
    resumeAttemptedFor.current = id;
    session.resumeSession(id).catch(() => {
      navigate("/", { replace: true });
    });
  }, [id, session.sessionId]);

  const pendingMessage = useRef(location.state?.initialMessage || null);
  const pendingFiles = useRef(location.state?.initialFiles || null);
  useEffect(() => {
    if (!pendingMessage.current && !pendingFiles.current) return;
    if (session.sessionId !== id) return;
    if (session.status !== "active") return;
    const msg = pendingMessage.current;
    const files = pendingFiles.current;
    pendingMessage.current = null;
    pendingFiles.current = null;
    window.history.replaceState({}, "", location.pathname);
    session.sendMessage(msg || "", files || []);
  }, [session.sessionId, session.status, id]);

  // Skill-run → regular handoff lands here with `openArtifact` in route
  // state: descriptor of the dashboard / memo the skill produced. We
  // open it in the artifact panel as soon as the session reaches
  // `active`, then clear so a refresh doesn't re-open it.
  // If `openVerifyPublish: true` is also set in state (V&P button on the
  // skill-run page), we ALSO request the V&P modal to auto-open once the
  // dashboard tab is active — ArtifactPanel handles the runtime check.
  const pendingArtifact = useRef(location.state?.openArtifact || null);
  const pendingVerifyPublish = useRef(!!location.state?.openVerifyPublish);
  // Keep the handed-off dashboard descriptor so the chat welcome's "Open
  // dashboard" button can re-open it (the ref above is nulled after auto-open).
  const [handoffArtifact] = useState(() => location.state?.openArtifact || null);
  useEffect(() => {
    if (!pendingArtifact.current && !pendingVerifyPublish.current) return;
    if (session.sessionId !== id) return;
    if (session.status !== "active") return;
    const desc = pendingArtifact.current;
    const wantVP = pendingVerifyPublish.current;
    pendingArtifact.current = null;
    pendingVerifyPublish.current = false;
    window.history.replaceState({}, "", location.pathname);
    if (desc) artifact.openArtifact(desc);
    if (wantVP && desc?.path) artifact.requestVerifyPublishOpen(desc.path);
  }, [session.sessionId, session.status, id, artifact]);

  const handleSchedulePrompt = useCallback(
    async (prompt) => {
      if (session.sessionId) {
        try {
          const data = await apiGet(`/api/sessions/${session.sessionId}/recipe/targets`);
          setScheduleTargets(data.targets || []);
        } catch {
          toast.error("Failed to load recipe targets");
          setScheduleTargets([]);
        }
      }
      setScheduleFormPrompt(prompt);
    },
    [session.sessionId]
  );

  const handleScheduleSave = useCallback(
    async (body) => {
      if (session.sessionId) {
        body.source_session_id = session.sessionId;
      }
      await apiPost("/api/schedules", body);
      setScheduleFormPrompt(null);
      setScheduleTargets([]);
    },
    [session.sessionId]
  );

  const handleDeleteLastMessage = useCallback(async () => {
    const result = await session.deleteLastMessage();
    if (result?.isEmpty) {
      navigate("/", { replace: true });
    }
  }, [session.deleteLastMessage, navigate]);

  const onFilesResizeStart = useCallback(
    (e) => {
      e.preventDefault();
      setDragging("files");
      const startX = e.clientX;
      const startWidth = filesWidth;
      let rafId = null;

      const onMove = (ev) => {
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
          rafId = null;
          const delta = ev.clientX - startX;
          const newWidth = Math.min(FILES_MAX, Math.max(FILES_MIN, startWidth + delta));
          setFilesWidth(newWidth);
        });
      };

      const onUp = () => {
        if (rafId) cancelAnimationFrame(rafId);
        setDragging(null);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [filesWidth, setFilesWidth]
  );

  const onArtifactResizeStart = useCallback(
    (e) => {
      e.preventDefault();
      setDragging("artifact");
      const startX = e.clientX;
      const startWidth = artifactWidth;
      const containerWidth = containerRef.current?.offsetWidth || window.innerWidth;
      const currentFilesWidth = tray.isOpen ? filesWidth : 0;
      const availableWidth = containerWidth - currentFilesWidth - RESIZE_WIDTH;
      const minArtifact = availableWidth * 0.15;
      const maxArtifact = availableWidth * 0.85;
      let rafId = null;

      const onMove = (ev) => {
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
          rafId = null;
          const delta = ev.clientX - startX;
          const newWidth = Math.min(maxArtifact, Math.max(minArtifact, startWidth - delta));
          setArtifactWidth(newWidth);
        });
      };

      const onUp = () => {
        if (rafId) cancelAnimationFrame(rafId);
        setDragging(null);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [artifactWidth, filesWidth, tray.isOpen, setArtifactWidth]
  );

  useEffect(() => {
    if (!artifact.isOpen) {
      prevTrayOpen.current = tray.isOpen;
      return;
    }
    const containerWidth = containerRef.current?.offsetWidth;
    if (!containerWidth) {
      prevTrayOpen.current = tray.isOpen;
      return;
    }
    if (prevTrayOpen.current === tray.isOpen) return;

    const wasOpen = prevTrayOpen.current;
    const isOpen = tray.isOpen;

    const oldAvailable = wasOpen ? containerWidth - filesWidth - RESIZE_WIDTH * 2 : containerWidth - RESIZE_WIDTH;
    const newAvailable = isOpen ? containerWidth - filesWidth - RESIZE_WIDTH * 2 : containerWidth - RESIZE_WIDTH;

    const maxPercent = isOpen ? PANEL_MAX_PERCENT_TRAY_OPEN : PANEL_MAX_PERCENT_TRAY_CLOSED;
    const minPercent = 1 - maxPercent;

    const ratio = artifactWidth / oldAvailable;
    let newWidth = ratio * newAvailable;
    newWidth = Math.min(newAvailable * maxPercent, Math.max(newAvailable * minPercent, newWidth));
    // A run's Changes cards are read in this panel, so it keeps its full width.
    if (session.sessionType === "workflow_run") newWidth = Math.max(newWidth, RUN_PANEL_MIN);
    setArtifactWidth(newWidth);

    prevTrayOpen.current = tray.isOpen;
  }, [tray.isOpen, artifact.isOpen, filesWidth, artifactWidth, setArtifactWidth]);

  // A workflow run opens with its own pinned views beside the conversation:
  // the dashboard it published, the changes its agents drafted, and the board.
  const isRunReview = session.sessionType === "workflow_run" && session.sessionId === id;
  const runPending = useRunReviewStore((s) => s.recs.filter((r) => r.pending).length);
  const runTotal = useRunReviewStore((s) => s.recs.length);
  const runClosed = useRunReviewStore((s) => !!s.outcome);
  const runOutcome = useRunReviewStore((s) => s.outcome);
  const runApproved = useRunReviewStore((s) => s.approvedCount);
  const runOpenRequest = useRunReviewStore((s) => s.openRequest);
  const runTabsOpenedFor = useRef(null);
  useEffect(() => {
    if (!isRunReview || session.status === "idle") return;
    if (runTabsOpenedFor.current === id) return;
    runTabsOpenedFor.current = id;
    artifact.openArtifact({ path: DASHBOARD_PATH, title: "Dashboard", contentType: "html", pinned: true, activate: false });
    artifact.openArtifact({ path: "run://changes", title: "Changes", count: runPending, contentType: "run-changes", pinned: true });
    artifact.openArtifact({ path: "run://board", title: "All recommendations", count: runTotal, contentType: "run-board", pinned: true, activate: false });
    // The decision leads: the side panel takes the larger share of the window,
    // and the conversation beside it explains how the agents got there.
    const width = containerRef.current?.offsetWidth || 0;
    if (width) {
      widthBeforeRun.current = artifactWidth;
      setArtifactWidth(Math.max(RUN_PANEL_MIN, Math.round(width * RUN_PANEL_SHARE)));
    }
  }, [isRunReview, session.status, id]);

  // Leaving the run gives other chats their usual panel width back.
  const widthBeforeRun = useRef(null);
  useEffect(() => {
    if (isRunReview || widthBeforeRun.current == null) return;
    setArtifactWidth(widthBeforeRun.current);
    widthBeforeRun.current = null;
    runTabsOpenedFor.current = null;
  }, [isRunReview]);

  // The agent asks the panel to show something: the card it just edited, or a
  // file it just wrote.
  const lastRunOpen = useRef(0);
  useEffect(() => {
    if (!isRunReview || !runOpenRequest || runOpenRequest.n === lastRunOpen.current) return;
    lastRunOpen.current = runOpenRequest.n;
    artifact.openArtifact(runOpenRequest);
  }, [isRunReview, runOpenRequest]);

  const isIdle = session.status === "idle";
  const activeFilePath = artifact.activeTab?.path || null;

  if (isIdle && id && session.sessionId !== id) {
    return <ChatSkeleton showHeader />;
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Header
        sessionId={session.sessionId}
        sessionName={session.sessionName}
        onRenameSession={renameSession}
        isThinking={isThinking}
        isCompacting={session.isCompacting}
        totalTokens={session.totalTokens}
        contextThreshold={session.contextThreshold}
        contextUsagePercent={session.contextUsagePercent}
        filesOpen={tray.isOpen}
        onToggleFiles={tray.toggleOpen}
        artifactOpen={artifact.isOpen}
        onToggleArtifact={artifact.togglePanel}
        actions={
          isRunReview ? (
            <RunReviewActions
              panelOpen={artifact.isOpen}
              onShowPanel={() => artifact.openArtifact({ path: "run://changes", title: "Changes", count: runPending, contentType: "run-changes", pinned: true })}
            />
          ) : null
        }
      />

      <div className="session-panels" ref={containerRef}>
        {dragging && <div className="session-panels__drag-shield" />}

        {tray.isOpen && (
          <>
            <div className="session-panels__files" style={{ flexBasis: filesWidth }}>
              <WorkspaceTray
                fileTree={tray.fileTree}
                expandedDirs={tray.expandedDirs}
                loading={tray.loading}
                searchQuery={tray.searchQuery}
                activeFilePath={activeFilePath}
                onToggleDir={tray.toggleDir}
                onFileClick={handleFileClick}
                onSearchChange={tray.setSearchQuery}
                onRefresh={() => tray.fetchFiles(session.sessionId)}
                onClose={tray.close}
              />
            </div>

            <div
              className={`session-panels__resize${dragging === "files" ? " session-panels__resize--active" : ""}`}
              onMouseDown={onFilesResizeStart}
            />
          </>
        )}

        <div className="session-panels__chat-wrapper scrollbar-hide">
          <div className="session-panels__chat">
            <ChatArea
              messages={session.messages}
              sessionId={session.sessionId}
              urlSessionId={id}
              isResumed={session.isResumed}
              onOpenArtifact={artifact.openArtifact}
              onDeleteLastMessage={handleDeleteLastMessage}
              isThinking={isThinking}
              isCompacting={session.isCompacting}
              onSend={session.sendMessage}
              disabled={isIdle || isThinking}
              onOpenWidgetChat={artifact.openWidgetLineage}
              suggestedQuestions={session.suggestedQuestions}
              suggestionsLoading={session.suggestionsLoading}
              onMuteFollowups={session.muteFollowups}
              followupsMuted={session.followupsMuted}
              onUnmuteFollowups={session.unmuteFollowups}
              dashboardName={session.sessionName}
              onOpenDashboard={handoffArtifact ? () => artifact.openArtifact(handoffArtifact) : undefined}
            />

            {/* The decision, confirmed in the conversation itself: the same
                green mark as the header, and why the composer is closed. */}
            {isRunReview && runOutcome && (
              <div className={`run-done${runOutcome === "rejected" ? " run-done--rejected" : ""}`}>
                {runOutcome === "approved" ? (
                  <CheckCircle size={16} weight="fill" aria-hidden="true" />
                ) : (
                  <Prohibit size={16} aria-hidden="true" />
                )}
                <p>
                  {runOutcome === "approved" ? (
                    <>
                      <b>Published.</b> {runApproved} {runApproved === 1 ? "change is" : "changes are"} now on the
                      Recommendations page. People who can see this workflow can accept, reject or hold them.
                    </>
                  ) : (
                    <>
                      <b>Rejected.</b> Nothing was sent to the Recommendations page. The next scheduled run prepares
                      a new draft.
                    </>
                  )}
                </p>
              </div>
            )}

            {session.messages.length > 0 && (
              <InputArea
                onSend={session.sendMessage}
                onCancel={session.cancelTurn}
                disabled={isIdle || isThinking || (isRunReview && runClosed)}
                isThinking={isThinking}
                connectionStatus={connectionStatus}
                sessionId={id}
              />
            )}
          </div>
        </div>

        {artifact.isOpen && (
          <>
            <div
              className={`session-panels__resize${dragging === "artifact" ? " session-panels__resize--active" : ""}`}
              onMouseDown={onArtifactResizeStart}
            />

            <div className="session-panels__artifact" style={{ flexBasis: artifactWidth }}>
              <div className="session-panels__artifact-wrapper scrollbar-hide">
                <ArtifactPanel
                  tabs={artifact.tabs}
                  activeTabId={artifact.activeTabId}
                  activeTab={artifact.activeTab}
                  sessionId={session.sessionId}
                  onSelectTab={artifact.setActiveTab}
                  onCloseTab={artifact.closeTab}
                  onClose={artifact.closePanel}
                  onCreateWorkflow={
                    session.sessionType === "regular"
                      ? (path, title) => {
                          setWorkflowTarget({ path, title });
                          setWorkflowAiMode(false);
                        }
                      : undefined
                  }
                  onCreateWorkflowAi={
                    session.sessionType === "regular"
                      ? (path, title) => {
                          setWorkflowTarget({ path, title });
                          setWorkflowAiMode(true);
                        }
                      : undefined
                  }
                  onSendFeedback={(text, widgetScope) =>
                    session.sendMessage(text, [], widgetScope ? { widgetScope } : {})
                  }
                  sessionStatus={session.status}
                  openLineageFor={artifact.openLineageFor}
                  consumeOpenLineageFor={artifact.consumeOpenLineageFor}
                  openVerifyPublishFor={artifact.openVerifyPublishFor}
                  consumeOpenVerifyPublishFor={artifact.consumeOpenVerifyPublishFor}
                  liveMessages={session.messages}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {workflowTarget && (
        <WorkflowCreateModal
          targetFile={workflowTarget.path}
          targetTitle={workflowTarget.title}
          sessionId={session.sessionId}
          onClose={() => {
            setWorkflowTarget(null);
            setWorkflowAiMode(false);
          }}
          aiMode={workflowAiMode}
        />
      )}

      {scheduleFormPrompt !== null && (
        <ScheduleFormModal
          schedule={{
            prompt: scheduleFormPrompt,
            dashboard_id: session.dashboardId || "",
            name: "",
            cron_expression: "0 9 * * 1",
            timezone: "UTC",
            recipients: []
          }}
          prefillDashboardId={session.dashboardId}
          targetFiles={scheduleTargets}
          onSave={handleScheduleSave}
          onClose={() => setScheduleFormPrompt(null)}
        />
      )}
    </div>
  );
}
