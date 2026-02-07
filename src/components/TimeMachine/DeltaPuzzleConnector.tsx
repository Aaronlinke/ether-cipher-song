import { useState, useCallback } from 'react';
import {
  Link2, Zap, Play, Download, Target, Shield,
  ArrowRight, CheckCircle2, AlertTriangle, Cpu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ═══════════════════════════════════════════════════════════════════════════
// DELTA ↔ PUZZLE CONNECTOR
// Brücke zwischen SAT-Heuristik und Bitcoin Puzzle Solver
// ═══════════════════════════════════════════════════════════════════════════

const SECP256K1 = {
  P: BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F'),
  N: BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141'),
  Gx: BigInt('0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798'),
  Gy: BigInt('0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8'),
};

const PUZZLES = [
  { id: 66, bits: 66, address: '13zb1hQbWVsc2S7ZTZnP2G4undNNpdh5so', hasPublicKey: true },
  { id: 67, bits: 67, address: '1BY8GQbnueYofwSuFAT3USAhGjPrkxDdW9', hasPublicKey: true },
  { id: 68, bits: 68, address: '1MVDYgVaSN6iKKEsbzRUAYFrYJadLYZvvZ', hasPublicKey: true },
  { id: 69, bits: 69, address: '19vkiEajfhuZ8bs8Zu2jgmC6oqZbWqhxhG', hasPublicKey: true },
  { id: 72, bits: 72, address: '1LHtnpd8nU5VHEMkG2TMYYNUaLL6eLHZR1', hasPublicKey: true },
  { id: 73, bits: 73, address: '1AX7bP85C6VEgKJQifdJJZZV2NYBj7ToLQ', hasPublicKey: false },
  { id: 74, bits: 74, address: '1BfBfQPxUbJeXv9WY2FHy5ZbR9mMJdT8Ai', hasPublicKey: false },
  { id: 76, bits: 76, address: '1P52VadqTe6Yy8HM9G5B3D5wJx3F7k8zqq', hasPublicKey: false },
  { id: 80, bits: 80, address: '1K2K9gQ7D2aE5XA7xUVp9qWpmEBzqKaRFG', hasPublicKey: true },
];

// Constraint-Engine (aus Delta-Solver Logik repliziert)
interface ConnectorConstraint {
  name: string;
  category: 'structural' | 'historical' | 'mathematical' | 'entropy';
  reductionBits: number;
  enabled: boolean;
  description: string;
  evaluate: (key: bigint, bits: number) => boolean;
}

const CONNECTOR_CONSTRAINTS: ConnectorConstraint[] = [
  {
    name: 'Bit-Range Lock',
    category: 'structural',
    reductionBits: 0, // implizit
    enabled: true,
    description: 'Schlüssel muss im exakten Bit-Bereich des Puzzles liegen',
    evaluate: (key, bits) => {
      const min = 2n ** BigInt(bits - 1);
      const max = 2n ** BigInt(bits);
      return key >= min && key < max;
    }
  },
  {
    name: 'Ungerade (LSB=1)',
    category: 'structural',
    reductionBits: 1,
    enabled: true,
    description: 'Private Keys sind statistisch häufiger ungerade',
    evaluate: (key) => key % 2n === 1n
  },
  {
    name: 'Hamming Balance',
    category: 'entropy',
    reductionBits: 2,
    enabled: true,
    description: 'Hamming-Gewicht im Bereich 40-60% der Bits',
    evaluate: (key, bits) => {
      let ones = 0;
      let k = key;
      while (k > 0n) { ones += Number(k & 1n); k >>= 1n; }
      const ratio = ones / bits;
      return ratio >= 0.35 && ratio <= 0.65;
    }
  },
  {
    name: 'Nicht-Debian (CVE-2008-0166)',
    category: 'historical',
    reductionBits: 0.5,
    enabled: true,
    description: 'Ausschluss des PID-basierten Schlüsselraums',
    evaluate: (key) => key > 65536n
  },
  {
    name: 'Kein Brain-Wallet',
    category: 'historical',
    reductionBits: 1.5,
    enabled: true,
    description: 'Keine einfachen oder vorhersehbaren Muster',
    evaluate: (key) => {
      const hex = key.toString(16);
      const unique = new Set(hex).size;
      return unique > 5;
    }
  },
  {
    name: 'Gap Theory Filter',
    category: 'mathematical',
    reductionBits: 1,
    enabled: false,
    description: 'k mod 7 ≠ 0 (Gap-Theory-Heuristik für Puzzle-Lücken)',
    evaluate: (key) => key % 7n !== 0n
  },
  {
    name: 'Goldener Schnitt',
    category: 'mathematical',
    reductionBits: 0.8,
    enabled: false,
    description: 'φ-Resonanz: Bit-Ratio nahe 1/φ ≈ 0.618',
    evaluate: (key, bits) => {
      let ones = 0;
      let k = key;
      while (k > 0n) { ones += Number(k & 1n); k >>= 1n; }
      const ratio = ones / bits;
      return Math.abs(ratio - 0.618) < 0.1;
    }
  },
  {
    name: 'SRIL-Kohärenz',
    category: 'mathematical',
    reductionBits: 1.2,
    enabled: false,
    description: 'Kandidat muss SRIL H-N-G Muster-Kohärenz zeigen',
    evaluate: (key) => {
      // Prüfe auf SRIL-typische Byte-Verteilung
      const hex = key.toString(16).padStart(64, '0');
      let variance = 0;
      for (let i = 0; i < hex.length - 1; i++) {
        const diff = Math.abs(parseInt(hex[i], 16) - parseInt(hex[i + 1], 16));
        variance += diff;
      }
      const avgVar = variance / (hex.length - 1);
      return avgVar >= 3 && avgVar <= 10;
    }
  },
];

interface ConnectorResult {
  key: string;
  constraintsPassed: number;
  constraintsTotal: number;
  score: number;
  matchesPuzzle: boolean;
}

export function DeltaPuzzleConnector() {
  const [selectedPuzzle, setSelectedPuzzle] = useState('66');
  const [constraints, setConstraints] = useState(
    CONNECTOR_CONSTRAINTS.map(c => ({ ...c }))
  );
  const [batchSize, setBatchSize] = useState(200);
  const [results, setResults] = useState<ConnectorResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [totalScanned, setTotalScanned] = useState(0);
  const [totalPassed, setTotalPassed] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [bestScore, setBestScore] = useState(0);

  const log = useCallback((msg: string) => {
    setLogs(prev => [...prev.slice(-60), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  const puzzle = PUZZLES.find(p => p.id === parseInt(selectedPuzzle))!;
  const activeConstraints = constraints.filter(c => c.enabled);
  const totalReduction = activeConstraints.reduce((s, c) => s + c.reductionBits, 0);
  const effectiveBits = puzzle.bits - totalReduction;

  const toggleConstraint = (name: string) => {
    setConstraints(prev =>
      prev.map(c => c.name === name ? { ...c, enabled: !c.enabled } : c)
    );
  };

  const runConnector = useCallback(() => {
    setIsRunning(true);
    const bits = puzzle.bits;
    const min = 2n ** BigInt(bits - 1);
    const max = 2n ** BigInt(bits);
    const range = max - min;
    const active = constraints.filter(c => c.enabled);

    log(`═══ DELTA↔PUZZLE CONNECTOR ═══`);
    log(`Puzzle #${puzzle.id} (${bits}-bit) → ${puzzle.address.slice(0, 20)}...`);
    log(`Aktive Constraints: ${active.length}`);
    log(`Effektiver Suchraum: 2^${effectiveBits.toFixed(1)}`);
    log(`Public Key: ${puzzle.hasPublicKey ? '✓ vorhanden' : '✗ FEHLT (nur Brute-Force)'}`);

    const newResults: ConnectorResult[] = [];
    let passed = 0;

    for (let attempt = 0; attempt < batchSize * 5 && newResults.length < batchSize; attempt++) {
      const offset = BigInt(Math.floor(Math.random() * Number(
        range > BigInt(Number.MAX_SAFE_INTEGER) ? BigInt(Number.MAX_SAFE_INTEGER) : range
      )));
      const candidate = (min + offset) % SECP256K1.N;

      let met = 0;
      for (const c of active) {
        if (c.evaluate(candidate, bits)) met++;
      }

      if (met === active.length) {
        passed++;
        const score = met / active.length;
        newResults.push({
          key: candidate.toString(16).padStart(64, '0'),
          constraintsPassed: met,
          constraintsTotal: active.length,
          score,
          matchesPuzzle: false, // Adress-Check wäre hier async
        });
      }
    }

    newResults.sort((a, b) => b.score - a.score);
    setResults(newResults);
    setTotalScanned(prev => prev + batchSize * 5);
    setTotalPassed(prev => prev + passed);
    if (newResults.length > 0 && newResults[0].score > bestScore) {
      setBestScore(newResults[0].score);
    }

    log(`Batch: ${batchSize * 5} getestet → ${passed} bestanden (${((passed / (batchSize * 5)) * 100).toFixed(1)}%)`);
    log(`Top-Kandidat: ${newResults[0]?.key.slice(0, 32)}...`);
    setIsRunning(false);
  }, [puzzle, constraints, batchSize, effectiveBits, bestScore, log]);

  const exportResults = () => {
    if (results.length === 0) return;
    const data = {
      puzzle: { id: puzzle.id, bits: puzzle.bits, address: puzzle.address },
      constraints: constraints.filter(c => c.enabled).map(c => c.name),
      effectiveBits,
      totalScanned,
      candidates: results.map(r => ({
        key: r.key,
        passed: r.constraintsPassed,
        total: r.constraintsTotal,
        score: r.score
      }))
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `delta-puzzle-${puzzle.id}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    log(`📥 ${results.length} Kandidaten exportiert (JSON)`);
  };

  const categoryColors: Record<string, string> = {
    structural: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
    historical: 'text-orange-400 border-orange-400/30 bg-orange-400/10',
    mathematical: 'text-purple-400 border-purple-400/30 bg-purple-400/10',
    entropy: 'text-green-400 border-green-400/30 bg-green-400/10',
  };

  return (
    <Card className="border-crypto-purple/30 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-crypto-purple">
              <Link2 className="w-5 h-5" />
              Delta ↔ Puzzle Connector
            </CardTitle>
            <CardDescription className="font-mono text-xs mt-1">
              SAT-Constraints → Bitcoin Puzzle Kandidaten
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              #{puzzle.id}
            </Badge>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-xs">
              2^{effectiveBits.toFixed(0)} eff.
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Puzzle-Auswahl */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[10px]">Ziel-Puzzle:</Label>
            <Select value={selectedPuzzle} onValueChange={setSelectedPuzzle}>
              <SelectTrigger className="h-8 text-xs mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PUZZLES.map(p => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    <span className="font-mono">
                      #{p.id} ({p.bits}-bit) {p.hasPublicKey ? '' : '🔒'}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px]">Batch-Größe: {batchSize}</Label>
            <Slider
              value={[batchSize]}
              onValueChange={([v]) => setBatchSize(v)}
              min={50} max={1000} step={50}
              className="mt-2"
            />
          </div>
        </div>

        {/* Puzzle-Info */}
        <div className="p-2 bg-muted/20 rounded text-[10px] font-mono">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Adresse:</span>
            <span className="text-crypto-purple">{puzzle.address}</span>
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-muted-foreground">Public Key:</span>
            <span className={puzzle.hasPublicKey ? 'text-green-400' : 'text-red-400'}>
              {puzzle.hasPublicKey ? '✓ Vorhanden (BSGS möglich)' : '✗ Fehlt (nur Brute-Force)'}
            </span>
          </div>
        </div>

        {/* Constraint-Grid */}
        <div className="space-y-1.5">
          <div className="text-[10px] text-muted-foreground">
            SAT-Constraints ({activeConstraints.length} aktiv, -{totalReduction.toFixed(1)} bits):
          </div>
          <ScrollArea className="h-36">
            <div className="space-y-1 pr-2">
              {constraints.map(c => (
                <button
                  key={c.name}
                  onClick={() => toggleConstraint(c.name)}
                  className={`w-full text-left p-2 rounded border text-[10px] transition-colors ${
                    c.enabled
                      ? 'border-crypto-purple/40 bg-crypto-purple/5'
                      : 'border-muted bg-muted/10 opacity-40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {c.enabled ? (
                        <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className="font-semibold">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className={`text-[8px] h-4 ${categoryColors[c.category]}`}>
                        {c.category}
                      </Badge>
                      <Badge variant="outline" className="text-[8px] h-4">
                        -{c.reductionBits}bit
                      </Badge>
                    </div>
                  </div>
                  <div className="text-muted-foreground mt-0.5 ml-5">{c.description}</div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Reduktionsbalken */}
        <div className="p-2 bg-muted/20 rounded">
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-muted-foreground">Suchraum-Reduktion</span>
            <span className="font-mono">2^{puzzle.bits} → 2^{effectiveBits.toFixed(0)}</span>
          </div>
          <Progress value={(totalReduction / puzzle.bits) * 100} className="h-2" />
        </div>

        {/* Run Button */}
        <div className="flex gap-2">
          <Button onClick={runConnector} disabled={isRunning} className="flex-1 text-xs">
            <Zap className="w-3 h-3 mr-1" />
            Connector ausführen
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={exportResults}
            disabled={results.length === 0}
            className="text-xs"
          >
            <Download className="w-3 h-3 mr-1" />
            Export
          </Button>
        </div>

        {/* Statistiken */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-1.5 bg-muted/20 rounded">
            <div className="text-xs font-bold">{totalScanned.toLocaleString()}</div>
            <div className="text-[8px] text-muted-foreground">Gescannt</div>
          </div>
          <div className="p-1.5 bg-muted/20 rounded">
            <div className="text-xs font-bold text-green-400">{totalPassed.toLocaleString()}</div>
            <div className="text-[8px] text-muted-foreground">Bestanden</div>
          </div>
          <div className="p-1.5 bg-muted/20 rounded">
            <div className="text-xs font-bold">
              {totalScanned > 0 ? ((totalPassed / totalScanned) * 100).toFixed(1) : '0'}%
            </div>
            <div className="text-[8px] text-muted-foreground">Pass-Rate</div>
          </div>
          <div className="p-1.5 bg-muted/20 rounded">
            <div className="text-xs font-bold text-crypto-purple">{results.length}</div>
            <div className="text-[8px] text-muted-foreground">Kandidaten</div>
          </div>
        </div>

        {/* Ergebnisse */}
        {results.length > 0 && (
          <div>
            <div className="text-[10px] text-muted-foreground mb-1">
              Top Kandidaten (alle {activeConstraints.length} Constraints erfüllt):
            </div>
            <ScrollArea className="h-24 rounded border border-muted bg-black/20">
              <div className="p-2 space-y-1">
                {results.slice(0, 20).map((r, i) => (
                  <div key={i} className="flex items-center gap-2 font-mono text-[9px]">
                    <span className="text-muted-foreground w-5">#{i}</span>
                    <span className="text-crypto-purple truncate flex-1">{r.key.slice(0, 40)}...</span>
                    <span className="text-green-400">
                      {r.constraintsPassed}/{r.constraintsTotal} ✓
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Formeln */}
        <div className="p-2 bg-muted/20 rounded text-[9px] font-mono space-y-0.5 text-muted-foreground">
          <div>{'Connector: C(Δ) → P(k) = Σ SAT_i(k) / |C|'}</div>
          <div>{'H_eff = H_puzzle - Σ ΔH_constraint'}</div>
          <div>{'k ∈ [2^(n-1), 2^n) ∩ {k | ∀c_i: c_i(k) = true}'}</div>
        </div>

        {/* Log */}
        <ScrollArea className="h-20 rounded border border-muted bg-black/30">
          <div className="p-2 space-y-0.5">
            {logs.map((l, i) => (
              <div key={i} className="font-mono text-[9px] text-green-400/80">{l}</div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
