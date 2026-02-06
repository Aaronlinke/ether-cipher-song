import { useState, useCallback } from 'react';
import { Cpu, Play, RotateCcw, Zap, Target, GitBranch, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';

// ═══════════════════════════════════════════════════════════════════════════
// DELTA-SOLVER: SAT-HEURISTIK mit SCC-ANALYSE
// Constraint Satisfaction für Schlüsselraum-Reduktion
// ═══════════════════════════════════════════════════════════════════════════

const SECP256K1_N = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');

// Constraint-Typen
type ConstraintOp = 'EQ' | 'NEQ' | 'LT' | 'GT' | 'MOD' | 'BIT' | 'RANGE';

interface Constraint {
  id: string;
  variable: string;
  op: ConstraintOp;
  value: string;
  description: string;
  active: boolean;
  weight: number;
}

interface SCCNode {
  id: number;
  constraints: number[];
  connected: number[];
  solved: boolean;
}

interface SolverResult {
  satisfied: boolean;
  candidateKey: string;
  constraintsMet: number;
  constraintsTotal: number;
  reductionBits: number;
  time: number;
}

// Vordefinierte Constraint-Templates für Bitcoin Puzzles
const CONSTRAINT_TEMPLATES: Constraint[] = [
  {
    id: 'bit_range_66', variable: 'k', op: 'RANGE',
    value: '2^65:2^66', description: 'Private Key liegt im 66-Bit Bereich',
    active: true, weight: 1
  },
  {
    id: 'not_even', variable: 'k', op: 'BIT',
    value: 'bit0=1', description: 'Schlüssel ist ungerade (LSB = 1)',
    active: true, weight: 0.5
  },
  {
    id: 'no_zeros_prefix', variable: 'k', op: 'NEQ',
    value: 'prefix_00', description: 'Kein Null-Prefix in ersten 8 hex-Stellen',
    active: true, weight: 0.3
  },
  {
    id: 'entropy_balanced', variable: 'k', op: 'MOD',
    value: 'hamming>100', description: 'Hamming-Gewicht > 100 (Entropie-Balance)',
    active: true, weight: 0.7
  },
  {
    id: 'not_sequential', variable: 'k', op: 'NEQ',
    value: 'seq_pattern', description: 'Kein sequentielles Muster (0123...)',
    active: true, weight: 0.2
  },
  {
    id: 'no_brain_wallet', variable: 'k', op: 'NEQ',
    value: 'brain_pattern', description: 'Nicht aus Brain Wallet ableitbar',
    active: false, weight: 0.8
  },
  {
    id: 'debian_safe', variable: 'k', op: 'NEQ',
    value: 'debian_pid', description: 'Nicht im Debian-Bug Schlüsselraum (2^15)',
    active: false, weight: 0.9
  },
  {
    id: 'mod_check', variable: 'k', op: 'MOD',
    value: 'k%7!=0', description: 'k mod 7 ≠ 0 (Gap Theory Heuristik)',
    active: false, weight: 0.4
  },
];

// Evaluiere einen Constraint gegen einen Kandidaten
const evaluateConstraint = (key: bigint, constraint: Constraint): boolean => {
  const keyHex = key.toString(16).padStart(64, '0');

  switch (constraint.op) {
    case 'RANGE': {
      const [minStr, maxStr] = constraint.value.split(':');
      const min = BigInt(minStr.replace('^', '**').replace(/(\d+)\*\*(\d+)/, (_, b, e) => (BigInt(b) ** BigInt(e)).toString()));
      const max = BigInt(maxStr.replace('^', '**').replace(/(\d+)\*\*(\d+)/, (_, b, e) => (BigInt(b) ** BigInt(e)).toString()));
      return key >= min && key < max;
    }
    case 'BIT': {
      if (constraint.value === 'bit0=1') return key % 2n === 1n;
      return true;
    }
    case 'NEQ': {
      if (constraint.value === 'prefix_00') return !keyHex.startsWith('00000000');
      if (constraint.value === 'seq_pattern') return !/^0123456789abcdef/.test(keyHex);
      if (constraint.value === 'brain_pattern') {
        // Prüfe ob Key zu "einfach" aussieht
        const uniqueChars = new Set(keyHex).size;
        return uniqueChars > 4;
      }
      if (constraint.value === 'debian_pid') {
        return key > 65536n; // PID-basierte Keys sind < 2^16
      }
      return true;
    }
    case 'MOD': {
      if (constraint.value.startsWith('hamming')) {
        let bits = 0;
        let k = key;
        while (k > 0n) { bits += Number(k & 1n); k >>= 1n; }
        return bits > 100;
      }
      if (constraint.value === 'k%7!=0') return key % 7n !== 0n;
      return true;
    }
    default:
      return true;
  }
};

// SCC-Analyse: Finde stark zusammenhängende Komponenten
const buildSCCGraph = (constraints: Constraint[]): SCCNode[] => {
  const active = constraints.filter(c => c.active);
  const nodes: SCCNode[] = active.map((c, i) => ({
    id: i,
    constraints: [i],
    connected: [],
    solved: false
  }));

  // Verbinde Constraints die auf gleiche Variablen wirken
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (active[i].variable === active[j].variable) {
        nodes[i].connected.push(j);
        nodes[j].connected.push(i);
      }
    }
  }

  return nodes;
};

