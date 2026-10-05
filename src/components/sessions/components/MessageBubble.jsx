import { useState } from 'react'
import { File, ChevronRight, ChevronDown, GitBranch, LayoutDashboard, Sparkles, ArrowRight } from 'lucide-react'
import MarkdownRenderer from '../../../utils/MarkdownRenderer'
import Timestamp from './Timestamp'

/**
 * Bridge pill rendered next to user/assistant messages that have a
 * widget_scope tag (i.e., the message belongs to a widget-scoped turn).
 * Click → opens the widget JSX in the artifact panel + auto-opens the
 * lineage drawer so the user lands directly in the widget chat.
 *
 * Pill design: matches the existing "Context" pill on user bubbles for
 * visual consistency — same translucent-white-on-blue styling, same
 * scale. Uses LayoutDashboard icon (widget-themed) instead of generic
 * link.
 */
function WidgetBridgePill({ widgetScope, onOpen }) {
  if (!widgetScope) return null
  const widgetName = widgetScope.split('/').pop().replace('.jsx', '')
  // Outer wrapper `mt-2` matches ContextChip exactly — both pills sit at
  // identical vertical offset below the user text.
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onOpen?.(widgetScope, widgetName) }}
        title={`Open widget chat for ${widgetName}`}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px]
          bg-white/15 text-white/70 hover:text-white/90 hover:bg-white/20
          transition-colors border-none cursor-pointer"
      >
        <LayoutDashboard size={10} />
        {widgetName}
      </button>
    </div>
  )
}

const CONTEXT_RE = /\n?\[CONTEXT:\s*(.*?)\]/gs

function ContextChip({ context }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px]
          bg-white/15 text-white/70 hover:text-white/90 hover:bg-white/20
          transition-colors border-none cursor-pointer"
      >
        <GitBranch size={10} />
        Context
        {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
      </button>
      {expanded && (
        <div className="mt-1 px-2 py-1.5 rounded-md bg-white/10 text-[10px] text-white/90 font-mono whitespace-pre-wrap break-words">
          {context}
        </div>
      )}
    </div>
  )
}

function UserText({ text, widgetScope, onOpenWidgetChat }) {
  const parts = []
  let lastIndex = 0
  const contextBlocks = []

  const regex = new RegExp(CONTEXT_RE.source, CONTEXT_RE.flags)
  let match
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    contextBlocks.push(match[1].trim())
    lastIndex = match.index + match[0].length
  }

  if (contextBlocks.length === 0 && !widgetScope) {
    return <div className="s-msg-user__text">{text}</div>
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  const displayText = (parts.length > 0 ? parts.join('').trim() : text)

  return (
    <div className="s-msg-user__text">
      {displayText && <div className="whitespace-pre-wrap break-words">{displayText}</div>}
      {contextBlocks.map((ctx, i) => (
        <ContextChip key={i} context={ctx} />
      ))}
      {/* Widget bridge pill rendered in the same DOM position as
          ContextChip so both pills share identical inherited padding /
          spacing on the user bubble. */}
      <WidgetBridgePill widgetScope={widgetScope} onOpen={onOpenWidgetChat} />
    </div>
  )
}

