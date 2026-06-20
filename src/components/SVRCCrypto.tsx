import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ShieldCheck, Play, Download, Key, AlertTriangle, CheckCircle2, XCircle, HelpCircle, Wallet, Layers, Search, Loader2 } from 'lucide-react';
import { getPublicKey } from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha2';
import { ripemd160 } from '@noble/hashes/legacy';

// ============ CryptoAxioms ============
const AXIOMS = {
  SHA256_PREIMAGE_BITS: 256,
  RIPEMD160_PREIMAGE_BITS: 160,
  HASH160_PREIMAGE_BITS: 160,
  SECP256K1_ECDLP_BITS: 128,
  GROVER_SPEEDUP: 0.5,
  SECURE_THRESHOLD: 100,
  // Hashes/sec estimates (deterministic, conservative)
  HASH_RATE_GPU: 1e10,        // 10 GH/s single GPU
  HASH_RATE_GLOBAL: 5e20,     // ~Bitcoin network 500 EH/s
};

type Truth = 'TRUE' | 'FALSE' | 'UNDECIDABLE';

interface EvalResult {
  input: string;
  truth_value: Truth;
  method: string;
  reason?: string;
  details?: Record<string, string | number>;
}

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function preimageBits(name: string): number {
  const n = name.toUpperCase();
  if (n === 'SHA256' || n === 'SHA-256') return AXIOMS.SHA256_PREIMAGE_BITS;
  if (n === 'RIPEMD160' || n === 'RIPEMD-160') return AXIOMS.RIPEMD160_PREIMAGE_BITS;
  if (n === 'HASH160') return AXIOMS.HASH160_PREIMAGE_BITS;
  return -1;
}

function formatYears(seconds: number): string {
  if (!isFinite(seconds)) return '∞';
  const yr = seconds / (3600 * 24 * 365.25);
  if (yr < 1) return `${seconds.toExponential(2)} s`;
  if (yr < 1e6) return `${yr.toExponential(2)} Jahre`;
  if (yr < 1e15) return `${(yr / 1e9).toExponential(2)} Mrd. Jahre`;
  return `${yr.toExponential(2)} Jahre (≫ Universumsalter)`;
}

function bruteForceTime(bits: number, hashRate: number) {
  // 2^bits / hashRate seconds (average: half that, we use worst case)
  const ops = Math.pow(2, Math.min(bits, 1023));
  return ops / hashRate;
}

