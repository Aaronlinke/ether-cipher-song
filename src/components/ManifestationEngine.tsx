import { useState, useRef } from 'react';
import { CryptoPanel } from './CryptoPanel';
import { Button } from './ui/button';
import { Sparkles, Play, Square } from 'lucide-react';

// =================================================================
// 1. VOID PROPAGATION
// =================================================================
class VoidCore {
  private field: Float64Array;
  private seeds: number[];
  private decayRate = 0.982;
  private interferenceRate = 0.124;

  constructor(dimension = 32) {
    this.field = new Float64Array(dimension).map(() => Math.random());
    this.seeds = Array.from({ length: Math.floor(dimension / 4) }, (_, i) => i * 4 + 2);
  }

  step(): Float64Array {
    for (let i = 0; i < this.field.length; i++) {
      let interaction = 0;
      for (let j = 0; j < this.seeds.length; j++) {
        const neighborIdx = (i + this.seeds[j]) % this.field.length;
        const diff = Math.abs(this.field[i] - this.field[neighborIdx]);
        interaction += diff < 0.15 ? diff * 1.25 : -diff * 0.75;
      }
      const modulated = Math.tanh(interaction * 0.1) * this.interferenceRate;
      this.field[i] = this.field[i] * this.decayRate + modulated + (Math.random() - 0.5) * 0.001;
      this.field[i] = Math.max(0.001, Math.min(0.999, this.field[i]));
    }
    return this.field;
  }

  getVoidDensity(): number {
    let sum = 0;
    for (let i = 0; i < this.field.length; i++) sum += this.field[i];
    return sum / this.field.length;
  }
}

// =================================================================
// 2. CHAOS RESONATOR
// =================================================================
class ChaosResonator {
  private resonanceState: Float64Array;
  private history: Float64Array[] = [];
  private chaosFactor = 0.75;

  constructor(dimension = 16) {
    this.resonanceState = new Float64Array(dimension).map(() => Math.random() * 2 - 1);
  }

  resonate(voidField: Float64Array): Float64Array {
    const newState = new Float64Array(this.resonanceState.length);
    for (let i = 0; i < newState.length; i++) {
      const voidIndex = Math.floor(i * (voidField.length / newState.length)) % voidField.length;
      const amplitude = voidField[voidIndex] * 2.0 - 1.0;
      const rawValue = this.resonanceState[i] * 0.95 + amplitude * 0.05 * (1 - this.chaosFactor);
      newState[i] = Math.tanh(rawValue * 1.618);
    }
    const rotated = new Float64Array(newState.length);
    const shift = (Math.floor(this.chaosFactor * 10) % 4) + 1;
    for (let i = 0; i < newState.length; i++) {
      const srcIdx = (i + shift) % newState.length;
      rotated[i] = newState[i] * 0.82 + newState[srcIdx] * 0.18;
    }
    this.history.push(new Float64Array(rotated));
    if (this.history.length > 100) this.history.splice(0, 1);

    let variance = 0;
    for (let i = 0; i < rotated.length; i++) variance += rotated[i] * rotated[i];
    variance /= rotated.length;
    const metric = Math.min(1.0, variance * 0.5);
    this.chaosFactor = Math.max(0.1, Math.min(0.9, this.chaosFactor * 0.95 + metric * 0.05));
    this.resonanceState = rotated;
    return rotated;
  }

  findPatternMatches(): number {
    if (this.history.length < 5) return 0;
    const last = this.history[this.history.length - 1];
    let count = 0;
    for (let i = 0; i < this.history.length - 1; i++) {
      let sim = 0;
      for (let j = 0; j < last.length; j++) sim += Math.abs(last[j] - this.history[i][j]);
      if (sim < 0.4) count++;
    }
    return count;
  }

  getChaosFactor() {
    return this.chaosFactor;
  }
}

// =================================================================
// 3. SPIN NETWORK
// =================================================================
class SpinNetwork {
  private coupling: Float64Array[];
  private entanglement: Float64Array;

  constructor(numNodes = 12) {
    this.coupling = Array.from({ length: numNodes }, (_, i) => {
      const row = new Float64Array(numNodes);
      for (let j = 0; j < numNodes; j++) if (i !== j) row[j] = (Math.random() - 0.5) * 0.2;
      return row;
    });
    this.entanglement = new Float64Array(numNodes).map(() => Math.random());
  }

