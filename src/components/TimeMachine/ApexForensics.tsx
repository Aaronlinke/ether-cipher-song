import { useState } from 'react';
import { Skull, Brain, KeyRound, Play, Loader2 } from 'lucide-react';
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
        ⚠ Forensik-Modul. Drei klassische Entropie-Kollaps-Vektoren: Debian-OpenSSL-Bug,
        Brain-Wallet-Analyse, BIP39-Checksum-Reduzierung. Nur für eigene Schlüssel / Forschung.
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
      </div>
    </CryptoPanel>
  );
}