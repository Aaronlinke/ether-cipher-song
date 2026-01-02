import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingDown, Play, RotateCcw, Clock, ArrowLeft } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';

// ==================== DGL-TYPEN ====================

interface ODEPreset {
  name: string;
  description: string;
  f: (t: number, y: number[]) => number[];
  dimension: number;
  defaultY0: number[];
  formula: string;
}

const ODE_PRESETS: Record<string, ODEPreset> = {
  exponential: {
    name: 'Exponentielles Wachstum/Zerfall',
    description: 'dy/dt = -λy (Radioaktiver Zerfall)',
    f: (t, y) => [-0.5 * y[0]],
    dimension: 1,
    defaultY0: [10],
    formula: 'dy/dt = -λy, λ = 0.5'
  },
  harmonic: {
    name: 'Harmonischer Oszillator',
    description: "y'' + ω²y = 0 (Feder, Pendel)",
    f: (t, y) => [y[1], -4 * y[0]], // ω² = 4
    dimension: 2,
    defaultY0: [1, 0], // y(0) = 1, y'(0) = 0
    formula: "y'' + ω²y = 0, ω = 2"
  },
  damped: {
    name: 'Gedämpfter Oszillator',
    description: "y'' + 2γy' + ω²y = 0",
    f: (t, y) => [y[1], -0.3 * y[1] - 4 * y[0]], // γ = 0.15, ω² = 4
    dimension: 2,
    defaultY0: [2, 0],
    formula: "y'' + 0.3y' + 4y = 0"
  },
  lorenz: {
    name: 'Lorenz-System (Chaos)',
    description: 'Chaotisches 3D-System (vereinfacht)',
    f: (t, y) => {
      const sigma = 10, rho = 28, beta = 8/3;
      return [
        sigma * (y[1] - y[0]),
        y[0] * (rho - y[2]) - y[1],
        y[0] * y[1] - beta * y[2]
      ];
    },
    dimension: 3,
    defaultY0: [1, 1, 1],
    formula: 'dx/dt = σ(y-x), dy/dt = x(ρ-z)-y, dz/dt = xy-βz'
  },
  logistic: {
    name: 'Logistisches Wachstum',
    description: 'dy/dt = ry(1 - y/K)',
    f: (t, y) => [2 * y[0] * (1 - y[0] / 10)], // r=2, K=10
    dimension: 1,
    defaultY0: [1],
    formula: 'dy/dt = 2y(1 - y/10)'
  },
  vanderpol: {
    name: 'Van der Pol Oszillator',
    description: "y'' - μ(1-y²)y' + y = 0",
    f: (t, y) => [y[1], 1.5 * (1 - y[0] * y[0]) * y[1] - y[0]], // μ = 1.5
    dimension: 2,
    defaultY0: [2, 0],
    formula: "y'' - 1.5(1-y²)y' + y = 0"
  }
};

// ==================== RUNGE-KUTTA 4 (Rückwärts & Vorwärts) ====================

interface TrajectoryPoint {
  t: number;
  y: number[];
  direction: 'forward' | 'backward';
}

function rungeKutta4Step(
  f: (t: number, y: number[]) => number[],
  t: number,
  y: number[],
  h: number
): number[] {
  const k1 = f(t, y);
  const k2 = f(t + h/2, y.map((yi, i) => yi + h/2 * k1[i]));
  const k3 = f(t + h/2, y.map((yi, i) => yi + h/2 * k2[i]));
  const k4 = f(t + h, y.map((yi, i) => yi + h * k3[i]));
  
  return y.map((yi, i) => yi + (h/6) * (k1[i] + 2*k2[i] + 2*k3[i] + k4[i]));
}

function solveDGL(
  f: (t: number, y: number[]) => number[],
  y0: number[],
  tSpan: [number, number],
  numSteps: number = 500,
  backward: boolean = false
): TrajectoryPoint[] {
  const points: TrajectoryPoint[] = [];
  const [t0, tEnd] = tSpan;
  const h = (tEnd - t0) / numSteps;
  
  let t = backward ? tEnd : t0;
  let y = [...y0];
  const step = backward ? -Math.abs(h) : Math.abs(h);
  const direction = backward ? 'backward' : 'forward';
  
  // Bei Rückwärts: f → -f (Zeitumkehr)
  const effectiveF = backward 
    ? (t: number, y: number[]) => f(-t, y).map(v => -v)
    : f;
  
  points.push({ t, y: [...y], direction });
  
  for (let i = 0; i < numSteps; i++) {
    y = rungeKutta4Step(effectiveF, backward ? -t : t, y, Math.abs(step));
    t += step;
    points.push({ t, y: [...y], direction });
  }
  
  return backward ? points.reverse() : points;
}

