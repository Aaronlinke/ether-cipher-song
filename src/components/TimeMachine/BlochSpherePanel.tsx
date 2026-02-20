import { useState, Suspense, lazy, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Atom, RotateCcw, Zap } from 'lucide-react';

const BlochSphere3D = lazy(() => import('./BlochSphere3D').then(m => ({ default: m.BlochSphere3D })));

// ═══════════════════════════════════════════════════════════════════════════
// BLOCH-KUGEL QUANTEN-PANEL
// Eigenständige Bloch-Sphäre mit Quanten-Gates und State-Presets
// ═══════════════════════════════════════════════════════════════════════════

interface QubitState { theta: number; phi: number; }

// Bloch-Koordinaten aus theta/phi (Kugelkoordinaten)
function stateToBloch(s: QubitState): { x: number; y: number; z: number } {
  return {
    x: Math.sin(s.theta) * Math.cos(s.phi),
    y: Math.sin(s.theta) * Math.sin(s.phi),
    z: Math.cos(s.theta)
  };
}

// Quanten-Gate Operationen (auf theta/phi)
const GATES: { name: string; label: string; color: string; apply: (s: QubitState) => QubitState }[] = [
  { name: 'Hadamard', label: 'H', color: '#a855f7', apply: (s) => ({ theta: Math.PI / 2 - s.theta, phi: s.phi }) },
  { name: 'Pauli-X', label: 'X', color: '#ef4444', apply: (s) => ({ theta: Math.PI - s.theta, phi: s.phi + Math.PI }) },
  { name: 'Pauli-Y', label: 'Y', color: '#22c55e', apply: (s) => ({ theta: Math.PI - s.theta, phi: Math.PI - s.phi }) },
  { name: 'Pauli-Z', label: 'Z', color: '#3b82f6', apply: (s) => ({ theta: s.theta, phi: s.phi + Math.PI }) },
  { name: 'S-Gate', label: 'S', color: '#f59e0b', apply: (s) => ({ theta: s.theta, phi: s.phi + Math.PI / 2 }) },
  { name: 'T-Gate', label: 'T', color: '#ec4899', apply: (s) => ({ theta: s.theta, phi: s.phi + Math.PI / 4 }) },
];

const PRESETS: { name: string; state: QubitState }[] = [
  { name: '|0⟩ Spin-Up', state: { theta: 0, phi: 0 } },
  { name: '|1⟩ Spin-Down', state: { theta: Math.PI, phi: 0 } },
  { name: '|+⟩ Hadamard', state: { theta: Math.PI / 2, phi: 0 } },
  { name: '|-⟩ Anti-Hadamard', state: { theta: Math.PI / 2, phi: Math.PI } },
  { name: '|+i⟩ Phase', state: { theta: Math.PI / 2, phi: Math.PI / 2 } },
  { name: '|-i⟩ Anti-Phase', state: { theta: Math.PI / 2, phi: -Math.PI / 2 } },
];

