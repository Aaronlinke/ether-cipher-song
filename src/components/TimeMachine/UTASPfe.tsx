import { useState, useCallback } from 'react';
import { CryptoPanel } from '../CryptoPanel';
import { Waves, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PFEState {
  resonanceField: { n: number; phase: number; amplitude: number }[];
  windingIndex: number | null;
  torsionGradient: number[];
  harmonicNodes: number[];
  status: 'idle' | 'scanning' | 'complete';
  scannedPrimes: number;
  totalPrimes: number;
  fieldVisualization: { x: number; y: number; r: number }[];
}

export function UTASPfe() {
  const [publicKeyX, setPublicKeyX] = useState('79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798');
  const [curveOrder, setCurveOrder] = useState('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');
  const [state, setState] = useState<PFEState>({
    resonanceField: [],
    windingIndex: null,
    torsionGradient: [],
    harmonicNodes: [],
    status: 'idle',
    scannedPrimes: 0,
    totalPrimes: 0,
    fieldVisualization: [],
  });

  const isPrime = (n: number): boolean => {
    if (n < 2) return false;
    if (n < 4) return true;
    if (n % 2 === 0 || n % 3 === 0) return false;
    for (let i = 5; i * i <= n; i += 6) {
      if (n % i === 0 || n % (i + 2) === 0) return false;
    }
    return true;
  };

  const computeResonance = useCallback((p: number, xHex: string): { phase: number; amplitude: number } => {
    // ℛ_p(x) = Σ e^(iθ_n(x)) — Sieve-of-Eratosthenes-Field
    const xBytes = [];
    for (let i = 0; i < Math.min(xHex.length, 16); i += 2) {
      xBytes.push(parseInt(xHex.substring(i, i + 2), 16));
    }
    
    let realPart = 0;
    let imagPart = 0;
    
    for (let n = 1; n < p && n < 50; n++) {
      const theta = (2 * Math.PI * n * (xBytes[n % xBytes.length] || 1)) / p;
      realPart += Math.cos(theta);
      imagPart += Math.sin(theta);
    }
    
    const amplitude = Math.sqrt(realPart * realPart + imagPart * imagPart) / Math.max(p, 1);
    const phase = Math.atan2(imagPart, realPart);
    
    return { phase, amplitude };
  }, []);

  const runPFE = useCallback(() => {
    setState(prev => ({ ...prev, status: 'scanning', scannedPrimes: 0 }));

    const primes: number[] = [];
    for (let n = 2; n < 500; n++) {
      if (isPrime(n)) primes.push(n);
    }

    let idx = 0;
    const resonanceField: { n: number; phase: number; amplitude: number }[] = [];
    const harmonicNodes: number[] = [];

    const step = () => {
      if (idx >= primes.length) {
        // Compute winding index: k = ∮ ∇_torsion ℱ(x,t) dt
        let windingSum = 0;
        for (let i = 1; i < resonanceField.length; i++) {
          const dPhase = resonanceField[i].phase - resonanceField[i - 1].phase;
          // Normalize to [-π, π]
          const normalized = Math.atan2(Math.sin(dPhase), Math.cos(dPhase));
          windingSum += normalized;
        }
        const windingIndex = Math.round(windingSum / (2 * Math.PI));

        // Torsion gradient
        const torsionGradient = resonanceField.map((r, i) => {
          if (i === 0) return 0;
          return (r.amplitude - resonanceField[i - 1].amplitude) * Math.sin(r.phase);
        });

        // Field visualization points
        const fieldVis = resonanceField.map(r => ({
          x: Math.cos(r.phase) * r.amplitude,
          y: Math.sin(r.phase) * r.amplitude,
          r: r.amplitude * 0.03 + 0.005,
        }));

        setState(prev => ({
          ...prev,
          resonanceField,
          windingIndex,
          torsionGradient,
          harmonicNodes,
          status: 'complete',
          scannedPrimes: primes.length,
          totalPrimes: primes.length,
          fieldVisualization: fieldVis,
        }));
        return;
      }

      const batch = Math.min(10, primes.length - idx);
      for (let b = 0; b < batch; b++) {
        const p = primes[idx + b];
        const res = computeResonance(p, publicKeyX);
        resonanceField.push({ n: p, ...res });
        
        // Detect harmonic nodes (resonance peaks)
        if (res.amplitude > 0.3) {
          harmonicNodes.push(p);
        }
      }
      idx += batch;

      setState(prev => ({
        ...prev,
        scannedPrimes: idx,
        totalPrimes: primes.length,
        resonanceField: [...resonanceField],
      }));

      setTimeout(step, 30);
    };

    step();
  }, [publicKeyX, computeResonance]);

  const reset = () => {
    setState({
      resonanceField: [],
      windingIndex: null,
      torsionGradient: [],
      harmonicNodes: [],
      status: 'idle',
      scannedPrimes: 0,
      totalPrimes: 0,
      fieldVisualization: [],
    });
  };

  return (
    <CryptoPanel title="UTAS — PFE Prime-Field-Entangler" icon={<Waves size={16} />} glowColor="green">
      <div className="space-y-4">
        {/* Formula */}
        <div className="bg-crypto-green/5 border border-crypto-green/20 rounded p-3">
          <p className="text-xs text-muted-foreground font-mono">
            <span className="text-crypto-green">ℛ</span><sub>p</sub>(x) = Σ e<sup>iθ<sub>n</sub>(x)</sup> &nbsp;|&nbsp;
            k = <span className="text-crypto-green">∮</span> ∇<sub>torsion</sub> ℱ(x,t) dt
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Prime-Field-Entangler • ECDLP Resonanz-Extraktion • Windungsindex-Methode
          </p>
        </div>

        {/* Inputs */}
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
            Public Key X (Hex)
          </label>
          <Input
            value={publicKeyX}
            onChange={(e) => setPublicKeyX(e.target.value)}
            className="font-mono text-[10px] bg-background/50 border-crypto-green/20"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
            Kurvenordnung n (secp256k1)
          </label>
          <Input
            value={curveOrder}
            onChange={(e) => setCurveOrder(e.target.value)}
            className="font-mono text-[10px] bg-background/50 border-crypto-green/20"
          />
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <Button
            onClick={runPFE}
            disabled={state.status === 'scanning'}
            className="flex-1 bg-crypto-green/10 border border-crypto-green/30 text-crypto-green hover:bg-crypto-green/20"
            variant="outline"
          >
            <Play size={14} className="mr-2" />
            {state.status === 'scanning'
              ? `Scanning ${state.scannedPrimes}/${state.totalPrimes}...`
              : 'PFE Resonanz-Scan'}
          </Button>
          <Button onClick={reset} variant="outline" className="border-crypto-green/30 text-crypto-green">
            <RotateCcw size={14} />
          </Button>
        </div>

        {/* Resonance Field Visualization */}
        {state.fieldVisualization.length > 0 && (
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
              Primzahl-Resonanzfeld (Phasenraum)
            </label>
            <div className="bg-background/80 border border-crypto-green/20 rounded p-2 h-40 relative overflow-hidden">
              <svg viewBox="-0.6 -0.6 1.2 1.2" className="w-full h-full">
                {/* Grid */}
                <line x1="-0.5" y1="0" x2="0.5" y2="0" stroke="hsl(120,20%,30%)" strokeWidth="0.002" />
                <line x1="0" y1="-0.5" x2="0" y2="0.5" stroke="hsl(120,20%,30%)" strokeWidth="0.002" />
                {/* Points */}
                {state.fieldVisualization.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={p.r}
                    fill={state.harmonicNodes.includes(state.resonanceField[i]?.n || 0)
                      ? 'hsl(120, 90%, 60%)'
                      : 'hsl(120, 60%, 45%)'}
                    opacity={0.6}
                  />
                ))}
                {state.fieldVisualization.length > 1 && (
                  <polyline
                    points={state.fieldVisualization.map(p => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke="hsl(120, 70%, 50%)"
                    strokeWidth="0.003"
                    opacity="0.4"
                  />
                )}
              </svg>
            </div>
          </div>
        )}

        {/* Results */}
        {state.status === 'complete' && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-background/60 border border-crypto-green/10 rounded p-2">
                <span className="text-muted-foreground">Windungsindex k</span>
                <div className="font-mono text-crypto-green text-lg">{state.windingIndex}</div>
              </div>
              <div className="bg-background/60 border border-crypto-green/10 rounded p-2">
                <span className="text-muted-foreground">Harmonische Knoten</span>
                <div className="font-mono text-crypto-green">{state.harmonicNodes.length}</div>
              </div>
            </div>

            {/* Harmonic Nodes List */}
            {state.harmonicNodes.length > 0 && (
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                  Resonanz-Primzahlen (Amplitude &gt; 0.3)
                </label>
                <div className="flex flex-wrap gap-1">
                  {state.harmonicNodes.slice(0, 20).map(p => (
                    <span key={p} className="px-1.5 py-0.5 bg-crypto-green/10 border border-crypto-green/20 rounded text-[10px] font-mono text-crypto-green">
                      {p}
                    </span>
                  ))}
                  {state.harmonicNodes.length > 20 && (
                    <span className="text-[10px] text-muted-foreground">+{state.harmonicNodes.length - 20} weitere</span>
                  )}
                </div>
              </div>
            )}

            {/* Torsion Gradient Bar */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                Torsions-Gradient (∇<sub>torsion</sub>)
              </label>
              <div className="flex gap-px h-6">
                {state.torsionGradient.slice(0, 60).map((v, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm"
                    style={{
                      background: v > 0
                        ? `hsl(120, 80%, ${40 + v * 200}%)`
                        : `hsl(0, 80%, ${40 + Math.abs(v) * 200}%)`,
                      opacity: 0.4 + Math.abs(v) * 3,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </CryptoPanel>
  );
}
