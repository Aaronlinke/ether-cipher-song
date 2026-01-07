import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Play, RotateCcw, TrendingUp, Zap } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

// ==================== CHAOS MAPS ====================

type ChaosMap = 'logistic' | 'sine' | 'tent' | 'gauss';

const CHAOS_MAPS: Record<ChaosMap, {
  name: string;
  f: (x: number, r: number) => number;
  rRange: [number, number];
  description: string;
  chaosThreshold: number;
}> = {
  logistic: {
    name: 'Logistische Abbildung',
    f: (x, r) => r * x * (1 - x),
    rRange: [2.5, 4.0],
    description: 'f(x) = rx(1-x) — Klassisches Chaos-System',
    chaosThreshold: 3.57
  },
  sine: {
    name: 'Sinus-Abbildung',
    f: (x, r) => r * Math.sin(Math.PI * x),
    rRange: [0.5, 1.0],
    description: 'f(x) = r·sin(πx) — Trigonometrisches Chaos',
    chaosThreshold: 0.87
  },
  tent: {
    name: 'Zelt-Abbildung',
    f: (x, r) => r * Math.min(x, 1 - x),
    rRange: [1.0, 2.0],
    description: 'f(x) = r·min(x, 1-x) — Stückweise linear',
    chaosThreshold: 1.5
  },
  gauss: {
    name: 'Gauß-Abbildung',
    f: (x, r) => Math.exp(-r * x * x) + x * 0.1,
    rRange: [4.0, 8.0],
    description: 'f(x) = e^(-rx²) — Exponentielles Chaos',
    chaosThreshold: 6.0
  }
};

// ==================== LYAPUNOV EXPONENT ====================

function calculateLyapunov(
  f: (x: number, r: number) => number,
  df: (x: number, r: number) => number,
  r: number,
  x0: number = 0.5,
  iterations: number = 1000,
  transient: number = 100
): number {
  let x = x0;
  let lyapunov = 0;
  
  // Skip transient
  for (let i = 0; i < transient; i++) {
    x = f(x, r);
  }
  
  // Calculate Lyapunov exponent
  for (let i = 0; i < iterations; i++) {
    const derivative = Math.abs(df(x, r));
    if (derivative > 0) {
      lyapunov += Math.log(derivative);
    }
    x = f(x, r);
  }
  
  return lyapunov / iterations;
}

// Numerical derivative
function numericalDerivative(f: (x: number, r: number) => number, x: number, r: number): number {
  const h = 1e-8;
  return (f(x + h, r) - f(x - h, r)) / (2 * h);
}

// ==================== BIFURCATION CALCULATION ====================

interface BifurcationPoint {
  r: number;
  x: number;
  lyapunov?: number;
}

function calculateBifurcation(
  mapType: ChaosMap,
  rMin: number,
  rMax: number,
  numR: number = 400,
  iterationsPerR: number = 200,
  transient: number = 500
): BifurcationPoint[] {
  const map = CHAOS_MAPS[mapType];
  const points: BifurcationPoint[] = [];
  const rStep = (rMax - rMin) / numR;
  
  for (let i = 0; i <= numR; i++) {
    const r = rMin + i * rStep;
    let x = 0.5;
    
    // Skip transient
    for (let j = 0; j < transient; j++) {
      x = map.f(x, r);
      if (!isFinite(x) || x < 0 || x > 1) {
        x = 0.5;
      }
    }
    
    // Collect attractor points
    const seen = new Set<string>();
    for (let j = 0; j < iterationsPerR; j++) {
      x = map.f(x, r);
      if (isFinite(x) && x >= 0 && x <= 1) {
        const key = `${r.toFixed(4)}-${x.toFixed(3)}`;
        if (!seen.has(key)) {
          seen.add(key);
          points.push({ r, x });
        }
      }
    }
  }
  
  return points;
}

// ==================== COMPONENT ====================

