import { useState } from 'react';
import { base58Encode, base58Decode, hexToBytes, bytesToHex } from '@/lib/crypto-utils';
import { CryptoPanel } from './CryptoPanel';
import { Binary, ArrowRightLeft } from 'lucide-react';

export function Base58Converter() {
  const [hexInput, setHexInput] = useState('00f54a5851e9372b87810a8e60cdd2e7cfd80b6e31');
  const [base58Output, setBase58Output] = useState('');
  const [error, setError] = useState('');
  const [direction, setDirection] = useState<'encode' | 'decode'>('encode');

  const handleConvert = () => {
    setError('');
    try {
      if (direction === 'encode') {
        const bytes = hexToBytes(hexInput);
        const encoded = base58Encode(bytes);
        setBase58Output(encoded);
      } else {
        const decoded = base58Decode(hexInput);
        setBase58Output(bytesToHex(decoded));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Conversion failed');
    }
  };

  const toggleDirection = () => {
    setDirection(d => d === 'encode' ? 'decode' : 'encode');
    setHexInput(base58Output);
    setBase58Output('');
  };

  return (
    <CryptoPanel title="Base58 Encoder/Decoder" icon={<Binary size={16} />} glowColor="blue">
      <div className="space-y-4">
        {/* Direction Toggle */}
        <div className="flex items-center justify-center gap-4">
          <span className={`text-sm uppercase ${direction === 'encode' ? 'text-crypto-blue' : 'text-muted-foreground'}`}>
            Hex → Base58
          </span>
          <button
            onClick={toggleDirection}
            className="p-2 rounded border border-crypto-blue/30 hover:border-crypto-blue/60 transition-colors"
          >
            <ArrowRightLeft size={16} className="text-crypto-blue" />
          </button>
          <span className={`text-sm uppercase ${direction === 'decode' ? 'text-crypto-blue' : 'text-muted-foreground'}`}>
            Base58 → Hex
          </span>
        </div>

        {/* Input */}
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
            {direction === 'encode' ? 'Hex Input' : 'Base58 Input'}
          </label>
          <input
            type="text"
            value={hexInput}
            onChange={(e) => setHexInput(e.target.value)}
            className="w-full bg-input/50 border border-crypto-blue/20 rounded p-3 text-crypto-blue font-mono text-sm focus:border-crypto-blue/50 focus:outline-none transition-colors"
            placeholder={direction === 'encode' ? 'Enter hex...' : 'Enter Base58...'}
          />
        </div>

        {/* Convert Button */}
        <button
          onClick={handleConvert}
          className="w-full py-2 bg-crypto-blue/10 border border-crypto-blue/30 rounded text-crypto-blue uppercase tracking-wider text-sm hover:bg-crypto-blue/20 hover:border-crypto-blue/50 transition-all"
        >
          Convert
        </button>

        {/* Output */}
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
            {direction === 'encode' ? 'Base58 Output' : 'Hex Output'}
          </label>
          <div className="bg-background/80 border border-crypto-blue/20 rounded p-3 font-mono text-sm break-all min-h-[48px]">
            {error ? (
              <span className="text-crypto-red">{error}</span>
            ) : (
              <span className="text-crypto-blue">{base58Output || '—'}</span>
            )}
          </div>
        </div>

        {/* Base58 Alphabet Reference */}
        <div className="pt-2 border-t border-border/30">
          <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
            Base58 Alphabet (no 0, O, I, l)
          </label>
          <div className="text-[10px] font-mono text-crypto-blue/70 leading-relaxed">
            123456789ABCDEFGH<span className="text-crypto-red/50">J</span>KLMN<span className="text-crypto-red/50">P</span>QRSTUVWXYZabcdefgh<span className="text-crypto-red/50">ijk</span>mnopqrstuvwxyz
          </div>
        </div>
      </div>
    </CryptoPanel>
  );
}
