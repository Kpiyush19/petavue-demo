import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowLeft, ArrowsClockwise, ShieldCheck, CaretRight, CaretLeft, ArrowLineRight, ArrowLineLeft } from '@phosphor-icons/react'
import { Button as PvButton } from '@/ui'
import { apiGet, apiPost } from '../../../api'
import HtmlViewer from '../viewers/HtmlViewer'
import LineagePanel from './LineagePanel'
import WidgetChatPanel from './WidgetChatPanel'
import { useVerifiedSteps, verifySteps } from './stepVerification'

const COL_MIN_PCT = 15

function computeWidths(chatMin, lineageMin, widgetPct, chatPct, lineagePct) {
  if (chatMin && lineageMin) return { widget: 'calc(100% - 64px)', chat: '32px', lineage: '32px' }
  if (chatMin) {
    const vis = widgetPct + lineagePct
    return { widget: `calc((100% - 32px) * ${widgetPct / vis})`, chat: '32px', lineage: `calc((100% - 32px) * ${lineagePct / vis})` }
  }
  if (lineageMin) {
    const vis = widgetPct + chatPct
    return { widget: `calc((100% - 32px) * ${widgetPct / vis})`, chat: `calc((100% - 32px) * ${chatPct / vis})`, lineage: '32px' }
  }
  return { widget: `${widgetPct}%`, chat: `${chatPct}%`, lineage: `${lineagePct}%` }
}

function MinimizedStrip({ label, onExpand }) {
  return (
    <button
      type="button"
      onClick={onExpand}
      title={`Expand ${label}`}
      className="h-full w-full flex flex-col items-center justify-between py-3 bg-[var(--bg-secondary)] border-l border-[var(--border-primary)] border-t-0 border-b-0 border-r-0 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
    >
      <ArrowLineLeft size={14} className="text-[var(--text-secondary)]" />
      <span
        className="text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap"
        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
      >
        {label}
      </span>
      <span aria-hidden="true" />
    </button>
  )
}

function ColumnHeader({ title, extra, onMinimize, minimizeTitle }) {
  return (
    <div className="shrink-0 flex items-center gap-2 h-10 px-3 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
      <span className="text-[12px] font-normal text-[var(--text-primary)] flex-1 truncate">
        {title}
      </span>
      {extra}
      {onMinimize && (
        <button
          type="button"
          onClick={onMinimize}
          title={minimizeTitle}
          className="p-1 rounded hover:bg-[var(--bg-hover)] cursor-pointer border-none bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <ArrowLineRight size={13} />
        </button>
      )}
    </div>
  )
}

