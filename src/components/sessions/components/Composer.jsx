import { useState, useRef, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, Square, Paperclip, X, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Tooltip } from "@/ui";
import { MAX_FILES, MAX_FILE_SIZE, MAX_FILE_SIZE_MB, ALLOWED_EXTENSIONS, ALLOWED_SET } from "../../../utils/upload";

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function getExtension(filename) {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot).toLowerCase() : "";
}

export default function Composer({ onSend, onCancel, disabled, isThinking, placeholder, sessionId }) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Skill-disclosure follow-up handoff: SkillsV2RunPage drops the suggested
  // prompt into sessionStorage before navigating here. Consume + clear on
  // first mount per sessionId. Pre-fill (not auto-send) so the user reviews
  // before sending — accidental chip clicks shouldn't post a message.
  //
  // Guard: only overwrite when the textarea is empty. If the user has
  // already typed something (e.g. they came back via a re-mount after
  // another chip click), we drop the new prefill rather than wipe their
  // draft. Functional setState gets the latest text without a re-render
  // dep on `text` (which would re-fire this effect every keystroke).
  useEffect(() => {
    if (!sessionId) return;
    try {
      const key = `skill-followup-prefill:${sessionId}`;
      const prefill = sessionStorage.getItem(key);
      if (prefill) {
        setText((current) => (current ? current : prefill));
        sessionStorage.removeItem(key);
      }
    } catch {
      /* private mode / quota — no-op */
    }
  }, [sessionId]);

  const validateAndAddFiles = useCallback(
    (newFiles) => {
      const currentCount = files.length;
      const toAdd = [];
      const errors = [];

      for (const file of newFiles) {
        if (currentCount + toAdd.length >= MAX_FILES) {
          errors.push(`Max ${MAX_FILES} files allowed`);
          break;
        }
        const ext = getExtension(file.name);
        if (!ALLOWED_SET.has(ext)) {
          errors.push(`${file.name}: unsupported type (${ext})`);
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          errors.push(`${file.name}: too large (max ${MAX_FILE_SIZE_MB}MB)`);
          continue;
        }
        if (files.some((f) => f.name === file.name) || toAdd.some((f) => f.name === file.name)) {
          continue;
        }
        toAdd.push(file);
      }

      if (toAdd.length > 0) {
        setFiles((prev) => [...prev, ...toAdd]);
      }
      if (errors.length > 0) {
        toast.error(errors[0]);
      }
    },
    [files]
  );

  const removeFile = useCallback((index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if ((!trimmed && files.length === 0) || disabled) return;
    onSend(trimmed, files);
    setText("");
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      validateAndAddFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (e.dataTransfer.files) validateAndAddFiles(Array.from(e.dataTransfer.files));
  };

  const canSend = !disabled && (text.trim().length > 0 || files.length > 0);

  const attachButton = (
    <>
      <Tooltip title="Attach file" placement="top">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="p-2"
          aria-label="Attach file"
        >
          <Paperclip size={16} className="text-[var(--text-muted)]" />
        </Button>
      </Tooltip>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ALLOWED_EXTENSIONS}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
    </>
  );

  const actionButton = (
    <AnimatePresence mode="wait">
      {isThinking ? (
        <motion.div
          key="stop"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.15 }}
        >
          <Tooltip title="Stop generating" placement="top">
            <Button
              variant="secondaryGhost"
              size="sm"
              onClick={onCancel}
              className="flex items-center justify-center shrink-0"
              style={{ width: 32, height: 32, padding: 0 }}
              aria-label="Stop generating"
            >
              <Square size={12} fill="currentColor" className="text-[var(--color-red)]" />
            </Button>
          </Tooltip>
        </motion.div>
      ) : (
        <motion.div
          key="send"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.15 }}
        >
          <Tooltip title={canSend ? "Send message" : "Type a message to send"} placement="top">
            <span>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSend}
                disabled={!canSend}
                className="flex items-center justify-center shrink-0"
                style={{ width: 32, height: 32, padding: 0 }}
                aria-label="Send message"
              >
                <ArrowUp size={12} strokeWidth={2.5} />
              </Button>
            </span>
          </Tooltip>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div
      className={`s-composer${disabled ? " s-composer--disabled" : ""}${dragOver ? " s-composer--drag-over" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ position: "relative" }}
    >
      {files.length > 0 && (
        <div className="s-composer__files">
          {files.map((file, i) => (
            <span key={`${file.name}-${i}`} className="s-composer__file">
              <span className="s-composer__file-name">{file.name}</span>
              <span className="s-composer__file-size">{formatSize(file.size)}</span>
              <Button variant="ghost" size="sm" onClick={() => removeFile(i)} className="p-0.5">
                <X size={10} />
              </Button>
            </span>
          ))}
        </div>
      )}

      {dragOver && (
        <div className="s-composer__drag-overlay">
          <Upload size={16} />
          Drop files to attach
        </div>
      )}

      <Input
        type="textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder || "Ask the agent to analyze your data..."}
        minRows={1}
        maxRows={6}
        leftElem={attachButton}
        rightElem={actionButton}
        className={{
          wrapper: "s-composer__input-wrapper min-h-[66px]",
          input: {
            wrapper: "rounded-[20px] overflow-hidden",
            root: "s-composer__textarea"
          }
        }}
      />
    </div>
  );
}