export function BlochSpherePanel() {
  const [state, setState] = useState<QubitState>({ theta: Math.PI / 4, phi: Math.PI / 4 });
  const [history, setHistory] = useState<QubitState[]>([]);
  const [gateLog, setGateLog] = useState<string[]>([]);

  const bloch = stateToBloch(state);

  const trajectory = useMemo(() =>
    history.map(s => stateToBloch(s)),
    [history]
  );

  const applyGate = (gate: typeof GATES[0]) => {
    setHistory(prev => [...prev.slice(-30), state]);
    setState(s => {
      const ns = gate.apply(s);
      return { theta: ((ns.theta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), phi: ns.phi };
    });
    setGateLog(prev => [...prev.slice(-10), gate.name]);
  };

  const setPreset = (preset: typeof PRESETS[0]) => {
    setHistory([]);
    setGateLog([]);
    setState(preset.state);
  };

  const reset = () => {
    setState({ theta: 0, phi: 0 });
    setHistory([]);
    setGateLog([]);
  };

  // Zustandsamplituden |ψ⟩ = cos(θ/2)|0⟩ + e^(iφ)sin(θ/2)|1⟩
  const alpha = { re: Math.cos(state.theta / 2), im: 0 };
  const beta = {
    re: Math.sin(state.theta / 2) * Math.cos(state.phi),
    im: Math.sin(state.theta / 2) * Math.sin(state.phi)
  };
  const probZero = alpha.re ** 2;
  const probOne = beta.re ** 2 + beta.im ** 2;

  return (
    <Card className="border-blue-400/30 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-blue-400">
              <Atom className="w-5 h-5" />
              Bloch-Kugel Quanten-Panel
            </CardTitle>
            <CardDescription className="font-mono text-xs mt-1">
              |ψ⟩ = cos(θ/2)|0⟩ + e^(iφ)sin(θ/2)|1⟩ • Interaktive Quanten-Gates
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="font-mono text-xs text-blue-400 border-blue-400/30">
              θ={state.theta.toFixed(2)} φ={state.phi.toFixed(2)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* 3D Bloch-Sphere */}
        <Suspense fallback={
          <div className="w-full h-64 rounded-lg border border-border/30 bg-black/40 flex items-center justify-center text-muted-foreground text-xs">
            Lade Bloch-Kugel...
          </div>
        }>
          <BlochSphere3D
            x={bloch.x}
            y={bloch.y}
            z={bloch.z}
            trajectory={trajectory}
            showLabels={true}
          />
        </Suspense>

        {/* State-Presets */}
        <div>
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Quanten-Zustände</Label>
          <div className="grid grid-cols-3 gap-1.5 mt-1">
            {PRESETS.map((preset) => (
              <Button
                key={preset.name}
                size="sm"
                variant="outline"
                onClick={() => setPreset(preset)}
                className="text-[10px] h-7 px-2 border-border/40 hover:border-blue-400/50"
              >
                {preset.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Quanten-Gates */}
        <div>
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Quanten-Gates</Label>
          <div className="grid grid-cols-6 gap-1.5 mt-1">
            {GATES.map((gate) => (
              <Button
                key={gate.name}
                size="sm"
                onClick={() => applyGate(gate)}
                className="h-9 text-sm font-bold font-mono"
                style={{ backgroundColor: gate.color + '30', borderColor: gate.color + '60', color: gate.color }}
                variant="outline"
              >
                {gate.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Manuelle Kontrolle */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[10px]">θ (Polar): {state.theta.toFixed(3)} rad</Label>
            <Slider
              value={[state.theta]}
              onValueChange={([v]) => setState(s => ({ ...s, theta: v }))}
              min={0} max={Math.PI} step={0.01}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-[10px]">φ (Azimuth): {state.phi.toFixed(3)} rad</Label>
            <Slider
              value={[state.phi]}
              onValueChange={([v]) => setState(s => ({ ...s, phi: v }))}
              min={-Math.PI} max={Math.PI} step={0.01}
              className="mt-1"
            />
          </div>
        </div>

        {/* Gate-Log */}
        {gateLog.length > 0 && (
          <div className="p-2 bg-muted/20 rounded text-[9px] font-mono">
            <span className="text-muted-foreground">Gate-Sequenz: </span>
            <span className="text-crypto-purple">{gateLog.join(' → ')}</span>
          </div>
        )}

        {/* Zustandswahrscheinlichkeiten */}
        <div className="grid grid-cols-4 gap-1.5">
          <div className="p-1.5 bg-muted/30 rounded text-center col-span-2">
            <div className="text-xs font-bold text-blue-400">P(|0⟩) = {(probZero * 100).toFixed(1)}%</div>
            <div className="w-full h-1 bg-muted rounded mt-1">
              <div className="h-full bg-blue-500 rounded" style={{ width: `${probZero * 100}%` }} />
            </div>
          </div>
          <div className="p-1.5 bg-muted/30 rounded text-center col-span-2">
            <div className="text-xs font-bold text-red-400">P(|1⟩) = {(probOne * 100).toFixed(1)}%</div>
            <div className="w-full h-1 bg-muted rounded mt-1">
              <div className="h-full bg-red-500 rounded" style={{ width: `${probOne * 100}%` }} />
            </div>
          </div>
          <div className="p-1.5 bg-muted/30 rounded text-center">
            <div className="text-xs font-bold text-crypto-purple">{bloch.x.toFixed(2)}</div>
            <div className="text-[8px] text-muted-foreground">⟨X⟩</div>
          </div>
          <div className="p-1.5 bg-muted/30 rounded text-center">
            <div className="text-xs font-bold text-green-400">{bloch.y.toFixed(2)}</div>
            <div className="text-[8px] text-muted-foreground">⟨Y⟩</div>
          </div>
          <div className="p-1.5 bg-muted/30 rounded text-center">
            <div className="text-xs font-bold text-amber-400">{bloch.z.toFixed(2)}</div>
            <div className="text-[8px] text-muted-foreground">⟨Z⟩</div>
          </div>
          <div className="p-1.5 bg-muted/30 rounded text-center">
            <Button size="sm" variant="ghost" onClick={reset} className="h-5 w-full p-0">
              <RotateCcw className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Amplituden */}
        <div className="p-2 bg-muted/20 rounded text-[9px] font-mono space-y-0.5 text-muted-foreground">
          <div>α = {alpha.re.toFixed(4)} (|0⟩-Amplitude)</div>
          <div>β = {beta.re.toFixed(4)} + {beta.im.toFixed(4)}i (|1⟩-Amplitude)</div>
          <div>|α|² + |β|² = {(probZero + probOne).toFixed(4)} (Normalisierung)</div>
        </div>
      </CardContent>
    </Card>
  );
}
