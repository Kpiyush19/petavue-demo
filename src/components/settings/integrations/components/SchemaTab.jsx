import { useState, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { MagnifyingGlass, DotsThreeVertical, Lightning, Clock, LinkSimple, ArrowRight, Info } from "@phosphor-icons/react";
import { Button } from "@/ui";
import { Skeleton } from "@/ui";
import { Tooltip } from "@/ui";
import { useGetSetupObjects } from "../api/getSetupObjects";
import { usePutSetupObjects } from "../api/putSetupObjects";
import { useGetIntegrationSetup } from "../api/getIntegrationSetup";
import { useGetSetupAssociations } from "../api/getSetupAssociations";
import { useGetHubspotQuota } from "../api/getHubspotQuota";
import { useTriggerSetupSync } from "../api/triggerSetupSync";
import { useGetObjectSyncStatus } from "../api/objectSyncStatus";
import { SyncStatusPill, SyncStatusLegend } from "./SyncStatusPill";
import { getObjectsInProgress } from "../api/getObjectsInProgress";
import { useNotificationStore } from "../stores/notifications";
import { SaveObjectsConfirmModal } from "./SaveObjectsConfirmModal";
import { UnsavedChangesBanner } from "./UnsavedChangesBanner";
import { SyncMenu } from "./shared/SyncMenu";
import { humanizeName } from "../utils/strings";

// Schema tab — list of synced objects with per-row sync controls.
//
// Wired entirely to /integration-setup/:id/* APIs:
//   GET  /integration-setup/:id          → header status
//   GET  /integration-setup/:id/objects[?search=]
//        → { supportedObjects, selectedObjects, matches? }
//   PUT  /integration-setup/:id/objects  (with preview confirm modal)
//   POST /integration-setup/:id/sync     (per-row sync trigger)
const SectionHeader = ({ children, count }) => (
  <div className="flex items-center gap-2 px-3 py-2 bg-[var(--color-grey-50)] border-b border-[var(--color-grey-100)]">
    <span className="text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wide">
      {children}
    </span>
    {typeof count === "number" && (
      <span className="text-[10px] text-[var(--color-grey-500)] px-1.5 py-0.5 rounded-full bg-white border border-[var(--color-grey-200)]">
        {count}
      </span>
    )}
  </div>
);

// Catalog entries arrive either as plain strings (defaults) or rich objects
// (search matches: { name, label, custom, queryable, type }).
const toRow = (entry) => {
  if (typeof entry === "string") {
    return {
      name: entry,
      label: humanizeName(entry),
      isCustom: entry.endsWith("__c"),
      isQueryable: true
    };
  }
  const name = entry?.name || entry?.object;
  if (!name) return null;
  const rawLabel = entry?.label || name;
  // BE label is usually CamelCase too — humanize it. If it's missing/placeholder,
  // fall back to humanized name.
  const label = rawLabel.includes("__MISSING")
    ? humanizeName(name)
    : humanizeName(rawLabel);
  const custom =
    entry?.custom === true ||
    (entry?.type && entry.type.toLowerCase() === "custom") ||
    name.endsWith("__c");
  return {
    name,
    label,
    isCustom: !!custom,
    isQueryable: entry?.queryable !== false
  };
};

const SEARCH_PAGE_SIZE = 20;
// Wait this long after the last keystroke before firing the server-side search,
// so we send one request per typing pause instead of one per letter. 300ms
// matches the app-wide search debounce (data-hub dictionary, sessions tray).
const SEARCH_DEBOUNCE_MS = 300;

export const SchemaTab = ({ platform, integrationId: integrationIdProp, onManageAssociations }) => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();
  const [search, setSearch] = useState("");
  // Debounced copy of `search` — what actually drives the (server-side) query.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchPage, setSearchPage] = useState(1);
  const [draft, setDraft] = useState(null); // Set | null
  const [showConfirm, setShowConfirm] = useState(false);
  const [openMenuFor, setOpenMenuFor] = useState(null);
  const [pendingSync, setPendingSync] = useState(null); // { name, mode } | null
  const closeMenu = useCallback(() => setOpenMenuFor(null), []);

  // Debounce the search box: push the typed value to the query only after the
  // user pauses, so we fire one request per pause instead of one per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to first page whenever the (debounced) search query changes.
  useEffect(() => {
    setSearchPage(1);
  }, [debouncedSearch]);

  const integrationId = integrationIdProp;
  const setupDetailQuery = useGetIntegrationSetup({ id: integrationId });

  // Live per-object sync status for the row pills. Map: objectName -> { state }.
  // Only IN_PROGRESS / COMPLETED-today objects appear; missing = no pill.
  const objectStatusQuery = useGetObjectSyncStatus({ id: integrationId });
  const syncStateByObject = objectStatusQuery.data?.objects || {};
  const objectsQuery = useGetSetupObjects({
    id: integrationId,
    search: debouncedSearch,
    // Pagination is server-driven: BE caps pageSize at 50 and returns
    // totalMatches / totalPages alongside the page slice.
    page: searchPage,
    pageSize: SEARCH_PAGE_SIZE,
    config: { staleTime: 30_000 }
  });

  // HubSpot-only: pull the association catalog so we can show a read-only
  // summary card. Skipped for Salesforce — no associations concept.
  const associationsQuery = useGetSetupAssociations({
    id: platform === "hubspot" ? integrationId : null
  });

  // HubSpot-only: daily bulk-export quota. We surface "X of 28 used today"
  // in the sync confirm modal so users don't kick off a manual sync that
  // pushes them past the safe cap (HubSpot hard cap = 30; we leave 2 slots
  // for scheduled syncs).
  const hubspotQuotaQuery = useGetHubspotQuota({
    id: platform === "hubspot" ? integrationId : null,
    enabled: platform === "hubspot" && !!pendingSync,
  });
  const putObjects = usePutSetupObjects({
    config: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "Changes saved",
          message: ""
        });
        queryClient.invalidateQueries({ queryKey: ["integration_setup_objects", integrationId] });
        queryClient.invalidateQueries({ queryKey: ["integration_setup_detail", integrationId] });
        setDraft(null);
        setShowConfirm(false);
      }
    }
  });
  const triggerSync = useTriggerSetupSync({
    config: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "Sync started",
          message: "We've queued your sync."
        });
        setOpenMenuFor(null);
        setPendingSync(null);
      },
      onError: (err) => {
        const status = err?.response?.status;
        // BE returns 422 when the connection isn't ready to sync (e.g. missing
        // sync-engine flag). Surface a generic message — Sentry already has
        // the actual reason.
        if (status === 422) {
          addNotification({
            type: "error",
            title: "Sync couldn't start",
            message:
              "Your connection isn't ready to sync yet. Our team has been notified and will follow up."
          });
          setOpenMenuFor(null);
          setPendingSync(null);
          return;
        }
        // 409 = object is already mid-sync. BE message names it; back it up with
        // the structured inProgress list.
        if (status === 409) {
          const busy = (err?.response?.data?.error?.inProgress || []).map((j) => j.object);
          addNotification({
            type: "error",
            title: "Sync already in progress",
            message:
              err?.response?.data?.message ||
              (busy.length
                ? `${busy.join(", ")} ${busy.length === 1 ? "is" : "are"} currently syncing. Please wait for it to finish.`
                : "This object is already syncing. Please wait for it to finish.")
          });
          setOpenMenuFor(null);
          setPendingSync(null);
        }
      }
    }
  });

  const catalog = objectsQuery.data;
  const isSearching = debouncedSearch.trim().length >= 2;

  const serverPicks = catalog?.selectedObjects || [];
  const serverPicksSet = new Set(serverPicks);
  // BE returns case-as-stored; pv-sync-engine writes with the same casing the
  // user picked so direct .has() works for our happy path.
  const initialSyncDoneSet = new Set(catalog?.initialSyncDoneObjects || []);

  // objectName -> data-catalog dictionary _id, for objects whose (active) catalog
  // entry exists. Drives the per-row "View Catalog" link → the data-catalog page
  // where the user sees the table's columns + completion status. Absent => no link.
  const catalogIds = catalog?.tableCatalogIds || {};

  // Default view = standard catalog + any user-picked customs that aren't
  // in the static catalog (e.g. SF `__c` objects, HubSpot custom schemas).
  // Without the union, saved customs become invisible — the count says
  // "8 enabled" but only 4 rows render.
  const baseList = catalog?.supportedObjects || [];
  const extraPicks = serverPicks.filter(
    (n) => !baseList.some((b) => (typeof b === "string" ? b : b?.name) === n)
  );
  const defaultEntries = [...baseList, ...extraPicks];

  // When searching, the BE returns just the current page slice plus
  // pagination metadata (totalMatches / page / totalPages). Default catalog
  // view stays unpaginated — it's a fixed ~14 entries.
  // Sort by enabled-status first, then by object label so users see what's
  // currently syncing at the top.
  const rows = (isSearching ? (catalog?.matches || []) : defaultEntries)
    .map(toRow)
    .filter(Boolean)
    .sort((a, b) => {
      const aEnabled = serverPicksSet.has(a.name) ? 0 : 1;
      const bEnabled = serverPicksSet.has(b.name) ? 0 : 1;
      if (aEnabled !== bEnabled) return aEnabled - bEnabled;
      return (a.label || a.name).localeCompare(b.label || b.name);
    });
  const totalMatches = isSearching ? (catalog?.totalMatches ?? rows.length) : rows.length;
  const totalPages = isSearching ? (catalog?.totalPages ?? 1) : 1;
  const currentPage = isSearching ? (catalog?.page ?? searchPage) : 1;
  const picks = draft ?? new Set(serverPicks);
  // Dirty only when the draft actually differs from the server set.
  // Touching a row and untouching it must net to "no change" — otherwise the
  // Review/Discard bar lingers when there's nothing to save.
  const draftDirty =
    draft !== null &&
    (draft.size !== serverPicksSet.size ||
      Array.from(draft).some((n) => !serverPicksSet.has(n)));

  // Diff for the confirm modal: what's being added vs removed.
  const added = draftDirty
    ? Array.from(picks).filter((n) => !serverPicksSet.has(n))
    : [];
  const removed = draftDirty
    ? serverPicks.filter((n) => !picks.has(n))
    : [];

  const setupRow = setupDetailQuery.data;
  // Initial sync is done but held for Petavue support review (LF-tag
  // enablement). The header "Sync now" button is already disabled on this; gate
  // the per-object sync menu on it too so users can't bypass the review hold
  // from the Schema tab. (FE-only block — backend doesn't enforce this yet.)
  const reviewPending = !!setupRow?.initialSyncReviewPending;
  // A sync is actively running if the initial-sync flag is set or any object is
  // live IN_PROGRESS. Used to hide the scheduled "Next sync ~" hint, which is
  // misleading while a sync is already underway.
  const syncInProgress =
    !!setupRow?.isInitialSyncInProgress ||
    Object.values(syncStateByObject).some((o) => o?.state === "IN_PROGRESS");

  const toggle = (name) => {
    setDraft((prev) => {
      const base = prev ?? new Set(serverPicks);
      const next = new Set(base);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // Select / deselect every visible row. Scoped to `rows` so search filters
  // the action — eg. "Select all matching __c custom objects" works.
  const visibleNames = rows.map((r) => r.name);
  const allVisibleSelected =
    visibleNames.length > 0 && visibleNames.every((n) => picks.has(n));
  const toggleAllVisible = () => {
    setDraft((prev) => {
      const base = prev ?? new Set(serverPicks);
      const next = new Set(base);
      if (allVisibleSelected) {
        visibleNames.forEach((n) => next.delete(n));
      } else {
        visibleNames.forEach((n) => next.add(n));
      }
      return next;
    });
  };

  const handleSaveClick = () => {
    if (!draftDirty || !integrationId) return;
    setShowConfirm(true);
  };

  const handleConfirmSave = () => {
    putObjects.mutate({
      id: integrationId,
      body: { selectedObjects: Array.from(picks) }
    });
  };

  const handleSyncObject = (name, syncMode) => {
    if (!integrationId) return;
    // Backstop: never start a per-object sync while the integration is held for
    // review (button is disabled, but guard the handler in case the menu was
    // already open when the hold landed).
    if (reviewPending) {
      setOpenMenuFor(null);
      return;
    }
    setOpenMenuFor(null);
    setPendingSync({ name, mode: syncMode });
  };

  const handleConfirmPendingSync = async () => {
    if (!pendingSync || !integrationId) return;
    const name = pendingSync.name;
    // Proactive check: if this object is already mid-sync, block with its name
    // instead of firing a doomed request. The 409 onError above is the backstop.
    try {
      const res = await getObjectsInProgress({ id: integrationId, objects: [name] });
      if ((res?.inProgress || []).length > 0) {
        addNotification({
          type: "error",
          title: "Sync already in progress",
          message: `${name} is currently syncing. Please wait for it to finish before syncing again.`
        });
        setOpenMenuFor(null);
        setPendingSync(null);
        return;
      }
    } catch {
      // Check failed — let the request go; the BE 409 will catch a real overlap.
    }
    triggerSync.mutate({
      id: integrationId,
      body: { objects: [name], syncMode: pendingSync.mode }
    });
  };

  if (!integrationId) {
    return (
      <div className="px-6 py-5">
        <div className="border border-[var(--color-grey-200)] rounded-lg p-6 text-center">
          <p className="text-sm text-[var(--color-grey-500)]">
            We couldn't load this integration. It may not be connected yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-5 flex flex-col gap-4">
      {/* Object count + next-sync row stays informational. Save controls
          move into the unified UnsavedChangesBanner that pops below on edits. */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[var(--color-grey-500)]">
            {serverPicks.length} object{serverPicks.length === 1 ? "" : "s"} enabled
          </span>
          {setupRow?.nextSyncAtDisplay && !syncInProgress && (
            <span className="inline-flex items-center gap-1 text-xs text-[var(--color-grey-500)] ml-2">
              <Clock size={12} />
              Next sync ~ {setupRow.nextSyncAtDisplay}
            </span>
          )}
        </div>
      </div>

      {draftDirty && (
        <UnsavedChangesBanner
          onDiscard={() => setDraft(null)}
          onSave={handleSaveClick}
          saveLabel="Review changes"
          isSaving={putObjects.isPending}
        />
      )}

      <div className="relative w-full max-w-md">
        <MagnifyingGlass
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-grey-400)] pointer-events-none"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search objects…"
          className="w-full h-9 pl-9 pr-3 text-sm rounded-md border border-[var(--color-grey-200)] bg-white text-[var(--color-text-primary)] placeholder:text-[var(--color-grey-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-100)] focus:border-[var(--color-primary-500)] transition-colors"
        />
      </div>

      <div className="border border-[var(--color-grey-200)] rounded-lg bg-white overflow-hidden">
        <div className="grid grid-cols-[40px_1fr_140px_40px] items-center px-3 py-2 bg-[var(--color-grey-50)] border-b border-[var(--color-grey-100)] text-[12px] font-medium text-[var(--color-grey-500)] uppercase tracking-wide">
          <label
            className="cursor-pointer flex items-center justify-center"
            title={allVisibleSelected ? "Deselect all" : "Select all"}
          >
            <input
              type="checkbox"
              className="w-4 h-4 accent-[var(--color-primary-500)] cursor-pointer"
              checked={allVisibleSelected}
              onChange={toggleAllVisible}
              disabled={putObjects.isPending || rows.length === 0}
              aria-label="Select all"
            />
          </label>
          <div>Object</div>
          <Tooltip title={<SyncStatusLegend />} arrow placement="top" maxWidth="260px">
            <div className="inline-flex items-center gap-1 w-fit cursor-default">
              Status
              <Info size={12} className="text-[var(--color-grey-400)]" />
            </div>
          </Tooltip>
          <div />
        </div>

        {objectsQuery.isLoading ? (
          <div className="flex flex-col gap-2 p-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} width="100%" height={32} />
            ))}
          </div>
        ) : objectsQuery.isError ? (
          <div className="p-6 text-center text-xs text-[var(--pv-status-error,#EF4444)]">
            Couldn't load the object list. Make sure the integration is connected
            and try again.
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-center text-xs text-[var(--color-grey-500)]">
            {isSearching
              ? `No objects match "${search}".`
              : "No objects available yet."}
          </div>
        ) : (
          <>
            {isSearching && (
              <SectionHeader>
                {totalPages > 1
                  ? `Search results: ${totalMatches} match${totalMatches === 1 ? "" : "es"} · page ${currentPage} of ${totalPages}`
                  : `Search results: ${totalMatches} match${totalMatches === 1 ? "" : "es"}`}
              </SectionHeader>
            )}
            {rows.map((obj) => {
              const isEnabled = picks.has(obj.name);
              const isUnqueryable = obj.isQueryable === false;
              const isSavedEnabled = serverPicksSet.has(obj.name);
              const menuOpen = openMenuFor === obj.name;
              return (
                <div
                  key={obj.name}
                  className="grid grid-cols-[40px_1fr_140px_40px] items-center px-3 py-2.5 border-b border-[var(--color-grey-100)] last:border-b-0 bg-white hover:bg-[var(--color-grey-50)]"
                  title={
                    isUnqueryable ? "This object isn't queryable in your org." : undefined
                  }
                >
                  <label className="cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-[var(--color-primary-500)] cursor-pointer"
                      checked={isEnabled}
                      onChange={() => toggle(obj.name)}
                      disabled={putObjects.isPending}
                    />
                  </label>
                  <div className="text-sm font-medium text-[var(--color-text-primary)] flex items-center gap-1.5">
                    <span>{obj.label}</span>
                    {obj.label !== obj.name && (
                      <span className="text-[12px] text-[var(--color-grey-500)] font-normal">
                        ({obj.name})
                      </span>
                    )}
                    {isUnqueryable && (
                      <span className="text-[10px] text-[var(--color-grey-500)] bg-[var(--color-grey-100)] px-1.5 py-0.5 rounded">
                        Not queryable
                      </span>
                    )}
                    {catalogIds[obj.name] ? (
                      <Link
                        to={`/data-hub/dictionary/${integrationId}?table=${catalogIds[obj.name]}`}
                        className="inline-flex items-center gap-0.5 text-[12px] font-normal text-[var(--color-primary-500)] hover:underline"
                        title="View this table in the data catalog"
                      >
                        View Catalog
                      </Link>
                    ) : (
                      <span className="text-[12px] font-normal text-[var(--color-grey-400)]">
                        No catalog
                      </span>
                    )}
                  </div>
                  <div className="text-xs">
                    {/* One pill language: live sync status when present, else the
                        muted Enabled/Disabled config state. */}
                    <SyncStatusPill
                      state={
                        syncStateByObject[obj.name]?.state ||
                        (isEnabled ? "ENABLED" : "DISABLED")
                      }
                    />
                  </div>
                  <div className="relative">
                    {/* Sync menu — only meaningful for objects that are
                        currently saved as enabled (server picks). */}
                    {isSavedEnabled && (
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenuFor(menuOpen ? null : obj.name)
                        }
                        className="p-1 rounded hover:bg-[var(--color-grey-100)] text-[var(--color-grey-500)] hover:text-[var(--color-text-primary)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        aria-label="Sync options"
                        title={
                          reviewPending
                            ? "Sync is completed, our support team is reviewing the sync once."
                            : undefined
                        }
                        disabled={triggerSync.isPending || reviewPending}
                      >
                        {triggerSync.isPending && triggerSync.variables?.body?.objects?.[0] === obj.name ? (
                          <Lightning size={14} className="animate-pulse" />
                        ) : (
                          <DotsThreeVertical size={16} weight="bold" />
                        )}
                      </button>
                    )}
                    <SyncMenu
                      open={menuOpen}
                      onClose={closeMenu}
                      onPick={(mode) => handleSyncObject(obj.name, mode)}
                      modes={initialSyncDoneSet.has(obj.name) ? ["incremental", "full"] : ["initial"]}
                    />
                  </div>
                </div>
              );
            })}
            {isSearching && totalPages > 1 && (
              <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[var(--color-grey-50)] border-t border-[var(--color-grey-100)]">
                <span className="text-[12px] text-[var(--color-grey-500)]">
                  Showing {(currentPage - 1) * SEARCH_PAGE_SIZE + 1}–
                  {Math.min(currentPage * SEARCH_PAGE_SIZE, totalMatches)} of{" "}
                  {totalMatches}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className="px-2.5 py-1 text-xs rounded border border-[var(--color-grey-200)] bg-white text-[var(--color-text-primary)] hover:bg-[var(--color-grey-100)] disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={() => setSearchPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="px-2.5 py-1 text-xs rounded border border-[var(--color-grey-200)] bg-white text-[var(--color-text-primary)] hover:bg-[var(--color-grey-100)] disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={() =>
                      setSearchPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {platform === "hubspot" && (
        <HubspotAssociationsSummary
          query={associationsQuery}
          supported={associationsQuery.data?.supportedAssociations || []}
          selectedKeys={associationsQuery.data?.selectedAssociations || []}
          manualMode={!!associationsQuery.data?.manualMode}
          catalogIds={associationsQuery.data?.tableCatalogIds || {}}
          integrationId={integrationId}
          onManage={onManageAssociations}
        />
      )}

      {showConfirm && (
        <SaveObjectsConfirmModal
          added={added}
          removed={removed}
          totalBefore={serverPicks.length}
          totalAfter={picks.size}
          isSaving={putObjects.isPending}
          onConfirm={handleConfirmSave}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {pendingSync && (
        <SyncObjectConfirmModal
          objectName={pendingSync.name}
          mode={pendingSync.mode}
          isPending={triggerSync.isPending}
          onConfirm={handleConfirmPendingSync}
          onCancel={() => setPendingSync(null)}
          quota={platform === "hubspot" ? hubspotQuotaQuery.data : null}
          quotaLoading={platform === "hubspot" ? hubspotQuotaQuery.isLoading : false}
        />
      )}
    </div>
  );
};

// Per-object sync confirmation — prevents accidental triggers from the
// three-dot menu (especially full / initial which are expensive).
const SYNC_MODE_LABEL = {
  incremental: "Sync latest changes",
  full: "Re-sync everything",
  initial: "Start first sync"
};
const SYNC_MODE_BLURB = {
  incremental: "We'll bring in records that have changed since the last sync.",
  full: "We'll pull every record for this object again from scratch. This can take a while.",
  initial: "We'll pull all your existing data for this object. Use this if the first sync didn't finish."
};
const SyncObjectConfirmModal = ({
  objectName,
  mode,
  isPending,
  onConfirm,
  onCancel,
  quota,
  quotaLoading,
}) => {
  // HubSpot quota tiers — `quota` is null/undefined for Salesforce.
  // Warn at <= 5 remaining, block at 0.
  const quotaTier = quota
    ? quota.remaining === 0
      ? "blocked"
      : quota.remaining <= 5
      ? "warn"
      : "ok"
    : null;
  const blocked = quotaTier === "blocked";

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[var(--color-grey-200)]">
          <h2 className="text-base font-medium text-[var(--color-text-primary)]">
            {SYNC_MODE_LABEL[mode] || "Sync now"}
          </h2>
          <p className="text-xs text-[var(--color-grey-500)] mt-1">
            Object: <span className="font-medium text-[var(--color-text-primary)]">{humanizeName(objectName)}</span>
          </p>
        </div>
        <div className="px-5 py-4 text-sm text-[var(--color-text-primary)]">
          {SYNC_MODE_BLURB[mode] || "Queue a sync for this object now?"}
        </div>

        {quotaLoading && (
          <div className="mx-5 mb-4 px-3 py-2 text-xs text-[var(--color-grey-500)] bg-[var(--color-grey-50)] border border-[var(--color-grey-200)] rounded-md">
            Checking HubSpot daily quota…
          </div>
        )}

        {quota && quotaTier === "ok" && (
          <div className="mx-5 mb-4 px-3 py-2 text-xs text-[var(--color-grey-500)] bg-[var(--color-grey-50)] border border-[var(--color-grey-200)] rounded-md">
            HubSpot daily quota: <span className="font-medium text-[var(--color-text-primary)]">{quota.used} of {quota.limit}</span> used ({quota.remaining} remaining).
          </div>
        )}

        {quota && quotaTier === "warn" && (
          <div className="mx-5 mb-4 px-3 py-2 text-xs bg-[var(--color-orange-bg,#fff7e6)] border border-[var(--[var(--color-orange)],#f7c97e)] text-[var(--color-orange,#8a5a00)] rounded-md">
            <div className="font-medium">HubSpot quota running low</div>
            <div className="mt-0.5">
              {quota.used} of {quota.limit} bulk exports used today. Only {quota.remaining} left. This sync uses 1 slot. Scheduled syncs may be skipped if you run out.
            </div>
          </div>
        )}

        {quota && blocked && (
          <div className="mx-5 mb-4 px-3 py-2 text-xs bg-[var(--color-red-bg,#fde8e8)] border border-[var(--[var(--color-red)],#f5a5a5)] text-[var(--color-red,#8b1d1d)] rounded-md">
            <div className="font-medium">HubSpot daily quota exhausted</div>
            <div className="mt-0.5">
              All {quota.limit} bulk-export slots are used for today. Quota resets at midnight in your tenant timezone. Try again then.
            </div>
          </div>
        )}

        <div className="px-5 py-4 border-t border-[var(--color-grey-200)] flex items-center justify-end gap-2">
          <Button variant="secondary" size="md" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="primary" size="md" onClick={onConfirm} disabled={isPending || blocked}>
            {isPending ? "Queueing…" : "Yes, sync now"}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Read-only summary card for HubSpot's effective associations. Lives at the
// bottom of the Schema tab so users see at a glance what pairs Petavue will
// sync — without leaving Schema. Manage picks on the Associations tab.
const HubspotAssociationsSummary = ({
  query,
  supported,
  selectedKeys,
  manualMode,
  catalogIds = {},
  integrationId,
  onManage,
}) => {
  const isReady = !query.isLoading && supported.length > 0;
  const effectivePairs = manualMode
    ? supported.filter((p) =>
        new Set(selectedKeys.map((k) => String(k).toUpperCase())).has(p.key)
      )
    : supported; // empty selectedAssociations = sync everything
  const enabledKeys = new Set(effectivePairs.map((p) => p.key));
  const totalCount = supported.length;
  const activeCount = effectivePairs.length;

  return (
    <div className="border border-[var(--color-grey-200)] rounded-lg bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--color-grey-100)] bg-[var(--color-grey-50)]">
        <LinkSimple size={14} className="text-[var(--color-primary-500)]" />
        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
          Associations
        </h3>
        <span className="text-xs text-[var(--color-grey-500)] ml-auto">
          {isReady
            ? `${activeCount} of ${totalCount} enabled`
            : query.isLoading
            ? "Loading…"
            : "No pairs available yet"}
        </span>
        {onManage && (
          <button
            type="button"
            onClick={onManage}
            className="inline-flex items-center gap-0.5 text-xs font-medium text-[var(--color-primary-500)] hover:underline"
            title="Enable or disable association pairs"
          >
            Manage
            <ArrowRight size={12} weight="bold" />
          </button>
        )}
      </div>

      {!isReady ? (
        <p className="text-xs text-[var(--color-grey-500)] px-3 py-2.5">
          Save your object selection above, then refresh to see available
          association pairs.
        </p>
      ) : (
        <div>
          {supported.map((p) => {
            const enabled = enabledKeys.has(p.key);
            return (
              <div
                key={p.key}
                className="grid grid-cols-[40px_1fr_140px_40px] items-center px-3 py-2.5 border-b border-[var(--color-grey-100)] last:border-b-0 bg-white hover:bg-[var(--color-grey-50)]"
              >
                {/* Empty cell aligning with the object rows' checkbox column. */}
                <div aria-hidden="true" />
                <div className="text-sm font-medium text-[var(--color-text-primary)] flex items-center gap-1.5">
                  <span>{p.label || `${p.from} ↔ ${p.to}`}</span>
                  {catalogIds[p.key] && integrationId ? (
                    <Link
                      to={`/data-hub/dictionary/${integrationId}?table=${catalogIds[p.key]}`}
                      className="inline-flex items-center gap-0.5 text-[12px] font-normal text-[var(--color-primary-500)] hover:underline"
                      title="View this association table in the data catalog"
                    >
                      View Catalog
                    </Link>
                  ) : (
                    <span className="text-[12px] font-normal text-[var(--color-grey-400)]">
                      No catalog
                    </span>
                  )}
                </div>
                <div className="text-xs">
                  <SyncStatusPill state={enabled ? "ENABLED" : "DISABLED"} />
                </div>
                {/* Empty cell aligning with the object rows' sync-menu column. */}
                <div aria-hidden="true" />
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[12px] text-[var(--color-grey-500)] px-3 py-2.5 border-t border-[var(--color-grey-100)]">
        Enable or disable pairs on the{" "}
        <span className="font-medium">Associations</span> tab.
      </p>
    </div>
  );
};

export default SchemaTab;
