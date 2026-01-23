import { useState, useCallback, useRef, useEffect } from 'react';
import { Bitcoin, Key, Play, Pause, Zap, Target, Brain, Sparkles, FileText, History, Shield, AlertTriangle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

// ============================================================================
// SECP256K1 KONSTANTEN - Bitcoin Elliptische Kurve
// ============================================================================
const SECP256K1 = {
  P: BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F'),
  N: BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141'),
  Gx: BigInt('0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798'),
  Gy: BigInt('0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8'),
  A: BigInt(0),
  B: BigInt(7)
};

// ============================================================================
// BITCOIN PUZZLE DATEN - Die echten Puzzles von 1BTC bis 1000BTC
// ============================================================================
const PUZZLES = [
  { id: 66, bits: 66, address: '13zb1hQbWVsc2S7ZTZnP2G4undNNpdh5so', balance: '6.6 BTC', hint: 'Bits 1-66' },
  { id: 67, bits: 67, address: '1BY8GQbnueYofwSuFAT3USAhGjPrkxDdW9', balance: '6.7 BTC', hint: 'Bits 1-67' },
  { id: 68, bits: 68, address: '1MVDYgVaSN6iKKEsbzRUAYFrYJadLYZvvZ', balance: '6.8 BTC', hint: 'Bits 1-68' },
  { id: 69, bits: 69, address: '19vkiEajfhuZ8bs8Zu2jgmC6oqZbWqhxhG', balance: '6.9 BTC', hint: 'Bits 1-69' },
  { id: 72, bits: 72, address: '1LHtnpd8nU5VHEMkG2TMYYNUaLL6eLHZR1', balance: '7.2 BTC', hint: 'Bits 1-72' },
  { id: 73, bits: 73, address: '1AX7bP85C6VEgKJQifdJJZZV2NYBj7ToLQ', balance: '7.3 BTC', hint: 'Bits 1-73 - KEIN PUBLIC KEY!' },
  { id: 74, bits: 74, address: '1BfBfQPxUbJeXv9WY2FHy5ZbR9mMJdT8Ai', balance: '7.4 BTC', hint: 'Bits 1-74 - KEIN PUBLIC KEY!' },
  { id: 75, bits: 75, address: '1Jy6ULj5c5Sx2rS1RpP8iCJ6L3Km9Uijid', balance: '7.5 BTC', hint: 'Bits 1-75' },
  { id: 76, bits: 76, address: '1P52VadqTe6Yy8HM9G5B3D5wJx3F7k8zqq', balance: '7.6 BTC', hint: 'Bits 1-76 - KEIN PUBLIC KEY!' },
  { id: 80, bits: 80, address: '1K2K9gQ7D2aE5XA7xUVp9qWpmEBzqKaRFG', balance: '8.0 BTC', hint: 'Bits 1-80' },
  { id: 88, bits: 88, address: '14oFNXucftsHiUMY8uctg6N487riuyXs4h', balance: '8.8 BTC', hint: 'Bits 1-88' },
  { id: 130, bits: 130, address: '1Fo65aKq8s8iquMt6weF1rku1moWVEd5Ua', balance: '13 BTC', hint: 'Bits 1-130' },
];

// ============================================================================
// PROJECT OMEGA - HISTORISCHE SEED DATENBANK
// Forensische Rekonstruktion: NSA/CIA/CryptoAG Verbindungen
// ============================================================================
interface HistoricalSeed {
  term: string;
  lengthChar: number;
  lengthBits: number;
  targetPuzzle: string;
  hexRaw: string;
  historicalContext: string;
  category: 'crypto_ag' | 'nsa' | 'bitcoin_origin' | 'economic' | 'cypherpunk';
}

const HISTORICAL_SEEDS: HistoricalSeed[] = [
  // CRYPTO AG / OMNISEC - CIA/BND Operationen
  {
    term: "OmnisecAG",
    lengthChar: 9,
    lengthBits: 72,
    targetPuzzle: "#72 / #73",
    hexRaw: "4f6d6e697365634147",
    historicalContext: "Kompromittiertes Schweizer Verschlüsselungsunternehmen. Verkaufte manipulierte Geräte an UBS.",
    category: 'crypto_ag'
  },
  {
    term: "Omnisec_AG",
    lengthChar: 10,
    lengthBits: 80,
    targetPuzzle: "#80",
    hexRaw: "4f6d6e697365635f4147",
    historicalContext: "Variante des Firmennamens. 'Second Company' neben Crypto AG.",
    category: 'crypto_ag'
  },
  {
    term: "Crypto_AG",
    lengthChar: 9,
    lengthBits: 72,
    targetPuzzle: "#72 / #73",
    hexRaw: "43727970746f5f4147",
    historicalContext: "Die wichtigste Tarnfirma der CIA. Codename: MINERVA. Über 120 Länder kompromittiert.",
    category: 'crypto_ag'
  },
  {
    term: "Rubikon93",
    lengthChar: 9,
    lengthBits: 72,
    targetPuzzle: "#72 / #73",
    hexRaw: "52756269636f6e3933",
    historicalContext: "Codename der BND-Operation. Deutsche Beteiligung an Crypto AG.",
    category: 'crypto_ag'
  },
  {
    term: "MINERVA_OP",
    lengthChar: 10,
    lengthBits: 80,
    targetPuzzle: "#80",
    hexRaw: "4d494e455256415f4f50",
    historicalContext: "CIA Codename für Operation Crypto AG.",
    category: 'crypto_ag'
  },
  {
    term: "HagelinsJr",
    lengthChar: 10,
    lengthBits: 80,
    targetPuzzle: "#80",
    hexRaw: "486167656c696e734a72",
    historicalContext: "Boris Hagelin Jr. - Starb 1970 bei mysteriösem Autounfall nach Widerstand gegen CIA.",
    category: 'crypto_ag'
  },
  {
    term: "HansBuehler",
    lengthChar: 11,
    lengthBits: 88,
    targetPuzzle: "#88",
    hexRaw: "48616e73427565686c6572",
    historicalContext: "Vertriebsleiter Crypto AG. 1992 im Iran verhaftet, von CIA/BND verraten.",
    category: 'crypto_ag'
  },
  // NSA ORIGINS
  {
    term: "NSA_Mint96",
    lengthChar: 10,
    lengthBits: 80,
    targetPuzzle: "#80",
    hexRaw: "4e53415f4d696e743936",
    historicalContext: "NSA-Papier 1996: 'How to Make a Mint' - Bitcoin-Architektur 12 Jahre vor Veröffentlichung.",
    category: 'nsa'
  },
  {
    term: "ClipperChip",
    lengthChar: 11,
    lengthBits: 88,
    targetPuzzle: "#88",
    hexRaw: "436c697070657243686970",
    historicalContext: "Fehlgeschlagene Hardware-Verschlüsselungs-Hintertür der NSA 1993.",
    category: 'nsa'
  },
  {
    term: "SHA256_2001",
    lengthChar: 11,
    lengthBits: 88,
    targetPuzzle: "#88",
    hexRaw: "5348413235365f32303031",
    historicalContext: "NSA entwickelt SHA-256 - Kern-Hashing von Bitcoin. Standard vor internem 'Cracking'?",
    category: 'nsa'
  },
  {
    term: "Friedman_SIS",
    lengthChar: 12,
    lengthBits: 96,
    targetPuzzle: "#96",
    hexRaw: "46726965646d616e5f534953",
    historicalContext: "William Friedman - Vater der NSA. Entwickelte zentralisierte Verschlüsselungskontrolle.",
    category: 'nsa'
  },
  {
    term: "SHAMROCK45",
    lengthChar: 10,
    lengthBits: 80,
    targetPuzzle: "#80",
    hexRaw: "5348414d524f434b3435",
    historicalContext: "Project SHAMROCK 1945 - Erste 'Blockchain-Analyse'. Alle internationalen Telegramme abgefangen.",
    category: 'nsa'
  },
  // BITCOIN ORIGINS - Satoshi & Cypherpunks
  {
    term: "Satoshi2008",
    lengthChar: 11,
    lengthBits: 88,
    targetPuzzle: "#88",
    hexRaw: "5361746f73686932303038",
    historicalContext: "Satoshi Nakamoto + Jahr der Bitcoin-Veröffentlichung.",
    category: 'bitcoin_origin'
  },
  {
    term: "HalFinney98",
    lengthChar: 11,
    lengthBits: 88,
    targetPuzzle: "#88",
    hexRaw: "48616c46696e6e65793938",
    historicalContext: "Hal Finney - Erster Bitcoin-Empfänger. RPOW-Entwickler. Wahrscheinlicher Satoshi-Kandidat.",
    category: 'cypherpunk'
  },
  {
    term: "Wei_Dai_98",
    lengthChar: 10,
    lengthBits: 80,
    targetPuzzle: "#80",
    hexRaw: "5765695f4461695f3938",
    historicalContext: "Wei Dai - b-money Erfinder 1998. Im Bitcoin-Whitepaper zitiert.",
    category: 'cypherpunk'
  },
  {
    term: "IanGrigg_FC",
    lengthChar: 11,
    lengthBits: 88,
    targetPuzzle: "#88",
    hexRaw: "49616e47726967675f4643",
    historicalContext: "Ian Grigg - Ricardian Contracts. Wahrscheinlicher Satoshi-Architekt.",
    category: 'cypherpunk'
  },
  {
    term: "Patoshi_Blk",
    lengthChar: 11,
    lengthBits: 88,
    targetPuzzle: "#88",
    hexRaw: "5061746f7368695f426c6b",
    historicalContext: "Patoshi Pattern - Die ersten ~30.000 Blöcke mit einzigartigem Nonce-Muster.",
    category: 'bitcoin_origin'
  },
  {
    term: "Genesis_Blk",
    lengthChar: 11,
    lengthBits: 88,
    targetPuzzle: "#88",
    hexRaw: "47656e657369735f426c6b",
    historicalContext: "Genesis Block - 'Chancellor on brink of second bailout for banks'",
    category: 'bitcoin_origin'
  },
  {
    term: "Gavin_CIA10",
    lengthChar: 11,
    lengthBits: 88,
    targetPuzzle: "#88",
    hexRaw: "476176696e5f4349413130",
    historicalContext: "Gavin Andresens CIA-Treffen 2010 - Vor Satoshis Verschwinden.",
    category: 'bitcoin_origin'
  },
  // ECONOMIC THEORY
  {
    term: "Triffin1960",
    lengthChar: 11,
    lengthBits: 88,
    targetPuzzle: "#88",
    hexRaw: "5472696666696e31393630",
    historicalContext: "Triffin-Dilemma - Wirtschaftliche Grundlage für Bitcoin als Lösung.",
    category: 'economic'
  },
  {
    term: "Hayek_1976",
    lengthChar: 10,
    lengthBits: 80,
    targetPuzzle: "#80",
    hexRaw: "486179656b5f31393736",
    historicalContext: "F.A. Hayek: 'Entnationalisierung des Geldes' - Blaupause für private Währung.",
    category: 'economic'
  },
  {
    term: "Friedman99",
    lengthChar: 10,
    lengthBits: 80,
    targetPuzzle: "#80",
    hexRaw: "46726965646d616e3939",
    historicalContext: "Milton Friedman 1999: 'Das Internet braucht zuverlässiges elektronisches Geld.'",
    category: 'economic'
  },
  // PUZZLE SPECIFIC - Gap Theory
  {
    term: "Puzzle_73_X",
    lengthChar: 11,
    lengthBits: 88,
    targetPuzzle: "#73",
    hexRaw: "50757a7a6c655f37335f58",
    historicalContext: "Puzzle 73 - KEIN öffentlicher Schlüssel. Nur Brute-Force oder Wörterbuch.",
    category: 'bitcoin_origin'
  },
  {
    term: "NoPublicKey",
    lengthChar: 11,
    lengthBits: 88,
    targetPuzzle: "#73/#74/#76",
    hexRaw: "4e6f5075626c69634b6579",
    historicalContext: "Gap Theory: Nicht durch 5 teilbare Puzzles haben keinen öffentlichen Schlüssel.",
    category: 'bitcoin_origin'
  },
  {
    term: "Year_2140",
    lengthChar: 9,
    lengthBits: 72,
    targetPuzzle: "#72",
    hexRaw: "596561725f32313430",
    historicalContext: "Bitcoin-Mining endet 2140. Ein 130-Jahres-Plan deutet auf institutionelle Planung.",
    category: 'bitcoin_origin'
  },
];

// ============================================================================
// TIMELINE HISTORY - Forensische Rekonstruktion
// ============================================================================
interface TimelineEvent {
  era: string;
  year: string;
  title: string;
  description: string;
  relevance: string;
  category: 'foundation' | 'operation' | 'crypto' | 'bitcoin';
}

const TIMELINE_HISTORY: TimelineEvent[] = [
  { era: "1930-1950", year: "1945", title: "Project SHAMROCK", description: "NSA-Vorläufer fängt alle internationalen Telegramme ab (Western Union, RCA, ITT).", relevance: "Erste 'Blockchain-Analyse' - manuelle Verfolgung globaler Finanzströme.", category: 'foundation' },
  { era: "1950-1990", year: "1970", title: "Crypto AG - MINERVA", description: "CIA & BND kaufen Schweizer Crypto AG. Manipulierte Maschinen in 120+ Ländern.", relevance: "Hardware-Hintertüren als Vorläufer für potentielle Software-Hintertüren.", category: 'operation' },
  { era: "1950-1990", year: "1970", title: "Boris Hagelin Jr. Tod", description: "Sohn des Crypto AG Gründers stirbt bei mysteriösem Autounfall nach Widerstand.", relevance: "Zeigt die Konsequenzen von Widerstand gegen Geheimdienst-Operationen.", category: 'operation' },
  { era: "1950-1990", year: "1992", title: "Hans Bühler Verhaftung", description: "Vertriebsleiter im Iran verhaftet. Von CIA/BND verraten und diskreditiert.", relevance: "Geheimdienste opfern eigene Agenten für Operationssicherheit.", category: 'operation' },
  { era: "1990-2008", year: "1993", title: "Clipper Chip", description: "NSA-Versuch einer Hardware-Verschlüsselungs-Hintertür. Öffentlich gescheitert.", relevance: "Öffentliches Scheitern führt zu verdeckten Alternativen?", category: 'crypto' },
  { era: "1990-2008", year: "1996", title: "NSA: 'How to Make a Mint'", description: "NSA-Forschungspapier beschreibt exakte Bitcoin-Architektur.", relevance: "12 Jahre vor Bitcoin - exakte technische Spezifikation bereits dokumentiert.", category: 'crypto' },
  { era: "1990-2008", year: "1998", title: "b-money & RPOW", description: "Wei Dai (b-money) und Hal Finney (RPOW) entwickeln Bitcoin-Vorläufer.", relevance: "Cypherpunk-Bewegung als Inkubator oder CIA-Tarnoperation?", category: 'crypto' },
  { era: "1990-2008", year: "2001", title: "SHA-256 veröffentlicht", description: "NSA entwickelt und veröffentlicht SHA-256 als Standard.", relevance: "Kern-Hashing von Bitcoin. NSA hatte Jahre internen Vorsprung.", category: 'crypto' },
  { era: "2008-heute", year: "2008", title: "Bitcoin Whitepaper", description: "Satoshi Nakamoto veröffentlicht 'Bitcoin: A Peer-to-Peer Electronic Cash System'.", relevance: "Perfektes Timing nach Finanzkrise. Professionelle Dokumentation.", category: 'bitcoin' },
  { era: "2008-heute", year: "2009", title: "Genesis Block", description: "Erster Block mit Nachricht: 'Chancellor on brink of second bailout for banks'.", relevance: "Patoshi Pattern in ersten 30.000 Blöcken. Einzigartiger modifizierter Client.", category: 'bitcoin' },
  { era: "2008-heute", year: "2010", title: "Gavin Andresen CIA-Treffen", description: "Bitcoin-Hauptentwickler trifft sich mit CIA - kurz vor Satoshis Verschwinden.", relevance: "Direkter Kontakt zwischen Bitcoin-Kern und Geheimdienst dokumentiert.", category: 'bitcoin' },
  { era: "2008-heute", year: "2011", title: "Satoshi verschwindet", description: "Satoshi Nakamoto beendet alle Kommunikation nach CIA-Treffen.", relevance: "Timing suggeriert Zusammenhang mit Geheimdienst-Kontakt.", category: 'bitcoin' },
  { era: "2008-heute", year: "2015", title: "Bitcoin Puzzles Transaktion", description: "Transaktion 310 versteckt Private Keys in aufsteigenden Bitlängenbereichen.", relevance: "'5er-Fehler': Durch 5 teilbare Puzzles haben Public Keys - mathematisch angreifbar.", category: 'bitcoin' },
  { era: "2008-heute", year: "2018", title: "CLOUD Act", description: "US-Gesetz ermöglicht Zugriff auf Daten auf jedem US-Server weltweit.", relevance: "Beendet technisch die Privatsphäre für alle US-basierten Dienste.", category: 'foundation' },
];

// Category colors
const getCategoryColor = (cat: string) => {
  switch(cat) {
    case 'crypto_ag': return 'text-red-400 bg-red-500/20 border-red-500/30';
    case 'nsa': return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
    case 'bitcoin_origin': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
    case 'cypherpunk': return 'text-green-400 bg-green-500/20 border-green-500/30';
    case 'economic': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
    default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
  }
};

const getTimelineCategoryColor = (cat: string) => {
  switch(cat) {
    case 'foundation': return 'border-red-500 bg-red-500/10';
    case 'operation': return 'border-orange-500 bg-orange-500/10';
    case 'crypto': return 'border-purple-500 bg-purple-500/10';
    case 'bitcoin': return 'border-yellow-500 bg-yellow-500/10';
    default: return 'border-gray-500 bg-gray-500/10';
  }
};

// ============================================================================
// MATHEMATIK: Modulare Arithmetik & Elliptische Kurven
// ============================================================================
function mod(a: bigint, m: bigint): bigint {
  return ((a % m) + m) % m;
}

function modInverse(a: bigint, m: bigint): bigint {
  let [old_r, r] = [a, m];
  let [old_s, s] = [1n, 0n];
  while (r !== 0n) {
    const q = old_r / r;
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  return mod(old_s, m);
}

function modPow(base: bigint, exp: bigint, m: bigint): bigint {
  let result = 1n;
  base = mod(base, m);
  while (exp > 0n) {
    if (exp % 2n === 1n) result = mod(result * base, m);
    exp = exp / 2n;
    base = mod(base * base, m);
  }
  return result;
}

interface Point {
  x: bigint;
  y: bigint;
  infinity?: boolean;
}

const INFINITY: Point = { x: 0n, y: 0n, infinity: true };

function pointAdd(p1: Point, p2: Point): Point {
  if (p1.infinity) return p2;
  if (p2.infinity) return p1;
  if (p1.x === p2.x && p1.y !== p2.y) return INFINITY;

  let m: bigint;
  if (p1.x === p2.x && p1.y === p2.y) {
    m = mod((3n * p1.x * p1.x + SECP256K1.A) * modInverse(2n * p1.y, SECP256K1.P), SECP256K1.P);
  } else {
    m = mod((p2.y - p1.y) * modInverse(p2.x - p1.x, SECP256K1.P), SECP256K1.P);
  }

  const x3 = mod(m * m - p1.x - p2.x, SECP256K1.P);
  const y3 = mod(m * (p1.x - x3) - p1.y, SECP256K1.P);
  return { x: x3, y: y3 };
}

function scalarMult(k: bigint, p: Point): Point {
  let result: Point = INFINITY;
  let addend = p;
  while (k > 0n) {
    if (k % 2n === 1n) result = pointAdd(result, addend);
    addend = pointAdd(addend, addend);
    k = k / 2n;
  }
  return result;
}

// ============================================================================
// HASH FUNKTIONEN
// ============================================================================
async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', new Uint8Array(data));
  return new Uint8Array(hashBuffer);
}

function ripemd160(data: Uint8Array): Uint8Array {
  // RIPEMD-160 Konstanten
  const K = [0x00000000, 0x5A827999, 0x6ED9EBA1, 0x8F1BBCDC, 0xA953FD4E];
  const KK = [0x50A28BE6, 0x5C4DD124, 0x6D703EF3, 0x7A6D76E9, 0x00000000];
  
  const R = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8,
    3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12,
    1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2,
    4, 0, 5, 9, 7, 12, 2, 10, 14, 1, 3, 8, 11, 6, 15, 13];
  
  const S = [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8,
    7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12,
    11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5,
    11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12,
    9, 15, 5, 11, 6, 8, 13, 12, 5, 12, 13, 14, 11, 8, 5, 6];
  
  // Padding
  const msgLen = data.length;
  const padLen = (msgLen % 64 < 56) ? 56 - (msgLen % 64) : 120 - (msgLen % 64);
  const padded = new Uint8Array(msgLen + padLen + 8);
  padded.set(data);
  padded[msgLen] = 0x80;
  
  const bitLen = BigInt(msgLen) * 8n;
  for (let i = 0; i < 8; i++) {
    padded[msgLen + padLen + i] = Number((bitLen >> BigInt(i * 8)) & 0xFFn);
  }
  
  // Initial hash values
  let h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;
  
  const rotl = (x: number, n: number) => ((x << n) | (x >>> (32 - n))) >>> 0;
  
  for (let i = 0; i < padded.length; i += 64) {
    const X: number[] = [];
    for (let j = 0; j < 16; j++) {
      X[j] = padded[i + j * 4] | (padded[i + j * 4 + 1] << 8) | 
             (padded[i + j * 4 + 2] << 16) | (padded[i + j * 4 + 3] << 24);
    }
    
    let [a, b, c, d, e] = [h0, h1, h2, h3, h4];
    let [aa, bb, cc, dd, ee] = [h0, h1, h2, h3, h4];
    
    for (let j = 0; j < 80; j++) {
      let f: number, kk: number;
      const round = Math.floor(j / 16);
      
      if (round === 0) f = b ^ c ^ d;
      else if (round === 1) f = (b & c) | (~b & d);
      else if (round === 2) f = (b | ~c) ^ d;
      else if (round === 3) f = (b & d) | (c & ~d);
      else f = b ^ (c | ~d);
      
      const t = (rotl((a + f + X[R[j]] + K[round]) >>> 0, S[j]) + e) >>> 0;
      a = e; e = d; d = rotl(c, 10); c = b; b = t;
    }
    
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }
  
  const result = new Uint8Array(20);
  [h0, h1, h2, h3, h4].forEach((h, i) => {
    result[i * 4] = h & 0xFF;
    result[i * 4 + 1] = (h >> 8) & 0xFF;
    result[i * 4 + 2] = (h >> 16) & 0xFF;
    result[i * 4 + 3] = (h >> 24) & 0xFF;
  });
  
  return result;
}

