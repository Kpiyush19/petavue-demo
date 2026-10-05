import { TAGS, FILES } from "./data";

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
  const keys = ["kd-cpl", "kd-ql", "f-data", "f-output"];
  if (i > 0) keys.push("f-memo");
  agents.slice(0, i).forEach((a) => (a.out || []).forEach((k) => keys.push(k)));
  (agents[i].files || []).forEach((n) => keys.push("up-" + n));
  keys.push("daily", "f-recs", "f-ctx", "f-wf-self", "f-wf-pipe", "f-wf-hub");
  return keys.map((k) => ({ k, ...tagInfo(k, agents) })).filter((x) => x.name);
}

// ── Recommendation cards ──────────────────────────────────────────────────
function Delta({ d }) {
  if (!d) return null;
  return (
    <div className="wfa-delta">
      <b>{d.label}:</b> {d.from} → <b>{d.to}</b>
      {d.was && <s>{d.was}</s>}
    </div>
  );
}

const PENDING = { new: ["wfa-new", "New"], changed: ["wfa-chg", "Changed"], removed: ["wfa-rem", "Will be removed"] };

// A drafted change: used in an agent's preview, and in the review's Changes tab
// where it also carries Keep / Drop.
export function ChangeCard({ r, readonly, dropped, locked, onKeep, onDrop }) {
  const [cls, label] = PENDING[r.pending];
  return (
    <div className={`wfa-rec${dropped ? " wfa-off" : ""}`}>
      <div className="wfa-top">
        <span className={`wfa-chip ${cls}`}>{label}</span>
        <span className="wfa-chip">{r.urg}</span>
        {r.edited && <span className="wfa-chip wfa-edit">Edited in review</span>}
        {r.by && <span className="wfa-id">by {r.by}</span>}
      </div>
      <div className="wfa-ttl">{r.title}</div>
      {r.pending !== "removed" && <Delta d={r.d} />}
      <div className="wfa-why">{r.why}</div>
      {r.warn && <div className="wfa-note">{r.warn}</div>}
      {r.pending === "removed" && <div className="wfa-note">This record is on hold. Its hold note is removed with it.</div>}
      {!readonly && (
        <div className="wfa-row">
          <span>{dropped ? "Dropped. The board stays as it is for this one." : ""}</span>
          <span className="wfa-seg">
            <button type="button" className={dropped ? "" : "wfa-on"} disabled={locked} onClick={onKeep}>Keep</button>
            <button type="button" className={dropped ? "wfa-on wfa-drop" : ""} disabled={locked} onClick={onDrop}>Drop</button>
          </span>
        </div>
      )}
    </div>
  );
}

const IN_RUN = { new: ["wfa-new", "New in this run"], changed: ["wfa-chg", "Changed in this run"], removed: ["wfa-rem", "Will be removed"] };

// A record on the board, read-only, with its notes and comments.
export function BoardCard({ r, dropped }) {
  const mark = r.pending && !dropped ? IN_RUN[r.pending] : null;
  return (
    <div className="wfa-rec">
      <div className="wfa-top">
        <span className="wfa-chip">{r.status}</span>
        <span className="wfa-chip">{r.urg}</span>
        {mark && <span className={`wfa-chip ${mark[0]}`}>{mark[1]}</span>}
      </div>
      <div className="wfa-ttl">{r.title}</div>
      <Delta d={r.d} />
      <details>
        <summary>Reason, notes and comments ({r.hist.length})</summary>
        <div className="wfa-why">{r.why}</div>
        {r.hist.length > 0 && (
          <ul>
            {r.hist.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        )}
      </details>
    </div>
  );
}

// A file's contents: a written note, or a table.
export function FileView({ file }) {
  if (file.md) return <div className="wfa-md" dangerouslySetInnerHTML={{ __html: file.md }} />;
  return (
    <div className="wfa-scroll-x">
      <table>
        <thead>
          <tr>
            {file.table.h.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {file.table.r.map((row, i) => (
            <tr key={i}>
              {row.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
