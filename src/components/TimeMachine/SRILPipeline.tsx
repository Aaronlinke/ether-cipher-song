import { useState, useCallback, useEffect, useRef } from 'react';
import {
  GitMerge, Play, Pause, RotateCcw, Zap, ArrowRight,
  Target, TrendingUp, Radio, Cpu, Flame, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, ScatterChart, Scatter
} from 'recharts';

// ═══════════════════════════════════════════════════════════════════════════
// SRIL → SEED-CORE → MASTERFORMEL PIPELINE
// Vollautomatische Verkettung: H,N,G → k_i → d_candidate
// ═══════════════════════════════════════════════════════════════════════════

const SECP256K1_N = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');

const SRIL = {
  alpha: 0.245, beta: 0.152, gamma: 0.985, delta: 0.112, eta: 0.088
};

const UR_TRIADE = { H: -4.256, N: 5.824, G: 1.952 };

interface PipelineState {
  H: number; N: number; G: number; t: number;
}

interface PipelineCandidate {
  index: number;
  key: string;
  entropy: number;
  score: number;
  source: string;
}

interface PipelineStage {
  name: string;
  status: 'idle' | 'active' | 'done';
  inputCount: number;
  outputCount: number;
  reductionFactor: number;
}

const srilStep = (s: PipelineState, dir: 'fwd' | 'bwd'): PipelineState => {
  if (dir === 'fwd') {
    const H1 = s.H + SRIL.alpha * s.N - SRIL.beta * s.G;
    const N1 = SRIL.gamma * s.N + SRIL.delta * Math.abs(s.H);
    const G1 = s.G + SRIL.eta * (H1 + N1);
    return { H: H1, N: N1, G: G1, t: s.t + 1 };
  }
  const G0 = (s.G - SRIL.eta * s.H - SRIL.eta * s.N) / (1 + SRIL.eta * (SRIL.alpha - SRIL.beta + SRIL.gamma));
  const N0 = (s.N - SRIL.delta * Math.abs(s.H)) / SRIL.gamma;
  const H0 = s.H - SRIL.alpha * N0 + SRIL.beta * G0;
  return { H: H0, N: N0, G: G0, t: s.t - 1 };
};

// Konvertiere float-Triade zu BigInt-Seed-Parametern
const triadeToBigInt = (val: number, scale: number = 1e15): bigint => {
  const abs = Math.abs(val);
  const scaled = Math.floor(abs * scale);
  return BigInt(scaled) % SECP256K1_N;
};

// Erzeuge Kandidaten aus SRIL-Zustand
const generateFromSRIL = (state: PipelineState, count: number): PipelineCandidate[] => {
  const h = triadeToBigInt(state.H);
  const n = triadeToBigInt(state.N);
  const g = triadeToBigInt(state.G);
  
  const candidates: PipelineCandidate[] = [];
  for (let i = 0; i < count; i++) {
    const k = (h * n + g * BigInt(i)) % SECP256K1_N;
    const keyHex = k.toString(16).padStart(64, '0');
    
    // Entropie-Score: Bit-Verteilung
    let ones = 0;
    for (const c of keyHex) ones += parseInt(c, 16).toString(2).split('1').length - 1;
    const entropy = ones / 256;
    
    candidates.push({
      index: i,
      key: keyHex,
      entropy,
      score: Math.abs(entropy - 0.5) * 2, // Je näher an 0.5 desto besser
      source: `SRIL(t=${state.t})`
    });
  }
  
  return candidates.sort((a, b) => a.score - b.score);
};

// Entropie-Kollaps Filter
const applyEntropyFilter = (
  candidates: PipelineCandidate[],
  minEntropy: number,
  maxEntropy: number
): PipelineCandidate[] => {
  return candidates.filter(c => c.entropy >= minEntropy && c.entropy <= maxEntropy);
};

