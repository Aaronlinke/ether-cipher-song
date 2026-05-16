import { useState } from 'react';
import { Skull, Brain, KeyRound, Play, Loader2, Repeat, Dice5 } from 'lucide-react';
import { CryptoPanel } from '@/components/CryptoPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  sha256,
  hexToBytes,
  bytesToHex,
  privateKeyToAddress,
  base58Encode,
} from '@/lib/crypto-utils';
import { getBip39Wordlist } from '@/lib/bip39-wordlist';

const SECP256K1_N = BigInt(
  '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141'
);

function modN(a: bigint): bigint {
  const r = a % SECP256K1_N;
  return r >= 0n ? r : r + SECP256K1_N;
}

function modInvN(a: bigint): bigint {
  // Extended Euclidean
  let [old_r, r] = [modN(a), SECP256K1_N];
  let [old_s, s] = [1n, 0n];
  while (r !== 0n) {
    const q = old_r / r;
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  return modN(old_s);
}

function isValidPriv(bytes: Uint8Array): boolean {
  if (bytes.length !== 32) return false;
  const v = BigInt('0x' + bytesToHex(bytes));
  return v > 0n && v < SECP256K1_N;
}

async function privToWif(priv: Uint8Array, compressed = true): Promise<string> {
  const payload = new Uint8Array(compressed ? 34 : 33);
  payload[0] = 0x80;
  payload.set(priv, 1);
  if (compressed) payload[33] = 0x01;
  const c1 = await sha256(payload);
  const c2 = await sha256(c1);
  const out = new Uint8Array(payload.length + 4);
  out.set(payload, 0);
  out.set(c2.slice(0, 4), payload.length);
  return base58Encode(out);
}

// ─────────── 1) Debian PID Reconstructor (CVE-2008-0166) ───────────
function DebianScanner() {
  const [address, setAddress] = useState('');
  const [seedTag, setSeedTag] = useState('debian:openssl:2006-2008');
  const [maxPid, setMaxPid] = useState(8192);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hits, setHits] = useState<{ pid: number; wif: string; addr: string }[]>([]);
  const [scanned, setScanned] = useState(0);

  const run = async () => {
    if (!address.trim()) return;
    setRunning(true);
    setHits([]);
    setProgress(0);
    setScanned(0);
    const enc = new TextEncoder();
    const found: { pid: number; wif: string; addr: string }[] = [];
    for (let pid = 1; pid <= maxPid; pid++) {
      let priv = await sha256(enc.encode(`${seedTag}:pid=${pid}`));
      if (!isValidPriv(priv)) priv = await sha256(priv);
      if (isValidPriv(priv)) {
        const hex = bytesToHex(priv);
        const addr = await privateKeyToAddress(hex, true);
        if (addr === address.trim()) {
          const wif = await privToWif(priv, true);
          found.push({ pid, wif, addr });
          setHits([...found]);
        }
      }
      if (pid % 64 === 0) {
        setProgress((pid / maxPid) * 100);
        setScanned(pid);
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    setScanned(maxPid);
    setProgress(100);
    setRunning(false);
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        CVE-2008-0166 — rekonstruiert Keys aus deterministischem PID-Raum (1..32768) eines kompromittierten OpenSSL-Builds.
      </div>
      <Input placeholder="Ziel-Adresse (P2PKH, beginnt mit 1...)" value={address} onChange={(e) => setAddress(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <Input value={seedTag} onChange={(e) => setSeedTag(e.target.value)} placeholder="seed-tag" />
        <Input type="number" value={maxPid} onChange={(e) => setMaxPid(Math.max(1, parseInt(e.target.value) || 1))} placeholder="max PID" />
      </div>
      <Button onClick={run} disabled={running} className="w-full bg-crypto-red/20 hover:bg-crypto-red/30 text-crypto-red border border-crypto-red/40">
        {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
        {running ? `Scanne PIDs… ${scanned}/${maxPid}` : 'PID-Raum scannen'}
      </Button>
      {running && (
        <div className="h-1 bg-muted/20 rounded overflow-hidden">
          <div className="h-full bg-crypto-red transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      {hits.length > 0 ? (
        <div className="space-y-2">
          {hits.map((h, i) => (
            <div key={i} className="p-2 rounded border border-crypto-green/40 bg-crypto-green/5 font-mono text-[10px] break-all">
              <div className="text-crypto-green">★ HIT @ PID={h.pid}</div>
              <div>WIF: {h.wif}</div>
              <div>Addr: {h.addr}</div>
            </div>
          ))}
        </div>
      ) : !running && scanned > 0 ? (
        <div className="text-xs text-muted-foreground">Keine Rekonstruktion in {scanned} PIDs.</div>
      ) : null}
    </div>
  );
}

// ─────────── 2) Brain Wallet Analyzer ───────────
function BrainWalletAnalyzer() {
  const [phrase, setPhrase] = useState('');
  const [result, setResult] = useState<null | {
    bits: number;
    risk: string;
    riskColor: string;
    privHex: string;
    wif: string;
    addr: string;
  }>(null);
  const [busy, setBusy] = useState(false);

  const analyze = async () => {
    if (!phrase) return;
    setBusy(true);
    let pool = 0;
    if (/[a-z]/.test(phrase)) pool += 26;
    if (/[A-Z]/.test(phrase)) pool += 26;
    if (/[0-9]/.test(phrase)) pool += 10;
    if (/[^a-zA-Z0-9]/.test(phrase)) pool += 32;
    const bits = pool ? phrase.length * Math.log2(pool) : 0;

    let priv = await sha256(new TextEncoder().encode(phrase));
    if (!isValidPriv(priv)) priv = await sha256(priv);
    const hex = bytesToHex(priv);
    const addr = await privateKeyToAddress(hex, true);
    const wif = await privToWif(priv, true);

    let risk = 'Sehr stark', riskColor = 'text-crypto-green';
    if (bits < 40) { risk = 'Sofort kompromittierbar (Wörterbuch / Rainbow)'; riskColor = 'text-crypto-red'; }
    else if (bits < 64) { risk = 'Anfällig für GPU-Brute-Force'; riskColor = 'text-crypto-red'; }
    else if (bits < 96) { risk = 'Mittel — Cluster-Angriffe in Tagen/Wochen'; riskColor = 'text-crypto-orange'; }
    else if (bits < 128) { risk = 'Stark — nur Nation-State Angreifer'; riskColor = 'text-crypto-gold'; }

    setResult({ bits, risk, riskColor, privHex: hex, wif, addr });
    setBusy(false);
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        SHA-256(passphrase) → privater Schlüssel. Berechnet Entropie & Risiko.
      </div>
      <Input placeholder="z.B. correct horse battery staple" value={phrase} onChange={(e) => setPhrase(e.target.value)} />
      <Button onClick={analyze} disabled={busy || !phrase} className="w-full bg-crypto-purple/20 hover:bg-crypto-purple/30 text-crypto-purple border border-crypto-purple/40">
        {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
        Analysieren
      </Button>
      {result && (
        <div className="space-y-1 font-mono text-[10px] break-all p-2 rounded border border-border/30 bg-background/40">
          <div>Entropie: <span className="text-crypto-gold">{result.bits.toFixed(2)} bit</span></div>
          <div>Risiko: <span className={result.riskColor}>{result.risk}</span></div>
          <div className="text-muted-foreground">Priv: {result.privHex}</div>
          <div className="text-muted-foreground">WIF:  {result.wif}</div>
          <div className="text-muted-foreground">Addr: {result.addr}</div>
        </div>
      )}
    </div>
  );
}

// ─────────── 3) BIP39 Last-Word Reducer ───────────
function Bip39Reducer() {
  const [eleven, setEleven] = useState('');
  const [valid, setValid] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setError('');
    setValid(null);
    setBusy(true);
    try {
      const wl = await getBip39Wordlist();
      const words = eleven.trim().split(/\s+/);
      if (words.length !== 11) throw new Error('Bitte genau 11 Wörter eingeben.');
      const baseBits: number[] = [];
      for (const w of words) {
        const idx = wl.indexOf(w);
        if (idx < 0) throw new Error(`Unbekanntes BIP39-Wort: ${w}`);
        for (let b = 10; b >= 0; b--) baseBits.push((idx >> b) & 1);
      }
      const found: string[] = [];
      for (let cand = 0; cand < 2048; cand++) {
        const wordBits: number[] = [];
        for (let b = 10; b >= 0; b--) wordBits.push((cand >> b) & 1);
        const all = [...baseBits, ...wordBits];
        const ent = new Uint8Array(16);
        for (let i = 0; i < 128; i++) ent[i >> 3] |= all[i] << (7 - (i & 7));
        const h = await sha256(ent);
        const expected = [0, 1, 2, 3].map((i) => (h[0] >> (7 - i)) & 1);
        const csum = all.slice(128, 132);
        if (expected.every((v, i) => v === csum[i])) found.push(wl[cand]);
      }
      setValid(found);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        Reduziert die 12. Seed-Wort-Suche auf gültige Checksumme: 128 von 2048 (≈ 6.25 %).
      </div>
      <Textarea
        rows={3}
        placeholder="11 BIP39-Wörter, durch Leerzeichen getrennt"
        value={eleven}
        onChange={(e) => setEleven(e.target.value)}
        className="font-mono text-xs"
      />
      <Button onClick={run} disabled={busy} className="w-full bg-crypto-gold/20 hover:bg-crypto-gold/30 text-crypto-gold border border-crypto-gold/40">
        {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
        Gültige 12. Wörter finden
      </Button>
      {error && <div className="text-xs text-crypto-red font-mono">{error}</div>}
      {valid && (
        <div className="space-y-2">
          <div className="text-xs text-crypto-green">
            {valid.length} / 2048 gültig ({((valid.length / 2048) * 100).toFixed(2)} %)
          </div>
          <div className="font-mono text-[10px] p-2 rounded border border-border/30 bg-background/40 max-h-40 overflow-auto">
            {valid.join(', ')}
          </div>
        </div>
      )}
    </div>
  );
}

export function ApexForensics() {
  return (
    <CryptoPanel
      title="Apex Forensics — OmniGenesis Solver"
      icon={<Skull className="w-4 h-4" />}
      glowColor="purple"
    >
      <div className="text-[10px] text-muted-foreground mb-4 p-2 rounded border border-crypto-red/30 bg-crypto-red/5">
        ⚠ Forensik-Modul. Fünf Entropie-Kollaps-Vektoren: Debian-OpenSSL-Bug, Brain-Wallet,
        BIP39-Checksum, ECDSA-Nonce-Reuse, Schwache-RNG-Muster. Nur für eigene Schlüssel / Forschung.
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <div className="text-xs font-display text-crypto-red uppercase tracking-wider flex items-center gap-2">
            <Skull className="w-3 h-3" /> Debian PID
          </div>
          <DebianScanner />
        </div>
        <div className="space-y-2">
          <div className="text-xs font-display text-crypto-purple uppercase tracking-wider flex items-center gap-2">
            <Brain className="w-3 h-3" /> Brain Wallet
          </div>
          <BrainWalletAnalyzer />
        </div>
        <div className="space-y-2">
          <div className="text-xs font-display text-crypto-gold uppercase tracking-wider flex items-center gap-2">
            <KeyRound className="w-3 h-3" /> BIP39 Reducer
          </div>
          <Bip39Reducer />
        </div>
        <div className="space-y-2">
          <div className="text-xs font-display text-crypto-blue uppercase tracking-wider flex items-center gap-2">
            <Repeat className="w-3 h-3" /> Nonce-Reuse Recovery
          </div>
          <NonceReuseRecovery />
        </div>
        <div className="space-y-2 lg:col-span-2">
          <div className="text-xs font-display text-crypto-orange uppercase tracking-wider flex items-center gap-2">
            <Dice5 className="w-3 h-3" /> Weak-RNG Pattern Scanner
          </div>
          <WeakRngScanner />
        </div>
      </div>
    </CryptoPanel>
  );
}

// ─────────── 4) ECDSA Nonce-Reuse Recovery ───────────
// Wenn zwei Signaturen (r, s1, z1) und (r, s2, z2) das gleiche r benutzen,
// dann gilt: k = (z1 − z2) · (s1 − s2)^-1   und   d = (s1·k − z1) · r^-1   mod n
function NonceReuseRecovery() {
  const [r, setR] = useState('');
  const [s1, setS1] = useState('');
  const [s2, setS2] = useState('');
  const [z1, setZ1] = useState('');
  const [z2, setZ2] = useState('');
  const [out, setOut] = useState<null | { k: string; d: string; wif: string; addr: string }>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const parse = (h: string) => BigInt('0x' + h.trim().replace(/^0x/i, ''));

  const run = async () => {
    setErr(''); setOut(null); setBusy(true);
    try {
      const R = parse(r), S1 = parse(s1), S2 = parse(s2), Z1 = parse(z1), Z2 = parse(z2);
      if (S1 === S2) throw new Error('s1 == s2: keine Wiederverwendung erkennbar.');
      const k = modN((Z1 - Z2) * modInvN(S1 - S2));
      const d = modN((modN(S1 * k) - Z1) * modInvN(R));
      const hex = d.toString(16).padStart(64, '0');
      const priv = hexToBytes(hex);
      const addr = await privateKeyToAddress(hex, true);
      const wif = await privToWif(priv, true);
      setOut({ k: k.toString(16).padStart(64, '0'), d: hex, wif, addr });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">
        Klassische ECDSA-Katastrophe (Sony PS3, Android Bitcoin Wallet 2013): identische
        Nonce k in zwei Signaturen → privater Schlüssel direkt berechenbar.
      </div>
      <Input placeholder="r (hex, geteilt)" value={r} onChange={(e) => setR(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="s1 (hex)" value={s1} onChange={(e) => setS1(e.target.value)} />
        <Input placeholder="s2 (hex)" value={s2} onChange={(e) => setS2(e.target.value)} />
        <Input placeholder="z1 = H(m1)" value={z1} onChange={(e) => setZ1(e.target.value)} />
        <Input placeholder="z2 = H(m2)" value={z2} onChange={(e) => setZ2(e.target.value)} />
      </div>
      <Button onClick={run} disabled={busy} className="w-full bg-crypto-blue/20 hover:bg-crypto-blue/30 text-crypto-blue border border-crypto-blue/40">
        {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Repeat className="w-4 h-4 mr-2" />}
        Privaten Schlüssel rekonstruieren
      </Button>
      {err && <div className="text-xs text-crypto-red font-mono">{err}</div>}
      {out && (
        <div className="space-y-1 font-mono text-[10px] break-all p-2 rounded border border-crypto-green/40 bg-crypto-green/5">
          <div className="text-crypto-green">★ k  = {out.k}</div>
          <div className="text-crypto-green">★ d  = {out.d}</div>
          <div>WIF: {out.wif}</div>
          <div>Addr: {out.addr}</div>
        </div>
      )}
    </div>
  );
}

// ─────────── 5) Weak-RNG Pattern Scanner ───────────
// Erkennt klassische RNG-Schwächen in einer Hex-Sequenz:
//   • Java SecureRandom: führende 0x00-Bytes oder begrenzte Variation in High-Nibble
//   • Mt19937: hohe Wiederholungsrate in unteren 16 Bits
//   • Timestamp-basiert: Unix-Sekunden in den ersten 4 Bytes
//   • Counter/Sequenz: monotone Differenz
function WeakRngScanner() {
  const [text, setText] = useState('');
  const [res, setRes] = useState<{ label: string; verdict: string; color: string }[]>([]);

  const scan = () => {
    const lines = text.split(/\s+/).filter((l) => /^[0-9a-fA-F]{8,}$/.test(l));
    if (lines.length < 2) { setRes([{ label: 'Eingabe', verdict: 'Mindestens 2 Hex-Werte (je ≥4 Bytes) nötig.', color: 'text-crypto-red' }]); return; }
    const findings: { label: string; verdict: string; color: string }[] = [];
    // 1. Leading zero bytes (Java SecureRandom bug)
    const leadZero = lines.filter((l) => l.startsWith('00')).length;
    findings.push({
      label: 'Java-SecureRandom (führende 00)',
      verdict: leadZero / lines.length > 0.3 ? `${leadZero}/${lines.length} verdächtig` : 'unauffällig',
      color: leadZero / lines.length > 0.3 ? 'text-crypto-red' : 'text-crypto-green',
    });
    // 2. Low 16-bit collision rate (Mt19937 / LCG)
    const low = lines.map((l) => l.slice(-4));
    const uniq = new Set(low).size;
    const expected = lines.length * (1 - Math.exp(-lines.length / 65536));
    findings.push({
      label: 'Low-16bit Kollisionen (Mt19937/LCG)',
      verdict: uniq < lines.length - expected * 2 ? `nur ${uniq} unique → schwach` : `${uniq} unique → ok`,
      color: uniq < lines.length - expected * 2 ? 'text-crypto-red' : 'text-crypto-green',
    });
    // 3. Timestamp-Detection: first 4 bytes near 'now'
    const now = Math.floor(Date.now() / 1000);
    const tsCount = lines.filter((l) => {
      const ts = parseInt(l.slice(0, 8), 16);
      return ts > 946684800 && Math.abs(ts - now) < 60 * 60 * 24 * 365 * 25;
    }).length;
    findings.push({
      label: 'Timestamp-basiert (Unix in 25 J.)',
      verdict: tsCount / lines.length > 0.5 ? `${tsCount}/${lines.length} sind Unix-Timestamps` : 'unauffällig',
      color: tsCount / lines.length > 0.5 ? 'text-crypto-red' : 'text-crypto-green',
    });
    // 4. Monotone Counter
    const ints = lines.map((l) => BigInt('0x' + l.slice(0, 16)));
    let monotone = true;
    for (let i = 1; i < ints.length; i++) if (ints[i] <= ints[i - 1]) { monotone = false; break; }
    findings.push({
      label: 'Monotoner Counter',
      verdict: monotone ? 'JA — strikt aufsteigend' : 'nein',
      color: monotone ? 'text-crypto-red' : 'text-crypto-green',
    });
    // 5. Shannon entropy
    const all = lines.join('');
    const freq: Record<string, number> = {};
    for (const c of all) freq[c] = (freq[c] || 0) + 1;
    let H = 0; for (const c in freq) { const p = freq[c] / all.length; H -= p * Math.log2(p); }
    findings.push({
      label: `Shannon-Entropie (max 4.0)`,
      verdict: `${H.toFixed(3)} bits/Nibble`,
      color: H < 3.5 ? 'text-crypto-red' : H < 3.9 ? 'text-crypto-orange' : 'text-crypto-green',
    });
    setRes(findings);
  };

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">
        Füge eine Liste hex-codierter RNG-Outputs (oder private Keys, Nonces) ein — einer pro Zeile.
        Der Scanner sucht nach klassischen PRNG-Schwächen (Mt19937, LCG, Java-Bug, Timestamp-Seed, Counter).
      </div>
      <Textarea
        rows={5}
        placeholder={'1a2b3c4d5e6f...\n00abcdef12345678...\n...'}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="font-mono text-xs"
      />
      <Button onClick={scan} disabled={!text.trim()} className="w-full bg-crypto-orange/20 hover:bg-crypto-orange/30 text-crypto-orange border border-crypto-orange/40">
        <Dice5 className="w-4 h-4 mr-2" /> Schwächen suchen
      </Button>
      {res.length > 0 && (
        <div className="space-y-1 font-mono text-[10px] p-2 rounded border border-border/30 bg-background/40">
          {res.map((f, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto] gap-2">
              <div className="text-muted-foreground">{f.label}</div>
              <div className={f.color}>{f.verdict}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}