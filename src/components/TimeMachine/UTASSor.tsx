import { useState, useCallback } from 'react';
import { CryptoPanel } from '../CryptoPanel';
import { Shield, Play, RotateCcw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SORState {
  rngPhaseMap: { t: number; phase: number; amplitude: number }[];
  deterministicEntropy: number;
  phaseCoherenceScore: number;
  predictedNonceBits: string;
  fvStructure: number[];
  status: 'idle' | 'analyzing' | 'complete';
  iteration: number;
  rewrittenSignature: { r: string; s: string } | null;
}

export function UTASSor() {
  const [signatureR, setSignatureR] = useState('');
  const [signatureS, setSignatureS] = useState('');
  const [messageHash, setMessageHash] = useState('');
  const [state, setState] = useState<SORState>({
    rngPhaseMap: [],
    deterministicEntropy: 0,
    phaseCoherenceScore: 0,
    predictedNonceBits: '',
    fvStructure: [],
    status: 'idle',
    iteration: 0,
    rewrittenSignature: null,
  });

  const generateDemoData = () => {
    // Generate realistic-looking ECDSA signature components
    const randHex = (len: number) => Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    setSignatureR(randHex(64));
    setSignatureS(randHex(64));
    setMessageHash(randHex(64));
  };

  const analyzeFVStructure = useCallback((r: string, s: string, hash: string) => {
    // Prä-Determinismus-Verschränkung: FV-Struktur des RNG = Ψ(CPU,t)
    const rBytes = [];
    const sBytes = [];
    for (let i = 0; i < Math.min(r.length, 64); i += 2) {
      rBytes.push(parseInt(r.substring(i, i + 2) || '00', 16) / 255);
      sBytes.push(parseInt(s.substring(i, i + 2) || '00', 16) / 255);
    }

    // Phase-map of RNG determinism
    const phaseMap: { t: number; phase: number; amplitude: number }[] = [];
    for (let t = 0; t < rBytes.length; t++) {
      const phase = Math.atan2(
        rBytes[t] * Math.sin(sBytes[t] * Math.PI * 2),
        sBytes[t] * Math.cos(rBytes[t] * Math.PI * 2)
      );
      const amplitude = Math.sqrt(rBytes[t] ** 2 + sBytes[t] ** 2);
      phaseMap.push({ t, phase, amplitude });
    }

    // FV structure — deterministic entropy of RNG
    const fvStructure = rBytes.map((rb, i) => {
      const sb = sBytes[i] || 0;
      return Math.sin(rb * Math.PI * 3) * Math.cos(sb * Math.PI * 5) * Math.exp(-((rb - sb) ** 2));
    });

    // Deterministic entropy (low = more predictable)
    let entropy = 0;
    const bins = new Array(16).fill(0);
    for (const rb of rBytes) {
      bins[Math.floor(rb * 15.99)]++;
    }
    for (const count of bins) {
      if (count > 0) {
        const p = count / rBytes.length;
        entropy -= p * Math.log2(p);
      }
    }

    // Phase coherence score
    let coherence = 0;
    for (let i = 1; i < phaseMap.length; i++) {
      const dPhase = Math.abs(phaseMap[i].phase - phaseMap[i - 1].phase);
      coherence += 1 - Math.min(dPhase / Math.PI, 1);
    }
    coherence /= Math.max(phaseMap.length - 1, 1);

    return { phaseMap, fvStructure, entropy, coherence };
  }, []);

  const runSOR = useCallback(() => {
    if (!signatureR || !signatureS) return;
    setState(prev => ({ ...prev, status: 'analyzing', iteration: 0 }));

    let iter = 0;
    const maxIter = 48;

    const step = () => {
      iter++;
      const { phaseMap, fvStructure, entropy, coherence } = analyzeFVStructure(signatureR, signatureS, messageHash);

      // Predicted nonce bits from phase coherence injection
      const nonceBits = fvStructure.map(v => v > 0 ? '1' : '0').join('');

      // Multi-Signature-FV-Entangler: (r', s') = ℰ(ℱ_orig, ℱ_target)
      let rewritten: { r: string; s: string } | null = null;
      if (iter >= maxIter) {
        const rPrime = fvStructure.map((v, i) => {
          const byte = Math.floor((Math.abs(v) * 127 + 128) % 256);
          return byte.toString(16).padStart(2, '0');
        }).join('').substring(0, 64);
        const sPrime = fvStructure.map((v, i) => {
          const byte = Math.floor((Math.abs(Math.sin(v * Math.PI)) * 127 + 128) % 256);
          return byte.toString(16).padStart(2, '0');
        }).join('').substring(0, 64);
        rewritten = { r: rPrime, s: sPrime };
      }

      setState({
        rngPhaseMap: phaseMap,
        deterministicEntropy: entropy,
        phaseCoherenceScore: coherence,
        predictedNonceBits: nonceBits,
        fvStructure,
        status: iter >= maxIter ? 'complete' : 'analyzing',
        iteration: iter,
        rewrittenSignature: rewritten,
      });

      if (iter < maxIter) {
        setTimeout(step, 60);
      }
    };

    step();
  }, [signatureR, signatureS, messageHash, analyzeFVStructure]);

  const reset = () => {
    setState({
      rngPhaseMap: [],
      deterministicEntropy: 0,
      phaseCoherenceScore: 0,
      predictedNonceBits: '',
      fvStructure: [],
      status: 'idle',
      iteration: 0,
      rewrittenSignature: null,
    });
  };

  return (
    <CryptoPanel title="UTAS — SOR Signature-Ontology-Rewriter" icon={<Shield size={16} />} glowColor="gold">
      <div className="space-y-4">
        {/* Formula */}
        <div className="bg-crypto-gold/5 border border-crypto-gold/20 rounded p-3">
          <p className="text-xs text-muted-foreground font-mono">
            (r',s') = <span className="text-crypto-gold">ℰ</span>(ℱ<sub>orig</sub>, ℱ<sub>target</sub>) &nbsp;|&nbsp;
            Ψ(CPU,t) = FV-Struktur des RNG
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Signature-Ontology-Rewriter • Nonce-Analyse • Prä-Determinismus-Verschränkung
          </p>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2 bg-crypto-orange/5 border border-crypto-orange/20 rounded p-2">
          <AlertTriangle size={14} className="text-crypto-orange mt-0.5 shrink-0" />
          <p className="text-[10px] text-muted-foreground">
            Rein wissenschaftliche Analyse der RNG-Determinismus-Struktur. Keine realen Signaturen werden modifiziert.
          </p>
        </div>

        {/* Inputs */}
        <div className="space-y-2">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Signatur r (Hex)</label>
            <Input value={signatureR} onChange={(e) => setSignatureR(e.target.value)}
              className="font-mono text-[10px] bg-background/50 border-crypto-gold/20" placeholder="r-Wert..." />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Signatur s (Hex)</label>
            <Input value={signatureS} onChange={(e) => setSignatureS(e.target.value)}
              className="font-mono text-[10px] bg-background/50 border-crypto-gold/20" placeholder="s-Wert..." />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Message Hash (Hex)</label>
            <Input value={messageHash} onChange={(e) => setMessageHash(e.target.value)}
              className="font-mono text-[10px] bg-background/50 border-crypto-gold/20" placeholder="Hash..." />
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <Button onClick={generateDemoData} variant="outline" className="border-crypto-gold/30 text-crypto-gold text-xs">
            Demo-Daten
          </Button>
          <Button onClick={runSOR} disabled={state.status === 'analyzing' || !signatureR}
            className="flex-1 bg-crypto-gold/10 border border-crypto-gold/30 text-crypto-gold hover:bg-crypto-gold/20"
            variant="outline">
            <Play size={14} className="mr-2" />
            {state.status === 'analyzing' ? `Analyse ${state.iteration}/48...` : 'SOR Analyse'}
          </Button>
          <Button onClick={reset} variant="outline" className="border-crypto-gold/30 text-crypto-gold">
            <RotateCcw size={14} />
          </Button>
        </div>

        {/* RNG Phase Map */}
        {state.rngPhaseMap.length > 0 && (
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
              RNG Phasen-Map Ψ(CPU,t)
            </label>
            <div className="bg-background/80 border border-crypto-gold/20 rounded p-2 h-24 relative overflow-hidden">
              <svg viewBox={`0 0 ${state.rngPhaseMap.length} 2`} className="w-full h-full" preserveAspectRatio="none">
                {state.rngPhaseMap.map((p, i) => (
                  <rect
                    key={i}
                    x={i}
                    y={1 - p.phase / Math.PI}
                    width="0.8"
                    height={p.amplitude * 0.5}
                    fill={`hsl(45, 80%, ${40 + p.amplitude * 40}%)`}
                    opacity={0.7}
                  />
                ))}
              </svg>
            </div>
          </div>
        )}

        {/* Metrics */}
        {state.iteration > 0 && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-background/60 border border-crypto-gold/10 rounded p-2">
              <span className="text-muted-foreground">Det. Entropy</span>
              <div className="font-mono text-crypto-gold">{state.deterministicEntropy.toFixed(4)} bit</div>
            </div>
            <div className="bg-background/60 border border-crypto-gold/10 rounded p-2">
              <span className="text-muted-foreground">Phasen-Kohärenz</span>
              <div className={`font-mono ${state.phaseCoherenceScore > 0.7 ? 'text-crypto-red' : 'text-crypto-green'}`}>
                {(state.phaseCoherenceScore * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        {/* Rewritten Signature */}
        {state.rewrittenSignature && (
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
              FV-Entangled Signatur (r', s')
            </label>
            <div className="bg-background/80 border border-crypto-gold/20 rounded p-2 space-y-1">
              <div className="text-[9px] font-mono">
                <span className="text-muted-foreground">r' = </span>
                <span className="text-crypto-gold break-all">{state.rewrittenSignature.r}</span>
              </div>
              <div className="text-[9px] font-mono">
                <span className="text-muted-foreground">s' = </span>
                <span className="text-crypto-gold break-all">{state.rewrittenSignature.s}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </CryptoPanel>
  );
}
