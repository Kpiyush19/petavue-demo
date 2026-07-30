import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  Database, Code, FileText, PencilSimple,
  CheckCircle, Circle, WarningCircle, CaretRight, Warning, CircleNotch, ArrowsClockwise,
} from '@phosphor-icons/react'
import { Button as PvButton } from '@/ui'
import { CardView, hasCardContent } from '../../shared/CardRenderer'
import { useVerifiedSteps, verifyStep } from './stepVerification'

// "How it's built" — the data pipeline behind a widget, framed for verification.
//
// Enhancements over the original timeline (from the c2e "How it's built" concept,
// translated into our design system) + our own fixes:
//   • Steps read in pipeline order, no group labels.
//   • Per-step verification, and each step states which widgets it affects —
//     verify once, covers many.
//   • "Verified by you" and "Verified elsewhere" are visually distinct, so an
//     inherited check can never masquerade as one you personally reviewed.
//   • The first unverified step auto-opens and is marked "Needs your review".
//   • Real pointer affordances, structured Instructions/Conditions/Outputs, and
//     a code toggle with a language chip.
//
// Verification is tracked locally here; hosts keep their single widget-level
// "Verify" as the completion action (we don't add a competing one).

const TOOL_META = {
  query_athena: { Icon: Database, kind: 'SQL query' },
  query_pg: { Icon: Database, kind: 'SQL query' },
  execute_code: { Icon: Code, kind: 'Transform' },
  write_file: { Icon: FileText, kind: 'Output' },
  save_output: { Icon: FileText, kind: 'Output' },
  edit_file: { Icon: PencilSimple, kind: 'Edit' },
}

const isVerified = (step, byYou) =>
  byYou.has(step.id) || !!step.verified_via || !!step.verified

// ── Compact status marker shown on the right of each step header ──
function StatusChip({ step, verified, inherited, stale }) {
  if (stale) return (
    <span className="text-[12px] font-semibold shrink-0 flex items-center gap-1 text-amber-600">
      <WarningCircle size={13} weight="fill" /> Re-verify
    </span>
  )
  if (verified) return (
    <span className={`text-[12px] font-medium shrink-0 flex items-center gap-1 ${inherited ? 'text-[var(--text-muted)]' : 'text-green-600'}`}>
      <CheckCircle size={13} weight={inherited ? 'regular' : 'fill'} />
      {inherited ? `via ${step.verified_via}` : 'Verified'}
    </span>
  )
  return (
    <span className="text-[12px] font-medium shrink-0 flex items-center gap-1 text-[var(--text-muted)]">
      <Circle size={13} weight="regular" /> Not verified
    </span>
  )
}

