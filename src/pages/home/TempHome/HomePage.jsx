import { useState, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowUp, ArrowRight, Paperclip, X, Upload, LayoutDashboard, FileText } from "lucide-react";
import { toast } from "sonner";
import { getCurrentUser, apiPost } from "../../../api";
import { cn } from "../../../utils/cn";
import { useSessionContext } from "../../../contexts/SessionContext";
import { MAX_FILES, MAX_FILE_SIZE, MAX_FILE_SIZE_MB, ALLOWED_EXTENSIONS, ALLOWED_SET } from "../../../utils/upload";
import { Input, Tooltip } from "@/ui";
import { NAV_ROUTES } from "../../../components/MenuBarNav";
import { useScrollCleanup } from "@/hooks/useScrollCleanup";
import { formatSkillName } from "./utils/formatSkillName";
import { SparkleIcon } from "./SparkleIcon";
import { SKILLS_CATALOG } from "../../../skills/skillsCatalog";
import { LCH_PROMPT } from "../../../mocks/linkedinHealth";

// Connector logos (src/assets/integrations). Glob handles filenames with spaces.
const CONNECTOR_ICON_MODULES = import.meta.glob("../../../assets/integrations/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
});
const CONNECTOR_ICON_BY_FILE = Object.fromEntries(
  Object.entries(CONNECTOR_ICON_MODULES).map(([path, url]) => [path.split("/").pop().toLowerCase(), url])
);
const CONNECTOR_FILE = {
  "6sense": "6sense.svg", GA4: "GA4.svg", Gong: "Gong.svg", "Google Ads": "Google Ads.svg",
  HubSpot: "HubSpot.svg", "LinkedIn Ads": "LinkedIn.svg", "LinkedIn Sales Navigator": "LinkedIn.svg",
  "Meta Ads": "Meta Ads.svg", Outreach: "Outreach.svg", Salesforce: "Salesforce.svg",
};
const connectorIcon = (name) => {
  const file = CONNECTOR_FILE[name];
  return file ? CONNECTOR_ICON_BY_FILE[file.toLowerCase()] || null : null;
};

// Six skills that speak to a demand-gen lead's top jobs (per the GTM manual):
// where to spend, proving revenue, campaign quality, pipeline pace, lead
// quality, and the "so what do I do" reallocation. Copy is outcome-level.
const SUGGESTED = [
  { slug: "channel-mix-analysis", hint: "See where your next dollar goes furthest" },
  { slug: "multi-touch-revenue-attribution", hint: "Prove what your spend actually drove" },
  { slug: "campaign-performance", hint: "Find the campaigns creating real pipeline" },
  { slug: "pipeline-coverage", hint: "Check if you're on pace to hit the number" },
  { slug: "lead-scoring-dashboard", hint: "Point sales at the leads worth their time" },
  { slug: "spend-reallocation-plan", hint: "Get a plan for where to shift budget" },
];

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
function getExtension(filename) {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot).toLowerCase() : "";
}
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
function getFirstName() {
  const user = getCurrentUser();
  if (!user) return "";
  // Greet the person, never the company. Prefer an explicit first name, then a
  // display name (unless it's the tenant), then the email's local part.
  const name = String(user.firstName || user.first_name || user.name || "").trim();
  const first =
    name && !/petavue/i.test(name)
      ? name.split(/\s+/)[0]
      : user.email
        ? user.email.split("@")[0].split(/[._-]+/)[0]
        : "";
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : "";
}
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] },
});

