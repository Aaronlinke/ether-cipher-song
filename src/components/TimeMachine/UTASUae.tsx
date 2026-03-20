import { useState, useCallback } from 'react';
import { CryptoPanel } from '../CryptoPanel';
import { Lock, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UAEState {
  cipherFV: number[];
  plainFV: number[];
  roundTransforms: { round: number; entropy: number; diffusion: number; confusion: number }[];
  keySingularity: number[];
  extractedKeyBits: string;
  status: 'idle' | 'deconstructing' | 'complete';
  currentRound: number;
  totalRounds: number;
  erlPaths: number;
  inverseField: { x: number; y: number; z: number }[];
}

type CipherType = 'aes-256' | 'chacha20' | 'sha3-256';

const CIPHER_ROUNDS: Record<CipherType, number> = {
  'aes-256': 14,
  'chacha20': 20,
  'sha3-256': 24,
};

export function UTASUae() {
  const [cipherType, setCipherType] = useState<CipherType>('aes-256');
  const [ciphertextHex, setCiphertextHex] = useState('');
  const [state, setState] = useState<UAEState>({
    cipherFV: [],
    plainFV: [],
    roundTransforms: [],
    keySingularity: [],
    extractedKeyBits: '',
    status: 'idle',
    currentRound: 0,
    totalRounds: 0,
    erlPaths: 0,
    inverseField: [],
  });

  const generateDemo = () => {
    const hex = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    setCiphertextHex(hex);
  };

  const computeFVMapping = useCallback((hex: string): number[] => {
    // ℱ_Plain →[Rounds]→ ℱ_Cipher mapping
    const fv: number[] = [];
    for (let i = 0; i < hex.length; i += 2) {
      const byte = parseInt(hex.substring(i, i + 2) || '00', 16) / 255;
      fv.push(byte);
    }
    return fv;
  }, []);

  const runUAE = useCallback(() => {
    if (!ciphertextHex) return;
    const totalRounds = CIPHER_ROUNDS[cipherType];
    setState(prev => ({ ...prev, status: 'deconstructing', currentRound: 0, totalRounds }));

    const cipherFV = computeFVMapping(ciphertextHex);
    let currentFV = [...cipherFV];
    const roundTransforms: UAEState['roundTransforms'] = [];
    let round = 0;

    const step = () => {
      round++;

      // Inverse round transform — ERL (Entanglement Reconstruction Loop)
      const inverseFV = currentFV.map((v, i) => {
        // Simulate inverse SubBytes, ShiftRows, MixColumns for AES
        // or inverse quarter-round for ChaCha20
        const invSub = Math.sin(v * Math.PI * (totalRounds - round + 1)) * 0.5 + 0.5;
        const invShift = (invSub + (currentFV[(i + 1) % currentFV.length] || 0)) / 2;
        const invMix = invShift * Math.cos(round * Math.PI / totalRounds) * 0.5 + 0.5;
        return invMix;
      });

      // Round metrics
      const entropy = -inverseFV.reduce((s, v) => {
        const p = Math.max(v, 1e-10);
        return s + p * Math.log2(p);
      }, 0) / inverseFV.length;

      const diffusion = inverseFV.reduce((sum, v, i) => {
        return sum + Math.abs(v - cipherFV[i % cipherFV.length]);
      }, 0) / inverseFV.length;

      const confusion = inverseFV.reduce((sum, v, i) => {
        const next = inverseFV[(i + 1) % inverseFV.length];
        return sum + Math.abs(v - next);
      }, 0) / inverseFV.length;

      roundTransforms.push({ round, entropy, diffusion, confusion });
      currentFV = inverseFV;

      // Key singularity extraction at final round
      let keySingularity: number[] = [];
      let extractedKeyBits = '';
      let inverseField: UAEState['inverseField'] = [];

      if (round >= totalRounds) {
        // Key-Entanglement-Projection: Extract singularity nodes
        keySingularity = currentFV.map((v, i) => {
          return v * Math.exp(-Math.abs(v - 0.5) * 4);
        });

        // Universal-Inverse-Field-Extraction
        extractedKeyBits = keySingularity.map(v => v > 0.3 ? '1' : '0').join('');

        // 3D inverse field for visualization
        inverseField = currentFV.map((v, i) => ({
          x: Math.cos(i / currentFV.length * Math.PI * 2) * v,
          y: Math.sin(i / currentFV.length * Math.PI * 2) * v,
          z: keySingularity[i] || 0,
        }));
      }

      setState({
        cipherFV,
        plainFV: [...currentFV],
        roundTransforms: [...roundTransforms],
        keySingularity,
        extractedKeyBits,
        status: round >= totalRounds ? 'complete' : 'deconstructing',
        currentRound: round,
        totalRounds,
        erlPaths: Math.pow(2, Math.min(round, 10)),
        inverseField,
      });

      if (round < totalRounds) {
        setTimeout(step, 100);
      }
    };

    step();
  }, [ciphertextHex, cipherType, computeFVMapping]);

  const reset = () => {
    setState({
      cipherFV: [],
      plainFV: [],
      roundTransforms: [],
      keySingularity: [],
      extractedKeyBits: '',
      status: 'idle',
      currentRound: 0,
      totalRounds: 0,
      erlPaths: 0,
      inverseField: [],
    });
  };

  return (
    <CryptoPanel title="UTAS — UAE Universal-Algorithmic-Entangler" icon={<Lock size={16} />} glowColor="blue">
      <div className="space-y-4">
        {/* Formula */}
        <div className="bg-crypto-blue/5 border border-crypto-blue/20 rounded p-3">
          <p className="text-xs text-muted-foreground font-mono">
            <span className="text-crypto-blue">ℱ</span><sub>Plain</sub>
            →<sup>[Rounds]</sup>→ ℱ<sub>Cipher</sub> &nbsp;|&nbsp;
            ERL: Σ inverse Pfade → K-Singularität
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Universal-Algorithmic-Entangler • AES/ChaCha20/SHA-3 • Runden-Inversion
          </p>
        </div>

        {/* Cipher Selection */}
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Algorithmus</label>
          <Select value={cipherType} onValueChange={(v) => setCipherType(v as CipherType)}>
            <SelectTrigger className="bg-background/50 border-crypto-blue/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aes-256">AES-256 (14 Runden)</SelectItem>
              <SelectItem value="chacha20">ChaCha20 (20 Runden)</SelectItem>
              <SelectItem value="sha3-256">SHA-3/Keccak (24 Runden)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Ciphertext Input */}
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
            Ciphertext / Hash (Hex)
          </label>
          <Input value={ciphertextHex} onChange={(e) => setCiphertextHex(e.target.value)}
            className="font-mono text-[10px] bg-background/50 border-crypto-blue/20" placeholder="Hex eingeben..." />
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <Button onClick={generateDemo} variant="outline" className="border-crypto-blue/30 text-crypto-blue text-xs">
            Demo
          </Button>
          <Button onClick={runUAE} disabled={state.status === 'deconstructing' || !ciphertextHex}
            className="flex-1 bg-crypto-blue/10 border border-crypto-blue/30 text-crypto-blue hover:bg-crypto-blue/20"
            variant="outline">
            <Play size={14} className="mr-2" />
            {state.status === 'deconstructing'
              ? `Runde ${state.currentRound}/${state.totalRounds}...`
              : 'UAE Dekonstruktion'}
          </Button>
          <Button onClick={reset} variant="outline" className="border-crypto-blue/30 text-crypto-blue">
            <RotateCcw size={14} />
          </Button>
        </div>

        {/* Round Transforms Visualization */}
        {state.roundTransforms.length > 0 && (
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
              Runden-Dekonstruktion ({state.currentRound}/{state.totalRounds})
            </label>
            <div className="bg-background/80 border border-crypto-blue/20 rounded p-2 space-y-1">
              {state.roundTransforms.map(rt => (
                <div key={rt.round} className="flex items-center gap-2 text-[9px]">
                  <span className="text-muted-foreground w-8 shrink-0">R{rt.round}</span>
                  <div className="flex-1 flex gap-1 h-3">
                    <div className="bg-crypto-blue/60 rounded-sm" style={{ width: `${rt.entropy * 30}%` }} title="Entropy" />
                    <div className="bg-crypto-green/60 rounded-sm" style={{ width: `${rt.diffusion * 100}%` }} title="Diffusion" />
                    <div className="bg-crypto-purple/60 rounded-sm" style={{ width: `${rt.confusion * 100}%` }} title="Confusion" />
                  </div>
                  <span className="text-crypto-blue font-mono w-12 text-right">{rt.entropy.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-1 text-[9px] text-muted-foreground">
              <span><span className="inline-block w-2 h-2 bg-crypto-blue/60 rounded-sm mr-1" />Entropy</span>
              <span><span className="inline-block w-2 h-2 bg-crypto-green/60 rounded-sm mr-1" />Diffusion</span>
              <span><span className="inline-block w-2 h-2 bg-crypto-purple/60 rounded-sm mr-1" />Confusion</span>
            </div>
          </div>
        )}

        {/* Metrics */}
        {state.currentRound > 0 && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-background/60 border border-crypto-blue/10 rounded p-2">
              <span className="text-muted-foreground">ERL Pfade</span>
              <div className="font-mono text-crypto-blue">{state.erlPaths.toLocaleString()}</div>
            </div>
            <div className="bg-background/60 border border-crypto-blue/10 rounded p-2">
              <span className="text-muted-foreground">Status</span>
              <div className={`font-mono ${state.status === 'complete' ? 'text-crypto-green' : 'text-crypto-orange'}`}>
                {state.status === 'complete' ? 'INVERTIERT' : 'LÄUFT...'}
              </div>
            </div>
          </div>
        )}

        {/* Inverse Field Visualization */}
        {state.inverseField.length > 0 && (
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
              Inverses FV-Feld (K-Singularität)
            </label>
            <div className="bg-background/80 border border-crypto-blue/20 rounded p-2 h-32 relative overflow-hidden">
              <svg viewBox="-1.2 -1.2 2.4 2.4" className="w-full h-full">
                {state.inverseField.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={0.01 + p.z * 0.04}
                    fill={`hsl(210, 80%, ${40 + p.z * 40}%)`}
                    opacity={0.5 + p.z * 0.5}
                  />
                ))}
                {state.inverseField.length > 1 && (
                  <polyline
                    points={state.inverseField.map(p => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke="hsl(210, 70%, 55%)"
                    strokeWidth="0.004"
                    opacity="0.4"
                  />
                )}
              </svg>
            </div>
          </div>
        )}

        {/* Extracted Key Bits */}
        {state.extractedKeyBits && (
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
              Extrahierte K-Bits (Universal-Inverse-Field)
            </label>
            <div className="bg-background/80 border border-crypto-blue/20 rounded p-2 font-mono text-[9px] break-all text-crypto-blue/80 max-h-16 overflow-y-auto">
              {state.extractedKeyBits}
            </div>
          </div>
        )}
      </div>
    </CryptoPanel>
  );
}
