import { useState, useCallback, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiPost, apiGet, apiDelete, apiUpload, getCurrentUser } from '../api'
import useTodoStore from '../components/todo-progress/useTodoStore'

// Per-session follow-up muting. Persisted in localStorage so it survives page
// refresh and sign-out. Intentionally one-way — there is no in-app un-mute
// (the user must contact support), so we only ever write the muted flag.
const followupsMuteKey = (sid) => `followups-muted:${sid}`
const isFollowupsMuted = (sid) => !!sid && localStorage.getItem(followupsMuteKey(sid)) === '1'

let msgIdCounter = 0
function nextId() {
  return `msg-${++msgIdCounter}`
}

export function useSession() {
  const queryClient = useQueryClient()
  const [sessionId, setSessionId] = useState(null)
  const [dashboardId, setDashboardId] = useState(null)
  const [sessionType, setSessionType] = useState('regular')
  const [provider, setProvider] = useState(null)
  const [isResumed, setIsResumed] = useState(false)
  const [status, setStatus] = useState('idle')
  const [totalTokens, setTotalTokens] = useState(0)
  const [contextThreshold, setContextThreshold] = useState(0)
  const [contextUsagePercent, setContextUsagePercent] = useState(0)
  const [isCompacting, setIsCompacting] = useState(false)
  const [turnCount, setTurnCount] = useState(0)
  const [messages, setMessages] = useState([
    { id: 'init', type: 'system', text: 'Create a session to start chatting with the analytics agent.' },
  ])
  const [eventLog, setEventLog] = useState([])
  const [sessionName, setSessionName] = useState('')
  // Grounded follow-up chips for the LATEST turn only. Set by the
  // `suggested-questions` Pusher event (fired just before `done`), cleared when
  // a new turn starts, hydrated from the API on resume.
  const [suggestedQuestions, setSuggestedQuestions] = useState([])
  // True while we're waiting for the latest turn's follow-up chips (shows the
  // "Related" loading skeleton). Cleared when the suggested-questions event /
  // recommendations fetch resolves.
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  // Mirror of the persisted per-session mute flag, re-read whenever the session
  // changes so the chip panel knows to stay hidden.
  const [followupsMuted, setFollowupsMuted] = useState(false)

  const pusherDeliveredRef = useRef(false)
  const textTruncatedRef = useRef(false)
  const sessionIdRef = useRef(null)
  const [workspaceReadyCounter, setWorkspaceReadyCounter] = useState(0)

  const addMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, { id: nextId(), ...msg }])
  }, [])

  sessionIdRef.current = sessionId

  // Re-read the persisted mute flag whenever we land on a different session.
  useEffect(() => { setFollowupsMuted(isFollowupsMuted(sessionId)) }, [sessionId])

  // Mute follow-ups for the current session: persist, hide any current chips,
  // and confirm. There is no un-mute by design.
  const muteFollowups = useCallback(() => {
    const sid = sessionIdRef.current
    if (sid) localStorage.setItem(followupsMuteKey(sid), '1')
    setFollowupsMuted(true)
    setSuggestedQuestions([])
    setSuggestionsLoading(false)
    toast('Follow-up questions muted for this session')
  }, [])

  // Re-enable follow-ups for the current session and re-hydrate the chips so
  // they come back immediately rather than only on the next turn.
  const unmuteFollowups = useCallback(() => {
    const sid = sessionIdRef.current
    if (sid) localStorage.removeItem(followupsMuteKey(sid))
    setFollowupsMuted(false)
    if (sid) {
      setSuggestionsLoading(true)
      apiGet(`/api/sessions/${sid}/recommendations`)
        .then((d) => { if (!isFollowupsMuted(sid)) setSuggestedQuestions(d?.questions || []) })
        .catch(() => {})
        .finally(() => setSuggestionsLoading(false))
    }
    toast('Follow-up questions re-enabled')
  }, [])

  const addSystemMsg = useCallback((text) => {
    addMessage({ type: 'system', text })
  }, [addMessage])

  const logEvent = useCallback((event) => {
    const ts = new Date().toLocaleTimeString()
    let summary = event.type
    if (event.type === 'text') summary += `: ${(event.content || '').slice(0, 80)}`
    if (event.type === 'tool_call') summary += `: ${event.tool}`
    if (event.type === 'tool_result') summary += `: ${event.tool} (${event.result_length} chars)`
    if (event.type === 'error') summary += `: ${event.error}`
    setEventLog((prev) => [...prev, { timestamp: ts, type: event.type, summary }])
  }, [])

  const handlePusherEvent = useCallback((event) => {
    logEvent(event)

    if (event.type === 'text') {
      pusherDeliveredRef.current = true
      if (event.truncated) textTruncatedRef.current = true
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (last && last.type === 'assistant' && last.isStreaming) {
          const updated = [...prev]
          updated[updated.length - 1] = {
            ...last,
            text: last.text + (event.content || ''),
            // Keep the widget_scope sticky on streaming messages (the
            // first event might lack it for some reason; later events
            // shouldn't downgrade it to undefined).
            ...(event.widget_scope ? { widgetScope: event.widget_scope } : {}),
          }
          return updated
        }
        const newMsg = { id: nextId(), type: 'assistant', text: event.content || '', isStreaming: true, timestamp: Date.now() }
        if (event.widget_scope) newMsg.widgetScope = event.widget_scope
        return [...prev, newMsg]
      })
    } else if (event.type === 'tool_call') {
      if (event.tool === 'todo_write') return
      const toolCallMsg = {
        type: 'tool_call',
        tool: event.tool,
        input: event.input,
        status: 'running',
        resultLength: null,
      }
      if (event.widget_scope) toolCallMsg.widgetScope = event.widget_scope
      addMessage(toolCallMsg)
    } else if (event.type === 'tool_result') {
      if (event.tool === 'todo_write') return
      setMessages((prev) => {
        const updated = [...prev]
        for (let i = updated.length - 1; i >= 0; i--) {
          if (updated[i].type === 'tool_call' && updated[i].tool === event.tool && updated[i].status === 'running') {
            const patch = { ...updated[i], status: 'done', resultLength: event.result_length }
            if (event.diff) patch.diff = event.diff
            updated[i] = patch
            break
          }
        }
        return updated
      })
    } else if (event.type === 'todo_update') {
      useTodoStore.getState().setTodos(event.todos || [], event.updated_at)
    } else if (event.type === 'advisor_call') {
      addMessage({
        type: 'advisor_call',
        waiting: true,
      })
    } else if (event.type === 'advisor_result') {
      setMessages((prev) => {
        const updated = [...prev]
        for (let i = updated.length - 1; i >= 0; i--) {
          if (updated[i].type === 'advisor_call' && updated[i].waiting) {
            updated[i] = {
              ...updated[i],
              text: event.text || '',
              encrypted: event.encrypted || false,
              waiting: false,
            }
            return updated
          }
        }
        return [...prev, { id: nextId(), type: 'advisor_result', text: event.text || '', encrypted: event.encrypted || false }]
      })
    } else if (event.type === 'advisor_error') {
      logEvent({ type: 'advisor_error', error_code: event.error_code })
    } else if (event.type === 'suggested-questions') {
      if (isFollowupsMuted(sessionIdRef.current)) { setSuggestionsLoading(false); return }
      setSuggestedQuestions(event.questions || [])
      setSuggestionsLoading(false)
    } else if (event.type === 'done') {
      setStatus('active')
      // Turn finished — expect follow-up chips next; show the skeleton until
      // they arrive (safety-cleared after a few seconds if none come). Skipped
      // entirely when the user has muted follow-ups for this session.
      if (!isFollowupsMuted(sessionIdRef.current)) {
        setSuggestionsLoading(true)
        setTimeout(() => setSuggestionsLoading(false), 5000)
      }
      if (event.context_tokens != null) setTotalTokens(event.context_tokens)
      else if (event.total_tokens != null) setTotalTokens(event.total_tokens)
      if (event.turn_count != null) setTurnCount(event.turn_count)
      setMessages((prev) => {
        let updated = prev.map((m) =>
          m.type === 'assistant' && m.isStreaming ? { ...m, isStreaming: false } : m
        )
        if (event.outputs && event.outputs.length > 0) {
          updated = [...updated, { id: nextId(), type: 'outputs', outputs: event.outputs }]
        }
        return updated
      })

      if (event.truncated || textTruncatedRef.current) {
        textTruncatedRef.current = false
        const sid = sessionIdRef.current
        if (!sid) return
        apiGet(`/api/sessions/${sid}/history`).then((histData) => {
          const histMsgs = histData.messages || []
          let fullText = null
          for (let i = histMsgs.length - 1; i >= 0; i--) {
            const m = histMsgs[i]
            if ((m.type === 'assistant' || m.role === 'assistant') && m.text) {
              fullText = m.text
              break
            }
          }
          if (fullText) {
            setMessages((prev) => {
              const updated = [...prev]
              for (let i = updated.length - 1; i >= 0; i--) {
                if (updated[i].type === 'assistant') {
                  updated[i] = { ...updated[i], text: fullText }
                  break
                }
              }
              return updated
            })
          }
        }).catch((err) => {
          console.warn('[Session] Failed to fetch full text after truncation:', err)
        })
      }
    } else if (event.type === 'stopped') {
      setStatus('active')
      setMessages((prev) =>
        prev.map((m) => m.type === 'assistant' && m.isStreaming ? { ...m, isStreaming: false } : m)
      )
      addMessage({ type: 'system', text: 'Agent stopped by user.' })
    } else if (event.type === 'error') {
      setStatus('active')
      addMessage({ type: 'assistant', text: `Error: ${event.error}`, isError: true })
    } else if (event.type === 'context_update') {
      setTotalTokens(event.context_tokens || 0)
      setContextThreshold(event.threshold || 0)
      setContextUsagePercent(event.usage_percent || 0)
    } else if (event.type === 'compaction_start') {
      setIsCompacting(true)
    } else if (event.type === 'compaction_end') {
      setIsCompacting(false)
      if (event.context_tokens != null) setTotalTokens(event.context_tokens)
      if (event.usage_percent != null) setContextUsagePercent(event.usage_percent)
      if (event.success) {
        addMessage({
          type: 'compaction_marker',
          messagesCompacted: 0,
          summaryPreview: '',
          emergency: event.emergency || false,
        })
      }
    } else if (event.type === 'workspace_ready') {
      setWorkspaceReadyCounter((c) => c + 1)
      const steps = event.steps || {}
      const parts = []
      for (const [step, info] of Object.entries(steps)) {
        if (info.status === 'done') parts.push(`${step}: ${info.details || 'done'}`)
        else if (info.status === 'error') parts.push(`${step}: error`)
      }
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.type === 'system' && m.text?.includes('Preparing workspace'))
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = { ...updated[idx], text: parts.length ? 'Workspace: ' + parts.join(' | ') : 'Workspace ready.' }
          return updated
        }
        if (parts.length) return [...prev, { id: nextId(), type: 'system', text: 'Workspace: ' + parts.join(' | ') }]
        return prev
      })
    } else if (event.type === 'workspace_error') {
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.type === 'system' && m.text?.includes('Preparing workspace'))
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = { ...updated[idx], text: `Workspace preparation failed: ${event.error}` }
          return updated
        }
        return [...prev, { id: nextId(), type: 'system', text: `Workspace preparation failed: ${event.error}` }]
      })
    }
  }, [logEvent, addMessage])

  const createSession = useCallback(async (dashboardId, dashboardMode, skillTemplateId) => {
    try {
      const body = { dashboard_id: dashboardId }
      const effectiveMode = dashboardMode || 'react'
      if (effectiveMode) body.dashboard_mode = effectiveMode
      if (skillTemplateId) body.skill_template_id = skillTemplateId
      const data = await apiPost('/api/sessions', body)
      const sid = data.session.session_id
      setSessionId(sid)
      setDashboardId(data.session.dashboard_id || dashboardId)
      setSessionType(data.session.session_type || 'regular')
      setProvider(data.session.provider || null)
      setIsResumed(false)
      setStatus('active')
      setTotalTokens(0)
      setTurnCount(0)
      setSuggestedQuestions([])

      useTodoStore.getState().reset()

      const modeText = dashboardId ? `Dashboard: ${dashboardId}` : 'Mode: Data Exploration'
      const newMessages = [{ id: nextId(), type: 'system', text: `Session created. ${modeText}` }]

      if (dashboardId) {
        newMessages.push({ id: nextId(), type: 'system', text: 'Preparing workspace...' })
      }

      setMessages(newMessages)
      setEventLog([])
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      return sid
    } catch (e) {
      throw e
    }
  }, [queryClient])

  const resumeSession = useCallback(async (sid) => {
    setStatus('idle')
    setMessages([])
    setEventLog([])
    setContextThreshold(0)
    setContextUsagePercent(0)
    setIsCompacting(false)
    setWorkspaceReadyCounter(0)
    setSuggestedQuestions([])
    pusherDeliveredRef.current = false
    textTruncatedRef.current = false
    useTodoStore.getState().reset()

    const session = await apiGet(`/api/sessions/${sid}`)
    setSessionId(session.session_id)
    setDashboardId(session.dashboard_id || null)
    setSessionType(session.session_type || 'regular')
    setProvider(session.provider || null)
    setIsResumed(true)
    setTotalTokens(session.context_tokens || session.total_tokens || 0)
    setTurnCount(session.turn_count || 0)
    setSessionName(session.name || '')
    const targetStatus = session.agent_running ? 'thinking' : 'active'
    useTodoStore.getState().hydrateFromSession(
      session.session_id,
      session.todos || [],
      session.todos_updated_at || 0,
    )

    const newMessages = []

    try {
      const histData = await apiGet(`/api/sessions/${sid}/history`)
      for (const msg of histData.messages) {
        const msgType = msg.type || msg.role
        switch (msgType) {
          case 'system':
            // A skill_handoff_banner entry marks the OPEN_CHAT boundary.
            // Wipe every pre-handoff message from the display and replace
            // with the banner card. The LLM agent loop still has the full
            // history server-side — this is purely a render-side filter
            // for the chat panel.
            if (msg.subtype === 'skill_handoff_banner') {
              newMessages.length = 0
              newMessages.push({
                id: nextId(),
                type: 'skill_handoff_banner',
                skillId: msg.skill_id || '',
                skillName: msg.skill_name || '',
                outputType: msg.output_type || '',
                outputPath: msg.output_path || '',
                previousPhase: msg.previous_phase || '',
                primerPath: msg.primer_path || '',
                timestamp: msg.timestamp || 0,
              })
              break
            }
            newMessages.push({ id: nextId(), type: 'system', text: msg.text })
            break
          case 'user': {
            const userMsg = { id: nextId(), type: 'user', text: msg.text, timestamp: msg.timestamp || 0 }
            if (msg.attachments && msg.attachments.length > 0) {
              userMsg.attachments = msg.attachments.map((a) => {
                const match = a.match(/\[Uploaded (?:file|image): ([^\s(]+)/)
                return match ? match[1] : a
              })
            }
            // Capture widget_scope from history so the bridge pill
            // renders on resumed widget-scoped messages (and so widget chat
            // panel can filter on it).
            if (msg.widget_scope) userMsg.widgetScope = msg.widget_scope
            newMessages.push(userMsg)
            break
          }
          case 'assistant':
            if (msg.tool_calls && msg.tool_calls.length > 0) {
              for (const tc of msg.tool_calls) {
                if (tc.tool === 'todo_write') continue  // rendered in Progress widget
                const tcMsg = {
                  id: nextId(),
                  type: 'tool_call',
                  tool: tc.tool,
                  input: tc.input_summary || '',
                  status: 'done',
                  resultLength: null,
                }
                if (msg.widget_scope) tcMsg.widgetScope = msg.widget_scope
                newMessages.push(tcMsg)
              }
            }
            if (msg.text) {
              const aMsg = { id: nextId(), type: 'assistant', text: msg.text, timestamp: msg.timestamp || 0 }
              if (msg.widget_scope) aMsg.widgetScope = msg.widget_scope
              newMessages.push(aMsg)
            }
            break
          case 'tool_call':
            if (msg.tool === 'todo_write') break  // rendered in Progress widget
            {
              const tcMsg = {
                id: nextId(),
                type: 'tool_call',
                tool: msg.tool,
                input: msg.input_summary || '',
                status: 'done',
                resultLength: null,
              }
              if (msg.widget_scope) tcMsg.widgetScope = msg.widget_scope
              newMessages.push(tcMsg)
            }
            break
          case 'tool_result':
            if (msg.diff) {
              for (let i = newMessages.length - 1; i >= 0; i--) {
                if (newMessages[i].type === 'tool_call' && newMessages[i].tool === msg.tool && !newMessages[i].diff) {
                  newMessages[i] = { ...newMessages[i], diff: msg.diff }
                  break
                }
              }
            }
            break
          case 'outputs':
            if (msg.outputs?.length > 0) {
              newMessages.push({ id: nextId(), type: 'outputs', outputs: msg.outputs })
            }
            break
          case 'compaction_marker':
            newMessages.push({
              id: nextId(),
              type: 'compaction_marker',
              messagesCompacted: msg.messages_compacted || 0,
              summaryPreview: msg.summary_preview || '',
              emergency: msg.emergency || false,
            })
            break
          case 'refresh_divider':
            newMessages.push({
              id: nextId(),
              type: 'refresh_divider',
              text: msg.text,
              timestamp: msg.timestamp || 0,
            })
            break
          // A workflow run: marks where one agent's turn starts. The chat
          // groups everything up to the next marker under that agent.
          case 'agent_turn':
            newMessages.push({ ...msg, id: nextId(), type: 'agent_turn' })
            break
          case 'advisor_call':
            newMessages.push({
              id: nextId(),
              type: 'advisor_call',
              text: msg.text || '',
              encrypted: msg.encrypted || false,
            })
            break
          case 'advisor_result':
            newMessages.push({
              id: nextId(),
              type: 'advisor_result',
              text: msg.text || '',
              encrypted: msg.encrypted || false,
            })
            break
        }
      }
    } catch {
    }

    setMessages(newMessages)
    setStatus(targetStatus)
    setEventLog([])

    // Hydrate the latest follow-up chips (non-blocking — never delays the
    // thread render; absent/disabled tenants just return an empty set). Skipped
    // when follow-ups are muted for this session.
    if (!isFollowupsMuted(sid)) {
      setSuggestionsLoading(true)
      apiGet(`/api/sessions/${sid}/recommendations`)
        // Re-check muted on resolve: the user may have muted while in flight.
        .then((d) => { if (!isFollowupsMuted(sid)) setSuggestedQuestions(d?.questions || []) })
        .catch(() => {})
        .finally(() => setSuggestionsLoading(false))
    }

    return session.session_id
  }, [])

  // ─── Send message ────────────────────────────────
  // options.widgetScope: workspace-relative path to a widget JSX file. When
  // set (and the backend feature flag is on), the backend runs the turn with
  // a focused scope_block + windowed prior widget messages instead of the
  // full session history. See backend src/routes/sessions.py chat() endpoint.
  const sendMessage = useCallback(async (text, files = [], options = {}) => {
    if (!sessionId || status === 'thinking') return
    if (!text.trim() && files.length === 0) return

    // Previous turn's follow-up chips don't apply to the new turn.
    setSuggestedQuestions([])
    setSuggestionsLoading(false)

    // Show user message with attachment names immediately. Tag with
    // widgetScope when present so widget-chat UIs can render it without
    // round-tripping to /history.
    const attachmentNames = files.map((f) => f.name)
    const localMsg = { type: 'user', text, attachments: attachmentNames.length > 0 ? attachmentNames : undefined, timestamp: Date.now() }
    if (options.widgetScope) localMsg.widgetScope = options.widgetScope
    addMessage(localMsg)
    pusherDeliveredRef.current = false
    textTruncatedRef.current = false
    setStatus('thinking')

    try {
      let attachments = null

      if (files.length > 0) {
        try {
          const uploadData = await apiUpload(`/api/sessions/${sessionId}/upload`, files)
          const successful = (uploadData.uploads || []).filter((u) => !u.error)
          const failed = (uploadData.uploads || []).filter((u) => u.error)

          if (failed.length > 0) {
            for (const f of failed) {
              addMessage({ type: 'system', text: `Upload failed: ${f.filename} (${f.error})` })
            }
          }

          if (successful.length > 0) {
            attachments = successful.map((u) => ({
              path: u.path,
              name: u.filename,
              type: u.type,
              size: u.size,
              columns: u.columns || null,
              rows: u.rows || null,
              shape: u.shape || null,
              dimensions: u.dimensions || null,
            }))
          }
        } catch (e) {
          addMessage({ type: 'system', text: `Upload failed: ${e.message}` })
          setStatus('active')
          return
        }
      }

      const body = { message: text }
      if (attachments) body.attachments = attachments
      if (options.widgetScope) body.widget_scope = options.widgetScope

      await apiPost(`/api/sessions/${sessionId}/chat`, body)
    } catch (e) {
      addMessage({ type: 'assistant', text: `Request failed: ${e.message}`, isError: true })
      setStatus('active')
    }
  }, [sessionId, status, addMessage])

  const endSession = useCallback(async () => {
    if (!sessionId) return
    const sid = sessionId

    addSystemMsg('Ending session...')

    try {
      const data = await apiDelete(`/api/sessions/${sid}?archive=true`)
      if (data.archive && data.archive.archived > 0) {
        addSystemMsg(`Archived ${data.archive.archived} files to S3. Local workspace deleted.`)
      } else if (data.archive && data.archive.error) {
        addSystemMsg(`Archive warning: ${data.archive.error}`)
      } else {
        addSystemMsg('Session deleted.')
      }
    } catch (e) {
      addSystemMsg(`Failed to end session: ${e.message}`)
    }

    setSessionId(null)
    setDashboardId(null)
    setProvider(null)
    setStatus('idle')
    setIsResumed(false)
    setTotalTokens(0)
    setContextThreshold(0)
    setContextUsagePercent(0)
    setIsCompacting(false)
    setTurnCount(0)
    useTodoStore.getState().reset()
  }, [sessionId, addSystemMsg])

  const goHome = useCallback(() => {
    setSessionId(null)
    setDashboardId(null)
    setSessionType('regular')
    setProvider(null)
    setStatus('idle')
    setIsResumed(false)
    setTotalTokens(0)
    setContextThreshold(0)
    setContextUsagePercent(0)
    setIsCompacting(false)
    setTurnCount(0)
    setSessionName('')
    setSuggestedQuestions([])
    setMessages([{ id: nextId(), type: 'system', text: 'Create a session to start chatting with the analytics agent.' }])
    setEventLog([])
    useTodoStore.getState().reset()
  }, [])

  const cancelTurn = useCallback(async () => {
    if (!sessionId || status !== 'thinking') return
    try {
      await apiPost(`/api/sessions/${sessionId}/cancel`, {})
    } catch (e) {
      console.warn('Cancel request failed:', e.message)
    }
  }, [sessionId, status])

  const deleteLastMessage = useCallback(async () => {
    if (!sessionId || status === 'thinking') return { isEmpty: false }
    try {
      await apiDelete(`/api/sessions/${sessionId}/messages/last`)
      let isEmptyResult = false
      setMessages((prev) => {
        let lastUserIdx = -1
        for (let i = prev.length - 1; i >= 0; i--) {
          if (prev[i].type === 'user') {
            lastUserIdx = i
            break
          }
        }
        if (lastUserIdx === -1) return prev
        const newMessages = prev.slice(0, lastUserIdx)
        const hasConversation = newMessages.some((m) => m.type === 'user' || m.type === 'assistant')
        isEmptyResult = !hasConversation
        return newMessages
      })
      setTurnCount((prev) => Math.max(0, prev - 1))
      if (isEmptyResult) {
        queryClient.invalidateQueries({ queryKey: ['sessions'] })
        queryClient.invalidateQueries({ queryKey: ['sessions-list'] })
      }
      return { isEmpty: isEmptyResult }
    } catch (e) {
      addSystemMsg(`Failed to delete message: ${e.message}`)
      return { isEmpty: false }
    }
  }, [sessionId, status, addSystemMsg, queryClient])


  return {
    sessionId,
    dashboardId,
    sessionType,
    sessionName,
    setSessionName,
    provider,
    isResumed,
    status,
    totalTokens,
    contextThreshold,
    contextUsagePercent,
    isCompacting,
    turnCount,
    messages,
    eventLog,
    suggestedQuestions,
    suggestionsLoading,
    followupsMuted,
    muteFollowups,
    unmuteFollowups,
    workspaceReadyCounter,
    createSession,
    resumeSession,
    sendMessage,
    addMessage,
    endSession,
    goHome,
    cancelTurn,
    deleteLastMessage,
    handlePusherEvent,
  }
}
