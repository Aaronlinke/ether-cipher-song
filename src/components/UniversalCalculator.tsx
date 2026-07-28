import { useState, useRef, useEffect } from 'react';
import { emit, usePipelineTarget } from '@/lib/pipeline-bus';
import { Sparkles, Loader2, Send, Brain, Wallet } from 'lucide-react';
import { evaluate } from 'mathjs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CryptoPanel } from './CryptoPanel';
import {
  sha256,
  ripemd160,
  hash160,
  privateKeyToPublicKey,
  privateKeyToAddress,
  hexToBytes,
  bytesToHex,
  base58Decode,
  base58Encode,
  calculateEntropy,
} from '@/lib/crypto-utils';

interface ResultLine {
  label: string;
  value: string;
  mono?: boolean;
}

const HEX_RE = /^[0-9a-fA-F]+$/;

// AKTUELL OFFENE Bitcoin-Puzzle (Stand 2026). 
// Puzzles #1–#70 sind gelöst; #68 fiel zuletzt am 7. April.
// Ab #71 sind die Adressen noch ungelöst — aktuelles Schwarm-Ziel.
const OPEN_PUZZLE_ADDRESSES: Record<string, number> = {
  '1PWo3JeB9jrGwfHDNpdGK54CRas7fsVzXU': 71,
  '1JTK7s9YVYywfm5XUH7RNhHJH1LshCaRFR': 72,
  '12VVRNPi4SJqUTsp6FmqDqY5sGosDtysn4': 73,
  '1FWGcVDK3JGzCC3WtkYetULPszMaK2Jksv': 74,
  '1J36UjUByGroXcCvmj13U6uwaVv9caEeAt': 75,
  '1DJh2eHFYQfACPmrvpyWc8MSTYKh7w9eRF': 76,
  '1Bxk4CQdqL9p22JEtDfdXMsng1XacifUtE': 77,
  '15qF6X51huDjqTmF9BJgxXdt1xcj46Jmhb': 78,
  '1ARk8HWJMn8js8tQmGUJeQHjSE7KRkn2t8': 79,
  '1BCf6rHUW6m3iH2ptsvnjgLruAiPQQepLe': 80,
};

