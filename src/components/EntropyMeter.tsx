import { useState, useEffect } from 'react';
import { generateRandomBytes, bytesToHex, bytesToBinary, calculateEntropy } from '@/lib/crypto-utils';
import { CryptoPanel } from './CryptoPanel';
import { Dice6, RefreshCw, Shield } from 'lucide-react';

export function EntropyMeter() {
  const [bytes, setBytes] = useState<Uint8Array>(new Uint8Array(32));
  const [isGenerating, setIsGenerating] = useState(false);
  const [entropy, setEntropy] = useState(0);

  const generate = async () => {
    setIsGenerating(true);
    
    // Animated generation
    for (let i = 0; i < 5; i++) {
      await new Promise(r => setTimeout(r, 50));
      setBytes(generateRandomBytes(32));
    }
    
    const newBytes = generateRandomBytes(32);
    setBytes(newBytes);
    setEntropy(calculateEntropy(bytesToHex(newBytes)));
    setIsGenerating(false);
  };

  useEffect(() => {
    generate();
  }, []);

  const hex = bytesToHex(bytes);
  const binary = bytesToBinary(bytes);
  const entropyPercent = Math.min(100, (entropy / 256) * 100);

  return (
    <CryptoPanel title="Entropy Generator" icon={<Dice6 size={16} />} glowColor="purple">
      <div className="space-y-4">
        {/* Generate Button */}
        <button
          onClick={generate}
          disabled={isGenerating}
          className="w-full py-3 bg-crypto-purple/10 border border-crypto-purple/30 rounded text-crypto-purple uppercase tracking-wider text-sm hover:bg-crypto-purple/20 hover:border-crypto-purple/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={16} className={isGenerating ? 'animate-spin' : ''} />
          Generate 256-bit Random
        </button>

        {/* Hex Display */}
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
            Hexadecimal (64 chars)
          </label>
          <div className={`bg-background/80 border border-crypto-purple/20 rounded p-3 font-mono text-[11px] break-all ${isGenerating ? 'animate-flicker' : ''}`}>
            {hex.split('').map((char, i) => (
              <span
                key={i}
                style={{
                  color: `hsl(${270 + parseInt(char, 16) * 6}, 100%, ${50 + parseInt(char, 16) * 2}%)`
                }}
              >
                {char}
              </span>
            ))}
          </div>
        </div>

        {/* Binary Display */}
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
            Binary (256 bits)
          </label>
          <div className="bg-background/80 border border-crypto-purple/20 rounded p-2 h-16 overflow-hidden">
            <div className="font-mono text-[6px] leading-tight text-crypto-purple/60 break-all">
              {binary.split('').map((bit, i) => (
                <span
                  key={i}
                  className={bit === '1' ? 'text-crypto-purple' : 'text-crypto-purple/30'}
                >
                  {bit}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Entropy Meter */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Shield size={12} />
              Entropy Quality
            </label>
            <span className="text-xs font-mono text-crypto-purple">{entropy.toFixed(1)} bits</span>
          </div>
          <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-crypto-red via-crypto-orange via-crypto-gold to-crypto-green transition-all duration-500"
              style={{ width: `${entropyPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>Weak</span>
            <span>Strong</span>
          </div>
        </div>

        {/* Security Info */}
        <div className="bg-muted/20 rounded p-3 text-xs text-muted-foreground">
          <p>
            <span className="text-crypto-purple">256 bits</span> = 
            2^256 ≈ 1.16 × 10^77 possible values
          </p>
          <p className="mt-1 text-[10px]">
            More atoms in the observable universe than keys to brute-force.
          </p>
        </div>
      </div>
    </CryptoPanel>
  );
}
