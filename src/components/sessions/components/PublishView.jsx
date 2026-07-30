import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import Pusher from 'pusher-js'
import {
  CaretLeft, CaretRight, Play,
  CircleNotch, CheckCircle, XCircle, Spinner, ArrowsClockwise, PencilSimple, Sparkle,
  Plus, ListChecks, Warning, X, Eye,
} from '@phosphor-icons/react'
import { PUSHER_KEY, PUSHER_CLUSTER } from '../../../config'
import { apiPost, apiGet, apiDelete, getApiBase, getAuthToken, getCurrentUser } from '../../../api'
import { Toggle } from '@/ui'
import { Button as PvButton } from '@/ui'
import RecipeGroupCard from '../../RecipeGroupCard'
import RecipeStepCell from '../../RecipeStepCell'
import OutputPreview from '../../OutputPreview'
import HardeningChat from './HardeningChat'
import MarkdownRenderer from '../../../utils/MarkdownRenderer'
import SlackChannelPicker from '../../shared/SlackChannelPicker'
import WidgetListView from './WidgetListView'
import WidgetDetailView from './WidgetDetailView'

const DAYS_OF_WEEK = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
]

const TIME_OPTIONS = (() => {
  const opts = []
  for (let h = 0; h < 24; h++) {
    for (const m of ['00', '30']) {
      const hh = String(h).padStart(2, '0')
      const label = `${h === 0 ? '12' : h > 12 ? h - 12 : h}:${m} ${h < 12 ? 'AM' : 'PM'}`
      opts.push({ value: `${hh}:${m}`, label })
    }
  }
  return opts
})()

const COMMON_TIMEZONES = [
  // Americas
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Toronto', 'America/Sao_Paulo',
  // Asia
  'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo',
  // Middle East
  'Asia/Dubai', 'Asia/Riyadh', 'Asia/Qatar',
  // Australia / Pacific
  'Australia/Sydney', 'Pacific/Auckland',
  // Europe
  'Europe/Berlin', 'Europe/London', 'Europe/Paris',
  // UTC
  'UTC',
]

