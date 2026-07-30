import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUp, ArrowRight } from 'lucide-react'
import MarkdownRenderer from '../../../utils/MarkdownRenderer'
import { apiGet } from '../../../api'

// Bootstrap fallback for the sliding-window cap — used ONLY for the very
// first render before the backend's /widget-window-preview response arrives.
// After that, `requestedN` (server-authoritative) takes over. The backend's
// WIDGET_CHAT_WINDOW_SIZE in src/routes/sessions.py is the single source of
// truth; this number just keeps the first frame from showing 0 prior turns
// while the fetch is in flight.
const WINDOW_BOOTSTRAP_DEFAULT = 5

/**
 * Group messages into logical turns and split into in-window vs out-of-window.
 *
 * A turn starts with a user-role message (real user prompt — type === 'user').
 * Tool_call / tool_result / assistant entries belong to the most recent turn.
 * The last N turns are "in window" (agent will receive them); earlier ones
 * are out of window.
 */
function _computeWindowSplit(messages, n) {
  const turns = []
  let currentTurn = []
  for (const msg of messages) {
    if (msg.type === 'user') {
      if (currentTurn.length > 0) turns.push(currentTurn)
      currentTurn = [msg]
    } else if (currentTurn.length > 0) {
      currentTurn.push(msg)
    }
    // Skip orphans (assistant/tool_* before any user-anchor)
  }
  if (currentTurn.length > 0) turns.push(currentTurn)

  const inWindowTurnCount = Math.min(n, turns.length)
  const outOfWindowTurnCount = Math.max(0, turns.length - n)

  const flat = []
  turns.forEach((turn, turnIdx) => {
    const inWindow = turnIdx >= outOfWindowTurnCount
    turn.forEach((msg) => {
      flat.push({ msg, inWindow, turnIdx })
    })
  })

  const firstInWindowIdx = outOfWindowTurnCount > 0
    ? flat.findIndex((item) => item.inWindow)
    : -1

  return { flat, firstInWindowIdx, inWindowTurnCount, totalTurns: turns.length }
}

/**
 * WidgetChatPanel — chat thread + composer for widget-scoped conversations.
 * See docs/widget-chat-implementation-plan.md for design.
 *
 * Renders only when the widget_chat_enabled feature flag is on (parent
 * decides when to mount this vs the legacy textarea).
 *
 * **Source of truth:** the panel reads from the parent's `liveMessages`
 * prop (= useSession.messages, which already merges historical /history
 * load + live Pusher events). Filters by widgetScope === widgetPath. This
 * means tool_call / tool_result events stream live into the panel during a
 * widget turn.
 *
 * No local state for messages, no /history refetch, no optimistic add here
 * — useSession handles all of that uniformly with main chat. Markdown
 * rendering, todo_write filtering, and "Thinking" indicator match main chat.
 *
 * The panel STILL controls:
 *   - Window-cutoff visualization (in-context vs out-of-context fade)
 *   - Submit handler that calls onSubmit(text, widgetPath)
 *   - Bridge banner ("Main chat has made N edits to this widget")
 */
