// Base58 Alphabet (Bitcoin standard)
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

// secp256k1 curve parameters
const SECP256K1 = {
  p: BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F'),
  a: 0n,
  b: 7n,
  Gx: BigInt('0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798'),
  Gy: BigInt('0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8'),
  n: BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141'),
};

// Modular arithmetic helpers
function mod(a: bigint, m: bigint): bigint {
  const result = a % m;
  return result >= 0n ? result : result + m;
}

function modInverse(a: bigint, m: bigint): bigint {
  let [old_r, r] = [a, m];
  let [old_s, s] = [1n, 0n];
  
  while (r !== 0n) {
    const quotient = old_r / r;
    [old_r, r] = [r, old_r - quotient * r];
    [old_s, s] = [s, old_s - quotient * s];
  }
  
  return mod(old_s, m);
}

// Point on elliptic curve
interface Point {
  x: bigint;
  y: bigint;
}

const POINT_AT_INFINITY: Point = { x: 0n, y: 0n };

function isPointAtInfinity(p: Point): boolean {
  return p.x === 0n && p.y === 0n;
}

// Point addition on secp256k1
function pointAdd(p1: Point, p2: Point): Point {
  if (isPointAtInfinity(p1)) return p2;
  if (isPointAtInfinity(p2)) return p1;
  
  const { p } = SECP256K1;
  
  if (p1.x === p2.x && p1.y !== p2.y) {
    return POINT_AT_INFINITY;
  }
  
  let lambda: bigint;
  
  if (p1.x === p2.x && p1.y === p2.y) {
    // Point doubling
    lambda = mod(3n * p1.x * p1.x * modInverse(2n * p1.y, p), p);
  } else {
    // Point addition
    lambda = mod((p2.y - p1.y) * modInverse(mod(p2.x - p1.x, p), p), p);
  }
  
  const x3 = mod(lambda * lambda - p1.x - p2.x, p);
  const y3 = mod(lambda * (p1.x - x3) - p1.y, p);
  
  return { x: x3, y: y3 };
}

// Scalar multiplication (double-and-add)
function pointMultiply(k: bigint, point: Point): Point {
  let result = POINT_AT_INFINITY;
  let addend = point;
  
  while (k > 0n) {
    if (k & 1n) {
      result = pointAdd(result, addend);
    }
    addend = pointAdd(addend, addend);
    k >>= 1n;
  }
  
  return result;
}

// Generate public key from private key using secp256k1
export function privateKeyToPublicKey(privateKeyHex: string, compressed: boolean = true): string {
  const k = BigInt('0x' + privateKeyHex);
  
  // Validate private key is in valid range
  if (k <= 0n || k >= SECP256K1.n) {
    throw new Error('Private key out of range');
  }
  
  const G: Point = { x: SECP256K1.Gx, y: SECP256K1.Gy };
  const pubPoint = pointMultiply(k, G);
  
  const xHex = pubPoint.x.toString(16).padStart(64, '0');
  const yHex = pubPoint.y.toString(16).padStart(64, '0');
  
  if (compressed) {
    const prefix = pubPoint.y % 2n === 0n ? '02' : '03';
    return prefix + xHex;
  } else {
    return '04' + xHex + yHex;
  }
}