async function detectAndCompute(raw: string): Promise<{ kind: string; lines: ResultLine[] } | null> {
  const input = raw.trim();
  if (!input) return null;

  // Bitcoin Puzzle reference
  const puzzleMatch = input.match(/(?:puzzle|#)\s*(\d{1,3})/i);
  if (puzzleMatch) {
    const n = parseInt(puzzleMatch[1], 10);
    if (n >= 1 && n <= 256) {
      const min = 1n << BigInt(n - 1);
      const max = (1n << BigInt(n)) - 1n;
      const span = max - min + 1n;
      return {
        kind: `Bitcoin Puzzle #${n}`,
        lines: [
          { label: 'Bit-Bereich', value: `2^${n - 1} … 2^${n} − 1` },
          { label: 'Min (hex)', value: '0x' + min.toString(16), mono: true },
          { label: 'Max (hex)', value: '0x' + max.toString(16), mono: true },
          { label: 'Suchraum', value: span.toString() },
          { label: 'Status', value: n <= 71 ? 'Bereits gelöst (zuletzt #71, April 2024)' : 'OFFEN — Ziel des Schwarms (ab #72)' },
        ],
      };
    }
  }

  // Bitcoin Address detection
  if (/^(1|3)[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(input) || /^bc1[a-z0-9]{6,87}$/.test(input)) {
    const lines: ResultLine[] = [
      { label: 'Typ', value: input.startsWith('bc1') ? 'SegWit (bech32)' : input.startsWith('3') ? 'P2SH' : 'P2PKH (Legacy)' },
      { label: 'Länge', value: `${input.length} Zeichen` },
    ];
    if (!input.startsWith('bc1')) {
      try {
        const decoded = base58Decode(input);
        lines.push({ label: 'Hex (mit Checksum)', value: bytesToHex(decoded), mono: true });
        lines.push({ label: 'Hash160', value: bytesToHex(decoded.slice(1, 21)), mono: true });
      } catch {}
    }
    return { kind: 'Bitcoin-Adresse', lines };
  }

  // Extended Key (xpub/xprv/ypub/zpub)
  if (/^(xpub|xprv|ypub|yprv|zpub|zprv)[1-9A-HJ-NP-Za-km-z]{100,112}$/.test(input)) {
    const kind = input.startsWith('xprv') || input.startsWith('yprv') || input.startsWith('zprv')
      ? 'Extended PRIVATE Key' : 'Extended Public Key';
    const lines: ResultLine[] = [
      { label: 'Typ', value: kind },
      { label: 'Prefix', value: input.slice(0, 4) },
      { label: 'Standard', value: input.startsWith('x') ? 'BIP32 (P2PKH)' : input.startsWith('y') ? 'BIP49 (P2SH-Wrapped SegWit)' : 'BIP84 (Native SegWit)' },
    ];
    try {
      const dec = base58Decode(input);
      if (dec.length === 82) {
        lines.push(
          { label: 'Depth', value: String(dec[4]) },
          { label: 'Fingerprint', value: bytesToHex(dec.slice(5, 9)), mono: true },
          { label: 'Child Index', value: String(new DataView(dec.buffer, dec.byteOffset + 9, 4).getUint32(0)) },
          { label: 'Chain Code', value: bytesToHex(dec.slice(13, 45)), mono: true },
          { label: 'Key Material', value: bytesToHex(dec.slice(45, 78)), mono: true },
        );
      }
    } catch {}
    return { kind, lines };
  }

  // Base64 (likely signature / DER / certificate)
  if (/^[A-Za-z0-9+/]{16,}={0,2}$/.test(input) && input.length % 4 === 0) {
    try {
      const bin = atob(input);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const lines: ResultLine[] = [
        { label: 'Base64 → Bytes', value: String(bytes.length) },
        { label: 'Hex', value: bytesToHex(bytes), mono: true },
      ];
      if (bytes[0] === 0x30) {
        lines.push({ label: 'ASN.1/DER', value: `Sequence, Länge ${bytes[1]} Bytes` });
        if (bytes.length >= 64 && bytes.length <= 72) {
          lines.push({ label: 'Format', value: 'wahrscheinlich ECDSA-Signatur (r,s)' });
        }
      }
      return { kind: 'Base64-Eingabe', lines };
    } catch {}
  }

  // WIF detection
  if (/^[5KL][1-9A-HJ-NP-Za-km-z]{50,51}$/.test(input)) {
    try {
      const bytes = base58Decode(input);
      const compressed = bytes.length === 38;
      const priv = bytesToHex(bytes.slice(1, 33));
      const addr = await privateKeyToAddress(priv, compressed);
      return {
        kind: 'WIF Private Key',
        lines: [
          { label: 'Komprimiert', value: compressed ? 'Ja' : 'Nein' },
          { label: 'Private Key (hex)', value: priv, mono: true },
          { label: 'Bitcoin-Adresse', value: addr, mono: true },
        ],
      };
    } catch (e) {
      return { kind: 'WIF Decode-Fehler', lines: [{ label: 'Fehler', value: String(e) }] };
    }
  }

  // Pure hex
  const hexClean = input.replace(/^0x/, '').replace(/\s/g, '');
  if (HEX_RE.test(hexClean) && hexClean.length % 2 === 0 && hexClean.length >= 2) {
    const bytes = hexToBytes(hexClean);
    const sha = await sha256(bytes);
    const lines: ResultLine[] = [
      { label: 'Bytes', value: String(bytes.length) },
      { label: 'BigInt', value: BigInt('0x' + hexClean).toString() },
      { label: 'SHA-256', value: bytesToHex(sha), mono: true },
      { label: 'RIPEMD-160', value: bytesToHex(ripemd160(bytes)), mono: true },
      { label: 'Hash160', value: bytesToHex(await hash160(bytes)), mono: true },
    ];
    // 32-byte → treat as private key
    if (hexClean.length === 64) {
      try {
        const pubC = privateKeyToPublicKey(hexClean, true);
        const pubU = privateKeyToPublicKey(hexClean, false);
        const addrC = await privateKeyToAddress(hexClean, true);
        const addrU = await privateKeyToAddress(hexClean, false);
        // WIF
        const wifPayload = new Uint8Array([0x80, ...bytes, 0x01]);
        const cs = (await sha256(await sha256(wifPayload))).slice(0, 4);
        const wif = base58Encode(new Uint8Array([...wifPayload, ...cs]));
        lines.push(
          { label: 'Public Key (komprimiert)', value: pubC, mono: true },
          { label: 'Public Key (unkomprimiert)', value: pubU, mono: true },
          { label: 'Adresse (komprimiert)', value: addrC, mono: true },
          { label: 'Adresse (unkomprimiert)', value: addrU, mono: true },
          { label: 'WIF', value: wif, mono: true },
        );
        const hitC = OPEN_PUZZLE_ADDRESSES[addrC];
        const hitU = OPEN_PUZZLE_ADDRESSES[addrU];
        if (hitC || hitU) {
          lines.push({
            label: '🏆 JACKPOT',
            value: `Adresse entspricht OFFENEM Bitcoin-Puzzle #${hitC ?? hitU} — Schlüssel sofort sichern!`,
          });
        }
        return { kind: '32-Byte Hex → Private Key', lines };
      } catch {}
    }
    return { kind: `Hex (${hexClean.length / 2} Bytes)`, lines };
  }

  // Math expression — try mathjs
  try {
    const result = evaluate(input);
    if (result !== undefined && result !== null) {
      const str = typeof result === 'object' ? JSON.stringify(result) : String(result);
      return {
        kind: 'Mathematischer Ausdruck',
        lines: [
          { label: 'Eingabe', value: input, mono: true },
          { label: 'Ergebnis', value: str, mono: true },
        ],
      };
    }
  } catch {}

  // Word count → maybe BIP39 mnemonic
  const words = input.split(/\s+/).filter(Boolean);
  if ([12, 15, 18, 21, 24].includes(words.length) && words.every(w => /^[a-z]+$/.test(w))) {
    return {
      kind: 'BIP39-Mnemonic (möglich)',
      lines: [
        { label: 'Wortanzahl', value: String(words.length) },
        { label: 'Erwartete Entropy', value: `${(words.length * 32) / 3} Bit` },
        { label: 'Hinweis', value: 'Verwende den BIP39-Generator für vollständige Ableitung.' },
      ],
    };
  }

  // Fallback: treat as text — entropy + sha256
  const ent = calculateEntropy(input);
  const sha = await sha256(input);
  return {
    kind: 'Text / Brain Wallet',
    lines: [
      { label: 'Länge', value: `${input.length} Zeichen` },
      { label: 'Shannon-Entropy', value: `${ent.toFixed(3)} bits/char` },
      { label: 'Geschätzte Bits', value: `${(ent * input.length).toFixed(1)} bit` },
      { label: 'SHA-256 (Brain Wallet Key)', value: bytesToHex(sha), mono: true },
    ],
  };
}

export function UniversalCalculator() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{ kind: string; lines: ResultLine[] } | null>(null);
  const [aiAnswer, setAiAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');
  const [balance, setBalance] = useState<null | { sat: number; txs: number; lastSeen?: string }>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Pipeline: receive payloads addressed to `universal`
  usePipelineTarget('universal', (p) => {
    setInput(p.value);
  });
  const abortRef = useRef<AbortController | null>(null);

  // Auto-fetch balance when the detected kind is an address
  useEffect(() => {
    if (!result || result.kind !== 'Bitcoin-Adresse') { setBalance(null); return; }
    const addr = input.trim();
    if (!addr) return;
    setBalance(null);
    setBalanceLoading(true);
    fetch(`https://blockchain.info/rawaddr/${addr}?limit=3&cors=true`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error('rate-limited')))
      .then((j: { final_balance: number; n_tx: number; txs?: { time: number }[] }) => {
        const last = j.txs?.[0]?.time;
        setBalance({
          sat: j.final_balance,
          txs: j.n_tx,
          lastSeen: last ? new Date(last * 1000).toISOString().slice(0, 10) : undefined,
        });
      })
      .catch(() => setBalance(null))
      .finally(() => setBalanceLoading(false));
  }, [result, input]);

  async function handleCompute() {
    setError('');
    setResult(null);
    setAiAnswer('');
    setBalance(null);
    if (!input.trim()) return;
    setLoading(true);
    try {
      const r = await detectAndCompute(input);
      setResult(r);
      // Broadcast the detected result kind to the pipeline bus
      const first = r.lines?.find(l => l.value)?.value ?? input;
      const kind = r.kind.includes('address') ? 'address'
        : r.kind.includes('key') || r.kind.includes('wif') ? 'key'
        : r.kind.includes('hex') ? 'hex'
        : r.kind.includes('mnemonic') ? 'mnemonic'
        : 'text';
      emit({ kind: kind as any, value: String(first), source: `Universal:${r.kind}`, target: 'any' });
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleAskAI() {
    if (!input.trim()) return;
    setAiAnswer('');
    setAiLoading(true);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/time-machine-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [
              {
                role: 'user',
                content:
                  'Beantworte präzise und rechne wenn möglich numerisch durch. Anfrage:\n\n' +
                  input,
              },
            ],
          }),
          signal: ac.signal,
        }
      );
      if (!resp.ok || !resp.body) throw new Error('AI nicht erreichbar');
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf('\n')) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const j = JSON.parse(data);
            const delta = j.choices?.[0]?.delta?.content;
            if (delta) setAiAnswer(prev => prev + delta);
          } catch {}
        }
      }
    } catch (e: unknown) {
      const err = e as { name?: string };
      if (err?.name !== 'AbortError') setError('AI-Antwort fehlgeschlagen.');
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <CryptoPanel
      title="Omni-Rechner — Alles in einem"
      icon={<Sparkles className="w-4 h-4" />}
      glowColor="gold"
    >
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Gib alles ein: Mathematischer Ausdruck, Hex-Zahl, Private Key, Bitcoin-Adresse, WIF,
          BIP39-Wörter, "Puzzle 71", Brain-Wallet-Phrase oder eine Frage in natürlicher Sprache.
        </p>

        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="z.B.  sin(pi/4)^2 + cos(pi/4)^2   ·   0xdeadbeef   ·   1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa   ·   puzzle 72   ·   Was ist die Lyapunov-Exponent des Lorenz-Systems?"
          rows={4}
          className="font-mono text-sm bg-background/50 border-crypto-gold/30 focus:border-crypto-gold/60"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleCompute();
          }}
        />

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleCompute}
            disabled={loading || !input.trim()}
            className="bg-crypto-gold/20 text-crypto-gold border border-crypto-gold/50 hover:bg-crypto-gold/30"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Auto-Erkennen & Rechnen
          </Button>
          <Button
            onClick={handleAskAI}
            disabled={aiLoading || !input.trim()}
            variant="outline"
            className="border-crypto-purple/50 text-crypto-purple hover:bg-crypto-purple/10"
          >
            {aiLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
            Omni-Genesis KI fragen
          </Button>
          <Button
            onClick={() => { setInput(''); setResult(null); setAiAnswer(''); setError(''); }}
            variant="ghost"
            className="text-muted-foreground"
          >
            Leeren
          </Button>
        </div>

        {error && (
          <div className="text-xs text-crypto-red border border-crypto-red/30 bg-crypto-red/5 rounded p-3">
            {error}
          </div>
        )}

        {result && (
          <div className="border border-crypto-gold/30 bg-background/40 rounded p-3 space-y-2">
            <div className="text-[10px] uppercase tracking-widest text-crypto-gold">
              Erkannt: {result.kind}
            </div>
            <div className="space-y-1">
              {result.lines.map((l, i) => (
                <div key={i} className="grid grid-cols-[160px_1fr] gap-2 text-xs">
                  <div className="text-muted-foreground">{l.label}</div>
                  <div className={l.mono ? 'font-mono break-all text-crypto-green' : 'break-all'}>
                    {l.value}
                  </div>
                </div>
              ))}
            </div>
            {(balanceLoading || balance) && (
              <div className="mt-2 pt-2 border-t border-crypto-gold/20">
                <div className="text-[10px] uppercase tracking-widest text-crypto-blue mb-1 flex items-center gap-1">
                  <Wallet className="w-3 h-3" /> Live-Blockchain
                </div>
                {balanceLoading && <div className="text-xs text-muted-foreground">Lade Balance …</div>}
                {balance && (
                  <div className="grid grid-cols-[160px_1fr] gap-2 text-xs">
                    <div className="text-muted-foreground">Balance</div>
                    <div className="font-mono text-crypto-gold">
                      {(balance.sat / 1e8).toFixed(8)} BTC <span className="text-muted-foreground">({balance.sat.toLocaleString()} sat)</span>
                    </div>
                    <div className="text-muted-foreground">Transaktionen</div>
                    <div className="font-mono text-crypto-green">{balance.txs.toLocaleString()}</div>
                    {balance.lastSeen && (<>
                      <div className="text-muted-foreground">Letzte Tx</div>
                      <div className="font-mono">{balance.lastSeen}</div>
                    </>)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {aiAnswer && (
          <div className="border border-crypto-purple/30 bg-crypto-purple/5 rounded p-3">
            <div className="text-[10px] uppercase tracking-widest text-crypto-purple mb-2">
              Omni-Genesis KI
            </div>
            <div className="text-xs whitespace-pre-wrap text-foreground/90 leading-relaxed">
              {aiAnswer}
            </div>
          </div>
        )}
      </div>
    </CryptoPanel>
  );
}