export function BifurcationDiagram() {
  const [mapType, setMapType] = useState<ChaosMap>('logistic');
  const [resolution, setResolution] = useState(300);
  const [isCalculating, setIsCalculating] = useState(false);
  const [points, setPoints] = useState<BifurcationPoint[]>([]);
  const [selectedR, setSelectedR] = useState<number | null>(null);
  const [lyapunovData, setLyapunovData] = useState<{ r: number; lambda: number }[]>([]);
  
  const map = CHAOS_MAPS[mapType];
  
  const handleCalculate = useCallback(() => {
    setIsCalculating(true);
    
    // Use setTimeout to allow UI to update
    setTimeout(() => {
      const bifPoints = calculateBifurcation(
        mapType,
        map.rRange[0],
        map.rRange[1],
        resolution,
        150,
        400
      );
      setPoints(bifPoints);
      
      // Calculate Lyapunov exponents
      const lyapunovPoints: { r: number; lambda: number }[] = [];
      const numR = 100;
      const rStep = (map.rRange[1] - map.rRange[0]) / numR;
      
      for (let i = 0; i <= numR; i++) {
        const r = map.rRange[0] + i * rStep;
        const lambda = calculateLyapunov(
          map.f,
          (x, r) => numericalDerivative(map.f, x, r),
          r
        );
        if (isFinite(lambda)) {
          lyapunovPoints.push({ r, lambda });
        }
      }
      setLyapunovData(lyapunovPoints);
      
      setIsCalculating(false);
    }, 50);
  }, [mapType, resolution, map]);
  
  const handleReset = () => {
    setPoints([]);
    setLyapunovData([]);
    setSelectedR(null);
  };
  
  // Orbit at selected r
  const orbitData = useMemo(() => {
    if (selectedR === null) return [];
    
    const orbit: { n: number; x: number }[] = [];
    let x = 0.5;
    
    // Skip transient
    for (let i = 0; i < 100; i++) {
      x = map.f(x, selectedR);
    }
    
    // Record orbit
    for (let i = 0; i < 100; i++) {
      x = map.f(x, selectedR);
      if (isFinite(x)) {
        orbit.push({ n: i, x });
      }
    }
    
    return orbit;
  }, [selectedR, map]);
  
  // Period detection
  const detectedPeriod = useMemo(() => {
    if (orbitData.length < 10) return null;
    
    const values = orbitData.map(p => p.x);
    const unique = new Set(values.map(v => v.toFixed(4)));
    
    if (unique.size <= 1) return 1;
    if (unique.size <= 2) return 2;
    if (unique.size <= 4) return 4;
    if (unique.size <= 8) return 8;
    return 'Chaos';
  }, [orbitData]);
  
  return (
    <Card className="border-crypto-purple/30 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-crypto-gold">
          <Sparkles className="w-5 h-5" />
          Bifurkationsdiagramm & Chaos-Analyse
          <Badge variant="outline" className="ml-2 text-xs border-crypto-purple/50">
            Lyapunov-Exponent • Periodenverdopplung
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/30 border border-border/50">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Chaos-Abbildung</Label>
            <Select value={mapType} onValueChange={(v) => setMapType(v as ChaosMap)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CHAOS_MAPS).map(([key, m]) => (
                  <SelectItem key={key} value={key}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Auflösung: {resolution} Punkte
            </Label>
            <Slider
              value={[resolution]}
              onValueChange={([v]) => setResolution(v)}
              min={100}
              max={500}
              step={50}
            />
          </div>
          
          <div className="flex items-end gap-2">
            <Button
              onClick={handleCalculate}
              disabled={isCalculating}
              className="flex-1"
            >
              {isCalculating ? (
                <>Berechne...</>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Berechnen
                </>
              )}
            </Button>
            <Button onClick={handleReset} variant="outline" size="icon">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
          
          {selectedR !== null && (
            <div className="p-2 rounded bg-crypto-purple/20 border border-crypto-purple/30">
              <div className="text-xs text-muted-foreground">r = {selectedR.toFixed(4)}</div>
              <div className="text-sm font-mono text-crypto-purple">
                Periode: {detectedPeriod}
              </div>
            </div>
          )}
        </div>
        
        {/* Formula Info */}
        <div className="p-3 rounded-lg bg-gradient-to-r from-crypto-purple/10 to-crypto-gold/10 border border-crypto-purple/30">
          <div className="text-sm font-mono text-crypto-gold">{map.description}</div>
          <div className="text-xs text-muted-foreground mt-1">
            Parameterbereich: r ∈ [{map.rRange[0]}, {map.rRange[1]}] | Chaos-Schwelle: r ≈ {map.chaosThreshold}
          </div>
        </div>
        
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Bifurcation Diagram */}
          <div className="h-[400px] bg-black/30 rounded-lg border border-crypto-purple/30 p-2">
            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
              <TrendingUp className="w-3 h-3" />
              Bifurkationsdiagramm (Klicke für Orbit)
            </div>
            <ResponsiveContainer width="100%" height="90%">
              <ScatterChart
                margin={{ top: 10, right: 10, bottom: 20, left: 40 }}
                onClick={(e) => {
                  if (e && e.activePayload?.[0]) {
                    setSelectedR(e.activePayload[0].payload.r);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.2)" />
                <XAxis
                  dataKey="r"
                  type="number"
                  domain={[map.rRange[0], map.rRange[1]]}
                  tick={{ fontSize: 10 }}
                  label={{ value: 'r (Parameter)', position: 'bottom', fontSize: 10 }}
                />
                <YAxis
                  dataKey="x"
                  type="number"
                  domain={[0, 1]}
                  tick={{ fontSize: 10 }}
                  label={{ value: 'x (Attraktor)', angle: -90, position: 'insideLeft', fontSize: 10 }}
                />
                <ReferenceLine x={map.chaosThreshold} stroke="hsl(var(--crypto-gold))" strokeDasharray="5 5" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload?.[0]) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-card p-2 rounded border border-border text-xs">
                          <div>r = {data.r?.toFixed(4)}</div>
                          <div>x = {data.x?.toFixed(4)}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter data={points} fill="hsl(var(--crypto-purple))">
                  {points.map((_, index) => (
                    <Cell key={index} fill="hsl(var(--crypto-purple))" fillOpacity={0.3} r={1} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          
          {/* Lyapunov Exponent */}
          <div className="h-[400px] bg-black/30 rounded-lg border border-crypto-purple/30 p-2">
            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
              <Zap className="w-3 h-3" />
              Lyapunov-Exponent λ(r)
            </div>
            <ResponsiveContainer width="100%" height="90%">
              <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.2)" />
                <XAxis
                  dataKey="r"
                  type="number"
                  domain={[map.rRange[0], map.rRange[1]]}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  dataKey="lambda"
                  type="number"
                  tick={{ fontSize: 10 }}
                  label={{ value: 'λ', angle: -90, position: 'insideLeft', fontSize: 12 }}
                />
                <ReferenceLine y={0} stroke="hsl(var(--crypto-gold))" strokeWidth={2} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload?.[0]) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-card p-2 rounded border border-border text-xs">
                          <div>r = {data.r?.toFixed(4)}</div>
                          <div>λ = {data.lambda?.toFixed(4)}</div>
                          <div className={data.lambda > 0 ? 'text-red-400' : 'text-green-400'}>
                            {data.lambda > 0 ? '🔥 Chaos' : '✨ Stabil'}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter data={lyapunovData}>
                  {lyapunovData.map((point, index) => (
                    <Cell 
                      key={index} 
                      fill={point.lambda > 0 ? 'hsl(0, 84%, 60%)' : 'hsl(142, 76%, 36%)'} 
                      r={2}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Orbit at selected r */}
        {selectedR !== null && orbitData.length > 0 && (
          <div className="h-[200px] bg-black/30 rounded-lg border border-crypto-purple/30 p-2">
            <div className="text-xs text-muted-foreground mb-2">
              Orbit bei r = {selectedR.toFixed(4)} (Periode: {detectedPeriod})
            </div>
            <ResponsiveContainer width="100%" height="85%">
              <ScatterChart margin={{ top: 5, right: 10, bottom: 5, left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.2)" />
                <XAxis dataKey="n" tick={{ fontSize: 10 }} />
                <YAxis dataKey="x" domain={[0, 1]} tick={{ fontSize: 10 }} />
                <Scatter data={orbitData} fill="hsl(var(--crypto-gold))" line={{ stroke: 'hsl(var(--crypto-gold))', strokeWidth: 1 }} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
        
        {/* Theory */}
        <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-xs text-muted-foreground">
          <p><strong>Bifurkation:</strong> Bei kritischen Parameterwerten verdoppelt sich die Periode des Attraktors.</p>
          <p><strong>Lyapunov-Exponent:</strong> λ &gt; 0 bedeutet Chaos (exponentielle Divergenz benachbarter Trajektorien).</p>
          <p><strong>Feigenbaum-Konstante:</strong> δ ≈ 4.669 — universelle Rate der Periodenverdopplung.</p>
        </div>
      </CardContent>
    </Card>
  );
}
