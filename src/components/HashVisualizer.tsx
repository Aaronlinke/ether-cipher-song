import { useState, useEffect } from 'react';
import { sha256, bytesToHex, hashToColors } from '@/lib/crypto-utils';
import { CryptoPanel } from './CryptoPanel';
import { Hash, Zap, ArrowRight, GitCompare } from 'lucide-react';

export function HashVisualizer() {
  const [input, setInput] = useState('Hello, Cryptography!');
  const [input2, setInput2] = useState('Hello, Cryptography.');
  const [hash, setHash] = useState('');
  const [hash2, setHash2] = useState('');
  const [isHashing, setIsHashing] = useState(false);
  const [colors, setColors] = useState<string[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [diffBits, setDiffBits] = useState(0);

  useEffect(() => {
    const computeHash = async () => {
      setIsHashing(true);
      await new Promise(r => setTimeout(r, 100));
      
      const hashBytes = await sha256(input);
      const hashHex = bytesToHex(hashBytes);
      setHash(hashHex);
      setColors(hashToColors(hashHex));

      if (compareMode) {
        const hashBytes2 = await sha256(input2);
        const hashHex2 = bytesToHex(hashBytes2);
        setHash2(hashHex2);
        
        // Count different bits
        let diff = 0;
        for (let i = 0; i < hashHex.length; i++) {
          const n1 = parseInt(hashHex[i], 16);
          const n2 = parseInt(hashHex2[i], 16);
          const xor = n1 ^ n2;
          diff += xor.toString(2).split('1').length - 1;
        }
        setDiffBits(diff);
      }

      setIsHashing(false);
    };

    const debounce = setTimeout(computeHash, 300);
    return () => clearTimeout(debounce);
  }, [input, input2, compareMode]);

  return (
    <CryptoPanel title="SHA-256 Hash Generator" icon={<Hash size={16} />} glowColor="green">
      <div className="space-y-4">
        {/* Compare Mode Toggle */}
        <div className="flex justify-end">
          <button
            onClick={() => setCompareMode(!compareMode)}
            className={`flex items-center gap-1 px-2 py-1 text-[10px] rounded border transition-all ${
              compareMode
                ? 'bg-crypto-blue/20 border-crypto-blue text-crypto-blue'
                : 'border-border/30 text-muted-foreground hover:border-border/60'
            }`}
          >
            <GitCompare size={12} />
            Vergleichen
          </button>
        </div>

        {/* Input(s) */}
        <div className={`grid gap-4 ${compareMode ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
              Input {compareMode && '1'}
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full bg-input/50 border border-crypto-green/20 rounded p-3 text-crypto-green font-mono text-sm focus:border-crypto-green/50 focus:outline-none resize-none transition-colors"
              rows={2}
              placeholder="Enter data to hash..."
            />
          </div>
          
          {compareMode && (
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                Input 2
              </label>
              <textarea
                value={input2}
                onChange={(e) => setInput2(e.target.value)}
                className="w-full bg-input/50 border border-crypto-blue/20 rounded p-3 text-crypto-blue font-mono text-sm focus:border-crypto-blue/50 focus:outline-none resize-none transition-colors"
                rows={2}
                placeholder="Enter data to compare..."
              />
            </div>
          )}
        </div>

        {/* Hash Animation */}
        <div className="flex items-center gap-2 py-2">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-crypto-green/50 to-transparent" />
          <Zap size={20} className={`text-crypto-green ${isHashing ? 'animate-flicker' : ''}`} />
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-crypto-green/50 to-transparent" />
        </div>

        {/* Hash Output(s) */}
        <div className={`grid gap-4 ${compareMode ? 'grid-cols-1' : 'grid-cols-1'}`}>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
              SHA-256 Output {compareMode && '1'}
            </label>
            <div className="bg-background/80 border border-crypto-green/20 rounded p-3 font-mono text-[10px] break-all">
              {hash.split('').map((char, i) => (
                <span
                  key={i}
                  className={`inline-block transition-all duration-300 ${isHashing ? 'opacity-50' : ''} ${
                    compareMode && hash2[i] !== char ? 'bg-crypto-red/30 text-crypto-red' : ''
                  }`}
                  style={{ 
                    animationDelay: `${i * 10}ms`,
                    color: compareMode && hash2[i] !== char ? undefined : (parseInt(char, 16) > 7 ? 'hsl(var(--crypto-gold))' : 'hsl(var(--crypto-green))')
                  }}
                >
                  {char}
                </span>
              ))}
            </div>
          </div>

          {compareMode && (
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                SHA-256 Output 2
              </label>
              <div className="bg-background/80 border border-crypto-blue/20 rounded p-3 font-mono text-[10px] break-all">
                {hash2.split('').map((char, i) => (
                  <span
                    key={i}
                    className={`inline-block ${
                      hash[i] !== char ? 'bg-crypto-red/30 text-crypto-red' : 'text-crypto-blue'
                    }`}
                  >
                    {char}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Avalanche Effect */}
        {compareMode && (
          <div className="bg-crypto-purple/10 border border-crypto-purple/30 rounded p-3">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-[10px] text-muted-foreground uppercase">Avalanche Effect</div>
                <div className="text-lg font-mono text-crypto-purple">{diffBits} / 256 Bits</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-muted-foreground uppercase">Änderung</div>
                <div className="text-lg font-mono text-crypto-purple">{((diffBits / 256) * 100).toFixed(1)}%</div>
              </div>
            </div>
            <div className="h-2 bg-muted/50 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-crypto-purple transition-all duration-500"
                style={{ width: `${(diffBits / 256) * 100}%` }}
              />
            </div>
            <div className="text-[10px] text-muted-foreground mt-2">
              Ideal: ~50% (128 bits) bei minimaler Eingabeänderung
            </div>
          </div>
        )}

        {/* Color Visualization */}
        {!compareMode && (
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
              Visual Representation
            </label>
            <div className="grid grid-cols-8 gap-1">
              {colors.slice(0, 8).map((color, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-sm transition-all duration-500"
                  style={{ backgroundColor: color, opacity: isHashing ? 0.3 : 1 }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/30 rounded p-2">
            <div className="text-lg font-display text-crypto-gold">{input.length}</div>
            <div className="text-[10px] text-muted-foreground uppercase">Input Bytes</div>
          </div>
          <div className="bg-muted/30 rounded p-2">
            <div className="text-lg font-display text-crypto-green">256</div>
            <div className="text-[10px] text-muted-foreground uppercase">Output Bits</div>
          </div>
          <div className="bg-muted/30 rounded p-2">
            <div className="text-lg font-display text-crypto-blue">2^256</div>
            <div className="text-[10px] text-muted-foreground uppercase">Possible</div>
          </div>
        </div>
      </div>
    </CryptoPanel>
  );
}
