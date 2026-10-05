import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FolderOpen, Pencil, Check, Loader2, Circle, CircleDot, PanelRight } from "lucide-react";
import { Button, Input, Popper } from "@/ui";
import { apiPatch } from "../api";
import useTodoStore from "./todo-progress/useTodoStore";

function ContextMeter({ tokens, threshold, usagePercent, isCompacting }) {
  // Context/token usage meter removed per request.
  return null;

  // eslint-disable-next-line no-unreachable
  if (tokens == null) return null;

  const effectiveThreshold = threshold || 200000;
  const pct =
    threshold && usagePercent ? Math.min(usagePercent, 100) : Math.min((tokens / effectiveThreshold) * 100, 100);
  const tokensK = (tokens / 1000).toFixed(1);
  const thresholdK = (effectiveThreshold / 1000).toFixed(0);

  let barColor = "var(--status-success)";
  if (pct > 85) barColor = "var(--action-danger)";
  else if (pct > 60) barColor = "var(--status-warning)";

  return (
    <div
      className="flex items-center gap-1.5"
      title={`Context: ${tokensK}K / ${thresholdK}K tokens (${pct.toFixed(0)}% used). Auto-compaction at 100%.`}
    >
      {isCompacting ? (
        <span className="text-[10px] text-[var(--status-warning)] font-medium animate-pulse">Compacting...</span>
      ) : (
        <>
          <div className="w-[48px] h-[5px] rounded-full bg-[var(--bg-secondary)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: barColor }}
            />
          </div>
          <span className="text-[10px] text-[var(--text-muted)] tabular-nums font-mono">{tokensK}K</span>
        </>
      )}
    </div>
  );
}

const VERIFY_RE = /\b(verif|verification)\b/i;

function getCounts(todos) {
  const counts = { pending: 0, in_progress: 0, completed: 0 };
  for (const t of todos) {
    if (counts[t.status] !== undefined) counts[t.status] += 1;
  }
  return counts;
}

function StatusIcon({ status, agentRunning }) {
  if (status === "completed") {
    return <Check size={12} className="text-[var(--status-success)] shrink-0" />;
  }
  if (status === "in_progress") {
    if (agentRunning) {
      return <Loader2 size={12} className="text-[var(--accent)] shrink-0 animate-spin" />;
    }
    return <CircleDot size={12} className="text-[var(--status-warning)] shrink-0" />;
  }
  return <Circle size={10} className="text-[var(--text-muted)] shrink-0" strokeWidth={1.5} />;
}

function TodoItem({ todo, agentRunning }) {
  const isVerify = VERIFY_RE.test(todo.content || "");
  const label = todo.status === "in_progress" ? todo.activeForm || todo.content : todo.content;

  let textCls = "text-[12px] leading-snug";
  if (todo.status === "completed") textCls += " text-[var(--text-muted)] line-through";
  else if (todo.status === "in_progress") textCls += " text-[var(--text-primary)] font-medium";
  else textCls += " text-[var(--text-secondary)]";
  if (isVerify) textCls += " italic";

  return (
    <div className="flex items-start gap-2 py-1.5">
      <div className="pt-0.5">
        <StatusIcon status={todo.status} agentRunning={agentRunning} />
      </div>
      <span className={textCls}>{label}</span>
    </div>
  );
}