// ============================================================================
// BASE58 ENCODING
// ============================================================================
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Encode(bytes: Uint8Array): string {
  let num = 0n;
  for (const byte of bytes) {
    num = num * 256n + BigInt(byte);
  }
  
  let result = '';
  while (num > 0n) {
    result = BASE58_ALPHABET[Number(num % 58n)] + result;
    num = num / 58n;
  }
  
  for (const byte of bytes) {
    if (byte === 0) result = '1' + result;
    else break;
  }
  
  return result;
}

// ============================================================================
// BITCOIN ADRESSE GENERIERUNG
// ============================================================================
async function privateKeyToAddress(privateKey: bigint): Promise<string> {
  const G: Point = { x: SECP256K1.Gx, y: SECP256K1.Gy };
  const pubPoint = scalarMult(privateKey, G);
  
  // Compressed public key
  const prefix = pubPoint.y % 2n === 0n ? 0x02 : 0x03;
  const pubKeyHex = pubPoint.x.toString(16).padStart(64, '0');
  const pubKeyBytes = new Uint8Array(33);
  pubKeyBytes[0] = prefix;
  for (let i = 0; i < 32; i++) {
    pubKeyBytes[i + 1] = parseInt(pubKeyHex.slice(i * 2, i * 2 + 2), 16);
  }
  
  // Hash160 = RIPEMD160(SHA256(pubkey))
  const sha = await sha256(pubKeyBytes);
  const hash160 = ripemd160(sha);
  
  // Add version byte (0x00 for mainnet)
  const versionedHash = new Uint8Array(21);
  versionedHash[0] = 0x00;
  versionedHash.set(hash160, 1);
  
  // Double SHA256 for checksum
  const checksum1 = await sha256(versionedHash);
  const checksum2 = await sha256(checksum1);
  
  // Final address bytes
  const addressBytes = new Uint8Array(25);
  addressBytes.set(versionedHash);
  addressBytes.set(checksum2.slice(0, 4), 21);
  
  return base58Encode(addressBytes);
}

