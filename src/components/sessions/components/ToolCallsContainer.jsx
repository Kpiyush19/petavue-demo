import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import ToolCard from "./ToolCard";
import ToolCallGroup from "./ToolCallGroup";

const formatToolName = (name) => (name === "query_athena" ? "query_db" : name);

function groupByTool(calls) {
  const groups = [];
  let i = 0;
  while (i < calls.length) {
    const tool = calls[i].tool;
    let j = i + 1;
    while (j < calls.length && calls[j].tool === tool) {
      j++;
    }
    groups.push({
      tool,
      calls: calls.slice(i, j)
    });
    i = j;
  }
  return groups;
}

export default function ToolCallsContainer({ calls, isStreaming }) {
  const [expanded, setExpanded] = useState(false);
  const prevCountRef = useRef(0);
  const prevGroupCountRef = useRef(0);
  const wasStreamingRef = useRef(false);
  const containerRef = useRef(null);
  const wrapperRef = useRef(null);

  const updateScrollIndicators = useCallback(() => {
    const el = containerRef.current;
    const wrapper = wrapperRef.current;
    if (!el || !wrapper) return;

    if (!expanded) {
      wrapper.classList.remove("can-scroll-up", "can-scroll-down");
      return;
    }

    const canScrollUp = el.scrollTop > 0;
    const canScrollDown = el.scrollTop < el.scrollHeight - el.clientHeight - 1;

    wrapper.classList.toggle("can-scroll-up", canScrollUp);
    wrapper.classList.toggle("can-scroll-down", canScrollDown);
  }, [expanded]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    updateScrollIndicators();
    el.addEventListener("scroll", updateScrollIndicators);
    window.addEventListener("resize", updateScrollIndicators);

    let timeoutId;
    const mutationObserver = new MutationObserver(() => {
      updateScrollIndicators();
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateScrollIndicators, 160);
    });
    mutationObserver.observe(el, { childList: true, subtree: true });

    return () => {
      el.removeEventListener("scroll", updateScrollIndicators);
      window.removeEventListener("resize", updateScrollIndicators);
      mutationObserver.disconnect();
      clearTimeout(timeoutId);
    };
  }, [updateScrollIndicators]);

  useEffect(() => {
    updateScrollIndicators();
  }, [expanded, calls, updateScrollIndicators]);

  const count = calls.length;
  const isRunning = calls.some((c) => c.status === "running");
  const allDone = !isRunning && count > 0;

  const toolGroups = useMemo(() => groupByTool(calls), [calls]);
  const groupCount = toolGroups.length;

  useEffect(() => {
    if (isStreaming && count > prevCountRef.current) {
      setExpanded(true);
    }

    if (!isStreaming && wasStreamingRef.current) {
      setExpanded(false);
    }

    prevCountRef.current = count;
    wasStreamingRef.current = isStreaming;
  }, [count, isStreaming]);

  useEffect(() => {
    if (isStreaming && expanded && groupCount > prevGroupCountRef.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
    prevGroupCountRef.current = groupCount;
  }, [groupCount, isStreaming, expanded]);

  const handleToolExpand = (element) => {
    if (!containerRef.current || !element) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    const elementTopRelative = elementRect.top - containerRect.top + container.scrollTop;
    const containerVisibleHeight = container.clientHeight;

    const scrollTo = elementTopRelative - containerVisibleHeight / 2 + elementRect.height / 2;

    container.scrollTo({
      top: Math.max(0, scrollTo),
      behavior: "smooth"
    });
  };

  const renderNarrativeHeader = () => {
    const toolCountLabel = (
      <span className="s-timeline__tool-link s-timeline__tool-link--done">
        {count} {count === 1 ? "tool" : "tools"}
      </span>
    );

    if (allDone && !isStreaming) {
      return (
        <>
          <span className="s-timeline__completed-text">Completed</span>
          {toolCountLabel}
        </>
      );
    }

    const toolSequence = [];
    for (const call of calls) {
      const name = formatToolName(call.tool);
      if (toolSequence.length === 0 || toolSequence[toolSequence.length - 1].name !== name) {
        toolSequence.push({ name, status: call.status });
      } else {
        if (call.status === "running") {
          toolSequence[toolSequence.length - 1].status = "running";
        }
      }
    }

    const doneCount = toolSequence.filter((t) => t.status !== "running").length;
    const runningTool = toolSequence.find((t) => t.status === "running");

    if (toolSequence.length <= 3) {
      return (
        <>
          <div className="flex items-center gap-1">
            {toolSequence.map((tool, idx) => {
              const isLast = idx === toolSequence.length - 1;
              const isDone = tool.status !== "running";
              return (
                <span key={`${tool.name}-${idx}`} className="s-timeline__tool-item">
                  <span
                    className={`s-timeline__tool-link${isDone ? " s-timeline__tool-link--done" : " s-timeline__tool-link--running"}`}
                  >
                    {tool.name}
                  </span>
                  {!isLast && <span className="s-timeline__separator">→</span>}
                </span>
              );
            })}
            {isRunning && <span className="s-timeline__ellipsis">...</span>}
          </div>
          {toolCountLabel}
        </>
      );
    }

    return (
      <>
        <div className="flex items-center gap-1">
          <span className="s-timeline__done-count">{doneCount} done</span>
          {runningTool && (
            <>
              <span className="s-timeline__separator">→</span>
              <span className="s-timeline__tool-link s-timeline__tool-link--running">{runningTool.name}</span>
            </>
          )}
          <span className="s-timeline__ellipsis">...</span>
        </div>
        {toolCountLabel}
      </>
    );
  };

  return (
    <div ref={wrapperRef} className="s-timeline-wrapper">
      <div ref={containerRef} className="s-timeline-container">
        <div className="flex flex-col gap-2">
          {toolGroups.map((group, idx) =>
            group.calls.length === 1 ? (
              <ToolCard key={group.calls[0].id} {...group.calls[0]} onExpand={handleToolExpand} />
            ) : (
              <ToolCallGroup
                key={`${group.tool}-${idx}`}
                tool={group.tool}
                calls={group.calls}
                onExpand={handleToolExpand}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}
