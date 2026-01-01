import { useState } from 'react';
import { Rewind, Play, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { CryptoPanel } from '@/components/CryptoPanel';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { calculateBackward, calculateForward, type BackwardCalculationStep } from '@/lib/time-machine-utils';

export function AlgorithmBackward() {
  const [endH, setEndH] = useState(15);
  const [endN, setEndN] = useState(4);
  const [endG, setEndG] = useState(1);
  const [endT, setEndT] = useState(2);
  const [steps, setSteps] = useState<BackwardCalculationStep[]>([]);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationSteps, setVerificationSteps] = useState<any[]>([]);

  const runBackwardCalculation = () => {
    const result = calculateBackward({ H: endH, N: endN, G: endG }, endT);
    setSteps(result);
    
    // Vorwärtsverifikation
    if (result.length > 0) {
      const startState = result[0];
      const forward = calculateForward(
        { H: startState.H, N: startState.N, G: startState.G },
        endT
      );
      setVerificationSteps(forward);
    }
  };

  const reset = () => {
    setSteps([]);
    setVerificationSteps([]);
    setShowVerification(false);
  };

  return (
    <CryptoPanel 
      title="Algorithmen-Rückrechnung (H, N, G)" 
      icon={<Rewind size={16} />} 
      glowColor="blue"
    >
      <div className="space-y-4">
        {/* System Definition */}
        <div className="bg-background/30 rounded p-3 border border-border/20">
          <h4 className="text-crypto-blue text-xs uppercase tracking-wider mb-2">
            Systemdefinition (Vorwärts)
          </h4>
          <div className="font-mono text-xs space-y-1 text-muted-foreground">
            <div>H(t+1) = H(t) + N(t) + G(t)</div>
            <div>N(t+1) = H(t) - N(t)</div>
            <div>G(t+1) = 2·G(t) - H(t)</div>
          </div>
        </div>

        {/* Input Section */}
        <div className="space-y-3">
          <h4 className="text-crypto-gold text-xs uppercase tracking-wider">
            Endzustand eingeben
          </h4>
          
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">H(t)</label>
              <Input
                type="number"
                value={endH}
                onChange={(e) => setEndH(parseFloat(e.target.value) || 0)}
                className="bg-background/50 border-crypto-gold/30 text-center"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">N(t)</label>
              <Input
                type="number"
                value={endN}
                onChange={(e) => setEndN(parseFloat(e.target.value) || 0)}
                className="bg-background/50 border-crypto-green/30 text-center"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">G(t)</label>
              <Input
                type="number"
                value={endG}
                onChange={(e) => setEndG(parseFloat(e.target.value) || 0)}
                className="bg-background/50 border-crypto-purple/30 text-center"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">t =</label>
              <Input
                type="number"
                value={endT}
                onChange={(e) => setEndT(parseInt(e.target.value) || 1)}
                min={1}
                max={10}
                className="bg-background/50 border-border/30 text-center"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={runBackwardCalculation}
              className="flex-1 bg-crypto-blue/20 hover:bg-crypto-blue/30 text-crypto-blue border border-crypto-blue/30"
            >
              <Rewind className="w-4 h-4 mr-2" />
              Rückwärts rechnen
            </Button>
            <Button
              onClick={reset}
              variant="outline"
              className="border-border/30 hover:bg-muted/20"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Results */}
        {steps.length > 0 && (
          <div className="space-y-3 animate-hash">
            <h4 className="text-crypto-gold text-xs uppercase tracking-wider">
              Rückrechnungs-Schritte
            </h4>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {steps.map((step, i) => (
                <div
                  key={i}
                  className="bg-background/30 rounded p-2 border border-border/20 text-xs"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-crypto-blue font-display">t = {step.t}</span>
                    <span className="text-muted-foreground">{step.explanation}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 font-mono">
                    <div className="text-crypto-gold">H = {step.H}</div>
                    <div className="text-crypto-green">N = {step.N}</div>
                    <div className="text-crypto-purple">G = {step.G}</div>
                  </div>
                  {step.t < endT && (
                    <div className="mt-1 text-[10px] text-muted-foreground font-mono break-all">
                      {step.equation}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Initial State Box */}
            <div className="bg-crypto-green/10 rounded p-3 border border-crypto-green/30">
              <h4 className="text-crypto-green text-xs uppercase tracking-wider mb-2">
                ✓ Ursprünglicher Input gefunden
              </h4>
              <div className="font-mono text-sm">
                <span className="text-crypto-gold">H₀ = {steps[0]?.H}</span>
                <span className="mx-2 text-muted-foreground">|</span>
                <span className="text-crypto-green">N₀ = {steps[0]?.N}</span>
                <span className="mx-2 text-muted-foreground">|</span>
                <span className="text-crypto-purple">G₀ = {steps[0]?.G}</span>
              </div>
            </div>

            {/* Verification Toggle */}
            <button
              onClick={() => setShowVerification(!showVerification)}
              className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground py-2 border-t border-border/20"
            >
              <Play className="w-3 h-3" />
              Vorwärts-Verifikation
              {showVerification ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showVerification && verificationSteps.length > 0 && (
              <div className="space-y-1">
                {verificationSteps.map((state, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 text-xs font-mono bg-background/20 rounded px-2 py-1"
                  >
                    <span className="text-crypto-blue w-12">t = {state.t}</span>
                    <span className="text-crypto-gold">H = {state.H.toFixed(2)}</span>
                    <span className="text-crypto-green">N = {state.N.toFixed(2)}</span>
                    <span className="text-crypto-purple">G = {state.G.toFixed(2)}</span>
                    {state.t === endT && (
                      <span className="text-crypto-green ml-auto">✓</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Formula */}
        <div className="text-center text-xs text-muted-foreground pt-2 border-t border-border/30">
          <code className="text-crypto-blue">
            x₀ = H⁻¹ ∘ H⁻¹ ∘ ... ∘ H⁻¹(H(T))
          </code>
        </div>
      </div>
    </CryptoPanel>
  );
}
