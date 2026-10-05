import { useEffect, useRef, useState } from "react";
import { CaretRight, Info, Paperclip, At, X, Plus, File as FileIcon, Trash } from "@phosphor-icons/react";
import { Button, Tooltip } from "@/ui";
import { ACTIONS, FILES, MODELS, RECS, SAMPLE_UPLOADS } from "./data";
import { ChangeCard, TagIcon, promptHtml, serializePrompt, tagItems } from "./parts";
import "./workflowAgents.css";

/* The Agents section of Verify & Publish, Outputs step.
   Replaces the single AI step: any number of Reasoning and Recommendation
   agents, run in the order listed, in one shared conversation. */

const TAG_TABS = [
  ["all", "All"],
  ["kd", "Key Definitions"],
  ["folder", "Folders"],
  ["file", "Files"],
];

// The prompt box: free text with @ tags, plus documents attached to this agent.
function PromptBox({ agents, index, onPrompt, onAttach, onRemoveFile }) {
  const a = agents[index];
  const ref = useRef(null);
  const [picker, setPicker] = useState(false);
  const [tab, setTab] = useState("all");
  // The editor is uncontrolled while typing. `stamp` changes only when the
  // prompt is rewritten from outside (a tag picked, a file removed), which is
  // when the HTML has to be rebuilt.
  const [stamp, setStamp] = useState(0);
  const boxRef = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = promptHtml(a.prompt, agents);
    // After a tag is inserted, keep typing from the end of the prompt.
    if (stamp > 0) {
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamp]);

  useEffect(() => {
    if (!picker) return;
    const close = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setPicker(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [picker]);

  const items = tagItems(agents, index);
  const shown = items.filter((x) => tab === "all" || x.type === tab);

  const pick = (key) => {
    const tok = `[[${key}]] `;
    const at = a.prompt.lastIndexOf("@");
    onPrompt(at >= 0 ? a.prompt.slice(0, at) + tok + a.prompt.slice(at + 1) : a.prompt.replace(/\s*$/, " ") + tok);
    setPicker(false);
    setStamp((s) => s + 1);
  };

  return (
    <>
      <div className="wfa-pbox" ref={boxRef}>
        <div
          ref={ref}
          className="wfa-ped"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Prompt"
          onInput={(e) => {
            onPrompt(serializePrompt(e.currentTarget));
            if (e.nativeEvent.data === "@") { setTab("all"); setPicker(true); }
          }}
        />
        <div className="wfa-pbar">
          <button type="button" className="wfa-mini" onClick={() => { onAttach(); setStamp((s) => s + 1); }}>
            <Paperclip size={13} /> Attach file
          </button>
          <button type="button" className="wfa-mini" onClick={() => { setTab("all"); setPicker((p) => !p); }}>
            <At size={13} /> Tag a file or folder
          </button>
          {(a.files || []).map((n) => (
            <span className="wfa-upl" key={n}>
              <FileIcon size={12} /> {n}
              <button type="button" aria-label={`Remove ${n}`} onClick={() => { onRemoveFile(n); setStamp((s) => s + 1); }}>
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
        {picker && (
          <div className="wfa-tagpick">
            <div className="wfa-tp-tabs">
              {TAG_TABS.map(([k, l]) => (
                <button type="button" key={k} className={tab === k ? "wfa-on" : ""} onClick={() => setTab(k)}>
                  {l} ({k === "all" ? items.length : items.filter((x) => x.type === k).length})
                </button>
              ))}
            </div>
            <div className="wfa-tp-list">
              {shown.map((x) => (
                <button type="button" className="wfa-tp-item" key={x.k} onClick={() => pick(x.k)}>
                  <TagIcon type={x.type} />
                  <span>
                    <b>{x.name}</b>
                    <span>{x.meta}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="wfa-tp-foot">
              You can tag a whole workflow folder. Files of one particular run of another workflow cannot be tagged yet.
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// A field label with its explanation on an info icon, so the form is not a
// wall of help text.
function Label({ children, hint }) {
  return (
    <span className="wfa-label wfa-label-row">
      {children}
      {hint && (
        <Tooltip title={hint} placement="top">
          <span className="wfa-hint" tabIndex={0} role="img" aria-label={hint}>
            <Info size={13} />
          </span>
        </Tooltip>
      )}
    </span>
  );
}

function Preview({ a }) {
  if (a.preview === "loading") return <div className="wfa-preview-b wfa-empty">Generating…</div>;
  if (!a.preview) return <div className="wfa-preview-b wfa-empty">Preview will appear here</div>;
  if (a.kind !== "recommendation") {
    return <div className="wfa-preview-b wfa-md" dangerouslySetInnerHTML={{ __html: (FILES[a.file] || FILES.summary).md }} />;
  }
  const recs = RECS.filter((r) => (a.recs || []).includes(r.id));
  return (
    <div className="wfa-preview-b">
      <span className="wfa-help">Draft from this preview. Nothing is published.</span>
      {recs.length > 0 ? (
        recs.map((r) => (
          <ChangeCard
            key={r.id}
            // The preview is this agent's own draft, before the final check lowers it.
            r={r.id === "REC-21" ? { ...r, d: { ...r.d, to: "$350" }, warn: "Google Ads check: spend can rise by up to $290 a day." } : r}
          />
        ))
      ) : (
        <div className="wfa-md" dangerouslySetInnerHTML={{ __html: FILES.check.md }} />
      )}
    </div>
  );
}

const SLIDE_MS = 260;

function AgentCard({ agents, index, open, onToggle, update, remove }) {
  const a = agents[index];
  const rec = a.kind === "recommendation";
  const toggleAction = (key) => {
    const has = a.actions.includes(key);
    update({ actions: has ? a.actions.filter((x) => x !== key) : [...a.actions, key] });
  };
  const generate = () => {
    update({ preview: "loading" });
    setTimeout(() => update({ preview: "ready" }), 900);
  };

  // While the panel slides it clips its content. Once open it stops clipping,
  // so the tag picker can drop below it and the preview can stay in view.
  const [settled, setSettled] = useState(open);
  useEffect(() => {
    if (!open) { setSettled(false); return undefined; }
    const t = setTimeout(() => setSettled(true), SLIDE_MS);
    return () => clearTimeout(t);
  }, [open]);

  return (
    <div className={`wfa-agent${open ? " wfa-open" : ""}`}>
      {/* One row per agent: run order and name on the left; type, then the
          caret, on the right. The row opens and closes its settings. When it
          is open, Remove sits in the same header, next to what it removes. */}
      <div className="wfa-agent-h">
        <button type="button" className="wfa-agent-toggle" onClick={onToggle} aria-expanded={open}>
          <span className="wfa-num">{index + 1}</span>
          <span className="wfa-nm">{a.name || "Untitled agent"}</span>
          <span className={`wfa-chip ${rec ? "wfa-chg" : "wfa-rsn"}`}>{rec ? "Recommendation agent" : "Reasoning agent"}</span>
        </button>
        {open && (
          <Tooltip title="Remove this agent" placement="top">
            <button type="button" className="wfa-remove" aria-label={`Remove ${a.name || "this agent"}`} onClick={remove}>
              <Trash size={15} />
            </button>
          </Tooltip>
        )}
        <button type="button" className="wfa-agent-caret-btn" onClick={onToggle} tabIndex={-1} aria-hidden="true">
          <CaretRight size={13} weight="bold" className="wfa-agent-caret" />
        </button>
      </div>

      {/* Always mounted so it can slide shut as well as open. `inert` keeps the
          hidden fields out of the tab order. */}
      <div className={`wfa-collapse${open ? " wfa-open" : ""}${settled ? " wfa-settled" : ""}`} inert={!open}>
        <div className="wfa-collapse-in">
        <div className="wfa-agent-b">
          <div className="wfa-form">
            <div className="wfa-field">
              <Label>Name</Label>
              <input className="wfa-input" type="text" value={a.name} onChange={(e) => update({ name: e.target.value })} />
            </div>

            {/* Instructions: the prompt, with the files it points at. */}
            <div className="wfa-field">
              <Label hint="Type @ to point the agent at a file, a folder or a key definition. Attach a document, such as your own playbook, to give it your guidelines. Attached files are saved with the workflow and used on every run.">
                {rec ? "What should it look for?" : "What should it do?"}
              </Label>
              <PromptBox
                agents={agents}
                index={index}
                onPrompt={(prompt) => update({ prompt })}
                onAttach={() => {
                  const next = SAMPLE_UPLOADS.find((x) => !(a.files || []).includes(x));
                  if (next) update({ files: [...(a.files || []), next] });
                }}
                onRemoveFile={(n) => update({ files: a.files.filter((x) => x !== n), prompt: a.prompt.split(`[[up-${n}]]`).join("") })}
              />
              {!rec && <span className="wfa-help">Saves its files to <b>agent_memo</b>, the folder all agents share.</span>}
            </div>

            {/* How hard it thinks. */}
            <div className="wfa-field">
              <Label hint="Each agent can use a different model. Pro reasons more deeply and uses more credits.">Model</Label>
              <div className="wfa-seg-pick" role="radiogroup" aria-label="Model">
                {MODELS.map((m) => (
                  <button type="button" key={m} role="radio" aria-checked={(a.model || "Standard") === m} className={(a.model || "Standard") === m ? "wfa-on" : ""} onClick={() => update({ model: m })}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* What it is allowed to propose. Recommendation agents only. */}
            {rec && (
              <div className="wfa-field">
                <Label hint="It can only propose the changes you tick. Each action comes with guidance from Skills, which the agent must read before it recommends. A document you attach shapes its advice; it does not add new kinds of action.">
                  What may it recommend?
                </Label>
                {ACTIONS.map((g) => (
                  <div className="wfa-pgroup" key={g.g}>
                    <div className="wfa-pg-h">
                      <b>{g.g}</b>
                      {g.planned && <span className="wfa-chip">Planned</span>}
                    </div>
                    <div className="wfa-pick">
                      {g.items.map((x) => {
                        const key = `${g.g}|${x}`;
                        const on = a.actions.includes(key);
                        return (
                          <button type="button" key={key} role="checkbox" aria-checked={on} className={on ? "wfa-on" : ""} disabled={g.planned} onClick={() => toggleAction(key)}>
                            {x}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="wfa-preview">
            <div className="wfa-preview-h">
              <span>Preview</span>
              <Button
                variant="secondary"
                size="sm"
                label={a.preview === "loading" ? "Generating…" : a.preview ? "Regenerate" : "Generate preview"}
                disabled={a.preview === "loading"}
                onClick={generate}
              />
            </div>
            <Preview a={a} />
          </div>

        </div>
        </div>
      </div>
    </div>
  );
}

let nextUid = 100;

export default function AgentsSetup({ agents, setAgents, reviewChoice }) {
  const [open, setOpen] = useState(-1);

  const update = (i, patch) => setAgents((list) => list.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  const remove = (i) => {
    setAgents((list) => list.filter((_, j) => j !== i));
    setOpen(-1);
  };
  // A Reasoning agent writes up what it finds; a Recommendation agent also
  // picks which changes it may propose. The form that opens differs.
  const add = (kind) => {
    setAgents((list) => [
      ...list,
      kind === "reasoning"
        ? { uid: nextUid++, kind, name: "New reasoning agent", prompt: "", files: [], out: [], model: "Standard", preview: null }
        : { uid: nextUid++, kind, name: "New recommendation agent", prompt: "", files: [], out: [], actions: [], recs: [], model: "Standard", preview: null },
    ]);
    setOpen(agents.length);
  };

  return (
    <div className="wfa">
      <div className="wfa-agents">
        {agents.map((a, i) => (
          <AgentCard
            key={a.uid}
            agents={agents}
            index={i}
            open={open === i}
            onToggle={() => setOpen(open === i ? -1 : i)}
            update={(patch) => update(i, patch)}
            remove={() => remove(i)}
          />
        ))}
      </div>

      <div className="wfa-adds">
        <Button variant="secondary" size="md" icon={Plus} label="Add reasoning agent" onClick={() => add("reasoning")} />
        <Button variant="secondary" size="md" icon={Plus} label="Add recommendation agent" onClick={() => add("recommendation")} />
      </div>

      <div className="wfa-review-row wfa-field">
        <span className="wfa-label">Who sees the recommendations first?</span>
        {reviewChoice}
      </div>
    </div>
  );
}