function evaluateCrypto(statement: string): EvalResult {
  const stmt = statement.trim();
  const up = stmt.toUpperCase();
  const res: EvalResult = { input: stmt, truth_value: 'UNDECIDABLE', method: 'crypto_analysis' };

  // 1. Pre-image complexity
  let m = up.match(/(HASH160|SHA256|RIPEMD160)\s+PRE-IMAGE\s+COMPLEXITY\s*(>=|<=|=|>|<)\s*(\d+)\s+BITS/);
  if (m) {
    const real = preimageBits(m[1]);
    const op = m[2];
    const claim = parseInt(m[3]);
    const cmp: Record<string, (a: number, b: number) => boolean> = {
      '>=': (a, b) => a >= b, '<=': (a, b) => a <= b,
      '=': (a, b) => a === b, '>': (a, b) => a > b, '<': (a, b) => a < b,
    };
    res.truth_value = cmp[op](real, claim) ? 'TRUE' : 'FALSE';
    res.method = 'preimage_axiom';
    res.details = {
      real_bits: real,
      gpu_time: formatYears(bruteForceTime(real, AXIOMS.HASH_RATE_GPU)),
      global_time: formatYears(bruteForceTime(real, AXIOMS.HASH_RATE_GLOBAL)),
    };
    return res;
  }
  // 2. ECDLP
  m = up.match(/SECP256K1\s+ECDLP\s+COMPLEXITY\s*(>=|<=|=|>|<)\s*(\d+)\s+BITS/);
  if (m) {
    const op = m[1]; const claim = parseInt(m[2]);
    const real = AXIOMS.SECP256K1_ECDLP_BITS;
    const cmp: Record<string, (a: number, b: number) => boolean> = {
      '>=': (a, b) => a >= b, '<=': (a, b) => a <= b,
      '=': (a, b) => a === b, '>': (a, b) => a > b, '<': (a, b) => a < b,
    };
    res.truth_value = cmp[op](real, claim) ? 'TRUE' : 'FALSE';
    res.method = 'ecdlp_axiom';
    res.details = { real_bits: real, classical_attack: 'Pollard-Rho + Endomorphismus' };
    return res;
  }
  // 3. Shor / Quantum-safe
  if (up.includes('SHOR') && up.includes('SECP256K1')) {
    if (up.includes('QUANTUM-SAFE') || up.includes('QUANTUM RESISTANT') || up.includes('QUANTEN-SICHER') || up.includes('SAFE')) {
      res.truth_value = 'FALSE';
      res.reason = "Shor bricht ECDLP in Polynomialzeit.";
    } else if (up.includes('BREAK')) {
      res.truth_value = 'TRUE';
      res.reason = 'Shor löst ECDLP in O((log N)^3).';
    }
    res.method = 'quantum_shor';
    return res;
  }
  if (up.includes('GROVER')) {
    const hashMatch = up.match(/(HASH160|SHA256|RIPEMD160)/);
    if (hashMatch) {
      const real = preimageBits(hashMatch[1]);
      const grover = Math.floor(real * AXIOMS.GROVER_SPEEDUP);
      const target = up.match(/2\^(\d+)/);
      res.method = 'quantum_grover';
      res.details = { classical_bits: real, grover_bits: grover };
      if (target) {
        res.truth_value = parseInt(target[1]) === grover ? 'TRUE' : 'FALSE';
      } else {
        res.truth_value = 'TRUE';
        res.reason = `Grover reduziert ${hashMatch[1]} auf 2^${grover}.`;
      }
      return res;
    }
  }
  // 4. Bitcoin Address
  m = stmt.match(/Address\s+([13][a-km-zA-HJ-NP-Z1-9]{25,34})/i);
  if (m) {
    const addr = m[1];
    res.method = 'address_attack';
    res.details = { address: addr };
    if (up.includes('POSSIBLE') || up.includes('FIND PRIVATE KEY') || up.includes('EXTRACTION') || up.includes('MÖGLICH')) {
      if (up.includes('QUANTUM') || up.includes('QUANTEN')) {
        res.truth_value = 'UNDECIDABLE';
        res.reason = 'Grover reduziert auf 2^80 Schritte — theoretisch möglich, nicht praktisch.';
      } else {
        res.truth_value = 'FALSE';
        res.reason = 'Klassischer Pre-Image-Angriff erfordert 2^160 Operationen.';
      }
    }
    return res;
  }
  // 5. Pipeline / Linear Derivation
  if (up.includes('LINEAR DERIVATION') || up.includes('PIPELINE')) {
    res.method = 'pipeline_axiom';
    if (up.includes('INVERTIBLE') || up.includes('INVERTIERBAR')) {
      res.truth_value = 'TRUE';
      res.reason = 'd_i = ((σ + i)·r⁻¹) mod N ist affin und invertierbar.';
    } else if (up.includes('SECURE') || up.includes('SICHER')) {
      res.truth_value = 'UNDECIDABLE';
      res.reason = 'Sicherheit hängt von Entropie der Parameter (h,n,g,o,r) ab.';
    }
    return res;
  }
  // 6. Brute-force time
  m = up.match(/BRUTE[- ]?FORCE\s+(\d+)\s+BITS/);
  if (m) {
    const bits = parseInt(m[1]);
    res.truth_value = bits >= AXIOMS.SECURE_THRESHOLD ? 'TRUE' : 'FALSE';
    res.method = 'bruteforce_estimate';
    res.details = {
      gpu_time: formatYears(bruteForceTime(bits, AXIOMS.HASH_RATE_GPU)),
      global_time: formatYears(bruteForceTime(bits, AXIOMS.HASH_RATE_GLOBAL)),
      verdict: bits >= AXIOMS.SECURE_THRESHOLD ? 'SICHER' : 'UNSICHER',
    };
    return res;
  }
  // 7. Identity / equality
  if (/^([A-Z0-9_]+)\s*=\s*\1$/.test(up.trim())) {
    res.truth_value = 'TRUE';
    res.method = 'identity';
    return res;
  }
  // 8. Negation contradiction
  if (/^NOT\s*\(.+\)$/i.test(stmt) || /^!.+/.test(stmt)) {
    res.truth_value = 'UNDECIDABLE';
    res.method = 'negation_unresolved';
    return res;
  }
  res.method = 'no_matching_axiom';
  res.reason = 'Keine passende Krypto-Regel gefunden.';
  return res;
}

