import { useState, useMemo, Suspense, lazy } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Atom, Play, RotateCcw, Clock, ArrowLeft, Waves, Circle, Box } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ScatterChart, Scatter, ZAxis } from 'recharts';
import * as math from 'mathjs';

// Lazy load 3D Bloch sphere
const BlochSphere3D = lazy(() => import('./BlochSphere3D').then(m => ({ default: m.BlochSphere3D })));

// ==================== QUANTENZUSTANDS-TYPEN ====================

interface ComplexNumber {
  re: number;
  im: number;
}

interface QuantumState {
  amplitudes: ComplexNumber[];
  dimension: number;
}

interface DensityMatrix {
  elements: ComplexNumber[][];
  dimension: number;
}

// ==================== QUANTUM PRESETS ====================

interface QuantumPreset {
  name: string;
  description: string;
  state: QuantumState;
  hamiltonian: ComplexNumber[][];
}

const QUANTUM_PRESETS: Record<string, QuantumPreset> = {
  qubit_superposition: {
    name: 'Qubit Superposition |+⟩',
    description: '(|0⟩ + |1⟩)/√2 - Gleichgewichtete Superposition',
    state: {
      amplitudes: [
        { re: 1 / Math.sqrt(2), im: 0 },
        { re: 1 / Math.sqrt(2), im: 0 }
      ],
      dimension: 2
    },
    hamiltonian: [
      [{ re: 1, im: 0 }, { re: 0, im: 0 }],
      [{ re: 0, im: 0 }, { re: -1, im: 0 }]
    ]
  },
  qubit_phase: {
    name: 'Qubit mit Phase |ψ⟩',
    description: '(|0⟩ + i|1⟩)/√2 - Superposition mit Phasenunterschied',
    state: {
      amplitudes: [
        { re: 1 / Math.sqrt(2), im: 0 },
        { re: 0, im: 1 / Math.sqrt(2) }
      ],
      dimension: 2
    },
    hamiltonian: [
      [{ re: 0.5, im: 0 }, { re: 0.5, im: 0 }],
      [{ re: 0.5, im: 0 }, { re: 0.5, im: 0 }]
    ]
  },
  three_level: {
    name: 'Drei-Niveau System',
    description: 'Gleichverteilte Superposition über 3 Zustände',
    state: {
      amplitudes: [
        { re: 1 / Math.sqrt(3), im: 0 },
        { re: 1 / Math.sqrt(3), im: 0 },
        { re: 1 / Math.sqrt(3), im: 0 }
      ],
      dimension: 3
    },
    hamiltonian: [
      [{ re: 1, im: 0 }, { re: 0.5, im: 0 }, { re: 0, im: 0 }],
      [{ re: 0.5, im: 0 }, { re: 0, im: 0 }, { re: 0.5, im: 0 }],
      [{ re: 0, im: 0 }, { re: 0.5, im: 0 }, { re: -1, im: 0 }]
    ]
  },
  spin_up: {
    name: 'Spin-Up |↑⟩',
    description: 'Reiner |0⟩ Zustand',
    state: {
      amplitudes: [
        { re: 1, im: 0 },
        { re: 0, im: 0 }
      ],
      dimension: 2
    },
    hamiltonian: [
      [{ re: 1, im: 0 }, { re: 0, im: 0 }],
      [{ re: 0, im: 0 }, { re: -1, im: 0 }]
    ]
  }
};

// ==================== COMPLEX MATH HELPERS ====================

function complexMultiply(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
  return {
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re
  };
}

function complexAdd(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
  return { re: a.re + b.re, im: a.im + b.im };
}

function complexConjugate(a: ComplexNumber): ComplexNumber {
  return { re: a.re, im: -a.im };
}

function complexMagnitude(a: ComplexNumber): number {
  return Math.sqrt(a.re * a.re + a.im * a.im);
}

function complexExp(theta: number): ComplexNumber {
  return { re: Math.cos(theta), im: Math.sin(theta) };
}

function complexScale(a: ComplexNumber, s: number): ComplexNumber {
  return { re: a.re * s, im: a.im * s };
}

// ==================== DENSITY MATRIX OPERATIONS ====================

function stateToDensityMatrix(state: QuantumState): DensityMatrix {
  const n = state.dimension;
  const elements: ComplexNumber[][] = [];
  
  for (let i = 0; i < n; i++) {
    elements[i] = [];
    for (let j = 0; j < n; j++) {
      // ρ_ij = ψ_i * ψ_j^*
      elements[i][j] = complexMultiply(state.amplitudes[i], complexConjugate(state.amplitudes[j]));
    }
  }
  
  return { elements, dimension: n };
}

