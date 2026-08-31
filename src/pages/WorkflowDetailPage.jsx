import { useEffect, useState, useRef, useCallback, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  FlowArrow,
  Clock,
  CalendarBlank,
  CursorClick,
  Lightning,
  CheckCircle,
  XCircle,
  CircleNotch,
  Code,
  Database,
  FileText,
  EnvelopeSimple,
  Link,
  Brain,
  CaretDown,
  CaretRight,
  ChatCircle,
  Play,
  PencilSimple
} from "@phosphor-icons/react";
import { Button as UIButton } from "@/ui";
import { Badge } from "@/ui";
import { Button, Tooltip, Toggle, Skeleton } from "@/ui";
import { useScrollCleanup } from "@/hooks/useScrollCleanup";
import WorkflowDropdown from "../components/WorkflowDropdown";
import { RenameWorkflowModal } from "./workflow-engine/components/RenameWorkflowModal";
import { apiGet, apiPost, apiPut, getCurrentUser } from "../api";
import { timeAgo } from "@/utils/relativeTimeDiff";
import { formatDateTime } from "@/utils/formatDateTime";
import { useSessionContext } from "../contexts/SessionContext";
import MarkdownRenderer from "@/utils/MarkdownRenderer";
import spinner from "@/ui/assets/spinner.gif";

const BLOCK_ICONS = {
  athena_query: Database,
  python_code: Code,
  write_file: FileText,
  save_output: FileText,
  ai_summarize: Brain,
  ai_analyze: Brain,
  ai_condition: Brain,
  ai_generate: Brain,
  send_email: EnvelopeSimple,
  webhook: Link,
  send_slack: ChatCircle
};

const BLOCK_COLORS = {
  athena_query: "text-grey-500",
  python_code: "text-grey-500",
  write_file: "text-grey-500",
  save_output: "text-grey-500",
  ai_summarize: "text-grey-500",
  ai_analyze: "text-grey-500",
  ai_condition: "text-grey-500",
  ai_generate: "text-grey-500",
  send_email: "text-grey-500",
  webhook: "text-grey-500",
  send_slack: "text-[#4A154B]"
};

const BLOCK_BG = {
  athena_query: "bg-grey-100",
  python_code: "bg-grey-100",
  write_file: "bg-grey-100",
  save_output: "bg-grey-100",
  ai_summarize: "bg-grey-100",
  ai_analyze: "bg-grey-100",
  ai_condition: "bg-grey-100",
  ai_generate: "bg-grey-100",
  send_email: "bg-grey-100",
  webhook: "bg-grey-100",
  send_slack: "bg-[#4A154B]/10"
};

const TRIGGER_ICONS = {
  cron: CalendarBlank,
  manual: CursorClick,
  webhook: Lightning
};

