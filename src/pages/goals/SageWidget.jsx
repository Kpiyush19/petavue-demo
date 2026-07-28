import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Sparkle, X, PaperPlaneRight, CircleNotch } from "@phosphor-icons/react";
import { Button as PvButton } from "@/ui";
import { apiPost } from "../../api";
import { cn } from "../../utils/cn";
import { ChatOverlay } from "../../components/dashboards/dashboard-viewer-widget";
import "../../components/dashboards/dashboard-viewer-widget/styles.css";

const Spinner = (props) => <CircleNotch {...props} className="animate-spin" />;

/* ── Floating Sage launcher: round, gradient, bottom-right ── */
export const SAGE_GRADIENT = "linear-gradient(135deg, #3661ed 0%, #6d5ef0 48%, #a855f7 100%)";
function SageFab({ open, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={open ? "Close Sage" : "Open Sage"}
      className="fixed bottom-4 right-4 z-[1100] flex items-center justify-center w-12 h-12 rounded-full text-white border-none cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95"
      style={{ background: SAGE_GRADIENT, boxShadow: "0 10px 28px -6px rgba(72,86,237,0.55), 0 2px 6px rgba(16,24,40,0.18)" }}
    >
      <span className="relative flex items-center justify-center w-6 h-6">
        <Sparkle
          weight="fill"
          size={24}
          className={cn("absolute transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]", open ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100")}
        />
        <X
          weight="bold"
          size={22}
          className={cn("absolute transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]", open ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50")}
        />
      </span>
    </button>
  );
}

/* ── Sage chat body rendered inside the ChatOverlay panel. When `goal` is passed
      (goal detail page), Sage is scoped to that goal; otherwise it's portfolio-wide. ── */
export function SageChat({ goal }) {
  const greeting = goal
    ? `Hi, I'm Sage. Ask me about “${goal.name}”: what's driving it, what to do next, or why a number moved.`
    : "Hi, I'm Sage. Ask me what's wasting spend, where you're leaving demos on the table, or which goal to open first.";
  const [chat, setChat] = useState([{ role: "assistant", text: greeting }]);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef(null);
  const taRef = useRef(null);
  // Auto-grow the input up to 3 lines, then let it scroll internally.
  const MAX_INPUT_H = 76;
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_H)}px`;
    el.style.overflowY = el.scrollHeight > MAX_INPUT_H ? "auto" : "hidden";
  }, [draft]);
  const ask = useMutation({
    mutationFn: (text) => apiPost(goal ? `/api/goals/${goal.id}/sage` : "/api/goals/sage", { text }),
    onSuccess: (res) => setChat((c) => [...c, { role: "assistant", text: res.reply }]),
  });
  const send = () => {
    const text = draft.trim();
    if (!text || ask.isPending) return;
    setChat((c) => [...c, { role: "user", text }]);
    ask.mutate(text);
    setDraft("");
  };
  const sendSuggestion = (s) => {
    if (ask.isPending) return;
    setChat((c) => [...c, { role: "user", text: s }]);
    ask.mutate(s);
  };
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat, ask.isPending]);

  // A pool of things to ask; we surface the ones not asked yet after each reply,
  // so the conversation keeps offering fresh, relevant follow-ups.
  const suggestionPool = goal
    ? ["What should I do next?", "Why did the number move?", "How is this goal tracking?", "Which monitors are firing?", "What's the biggest waste here?", "Am I on pace to hit target?", "What's the cheapest demo source?"]
    : ["What's wasting spend?", "Where am I losing demos?", "What should I open first?", "How are my goals doing?", "Which goal is most off track?", "Where should my next dollar go?", "What's on track?"];
  const asked = new Set(chat.filter((m) => m.role === "user").map((m) => m.text));
  const followups = suggestionPool.filter((s) => !asked.has(s)).slice(0, 4);
  const lastIsAssistant = chat[chat.length - 1]?.role === "assistant";

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {chat.map((m, i) => (
          <div
            key={i}
            className={cn(
              "text-[14px] leading-relaxed px-3 py-2 rounded-2xl max-w-[85%]",
              m.role === "user"
                ? "self-end bg-primary-500 text-white rounded-br-md"
                : "self-start bg-grey-100 text-[var(--text-primary)] rounded-bl-md"
            )}
          >
            {m.text}
          </div>
        ))}
        {ask.isPending && (
          <div className="self-start bg-grey-100 text-[var(--text-muted)] rounded-2xl rounded-bl-md px-3 py-2">
            <Spinner size={14} />
          </div>
        )}
        {lastIsAssistant && !ask.isPending && followups.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {followups.map((s) => (
              <button
                key={s}
                onClick={() => sendSuggestion(s)}
                className="text-[12px] px-3 py-1.5 rounded-full border border-[var(--border-primary)] text-[#757A97] bg-white hover:border-primary-400 hover:text-primary-600 cursor-pointer transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="shrink-0 p-3 flex items-end gap-2">
        <textarea
          ref={taRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          rows={1}
          placeholder={goal ? `Ask about ${goal.name}…` : "Ask about spend, demos, or what to fix first…"}
          style={{ minHeight: "32px", maxHeight: `${MAX_INPUT_H}px` }}
          className="flex-1 text-[14px] px-3 py-1.5 rounded-lg border border-[var(--border-primary)] focus:border-primary-500 outline-none resize-none"
        />
        <PvButton
          variant="primary"
          size="md"
          icon={PaperPlaneRight}
          disabled={!draft.trim() || ask.isPending}
          onClick={send}
          aria-label="Send"
          className="shrink-0"
        />
      </div>
    </div>
  );
}

/* Floating Sage assistant — launcher button + resizable chat overlay. Drop it on
   any page (Goals list, goal detail) to make Sage available there. */
export default function SageWidget({ title = "Sage", hidden = false, goal = null, open: openProp, onOpenChange, fab = true }) {
  // Supports both uncontrolled (renders its own FAB) and controlled (open state
  // owned by the parent, so the launcher can live in a page header instead).
  const [openState, setOpenState] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : openState;
  const setOpen = (v) => {
    const next = typeof v === "function" ? v(open) : v;
    if (!isControlled) setOpenState(next);
    onOpenChange?.(next);
  };
  return (
    <>
      {fab && !hidden && <SageFab open={open} onClick={() => setOpen((o) => !o)} />}
      <ChatOverlay isOpen={open && !hidden} onClose={() => setOpen(false)} title={goal ? goal.name : title} floating>
        <SageChat goal={goal} />
      </ChatOverlay>
    </>
  );
}