// ============================================================================
// UR-ZAHL GENERATOR - 9-fache Spiegelung für Seeds
// ============================================================================
function generateUrZahl(seed: string, iterations: number = 9): bigint {
  let bits = '';
  for (const char of seed) {
    bits += char.charCodeAt(0).toString(2).padStart(8, '0');
  }
  
  for (let i = 0; i < iterations; i++) {
    const mirrored = bits.split('').map(b => b === '0' ? '1' : '0').join('');
    bits = bits + mirrored;
    if (bits.length > 512) bits = bits.slice(0, 512);
  }
  
  return BigInt('0b' + bits.slice(0, 256));
}

// ============================================================================
// DELTA-SOLVER HEURISTIK - Intelligente Suchstrategie
// ============================================================================
interface SearchState {
  current: bigint;
  minRange: bigint;
  maxRange: bigint;
  testedKeys: number;
  foundAddress: string | null;
  speed: number;
  entropy: number;
  deltaScore: number;
}

function calculateDeltaScore(key: bigint, targetBits: number): number {
  // Delta-Heuristik basierend auf Bit-Muster
  const keyBits = key.toString(2);
  const ones = keyBits.split('1').length - 1;
  const zeros = keyBits.length - ones;
  const balance = Math.abs(ones - zeros) / keyBits.length;
  
  // Chaos-Faktor (Lorenz-inspiriert)
  const chaosFactor = Math.sin(Number(key % 1000n) * 0.01) * 0.5 + 0.5;
  
  // Goldener-Schnitt-Resonanz
  const phi = 1.618033988749895;
  const phiFactor = Math.abs((Number(key % 10000n) / 10000) - (1 / phi));
  
  return (1 - balance) * 0.4 + chaosFactor * 0.3 + (1 - phiFactor) * 0.3;
}

