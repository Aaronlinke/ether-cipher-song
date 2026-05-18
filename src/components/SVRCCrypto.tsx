import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Play } from 'lucide-react';

// ============ CryptoAxioms ============
const AXIOMS = {
  SHA256_PREIMAGE_BITS: 256,
  RIPEMD160_PREIMAGE_BITS: 160,
  HASH160_PREIMAGE_BITS: 160,
  SECP256K1_ECDLP_BITS: 128,
  GROVER_SPEEDUP: 0.5,
  SECURE_THRESHOLD: 100,
};

type Truth = 'TRUE' | 'FALSE' | 'UNDECIDABLE';

interface EvalResult {
  input: string;
  truth_value: Truth;
  method: string;
  reason?: string;
  real_bits?: number;
  grover_bits?: number;
}

function preimageBits(name: string): number {
  const n = name.toUpperCase();
  if (n === 'SHA256' || n === 'SHA-256') return AXIOMS.SHA256_PREIMAGE_BITS;
  if (n === 'RIPEMD160' || n === 'RIPEMD-160') return AXIOMS.RIPEMD160_PREIMAGE_BITS;
  if (n === 'HASH160') return AXIOMS.HASH160_PREIMAGE_BITS;
  return -1;
}

function evaluateCrypto(statement: string): EvalResult {
  const stmt = statement.trim();
  const up = stmt.toUpperCase();
  const res: EvalResult = { input: stmt, truth_value: 'UNDECIDABLE', method: 'crypto_analysis' };

  // 1. Pre-image
  let m = up.match(/(HASH160|SHA256|RIPEMD160)\s+PRE-IMAGE\s+COMPLEXITY\s*>=\s*(\d+)\s+BITS/);
  if (m) {
    const real = preimageBits(m[1]);
    const claim = parseInt(m[2]);
    res.truth_value = real >= claim ? 'TRUE' : 'FALSE';
    res.real_bits = real;
    return res;
  }
  // 2. ECDLP
  m = up.match(/SECP256K1\s+ECDLP\s+COMPLEXITY\s*>=\s*(\d+)\s+BITS/);
  if (m) {
    const claim = parseInt(m[1]);
    res.truth_value = AXIOMS.SECP256K1_ECDLP_BITS >= claim ? 'TRUE' : 'FALSE';
    res.real_bits = AXIOMS.SECP256K1_ECDLP_BITS;
    return res;
  }
  // 3. Shor / Quantum
  if (up.includes('SHOR') && up.includes('SECP256K1')) {
    if (up.includes('QUANTUM-SAFE') || up.includes('QUANTUM RESISTANT') || up.includes('QUANTEN-SICHER')) {
      res.truth_value = 'FALSE';
      res.reason = "Shor's algorithm breaks ECDLP in polynomial time.";
    }
    return res;
  }
  if (up.includes('GROVER') && up.includes('HASH160')) {
    const g = Math.floor(AXIOMS.HASH160_PREIMAGE_BITS * AXIOMS.GROVER_SPEEDUP);
    const target = up.match(/2\^(\d+)/);
    res.grover_bits = g;
    res.truth_value = target && parseInt(target[1]) === g ? 'TRUE' : 'FALSE';
    return res;
  }
  // 4. Bitcoin Address
  m = stmt.match(/Address\s+([13][a-km-zA-HJ-NP-Z1-9]{25,34})/i);
  if (m) {
    if (up.includes('POSSIBLE') || up.includes('FIND PRIVATE KEY') || up.includes('EXTRACTION')) {
      if (up.includes('QUANTUM') || up.includes('QUANTEN')) {
        res.truth_value = 'UNDECIDABLE';
        res.reason = 'Grover reduces to 2^80 steps — theoretically possible, not practical.';
      } else {
        res.truth_value = 'FALSE';
        res.reason = 'Classical pre-image attack requires 2^160 operations — impossible.';
      }
    }
    return res;
  }
  // 5. Linear Derivation Pipeline
  if (up.includes('LINEAR DERIVATION') || up.includes('PIPELINE')) {
    if (up.includes('INVERTIBLE')) {
      res.truth_value = 'TRUE';
      res.reason = 'd_i = ((sigma + i)*r^{-1}) mod N is affine and invertible.';
    } else if (up.includes('SECURE')) {
      res.truth_value = 'UNDECIDABLE';
      res.reason = 'Security depends on unknown parameters (h,n,g,o,r).';
    }
    return res;
  }
  // 6. Identity
  if (/^([A-Z0-9_]+)\s*=\s*\1$/.test(up.trim())) {
    res.truth_value = 'TRUE';
    res.method = 'identity';
    return res;
  }
  res.method = 'svrc_fallback';
  return res;
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
  'A = A',
].join('\n');

const truthColor = (t: Truth) =>
  t === 'TRUE' ? 'bg-crypto-green/20 text-crypto-green border-crypto-green/40'
  : t === 'FALSE' ? 'bg-destructive/20 text-destructive border-destructive/40'
  : 'bg-crypto-gold/20 text-crypto-gold border-crypto-gold/40';

export function SVRCCrypto() {
  const [input, setInput] = useState(DEFAULT_TESTS);
  const [results, setResults] = useState<EvalResult[]>([]);

  const run = () => {
    const lines = input.split('\n').map(l => l.trim()).filter(Boolean);
    setResults(lines.map(evaluateCrypto));
  };

  return (
    <Card className="border-crypto-purple/30 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-crypto-purple">
          <ShieldCheck className="w-5 h-5" />
          SVRC-Crypto — Self-Verifying Reality Compiler
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Bewertet kryptographische Aussagen deterministisch (Pre-image, ECDLP, Quanten, Pipeline).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={8}
          className="font-mono text-xs bg-background/40 border-border/50"
          placeholder="Eine Aussage pro Zeile..."
        />
        <Button onClick={run} className="bg-crypto-purple hover:bg-crypto-purple/80">
          <Play className="w-4 h-4 mr-2" /> Evaluieren
        </Button>

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((r, i) => (
              <div key={i} className="border border-crypto-purple/20 bg-background/40 rounded p-2.5 space-y-1.5">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <code className="text-xs text-foreground break-all flex-1">{r.input}</code>
                  <Badge className={`${truthColor(r.truth_value)} border text-xs flex-shrink-0`}>
                    {r.truth_value}
                  </Badge>
                </div>
                <div className="text-[10px] text-muted-foreground break-words">
                  {r.method}
                  {r.real_bits !== undefined && ` · real: ${r.real_bits} bits`}
                  {r.grover_bits !== undefined && ` · grover: ${r.grover_bits} bits`}
                  {r.reason && ` — ${r.reason}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}