// Real CryptoForge: private key -> P2PKH address
function hash160(data: Uint8Array): Uint8Array {
  return ripemd160(sha256(data));
}
function b58check(payload: Uint8Array, version = 0x00): string {
  const full = new Uint8Array(payload.length + 1);
  full[0] = version;
  full.set(payload, 1);
  const checksum = sha256(sha256(full)).slice(0, 4);
  const data = new Uint8Array(full.length + 4);
  data.set(full);
  data.set(checksum, full.length);
  let num = 0n;
  for (const b of data) num = (num << 8n) | BigInt(b);
  let s = '';
  while (num > 0n) {
    const r = Number(num % 58n);
    num = num / 58n;
    s = BASE58[r] + s;
  }
  for (const b of data) {
    if (b === 0) s = BASE58[0] + s; else break;
  }
  return s;
}
function privToAddr(hex: string): { address: string; pubkey: string } {
  const clean = hex.replace(/^0x/, '').padStart(64, '0').toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(clean)) throw new Error('Ungültiger 64-Hex Schlüssel');
  const priv = new Uint8Array(32);
  for (let i = 0; i < 32; i++) priv[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  const pub = getPublicKey(priv, true);
  const h = hash160(pub);
  return { address: b58check(h, 0x00), pubkey: Array.from(pub).map(b => b.toString(16).padStart(2, '0')).join('') };
}

const DEFAULT_TESTS = [
  'HASH160 pre-image complexity >= 100 bits',
  'HASH160 pre-image complexity >= 200 bits',
  'SECP256K1 ECDLP COMPLEXITY >= 128 BITS',
  'SECP256K1 ECDLP COMPLEXITY >= 200 BITS',
  'Is SECP256K1 quantum-safe against Shor?',
  'Grover reduces HASH160 pre-image to 2^80 steps',
  'Address 1PWo3JeB9jrGwfHDNpdGK54CRas7fsVzXU: classical private key extraction possible?',
  'Linear derivation pipeline d_i = ((sigma + i)*r^{-1}) mod N is invertible',
  'The pipeline is secure',
  'Brute-force 64 bits',
  'Brute-force 128 bits',
  'A = A',
].join('\n');

const TruthIcon = ({ t }: { t: Truth }) =>
  t === 'TRUE' ? <CheckCircle2 className="w-3.5 h-3.5" />
  : t === 'FALSE' ? <XCircle className="w-3.5 h-3.5" />
  : <HelpCircle className="w-3.5 h-3.5" />;

const truthColor = (t: Truth) =>
  t === 'TRUE' ? 'bg-crypto-green/20 text-crypto-green border-crypto-green/40'
  : t === 'FALSE' ? 'bg-destructive/20 text-destructive border-destructive/40'
  : 'bg-crypto-gold/20 text-crypto-gold border-crypto-gold/40';

