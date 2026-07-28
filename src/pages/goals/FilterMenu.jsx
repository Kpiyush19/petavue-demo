import { useState } from "react";
import { createPortal } from "react-dom";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { cn } from "../../utils/cn";

/* Shared portaled listbox menu — dashboard-style (CCDashboardDropdown): a rounded
   white card with a hairline border + soft shadow, left-accent selected rows, and
   an optional compact search box. Keeps every filter/scope dropdown consistent.

   Callers keep their own trigger button and compute `pos` ({top,left,width}) from
   the trigger rect; this component only renders the menu.

   options: [{ id, label, count? }]  ·  value: selected id  ·  onSelect(id) */
export function FilterMenu({
  pos,
  options,
  value,
  onSelect,
  onClose,
  searchable = false,
  searchPlaceholder = "Search…",
  minWidth = 240,
}) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const list = searchable && query
    ? options.filter((o) => o.label.toLowerCase().includes(query))
    : options;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[60]" onClick={onClose} />
      <div
        role="listbox"
        className="fixed z-[61] bg-white flex flex-col rounded-lg border border-grey-200 overflow-hidden"
        style={{ top: pos.top, left: pos.left, width: pos.width, minWidth, boxShadow: "0px 8px 24px 0px rgba(0,0,0,0.10)" }}
      >
        {searchable && (
          <div className="flex items-center gap-2 h-9 px-3 border-b border-grey-100 shrink-0">
            <MagnifyingGlass size={15} className="text-[var(--text-muted)] shrink-0" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 min-w-0 text-[13px] bg-transparent border-none outline-none text-[var(--text-primary)] placeholder:text-[#adb2ce]"
            />
          </div>
        )}
        <div className="max-h-[260px] overflow-y-auto py-1">
          {list.length ? list.map((o) => {
            const active = o.id === value;
            return (
              <button
                key={o.id}
                role="option"
                aria-selected={active}
                onClick={() => { onSelect(o.id); onClose(); }}
                className={cn(
                  "w-full flex items-center justify-between gap-3 px-4 py-2.5 text-[14px] text-left bg-transparent cursor-pointer border-0 border-l-2 border-solid border-transparent hover:bg-primary-50 transition-colors",
                  active ? "font-medium bg-primary-50 border-primary-500 text-primary-700" : "text-[var(--text-primary)]"
                )}
              >
                <span className="flex-1 min-w-0 truncate">{o.label}</span>
                {o.count != null && (
                  <span className={cn("text-[12px] tabular-nums shrink-0", active ? "text-primary-600" : "text-[var(--text-muted)]")}>{o.count}</span>
                )}
              </button>
            );
          }) : (
            <div className="px-4 py-3 text-[13px] text-grey-500">No results</div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