  step(voidDensity: number, chaosVector: Float64Array): Float64Array {
    const newSpin = new Float64Array(this.entanglement.length);
    for (let i = 0; i < this.entanglement.length; i++) {
      let fieldInteract = 0;
      for (let j = 0; j < this.entanglement.length; j++) fieldInteract += this.coupling[i][j] * this.entanglement[j];
      const chaosInput = Math.tanh(chaosVector[i % chaosVector.length] * 2.0);
      const newValue = this.entanglement[i] * 0.6 + fieldInteract * 0.3 + voidDensity * 0.1 * chaosInput;
      newSpin[i] = Math.tanh(newValue);
    }
    this.entanglement = newSpin;
    return this.entanglement;
  }

  getEntanglementEntropy(): number {
    let sum = 0;
    for (let i = 0; i < this.entanglement.length; i++) {
      const p = (this.entanglement[i] + 1) / 2;
      if (p > 0.001 && p < 0.999) sum += -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
    }
    return sum / this.entanglement.length;
  }
}

interface ManifestationOutput {
  cycle: number;
  voidDensity: number;
  emergenceLevel: number;
  patternMatches: number;
  entropy: number;
  chaosFactor: number;
  stateVector: { void: number[]; chaos: number[]; spin: number[] };
}

class ManifestationEngineCore {
  private voidCore = new VoidCore(32);
  private chaosResonator = new ChaosResonator(16);
  private spinNetwork = new SpinNetwork(12);
  private cycleCounter = 0;

  cycle(): ManifestationOutput {
    this.cycleCounter++;
    const voidField = this.voidCore.step();
    const voidDensity = this.voidCore.getVoidDensity();
    const chaosState = this.chaosResonator.resonate(voidField);
    const patternMatches = this.chaosResonator.findPatternMatches();
    const spinState = this.spinNetwork.step(voidDensity, chaosState);
    const spinEntropy = this.spinNetwork.getEntanglementEntropy();
    let chaosSum = 0;
    for (let i = 0; i < chaosState.length; i++) chaosSum += Math.abs(chaosState[i]);
    const emergenceMetric = voidDensity * (1 - chaosSum / chaosState.length) * (1 - spinEntropy);
    return {
      cycle: this.cycleCounter,
      voidDensity,
      emergenceLevel: emergenceMetric,
      patternMatches,
      entropy: spinEntropy,
      chaosFactor: this.chaosResonator.getChaosFactor(),
      stateVector: {
        void: Array.from(voidField).slice(0, 5),
        chaos: Array.from(chaosState).slice(0, 5),
        spin: Array.from(spinState).slice(0, 5),
      },
    };
  }
}

