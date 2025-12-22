import { useState } from 'react';
import { CryptoPanel } from './CryptoPanel';
import { Wallet, ArrowRight, Copy, Check, ExternalLink, RefreshCw } from 'lucide-react';
import { 
  sha256, 
  bytesToHex, 
  hexToBytes, 
  base58Encode, 
  privateKeyToPublicKey, 
  ripemd160,
  privateKeyToAddress 
} from '@/lib/crypto-utils';

export function AddressGenerator() {
  const [privateKey, setPrivateKey] = useState('');
  const [steps, setSteps] = useState<{ label: string; value: string; color: string }[]>([]);
  const [address, setAddress] = useState('');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [compressed, setCompressed] = useState(true);
  const [network, setNetwork] = useState<'mainnet' | 'testnet'>('mainnet');

  const generateRandom = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    setPrivateKey(bytesToHex(bytes));
  };

  const deriveAddress = async () => {
    if (!privateKey || privateKey.length !== 64) return;
    
    setIsGenerating(true);
    setSteps([]);
    
    try {
      // Step 1: Private Key
      await new Promise(r => setTimeout(r, 150));
      setSteps(s => [...s, { 
        label: '1. Private Key (256-bit)', 
        value: privateKey, 
        color: 'crypto-red' 
      }]);

      // Step 2: Real ECDSA Public Key generation
      const publicKeyHex = privateKeyToPublicKey(privateKey, compressed);
      await new Promise(r => setTimeout(r, 150));
      setSteps(s => [...s, { 
        label: `2. Public Key (secp256k1 ${compressed ? 'compressed 33B' : 'uncompressed 65B'})`, 
        value: publicKeyHex, 
        color: 'crypto-blue' 
      }]);

      // Step 3: SHA256 of public key
      const pubKeyBytes = hexToBytes(publicKeyHex);
      const sha256Hash = await sha256(pubKeyBytes);
      const sha256Hex = bytesToHex(sha256Hash);
      await new Promise(r => setTimeout(r, 150));
      setSteps(s => [...s, { 
        label: '3. SHA-256(pubkey)', 
        value: sha256Hex, 
        color: 'crypto-green' 
      }]);

      // Step 4: RIPEMD160 (real implementation)
      const ripemdHash = ripemd160(sha256Hash);
      const hash160Hex = bytesToHex(ripemdHash);
      await new Promise(r => setTimeout(r, 150));
      setSteps(s => [...s, { 
        label: '4. RIPEMD-160 → Hash160 (20 bytes)', 
        value: hash160Hex, 
        color: 'crypto-purple' 
      }]);

      // Step 5: Add version byte
      const versionByte = network === 'mainnet' ? 0x00 : 0x6f;
      const versioned = new Uint8Array([versionByte, ...Array.from(ripemdHash)]);
      const versionedHex = bytesToHex(versioned);
      await new Promise(r => setTimeout(r, 150));
      setSteps(s => [...s, { 
        label: `5. Version Byte (${network === 'mainnet' ? '0x00 Mainnet' : '0x6F Testnet'})`, 
        value: versionedHex, 
        color: 'crypto-orange' 
      }]);

      // Step 6: Double SHA256 for checksum
      const checksum1 = await sha256(versioned);
      const checksum2 = await sha256(checksum1);
      const checksumBytes = checksum2.slice(0, 4);
      const checksumHex = bytesToHex(checksumBytes);
      await new Promise(r => setTimeout(r, 150));
      setSteps(s => [...s, { 
        label: '6. Checksum (SHA256² → 4 bytes)', 
        value: checksumHex, 
        color: 'crypto-gold' 
      }]);

      // Step 7: Final address
      const finalBytes = new Uint8Array([...Array.from(versioned), ...Array.from(checksumBytes)]);
      const addressResult = base58Encode(finalBytes);
      await new Promise(r => setTimeout(r, 150));
      setSteps(s => [...s, { 
        label: '7. Base58Check Encode', 
        value: addressResult, 
        color: 'crypto-gold' 
      }]);

      setAddress(addressResult);
    } catch (e) {
      console.error(e);
      setSteps(s => [...s, { 
        label: 'Fehler', 
        value: e instanceof Error ? e.message : 'Unbekannter Fehler', 
        color: 'crypto-red' 
      }]);
    }
    
    setIsGenerating(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <CryptoPanel title="Address Derivation (Real secp256k1)" icon={<Wallet size={16} />} glowColor="gold" className="col-span-full lg:col-span-2">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">
                Private Key (Hex)
              </label>
              <button
                onClick={generateRandom}
                className="text-[10px] text-crypto-gold hover:text-crypto-gold/80 transition-colors flex items-center gap-1"
              >
                <RefreshCw size={10} />
                Random generieren
              </button>
            </div>
            <input
              type="text"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value.replace(/[^0-9a-fA-F]/g, '').toLowerCase().slice(0, 64))}
              className="w-full bg-input/50 border border-crypto-red/20 rounded p-3 text-crypto-red font-mono text-xs focus:border-crypto-red/50 focus:outline-none transition-colors"
              placeholder="64 Hex-Zeichen (256 Bit)..."
            />
            <div className="text-[10px] text-muted-foreground mt-1 flex justify-between">
              <span>{privateKey.length}/64 Zeichen</span>
              <span className="text-crypto-green">✓ Echte ECDSA Berechnung</span>
            </div>
          </div>

          {/* Options */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">
                Format
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setCompressed(true)}
                  className={`flex-1 py-1.5 px-2 text-[10px] rounded border transition-all ${
                    compressed 
                      ? 'bg-crypto-blue/20 border-crypto-blue text-crypto-blue' 
                      : 'border-border/30 text-muted-foreground hover:border-border/50'
                  }`}
                >
                  Compressed
                </button>
                <button
                  onClick={() => setCompressed(false)}
                  className={`flex-1 py-1.5 px-2 text-[10px] rounded border transition-all ${
                    !compressed 
                      ? 'bg-crypto-blue/20 border-crypto-blue text-crypto-blue' 
                      : 'border-border/30 text-muted-foreground hover:border-border/50'
                  }`}
                >
                  Uncompressed
                </button>
              </div>
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">
                Network
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setNetwork('mainnet')}
                  className={`flex-1 py-1.5 px-2 text-[10px] rounded border transition-all ${
                    network === 'mainnet' 
                      ? 'bg-crypto-orange/20 border-crypto-orange text-crypto-orange' 
                      : 'border-border/30 text-muted-foreground hover:border-border/50'
                  }`}
                >
                  Mainnet
                </button>
                <button
                  onClick={() => setNetwork('testnet')}
                  className={`flex-1 py-1.5 px-2 text-[10px] rounded border transition-all ${
                    network === 'testnet' 
                      ? 'bg-crypto-purple/20 border-crypto-purple text-crypto-purple' 
                      : 'border-border/30 text-muted-foreground hover:border-border/50'
                  }`}
                >
                  Testnet
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={deriveAddress}
            disabled={privateKey.length !== 64 || isGenerating}
            className="w-full py-3 bg-crypto-gold/10 border border-crypto-gold/30 rounded text-crypto-gold uppercase tracking-wider text-sm hover:bg-crypto-gold/20 hover:border-crypto-gold/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>Berechne secp256k1...</>
            ) : (
              <>
                <ArrowRight size={16} />
                Adresse ableiten
              </>
            )}
          </button>

          {/* Final Address */}
          {address && (
            <div className="bg-crypto-gold/10 border border-crypto-gold/30 rounded p-4">
              <div className="text-[10px] text-crypto-gold uppercase mb-2">
                Bitcoin Adresse (P2PKH {network === 'mainnet' ? 'Mainnet' : 'Testnet'})
              </div>
              <div className="flex items-center gap-2">
                <div className="font-mono text-sm text-crypto-gold break-all flex-1">
                  {address}
                </div>
                <button 
                  onClick={() => copyToClipboard(address)} 
                  className="p-1.5 hover:bg-crypto-gold/10 rounded transition-colors"
                >
                  {copied ? <Check size={14} className="text-crypto-green" /> : <Copy size={14} className="text-crypto-gold" />}
                </button>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <a
                  href={`https://www.blockchain.com/explorer/addresses/btc${network === 'testnet' ? '-testnet' : ''}/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-crypto-blue hover:text-crypto-blue/80 flex items-center gap-1"
                >
                  <ExternalLink size={10} />
                  Blockchain Explorer
                </a>
                <button
                  onClick={() => copyToClipboard(privateKey)}
                  className="text-[10px] text-crypto-red hover:text-crypto-red/80 flex items-center gap-1"
                >
                  <Copy size={10} />
                  Private Key kopieren
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Steps Visualization */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground uppercase tracking-wider">
            Kryptographische Ableitungskette
          </label>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {steps.map((step, i) => (
              <div
                key={i}
                className={`bg-muted/20 rounded p-2 border-l-2 border-${step.color} animate-hash`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className={`text-[10px] text-${step.color} uppercase mb-1`}>{step.label}</div>
                <div className="font-mono text-[9px] text-foreground/70 break-all">{step.value}</div>
              </div>
            ))}
            {steps.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                <div className="mb-2">Private Key eingeben</div>
                <div className="text-[10px]">Echte secp256k1 Kurvenberechnung (K = k × G)</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </CryptoPanel>
  );
}