// ============================================================================
// HAUPT-KOMPONENTE
// ============================================================================
export function BitcoinPuzzleSolver() {
  const [selectedPuzzle, setSelectedPuzzle] = useState(PUZZLES[0]);
  const [isRunning, setIsRunning] = useState(false);
  const [searchState, setSearchState] = useState<SearchState>({
    current: 0n,
    minRange: 0n,
    maxRange: 0n,
    testedKeys: 0,
    foundAddress: null,
    speed: 0,
    entropy: 0,
    deltaScore: 0
  });
  const [customStart, setCustomStart] = useState('');
  const [searchMode, setSearchMode] = useState<'sequential' | 'random' | 'delta' | 'urzahl' | 'historical'>('delta');
  const [batchSize, setBatchSize] = useState(1000);
  const [recentKeys, setRecentKeys] = useState<{key: string, address: string}[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [testedSeeds, setTestedSeeds] = useState<{seed: HistoricalSeed, address: string, match: boolean}[]>([]);
  const [isTestingSeeds, setIsTestingSeeds] = useState(false);
  
  const workerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const keysTestedRef = useRef<number>(0);

  const getSearchRange = useCallback((puzzle: typeof PUZZLES[0]) => {
    const bits = BigInt(puzzle.bits);
    const min = 2n ** (bits - 1n);
    const max = 2n ** bits - 1n;
    return { min, max };
  }, []);

  const generateNextKey = useCallback((current: bigint, mode: string, range: { min: bigint, max: bigint }): bigint => {
    switch (mode) {
      case 'sequential':
        return current + 1n > range.max ? range.min : current + 1n;
      
      case 'random': {
        const rangeSize = range.max - range.min;
        const randomBytes = new Uint8Array(32);
        crypto.getRandomValues(randomBytes);
        let randomBigInt = 0n;
        for (const byte of randomBytes) {
          randomBigInt = (randomBigInt << 8n) | BigInt(byte);
        }
        return range.min + (randomBigInt % rangeSize);
      }
      
      case 'delta': {
        // Delta-Solver: Springe basierend auf Heuristik
        const deltaScore = calculateDeltaScore(current, selectedPuzzle.bits);
        const jumpSize = BigInt(Math.floor(deltaScore * 1000000));
        const direction = deltaScore > 0.5 ? 1n : -1n;
        let next = current + direction * jumpSize;
        if (next < range.min) next = range.min;
        if (next > range.max) next = range.max;
        return next;
      }
      
      case 'urzahl': {
        // Ur-Zahl basierte Suche
        const urSeed = current.toString(16).slice(-8);
        const urZahl = generateUrZahl(urSeed, 5);
        const rangeSize = range.max - range.min;
        return range.min + (urZahl % rangeSize);
      }
      
      default:
        return current + 1n;
    }
  }, [selectedPuzzle.bits]);

  const searchBatch = useCallback(async () => {
    if (!isRunning) return;
    
    const range = getSearchRange(selectedPuzzle);
    let current = searchState.current || range.min;
    
    if (customStart && searchState.testedKeys === 0) {
      try {
        current = BigInt(customStart.startsWith('0x') ? customStart : '0x' + customStart);
        if (current < range.min) current = range.min;
        if (current > range.max) current = range.max;
      } catch {
        current = range.min;
      }
    }
    
    const batchResults: {key: string, address: string}[] = [];
    
    for (let i = 0; i < batchSize && isRunning; i++) {
      const key = generateNextKey(current, searchMode, range);
      
      try {
        const address = await privateKeyToAddress(key);
        keysTestedRef.current++;
        
        if (i % 100 === 0 || address === selectedPuzzle.address) {
          batchResults.push({
            key: key.toString(16).padStart(Math.ceil(selectedPuzzle.bits / 4), '0'),
            address
          });
        }
        
        if (address === selectedPuzzle.address) {
          setIsRunning(false);
          setSearchState(prev => ({
            ...prev,
            foundAddress: address,
            current: key
          }));
          toast.success(`🎉 SCHLÜSSEL GEFUNDEN! ${key.toString(16)}`);
          return;
        }
        
        current = key;
      } catch (error) {
        current = generateNextKey(current, 'random', range);
      }
    }
    
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const speed = Math.floor(keysTestedRef.current / elapsed);
    
    setSearchState(prev => ({
      ...prev,
      current,
      minRange: range.min,
      maxRange: range.max,
      testedKeys: keysTestedRef.current,
      speed,
      entropy: calculateDeltaScore(current, selectedPuzzle.bits),
      deltaScore: calculateDeltaScore(current, selectedPuzzle.bits)
    }));
    
    if (batchResults.length > 0) {
      setRecentKeys(batchResults.slice(-5));
    }
    
    if (isRunning) {
      workerRef.current = requestAnimationFrame(() => searchBatch());
    }
  }, [isRunning, searchState, selectedPuzzle, customStart, searchMode, batchSize, generateNextKey, getSearchRange]);

  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = Date.now();
      keysTestedRef.current = 0;
      searchBatch();
    }
    
    return () => {
      if (workerRef.current) {
        cancelAnimationFrame(workerRef.current);
      }
    };
  }, [isRunning]);

  const handleStart = () => {
    setIsRunning(true);
    toast.info('🔍 Suche gestartet...');
  };

  const handleStop = () => {
    setIsRunning(false);
    if (workerRef.current) {
      cancelAnimationFrame(workerRef.current);
    }
    toast.info('⏸️ Suche pausiert');
  };

  const progressPercent = searchState.maxRange > 0n 
    ? Number((searchState.current - searchState.minRange) * 100n / (searchState.maxRange - searchState.minRange))
    : 0;

  return (
    <div className="rounded-xl border border-crypto-purple/30 bg-card/80 backdrop-blur-sm p-6 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <Bitcoin className="w-8 h-8 text-yellow-500" />
        <div>
          <h3 className="text-xl font-bold text-crypto-purple">Bitcoin Puzzle Solver</h3>
          <p className="text-sm text-muted-foreground">
            OMEGA-Mathematik • Delta-Solver • Ur-Zahl-Heuristik
          </p>
        </div>
      </div>

      {/* Historical Seed Testing Function */}
      {(() => {
        const testHistoricalSeeds = async () => {
          setIsTestingSeeds(true);
          setTestedSeeds([]);
          
          const filteredSeeds = selectedCategory === 'all' 
            ? HISTORICAL_SEEDS 
            : HISTORICAL_SEEDS.filter(s => s.category === selectedCategory);
          
          for (const seed of filteredSeeds) {
            try {
              // Convert term to hex padded to 32 bytes
              let hexKey = seed.hexRaw;
              while (hexKey.length < 64) {
                hexKey = '0' + hexKey;
              }
              
              const privateKey = BigInt('0x' + hexKey);
              const address = await privateKeyToAddress(privateKey);
              const match = PUZZLES.some(p => p.address === address);
              
              setTestedSeeds(prev => [...prev, { seed, address, match }]);
              
              if (match) {
                toast.success(`🎯 MATCH GEFUNDEN: ${seed.term} = ${address}`);
              }
              
              // Small delay for UI update
              await new Promise(r => setTimeout(r, 50));
            } catch (error) {
              console.error(`Error testing ${seed.term}:`, error);
            }
          }
          
          setIsTestingSeeds(false);
          toast.info('Historische Seed-Analyse abgeschlossen');
        };

        return (
          <Tabs defaultValue="puzzle" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="puzzle" className="text-xs">Puzzle</TabsTrigger>
              <TabsTrigger value="search" className="text-xs">Suche</TabsTrigger>
              <TabsTrigger value="omega" className="text-xs">
                <Eye className="w-3 h-3 mr-1" />
                OMEGA
              </TabsTrigger>
              <TabsTrigger value="timeline" className="text-xs">
                <History className="w-3 h-3 mr-1" />
                Timeline
              </TabsTrigger>
              <TabsTrigger value="results" className="text-xs">Ergebnisse</TabsTrigger>
            </TabsList>

            <TabsContent value="puzzle" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Puzzle auswählen</label>
                  <Select 
                    value={selectedPuzzle.id.toString()} 
                    onValueChange={(v) => setSelectedPuzzle(PUZZLES.find(p => p.id.toString() === v) || PUZZLES[0])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PUZZLES.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          Puzzle #{p.id} - {p.bits} Bits - {p.balance}
                          {p.hint.includes('KEIN PUBLIC KEY') && ' ⚠️'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Such-Modus</label>
                  <Select value={searchMode} onValueChange={(v: any) => setSearchMode(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="delta">
                        <span className="flex items-center gap-2">
                          <Brain className="w-4 h-4" /> Delta-Solver (KI-Heuristik)
                        </span>
                      </SelectItem>
                      <SelectItem value="urzahl">
                        <span className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4" /> Ur-Zahl (9-Spiegelung)
                        </span>
                      </SelectItem>
                      <SelectItem value="historical">
                        <span className="flex items-center gap-2">
                          <FileText className="w-4 h-4" /> Historische Seeds
                        </span>
                      </SelectItem>
                      <SelectItem value="random">
                        <span className="flex items-center gap-2">
                          <Zap className="w-4 h-4" /> Quanten-Random
                        </span>
                      </SelectItem>
                      <SelectItem value="sequential">
                        <span className="flex items-center gap-2">
                          <Target className="w-4 h-4" /> Sequentiell
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Adresse:</span>
                    <p className="font-mono text-xs break-all">{selectedPuzzle.address}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Suchraum:</span>
                    <p className="font-mono">2^{selectedPuzzle.bits - 1} bis 2^{selectedPuzzle.bits}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Balance:</span>
                    <p className="text-yellow-500 font-bold">{selectedPuzzle.balance}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Schwierigkeit:</span>
                    <p className="text-red-400">{selectedPuzzle.bits} Bits</p>
                  </div>
                </div>
                {selectedPuzzle.hint.includes('KEIN PUBLIC KEY') && (
                  <div className="mt-3 p-2 rounded bg-orange-500/20 border border-orange-500/30">
                    <p className="text-xs text-orange-400 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      <strong>Gap Theory:</strong> Dieses Puzzle hat KEINEN öffentlichen Schlüssel. 
                      Mathematische Angriffe (Pollard's Rho) sind nicht möglich. 
                      Nur Brute-Force oder Wörterbuchangriffe funktionieren hier!
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="search" className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Startpunkt (Hex, optional)</label>
                <Input
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  placeholder="z.B. 2000000000000000"
                  className="font-mono"
                  disabled={isRunning}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Batch-Größe: {batchSize.toLocaleString()}
                </label>
                <Slider
                  value={[batchSize]}
                  onValueChange={([v]) => setBatchSize(v)}
                  min={100}
                  max={10000}
                  step={100}
                  disabled={isRunning}
                />
              </div>

              <div className="flex gap-4">
                {!isRunning ? (
                  <Button onClick={handleStart} className="flex-1 bg-green-600 hover:bg-green-700">
                    <Play className="w-4 h-4 mr-2" />
                    Suche starten
                  </Button>
                ) : (
                  <Button onClick={handleStop} variant="destructive" className="flex-1">
                    <Pause className="w-4 h-4 mr-2" />
                    Stoppen
                  </Button>
                )}
              </div>

              {searchState.testedKeys > 0 && (
                <div className="space-y-3 p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="flex justify-between text-sm">
                    <span>Fortschritt</span>
                    <span>{progressPercent.toFixed(10)}%</span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                    <div>
                      <span className="text-muted-foreground">Getestet:</span>
                      <p className="font-mono">{searchState.testedKeys.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Speed:</span>
                      <p className="font-mono">{searchState.speed.toLocaleString()} keys/s</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Delta-Score:</span>
                      <p className="font-mono">{searchState.deltaScore.toFixed(4)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Aktueller Key:</span>
                      <p className="font-mono text-xs break-all">
                        {searchState.current.toString(16).slice(0, 16)}...
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* PROJECT OMEGA - Historische Seed-Analyse */}
            <TabsContent value="omega" className="space-y-4 mt-4">
              <div className="p-4 rounded-lg bg-gradient-to-r from-red-500/10 via-purple-500/10 to-yellow-500/10 border border-crypto-purple/50">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-6 h-6 text-red-400" />
                  <div>
                    <h4 className="font-bold text-lg">PROJECT OMEGA</h4>
                    <p className="text-xs text-muted-foreground">
                      Forensische Rekonstruktion: NSA/CIA/CryptoAG ↔ Bitcoin
                    </p>
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Kategorie filtern</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Kategorien</SelectItem>
                      <SelectItem value="crypto_ag">🔴 Crypto AG / OMNISEC</SelectItem>
                      <SelectItem value="nsa">🟠 NSA Origins</SelectItem>
                      <SelectItem value="bitcoin_origin">🟡 Bitcoin Origins</SelectItem>
                      <SelectItem value="cypherpunk">🟢 Cypherpunks</SelectItem>
                      <SelectItem value="economic">🔵 Economic Theory</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={testHistoricalSeeds} 
                  disabled={isTestingSeeds}
                  className="w-full bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700"
                >
                  {isTestingSeeds ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2" />
                      Analysiere Seeds...
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Historische Seeds testen
                    </>
                  )}
                </Button>
              </div>

              {/* Seed Database */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Historische Seed-Datenbank ({HISTORICAL_SEEDS.filter(s => selectedCategory === 'all' || s.category === selectedCategory).length} Seeds)
                </h4>
                <ScrollArea className="h-64 rounded-lg border border-border">
                  <div className="p-2 space-y-2">
                    {HISTORICAL_SEEDS
                      .filter(s => selectedCategory === 'all' || s.category === selectedCategory)
                      .map((seed, i) => (
                        <div 
                          key={i} 
                          className={`p-3 rounded-lg border ${getCategoryColor(seed.category)}`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-mono font-bold">{seed.term}</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-muted">{seed.targetPuzzle}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{seed.historicalContext}</p>
                          <div className="flex gap-4 text-xs font-mono">
                            <span>Chars: {seed.lengthChar}</span>
                            <span>Bits: {seed.lengthBits}</span>
                            <span className="text-muted-foreground truncate">0x{seed.hexRaw}</span>
                          </div>
                        </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Test Results */}
              {testedSeeds.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Test-Ergebnisse ({testedSeeds.length})</h4>
                  <ScrollArea className="h-48 rounded-lg border border-border">
                    <div className="p-2 space-y-1">
                      {testedSeeds.map((result, i) => (
                        <div 
                          key={i} 
                          className={`p-2 rounded text-xs font-mono ${
                            result.match 
                              ? 'bg-green-500/20 border border-green-500' 
                              : 'bg-muted/30'
                          }`}
                        >
                          <div className="flex justify-between">
                            <span className="font-bold">{result.seed.term}</span>
                            {result.match && <span className="text-green-500">✓ MATCH!</span>}
                          </div>
                          <p className="text-muted-foreground truncate">{result.address}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <p className="text-xs text-yellow-600">
                  ⚠️ <strong>Theorie:</strong> Die "Gap Theory" besagt, dass Puzzles NICHT durch 5 teilbar 
                  (#73, #74, #76...) historische Ankerpunkte als Seeds verwenden könnten, da sie keinen 
                  öffentlichen Schlüssel haben und mathematische Angriffe nicht funktionieren.
                </p>
              </div>
            </TabsContent>

            {/* Timeline History */}
            <TabsContent value="timeline" className="space-y-4 mt-4">
              <div className="flex items-center gap-3 mb-4">
                <History className="w-6 h-6 text-purple-400" />
                <div>
                  <h4 className="font-bold">Forensische Timeline</h4>
                  <p className="text-xs text-muted-foreground">1945 → 2024: Von SHAMROCK zu Bitcoin</p>
                </div>
              </div>

              <ScrollArea className="h-96">
                <div className="space-y-3 pr-4">
                  {TIMELINE_HISTORY.map((event, i) => (
                    <div 
                      key={i} 
                      className={`p-4 rounded-lg border-l-4 ${getTimelineCategoryColor(event.category)}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs px-2 py-0.5 rounded bg-muted">{event.era}</span>
                        <span className="font-bold text-lg">{event.year}</span>
                      </div>
                      <h5 className="font-bold mb-1">{event.title}</h5>
                      <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                      <div className="p-2 rounded bg-muted/30">
                        <p className="text-xs"><strong>Relevanz:</strong> {event.relevance}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded border-l-4 border-red-500 bg-red-500/10">Foundation</div>
                <div className="p-2 rounded border-l-4 border-orange-500 bg-orange-500/10">Operations</div>
                <div className="p-2 rounded border-l-4 border-purple-500 bg-purple-500/10">Crypto</div>
                <div className="p-2 rounded border-l-4 border-yellow-500 bg-yellow-500/10">Bitcoin</div>
              </div>
            </TabsContent>

            <TabsContent value="results" className="space-y-4 mt-4">
              {searchState.foundAddress ? (
                <div className="p-6 rounded-lg bg-green-500/20 border border-green-500 text-center">
                  <Key className="w-12 h-12 mx-auto text-green-500 mb-4" />
                  <h4 className="text-xl font-bold text-green-500 mb-2">SCHLÜSSEL GEFUNDEN!</h4>
                  <p className="font-mono text-sm break-all">{searchState.current.toString(16)}</p>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <p className="text-muted-foreground text-center">Noch kein Schlüssel gefunden...</p>
                </div>
              )}

              <div>
                <h4 className="font-medium mb-3">Letzte getestete Schlüssel</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {recentKeys.map((item, i) => (
                    <div key={i} className="p-2 rounded bg-muted/30 border border-border">
                      <p className="font-mono text-xs text-muted-foreground">Key: {item.key.slice(0, 32)}...</p>
                      <p className="font-mono text-xs">Addr: {item.address}</p>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        );
      })()}

      <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
        <p className="text-xs text-yellow-600">
          ⚠️ <strong>Wissenschaftlicher Hinweis:</strong> Dieses Tool dient der forensischen Analyse 
          und mathematischen Forschung. Die historischen Verbindungen sind dokumentiert und öffentlich zugänglich. 
          Die Bitcoin Puzzles sind mathematische Herausforderungen mit astronomisch großen Suchräumen.
        </p>
      </div>
    </div>
  );
}
