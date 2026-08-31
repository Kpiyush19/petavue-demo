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
 * One agent family as a round, coloured mark carrying its own icon.
 * Hover names the family — note our Tooltip takes `title`, not `content`.
 */
export function AgentMark({ agentKey, size = 22, ring = true }) {
  const a = AGENTS[agentKey];
  if (!a) return null;
  const Icon = agentIcon(agentKey);
  return (
    <Tooltip title={`${a.label} agent`}>
      <span
        className={`grid place-items-center rounded-full text-white cursor-default${ring ? " ring-2 ring-white" : ""}`}
        style={{ background: a.color, width: size, height: size }}
      >
        <Icon size={Math.round(size * 0.58)} weight="fill" />
      </span>
    </Tooltip>
  );
}
