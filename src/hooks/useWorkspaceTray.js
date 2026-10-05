import { useState, useCallback, useEffect, useMemo } from 'react'
import { apiGet, getCurrentUser } from '../api'

const OPEN_KEY = 'workspace-tray-open'
const COLLAPSED_KEY = 'workspace-tray-collapsed'
const WIDTH_KEY = 'workspace-tray-width'
const DEFAULT_WIDTH = 240
const MIN_WIDTH = 240
const MAX_WIDTH_RATIO = 0.35

function loadBool(key, defaultVal) {
  const v = localStorage.getItem(key)
  if (v === null) return defaultVal
  return v === 'true'
}

function loadWidth() {
  const saved = localStorage.getItem(WIDTH_KEY)
  return saved ? Math.max(MIN_WIDTH, parseInt(saved, 10)) : DEFAULT_WIDTH
}

function buildTree(flatFiles, query) {
  let filtered = flatFiles
  if (query.trim()) {
    const q = query.toLowerCase()
    const matchingFiles = flatFiles.filter(
      (f) => f.type === 'file' && f.name.toLowerCase().includes(q)
    )
    const matchingDirs = flatFiles.filter(
      (f) => f.type === 'directory' && f.name.toLowerCase().includes(q)
    )
    const neededDirs = new Set()
    for (const f of matchingFiles) {
      const parts = f.path.split('/')
      for (let i = 1; i < parts.length; i++) {
        neededDirs.add(parts.slice(0, i).join('/'))
      }
    }
    for (const d of matchingDirs) {
      const parts = d.path.split('/')
      for (let i = 1; i < parts.length; i++) {
        neededDirs.add(parts.slice(0, i).join('/'))
      }
    }
    const matchedDirPaths = new Set(matchingDirs.map((d) => d.path))
    const childrenOfMatchedDirs = flatFiles.filter((f) => {
      for (const dirPath of matchedDirPaths) {
        if (f.path.startsWith(dirPath + '/')) return true
      }
      return false
    })
    const allMatched = new Set([
      ...matchingFiles.map((f) => f.path),
      ...matchingDirs.map((d) => d.path),
      ...childrenOfMatchedDirs.map((f) => f.path),
    ])
    filtered = [
      ...flatFiles.filter((f) => f.type === 'directory' && (neededDirs.has(f.path) || allMatched.has(f.path))),
      ...flatFiles.filter((f) => f.type === 'file' && allMatched.has(f.path)),
    ]
  }

  const root = []
  const dirMap = {}

  for (const entry of filtered) {
    const node = { ...entry, children: entry.type === 'directory' ? [] : undefined }
    if (entry.type === 'directory') {
      dirMap[entry.path] = node
    }
    const lastSlash = entry.path.lastIndexOf('/')
    const parentPath = lastSlash > 0 ? entry.path.substring(0, lastSlash) : null
    if (parentPath && dirMap[parentPath]) {
      dirMap[parentPath].children.push(node)
    } else {
      root.push(node)
    }
  }
  return root
}

export function useWorkspaceTray() {
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(() => loadBool(COLLAPSED_KEY, false))
  const [files, setFiles] = useState([])
  const [expandedDirs, setExpandedDirs] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [hasFetched, setHasFetched] = useState(false)
  const [panelWidth, setPanelWidthState] = useState(loadWidth)
  const [skillsManifest, setSkillsManifest] = useState({}) // { skillName: scope }

  useEffect(() => { localStorage.setItem(COLLAPSED_KEY, String(isCollapsed)) }, [isCollapsed])

  const setPanelWidth = useCallback((width) => {
    const clamped = Math.max(MIN_WIDTH, Math.min(width, window.innerWidth * MAX_WIDTH_RATIO))
    setPanelWidthState(clamped)
    localStorage.setItem(WIDTH_KEY, String(Math.round(clamped)))
  }, [])

  const fetchFiles = useCallback(async (sessionId) => {
    if (!sessionId) return
    setLoading(true)
    setError(null)
    try {
      const data = await apiGet(`/api/sessions/${sessionId}/files`)
      // Hide internal metadata files; hide step trace folder for non-Petavue users
      const isPetavue = (getCurrentUser()?.email || '').includes('@petavue.com')
      const fileList = (data.files || []).filter((f) => {
        if (f.name.startsWith('_') || f.name.startsWith('.')) return false
        if (f.path === 'output/dashboard/runtime' || f.path.startsWith('output/dashboard/runtime/')) return false
        // Hide internal files for non-Petavue users only
        if (!isPetavue && f.path === 'todo-list.json') return false
        if (!isPetavue && (f.path === 'temp' || f.path.startsWith('temp/'))) return false
        return true
      })
      setFiles(fileList)
      // Auto-expand top-level dirs on first load
      if (!hasFetched) {
        const topDirs = new Set(
          fileList.filter((f) => f.type === 'directory' && !f.path.includes('/') && !f.collapsed).map((f) => f.path)
        )
        setExpandedDirs(topDirs)
        setHasFetched(true)
      }
      // Fetch skills manifest for scope badges
      try {
        const res = await apiGet(`/api/sessions/${sessionId}/files/context/skills/_skills_manifest.json`)
        if (typeof res === 'string') {
          const parsed = JSON.parse(res)
          const map = {}
          for (const s of parsed) map[s.name] = s.scope
          setSkillsManifest(map)
        } else if (Array.isArray(res)) {
          const map = {}
          for (const s of res) map[s.name] = s.scope
          setSkillsManifest(map)
        }
      } catch {
        // No manifest — that's fine
        setSkillsManifest({})
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [hasFetched])

  const toggleOpen = useCallback(() => setIsOpen((p) => !p), [])
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggleCollapsed = useCallback(() => setIsCollapsed((p) => !p), [])

  const toggleDir = useCallback((path) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  const fileTree = useMemo(() => buildTree(files, searchQuery), [files, searchQuery])

  const reset = useCallback(() => {
    setFiles([])
    setExpandedDirs(new Set())
    setSearchQuery('')
    setHasFetched(false)
    setError(null)
    setSkillsManifest({})
  }, [])

  return {
    isOpen,
    isCollapsed,
    panelWidth,
    files,
    fileTree,
    expandedDirs,
    loading,
    error,
    searchQuery,
    skillsManifest,
    fetchFiles,
    toggleOpen,
    open,
    close,
    toggleCollapsed,
    toggleDir,
    setSearchQuery,
    setPanelWidth,
    reset,
  }
}
