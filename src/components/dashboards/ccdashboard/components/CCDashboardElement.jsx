import { Pencil, Trash2, ExternalLink, Eye, EyeOff, MonitorPlay } from "lucide-react";
import { DotsThree } from "@phosphor-icons/react";
import { Tooltip, Popper } from "@/ui";
import { formatDate, formatDateTime } from "@/utils/formatDateTime";
import { timeAgo } from "@/utils/relativeTimeDiff";
import { getCurrentUser } from "../../../../api";
import { getDashboardId } from "../api";
import { useNavigate, useBasePath } from "../context";

const GRID_COLUMNS = "5% 67% 8% 15% 5%";

export const CCDashboardElement = ({
  artifact,
  index,
  openMenuId,
  onMenuChange,
  onRename,
  onDelete,
  onToggleShare,
  scrollContainerRef,
  tooltipActive,
  onTooltipReset,
}) => {
  const navigate = useNavigate();
  const basePath = useBasePath();
  const dashboardId = getDashboardId(artifact);
  const currentUserId = getCurrentUser()?.userId || ""
  const isOwner = artifact.created_by && artifact.created_by === currentUserId;
  const isPlaceholder = !!artifact.placeholder;

  return (
    <div
      role="button"
      tabIndex={0}
      className="grid w-full px-3 h-[58px] shrink-0 items-center border border-[var(--color-grey-100)] rounded-lg hover:bg-[var(--color-primary-50)] hover:shadow-[0_4px_12px_-2px_rgba(16,24,40,0.10)] transition-all text-left group cursor-pointer bg-white"
      style={{ gridTemplateColumns: GRID_COLUMNS }}
      onClick={isPlaceholder ? undefined : () => navigate(`${basePath}/${dashboardId}`)}
      onKeyDown={isPlaceholder ? undefined : (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`${basePath}/${dashboardId}`);
        }
      }}
    >
      <span className="flex items-center px-2 text-xs text-[var(--color-grey-500)]">
        {index + 1}.
      </span>

      <span className="flex items-center px-2 min-w-0 overflow-hidden">
        <Tooltip title={artifact.name} displayTooltipOnOverflow arrow placement="top" tooltipActive={tooltipActive}>
          <a
            href={`${basePath}/${dashboardId}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isPlaceholder) navigate(`${basePath}/${dashboardId}`);
            }}
            onMouseEnter={onTooltipReset}
            className="text-xs truncate"
          >
            {artifact.name}
          </a>
        </Tooltip>
      </span>

      <span className="flex items-center px-2 text-xs text-[var(--color-grey-600)]">
        {artifact.shared ? "Yes" : "No"}
      </span>

      <span className="flex items-center px-2 text-xs text-[var(--color-grey-500)]">
        <Tooltip title={formatDateTime(artifact.latest_run?.refreshed_at || artifact.created_at, artifact.tenant_timezone) || formatDate(artifact.latest_run?.refreshed_at || artifact.created_at)} arrow placement="top" tooltipActive={tooltipActive}>
          <span onMouseEnter={onTooltipReset}>{timeAgo(artifact.latest_run?.refreshed_at || artifact.created_at)}</span>
        </Tooltip>
      </span>

      <span
        className="flex items-center justify-center px-2"
        onClick={(e) => e.stopPropagation()}
      >
        {isPlaceholder ? (
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center p-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-grey-400)] hover:text-[var(--color-grey-700)] hover:bg-[var(--color-grey-100)] rounded-lg bg-transparent border-none cursor-pointer"
          >
            <DotsThree size={18} weight="bold" />
          </button>
        ) : (
        <Popper
          buttonChildren={<DotsThree size={18} weight="bold" />}
          placement="bottom-end"
          btnSize="sm"
          btnColor="ghost"
          buttonClassName="!p-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-grey-400)] hover:text-[var(--color-grey-700)] hover:bg-[var(--color-grey-100)] rounded-lg"
          popperClassName="w-48"
          closeOnClickInside
          zIndex={50}
          scrollContainerRef={scrollContainerRef}
          open={openMenuId === dashboardId}
          onOpenChange={(isOpen) => onMenuChange?.(isOpen ? dashboardId : null)}
        >
          {artifact.workflow_id && (
            <button
              onClick={() => navigate(`/workflows/${artifact.workflow_id}`)}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-[var(--color-grey-700)] hover:bg-[var(--color-grey-50)] active:bg-white active:text-[var(--color-grey-600)] transition-colors bg-transparent border-none cursor-pointer"
            >
              <ExternalLink size={14} />
              View Workflow
            </button>
          )}
          {isOwner && artifact.source_session_id && (
            <button
              onClick={() => navigate(`/session/${artifact.source_session_id}`)}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-[var(--color-grey-700)] hover:bg-[var(--color-grey-50)] active:bg-white active:text-[var(--color-grey-600)] transition-colors bg-transparent border-none cursor-pointer"
            >
              <MonitorPlay size={14} />
              Source Session
            </button>
          )}
          <button
            onClick={() => onRename?.(artifact)}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-[var(--color-grey-700)] hover:bg-[var(--color-grey-50)] active:bg-white active:text-[var(--color-grey-600)] transition-colors bg-transparent border-none cursor-pointer"
          >
            <Pencil size={14} />
            Rename
          </button>
          <button
            onClick={() => onToggleShare?.(artifact)}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-[var(--color-grey-700)] hover:bg-[var(--color-grey-50)] active:bg-white active:text-[var(--color-grey-600)] transition-colors bg-transparent border-none cursor-pointer"
          >
            {artifact.shared ? <EyeOff size={14} /> : <Eye size={14} />}
            {artifact.shared ? "Unshare" : "Share with team"}
          </button>
          <div className="border-t border-[var(--color-grey-100)]" />
          <button
            onClick={() => onDelete?.(artifact)}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-[var(--color-red)] hover:bg-[var(--color-red-bg)] active:bg-white active:text-[var(--color-red)]/60 transition-colors bg-transparent border-none cursor-pointer"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </Popper>
        )}
      </span>
    </div>
  );
};