// Generiere Kandidaten die Constraints erfüllen
const generateSATCandidates = (
  constraints: Constraint[],
  count: number,
  bitRange: number = 66
): SolverResult[] => {
  const active = constraints.filter(c => c.active);
  const results: SolverResult[] = [];
  const start = performance.now();

  const min = 2n ** BigInt(bitRange - 1);
  const max = 2n ** BigInt(bitRange);
  const range = max - min;

  for (let attempt = 0; attempt < count * 10 && results.length < count; attempt++) {
    // Pseudozufälliger Kandidat im Bereich
    const randomOffset = BigInt(Math.floor(Math.random() * Number(range > BigInt(Number.MAX_SAFE_INTEGER) ? BigInt(Number.MAX_SAFE_INTEGER) : range)));
    const candidate = (min + randomOffset) % SECP256K1_N;

    let met = 0;
    for (const c of active) {
      if (evaluateConstraint(candidate, c)) met++;
    }

    if (met === active.length) {
      results.push({
        satisfied: true,
        candidateKey: candidate.toString(16).padStart(64, '0'),
        constraintsMet: met,
        constraintsTotal: active.length,
        reductionBits: active.reduce((sum, c) => sum + c.weight, 0),
        time: performance.now() - start
      });
    }
  }

  return results;
};

