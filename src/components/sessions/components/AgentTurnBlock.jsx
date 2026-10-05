import { File as FileIcon, Table } from "@phosphor-icons/react";
import MarkdownRenderer from "../../../utils/MarkdownRenderer";
import ToolCallsContainer from "./ToolCallsContainer";

/* A workflow run in the chat. Each agent is a card: a header naming who is
   speaking — run order, name, agent type — then the turn exactly as Sage
   shows any finished turn: the completed tool calls, the reply, the files. */

const KIND = {
  reasoning: "Reasoning agent",
  recommendation: "Recommendation agent",
};

// How a file opens in the side panel.
const viewerFor = (path) => (path.endsWith(".csv") ? "csv" : path.endsWith(".html") ? "html" : "markdown");

function AgentTurn({ turn, items, onOpenArtifact }) {
  const calls = items.filter((i) => i.type === "tool_calls_container").flatMap((i) => i.calls);
  const replies = items.filter((i) => i.type === "assistant");
  const files = items.filter((i) => i.type === "outputs").flatMap((i) => i.outputs);

  return (
    <li className={`s-agent-turn s-agent-turn--${turn.kind}`}>
      {/* Who is speaking from here on. Same marks as the setup screen. */}
      <div className="s-agent-turn__head">
        <span className="s-agent-turn__num">{turn.n}</span>
        <span className="s-agent-turn__name">{turn.name}</span>
        <span className="s-agent-turn__kind">{KIND[turn.kind] || "Agent"}</span>
      </div>

      <div className="s-agent-turn__body">
        {calls.length > 0 && <ToolCallsContainer calls={calls} />}

        {/* The reply itself, laid out like every other system reply. */}
        <div className="s-agent-turn__msg">
          <div className="s-agent-turn__logo">
            <img src="/petavue-logo.svg" alt="" />
          </div>
          <div className="s-agent-turn__content">
            {replies.map((r) => (
              <div key={r.id} className="s-agent-turn__reply">
                <MarkdownRenderer content={r.text || ""} />
              </div>
            ))}

            {files.length > 0 && (
              <div className="s-agent-turn__files">
                <span className="s-agent-turn__files-label">Saved</span>
                {files.map((f) => (
                  <button
                    type="button"
                    key={f.path}
                    className="s-agent-turn__file"
                    onClick={() => onOpenArtifact?.({ path: f.path, title: f.title, contentType: viewerFor(f.path), source: "output" })}
                  >
                    {f.path.endsWith(".csv") ? <Table size={12} /> : <FileIcon size={12} />}
                    {f.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

// All the agents of one run, in order.
export default function AgentRun({ blocks, onOpenArtifact }) {
  return (
    <ol className="s-agent-run">
      {blocks.map((b) => (
        <AgentTurn key={b.id} turn={b.turn} items={b.items} onOpenArtifact={onOpenArtifact} />
      ))}
    </ol>
  );
}
