import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useSession } from './hooks/useSession';
import { usePusher } from './hooks/usePusher';
import { useArtifactPanel } from './hooks/useArtifactPanel';
import { inferContentType } from './utils/fileTypes';
import { AnalyticsChatProvider } from './context/AnalyticsChatContext';
import ChatArea from './components/ChatArea';
import InputArea from './components/InputArea';
import ArtifactPanel from './components/ArtifactPanel';
import { getAuthToken } from '../../../api';
import spinner from '@/ui/assets/spinner.gif';

/**
 * AnalyticsChatInner - The internal component that uses hooks
 * Must be rendered inside QueryClientProvider
 */
function AnalyticsChatInner({
  dashboardId,
  dashboardName,
  initialSessionId,
  apiUrl,
  authToken,
  pusherKey,
  pusherCluster,
  timezone = 'UTC',
  onSessionCreated,
  onError,
  onSchedule,
  onPublish,
  onConnectionStatusChange,
  onArtifactApiReady,
  leftSlot,
  filesTraySlot,
  readOnly = false,
  className = '',
  initialInputValue = '',
  onInputChange,
  welcomeSubtitle,
  welcomeCtas,
  followups,
  inputPlaceholder,
}) {
  // API and Pusher config is now automatic via app's centralized modules
  const session = useSession();
  const { connectionStatus, subscriptionError } = usePusher({
    sessionId: session.sessionId,
    onEvent: session.handlePusherEvent,
    onError: onError,
    enabled: !readOnly, // Don't subscribe to Pusher for older sessions
  });
  const artifact = useArtifactPanel();

  // Report connection status changes to parent
  useEffect(() => {
    onConnectionStatusChange?.({
      status: connectionStatus,
      error: subscriptionError,
    });
  }, [connectionStatus, subscriptionError, onConnectionStatusChange]);

  const [initialized, setInitialized] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const loadingSessionRef = useRef(null); // Track which session is currently being loaded
  const prevSessionIdRef = useRef(null); // Track previous sessionId to detect changes

  // Auto-create or resume session
  useEffect(() => {
    // Check for auth token from app's centralized auth
    if (!getAuthToken()) return;

    // Resume existing session if sessionId provided
    if (initialSessionId) {
      // Skip if already loading this session or already loaded
      if (loadingSessionRef.current === initialSessionId) return;
      if (prevSessionIdRef.current === initialSessionId && initialized) return;

      loadingSessionRef.current = initialSessionId;
      setIsLoadingSession(true);
      session
        .resumeSession(initialSessionId, dashboardId)
        .then((sid) => {
          prevSessionIdRef.current = initialSessionId;
          setInitialized(true);
          setIsLoadingSession(false);
          onSessionCreated?.(sid);
        })
        .catch((err) => {
          loadingSessionRef.current = null;
          setIsLoadingSession(false);
          onError?.(err);
        });
      return;
    }

    // Create new session if dashboardId provided
    if (dashboardId) {
      // Skip if already creating for this dashboard
      if (loadingSessionRef.current === `create-${dashboardId}`) return;

      loadingSessionRef.current = `create-${dashboardId}`;
      setIsLoadingSession(true);
      session
        .createSession(dashboardId)
        .then((sid) => {
          prevSessionIdRef.current = sid;
          setInitialized(true);
          setIsLoadingSession(false);
          onSessionCreated?.(sid);
        })
        .catch((err) => {
          loadingSessionRef.current = null;
          setIsLoadingSession(false);
          onError?.(err);
        });
    }
  }, [dashboardId, initialSessionId]);

  // Reset artifact panel when session changes
  const prevSessionId = useRef(null);
  useEffect(() => {
    if (session.sessionId !== prevSessionId.current) {
      prevSessionId.current = session.sessionId;
      artifact.reset();
    }
  }, [session.sessionId]);

  // Expose artifact API to parent
  useEffect(() => {
    onArtifactApiReady?.({ openArtifact: artifact.openArtifact });
  }, [onArtifactApiReady, artifact.openArtifact]);

  const isThinking = session.status === 'thinking';

  // Loading state - show when initializing or switching sessions
  if (
    isLoadingSession ||
    (!initialized && !session.sessionId && (dashboardId || initialSessionId))
  ) {
    return (
      <div className={`analytics-chat analytics-chat--loading ${className}`}>
        <div className="analytics-chat__loader">
          <img src={spinner} alt="loading" className="w-5 h-5 shrink-0" />
          <span>
            {initialSessionId
              ? 'Loading session...'
              : 'Initializing session...'}
          </span>
        </div>
      </div>
    );
  }

  // No session configured - show empty state
  if (!initialized && !session.sessionId && !dashboardId && !initialSessionId) {
    return (
      <div className={`analytics-chat analytics-chat--empty ${className}`}>
        <div className="analytics-chat__empty">
          <span>
            No session configured. Provide a dashboardId or sessionId to start.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`analytics-chat ${className}`}>
      {/* Chat - always full width */}
      <div
        className="analytics-chat__main"
        style={{ width: '100%', flex: '1' }}
      >
        <ChatArea
          messages={session.messages}
          sessionId={session.sessionId}
          timezone={timezone}
          onOpenArtifact={artifact.openArtifact}
          onDeleteLastMessage={readOnly ? undefined : session.deleteLastMessage}
          onSchedulePrompt={
            onSchedule
              ? (prompt) => onSchedule(prompt, session.sessionId)
              : undefined
          }
          isThinking={isThinking}
          isCompacting={session.isCompacting}
          onSuggestionClick={(text) => session.sendMessage(text)}
          dashboardName={dashboardName}
          welcomeSubtitle={welcomeSubtitle}
          welcomeCtas={welcomeCtas}
          followups={followups}
        />
        <InputArea
          onSend={session.sendMessage}
          onCancel={session.cancelTurn}
          disabled={!session.sessionId || isThinking}
          isThinking={isThinking}
          eventLog={session.eventLog}
          leftSlot={leftSlot}
          filesTraySlot={filesTraySlot}
          readOnly={readOnly}
          sessionId={session.sessionId}
          connectionStatus={connectionStatus}
          subscriptionError={subscriptionError}
          initialInputValue={initialInputValue}
          onInputChange={onInputChange}
          placeholder={inputPlaceholder}
        />
      </div>
      {/* Artifact panel - overlay on top of chat */}
      <AnimatePresence>
        {artifact.isOpen && (
          <motion.div
            className="analytics-chat__artifact-overlay"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <ArtifactPanel
              tabs={artifact.tabs}
              activeTabId={artifact.activeTabId}
              activeTab={artifact.activeTab}
              sessionId={session.sessionId}
              onSelectTab={artifact.setActiveTab}
              onCloseTab={artifact.closeTab}
              onClose={artifact.closePanel}
              onPublish={
                onPublish
                  ? (path, title) => onPublish(path, title, session.sessionId)
                  : undefined
              }
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * AnalyticsChat - Embeddable chat + artifact viewer widget
 *
 * Props:
 *   dashboardId   - (optional) Dashboard ID to analyze. If provided, creates a new session.
 *   sessionId     - (optional) Existing session ID to resume. Takes precedence over dashboardId.
 *   apiUrl        - (required) Backend API URL (e.g. "https://api.example.com")
 *   authToken     - (required) JWT auth token for API calls
 *   pusherKey     - (required) Pusher app key
 *   pusherCluster - (required) Pusher cluster (e.g. "mt1")
 *   queryClient   - (optional) React Query QueryClient. If not provided, an internal one will be created.
 *   onNotification - (optional) Callback for showing notifications: ({ type, title, message }) => void
 *   onSessionCreated - (optional) Callback when session is created: (sessionId) => void
 *   onError       - (optional) Callback on errors: (error) => void
 *   onSchedule    - (optional) Callback when user clicks "Schedule" on an assistant message: (prompt, sessionId) => void
 *   onPublish     - (optional) Callback when user clicks "Publish" on an artifact: (path, title, sessionId) => void
 *   className     - (optional) Additional CSS classes for the container
 */
export default function AnalyticsChat({
  dashboardId,
  dashboardName,
  sessionId: initialSessionId,
  apiUrl,
  authToken,
  pusherKey,
  pusherCluster,
  queryClient: externalQueryClient,
  onNotification,
  timezone = 'UTC',
  onSessionCreated,
  onError,
  onSchedule,
  onPublish,
  onConnectionStatusChange,
  onArtifactApiReady,
  leftSlot,
  filesTraySlot,
  readOnly = false,
  className = '',
  initialInputValue = '',
  onInputChange,
  // Optional copy overrides so the same panel can serve non-dashboard contexts
  // (e.g. Goals). Undefined → default dashboard copy/behavior.
  welcomeSubtitle,
  welcomeCtas,
  followups,
  inputPlaceholder,
}) {
  return (
    <AnalyticsChatProvider
      queryClient={externalQueryClient}
      onNotification={onNotification}
    >
      <AnalyticsChatInner
        dashboardId={dashboardId}
        dashboardName={dashboardName}
        initialSessionId={initialSessionId}
        apiUrl={apiUrl}
        authToken={authToken}
        pusherKey={pusherKey}
        pusherCluster={pusherCluster}
        timezone={timezone}
        onSessionCreated={onSessionCreated}
        onError={onError}
        onSchedule={onSchedule}
        onPublish={onPublish}
        onConnectionStatusChange={onConnectionStatusChange}
        onArtifactApiReady={onArtifactApiReady}
        leftSlot={leftSlot}
        filesTraySlot={filesTraySlot}
        readOnly={readOnly}
        className={className}
        initialInputValue={initialInputValue}
        onInputChange={onInputChange}
        welcomeSubtitle={welcomeSubtitle}
        welcomeCtas={welcomeCtas}
        followups={followups}
        inputPlaceholder={inputPlaceholder}
      />
    </AnalyticsChatProvider>
  );
}
