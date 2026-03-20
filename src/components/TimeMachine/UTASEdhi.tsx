import { useState, useCallback } from 'react';
import { CryptoPanel } from '../CryptoPanel';
import { Zap, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface FVFieldState {
  gradient: number[];
  residualKernel: number;
  phaseConjugation: number[];
  entropyCollapse: number;
  iterations: number;
  status: 'idle' | 'running' | 'complete';
  decomposedBits: string;
  fvManifold: { x: number; y: number; intensity: number }[];
}

export function UTASEdhi() {
  const [hashInput, setHashInput] = useState('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  const [state, setState] = useState<FVFieldState>({
    gradient: [],
    residualKernel: 0,
    phaseConjugation: [],
    entropyCollapse: 0,
    iterations: 0,
    status: 'idle',
    decomposedBits: '',
    fvManifold: [],
  });

  const computeFVGradient = useCallback((hash: string): number[] => {
    const bytes = [];
    for (let i = 0; i < hash.length; i += 2) {
      bytes.push(parseInt(hash.substring(i, i + 2), 16) / 255);
    }
    // ∇_HFV Φ(t) — Gradient des fraktalen Verschränkungsfeldes
    const gradient: number[] = [];
    for (let i = 1; i < bytes.length; i++) {
      const diff = bytes[i] - bytes[i - 1];
      const torsion = Math.sin(diff * Math.PI * 2) * Math.cos(bytes[i] * Math.PI);
      gradient.push(torsion);
    }
    return gradient;
  }, []);

  const computeResidualKernel = useCallback((gradient: number[]): number => {
    // Res(K) — deterministische Restinformation
    let residual = 0;
    for (let i = 0; i < gradient.length; i++) {
      residual += gradient[i] * Math.pow(-1, i) * Math.exp(-Math.abs(gradient[i]));
    }
    return residual;
  }, []);

  const phaseConjugate = useCallback((gradient: number[], kernel: number): number[] => {
    // Phasen-Konjugation auf EM-Kohärenz
    return gradient.map((g, i) => {
      const phase = Math.atan2(Math.sin(g * Math.PI + kernel), Math.cos(g * Math.PI * i / gradient.length));
      return phase / Math.PI;
    });
  }, []);

  const generateManifold = useCallback((gradient: number[], conjugation: number[]): { x: number; y: number; intensity: number }[] => {
    const points: { x: number; y: number; intensity: number }[] = [];
    for (let i = 0; i < Math.min(gradient.length, conjugation.length); i++) {
      points.push({
        x: gradient[i],
        y: conjugation[i],
        intensity: Math.abs(gradient[i] * conjugation[i]),
      });
    }
    return points;
  }, []);

  const runEDHI = useCallback(() => {
    if (hashInput.length < 8) return;

    setState(prev => ({ ...prev, status: 'running', iterations: 0 }));

    const cleanHash = hashInput.replace(/\s/g, '').toLowerCase();
    
    let currentIteration = 0;
    const maxIterations = 64;

    const step = () => {
      currentIteration++;
      
      // Fractional-Bit-Encoding — Strömung auf der Mannigfaltigkeit
      const perturbedHash = cleanHash.split('').map((c, i) => {
        if (i < currentIteration && /[0-9a-f]/.test(c)) {
          const val = parseInt(c, 16);
          const shifted = (val + currentIteration) % 16;
          return shifted.toString(16);
        }
        return c;
      }).join('');

      const gradient = computeFVGradient(perturbedHash);
      const kernel = computeResidualKernel(gradient);
      const conjugation = phaseConjugate(gradient, kernel);
      const manifold = generateManifold(gradient, conjugation);

      // Entropy Collapse Metric
      const entropy = gradient.reduce((sum, g) => sum - (Math.abs(g) > 0 ? Math.abs(g) * Math.log2(Math.abs(g) + 1e-10) : 0), 0);

      // Decomposed Bits — Rückprojektion
      const bits = conjugation.map(c => c > 0 ? '1' : '0').join('');

      setState({
        gradient,
        residualKernel: kernel,
        phaseConjugation: conjugation,
        entropyCollapse: entropy,
        iterations: currentIteration,
        status: currentIteration >= maxIterations ? 'complete' : 'running',
        decomposedBits: bits,
        fvManifold: manifold,
      });

      if (currentIteration < maxIterations) {
        setTimeout(step, 50);
      }
    };

    step();
  }, [hashInput, computeFVGradient, computeResidualKernel, phaseConjugate, generateManifold]);

  const reset = () => {
    setState({
      gradient: [],
      residualKernel: 0,
      phaseConjugation: [],
      entropyCollapse: 0,
      iterations: 0,
      status: 'idle',
      decomposedBits: '',
      fvManifold: [],
    });
  };

  return (
    <CryptoPanel title="UTAS — EDHI Hash-Inverter" icon={<Zap size={16} />} glowColor="purple">
      <div className="space-y-4">
        {/* Theorie-Header */}
        <div className="bg-crypto-purple/5 border border-crypto-purple/20 rounded p-3">
          <p className="text-xs text-muted-foreground font-mono">
            <span className="text-crypto-purple">∮</span> ∇<sub>HFV</sub> Φ(t) dt + Res(𝒦) = ℱ<sub>in</sub>
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Entanglement-Decomposing-Hash-Inverter • FV-Feldgleichung • Phasen-Konjugation
          </p>
        </div>

        {/* Hash Input */}
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
            SHA-256 Hash (Ziel)
          </label>
          <Input
            value={hashInput}
            onChange={(e) => setHashInput(e.target.value)}
            className="font-mono text-xs bg-background/50 border-crypto-purple/20"
            placeholder="Hash eingeben..."
          />
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <Button
            onClick={runEDHI}
            disabled={state.status === 'running'}
            className="flex-1 bg-crypto-purple/10 border border-crypto-purple/30 text-crypto-purple hover:bg-crypto-purple/20"
            variant="outline"
          >
            <Play size={14} className="mr-2" />
            {state.status === 'running' ? `Iteration ${state.iterations}/64...` : 'EDHI starten'}
          </Button>
          <Button onClick={reset} variant="outline" className="border-crypto-purple/30 text-crypto-purple">
            <RotateCcw size={14} />
          </Button>
        </div>

        {/* FV-Manifold Visualization */}
        {state.fvManifold.length > 0 && (
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
              FV-Mannigfaltigkeit (∇<sub>HFV</sub>)
            </label>
            <div className="bg-background/80 border border-crypto-purple/20 rounded p-2 h-32 relative overflow-hidden">
              <svg viewBox="-1.2 -1.2 2.4 2.4" className="w-full h-full">
                {state.fvManifold.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={0.02 + p.intensity * 0.05}
                    fill={`hsl(270, 80%, ${50 + p.intensity * 30}%)`}
                    opacity={0.6 + p.intensity * 0.4}
                  />
                ))}
                {state.fvManifold.length > 1 && (
                  <polyline
                    points={state.fvManifold.map(p => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke="hsl(270, 80%, 60%)"
                    strokeWidth="0.005"
                    opacity="0.5"
                  />
                )}
              </svg>
            </div>
          </div>
        )}

        {/* Metrics */}
        {state.iterations > 0 && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-background/60 border border-crypto-purple/10 rounded p-2">
              <span className="text-muted-foreground">Res(𝒦)</span>
              <div className="font-mono text-crypto-purple">{state.residualKernel.toFixed(8)}</div>
            </div>
            <div className="bg-background/60 border border-crypto-purple/10 rounded p-2">
              <span className="text-muted-foreground">Entropy Collapse</span>
              <div className="font-mono text-crypto-purple">{state.entropyCollapse.toFixed(6)}</div>
            </div>
            <div className="bg-background/60 border border-crypto-purple/10 rounded p-2">
              <span className="text-muted-foreground">∇ Dimension</span>
              <div className="font-mono text-crypto-purple">{state.gradient.length}</div>
            </div>
            <div className="bg-background/60 border border-crypto-purple/10 rounded p-2">
              <span className="text-muted-foreground">Status</span>
              <div className={`font-mono ${state.status === 'complete' ? 'text-crypto-green' : 'text-crypto-orange'}`}>
                {state.status === 'complete' ? 'DEKONSTRUIERT' : state.status.toUpperCase()}
              </div>
            </div>
          </div>
        )}

        {/* Decomposed Bits */}
        {state.decomposedBits && (
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
              Decomposed Bits (Rückprojektion auf Bit-Ebene)
            </label>
            <div className="bg-background/80 border border-crypto-purple/20 rounded p-2 font-mono text-[9px] break-all text-crypto-purple/80 max-h-16 overflow-y-auto">
              {state.decomposedBits}
            </div>
          </div>
        )}

        {/* Phase Conjugation Preview */}
        {state.phaseConjugation.length > 0 && (
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
              Phasen-Konjugation (Top 16 Werte)
            </label>
            <div className="flex gap-0.5 h-8">
              {state.phaseConjugation.slice(0, 16).map((v, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm"
                  style={{
                    background: `hsl(270, 80%, ${50 + v * 30}%)`,
                    height: `${50 + Math.abs(v) * 50}%`,
                    alignSelf: 'flex-end',
                    opacity: 0.5 + Math.abs(v) * 0.5,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </CryptoPanel>
  );
}
