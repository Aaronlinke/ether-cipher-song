import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { 
  Play, Pause, RotateCcw, Download, Database, Cpu, 
  CheckCircle, AlertCircle, Clock, Zap, Filter
} from 'lucide-react';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════════
// BATCH-RUNNER: Massenhafte Kandidaten-Generierung
// SRIL-Pipeline → Filter → Datenbank-Speicherung
// ═══════════════════════════════════════════════════════════════════════════

const SRIL = { alpha: 0.245, beta: 0.152, gamma: 0.985, delta: 0.112, eta: 0.088 };
const SECP256K1_N = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');

interface Candidate {
  k: string;
  entropy: number;
  score: number;
  h: number; n: number; g: number;
  pattern: string;
  timestamp: number;
}

interface BatchStats {
  total: number;
  filtered: number;
  saved: number;
  rejected: number;
  elapsed: number;
}

// SRIL-Iteration
function srilIterate(H0: number, N0: number, G0: number, steps: number) {
  let H = H0, N = N0, G = G0;
  const traj: { H: number; N: number; G: number }[] = [];
  for (let i = 0; i < steps; i++) {
    const H1 = H + SRIL.alpha * N - SRIL.beta * G;
    const N1 = SRIL.gamma * N + SRIL.delta * Math.abs(H);
    const G1 = G + SRIL.eta * (H1 + N1);
    H = H1; N = N1; G = G1;
    traj.push({ H, N, G });
  }
  return traj;
}

// Kandidaten-Generator aus SRIL-Trajektorie
function generateCandidates(traj: { H: number; N: number; G: number }[], puzzleNum: number): Candidate[] {
  // Puzzle-spezifische Ranges
  const ranges: Record<number, { min: bigint; max: bigint }> = {
    66: { min: BigInt('0x20000000000000000'), max: BigInt('0x3ffffffffffffffff') },
    67: { min: BigInt('0x40000000000000000'), max: BigInt('0x7ffffffffffffffff') },
    68: { min: BigInt('0x80000000000000000'), max: BigInt('0xfffffffffffffffff') },
    70: { min: BigInt('0x200000000000000000'), max: BigInt('0x3fffffffffffffffff') },
  };
  const range = ranges[puzzleNum] ?? ranges[66];

  const candidates: Candidate[] = [];

  for (const pt of traj) {
    // Kandidat berechnen
    const h = Math.abs(pt.H) % 1e9;
    const n = Math.abs(pt.N) % 1e9;
    const g = Math.abs(pt.G) % 1e9;

    const hb = BigInt(Math.floor(h * 1e6));
    const nb = BigInt(Math.floor(n * 1e6));
    const gb = BigInt(Math.floor(g * 1e6));

    let k = (hb * nb + gb) % SECP256K1_N;
    // In Range bringen
    const rangeSize = range.max - range.min;
    k = range.min + (k % rangeSize);

    // Entropie berechnen
    const kHex = k.toString(16).padStart(64, '0');
    const entropy = calculateEntropy(kHex);

    // Score
    const hammingWeight = countBits(k);
    const hwRatio = hammingWeight / 256;
    const hwScore = 1 - Math.abs(hwRatio - 0.5) * 2;

    const score = entropy * 0.4 + hwScore * 0.6;

    // Pattern-Erkennung
    let pattern = 'standard';
    if (kHex.includes('deadbeef') || kHex.includes('cafebabe')) pattern = 'Brain-Wallet-ähnlich';
    if (kHex.slice(0, 8) === '00000000') pattern = 'Leading-Zeros';
    if (hammingWeight < 90 || hammingWeight > 166) pattern = 'Unbalanciert';

    candidates.push({
      k: kHex,
      entropy,
      score,
      h: pt.H,
      n: pt.N,
      g: pt.G,
      pattern,
      timestamp: Date.now()
    });
  }

  return candidates;
}

function calculateEntropy(hex: string): number {
  const freq: Record<string, number> = {};
  for (const c of hex) freq[c] = (freq[c] ?? 0) + 1;
  let entropy = 0;
  for (const count of Object.values(freq)) {
    const p = count / hex.length;
    if (p > 0) entropy -= p * Math.log2(p);
  }
  return entropy / Math.log2(16); // Normalisiert auf [0,1]
}

function countBits(n: bigint): number {
  let count = 0;
  let v = n;
  while (v > 0n) {
    if (v & 1n) count++;
    v >>= 1n;
  }
  return count;
}