// =================================================================
// REACT UI
// =================================================================
export function ManifestationEngine() {
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<ManifestationOutput | null>(null);
  const [history, setHistory] = useState<ManifestationOutput[]>([]);
  const engineRef = useRef<ManifestationEngineCore | null>(null);
  const rafRef = useRef<number | null>(null);

  const start = () => {
    engineRef.current = new ManifestationEngineCore();
    setHistory([]);
    setRunning(true);
    const loop = () => {
      const eng = engineRef.current;
      if (!eng) return;
      let last: ManifestationOutput | null = null;
      for (let i = 0; i < 5; i++) last = eng.cycle();
      if (last) {
        setOutput(last);
        setHistory((h) => {
          const nh = [...h, last!];
          return nh.length > 80 ? nh.slice(-80) : nh;
        });
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  const stop = () => {
    setRunning(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const runBurst = (n: number) => {
    const eng = new ManifestationEngineCore();
    let last: ManifestationOutput | null = null;
    const collected: ManifestationOutput[] = [];
    for (let i = 0; i < n; i++) {
      last = eng.cycle();
      if (i % Math.max(1, Math.floor(n / 80)) === 0) collected.push(last);
    }
    if (last) {
      setOutput(last);
      setHistory(collected);
    }
  };

  const bar = (v: number, color: string) => {
    const pct = Math.max(0, Math.min(1, v)) * 100;
    return (
      <div className="h-2 bg-background/60 rounded overflow-hidden border border-border/30">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    );
  };

  return (
    <CryptoPanel title="Manifestation Engine — Void · Chaos · Spin" icon={<Sparkles className="w-4 h-4" />} glowColor="purple">
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground font-mono leading-relaxed">
          Drei interagierende Schichten: <span className="text-crypto-purple">VoidCore</span> (32-dim Leerefeld) →{' '}
          <span className="text-crypto-blue">ChaosResonator</span> (16-dim φ-modulierte Resonanz) →{' '}
          <span className="text-crypto-gold">SpinNetwork</span> (12-Knoten Heisenberg-ähnliche Kopplung). Keine KI, keine API – reine
          mathematische Manifestation.
        </p>

        <div className="flex flex-wrap gap-2">
          {!running ? (
            <Button onClick={start} size="sm" className="bg-crypto-purple/20 text-crypto-purple border border-crypto-purple/50 hover:bg-crypto-purple/30">
              <Play className="w-3 h-3 mr-1" /> Live-Lauf starten
            </Button>
          ) : (
            <Button onClick={stop} size="sm" variant="outline" className="border-crypto-red/50 text-crypto-red">
              <Square className="w-3 h-3 mr-1" /> Stop
            </Button>
          )}
          <Button onClick={() => runBurst(100)} size="sm" variant="outline" disabled={running}>
            100 Zyklen
          </Button>
          <Button onClick={() => runBurst(1000)} size="sm" variant="outline" disabled={running}>
            1.000 Zyklen
          </Button>
          <Button onClick={() => runBurst(10000)} size="sm" variant="outline" disabled={running}>
            10.000 Zyklen
          </Button>
        </div>

        {output && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="border border-crypto-purple/30 bg-background/40 rounded p-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Cycle</div>
                <div className="font-mono text-crypto-purple text-sm">{output.cycle.toLocaleString()}</div>
              </div>
              <div className="border border-crypto-gold/30 bg-background/40 rounded p-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Emergenz</div>
                <div className="font-mono text-crypto-gold text-sm">{output.emergenceLevel.toFixed(6)}</div>
              </div>
              <div className="border border-crypto-green/30 bg-background/40 rounded p-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Patterns</div>
                <div className="font-mono text-crypto-green text-sm">{output.patternMatches}</div>
              </div>
              <div className="border border-crypto-blue/30 bg-background/40 rounded p-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Entropie</div>
                <div className="font-mono text-crypto-blue text-sm">{output.entropy.toFixed(4)}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  <span>Void-Dichte</span>
                  <span className="font-mono">{output.voidDensity.toFixed(4)}</span>
                </div>
                {bar(output.voidDensity, 'bg-crypto-purple')}
              </div>
              <div>
                <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  <span>Chaos-Faktor</span>
                  <span className="font-mono">{output.chaosFactor.toFixed(4)}</span>
                </div>
                {bar(output.chaosFactor, 'bg-crypto-blue')}
              </div>
              <div>
                <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  <span>Spin-Entropie</span>
                  <span className="font-mono">{output.entropy.toFixed(4)}</span>
                </div>
                {bar(output.entropy, 'bg-crypto-gold')}
              </div>
            </div>

            {/* Emergence Sparkline */}
            {history.length > 2 && (
              <div className="border border-border/30 bg-background/40 rounded p-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Emergenz-Verlauf</div>
                <svg viewBox="0 0 200 50" preserveAspectRatio="none" className="w-full h-12">
                  <polyline
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="1"
                    points={history
                      .map((p, i) => {
                        const x = (i / (history.length - 1)) * 200;
                        const max = Math.max(...history.map((h) => h.emergenceLevel)) || 1;
                        const y = 50 - (p.emergenceLevel / max) * 48;
                        return `${x},${y}`;
                      })
                      .join(' ')}
                  />
                </svg>
              </div>
            )}

            <div className="space-y-1.5 font-mono text-[10px]">
              <div className="border border-crypto-purple/20 bg-background/40 rounded p-2 overflow-x-auto">
                <span className="text-crypto-purple">Void  :</span>{' '}
                <span className="break-all">[{output.stateVector.void.map((v) => v.toFixed(4)).join(', ')}]</span>
              </div>
              <div className="border border-crypto-blue/20 bg-background/40 rounded p-2 overflow-x-auto">
                <span className="text-crypto-blue">Chaos :</span>{' '}
                <span className="break-all">[{output.stateVector.chaos.map((v) => v.toFixed(4)).join(', ')}]</span>
              </div>
              <div className="border border-crypto-gold/20 bg-background/40 rounded p-2 overflow-x-auto">
                <span className="text-crypto-gold">Spin  :</span>{' '}
                <span className="break-all">[{output.stateVector.spin.map((v) => v.toFixed(4)).join(', ')}]</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </CryptoPanel>
  );
}