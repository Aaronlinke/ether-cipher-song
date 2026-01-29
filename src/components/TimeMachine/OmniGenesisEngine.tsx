import { useState, useCallback, useEffect } from 'react';
import { 
  Brain, Zap, Activity, Target, GitBranch, Cpu, Play, 
  RotateCcw, Gauge, Atom, Binary, Shield, TrendingDown,
  Clock, Database, Network, ArrowUpDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

// ═══════════════════════════════════════════════════════════════════════════
// OMNI-GENESIS SYSTEM KONSTANTEN (aus deinen JSONs)
// ═══════════════════════════════════════════════════════════════════════════
const SYSTEM_CONFIG = {
  id: "OMNI-GEN-SYS-2025-FINAL",
  status: "OPERATIV",
  principle: "Inversion statt Konfrontation",
  doctrine: "Sicherheit ist eine deterministische Barriere"
};

// SRIL-Koeffizienten (Symmetrical Recursive Inversions-Logic)
const SRIL_COEFFICIENTS = {
  alpha: 0.245,
  beta: 0.152,
  gamma: 0.985,
  delta: 0.112,
  eta: 0.088
};

// Ur-Variablen Triade T=0
const UR_TRIADE = {
  H: -4.256,  // Enthalpie
  N: 5.824,   // Navigation
  G: 1.952    // Geometrie
};

// secp256k1 Parameter
const SECP256K1_N = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');

// ═══════════════════════════════════════════════════════════════════════════
// SRIL ENGINE (H, N, G Iteration)
// ═══════════════════════════════════════════════════════════════════════════
interface SRILState {
  H: number;
  N: number;
  G: number;
  t: number;
}

const srilForward = (state: SRILState): SRILState => {
  const { H, N, G, t } = state;
  const { alpha, beta, gamma, delta, eta } = SRIL_COEFFICIENTS;
  
  // H(t+1) = H(t) + α·N(t) - β·G(t)
  const H_next = H + alpha * N - beta * G;
  // N(t+1) = γ·N(t) + δ·|H(t)|
  const N_next = gamma * N + delta * Math.abs(H);
  // G(t+1) = G(t) + η·(H_next + N_next)
  const G_next = G + eta * (H_next + N_next);
  
  return { H: H_next, N: N_next, G: G_next, t: t + 1 };
};

const srilBackward = (state: SRILState): SRILState => {
  const { H, N, G, t } = state;
  const { alpha, beta, gamma, delta, eta } = SRIL_COEFFICIENTS;
  
  // Inverse Matrix-Operation (approximiert)
  // Löse das lineare Gleichungssystem rückwärts
  const detApprox = gamma - eta * delta;
  
  const G_prev = (G - eta * H - eta * N) / (1 + eta * (alpha - beta + gamma));
  const N_prev = (N - delta * Math.abs(H)) / gamma;
  const H_prev = H - alpha * N_prev + beta * G_prev;
  
  return { H: H_prev, N: N_prev, G: G_prev, t: t - 1 };
};

// ═══════════════════════════════════════════════════════════════════════════
// ENTROPIE-KOLLAPS ENGINE
// ═══════════════════════════════════════════════════════════════════════════
interface EntropyState {
  bits: number;
  source: string;
  collapsed: boolean;
  timestamp: number;
}

const ENTROPY_VULNERABILITIES = {
  DEBIAN_BUG: {
    id: 'CVE-2008-0166',
    era: [2006, 2008],
    reduction: 256 - 15, // 2^256 → 2^15
    description: 'OpenSSL RNG Bug - PID-basierte Schlüsselgenerierung'
  },
  BRAIN_WALLET: {
    id: 'COGNITIVE',
    reduction: 256 - 30, // ~10^9 Möglichkeiten
    description: 'Vorhersehbare menschliche Passphrasen'
  },
  BIP39_CHECKSUM: {
    id: 'PROTOCOL',
    reduction: 4, // 2048 → 128 für letztes Wort
    description: '4-Bit Prüfsummen-Lücke im 12. Wort'
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// SEED-CORE KANDIDATENRAUM
// ═══════════════════════════════════════════════════════════════════════════
// K = { k_i = h·n + g·i | i ∈ ℤ≥0 }
const generateSeedCoreSpace = (
  h: bigint,
  n: bigint,
  g: bigint,
  count: number
): bigint[] => {
  const candidates: bigint[] = [];
  for (let i = 0; i < count; i++) {
    const k_i = (h * n + g * BigInt(i)) % SECP256K1_N;
    candidates.push(k_i);
  }
  return candidates;
};

// ═══════════════════════════════════════════════════════════════════════════
// NODE & SYNC SYSTEM
// ═══════════════════════════════════════════════════════════════════════════
interface NodeState {
  active: number;
  target: number;
  syncProgress: number;
  hashrate: number;
  entropy: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// REACT KOMPONENTE
// ═══════════════════════════════════════════════════════════════════════════
export function OmniGenesisEngine() {
  // SRIL State
  const [srilState, setSrilState] = useState<SRILState>({ ...UR_TRIADE, t: 0 });
  const [srilHistory, setSrilHistory] = useState<SRILState[]>([{ ...UR_TRIADE, t: 0 }]);
  const [isIterating, setIsIterating] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  
  // Entropie State
  const [entropyBits, setEntropyBits] = useState(256);
  const [activeVulnerability, setActiveVulnerability] = useState<string | null>(null);
  
  // Seed-Core State
  const [seedH, setSeedH] = useState('1');
  const [seedN, setSeedN] = useState('1');
  const [seedG, setSeedG] = useState('1');
  const [candidateCount, setCandidateCount] = useState(100);
  const [candidates, setCandidates] = useState<string[]>([]);
  
  // Node System State
  const [nodeState, setNodeState] = useState<NodeState>({
    active: 1,
    target: 8,
    syncProgress: 0,
    hashrate: 0,
    entropy: 256
  });
  
  // Logs
  const [logs, setLogs] = useState<string[]>([]);
  
  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev.slice(-50), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  // SRIL Iteration
  const stepSRIL = useCallback(() => {
    setSrilState(prev => {
      const next = direction === 'forward' ? srilForward(prev) : srilBackward(prev);
      setSrilHistory(h => [...h.slice(-100), next]);
      addLog(`SRIL ${direction}: t=${next.t} | H=${next.H.toFixed(4)} N=${next.N.toFixed(4)} G=${next.G.toFixed(4)}`);
      return next;
    });
  }, [direction, addLog]);
  
  // Auto-Iteration
  useEffect(() => {
    if (!isIterating) return;
    const interval = setInterval(stepSRIL, 500);
    return () => clearInterval(interval);
  }, [isIterating, stepSRIL]);

  // Entropie-Kollaps anwenden
  const applyEntropyCollapse = useCallback((vulnKey: string) => {
    const vuln = ENTROPY_VULNERABILITIES[vulnKey as keyof typeof ENTROPY_VULNERABILITIES];
    if (vuln) {
      const newBits = Math.max(0, entropyBits - vuln.reduction);
      setEntropyBits(newBits);
      setActiveVulnerability(vulnKey);
      addLog(`⚡ ENTROPIE-KOLLAPS: ${vuln.id}`);
      addLog(`   ${vuln.description}`);
      addLog(`   Reduktion: 2^${entropyBits} → 2^${newBits}`);
      setNodeState(prev => ({ ...prev, entropy: newBits }));
    }
  }, [entropyBits, addLog]);

  // Seed-Core generieren
  const generateCandidates = useCallback(() => {
    try {
      const h = BigInt(seedH);
      const n = BigInt(seedN);
      const g = BigInt(seedG);
      const space = generateSeedCoreSpace(h, n, g, candidateCount);
      setCandidates(space.map(k => k.toString(16).padStart(64, '0')));
      addLog(`🌱 SEED-CORE: ${candidateCount} Kandidaten generiert`);
      addLog(`   k_i = ${seedH}·${seedN} + ${seedG}·i mod N`);
    } catch (e) {
      addLog(`Fehler: ${e}`);
    }
  }, [seedH, seedN, seedG, candidateCount, addLog]);

  // Reset
  const resetSystem = () => {
    setSrilState({ ...UR_TRIADE, t: 0 });
    setSrilHistory([{ ...UR_TRIADE, t: 0 }]);
    setEntropyBits(256);
    setActiveVulnerability(null);
    setCandidates([]);
    setNodeState({ active: 1, target: 8, syncProgress: 0, hashrate: 0, entropy: 256 });
    setLogs([]);
    addLog('🔄 System zurückgesetzt auf T=0');
  };

  // Chart-Daten
  const chartData = srilHistory.map(s => ({
    t: s.t,
    H: s.H,
    N: s.N,
    G: s.G
  }));

  return (
    <Card className="border-crypto-purple/30 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-crypto-purple">
              <Brain className="w-6 h-6" />
              OMNI-GENESIS Engine
            </CardTitle>
            <CardDescription className="font-mono text-xs mt-1">
              {SYSTEM_CONFIG.id} • {SYSTEM_CONFIG.status}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isIterating ? "default" : "outline"} className="font-mono">
              t = {srilState.t}
            </Badge>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
              H = 2^{entropyBits}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status-Leiste */}
        <div className="grid grid-cols-4 gap-2">
          <div className="p-2 bg-muted/30 rounded text-center">
            <div className="text-lg font-bold text-red-400">{srilState.H.toFixed(2)}</div>
            <div className="text-[10px] text-muted-foreground">H (Enthalpie)</div>
          </div>
          <div className="p-2 bg-muted/30 rounded text-center">
            <div className="text-lg font-bold text-blue-400">{srilState.N.toFixed(2)}</div>
            <div className="text-[10px] text-muted-foreground">N (Navigation)</div>
          </div>
          <div className="p-2 bg-muted/30 rounded text-center">
            <div className="text-lg font-bold text-green-400">{srilState.G.toFixed(2)}</div>
            <div className="text-[10px] text-muted-foreground">G (Geometrie)</div>
          </div>
          <div className="p-2 bg-muted/30 rounded text-center">
            <div className="text-lg font-bold text-amber-400">{entropyBits}</div>
            <div className="text-[10px] text-muted-foreground">Entropie (bits)</div>
          </div>
        </div>

        <Tabs defaultValue="sril" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="sril" className="text-xs">
              <Activity className="w-3 h-3 mr-1" />
              SRIL
            </TabsTrigger>
            <TabsTrigger value="entropy" className="text-xs">
              <TrendingDown className="w-3 h-3 mr-1" />
              Entropie
            </TabsTrigger>
            <TabsTrigger value="seedcore" className="text-xs">
              <Database className="w-3 h-3 mr-1" />
              Seed-Core
            </TabsTrigger>
            <TabsTrigger value="nodes" className="text-xs">
              <Network className="w-3 h-3 mr-1" />
              Nodes
            </TabsTrigger>
          </TabsList>

          {/* SRIL TAB */}
          <TabsContent value="sril" className="space-y-4">
            <div className="p-3 bg-muted/30 rounded-lg border border-crypto-purple/20">
              <h4 className="text-xs font-semibold text-crypto-purple mb-2 flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                Symmetrical Recursive Inversions-Logic
              </h4>
              
              {/* Koeffizienten */}
              <div className="grid grid-cols-5 gap-1 mb-3 text-[10px]">
                {Object.entries(SRIL_COEFFICIENTS).map(([key, val]) => (
                  <div key={key} className="text-center p-1 bg-muted/50 rounded">
                    <span className="text-crypto-purple">{key}</span> = {val}
                  </div>
                ))}
              </div>
              
              {/* Formeln */}
              <div className="text-[10px] font-mono space-y-0.5 text-muted-foreground mb-3">
                <div>H(t+1) = H(t) + α·N(t) - β·G(t)</div>
                <div>N(t+1) = γ·N(t) + δ·|H(t)|</div>
                <div>G(t+1) = G(t) + η·(H_next + N_next)</div>
              </div>

              {/* Controls */}
              <div className="flex gap-2 mb-3">
                <Button 
                  size="sm" 
                  variant={direction === 'forward' ? 'default' : 'outline'}
                  onClick={() => setDirection('forward')}
                  className="flex-1"
                >
                  <ArrowUpDown className="w-3 h-3 mr-1" />
                  Vorwärts
                </Button>
                <Button 
                  size="sm" 
                  variant={direction === 'backward' ? 'default' : 'outline'}
                  onClick={() => setDirection('backward')}
                  className="flex-1"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Rückwärts
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button size="sm" onClick={stepSRIL} disabled={isIterating} className="flex-1">
                  <Play className="w-3 h-3 mr-1" />
                  Schritt
                </Button>
                <Button 
                  size="sm" 
                  variant={isIterating ? "destructive" : "secondary"}
                  onClick={() => setIsIterating(!isIterating)}
                  className="flex-1"
                >
                  {isIterating ? 'Stop' : 'Auto'}
                </Button>
                <Button size="sm" variant="ghost" onClick={resetSystem}>
                  <RotateCcw className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* SRIL Chart */}
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="t" stroke="#666" fontSize={10} />
                  <YAxis stroke="#666" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ background: '#1a1a2e', border: '1px solid #333' }}
                    labelStyle={{ color: '#888' }}
                  />
                  <Line type="monotone" dataKey="H" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="N" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="G" stroke="#22c55e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* ENTROPY TAB */}
          <TabsContent value="entropy" className="space-y-4">
            <div className="p-3 bg-muted/30 rounded-lg border border-red-500/20">
              <h4 className="text-xs font-semibold text-red-400 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Entropie-Kollaps Vektoren
              </h4>
              
              {/* Entropie-Anzeige */}
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1">
                  <span>Suchraum-Entropie</span>
                  <span className="font-mono">2^{entropyBits} Möglichkeiten</span>
                </div>
                <Progress value={(entropyBits / 256) * 100} className="h-3" />
              </div>

              {/* Vulnerability Buttons */}
              <div className="space-y-2">
                {Object.entries(ENTROPY_VULNERABILITIES).map(([key, vuln]) => (
                  <Button
                    key={key}
                    variant={activeVulnerability === key ? "destructive" : "outline"}
                    size="sm"
                    className="w-full justify-start text-left h-auto py-2"
                    onClick={() => applyEntropyCollapse(key)}
                    disabled={activeVulnerability === key}
                  >
                    <div>
                      <div className="font-semibold text-xs">{vuln.id}</div>
                      <div className="text-[10px] text-muted-foreground">{vuln.description}</div>
                      <div className="text-[10px] text-red-400 mt-1">
                        Reduktion: -{vuln.reduction} bits
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
              
              <Button 
                size="sm" 
                variant="ghost" 
                className="w-full mt-3"
                onClick={() => { setEntropyBits(256); setActiveVulnerability(null); }}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Entropie zurücksetzen
              </Button>
            </div>
          </TabsContent>

          {/* SEED-CORE TAB */}
          <TabsContent value="seedcore" className="space-y-4">
            <div className="p-3 bg-muted/30 rounded-lg border border-green-500/20">
              <h4 className="text-xs font-semibold text-green-400 mb-3 flex items-center gap-2">
                <Database className="w-4 h-4" />
                Seed-Core Kandidatenraum
              </h4>
              
              <div className="text-[10px] font-mono text-muted-foreground mb-3 p-2 bg-muted/50 rounded">
                K = {'{'}  k_i = h·n + g·i mod N  |  i ∈ ℤ≥0  {'}'}
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div>
                  <Label className="text-xs">h (Seed)</Label>
                  <Input 
                    value={seedH} 
                    onChange={(e) => setSeedH(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs">n (Multiplikator)</Label>
                  <Input 
                    value={seedN} 
                    onChange={(e) => setSeedN(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs">g (Inkrement)</Label>
                  <Input 
                    value={seedG} 
                    onChange={(e) => setSeedG(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="mb-3">
                <Label className="text-xs">Anzahl Kandidaten: {candidateCount}</Label>
                <Slider 
                  value={[candidateCount]}
                  onValueChange={([v]) => setCandidateCount(v)}
                  min={10}
                  max={1000}
                  step={10}
                  className="mt-2"
                />
              </div>

              <Button size="sm" onClick={generateCandidates} className="w-full">
                <Zap className="w-3 h-3 mr-1" />
                Kandidatenraum generieren
              </Button>

              {candidates.length > 0 && (
                <ScrollArea className="h-32 mt-3 rounded border border-muted">
                  <div className="p-2 space-y-1">
                    {candidates.slice(0, 20).map((c, i) => (
                      <div key={i} className="font-mono text-[9px] text-muted-foreground truncate">
                        k[{i}]: {c.slice(0, 32)}...
                      </div>
                    ))}
                    {candidates.length > 20 && (
                      <div className="text-xs text-muted-foreground">
                        ... und {candidates.length - 20} weitere
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>
          </TabsContent>

          {/* NODES TAB */}
          <TabsContent value="nodes" className="space-y-4">
            <div className="p-3 bg-muted/30 rounded-lg border border-blue-500/20">
              <h4 className="text-xs font-semibold text-blue-400 mb-3 flex items-center gap-2">
                <Network className="w-4 h-4" />
                Node-Synchronisation & System-Status
              </h4>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-muted/50 rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <Cpu className="w-4 h-4 text-blue-400" />
                    <span className="text-xs">Active Nodes</span>
                  </div>
                  <div className="text-2xl font-bold">{nodeState.active}/{nodeState.target}</div>
                  <Progress value={(nodeState.active / nodeState.target) * 100} className="h-1 mt-2" />
                </div>
                
                <div className="p-3 bg-muted/50 rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <Gauge className="w-4 h-4 text-amber-400" />
                    <span className="text-xs">P_sync</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {(nodeState.active / nodeState.target).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    Nodes_active / Nodes_target
                  </div>
                </div>
              </div>

              {/* Node Controls */}
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setNodeState(s => ({ ...s, active: Math.min(s.active + 1, s.target) }))}
                  className="flex-1"
                >
                  + Node
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setNodeState(s => ({ ...s, active: Math.max(1, s.active - 1) }))}
                  className="flex-1"
                >
                  - Node
                </Button>
              </div>

              {/* Formeln */}
              <div className="mt-4 p-2 bg-muted/50 rounded text-[10px] font-mono space-y-1">
                <div>Nodes_t+1 = Nodes_t + δ_t,  δ_t ∈ {'{0,1}'}</div>
                <div>H_t+1 = H_t - ε,  ε ∈ ℝ⁺</div>
                <div>P_sync = Nodes_active / Nodes_target ∈ [0,1]</div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Log-Bereich */}
        <ScrollArea className="h-24 rounded border border-muted bg-black/30">
          <div className="p-2 space-y-0.5">
            {logs.map((log, i) => (
              <div key={i} className="font-mono text-[9px] text-green-400/80">
                {log}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="text-center text-[10px] text-muted-foreground">
          {SYSTEM_CONFIG.principle} • {SYSTEM_CONFIG.doctrine}
        </div>
      </CardContent>
    </Card>
  );
}
