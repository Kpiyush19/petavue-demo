import { useState, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CaretDown } from '@phosphor-icons/react'
import { formatToolInput } from '../utils/escapeHtml'
import DiffView from './DiffView'

const formatToolName = (name) => (name === 'query_athena' ? 'query_db' : name)

// Boxy collapsible tool-call card (Petavue design system, node 619:36156):
// bordered box, grey header when closed / white header + rounded code panel when
// open, JetBrains Mono, green char count, CaretDown that flips on expand.
// `nested` = rendered inside a ToolCallGroup, so it drops its own box border and
// becomes a light divider row instead of a box-in-a-box.
export default function ToolCard({ tool, input, status, resultLength, diff, onExpand, nested = false }) {
  const [expanded, setExpanded] = useState(false)
  const cardRef = useRef(null)

  const isRunning = status === 'running'
  const statusText = isRunning
    ? 'running...'
    : resultLength != null
      ? `${resultLength.toLocaleString()} chars`
      : 'done'
  const hasDiff = tool === 'edit_file' && diff && status === 'done'

  const handleToggle = () => {
    const willExpand = !expanded
    setExpanded(willExpand)
    if (willExpand && onExpand && cardRef.current) {
      setTimeout(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            onExpand(cardRef.current)
          })
        })
      }, 150)
    }
  }

  const headerClass = nested
    ? `w-full flex items-center justify-between gap-3 px-3 py-2 cursor-pointer transition-colors bg-transparent hover:bg-[#F8F9FC] border-b border-[#EEF0F7]`
    : `w-full flex items-center justify-between gap-3 px-4 py-2.5 border border-[#D4D9EA] cursor-pointer transition-colors ${expanded ? 'bg-white rounded-t-[4px]' : 'bg-[#F8F9FC] rounded-[4px] hover:bg-white'}`
  const bodyClass = nested
    ? `px-3 pt-2 pb-2.5 max-h-[284px] overflow-y-auto`
    : `bg-white border-x border-b border-[#D4D9EA] rounded-b-[4px] p-3 max-h-[284px] overflow-y-auto`

  return (
    <div className={`w-full overflow-hidden ${nested ? 'last:border-b-0' : ''}`} ref={cardRef}>
      <button type="button" onClick={handleToggle} className={headerClass}>
        <span className={`font-['JetBrains_Mono'] leading-[22px] text-[#52577A] text-left truncate ${nested ? 'text-[13px]' : 'text-[14px]'}`}>
          {formatToolName(tool)}
        </span>
        <span className="flex items-center gap-3 shrink-0">
          <span className={`font-['JetBrains_Mono'] font-medium text-[10px] leading-[15px] whitespace-nowrap ${isRunning ? 'text-[#8E93AF]' : 'text-[#059669]'}`}>
            {statusText}
          </span>
          <CaretDown size={16} weight="bold" className={`text-[#8E93AF] transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`} />
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className={bodyClass}>
              {hasDiff ? (
                <DiffView diff={diff} />
              ) : (
                <div className="bg-[#F8F9FC] rounded-[12px] p-2.5">
                  <pre
                    className="m-0 font-['JetBrains_Mono'] text-[12px] leading-[24px] text-[#757A97] whitespace-pre-wrap break-words"
                    dangerouslySetInnerHTML={{ __html: formatToolInput(input) }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