export default function WorkflowDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [expandedBlocks, setExpandedBlocks] = useState(new Set());
  const [expandedRun, setExpandedRun] = useState(null);
  const [timelineHeight, setTimelineHeight] = useState({ top: 0, height: 0 });
  const [renaming, setRenaming] = useState(false);
  const { session } = useSessionContext();

  const pollRef = useRef(null);
  const firstCircleRef = useRef(null);
  const lastCircleRef = useRef(null);
  const timelineContainerRef = useRef(null);
  const pageScrollContainerRef = useRef(null);
  const justTriggeredRef = useRef(false);
  const runHistoryRef = useRef(null);

  const { tooltipShow, setTooltipShow } = useScrollCleanup({
    containerRef: pageScrollContainerRef,
    enabled: true
  });

  const { tooltipShow: runTooltipShow, setTooltipShow: setRunTooltipShow } = useScrollCleanup({
    containerRef: pageScrollContainerRef,
    enabled: true
  });

  const {
    data: workflow,
    isLoading: loading,
    isError
  } = useQuery({
    queryKey: ["workflow", id],
    queryFn: async () => {
      const data = await apiGet(`/api/workflows/${id}`);
      return data;
    },
    enabled: !!id,
    retry: false
  });

  const { data: runsData, isError: runsError } = useQuery({
    queryKey: ["workflow-runs", id],
    queryFn: async () => {
      const data = await apiGet(`/api/workflows/${id}/runs?limit=10`);
      return data;
    },
    enabled: !!id,
    retry: false
  });

  const runs = runsData?.runs || [];

  const {
    data: allWorkflowsData,
    isLoading: workflowsLoading,
    isError: workflowsError
  } = useQuery({
    queryKey: ["workflows"],
    queryFn: async () => {
      const data = await apiGet("/api/workflows");
      return data.workflows || [];
    },
    retry: false
  });

  const allWorkflows = Array.isArray(allWorkflowsData) ? allWorkflowsData : [];

  useEffect(() => {
    if (runsError) {
      toast.error("Failed to load workflow runs");
    }
  }, [runsError]);

  useEffect(() => {
    if (workflowsError) {
      toast.error("Failed to load workflows list");
    }
  }, [workflowsError]);

  useEffect(() => {
    if (justTriggeredRef.current && runs.length > 0) {
      const latestRun = runs[0];
      setExpandedRun(latestRun.run_id);
      justTriggeredRef.current = false;

      setTimeout(() => {
        if (runHistoryRef.current) {
          runHistoryRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  }, [runs]);
  const isOwner = workflow?.created_by === getCurrentUser()?.userId;

  useEffect(() => {
    if (isError) {
      toast.error("Workflow not found");
      navigate("/workflows", { replace: true });
    }
  }, [isError, navigate]);

  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (!workflow?.running) return;

    pollRef.current = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["workflow", id] });
      queryClient.invalidateQueries({ queryKey: ["workflow-runs", id] });
    }, 30000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [workflow?.running, queryClient, id]);

  useEffect(() => {
    const prevRunning = queryClient.getQueryData(["workflow", id])?.running;
    if (prevRunning && !workflow?.running) {
      toast.success("Workflow run completed");
    }
  }, [workflow?.running, queryClient, id]);

  useLayoutEffect(() => {
    if (!pageScrollContainerRef.current) return;

    pageScrollContainerRef.current.scrollTop = 0;
  }, [id]);

  const triggerRunMutation = useMutation({
    mutationFn: async (workflowId) => {
      return await apiPost(`/api/workflows/${workflowId}/run`, {});
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["workflow", id] });
      const previousWorkflow = queryClient.getQueryData(["workflow", id]);
      queryClient.setQueryData(["workflow", id], (old) => ({
        ...old,
        running: true
      }));
      return { previousWorkflow };
    },
    onSuccess: () => {
      toast.success("Workflow run started");
      justTriggeredRef.current = true;
      queryClient.invalidateQueries({ queryKey: ["workflow", id] });
      queryClient.invalidateQueries({ queryKey: ["workflow-runs", id] });
    },
    onError: (e, variables, context) => {
      queryClient.setQueryData(["workflow", id], context.previousWorkflow);
      if (e.message?.includes("409")) {
        toast.error("Workflow is already running");
      } else {
        toast.error("Failed to trigger: " + e.message);
      }
    }
  });

  const openWorkspaceMutation = useMutation({
    mutationFn: async (workflowId) => {
      return await apiPost(`/api/workflows/${workflowId}/chat`, {});
    },
    onSuccess: async (data) => {
      if (data.session_id) {
        await session.resumeSession(data.session_id);
        navigate(`/session/${data.session_id}`);
      }
    },
    onError: (e) => {
      toast.error("Failed to open workspace: " + e.message);
    }
  });

  const handleTriggerRun = () => {
    if (!workflow) return;
    triggerRunMutation.mutate(workflow.workflow_id);
  };

  const handleOpenWorkspace = () => {
    if (!workflow) return;
    openWorkspaceMutation.mutate(workflow.workflow_id);
  };

  const toggleBlock = (blockId) => {
    setExpandedBlocks((prev) => {
      const next = new Set(prev);
      next.has(blockId) ? next.delete(blockId) : next.add(blockId);
      return next;
    });
  };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ workflowId, status }) => {
      return await apiPut(`/api/workflows/${workflowId}`, { status });
    },
    onMutate: async ({ status }) => {
      await queryClient.cancelQueries({ queryKey: ["workflow", id] });
      const previousWorkflow = queryClient.getQueryData(["workflow", id]);
      queryClient.setQueryData(["workflow", id], (old) => ({
        ...old,
        status
      }));
      return { previousWorkflow };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["workflow", id], context.previousWorkflow);
      toast.error("Failed to update status: " + err.message);
    },
    onSuccess: (data, { status }) => {
      toast.success(`Workflow ${status === "paused" ? "paused" : "activated"} successfully`);
      queryClient.invalidateQueries({ queryKey: ["workflow", id] });
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    }
  });

  const updateSharedMutation = useMutation({
    mutationFn: async ({ workflowId, shared }) => {
      return await apiPut(`/api/workflows/${workflowId}`, { shared });
    },
    onMutate: async ({ shared }) => {
      await queryClient.cancelQueries({ queryKey: ["workflow", id] });
      const previousWorkflow = queryClient.getQueryData(["workflow", id]);
      queryClient.setQueryData(["workflow", id], (old) => ({
        ...old,
        shared
      }));
      return { previousWorkflow };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["workflow", id], context.previousWorkflow);
      toast.error("Failed to update shared status: " + err.message);
    },
    onSuccess: (data, { shared }) => {
      toast.success(`Workflow ${shared ? "shared" : "unshared"} successfully`);
      queryClient.invalidateQueries({ queryKey: ["workflow", id] });
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    }
  });

  const renameWorkflowMutation = useMutation({
    mutationFn: async ({ workflowId, name }) => {
      return await apiPut(`/api/workflows/${workflowId}`, { name });
    },
    onSuccess: () => {
      toast.success("Workflow renamed");
      setRenaming(false);
      queryClient.invalidateQueries({ queryKey: ["workflow", id] });
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
    onError: (err) => {
      toast.error("Failed to rename: " + err.message);
    }
  });

  const handleToggleShared = (e) => {
    if (!workflow || !isOwner || updateSharedMutation.isPending) return;
    updateSharedMutation.mutate({
      workflowId: workflow.workflow_id,
      shared: e.value
    });
  };

  const handleToggleStatus = (e) => {
    if (!workflow || !isOwner || updateStatusMutation.isPending) return;
    const newStatus = e.value ? "active" : "paused";
    updateStatusMutation.mutate({
      workflowId: workflow.workflow_id,
      status: newStatus
    });
  };

  const handleRename = async (wf, newName) => {
    try {
      await renameWorkflowMutation.mutateAsync({
        workflowId: wf.workflow_id,
        name: newName
      });
    } catch (e) {
      throw e;
    }
  };

  useLayoutEffect(() => {
    const updateTimelineHeight = () => {
      if (firstCircleRef.current && lastCircleRef.current && timelineContainerRef.current) {
        const containerRect = timelineContainerRef.current.getBoundingClientRect();
        const firstRect = firstCircleRef.current.getBoundingClientRect();
        const lastRect = lastCircleRef.current.getBoundingClientRect();

        const firstCenter = firstRect.top - containerRect.top + firstRect.height / 2;
        const lastCenter = lastRect.top - containerRect.top + lastRect.height / 2;

        setTimelineHeight({
          top: firstCenter,
          height: lastCenter - firstCenter
        });
      }
    };

    if (workflow) {
      updateTimelineHeight();
      window.addEventListener("resize", updateTimelineHeight);
      return () => window.removeEventListener("resize", updateTimelineHeight);
    }
  }, [workflow, expandedBlocks]);

  if (loading) {
    return (
      <div className="flex-1 flex min-h-0 overflow-x-auto scrollbar-hide">
        <div className="flex flex-col h-full w-full min-w-[900px]">
          <div className="flex items-center justify-between px-6 h-[64px] shrink-0 bg-white border-b border-[var(--color-grey-100)]">
            <div className="flex items-center gap-2">
              <Skeleton width={80} height={20} className="rounded" />
              <CaretRight size={14} className="text-[var(--color-grey-400)]" />
              <Skeleton width={150} height={20} className="rounded" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton width={100} height={16} className="rounded" />
              <Skeleton width={100} height={36} className="rounded-lg" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-[var(--color-grey-50)]">
            <div className="flex flex-col max-w-[1100px] mx-auto px-10 py-6 gap-6">
              <div className="flex items-center justify-between">
                <Skeleton width={280} height={28} className="rounded" />
                <div className="flex items-center gap-3">
                  <Skeleton width={120} height={36} className="rounded-lg" />
                  <Skeleton width={140} height={36} className="rounded-lg" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Skeleton width={200} height={16} className="rounded" />
                <div className="flex items-center gap-4">
                  <Skeleton width={100} height={20} className="rounded" />
                  <Skeleton width={140} height={20} className="rounded" />
                </div>
              </div>

              <div>
                <Skeleton width={100} height={16} className="rounded mb-4" />
                <div className="relative pl-14 space-y-6">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-14 top-[18px] w-9 h-9 rounded-full border-2 border-[var(--color-grey-200)] bg-white flex items-center justify-center">
                        <Skeleton width={16} height={16} className="rounded" />
                      </div>
                      <div className="border border-[var(--color-grey-200)] rounded-lg bg-white p-2.5">
                        <div className="flex items-center gap-3">
                          <Skeleton width={48} height={48} className="rounded-lg shrink-0" />
                          <div className="flex-1">
                            <Skeleton width={`${50 + (i % 3) * 20}%`} height={16} className="rounded mb-1.5" />
                            <Skeleton width={80} height={12} className="rounded" />
                          </div>
                          <Skeleton width={16} height={16} className="rounded" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Skeleton width={90} height={16} className="rounded mb-4" />
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="border border-[var(--color-grey-200)] rounded-lg bg-white px-4 py-3.5">
                      <div className="flex items-center gap-4">
                        <Skeleton width={20} height={20} className="rounded-full shrink-0" />
                        <div className="flex-1">
                          <Skeleton width={80} height={16} className="rounded" />
                        </div>
                        <Skeleton width={50} height={14} className="rounded" />
                        <Skeleton width={80} height={14} className="rounded" />
                        <Skeleton width={16} height={16} className="rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!workflow) return null;

  const blocks = workflow.blocks || [];
  const blocksMeta = workflow.explanation || {};
  const trigger = workflow.trigger || {};
  const TriggerIcon = TRIGGER_ICONS[trigger.type] || CursorClick;
  const isRunning = workflow.running;

  return (
    <div className="flex-1 flex min-h-0 overflow-x-auto scrollbar-hide">
      <div className="flex flex-col h-full w-full min-w-[900px]">
        <div className="flex items-center justify-between px-6 h-[64px] shrink-0 bg-white border-b border-[var(--color-grey-100)]">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => navigate("/workflows")}
              className="text-[16px] leading-[24px] font-medium text-[var(--color-grey-500)] hover:text-[var(--color-grey-900)] hover:underline transition-colors cursor-pointer bg-transparent border-none"
            >
              Workflows
            </button>
            <CaretRight size={14} className="text-[var(--color-grey-400)] shrink-0" />
            {workflowsError ? (
              <Tooltip title="Failed to load workflows list" placement="bottom">
                <span className="text-[16px] font-medium text-[var(--color-red)] cursor-help">
                  {workflow?.name || "Current Workflow"}
                </span>
              </Tooltip>
            ) : (
              <WorkflowDropdown workflows={allWorkflows} currentWorkflow={workflow} loading={workflowsLoading} />
            )}
          </div>
          <div className="flex items-center gap-5 shrink-0">
            <span className="text-sm text-[var(--color-grey-500)] whitespace-nowrap">
              {blocks.length} block{blocks.length !== 1 ? "s" : ""}
              {workflow.latest_run && (
                <>
                  {"\u00A0\u00A0•\u00A0\u00A0"}
                  <Tooltip
                    title={formatDateTime(workflow.latest_run.refreshed_at, workflow.tenant_timezone || "UTC")}
                    placement="bottom"
                  >
                    <span>Last updated {timeAgo(workflow.latest_run.refreshed_at)}</span>
                  </Tooltip>
                </>
              )}
            </span>
            {workflow.shared && !isOwner ? (
              <div className="flex items-center justify-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg bg-grey-100 text-grey-300 border border-grey-100 cursor-not-allowed">
                <span>Shared</span>
              </div>
            ) : (
              isOwner && (
                <Tooltip
                  title={
                    workflow.status !== "active"
                      ? "Workflow is paused"
                      : isRunning
                        ? "Workflow is currently running"
                        : "Trigger workflow run"
                  }
                  placement="bottom"
                >
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleTriggerRun}
                    disabled={triggerRunMutation.isPending || isRunning || workflow.status !== "active"}
                  >
                    {triggerRunMutation.isPending || isRunning ? (
                      <CircleNotch size={16} className="animate-spin" />
                    ) : (
                      <Play size={16} />
                    )}
                    <span>{triggerRunMutation.isPending ? "Starting..." : isRunning ? "Running..." : "Run Now"}</span>
                  </Button>
                </Tooltip>
              )
            )}
          </div>
        </div>

        <div ref={pageScrollContainerRef} className="flex-1 overflow-y-auto bg-[var(--color-grey-50)]">
          <div className="flex flex-col max-w-[1100px] mx-auto px-10 py-6 gap-6">
            <div className="flex items-center justify-between w-full gap-3">
              <div className="flex items-center gap-2 min-w-0 w-full">
                <Tooltip title={workflow.name} displayTooltipOnOverflow tooltipActive={tooltipShow} placement="bottom">
                  <h1
                    className="text-[20px] font-semibold text-black truncate"
                    onMouseEnter={() => setTooltipShow(true)}
                  >
                    {workflow.name}
                  </h1>
                </Tooltip>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRenaming(true)}
                    aria-label="Rename workflow"
                    className="p-1"
                  >
                    <PencilSimple size={16} />
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-3">
                {workflow.source_session_id && (
                  <Button
                    variant="secondary"
                    size="md"
                    disabled={!isOwner}
                    onClick={() => navigate(`/session/${workflow.source_session_id}`)}
                  >
                    Edit Workflow
                  </Button>
                )}
                {workflow.dashboard_id && (
                  <Button
                    variant="primary"
                    size="md"
                    disabled={!isOwner}
                    onClick={() => navigate(`/dashboards/${workflow.dashboard_id}`)}
                  >
                    View Dashboard
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-[var(--color-grey-600)]">
                <span className="font-medium text-[var(--color-grey-900)]">Trigger: </span>
                {trigger.type === "cron" ? (
                  <>
                    {trigger.cron_expression} ({trigger.timezone || "UTC"})
                  </>
                ) : (
                  <>{trigger.type || "Manual"}</>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-normal text-black">Enabled</span>
                  <Toggle
                    checked={workflow.status === "active"}
                    onChange={handleToggleStatus}
                    disabled={!isOwner || updateStatusMutation.isPending}
                  />
                </div>
                <div className="text-[var(--color-grey-300)]">|</div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-normal text-black">Share with Team</span>
                  <Toggle
                    checked={workflow.shared}
                    onChange={handleToggleShared}
                    disabled={!isOwner || updateSharedMutation.isPending}
                    size="md"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[var(--color-grey-900)] mb-4">Pipeline Flow</h3>
              <div ref={timelineContainerRef} className="relative pl-14">
                {blocks.length > 1 && timelineHeight.height > 0 && (
                  <div
                    className="absolute left-[17px] w-[2px] bg-primary-200"
                    style={{
                      top: `${timelineHeight.top}px`,
                      height: `${timelineHeight.height}px`
                    }}
                  />
                )}

                {blocks.map((block, i) => {
                  const Icon = BLOCK_ICONS[block.type] || Lightning;
                  const color = BLOCK_COLORS[block.type] || "text-[var(--color-grey-500)]";
                  const bg = BLOCK_BG[block.type] || "bg-[var(--color-grey-100)]";
                  const isExpanded = expandedBlocks.has(block.id);

                  const latestRun = runs[0];
                  const blockResult = latestRun?.block_results?.find((br) => br.block_id === block.id);
                  const duration = blockResult?.duration_ms;
                  const status = blockResult?.status;

                  let blockMeta = {};
                  if (
                    block?._recipe_step_id &&
                    typeof blocksMeta?.steps?.[block._recipe_step_id] === "object" &&
                    blocksMeta.steps[block._recipe_step_id] !== null
                  ) {
                    blockMeta = { ...blocksMeta.steps[block._recipe_step_id] };
                  }

                  return (
                    <motion.div
                      key={block.id}
                      className="relative mb-6 last:mb-0"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.15, delay: i * 0.03 }}
                    >
                      <div
                        ref={i === 0 ? firstCircleRef : i === blocks.length - 1 ? lastCircleRef : null}
                        className="absolute -left-14 top-[18px] w-9 h-9 rounded-full bg-white border-[2px] border-primary-500 flex items-center justify-center text-sm font-semibold text-grey-500 z-10"
                      >
                        {i + 1}
                      </div>

                      <div className="border border-[var(--color-grey-200)] rounded-lg bg-white overflow-hidden cursor-pointer hover:shadow-md transition-all">
                        <div
                          className="flex items-center gap-3 p-2.5 hover:bg-primary-50"
                          onClick={() => toggleBlock(block.id)}
                        >
                          <div
                            className={`w-12 h-12 rounded-lg ${bg} flex items-center justify-center shrink-0 border border-neutral-300`}
                          >
                            <Icon size={24} className={color} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[14px] font-medium text-[var(--color-grey-900)] mb-0.5">
                              {blockMeta?.title || blockMeta?.step_id || block.label || block.type}
                            </div>
                            <div className="flex items-center gap-2 text-[12px] text-[var(--color-grey-500)]">
                              <span>{block.type}</span>
                              {duration && <span>• {duration}ms</span>}
                            </div>
                          </div>
                          {status && (
                            <div
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
                                status === "success"
                                  ? "bg-[var(--color-green-bg)] text-[var(--color-green)] border border-[var(--color-green)]"
                                  : status === "failed"
                                    ? "bg-[var(--color-red-bg)] text-[var(--color-red)] border border-[var(--color-red)]"
                                    : "bg-[var(--color-grey-100)] text-[var(--color-grey-500)] border border-[var(--color-grey-500)]"
                              }`}
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-current" />
                              {status === "success" ? "Success" : status === "failed" ? "Failed" : "Pending"}
                            </div>
                          )}
                          <CaretDown
                            size={16}
                            className="text-[var(--color-grey-400)] transition-transform duration-300 ease-in-out"
                            style={{
                              transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)"
                            }}
                          />
                        </div>

                        {isExpanded && (
                          <div className="flex flex-col px-2.5 pb-3 border-t border-[var(--color-grey-100)]">
                            {blockMeta?.explanation && (
                              <div className="flex flex-col w-full mt-3">
                                <div className="text-[12px] font-medium text-[var(--color-grey-700)] mb-2 uppercase tracking-wide">
                                  Explanation
                                </div>
                                <div className="flex w-full max-h-60 overflow-y-auto border border-neutral-300 rounded-lg p-2">
                                  <div className="w-full after:content-[''] after:block after:h-2">
                                    <MarkdownRenderer
                                      content={blockMeta.explanation}
                                      className="text-[12px] text-[var(--color-grey-700)]"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                            {(block.type === "python_code" || block.type === "athena_query") && (
                              <div className="mt-3">
                                <div className="text-[12px] font-medium text-[var(--color-grey-700)] mb-2 uppercase tracking-wide">
                                  {block.type === "athena_query" ? "Query" : "Code"}
                                </div>
                                <div className="text-[12px] font-mono text-[var(--color-grey-700)] bg-[var(--color-grey-50)] rounded-md p-3 max-h-60 overflow-y-auto border border-[var(--color-grey-100)]">
                                  <pre className="whitespace-pre-wrap break-words">
                                    {block.type === "python_code"
                                      ? block.config?.code || "No code"
                                      : block.config?.query || "No query"}
                                  </pre>
                                </div>
                              </div>
                            )}
                            {blockResult?.output_files && blockResult.output_files.length > 0 && (
                              <div className="mt-3 flex items-center gap-4 text-xs text-[var(--color-grey-500)]">
                                <span className="flex items-center gap-1.5">
                                  <FileText size={12} />
                                  Output:{" "}
                                  <strong className="text-[var(--color-grey-900)] font-medium">
                                    {blockResult.output_files[0]}
                                  </strong>
                                </span>
                              </div>
                            )}
                            {blockResult?.tokens_used &&
                              (blockResult.tokens_used.input > 0 || blockResult.tokens_used.output > 0) && (
                                <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--color-grey-500)]">
                                  <Brain size={12} />
                                  Tokens:{" "}
                                  <strong className="text-[var(--color-grey-900)] font-medium">
                                    {blockResult.tokens_used.input} in / {blockResult.tokens_used.output} out
                                  </strong>
                                </div>
                              )}
                            {block.config &&
                              Object.keys(block.config).length > 0 &&
                              block.type !== "python_code" &&
                              block.type !== "athena_query" && (
                                <div className="mt-3">
                                  <div className="text-[12px] font-medium text-[var(--color-grey-700)] mb-2 uppercase tracking-wide">
                                    Configuration
                                  </div>
                                  <div className="text-[12px] font-mono text-[var(--color-grey-700)] bg-[var(--color-grey-50)] rounded-md p-3 max-h-60 overflow-y-auto border border-[var(--color-grey-100)]">
                                    <pre className="whitespace-pre-wrap break-words">
                                      {JSON.stringify(block.config, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div ref={runHistoryRef}>
              <h3 className="text-sm font-semibold text-[var(--color-grey-900)] mb-4">Run History</h3>
              {runsError ? (
                <div className="py-6 px-4 bg-[var(--color-red-bg)] border border-[var(--color-red)]/20 rounded-lg">
                  <p className="text-sm text-[var(--color-red)]">
                    Failed to load run history. Please refresh the page.
                  </p>
                </div>
              ) : runs.length === 0 ? (
                <p className="text-sm text-grey-400 py-6">
                  No runs yet. Click "Run Now" to execute this workflow.
                </p>
              ) : (
                <div className="space-y-3">
                  {runs.map((run) => {
                    const isSuccess = run.status === "success";
                    const isFailed = run.status === "failed";
                    const isActive = run.status === "running";
                    const StatusIcon = isSuccess ? CheckCircle : isFailed ? XCircle : null;
                    const statusColor = isSuccess
                      ? "text-[var(--color-green)]"
                      : isFailed
                        ? "text-[var(--color-red)]"
                        : "text-[var(--accent)]";
                    const isRunExpanded = expandedRun === run.run_id;

                    return (
                      <div
                        key={run.run_id}
                        className="border border-grey-200 rounded-lg bg-white overflow-hidden cursor-pointer hover:shadow-md transition-all"
                      >
                        <div
                          className="flex items-center gap-4 px-4 py-3.5 hover:bg-primary-50"
                          onClick={() => setExpandedRun(isRunExpanded ? null : run.run_id)}
                        >
                          {isActive ? (
                            <img src={spinner} alt="running" className="w-5 h-5 shrink-0" />
                          ) : (
                            <StatusIcon size={20} className={`${statusColor} shrink-0`} />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2.5">
                              <span className="text-[16px] font-medium text-grey-900">
                                {isSuccess ? "Success" : isFailed ? "Failed" : "Running"}
                              </span>
                              <span className="text-xs px-2.5 py-1 rounded bg-grey-100 text-grey-600">
                                {run.trigger_type}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-[14px] text-grey-500 shrink-0">
                            {run.total_duration_ms != null && (
                              <span className="font-medium">{(run.total_duration_ms / 1000).toFixed(1)}s</span>
                            )}
                            <Tooltip
                              title={formatDateTime(run.started_at, workflow.tenant_timezone || "UTC")}
                              placement="top"
                              tooltipActive={runTooltipShow}
                            >
                              <span className="flex items-center gap-1.5" onMouseEnter={() => setRunTooltipShow(true)}>
                                <Clock size={14} />
                                {timeAgo(run.started_at)}
                              </span>
                            </Tooltip>
                            <CaretDown
                              size={16}
                              className="text-grey-400 transition-transform duration-300 ease-in-out"
                              style={{
                                transform: isRunExpanded ? "rotate(180deg)" : "rotate(0deg)"
                              }}
                            />
                          </div>
                        </div>

                        {isRunExpanded && (
                          <div className="px-4 pb-4 border-t border-grey-100 overflow-y-auto max-h-[350px] mb-2">
                            {run.error && (
                              <div className="mt-4 text-[14px] text-[var(--color-red)] bg-[var(--color-red-bg)] rounded-md px-4 py-3 border border-[var(--color-red)]/20">
                                {run.error}
                              </div>
                            )}
                            {run.block_results && run.block_results.length > 0 && (
                              <div className="mt-4 space-y-2">
                                {run.block_results.map((br, i) => {
                                  const BrIcon = BLOCK_ICONS[br.type] || Lightning;
                                  const brSuccess = br.status === "success";
                                  return (
                                    <div
                                      key={i}
                                      className="flex items-center gap-3 text-[14px] py-2.5 px-3 rounded-md bg-grey-50"
                                    >
                                      <BrIcon size={16} className="text-grey-500 shrink-0" />
                                      <span className="text-grey-700 flex-1 truncate font-medium">
                                        {br.label || br.block_id}
                                      </span>
                                      <span
                                        className={`text-xs ${
                                          brSuccess ? "text-[var(--color-green)]" : "text-[var(--color-red)]"
                                        }`}
                                      >
                                        {br.status}
                                      </span>
                                      {br.duration_ms != null && (
                                        <span className="text-grey-400 font-mono text-xs">
                                          {br.duration_ms}ms
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {run.total_llm_tokens &&
                              (run.total_llm_tokens.input > 0 || run.total_llm_tokens.output > 0) && (
                                <div className="mt-3 text-xs text-grey-500">
                                  LLM tokens: {run.total_llm_tokens.input?.toLocaleString()} in /{" "}
                                  {run.total_llm_tokens.output?.toLocaleString()} out
                                </div>
                              )}
                            {!run.error &&
                              (!run.block_results || run.block_results.length === 0) &&
                              (!run.total_llm_tokens ||
                                (run.total_llm_tokens.input === 0 && run.total_llm_tokens.output === 0)) && (
                                <div className="mt-4 py-6 text-center text-[14px] text-grey-400">
                                  {isActive ? "Workflow is running..." : "No execution details available"}
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <RenameWorkflowModal
        workflow={renaming ? workflow : null}
        onClose={() => setRenaming(false)}
        onRename={handleRename}
      />
    </div>
  );
}