export default function HomePage() {
  useSessionContext();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [createLoading] = useState(false);
  const fileInputRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const messageInputRef = useRef(null);

  useScrollCleanup({ containerRef: scrollContainerRef, enabled: true });

  const skillBySlug = useMemo(() => Object.fromEntries(SKILLS_CATALOG.map((s) => [s.slug, s])), []);
  const openSkill = (slug) => navigate(`/skills/${slug}`);

  const validateAndAddFiles = useCallback(
    (newFiles) => {
      const currentCount = files.length;
      const toAdd = [];
      const errors = [];
      for (const file of newFiles) {
        if (currentCount + toAdd.length >= MAX_FILES) { errors.push(`Max ${MAX_FILES} files allowed`); break; }
        const ext = getExtension(file.name);
        if (!ALLOWED_SET.has(ext)) { errors.push(`${file.name}: unsupported type (${ext})`); continue; }
        if (file.size > MAX_FILE_SIZE) { errors.push(`${file.name}: too large (max ${MAX_FILE_SIZE_MB}MB)`); continue; }
        if (files.some((f) => f.name === file.name) || toAdd.some((f) => f.name === file.name)) continue;
        toAdd.push(file);
      }
      if (toAdd.length > 0) setFiles((prev) => [...prev, ...toAdd]);
      if (errors.length > 0) toast.error(errors[0]);
    },
    [files]
  );
  const removeFile = useCallback((index) => setFiles((prev) => prev.filter((_, i) => i !== index)), []);

  const handleSend = async () => {
    const trimmed = message.trim();
    if (createLoading) return;
    if (!trimmed && files.length === 0) return;
    // The demo answers one question. Whatever was typed, that question is what
    // is sent, so the message on screen and the reply always match.
    const state = { initialMessage: LCH_PROMPT, initialFiles: files.length > 0 ? files : null };
    try {
      // Mint a fresh empty session (direct API call — don't touch the shared
      // session hook, so WorkspacePage resumes it clean). Whatever was typed,
      // the first turn builds the LinkedIn Campaign Health report and dashboard.
      const data = await apiPost("/api/sessions", {});
      const sid = data?.session?.session_id;
      if (!sid) throw new Error("no session id");
      navigate(`/chat/${sid}`, { state });
    } catch {
      // Fallback: land in the pre-loaded demo session.
      navigate("/chat/linkedin-campaign-health", { state });
    }
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };
  const handleFileChange = (e) => {
    if (e.target.files) { validateAndAddFiles(Array.from(e.target.files)); e.target.value = ""; }
  };
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(false);
    if (e.dataTransfer.files) validateAndAddFiles(Array.from(e.dataTransfer.files));
  };

  const canSend = !createLoading && (message.trim().length > 0 || files.length > 0);

  return (
    <div className="flex h-full w-full overflow-x-auto scrollbar-hide">
      <div ref={scrollContainerRef} className="flex flex-col h-full w-full min-w-[900px] overflow-y-auto bg-grey-50">
        <div className="flex flex-col w-full max-w-[900px] mx-auto px-8 min-h-full justify-center py-16">

          {/* Greeting */}
          <motion.div {...fadeUp(0)} className="flex flex-col items-center gap-2 mb-6 text-center max-w-[700px] mx-auto">
            <div className="flex items-center justify-center gap-2.5">
              <SparkleIcon size={26} />
              <h1 className="text-[28px] leading-[38px] font-medium text-[#232532] tracking-[-0.01em]">
                {getGreeting()}{getFirstName() ? `, ${getFirstName()}` : ""}.
              </h1>
            </div>
            <p className="text-[14px] leading-[24px] text-[var(--text-secondary)] whitespace-nowrap">
              Ask anything about your marketing performance, or start with a ready-made skill.
            </p>
          </motion.div>

          {/* Expansive composer */}
          <motion.div {...fadeUp(0.05)} className="w-full max-w-[700px] mx-auto">
            <div className="relative">
              <div
                className={cn(
                  "flex flex-col bg-white border rounded-[18px] transition-colors focus-within:!border-primary-500",
                  dragOver ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-[#d4d9ea] hover:border-primary-300"
                )}
                style={{ boxShadow: "0px 18px 40px -20px rgba(54,97,237,0.18), 0px 2px 8px rgba(16,24,40,0.04)" }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 px-5 pt-4">
                    {files.map((file, i) => (
                      <span key={`${file.name}-${i}`} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-mono bg-[var(--bg-hover)] text-[var(--text-secondary)] border border-[var(--border-primary)]">
                        <span className="truncate max-w-[140px]">{file.name}</span>
                        <span className="text-[var(--text-muted)]">{formatSize(file.size)}</span>
                        <button onClick={() => removeFile(i)} className="ml-0.5 p-0.5 rounded hover:bg-[var(--border-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer transition-colors"><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                )}

                {dragOver && (
                  <div className="absolute inset-0 bg-[var(--accent)]/5 border-2 border-dashed border-[var(--accent)]/40 flex items-center justify-center z-10 pointer-events-none rounded-[18px]">
                    <div className="flex items-center gap-2 text-sm text-[var(--accent)]"><Upload size={16} /> Drop files to attach</div>
                  </div>
                )}

                {/* Input on top — expansive, multi-line */}
                <Input
                  inputRef={messageInputRef}
                  type="textarea"
                  minRows={2}
                  maxRows={8}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="How are our LinkedIn campaigns doing against target?"
                  autoFocus
                  className={{
                    wrapper: "w-full",
                    input: {
                      wrapper: "border-none pt-4 pb-1 px-5 bg-transparent focus-within:border-none",
                      root: "text-[14px] leading-[22px] text-[var(--text-primary)] placeholder:text-[#adb2ce]",
                    },
                  }}
                />

                {/* Control row — attach on the left, send on the right */}
                <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-1">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title="Attach files"
                      className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 border-none bg-transparent text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)] cursor-pointer transition-colors"
                    >
                      <Paperclip size={16} />
                    </button>
                    <input ref={fileInputRef} type="file" multiple accept={ALLOWED_EXTENSIONS} onChange={handleFileChange} className="hidden" />
                  </div>

                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!canSend}
                    aria-label="Send"
                    className={cn(
                      "flex items-center justify-center w-12 h-12 rounded-full shrink-0 border-none transition-colors",
                      canSend ? "bg-primary-500 text-white cursor-pointer hover:bg-primary-600" : "bg-[#eef0f7] text-[#adb2ce] cursor-not-allowed"
                    )}
                  >
                    <ArrowUp size={20} strokeWidth={2.75} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Suggested skills — pill chips, description on hover, + browse all */}
          <motion.div {...fadeUp(0.12)} className="w-full max-w-[860px] mx-auto mt-6 flex flex-col items-center gap-4">
            <p className="text-[12px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Ready-made skills</p>
            <div className="flex flex-wrap justify-center gap-2.5 max-w-[700px] mx-auto">
              {SUGGESTED.map(({ slug, hint }) => {
                const s = skillBySlug[slug];
                if (!s) return null;
                const isMemo = s.type === "memo";
                const Icon = isMemo ? FileText : LayoutDashboard;
                return (
                  <Tooltip key={slug} title={hint} arrow placement="top">
                    <button
                      onClick={() => openSkill(slug)}
                      className="inline-flex items-center gap-2 h-9 pl-2.5 pr-4 rounded-full bg-white border border-[#e1e5f1] text-[12px] font-normal text-[var(--text-primary)] cursor-pointer transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600"
                    >
                      <Icon size={14} className={isMemo ? "text-amber-600" : "text-blue-600"} />
                      {formatSkillName(s.name)}
                    </button>
                  </Tooltip>
                );
              })}
            </div>
            <button
              onClick={() => navigate(NAV_ROUTES.skills)}
              className="group inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-dashed border-primary-300 bg-primary-50/40 text-[12px] font-normal text-primary-600 cursor-pointer transition-colors hover:bg-primary-50 hover:border-primary-400 hover:text-primary-700"
            >
              Browse all {SKILLS_CATALOG.length} skills
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
