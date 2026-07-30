// ============================================================
// STRATUM CLIENT-HELPER — Coinbase, Merkle-Root, Block-Header
// Konventionen nach cpuminer / stratum-mining Referenz.
// ============================================================
import { sha256 } from '@noble/hashes/sha2.js';

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.length % 2 ? '0' + hex : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
  return out;
}

export function bytesToHex(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, '0');
  return s;
}

export function sha256d(b: Uint8Array): Uint8Array {
  return sha256(sha256(b));
}

/** Hex-String byteweise umdrehen (BE <-> LE). */
export function revHex(hex: string): string {
  let o = '';
  for (let i = hex.length - 2; i >= 0; i -= 2) o += hex.substr(i, 2);
  return o;
}

/** Bytes innerhalb jedes 4-Byte-Worts umdrehen — nötig für prevhash aus mining.notify. */
export function swapEndianWords(hex: string): string {
  let out = '';
  for (let i = 0; i < hex.length; i += 8) out += revHex(hex.substr(i, 8));
  return out;
}

export function concatBytes(...arrs: Uint8Array[]): Uint8Array {
  const total = arrs.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
}

/** Coinbase-Transaktion zusammensetzen: coinb1 + extranonce1 + extranonce2 + coinb2. */
export function buildCoinbase(coinb1: string, extranonce1: string, extranonce2: string, coinb2: string): Uint8Array {
  return hexToBytes(coinb1 + extranonce1 + extranonce2 + coinb2);
}

/** Merkle-Root aus Coinbase-Hash und den Branch-Hashes (interne Byte-Order). */
export function merkleRoot(coinbase: Uint8Array, branches: string[]): Uint8Array {
  let root = sha256d(coinbase);
  for (const b of branches) root = sha256d(concatBytes(root, hexToBytes(b)));
  return root;
}

/** 80-Byte Block-Header als Hex (Nonce-Feld auf 00000000). */
export function buildHeaderHex(params: {
  version: string;   // BE hex aus notify, z.B. "20000000"
  prevhash: string;  // swapped-word hex aus notify
  merkle: Uint8Array;
  ntime: string;     // BE hex
  nbits: string;     // BE hex
}): string {
  return (
    revHex(params.version) +
    swapEndianWords(params.prevhash) +
    bytesToHex(params.merkle) +
    revHex(params.ntime) +
    revHex(params.nbits) +
    '00000000'
  );
}

export const DIFF1_TARGET =
  0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffn;

/** Pool-Difficulty -> Target als BigInt. */
export function difficultyToTarget(difficulty: number): bigint {
  if (difficulty <= 0) return DIFF1_TARGET;
  const scaled = BigInt(Math.round(difficulty * 1e8));
  return (DIFF1_TARGET * 100000000n) / scaled;
}

/** nbits (compact) -> Netzwerk-Target als BigInt. */
export function nbitsToTarget(nbits: string): bigint {
  const n = parseInt(nbits, 16) >>> 0;
  const exponent = n >>> 24;
  const mantissa = BigInt(n & 0x007fffff);
  return mantissa * (1n << (8n * BigInt(exponent - 3)));
}

/** Zufälliges extranonce2 der geforderten Byte-Länge. */
export function randomExtranonce2(sizeBytes: number): string {
  const b = new Uint8Array(sizeBytes);
  crypto.getRandomValues(b);
  return bytesToHex(b);
}

export interface StratumJob {
  job_id: string;
  prevhash: string;
  coinb1: string;
  coinb2: string;
  merkle_branch: string[];
  version: string;
  nbits: string;
  ntime: string;
  clean_jobs: boolean;
}