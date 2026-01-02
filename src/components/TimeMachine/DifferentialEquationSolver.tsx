import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingDown, Play, RotateCcw, Clock, ArrowLeft, Edit3, AlertCircle, CheckCircle, Orbit } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, ScatterChart, Scatter, ZAxis } from 'recharts';
import * as math from 'mathjs';

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
  },
  custom: {
    name: '✨ Eigene Formel',
    description: 'Definiere deine eigene DGL mit mathjs-Syntax',
    f: () => [0], // wird überschrieben
    dimension: 1,
    defaultY0: [1],
    formula: 'Benutzerdefiniert'
  }
};

// ==================== CUSTOM FORMULA PARSER ====================

interface CustomFormulaResult {
  f: (t: number, y: number[]) => number[];
  dimension: number;
  error: string | null;
}

function parseCustomFormula(formulas: string[]): CustomFormulaResult {
  const dimension = formulas.length;
  
  try {
    // Compile alle Formeln
    const compiled = formulas.map((formula, idx) => {
      if (!formula.trim()) {
        throw new Error(`Formel ${idx + 1} ist leer`);
      }
      return math.compile(formula);
    });
    
    // Test-Evaluation
    const testScope = {
      t: 0,
      y0: 1, y1: 0, y2: 0, y3: 0,
      y: [1, 0, 0, 0],
      sin: Math.sin, cos: Math.cos, exp: Math.exp,
      sqrt: Math.sqrt, abs: Math.abs, log: Math.log,
      pi: Math.PI, e: Math.E
    };
    
    compiled.forEach((c, idx) => {
      const result = c.evaluate(testScope);
      if (typeof result !== 'number' || !isFinite(result)) {
        throw new Error(`Formel ${idx + 1} ergibt keinen gültigen Wert`);
      }
    });
    
    // Erstelle Funktion
    const f = (t: number, y: number[]): number[] => {
      const scope: Record<string, any> = {
        t,
        y0: y[0] ?? 0,
        y1: y[1] ?? 0,
        y2: y[2] ?? 0,
        y3: y[3] ?? 0,
        y,
        sin: Math.sin, cos: Math.cos, exp: Math.exp,
        sqrt: Math.sqrt, abs: Math.abs, log: Math.log,
        pow: Math.pow, tan: Math.tan, atan: Math.atan,
        pi: Math.PI, e: Math.E
      };
      
      return compiled.map(c => {
        try {
          const result = c.evaluate(scope);
          return isFinite(result) ? result : 0;
        } catch {
          return 0;
        }
      });
    };
    
    return { f, dimension, error: null };
    
  } catch (err) {
    return {
      f: () => Array(dimension).fill(0),
      dimension,
      error: err instanceof Error ? err.message : 'Unbekannter Fehler'
    };
  }
}

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
  
  // Custom formula state
  const [customFormulas, setCustomFormulas] = useState<string[]>(['-0.5 * y0']);
  const [customDimension, setCustomDimension] = useState(1);
  const [formulaError, setFormulaError] = useState<string | null>(null);
  
  const preset = ODE_PRESETS[selectedPreset];
  const isCustom = selectedPreset === 'custom';
  
  // Parse custom formula
  const customResult = useMemo(() => {
    if (!isCustom) return null;
    return parseCustomFormula(customFormulas);
  }, [isCustom, customFormulas]);
  
  // Get effective function and dimension
  const getEffectiveF = useCallback((): ((t: number, y: number[]) => number[]) => {
    if (isCustom && customResult && !customResult.error) {
      return customResult.f;
    }
    return preset.f;
  }, [isCustom, customResult, preset]);
  
  const getEffectiveDimension = useCallback((): number => {
    if (isCustom) return customDimension;
    return preset.dimension;
  }, [isCustom, customDimension, preset]);
  
  const handlePresetChange = (value: string) => {
    setSelectedPreset(value);
    const newPreset = ODE_PRESETS[value];
    if (value === 'custom') {
      setY0Input(Array(customDimension).fill(1).join(', '));
    } else {
      setY0Input(newPreset.defaultY0.join(', '));
    }
    setResult(null);
    setFormulaError(null);
  };
  
  const handleDimensionChange = (newDim: number) => {
    const clampedDim = Math.max(1, Math.min(4, newDim));
    setCustomDimension(clampedDim);
    
    // Adjust formulas array
    const newFormulas = [...customFormulas];
    while (newFormulas.length < clampedDim) {
      newFormulas.push('0');
    }
    while (newFormulas.length > clampedDim) {
      newFormulas.pop();
    }
    setCustomFormulas(newFormulas);
    setY0Input(Array(clampedDim).fill(1).join(', '));
    setResult(null);
  };
  
  const handleFormulaChange = (index: number, value: string) => {
    const newFormulas = [...customFormulas];
    newFormulas[index] = value;
    setCustomFormulas(newFormulas);
    setFormulaError(null);
    setResult(null);
  };
  
  const parseY0 = (): number[] => {
    return y0Input.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
  };
  
  const solve = () => {
    const y0 = parseY0();
    const effectiveDim = getEffectiveDimension();
    
    if (y0.length !== effectiveDim) {
      setFormulaError(`Anfangswerte müssen ${effectiveDim} Komponenten haben`);
      return;
    }
    
    if (isCustom && customResult?.error) {
      setFormulaError(customResult.error);
      return;
    }
    
    const f = getEffectiveF();
    setFormulaError(null);
    
    // Vorwärts lösen: von t=0 zu t=endTime
    const forward = solveDGL(f, y0, [0, endTime], 500, false);
    
    // Endzustand holen
    const yEnd = forward[forward.length - 1].y;
    
    // Rückwärts lösen: von t=endTime zurück zu t=0
    const backward = solveDGL(f, yEnd, [0, endTime], 500, true);
    
    // Anfangszustand aus Rückwärtsrechnung
    const initialFromBackward = backward[0].y;
    
    setResult({ forward, backward, initialFromBackward });
  };
  
  const reset = () => {
    setResult(null);
    if (isCustom) {
      setY0Input(Array(customDimension).fill(1).join(', '));
    } else {
      setY0Input(preset.defaultY0.join(', '));
    }
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
  
  const colors = ['hsl(var(--crypto-purple))', 'hsl(var(--crypto-blue))', 'hsl(142, 76%, 36%)', 'hsl(280, 70%, 50%)'];
  const backwardColors = ['hsl(45, 93%, 47%)', 'hsl(0, 84%, 60%)', 'hsl(300, 76%, 50%)', 'hsl(180, 70%, 50%)'];
  
  const effectiveDimension = getEffectiveDimension();
  
  // Phasenraum-Daten für 2D+ Systeme (y0 vs y1)
  const phaseSpaceData = useMemo(() => {
    if (!result || effectiveDimension < 2) return null;
    
    const forwardPhase: { y0: number; y1: number; index: number }[] = [];
    const backwardPhase: { y0: number; y1: number; index: number }[] = [];
    
    const step = Math.max(1, Math.floor(result.forward.length / 300));
    
    for (let i = 0; i < result.forward.length; i += step) {
      const fwd = result.forward[i];
      const bwd = result.backward[i] || result.backward[result.backward.length - 1];
      
      forwardPhase.push({ y0: fwd.y[0], y1: fwd.y[1], index: i });
      backwardPhase.push({ y0: bwd.y[0], y1: bwd.y[1], index: i });
    }
    
    return { forwardPhase, backwardPhase };
  }, [result, effectiveDimension]);
  
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
          
          {/* Standard preset info */}
          {!isCustom && (
            <div className="p-2 rounded bg-background/30 border border-border/30">
              <code className="text-xs text-crypto-blue font-mono">{preset.formula}</code>
              <p className="text-xs text-muted-foreground mt-1">{preset.description}</p>
            </div>
          )}
          
          {/* Custom formula editor */}
          {isCustom && (
            <div className="space-y-3 p-3 rounded-lg bg-background/40 border border-crypto-purple/30">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-crypto-purple" />
                <span className="text-sm font-medium text-crypto-purple">Eigene DGL definieren</span>
              </div>
              
              {/* Dimension selector */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Dimension (1-4)</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map(dim => (
                    <Button
                      key={dim}
                      size="sm"
                      variant={customDimension === dim ? "default" : "outline"}
                      className={customDimension === dim ? "bg-crypto-purple" : "border-border/50"}
                      onClick={() => handleDimensionChange(dim)}
                    >
                      {dim}D
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Formula inputs */}
              <div className="space-y-2">
                {customFormulas.map((formula, idx) => (
                  <div key={idx} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      dy{idx}/dt =
                    </Label>
                    <Textarea
                      value={formula}
                      onChange={(e) => handleFormulaChange(idx, e.target.value)}
                      placeholder={`z.B. -0.5 * y${idx} oder y${idx}^2 - t`}
                      className="bg-background/50 border-border/50 font-mono text-sm h-12 resize-none"
                    />
                  </div>
                ))}
              </div>
              
              {/* Syntax help */}
              <div className="p-2 rounded bg-background/30 border border-border/20 text-xs">
                <p className="text-muted-foreground mb-1 font-semibold">Variablen & Syntax:</p>
                <div className="grid grid-cols-2 gap-1 text-muted-foreground/80 font-mono">
                  <span>t - Zeit</span>
                  <span>y0, y1, y2... - Komponenten</span>
                  <span>sin, cos, tan, exp, log</span>
                  <span>sqrt, abs, pow</span>
                  <span>pi, e</span>
                  <span>+, -, *, /, ^</span>
                </div>
              </div>
              
              {/* Validation status */}
              {customResult && (
                <div className={`flex items-center gap-2 text-xs ${customResult.error ? 'text-red-400' : 'text-green-400'}`}>
                  {customResult.error ? (
                    <>
                      <AlertCircle className="w-3 h-3" />
                      <span>{customResult.error}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3 h-3" />
                      <span>Formel ist gültig ({customDimension}D System)</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Error display */}
        {formulaError && (
          <div className="p-2 rounded bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
            <AlertCircle className="w-3 h-3" />
            {formulaError}
          </div>
        )}
        
        {/* Parameter */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Anfangswerte y(0) ({effectiveDimension}D)
            </Label>
            <Input
              value={y0Input}
              onChange={(e) => setY0Input(e.target.value)}
              placeholder={Array(effectiveDimension).fill('1').join(', ')}
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
            disabled={isCustom && !!customResult?.error}
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
                  {Array.from({ length: effectiveDimension }).map((_, i) => (
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
                  {Array.from({ length: effectiveDimension }).map((_, i) => (
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
            
            {/* Legende Zeit-Plot */}
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
            
            {/* Phasenraum-Plot für 2D+ Systeme */}
            {phaseSpaceData && (
              <div className="space-y-3 mt-4">
                <div className="p-3 rounded-lg bg-background/40 border border-crypto-blue/20">
                  <h4 className="text-sm font-semibold text-crypto-blue flex items-center gap-2 mb-2">
                    <Orbit className="w-4 h-4" />
                    Phasenraum (y₀ vs y₁)
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Spiralen, Grenzzyklen und chaotische Attraktoren visualisiert
                  </p>
                </div>
                
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis 
                        type="number"
                        dataKey="y0" 
                        name="y₀"
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={10}
                        tickFormatter={(v) => v.toFixed(1)}
                        label={{ value: 'y₀', position: 'bottom', fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        type="number"
                        dataKey="y1"
                        name="y₁"
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={10}
                        tickFormatter={(v) => v.toFixed(1)}
                        label={{ value: 'y₁', angle: -90, position: 'left', fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <ZAxis type="number" dataKey="index" range={[10, 50]} />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '11px'
                        }}
                        formatter={(value: number) => value.toFixed(4)}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      
                      {/* Vorwärts-Trajektorie */}
                      <Scatter
                        name="Vorwärts →"
                        data={phaseSpaceData.forwardPhase}
                        fill="hsl(var(--crypto-purple))"
                        line={{ stroke: 'hsl(var(--crypto-purple))', strokeWidth: 1.5 }}
                        shape="circle"
                      />
                      
                      {/* Rückwärts-Trajektorie */}
                      <Scatter
                        name="Rückwärts ←"
                        data={phaseSpaceData.backwardPhase}
                        fill="hsl(var(--crypto-gold))"
                        line={{ stroke: 'hsl(var(--crypto-gold))', strokeWidth: 1.5, strokeDasharray: '5 5' }}
                        shape="diamond"
                      />
                      
                      {/* Startpunkt markieren */}
                      <Scatter
                        name="Start y(0)"
                        data={[phaseSpaceData.forwardPhase[0]]}
                        fill="hsl(142, 76%, 36%)"
                        shape="star"
                      />
                      
                      {/* Endpunkt markieren */}
                      <Scatter
                        name="Ende y(T)"
                        data={[phaseSpaceData.forwardPhase[phaseSpaceData.forwardPhase.length - 1]]}
                        fill="hsl(0, 84%, 60%)"
                        shape="cross"
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Phasenraum-Info */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-green-500/10 border border-green-500/30 flex items-center gap-2">
                    <span className="text-green-400">★</span>
                    <span className="text-green-400">Startpunkt y(0)</span>
                  </div>
                  <div className="p-2 rounded bg-red-500/10 border border-red-500/30 flex items-center gap-2">
                    <span className="text-red-400">✕</span>
                    <span className="text-red-400">Endpunkt y(T)</span>
                  </div>
                </div>
                
                {/* Typische Muster */}
                <div className="p-3 rounded-lg bg-background/30 border border-border/20">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">Typische Phasenraum-Muster</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground/80">
                    <div><span className="text-crypto-purple">●</span> Ellipse/Kreis = Harmonischer Oszillator</div>
                    <div><span className="text-crypto-blue">●</span> Spirale nach innen = Gedämpft</div>
                    <div><span className="text-crypto-gold">●</span> Geschlossene Kurve = Grenzzyklus</div>
                    <div><span className="text-red-400">●</span> Chaotisch = Seltsamer Attraktor</div>
                  </div>
                </div>
              </div>
            )}
            
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