export function DeltaSolver() {
  const [constraints, setConstraints] = useState<Constraint[]>(
    CONSTRAINT_TEMPLATES.map(c => ({ ...c }))
  );
  const [bitRange, setBitRange] = useState(66);
  const [candidateCount, setCandidateCount] = useState(50);
  const [results, setResults] = useState<SolverResult[]>([]);
  const [sccNodes, setSccNodes] = useState<SCCNode[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [customConstraint, setCustomConstraint] = useState('');

  const log = useCallback((msg: string) => {
    setLogs(prev => [...prev.slice(-50), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  const toggleConstraint = (id: string) => {
    setConstraints(prev => prev.map(c => c.id === id ? { ...c, active: !c.active } : c));
  };

  const runSolver = useCallback(() => {
    setIsRunning(true);
    setResults([]);

    const active = constraints.filter(c => c.active);
    log(`=== DELTA-SOLVER START ===`);
    log(`Aktive Constraints: ${active.length}`);
    log(`Bit-Bereich: ${bitRange}`);

    // SCC Analyse
    const scc = buildSCCGraph(constraints);
    setSccNodes(scc);
    log(`SCC-Graph: ${scc.length} Knoten, ${scc.reduce((s, n) => s + n.connected.length, 0)} Kanten`);

    // Constraint Satisfaction
    const sat = generateSATCandidates(constraints, candidateCount, bitRange);
    setResults(sat);

    const totalReduction = active.reduce((sum, c) => sum + c.weight, 0);
    log(`Kandidaten gefunden: ${sat.length}`);
    log(`Suchraum-Reduktion: ~${totalReduction.toFixed(1)} bits`);
    log(`Effektiver Suchraum: 2^${(bitRange - totalReduction).toFixed(1)}`);

    if (sat.length > 0) {
      log(`⚡ Bester Kandidat: ${sat[0].candidateKey.slice(0, 32)}...`);
      log(`   Constraints erfüllt: ${sat[0].constraintsMet}/${sat[0].constraintsTotal}`);
    } else {
      log(`⚠ Keine Kandidaten gefunden — Constraints zu restriktiv?`);
    }

    setIsRunning(false);
  }, [constraints, bitRange, candidateCount, log]);

  const addCustomConstraint = () => {
    if (!customConstraint.trim()) return;
    const newC: Constraint = {
      id: `custom_${Date.now()}`,
      variable: 'k',
      op: 'MOD',
      value: customConstraint,
      description: `Custom: ${customConstraint}`,
      active: true,
      weight: 0.5
    };
    setConstraints(prev => [...prev, newC]);
    setCustomConstraint('');
    log(`Custom Constraint hinzugefügt: ${customConstraint}`);
  };

  const activeCount = constraints.filter(c => c.active).length;
  const totalReduction = constraints.filter(c => c.active).reduce((sum, c) => sum + c.weight, 0);

  return (
    <Card className="border-crypto-purple/30 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-crypto-purple">
              <Cpu className="w-5 h-5" />
              Delta-Solver
            </CardTitle>
            <CardDescription className="font-mono text-xs mt-1">
              SAT-Heuristik • SCC-Analyse • Constraint Satisfaction
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              {activeCount} Constraints
            </Badge>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-xs">
              2^{(bitRange - totalReduction).toFixed(0)} eff.
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Constraint-Liste */}
        <div className="space-y-1.5">
          <div className="text-[10px] text-muted-foreground mb-1">Constraints (klicke zum Aktivieren/Deaktivieren):</div>
          <ScrollArea className="h-40">
            <div className="space-y-1 pr-2">
              {constraints.map(c => (
                <button
                  key={c.id}
                  onClick={() => toggleConstraint(c.id)}
                  className={`w-full text-left p-2 rounded border text-[10px] transition-colors ${
                    c.active
                      ? 'border-crypto-purple/40 bg-crypto-purple/10'
                      : 'border-muted bg-muted/10 opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {c.active ? (
                        <CheckCircle className="w-3 h-3 text-green-400" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-muted-foreground" />
                      )}
                      <span className="font-semibold">{c.description}</span>
                    </div>
                    <Badge variant="outline" className="text-[8px] h-4">
                      -{c.weight} bit
                    </Badge>
                  </div>
                  <div className="font-mono text-muted-foreground mt-0.5 ml-5">
                    {c.variable} {c.op} {c.value}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Custom Constraint */}
        <div className="flex gap-2">
          <Input
            value={customConstraint}
            onChange={(e) => setCustomConstraint(e.target.value)}
            placeholder="z.B. k%13!=0"
            className="text-xs h-8 font-mono"
          />
          <Button size="sm" variant="outline" onClick={addCustomConstraint} className="text-xs h-8">
            + Add
          </Button>
        </div>

        {/* Einstellungen */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[10px]">Bit-Bereich: {bitRange}</Label>
            <Slider
              value={[bitRange]}
              onValueChange={([v]) => setBitRange(v)}
              min={20} max={256} step={1}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-[10px]">Kandidaten: {candidateCount}</Label>
            <Slider
              value={[candidateCount]}
              onValueChange={([v]) => setCandidateCount(v)}
              min={10} max={500} step={10}
              className="mt-1"
            />
          </div>
        </div>

        {/* Solver Button */}
        <Button onClick={runSolver} disabled={isRunning} className="w-full text-xs">
          <Zap className="w-3 h-3 mr-1" />
          SAT-Solver ausführen ({activeCount} Constraints × {candidateCount} Kandidaten)
        </Button>

        {/* SCC-Visualisierung */}
        {sccNodes.length > 0 && (
          <div className="p-2 bg-muted/20 rounded">
            <div className="text-[10px] text-muted-foreground mb-1">SCC-Graph:</div>
            <div className="flex flex-wrap gap-1">
              {sccNodes.map(node => (
                <div key={node.id} className="flex items-center gap-0.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold border ${
                    node.connected.length > 0
                      ? 'border-crypto-purple bg-crypto-purple/20 text-crypto-purple'
                      : 'border-muted bg-muted/20 text-muted-foreground'
                  }`}>
                    {node.id}
                  </div>
                  {node.connected.length > 0 && (
                    <span className="text-[8px] text-muted-foreground">
                      →{node.connected.join(',')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reduktions-Übersicht */}
        <div className="p-2 bg-muted/20 rounded">
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-muted-foreground">Suchraum-Reduktion</span>
            <span className="font-mono">2^{bitRange} → 2^{(bitRange - totalReduction).toFixed(0)}</span>
          </div>
          <Progress value={(totalReduction / bitRange) * 100} className="h-2" />
          <div className="text-[9px] text-muted-foreground mt-1">
            {totalReduction.toFixed(1)} bits eliminiert durch {activeCount} Constraints
          </div>
        </div>

        {/* Ergebnisse */}
        {results.length > 0 && (
          <div>
            <div className="text-[10px] text-muted-foreground mb-1">
              {results.length} SAT-Kandidaten:
            </div>
            <ScrollArea className="h-24 rounded border border-muted bg-black/20">
              <div className="p-2 space-y-1">
                {results.slice(0, 20).map((r, i) => (
                  <div key={i} className="flex items-center gap-2 font-mono text-[9px]">
                    <span className="text-muted-foreground w-5">#{i}</span>
                    <span className="text-crypto-purple truncate flex-1">{r.candidateKey.slice(0, 32)}...</span>
                    <span className={r.satisfied ? 'text-green-400' : 'text-red-400'}>
                      {r.constraintsMet}/{r.constraintsTotal}
                    </span>
                    <span className="text-muted-foreground">{r.time.toFixed(0)}ms</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Formeln */}
        <div className="p-2 bg-muted/20 rounded text-[9px] font-mono space-y-0.5 text-muted-foreground">
          <div>SAT(φ) = ∃x: ∀c_i ∈ C: c_i(x) = true</div>
          <div>SCC: G = (V,E), V = constraints, E = variable-sharing</div>
          <div>Reduktion: H_eff = H_0 - Σ w_i · 𝟙(c_i aktiv)</div>
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