export default function MessageBubble({
  type, text, isError, attachments, timestamp,
  messagesWrapperRef, widgetScope, onOpenWidgetChat,
  // Banner card props for post-handoff skill sessions
  skillName, outputType, outputPath, onOpenArtifact, isStreaming,
}) {
  // Post-handoff banner replaces pre-handoff history. Rendered at the top
  // of the chat panel for OPEN_CHAT sessions that came from a skill run.
  if (type === 'skill_handoff_banner') {
    const tag = outputType === 'memo' ? 'memo ready' : 'dashboard ready'
    const invitation = outputType === 'memo'
      ? 'Ask me to walk through any finding, expand a section, pull underlying numbers, or revise the wording.'
      : 'Ask me to walk through any number, explain how a widget was built, edit a chart, or add a new analysis.'
    // Infer contentType for the artifact panel from output_type + extension.
    // Falls back to mime guess on the path extension.
    const contentType =
      outputType === 'memo' || outputPath?.toLowerCase().endsWith('.md')
        ? 'markdown'
        : outputType === 'dashboard' || outputPath?.toLowerCase().endsWith('.html')
          ? 'html'
          : 'unknown'
    const handleViewClick = (e) => {
      e.preventDefault()
      if (onOpenArtifact && outputPath) {
        onOpenArtifact({
          path: outputPath,
          title: skillName || outputPath,
          contentType,
          source: 'output',
        })
      }
    }
    const ctaLabel = outputType === 'memo' ? 'Open memo' : 'Open dashboard'
    return (
      <div className="s-handoff-banner border border-[var(--accent)]/30 rounded-xl p-4 my-4 bg-[var(--accent)]/5">
        <div className="flex items-start gap-3">
          {/* Accent-tinted circle marks this as an "event" in the chat
              stream rather than a paragraph of text. */}
          <div className="shrink-0 w-9 h-9 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center">
            <Sparkles size={16} strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="font-semibold text-[var(--text-primary)] text-[14px]">
                {skillName || 'Skill run'}
              </span>
              {/* Green "Ready" pill — semantic success signal, distinct
                  from the surrounding accent wash so it pops as the
                  completion marker. */}
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-[var(--color-green-bg)] text-[var(--color-green)] border border-[var(--color-green)]/30">
                Ready
              </span>
            </div>
            <div className="text-[14px] text-[var(--text-secondary)] leading-relaxed mb-3">
              {invitation}
            </div>
            {outputPath && (
              <button
                type="button"
                onClick={handleViewClick}
                className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold bg-[var(--accent)] text-white hover:brightness-110 transition-all cursor-pointer border-none"
              >
                {ctaLabel}
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (type === 'system') {
    const isPreparing = text?.includes('Preparing workspace')
    const isStatusMessage = text?.includes('stopped') || text?.includes('Error') || text?.includes('Failed')
    const className = isStatusMessage ? 's-msg-system s-msg-system--status' : `s-msg-system${isPreparing ? ' s-msg-system--preparing' : ''}`
    return (
      <div className={className}>
        {isPreparing && (
          <span className="s-msg-system__dots">
            <span className="s-msg-system__dot" />
            <span className="s-msg-system__dot" />
            <span className="s-msg-system__dot" />
          </span>
        )}
        {text}
      </div>
    )
  }

  if (type === 'user') {
    const hasAttachments = attachments && attachments.length > 0
    return (
      <div className="s-msg-user-wrapper">
        <div className="s-msg-user">
          {text && <UserText text={text} widgetScope={widgetScope} onOpenWidgetChat={onOpenWidgetChat} />}
          {hasAttachments && (
            <div className={`s-msg-user__attachments${text ? ' s-msg-user__attachments--with-text' : ''}`}>
              {attachments.map((name, i) => (
                <span key={i} className="s-msg-attachment">
                  <File size={11} />
                  <span className="truncate max-w-[120px]">{name}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        <Timestamp timestamp={timestamp} align="right" messagesWrapperRef={messagesWrapperRef} />

      </div>
    )
  }

  return (
    <div className="s-msg-assistant group/msg mt-2">
      {/* While the reply is still being written, the "Thinking…" line below
          carries the logo. The space is kept so the text does not shift when
          the reply finishes and the logo moves up here. */}
      <div className="flex h-6 w-6">
        {!isStreaming && <img src="/petavue-logo.svg" alt="" className="h-5 w-5 my-auto" />}
      </div>
      <div className="s-msg-assistant__content">
        <MarkdownRenderer content={text || ''} className={isError ? 's-msg-assistant--error' : ''} />
      </div>
    </div>
  )
}
