import { useState, useRef } from 'react';
import { Sparkles, Loader2, Send, Brain } from 'lucide-react';
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
          { label: 'Status', value: n <= 70 ? 'Bereits gelöst' : 'OFFEN — Ziel des Schwarms' },
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
  const abortRef = useRef<AbortController | null>(null);

  async function handleCompute() {
    setError('');
    setResult(null);
    setAiAnswer('');
    if (!input.trim()) return;
    setLoading(true);
    try {
      const r = await detectAndCompute(input);
      setResult(r);
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
          placeholder="z.B.  sin(pi/4)^2 + cos(pi/4)^2   ·   0xdeadbeef   ·   1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa   ·   puzzle 71   ·   Was ist die Lyapunov-Exponent des Lorenz-Systems?"
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
