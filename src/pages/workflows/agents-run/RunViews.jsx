import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ArrowBendDownRight, Check, CheckCircle, Eye, Lightning, ListChecks, PencilSimple, Warning, WarningCircle } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { Button, Dialog } from "@/ui";
import SourceIcon from "../../../components/SourceIcon";
import useRunReviewStore from "./useRunReviewStore";
import "../../recommendations/recommendations.css";
import "./runReview.css";

/* What a workflow run adds to the chat workspace while its creator reviews it:
   the review bar under the header, and two pinned tabs in the side panel,
   Changes and All recommendations. The cards follow the Recommendations page,
   because an approved change becomes a card there. */

const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

const URGENCY = {
  "Act now": { key: "act-now", icon: Lightning },
  "This week": { key: "this-week", icon: Warning },
  "This month": { key: "monitor", icon: Eye },
};
const KIND = {
  new: { label: "New", cls: "new" },
  changed: { label: "Update", cls: "changed" },
  removed: { label: "Removal", cls: "removed" },
};
const GROUPS = [
  ["new", "New"],
  ["changed", "Updates to recommendations already on the page"],
  ["removed", "Removals"],
];

function Tick({ on, disabled, onChange, label }) {
  return (
    <button type="button" role="checkbox" aria-checked={on} aria-label={label} disabled={disabled} onClick={onChange} className={`run-tick${on ? " run-tick--on" : ""}`}>
      {on && <Check size={11} weight="bold" />}
    </button>
  );
}

function Urgency({ label }) {
  const u = URGENCY[label] || URGENCY["This month"];
  return (
    <span className={`rec-card-status rec-card-status--${u.key}`}>
      <u.icon size={12} />
      {label}
    </span>
  );
}