function densityMatrixToState(dm: DensityMatrix): QuantumState | null {
  // Extrahiere Hauptzustand aus Dichtematrix (nur für reine Zustände exakt)
  const n = dm.dimension;
  const amplitudes: ComplexNumber[] = [];
  
  // Finde den größten diagonalen Eintrag
  let maxDiag = 0;
  let maxIdx = 0;
  for (let i = 0; i < n; i++) {
    const mag = complexMagnitude(dm.elements[i][i]);
    if (mag > maxDiag) {
      maxDiag = mag;
      maxIdx = i;
    }
  }
  
  // Rekonstruiere Amplituden relativ zum größten Element
  const refPhase = Math.atan2(dm.elements[maxIdx][maxIdx].im, dm.elements[maxIdx][maxIdx].re);
  
  for (let i = 0; i < n; i++) {
    const rho_ii = dm.elements[i][i];
    const magnitude = Math.sqrt(complexMagnitude(rho_ii));
    
    if (i === maxIdx) {
      amplitudes[i] = { re: magnitude, im: 0 };
    } else {
      const rho_i_max = dm.elements[i][maxIdx];
      const phase = Math.atan2(rho_i_max.im, rho_i_max.re) - refPhase / 2;
      amplitudes[i] = { re: magnitude * Math.cos(phase), im: magnitude * Math.sin(phase) };
    }
  }
  
  return { amplitudes, dimension: n };
}

function traceOfDensityMatrix(dm: DensityMatrix): number {
  let trace = 0;
  for (let i = 0; i < dm.dimension; i++) {
    trace += dm.elements[i][i].re;
  }
  return trace;
}

function purityOfDensityMatrix(dm: DensityMatrix): number {
  // Tr(ρ²)
  let purity = 0;
  const n = dm.dimension;
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const product = complexMultiply(dm.elements[i][j], dm.elements[j][i]);
      purity += product.re;
    }
  }
  
  return purity;
}

// ==================== TIME EVOLUTION ====================

interface TimeEvolutionPoint {
  t: number;
  state: QuantumState;
  dm: DensityMatrix;
  direction: 'forward' | 'backward';
}

function evolveState(
  state: QuantumState,
  H: ComplexNumber[][],
  t: number
): QuantumState {
  // Vereinfachte Zeitentwicklung für diagonale Hamiltonians
  // U(t) = exp(-i H t)
  const n = state.dimension;
  const amplitudes: ComplexNumber[] = [];
  
  for (let i = 0; i < n; i++) {
    // Für jede Komponente: ψ_i(t) = Σ_j U_ij(t) ψ_j(0)
    let newAmp: ComplexNumber = { re: 0, im: 0 };
    
    for (let j = 0; j < n; j++) {
      // Diagonale Näherung: exp(-i E_i t) δ_ij
      // Für vollständige Evolution müssten wir H diagonalisieren
      if (i === j) {
        const energy = H[i][i].re;
        const phase = complexExp(-energy * t);
        newAmp = complexAdd(newAmp, complexMultiply(phase, state.amplitudes[j]));
      } else {
        // Off-diagonal coupling (vereinfacht)
        const coupling = complexMagnitude(H[i][j]);
        if (coupling > 1e-10) {
          const mixPhase = complexExp(-coupling * t * 0.5);
          const contribution = complexScale(
            complexMultiply(mixPhase, state.amplitudes[j]),
            Math.sin(coupling * t) * 0.3
          );
          newAmp = complexAdd(newAmp, contribution);
        }
      }
    }
    
    amplitudes[i] = newAmp;
  }
  
  // Normalisieren
  let norm = 0;
  for (const amp of amplitudes) {
    norm += complexMagnitude(amp) ** 2;
  }
  norm = Math.sqrt(norm);
  
  return {
    amplitudes: amplitudes.map(a => complexScale(a, 1 / norm)),
    dimension: n
  };
}

function evolveQuantum(
  initialState: QuantumState,
  H: ComplexNumber[][],
  tSpan: [number, number],
  numSteps: number = 200,
  backward: boolean = false
): TimeEvolutionPoint[] {
  const points: TimeEvolutionPoint[] = [];
  const [t0, tEnd] = tSpan;
  const dt = (tEnd - t0) / numSteps;
  
  let state = initialState;
  const direction = backward ? 'backward' : 'forward';
  const sign = backward ? -1 : 1;
  
  for (let i = 0; i <= numSteps; i++) {
    const t = t0 + i * dt * sign;
    state = evolveState(initialState, H, t * sign);
    const dm = stateToDensityMatrix(state);
    points.push({ t: Math.abs(t), state: { ...state }, dm, direction });
  }
  
  return backward ? points.reverse() : points;
}

