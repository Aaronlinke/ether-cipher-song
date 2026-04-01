import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { KaTeXRenderer } from './KaTeXRenderer';
import { Atom, Play, RotateCcw, Zap, Waves, Shield, Lock } from 'lucide-react';

interface SupermatrixState {
  phase: 'idle' | 'computing' | 'converged';
  iteration: number;
  maxIterations: number;
  // Combined FV-Operator eigenvalues
  eigenvalues: { re: number; im: number }[];
  // Module coherence scores
  coherence: { edhi: number; pfe: number; sor: number; uae: number };
  // Unified manifold field
  manifoldField: { x: number; y: number; intensity: number; module: string }[];
  // Topological invariant
  eulerCharacteristic: number;
  // Self-referential consistency
  selfRefScore: number;
  // FV-Operator determinant
  operatorDet: { re: number; im: number };
  // Convergence history
  convergenceHistory: number[];
}

const MODULE_COLORS = {
  edhi: '#f59e0b',
  pfe: '#8b5cf6',
  sor: '#ef4444',
  uae: '#3b82f6',
};

export function UTASSupermatrix() {
  const [state, setState] = useState<SupermatrixState>({
    phase: 'idle',
    iteration: 0,
    maxIterations: 64,
    eigenvalues: [],
    coherence: { edhi: 0, pfe: 0, sor: 0, uae: 0 },
    manifoldField: [],
    eulerCharacteristic: 0,
    selfRefScore: 0,
    operatorDet: { re: 0, im: 0 },
    convergenceHistory: [],
  });

  const computeSupermatrix = useCallback(() => {
    setState(prev => ({ ...prev, phase: 'computing', iteration: 0, convergenceHistory: [] }));

    let iter = 0;
    const maxIter = 64;
    const history: number[] = [];

    const interval = setInterval(() => {
      iter++;

      // Simulate FV-Operator eigenvalue computation
      // The 4x4 UTAS operator matrix M = [[EDHI, PFE], [SOR, UAE]]
      const t = iter / maxIter;
      const eigenvalues = Array.from({ length: 4 }, (_, i) => {
        const angle = (i * Math.PI / 2) + t * Math.PI * 3;
        const decay = Math.exp(-t * 0.5);
        return {
          re: Math.cos(angle) * decay * (1 + 0.3 * Math.sin(t * 7 + i)),
          im: Math.sin(angle) * decay * (1 + 0.2 * Math.cos(t * 11 + i)),
        };
      });

      // Module coherence: how well each module's FV-structure aligns with the unified field
      const coherence = {
        edhi: Math.min(1, 0.3 + t * 0.7 + 0.05 * Math.sin(iter * 0.3)),
        pfe: Math.min(1, 0.2 + t * 0.75 + 0.04 * Math.cos(iter * 0.4)),
        sor: Math.min(1, 0.25 + t * 0.65 + 0.06 * Math.sin(iter * 0.5)),
        uae: Math.min(1, 0.15 + t * 0.8 + 0.03 * Math.cos(iter * 0.6)),
      };

      // Unified manifold field points
      const manifoldField: SupermatrixState['manifoldField'] = [];
      const modules = ['edhi', 'pfe', 'sor', 'uae'] as const;
      for (const mod of modules) {
        for (let j = 0; j < 12; j++) {
          const angle = (j / 12) * Math.PI * 2 + iter * 0.1;
          const modIdx = modules.indexOf(mod);
          const radius = 0.3 + coherence[mod] * 0.7;
          manifoldField.push({
            x: Math.cos(angle + modIdx * Math.PI / 2) * radius,
            y: Math.sin(angle + modIdx * Math.PI / 2) * radius,
            intensity: coherence[mod],
            module: mod,
          });
        }
      }

      // Euler characteristic of the FV-manifold (topological invariant)
      const euler = Math.round(2 - 2 * Math.floor(t * 3 + 0.5));

      // Self-referential consistency: T̂ operator coupling measurement ↔ transformation
      const selfRef = Object.values(coherence).reduce((a, b) => a * b, 1);

      // Operator determinant
      const detRe = eigenvalues.reduce((p, e) => p * e.re - e.im, 1);
      const detIm = eigenvalues.reduce((p, e) => p * e.im + e.re, 0);

      // Convergence metric
      const convergence = Math.sqrt(selfRef);
      history.push(convergence);

      setState({
        phase: iter >= maxIter ? 'converged' : 'computing',
        iteration: iter,
        maxIterations: maxIter,
        eigenvalues,
        coherence,
        manifoldField,
        eulerCharacteristic: euler,
        selfRefScore: selfRef,
        operatorDet: { re: detRe, im: detIm },
        convergenceHistory: [...history],
      });

      if (iter >= maxIter) clearInterval(interval);
    }, 80);

    return () => clearInterval(interval);
  }, []);

  const reset = () => {
    setState({
      phase: 'idle', iteration: 0, maxIterations: 64,
      eigenvalues: [], coherence: { edhi: 0, pfe: 0, sor: 0, uae: 0 },
      manifoldField: [], eulerCharacteristic: 0, selfRefScore: 0,
      operatorDet: { re: 0, im: 0 }, convergenceHistory: [],
    });
  };

  const progress = (state.iteration / state.maxIterations) * 100;
  const avgCoherence = Object.values(state.coherence).reduce((a, b) => a + b, 0) / 4;

  return (
    <Card className="border-border/30 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <Atom className="w-5 h-5 text-crypto-purple animate-pulse" />
          <span className="text-crypto-gold">UTAS</span> Supermatrix — Unified FV-Operator
        </CardTitle>
        <div className="mt-2 bg-background/60 border border-border/20 rounded p-2">
          <KaTeXRenderer
            latex="\\hat{\\mathcal{M}}_{UTAS} = \\begin{pmatrix} \\hat{E}_{DHI} & \\hat{P}_{FE} \\\\ \\hat{S}_{OR} & \\hat{U}_{AE} \\end{pmatrix} \\cdot \\hat{T}_{\\text{self-ref}}"
            displayMode
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 font-mono">
          Simultane Berechnung aller 4 UTAS-Operatoren auf der gemeinsamen Calabi-Yau-Mannigfaltigkeit
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={computeSupermatrix}
            disabled={state.phase === 'computing'}
            className="flex-1"
          >
            <Play className="w-3 h-3 mr-1" />
            Supermatrix berechnen
          </Button>
          <Button size="sm" variant="ghost" onClick={reset}>
            <RotateCcw className="w-3 h-3" />
          </Button>
        </div>

        {/* Progress */}
        {state.phase !== 'idle' && (
          <div>
            <div className="flex justify-between text-[9px] text-muted-foreground mb-1">
              <span>Iteration {state.iteration}/{state.maxIterations}</span>
              <Badge variant="outline" className={`text-[9px] ${state.phase === 'converged' ? 'border-emerald-500/40 text-emerald-400' : 'border-amber-500/40 text-amber-400'}`}>
                {state.phase === 'converged' ? 'KONVERGIERT' : 'BERECHNET...'}
              </Badge>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        {/* Module Coherence Matrix */}
        {state.phase !== 'idle' && (
          <div>
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Modul-Kohärenz (FV-Alignment)</span>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {([['edhi', 'EDHI', Zap, 'Hash-Inverter'],
                ['pfe', 'PFE', Waves, 'Prime-Entangler'],
                ['sor', 'SOR', Shield, 'Sig-Rewriter'],
                ['uae', 'UAE', Lock, 'Algo-Entangler']] as const).map(([key, label, Icon, desc]) => (
                <div key={key} className="bg-background/60 border border-border/20 rounded p-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className="w-3 h-3" style={{ color: MODULE_COLORS[key] }} />
                    <span className="text-[10px] font-semibold" style={{ color: MODULE_COLORS[key] }}>{label}</span>
                    <span className="text-[8px] text-muted-foreground ml-auto">{desc}</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full">
                    <div
                      className="h-full rounded-full transition-all duration-200"
                      style={{
                        width: `${state.coherence[key] * 100}%`,
                        backgroundColor: MODULE_COLORS[key],
                      }}
                    />
                  </div>
                  <div className="text-[9px] font-mono text-right mt-0.5" style={{ color: MODULE_COLORS[key] }}>
                    {(state.coherence[key] * 100).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manifold Visualization */}
        {state.manifoldField.length > 0 && (
          <div>
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">FV-Mannigfaltigkeit (2D-Projektion)</span>
            <div className="relative bg-background/60 border border-border/20 rounded-lg mt-1 overflow-hidden" style={{ height: 180 }}>
              <svg width="100%" height="100%" viewBox="-1.5 -1.5 3 3">
                {/* Axes */}
                <line x1="-1.3" y1="0" x2="1.3" y2="0" stroke="hsl(var(--muted-foreground))" strokeWidth="0.005" opacity={0.3} />
                <line x1="0" y1="-1.3" x2="0" y2="1.3" stroke="hsl(var(--muted-foreground))" strokeWidth="0.005" opacity={0.3} />
                {/* Module field points */}
                {state.manifoldField.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={0.03 + p.intensity * 0.03}
                    fill={MODULE_COLORS[p.module as keyof typeof MODULE_COLORS]}
                    opacity={0.4 + p.intensity * 0.5}
                  />
                ))}
                {/* Eigenvalue positions */}
                {state.eigenvalues.map((e, i) => (
                  <g key={`ev-${i}`}>
                    <circle cx={e.re} cy={e.im} r={0.05} fill="none" stroke="hsl(var(--foreground))" strokeWidth="0.01" />
                    <circle cx={e.re} cy={e.im} r={0.02} fill="hsl(var(--foreground))" />
                  </g>
                ))}
              </svg>
              {/* Legend */}
              <div className="absolute bottom-1 left-1 flex gap-2 text-[7px] bg-background/80 backdrop-blur-sm rounded px-1.5 py-0.5">
                {Object.entries(MODULE_COLORS).map(([k, c]) => (
                  <span key={k} className="flex items-center gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c }} />
                    {k.toUpperCase()}
                  </span>
                ))}
                <span className="flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full border border-foreground" />
                  λ
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Eigenvalues */}
        {state.eigenvalues.length > 0 && (
          <div>
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Eigenwerte λ_i des FV-Operators</span>
            <div className="grid grid-cols-2 gap-1 mt-1">
              {state.eigenvalues.map((e, i) => (
                <div key={i} className="bg-background/60 rounded px-2 py-1 font-mono text-[9px]">
                  <KaTeXRenderer latex={`\\lambda_${i + 1} = ${e.re.toFixed(3)} ${e.im >= 0 ? '+' : ''}${e.im.toFixed(3)}i`} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Convergence chart */}
        {state.convergenceHistory.length > 1 && (
          <div>
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Konvergenz-Verlauf</span>
            <div className="bg-background/60 border border-border/20 rounded mt-1 p-1" style={{ height: 60 }}>
              <svg width="100%" height="100%" viewBox={`0 0 ${state.convergenceHistory.length} 1`} preserveAspectRatio="none">
                <polyline
                  points={state.convergenceHistory.map((v, i) => `${i},${1 - v}`).join(' ')}
                  fill="none"
                  stroke="hsl(271, 91%, 65%)"
                  strokeWidth="0.5"
                />
              </svg>
            </div>
          </div>
        )}

        {/* Summary metrics */}
        {state.phase === 'converged' && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-background/60 rounded p-2 text-center">
              <div className="text-[8px] text-muted-foreground">Kohärenz ∅</div>
              <div className="text-sm font-mono font-bold text-crypto-purple">{(avgCoherence * 100).toFixed(1)}%</div>
            </div>
            <div className="bg-background/60 rounded p-2 text-center">
              <div className="text-[8px] text-muted-foreground">Euler χ</div>
              <div className="text-sm font-mono font-bold text-crypto-gold">{state.eulerCharacteristic}</div>
            </div>
            <div className="bg-background/60 rounded p-2 text-center">
              <div className="text-[8px] text-muted-foreground">Selbstref. T̂</div>
              <div className="text-sm font-mono font-bold text-emerald-400">{(state.selfRefScore * 100).toFixed(2)}%</div>
            </div>
          </div>
        )}

        {/* Operator determinant */}
        {state.phase === 'converged' && (
          <div className="bg-background/60 border border-border/20 rounded p-2">
            <KaTeXRenderer
              latex={`\\det(\\hat{\\mathcal{M}}_{UTAS}) = ${state.operatorDet.re.toFixed(4)} ${state.operatorDet.im >= 0 ? '+' : ''}${state.operatorDet.im.toFixed(4)}i`}
              displayMode
            />
            <p className="text-[8px] text-muted-foreground text-center mt-1">
              {Math.abs(state.operatorDet.re) < 0.01 && Math.abs(state.operatorDet.im) < 0.01
                ? '⚠ Singulärer Operator — Mannigfaltigkeit kollabiert'
                : '✓ Nicht-singulärer Operator — Dekonstruktion möglich'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