export default function WidgetDetailView({
  widget,
  widgets = [],
  sessionId,
  sessionStatus,
  liveMessages = [],
  onSendFeedback,
  onBack,
  onNavigate,
  onVerified,
  onBackToSession,
  onContinueToPublish,
  footerStart,
}) {
  const [lineage, setLineage] = useState(null)
  const [lineageLoading, setLineageLoading] = useState(true)
  const [lineageError, setLineageError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [widgetPct, setWidgetPct] = useState(34)
  const [lineagePct, setLineagePct] = useState(33)
  const [chatPct, setChatPct] = useState(33)
  const [lineageMin, setLineageMin] = useState(false)
  const [chatMin, setChatMin] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [verified, setVerified] = useState(widget?.verified || false)
  const containerRef = useRef(null)
  const aliveRef = useRef(true)
  const prevStatusRef = useRef(sessionStatus)

  useEffect(() => {
    aliveRef.current = true
    return () => { aliveRef.current = false }
  }, [])

  const rawFile = widget?.file || ''
  const widgetPath = rawFile.startsWith('output/') ? rawFile : `output/dashboard/${rawFile}`
  const editsCount = lineage?.main_chat_edits_count || 0

  const fetchLineage = () => {
    if (!sessionId || !widgetPath) return
    setLineageError(null)
    apiGet(`/api/sessions/${sessionId}/widget-lineage?path=${encodeURIComponent(widgetPath)}`)
      .then((data) => {
        if (!aliveRef.current) return
        setLineage(data)
        setLineageLoading(false)
      })
      .catch((err) => {
        if (!aliveRef.current) return
        setLineageError(err.message || 'Failed to load lineage')
        setLineageLoading(false)
      })
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setLineageLoading(true)
    setLineage(null)
    fetchLineage()
  }, [sessionId, widgetPath])

  useEffect(() => {
    if (prevStatusRef.current === 'thinking' && sessionStatus !== 'thinking') {
      fetchLineage()
      setRefreshKey((k) => k + 1)
    }
    prevStatusRef.current = sessionStatus
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus])

  const handleLoadComplete = useCallback(() => {}, [])

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1)
    fetchLineage()
  }

  // Keep the verified state in sync when navigating between widgets.
  useEffect(() => { setVerified(!!widget?.verified) }, [widget?.id])

  const setVerifiedValue = async (val) => {
    if (val === verified) return
    setVerified(val)
    try {
      await apiPost(`/api/sessions/${sessionId}/widgets/${widget.id}/verify`, { verified: val })
      onVerified?.(widget.id, val)
    } catch {
      setVerified(!val)
    }
  }
  const handleToggleVerified = () => setVerifiedValue(!verified)

  // ── Step-derived verification ──
  // Rule 1: verifying a step marks it verified everywhere (shared store).
  // Rule 2: a widget is verified once ALL of its steps are verified.
  const verifiedSet = useVerifiedSteps()
  const chain = lineage?.chain || []
  const stepIsVerified = (s) => verifiedSet.has(s.id) || !!s.verified_via || !!s.verified
  const verifiedStepCount = chain.filter(stepIsVerified).length
  const allStepsVerified = chain.length > 0 && verifiedStepCount === chain.length
  const isWidgetVerified = chain.length > 0 ? allStepsVerified : verified

  useEffect(() => {
    if (allStepsVerified && !verified) setVerifiedValue(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allStepsVerified])

  // Widget navigation (prev / next) + "verify & advance".
  const idx = widgets.findIndex((w) => w.id === widget?.id)
  const total = widgets.length
  const prevW = idx > 0 ? widgets[idx - 1] : null
  const nextW = idx >= 0 && idx < total - 1 ? widgets[idx + 1] : null
  const verifyAndAdvance = async () => {
    // Verifying the widget verifies all its steps (which, being shared, also
    // count toward any other widget that uses them).
    if (chain.length) verifySteps(chain.map((s) => s.id))
    await setVerifiedValue(true)
    if (nextW) onNavigate?.(nextW)
    else onBack?.()
  }

  const startDrag = (which) => (e) => {
    e.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const startX = e.clientX
    const sW = widgetPct, sL = lineagePct, sC = chatPct
    setIsDragging(true)
    const onMove = (ev) => {
      const dxPct = ((ev.clientX - startX) / rect.width) * 100
      if (which === 'widget-chat') {
        let nW = sW + dxPct, nC = sC - dxPct
        if (nW < COL_MIN_PCT) { nW = COL_MIN_PCT; nC = sW + sC - COL_MIN_PCT }
        if (nC < COL_MIN_PCT) { nC = COL_MIN_PCT; nW = sW + sC - COL_MIN_PCT }
        setWidgetPct(nW); setChatPct(nC)
      } else {
        let nC = sC + dxPct, nL = sL - dxPct
        if (nC < COL_MIN_PCT) { nC = COL_MIN_PCT; nL = sC + sL - COL_MIN_PCT }
        if (nL < COL_MIN_PCT) { nL = COL_MIN_PCT; nC = sC + sL - COL_MIN_PCT }
        setChatPct(nC); setLineagePct(nL)
      }
    }
    const onUp = () => {
      setIsDragging(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const widths = computeWidths(chatMin, lineageMin, widgetPct, chatPct, lineagePct)
  const colTransition = isDragging ? 'none' : 'width 150ms ease'

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-2 border-b border-[var(--border-primary)]">
        {/* left: back */}
        <div className="flex-1 flex justify-start min-w-0">
          <PvButton variant="blueGhost" size="md" label="Back to widgets" icon={CaretLeft} iconWeight="bold" onClick={onBack} />
        </div>
        {/* center: position */}
        {total > 0 && (
          <span className="text-[12px] font-medium text-[var(--text-muted)] tabular-nums shrink-0">Widget {idx + 1} of {total}</span>
        )}
        {/* right: ‹ title › pager */}
        <div className="flex-1 flex justify-end items-center gap-2 min-w-0">
          <button
            onClick={() => prevW && onNavigate?.(prevW)}
            disabled={!prevW}
            title="Previous widget"
            className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-muted)] cursor-pointer hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CaretLeft size={13} weight="bold" />
          </button>
          <h3 className="text-[14px] font-semibold text-[var(--text-primary)] m-0 truncate max-w-[240px]">
            {widget?.name}
          </h3>
          <button
            onClick={() => nextW && onNavigate?.(nextW)}
            disabled={!nextW}
            title="Next widget"
            className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-muted)] cursor-pointer hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CaretRight size={13} weight="bold" />
          </button>
        </div>
      </div>

      {/* Three-column layout: Widget | Chat | How it's built */}
      <div ref={containerRef} className="flex-1 min-h-0 flex relative">
        {isDragging && <div className="absolute inset-0 z-20 cursor-col-resize" />}

        {/* Widget preview */}
        <div
          className="h-full min-h-0 flex flex-col border-r border-[var(--border-primary)]"
          style={{ width: widths.widget, transition: colTransition }}
        >
          <div className="shrink-0 flex items-center justify-between h-10 px-3 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
            <span className="text-[12px] font-normal text-[var(--text-primary)] truncate">{widget?.name}</span>
            <PvButton variant="ghost" size="sm" label="Refresh" icon={ArrowsClockwise} iconWeight="bold" onClick={handleRefresh} title="Refresh widget preview" />
          </div>
          <div className="flex-1 min-h-0">
            <HtmlViewer
              key={refreshKey}
              sessionId={sessionId}
              path={widgetPath}
              onLoadComplete={handleLoadComplete}
            />
          </div>
        </div>

        {/* Drag handle: widget | chat */}
        {!chatMin && (
          <div
            onMouseDown={startDrag('widget-chat')}
            title="Drag to resize"
            className={`shrink-0 w-1 cursor-col-resize z-10 transition-colors ${
              isDragging ? 'bg-[var(--accent)]' : 'bg-transparent hover:bg-[var(--accent)]/40'
            }`}
            style={{ marginLeft: '-2px', marginRight: '-2px' }}
          />
        )}

        {/* Chat */}
        <div
          className="h-full min-h-0 flex flex-col border-r border-[var(--border-primary)]"
          style={{ width: widths.chat, transition: colTransition }}
        >
          {chatMin ? (
            <MinimizedStrip label="Chat" onExpand={() => setChatMin(false)} />
          ) : (
            <>
              <ColumnHeader
                title="Chat"
                onMinimize={() => setChatMin(true)}
                minimizeTitle="Minimize chat"
              />
              <div className="flex-1 min-h-0 flex flex-col">
                <WidgetChatPanel
                  widgetPath={widgetPath}
                  sessionId={sessionId}
                  onSubmit={(text, path) => onSendFeedback?.(text, path)}
                  sessionStatus={sessionStatus}
                  mainChatEditsCount={editsCount}
                  liveMessages={liveMessages}
                />
              </div>
            </>
          )}
        </div>

        {/* Drag handle: chat | lineage */}
        {!chatMin && !lineageMin && (
          <div
            onMouseDown={startDrag('chat-lineage')}
            title="Drag to resize"
            className={`shrink-0 w-1 cursor-col-resize z-10 transition-colors ${
              isDragging ? 'bg-[var(--accent)]' : 'bg-transparent hover:bg-[var(--accent)]/40'
            }`}
            style={{ marginLeft: '-2px', marginRight: '-2px' }}
          />
        )}

        {/* How it's built (lineage) */}
        <div
          className="h-full min-h-0 flex flex-col"
          style={{ width: widths.lineage, transition: colTransition }}
        >
          {lineageMin ? (
            <MinimizedStrip label="How it's built" onExpand={() => setLineageMin(false)} />
          ) : (
            <>
              <ColumnHeader
                title="How it's built"
                extra={chain.length > 0 && (
                  <span className={`text-[12px] font-medium ${allStepsVerified ? 'text-green-600' : 'text-[var(--text-muted)]'}`}>
                    {verifiedStepCount} of {chain.length} verified
                  </span>
                )}
                onMinimize={() => setLineageMin(true)}
                minimizeTitle="Minimize lineage"
              />
              <div className="flex-1 min-h-0 flex flex-col">
                <LineagePanel lineage={lineage} loading={lineageLoading} error={lineageError} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 flex items-center justify-between gap-4 px-4 py-3.5 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        {footerStart || <span />}
        <div className="flex items-center gap-3 shrink-0">
          {isWidgetVerified ? (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-green-600">
              <ShieldCheck size={15} weight="fill" />Verified
            </span>
          ) : (
            <span className="text-[12px] text-[var(--text-muted)] tabular-nums">
              {chain.length ? `${verifiedStepCount} of ${chain.length} steps verified` : 'Not verified yet'}
            </span>
          )}
          <PvButton variant="primary" size="md" label={nextW ? (isWidgetVerified ? 'Next' : 'Verify all & next') : (isWidgetVerified ? 'Back to list' : 'Verify all & finish')} icon={CaretRight} iconPosition="suffix" iconWeight="bold" onClick={verifyAndAdvance} />
        </div>
      </div>
    </div>
  )
}
