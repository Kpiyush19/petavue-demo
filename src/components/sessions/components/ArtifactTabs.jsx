import { useRef, useEffect, useCallback } from "react";
import { Globe, Table2, Image, FileText, File, X, ListChecks, LayoutList } from "lucide-react";
import { Button, Tooltip } from "@/ui";
import { getFileIcon } from "../utils/fileTypes";

function TabIcon({ type }) {
  const size = 11;
  // A workflow run's own views are not files.
  if (type === "run-changes") return <ListChecks size={size} />;
  if (type === "run-board") return <LayoutList size={size} />;
  const icon = getFileIcon(type);
  switch (icon) {
    case "globe":
      return <Globe size={size} />;
    case "table":
      return <Table2 size={size} />;
    case "image":
      return <Image size={size} />;
    case "doc":
      return <FileText size={size} />;
    default:
      return <File size={size} />;
  }
}

export default function ArtifactTabs({ tabs, activeTabId, onSelectTab, onCloseTab, inline = false }) {
  const containerRef = useRef(null);
  const wrapperRef = useRef(null);
  const tabRefs = useRef({});

  const updateScrollIndicators = useCallback(() => {
    const el = containerRef.current;
    const wrapper = wrapperRef.current;
    if (!el || !wrapper) return;

    const canScrollLeft = el.scrollLeft > 0;
    const canScrollRight = el.scrollLeft < el.scrollWidth - el.clientWidth - 1;

    wrapper.classList.toggle("can-scroll-left", canScrollLeft);
    wrapper.classList.toggle("can-scroll-right", canScrollRight);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    updateScrollIndicators();
    el.addEventListener("scroll", updateScrollIndicators);
    window.addEventListener("resize", updateScrollIndicators);

    return () => {
      el.removeEventListener("scroll", updateScrollIndicators);
      window.removeEventListener("resize", updateScrollIndicators);
    };
  }, [updateScrollIndicators]);

  useEffect(() => {
    updateScrollIndicators();
  }, [tabs, updateScrollIndicators]);

  useEffect(() => {
    if (!activeTabId) return;
    const tabEl = tabRefs.current[activeTabId];
    if (tabEl) {
      tabEl.scrollIntoView({ behavior: "instant", block: "nearest", inline: "nearest" });
    }
  }, [activeTabId, tabs.length]);

  if (!tabs || tabs.length === 0) return null;

  const tabsContent = (
    <div ref={containerRef} className="s-artifact-tabs">
      {tabs.map((tab, idx) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            ref={(el) => { tabRefs.current[tab.id] = el; }}
            className={`s-artifact-tab${isActive ? " s-artifact-tab--active" : ""}${tab.pinned ? " s-artifact-tab--pinned" : ""}${
              tab.pinned && !tabs[idx + 1]?.pinned ? " s-artifact-tab--last-pinned" : ""
            }`}
            onClick={() => onSelectTab(tab.id)}
          >
            <Tooltip title={tab.title} placement="top">
              <span className="s-artifact-tab__content">
                <span className="s-artifact-tab__icon">
                  <TabIcon type={tab.contentType} />
                </span>
                <span className="s-artifact-tab__title">{tab.title}</span>
                {tab.count != null && <span className="s-artifact-tab__count">{tab.count}</span>}
              </span>
            </Tooltip>
            {tabs.length > 1 && !tab.pinned && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                className="p-1"
              >
                <X size={12} />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );

  if (inline) {
    return (
      <div ref={wrapperRef} className="s-artifact-panel__tabs-inline">
        {tabsContent}
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="s-artifact-panel__tabs-bar">
      {tabsContent}
    </div>
  );
}
