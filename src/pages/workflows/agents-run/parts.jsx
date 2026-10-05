import { Eye, Lightning, Warning, WarningCircle } from "@phosphor-icons/react";
import SourceIcon from "../../../components/SourceIcon";
import { TAGS, FILES } from "./data";
import "../../recommendations/recommendations.css";
import "./runReview.css";

/* Pieces shared by the Agents setup (Verify & Publish) and the run review. */

export const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
export const slug = (s) => (s || "agent").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "agent";
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ── @ tags ────────────────────────────────────────────────────────────────
// A prompt stores a tag as [[key]]. The key resolves to a key definition, a
// folder, a file an earlier agent wrote, or a document attached to this agent.
export function tagInfo(k, agents = []) {
  if (TAGS[k]) return TAGS[k];
  if (k.startsWith("ag-")) {
    const j = +k.slice(3);
    const a = agents[j];
    return a ? { type: "folder", name: `${j + 1}-${slug(a.name)}`, meta: `Folder · agent ${j + 1}, ${a.name}` } : null;
  }
  if (k.startsWith("up-")) return { type: "file", name: k.slice(3), meta: "File · uploaded with this agent" };
  if (FILES[k]) return { type: "file", name: FILES[k].t, meta: "File · agent_memo · written by an earlier agent" };
  return null;
}

// Tag chips live inside a contenteditable, so they are built as HTML strings.
const TAG_SVG = {
  kd: '<path d="M18 5H6l6 7-6 7h12"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
};
const tagSvg = (type) =>
  `<svg class="wfa-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TAG_SVG[type]}</svg>`;

export function TagIcon({ type }) {
  return <span className="wfa-fi" dangerouslySetInnerHTML={{ __html: tagSvg(type) }} />;
}

export function promptHtml(prompt, agents) {
  return esc(prompt || "")
    .replace(/\[\[([^\]]+)\]\]/g, (_, k) => {
      const t = tagInfo(k, agents);
      return t ? `<span class="wfa-tg" contenteditable="false" data-tag="${esc(k)}">${tagSvg(t.type)}${esc(t.name)}</span>` : "";
    })
    .replace(/\n/g, "<br>");
}

export function promptText(prompt, agents) {
  return (prompt || "").replace(/\[\[([^\]]+)\]\]/g, (_, k) => {
    const t = tagInfo(k, agents);
    return t ? "@" + t.name : "";
  });
}

// Read a contenteditable back into the [[key]] form.
export function serializePrompt(el) {
  let out = "";
  el.childNodes.forEach((n) => {
    if (n.nodeType === 3) out += n.textContent;
    else if (n.dataset && n.dataset.tag) out += `[[${n.dataset.tag}]]`;
    else if (n.nodeName === "BR") out += "\n";
    else out += (out && !out.endsWith("\n") ? "\n" : "") + serializePrompt(n);
  });
  return out;
}

// What agent i may tag: definitions, this run's folders, files earlier agents
// wrote, its own attached documents, then the wider folders.
export function tagItems(agents, i) {
  const keys = ["kd-roas", "kd-won", "f-data", "f-output"];
  if (i > 0) keys.push("f-memo");
  agents.slice(0, i).forEach((a) => (a.out || []).forEach((k) => keys.push(k)));
  (agents[i].files || []).forEach((n) => keys.push("up-" + n));
  keys.push("daily", "f-recs", "f-ctx", "f-wf-self", "f-wf-pipe", "f-wf-hub");
  return keys.map((k) => ({ k, ...tagInfo(k, agents) })).filter((x) => x.name);
}

// ── Recommendation cards ──────────────────────────────────────────────────
const URGENCY = {
  "Act now": ["act-now", Lightning],
  "This week": ["this-week", Warning],
  "This month": ["monitor", Eye],
};

/* A drafted change in an agent's preview: the same card the review's Changes
   tab shows, read-only. */
export function ChangeCard({ r }) {
  const advice = !r.d && r.pending !== "removed";
  const [ucls, UIcon] = URGENCY[r.urg] || URGENCY["This month"];
  return (
    <div className="run-change">
      <header className="run-change__head">
        {r.sys && <SourceIcon name={r.sys} size={14} named />}
        <h4 className="run-change__title">{r.title}</h4>
        <span className="run-change__meta">
          {advice && <span className="rec-card-tag">Advice only</span>}
          <span className={`rec-card-status rec-card-status--${ucls}`}>
            <UIcon size={12} />
            {r.urg}
          </span>
        </span>
      </header>
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
        {r.warn && (
          <p className="run-change__note">
            <WarningCircle size={14} aria-hidden="true" />
            {r.warn}
          </p>
        )}
      </div>
    </div>
  );
}