// Pattern-Filter: Suche nach strukturellen Mustern
const applyPatternFilter = (candidates: PipelineCandidate[]): PipelineCandidate[] => {
  return candidates.filter(c => {
    // Prüfe auf verdächtige Muster (zu viele Nullen, Wiederholungen)
    const key = c.key;
    const hasRepeats = /(.{4,})\1{2,}/.test(key);
    const hasLongZeros = /0{16,}/.test(key);
    return !hasRepeats && !hasLongZeros;
  });
};

export function SRILPipeline() {
  const [state, setState] = useState<PipelineState>({ ...UR_TRIADE, t: 0 });
  const [history, setHistory] = useState<PipelineState[]>([{ ...UR_TRIADE, t: 0 }]);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(200);
  const [candidateCount, setCandidateCount] = useState(200);
  const [candidates, setCandidates] = useState<PipelineCandidate[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<PipelineCandidate[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [pipelineActive, setPipelineActive] = useState(false);
  const [stages, setStages] = useState<PipelineStage[]>([
    { name: 'SRIL Engine', status: 'idle', inputCount: 0, outputCount: 0, reductionFactor: 1 },
    { name: 'Seed-Core', status: 'idle', inputCount: 0, outputCount: 0, reductionFactor: 1 },
    { name: 'Entropie-Filter', status: 'idle', inputCount: 0, outputCount: 0, reductionFactor: 1 },
    { name: 'Pattern-Filter', status: 'idle', inputCount: 0, outputCount: 0, reductionFactor: 1 },
    { name: 'Kandidaten-Pool', status: 'idle', inputCount: 0, outputCount: 0, reductionFactor: 1 },
  ]);
  const [totalGenerated, setTotalGenerated] = useState(0);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [bestScore, setBestScore] = useState(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const log = useCallback((msg: string) => {
    setLogs(prev => [...prev.slice(-80), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  // Pipeline-Durchlauf
  const runPipeline = useCallback((currentState: PipelineState) => {
    const newStages = [...stages];

    // Stage 1: SRIL
    newStages[0] = { ...newStages[0], status: 'active', inputCount: 3, outputCount: 3 };
    
    // Stage 2: Seed-Core Generation
    const raw = generateFromSRIL(currentState, candidateCount);
    newStages[1] = { ...newStages[1], status: 'active', inputCount: 3, outputCount: raw.length };
    
    // Stage 3: Entropie-Filter
    const entropyFiltered = applyEntropyFilter(raw, 0.35, 0.65);
    newStages[2] = {
      ...newStages[2], status: 'active',
      inputCount: raw.length, outputCount: entropyFiltered.length,
      reductionFactor: raw.length > 0 ? entropyFiltered.length / raw.length : 0
    };
    
    // Stage 4: Pattern-Filter
    const patternFiltered = applyPatternFilter(entropyFiltered);
    newStages[3] = {
      ...newStages[3], status: 'active',
      inputCount: entropyFiltered.length, outputCount: patternFiltered.length,
      reductionFactor: entropyFiltered.length > 0 ? patternFiltered.length / entropyFiltered.length : 0
    };
    
    // Stage 5: Final Pool
    newStages[4] = { ...newStages[4], status: 'done', inputCount: patternFiltered.length, outputCount: patternFiltered.length };
    
    setStages(newStages);
    setCandidates(raw);
    setFilteredCandidates(patternFiltered);
    setTotalGenerated(prev => prev + raw.length);
    setTotalFiltered(prev => prev + patternFiltered.length);
    
    if (patternFiltered.length > 0 && patternFiltered[0].score < bestScore) {
      setBestScore(patternFiltered[0].score);
    }
    
    log(`Pipeline t=${currentState.t}: ${raw.length} → ${entropyFiltered.length} → ${patternFiltered.length} Kandidaten`);
  }, [candidateCount, stages, bestScore, log]);

  // Auto-Iteration
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    
    intervalRef.current = setInterval(() => {
      setState(prev => {
        const next = srilStep(prev, 'fwd');
        setHistory(h => [...h.slice(-200), next]);
        if (pipelineActive) {
          runPipeline(next);
        }
        return next;
      });
    }, speed);
    
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, speed, pipelineActive, runPipeline]);

  const singleStep = () => {
    setState(prev => {
      const next = srilStep(prev, 'fwd');
      setHistory(h => [...h.slice(-200), next]);
      runPipeline(next);
      return next;
    });
  };

  const reset = () => {
    setRunning(false);
    setState({ ...UR_TRIADE, t: 0 });
    setHistory([{ ...UR_TRIADE, t: 0 }]);
    setCandidates([]);
    setFilteredCandidates([]);
    setTotalGenerated(0);
    setTotalFiltered(0);
    setBestScore(1);
    setLogs([]);
    setStages(stages.map(s => ({ ...s, status: 'idle', inputCount: 0, outputCount: 0 })));
    log('System zurückgesetzt');
  };

  const chartData = history.slice(-100).map(s => ({
    t: s.t,
    H: parseFloat(s.H.toFixed(4)),
    N: parseFloat(s.N.toFixed(4)),
    G: parseFloat(s.G.toFixed(4)),
  }));

  const scoreDistribution = candidates.slice(0, 50).map((c, i) => ({
    i, score: parseFloat((1 - c.score).toFixed(4)), entropy: parseFloat(c.entropy.toFixed(4))
  }));

  return (
    <Card className="border-crypto-purple/30 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-crypto-purple">
              <GitMerge className="w-6 h-6" />
              SRIL → Puzzle Pipeline
            </CardTitle>
            <CardDescription className="font-mono text-xs mt-1">
              Automatische Verkettung: H,N,G → Seed-Core → Entropie-Filter → Kandidaten
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={running ? "default" : "outline"} className="font-mono text-xs">
              t = {state.t}
            </Badge>
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30 text-xs">
              {filteredCandidates.length} aktiv
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Pipeline Visualisierung */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {stages.map((stage, i) => (
            <div key={i} className="flex items-center">
              <div className={`px-2 py-1.5 rounded text-[9px] font-mono border min-w-[80px] text-center transition-colors ${
                stage.status === 'active' ? 'border-crypto-purple/50 bg-crypto-purple/10 text-crypto-purple' :
                stage.status === 'done' ? 'border-green-500/50 bg-green-500/10 text-green-400' :
                'border-muted bg-muted/20 text-muted-foreground'
              }`}>
                <div className="font-semibold">{stage.name}</div>
                {stage.outputCount > 0 && (
                  <div className="mt-0.5">{stage.outputCount} out</div>
                )}
              </div>
              {i < stages.length - 1 && (
                <ChevronRight className="w-3 h-3 text-muted-foreground mx-0.5 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Steuerung */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="flex gap-1.5">
              <Button size="sm" onClick={singleStep} disabled={running} className="flex-1 text-xs">
                <Zap className="w-3 h-3 mr-1" />
                Step
              </Button>
              <Button
                size="sm"
                variant={running ? "destructive" : "default"}
                onClick={() => setRunning(!running)}
                className="flex-1 text-xs"
              >
                {running ? <Pause className="w-3 h-3 mr-1" /> : <Play className="w-3 h-3 mr-1" />}
                {running ? 'Stop' : 'Auto'}
              </Button>
              <Button size="sm" variant="ghost" onClick={reset}>
                <RotateCcw className="w-3 h-3" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-[10px] w-16">Pipeline:</Label>
              <Button
                size="sm"
                variant={pipelineActive ? "default" : "outline"}
                onClick={() => setPipelineActive(!pipelineActive)}
                className="flex-1 text-xs h-7"
              >
                <Radio className={`w-3 h-3 mr-1 ${pipelineActive ? 'animate-pulse' : ''}`} />
                {pipelineActive ? 'AKTIV' : 'Inaktiv'}
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <div>
              <Label className="text-[10px]">Speed: {speed}ms</Label>
              <Slider
                value={[speed]}
                onValueChange={([v]) => setSpeed(v)}
                min={50} max={1000} step={50}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[10px]">Kandidaten/Durchlauf: {candidateCount}</Label>
              <Slider
                value={[candidateCount]}
                onValueChange={([v]) => setCandidateCount(v)}
                min={50} max={1000} step={50}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Metriken */}
        <div className="grid grid-cols-4 gap-2">
          <div className="p-2 bg-muted/30 rounded text-center">
            <div className="text-sm font-bold text-red-400">{state.H.toFixed(2)}</div>
            <div className="text-[9px] text-muted-foreground">H</div>
          </div>
          <div className="p-2 bg-muted/30 rounded text-center">
            <div className="text-sm font-bold text-blue-400">{state.N.toFixed(2)}</div>
            <div className="text-[9px] text-muted-foreground">N</div>
          </div>
          <div className="p-2 bg-muted/30 rounded text-center">
            <div className="text-sm font-bold text-green-400">{state.G.toFixed(2)}</div>
            <div className="text-[9px] text-muted-foreground">G</div>
          </div>
          <div className="p-2 bg-muted/30 rounded text-center">
            <div className="text-sm font-bold text-amber-400">{(1 - bestScore).toFixed(3)}</div>
            <div className="text-[9px] text-muted-foreground">Best Score</div>
          </div>
        </div>

        {/* SRIL Chart */}
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="t" stroke="#666" fontSize={9} />
              <YAxis stroke="#666" fontSize={9} />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #333', fontSize: 10 }} />
              <Line type="monotone" dataKey="H" stroke="#ef4444" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="N" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="G" stroke="#22c55e" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Score Distribution */}
        {scoreDistribution.length > 0 && (
          <div className="h-28">
            <div className="text-[10px] text-muted-foreground mb-1">Kandidaten-Score (höher = besser)</div>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="i" stroke="#666" fontSize={9} />
                <YAxis stroke="#666" fontSize={9} />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #333', fontSize: 10 }} />
                <Area type="monotone" dataKey="score" stroke="#a855f7" fill="#a855f7" fillOpacity={0.2} />
                <Area type="monotone" dataKey="entropy" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Statistiken */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-muted/20 rounded">
            <div className="text-xs font-bold">{totalGenerated.toLocaleString()}</div>
            <div className="text-[9px] text-muted-foreground">Generiert</div>
          </div>
          <div className="p-2 bg-muted/20 rounded">
            <div className="text-xs font-bold">{totalFiltered.toLocaleString()}</div>
            <div className="text-[9px] text-muted-foreground">Gefiltert</div>
          </div>
          <div className="p-2 bg-muted/20 rounded">
            <div className="text-xs font-bold">
              {totalGenerated > 0 ? ((totalFiltered / totalGenerated) * 100).toFixed(1) : '0'}%
            </div>
            <div className="text-[9px] text-muted-foreground">Überlebensrate</div>
          </div>
        </div>

        {/* Top Kandidaten */}
        {filteredCandidates.length > 0 && (
          <div>
            <div className="text-[10px] text-muted-foreground mb-1">
              Top Kandidaten (Score ≈ 1.0 = ideal):
            </div>
            <ScrollArea className="h-24 rounded border border-muted bg-black/20">
              <div className="p-2 space-y-1">
                {filteredCandidates.slice(0, 15).map((c, i) => (
                  <div key={i} className="flex items-center gap-2 font-mono text-[9px]">
                    <span className="text-muted-foreground w-5">#{i}</span>
                    <span className="text-crypto-purple truncate flex-1">{c.key.slice(0, 32)}...</span>
                    <span className="text-amber-400">{(1 - c.score).toFixed(3)}</span>
                    <span className="text-green-400/60">{c.entropy.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

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