export default function WidgetChatPanel({
  widgetPath,
  sessionId,
  onSubmit,
  sessionStatus,
  onClose,
  // Parent (LineageDrawer / WidgetFocusModal) already fetches lineage and
  // has the count — pass it via prop to avoid double-fetching.
  mainChatEditsCount = 0,
  // Live useSession.messages (already includes historical + live updates +
  // widget_scope tags). Parent passes the WHOLE list; we filter by widget.
  liveMessages = [],
}) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // Server-truthful preview of what the LLM would actually receive. All
  // three start at WINDOW_BOOTSTRAP_DEFAULT so the first render is sensible;
  // the /widget-window-preview response replaces them with authoritative
  // values shortly after mount.
  //   actualN:    turns the agent will receive (= min(in_session_n, cap))
  //   inSessionN: complete widget turns currently in session.messages
  //               (post-compaction). Lets us derive whether the gap is
  //               from compaction or from the window cap.
  //   requestedN: the cap the backend is using (= WIDGET_CHAT_WINDOW_SIZE
  //               on the server). Pulled from the same endpoint so we don't
  //               duplicate the value as a hardcoded frontend constant —
  //               backend is single source of truth.
  const [actualN, setActualN] = useState(WINDOW_BOOTSTRAP_DEFAULT)
  const [inSessionN, setInSessionN] = useState(WINDOW_BOOTSTRAP_DEFAULT)
  const [requestedN, setRequestedN] = useState(WINDOW_BOOTSTRAP_DEFAULT)
  const [previewLoaded, setPreviewLoaded] = useState(false)
  const prevStatusRef = useRef(sessionStatus)
  const messagesEndRef = useRef(null)

  // Filter live messages by widget scope. Memo prevents re-filter on every
  // re-render; only recomputes when liveMessages or widgetPath change.
  const messages = useMemo(
    () => liveMessages.filter((m) => m.widgetScope === widgetPath),
    [liveMessages, widgetPath],
  )

  // Auto-scroll to bottom on new messages or when busy
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, submitting, sessionStatus])

  // Server-truthful actual_n: how many prior widget turns the agent will
  // ACTUALLY receive on submit. Backend runs filter_widget_window against
  // session.messages (post-compaction); if a main-chat compaction has
  // wiped older widget-tagged messages, actual_n can be lower than the
  // displayed count — even 0. Fetched:
  //   1. On mount / widget change (so footer + fade are correct on open)
  //   2. After a 'thinking' → not-'thinking' transition (turn just
  //      completed; the new user+assistant pair may have shifted the
  //      window OR a compaction may have run mid-turn)
  // Cheap call — no LLM, just a read of session.messages.
  useEffect(() => {
    if (!sessionId || !widgetPath) return
    let cancelled = false
    apiGet(
      `/api/sessions/${sessionId}/widget-window-preview?path=${encodeURIComponent(widgetPath)}`,
    )
      .then((data) => {
        if (cancelled) return
        if (typeof data?.actual_n === 'number') setActualN(data.actual_n)
        if (typeof data?.in_session_n === 'number') setInSessionN(data.in_session_n)
        if (typeof data?.requested_n === 'number') setRequestedN(data.requested_n)
        setPreviewLoaded(true)
      })
      .catch(() => {
        if (cancelled) return
        // Soft-fail: leave the three counters at their bootstrap defaults.
        // Footer / fade behave roughly like pre-fix until the next fetch
        // succeeds (e.g. after a turn completes).
        setPreviewLoaded(true)
      })
    return () => { cancelled = true }
  }, [sessionId, widgetPath])

  useEffect(() => {
    if (!sessionId || !widgetPath) return
    if (prevStatusRef.current === 'thinking' && sessionStatus !== 'thinking') {
      apiGet(
        `/api/sessions/${sessionId}/widget-window-preview?path=${encodeURIComponent(widgetPath)}`,
      )
        .then((data) => {
          if (typeof data?.actual_n === 'number') setActualN(data.actual_n)
          if (typeof data?.in_session_n === 'number') setInSessionN(data.in_session_n)
          if (typeof data?.requested_n === 'number') setRequestedN(data.requested_n)
        })
        .catch(() => { /* soft-fail, keep previous values */ })
    }
    prevStatusRef.current = sessionStatus
  }, [sessionStatus, sessionId, widgetPath])

  // Distinguish "THIS widget's turn is running" from "some OTHER turn is
  // running" (main chat, another widget). Backend stamps widget_scope on
  // every event emitted during a widget turn, so the latest liveMessages
  // entry reflects which surface the current in-flight turn belongs to.
  //   - submitting          → we just hit send; POST in flight or just landed
  //   - thinking + last msg widget-tagged for THIS widget → our turn is running
  //   - thinking + last msg NOT widget-tagged (or tagged for another widget)
  //     → a main-chat or sibling-widget turn is running; this panel is idle
  // The composer is still disabled in BOTH busy cases (concurrent turn
  // guard at the backend would reject anyway), but the indicator text
  // changes so the user knows which surface is processing.
  const lastLiveMsg = liveMessages[liveMessages.length - 1]
  const lastIsThisWidget = lastLiveMsg?.widgetScope === widgetPath
  const isThisWidgetThinking =
    submitting || (sessionStatus === 'thinking' && lastIsThisWidget)
  const isOtherSurfaceThinking =
    sessionStatus === 'thinking' && !submitting && !lastIsThisWidget
  const isBusy = isThisWidgetThinking || isOtherSurfaceThinking

  const handleSubmit = async () => {
    const value = text.trim()
    if (!value || isBusy) return
    setText('')
    setSubmitting(true)
    // Optimistically bump preview counters to match the new user turn we're
    // about to send. Backend appends the user message to session.messages
    // BEFORE running the agent loop, so:
    //   actual_n  → min(actual_n + 1, cap)   (new turn enters the window)
    //   in_session_n → in_session_n + 1      (one more widget turn in session)
    // Without this bump, `totalTurns` (derived from liveMessages — which
    // grows on the optimistic add) outpaces stale `inSessionN`, and the
    // divider math (compactedTurns = totalTurns - inSessionN) wrongly
    // claims the previous turn is compacted away when it's actually
    // still in the agent's context (observed mid-turn on session
    // d110f14b8824485e).
    // Use the server-reported `requestedN` for the cap instead of a
    // hardcoded constant — backend is single source of truth.
    setActualN((prev) => Math.min(prev + 1, requestedN))
    setInSessionN((prev) => prev + 1)
    try {
      // useSession.sendMessage handles the optimistic add (with widgetScope
      // tag) — we don't need to add to local state. No post-submit refetch
      // either: while the turn is in flight, the backend treats it as
      // incomplete (no assistant response yet) and count_complete_widget_turns
      // would return stale lower values that overwrite the optimistic bump
      // above. The thinking → not-thinking effect refetches authoritative
      // counts once the turn lands.
      await Promise.resolve(onSubmit(value, widgetPath))
    } finally {
      setSubmitting(false)
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Pass actualN (server-truthful) instead of the cap. When compaction has
  // wiped older widget messages from session.messages, actualN drops and
  // the messages above the cutoff render with opacity-50 — making visually
  // clear that the agent has no memory of them.
  const { flat, firstInWindowIdx, inWindowTurnCount, totalTurns } =
    _computeWindowSplit(messages, actualN)

  // Distinguish "compacted away" from "outside window cap" so the divider
  // and footer can name the actual reason. Math:
  //   compactedTurns   = displayed_n - in_session_n  (gone from LLM context
  //                       via main-chat compaction)
  //   windowExcluded   = in_session_n - actual_n     (still in session.messages
  //                       but beyond the N=5 sliding window)
  // We approximate displayed_n here as totalTurns (frontend's count of
  // complete widget turns visible). The two will match when liveMessages
  // and session.history are in sync — which is the steady state.
  const compactedTurns = previewLoaded ? Math.max(0, totalTurns - inSessionN) : 0
  const windowExcluded = previewLoaded ? Math.max(0, inSessionN - actualN) : 0
  const dividerLabel =
    compactedTurns > 0 && windowExcluded > 0
      ? `↑ Older messages: ${compactedTurns} compacted, ${windowExcluded} outside window`
      : compactedTurns > 0
        ? `↑ Compacted: not in agent's context`
        : `↑ Older messages: not sent to the agent`

  return (
    <div className="flex flex-col h-full">
      {/* Bridge banner — main chat has edited this widget. */}
      {mainChatEditsCount > 0 && (
        <div className="shrink-0 px-3 py-2 border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] text-[var(--text-secondary)]">
              Main chat has made {mainChatEditsCount} {mainChatEditsCount === 1 ? 'edit' : 'edits'} to this widget.
            </span>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1 text-[12px] text-[var(--accent)] hover:opacity-80
                  bg-transparent border-none cursor-pointer"
              >
                View
                <ArrowRight size={11} />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-2">
        {messages.length === 0 && (
          <div className="min-h-full flex flex-col items-center justify-center text-center px-6">
            <img src="/petavue-logo.svg" alt="Petavue" style={{ width: 26, height: 32 }} className="mb-4" />
            <p className="m-0 text-[14px] text-[var(--text-muted)] leading-relaxed max-w-[300px]">
              Ask a question or request a change — the agent only sees this widget's lineage and recent edits made here.
            </p>
          </div>
        )}

        {flat.map((item, i) => (
          <Fragment key={item.msg.id || `${i}`}>
            {i === firstInWindowIdx && (
              <div className="flex items-center gap-2 my-2 select-none" aria-label="context window cutoff">
                <div className="flex-1 border-t border-dashed border-[var(--border-primary)]" />
                <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">
                  {dividerLabel}
                </span>
                <div className="flex-1 border-t border-dashed border-[var(--border-primary)]" />
              </div>
            )}
            <div className={item.inWindow ? '' : 'opacity-50'}>
              <WidgetChatMessage entry={item.msg} />
            </div>
          </Fragment>
        ))}

        {/* Compacted-everything case: when actualN drops to 0 but the UI
            still shows widget messages (post-compaction state), the
            per-row firstInWindowIdx divider above can't render (no
            in-window item exists for it to anchor on). Render the cutoff
            label at the end of the list so the user sees an explanation
            for the all-dimmed thread instead of wondering about a
            styling bug. Uses the same compaction-aware wording. */}
        {previewLoaded && totalTurns > 0 && inWindowTurnCount === 0 && (
          <div className="flex items-center gap-2 my-2 select-none" aria-label="all out of context">
            <div className="flex-1 border-t border-dashed border-[var(--border-primary)]" />
            <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">
              {compactedTurns > 0 ? "↑ Compacted: none in agent's context" : "↑ None of the above is in the agent's context"}
            </span>
            <div className="flex-1 border-t border-dashed border-[var(--border-primary)]" />
          </div>
        )}

        {isBusy && (
          <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-muted)] py-1">
            <span className="inline-block w-1 h-1 rounded-full bg-[var(--text-muted)] animate-pulse" />
            <span className="inline-block w-1 h-1 rounded-full bg-[var(--text-muted)] animate-pulse" style={{ animationDelay: '150ms' }} />
            <span className="inline-block w-1 h-1 rounded-full bg-[var(--text-muted)] animate-pulse" style={{ animationDelay: '300ms' }} />
            <span className="ml-1">
              {isThisWidgetThinking
                ? 'Thinking…'
                : 'Main chat is in progress, widget chat is paused'}
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 px-3 pb-3 pt-2">
        <div className="flex flex-1 items-center gap-2 py-2 px-3 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-[8px] overflow-hidden focus-within:border-[var(--accent)] hover:border-[var(--accent)]/60 transition-colors">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Refine this widget…"
            rows={1}
            disabled={isBusy}
            className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-[var(--text-primary)]
              max-h-[120px] placeholder:text-[var(--text-muted)] disabled:opacity-60"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!text.trim() || isBusy}
            aria-label="Send message"
            style={{ width: 32, height: 32, flexShrink: 0 }}
            className="rounded-full flex items-center justify-center p-0
              border-none cursor-pointer transition-colors
              bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]
              disabled:bg-[var(--bg-hover)] disabled:text-[var(--text-muted)] disabled:cursor-not-allowed"
          >
            <ArrowUp size={16} strokeWidth={2.5} />
          </button>
        </div>
        {totalTurns > 0 && !isBusy && (
          <div className="text-[10px] text-[var(--text-muted)] mt-1.5 px-2 leading-snug">
            Sending {inWindowTurnCount} prior {inWindowTurnCount === 1 ? 'message' : 'messages'} as context
            {totalTurns > inWindowTurnCount && (
              <span>
                {' · '}
                {totalTurns - inWindowTurnCount} older {totalTurns - inWindowTurnCount === 1 ? 'message' : 'messages'} not included
                {compactedTurns > 0 && (
                  <span> ({compactedTurns} compacted away)</span>
                )}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Single chat message renderer for the widget panel. Reads from the
 * useSession.messages shape (id, type, text, status, tool, ...).
 *
 * Renders user / assistant / tool_call. Skips:
 *   - todo_write tool_call (rendered in the global Progress widget — no
 *     point repeating in widget panel)
 *   - other unhandled types (silently dropped)
 *
 * Markdown rendering for assistant text via MarkdownRenderer (matches the
 * main chat — Phase-feedback fix #2).
 */
function WidgetChatMessage({ entry }) {
  const type = entry.type
  const text = entry.text || ''

  if (type === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[88%] bg-[var(--accent)]/15 text-[var(--text-primary)] text-[12px] rounded-2xl rounded-br-md px-3 py-2 whitespace-pre-wrap break-words">
          {text}
        </div>
      </div>
    )
  }

  if (type === 'assistant') {
    return (
      <div className="flex justify-start">
        <div className="max-w-[88%] text-[12px] text-[var(--text-primary)] leading-relaxed">
          <MarkdownRenderer content={text} />
        </div>
      </div>
    )
  }

  if (type === 'tool_call') {
    // Phase-feedback fix #3: hide todo_write — it's rendered in the global
    // Progress widget; surfacing it in the widget chat is noise.
    if (entry.tool === 'todo_write') return null
    const status = entry.status
    const resultLength = entry.resultLength
    if (status === 'running') {
      return (
        <div className="text-[10px] text-[var(--text-muted)] font-mono pl-2 border-l-2 border-[var(--accent)] animate-pulse">
          → {entry.tool}…
        </div>
      )
    }
    return (
      <div className="text-[10px] text-[var(--text-muted)] font-mono pl-2 border-l-2 border-[var(--border-primary)]">
        ✓ {entry.tool}
        {resultLength != null && resultLength > 0 ? ` (${resultLength} chars)` : ''}
      </div>
    )
  }

  // Outputs / advisor / system / unknown — silently drop in widget panel.
  return null
}
