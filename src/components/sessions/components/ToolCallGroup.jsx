import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CaretDown } from '@phosphor-icons/react'
import ToolCard from './ToolCard'

const formatToolName = (name) => (name === 'query_athena' ? 'query_db' : name)

// Grouped boxy tool-call card: same header treatment as ToolCard, with an ×N
// count; expands to a stack of individual boxy ToolCards.
export default function ToolCallGroup({ tool, calls, onExpand }) {
  const [expanded, setExpanded] = useState(false)

  const count = calls.length
  const isRunning = calls.some((c) => c.status === 'running')
  const lengths = calls.map((c) => c.resultLength).filter((v) => v != null)
  let charLabel = ''
  if (lengths.length > 0) {
    const min = Math.min(...lengths)
    const max = Math.max(...lengths)
    charLabel = min === max ? `${min.toLocaleString()} chars` : `${min.toLocaleString()}–${max.toLocaleString()} chars`
  }
  const statusText = isRunning ? 'running...' : charLabel || 'done'

  return (
    <div className="w-full overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 border border-[#D4D9EA] cursor-pointer transition-colors ${expanded ? 'bg-white rounded-t-[4px]' : 'bg-[#F8F9FC] rounded-[4px] hover:bg-white'}`}
      >
        <span className="font-['JetBrains_Mono'] text-[14px] leading-[22px] text-[#52577A] text-left truncate">
          {formatToolName(tool)}
          <span className="ml-1.5 text-[#8E93AF]">×{count}</span>
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
            <div className="flex flex-col border-x border-b border-[#D4D9EA] rounded-b-[4px] bg-white overflow-hidden">
              {calls.map((call) => (
                <ToolCard key={call.id} {...call} onExpand={onExpand} nested />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
