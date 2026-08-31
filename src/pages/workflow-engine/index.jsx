import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Pause, Play, Trash2, Pencil, ExternalLink, Eye, EyeOff,
} from 'lucide-react'
import { MagnifyingGlass, DotsThree } from '@phosphor-icons/react'
import { Button, Input, Tooltip, Popper } from '@/ui'
import { useScrollCleanup } from '@/hooks/useScrollCleanup'
import { Badge } from '@/ui'
import { apiGet, apiPut, apiDelete, apiPost, getCurrentUser } from '@/api'
import { timeAgo } from '@/utils/relativeTimeDiff'
import { formatDate, formatDateTime } from '@/utils/formatDateTime'
import { DeleteWorkflowModal } from './components/DeleteWorkflowModal'
import { RenameWorkflowModal } from './components/RenameWorkflowModal'

const GRID_COLUMNS = '3% 49% 10% 18% 8% 8% 4%'

export default function WorkflowsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [renaming, setRenaming] = useState(null)
  const [triggeringId, setTriggeringId] = useState(null)
  const [listOverflow, setListOverflow] = useState(false)
  const [openMenuId, setOpenMenuId] = useState(null)
  const listWrapperRef = useRef(null)

  const currentUser = getCurrentUser()
  const currentUserId = currentUser?.userId || currentUser?._id || null

  const { data, isLoading: loading, refetch: fetchWorkflows } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const data = await apiGet('/api/workflows')
      return data.workflows || []
    },
  })

  const { tooltipShow, setTooltipShow } = useScrollCleanup({ containerRef: listWrapperRef, enabled: !loading })

  const workflows = Array.isArray(data) ? data : []

  useEffect(() => {
    if (listWrapperRef.current) {
      const hasOverflow = listWrapperRef.current.scrollHeight > listWrapperRef.current.clientHeight
      setListOverflow(hasOverflow)
    } else {
      setListOverflow(false)
    }
  }, [loading, workflows, search])

  const invalidateWorkflows = () => queryClient.invalidateQueries({ queryKey: ['workflows'] })

  const handleTogglePause = async (wf) => {
    try {
      await apiPut(`/api/workflows/${wf.workflow_id}`, {
        status: wf.status === 'paused' ? 'active' : 'paused',
      })
      toast.success(wf.status === 'paused' ? 'Workflow resumed' : 'Workflow paused')
      invalidateWorkflows()
    } catch (e) { toast.error('Failed: ' + e.message) }
  }

  const handleToggleShare = async (wf) => {
    try {
      await apiPut(`/api/workflows/${wf.workflow_id}`, { shared: !wf.shared })
      toast.success(wf.shared ? 'Workflow unshared' : 'Workflow shared with team')
      invalidateWorkflows()
    } catch (e) { toast.error('Failed: ' + e.message) }
  }

  const handleDelete = async (wf) => {
    try {
      await apiDelete(`/api/workflows/${wf.workflow_id}`)
      toast.success('Workflow deleted')
      setDeleteConfirm(null)
      invalidateWorkflows()
    } catch (e) {
      toast.error('Failed to delete: ' + e.message)
      throw e
    }
  }

  const handleRename = async (wf, newName) => {
    try {
      await apiPut(`/api/workflows/${wf.workflow_id}`, { name: newName })
      toast.success('Workflow renamed')
      setRenaming(null)
      invalidateWorkflows()
    } catch (e) {
      toast.error('Failed to rename: ' + e.message)
      throw e
    }
  }

  const handleTriggerRun = async (wf) => {
    setTriggeringId(wf.workflow_id)
    try {
      await apiPost(`/api/workflows/${wf.workflow_id}/run`, {})
      toast.success('Workflow run started')
      invalidateWorkflows()
    } catch (e) {
      if (e.message?.includes('409')) {
        toast.error('Workflow is already running')
      } else {
        toast.error('Failed to trigger: ' + e.message)
      }
    } finally {
      setTriggeringId(null)
    }
  }

  const isOwner = (wf) => currentUserId && wf.created_by === currentUserId

  const filtered = useMemo(() => {
    if (!search.trim()) return workflows
    const query = search.toLowerCase()
    return workflows.filter((w) => w.name.toLowerCase().includes(query))
  }, [workflows, search])

  const getTriggerLabel = (trigger) => {
    if (!trigger) return 'Manual'
    if (trigger.type === 'cron') return 'Scheduled'
    return trigger.type?.charAt(0).toUpperCase() + trigger.type?.slice(1) || 'Manual'
  }

  const Skeleton = ({ width, height }) => (
    <div className="bg-[var(--color-grey-200)] rounded animate-pulse" style={{ width, height }} />
  )

  const ListLoader = ({ length = 8 }) => (
    <div className="flex flex-col w-full gap-2">
      {Array.from({ length }).map((_, ind) => (
        <div
          className="grid w-full px-3 h-[58px] shrink-0 items-center border border-[var(--color-grey-100)] rounded-lg"
          style={{ gridTemplateColumns: GRID_COLUMNS }}
          key={ind}
        >
          <span className="px-2"><Skeleton width="18px" height="18px" /></span>
          <span className="px-2"><Skeleton width={ind % 2 === 0 ? '80%' : '60%'} height="18px" /></span>
          <span className="px-2"><Skeleton width="50px" height="18px" /></span>
          <span className="px-2"><Skeleton width="80px" height="18px" /></span>
          <span className="px-2"><Skeleton width="40px" height="18px" /></span>
          <span className="px-2"><Skeleton width="30px" height="18px" /></span>
          <span className="px-2 flex justify-center"><Skeleton width="18px" height="18px" /></span>
        </div>
      ))}
    </div>
  )

  return (
    <div className="flex flex-col w-full h-full overflow-x-auto">
      <div className="flex flex-col w-full h-full min-w-[800px]">
        <div className="flex w-full px-6 items-center justify-between h-[60px] shrink-0 border-b border-[var(--color-grey-100)] bg-white">
          <span className="text-[16px] leading-[24px] font-medium">Workflows</span>
        </div>

        <div
          className="w-full p-4 flex overflow-x-auto bg-[var(--color-grey-50)]"
          style={{ height: 'calc(100% - 60px)' }}
        >
          <div className="flex flex-col bg-white rounded-xl h-full w-full overflow-hidden min-w-[800px]">
            <div className="flex items-center justify-between h-14 shrink-0 w-full border-b border-[var(--color-grey-100)]">
              <div className="px-8 flex gap-2.5 items-center">
                <span className="font-medium text-[14px]">All Workflows</span>
                <span className="text-xs text-white bg-[var(--color-primary-500)] px-1.5 py-0.5 rounded-md">
                  {filtered.length}
                </span>
              </div>
              <div className="flex gap-3 items-center pr-4">
                <Input
                  placeholder="Search Workflow"
                  leftElem={<MagnifyingGlass size={16} />}
                  value={search}
                  disabled={loading || workflows.length === 0}
                  onChange={(e) => setSearch(e?.target?.value || '')}
                  showClearInput
                  className={{
                    input: {
                      wrapper: 'w-80 py-2 px-3',
                      root: 'text-xs'
                    }
                  }}
                />
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col w-full px-4 py-2" style={{ height: 'calc(100% - 56px)' }}>
                <div
                  className="grid w-full p-2 border-b border-[var(--color-grey-100)]"
                  style={{ gridTemplateColumns: GRID_COLUMNS }}
                >
                  <span className="px-2"><Skeleton width="12px" height="12px" /></span>
                  <span className="px-2"><Skeleton width="36px" height="12px" /></span>
                  <span className="px-2"><Skeleton width="42px" height="12px" /></span>
                  <span className="px-2"><Skeleton width="55px" height="12px" /></span>
                  <span className="px-2"><Skeleton width="40px" height="12px" /></span>
                  <span className="px-2"><Skeleton width="42px" height="12px" /></span>
                  <span className="px-2" />
                </div>
                <div className="py-2 overflow-hidden" style={{ height: 'calc(100% - 32px)' }}>
                  <ListLoader />
                </div>
              </div>
            ) : filtered.length === 0 && search ? (
              <div className="w-full h-full flex">
                <div className="m-auto text-[var(--color-grey-500)] flex flex-col gap-2 items-center">
                  <div className="mx-auto">
                    No results for <b className="text-[var(--color-grey-900)]">"{search}"</b>
                  </div>
                  <div className="flex">
                    <Button size="sm" variant="secondary" onClick={() => setSearch('')}>
                      Clear search
                    </Button>
                  </div>
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col w-full h-full justify-center items-center gap-3">
                <span className="text-[var(--color-grey-500)] font-normal text-sm">No workflows to list</span>
              </div>
            ) : (
              <div className="flex flex-col w-full px-4 py-2" style={{ height: 'calc(100% - 56px)' }}>
                <div
                  className={`grid p-2 ${listOverflow ? 'w-[calc(100%-8px)]' : 'w-full'}`}
                  style={{ gridTemplateColumns: GRID_COLUMNS }}
                >
                  <span className="text-[var(--color-grey-500)] font-medium text-xs px-2">#</span>
                  <span className="text-[var(--color-grey-500)] font-medium text-xs px-2">Name</span>
                  <span className="text-[var(--color-grey-500)] font-medium text-xs px-2">Trigger</span>
                  <span className="text-[var(--color-grey-500)] font-medium text-xs px-2">Last Run</span>
                  <span className="text-[var(--color-grey-500)] font-medium text-xs px-2">Status</span>
                  <span className="text-[var(--color-grey-500)] font-medium text-xs px-2">Shared</span>
                  <span className="text-[var(--color-grey-500)] font-medium text-xs px-2"></span>
                </div>

                <div
                  ref={listWrapperRef}
                  className="flex flex-col w-full overflow-y-auto gap-2 py-2"
                  style={{ height: 'calc(100% - 32px)' }}
                >
                  {filtered.map((wf, index) => {
                    const isRunning = wf.running || triggeringId === wf.workflow_id

                    return (
                      <button
                        key={wf.workflow_id}
                        className="grid w-full px-3 h-[58px] shrink-0 items-center border border-[var(--color-grey-100)] rounded-lg hover:bg-[var(--color-primary-50)] hover:shadow-[0_4px_12px_-2px_rgba(16,24,40,0.10)] transition-all text-left group cursor-pointer bg-white"
                        style={{ gridTemplateColumns: GRID_COLUMNS }}
                        onClick={() => navigate(`/workflows/${wf.workflow_id}`)}
                      >
                        <span className="flex items-center px-2 text-xs text-[var(--color-grey-500)]">
                          {index + 1}.
                        </span>

                        <span className="flex items-center gap-2 px-2 min-w-0 overflow-hidden">
                          <Tooltip title={wf.name} displayTooltipOnOverflow arrow placement="top" tooltipActive={tooltipShow}>
                            <a
                              href={`/workflows/${wf.workflow_id}`}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                navigate(`/workflows/${wf.workflow_id}`);
                              }}
                              onMouseEnter={() => setTooltipShow(true)}
                              className="text-xs truncate"
                            >
                              {wf.name}
                            </a>
                          </Tooltip>
                          {isRunning && <Badge variant="accent" className="shrink-0">Running</Badge>}
                        </span>

                        <span className="flex items-center px-2 text-xs text-[var(--color-grey-600)]">
                          {getTriggerLabel(wf.trigger)}
                        </span>

                        <span className="flex items-center px-2 text-xs text-[var(--color-grey-600)]">
                          {wf.latest_run ? (
                            <Tooltip title={formatDateTime(wf.latest_run.refreshed_at, wf.tenant_timezone) || formatDate(wf.latest_run.refreshed_at)} arrow placement="top" tooltipActive={tooltipShow}>
                              <span onMouseEnter={() => setTooltipShow(true)}>{timeAgo(wf.latest_run.refreshed_at)}</span>
                            </Tooltip>
                          ) : (
                            <span className="text-[var(--color-grey-300)]">—</span>
                          )}
                        </span>

                        <span className="flex items-center px-2 text-xs text-[var(--color-grey-600)]">
                          {wf.status === 'paused' ? 'Paused' : 'Active'}
                        </span>

                        <span className="flex items-center px-2 text-xs text-[var(--color-grey-600)]">
                          {wf.shared ? 'Yes' : 'No'}
                        </span>

                        <span
                          className="flex items-center justify-center px-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isOwner(wf) && (
                            <Popper
                              buttonChildren={<DotsThree size={18} weight="bold" />}
                              placement="bottom-end"
                              size="sm"
                              variant="ghost"
                              className="!p-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-grey-400)] hover:text-[var(--color-grey-700)] hover:bg-[var(--color-grey-100)] rounded-lg"
                              popperClassName="w-48"
                              closeOnClickInside
                              zIndex={50}
                              scrollContainerRef={listWrapperRef}
                              open={openMenuId === wf.workflow_id}
                              onOpenChange={(isOpen) => setOpenMenuId(isOpen ? wf.workflow_id : null)}
                            >
                              {wf.dashboard_id && (
                                <button
                                  onClick={() => navigate(`/dashboards/${wf.dashboard_id}`)}
                                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-[var(--color-grey-700)] hover:bg-[var(--color-grey-50)] active:bg-white active:text-[var(--color-grey-600)] transition-colors bg-transparent border-none cursor-pointer"
                                >
                                  <ExternalLink size={14} />
                                  View Dashboard
                                </button>
                              )}
                              {wf.source_session_id && (
                                <button
                                  onClick={() => navigate(`/session/${wf.source_session_id}`)}
                                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-[var(--color-grey-700)] hover:bg-[var(--color-grey-50)] active:bg-white active:text-[var(--color-grey-600)] transition-colors bg-transparent border-none cursor-pointer"
                                >
                                  <ExternalLink size={14} />
                                  Edit Workflow
                                </button>
                              )}
                              <button
                                onClick={() => handleTriggerRun(wf)}
                                disabled={wf.running || wf.status !== 'active'}
                                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-[var(--color-grey-700)] hover:bg-[var(--color-grey-50)] active:bg-white active:text-[var(--color-grey-600)] transition-colors bg-transparent border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Play size={14} />
                                Run now
                              </button>
                              <button
                                onClick={() => setRenaming(wf)}
                                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-[var(--color-grey-700)] hover:bg-[var(--color-grey-50)] active:bg-white active:text-[var(--color-grey-600)] transition-colors bg-transparent border-none cursor-pointer"
                              >
                                <Pencil size={14} />
                                Rename
                              </button>
                              <button
                                onClick={() => handleToggleShare(wf)}
                                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-[var(--color-grey-700)] hover:bg-[var(--color-grey-50)] active:bg-white active:text-[var(--color-grey-600)] transition-colors bg-transparent border-none cursor-pointer"
                              >
                                {wf.shared ? <EyeOff size={14} /> : <Eye size={14} />}
                                {wf.shared ? 'Unshare' : 'Share with team'}
                              </button>
                              <button
                                onClick={() => handleTogglePause(wf)}
                                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-[var(--color-grey-700)] hover:bg-[var(--color-grey-50)] active:bg-white active:text-[var(--color-grey-600)] transition-colors bg-transparent border-none cursor-pointer"
                              >
                                {wf.status === 'paused' ? <Play size={14} /> : <Pause size={14} />}
                                {wf.status === 'paused' ? 'Resume' : 'Pause'}
                              </button>
                              <div className="border-t border-[var(--color-grey-100)]" />
                              <button
                                onClick={() => setDeleteConfirm(wf)}
                                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-[var(--color-red)] hover:bg-[var(--color-red-bg)] active:bg-white active:text-[var(--color-red)]/60 transition-colors bg-transparent border-none cursor-pointer"
                              >
                                <Trash2 size={14} />
                                Delete
                              </button>
                            </Popper>
                          )}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <DeleteWorkflowModal
        workflow={deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onDelete={handleDelete}
      />

      <RenameWorkflowModal
        workflow={renaming}
        onClose={() => setRenaming(null)}
        onRename={handleRename}
      />
    </div>
  )
}
