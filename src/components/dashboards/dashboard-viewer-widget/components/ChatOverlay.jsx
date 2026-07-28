import { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { Sparkle } from "@phosphor-icons/react";
import { ClickAwayListener } from "@mui/material";
import { Button, Tooltip } from "@/ui";

const MIN_PERCENT = 40;
const MAX_PERCENT = 80;
const MIN_WIDTH_PX = 460;
const DEFAULT_PERCENT = 50;
const STORAGE_KEY = "dashboard-chat-overlay-percent";

function getInitialPercent() {
  if (typeof window === "undefined") return DEFAULT_PERCENT;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return DEFAULT_PERCENT;
  const parsed = parseFloat(saved);
  if (isNaN(parsed) || parsed < MIN_PERCENT || parsed > MAX_PERCENT) {
    return DEFAULT_PERCENT;
  }
  return parsed;
}

export default function ChatOverlay({
  isOpen,
  onClose,
  title = "Chat",
  connectionStatus,
  floating = false,
  heading = "Sage",
  headerIcon: HeaderIcon = Sparkle,
  headerIconWeight = "fill",
  headerIconSize = 22,
  headerIconClass = "text-[var(--color-primary-500)]",
  children,
}) {
  const [rightPercent, setRightPercent] = useState(getInitialPercent);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef({ startX: 0, startPercent: 0 });
  const cleanupRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(rightPercent));
  }, [rightPercent]);

  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  const handleResizeStart = useCallback((e) => {
    e.preventDefault();

    dragState.current = {
      startX: e.clientX,
      startPercent: rightPercent
    };

    setIsDragging(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (e) => {
      const deltaX = dragState.current.startX - e.clientX;
      const viewportWidth = window.innerWidth;
      const deltaPercent = (deltaX / viewportWidth) * 100;

      let newPercent = dragState.current.startPercent + deltaPercent;
      const minPercentFromPx = (MIN_WIDTH_PX / viewportWidth) * 100;
      const effectiveMin = Math.max(MIN_PERCENT, minPercentFromPx);

      newPercent = Math.max(effectiveMin, Math.min(MAX_PERCENT, newPercent));
      setRightPercent(newPercent);
    };

    const cleanup = () => {
      setIsDragging(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", cleanup);
      cleanupRef.current = null;
    };

    cleanupRef.current = cleanup;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", cleanup);
  }, [rightPercent]);

  useEffect(() => {
    if (!isOpen && cleanupRef.current) {
      cleanupRef.current();
    }
  }, [isOpen]);

  const handleClickAway = () => {
    if (isDragging) return;
    onClose();
  };

  if (!isOpen) return null;

  const renderTitle = () => (
    <Tooltip title={title} placement="bottom" displayTooltipOnOverflow>
      <span className="text-[var(--color-text-primary)] truncate">{title}</span>
    </Tooltip>
  );

  return (
    <div className={`chat-overlay ${floating ? "chat-overlay--floating" : ""} ${isDragging ? "chat-overlay--dragging" : ""}`}>
      {isDragging && <div className="chat-overlay__fullscreen-shield" />}
      <ClickAwayListener onClickAway={handleClickAway}>
        <div className="chat-overlay__right" style={{ width: `${rightPercent}%` }}>
          <div
            className={`chat-overlay__resize ${isDragging ? "chat-overlay__resize--active" : ""}`}
            onMouseDown={handleResizeStart}
          />

          <div className="chat-overlay__panel">
            <div className="chat-overlay__header">
              <div className="flex items-center gap-2 w-full overflow-hidden">
                <HeaderIcon weight={headerIconWeight} size={headerIconSize} className={`${headerIconClass} shrink-0`} />
                <span className="font-medium text-[var(--color-text-primary)]">{heading}</span>
                {!floating && (
                  <>
                    <span className="text-[var(--color-grey-600)]">|</span>
                    {renderTitle()}
                  </>
                )}
              </div>
              {floating ? (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="flex items-center justify-center w-8 h-8 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-grey-100 bg-transparent border-none cursor-pointer transition-colors shrink-0"
                >
                  <X size={18} />
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" onClick={onClose} className="!p-1.5">
                    <X size={18} />
                  </Button>
                </div>
              )}
            </div>

            <div className="chat-overlay__content">
              {children}
            </div>
          </div>
        </div>
      </ClickAwayListener>
    </div>
  );
}