// ==================== KOMPONENTE ====================

export function DifferentialEquationSolver() {
  const [selectedPreset, setSelectedPreset] = useState<string>('harmonic');
  const [endTime, setEndTime] = useState(10);
  const [y0Input, setY0Input] = useState('1, 0');
  const [result, setResult] = useState<{
    forward: TrajectoryPoint[];
    backward: TrajectoryPoint[];
    initialFromBackward: number[];
  } | null>(null);
  
  const preset = ODE_PRESETS[selectedPreset];
  
  const handlePresetChange = (value: string) => {
    setSelectedPreset(value);
    const newPreset = ODE_PRESETS[value];
    setY0Input(newPreset.defaultY0.join(', '));
    setResult(null);
  };
  
  const parseY0 = (): number[] => {
    return y0Input.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
  };
  
  const solve = () => {
    const y0 = parseY0();
    if (y0.length !== preset.dimension) {
      return;
    }
    
    // Vorwärts lösen: von t=0 zu t=endTime
    const forward = solveDGL(preset.f, y0, [0, endTime], 500, false);
    
    // Endzustand holen
    const yEnd = forward[forward.length - 1].y;
    
    // Rückwärts lösen: von t=endTime zurück zu t=0
    const backward = solveDGL(preset.f, yEnd, [0, endTime], 500, true);
    
    // Anfangszustand aus Rückwärtsrechnung
    const initialFromBackward = backward[0].y;
    
    setResult({ forward, backward, initialFromBackward });
  };
  
  const reset = () => {
    setResult(null);
    setY0Input(preset.defaultY0.join(', '));
  };
  
  // Chart-Daten vorbereiten
  const chartData = useMemo(() => {
    if (!result) return [];
    
    const data: any[] = [];
    const step = Math.max(1, Math.floor(result.forward.length / 200));
    
    for (let i = 0; i < result.forward.length; i += step) {
      const fwd = result.forward[i];
      const bwd = result.backward[i] || result.backward[result.backward.length - 1];
      
      const point: any = { t: fwd.t.toFixed(3) };
      
      // Vorwärts-Werte
      fwd.y.forEach((val, idx) => {
        point[`y${idx}_fwd`] = val;
      });
      
      // Rückwärts-Werte
      bwd.y.forEach((val, idx) => {
        point[`y${idx}_bwd`] = val;
      });
      
      data.push(point);
    }
    
    return data;
  }, [result]);
  
  // Fehler berechnen
  const error = useMemo(() => {
    if (!result) return null;
    const y0 = parseY0();
    const reconstructed = result.initialFromBackward;
    
    const maxError = Math.max(...y0.map((val, i) => Math.abs(val - reconstructed[i])));
    const relError = Math.max(...y0.map((val, i) => 
      val !== 0 ? Math.abs((val - reconstructed[i]) / val) * 100 : Math.abs(reconstructed[i])
    ));
    
    return { maxError, relError };
  }, [result, y0Input]);
  
  const colors = ['hsl(var(--crypto-purple))', 'hsl(var(--crypto-blue))', 'hsl(142, 76%, 36%)'];
  const backwardColors = ['hsl(45, 93%, 47%)', 'hsl(0, 84%, 60%)', 'hsl(300, 76%, 50%)'];
  
  return (
    <Card className="border-crypto-purple/30 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-crypto-purple">
          <TrendingDown className="w-5 h-5" />
          DGL-Rückwärts-Löser
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Differentialgleichungen rückwärts in der Zeit integrieren
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* DGL-Auswahl */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Differentialgleichung</Label>
          <Select value={selectedPreset} onValueChange={handlePresetChange}>
            <SelectTrigger className="bg-background/50 border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ODE_PRESETS).map(([key, p]) => (
                <SelectItem key={key} value={key}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="p-2 rounded bg-background/30 border border-border/30">
            <code className="text-xs text-crypto-blue font-mono">{preset.formula}</code>
            <p className="text-xs text-muted-foreground mt-1">{preset.description}</p>
          </div>
        </div>
        
        {/* Parameter */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Anfangswerte y(0) ({preset.dimension}D)
            </Label>
            <Input
              value={y0Input}
              onChange={(e) => setY0Input(e.target.value)}
              placeholder="1, 0"
              className="bg-background/50 border-border/50 font-mono text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Endzeit T</Label>
            <Input
              type="number"
              value={endTime}
              onChange={(e) => setEndTime(parseFloat(e.target.value) || 10)}
              className="bg-background/50 border-border/50 font-mono text-sm"
            />
          </div>
        </div>
        
        {/* Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={solve}
            className="flex-1 bg-crypto-purple hover:bg-crypto-purple/80"
          >
            <Play className="w-4 h-4 mr-2" />
            Lösen & Rückrechnen
          </Button>
          <Button
            onClick={reset}
            variant="outline"
            className="border-border/50"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Ergebnisse */}
        {result && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Algorithmus-Erklärung */}
            <div className="p-3 rounded-lg bg-background/40 border border-crypto-purple/20">
              <h4 className="text-sm font-semibold text-crypto-purple flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4" />
                Zeitumkehr-Algorithmus
              </h4>
              <div className="text-xs text-muted-foreground space-y-1 font-mono">
                <p>1. Vorwärts: y(0) → y(T) via Runge-Kutta-4</p>
                <p>2. Rückwärts: y(T) → y(0) mit f(t,y) → -f(-t,y)</p>
                <p>3. Verifikation: y_rekonstruiert ≈ y_original</p>
              </div>
            </div>
            
            {/* Rekonstruktion */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-background/40 border border-border/30">
                <p className="text-xs text-muted-foreground mb-1">Original y(0)</p>
                <p className="font-mono text-sm text-foreground">
                  [{parseY0().map(v => v.toFixed(4)).join(', ')}]
                </p>
              </div>
              <div className="p-3 rounded-lg bg-background/40 border border-crypto-gold/30">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <ArrowLeft className="w-3 h-3" />
                  Rekonstruiert
                </p>
                <p className="font-mono text-sm text-crypto-gold">
                  [{result.initialFromBackward.map(v => v.toFixed(4)).join(', ')}]
                </p>
              </div>
            </div>
            
            {/* Fehler */}
            {error && (
              <div className={`p-2 rounded text-xs ${error.maxError < 1e-6 ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'}`}>
                <span className="font-semibold">Rekonstruktionsfehler:</span>{' '}
                {error.maxError.toExponential(2)} (absolut), {error.relError.toFixed(4)}% (relativ)
              </div>
            )}
            
            {/* Chart */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="t" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={10}
                    tickFormatter={(v) => parseFloat(v).toFixed(1)}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={10}
                    tickFormatter={(v) => v.toFixed(1)}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '11px'
                    }}
                    formatter={(value: number, name: string) => [value.toFixed(4), name]}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '10px' }}
                    formatter={(value) => value.replace('_fwd', ' →').replace('_bwd', ' ←')}
                  />
                  <ReferenceLine x="0" stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  
                  {/* Vorwärts-Linien */}
                  {Array.from({ length: preset.dimension }).map((_, i) => (
                    <Line
                      key={`fwd_${i}`}
                      type="monotone"
                      dataKey={`y${i}_fwd`}
                      stroke={colors[i % colors.length]}
                      strokeWidth={2}
                      dot={false}
                      name={`y${i} →`}
                    />
                  ))}
                  
                  {/* Rückwärts-Linien */}
                  {Array.from({ length: preset.dimension }).map((_, i) => (
                    <Line
                      key={`bwd_${i}`}
                      type="monotone"
                      dataKey={`y${i}_bwd`}
                      stroke={backwardColors[i % backwardColors.length]}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name={`y${i} ←`}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {/* Legende */}
            <div className="flex justify-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-4 h-0.5 bg-crypto-purple"></span>
                Vorwärts (t: 0→T)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-0.5 bg-crypto-gold" style={{ borderBottom: '2px dashed' }}></span>
                Rückwärts (t: T→0)
              </span>
            </div>
            
            {/* Formeln */}
            <div className="p-3 rounded-lg bg-background/30 border border-border/20">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">Runge-Kutta 4 (RK4)</h4>
              <div className="font-mono text-xs text-foreground/80 space-y-0.5">
                <p>k₁ = f(tₙ, yₙ)</p>
                <p>k₂ = f(tₙ + h/2, yₙ + h·k₁/2)</p>
                <p>k₃ = f(tₙ + h/2, yₙ + h·k₂/2)</p>
                <p>k₄ = f(tₙ + h, yₙ + h·k₃)</p>
                <p className="text-crypto-blue">yₙ₊₁ = yₙ + (h/6)(k₁ + 2k₂ + 2k₃ + k₄)</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