// ── One step card ──
function StepCard({ step, open, onToggle, byYou, onVerify, coverage }) {
  const meta = TOOL_META[step.tool] || { Icon: Code, kind: 'Step' }
  const Icon = meta.Icon
  const verified = isVerified(step, byYou)
  const inherited = !verified ? false : (!byYou.has(step.id) && !!step.verified_via)
  const stale = !!step.changed_since_verified
  const title = step.llm_title || step.summary

  return (
    <div>
      <div className="pb-2.5">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className={`w-full text-left p-2.5 border transition-colors cursor-pointer ${
            open ? 'bg-[var(--bg-hover)] border-[var(--border-primary)] border-b-0 rounded-t-[8px]' : 'bg-transparent border-[var(--border-primary)] hover:bg-[var(--bg-hover)] rounded-[8px]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Icon size={14} weight="regular" className="text-[var(--text-muted)] shrink-0" />
            <span className="text-[12px] font-medium text-[var(--text-primary)] truncate" title={title}>{title}</span>
            <span className="flex-1" />
            <StatusChip step={step} verified={verified} inherited={inherited} stale={stale} />
            <CaretRight size={13} className={`text-[var(--text-muted)] shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
          </div>
        </button>

        <AnimatePresence initial={false}>
          {open && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
          <div className="rounded-b-[8px] bg-[var(--bg-hover)] border border-[var(--border-primary)] border-t-0 px-2.5 pb-2.5 pt-0 text-[12px] space-y-2.5">
            {/* plain-English summary, then the structured Instructions / Conditions
                / Outputs card — both live inside the same collapsible. */}
            {step.llm_description && (
              <ul className="m-0 pb-1.5 pl-3.5 space-y-0.5 list-disc">
                {step.llm_description.split('\n').filter(l => l.trim()).map((line, i) => (
                  <li key={i} className="text-[var(--text-secondary)] leading-relaxed">{line.replace(/^-\s*/, '')}</li>
                ))}
              </ul>
            )}
            {step.llm_card && hasCardContent(step.llm_card) && (
              <div className="rounded-md bg-[var(--bg-primary)] border border-[var(--border-primary)] overflow-hidden">
                <CardView card={step.llm_card} />
              </div>
            )}

            {step.code_preview && (
              <CodeBlock code={step.code_preview} lang={step.tool && step.tool.startsWith('query') ? 'SQL' : 'Python'} />
            )}

            <div className="space-y-1 pt-0.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[12px] font-medium text-[var(--text-secondary)] shrink-0">Step type</span>
                <span className="text-[12px] font-medium text-[var(--text-muted)] px-1.5 py-0.5 rounded bg-[var(--bg-primary)] border border-[var(--border-primary)]">{meta.kind}</span>
              </div>
              {coverage && (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[12px] font-medium text-[var(--text-secondary)] shrink-0">Widgets affected</span>
                  <span className="text-[12px] text-[var(--text-muted)] leading-tight">{coverage}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              {stale ? (
                <PvButton variant="primary" size="sm" label="Re-verify step" icon={ArrowsClockwise} onClick={() => onVerify(step)} />
              ) : verified ? (
                <span className={`flex items-center gap-1.5 text-[12px] font-medium ${inherited ? 'text-[var(--text-muted)]' : 'text-green-600'}`}>
                  <CheckCircle size={13} weight={inherited ? 'regular' : 'fill'} />
                  {inherited ? `Verified on ${step.verified_via}` : 'Verified by you'}
                </span>
              ) : (
                <PvButton variant="primary" size="sm" label="Verify step" icon={CheckCircle} onClick={() => onVerify(step)} />
              )}
            </div>
          </div>
          </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function CodeBlock({ code, lang }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer p-0"
      >
        <CaretRight size={11} className={`transition-transform ${show ? 'rotate-90' : ''}`} />
        {show ? 'Hide code' : 'View code'}
        <span className="text-[12px] font-bold uppercase tracking-wide text-[var(--text-muted)] border border-[var(--border-primary)] rounded px-1 py-px">{lang}</span>
      </button>
      {show && (
        <pre className="mt-1.5 p-2 bg-[var(--bg-primary)] rounded text-[12px] text-[var(--text-secondary)] overflow-x-auto max-h-[160px] overflow-y-auto whitespace-pre-wrap">{code}</pre>
      )}
    </div>
  )
}

export default function LineagePanel({ lineage, loading, error }) {
  const chain = lineage?.chain || []
  const siblings = lineage?.also_feeds_into || []
  const nSib = siblings.length

  // Verification state comes from the shared store — verifying a step here marks
  // it verified on every widget that uses it. Inherited/stale come from data.
  const byYou = useVerifiedSteps()
  const [openId, setOpenId] = useState(null)

  // Steps start collapsed — the reviewer opens what they want to inspect.
  useEffect(() => {
    setOpenId(null)
  }, [lineage])

  const verify = (step) => {
    verifyStep(step.id)
    // Collapse the just-verified step and advance to the next one still needing
    // review (using the current snapshot + the step we just verified).
    const next = chain.find(
      (s) => s.id !== step.id && !isVerified(s, byYou) && !s.changed_since_verified
    )
    setOpenId(next ? next.id : null)
  }

  // Split: everything but the final step is the shared pipeline (it feeds the
  // related widgets); the last step renders THIS widget only.

  const coverageFor = (step, isOwned) =>
    isOwned
      ? 'Affects this widget only'
      : nSib > 0
        ? `Covers this widget + ${nSib} related`
        : 'Used by this widget'

  const renderStep = (step, i, arr, isOwned) => (
    <StepCard
      key={step.id}
      step={step}
      open={openId === step.id}
      onToggle={() => setOpenId(openId === step.id ? null : step.id)}
      byYou={byYou}
      onVerify={verify}
      coverage={coverageFor(step, isOwned)}
    />
  )

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2.5 [scrollbar-gutter:stable]">
      {loading && (
        <div className="flex flex-col items-center justify-center h-32 gap-2 text-[var(--text-muted)]">
          <CircleNotch size={20} className="animate-spin" />
          <span className="text-[12px]">Loading…</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-500 text-[12px]">
          <Warning size={14} weight="fill" /> {error}
        </div>
      )}

      {lineage && !loading && (
        <>
          {/* steps — each states its own reach in the coverage line */}
          {chain.map((s, i) => renderStep(s, i, chain, i === chain.length - 1))}

          {/* related widgets — the reach of the shared steps above */}
          {nSib > 0 && (
            <div className="mt-4 pt-3 border-t border-[var(--border-primary)]">
              <h4 className="text-[12px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-1">Related widgets</h4>
              <p className="text-[12px] text-[var(--text-muted)] mb-2 mt-0">
                Verifying the shared steps above also confirms them for these widgets.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {siblings.map(s => (
                  <span key={s.file_path} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--accent-subtle)] text-[12px] text-[var(--accent)] font-medium">
                    {s.widget_name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
