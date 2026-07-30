import { useSyncExternalStore } from 'react'

// Shared, session-scoped step-verification store.
//
// Rules this encodes (per product):
//   1. Verifying a step verifies it EVERYWHERE it's used — steps are keyed by a
//      shared step id, so any widget that includes that step sees it verified.
//   2. A widget is verified only once ALL of its steps are verified (that
//      derivation lives in the widget view, which reads this store).
//
// This is client-side for now; the backend will own the source of truth. Keeping
// it here lets the UI behave to the contract without a per-step endpoint yet.

let verified = new Set()
const listeners = new Set()

function emit() {
  // new reference so useSyncExternalStore detects the change
  verified = new Set(verified)
  listeners.forEach((l) => l())
}

export function isStepVerified(id) {
  return verified.has(id)
}

export function verifyStep(id) {
  if (!verified.has(id)) { verified.add(id); emit() }
}

export function verifySteps(ids) {
  let changed = false
  ids.forEach((id) => { if (!verified.has(id)) { verified.add(id); changed = true } })
  if (changed) emit()
}

function getSnapshot() {
  return verified
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// React binding — returns the current verified-step Set, re-rendering on change.
export function useVerifiedSteps() {
  return useSyncExternalStore(subscribe, getSnapshot)
}