function ProgressButton({ agentRunning }) {
  const todos = useTodoStore((s) => s.todos);
  const hasEverHadTodos = useTodoStore((s) => s.hasEverHadTodos);

  if (!hasEverHadTodos) return null;

  const counts = getCounts(todos);
  const total = todos.length;
  const percent = total > 0 ? Math.round((counts.completed / total) * 100) : 0;

  const activeTodos = todos.filter((t) => t.status === "in_progress");
  const pendingTodos = todos.filter((t) => t.status === "pending");
  const completedTodos = todos.filter((t) => t.status === "completed");

  return (
    <Popper
      placement="bottom-end"
      variant="secondaryGhost"
      size="sm"
      className="h-8 px-3 focus-within:border-grey-300"
      popperClassName="w-[340px] max-h-[60vh] overflow-y-auto mt-1"
      buttonChildren={
        <div className="flex items-center gap-1.5">
          {total > 0 && counts.in_progress > 0 ? (
            agentRunning ? (
              <Loader2 size={12} className="animate-spin text-[var(--accent)]" />
            ) : (
              <CircleDot size={12} className="text-[var(--status-warning)]" />
            )
          ) : null}
          <span className="tabular-nums text-[12px] font-medium">
            Progress {total > 0 ? `${counts.completed}/${total}` : "0/0"}
          </span>
        </div>
      }
    >
      {total === 0 ? (
        <div className="text-[12px] text-[var(--text-muted)] py-4 px-3 text-center">All tasks complete.</div>
      ) : (
        <div className="flex flex-col">
          <div className="sticky top-0 left-0 bg-white z-10 px-3 pt-3 pb-2 border-b border-[var(--border-primary)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-semibold text-[var(--text-primary)]">Progress</span>
              <span className="text-[12px] text-[var(--text-muted)] tabular-nums">{percent}%</span>
            </div>
            <div className="h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] rounded-full transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--text-muted)]">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success)]" />
                {counts.completed} done
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-warning)]" />
                {counts.in_progress} active
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" />
                {counts.pending} pending
              </span>
            </div>
          </div>

          {(activeTodos.length > 0 || pendingTodos.length > 0) && (
            <div className="px-3 py-2">
              <div className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1">
                In Progress
              </div>
              {activeTodos.map((todo, i) => (
                <TodoItem key={`active-${i}`} todo={todo} agentRunning={agentRunning} />
              ))}
              {pendingTodos.map((todo, i) => (
                <TodoItem key={`pending-${i}`} todo={todo} agentRunning={agentRunning} />
              ))}
            </div>
          )}

          {completedTodos.length > 0 && (
            <div className="border-t border-[var(--border-primary)] px-3 py-2">
              <div className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1">
                Completed
              </div>
              {completedTodos.map((todo, i) => (
                <TodoItem key={`done-${i}`} todo={todo} agentRunning={agentRunning} />
              ))}
            </div>
          )}
        </div>
      )}
    </Popper>
  );
}

export default function Header({
  sessionId,
  sessionName,
  onRenameSession,
  isThinking,
  isCompacting,
  totalTokens,
  contextThreshold,
  contextUsagePercent,
  filesOpen,
  onToggleFiles,
  artifactOpen,
  onToggleArtifact,
  actions,
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const startEditing = useCallback(() => {
    setDraft(sessionName || "");
    setEditing(true);
  }, [sessionName]);

  const savingRef = useRef(false);
  const save = useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed === (sessionName || "")) {
      savingRef.current = false;
      return;
    }
    if (onRenameSession) onRenameSession(trimmed);
    try {
      await apiPatch(`/api/sessions/${sessionId}`, { name: trimmed });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    } catch {
      toast.error("Failed to rename session");
      if (onRenameSession) onRenameSession(sessionName || "");
    }
    savingRef.current = false;
  }, [draft, sessionName, sessionId, onRenameSession]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        save();
      }
      if (e.key === "Escape") {
        setEditing(false);
      }
    },
    [save]
  );

  return (
    <header className="bg-white border-b border-[var(--border-primary)] px-4 h-[58px] flex items-center gap-3 shrink-0 sticky top-0 z-10">
      {onToggleFiles && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleFiles}
          className={`p-2 ${filesOpen ? "bg-[var(--accent-subtle)] text-[var(--accent)]" : ""}`}
          title={filesOpen ? "Hide files" : "Show files"}
        >
          <FolderOpen size={18} />
        </Button>
      )}
      <div className="flex items-center min-w-0 flex-1">
        {editing ? (
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={handleKeyDown}
            placeholder="Name this session..."
            maxLength={200}
            dynamicWidth
            dynamicMinWidth="120px"
            dynamicMaxWidth="320px"
            autoFocus
            className={{
              input: {
                wrapper: "py-2 px-3 border-[var(--accent)]",
                root: "text-[14px]"
              }
            }}
          />
        ) : (
          <button
            onClick={startEditing}
            className="flex items-center gap-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] rounded-lg cursor-pointer py-2 px-3 border border-transparent hover:border-[var(--border-primary)] transition-colors min-w-0 group"
          >
            <span className="text-[14px] text-[var(--text-primary)] truncate max-w-[280px]">
              {sessionName || "Untitled session"}
            </span>
            <Pencil
              size={12}
              className="text-[var(--text-muted)] shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
            />
          </button>
        )}
      </div>

      <div className="ml-auto flex items-center gap-5">
        {/* Actions that belong to this session, e.g. approving a workflow run. */}
        {actions}
        <ProgressButton agentRunning={!!isThinking} />
        <ContextMeter
          tokens={totalTokens}
          threshold={contextThreshold}
          usagePercent={contextUsagePercent}
          isCompacting={isCompacting}
        />
        {onToggleArtifact && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleArtifact}
            className={`p-2 ${artifactOpen ? "bg-[var(--accent-subtle)] text-[var(--accent)]" : ""}`}
            title={artifactOpen ? "Close preview panel" : "Open preview panel"}
          >
            <PanelRight size={18} />
          </Button>
        )}
      </div>
    </header>
  );
}
