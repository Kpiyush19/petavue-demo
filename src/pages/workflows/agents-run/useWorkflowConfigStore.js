import { create } from "zustand";
import { makeAgents } from "./data";

/* How the published workflow is set up: its agents, who sees their
   recommendations first, and its Slack alert. Edited on the workflow's page.
   `dirty` is true while there are changes that have not been saved. */

const next = (value, current) => (typeof value === "function" ? value(current) : value);

const useWorkflowConfigStore = create((set) => ({
  agentsOn: true,
  agents: makeAgents(),
  review: "pause", // "pause" | "publish"
  slackOn: true,
  slackChannels: [{ id: "C-marketing-ops", name: "marketing-ops" }],
  slackUsers: [],
  dirty: false,
  savedAt: null,

  setAgentsOn: (agentsOn) => set({ agentsOn, dirty: true }),
  // Accepts a value or an updater, like a React state setter.
  setAgents: (value) => set((s) => ({ agents: next(value, s.agents), dirty: true })),
  setReview: (review) => set({ review, dirty: true }),
  setSlackOn: (slackOn) => set({ slackOn, dirty: true }),
  setSlackChannels: (slackChannels) => set({ slackChannels, dirty: true }),
  setSlackUsers: (slackUsers) => set({ slackUsers, dirty: true }),
  save: () => set({ dirty: false, savedAt: Date.now() }),
}));

export default useWorkflowConfigStore;