function CustomSelect({ value, onChange, options, className = '' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const btnRef = useRef(null)
  const dropRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current?.contains(e.target)) return
      if (dropRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selected = options.find(o => o.value === value)

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-1.5 px-3 py-2 text-[14px] rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] cursor-pointer hover:border-[var(--accent)]/50 transition-colors text-left"
      >
        <span className="truncate">{selected?.label || value}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && createPortal(
        <div
          ref={dropRef}
          style={(() => {
            const rect = btnRef.current?.getBoundingClientRect()
            if (!rect) return { position: 'fixed', zIndex: 9999 }
            const spaceBelow = window.innerHeight - rect.bottom
            const openUp = spaceBelow < 220
            return {
              position: 'fixed',
              ...(openUp
                ? { bottom: window.innerHeight - rect.top + 4 }
                : { top: rect.bottom + 4 }),
              left: rect.left,
              width: Math.max(rect.width, 140),
              zIndex: 9999,
            }
          })()}
          className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg shadow-lg overflow-hidden max-h-52 overflow-y-auto"
        >
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`w-full text-left px-3 py-1.5 text-[12px] border-none cursor-pointer transition-colors ${
                opt.value === value
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)] font-medium'
                  : 'bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  )
}

// Sanitize a folder/file segment for a memo path.
const slugSeg = (s, fallback) => ((s || '').trim().replace(/[^a-zA-Z0-9\-_ ]/g, '').replace(/ /g, '_') || fallback)

// Spinning icon for Petavue Button loading states (the Button renders a static
// icon, so we supply one that animates itself).
const SpinnerIcon = (props) => <CircleNotch {...props} className="animate-spin" />

function buildCronExpression(frequency, day, time) {
  const [hh, mm] = time.split(':')
  switch (frequency) {
    case 'daily': return `${mm} ${hh} * * *`
    case 'weekly': return `${mm} ${hh} * * ${day}`
    case 'biweekly': return `${mm} ${hh} 1-7,15-21 * ${day}`
    case 'monthly': return `${mm} ${hh} ${day} * *`
    default: return `${mm} ${hh} * * *`
  }
}

/**
 * Extract a format guide (heading skeleton + structural hints) from markdown.
 * No data values — just section names and formatting patterns.
 */
function extractFormatGuide(markdown) {
  if (!markdown) return ''
  const lines = markdown.split('\n')
  const guide = []
  for (const line of lines) {
    const trimmed = line.trim()
    // Headings
    if (/^#{1,4}\s/.test(trimmed)) {
      guide.push(trimmed.replace(/[0-9,.]+/g, '{value}').replace(/\{value\}\s*/g, '').trim() || trimmed)
    }
    // Table header row (contains |)
    else if (trimmed.startsWith('|') && trimmed.includes('|') && !trimmed.match(/^[\s|:-]+$/)) {
      if (!guide.includes('(markdown table)')) guide.push('(markdown table)')
    }
    // Blockquote
    else if (trimmed.startsWith('>') && !guide.includes('(blockquote)')) {
      guide.push('(blockquote)')
    }
    // Numbered list start
    else if (/^\d+\.\s/.test(trimmed) && !guide[guide.length - 1]?.includes('numbered list')) {
      guide.push('(numbered list)')
    }
    // Bullet list start
    else if (/^[-*]\s/.test(trimmed) && !guide[guide.length - 1]?.includes('bullet list')) {
      guide.push('(bullet list)')
    }
  }
  return guide.join('\n')
}

// Verification flow phases
const PHASE = {
  IDLE: 'idle',
  EXTRACTING: 'extracting',
  PREPARING: 'preparing',
  EXECUTING: 'executing',
  HARDENING: 'hardening',
  REVIEWED: 'reviewed',          // review (and hardening, if recurring) passed — ready to confirm
  CREATING_WORKFLOW: 'creating_workflow',
  DONE: 'done',
  ERROR: 'error',
}

// Wizard steps. "Verify" (per-widget review) is the first step; "Review" is
// the mandatory agentic check that gates publishing.
const STEP = { WORKFLOW: 'workflow', VERIFY: 'verify', OUTPUTS: 'outputs', FREQUENCY: 'frequency', REVIEW: 'review', CONFIRM: 'confirm' }
// Verify hosts two sub-steps (User Review + Agentic Review); the agentic review
// is the gate. Publish runs the remaining 4-screen sequence.
const STEP_ORDER = [STEP.WORKFLOW, STEP.OUTPUTS, STEP.FREQUENCY]
const TAB = { VERIFY: 'verify', PUBLISH: 'publish' }
const STEP_LABELS = {
  [STEP.WORKFLOW]: 'Workflow',
  [STEP.VERIFY]: 'Verify',
  [STEP.OUTPUTS]: 'Outputs',
  [STEP.FREQUENCY]: 'Schedule',
  [STEP.REVIEW]: 'Review',
  [STEP.CONFIRM]: 'Configure',
}

const PROGRESS_MESSAGES_REFRESH = [
  'Replaying every data query against live sources...',
  'Would your SQL survive a schema change at 2 AM? Let\'s find out.',
  'Did someone sneak a hardcoded date into one of these queries?',
  'What if the CSV your chart depends on comes back empty tomorrow?',
  'Ensuring your charts won\'t show stale numbers next week',
  'Can every SQL query here survive a schema migration?',
  'Removing dates that would freeze your dashboard in time',
  'Verifying file dependencies chain correctly',
  'How many of these date filters will silently freeze next month?',
  'Confirming widget renders produce valid output',
  'Catching fragile patterns before they catch you',
  'Unlike typical AI tools, we verify every step actually runs',
  'Replacing brittle date filters with dynamic expressions',
  'How would this pipeline behave with completely fresh data? Let\'s find out',
  'Ensuring your dashboard is self-sustaining, not prompt-dependent',
  'Double-checking that CSVs have the columns your charts expect',
  'Most AI dashboards break on refresh. Yours won\'t',
  'Validating that aggregations match the source schema',
  'Making your dashboard production-grade, not demo-grade',
  'Confirming no query references a table that moved',
  'What\'s hiding in that WHERE clause: a dynamic range or a frozen snapshot?',
  'Testing the full pipeline: query → transform → render',
  'Catching NULL surprises before your stakeholders do',
  'Ensuring every widget can rebuild itself from scratch',
  'Your dashboard is learning to refresh itself',
  'Verifying data flows from source to chart, no gaps',
  'Are those column names stable, or is one schema change away from chaos?',
  'How does a typical AI tool handle this? Hint: it doesn\'t even check',
  'Typical dashboards need babysitting. This one won\'t',
  'Checking that join keys still match across tables',
  'Preparing your dashboard for scheduled auto-refresh',
  'Validating that no step depends on a one-time upload',
  'What if tomorrow\'s data has a format your Python script has never seen?',
  'Running the same pipeline your schedule will run',
  'Catching edge cases that only appear with fresh data',
  'Turning a conversation into a repeatable data pipeline',
  'Making sure your insights stay fresh without manual effort',
  'Verifying that transformations handle empty results gracefully',
  'Your dashboard is graduating from draft to production',
  'Turning your conversation into something that runs on autopilot. Almost there',
]

const PROGRESS_MESSAGES_PUBLISH = [
  'Replaying every data query against live sources...',
  'Verifying that all SQL queries return valid results',
  'Checking that your data transformations produce correct output',
  'Unlike typical AI tools, we verify every step actually runs',
  'Confirming widget renders produce valid output',
  'Double-checking that CSVs have the columns your charts expect',
  'Validating that aggregations match the source schema',
  'Making your dashboard production-grade, not demo-grade',
  'Confirming no query references a table that moved',
  'Testing the full pipeline: query → transform → render',
  'Catching NULL surprises before your stakeholders do',
  'Verifying data flows from source to chart, no gaps',
  'Checking that join keys still match across tables',
  'Are those column names stable, or will a schema change break things?',
  'How does a typical AI tool handle this? Hint: it doesn\'t even check',
  'Verifying file dependencies chain correctly',
  'Ensuring every widget renders without errors',
  'Validating that no step depends on a missing file',
  'Confirming all data files have the expected structure',
  'Running each step to make sure your dashboard is complete and correct',
  'Catching edge cases before your stakeholders do',
  'Your dashboard is graduating from draft to production',
  'Verifying that transformations handle edge cases gracefully',
  'Almost there. Confirming everything looks good',
]

export default function PublishView({
  dashboardTitle = '',
  setDashboardTitle,
  codeHash = null,
  widgets = [],
  widgetCount = 0,
  onWidgetVerified,
  sessionId,
  sessionStatus,
  liveMessages = [],
  onSendFeedback,
  onClose,
  onRequestMaximize,
}) {
  const navigate = useNavigate()
  const isPetavueUser = (getCurrentUser()?.email || '').includes('@petavue.com')

  // Wizard step + review-passed gate
  const [step, setStep] = useState(STEP.WORKFLOW)
  // Two top-level tabs: Verify (optional, standalone widget review) and Publish
  // (the main workflow sequence). Default to Verify so review comes first.
  const [tab, setTab] = useState(TAB.VERIFY)
  // Verify has two sub-steps: 'user' (widget review) and 'agent' (agentic review).
  const [verifySubTab, setVerifySubTab] = useState('user')
  // Marked once the user continues past the (optional) User Review step.
  const [userReviewDone, setUserReviewDone] = useState(false)
  const [reviewPassed, setReviewPassed] = useState(false)
  // True when we skipped the run because the code hasn't changed since the last
  // review (the agent already reviewed this exact code).
  const [reviewSkipped, setReviewSkipped] = useState(false)
  // True when a prior review exists but the code changed since — so the dashboard
  // needs a fresh review before it can be (re)published.
  const [reviewStale, setReviewStale] = useState(false)
  // After the review passes we land on a recap first; the user opts in to the
  // full 3-column adjustments view by clicking "View adjustments" (no auto-jump).
  const [adjustmentsRevealed, setAdjustmentsRevealed] = useState(false)
  // Adjustments the user chose NOT to apply last time — surfaced in the
  // "No code change detected" / "Changes detected" screens so they can still be
  // applied. `unappliedSelected` is the staged check state (applied on continue).
  const [unappliedAdjustments, setUnappliedAdjustments] = useState([])
  const [unappliedSelected, setUnappliedSelected] = useState({})
  // Resizable widths (px) for the adjustments view's chat + preview columns.
  const [chatColWidth, setChatColWidth] = useState(360)
  const [previewColWidth, setPreviewColWidth] = useState(460)
  // Drag a column divider. The dragged column sits to the RIGHT of the handle, so
  // moving the handle right shrinks it (newWidth = startWidth − deltaX).
  const startColResize = (setter, startWidth, min, max) => (e) => {
    e.preventDefault()
    const startX = e.clientX
    const onMove = (ev) => setter(Math.max(min, Math.min(max, startWidth - (ev.clientX - startX))))
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.body.classList.remove('col-resizing')
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    // Disable iframe pointer events so the preview iframe doesn't swallow the
    // drag once the cursor moves over it (otherwise the right column won't resize).
    document.body.classList.add('col-resizing')
  }
  const colResizer = (setter, width, min, max) => (
    <div onMouseDown={startColResize(setter, width, min, max)} className="shrink-0 w-1.5 -mx-px self-stretch cursor-col-resize bg-transparent hover:bg-[var(--accent)]/40 active:bg-[var(--accent)]/60 transition-colors z-10" title="Drag to resize" />
  )
  // Step ids whose accept/reject choice has been "applied". The current
  // selection must match this before you can continue to publish.
  const [selectedWidget, setSelectedWidget] = useState(null) // for the Verify step

  // A workflow = recipe + schedule + destinations. Distinct from the dashboard.
  const [workflowName, setWorkflowName] = useState('')

  const [autoRefresh, setAutoRefresh] = useState(true)
  const [publishDashboardEnabled, setPublishDashboardEnabled] = useState(true)
  // Dashboard output config (Configure step)
  const [dashboardMessage, setDashboardMessage] = useState('')
  const [includeDashboardLink, setIncludeDashboardLink] = useState(true)
  const [slackPreviewOpen, setSlackPreviewOpen] = useState(false)

  // Schedule config
  const [scheduleType, setScheduleType] = useState('data_sync') // 'data_sync' | 'custom'
  const [scheduleFrequency, setScheduleFrequency] = useState('weekly')
  const [scheduleDay, setScheduleDay] = useState('1') // 0=Sun, 1=Mon, ... 6=Sat (or 1-28 for monthly)
  const [scheduleTime, setScheduleTime] = useState('09:00')
  const [scheduleTimezone, setScheduleTimezone] = useState(() => {
    const browser = Intl.DateTimeFormat().resolvedOptions().timeZone
    return COMMON_TIMEZONES.includes(browser) ? browser : 'UTC'
  })

  // Existing workflow detection
  const [existingWorkflows, setExistingWorkflows] = useState(null)
  const [existingLoading, setExistingLoading] = useState(true)
  const [updateMode, setUpdateMode] = useState(null) // null = not decided, workflow obj = update, false = create new
  const [showExistingDropdown, setShowExistingDropdown] = useState(false)

  // Verification state
  const [phase, setPhase] = useState(PHASE.IDLE)
  const [phaseMessage, setPhaseMessage] = useState('')
  const [totalSteps, setTotalSteps] = useState(0)
  const [completedSteps, setCompletedSteps] = useState(0)
  const [progressQuip, setProgressQuip] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [workflowId, setWorkflowId] = useState(null)
  const [dashboardId, setDashboardId] = useState(null)
  const [wasUpdate, setWasUpdate] = useState(false)
  const quipIndexRef = useRef(0)
  const progressMessagesRef = useRef(PROGRESS_MESSAGES_REFRESH)

  // Draft state
  const [draftInfo, setDraftInfo] = useState(null) // { exec_session_id, step_results, hardening_status, diffs, total_steps, steps_completed, stale }
  const [draftLoading, setDraftLoading] = useState(true)

  // Hardening state (when autoRefresh is on)
  const [recipe, setRecipe] = useState(null)
  const [stepResults, setStepResults] = useState({})
  const [hardeningStatus, setHardeningStatus] = useState({})
  const [codeDiffs, setCodeDiffs] = useState({})
  const [hardeningPhase, setHardeningPhase] = useState(null) // null | 'running' | 'complete'
  const [selectedOutput, setSelectedOutput] = useState(null)
  const [hardeningLoading, setHardeningLoading] = useState(false)
  const [showAdjustments, setShowAdjustments] = useState(false)
  // Per-adjustment accept/reject (keyed by step id; missing or true = accepted)
  const [adjustmentChecked, setAdjustmentChecked] = useState({})
  const [collapsedSteps, setCollapsedSteps] = useState({})
  const [adjustmentSplitPct, setAdjustmentSplitPct] = useState(50)
  const adjustmentDragging = useRef(false)
  const adjustmentContainerRef = useRef(null)
  const [publishSplitPct, setPublishSplitPct] = useState(35) // left panel % of total width
  const publishDragging = useRef(false)
  const publishContainerRef = useRef(null)
  const hardeningQuipRef = useRef(0)
  const hardeningQuipIntervalRef = useRef(null)
  const [hardeningQuip, setHardeningQuip] = useState('')
  const agentRunningRef = useRef(false) // true while execution or hardening is actively running on backend

  // AI Preview state (agent_memo)
  const [aiPrompt, setAiPrompt] = useState("")
  const [aiFilename, setAiFilename] = useState('memo')
  // Folder destination — pick an existing folder or create a new one.
  const NEW_FOLDER = '__new__'
  const [folders, setFolders] = useState(['agent_memo'])
  const [summaryFolder, setSummaryFolder] = useState('agent_memo')
  const [newFolderName, setNewFolderName] = useState('')
  const [aiPreviewRunning, setAiPreviewRunning] = useState(false)
  const [aiPreviewContent, setAiPreviewContent] = useState(null)
  const [aiPreviewError, setAiPreviewError] = useState('')
  const [aiPreviewMemoPath, setAiPreviewMemoPath] = useState(null)
  const aiPreviewSessionRef = useRef(null)
  const aiPusherRef = useRef(null)
  const publishPollRef = useRef(null)
  // Scroll target — reveal the summary destinations once the first summary lands.
  const summaryEndRef = useRef(null)

  // Slack notification state
  const [slackChannels, setSlackChannels] = useState([])
  const [slackDmUsers, setSlackDmUsers] = useState([])

  // Publish artifacts & summary destinations. The summary is a first-class output;
  // Slack and Folder are independent destinations it fans out to (a small workflow).
  const [summaryEnabled, setSummaryEnabled] = useState(false)
  const [summaryToFolder, setSummaryToFolder] = useState(true) // accessible to agents now; webhooks/API later
  const [slackEnabled, setSlackEnabled] = useState(false)
  const [emailEnabled, setEmailEnabled] = useState(false)
  const [slackTestSending, setSlackTestSending] = useState(false)
  // Set when the user hits Continue with Slack on but no channel/DM picked.
  const [slackTargetError, setSlackTargetError] = useState(false)

  // Refs for cleanup
  const pusherRef = useRef(null)
  const pollRef = useRef(null)
  const aliveRef = useRef(true)
  const execSessionIdRef = useRef(null)
  const workflowCreatedRef = useRef(false)
  const autoRefreshRef = useRef(autoRefresh)

  useEffect(() => { autoRefreshRef.current = autoRefresh }, [autoRefresh])

  // ── Code-change detection ──────────────────────────────────────────
  // The backend gives us a hash of the dashboard code (code_hash). We remember
  // the hash we last reviewed (per session) so a re-publish with no code change
  // can skip the (expensive) review entirely.
  const reviewHashKey = sessionId ? `agent-review-hash:${sessionId}` : null
  const unappliedKey = sessionId ? `agent-unapplied-adjustments:${sessionId}` : null
  // Full snapshot of the passed review (recipe + hardening + diffs + exec session)
  // so a reopen with unchanged code can *show* the adjustments without re-running.
  const snapshotKey = sessionId ? `agent-review-snapshot:${sessionId}` : null
  useEffect(() => {
    if (!codeHash || !reviewHashKey) return
    // Never react mid-review; otherwise codeHash changing (e.g. an edit made
    // during User Review) should be reflected here even if a review already passed.
    if (isReviewRunning) return
    const stored = localStorage.getItem(reviewHashKey)
    // Either way (skip or stale), surface any adjustments left unapplied last time.
    if (stored && unappliedKey) {
      try { setUnappliedAdjustments(JSON.parse(localStorage.getItem(unappliedKey) || '[]')) } catch { /* ignore */ }
    }
    if (stored === codeHash) {
      // Same code the agent already reviewed → skip (unless we're already passed).
      if (!reviewPassed) {
        // Rehydrate the saved review so "View adjustments" can show it without a
        // re-run. The exec session lives server-side as long as the page wasn't
        // reloaded; if the snapshot is gone, the skip button falls back to re-run.
        if (snapshotKey) {
          try {
            const snap = JSON.parse(localStorage.getItem(snapshotKey) || 'null')
            if (snap) {
              if (snap.recipe) setRecipe(snap.recipe)
              if (snap.hardeningStatus) setHardeningStatus(snap.hardeningStatus)
              if (snap.stepResults) setStepResults(snap.stepResults)
              if (snap.codeDiffs) setCodeDiffs(snap.codeDiffs)
              if (snap.adjustmentChecked) setAdjustmentChecked(snap.adjustmentChecked)
              if (typeof snap.totalSteps === 'number') setTotalSteps(snap.totalSteps)
              if (snap.execSessionId) execSessionIdRef.current = snap.execSessionId
            }
          } catch { /* ignore */ }
        }
        setReviewSkipped(true); setReviewPassed(true)
      }
    } else if (stored) {
      // Reviewed before, but the dashboard changed since (e.g. a User Review edit
      // bumped the code) → invalidate the pass/skip and require a fresh review.
      setReviewSkipped(false)
      setReviewPassed(false)
      setReviewStale(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeHash, reviewHashKey])

  // Remember the hash whenever a real review passes, so the next open can skip.
  useEffect(() => {
    if (reviewPassed && !reviewSkipped && codeHash && reviewHashKey) {
      localStorage.setItem(reviewHashKey, codeHash)
    }
  }, [reviewPassed, reviewSkipped, codeHash, reviewHashKey])

  // Persist a full snapshot of a freshly-passed review so a later reopen (with
  // unchanged code) can show the adjustments without re-running.
  useEffect(() => {
    if (!reviewPassed || reviewSkipped || !snapshotKey || !recipe || !execSessionIdRef.current) return
    try {
      localStorage.setItem(snapshotKey, JSON.stringify({
        execSessionId: execSessionIdRef.current,
        recipe, hardeningStatus, stepResults, codeDiffs, adjustmentChecked, totalSteps,
      }))
    } catch { /* ignore */ }
  }, [reviewPassed, reviewSkipped, snapshotKey, recipe, hardeningStatus, stepResults, codeDiffs, adjustmentChecked, totalSteps])

  // Existing folders the summary can be saved into (plus the "create new" option).
  useEffect(() => {
    apiGet('/api/folders').then(d => { if (Array.isArray(d?.folders) && d.folders.length) setFolders(d.folders) }).catch(() => {})
  }, [])

  // Clear the Slack-target error once a channel/DM is picked or Slack is off.
  useEffect(() => {
    if (!slackEnabled || slackChannels.length > 0 || slackDmUsers.length > 0) setSlackTargetError(false)
  }, [slackEnabled, slackChannels, slackDmUsers])

  // Once a summary is generated, reveal & scroll to the destinations section.
  useEffect(() => {
    if (aiPreviewContent && summaryEnabled) {
      const t = setTimeout(() => summaryEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 120)
      return () => clearTimeout(t)
    }
  }, [aiPreviewContent, summaryEnabled])


  const stepResultsRef = useRef(stepResults)
  useEffect(() => { stepResultsRef.current = stepResults }, [stepResults])
  const recipeRef = useRef(recipe)
  useEffect(() => { recipeRef.current = recipe }, [recipe])

  // Derived hardening counts
  const hardeningProcessedCount = Object.values(hardeningStatus).filter(s => s.status && s.status !== 'pending').length
  const adjustmentCount = Object.values(hardeningStatus).filter(s => s.status === 'hardened').length
  const totalHardeningSteps = recipe?.steps?.length || totalSteps

  // Hardening quip rotation
  useEffect(() => {
    if (hardeningPhase === 'running') {
      const msgs = PROGRESS_MESSAGES_REFRESH
      setHardeningQuip(msgs[hardeningQuipRef.current % msgs.length])
      hardeningQuipRef.current++
      hardeningQuipIntervalRef.current = setInterval(() => {
        setHardeningQuip(msgs[hardeningQuipRef.current % msgs.length])
        hardeningQuipRef.current++
      }, 15000)
    }
    return () => {
      if (hardeningQuipIntervalRef.current) {
        clearInterval(hardeningQuipIntervalRef.current)
        hardeningQuipIntervalRef.current = null
      }
    }
  }, [hardeningPhase])

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
      if (pusherRef.current) { pusherRef.current.disconnect(); pusherRef.current = null }
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      if (aiPusherRef.current) { aiPusherRef.current.disconnect(); aiPusherRef.current = null }
      if (aiPollRef.current) { clearInterval(aiPollRef.current); aiPollRef.current = null }
      if (publishPollRef.current) { clearInterval(publishPollRef.current); publishPollRef.current = null }
      // Cancel if agent is actively running (execution or hardening)
      const execSid = execSessionIdRef.current
      if (execSid && sessionId && agentRunningRef.current) {
        apiPost(`/api/sessions/${sessionId}/recipe/exec/cancel`, {
          exec_session_id: execSid,
        }).catch(() => {})
      }
      // Clean up AI preview session
      const execSidForCleanup = execSessionIdRef.current
      if (execSidForCleanup && sessionId) {
        apiDelete(`/api/sessions/${sessionId}/ai-preview?exec_session_id=${encodeURIComponent(execSidForCleanup)}`).catch(() => {})
      }
      execSessionIdRef.current = null
    }
  }, [])

  // Warn on browser refresh while agent is running
  useEffect(() => {
    const handler = (e) => {
      if (agentRunningRef.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  // Pre-fill the workflow name from the dashboard title (user can override).
  useEffect(() => {
    if (dashboardTitle && !workflowName) setWorkflowName(dashboardTitle)
  }, [dashboardTitle]) // eslint-disable-line react-hooks/exhaustive-deps

  // Check for existing workflows on mount
  useEffect(() => {
    if (!sessionId) { setExistingLoading(false); return }
    apiGet(`/api/workflows/check?session_id=${encodeURIComponent(sessionId)}&target_file=${encodeURIComponent('output/dashboard/index.html')}`)
      .then((data) => {
        if (!aliveRef.current) return
        if (data?.exists && data.workflows?.length > 0) {
          setExistingWorkflows(data.workflows)
          // Default to create new — let user decide to update existing
          setUpdateMode(false)
        }
        setExistingLoading(false)
      })
      .catch(() => { if (aliveRef.current) setExistingLoading(false) })
  }, [sessionId])

  // Populate action block states when user selects an existing workflow to update
  useEffect(() => {
    if (!updateMode || !updateMode.workflow_id) return
    const blocks = updateMode.blocks || []
    const schedule = updateMode.schedule || {}

    setWorkflowName(updateMode.name || '')

    // Slack block — a summary destination
    const slackBlock = blocks.find(b => b.type === 'send_slack')
    if (slackBlock?.config) {
      setSlackEnabled(true)
      setSlackChannels(slackBlock.config.channels || [])
      setSlackDmUsers(slackBlock.config.dm_users || [])
    } else {
      setSlackEnabled(false)
      setSlackChannels([])
      setSlackDmUsers([])
    }

    // Summary block + its destinations (folder file and/or Slack)
    const aiBlock = blocks.find(b => b.type === 'ai_summarize')
    if (aiBlock?.config) {
      setSummaryEnabled(true)
      setAiPrompt(aiBlock.config.prompt || '')
      const dests = aiBlock.config.destinations || []
      setSummaryToFolder(dests.length ? dests.includes('folder') : (aiBlock.config.save_memo !== false))
      const outFile = aiBlock.config.output_file || ''
      const parts = outFile.split('/')
      const base = parts.pop()?.replace(/\.md$/, '')
      const folder = parts.join('/')
      if (folder) {
        setFolders(prev => prev.includes(folder) ? prev : [...prev, folder])
        setSummaryFolder(folder)
      }
      if (base && base !== '_summary') setAiFilename(base)
    } else {
      setSummaryEnabled(false)
    }

    // Publish dashboard block + its config
    const pubBlock = blocks.find(b => b.type === 'publish_dashboard')
    setPublishDashboardEnabled(!!pubBlock)
    if (pubBlock?.config) {
      setDashboardMessage(pubBlock.config.message || '')
      setIncludeDashboardLink(pubBlock.config.include_link !== false)
    }

    // Schedule
    if (schedule.type === 'custom' && schedule.cron) {
      setScheduleType('custom')
      setScheduleTimezone(schedule.timezone || 'UTC')
      // Parse cron back to frequency/day/time
      const parts = schedule.cron.split(/\s+/)
      if (parts.length === 5) {
        const [mm, hh, dom, , dow] = parts
        const time = `${hh.padStart(2, '0')}:${mm.padStart(2, '0')}`
        setScheduleTime(time)
        if (dom === '*' && dow === '*') {
          setScheduleFrequency('daily')
        } else if (dom !== '*' && dom.includes(',')) {
          setScheduleFrequency('biweekly')
          setScheduleDay(dow)
        } else if (dom !== '*') {
          setScheduleFrequency('monthly')
          setScheduleDay(dom)
        } else {
          setScheduleFrequency('weekly')
          setScheduleDay(dow)
        }
      }
    } else {
      setScheduleType('data_sync')
    }
  }, [updateMode])

  // Check for existing draft on mount
  useEffect(() => {
    if (!sessionId) { setDraftLoading(false); return }
    ;(async () => {
      try {
        const [draftResult, recipeResult] = await Promise.all([
          apiGet(`/api/sessions/${sessionId}/recipe/exec/draft`).catch(() => ({ has_draft: false })),
          apiPost(`/api/sessions/${sessionId}/recipe?target_file=${encodeURIComponent('output/dashboard/index.html')}&ai_mode=true`, {}).catch(() => null),
        ])
        if (!aliveRef.current) return

        if (draftResult?.has_draft && draftResult.exec_session_id) {
          setDraftInfo({
            exec_session_id: draftResult.exec_session_id,
            step_results: draftResult.step_results || {},
            hardening_status: draftResult.hardening_status || {},
            hardening_pending: draftResult.hardening_pending || 0,
            diffs: draftResult.diffs || {},
            total_steps: draftResult.total_steps || 0,
            steps_completed: draftResult.steps_completed || 0,
            recipe: recipeResult?.recipe || null,
            stale: draftResult.stale || false,
          })
        }
      } catch { /* no draft */ }
      if (aliveRef.current) setDraftLoading(false)
    })()
  }, [sessionId])

  // Agent actively working (review running or publishing) — lock inputs/nav.
  const isReviewRunning = phase === PHASE.EXTRACTING || phase === PHASE.PREPARING || phase === PHASE.EXECUTING || (phase === PHASE.HARDENING && hardeningPhase === 'running')
  const isPublishing = phase === PHASE.CREATING_WORKFLOW
  const isAgentBusy = isReviewRunning || isPublishing
  // Legacy alias used by renderExistingBanner (hide banner only while reviewing).
  const isVerifying = isReviewRunning
  const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0
  const hasOutput = publishDashboardEnabled || summaryEnabled

  // ── Helper: create Pusher instance ──
  const createPusher = useCallback(() => {
    const apiBase = getApiBase()
    const token = getAuthToken()
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return new Pusher(PUSHER_KEY, {
      cluster: PUSHER_CLUSTER,
      userAuthentication: { endpoint: `${apiBase}/api/pusher/user-auth`, transport: 'ajax', headers },
      channelAuthorization: { endpoint: `${apiBase}/api/pusher/channel-auth`, transport: 'ajax', headers },
    })
  }, [])

  // ── Helper: start AI preview ──
  const aiPollRef = useRef(null)

  const _fetchAiResult = useCallback(async (execSid) => {
    try {
      const data = await apiGet(
        `/api/sessions/${sessionId}/ai-preview/result?exec_session_id=${encodeURIComponent(execSid)}`
      )
      if (data?.has_result && data.content) {
        // Result ready — stop everything
        if (aiPollRef.current) { clearInterval(aiPollRef.current); aiPollRef.current = null }
        if (aiPusherRef.current) { aiPusherRef.current.disconnect(); aiPusherRef.current = null }
        setAiPreviewRunning(false)
        setAiPreviewContent(data.content)
        return true
      }
    } catch { /* poll continues */ }
    return false
  }, [sessionId])

  const handleAiPreview = useCallback(async () => {
    if (!sessionId || !execSessionIdRef.current || !aiPrompt.trim()) return

    setAiPreviewRunning(true)
    setAiPreviewContent(null)
    setAiPreviewError('')

    // Clean up previous Pusher + poll
    if (aiPusherRef.current) { aiPusherRef.current.disconnect(); aiPusherRef.current = null }
    if (aiPollRef.current) { clearInterval(aiPollRef.current); aiPollRef.current = null }

    try {
      const result = await apiPost(`/api/sessions/${sessionId}/ai-preview/start`, {
        exec_session_id: execSessionIdRef.current,
        prompt: aiPrompt,
        filename: aiFilename || 'memo',
      })

      if (!aliveRef.current) return
      aiPreviewSessionRef.current = result.preview_session_id
      setAiPreviewMemoPath(result.memo_path)
      const execSid = execSessionIdRef.current

      // Pusher for real-time done signal
      const aiPusher = createPusher()
      aiPusher.connection.bind('connected', () => aiPusher.signin())
      const ch = aiPusher.subscribe(result.channel)
      aiPusherRef.current = aiPusher

      ch.bind('agent-event', (event) => {
        if (!aliveRef.current) return
        const etype = event?.type || ''
        if (etype === 'done') {
          _fetchAiResult(execSid)
        } else if (etype === 'error') {
          if (aiPollRef.current) { clearInterval(aiPollRef.current); aiPollRef.current = null }
          setAiPreviewRunning(false)
          setAiPreviewError(event.error || 'An error occurred during preview generation.')
          ch.unbind_all()
          aiPusher.unsubscribe(result.channel)
          aiPusher.disconnect()
          aiPusherRef.current = null
        }
      })

      // Polling fallback — catches result if Pusher event is missed
      aiPollRef.current = setInterval(() => {
        if (!aliveRef.current) {
          clearInterval(aiPollRef.current)
          aiPollRef.current = null
          return
        }
        _fetchAiResult(execSid)
      }, 10000)

    } catch (e) {
      if (!aliveRef.current) return
      setAiPreviewRunning(false)
      setAiPreviewError(e.message || 'Failed to start AI preview')
    }
  }, [sessionId, aiPrompt, aiFilename, createPusher, _fetchAiResult])

  // ── Helper: auto-create workflow + dashboard ──
  const createWorkflow = useCallback(async (execSid) => {
    if (!aliveRef.current) return
    if (workflowCreatedRef.current) return
    workflowCreatedRef.current = true
    setPhase(PHASE.CREATING_WORKFLOW)

    const isUpdate = updateMode && updateMode.workflow_id
    setPhaseMessage(isUpdate ? 'Updating your dashboard...' : 'Publishing your dashboard...')
    setWasUpdate(!!isUpdate)

    try {
      const wfName = isUpdate ? updateMode.name : (workflowName.trim() || dashboardTitle || 'Untitled workflow')
      const extraBlocks = []

      // The summary is always written to the folder file; Slack (when on) reads
      // from that same saved file, so the alert posts the persisted summary.
      const folderSeg = slugSeg(summaryFolder === NEW_FOLDER ? newFolderName : summaryFolder, 'agent_memo')
      const summaryFile = `${folderSeg}/${slugSeg(aiFilename, 'memo')}.md`
      const aiOn = summaryEnabled && aiPrompt.trim()

      // AI summarize block — generate once, fan out to the chosen destinations.
      if (aiOn) {
        const destinations = [summaryToFolder && 'folder', slackEnabled && 'slack'].filter(Boolean)
        const blockConfig = {
          prompt: aiPrompt,
          output_file: summaryFile,
          save_memo: summaryToFolder,
          destinations,
        }
        const guide = extractFormatGuide(aiPreviewContent)
        if (guide) blockConfig.format_guide = guide

        extraBlocks.push({ id: 'blk_ai_memo', type: 'ai_summarize', label: 'AI Summary', config: blockConfig })
      }

      // Slack block — a summary destination. Emitted when Slack is on with targets.
      if (slackEnabled && (slackChannels.length > 0 || slackDmUsers.length > 0)) {
        const sendSummary = aiOn
        extraBlocks.push({
          id: 'blk_slack',
          type: 'send_slack',
          label: 'Send Slack Alert',
          config: {
            channels: slackChannels,
            dm_users: slackDmUsers,
            mode: sendSummary ? 'content_from' : 'generic',
            content_from: sendSummary ? summaryFile : '',
            include_link: includeDashboardLink,
          },
        })
      }

      if (publishDashboardEnabled) {
        extraBlocks.push({
          id: 'blk_publish',
          type: 'publish_dashboard',
          label: 'Publish Dashboard',
          config: {
            name: isUpdate ? (updateMode.dashboard_name || wfName) : (dashboardTitle || 'Untitled Dashboard'),
            shared: false,
            message: dashboardMessage,
            include_link: includeDashboardLink,
          },
        })
      }

      // Build schedule config
      let scheduleConfig = { type: 'data_sync' }
      if (autoRefresh && scheduleType === 'custom') {
        scheduleConfig = {
          type: 'custom',
          cron: buildCronExpression(scheduleFrequency, scheduleDay, scheduleTime),
          timezone: scheduleTimezone,
        }
      }

      // Adjustments the user unchecked — the published workflow should keep the
      // original code for these steps instead of the agent's hardening fix.
      const rejectedAdjustments = (recipe?.steps || [])
        .filter(s => hardeningStatus[s.id]?.status === 'hardened' && adjustmentChecked[s.id] === false)
        .map(s => s.id)

      const body = {
        name: wfName,
        source_session_id: execSid,
        target_file: 'output/dashboard/index.html',
        extra_blocks: extraBlocks,
        skipped_steps: [],
        rejected_adjustments: rejectedAdjustments,
        verify_session_id: execSid,
        auto_refresh: autoRefresh,
        schedule: scheduleConfig,
      }

      if (isUpdate) {
        body.workflow_id = updateMode.workflow_id
      }

      const result = await apiPost('/api/workflows', body)

      if (!aliveRef.current) return
      setWorkflowId(result.workflow_id)

      const wfId = result.workflow_id

      // Finalization (S3 archive + dashboard) runs in background.
      // Listen via Pusher + poll fallback for completion.
      const _onPublishComplete = (dashId) => {
        if (!aliveRef.current) return
        setDashboardId(dashId || (isUpdate ? updateMode.dashboard_id : null))
        const doneExecSid = execSessionIdRef.current
        execSessionIdRef.current = null
        agentRunningRef.current = false
        if (doneExecSid) {
          apiDelete(`/api/sessions/${doneExecSid}?archive=false`).catch(() => {})
        }
        setPhase(PHASE.DONE)
        setPhaseMessage(isUpdate ? 'Dashboard updated successfully!' : 'Dashboard published successfully!')
        toast.success(isUpdate ? 'Dashboard updated!' : 'Dashboard published!')
      }

      // If no publish_dashboard block, finalization is instant (no S3/dashboard work)
      if (!publishDashboardEnabled) {
        _onPublishComplete(null)
        return
      }

      // Pusher: listen for workflow-published event
      const wfPusher = createPusher()
      wfPusher.connection.bind('connected', () => wfPusher.signin())
      const wfCh = wfPusher.subscribe(`workflow-${wfId}`)

      let publishResolved = false
      const _cleanup = () => {
        publishResolved = true
        wfCh.unbind_all()
        wfPusher.unsubscribe(`workflow-${wfId}`)
        wfPusher.disconnect()
        if (publishPollRef.current) { clearInterval(publishPollRef.current); publishPollRef.current = null }
      }

      wfCh.bind('workflow-published', (event) => {
        if (publishResolved) return
        _cleanup()
        _onPublishComplete(event?.dashboard_id)
      })

      // Polling fallback: check every 10s
      publishPollRef.current = setInterval(async () => {
        if (publishResolved || !aliveRef.current) {
          clearInterval(publishPollRef.current)
          publishPollRef.current = null
          return
        }
        try {
          const status = await apiGet(`/api/workflows/${wfId}/publish-status`)
          if (status?.publish_complete) {
            _cleanup()
            _onPublishComplete(status.dashboard_id)
          }
        } catch { /* keep polling */ }
      }, 10000)
    } catch (e) {
      if (!aliveRef.current) return
      setPhase(PHASE.ERROR)
      setErrorMessage(`Failed to ${isUpdate ? 'update' : 'create'} workflow: ${e.message}`)
      toast.error(`Failed: ${e.message}`)
    }
  }, [sessionId, dashboardTitle, workflowName, dashboardMessage, includeDashboardLink, updateMode, autoRefresh,
      summaryEnabled, summaryToFolder, summaryFolder, newFolderName, aiPrompt, aiFilename, aiPreviewContent,
      slackEnabled, slackChannels, slackDmUsers,
      publishDashboardEnabled, recipe, hardeningStatus, adjustmentChecked,
      scheduleType, scheduleFrequency, scheduleDay, scheduleTime, scheduleTimezone])

  // ── Resume from draft ──
  const handleResumeDraft = useCallback(async () => {
    if (!draftInfo) return
    const draftRecipe = draftInfo.recipe
    if (!draftRecipe) { toast.error('Recipe not available. Please start fresh'); return }

    const execSid = draftInfo.exec_session_id
    const stepCount = draftRecipe.steps?.length || 0
    const stepsCompleted = draftInfo.steps_completed || 0
    const allStepsDone = stepsCompleted >= stepCount
    const hardeningEntries = Object.keys(draftInfo.hardening_status || {}).length
    const hardeningAllDone = allStepsDone && hardeningEntries > 0 && (draftInfo.hardening_pending || 0) === 0

    // Load state from draft
    setRecipe(draftRecipe)
    setTotalSteps(stepCount)
    setCompletedSteps(stepsCompleted)
    setStepResults(draftInfo.step_results || {})
    setHardeningStatus(draftInfo.hardening_status || {})
    // Transform raw diff strings from API to {diff, field, truncated} format
    const rawDiffs = draftInfo.diffs || {}
    const transformed = {}
    for (const [stepId, val] of Object.entries(rawDiffs)) {
      transformed[stepId] = typeof val === 'string'
        ? { diff: val, field: 'code', truncated: false }
        : val
    }
    setCodeDiffs(transformed)
    execSessionIdRef.current = execSid
    workflowCreatedRef.current = false
    setDraftInfo(null)

    // Case 1: Hardening fully complete — just show results, no backend call needed
    if (hardeningAllDone) {
      setHardeningPhase('complete')
      setReviewPassed(true)
      setPhase(PHASE.REVIEWED)
      return
    }

    // Case 2: Execution incomplete — show progress bar and resume from where it left off
    // Case 3: Execution done but hardening pending — backend will skip to hardening automatically
    if (!allStepsDone) {
      setPhase(PHASE.EXECUTING)
      setPhaseMessage('Resuming data pipeline checks...')
      progressMessagesRef.current = PROGRESS_MESSAGES_PUBLISH
      setProgressQuip(PROGRESS_MESSAGES_PUBLISH[0])
      quipIndexRef.current = 1
    } else {
      // All steps done, hardening pending/partial — enter hardening phase directly
      setPhase(PHASE.HARDENING)
      setHardeningPhase('running')
      setHardeningLoading(true)
    }

    try {
      // Call backend to resume — it picks up from where it left off
      agentRunningRef.current = true
      const skipHardening = !autoRefreshRef.current
      const startResult = await apiPost(`/api/sessions/${sessionId}/recipe/exec/start`, {
        exec_session_id: execSid,
        resume: true,
        skip_hardening: skipHardening,
      })

      // Agent already running (e.g. browser refresh) — sync current state then reconnect
      let reconnectSyncSteps = null
      if (startResult.status === 'already_running') {
        try {
          const sync = await apiGet(
            `/api/sessions/${sessionId}/recipe/exec/sync?exec_session_id=${encodeURIComponent(execSid)}&source=disk`
          )
          if (sync?.steps && aliveRef.current) {
            reconnectSyncSteps = sync.steps
            let doneCount = 0
            for (const s of sync.steps) {
              if (s.status === 'success' || s.status === 'completed' || s.status === 'skipped') doneCount++
            }
            setCompletedSteps(doneCount)
            setHardeningStatus(prev => {
              const updated = { ...prev }
              for (const s of sync.steps) {
                if (s.hardening_status && s.hardening_status !== 'pending') {
                  updated[s.id] = { status: s.hardening_status, reason: s.hardening_reason || '' }
                }
              }
              return updated
            })
          }
        } catch {}

        if (startResult.phase === 'hardening') {
          setPhase(PHASE.HARDENING)
          setHardeningPhase('running')
          setHardeningLoading(true)
          try {
            const freshRecipe = await apiPost(
              `/api/sessions/${sessionId}/recipe?target_file=${encodeURIComponent('output/dashboard/index.html')}&ai_mode=true`,
              {}
            )
            if (freshRecipe?.recipe && aliveRef.current) setRecipe(freshRecipe.recipe)
          } catch {}
          if (aliveRef.current) setHardeningLoading(false)
        } else {
          setPhase(PHASE.EXECUTING)
          setPhaseMessage('Reconnecting to review in progress...')
        }
      }

      // Re-fetch recipe for code-to-English summaries if entering hardening
      if (startResult.status !== 'already_running' && allStepsDone) {
        try {
          const freshRecipe = await apiPost(
            `/api/sessions/${sessionId}/recipe?target_file=${encodeURIComponent('output/dashboard/index.html')}&ai_mode=true`,
            {}
          )
          if (freshRecipe?.recipe && aliveRef.current) setRecipe(freshRecipe.recipe)
        } catch {}
        if (aliveRef.current) setHardeningLoading(false)
      }

      if (!aliveRef.current) return

      // Subscribe to Pusher events — same as handleStartVerification
      const execPusher = createPusher()
      execPusher.connection.bind('connected', () => execPusher.signin())
      const ch = execPusher.subscribe(startResult.channel)
      pusherRef.current = execPusher

      const doneSet = new Set()
      // Pre-populate doneSet with already completed steps
      if (reconnectSyncSteps) {
        for (const s of reconnectSyncSteps) {
          if (s.status === 'success' || s.status === 'completed' || s.status === 'skipped') doneSet.add(s.id)
        }
      } else {
        for (const [sid, r] of Object.entries(draftInfo.step_results || {})) {
          if (r.status === 'success' || r.status === 'skipped') doneSet.add(sid)
        }
      }

      const markDone = (stepId) => {
        if (!stepId || doneSet.has(stepId)) return
        doneSet.add(stepId)
        setCompletedSteps(doneSet.size)
        setProgressQuip(progressMessagesRef.current[quipIndexRef.current % progressMessagesRef.current.length])
        quipIndexRef.current++
      }

      ch.bind('step-success', (data) => {
        if (!aliveRef.current) return
        markDone(data.step_id)
        setStepResults(prev => ({
          ...prev,
          [data.step_id]: {
            step_id: data.step_id, status: 'success',
            duration_s: data.duration_s, output_files: data.output_files || [],
          },
        }))
      })

      ch.bind('step-result', (data) => {
        if (!aliveRef.current) return
        if (data.status === 'success' || data.status === 'skipped') markDone(data.step_id)
        setStepResults(prev => ({ ...prev, [data.step_id]: data }))
      })

      ch.bind('step-marked', (data) => {
        if (!aliveRef.current) return
        if (data.status === 'completed' || data.status === 'skipped') markDone(data.step_id)
        const status = data.status === 'completed' ? 'success' : data.status === 'skipped' ? 'skipped' : 'failed'
        setStepResults(prev => {
          const existing = prev[data.step_id] || {}
          if (existing.status === 'success') return prev
          const result = { ...existing, step_id: data.step_id, status }
          if (data.reason) result.skip_reason = data.reason
          return { ...prev, [data.step_id]: result }
        })
      })

      ch.bind('step-diff', (data) => {
        if (!aliveRef.current) return
        setCodeDiffs(prev => ({
          ...prev,
          [data.step_id]: { diff: data.diff, field: data.field, truncated: data.diff_truncated },
        }))
      })

      const cleanupPusher = () => {
        ch.unbind_all()
        execPusher.unsubscribe(startResult.channel)
        execPusher.disconnect()
        pusherRef.current = null
        agentRunningRef.current = false
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      }

      ch.bind('all-complete', async () => {
        if (!aliveRef.current) return
        setCompletedSteps(stepCount)
        if (autoRefreshRef.current) {
          setPhase(PHASE.HARDENING)
          setHardeningPhase('running')
          setHardeningLoading(true)
          try {
            const freshRecipe = await apiPost(
              `/api/sessions/${sessionId}/recipe?target_file=${encodeURIComponent('output/dashboard/index.html')}&ai_mode=true`,
              {}
            )
            if (freshRecipe?.recipe && aliveRef.current) setRecipe(freshRecipe.recipe)
          } catch {}
          if (aliveRef.current) setHardeningLoading(false)
        } else {
          // One-time: review passed — advance to confirm, don't auto-publish.
          cleanupPusher()
          setReviewPassed(true)
          setPhase(PHASE.REVIEWED)
        }
      })

      ch.bind('hardening-started', () => {
        if (!aliveRef.current) return
        setPhase(PHASE.HARDENING)
        setHardeningPhase('running')
      })

      ch.bind('step-reviewing', (data) => {
        if (!aliveRef.current) return
        setHardeningStatus(prev => ({ ...prev, [data.step_id]: { status: 'reviewing', reason: '' } }))
      })

      ch.bind('step-hardened', (data) => {
        if (!aliveRef.current) return
        setHardeningStatus(prev => ({ ...prev, [data.step_id]: { status: data.status, reason: data.reason || '' } }))
      })

      ch.bind('hardening-complete', () => {
        if (!aliveRef.current) return
        setHardeningPhase('complete')
        setReviewPassed(true)
        setPhase(PHASE.REVIEWED)
        cleanupPusher()
      })

      ch.bind('hardening-error', () => {
        if (!aliveRef.current) return
        setHardeningPhase('complete')
        cleanupPusher()
      })

      ch.bind('exec-error', (data) => {
        if (!aliveRef.current) return
        cleanupPusher()
        setPhase(PHASE.ERROR)
        setErrorMessage(data?.error || 'Execution failed')
      })

      ch.bind('exec-blocked', (data) => {
        if (!aliveRef.current) return
        cleanupPusher()
        setPhase(PHASE.ERROR)
        setErrorMessage(data?.message || data?.reason || 'Execution blocked')
      })

      ch.bind('agent-cancelled', () => {
        if (!aliveRef.current) return
        cleanupPusher()
        setPhase(PHASE.ERROR)
        setErrorMessage('Review was cancelled')
      })

    } catch (e) {
      agentRunningRef.current = false
      if (!aliveRef.current) return
      setPhase(PHASE.ERROR)
      setErrorMessage('Failed to resume: ' + (e.message || 'Unknown error'))
      toast.error('Failed to resume: ' + e.message)
    }
  }, [draftInfo, sessionId, autoRefresh, createPusher, createWorkflow])

  // ── Discard draft and start fresh ──
  const handleDiscardDraft = useCallback(async () => {
    if (draftInfo?.exec_session_id) {
      try { await apiDelete(`/api/sessions/${draftInfo.exec_session_id}?archive=false`) } catch {}
    }
    setDraftInfo(null)
  }, [draftInfo])

  // ── Main flow: Start Review ──
  const handleStartVerification = useCallback(async () => {
    if (!sessionId) return
    workflowCreatedRef.current = false
    setReviewPassed(false)
    setReviewStale(false)
    setAdjustmentsRevealed(false)
    setUnappliedAdjustments([])
    setUnappliedSelected({})
    if (unappliedKey) { try { localStorage.removeItem(unappliedKey) } catch { /* ignore */ } }
    setPhase(PHASE.EXTRACTING)
    setPhaseMessage('Analyzing your dashboard...')
    setCompletedSteps(0)
    setTotalSteps(0)
    setStepResults({})
    setHardeningStatus({})
    setCodeDiffs({})
    setHardeningPhase(null)
    setSelectedOutput(null)
    setShowAdjustments(false)
    progressMessagesRef.current = PROGRESS_MESSAGES_PUBLISH
    setProgressQuip(PROGRESS_MESSAGES_PUBLISH[0])
    quipIndexRef.current = 1
    setErrorMessage('')

    try {
      // Step 1: Delete any stale draft
      try {
        const draftResult = await apiGet(`/api/sessions/${sessionId}/recipe/exec/draft`)
        if (draftResult?.has_draft && draftResult.exec_session_id) {
          await apiDelete(`/api/sessions/${draftResult.exec_session_id}?archive=false`)
        }
      } catch { /* no draft — fine */ }

      // Step 2: Extract recipe
      const recipeResult = await apiPost(
        `/api/sessions/${sessionId}/recipe?target_file=${encodeURIComponent('output/dashboard/index.html')}&ai_mode=true`,
        {}
      )
      if (!recipeResult?.recipe) {
        throw new Error('No recipe steps found. Ensure the session has completed tool calls.')
      }
      const extractedRecipe = recipeResult.recipe
      const stepCount = extractedRecipe.steps?.length || 0
      setTotalSteps(stepCount)
      setRecipe(extractedRecipe)

      if (!aliveRef.current) return

      // Step 3: Init exec session
      setPhase(PHASE.PREPARING)
      setPhaseMessage('Setting up verification environment...')

      const execResult = await apiPost(
        `/api/sessions/${sessionId}/recipe/exec/init`,
        { recipe: extractedRecipe, model: 'claude-sonnet-4-6' }
      )
      const execSid = execResult.exec_session_id
      execSessionIdRef.current = execSid
      const execChannel = execResult.channel

      if (!aliveRef.current) return

      // Step 4: Wait for exec-ready (or proceed if already ready)
      const startExecution = async () => {
        if (!aliveRef.current) return
        setPhase(PHASE.EXECUTING)
        setPhaseMessage('Running data pipeline checks...')

        // When auto-refresh is on, run hardening after execution
        agentRunningRef.current = true
        const skipHardening = !autoRefreshRef.current
        const startResult = await apiPost(`/api/sessions/${sessionId}/recipe/exec/start`, {
          exec_session_id: execSid,
          resume: false,
          skip_hardening: skipHardening,
        })

        // Agent already running (e.g. browser refresh) — sync counts then reconnect
        let reconnectSyncSteps2 = null
        if (startResult.status === 'already_running') {
          try {
            const sync = await apiGet(
              `/api/sessions/${sessionId}/recipe/exec/sync?exec_session_id=${encodeURIComponent(execSid)}&source=disk`
            )
            if (sync?.steps && aliveRef.current) {
              reconnectSyncSteps2 = sync.steps
              let doneCount = 0
              for (const s of sync.steps) {
                if (s.status === 'success' || s.status === 'completed' || s.status === 'skipped') doneCount++
              }
              setCompletedSteps(doneCount)
              setHardeningStatus(prev => {
                const updated = { ...prev }
                for (const s of sync.steps) {
                  if (s.hardening_status && s.hardening_status !== 'pending') {
                    updated[s.id] = { status: s.hardening_status, reason: s.hardening_reason || '' }
                  }
                }
                return updated
              })
            }
          } catch {}

          if (startResult.phase === 'hardening') {
            setPhase(PHASE.HARDENING)
            setHardeningPhase('running')
          } else {
            setPhaseMessage('Reconnecting to review in progress...')
          }
        }

        // Subscribe to execution events on the channel
        const execPusher = createPusher()
        execPusher.connection.bind('connected', () => execPusher.signin())
        const ch = execPusher.subscribe(startResult.channel)
        pusherRef.current = execPusher

        const doneSet = new Set()
        if (reconnectSyncSteps2) {
          for (const s of reconnectSyncSteps2) {
            if (s.status === 'success' || s.status === 'completed' || s.status === 'skipped') doneSet.add(s.id)
          }
        }
        const markDone = (stepId) => {
          if (!stepId || doneSet.has(stepId)) return
          doneSet.add(stepId)
          setCompletedSteps(doneSet.size)
          setProgressQuip(progressMessagesRef.current[quipIndexRef.current % progressMessagesRef.current.length])
          quipIndexRef.current++
        }

        // Track step results for hardening view
        ch.bind('step-success', (data) => {
          if (!aliveRef.current) return
          markDone(data.step_id)
          setStepResults(prev => ({
            ...prev,
            [data.step_id]: {
              step_id: data.step_id,
              status: 'success',
              duration_s: data.duration_s,
              output_files: data.output_files || [],
            },
          }))
        })

        ch.bind('step-result', (data) => {
          if (!aliveRef.current) return
          if (data.status === 'success' || data.status === 'skipped') markDone(data.step_id)
          setStepResults(prev => ({ ...prev, [data.step_id]: data }))
        })

        ch.bind('step-marked', (data) => {
          if (!aliveRef.current) return
          if (data.status === 'completed' || data.status === 'skipped') markDone(data.step_id)
          const status = data.status === 'completed' ? 'success'
            : data.status === 'skipped' ? 'skipped' : 'failed'
          setStepResults(prev => {
            const existing = prev[data.step_id] || {}
            if (existing.status === 'success') return prev
            const result = { ...existing, step_id: data.step_id, status }
            if (data.reason) result.skip_reason = data.reason
            return { ...prev, [data.step_id]: result }
          })
        })

        // Step diffs (code changes by agent during execution or hardening)
        ch.bind('step-diff', (data) => {
          if (!aliveRef.current) return
          setCodeDiffs(prev => ({
            ...prev,
            [data.step_id]: { diff: data.diff, field: data.field, truncated: data.diff_truncated },
          }))
        })

        const cleanupPusher = () => {
          ch.unbind_all()
          execPusher.unsubscribe(startResult.channel)
          execPusher.disconnect()
          pusherRef.current = null
          agentRunningRef.current = false
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
        }

        ch.bind('all-complete', async () => {
          if (!aliveRef.current) return
          setCompletedSteps(stepCount)
          if (autoRefreshRef.current) {
            setPhase(PHASE.HARDENING)
            setHardeningPhase('running')
            setHardeningLoading(true)
            try {
              const freshRecipe = await apiPost(
                `/api/sessions/${sessionId}/recipe?target_file=${encodeURIComponent('output/dashboard/index.html')}&ai_mode=true`,
                {}
              )
              if (freshRecipe?.recipe && aliveRef.current) {
                setRecipe(freshRecipe.recipe)
              }
            } catch {}
            if (aliveRef.current) setHardeningLoading(false)
          } else {
            // One-time: review passed — advance to confirm, don't auto-publish.
            cleanupPusher()
            setReviewPassed(true)
            setPhase(PHASE.REVIEWED)
          }
        })

        ch.bind('hardening-started', () => {
          if (!aliveRef.current) return
          setPhase(PHASE.HARDENING)
          setHardeningPhase('running')
        })

        ch.bind('step-reviewing', (data) => {
          if (!aliveRef.current) return
          setHardeningStatus(prev => ({
            ...prev,
            [data.step_id]: { status: 'reviewing', reason: '' },
          }))
        })

        ch.bind('step-hardened', (data) => {
          if (!aliveRef.current) return
          setHardeningStatus(prev => ({
            ...prev,
            [data.step_id]: { status: data.status, reason: data.reason || '' },
          }))
        })

        ch.bind('hardening-complete', () => {
          if (!aliveRef.current) return
          setHardeningPhase('complete')
          setReviewPassed(true)
          setPhase(PHASE.REVIEWED)
          cleanupPusher()
        })

        ch.bind('hardening-error', () => {
          if (!aliveRef.current) return
          setHardeningPhase('complete')
          setReviewPassed(true)
          setPhase(PHASE.REVIEWED)
          cleanupPusher()
        })

        ch.bind('exec-error', (data) => {
          if (!aliveRef.current) return
          cleanupPusher()
          setPhase(PHASE.ERROR)
          setErrorMessage(data?.error || 'Recipe execution failed')
        })

        ch.bind('exec-blocked', (data) => {
          if (!aliveRef.current) return
          cleanupPusher()
          setPhase(PHASE.ERROR)
          setErrorMessage(data?.message || data?.reason || 'Execution blocked: infrastructure error')
        })

        ch.bind('agent-cancelled', () => {
          if (!aliveRef.current) return
          cleanupPusher()
          if (hardeningPhase === 'running') {
            setHardeningPhase('complete')
          } else {
            setPhase(PHASE.ERROR)
            setErrorMessage('Verification was cancelled')
          }
        })

        // Polling fallback (every 30s)
        pollRef.current = setInterval(async () => {
          try {
            const sync = await apiGet(
              `/api/sessions/${sessionId}/recipe/exec/sync?exec_session_id=${encodeURIComponent(execSid)}`
            )
            if (!aliveRef.current) return

            // Sync step results
            if (sync.steps) {
              for (const s of sync.steps) {
                if (s.status === 'success' || s.status === 'completed' || s.status === 'skipped') {
                  markDone(s.id || s.step_id)
                }
              }
              // Sync step results for hardening view
              setStepResults(prev => {
                const updated = { ...prev }
                for (const step of sync.steps) {
                  if (updated[step.id]?.status === 'success') continue
                  const status = step.status === 'completed' ? 'success'
                    : step.status === 'skipped' ? 'skipped'
                    : step.status === 'failed' ? 'failed' : null
                  if (status) {
                    updated[step.id] = { ...updated[step.id], step_id: step.id, status }
                    if (step.skip_reason) updated[step.id].skip_reason = step.skip_reason
                    if (step.output_files) updated[step.id].output_files = step.output_files
                  }
                }
                return updated
              })
              // Sync hardening statuses
              setHardeningStatus(prev => {
                const updated = { ...prev }
                for (const step of sync.steps) {
                  if (step.hardening_status && step.hardening_status !== 'pending') {
                    updated[step.id] = { status: step.hardening_status, reason: step.hardening_reason || '' }
                  }
                }
                return updated
              })
            }
            // Sync code diffs
            if (sync.diffs && Object.keys(sync.diffs).length > 0) {
              setCodeDiffs(prev => {
                const updated = { ...prev }
                for (const [stepId, diff] of Object.entries(sync.diffs)) {
                  if (!updated[stepId]) updated[stepId] = { diff, field: 'code', truncated: false }
                }
                return updated
              })
            }

            if (sync.status === 'hardening') {
              setPhase(PHASE.HARDENING)
              setHardeningPhase('running')
            } else if (sync.status === 'success' || sync.status === 'incomplete') {
              cleanupPusher()
              setCompletedSteps(stepCount)
              if (autoRefreshRef.current && phase !== PHASE.HARDENING) {
                setHardeningPhase('complete')
              }
              // Review passed (either path) → advance to confirm, don't auto-publish.
              setReviewPassed(true)
              setPhase(PHASE.REVIEWED)
            }
          } catch { /* ignore poll errors */ }
        }, 30000)
      }

      if (execResult.status === 'preparing') {
        // Wait for exec-ready Pusher event
        const prepPusher = createPusher()
        prepPusher.connection.bind('connected', () => prepPusher.signin())
        const prepCh = prepPusher.subscribe(execChannel)
        pusherRef.current = prepPusher

        prepCh.bind('exec-ready', () => {
          prepCh.unbind_all()
          prepPusher.unsubscribe(execChannel)
          prepPusher.disconnect()
          pusherRef.current = null
          startExecution()
        })

        prepCh.bind('exec-error', (data) => {
          prepCh.unbind_all()
          prepPusher.disconnect()
          pusherRef.current = null
          setPhase(PHASE.ERROR)
          setErrorMessage('Workspace preparation failed: ' + (data?.error || 'Unknown error'))
        })
      } else {
        await startExecution()
      }

    } catch (e) {
      agentRunningRef.current = false
      if (!aliveRef.current) return
      setPhase(PHASE.ERROR)
      setErrorMessage(e.message || 'Verification failed')
      toast.error('Verification failed: ' + e.message)
    }
  }, [sessionId, createPusher, createWorkflow])

  // ── Render: existing workflow banner ──
  const renderExistingBanner = () => {
    if (existingLoading || !existingWorkflows?.length || isVerifying || phase === PHASE.DONE) return null

    const selectedWf = updateMode && updateMode.workflow_id ? updateMode : null

    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 mb-4">
        <div className="flex items-start gap-3">
          <ArrowsClockwise size={16} weight="bold" className="text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] font-semibold text-amber-800 m-0">
                {existingWorkflows.length === 1
                  ? '1 existing dashboard is linked to this session'
                  : `${existingWorkflows.length} existing dashboards are linked to this session`}
              </p>
            </div>

            {selectedWf ? (
              <div className="flex items-center gap-1.5 mt-1.5">
                <PencilSimple size={10} weight="bold" className="text-amber-700 shrink-0" />
                <span className="text-[12px] text-amber-700 truncate font-medium">
                  Updating: {selectedWf.dashboard_name || selectedWf.name}
                </span>
              </div>
            ) : updateMode === false ? (
              <p className="text-[12px] text-amber-700 m-0 mt-1.5 font-medium">
                Creating new dashboard
              </p>
            ) : null}

            <div className="flex items-center gap-2 mt-2 relative">
              {/* Dropdown trigger for selecting which workflow to update */}
              <div className="relative">
                <button
                  onClick={() => setShowExistingDropdown(!showExistingDropdown)}
                  className={`text-[12px] font-medium px-2.5 py-1 rounded-md border cursor-pointer transition-colors ${
                    selectedWf
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  <PencilSimple size={10} weight="bold" className="inline mr-1" />
                  Update existing
                  {existingWorkflows.length > 1 && (
                    <span className="ml-1 opacity-70">({existingWorkflows.length})</span>
                  )}
                </button>

                {showExistingDropdown && (
                  <div className="absolute left-0 top-full mt-1 w-64 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-surface)] shadow-lg py-1 z-20">
                    <div className="px-3 py-1.5 text-[12px] font-semibold text-[var(--text-muted)] uppercase">
                      Select dashboard to update
                    </div>
                    {existingWorkflows.map((wf) => (
                      <button
                        key={wf.workflow_id}
                        onClick={() => { setUpdateMode(wf); setShowExistingDropdown(false) }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left border-none cursor-pointer transition-colors ${
                          selectedWf?.workflow_id === wf.workflow_id
                            ? 'bg-amber-50 text-amber-800'
                            : 'bg-transparent hover:bg-[var(--bg-hover)] text-[var(--text-primary)]'
                        }`}
                      >
                        <PencilSimple size={11} className="text-[var(--text-muted)] shrink-0" />
                        <span className="text-[12px] truncate" title={wf.dashboard_name || wf.name}>
                          {wf.dashboard_name || wf.name}
                        </span>
                        {selectedWf?.workflow_id === wf.workflow_id && (
                          <CheckCircle size={12} weight="fill" className="text-amber-600 shrink-0 ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => { setUpdateMode(false); setShowExistingDropdown(false) }}
                className={`text-[12px] font-medium px-2.5 py-1 rounded-md border cursor-pointer transition-colors ${
                  updateMode === false
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-100'
                }`}
              >
                Create new
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Render: verification progress section ──

  // ════════════════════════════════════════════════════════════════════
  //  Wizard render (Outputs → Frequency → Review → Confirm)
  // ════════════════════════════════════════════════════════════════════

  // ── Schedule controls (Step 2, recurring only) ──
  const renderScheduleControls = () => (
    <div className="mt-4 space-y-2.5 bg-white rounded-lg shadow-sm py-3 px-4">
      <p className="text-[12px] text-[var(--text-muted)] m-0 mb-2">This schedule applies to everything you publish.</p>
      <label className="flex items-start gap-2.5 cursor-pointer">
        <input type="radio" name="schedule-type" checked={scheduleType === 'data_sync'} onChange={() => setScheduleType('data_sync')} disabled={isAgentBusy} className="mt-0.5 w-3.5 h-3.5 accent-[var(--accent)] cursor-pointer" />
        <div className="flex-1 min-w-0">
          <span className="text-[12px] font-medium text-[var(--text-primary)] block">Every data sync</span>
          <span className="text-[12px] text-[var(--text-muted)] block">Refreshes whenever new data arrives</span>
        </div>
      </label>
      <label className="flex items-start gap-2.5 cursor-pointer">
        <input type="radio" name="schedule-type" checked={scheduleType === 'custom'} onChange={() => setScheduleType('custom')} disabled={isAgentBusy} className="mt-0.5 w-3.5 h-3.5 accent-[var(--accent)] cursor-pointer" />
        <div className="flex-1 min-w-0">
          <span className="text-[12px] font-medium text-[var(--text-primary)] block">Custom schedule</span>
          <span className="text-[12px] text-[var(--text-muted)] block">Pick your own frequency and time</span>
        </div>
      </label>
      {scheduleType === 'custom' && (
        <div className="ml-6 space-y-2">
          <div className="flex flex-wrap gap-2">
            <CustomSelect value={scheduleFrequency} onChange={(v) => { setScheduleFrequency(v); if (v === 'monthly') setScheduleDay('1'); else if (v === 'daily') setScheduleDay(''); else setScheduleDay('1') }} options={[{ value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }, { value: 'biweekly', label: 'Biweekly' }, { value: 'monthly', label: 'Monthly' }]} className="flex-1 min-w-[80px]" />
            {scheduleFrequency !== 'daily' && (
              <CustomSelect value={scheduleDay} onChange={setScheduleDay} options={scheduleFrequency === 'monthly' ? Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1), label: `Day ${i + 1}` })) : DAYS_OF_WEEK} className="flex-1 min-w-[90px]" />
            )}
            <CustomSelect value={scheduleTime} onChange={setScheduleTime} options={TIME_OPTIONS} className="flex-1 min-w-[80px]" />
          </div>
          <CustomSelect value={scheduleTimezone} onChange={setScheduleTimezone} options={COMMON_TIMEZONES.map(tz => ({ value: tz, label: tz.replace(/_/g, ' ') }))} className="w-full" />
        </div>
      )}
    </div>
  )

  // ── Reusable iOS-style toggle switch ──
  const ToggleSwitch = ({ on, color = 'var(--accent)' }) => (
    <div className="shrink-0 w-9 h-5 rounded-full transition-colors relative" style={{ backgroundColor: on ? color : 'var(--border-primary)' }}>
      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </div>
  )

  // ── Dashboard mark (the grid logo) ──
  const DashboardMark = ({ size = 20, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true"><path d="M7.75 1.75H3.25C2.85218 1.75 2.47064 1.90804 2.18934 2.18934C1.90804 2.47064 1.75 2.85218 1.75 3.25V9.25C1.75 9.64782 1.90804 10.0294 2.18934 10.3107C2.47064 10.592 2.85218 10.75 3.25 10.75H7.75C8.14782 10.75 8.52936 10.592 8.81066 10.3107C9.09196 10.0294 9.25 9.64782 9.25 9.25V3.25C9.25 2.85218 9.09196 2.47064 8.81066 2.18934C8.52936 1.90804 8.14782 1.75 7.75 1.75ZM7.75 9.25H3.25V3.25H7.75V9.25ZM16.75 1.75H12.25C11.8522 1.75 11.4706 1.90804 11.1893 2.18934C10.908 2.47064 10.75 2.85218 10.75 3.25V6.25C10.75 6.64782 10.908 7.02936 11.1893 7.31066C11.4706 7.59196 11.8522 7.75 12.25 7.75H16.75C17.1478 7.75 17.5294 7.59196 17.8107 7.31066C18.092 7.02936 18.25 6.64782 18.25 6.25V3.25C18.25 2.85218 18.092 2.47064 17.8107 2.18934C17.5294 1.90804 17.1478 1.75 16.75 1.75ZM16.75 6.25H12.25V3.25H16.75V6.25ZM7.75 12.25H3.25C2.85218 12.25 2.47064 12.408 2.18934 12.6893C1.90804 12.9706 1.75 13.3522 1.75 13.75V16.75C1.75 17.1478 1.90804 17.5294 2.18934 17.8107C2.47064 18.092 2.85218 18.25 3.25 18.25H7.75C8.14782 18.25 8.52936 18.092 8.81066 17.8107C9.09196 17.5294 9.25 17.1478 9.25 16.75V13.75C9.25 13.3522 9.09196 12.9706 8.81066 12.6893C8.52936 12.408 8.14782 12.25 7.75 12.25ZM7.75 16.75H3.25V13.75H7.75V16.75ZM16.75 9.25H12.25C11.8522 9.25 11.4706 9.40804 11.1893 9.68934C10.908 9.97064 10.75 10.3522 10.75 10.75V16.75C10.75 17.1478 10.908 17.5294 11.1893 17.8107C11.4706 18.092 11.8522 18.25 12.25 18.25H16.75C17.1478 18.25 17.5294 18.092 17.8107 17.8107C18.092 17.5294 18.25 17.1478 18.25 16.75V10.75C18.25 10.3522 18.092 9.97064 17.8107 9.68934C17.5294 9.40804 17.1478 9.25 16.75 9.25ZM16.75 16.75H12.25V10.75H16.75V16.75Z"/></svg>
  )

  // ── Slack message mockup — this IS the output that gets posted ──
  const renderSummaryPreview = () => {
    return (
      <div className="rounded-lg border border-[var(--border-primary)] bg-white overflow-hidden">
        <div className="p-3 flex gap-2.5">
          <div className="shrink-0 w-9 h-9 rounded-md bg-[var(--accent)] flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M17 19.0549C20.075 19.0549 22.5678 16.4832 22.5678 13.3107C22.5678 10.1382 20.075 7.56641 17 7.56641C13.925 7.56641 11.4322 10.1382 11.4322 13.3107V16.0279C11.4322 16.3117 11.3085 16.5803 11.0954 16.7597L8.37343 19.0501C8.22397 19.1758 8 19.0661 8 18.8671V13.3107C8 8.18258 12.0294 4.02543 17 4.02543C21.9706 4.02543 26 8.18258 26 13.3107C26 18.4388 21.9706 22.5959 17 22.5959C16.4627 22.5959 15.9363 22.5474 15.4249 22.4542C15.2898 22.4296 15.1504 22.4646 15.0443 22.5542L8.74733 27.867C8.44852 28.1191 8 27.8998 8 27.5015V24.0129C8 23.942 8.03092 23.8748 8.0842 23.8301L11.4322 21.0129V21.0274L12.8715 19.8131C13.7856 19.0419 14.9463 18.7713 16.0215 18.9671C16.3368 19.0246 16.6636 19.0549 17 19.0549Z" fill="#fff" /></svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[12px] font-semibold text-[#1d1c1d]">Petavue</span>
              <span className="text-[12px] font-semibold uppercase bg-[var(--bg-hover)] text-[var(--text-muted)] px-1 rounded">App</span>
              <span className="text-[12px] text-[var(--text-muted)]">now</span>
            </div>
            <div className="text-[12px] text-[#1d1c1d] leading-relaxed">
              {aiPreviewContent
                ? <MarkdownRenderer content={aiPreviewContent} />
                : <span className="text-[var(--text-muted)]">Generate the summary to preview it.</span>}
            </div>
            {includeDashboardLink && <span className="inline-block mt-1.5 text-[12px] text-[#1264a3] font-medium">View dashboard →</span>}
          </div>
        </div>
      </div>
    )
  }

  // Restore the "Test alert" button — fires a one-off Slack notification.
  const handleSlackTest = async () => {
    setSlackTestSending(true)
    try {
      await apiPost(`/api/sessions/${sessionId}/slack-test`, { exec_session_id: execSessionIdRef.current, channels: slackChannels, dm_users: slackDmUsers, content: aiPreviewContent || null })
      toast.success('Test alert sent!')
    } catch (e) {
      toast.error(e.message || 'Failed to send test alert')
    } finally {
      setSlackTestSending(false)
    }
  }

  // ── Summary — authoring + preview, then a fan-out to its destinations
  // (a folder file and/or a Slack alert). The summary is decoupled from Slack. ──
  const renderSummaryBlock = () => {
    const slackHasTarget = slackChannels.length > 0 || slackDmUsers.length > 0
    return (
      <div className="flex flex-col gap-4">
        {/* Authoring (left) + live preview (right) */}
        <div className="flex gap-4">
          <div className="flex-1 min-w-0">
            <label className="text-[12px] font-medium text-[var(--text-secondary)] block mb-1.5">Summary prompt</label>
            <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="What should the summary cover? e.g. true ROAS by channel, this week's spend move, ICP accounts to call" rows={4} disabled={aiPreviewRunning} className="w-full text-[12px] border border-[var(--border-primary)] rounded-lg px-3 py-2 outline-none resize-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)] bg-[var(--bg-primary)] focus:border-[var(--accent)] transition-colors disabled:opacity-60" />
            <PvButton variant="primary" size="md" className="mt-2 w-full" label={aiPreviewRunning ? 'Generating…' : aiPreviewContent ? 'Regenerate' : 'Generate summary'} icon={aiPreviewRunning ? SpinnerIcon : aiPreviewContent ? ArrowsClockwise : Sparkle} iconWeight={aiPreviewContent && !aiPreviewRunning ? 'bold' : 'fill'} disabled={aiPreviewRunning || !aiPrompt.trim()} onClick={handleAiPreview} />
            {aiPreviewError && <p className="text-[12px] text-red-500 m-0 mt-1.5">{aiPreviewError}</p>}
          </div>
          <div className="flex-1 min-w-0 flex flex-col rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)]/40 overflow-hidden min-h-[160px]">
            <div className="px-3.5 py-2.5 border-b border-[var(--border-primary)] shrink-0">
              <span className="text-[14px] font-semibold text-[var(--text-primary)]">Preview</span>
            </div>
            <div className="p-3.5 h-[400px] overflow-y-auto">
              {renderSummaryPreview()}
            </div>
          </div>
        </div>

        {/* Destinations — revealed once the first summary is generated */}
        {aiPreviewContent && (
        <div className="pt-3 border-t border-[var(--border-primary)]">
          <p className="text-[12px] font-medium text-[var(--text-secondary)] m-0 mb-2.5">What do you want to do with this summary?<span className="text-[var(--accent)] ml-0.5">*</span></p>
          <div className="relative">
            {/* branch spine */}
            <div className="absolute left-[8px] top-0 bottom-5 w-px bg-[var(--border-primary)]" aria-hidden="true" />

            {/* Folder destination */}
            <div className="relative pl-7 pb-3">
              <div className="absolute left-[8px] top-[15px] w-4 h-px bg-[var(--border-primary)]" aria-hidden="true" />
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={summaryToFolder} onChange={() => setSummaryToFolder(v => !v)} className="w-3.5 h-3.5 accent-[var(--accent)] shrink-0 mt-0.5 cursor-pointer" />
                <div className="flex-1 min-w-0">
                  <span className="block text-[12px] font-medium text-[var(--text-primary)]">Save to a folder</span>
                  <span className="block text-[12px] text-[var(--text-muted)] leading-snug mt-0.5">Keep it in a folder so your team and AI assistants can pick it up anytime.</span>
                </div>
              </label>
              {summaryToFolder && (
                <div className="mt-2.5 pl-6 space-y-2">
                  <div className="flex items-end gap-2 flex-wrap">
                    <div className="flex flex-col gap-1">
                      <span className="text-[12px] font-medium text-[var(--text-muted)]">Folder</span>
                      <CustomSelect
                        value={summaryFolder}
                        onChange={setSummaryFolder}
                        options={[...folders.map(f => ({ value: f, label: f })), { value: NEW_FOLDER, label: '+ Create new folder…' }]}
                        className="w-44"
                      />
                    </div>
                    {summaryFolder === NEW_FOLDER && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[12px] font-medium text-[var(--text-muted)]">New folder name</span>
                        <input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="e.g. weekly-reports" className="w-44 text-[14px] border border-[var(--border-primary)] rounded-lg px-3 py-2 outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)] bg-[var(--bg-primary)] focus:border-[var(--accent)] transition-colors" />
                      </div>
                    )}
                    <div className="flex flex-col gap-1">
                      <span className="text-[12px] font-medium text-[var(--text-muted)]">File name</span>
                      <input value={aiFilename} onChange={(e) => setAiFilename(e.target.value)} placeholder="File name" className="w-40 text-[14px] border border-[var(--border-primary)] rounded-lg px-3 py-2 outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)] bg-[var(--bg-primary)] focus:border-[var(--accent)] transition-colors" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Slack destination */}
            <div className="relative pl-7">
              <div className="absolute left-[8px] top-[15px] w-4 h-px bg-[var(--border-primary)]" aria-hidden="true" />
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={slackEnabled} onChange={() => setSlackEnabled(v => !v)} className="w-3.5 h-3.5 accent-[var(--accent)] shrink-0 mt-0.5 cursor-pointer" />
                <div className="flex-1 min-w-0">
                  <span className="block text-[12px] font-medium text-[var(--text-primary)]">Send to Slack</span>
                  <span className="block text-[12px] text-[var(--text-muted)] leading-snug mt-0.5">Send it to a channel or teammates every time the data refreshes.</span>
                </div>
              </label>
              {slackEnabled && (
                <div className="mt-2.5 pl-6 space-y-2.5">
                  <SlackChannelPicker selectedChannels={slackChannels} onChannelsChange={setSlackChannels} selectedDmUsers={slackDmUsers} onDmUsersChange={setSlackDmUsers} disabled={false} />
                  <PvButton variant="blueGhost" size="sm" label={slackTestSending ? 'Sending…' : 'Test alert'} icon={slackTestSending ? SpinnerIcon : Play} iconWeight="fill" disabled={slackTestSending || !slackHasTarget} title={slackHasTarget ? 'Send a one-off test alert now' : 'Pick a channel or person first'} onClick={handleSlackTest} />
                  {slackTargetError && !slackHasTarget && (
                    <p className="text-[12px] text-amber-600 m-0">Select at least one channel or direct message to continue.</p>
                  )}
                </div>
              )}
            </div>
          </div>
          <div ref={summaryEndRef} aria-hidden="true" />
        </div>
        )}
      </div>
    )
  }

  // Consistent step header used across Verify/Publish steps.
  const stepHeader = (title, desc, tooltip, action) => (
    <div className="shrink-0 px-6 pt-4 pb-3 border-b border-[var(--border-primary)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-[16px] font-semibold text-[var(--text-primary)] m-0">{title}</h2>
            {tooltip && (
              <span className="relative inline-flex items-center group" aria-label={tooltip}>
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 256 256" className="text-[var(--text-muted)]"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-40a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40A8,8,0,0,1,144,176ZM112,84a12,12,0,1,1,12,12A12,12,0,0,1,112,84Z"></path></svg>
                <span role="tooltip" className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 z-20 w-max max-w-[240px] rounded-md bg-[#2D3044] text-white text-[12px] leading-snug px-2.5 py-1.5 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150">{tooltip}</span>
              </span>
            )}
          </div>
          {desc && <p className="text-[12px] text-[var(--text-muted)] mt-1 m-0 leading-relaxed">{desc}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  )

  // Reusable "Run review again" pill for the review headers.
  const runAgainBtn = (
    <PvButton variant="ghost" size="md" className="shrink-0" label="Run review again" icon={Play} iconWeight="fill" title="Discard this review and run it again" onClick={() => runReviewAgain()} />
  )

  // ── STEP — Workflow (new vs edit, first step) ──
  const isEditing = !!(updateMode && updateMode.workflow_id)
  const hasExisting = !!(existingWorkflows && existingWorkflows.length)
  const renderWorkflowStep = () => (
    <div className="min-h-full flex flex-col">
      {stepHeader('New workflow or edit an existing one?', 'A workflow is the automation: your metric, its schedule, and where the results go.')}
      <div className="flex-1 px-6 py-4 bg-[#FCFCFC]">
      <div className="flex gap-3 [&>button]:flex-1 [&>button]:min-w-0">
        <OutputCard
          radio
          active={!isEditing}
          onToggle={() => !isAgentBusy && setUpdateMode(false)}
          icon={<Plus size={20} weight="bold" className={!isEditing ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'} />}
          title="Create new workflow"
          desc="Set up a fresh automation for this dashboard."
        />
        <OutputCard
          radio
          active={isEditing}
          onToggle={() => { if (!isAgentBusy && hasExisting) setUpdateMode(existingWorkflows[0]) }}
          icon={<PencilSimple size={20} weight="duotone" className={isEditing ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'} />}
          title="Edit existing workflow"
          desc={hasExisting ? `${existingWorkflows.length} workflow${existingWorkflows.length !== 1 ? 's' : ''} linked to this dashboard.` : 'No existing workflows linked yet.'}
        />
      </div>

      {!isEditing ? (
        <div className="mt-5">
          <label className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-1.5">Workflow name</label>
          <input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            placeholder="e.g. Q2 Revenue, Weekly"
            className="w-full text-[14px] border border-[var(--border-primary)] rounded-lg px-3 py-2 outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)] bg-[var(--bg-primary)] focus:border-[var(--accent)] transition-colors"
          />
          <p className="text-[12px] text-[var(--text-muted)] mt-1.5">This names the automation, not the dashboard itself.</p>
        </div>
      ) : (
        <div className="mt-5">
          <label className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-1.5">Select Workflow</label>
          <CustomSelect
            value={updateMode.workflow_id}
            onChange={(id) => setUpdateMode(existingWorkflows.find((w) => w.workflow_id === id) || false)}
            options={existingWorkflows.map((w) => ({ value: w.workflow_id, label: w.name }))}
            className="w-full"
          />
          <p className="text-[12px] text-[var(--text-muted)] mt-1.5">Its outputs and schedule will pre-fill the next steps.</p>
        </div>
      )}
      </div>
    </div>
  )

  // ── STEP — Verify (per-widget review; first step) ──
  // Persist a widget's verified state (used by both the list and the detail view).
  const verifyWidget = async (widget, val) => {
    if (!widget) return
    try { await apiPost(`/api/sessions/${sessionId}/widgets/${widget.id}/verify`, { verified: val }) } catch { /* ignore */ }
    onWidgetVerified?.(widget.id, val)
  }
  const renderVerifyStep = () => (
    selectedWidget ? (
      <WidgetDetailView
        widget={selectedWidget}
        widgets={widgets}
        sessionId={sessionId}
        sessionStatus={sessionStatus}
        liveMessages={liveMessages}
        onSendFeedback={onSendFeedback}
        onBack={() => setSelectedWidget(null)}
        onNavigate={(w) => setSelectedWidget(w)}
        onVerified={onWidgetVerified}
        onBackToSession={() => onClose?.()}
        onContinueToPublish={() => { setSelectedWidget(null); setUserReviewDone(true); setVerifySubTab('agent') }}
        footerStart={renderVerifyStepNav()}
      />
    ) : (
      <WidgetListView
        widgets={widgets}
        widgetCount={widgets.length}
        verifiedCount={widgets.filter((w) => w.verified).length}
        onSelectWidget={(w) => setSelectedWidget(w)}
        onToggleVerified={(w) => verifyWidget(w, !w.verified)}
        onVerifyAll={() => widgets.filter((w) => !w.verified).forEach((w) => verifyWidget(w, true))}
        onContinueToPublish={() => { setUserReviewDone(true); setVerifySubTab('agent') }}
        onBack={() => onClose?.()}
        titleMissing={false}
        footerStart={renderVerifyStepNav()}
      />
    )
  )

  // ── STEP 1 — Outputs ──
  const OutputCard = ({ active, onToggle, icon, title, desc, radio }) => (
    <button type="button" onClick={onToggle} disabled={isAgentBusy} className={`w-full flex items-center gap-3.5 p-4 rounded-xl border text-left transition-colors cursor-pointer disabled:cursor-not-allowed ${active ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--border-primary)] bg-[var(--bg-primary)] hover:border-[var(--accent)]/40'}`}>
      <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${active ? 'bg-[var(--accent)]/10' : 'bg-[var(--bg-hover)]'}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <span className={`text-[14px] font-semibold block ${active ? 'text-[var(--text-primary)]' : 'text-[var(--text-primary)]'}`}>{title}</span>
        <span className="text-[12px] text-[var(--text-muted)] block mt-0.5 leading-relaxed">{desc}</span>
      </div>
      {radio ? (
        <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${active ? 'border-[var(--accent)]' : 'border-[var(--border-primary)]'}`}>
          {active && <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />}
        </div>
      ) : (
        <div className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${active ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--border-primary)]'}`}>
          {active && <CheckCircle size={14} weight="fill" className="text-white" />}
        </div>
      )}
    </button>
  )

  // ── STEP 1 — Outputs ──
  const renderOutputsStep = () => (
    <div className="h-full flex flex-col">
      {stepHeader('What do you want to publish?', 'Toggle on what you want. Set each one up right where you turn it on.')}
      <div className="flex-1 min-h-0 flex flex-col gap-4 px-6 py-4 overflow-y-auto [scrollbar-gutter:stable] bg-[#FCFCFC]">

        {/* Dashboard — toggle + its name field clubbed together */}
        <div className="shrink-0 bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => !isAgentBusy && setPublishDashboardEnabled(v => !v)}>
            <div className="shrink-0 w-9 h-9 rounded-lg bg-[var(--accent)]/8 flex items-center justify-center"><DashboardMark size={18} className={publishDashboardEnabled ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'} /></div>
            <div className="flex-1 min-w-0">
              <span className="text-[14px] font-semibold text-[#2D3044] block">Dashboard</span>
              <span className="text-[12px] text-[var(--text-muted)] block leading-snug">A live dashboard on your Dashboards page.</span>
            </div>
            <Toggle checked={publishDashboardEnabled} onChange={() => !isAgentBusy && setPublishDashboardEnabled(v => !v)} size="lg" />
          </div>
          <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${publishDashboardEnabled ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
            <div className="overflow-hidden">
              <div className="px-4 pb-3.5 pt-3 border-t border-[var(--border-primary)]">
                <input value={dashboardTitle} onChange={(e) => setDashboardTitle && setDashboardTitle(e.target.value)} placeholder="Name this dashboard…" className="w-full text-[14px] border border-[var(--border-primary)] rounded-lg px-3 py-2 outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)] bg-[var(--bg-primary)] focus:border-[var(--accent)] transition-colors" />
              </div>
            </div>
          </div>
        </div>

        {/* Summary — a first-class output that fans out to a folder and/or Slack */}
        {isPetavueUser && (
          <div className="shrink-0 bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 shrink-0 cursor-pointer" onClick={() => !isAgentBusy && setSummaryEnabled(v => !v)}>
              <div className="shrink-0 w-9 h-9 rounded-lg bg-[var(--accent)]/8 flex items-center justify-center"><Sparkle size={18} weight="fill" className={summaryEnabled ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'} /></div>
              <div className="flex-1 min-w-0">
                <span className="text-[14px] font-semibold text-[#2D3044] block">Summary</span>
                <span className="text-[12px] text-[var(--text-muted)] block leading-snug">An AI-written recap of your data, sent to a folder and/or Slack.</span>
              </div>
              <Toggle checked={summaryEnabled} onChange={() => !isAgentBusy && setSummaryEnabled(v => !v)} size="lg" />
            </div>
            <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${summaryEnabled ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
              <div className="overflow-hidden">
                <div className="px-4 pb-3.5 pt-3 border-t border-[var(--border-primary)]">
                  {renderSummaryBlock()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  // ── STEP 3 (final) — Schedule + publish / post-publish ──
  const renderFrequencyStep = () => {
    if (phase === PHASE.DONE) {
      return (
        <div className="flex flex-col items-center justify-center h-full px-6 py-8 gap-4">
          <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center"><CheckCircle size={32} weight="fill" className="text-green-500" /></div>
          <div className="text-center">
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)] m-0">{wasUpdate ? 'Dashboard updated!' : 'Dashboard published!'}</h3>
            <p className="text-[12px] text-[var(--text-muted)] mt-1">{completedSteps} checks passed{autoRefresh ? ` · ${scheduleSummary.toLowerCase()}` : ''}</p>
          </div>
          <PvButton variant="primary" size="md" label="View dashboard" onClick={() => { onClose?.(); if (dashboardId) navigate(`/dashboards/${dashboardId}`); else if (workflowId) navigate(`/workflows/${workflowId}`) }} />
        </div>
      )
    }
    if (isPublishing) {
      return (
        <div className="flex flex-col items-center justify-center h-full px-6 py-8 gap-3">
          <Spinner size={28} className="animate-spin text-[var(--accent)]" />
          <p className="text-[14px] font-medium text-[var(--text-primary)] m-0">{phaseMessage || (wasUpdate ? 'Updating your dashboard…' : 'Publishing your dashboard…')}</p>
        </div>
      )
    }
    return (
      <div className="min-h-full flex flex-col">
        {stepHeader('How often should this run?', 'The same schedule applies to everything you chose to publish.')}
        <div className="flex-1 px-6 py-4 bg-[#FCFCFC]">
          <div className="flex gap-3 [&>button]:flex-1 [&>button]:min-w-0">
            <OutputCard radio active={!autoRefresh} onToggle={() => !isReviewRunning && setAutoRefresh(false)} icon={<CheckCircle size={20} weight="duotone" className={!autoRefresh ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'} />} title="One time" desc="A snapshot from today's data. You can refresh it manually later." />
            <OutputCard radio active={autoRefresh} onToggle={() => !isReviewRunning && setAutoRefresh(true)} icon={<ArrowsClockwise size={20} weight="duotone" className={autoRefresh ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'} />} title="Recurring" desc="Refreshes automatically on a schedule, always up to date." />
          </div>
          {autoRefresh && isPetavueUser && renderScheduleControls()}
        </div>
      </div>
    )
  }

  // ── STEP 3 — Review (the mandatory gate) ──
  const renderReviewStep = () => {
    // The most recent user request — shown in the "changes detected" state so the
    // user can see what they last asked for and decide to review it.
    const lastUserMsg = [...(liveMessages || [])].reverse().find(m => (m.type === 'user' || m.role === 'user') && (m.text || '').trim())?.text?.trim()
    const reviewItems = [
      { active: 'Analyzing your dashboard', done: 'Analyzed your dashboard', phases: [PHASE.EXTRACTING, PHASE.PREPARING] },
      { active: 'Testing data sources & recomputing the numbers', done: 'Tested data sources & recomputed the numbers', phases: [PHASE.EXECUTING] },
    ]
    // Hardening ("Preparing for scheduled refresh") is shown as its own card
    // below the checklist — not as a checklist row.
    const order = [PHASE.EXTRACTING, PHASE.PREPARING, PHASE.EXECUTING, PHASE.HARDENING]
    const curIdx = order.indexOf(phase)
    const hardenedCount = Object.values(hardeningStatus || {}).filter(h => h && h.status && h.status !== 'pending').length

    return (
      <div className="min-h-full flex flex-col">
        {stepHeader(
          'Agentic Review',
          autoRefresh ? 'An AI agent will check your dashboard to ensure every refresh runs without issues.' : 'An AI agent will check your dashboard to ensure everything works correctly.',
          (!reviewPassed && phase !== PHASE.DONE) ? "Your dashboard can't be published until this review passes." : null,
        )}
        <div className="flex-1 px-6 py-4 bg-[#FCFCFC]">

        {phase === PHASE.ERROR ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-center gap-2.5">
              <XCircle size={20} weight="fill" className="text-red-500 shrink-0" />
              <h3 className="text-[14px] font-semibold text-red-700 m-0">We found a problem</h3>
            </div>
            <p className="text-[12px] text-red-700/90 mt-2 mb-1 leading-relaxed">{errorMessage}</p>
            <p className="text-[12px] text-red-700/70 m-0 mb-3">Fix this in your session, then run the review again.</p>
            <PvButton variant="primary" size="md" label="Run review again" icon={Play} iconWeight="fill" onClick={handleStartVerification} />
          </div>
        ) : (reviewPassed || isReviewRunning) ? (
          <div>
            {isReviewRunning && phase !== PHASE.HARDENING && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12px] font-medium text-[var(--text-secondary)]">{phase === PHASE.EXECUTING ? `${completedSteps} of ${totalSteps} checks done` : 'Getting started…'}</span>
                  {phase === PHASE.EXECUTING && totalSteps > 0 && <span className="text-[12px] font-semibold text-[var(--accent)]">{progressPct}%</span>}
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] overflow-hidden">
                  <div className="h-full rounded-full bg-green-500 transition-all duration-500 ease-out" style={{ width: phase === PHASE.EXECUTING && totalSteps > 0 ? `${progressPct}%` : '8%' }} />
                </div>
              </div>
            )}

            {/* Checklist — kept visible while running AND after the review passes */}
            <div className="space-y-3">
              {reviewItems.map((item, i) => {
                const itemIdx = Math.max(...item.phases.map(p => order.indexOf(p)))
                const isActive = !reviewPassed && item.phases.includes(phase)
                const isDone = reviewPassed || curIdx > itemIdx
                return (
                  <div key={i} className="flex items-center gap-3">
                    {isDone ? <CheckCircle size={16} weight="fill" className="text-green-500 shrink-0" /> : isActive ? <Spinner size={16} className="text-[var(--accent)] animate-spin shrink-0" /> : <CircleNotch size={16} className="text-[var(--text-muted)] shrink-0" />}
                    <span className={`text-[12px] flex-1 ${isDone ? 'text-green-600 font-medium' : isActive ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-muted)]'}`}>{isDone ? item.done : item.active}</span>
                  </div>
                )
              })}
            </div>
            {isReviewRunning && progressQuip && phase === PHASE.EXECUTING && <p key={progressQuip} className="text-[12px] text-[var(--text-muted)] mt-4 animate-fade-in">{progressQuip}</p>}

            {/* Hardening — its own card while preparing for scheduled refresh */}
            {isReviewRunning && phase === PHASE.HARDENING && (
              <div className="mt-5 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
                <h3 className="text-[14px] font-semibold text-[var(--text-primary)] m-0">Preparing for scheduled refresh</h3>
                <p className="text-[12px] text-[var(--text-muted)] mt-1.5 mb-3 leading-relaxed">An AI agent is preparing your dashboard to ensure every scheduled refresh runs without issues. This may take a few minutes.</p>
                <p className="text-[12px] font-semibold text-[var(--accent)] m-0">{hardenedCount} of {totalSteps} steps completed</p>
                {hardeningQuip && <p className="text-[12px] text-[var(--text-muted)] mt-3 m-0">{hardeningQuip}</p>}
              </div>
            )}

            {/* Review passed — a checklist row like the steps above, no box */}
            {reviewPassed && (
              <div className="mt-3">
                <div className="flex items-center gap-3">
                  <CheckCircle size={16} weight="fill" className="text-green-500 shrink-0" />
                  <span className="text-[12px] flex-1 text-green-600 font-medium">Review passed</span>
                </div>
                <p className="text-[12px] text-[var(--text-muted)] mt-1.5 ml-7 mb-0 leading-relaxed">
                  {autoRefresh
                    ? (adjustmentCount > 0
                        ? `Tested end-to-end and hardened. The agent fixed ${adjustmentCount} issue${adjustmentCount !== 1 ? 's' : ''} so it keeps running reliably on every scheduled refresh.`
                        : 'Tested end-to-end. It will keep running reliably on every scheduled refresh.')
                    : 'Tested end-to-end and ready to publish.'}
                </p>
              </div>
            )}
          </div>
        ) : draftLoading ? (
          <div className="py-6 flex items-center justify-center"><Spinner size={18} className="animate-spin text-[var(--text-muted)]" /></div>
        ) : draftInfo ? (
          <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-5">
            <p className="text-[14px] font-medium text-[var(--text-primary)] m-0">We found a previous review</p>
            {draftInfo.stale && <p className="text-[12px] text-amber-600 m-0 mt-1.5 leading-relaxed">You've changed things since this check. Resuming won't include your latest edits.</p>}
            <div className="flex items-center gap-4 mt-3">
              <button onClick={handleResumeDraft} className="inline-flex items-center gap-1.5 py-2 px-5 rounded-lg text-[12px] font-medium bg-[var(--accent)] text-white hover:opacity-90 transition-opacity cursor-pointer border-none">
                <Play size={13} weight="fill" />Resume review
              </button>
              <button onClick={() => { handleDiscardDraft(); handleStartVerification() }} className="text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer underline p-0">Start fresh instead</button>
            </div>
          </div>
        ) : reviewStale ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-center gap-2.5">
              <Warning size={20} weight="fill" className="text-amber-500 shrink-0" />
              <h3 className="text-[14px] font-semibold text-amber-800 m-0">Changes detected since your last review</h3>
            </div>
            <p className="text-[12px] text-amber-700 mt-2 mb-0 leading-relaxed">The dashboard has changed since the agent last reviewed it. Run the review again before you publish.</p>
            {lastUserMsg && (
              <div className="rounded-lg bg-white border border-amber-200/70 px-3 py-2.5 mt-3">
                <span className="block text-[12px] font-semibold text-amber-700/80 uppercase tracking-wide mb-1">Your last request</span>
                <p className="text-[12px] text-[var(--text-secondary)] m-0 leading-snug line-clamp-3">{lastUserMsg}</p>
              </div>
            )}
            <div className="mt-3"><PvButton variant="primary" size="md" label="Run review again" icon={Play} iconWeight="fill" onClick={handleStartVerification} /></div>
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
            <p className="text-[12px] text-[var(--text-secondary)] m-0 mb-3 leading-relaxed">
              {autoRefresh
                ? 'Before publishing, an AI agent will run through your dashboard to check that everything works correctly on every scheduled refresh:'
                : 'Before publishing, an AI agent will run through your dashboard to confirm everything is ready to go live:'}
            </p>
            <ul className="m-0 pl-0 space-y-2.5 list-none">
              {['Run all data queries against the latest data', 'Check all calculations and data processing steps', 'Confirm all widgets display correctly', autoRefresh ? 'Prepare your dashboard for reliable scheduled refresh' : 'Flag any potential issues in data queries or calculations'].map((t, i) => (
                <li key={i} className="flex items-center gap-2.5 text-[12px] text-[var(--text-primary)]"><span className="shrink-0 w-[5px] h-[5px] rounded-full bg-[var(--accent)]" />{t}</li>
              ))}
            </ul>
            <div className="mt-4"><PvButton variant="primary" size="md" label="Start Review" icon={Play} iconWeight="fill" disabled={draftLoading} onClick={handleStartVerification} /></div>
          </div>
        )}
      </div>
      </div>
    )
  }

  const scheduleSummary = !autoRefresh ? 'One-time snapshot' : scheduleType === 'data_sync' ? 'Refreshes on every data sync' : `Refreshes ${scheduleFrequency}`

  // ── Horizontal step navigation — one consistent pattern for both tabs ──
  // Rendered under the Verify|Publish tab bar. Numbered circles + connectors so
  // it reads as a stepper, distinct from the underline top tabs above it.
  const stepIdx = STEP_ORDER.indexOf(step)
  // Phosphor NumberCircle 1–4 + CheckCircle (filled), rendered with currentColor.
  const STEP_NUMBER_PATHS = [
    'M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216ZM140,80v96a8,8,0,0,1-16,0V95l-11.56,7.71a8,8,0,1,1-8.88-13.32l24-16A8,8,0,0,1,140,80Z',
    'M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm25.56-92.74L120,168h32a8,8,0,0,1,0,16H104a8,8,0,0,1-6.4-12.8l43.17-57.56a16,16,0,1,0-27.86-15,8,8,0,0,1-15.09-5.34,32,32,0,1,1,55.74,29.93Z',
    'M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm32-64a36,36,0,0,1-61.71,25.19A8,8,0,1,1,109.71,166,20,20,0,1,0,124,132a8,8,0,0,1-6.55-12.59L136.63,92H104a8,8,0,0,1,0-16h48a8,8,0,0,1,6.55,12.59l-21,30A36.07,36.07,0,0,1,160,152Z',
    'M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm32-72h-8V80a8,8,0,0,0-14.31-4.91l-56,72A8,8,0,0,0,88,160h48v16a8,8,0,0,0,16,0V160h8a8,8,0,0,0,0-16Zm-24,0H104.36L136,103.32Z',
  ]
  const STEP_CHECK_PATH = 'M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm45.66,85.66-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z'
  const renderStepNavItems = (items, currentId, onSelect) => (
    items.map((it, i) => {
      const isCurrent = it.id === currentId
      return (
        <div key={it.id} className="flex items-center shrink-0">
          <button
            type="button"
            disabled={!it.clickable}
            onClick={() => { if (it.clickable && !isCurrent) onSelect(it.id) }}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border-none bg-transparent transition-colors ${it.clickable && !isCurrent ? 'cursor-pointer hover:bg-[var(--bg-hover)]' : 'cursor-default'}`}
          >
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 256 256" className={`shrink-0 ${isCurrent || it.done ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
              <path d={it.done ? STEP_CHECK_PATH : (STEP_NUMBER_PATHS[i] || STEP_NUMBER_PATHS[0])} />
            </svg>
            <span className={`text-[12px] font-medium whitespace-nowrap ${isCurrent || it.done ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>{it.label}</span>
          </button>
          {i < items.length - 1 && <div className="w-6 h-px bg-[var(--border-primary)] mx-0.5 shrink-0" />}
        </div>
      )
    })
  )

  // Step-nav items per tab.
  const verifyNavItems = [
    { id: 'user', label: 'User Review', done: userReviewDone, clickable: !isAgentBusy },
    { id: 'agent', label: 'Agentic Review', done: reviewPassed, clickable: !isAgentBusy },
  ]
  const publishNavItems = STEP_ORDER.map((s, i) => {
    const isDone = i < stepIdx
    const reachable = i <= stepIdx + 1
    return { id: s, label: STEP_LABELS[s], done: isDone, clickable: !isAgentBusy && reachable }
  })
  // The Verify stepper, rendered on the left of each Verify footer.
  const renderVerifyStepNav = () => (
    <div className="flex items-center gap-0.5 overflow-x-auto min-w-0">{renderStepNavItems(verifyNavItems, verifySubTab, setVerifySubTab)}</div>
  )

  // ── Footer (context-aware nav) ──
  const renderFooter = () => {
    const backBtn = (target, label = 'Back') => (
      <PvButton variant="secondary" size="md" label={label} icon={CaretLeft} iconWeight="bold" disabled={isAgentBusy} onClick={() => setStep(target)} />
    )
    const dashboardOk = !publishDashboardEnabled || (dashboardTitle || '').trim().length > 0
    const newFolderMissing = summaryToFolder && summaryFolder === NEW_FOLDER && !newFolderName.trim()
    // A destination just needs to be toggled on. A valid folder counts; toggling
    // Slack counts too (picking a channel is nudged inline, not gated here).
    const folderDest = summaryToFolder && (aiFilename || '').trim().length > 0 && !newFolderMissing
    const summaryHasDest = folderDest || slackEnabled
    const summaryOk = !summaryEnabled || (aiPreviewContent && summaryHasDest)
    const canPublish = hasOutput && dashboardOk && summaryOk
    const publishReason = !hasOutput ? 'Choose at least one output'
      : !dashboardOk ? 'Name your dashboard'
      : (summaryEnabled && !aiPreviewContent) ? 'Generate the summary first'
      : (summaryEnabled && !summaryHasDest && !summaryToFolder && !slackEnabled) ? 'Choose where the summary goes'
      : (summaryEnabled && !summaryHasDest && newFolderMissing) ? 'Name the new folder'
      : (summaryEnabled && !summaryHasDest && summaryToFolder && !(aiFilename || '').trim()) ? 'Name the summary file'
      : ''

    return (
      <div className="shrink-0 flex items-center justify-between gap-5 px-6 py-3.5 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-0.5 overflow-x-auto min-w-0">{renderStepNavItems(publishNavItems, step, (id) => setStep(id))}</div>
        <div className="flex items-center gap-5 shrink-0">
        {step === STEP.OUTPUTS && backBtn(STEP.WORKFLOW)}
        {step === STEP.FREQUENCY && phase !== PHASE.DONE && !isPublishing && backBtn(STEP.OUTPUTS)}
        <div>
          {step === STEP.WORKFLOW && (
            <PvButton variant="primary" size="md" label="Continue" icon={CaretRight} iconPosition="suffix" iconWeight="bold" disabled={isEditing && !updateMode?.workflow_id} onClick={() => setStep(STEP.OUTPUTS)} />
          )}
          {step === STEP.OUTPUTS && (
            <PvButton variant="primary" size="md" label="Continue" icon={CaretRight} iconPosition="suffix" iconWeight="bold" disabled={!canPublish} title={publishReason} onClick={() => { if (summaryEnabled && slackEnabled && slackChannels.length === 0 && slackDmUsers.length === 0) { setSlackTargetError(true); return } setStep(STEP.FREQUENCY) }} />
          )}
          {step === STEP.FREQUENCY && (
            reviewPassed ? (
              <PvButton variant="primary" size="md" label={isPublishing ? 'Publishing…' : 'Publish'} icon={isPublishing ? SpinnerIcon : CheckCircle} iconPosition="suffix" iconWeight="fill" disabled={isPublishing || !canPublish} title={publishReason} onClick={() => createWorkflow(execSessionIdRef.current)} />
            ) : (
              <PvButton variant="primary" size="md" label="Run Agentic Review" icon={Play} iconWeight="fill" title="The agentic review must pass before you can publish" onClick={() => { setTab(TAB.VERIFY); setVerifySubTab('agent') }} />
            )
          )}
        </div>
        </div>
      </div>
    )
  }

  // ── Adjustments overlay (reachable from the Review success "See what changed") ──
  if (showAdjustments && reviewPassed) {
    const hardenedSteps = (recipe?.steps || []).filter(s => hardeningStatus[s.id]?.status === 'hardened')
    const allCollapsed = hardenedSteps.every(s => collapsedSteps[s.id])

    const handleFeedbackUpdate = (steps, diffs) => {
      if (steps?.length > 0) {
        setStepResults(prev => {
          const updated = { ...prev }
          for (const st of steps) {
            if (updated[st.id]?.status === 'success') continue
            const s2 = st.status === 'completed' ? 'success' : st.status === 'skipped' ? 'skipped' : st.status === 'failed' ? 'failed' : null
            if (s2) { updated[st.id] = { ...updated[st.id], step_id: st.id, status: s2 }; if (st.skip_reason) updated[st.id].skip_reason = st.skip_reason }
          }
          return updated
        })
        setHardeningStatus(prev => {
          const updated = { ...prev }
          for (const st of steps) { if (st.hardening_status && st.hardening_status !== 'pending') updated[st.id] = { status: st.hardening_status, reason: st.hardening_reason || '' } }
          return updated
        })
      }
      if (diffs && Object.keys(diffs).length > 0) {
        setCodeDiffs(prev => { const updated = { ...prev }; for (const [stepId, diff] of Object.entries(diffs)) { if (!updated[stepId]) updated[stepId] = { diff, field: 'code', truncated: false } } return updated })
      }
    }

    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="shrink-0 flex items-center gap-2 px-6 py-3 border-b border-[var(--border-primary)]">
          <button onClick={() => setShowAdjustments(false)} className="flex items-center gap-1.5 text-[12px] bg-transparent border-none p-0 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"><CaretLeft size={13} weight="bold" />Back to check</button>
          <span className="text-[14px] font-semibold text-[var(--text-primary)] ml-2">What changed ({adjustmentCount})</span>
        </div>
        <div className="flex-1 min-h-0 flex overflow-hidden" ref={adjustmentContainerRef}>
          <div className="flex flex-col overflow-y-auto" style={{ width: selectedOutput ? `${adjustmentSplitPct}%` : '100%' }}>
            <div className="flex items-center justify-between px-6 pt-4 pb-2">
              <h3 className="text-[14px] font-semibold text-[var(--text-primary)] m-0">We made {adjustmentCount} fix{adjustmentCount !== 1 ? 'es' : ''} so it keeps working</h3>
              <button onClick={() => { const next = {}; const target = !allCollapsed; hardenedSteps.forEach(s => { next[s.id] = target }); setCollapsedSteps(prev => ({ ...prev, ...next })) }} className="p-1 rounded hover:bg-[var(--bg-hover)] bg-transparent border-none cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-primary)]" title={allCollapsed ? 'Expand all' : 'Collapse all'}><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M181.66,170.34a8,8,0,0,1,0,11.32l-48,48a8,8,0,0,1-11.32,0l-48-48a8,8,0,0,1,11.32-11.32L128,212.69l42.34-42.35A8,8,0,0,1,181.66,170.34Zm-96-84.68L128,43.31l42.34,42.35a8,8,0,0,0,11.32-11.32l-48-48a8,8,0,0,0-11.32,0l-48,48A8,8,0,0,0,85.66,85.66Z"></path></svg></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-2 s-diff-dark bg-[#FCFCFC]">
              {hardenedSteps.map((s) => {
                const idx = recipe.steps.indexOf(s)
                return <RecipeStepCell key={s.id} step={s} stepIndex={idx} result={stepResults[s.id]} onRun={() => {}} onViewOutput={(f) => setSelectedOutput(f)} canRun={false} isRunning={false} removed={false} onRemove={() => {}} onRestore={() => {}} viewMode="card" summaryLoading={false} isFixed={false} codeDiff={codeDiffs[s.id] || null} skipReason={stepResults[s.id]?.skip_reason || null} hideRunButton hardeningInfo={hardeningStatus[s.id] || null} collapsed={!!collapsedSteps[s.id]} onToggleCollapse={() => setCollapsedSteps(prev => ({ ...prev, [s.id]: !prev[s.id] }))} />
              })}
              {recipe?.target_file && (
                <div className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border cursor-pointer transition-all ${selectedOutput?.path === recipe.target_file ? 'border-[var(--accent)] bg-[var(--accent)]/6' : 'border-dashed border-[var(--border-primary)] bg-[var(--bg-secondary)]/50 hover:border-[var(--accent)]/50'}`} onClick={() => setSelectedOutput({ path: recipe.target_file, type: 'html' })}>
                  <DashboardMark size={14} className="text-[var(--accent)] shrink-0" />
                  <div className="flex-1 min-w-0 flex items-baseline"><span className="text-[12px] font-semibold text-[var(--text-primary)] shrink-0">Dashboard</span><span className="text-[12px] text-[var(--text-muted)] ml-2 font-mono truncate min-w-0">{recipe.target_file}</span></div>
                  <span className="text-[12px] text-[var(--accent)] font-medium shrink-0 whitespace-nowrap">{selectedOutput?.path === recipe.target_file ? 'Viewing →' : 'Preview →'}</span>
                </div>
              )}
              {execSessionIdRef.current && (
                <div className="mt-3 pt-3 border-t border-dashed border-[var(--border-primary)]/50">
                  <HardeningChat sessionId={sessionId} execSessionId={execSessionIdRef.current} disabled={false} onStepUpdate={(stepId, data) => { handleFeedbackUpdate([{ ...data, id: stepId }], null) }} onDiffUpdate={(stepId, diff) => { handleFeedbackUpdate(null, { [stepId]: diff.diff }) }} />
                </div>
              )}
            </div>
          </div>
          {selectedOutput && (
            <>
              <div className="shrink-0 w-px cursor-col-resize bg-[var(--border-primary)] hover:bg-[var(--accent)]/40 transition-colors relative" onMouseDown={(e) => { e.preventDefault(); adjustmentDragging.current = true; const onMove = (ev) => { if (!adjustmentDragging.current || !adjustmentContainerRef.current) return; const rect = adjustmentContainerRef.current.getBoundingClientRect(); const pct = ((ev.clientX - rect.left) / rect.width) * 100; setAdjustmentSplitPct(Math.min(75, Math.max(25, pct))) }; const onUp = () => { adjustmentDragging.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }; window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp) }}><div className="absolute inset-y-0 -left-1 -right-1" /></div>
              <div className="min-w-0 self-stretch flex flex-col" style={{ width: `${100 - adjustmentSplitPct}%` }}>
                <OutputPreview sessionId={execSessionIdRef.current} file={selectedOutput} onClose={() => setSelectedOutput(null)} />
              </div>
            </>
          )}
        </div>
        <div className="shrink-0 flex items-center justify-between px-6 py-3.5 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]">
          <button onClick={() => setShowAdjustments(false)} className="flex items-center gap-1.5 text-[12px] bg-transparent border-none p-0 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"><CaretLeft size={13} weight="bold" />Back to check</button>
          <PvButton variant="primary" size="md" label="Continue" icon={CaretRight} iconPosition="suffix" iconWeight="bold" onClick={() => { setShowAdjustments(false); setStep(STEP.FREQUENCY) }} />
        </div>
      </div>
    )
  }

  // ── Tab bar (Verify | Publish) ──
  const renderTabBar = () => {
    // Publish is gated on the agentic review passing — you can't jump there until
    // it's done (User Review is optional and can be skipped).
    const tabs = [
      { id: TAB.VERIFY, label: 'Verify', locked: false },
      { id: TAB.PUBLISH, label: 'Publish', locked: !reviewPassed },
    ]
    return (
      <div className="shrink-0 flex items-center gap-1 px-5 border-b border-[var(--border-primary)] bg-[var(--bg-primary)]">
        {tabs.map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              disabled={t.locked}
              onClick={() => { if (!t.locked) setTab(t.id) }}
              title={t.locked ? 'Complete the agentic review first' : undefined}
              className={`relative flex items-center gap-1.5 px-3 py-2.5 text-[14px] font-medium border-none bg-transparent transition-colors ${active ? 'text-[var(--accent)]' : t.locked ? 'text-[var(--text-muted)]/50 cursor-not-allowed' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer'}`}
            >
              {t.label}
              {active && <span className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-[var(--accent)]" />}
            </button>
          )
        })}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => onClose?.()}
          title="Close"
          className="p-1.5 rounded hover:bg-[var(--bg-hover)] cursor-pointer border-none bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <X size={16} weight="bold" />
        </button>
      </div>
    )
  }


  // Sync the currently-accepted fixes into the main chat session (the source of
  // truth) so the dashboard you're editing becomes the latest version — not just
  // the published copy. Guarded so the same accepted set is only pushed once,
  // whether the user explicitly applies or just continues with the defaults.
  const syncedAcceptedRef = useRef(null)
  const syncAcceptedToSession = () => {
    const hardened = (recipe?.steps || []).filter(s => hardeningStatus[s.id]?.status === 'hardened')
    const accepted = hardened.filter(s => adjustmentChecked[s.id] !== false)
    const key = accepted.map(s => s.id).sort().join(',')
    if (!accepted.length || syncedAcceptedRef.current === key || !onSendFeedback) return false
    const lines = accepted.map(s => {
      const title = s.summary?.title || s.name || s.tool || s.id
      const reason = hardeningStatus[s.id]?.reason
      return reason ? `• ${title}: ${reason}` : `• ${title}`
    }).join('\n')
    onSendFeedback(`Apply these reviewed fixes from the agentic review to the dashboard so the main session stays in sync:\n${lines}`)
    syncedAcceptedRef.current = key
    return true
  }

  // Continue past the review → write the checked (accepted) adjustments to the
  // main chat session, then go to Publish. There is no separate "approve" step —
  // the checkboxes are the selection; unchecked = skipped.
  const continueToPublish = () => {
    const synced = syncAcceptedToSession()
    // From the passed state: record the adjustments left unchecked, so they're
    // surfaced (to apply later) in the no-code-change / changes-detected screens.
    const justUnapplied = (recipe?.steps || [])
      .filter(s => hardeningStatus[s.id]?.status === 'hardened' && adjustmentChecked[s.id] === false)
      .map(s => ({ id: s.id, title: s.summary?.title || s.name || s.tool || s.id, reason: hardeningStatus[s.id]?.reason || '' }))
    if (justUnapplied.length && unappliedKey) {
      try { localStorage.setItem(unappliedKey, JSON.stringify(justUnapplied)) } catch { /* ignore */ }
      setUnappliedAdjustments(justUnapplied)
    }
    // From the no-code-change / changes-detected screens: apply the previously
    // unapplied adjustments the user CHECKED here (staged → applied on continue).
    const toApply = unappliedAdjustments.filter(a => unappliedSelected[a.id])
    let appliedNow = false
    if (toApply.length && onSendFeedback) {
      const lines = toApply.map(a => a.reason ? `• ${a.title}: ${a.reason}` : `• ${a.title}`).join('\n')
      onSendFeedback(`Apply these reviewed fixes from the agentic review to the dashboard so the main session stays in sync:\n${lines}`)
      const ids = new Set(toApply.map(a => a.id))
      const remaining = unappliedAdjustments.filter(a => !ids.has(a.id))
      if (unappliedKey) { try { localStorage.setItem(unappliedKey, JSON.stringify(remaining)) } catch { /* ignore */ } }
      setUnappliedAdjustments(remaining)
      setUnappliedSelected({})
      appliedNow = true
    }
    if (synced || appliedNow) toast('Adjustments applied to your main chat session')
    setTab(TAB.PUBLISH)
  }

  // Re-run the review even though the code looks unchanged (clears the skip).
  const runReviewAgain = () => {
    setReviewSkipped(false)
    setReviewPassed(false)
    setUnappliedSelected({})
    syncedAcceptedRef.current = null
    handleStartVerification()
  }

  // ── Inline adjustments — chat (left) · selectable code adjustments (middle) · preview (right) ──
  const renderInlineAdjustments = () => {
    const hardenedSteps = (recipe?.steps || []).filter(s => hardeningStatus[s.id]?.status === 'hardened')
    const allCollapsed = hardenedSteps.every(s => collapsedSteps[s.id])

    const handleFeedbackUpdate = (steps, diffs) => {
      if (steps?.length > 0) {
        setStepResults(prev => {
          const updated = { ...prev }
          for (const st of steps) {
            if (updated[st.id]?.status === 'success') continue
            const s2 = st.status === 'completed' ? 'success' : st.status === 'skipped' ? 'skipped' : st.status === 'failed' ? 'failed' : null
            if (s2) { updated[st.id] = { ...updated[st.id], step_id: st.id, status: s2 }; if (st.skip_reason) updated[st.id].skip_reason = st.skip_reason }
          }
          return updated
        })
        setHardeningStatus(prev => {
          const updated = { ...prev }
          for (const st of steps) { if (st.hardening_status && st.hardening_status !== 'pending') updated[st.id] = { status: st.hardening_status, reason: st.hardening_reason || '' } }
          return updated
        })
      }
      if (diffs && Object.keys(diffs).length > 0) {
        setCodeDiffs(prev => { const updated = { ...prev }; for (const [stepId, diff] of Object.entries(diffs)) { if (!updated[stepId]) updated[stepId] = { diff, field: 'code', truncated: false } } return updated })
      }
    }

    return (
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* 1st — adjustments */}
        <div className="flex-1 min-w-0 border-r border-[var(--border-primary)] flex flex-col overflow-hidden">
          <div className="shrink-0 px-6 pt-4 pb-2 bg-[#FCFCFC]">
            <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <h3 className="text-[14px] font-semibold text-[var(--text-primary)] m-0 shrink-0">{adjustmentCount} proposed adjustment{adjustmentCount !== 1 ? 's' : ''}</h3>
            </div>
            <button onClick={() => { const next = {}; const target = !allCollapsed; hardenedSteps.forEach(s => { next[s.id] = target }); setCollapsedSteps(prev => ({ ...prev, ...next })) }} className="shrink-0 p-1 rounded hover:bg-[var(--bg-hover)] bg-transparent border-none cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-primary)]" title={allCollapsed ? 'Expand all' : 'Collapse all'}><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M181.66,170.34a8,8,0,0,1,0,11.32l-48,48a8,8,0,0,1-11.32,0l-48-48a8,8,0,0,1,11.32-11.32L128,212.69l42.34-42.35A8,8,0,0,1,181.66,170.34Zm-96-84.68L128,43.31l42.34,42.35a8,8,0,0,0,11.32-11.32l-48-48a8,8,0,0,0-11.32,0l-48,48A8,8,0,0,0,85.66,85.66Z"></path></svg></button>
            </div>
            <p className="text-[12px] text-[var(--text-muted)] mt-1.5 mb-0 leading-snug">Uncheck any you don't want. Checked adjustments are applied to your main chat session when you continue.</p>
          </div>
          <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-2 s-diff-dark bg-[#FCFCFC]">
            {hardenedSteps.map((s, i) => {
              const idx = recipe.steps.indexOf(s)
              const checked = adjustmentChecked[s.id] !== false
              // Default: first adjustment expanded, the rest collapsed (until toggled).
              const collapsed = collapsedSteps[s.id] !== undefined ? collapsedSteps[s.id] : i !== 0
              const checkbox = (
                <input
                  type="checkbox"
                  checked={checked}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => setAdjustmentChecked(prev => ({ ...prev, [s.id]: !checked }))}
                  className="w-3 h-3 accent-[var(--accent)] cursor-pointer shrink-0"
                  title={checked ? 'Adjustment accepted. Uncheck to skip' : 'Adjustment skipped. Check to accept'}
                />
              )
              return (
                <div key={s.id}>
                  <div className={`bg-white rounded-xl shadow-sm transition-opacity ${checked ? '' : 'opacity-60'}`}>
                    <RecipeStepCell key={s.id} step={s} stepIndex={idx} result={stepResults[s.id]} onRun={() => {}} onViewOutput={(f) => setSelectedOutput(f)} canRun={false} isRunning={false} removed={false} onRemove={() => {}} onRestore={() => {}} viewMode="card" summaryLoading={false} isFixed={false} codeDiff={codeDiffs[s.id] || null} skipReason={stepResults[s.id]?.skip_reason || null} hideRunButton hideStatus hardeningInfo={hardeningStatus[s.id] || null} collapsed={collapsed} onToggleCollapse={() => setCollapsedSteps(prev => ({ ...prev, [s.id]: !(prev[s.id] !== undefined ? prev[s.id] : i !== 0) }))} leading={checkbox} />
                  </div>
                </div>
              )
            })}
            {recipe?.target_file && (
              <div className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border cursor-pointer transition-all ${selectedOutput?.path === recipe.target_file ? 'border-[var(--accent)] bg-[var(--accent)]/6' : 'border-dashed border-[var(--border-primary)] bg-[var(--bg-secondary)]/50 hover:border-[var(--accent)]/50'}`} onClick={() => setSelectedOutput({ path: recipe.target_file, type: 'html' })}>
                <DashboardMark size={14} className="text-[var(--accent)] shrink-0" />
                <div className="flex-1 min-w-0 flex items-baseline"><span className="text-[12px] font-semibold text-[var(--text-primary)] shrink-0">Dashboard</span><span className="text-[12px] text-[var(--text-muted)] ml-2 font-mono truncate min-w-0">{recipe.target_file}</span></div>
                <span className="text-[12px] text-[var(--accent)] font-medium shrink-0 whitespace-nowrap">{selectedOutput?.path === recipe.target_file ? 'Viewing →' : 'Preview →'}</span>
              </div>
            )}
          </div>
        </div>

        {colResizer(setChatColWidth, chatColWidth, 280, 640)}
        {/* 2nd — Ask or edit (chat) */}
        <div className="shrink-0 min-w-[280px] border-r border-[var(--border-primary)] flex flex-col overflow-hidden" style={{ width: chatColWidth }}>
          <div className="shrink-0 px-4 py-3 border-b border-[var(--border-primary)]">
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)] m-0">Ask or edit</h3>
            <p className="text-[12px] text-[var(--text-muted)] mt-0.5 m-0 leading-snug">Ask a question or request changes to any adjustment.</p>
          </div>
          <div className="flex-1 min-h-0 flex flex-col p-3">
            {execSessionIdRef.current ? (
              <HardeningChat
                fill
                sessionId={sessionId}
                execSessionId={execSessionIdRef.current}
                disabled={false}
                onStepUpdate={(stepId, data) => handleFeedbackUpdate([{ ...data, id: stepId }], null)}
                onDiffUpdate={(stepId, diff) => handleFeedbackUpdate(null, { [stepId]: diff.diff })}
              />
            ) : (
              <p className="text-[12px] text-[var(--text-muted)]">Chat is unavailable for this review.</p>
            )}
          </div>
        </div>

        {/* 3rd — output preview, opens on demand; its header has a close button */}
        {selectedOutput && (
          <>
            {colResizer(setPreviewColWidth, previewColWidth, 340, 760)}
            <div className="shrink-0 min-w-[340px] self-stretch flex flex-col overflow-hidden" style={{ width: previewColWidth }}>
              <OutputPreview sessionId={execSessionIdRef.current} file={selectedOutput} onClose={() => setSelectedOutput(null)} />
            </div>
          </>
        )}
      </div>
    )
  }

  // ── Agentic Review sub-tab — gate (pre/running/error) → inline adjustments on pass ──
  const renderAgenticReviewSubTab = () => {
    if (reviewSkipped) {
      const unappliedCount = unappliedAdjustments.length
      return (
        <div className="flex flex-col h-full overflow-hidden">
          {stepHeader('Agentic Review', autoRefresh ? 'An AI agent will check your dashboard to ensure every refresh runs without issues.' : 'An AI agent will check your dashboard to ensure everything works correctly.', null, runAgainBtn)}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 bg-[#FCFCFC]">
            <div className="rounded-xl border border-green-200 bg-green-50 p-5">
              <div className="flex items-center gap-2.5">
                <CheckCircle size={20} weight="fill" className="text-green-500 shrink-0" />
                <h3 className="text-[14px] font-semibold text-green-700 m-0">No code change detected</h3>
              </div>
              <p className="text-[12px] text-green-700/90 mt-2 mb-3 leading-relaxed">
                {unappliedCount > 0
                  ? `The agent already reviewed this dashboard and nothing's changed since. You still have ${unappliedCount} adjustment${unappliedCount !== 1 ? 's' : ''} you haven't applied. Open the review to check ${unappliedCount !== 1 ? 'them' : 'it'}, see the output, and ask or edit before you publish.`
                  : 'The agent already reviewed this dashboard and nothing has changed since. Open the review to see the adjustments, output and ask or edit, or just publish.'}
              </p>
              <PvButton variant="secondary" size="md" label="View adjustments" icon={Eye} iconWeight="bold" title="See the proposed adjustments, output and ask or edit" onClick={() => { if (execSessionIdRef.current && adjustmentCount > 0) { setReviewSkipped(false); setAdjustmentsRevealed(true) } else { runReviewAgain() } }} />
            </div>
          </div>
          <div className="shrink-0 flex items-center justify-between gap-4 px-6 py-3.5 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]">
            {renderVerifyStepNav()}
            <PvButton variant="primary" size="md" className="shrink-0" label="Continue to Publish" icon={CaretRight} iconPosition="suffix" iconWeight="bold" onClick={continueToPublish} />
          </div>
        </div>
      )
    }
    if (reviewPassed) {
      const hardenedSteps = (recipe?.steps || []).filter(s => hardeningStatus[s.id]?.status === 'hardened')
      const stepCount = recipe?.steps?.length || totalSteps || 0
      const checks = ['Analyzed', 'Recipe extracted', `Ran ${stepCount} steps`, ...(autoRefresh ? ['Prepared for scheduled refresh'] : [])]

      // Full-screen adjustments view — opened from the recap via "View adjustments".
      // A compact strip header keeps the checks in view; Back returns to the recap
      // (the main Agentic Review screen).
      if (adjustmentsRevealed && adjustmentCount > 0) {
        return (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="shrink-0 flex items-center justify-between gap-4 px-6 py-3 border-b border-[var(--border-primary)] bg-[var(--bg-primary)]">
              <div className="flex items-center gap-x-5 gap-y-1.5 flex-wrap min-w-0">
                <button onClick={() => setAdjustmentsRevealed(false)} title="Back to Agentic Review" className="flex items-center gap-1 text-[12px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer -ml-1 p-1 rounded hover:bg-[var(--bg-hover)] transition-colors">
                  <CaretLeft size={14} weight="bold" />Back
                </button>
                {checks.map((l, i) => (
                  <span key={i} className="flex items-center gap-1.5 text-[12px] font-medium text-green-600"><CheckCircle size={15} weight="fill" className="text-green-500" />{l}</span>
                ))}
              </div>
              <PvButton variant="ghost" size="md" className="shrink-0" label="Run review again" icon={Play} iconWeight="fill" title="Discard this review and run it again" onClick={runReviewAgain} />
            </div>
            {renderInlineAdjustments()}
            <div className="shrink-0 flex items-center justify-between gap-4 px-6 py-3.5 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]">
              {renderVerifyStepNav()}
              <PvButton variant="primary" size="md" className="shrink-0" label="Approve & Continue" icon={CaretRight} iconPosition="suffix" iconWeight="bold" title="Approve the checked adjustments (applied to your main chat session), then continue" onClick={continueToPublish} />
            </div>
          </div>
        )
      }

      // Recap — the main Agentic Review screen kept intact (header, description and
      // every check that ran), with the "Review passed" box appended below. The
      // user opts into the full adjustments view rather than being auto-jumped.
      return (
        <div className="flex flex-col h-full overflow-hidden">
          {stepHeader(
            'Agentic Review',
            autoRefresh ? 'An AI agent will check your dashboard to ensure every refresh runs without issues.' : 'An AI agent will check your dashboard to ensure everything works correctly.',
            null,
            runAgainBtn,
          )}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 bg-[#FCFCFC]">
            <div className="space-y-3">
              {checks.map((l, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle size={16} weight="fill" className="text-green-500 shrink-0" />
                  <span className="text-[12px] flex-1 text-green-600 font-medium">{l}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-5">
              <div className="flex items-center gap-2.5">
                <CheckCircle size={20} weight="fill" className="text-green-500 shrink-0" />
                <h3 className="text-[14px] font-semibold text-green-700 m-0">Review passed</h3>
              </div>
              {adjustmentCount > 0 ? (
                <>
                  <p className="text-[12px] text-green-700/90 mt-2 mb-3 leading-relaxed">
                    The agent tested your dashboard end-to-end and proposed {adjustmentCount} adjustment{adjustmentCount !== 1 ? 's' : ''} to keep it running reliably{autoRefresh ? ' on every scheduled refresh' : ''}. Review them, or continue to publish.
                  </p>
                  <PvButton variant="secondary" size="md" label={`View ${adjustmentCount} adjustment${adjustmentCount !== 1 ? 's' : ''}`} icon={Eye} iconWeight="bold" title="See the proposed adjustments, output and ask or edit" onClick={() => setAdjustmentsRevealed(true)} />
                </>
              ) : (
                <p className="text-[12px] text-green-700/90 mt-2 mb-0 leading-relaxed">
                  Tested end-to-end{autoRefresh ? ' and ready for scheduled refresh' : ' and ready to publish'}, no adjustments were needed.
                </p>
              )}
            </div>
          </div>
          <div className="shrink-0 flex items-center justify-between gap-4 px-6 py-3.5 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]">
            {renderVerifyStepNav()}
            <PvButton variant="primary" size="md" className="shrink-0" label={adjustmentCount > 0 ? 'Approve & Continue' : 'Continue to Publish'} icon={CaretRight} iconPosition="suffix" iconWeight="bold" title={adjustmentCount > 0 ? 'Approve the checked adjustments (applied to your main chat session), then continue' : 'Continue to publish'} onClick={continueToPublish} />
          </div>
        </div>
      )
    }
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto">{renderReviewStep()}</div>
        <div className="shrink-0 flex items-center justify-between gap-4 px-6 py-3.5 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]">
          {renderVerifyStepNav()}
          <div className="shrink-0">
            <PvButton variant="primary" size="md" label="Continue to Publish" icon={CaretRight} iconPosition="suffix" iconWeight="bold" disabled title="Run the agentic review first" onClick={() => {}} />
          </div>
        </div>
      </div>
    )
  }

  // ── Main return — two tabs. Verify hosts User Review + Agentic Review (the gate);
  // Publish runs the 4-screen sequence (Workflow → Outputs → Schedule → Configure). ──
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {renderTabBar()}
      {tab === TAB.VERIFY ? (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-hidden">
            {selectedWidget || verifySubTab === 'user'
              ? renderVerifyStep()
              : renderAgenticReviewSubTab()}
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto">
              {step === STEP.WORKFLOW && renderWorkflowStep()}
              {step === STEP.OUTPUTS && renderOutputsStep()}
              {step === STEP.FREQUENCY && renderFrequencyStep()}
            </div>
            {phase !== PHASE.DONE && renderFooter()}
          </div>
        </div>
      )}
    </div>
  )
}
