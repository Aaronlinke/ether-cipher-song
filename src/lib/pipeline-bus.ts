// ============================================================
// PIPELINE-BUS — cross-module payload router
// Any component can `emit()` a payload; any component can
// `subscribe()` for a specific target or listen to all.
// ============================================================

export type PipelineKind =
  | 'key'         // private key (hex / WIF / decimal)
  | 'address'     // bitcoin address
  | 'text'        // arbitrary text / expression
  | 'hex'         // hex blob
  | 'mnemonic'    // BIP39 seed
  | 'number';     // numeric value / puzzle bits

export type PipelineTarget =
  | 'universal'   // UniversalCalculator
  | 'bruteforce'  // BruteForceCalculator
  | 'svrc'        // SVRC-Crypto
  | 'megasolver'  // MegaSolver
  | 'vault'       // Hit-Vault filter
  | 'any';        // broadcast

export interface PipelinePayload {
  id: string;
  kind: PipelineKind;
  value: string;
  source: string;      // human label of emitter
  target: PipelineTarget;
  ts: number;
  meta?: Record<string, any>;
}

type Listener = (p: PipelinePayload) => void;

const listeners = new Set<Listener>();
const history: PipelinePayload[] = [];
const HISTORY_MAX = 50;

export function emit(p: Omit<PipelinePayload, 'id' | 'ts'>): PipelinePayload {
  const full: PipelinePayload = {
    ...p,
    id: (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)),
    ts: Date.now(),
  };
  history.unshift(full);
  if (history.length > HISTORY_MAX) history.pop();
  listeners.forEach((l) => {
    try { l(full); } catch (e) { console.error('[pipeline-bus]', e); }
  });
  return full;
}

export function subscribe(cb: Listener): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function getHistory(): PipelinePayload[] {
  return [...history];
}

export function clearHistory() {
  history.length = 0;
  listeners.forEach((l) => l({ id: '__clear__', kind: 'text', value: '', source: 'system', target: 'any', ts: Date.now() }));
}

// ---------- React hook ----------
import { useEffect } from 'react';

/**
 * Subscribe to payloads intended for `target` (or 'any' broadcasts).
 * The callback receives only matching payloads.
 */
export function usePipelineTarget(
  target: Exclude<PipelineTarget, 'any'>,
  cb: (p: PipelinePayload) => void,
) {
  useEffect(() => {
    return subscribe((p) => {
      if (p.id === '__clear__') return;
      if (p.target === target || p.target === 'any') cb(p);
    });
  }, [target, cb]);
}