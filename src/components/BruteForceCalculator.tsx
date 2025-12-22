import { useState, useEffect } from 'react';
import { CryptoPanel } from './CryptoPanel';
import { Calculator, Clock, Cpu, Zap } from 'lucide-react';

const presets = [
  { bits: 32, name: 'Puzzle #32', color: 'crypto-green' },
  { bits: 40, name: 'Puzzle #40', color: 'crypto-green' },
  { bits: 50, name: 'Puzzle #50', color: 'crypto-blue' },
  { bits: 66, name: 'Puzzle #66', color: 'crypto-purple' },
  { bits: 71, name: 'Puzzle #71', color: 'crypto-orange' },
  { bits: 80, name: '80 bits', color: 'crypto-red' },
  { bits: 128, name: 'AES-128', color: 'crypto-red' },
  { bits: 160, name: 'Puzzle #160', color: 'crypto-red' },
  { bits: 256, name: 'Bitcoin Key', color: 'crypto-red' },
];

const hardwarePresets = [
  { name: 'RTX 4090', keysPerSec: 2_500_000_000 },
  { name: '1000x RTX 4090', keysPerSec: 2_500_000_000_000 },
  { name: 'Bitcoin Netzwerk', keysPerSec: 500_000_000_000_000_000_000 },
  { name: 'Theoretisches Max', keysPerSec: 1e30 },
];

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return '< 1 Sekunde';
  
  const units = [
    { name: 'Jahre', sec: 365.25 * 24 * 3600 },
    { name: 'Tage', sec: 24 * 3600 },
    { name: 'Stunden', sec: 3600 },
    { name: 'Minuten', sec: 60 },
    { name: 'Sekunden', sec: 1 },
  ];

  if (seconds > 1e50) {
    const years = seconds / (365.25 * 24 * 3600);
    const exp = Math.floor(Math.log10(years));
    const mantissa = years / Math.pow(10, exp);
    return `${mantissa.toFixed(2)} × 10^${exp} Jahre`;
  }

  for (const unit of units) {
    if (seconds >= unit.sec) {
      const val = seconds / unit.sec;
      if (val >= 1e6) {
        const exp = Math.floor(Math.log10(val));
        const mantissa = val / Math.pow(10, exp);
        return `${mantissa.toFixed(2)} × 10^${exp} ${unit.name}`;
      }
      return `${val.toFixed(2)} ${unit.name}`;
    }
  }
  
  return '< 1 Sekunde';
}

function formatNumber(n: number): string {
  if (n >= 1e15) {
    const exp = Math.floor(Math.log10(n));
    const mantissa = n / Math.pow(10, exp);
    return `${mantissa.toFixed(2)} × 10^${exp}`;
  }
  return n.toLocaleString('de-DE');
}

