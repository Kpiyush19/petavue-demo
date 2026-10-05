import { useState, useCallback } from 'react'

const STORAGE_KEY = 'artifact-panel-width'
const DEFAULT_WIDTH = 480
const MIN_WIDTH = 400

function loadWidth() {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved ? Math.max(MIN_WIDTH, parseInt(saved, 10)) : DEFAULT_WIDTH
}

export function useArtifactPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [tabs, setTabs] = useState([])
  const [activeTabId, setActiveTabId] = useState(null)
  const [panelWidth, setPanelWidthState] = useState(loadWidth)
  // When set, ArtifactPanel auto-opens its lineage drawer for this path on
  // next render (after the corresponding tab becomes active). Cleared by
  // the panel via consumeOpenLineageFor once consumed.
  const [openLineageFor, setOpenLineageFor] = useState(null)
  // When set, ArtifactPanel auto-opens the Verify & Publish modal once
  // the dashboard tab is active and the runtime checks pass. Same
  // request/consume pattern as openLineageFor. Used by the post-skill-run
  // handoff flow: SkillsV2RunPage's V&P button stashes the dashboard
  // descriptor + this flag in route state; WorkspacePage hydrates both
  // on mount so the user lands inside the V&P modal without extra clicks.
  const [openVerifyPublishFor, setOpenVerifyPublishFor] = useState(null)

  // `pinned` tabs belong to the session itself (a workflow run's Dashboard,
  // Changes and All recommendations): they sit first and cannot be closed.
  // `activate: false` opens a tab without moving the reader to it.
  const openArtifact = useCallback(({ path, title, contentType, source = 'output', pinned = false, activate = true, count = null }) => {
    setTabs((prev) => {
      const existing = prev.find((t) => t.path === path)
      if (existing) {
        if (activate) setActiveTabId(existing.id)
        return prev
      }
      const id = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      const newTab = { id, title: title || path.split('/').pop(), path, contentType, source, pinned, count }
      if (activate) setActiveTabId(id)
      return [...prev, newTab]
    })
    setIsOpen(true)
  }, [])

  // Bridge pill click handler. Opens the widget JSX as a tab AND requests
  // the lineage drawer to auto-open when the tab becomes active. Called
  // from MessageBubble's pill in main chat.
  //
  // contentType MUST be 'html' (not 'jsx') — backend maps .jsx → html in
  // _EXT_TO_CONTENT_TYPE, and the JSX preview is rendered by HtmlViewer
  // via the dashboard runtime. Passing 'jsx' falls through to DownloadCard.
  const openWidgetLineage = useCallback((path, title) => {
    openArtifact({ path, title, contentType: 'html' })
    setOpenLineageFor(path)
  }, [openArtifact])

  const consumeOpenLineageFor = useCallback(() => {
    setOpenLineageFor(null)
  }, [])

  // Sister helper for the V&P auto-open. Caller passes the dashboard path
  // (or any path uniquely identifying which tab should trigger the modal)
  // — ArtifactPanel watches and opens V&P when the active tab matches.
  const requestVerifyPublishOpen = useCallback((path) => {
    setOpenVerifyPublishFor(path || true)
  }, [])

  const consumeOpenVerifyPublishFor = useCallback(() => {
    setOpenVerifyPublishFor(null)
  }, [])

  const closeTab = useCallback((tabId) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== tabId)
      if (next.length === 0) {
        setIsOpen(false)
        setActiveTabId(null)
      } else {
        setActiveTabId((current) => {
          if (current === tabId) {
            const idx = prev.findIndex((t) => t.id === tabId)
            return next[Math.min(idx, next.length - 1)]?.id || null
          }
          return current
        })
      }
      return next
    })
  }, [])

  const closePanel = useCallback(() => {
    setIsOpen(false)
  }, [])

  const togglePanel = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const setPanelWidth = useCallback((width) => {
    const clamped = Math.max(MIN_WIDTH, Math.min(width, window.innerWidth * 0.6))
    setPanelWidthState(clamped)
    localStorage.setItem(STORAGE_KEY, String(clamped))
  }, [])

  const reset = useCallback(() => {
    setTabs([])
    setActiveTabId(null)
    setIsOpen(false)
  }, [])

  const activeTab = tabs.find((t) => t.id === activeTabId) || null

  return {
    isOpen,
    tabs,
    activeTabId,
    activeTab,
    panelWidth,
    openArtifact,
    openWidgetLineage,
    openLineageFor,
    consumeOpenLineageFor,
    openVerifyPublishFor,
    requestVerifyPublishOpen,
    consumeOpenVerifyPublishFor,
    closeTab,
    setActiveTab: setActiveTabId,
    closePanel,
    togglePanel,
    setPanelWidth,
    reset,
  }
}