// RIPEMD-160 implementation
const RIPEMD160_CONSTANTS = {
  K1: [0x00000000, 0x5A827999, 0x6ED9EBA1, 0x8F1BBCDC, 0xA953FD4E],
  K2: [0x50A28BE6, 0x5C4DD124, 0x6D703EF3, 0x7A6D76E9, 0x00000000],
  R1: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,7,4,13,1,10,6,15,3,12,0,9,5,2,14,11,8,3,10,14,4,9,15,8,1,2,7,0,6,13,11,5,12,1,9,11,10,0,8,12,4,13,3,7,15,14,5,6,2,4,0,5,9,7,12,2,10,14,1,3,8,11,6,15,13],
  R2: [5,14,7,0,9,2,11,4,13,6,15,8,1,10,3,12,6,11,3,7,0,13,5,10,14,15,8,12,4,9,1,2,15,5,1,3,7,14,6,9,11,8,12,2,10,0,4,13,8,6,4,1,3,11,15,0,5,12,2,13,9,7,10,14,12,15,10,4,1,5,8,7,6,2,13,14,0,3,9,11],
  S1: [11,14,15,12,5,8,7,9,11,13,14,15,6,7,9,8,7,6,8,13,11,9,7,15,7,12,15,9,11,7,13,12,11,13,6,7,14,9,13,15,14,8,13,6,5,12,7,5,11,12,14,15,14,15,9,8,9,14,5,6,8,6,5,12,9,15,5,11,6,8,13,12,5,12,13,14,11,8,5,6],
  S2: [8,9,9,11,13,15,15,5,7,7,8,11,14,14,12,6,9,13,15,7,12,8,9,11,7,7,12,7,6,15,13,11,9,7,15,11,8,6,6,14,12,13,5,14,13,13,7,5,15,5,8,11,14,14,6,14,6,9,12,9,12,5,15,8,8,5,12,9,12,5,14,6,8,13,6,5,15,13,11,11]
};

function rotl(x: number, n: number): number {
  return ((x << n) | (x >>> (32 - n))) >>> 0;
}

export function ripemd160(data: Uint8Array): Uint8Array {
  const { K1, K2, R1, R2, S1, S2 } = RIPEMD160_CONSTANTS;
  
  // Padding
  const msgLen = data.length;
  const bitLen = msgLen * 8;
  const paddingLen = (msgLen % 64 < 56 ? 56 : 120) - (msgLen % 64);
  const padded = new Uint8Array(msgLen + paddingLen + 8);
  padded.set(data);
  padded[msgLen] = 0x80;
  
  // Length in bits (little-endian)
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, bitLen >>> 0, true);
  view.setUint32(padded.length - 4, Math.floor(bitLen / 0x100000000), true);
  
  // Initial hash values
  let [h0, h1, h2, h3, h4] = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0];
  
  // Process blocks
  for (let i = 0; i < padded.length; i += 64) {
    const X: number[] = [];
    for (let j = 0; j < 16; j++) {
      X[j] = view.getUint32(i + j * 4, true);
    }
    
    let [al, bl, cl, dl, el] = [h0, h1, h2, h3, h4];
    let [ar, br, cr, dr, er] = [h0, h1, h2, h3, h4];
    
    for (let j = 0; j < 80; j++) {
      let fl: number, fr: number;
      const round = Math.floor(j / 16);
      
      switch (round) {
        case 0: fl = bl ^ cl ^ dl; fr = br ^ (cr | ~dr); break;
        case 1: fl = (bl & cl) | (~bl & dl); fr = (br & dr) | (cr & ~dr); break;
        case 2: fl = (bl | ~cl) ^ dl; fr = (br | ~cr) ^ dr; break;
        case 3: fl = (bl & dl) | (cl & ~dl); fr = (br & cr) | (~br & dr); break;
        default: fl = bl ^ (cl | ~dl); fr = br ^ cr ^ dr;
      }
      
      let tl = (al + fl + X[R1[j]] + K1[round]) >>> 0;
      tl = (rotl(tl, S1[j]) + el) >>> 0;
      al = el; el = dl; dl = rotl(cl, 10); cl = bl; bl = tl;
      
      let tr = (ar + fr + X[R2[j]] + K2[round]) >>> 0;
      tr = (rotl(tr, S2[j]) + er) >>> 0;
      ar = er; er = dr; dr = rotl(cr, 10); cr = br; br = tr;
    }
    
    const t = (h1 + cl + dr) >>> 0;
    h1 = (h2 + dl + er) >>> 0;
    h2 = (h3 + el + ar) >>> 0;
    h3 = (h4 + al + br) >>> 0;
    h4 = (h0 + bl + cr) >>> 0;
    h0 = t;
  }
  
  const result = new Uint8Array(20);
  const resultView = new DataView(result.buffer);
  resultView.setUint32(0, h0, true);
  resultView.setUint32(4, h1, true);
  resultView.setUint32(8, h2, true);
  resultView.setUint32(12, h3, true);
  resultView.setUint32(16, h4, true);
  
  return result;
}

