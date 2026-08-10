import { useState, useRef, useCallback } from "react";
import { Button, Input } from "@/ui";
import { ArrowUp, Square, Paperclip, X, UploadSimple } from "@phosphor-icons/react";
import { MAX_FILES, MAX_FILE_SIZE, ALLOWED_EXTENSIONS, ALLOWED_SET } from "../../../../utils/upload";

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function getExtension(filename) {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot).toLowerCase() : "";
}

export default function Composer({
  onSend,
  onCancel,
  disabled = false,
  isThinking = false,
  placeholder = "Ask a question about your data...",
  initialValue = "",
  onInputChange
}) {
  const [text, setText] = useState(initialValue);
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const validateAndAddFiles = useCallback(
    (newFiles) => {
      const currentCount = files.length;
      const toAdd = [];

      for (const file of newFiles) {
        if (currentCount + toAdd.length >= MAX_FILES) break;
        const ext = getExtension(file.name);
        if (!ALLOWED_SET.has(ext)) continue;
        if (file.size > MAX_FILE_SIZE) continue;
        if (files.some((f) => f.name === file.name) || toAdd.some((f) => f.name === file.name)) {
          continue;
        }
        toAdd.push(file);
      }

      if (toAdd.length > 0) setFiles((prev) => [...prev, ...toAdd]);
    },
    [files]
  );

  const removeFile = useCallback((index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSend = () => {
    const trimmed = text.trim();
    if ((!trimmed && files.length === 0) || disabled) return;
    onSend(trimmed, files);
    setText("");
    onInputChange?.("");
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      if (text.trim() !== "" || files.length > 0) {
        e.preventDefault();
        handleSend();
      }
    }
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
    if (e.dataTransfer.files) {
      validateAndAddFiles(Array.from(e.dataTransfer.files));
    }
  };

  const canSend = !disabled && (text.trim().length > 0 || files.length > 0);

  return (
    <div
      className={`flex flex-col w-full border border-[var(--color-grey-200)] rounded-lg px-3 py-2 gap-2 relative transition-shadow duration-300 ${
        dragOver
          ? "border-[var(--color-primary-500)] bg-[var(--color-primary-50)]"
          : disabled
            ? `bg-[var(--color-grey-50)] cursor-not-allowed`
            : `hover:border-[var(--color-primary-300)] focus-within:!border-[var(--color-primary-500)]`
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {dragOver && (
        <div className="absolute inset-0 rounded-2xl bg-[var(--color-primary-50)] border-2 border-dashed border-[var(--color-primary-500)] flex items-center justify-center gap-2 text-[var(--color-primary-500)] text-sm font-medium z-10">
          <UploadSimple size={18} />
          Drop files to attach
        </div>
      )}

      {/* File chips */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {files.map((file, i) => (
            <span
              key={`${file.name}-${i}`}
              className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-[var(--color-grey-200)] rounded-lg text-xs"
            >
              <span className="text-[var(--color-text-primary)] truncate max-w-[120px]">{file.name}</span>
              <span className="text-[var(--color-text-secondary)]">{formatSize(file.size)}</span>
              <button
                onClick={() => removeFile(i)}
                className="text-[var(--color-grey-400)] hover:text-[var(--color-grey-600)] p-0.5"
              >
                <X size={10} weight="bold" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="p-2"
        >
          <Paperclip size={18} className="shrink-0" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_EXTENSIONS}
          onChange={handleFileChange}
          className="hidden"
        />

        <Input
          type="textarea"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onInputChange?.(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          minRows={1}
          maxRows={8}
          clearTrigger
          className={{
            wrapper: "flex-1",
            input: {
              wrapper: "border-none p-0 bg-transparent focus-within:border-none hover:border-none",
            }
          }}
        />

        {/* Send / Stop button */}
        {isThinking ? (
          <Button variant="secondaryGhost" className="!w-9 !h-9 !p-0 shrink-0" onClick={onCancel}>
            <Square size={16} weight="fill" className="text-[var(--color-red)]" />
          </Button>
        ) : (
          <Button disabled={!canSend} onClick={handleSend} className="!w-9 !h-9 !p-0 shrink-0">
            <ArrowUp size={16} weight="bold" />
          </Button>
        )}
      </div>
    </div>
  );
}