// ==================== KOMPONENTE ====================

export function QuantumModule() {
  const [selectedPreset, setSelectedPreset] = useState<string>('qubit_superposition');
  const [evolutionTime, setEvolutionTime] = useState(5);
  const [result, setResult] = useState<{
    forward: TimeEvolutionPoint[];
    backward: TimeEvolutionPoint[];
    reconstructedState: QuantumState | null;
  } | null>(null);
  
  const preset = QUANTUM_PRESETS[selectedPreset];
  
  const handlePresetChange = (value: string) => {
    setSelectedPreset(value);
    setResult(null);
  };
  
  const solve = () => {
    const { state, hamiltonian } = preset;
    
    // Vorwärts-Evolution
    const forward = evolveQuantum(state, hamiltonian, [0, evolutionTime], 200, false);
    
    // Endzustand holen
    const finalState = forward[forward.length - 1].state;
    
    // Rückwärts-Evolution (Zeitumkehr: H → -H)
    const negH = hamiltonian.map(row => 
      row.map(c => ({ re: -c.re, im: -c.im }))
    );
    const backward = evolveQuantum(finalState, negH, [0, evolutionTime], 200, false);
    
    // Rekonstruierten Zustand aus finaler Dichtematrix
    const finalDM = backward[backward.length - 1].dm;
    const reconstructedState = densityMatrixToState(finalDM);
    
    setResult({ forward, backward, reconstructedState });
  };
  
  const reset = () => {
    setResult(null);
  };
  
  // Chart-Daten
  const chartData = useMemo(() => {
    if (!result) return [];
    
    const data: any[] = [];
    const step = Math.max(1, Math.floor(result.forward.length / 100));
    
    for (let i = 0; i < result.forward.length; i += step) {
      const fwd = result.forward[i];
      const bwd = result.backward[Math.min(i, result.backward.length - 1)];
      
      const point: any = { t: fwd.t.toFixed(3) };
      
      // Wahrscheinlichkeiten vorwärts
      fwd.state.amplitudes.forEach((amp, idx) => {
        point[`P${idx}_fwd`] = complexMagnitude(amp) ** 2;
      });
      
      // Wahrscheinlichkeiten rückwärts
      bwd.state.amplitudes.forEach((amp, idx) => {
        point[`P${idx}_bwd`] = complexMagnitude(amp) ** 2;
      });
      
      // Purity
      point['purity_fwd'] = purityOfDensityMatrix(fwd.dm);
      point['purity_bwd'] = purityOfDensityMatrix(bwd.dm);
      
      data.push(point);
    }
    
    return data;
  }, [result]);
  
  // Bloch-Kugel Daten (nur für 2D)
  const blochData = useMemo(() => {
    if (!result || preset.state.dimension !== 2) return null;
    
    const forwardBloch: { x: number; y: number; z: number; t: number }[] = [];
    const backwardBloch: { x: number; y: number; z: number; t: number }[] = [];
    
    const step = Math.max(1, Math.floor(result.forward.length / 50));
    
    for (let i = 0; i < result.forward.length; i += step) {
      const fwd = result.forward[i];
      const bwd = result.backward[Math.min(i, result.backward.length - 1)];
      
      // Bloch-Koordinaten aus Dichtematrix
      // x = 2*Re(ρ_01), y = 2*Im(ρ_01), z = ρ_00 - ρ_11
      const fwdDM = fwd.dm.elements;
      forwardBloch.push({
        x: 2 * fwdDM[0][1].re,
        y: 2 * fwdDM[0][1].im,
        z: fwdDM[0][0].re - fwdDM[1][1].re,
        t: fwd.t
      });
      
      const bwdDM = bwd.dm.elements;
      backwardBloch.push({
        x: 2 * bwdDM[0][1].re,
        y: 2 * bwdDM[0][1].im,
        z: bwdDM[0][0].re - bwdDM[1][1].re,
        t: bwd.t
      });
    }
    
    return { forwardBloch, backwardBloch };
  }, [result, preset]);
  
  // Fehlerberechnung
  const error = useMemo(() => {
    if (!result || !result.reconstructedState) return null;
    
    const original = preset.state.amplitudes;
    const reconstructed = result.reconstructedState.amplitudes;
    
    let fidelity = 0;
    for (let i = 0; i < original.length; i++) {
      const overlap = complexMultiply(complexConjugate(original[i]), reconstructed[i]);
      fidelity += overlap.re;
    }
    fidelity = Math.abs(fidelity) ** 2;
    
    return { fidelity, infidelity: 1 - fidelity };
  }, [result, preset]);
  
  const colors = ['hsl(var(--crypto-purple))', 'hsl(var(--crypto-blue))', 'hsl(142, 76%, 36%)'];
  const backwardColors = ['hsl(var(--crypto-gold))', 'hsl(0, 84%, 60%)', 'hsl(280, 70%, 50%)'];
  
  return (
    <Card className="border-crypto-purple/30 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-crypto-purple">
          <Atom className="w-5 h-5" />
          Quanten-Zeitumkehr
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Dichtematrix-Rekonstruktion und Zeitumkehr-Evolution für Quantenzustände
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preset-Auswahl */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Quantenzustand</Label>
          <Select value={selectedPreset} onValueChange={handlePresetChange}>
            <SelectTrigger className="bg-background/50 border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(QUANTUM_PRESETS).map(([key, p]) => (
                <SelectItem key={key} value={key}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="p-2 rounded bg-background/30 border border-border/30">
            <p className="text-xs text-muted-foreground">{preset.description}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {preset.state.amplitudes.map((amp, i) => (
                <span key={i} className="text-xs font-mono text-crypto-blue">
                  α{i} = {amp.re.toFixed(3)}{amp.im >= 0 ? '+' : ''}{amp.im.toFixed(3)}i
                </span>
              ))}
            </div>
          </div>
        </div>
        
        {/* Evolutionszeit */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Evolutionszeit T = {evolutionTime.toFixed(1)} (ℏ/E₀)
          </Label>
          <Slider
            value={[evolutionTime]}
            onValueChange={(v) => setEvolutionTime(v[0])}
            min={1}
            max={20}
            step={0.5}
            className="py-2"
          />
        </div>
        
        {/* Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={solve}
            className="flex-1 bg-crypto-purple hover:bg-crypto-purple/80"
          >
            <Play className="w-4 h-4 mr-2" />
            Evolution berechnen
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
                <Waves className="w-4 h-4" />
                Quanten-Zeitumkehr
              </h4>
              <div className="text-xs text-muted-foreground space-y-1 font-mono">
                <p>1. Vorwärts: |ψ(0)⟩ → |ψ(T)⟩ via U(T) = e^(-iHT)</p>
                <p>2. Dichtematrix: ρ(T) = |ψ(T)⟩⟨ψ(T)|</p>
                <p>3. Rückwärts: ρ(T) → ρ(0) via U†(T) = e^(+iHT)</p>
                <p>4. Rekonstruktion: |ψ(0)⟩ aus ρ(0)</p>
              </div>
            </div>
            
            {/* Zustandsvergleich */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-background/40 border border-border/30">
                <p className="text-xs text-muted-foreground mb-1">Original |ψ(0)⟩</p>
                <div className="font-mono text-xs text-foreground space-y-0.5">
                  {preset.state.amplitudes.map((amp, i) => (
                    <p key={i}>|{i}⟩: {amp.re.toFixed(4)}{amp.im >= 0 ? '+' : ''}{amp.im.toFixed(4)}i</p>
                  ))}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-background/40 border border-crypto-gold/30">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <ArrowLeft className="w-3 h-3" />
                  Rekonstruiert
                </p>
                <div className="font-mono text-xs text-crypto-gold space-y-0.5">
                  {result.reconstructedState?.amplitudes.map((amp, i) => (
                    <p key={i}>|{i}⟩: {amp.re.toFixed(4)}{amp.im >= 0 ? '+' : ''}{amp.im.toFixed(4)}i</p>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Fidelity */}
            {error && (
              <div className={`p-2 rounded text-xs ${error.fidelity > 0.99 ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'}`}>
                <span className="font-semibold">Fidelity:</span>{' '}
                {(error.fidelity * 100).toFixed(4)}% (Infidelity: {(error.infidelity * 100).toFixed(6)}%)
              </div>
            )}
            
            {/* Wahrscheinlichkeits-Chart */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground">Wahrscheinlichkeiten P(|n⟩) vs Zeit</h4>
              <div className="h-52 w-full">
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
                      domain={[0, 1]}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '11px'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    
                    {preset.state.amplitudes.map((_, i) => (
                      <Line
                        key={`fwd_${i}`}
                        type="monotone"
                        dataKey={`P${i}_fwd`}
                        stroke={colors[i % colors.length]}
                        strokeWidth={2}
                        dot={false}
                        name={`P(|${i}⟩) →`}
                      />
                    ))}
                    
                    {preset.state.amplitudes.map((_, i) => (
                      <Line
                        key={`bwd_${i}`}
                        type="monotone"
                        dataKey={`P${i}_bwd`}
                        stroke={backwardColors[i % backwardColors.length]}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        name={`P(|${i}⟩) ←`}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Bloch-Kugel Projektion (nur 2D) */}
            {blochData && (
              <div className="space-y-2">
                <div className="p-2 rounded-lg bg-background/40 border border-crypto-blue/20">
                  <h4 className="text-xs font-semibold text-crypto-blue flex items-center gap-2">
                    <Circle className="w-3 h-3" />
                    Bloch-Kugel Projektion (x-z Ebene)
                  </h4>
                </div>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis 
                        type="number"
                        dataKey="x"
                        name="x"
                        domain={[-1.1, 1.1]}
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={10}
                        label={{ value: 'x = 2Re(ρ₀₁)', position: 'bottom', fontSize: 10 }}
                      />
                      <YAxis 
                        type="number"
                        dataKey="z"
                        name="z"
                        domain={[-1.1, 1.1]}
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={10}
                        label={{ value: 'z = ρ₀₀-ρ₁₁', angle: -90, position: 'left', fontSize: 10 }}
                      />
                      <ZAxis type="number" dataKey="t" range={[20, 60]} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '11px'
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      
                      <Scatter
                        name="Vorwärts →"
                        data={blochData.forwardBloch}
                        fill="hsl(var(--crypto-purple))"
                        line={{ stroke: 'hsl(var(--crypto-purple))', strokeWidth: 1.5 }}
                      />
                      
                      <Scatter
                        name="Rückwärts ←"
                        data={blochData.backwardBloch}
                        fill="hsl(var(--crypto-gold))"
                        line={{ stroke: 'hsl(var(--crypto-gold))', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            
            {/* 3D Bloch-Kugel */}
            {blochData && preset.state.dimension === 2 && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-background/40 border border-crypto-gold/20">
                  <h4 className="text-sm font-semibold text-crypto-gold flex items-center gap-2 mb-2">
                    <Box className="w-4 h-4" />
                    3D Bloch-Kugel
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Interaktive Visualisierung des Qubit-Zustands auf der Bloch-Kugel
                  </p>
                </div>
                
                <Suspense fallback={
                  <div className="w-full h-72 rounded-lg border border-border/30 bg-background/50 flex items-center justify-center">
                    <div className="text-muted-foreground text-sm flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-crypto-purple border-t-transparent rounded-full animate-spin" />
                      Bloch-Kugel wird geladen...
                    </div>
                  </div>
                }>
                  <BlochSphere3D
                    x={blochData.forwardBloch[blochData.forwardBloch.length - 1]?.x || 0}
                    y={blochData.forwardBloch[blochData.forwardBloch.length - 1]?.y || 0}
                    z={blochData.forwardBloch[blochData.forwardBloch.length - 1]?.z || 0}
                    trajectory={blochData.forwardBloch}
                    showLabels={true}
                  />
                </Suspense>
                
                <div className="p-2 rounded bg-background/30 border border-border/20 text-xs text-muted-foreground">
                  <p><strong>Bloch-Kugel:</strong> Jeder Punkt auf der Oberfläche entspricht einem reinen Qubit-Zustand.</p>
                  <p className="mt-1">|0⟩ = Nordpol (z=1), |1⟩ = Südpol (z=-1), |±⟩ und |±i⟩ auf dem Äquator</p>
                </div>
              </div>
            )}
            
            {/* Dichtematrix-Formeln */}
            <div className="p-3 rounded-lg bg-background/30 border border-border/20">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">Dichtematrix-Formalismus</h4>
              <div className="font-mono text-xs text-foreground/80 space-y-0.5">
                <p>ρ = |ψ⟩⟨ψ| (reiner Zustand)</p>
                <p>Spur(ρ) = 1 (Normierung)</p>
                <p>Spur(ρ²) = 1 für reine, &lt;1 für gemischte</p>
                <p className="text-crypto-blue">U(t) = exp(-iHt/ℏ), Zeitumkehr: U†(t)</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
