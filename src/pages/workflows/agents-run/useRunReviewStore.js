import { create } from "zustand";
import { addRunChanges } from "../../../mocks/recommendations";
import { RECS } from "./data";

/* The draft of one run while its creator reviews it.
   Shared by the chat (an agent edits a card when asked), the Changes tab, the
   review bar and the Workflows list. In-memory: it resets on reload, like the
   rest of the mock. */

const clone = (x) => JSON.parse(JSON.stringify(x));

const useRunReviewStore = create((set, get) => ({
  recs: clone(RECS),
  left: {}, // id -> true when the reviewer left that change out
  outcome: null, // null | "approved" | "rejected"
  approvedCount: 0,
  flashId: null, // the card an agent just changed, highlighted briefly
  openRequest: null, // { path, title, contentType, n } — a tab the chat asks the panel to show

  toggle: (id) => set((s) => ({ left: { ...s.left, [id]: !s.left[id] } })),

  // An agent changed a drafted value because the reviewer asked.
  editValue: (id, to, warn) =>
    set((s) => ({
      recs: s.recs.map((r) =>
        r.id === id ? { ...r, d: { ...r.d, to }, edited: { from: r.d.to, to }, warn: warn || r.warn } : r,
      ),
      left: { ...s.left, [id]: false },
      flashId: id,
    })),

  // The reviewer overruled a drafted change.
  leaveOut: (id) => set((s) => ({ left: { ...s.left, [id]: true }, flashId: id })),

  clearFlash: () => set({ flashId: null }),

  requestOpen: (tab) => set((s) => ({ openRequest: { ...tab, n: (s.openRequest?.n || 0) + 1 } })),

  decide: (outcome) =>
    set((s) => {
      if (outcome === "approved") addRunChanges(keptOf(s));
      return { outcome, approvedCount: keptOf(s).length };
    }),
}));

const keptOf = (s) => s.recs.filter((r) => r.pending && !s.left[r.id]);
export const selectPending = (s) => s.recs.filter((r) => r.pending);
export const selectKept = keptOf;

export default useRunReviewStore;
