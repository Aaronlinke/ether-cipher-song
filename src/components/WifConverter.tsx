import { useState } from 'react';
import { CryptoPanel } from './CryptoPanel';
import { Key, Copy, Check, ArrowDownUp } from 'lucide-react';
import { bytesToHex, hexToBytes, base58Encode } from '@/lib/crypto-utils';

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export function WifConverter() {
  const [privateKeyHex, setPrivateKeyHex] = useState('');
  const [wif, setWif] = useState('');
  const [compressed, setCompressed] = useState(true);
  const [network, setNetwork] = useState<'mainnet' | 'testnet'>('mainnet');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [steps, setSteps] = useState<{ label: string; value: string }[]>([]);

  const convertToWif = async () => {
    setError('');
    setSteps([]);
    
    try {
      const cleanHex = privateKeyHex.replace(/^0x/, '').replace(/\s/g, '');
      
      if (!/^[0-9a-fA-F]{64}$/.test(cleanHex)) {
        throw new Error('Private Key muss 64 Hex-Zeichen (32 Bytes) sein');
      }

      const privKeyBytes = hexToBytes(cleanHex);
      const versionByte = network === 'mainnet' ? 0x80 : 0xef;
      
      // Step 1: Add version byte
      let extended: number[] = [versionByte, ...Array.from(privKeyBytes)];
      const step1 = bytesToHex(new Uint8Array(extended));
      
      // Step 2: Add compression flag if compressed
      if (compressed) {
        extended.push(0x01);
      }
      const step2 = bytesToHex(new Uint8Array(extended));
      
      // Step 3: Double SHA256 for checksum
      const firstHash = await crypto.subtle.digest('SHA-256', new Uint8Array(extended));
      const secondHash = await crypto.subtle.digest('SHA-256', firstHash);
      const checksum = new Uint8Array(secondHash).slice(0, 4);
      const step3 = bytesToHex(checksum);
      
      // Step 4: Append checksum
      const final = new Uint8Array([...extended, ...Array.from(checksum)]);
      const step4 = bytesToHex(final);
      
      // Step 5: Base58 encode
      const wifResult = base58Encode(final);
      
      setSteps([
        { label: '1. Version Byte hinzufügen', value: step1 },
        { label: compressed ? '2. Compression Flag (0x01)' : '2. Kein Compression Flag', value: step2 },
        { label: '3. Checksum (SHA256²)', value: step3 },
        { label: '4. Final Hex', value: step4 },
        { label: '5. Base58 Encode', value: wifResult }
      ]);
      
      setWif(wifResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Konvertierung fehlgeschlagen');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(wif);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateRandom = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    setPrivateKeyHex(bytesToHex(bytes));
  };

  return (
    <CryptoPanel title="WIF Converter" icon={<Key size={16} />} glowColor="gold">
      <div className="space-y-4">
        {/* Network & Compression Toggle */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
              Netzwerk
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setNetwork('mainnet')}
                className={`flex-1 py-2 text-xs rounded border transition-all ${
                  network === 'mainnet'
                    ? 'bg-crypto-gold/20 border-crypto-gold text-crypto-gold'
                    : 'border-border/30 text-muted-foreground hover:border-border/60'
                }`}
              >
                Mainnet (0x80)
              </button>
              <button
                onClick={() => setNetwork('testnet')}
                className={`flex-1 py-2 text-xs rounded border transition-all ${
                  network === 'testnet'
                    ? 'bg-crypto-blue/20 border-crypto-blue text-crypto-blue'
                    : 'border-border/30 text-muted-foreground hover:border-border/60'
                }`}
              >
                Testnet (0xEF)
              </button>
            </div>
          </div>
          
          <div className="flex-1">
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
              Kompression
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setCompressed(true)}
                className={`flex-1 py-2 text-xs rounded border transition-all ${
                  compressed
                    ? 'bg-crypto-green/20 border-crypto-green text-crypto-green'
                    : 'border-border/30 text-muted-foreground hover:border-border/60'
                }`}
              >
                Compressed
              </button>
              <button
                onClick={() => setCompressed(false)}
                className={`flex-1 py-2 text-xs rounded border transition-all ${
                  !compressed
                    ? 'bg-crypto-purple/20 border-crypto-purple text-crypto-purple'
                    : 'border-border/30 text-muted-foreground hover:border-border/60'
                }`}
              >
                Uncompressed
              </button>
            </div>
          </div>
        </div>

        {/* Private Key Input */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">
              Private Key (Hex)
            </label>
            <button
              onClick={generateRandom}
              className="text-[10px] text-crypto-gold hover:text-crypto-gold/80 transition-colors"
            >
              Zufällig generieren
            </button>
          </div>
          <input
            type="text"
            value={privateKeyHex}
            onChange={(e) => setPrivateKeyHex(e.target.value)}
            className="w-full bg-input/50 border border-crypto-gold/20 rounded p-3 text-crypto-gold font-mono text-xs focus:border-crypto-gold/50 focus:outline-none transition-colors"
            placeholder="64 Hex-Zeichen (32 Bytes)..."
          />
        </div>

        {/* Convert Button */}
        <button
          onClick={convertToWif}
          className="w-full py-3 bg-crypto-gold/10 border border-crypto-gold/30 rounded text-crypto-gold uppercase tracking-wider text-sm hover:bg-crypto-gold/20 hover:border-crypto-gold/50 transition-all flex items-center justify-center gap-2"
        >
          <ArrowDownUp size={16} />
          Zu WIF konvertieren
        </button>

        {/* Error */}
        {error && (
          <div className="text-crypto-red text-xs bg-crypto-red/10 border border-crypto-red/20 rounded p-2">
            {error}
          </div>
        )}

        {/* Steps */}
        {steps.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">
              Konvertierungsschritte
            </label>
            {steps.map((step, i) => (
              <div key={i} className="bg-muted/20 rounded p-2 animate-hash" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="text-[10px] text-muted-foreground mb-1">{step.label}</div>
                <div className="font-mono text-[10px] text-crypto-gold break-all">{step.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* WIF Output */}
        {wif && (
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
              WIF Output
            </label>
            <div className="relative">
              <div className="bg-background/80 border border-crypto-gold/30 rounded p-3 font-mono text-sm break-all text-crypto-gold pr-10">
                {wif}
              </div>
              <button
                onClick={copyToClipboard}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-crypto-gold/10 rounded transition-colors"
              >
                {copied ? <Check size={14} className="text-crypto-green" /> : <Copy size={14} className="text-crypto-gold" />}
              </button>
            </div>
            <div className="mt-2 text-[10px] text-muted-foreground">
              Beginnt mit: <span className="text-crypto-gold">{wif[0]}</span> 
              {' '}({network === 'mainnet' ? 'Mainnet' : 'Testnet'}, {compressed ? 'compressed' : 'uncompressed'})
            </div>
          </div>
        )}

        {/* WIF Format Info */}
        <div className="bg-muted/20 rounded p-3 text-xs text-muted-foreground border-t border-border/30 mt-4">
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div><span className="text-crypto-gold">5</span> = Mainnet, Uncompressed</div>
            <div><span className="text-crypto-gold">K/L</span> = Mainnet, Compressed</div>
            <div><span className="text-crypto-blue">9</span> = Testnet, Uncompressed</div>
            <div><span className="text-crypto-blue">c</span> = Testnet, Compressed</div>
          </div>
        </div>
      </div>
    </CryptoPanel>
  );
}