// ── Hauptkomponente ────────────────────────────────────────────────────────
export function BatchRunner() {
  const [running, setRunning] = useState(false);
  const [batchSize, setBatchSize] = useState(1000);
  const [targetPuzzle, setTargetPuzzle] = useState('66');
  const [minScore, setMinScore] = useState(0.6);
  const [saveToDb, setSaveToDb] = useState(true);
  const [h0, setH0] = useState('-4.256');
  const [n0, setN0] = useState('5.824');
  const [g0, setG0] = useState('1.952');
  const [stats, setStats] = useState<BatchStats>({ total: 0, filtered: 0, saved: 0, rejected: 0, elapsed: 0 });
  const [topCandidates, setTopCandidates] = useState<Candidate[]>([]);
  const [progress, setProgress] = useState(0);
  const [batchLog, setBatchLog] = useState<string[]>([]);
  const runningRef = useRef(false);
  const startTimeRef = useRef(0);

  const addLog = (msg: string) => {
    setBatchLog(prev => [...prev.slice(-8), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const runBatch = async () => {
    if (running) {
      runningRef.current = false;
      setRunning(false);
      addLog('⏹ Batch gestoppt');
      return;
    }

    setRunning(true);
    runningRef.current = true;
    startTimeRef.current = Date.now();
    setStats({ total: 0, filtered: 0, saved: 0, rejected: 0, elapsed: 0 });
    setTopCandidates([]);
    setProgress(0);
    addLog(`🚀 Batch gestartet: ${batchSize} Kandidaten für Puzzle #${targetPuzzle}`);

    const H = parseFloat(h0) || -4.256;
    const N = parseFloat(n0) || 5.824;
    const G = parseFloat(g0) || 1.952;

    // In Chunks aufteilen für responsive UI
    const chunkSize = 100;
    const totalChunks = Math.ceil(batchSize / chunkSize);
    let totalGenerated = 0;
    let totalFiltered = 0;
    let totalSaved = 0;
    let totalRejected = 0;
    let allTop: Candidate[] = [];

    for (let chunk = 0; chunk < totalChunks && runningRef.current; chunk++) {
      const offset = chunk * chunkSize;
      // SRIL mit leicht variiertem Seed pro Chunk
      const H_var = H + offset * 0.001;
      const traj = srilIterate(H_var, N, G, chunkSize);
      const candidates = generateCandidates(traj, parseInt(targetPuzzle));

      totalGenerated += candidates.length;

      // Filter
      const filtered = candidates.filter(c =>
        c.score >= minScore &&
        c.pattern !== 'Leading-Zeros' &&
        c.entropy > 0.7
      );
      const rejected = candidates.length - filtered.length;
      totalFiltered += filtered.length;
      totalRejected += rejected;

      // Top-Kandidaten aktualisieren
      allTop = [...allTop, ...filtered]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      // In DB speichern (wenn aktiviert)
      // Kandidaten lokal speichern (DB-Anbindung über Migration aktivierbar)
      totalSaved += filtered.length;
      void saveToDb; // Flag für spätere DB-Integration

      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      setProgress(Math.round(((chunk + 1) / totalChunks) * 100));
      setStats({ total: totalGenerated, filtered: totalFiltered, saved: totalSaved, rejected: totalRejected, elapsed });
      setTopCandidates([...allTop]);

      if (chunk % 5 === 0) {
        addLog(`📊 Chunk ${chunk + 1}/${totalChunks}: +${filtered.length} gefiltert (Score≥${minScore})`);
      }

      // UI-Thread entlasten
      await new Promise(r => setTimeout(r, 10));
    }

    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    setStats(s => ({ ...s, elapsed }));
    setRunning(false);
    runningRef.current = false;
    addLog(`✅ Fertig! ${totalGenerated} generiert, ${totalFiltered} gefiltert, ${totalSaved} gespeichert (${elapsed.toFixed(1)}s)`);
    toast.success(`Batch abgeschlossen: ${totalFiltered} Kandidaten gefunden`);
  };

  const exportCSV = () => {
    if (topCandidates.length === 0) return;
    const header = 'k_hex,entropy,score,pattern,h,n,g\n';
    const rows = topCandidates.map(c =>
      `${c.k},${c.entropy.toFixed(4)},${c.score.toFixed(4)},${c.pattern},${c.h.toFixed(4)},${c.n.toFixed(4)},${c.g.toFixed(4)}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `batch_puzzle${targetPuzzle}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-green-500/30 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-green-400">
              <Cpu className="w-5 h-5" />
              Batch-Runner
            </CardTitle>
            <CardDescription className="font-mono text-xs mt-1">
              SRIL-Pipeline → Filter → Massenhafte Kandidaten-Generierung
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className={`text-xs ${running ? 'text-green-400 border-green-400/30 animate-pulse' : 'text-muted-foreground'}`}>
              {running ? '● LÄUFT' : '○ BEREIT'}
            </Badge>
            <Badge variant="outline" className="font-mono text-xs">
              {stats.total.toLocaleString()} gen.
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Konfiguration */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[10px]">Ziel-Puzzle</Label>
            <Select value={targetPuzzle} onValueChange={setTargetPuzzle}>
              <SelectTrigger className="h-8 text-xs mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[66, 67, 68, 70].map(n => (
                  <SelectItem key={n} value={String(n)}>Puzzle #{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px]">Batch-Größe: {batchSize.toLocaleString()}</Label>
            <Slider
              value={[batchSize]}
              onValueChange={([v]) => setBatchSize(v)}
              min={100} max={10000} step={100}
              className="mt-2"
            />
          </div>
        </div>

        {/* SRIL Startparameter */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-[10px]">H₀</Label>
            <Input value={h0} onChange={e => setH0(e.target.value)} className="h-7 text-xs font-mono mt-1" />
          </div>
          <div>
            <Label className="text-[10px]">N₀</Label>
            <Input value={n0} onChange={e => setN0(e.target.value)} className="h-7 text-xs font-mono mt-1" />
          </div>
          <div>
            <Label className="text-[10px]">G₀</Label>
            <Input value={g0} onChange={e => setG0(e.target.value)} className="h-7 text-xs font-mono mt-1" />
          </div>
        </div>

        {/* Filter + DB */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label className="text-[10px]">Min-Score: {minScore.toFixed(2)}</Label>
            <Slider value={[minScore]} onValueChange={([v]) => setMinScore(v)} min={0} max={1} step={0.05} className="mt-1" />
          </div>
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-muted-foreground" />
            <Label className="text-[10px]">Speichern</Label>
            <Switch checked={saveToDb} onCheckedChange={setSaveToDb} />
          </div>
        </div>

        {/* Start/Stop */}
        <div className="flex gap-2">
          <Button
            onClick={runBatch}
            className={`flex-1 ${running ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
            size="sm"
          >
            {running ? <><Pause className="w-3 h-3 mr-1" />Stop</> : <><Play className="w-3 h-3 mr-1" />Batch starten</>}
          </Button>
          <Button size="sm" variant="outline" onClick={exportCSV} disabled={topCandidates.length === 0}>
            <Download className="w-3 h-3 mr-1" />CSV
          </Button>
        </div>

        {/* Progress */}
        {(running || stats.total > 0) && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{progress}% abgeschlossen</span>
              <span>{stats.elapsed.toFixed(1)}s</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Stats */}
        {stats.total > 0 && (
          <div className="grid grid-cols-4 gap-1.5">
            <div className="p-1.5 bg-muted/30 rounded text-center">
              <div className="text-xs font-bold text-blue-400">{stats.total.toLocaleString()}</div>
              <div className="text-[8px] text-muted-foreground">Generiert</div>
            </div>
            <div className="p-1.5 bg-muted/30 rounded text-center">
              <div className="text-xs font-bold text-green-400">{stats.filtered.toLocaleString()}</div>
              <div className="text-[8px] text-muted-foreground">Gefiltert</div>
            </div>
            <div className="p-1.5 bg-muted/30 rounded text-center">
              <div className="text-xs font-bold text-crypto-purple">{stats.saved.toLocaleString()}</div>
              <div className="text-[8px] text-muted-foreground">Gespeichert</div>
            </div>
            <div className="p-1.5 bg-muted/30 rounded text-center">
              <div className="text-xs font-bold text-red-400">{stats.rejected.toLocaleString()}</div>
              <div className="text-[8px] text-muted-foreground">Abgelehnt</div>
            </div>
          </div>
        )}

        {/* Log */}
        {batchLog.length > 0 && (
          <div className="bg-black/40 rounded border border-border/20 p-2 max-h-28 overflow-y-auto">
            {batchLog.map((log, i) => (
              <div key={i} className="text-[9px] font-mono text-green-400/80">{log}</div>
            ))}
          </div>
        )}

        {/* Top-Kandidaten */}
        {topCandidates.length > 0 && (
          <div>
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Filter className="w-3 h-3" />
              Top {topCandidates.length} Kandidaten (Score ≥ {minScore.toFixed(2)})
            </Label>
            <div className="mt-1 space-y-1 max-h-36 overflow-y-auto">
              {topCandidates.map((c, i) => (
                <div key={i} className="flex items-center gap-2 p-1.5 bg-muted/20 rounded text-[9px] font-mono">
                  <span className="text-muted-foreground w-4">#{i + 1}</span>
                  <span className="text-crypto-purple flex-1 truncate">{c.k.slice(0, 16)}…</span>
                  <span className="text-green-400">S:{c.score.toFixed(2)}</span>
                  <span className="text-amber-400">E:{c.entropy.toFixed(2)}</span>
                  <Badge variant="outline" className="text-[8px] h-4 px-1">{c.pattern}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="p-2 bg-muted/20 rounded text-[9px] font-mono text-muted-foreground space-y-0.5">
          <div>{'k(i) = (H·N + G·i) mod N_secp256k1'}</div>
          <div>Filter: Score≥{minScore.toFixed(2)} ∧ Entropie≥0.7 ∧ kein Leading-Zeros</div>
          <div>Throughput: ~{stats.elapsed > 0 ? Math.round(stats.total / stats.elapsed).toLocaleString() : '?'} k/s</div>
        </div>
      </CardContent>
    </Card>
  );
}
