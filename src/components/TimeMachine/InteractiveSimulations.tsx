import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KaTeXRenderer } from './KaTeXRenderer';
import { Play, RotateCcw } from 'lucide-react';

/* ═══════════════════════════════════════════
   1. LOGISTIC MAP SIMULATOR
   ═══════════════════════════════════════════ */
export function LogisticMapSim() {
  const [r, setR] = useState(3.5);
  const [x0, setX0] = useState(0.5);
  const [iterations, setIterations] = useState(80);

  const trajectory = useMemo(() => {
    const pts: number[] = [x0];
    let x = x0;
    for (let i = 0; i < iterations; i++) {
      x = r * x * (1 - x);
      pts.push(x);
    }
    return pts;
  }, [r, x0, iterations]);

  const lyapunov = useMemo(() => {
    let sum = 0;
    let x = x0;
    for (let i = 0; i < 1000; i++) {
      const deriv = Math.abs(r * (1 - 2 * x));
      if (deriv > 0) sum += Math.log(deriv);
      x = r * x * (1 - x);
    }
    return sum / 1000;
  }, [r, x0]);

  const maxVal = Math.max(...trajectory);
  const barH = 120;

  return (
    <Card className="border-border/30 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-display flex items-center gap-2">
          <span className="text-red-400">🔥</span>
          Logistische Abbildung — Interaktiv
        </CardTitle>
        <div className="mt-1">
          <KaTeXRenderer latex="x_{n+1} = r \\cdot x_n(1 - x_n)" displayMode className="text-xs" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* r slider */}
        <div>
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>r (Wachstumsrate)</span>
            <Badge variant="outline" className={`text-[9px] ${r > 3.57 ? 'border-red-500/40 text-red-400' : r > 3 ? 'border-amber-500/40 text-amber-400' : 'border-emerald-500/40 text-emerald-400'}`}>
              {r.toFixed(3)} {r > 3.57 ? '• CHAOS' : r > 3 ? '• Bifurkation' : '• Stabil'}
            </Badge>
          </div>
          <Slider min={0.1} max={4} step={0.001} value={[r]} onValueChange={([v]) => setR(v)} />
        </div>

        {/* x0 slider */}
        <div>
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>x₀ (Startwert)</span>
            <span>{x0.toFixed(3)}</span>
          </div>
          <Slider min={0.01} max={0.99} step={0.01} value={[x0]} onValueChange={([v]) => setX0(v)} />
        </div>

        {/* Lyapunov */}
        <div className="flex items-center gap-2 text-[10px]">
          <KaTeXRenderer latex={`\\lambda = ${lyapunov.toFixed(4)}`} className="font-mono" />
          <Badge variant="outline" className={`text-[9px] ${lyapunov > 0 ? 'border-red-500/40 text-red-400' : 'border-emerald-500/40 text-emerald-400'}`}>
            {lyapunov > 0 ? 'Chaotisch' : 'Stabil'}
          </Badge>
        </div>

        {/* Trajectory visualization */}
        <div className="relative bg-background/60 border border-border/20 rounded-lg p-2 overflow-hidden" style={{ height: barH + 20 }}>
          <svg width="100%" height={barH} viewBox={`0 0 ${trajectory.length} ${barH}`} preserveAspectRatio="none">
            {trajectory.map((val, i) => {
              const h = (val / (maxVal || 1)) * barH;
              const hue = (val / (maxVal || 1)) * 270;
              return (
                <rect key={i} x={i} y={barH - h} width={1} height={h} fill={`hsl(${hue}, 80%, 55%)`} opacity={0.8} />
              );
            })}
          </svg>
          <div className="absolute bottom-1 right-2 text-[8px] text-muted-foreground">
            {trajectory.length} Iterationen
          </div>
        </div>

        {/* Last values */}
        <div className="flex flex-wrap gap-1">
          {trajectory.slice(-8).map((v, i) => (
            <code key={i} className="text-[9px] bg-background/60 px-1 rounded text-muted-foreground">{v.toFixed(6)}</code>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════
   2. SHANNON ENTROPY CALCULATOR
   ═══════════════════════════════════════════ */
export function ShannonEntropySim() {
  const [probInput, setProbInput] = useState('0.5, 0.25, 0.125, 0.125');
  
  const { probs, entropy, maxEntropy, efficiency } = useMemo(() => {
    const raw = probInput.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n) && n > 0);
    const sum = raw.reduce((a, b) => a + b, 0);
    const normalized = raw.map(p => p / sum);
    const H = -normalized.reduce((s, p) => s + (p > 0 ? p * Math.log2(p) : 0), 0);
    const Hmax = Math.log2(normalized.length);
    return { probs: normalized, entropy: H, maxEntropy: Hmax, efficiency: Hmax > 0 ? H / Hmax : 0 };
  }, [probInput]);

  return (
    <Card className="border-border/30 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-display flex items-center gap-2">
          <span className="text-blue-400">📊</span>
          Shannon-Entropie — Live Calculator
        </CardTitle>
        <KaTeXRenderer latex="H(X) = -\\sum_{i} p(x_i) \\log_2 p(x_i)" displayMode className="text-xs mt-1" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-[10px] text-muted-foreground">Wahrscheinlichkeiten (kommagetrennt)</label>
          <Input
            value={probInput}
            onChange={(e) => setProbInput(e.target.value)}
            placeholder="0.5, 0.25, 0.125, 0.125"
            className="mt-1 bg-background/60 border-border/30 text-sm h-8 font-mono"
          />
        </div>

        {/* Distribution visualization */}
        <div className="flex items-end gap-1 h-20">
          {probs.map((p, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <code className="text-[8px] text-muted-foreground">{(p * 100).toFixed(1)}%</code>
              <div
                className="w-full rounded-t"
                style={{
                  height: `${p * 100}%`,
                  minHeight: 2,
                  backgroundColor: `hsl(${210 + i * 30}, 70%, 55%)`,
                }}
              />
              <code className="text-[8px] text-muted-foreground">x{i + 1}</code>
            </div>
          ))}
        </div>

        {/* Results */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-background/60 rounded p-2 text-center">
            <div className="text-[9px] text-muted-foreground">H(X)</div>
            <div className="text-sm font-mono font-bold text-blue-400">{entropy.toFixed(4)}</div>
            <div className="text-[8px] text-muted-foreground">bits</div>
          </div>
          <div className="bg-background/60 rounded p-2 text-center">
            <div className="text-[9px] text-muted-foreground">H_max</div>
            <div className="text-sm font-mono font-bold text-emerald-400">{maxEntropy.toFixed(4)}</div>
            <div className="text-[8px] text-muted-foreground">bits</div>
          </div>
          <div className="bg-background/60 rounded p-2 text-center">
            <div className="text-[9px] text-muted-foreground">Effizienz</div>
            <div className="text-sm font-mono font-bold text-amber-400">{(efficiency * 100).toFixed(1)}%</div>
            <div className="text-[8px] text-muted-foreground">H/H_max</div>
          </div>
        </div>

        {/* Info bits per symbol */}
        <div className="space-y-1">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Information pro Symbol:</span>
          {probs.map((p, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px]">
              <KaTeXRenderer latex={`-p(x_{${i + 1}}) \\log_2 p(x_{${i + 1}}) = ${(p > 0 ? -p * Math.log2(p) : 0).toFixed(4)}`} />
              <span className="text-muted-foreground">bits</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════
   3. BIRTHDAY ATTACK CALCULATOR
   ═══════════════════════════════════════════ */
export function BirthdayAttackSim() {
  const [hashBits, setHashBits] = useState(256);

  const stats = useMemo(() => {
    const spaceLog = hashBits;
    const collisionLog = hashBits / 2;
    const classicalOps = `2^${spaceLog}`;
    const birthdayOps = `2^${collisionLog}`;
    const groverOps = `2^${Math.floor(spaceLog / 2)}`;
    return { spaceLog, collisionLog, classicalOps, birthdayOps, groverOps };
  }, [hashBits]);

  return (
    <Card className="border-border/30 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-display flex items-center gap-2">
          <span className="text-amber-400">🎂</span>
          Birthday-Attacke & Grover — Simulator
        </CardTitle>
        <KaTeXRenderer latex="P(\\text{collision}) \\approx 1 - e^{-n^2/(2H)}" displayMode className="text-xs mt-1" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>Hash-Länge (Bits)</span>
            <Badge variant="outline" className="text-[9px]">{hashBits} bit</Badge>
          </div>
          <Slider min={32} max={512} step={8} value={[hashBits]} onValueChange={([v]) => setHashBits(v)} />
        </div>

        <div className="grid grid-cols-1 gap-2">
          <div className="bg-background/60 rounded p-3 flex items-center justify-between">
            <div>
              <div className="text-[9px] text-muted-foreground">Brute-Force (klassisch)</div>
              <KaTeXRenderer latex={`O(${stats.classicalOps})`} className="text-sm font-mono text-red-400" />
            </div>
            <div className="w-full max-w-[120px] h-2 bg-muted rounded-full ml-3">
              <div className="h-full bg-red-500 rounded-full" style={{ width: '100%' }} />
            </div>
          </div>
          <div className="bg-background/60 rounded p-3 flex items-center justify-between">
            <div>
              <div className="text-[9px] text-muted-foreground">Birthday-Attacke</div>
              <KaTeXRenderer latex={`O(${stats.birthdayOps})`} className="text-sm font-mono text-amber-400" />
            </div>
            <div className="w-full max-w-[120px] h-2 bg-muted rounded-full ml-3">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: '50%' }} />
            </div>
          </div>
          <div className="bg-background/60 rounded p-3 flex items-center justify-between">
            <div>
              <div className="text-[9px] text-muted-foreground">Grover (Quanten)</div>
              <KaTeXRenderer latex={`O(${stats.groverOps})`} className="text-sm font-mono text-purple-400" />
            </div>
            <div className="w-full max-w-[120px] h-2 bg-muted rounded-full ml-3">
              <div className="h-full bg-purple-500 rounded-full" style={{ width: '50%' }} />
            </div>
          </div>
        </div>

        <div className="text-[9px] text-muted-foreground bg-background/40 rounded p-2 font-mono">
          SHA-{hashBits}: Suchraum 2^{hashBits} → Birthday 2^{hashBits / 2} → Grover 2^{Math.floor(hashBits / 2)}
        </div>
      </CardContent>
    </Card>
  );
}
