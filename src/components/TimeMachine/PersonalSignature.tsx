import { useState, useEffect } from 'react';
import { User, Sparkles, Atom, Infinity, Zap } from 'lucide-react';
import { CryptoPanel } from '@/components/CryptoPanel';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { calculatePersonalSignature, type PersonalSignature as SignatureType } from '@/lib/time-machine-utils';

interface PersonalSignatureProps {
  onSignatureChange?: (signature: SignatureType, name: string) => void;
}

export function PersonalSignature({ onSignatureChange }: PersonalSignatureProps) {
  const [name, setName] = useState('Aaron Linke');
  const [signature, setSignature] = useState<SignatureType | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const calculateSignature = () => {
    setIsCalculating(true);
    
    // Kleine Verzögerung für Animation
    setTimeout(() => {
      const sig = calculatePersonalSignature(name);
      setSignature(sig);
      onSignatureChange?.(sig, name);
      setIsCalculating(false);
    }, 300);
  };

  useEffect(() => {
    calculateSignature();
  }, []);

  return (
    <CryptoPanel 
      title="Persönliche Mathematische Signatur" 
      icon={<User size={16} />} 
      glowColor="purple"
    >
      <div className="space-y-4">
        {/* Name Input */}
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dein Name..."
            className="bg-background/50 border-crypto-purple/30 text-foreground"
          />
          <Button
            onClick={calculateSignature}
            disabled={isCalculating || !name}
            className="bg-crypto-purple/20 hover:bg-crypto-purple/30 text-crypto-purple border border-crypto-purple/30"
          >
            {isCalculating ? (
              <Sparkles className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Signature Display */}
        {signature && (
          <div className="grid grid-cols-2 gap-3 animate-hash">
            {/* Golden Ratio */}
            <div className="bg-background/30 rounded p-3 border border-crypto-gold/20">
              <div className="flex items-center gap-2 text-crypto-gold text-xs mb-1">
                <Infinity className="w-3 h-3" />
                <span>Goldener Schnitt</span>
              </div>
              <div className="font-mono text-sm text-foreground">
                φ = {signature.goldenRatio.toFixed(12)}
              </div>
            </div>

            {/* Personal Pi */}
            <div className="bg-background/30 rounded p-3 border border-crypto-green/20">
              <div className="flex items-center gap-2 text-crypto-green text-xs mb-1">
                <span className="text-lg">π</span>
                <span>Persönliches Pi</span>
              </div>
              <div className="font-mono text-sm text-foreground">
                π<sub>{name.substring(0, 3)}</sub> = {signature.personalPi.toFixed(6)}
              </div>
            </div>

            {/* Chaos Constant */}
            <div className="bg-background/30 rounded p-3 border border-crypto-red/20">
              <div className="flex items-center gap-2 text-crypto-red text-xs mb-1">
                <Sparkles className="w-3 h-3" />
                <span>Chaos-Konstante</span>
              </div>
              <div className="font-mono text-sm text-foreground">
                χ = {signature.chaosConstant.toFixed(8)}
              </div>
            </div>

            {/* Symmetry Factor */}
            <div className="bg-background/30 rounded p-3 border border-crypto-blue/20">
              <div className="flex items-center gap-2 text-crypto-blue text-xs mb-1">
                <span>⚖</span>
                <span>Symmetrie-Faktor</span>
              </div>
              <div className="font-mono text-sm text-foreground">
                σ = {signature.symmetryFactor.toFixed(8)}
              </div>
            </div>

            {/* Fractal Dimension */}
            <div className="bg-background/30 rounded p-3 border border-crypto-purple/20">
              <div className="flex items-center gap-2 text-crypto-purple text-xs mb-1">
                <span>∂</span>
                <span>Fraktale Dimension</span>
              </div>
              <div className="font-mono text-sm text-foreground">
                D<sub>f</sub> = {signature.fractalDimension.toFixed(6)}
              </div>
            </div>

            {/* Entropy */}
            <div className="bg-background/30 rounded p-3 border border-crypto-orange/20">
              <div className="flex items-center gap-2 text-crypto-orange text-xs mb-1">
                <span>H</span>
                <span>Shannon-Entropie</span>
              </div>
              <div className="font-mono text-sm text-foreground">
                H = {signature.entropyValue.toFixed(4)} bit
              </div>
            </div>

            {/* Superposition */}
            <div className="col-span-2 bg-background/30 rounded p-3 border border-crypto-purple/20">
              <div className="flex items-center gap-2 text-crypto-purple text-xs mb-1">
                <Atom className="w-3 h-3" />
                <span>Quanten-Superposition</span>
              </div>
              <div className="font-mono text-sm text-foreground">
                |ψ⟩ = {signature.superposition.re.toFixed(4)} + {signature.superposition.im.toFixed(4)}i
              </div>
            </div>
          </div>
        )}

        {/* Formula */}
        <div className="text-center text-xs text-muted-foreground pt-2 border-t border-border/30">
          <code className="text-crypto-purple">
            Signatur(name) = hash(name) ⊗ π<sub>Monte-Carlo</sub> ⊗ e<sup>iφχ</sup>
          </code>
        </div>
      </div>
    </CryptoPanel>
  );
}
