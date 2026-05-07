import { useState, useEffect, useRef } from 'react';
import { CryptoPanel } from './CryptoPanel';
import { Calculator, Clock, Cpu, Zap, Play, Square, Target, Trophy, Activity } from 'lucide-react';
import { privateKeyToAddress, bytesToHex, generateRandomBytes } from '@/lib/crypto-utils';
import { toast } from 'sonner';

// Bekannte Bitcoin-Puzzle-Adressen (ungelöste + einige berühmte)
const PUZZLE_TARGETS: Record<number, string> = {
  32: '187swFMjz1G54ycVU56B7jZFHFTNVQFDiu',
  33: '1HsMJxNiV7TLxmoF6uJNkydxPFDog4NQum',
  40: '1EeAxcprB2PpCnr34VfZdFrkUWuxyiNEFv',
  50: '1MEzite4ReNuWaL5Ds17ePKt2dCxWEofwk',
  64: '16jY7qLJnxb7CHZyqBP8qca9d51gAjyXQN',
  66: '13zb1hQbWVsc2S7ZTZnP2G4undNNpdh5so',
  67: '1BY8GQbnueYofwSuFAT3USAhGjPrkxDdW9',
  71: '1PWo3JeB9jrGwfHDNpdGK54CRas7fsVzXU',
  72: '1JTK7s9YVYywfm5XUH7RNhHJH1LshCaRFR',
};

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

  // === OMNI-HUNTER Live State ===
  const [hunting, setHunting] = useState(false);
  const [tries, setTries] = useState(0);
  const [realSpeed, setRealSpeed] = useState(0);
  const [lastKey, setLastKey] = useState('');
  const [lastAddr, setLastAddr] = useState('');
  const [bestEntropy, setBestEntropy] = useState(0);
  const [bestKey, setBestKey] = useState('');
  const [found, setFound] = useState<{ key: string; addr: string } | null>(null);
  const [customTarget, setCustomTarget] = useState('');
  const huntingRef = useRef(false);
  const triesRef = useRef(0);
  const lastTickRef = useRef(Date.now());
  const tickCountRef = useRef(0);

  // Erzeuge zufälligen Private-Key innerhalb des gewählten Bit-Bereichs
  function randomKeyInRange(bitSize: number): string {
    const byteLen = Math.ceil(bitSize / 8);
    const bytes = generateRandomBytes(byteLen);
    // Maskiere höchstes Byte auf gewünschte Bit-Anzahl
    const topBits = bitSize % 8 || 8;
    bytes[0] = bytes[0] & ((1 << topBits) - 1);
    // Setze MSB damit der Key wirklich in der oberen Hälfte des Bereichs liegt (Puzzle-Style)
    if (bitSize > 1) bytes[0] = bytes[0] | (1 << (topBits - 1));
    const hex = bytesToHex(bytes).padStart(64, '0');
    return hex;
  }

  async function huntLoop() {
    const BATCH = 50;
    while (huntingRef.current) {
      const targets = new Set<string>();
      const puzzleAddr = PUZZLE_TARGETS[bits];
      if (puzzleAddr) targets.add(puzzleAddr);
      if (customTarget.trim()) targets.add(customTarget.trim());

      let lastK = '';
      let lastA = '';
      for (let i = 0; i < BATCH && huntingRef.current; i++) {
        const k = randomKeyInRange(bits);
        try {
          const addr = await privateKeyToAddress(k, true);
          lastK = k;
          lastA = addr;
          triesRef.current++;
          tickCountRef.current++;

          // Entropie-Tracking (wie viele unterschiedliche Hex-Zeichen)
          const uniq = new Set(addr.slice(1, 20)).size;
          if (uniq > bestEntropy) {
            setBestEntropy(uniq);
            setBestKey(k);
          }

          if (targets.has(addr)) {
            huntingRef.current = false;
            setHunting(false);
            setFound({ key: k, addr });
            toast.success(`🎯 TREFFER! Adresse ${addr} gefunden!`, { duration: 30000 });
            return;
          }
        } catch (e) {
          // skip invalid keys
        }
      }
      setLastKey(lastK);
      setLastAddr(lastA);
      setTries(triesRef.current);

      // Speed-Berechnung
      const now = Date.now();
      const dt = now - lastTickRef.current;
      if (dt >= 500) {
        setRealSpeed(Math.round((tickCountRef.current / dt) * 1000));
        tickCountRef.current = 0;
        lastTickRef.current = now;
      }

      // yield to UI
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  function startHunt() {
    if (huntingRef.current) return;
    triesRef.current = 0;
    tickCountRef.current = 0;
    lastTickRef.current = Date.now();
    setTries(0);
    setRealSpeed(0);
    setFound(null);
    setBestEntropy(0);
    setBestKey('');
    huntingRef.current = true;
    setHunting(true);
    toast.info(`🚀 OMNI-HUNTER gestartet — ${bits}-bit Range`);
    huntLoop();
  }

  function stopHunt() {
    huntingRef.current = false;
    setHunting(false);
    toast.info('⏹ Hunt gestoppt');
  }

  useEffect(() => {
    return () => {
      huntingRef.current = false;
    };
  }, []);

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

        {/* === OMNI-HUNTER LIVE MODULE === */}
        <div className="border-t border-crypto-purple/30 pt-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-crypto-purple animate-pulse" />
              <span className="text-xs font-display text-crypto-purple uppercase tracking-wider">
                OMNI-Hunter Live-Engine
              </span>
            </div>
            <span className="text-[9px] text-muted-foreground font-mono">
              SRIL ⊗ UTAS ⊗ secp256k1
            </span>
          </div>

          <div className="text-[10px] text-muted-foreground mb-2 font-mono">
            Echte Brute-Force über secp256k1 → SHA256 → RIPEMD160 → Base58Check.
            {PUZZLE_TARGETS[bits] && (
              <span className="block text-crypto-gold mt-1">
                🎯 Ziel-Puzzle #{bits}: <span className="break-all">{PUZZLE_TARGETS[bits]}</span>
              </span>
            )}
          </div>

          <input
            type="text"
            value={customTarget}
            onChange={(e) => setCustomTarget(e.target.value)}
            placeholder="Eigene Ziel-Adresse (optional, z.B. 1A1zP1...)"
            className="w-full bg-input/50 border border-crypto-purple/20 rounded p-2 text-crypto-purple font-mono text-[10px] mb-3 focus:border-crypto-purple/50 focus:outline-none"
          />

          <div className="flex gap-2 mb-3">
            {!hunting ? (
              <button
                onClick={startHunt}
                className="flex-1 flex items-center justify-center gap-2 bg-crypto-green/20 hover:bg-crypto-green/30 border border-crypto-green/50 text-crypto-green rounded py-2 text-xs font-display uppercase tracking-wider transition-all"
              >
                <Play size={14} />
                Start Hunt
              </button>
            ) : (
              <button
                onClick={stopHunt}
                className="flex-1 flex items-center justify-center gap-2 bg-crypto-red/20 hover:bg-crypto-red/30 border border-crypto-red/50 text-crypto-red rounded py-2 text-xs font-display uppercase tracking-wider transition-all animate-pulse"
              >
                <Square size={14} />
                Stop Hunt
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="bg-muted/30 rounded p-2">
              <div className="text-[9px] text-muted-foreground uppercase">Versuche</div>
              <div className="text-sm font-mono text-crypto-blue">{tries.toLocaleString('de-DE')}</div>
            </div>
            <div className="bg-muted/30 rounded p-2">
              <div className="text-[9px] text-muted-foreground uppercase flex items-center gap-1">
                <Zap size={9} /> Real Keys/s
              </div>
              <div className="text-sm font-mono text-crypto-gold">{realSpeed.toLocaleString('de-DE')}</div>
            </div>
          </div>

          {lastKey && (
            <div className="bg-muted/20 rounded p-2 mb-2">
              <div className="text-[9px] text-muted-foreground uppercase mb-1">Letzter Key</div>
              <div className="text-[9px] font-mono text-crypto-purple/80 break-all">{lastKey}</div>
              <div className="text-[9px] font-mono text-crypto-blue/80 break-all mt-1">→ {lastAddr}</div>
            </div>
          )}

          {bestKey && (
            <div className="bg-muted/20 rounded p-2 mb-2">
              <div className="text-[9px] text-muted-foreground uppercase mb-1 flex items-center gap-1">
                <Trophy size={9} /> Beste Entropie ({bestEntropy} unique chars)
              </div>
              <div className="text-[9px] font-mono text-crypto-orange break-all">{bestKey}</div>
            </div>
          )}

          {found && (
            <div className="bg-crypto-green/20 border-2 border-crypto-green rounded p-3 animate-pulse">
              <div className="flex items-center gap-2 mb-2">
                <Target size={14} className="text-crypto-green" />
                <span className="text-sm font-display text-crypto-green uppercase">
                  TREFFER!
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground">Private Key:</div>
              <div className="text-[10px] font-mono text-crypto-green break-all mb-1">{found.key}</div>
              <div className="text-[10px] text-muted-foreground">Adresse:</div>
              <div className="text-[10px] font-mono text-crypto-gold break-all">{found.addr}</div>
            </div>
          )}
        </div>
      </div>
    </CryptoPanel>
  );
}