function ChangeCard({ r, left, locked, flash, onToggle }) {
  const ref = useRef(null);
  const kind = KIND[r.pending];
  const advice = !r.d && r.pending !== "removed";

  useEffect(() => {
    if (flash) ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [flash]);

  return (
    <article ref={ref} className={`run-change${left ? " run-change--left" : ""}${flash ? " run-change--flash" : ""}`}>
      {/* Header strip: the Recommendations page's apply-card header. */}
      <header className="run-change__head">
        {/* The tick leads the row: including or dropping the change is the
            review's primary action. */}
        <Tick on={!left} disabled={locked} onChange={onToggle} label={`Include ${r.title}`} />
        <h3 className="run-change__title">{r.title}</h3>
        <span className="run-change__meta">
          {advice && <span className="rec-card-tag">Advice only</span>}
          {r.sys && <SourceIcon name={r.sys} size={14} named />}
          <Urgency label={r.urg} />
        </span>
      </header>

      {left ? (
        <div className="run-change__body">
          <p className="run-change__left-tag">Won’t be applied. The page stays as it is for this one.</p>
        </div>
      ) : (
        <div className="run-change__body">
          {r.d && r.pending !== "removed" && (
            <div className="run-change__fields">
              <div className="run-change__frow run-change__frow--head">
                <span>Field</span>
                <span>Current</span>
                <span>After</span>
              </div>
              <div className="run-change__frow">
                <span className="run-change__field-name">{r.d.label}</span>
                <span>{r.d.from}</span>
                <span className="run-change__after">{r.d.to}</span>
              </div>
            </div>
          )}

          <p className="run-change__why">{r.why}</p>

          {/* Who changed this draft after it was first written, and why. */}
          {r.adjusted && (
            <p className="run-change__trail">
              <ArrowBendDownRight size={13} weight="bold" aria-hidden="true" />
              <span>
                <b>Lowered by {r.adjusted.by}</b> from {r.adjusted.from} to {r.adjusted.to}. {r.adjusted.why}
              </span>
            </p>
          )}
          {r.edited && (
            <p className="run-change__trail">
              <PencilSimple size={13} weight="bold" aria-hidden="true" />
              <span>
                <b>Edited in review</b> from {r.edited.from} to {r.edited.to}, at your request.
              </span>
            </p>
          )}

          {r.warn && (
            <p className="run-change__note">
              <WarningCircle size={14} aria-hidden="true" />
              {r.warn}
            </p>
          )}
          {r.pending === "removed" && (
            <p className="run-change__note">
              <WarningCircle size={14} aria-hidden="true" />
              This record is on hold. Its hold note is removed with it.
            </p>
          )}
        </div>
      )}
    </article>
  );
}

// The Changes tab: the run's private draft, grouped by what it does to the page.
export function RunChangesView({ onLoadComplete }) {
  const recs = useRunReviewStore((s) => s.recs);
  const left = useRunReviewStore((s) => s.left);
  const outcome = useRunReviewStore((s) => s.outcome);
  const flashId = useRunReviewStore((s) => s.flashId);
  const toggle = useRunReviewStore((s) => s.toggle);
  const clearFlash = useRunReviewStore((s) => s.clearFlash);

  useEffect(() => { onLoadComplete?.(); }, [onLoadComplete]);
  useEffect(() => {
    if (!flashId) return;
    const t = setTimeout(clearFlash, 2400);
    return () => clearTimeout(t);
  }, [flashId, clearFlash]);

  const pending = useMemo(() => recs.filter((r) => r.pending), [recs]);

  return (
    <div className="run-view">
      {GROUPS.map(([p, label]) => {
        const items = pending.filter((r) => r.pending === p);
        if (!items.length) return null;
        return (
          <section key={p} className="run-view__group">
            <h2 className="run-view__group-title">
              {label}
              <span className="run-view__count">{items.length}</span>
              <span className="run-view__rule" aria-hidden="true" />
            </h2>
            {items.map((r) => (
              <ChangeCard key={r.id} r={r} left={!!left[r.id]} locked={!!outcome} flash={flashId === r.id} onToggle={() => toggle(r.id)} />
            ))}
          </section>
        );
      })}

      <p className="run-view__foot">{recs.length - pending.length} recommendations on the page were not touched by this run.</p>
    </div>
  );
}

const BOARD_GROUPS = [
  ["Draft", "Drafted in this run"],
  ["Open", "Open"],
  ["On hold", "On hold"],
  ["Accepted", "Accepted"],
  ["Rejected", "Rejected"],
];
const IN_RUN = { new: "New in this run", changed: "Updated in this run", removed: "To be removed" };

// The All recommendations tab: the board as the team sees it, read-only, with
// this run's draft marked on it.
export function RunBoardView({ onLoadComplete }) {
  const recs = useRunReviewStore((s) => s.recs);
  const left = useRunReviewStore((s) => s.left);
  const [filter, setFilter] = useState("all");
  useEffect(() => { onLoadComplete?.(); }, [onLoadComplete]);

  const countFor = (v) => (v === "all" ? recs.length : recs.filter((r) => r.status === v).length);
  const groups = filter === "all" ? BOARD_GROUPS : BOARD_GROUPS.filter(([s]) => s === filter);

  return (
    <div className="run-view">
      {/* The Recommendations page's status segments. */}
      <div role="tablist" className="run-seg">
        {[["all", "All"], ["Draft", "Draft"], ["Open", "Open"], ["On hold", "On hold"], ["Accepted", "Accepted"], ["Rejected", "Rejected"]].map(([v, label]) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={filter === v}
            className={`run-seg__tab${filter === v ? " run-seg__tab--on" : ""}`}
            onClick={() => setFilter(v)}
          >
            {label}
            <span>{countFor(v)}</span>
          </button>
        ))}
      </div>

      {groups.map(([status, label]) => {
        const items = recs.filter((r) => r.status === status);
        if (!items.length) return null;
        return (
          <section key={status} className="run-view__group">
            {filter === "all" && (
              <h2 className="run-view__group-title">
                {label}
                <span className="run-view__count">{items.length}</span>
                <span className="run-view__rule" aria-hidden="true" />
              </h2>
            )}
            <ul className="run-board">
              {items.map((r) => {
                // "New in this run" is the section itself, so only the other
                // marks are worth a word on the row.
                const mark = r.pending && r.pending !== "new" && !left[r.id] ? IN_RUN[r.pending] : null;
                return (
                  <li key={r.id} className="run-board__row">
                    <div className="run-board__top">
                      <h3 className="run-board__title">{r.title}</h3>
                      {mark && <span className={`run-record__mark run-record__mark--${KIND[r.pending].cls}`}>{mark}</span>}
                      <Urgency label={r.urg} />
                    </div>

                    <p className="run-board__why">{r.why}</p>

                    {/* The value at stake, framed so it reads as data: the
                        field on the left, current to proposed on the right. */}
                    <div className="run-board__change">
                      <span className="run-board__field">{r.d ? r.d.label : r.pending === "removed" ? "Removal" : "Advice only"}</span>
                      <span className="run-board__values">
                        {r.d ? (
                          <>
                            <span className="run-board__from">{r.d.from}</span>
                            <ArrowRight size={11} weight="bold" aria-hidden="true" />
                            <b>{r.d.to}</b>
                          </>
                        ) : (
                          <span className="run-board__from">{r.pending === "removed" ? "Takes this recommendation off the page" : "Nothing to apply"}</span>
                        )}
                      </span>
                    </div>

                    {r.hist.length > 0 && (
                      <ul className="run-board__notes">
                        {r.hist.map((h) => {
                          const at = h.indexOf(": ");
                          return (
                            <li key={h}>
                              {at > 0 ? (
                                <>
                                  <b>{h.slice(0, at)}</b>
                                  {h.slice(at + 1)}
                                </>
                              ) : (
                                <b>{h}</b>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

// ── The decision ──────────────────────────────────────────────────────────
function ConfirmDialog({ kind, items, onCancel, onConfirm }) {
  const approve = kind === "approve";
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="run-dialog__scrim" onClick={onCancel}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <Dialog
          size="md"
          title={approve ? `Publish ${plural(items.length, "change")}?` : "Reject this run?"}
          cancelLabel="Cancel"
          confirmLabel={approve ? "Publish" : "Reject run"}
          onClose={onCancel}
          onCancel={onCancel}
          onConfirm={onConfirm}
          className="run-dialog"
        >
          {approve && (
            <ul className="run-dialog__rows">
              {items.map((r) => (
                <li key={r.id}>
                  <span className={`run-dialog__verb run-dialog__verb--${r.pending}`}>
                    {{ new: "Add", changed: "Update", removed: "Remove" }[r.pending]}
                  </span>
                  <span className="run-dialog__item">{r.title}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="run-dialog__text">
            {approve
              ? "They go to the Recommendations page for everyone who can see this workflow. Nothing changes in your ad accounts until someone applies a recommendation."
              : "None of this run's recommendations are published. The Recommendations page stays as it is, and the next scheduled run prepares a new draft."}
          </p>
        </Dialog>
      </div>
    </div>
  );
}

// Reject and Approve for a run, shown in the chat header so they stay in reach
// whichever tab is open. Once decided, they give way to the outcome.
export function RunReviewActions({ panelOpen = true, onShowPanel }) {
  const recs = useRunReviewStore((s) => s.recs);
  const left = useRunReviewStore((s) => s.left);
  const outcome = useRunReviewStore((s) => s.outcome);
  const approvedCount = useRunReviewStore((s) => s.approvedCount);
  const decide = useRunReviewStore((s) => s.decide);
  const [dialog, setDialog] = useState(null);
  const navigate = useNavigate();

  const kept = recs.filter((r) => r.pending && !left[r.id]);

  // If the side panel was closed, this brings the drafted changes back. The
  // panel icon at the end of the header does the same, but is easy to miss.
  const showChanges = !panelOpen && onShowPanel && (
    <Button variant="blueGhost" size="md" icon={ListChecks} label={`Show changes (${recs.filter((r) => r.pending).length})`} onClick={onShowPanel} />
  );

  if (outcome) {
    return (
      <div className="run-actions">
        {showChanges}
        <span className={`run-outcome run-outcome--${outcome}`}>
          {outcome === "approved" && <CheckCircle size={14} weight="fill" aria-hidden="true" />}
          {outcome === "approved" ? `Published · ${plural(approvedCount, "change")} sent to Recommendations` : "Rejected · nothing was sent"}
        </span>
      </div>
    );
  }

  return (
    <div className="run-actions">
      {showChanges}
      <Button variant="secondary" size="md" label="Reject" onClick={() => setDialog("reject")} />
      <Button variant="primary" size="md" icon={CheckCircle} iconWeight="fill" label={`Publish ${plural(kept.length, "change")}`} disabled={kept.length === 0} onClick={() => setDialog("approve")} />
      {dialog && (
        <ConfirmDialog
          kind={dialog}
          items={kept}
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            const publish = dialog === "approve";
            decide(publish ? "approved" : "rejected");
            setDialog(null);
            // Publishing ends the review: the team picks the changes up on
            // the Recommendations page.
            if (publish) navigate("/recommendations");
          }}
        />
      )}
    </div>
  );
}
