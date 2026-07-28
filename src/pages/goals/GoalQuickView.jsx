import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X, ArrowSquareOut, Play, CircleNotch, CheckCircle, XCircle, ClockCounterClockwise, Target, WaveSine, CaretRight,
} from "@phosphor-icons/react";
import { Button as PvButton } from "@/ui";
import { apiGet, apiPost } from "../../api";
import { cn } from "../../utils/cn";

const Spinner = (props) => <CircleNotch {...props} className="animate-spin" />;
const SNOOZE_OPTIONS = ["1 day", "3 days", "1 week", "2 weeks", "Until next check-in"];

function SnoozeMenu({ onSnooze, disabled }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const toggle = () => {
    if (!open && btnRef.current) { const r = btnRef.current.getBoundingClientRect(); setPos({ top: r.bottom + 4, left: r.left }); }
    setOpen((o) => !o);
  };
  return (
    <>
      <button ref={btnRef} onClick={toggle} disabled={disabled}
        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[14px] font-medium text-[#757A97] hover:text-[var(--text-primary)] hover:bg-grey-100 bg-transparent border border-[var(--border-primary)] cursor-pointer disabled:opacity-50">
        <ClockCounterClockwise size={14} /> Snooze <CaretRight size={11} className="rotate-90" />
      </button>
      {open && pos && createPortal(
        <>
          <div className="fixed inset-0 z-[90]" onClick={() => setOpen(false)} />
          <div className="fixed z-[91] w-44 bg-white border border-[var(--border-primary)] rounded-lg shadow-lg py-1" style={{ top: pos.top, left: pos.left }}>
            <p className="px-3 py-1.5 text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Snooze for</p>
            {SNOOZE_OPTIONS.map((label) => (
              <button key={label} onClick={() => { onSnooze(label); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[14px] text-left bg-transparent border-none cursor-pointer hover:bg-grey-50 text-[var(--text-primary)]">{label}</button>
            ))}
          </div>
        </>,
        document.body
      )}
    </>
  );
}

function QuickRec({ goalId, rec, onChanged }) {
  const act = useMutation({
    mutationFn: (body) => apiPost(`/api/goals/${goalId}/recommendations/${rec.id}/act`, body),
    onSuccess: onChanged,
  });
  const done = rec.status !== "open";
  const resolved = {
    acted: { icon: CheckCircle, cls: "text-green-600", label: "Done" },
    rejected: { icon: XCircle, cls: "text-[var(--text-muted)]", label: "Dismissed" },
    snoozed: { icon: ClockCounterClockwise, cls: "text-amber-600", label: rec.snoozeLabel ? `Snoozed · ${rec.snoozeLabel}` : "Snoozed" },
  }[rec.status];
  return (
    <div className={cn("p-3.5 rounded-lg border", done ? "border-[var(--border-primary)] bg-grey-50" : "border-primary-200 bg-primary-50/30")}>
      <p className={cn("text-[14px] font-medium leading-snug mb-1", done ? "text-[#757A97]" : "text-[var(--text-primary)]")}>→ {rec.tldr}</p>
      <p className="text-[12px] text-[#757A97] leading-relaxed mb-2.5">{rec.body}</p>
      {done ? (
        <div className="flex items-center justify-between">
          <span className={cn("inline-flex items-center gap-1.5 text-[12px] font-medium", resolved.cls)}>
            {(() => { const I = resolved.icon; return <I size={14} weight="fill" />; })()} {resolved.label}
          </span>
          <button onClick={() => act.mutate({ action: "open" })} className="text-[12px] font-medium text-[var(--text-muted)] hover:text-primary-600 bg-transparent border-none cursor-pointer">Undo</button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <PvButton variant="secondary" size="sm" label="Done" icon={CheckCircle} onClick={() => act.mutate({ action: "acted" })} />
          <PvButton variant="ghost" size="sm" label="Dismiss" onClick={() => act.mutate({ action: "rejected" })} />
          <SnoozeMenu disabled={act.isPending} onSnooze={(snooze) => act.mutate({ action: "snoozed", snooze })} />
        </div>
      )}
    </div>
  );
}

export default function GoalQuickView({ id, onClose, onFull }) {
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const { data: goal } = useQuery({ queryKey: ["goal", id], queryFn: () => apiGet(`/api/goals/${id}`), enabled: !!id });

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 10);
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); document.removeEventListener("keydown", onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => { setShow(false); setTimeout(onClose, 280); };
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["goal", id] });
    qc.invalidateQueries({ queryKey: ["goals"] });
    qc.invalidateQueries({ queryKey: ["goals-attention"] });
  };
  const check = useMutation({ mutationFn: () => apiPost(`/api/goals/${id}/check-in`, {}), onSuccess: invalidate });

  const lastCheckIn = goal?.checkIns?.[0];
  const recs = lastCheckIn?.recommendations || [];

  return (
    <div className="fixed inset-0 z-[70]">
      {/* Backdrop (inspired by .dash-backdrop) */}
      <div
        onClick={close}
        className="absolute inset-0 transition-opacity duration-300"
        style={{ background: "rgba(15, 22, 36, 0.18)", opacity: show ? 1 : 0 }}
      />
      {/* Drawer — iOS-style drawer curve (Ionic) for a natural slide */}
      <div
        className="absolute top-0 right-0 h-full w-[540px] max-w-[92vw] bg-white shadow-2xl flex flex-col"
        style={{ transform: show ? "translateX(0)" : "translateX(100%)", transition: "transform 0.34s cubic-bezier(0.32, 0.72, 0, 1)" }}
      >
        {!goal ? (
          <div className="flex items-center gap-2 p-6 text-[14px] text-[var(--text-muted)]"><Spinner size={18} /> Loading…</div>
        ) : (
          <>
            {/* Header */}
            <div className="shrink-0 flex items-start justify-between gap-3 px-5 py-4 border-b border-[var(--border-primary)]">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <h3 className="text-[18px] font-semibold text-[var(--text-primary)] truncate">{goal.name}</h3>
                </div>
                <p className="text-[14px] text-[#757A97] mt-1 line-clamp-2">{goal.statement}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <PvButton variant="ghost" size="sm" icon={ArrowSquareOut} aria-label="Open full view" onClick={() => onFull(id)} />
                <PvButton variant="ghost" size="sm" icon={X} aria-label="Close" onClick={close} />
              </div>
            </div>

            {/* Actions */}
            <div className="shrink-0 flex items-center justify-between gap-2 px-5 py-3 border-b border-[var(--border-primary)]">
              <button onClick={() => onFull(id)} className="text-[14px] font-medium text-primary-600 hover:underline bg-transparent border-none cursor-pointer p-0">Open full view</button>
              <PvButton variant="primary" size="sm" label={check.isPending ? "Checking…" : "Run check-in"} icon={check.isPending ? Spinner : Play} iconPosition="suffix" disabled={check.isPending} onClick={() => check.mutate()} />
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-6">
              {lastCheckIn && (
                <div className="p-4 bg-grey-50 border border-[var(--border-primary)] rounded-xl">
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Latest check-in · {lastCheckIn.at}</p>
                  <p className="text-[14px] font-medium text-[var(--text-primary)] leading-snug">{lastCheckIn.summary}</p>
                </div>
              )}

              <section>
                <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2.5">Recommendations</p>
                {recs.length === 0 ? (
                  <p className="text-[14px] text-[var(--text-muted)]">No recommendations yet. Run a check-in.</p>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {recs.map((r) => <QuickRec key={r.id} goalId={id} rec={r} onChanged={invalidate} />)}
                  </div>
                )}
              </section>

              <section>
                <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2.5">Targets</p>
                {goal.targets.map((t) => (
                  <div key={t.id} className="flex gap-2">
                    <Target size={16} className="text-primary-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[14px] font-medium text-[var(--text-primary)] leading-snug">{t.label}</p>
                      {t.target && <p className="text-[12px] text-[var(--text-muted)] mt-0.5">Target: {t.target}</p>}
                    </div>
                  </div>
                ))}
              </section>

              <section>
                {(() => {
                  const conditions = [...goal.conditions].sort((a, b) => (b.state === "fired" ? 1 : 0) - (a.state === "fired" ? 1 : 0));
                  const firing = goal.conditions.filter((c) => c.state === "fired").length;
                  const quiet = goal.conditions.length - firing;
                  return (
                    <div className="border border-[var(--border-primary)] rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-primary)]">
                        <div className="flex items-center gap-2">
                          <WaveSine size={16} className="text-[var(--text-muted)]" />
                          <p className="text-[14px] font-semibold text-[var(--text-primary)]">What we're watching</p>
                        </div>
                        <div className="flex items-center gap-2 text-[12px] font-medium">
                          <span className={cn("inline-flex items-center gap-1", firing > 0 ? "text-rose-600" : "text-[var(--text-muted)]")}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", firing > 0 ? "bg-rose-500" : "bg-grey-300")} />{firing}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[var(--text-muted)]"><span className="w-1.5 h-1.5 rounded-full bg-green-400" />{quiet}</span>
                        </div>
                      </div>
                      <div className="p-2 flex flex-col">
                        {conditions.map((c) => {
                          const fired = c.state === "fired";
                          return (
                            <div key={c.id} title={c.label} className={cn("flex items-start gap-2.5 px-2.5 py-2.5 rounded-lg", fired && "bg-rose-50/60")}>
                              <span className="relative flex items-center justify-center w-4 h-4 shrink-0 mt-0.5">
                                {fired ? (
                                  <>
                                    <span className="absolute w-2.5 h-2.5 rounded-full bg-rose-400/40 animate-ping" />
                                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                                  </>
                                ) : (
                                  <span className="w-2 h-2 rounded-full border-[1.5px] border-grey-300" />
                                )}
                              </span>
                              <p className={cn("flex-1 text-[12px] leading-snug line-clamp-2", fired ? "text-[var(--text-primary)] font-medium" : "text-[#757A97]")}>{c.label}</p>
                              <span className={cn("shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded", fired ? "bg-rose-100 text-rose-700" : "text-[var(--text-muted)]")}>
                                {fired ? (c.count ? `${c.count} fired` : "fired") : "quiet"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
