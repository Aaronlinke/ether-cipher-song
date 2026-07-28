import { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GitBranch, Play, Square, Zap, Database, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { topOpenPuzzles, puzzleRange, FIRST_OPEN_PUZZLE } from '@/lib/puzzles';

const SECP256K1_N = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');

// Nur noch OFFENE Puzzles (zentrale Datenbank src/lib/puzzles.ts)
const PUZZLE_RANGES: Record<number, { min: bigint; max: bigint; address: string }> = Object.fromEntries(
  topOpenPuzzles(10).map((p) => {
    const { min, max } = puzzleRange(p.n);
    return [p.n, { min, max, address: p.address }];
  }),
);

interface PipelineCandidate {
  hex: string;
  score: number;
  entropy: number;
  hammingWeight: number;
  filters: string[];
}

export function AutoPipelineConnector() {
  const [puzzleNum, setPuzzleNum] = useState(FIRST_OPEN_PUZZLE);
  const [batchSize, setBatchSize] = useState(500);
  const [running, setRunning] = useState(false);
  const [candidates, setCandidates] = useState<PipelineCandidate[]>([]);
  const [stats, setStats] = useState({ generated: 0, filtered: 0, saved: 0 });
  const [logs, setLogs] = useState<string[]>([]);
  const [scoreThreshold, setScoreThreshold] = useState(0.6);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const log = useCallback((msg: string) => {
    setLogs(prev => [...prev.slice(-60), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  const hammingWeight = (hex: string): number => {
    let count = 0;
    for (const c of hex) {
      const n = parseInt(c, 16);
      count += ((n >> 0) & 1) + ((n >> 1) & 1) + ((n >> 2) & 1) + ((n >> 3) & 1);
    }
    return count;
  };

  const shannonEntropy = (hex: string): number => {
    const freq: Record<string, number> = {};
    for (const c of hex) freq[c] = (freq[c] || 0) + 1;
    let entropy = 0;
    const len = hex.length;
    for (const f of Object.values(freq)) {
      const p = f / len;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    return entropy;
  };

  const generateAndFilter = useCallback(() => {
    const puzzle = PUZZLE_RANGES[puzzleNum];
    if (!puzzle) return;

    const range = puzzle.max - puzzle.min;
    const newCandidates: PipelineCandidate[] = [];
    let generated = 0;

    for (let i = 0; i < batchSize; i++) {
      const H = Math.random() * 1e6;
      const N = Math.random() * 1e6;
      const G = Math.random() * 1e6;

      const seed = BigInt(Math.floor(H * N + G * (i + 1))) % range;
      const k = puzzle.min + seed;
      const hex = k.toString(16).padStart(17, '0');

      const hw = hammingWeight(hex);
      const totalBits = hex.length * 4;
      const hwRatio = hw / totalBits;
      const entropy = shannonEntropy(hex);

      generated++;

      const filters: string[] = [];
      let score = 0;

      // Hamming weight filter (35-65%)
      if (hwRatio >= 0.35 && hwRatio <= 0.65) {
        filters.push('hamming');
        score += 0.3;
      }

      // Entropy filter (>3.0)
      if (entropy > 3.0) {
        filters.push('entropy');
        score += 0.3;
      }

      // No repeated patterns
      const hasNoRepeat = !/(.)\1{3,}/.test(hex);
      if (hasNoRepeat) {
        filters.push('no-repeat');
        score += 0.2;
      }

      // Not CVE-2008-0166 pattern
      const notDebian = !hex.startsWith('0000') && !hex.endsWith('0000');
      if (notDebian) {
        filters.push('not-debian');
        score += 0.2;
      }

      if (score >= scoreThreshold) {
        newCandidates.push({ hex, score, entropy, hammingWeight: hwRatio, filters });
      }
    }

    setCandidates(prev => [...newCandidates, ...prev].slice(0, 200));
    setStats(prev => ({
      generated: prev.generated + generated,
      filtered: prev.filtered + newCandidates.length,
      saved: prev.saved,
    }));

    if (newCandidates.length > 0) {
      log(`⚡ ${newCandidates.length}/${generated} Kandidaten passieren Filter (Score ≥ ${scoreThreshold})`);
    }

    return newCandidates;
  }, [puzzleNum, batchSize, scoreThreshold, log]);

  const saveToDatabase = async (items: PipelineCandidate[]) => {
    if (items.length === 0) return;

    const rows = items.map(c => ({
      puzzle_number: puzzleNum,
      hex_key: c.hex,
      score: c.score,
      entropy: c.entropy,
      hamming_weight: c.hammingWeight,
      source: 'auto-pipeline',
      filters_passed: c.filters,
    }));

    const { error } = await supabase.from('batch_candidates').insert(rows);
    if (error) {
      log(`❌ DB-Fehler: ${error.message}`);
    } else {
      setStats(prev => ({ ...prev, saved: prev.saved + items.length }));
      log(`💾 ${items.length} Kandidaten in Datenbank gespeichert`);
    }
  };

  const startPipeline = () => {
    setRunning(true);
    log('🚀 Auto-Pipeline gestartet');

    intervalRef.current = setInterval(() => {
      const results = generateAndFilter();
      if (results && results.length > 0) {
        saveToDatabase(results);
      }
    }, 1500);
  };

  const stopPipeline = () => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    log('⏹ Pipeline gestoppt');
  };

  return (
    <Card className="border-crypto-purple/30 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-crypto-purple" />
          Auto-Pipeline → DB Connector
          <Badge variant="outline" className="ml-auto text-xs border-crypto-purple/40">
            Modul 28
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Puzzle</label>
            <Select value={String(puzzleNum)} onValueChange={v => setPuzzleNum(Number(v))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(PUZZLE_RANGES).map(n => (
                  <SelectItem key={n} value={n}>Puzzle #{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Batch-Größe: {batchSize}</label>
            <Slider value={[batchSize]} onValueChange={v => setBatchSize(v[0])} min={100} max={2000} step={100} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Min-Score: {scoreThreshold}</label>
            <Slider value={[scoreThreshold]} onValueChange={v => setScoreThreshold(v[0])} min={0.2} max={1.0} step={0.1} />
          </div>
        </div>

        {/* Pipeline Flow */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded p-2">
          <Badge variant="secondary" className="text-xs">SRIL Gen</Badge>
          <ArrowRight className="w-3 h-3" />
          <Badge variant="secondary" className="text-xs">SAT Filter</Badge>
          <ArrowRight className="w-3 h-3" />
          <Badge variant="secondary" className="text-xs">Score Gate</Badge>
          <ArrowRight className="w-3 h-3" />
          <Badge className="text-xs bg-crypto-purple/20 text-crypto-purple border-crypto-purple/40">
            <Database className="w-3 h-3 mr-1" />
            DB Save
          </Badge>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!running ? (
            <Button onClick={startPipeline} size="sm" className="bg-crypto-purple hover:bg-crypto-purple/80">
              <Play className="w-3 h-3 mr-1" /> Pipeline starten
            </Button>
          ) : (
            <Button onClick={stopPipeline} size="sm" variant="destructive">
              <Square className="w-3 h-3 mr-1" /> Stopp
            </Button>
          )}
          <Button onClick={() => saveToDatabase(candidates)} size="sm" variant="outline" disabled={candidates.length === 0}>
            <Database className="w-3 h-3 mr-1" /> Alle speichern ({candidates.length})
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/30 rounded p-2">
            <div className="text-lg font-mono font-bold text-foreground">{stats.generated.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Generiert</div>
          </div>
          <div className="bg-muted/30 rounded p-2">
            <div className="text-lg font-mono font-bold text-crypto-purple">{stats.filtered.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Gefiltert</div>
          </div>
          <div className="bg-muted/30 rounded p-2">
            <div className="text-lg font-mono font-bold text-green-400">{stats.saved.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">In DB</div>
          </div>
        </div>

        {/* Top Candidates */}
        {candidates.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Top Kandidaten (Score ≥ {scoreThreshold})</div>
            <ScrollArea className="h-32">
              <div className="space-y-1">
                {candidates.slice(0, 20).map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-mono bg-muted/20 rounded px-2 py-1">
                    <span className="text-crypto-purple">{c.score.toFixed(1)}</span>
                    <span className="text-foreground truncate flex-1">{c.hex}</span>
                    <span className="text-muted-foreground">{c.filters.length} Filter</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Logs */}
        <ScrollArea className="h-24 bg-muted/20 rounded p-2">
          <div className="space-y-0.5">
            {logs.map((l, i) => (
              <div key={i} className="text-xs font-mono text-muted-foreground">{l}</div>
            ))}
            {logs.length === 0 && (
              <div className="text-xs text-muted-foreground italic">Pipeline bereit...</div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