export function SVRCCrypto() {
  const [input, setInput] = useState(DEFAULT_TESTS);
  const [results, setResults] = useState<EvalResult[]>([]);
  const [privHex, setPrivHex] = useState('0000000000000000000000000000000000000000000000000000000000000001');
  const [forgeOut, setForgeOut] = useState<{ address: string; pubkey: string; error?: string } | null>(null);
  const [balance, setBalance] = useState<{ loading: boolean; sats?: number; txs?: number; error?: string } | null>(null);

  // Batch forge
  const [batchInput, setBatchInput] = useState('1\n2\n3\nabc\ndeadbeef');
  const [batchOut, setBatchOut] = useState<Array<{ key: string; address: string; error?: string }>>([]);

  // Puzzle scan
  const [scanStart, setScanStart] = useState('1');
  const [scanCount, setScanCount] = useState(16);
  const [scanRunning, setScanRunning] = useState(false);
  const [scanOut, setScanOut] = useState<Array<{ key: string; address: string; sats?: number }>>([]);

  const run = () => {
    const lines = input.split('\n').map(l => l.trim()).filter(Boolean);
    setResults(lines.map(evaluateCrypto));
  };

  const forge = () => {
    try { setForgeOut(privToAddr(privHex)); setBalance(null); }
    catch (e) { setForgeOut({ address: '', pubkey: '', error: (e as Error).message }); }
  };

  const checkBalance = async (addr: string) => {
    setBalance({ loading: true });
    try {
      const r = await fetch(`https://blockstream.info/api/address/${addr}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const sats = (j.chain_stats?.funded_txo_sum ?? 0) - (j.chain_stats?.spent_txo_sum ?? 0);
      const txs = (j.chain_stats?.tx_count ?? 0);
      setBalance({ loading: false, sats, txs });
    } catch (e) {
      setBalance({ loading: false, error: (e as Error).message });
    }
  };

  const runBatch = () => {
    const lines = batchInput.split('\n').map(l => l.trim()).filter(Boolean);
    const out = lines.map(k => {
      try {
        // Accept decimal or hex
        let hex = k;
        if (/^\d+$/.test(k)) hex = BigInt(k).toString(16);
        const r = privToAddr(hex);
        return { key: hex.padStart(64, '0'), address: r.address };
      } catch (e) {
        return { key: k, address: '', error: (e as Error).message };
      }
    });
    setBatchOut(out);
  };

  const runPuzzleScan = async () => {
    setScanRunning(true);
    setScanOut([]);
    const out: Array<{ key: string; address: string; sats?: number }> = [];
    let start: bigint;
    try {
      start = scanStart.startsWith('0x') ? BigInt(scanStart) :
              /^\d+$/.test(scanStart) ? BigInt(scanStart) :
              BigInt('0x' + scanStart);
    } catch {
      setScanRunning(false);
      return;
    }
    const n = Math.min(scanCount, 64);
    for (let i = 0; i < n; i++) {
      const k = (start + BigInt(i)).toString(16);
      try {
        const { address } = privToAddr(k);
        out.push({ key: k.padStart(64, '0'), address });
      } catch {}
      setScanOut([...out]);
    }
    // Optional: check balances (rate-limited, only first 10)
    for (let i = 0; i < Math.min(out.length, 10); i++) {
      try {
        const r = await fetch(`https://blockstream.info/api/address/${out[i].address}`);
        if (r.ok) {
          const j = await r.json();
          out[i].sats = (j.chain_stats?.funded_txo_sum ?? 0) - (j.chain_stats?.spent_txo_sum ?? 0);
          setScanOut([...out]);
        }
      } catch {}
      await new Promise(res => setTimeout(res, 150));
    }
    setScanRunning(false);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ timestamp: Date.now(), results }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `svrc-crypto-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const stats = useMemo(() => {
    const t = results.filter(r => r.truth_value === 'TRUE').length;
    const f = results.filter(r => r.truth_value === 'FALSE').length;
    const u = results.filter(r => r.truth_value === 'UNDECIDABLE').length;
    return { t, f, u };
  }, [results]);

  return (
    <Card className="border-crypto-purple/30 bg-card/50 backdrop-blur-sm overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-crypto-purple">
          <ShieldCheck className="w-5 h-5" />
          SVRC-Crypto — Self-Verifying Reality Compiler v2.0
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Deterministische Bewertung kryptographischer Aussagen + reale secp256k1 CryptoForge.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* CryptoForge */}
        <div className="border border-crypto-gold/30 bg-background/40 rounded p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-crypto-gold">
            <Key className="w-4 h-4" /> CryptoForge — Privat-Key → P2PKH-Adresse
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input value={privHex} onChange={e => setPrivHex(e.target.value)}
              className="font-mono text-xs bg-background/60 flex-1" placeholder="64-Hex Private Key" />
            <Button onClick={forge} size="sm" className="bg-crypto-gold/20 text-crypto-gold border border-crypto-gold/50 hover:bg-crypto-gold/30">
              Forge
            </Button>
          </div>
          {forgeOut && (
            <div className="text-[10px] font-mono space-y-1 break-all">
              {forgeOut.error ? (
                <div className="text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{forgeOut.error}</div>
              ) : (
                <>
                  <div><span className="text-muted-foreground">pubkey: </span><span className="text-crypto-blue">{forgeOut.pubkey}</span></div>
                  <div><span className="text-muted-foreground">address: </span><span className="text-crypto-green">{forgeOut.address}</span></div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button onClick={() => checkBalance(forgeOut.address)} size="sm"
                      className="h-6 text-[10px] bg-crypto-green/20 text-crypto-green border border-crypto-green/50 hover:bg-crypto-green/30">
                      <Wallet className="w-3 h-3 mr-1" /> Live-Balance prüfen
                    </Button>
                    {balance?.loading && <Loader2 className="w-3 h-3 animate-spin text-crypto-green" />}
                    {balance && !balance.loading && !balance.error && (
                      <span className="text-crypto-green">
                        {(balance.sats! / 1e8).toFixed(8)} BTC · {balance.txs} tx
                      </span>
                    )}
                    {balance?.error && <span className="text-destructive">{balance.error}</span>}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Batch Forge */}
        <div className="border border-crypto-blue/30 bg-background/40 rounded p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-crypto-blue">
            <Layers className="w-4 h-4" /> Batch-Forge — Mehrere Keys (dezimal oder hex)
          </div>
          <Textarea value={batchInput} onChange={e => setBatchInput(e.target.value)} rows={4}
            className="font-mono text-[11px] bg-background/60" placeholder="Ein Key pro Zeile" />
          <Button onClick={runBatch} size="sm"
            className="bg-crypto-blue/20 text-crypto-blue border border-crypto-blue/50 hover:bg-crypto-blue/30">
            <Play className="w-3 h-3 mr-1" /> Batch ausführen
          </Button>
          {batchOut.length > 0 && (
            <div className="text-[10px] font-mono space-y-1 max-h-48 overflow-auto">
              {batchOut.map((b, i) => (
                <div key={i} className="grid grid-cols-[auto_1fr] gap-2 border-b border-border/20 py-0.5">
                  <span className="text-crypto-purple">#{i}</span>
                  {b.error ? <span className="text-destructive break-all">{b.key}: {b.error}</span> :
                    <span className="break-all">
                      <span className="text-muted-foreground">{b.key.slice(0, 12)}…</span>
                      {' → '}
                      <span className="text-crypto-green">{b.address}</span>
                    </span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Puzzle Scan */}
        <div className="border border-crypto-red/30 bg-background/40 rounded p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-crypto-red">
            <Search className="w-4 h-4" /> Puzzle-Scan — sequentielle Key-Range (mit Balance der ersten 10)
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input value={scanStart} onChange={e => setScanStart(e.target.value)}
              className="font-mono text-xs bg-background/60 flex-1" placeholder="Start (dezimal oder hex)" />
            <Input type="number" value={scanCount} min={1} max={64}
              onChange={e => setScanCount(parseInt(e.target.value) || 1)}
              className="font-mono text-xs bg-background/60 sm:w-24" />
            <Button onClick={runPuzzleScan} disabled={scanRunning} size="sm"
              className="bg-crypto-red/20 text-crypto-red border border-crypto-red/50 hover:bg-crypto-red/30">
              {scanRunning ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Play className="w-3 h-3 mr-1" />}
              Scan
            </Button>
          </div>
          {scanOut.length > 0 && (
            <div className="text-[10px] font-mono space-y-1 max-h-60 overflow-auto">
              {scanOut.map((s, i) => (
                <div key={i} className="grid grid-cols-[auto_1fr_auto] gap-2 items-center border-b border-border/20 py-0.5">
                  <span className="text-crypto-purple">k={s.key.replace(/^0+/, '') || '0'}</span>
                  <span className="text-crypto-green break-all">{s.address}</span>
                  <span className={s.sats && s.sats > 0 ? 'text-crypto-gold font-bold' : 'text-muted-foreground'}>
                    {s.sats === undefined ? '—' : (s.sats / 1e8).toFixed(8)}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Statements */}
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={10}
          className="font-mono text-xs bg-background/40 border-border/50"
          placeholder="Eine Aussage pro Zeile..."
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={run} className="bg-crypto-purple hover:bg-crypto-purple/80">
            <Play className="w-4 h-4 mr-2" /> Evaluieren
          </Button>
          {results.length > 0 && (
            <Button onClick={exportJSON} variant="outline" className="border-crypto-purple/40">
              <Download className="w-4 h-4 mr-2" /> Export JSON
            </Button>
          )}
        </div>

        {results.length > 0 && (
          <>
            <div className="flex gap-2 text-xs">
              <Badge className="bg-crypto-green/20 text-crypto-green border-crypto-green/40 border">TRUE: {stats.t}</Badge>
              <Badge className="bg-destructive/20 text-destructive border-destructive/40 border">FALSE: {stats.f}</Badge>
              <Badge className="bg-crypto-gold/20 text-crypto-gold border-crypto-gold/40 border">UNDECIDABLE: {stats.u}</Badge>
            </div>
            <div className="space-y-2">
              {results.map((r, i) => (
                <div key={i} className="border border-crypto-purple/20 bg-background/40 rounded p-2.5 space-y-1.5">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <code className="text-xs text-foreground break-all flex-1 min-w-0">{r.input}</code>
                    <Badge className={`${truthColor(r.truth_value)} border text-xs flex-shrink-0 flex items-center gap-1`}>
                      <TruthIcon t={r.truth_value} /> {r.truth_value}
                    </Badge>
                  </div>
                  <div className="text-[10px] text-muted-foreground break-words">
                    <span className="text-crypto-blue">{r.method}</span>
                    {r.reason && ` — ${r.reason}`}
                  </div>
                  {r.details && (
                    <div className="text-[10px] font-mono text-muted-foreground/80 break-words space-y-0.5 pl-2 border-l-2 border-crypto-purple/30">
                      {Object.entries(r.details).map(([k, v]) => (
                        <div key={k}><span className="text-crypto-purple">{k}:</span> {String(v)}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}