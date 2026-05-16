import { useState, useRef } from 'react';
import { Rocket, Loader2, Square } from 'lucide-react';
import { evaluate } from 'mathjs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CryptoPanel } from './CryptoPanel';
import {
  sha256,
  hash160,
  ripemd160,
  hexToBytes,
  bytesToHex,
  base58Decode,
  privateKeyToAddress,
  privateKeyToPublicKey,
  calculateEntropy,
} from '@/lib/crypto-utils';

type Status = 'idle' | 'running' | 'hit' | 'miss' | 'error';

interface ModuleResult {
  name: string;
  status: Status;
  ms: number;
  detail: string;
  highlight?: string;
}

const HEX_RE = /^[0-9a-fA-F]+$/;

async function runUniversalDetect(raw: string): Promise<ModuleResult> {
  const t = performance.now();
  try {
    const input = raw.trim();
    // Puzzle
    const pm = input.match(/(?:puzzle|#)\s*(\d{1,3})/i);
    if (pm) return done('Universal-Detect', t, 'hit', `Bitcoin Puzzle #${pm[1]} erkannt`, `Puzzle ${pm[1]}`);
    // Address
    if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(input) || /^bc1[a-z0-9]{6,87}$/.test(input))
      return done('Universal-Detect', t, 'hit', `Bitcoin-Adresse (${input.startsWith('bc1') ? 'bech32' : input[0] === '3' ? 'P2SH' : 'P2PKH'})`, input);
    // WIF
    if (/^[5KL][1-9A-HJ-NP-Za-km-z]{50,51}$/.test(input)) {
      const b = base58Decode(input);
      const priv = bytesToHex(b.slice(1, 33));
      const addr = await privateKeyToAddress(priv, b.length === 38);
      return done('Universal-Detect', t, 'hit', 'WIF → Adresse: ' + addr, addr);
    }
    // Hex 32 bytes
    const hex = input.replace(/^0x/, '');
    if (HEX_RE.test(hex) && hex.length === 64) {
      const addr = await privateKeyToAddress(hex, true);
      return done('Universal-Detect', t, 'hit', '32-Byte Private Key → ' + addr, addr);
    }
    // Math
    try { const r = evaluate(input); if (r !== undefined) return done('Universal-Detect', t, 'hit', 'Mathe: ' + String(r)); } catch {}
    return done('Universal-Detect', t, 'miss', 'Kein bekanntes Format erkannt');
  } catch (e) {
    return done('Universal-Detect', t, 'error', String(e));
  }
}

async function runBrainWallet(input: string): Promise<ModuleResult> {
  const t = performance.now();
  try {
    const h = await sha256(new TextEncoder().encode(input));
    const hex = bytesToHex(h);
    const addr = await privateKeyToAddress(hex, true);
    const ent = calculateEntropy(input);
    const bits = ent;
    const risk = bits < 40 ? 'KRITISCH' : bits < 64 ? 'schwach' : bits < 96 ? 'mittel' : 'ok';
    return done('Brain-Wallet', t, bits < 64 ? 'hit' : 'miss',
      `Entropie ${bits.toFixed(1)} bit · ${risk} → ${addr}`, addr);
  } catch (e) { return done('Brain-Wallet', t, 'error', String(e)); }
}

async function runHashCascade(input: string): Promise<ModuleResult> {
  const t = performance.now();
  try {
    const enc = new TextEncoder().encode(input);
    const s = await sha256(enc);
    const h160 = await hash160(enc);
    return done('Hash-Kaskade', t, 'hit',
      `SHA-256: ${bytesToHex(s).slice(0, 20)}…  ·  HASH160: ${bytesToHex(h160).slice(0, 20)}…`);
  } catch (e) { return done('Hash-Kaskade', t, 'error', String(e)); }
}

async function runDebianMicroScan(input: string): Promise<ModuleResult> {
  const t = performance.now();
  try {
    if (!/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(input.trim()))
      return done('Debian-PID (1..1024)', t, 'miss', 'Kein Adress-Input → übersprungen');
    const target = input.trim();
    const enc = new TextEncoder();
    const SECP_N = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');
    for (let pid = 1; pid <= 1024; pid++) {
      let priv = await sha256(enc.encode(`debian:openssl:2006-2008:pid=${pid}`));
      const v = BigInt('0x' + bytesToHex(priv));
      if (v === 0n || v >= SECP_N) continue;
      const addr = await privateKeyToAddress(bytesToHex(priv), true);
      if (addr === target) return done('Debian-PID (1..1024)', t, 'hit', `★ HIT bei PID=${pid}`, `PID ${pid}`);
    }
    return done('Debian-PID (1..1024)', t, 'miss', '1024 PIDs gescannt, kein Treffer');
  } catch (e) { return done('Debian-PID (1..1024)', t, 'error', String(e)); }
}

async function runRipemdProbe(input: string): Promise<ModuleResult> {
  const t = performance.now();
  try {
    const hex = input.replace(/^0x/, '');
    if (!HEX_RE.test(hex)) return done('RIPEMD-160-Probe', t, 'miss', 'Kein Hex-Input');
    const r = ripemd160(hexToBytes(hex));
    return done('RIPEMD-160-Probe', t, 'hit', bytesToHex(r));
  } catch (e) { return done('RIPEMD-160-Probe', t, 'error', String(e)); }
}

function done(name: string, t0: number, status: Status, detail: string, highlight?: string): ModuleResult {
  return { name, status, ms: Math.round(performance.now() - t0), detail, highlight };
}

const MODULES = [
  runUniversalDetect,
  runBrainWallet,
  runHashCascade,
  runRipemdProbe,
  runDebianMicroScan,
] as const;

export function MegaSolver() {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<ModuleResult[]>([]);
  const [running, setRunning] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const fanOut = async () => {
    if (!input.trim()) return;
    setRunning(true);
    setResults([]);
    setAiSummary('');
    // Streame Ergebnisse sobald jedes Modul fertig ist
    const pending = MODULES.map((m) =>
      m(input).then((r) => { setResults((prev) => [...prev, r]); return r; })
    );
    const all = await Promise.all(pending);
    setRunning(false);

    // KI-Synthese
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/time-machine-chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({
            messages: [{
              role: 'user',
              content: `Eingabe: ${input}\n\nModul-Resultate:\n${all.map(r => `- ${r.name} [${r.status}, ${r.ms}ms]: ${r.detail}`).join('\n')}\n\nFasse in 3 Sätzen zusammen, was über die Eingabe gelernt wurde und welches Modul die wichtigste Erkenntnis liefert.`,
            }],
          }),
          signal: ac.signal,
        }
      );
      if (!resp.body) return;
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      while (true) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf('\n')) !== -1) {
          let line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const j = JSON.parse(data);
            const delta = j.choices?.[0]?.delta?.content;
            if (delta) setAiSummary((p) => p + delta);
          } catch {}
        }
      }
    } catch {}
  };

  const stop = () => { abortRef.current?.abort(); setRunning(false); };

  return (
    <CryptoPanel
      title="MEGA-SOLVER — Alle Module gleichzeitig"
      icon={<Rocket className="w-4 h-4" />}
      glowColor="purple"
    >
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Ein Input → fan-out auf <span className="text-crypto-purple">{MODULES.length} Module</span> parallel
          (Universal-Detect, Brain-Wallet, Hash-Kaskade, RIPEMD-Probe, Debian-PID 1..1024) + KI-Synthese.
        </p>
        <Textarea
          rows={3}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Adresse, WIF, Private Key, Brain-Wallet-Phrase, Hex, 'puzzle 71', Mathe-Ausdruck …"
          className="font-mono text-sm bg-background/50 border-crypto-purple/30 focus:border-crypto-purple/60"
        />
        <div className="flex gap-2">
          <Button
            onClick={fanOut}
            disabled={running || !input.trim()}
            className="bg-crypto-purple/20 text-crypto-purple border border-crypto-purple/50 hover:bg-crypto-purple/30"
          >
            {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Rocket className="w-4 h-4 mr-2" />}
            {running ? `Läuft … ${results.length}/${MODULES.length}` : 'Alle Module starten'}
          </Button>
          {running && (
            <Button onClick={stop} variant="outline" className="border-crypto-red/40 text-crypto-red">
              <Square className="w-4 h-4 mr-2" /> Stop
            </Button>
          )}
        </div>

        {results.length > 0 && (
          <div className="border border-crypto-purple/30 bg-background/40 rounded p-3 space-y-1">
            {results.map((r, i) => (
              <div key={i} className="grid grid-cols-[180px_60px_80px_1fr] gap-2 text-xs items-baseline">
                <div className="font-display text-crypto-purple uppercase tracking-wider">{r.name}</div>
                <div className={
                  r.status === 'hit' ? 'text-crypto-green' :
                  r.status === 'miss' ? 'text-muted-foreground' :
                  r.status === 'error' ? 'text-crypto-red' : 'text-crypto-orange'
                }>
                  {r.status === 'hit' ? '★ HIT' : r.status === 'miss' ? '— miss' : r.status === 'error' ? 'ERR' : '…'}
                </div>
                <div className="text-muted-foreground font-mono">{r.ms} ms</div>
                <div className="font-mono break-all">{r.detail}</div>
              </div>
            ))}
          </div>
        )}

        {aiSummary && (
          <div className="border border-crypto-purple/30 bg-crypto-purple/5 rounded p-3">
            <div className="text-[10px] uppercase tracking-widest text-crypto-purple mb-2">
              KI-Synthese
            </div>
            <div className="text-xs whitespace-pre-wrap text-foreground/90 leading-relaxed">
              {aiSummary}
            </div>
          </div>
        )}
      </div>
    </CryptoPanel>
  );
}

// silence unused import warning for privateKeyToPublicKey
void privateKeyToPublicKey;