// Hash160 = RIPEMD160(SHA256(data))
export async function hash160(data: Uint8Array): Promise<Uint8Array> {
  const sha = await sha256(data);
  return ripemd160(sha);
}

// Generate Bitcoin address from private key
export async function privateKeyToAddress(privateKeyHex: string, compressed: boolean = true, network: 'mainnet' | 'testnet' = 'mainnet'): Promise<string> {
  const publicKeyHex = privateKeyToPublicKey(privateKeyHex, compressed);
  const publicKeyBytes = hexToBytes(publicKeyHex);
  
  const hash160Result = await hash160(publicKeyBytes);
  
  const versionByte = network === 'mainnet' ? 0x00 : 0x6f;
  const versioned = new Uint8Array([versionByte, ...Array.from(hash160Result)]);
  
  const checksum1 = await sha256(versioned);
  const checksum2 = await sha256(checksum1);
  const checksumBytes = checksum2.slice(0, 4);
  
  const finalBytes = new Uint8Array([...Array.from(versioned), ...Array.from(checksumBytes)]);
  return base58Encode(finalBytes);
}

export function hexToBytes(hex: string): Uint8Array {
  const cleaned = hex.replace(/^0x/, '').replace(/\s/g, '');
  const bytes = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function base58Encode(bytes: Uint8Array): string {
  let num = BigInt('0x' + bytesToHex(bytes));
  let result = '';
  
  while (num > 0n) {
    const mod = Number(num % 58n);
    result = BASE58_ALPHABET[mod] + result;
    num = num / 58n;
  }
  
  // Handle leading zeros
  for (const byte of bytes) {
    if (byte === 0) {
      result = '1' + result;
    } else {
      break;
    }
  }
  
  return result || '1';
}

export function base58Decode(str: string): Uint8Array {
  let num = 0n;
  
  for (const char of str) {
    const index = BASE58_ALPHABET.indexOf(char);
    if (index === -1) throw new Error(`Invalid Base58 character: ${char}`);
    num = num * 58n + BigInt(index);
  }
  
  let hex = num.toString(16);
  if (hex.length % 2) hex = '0' + hex;
  
  // Handle leading zeros (represented as '1' in Base58)
  let leadingZeros = 0;
  for (const char of str) {
    if (char === '1') leadingZeros++;
    else break;
  }
  
  const bytes = hexToBytes(hex);
  const result = new Uint8Array(leadingZeros + bytes.length);
  result.set(bytes, leadingZeros);
  
  return result;
}

export async function sha256(data: Uint8Array | string): Promise<Uint8Array> {
  const buffer = typeof data === 'string' 
    ? new TextEncoder().encode(data)
    : new Uint8Array(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer.buffer);
  return new Uint8Array(hashBuffer);
}

export async function doubleSha256(data: Uint8Array): Promise<Uint8Array> {
  const first = await sha256(data);
  return sha256(first);
}

// Calculate entropy in bits
export function calculateEntropy(data: string): number {
  const freq: Record<string, number> = {};
  for (const char of data) {
    freq[char] = (freq[char] || 0) + 1;
  }
  
  let entropy = 0;
  const len = data.length;
  
  for (const char in freq) {
    const p = freq[char] / len;
    entropy -= p * Math.log2(p);
  }
  
  return entropy * len; // Total bits of entropy
}

// Format large numbers with scientific notation
export function formatLargeNumber(n: number): string {
  if (n < 1000) return n.toFixed(2);
  const exp = Math.floor(Math.log10(n));
  const mantissa = n / Math.pow(10, exp);
  return `${mantissa.toFixed(2)} × 10^${exp}`;
}

// Generate random bytes
export function generateRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

// Convert bytes to binary string
export function bytesToBinary(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(2).padStart(8, '0'))
    .join('');
}

// Visualize hash as color grid
export function hashToColors(hash: string): string[] {
  const colors: string[] = [];
  for (let i = 0; i < hash.length; i += 6) {
    const chunk = hash.slice(i, i + 6).padEnd(6, '0');
    colors.push(`#${chunk}`);
  }
  return colors;
}
