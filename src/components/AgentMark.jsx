import {
  ChartLineUp, Wallet, Broadcast, Target, PaintBrush, FunnelSimple, Circle,
} from "@phosphor-icons/react";
import { Tooltip } from "@/ui";
import { AGENTS } from "../mocks/agentWorkflows";

/**
 * The six agent families' icons. Single source — the Agents grid and any
 * agent mark elsewhere read from here so a family can never show two
 * different glyphs on two different pages.
 */
export const AGENT_ICONS = {
  ChartLineUp,
  Wallet,
  Broadcast,
  Target,
  PaintBrush,
  FunnelSimple,
};

export function agentIcon(agentKey) {
  const a = AGENTS[agentKey];
  return (a && AGENT_ICONS[a.icon]) || Circle;
}

/**
 * One agent family's icon, filled and in the family's own colour — the same
 * treatment as the Agents grid and the workflow graph, so a family looks
 * identical everywhere it appears. Hover names it; note our Tooltip takes
 * `title`, not `content`.
 */
export function AgentMark({ agentKey, size = 20 }) {
  const a = AGENTS[agentKey];
  if (!a) return null;
  const Icon = agentIcon(agentKey);
  return (
    <Tooltip title={`${a.label} agent`}>
      <span className="inline-flex shrink-0 cursor-default" aria-label={`${a.label} agent`}>
        <Icon size={size} weight="fill" style={{ color: a.color }} />
      </span>
    </Tooltip>
  );
}