export function BruteForceCalculator() {
  const [bits, setBits] = useState(66);
  const [keysPerSec, setKeysPerSec] = useState(2_500_000_000);
  const [customKeys, setCustomKeys] = useState('2500000000');
  const [result, setResult] = useState({ keyspace: 0, time50: 0, time100: 0 });

  useEffect(() => {
    const keyspace = Math.pow(2, bits);
    const time50 = (keyspace * 0.5) / keysPerSec;
    const time100 = keyspace / keysPerSec;
    setResult({ keyspace, time50, time100 });
  }, [bits, keysPerSec]);

  const probability = 1 / result.keyspace;
  const universeAge = 13.8e9 * 365.25 * 24 * 3600; // in seconds
  const universeComparison = result.time50 / universeAge;

  return (
    <CryptoPanel title="Brute-Force Rechner" icon={<Calculator size={16} />} glowColor="purple">
      <div className="space-y-4">
        {/* Bit Size Selection */}
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
            Schlüsselgröße (Bits)
          </label>
          <div className="flex flex-wrap gap-1 mb-2">
            {presets.map((preset) => (
              <button
                key={preset.bits}
                onClick={() => setBits(preset.bits)}
                className={`px-2 py-1 text-[10px] rounded border transition-all ${
                  bits === preset.bits
                    ? `bg-${preset.color}/20 border-${preset.color} text-${preset.color}`
                    : 'border-border/30 text-muted-foreground hover:border-border/60'
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>
          <input
            type="range"
            min="1"
            max="256"
            value={bits}
            onChange={(e) => setBits(Number(e.target.value))}
            className="w-full h-2 bg-muted/50 rounded-lg appearance-none cursor-pointer accent-crypto-purple"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>1 bit</span>
            <span className="text-crypto-purple font-mono">{bits} bits</span>
            <span>256 bits</span>
          </div>
        </div>

        {/* Hardware Selection */}
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block flex items-center gap-2">
            <Cpu size={12} />
            Hardware (Keys/Sekunde)
          </label>
          <div className="flex flex-wrap gap-1 mb-2">
            {hardwarePresets.map((hw) => (
              <button
                key={hw.name}
                onClick={() => {
                  setKeysPerSec(hw.keysPerSec);
                  setCustomKeys(hw.keysPerSec.toString());
                }}
                className={`px-2 py-1 text-[10px] rounded border transition-all ${
                  keysPerSec === hw.keysPerSec
                    ? 'bg-crypto-blue/20 border-crypto-blue text-crypto-blue'
                    : 'border-border/30 text-muted-foreground hover:border-border/60'
                }`}
              >
                {hw.name}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={customKeys}
            onChange={(e) => {
              setCustomKeys(e.target.value);
              const num = parseFloat(e.target.value.replace(/[^\d.e+]/gi, ''));
              if (!isNaN(num) && num > 0) setKeysPerSec(num);
            }}
            className="w-full bg-input/50 border border-crypto-blue/20 rounded p-2 text-crypto-blue font-mono text-xs focus:border-crypto-blue/50 focus:outline-none"
            placeholder="Keys pro Sekunde..."
          />
        </div>

        {/* Results */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/30 rounded p-3">
            <div className="text-[10px] text-muted-foreground uppercase mb-1">Schlüsselraum</div>
            <div className="text-sm font-mono text-crypto-purple">2^{bits}</div>
            <div className="text-[10px] font-mono text-crypto-purple/70">
              = {formatNumber(result.keyspace)}
            </div>
          </div>
          
          <div className="bg-muted/30 rounded p-3">
            <div className="text-[10px] text-muted-foreground uppercase mb-1">Wahrscheinlichkeit</div>
            <div className="text-sm font-mono text-crypto-gold">
              {probability > 1e-10 ? probability.toExponential(2) : `1 / 2^${bits}`}
            </div>
            <div className="text-[10px] text-muted-foreground">pro Versuch</div>
          </div>
        </div>

        {/* Time Estimates */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock size={12} />
            <span>Geschätzte Zeit</span>
          </div>
          
          <div className="bg-crypto-orange/10 border border-crypto-orange/30 rounded p-3">
            <div className="text-[10px] text-crypto-orange uppercase mb-1">50% Wahrscheinlichkeit</div>
            <div className="text-lg font-mono text-crypto-orange">{formatTime(result.time50)}</div>
          </div>
          
          <div className="bg-crypto-red/10 border border-crypto-red/30 rounded p-3">
            <div className="text-[10px] text-crypto-red uppercase mb-1">100% (Worst Case)</div>
            <div className="text-lg font-mono text-crypto-red">{formatTime(result.time100)}</div>
          </div>
        </div>

        {/* Universe Comparison */}
        {universeComparison > 1 && (
          <div className="bg-muted/20 rounded p-3 text-center">
            <div className="text-[10px] text-muted-foreground uppercase mb-1">Universum-Vergleich</div>
            <div className="text-sm font-mono text-crypto-gold">
              {formatNumber(universeComparison)}× Alter des Universums
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              (Universum ≈ 13.8 Milliarden Jahre)
            </div>
          </div>
        )}

        {/* Visual Indicator */}
        <div>
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>Machbarkeit</span>
            <span>{bits <= 50 ? 'Möglich' : bits <= 80 ? 'Sehr schwer' : 'Unmöglich'}</span>
          </div>
          <div className="h-3 bg-muted/50 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                bits <= 40 ? 'bg-crypto-green' :
                bits <= 60 ? 'bg-crypto-orange' :
                'bg-crypto-red'
              }`}
              style={{ width: `${Math.max(2, 100 - (bits / 256) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </CryptoPanel>
  );
}
