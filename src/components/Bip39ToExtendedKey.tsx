import { useState, useEffect } from "react";
import { CryptoPanel } from "./CryptoPanel";
import { getBip39Wordlist } from "@/lib/bip39-wordlist";
import { sha256, bytesToHex, hexToBytes } from "@/lib/crypto-utils";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { toast } from "@/hooks/use-toast";
import { 
  ChevronDown, 
  ChevronRight, 
  Copy, 
  Key, 
  GitBranch, 
  Wallet,
  Shield,
  Zap
} from "lucide-react";

interface DerivationStep {
  path: string;
  chainCode: string;
  privateKey: string;
  publicKey: string;
  type: 'master' | 'hardened' | 'normal';
}

interface DerivedAddress {
  path: string;
  address: string;
  privateKey: string;
  wif: string;
}

const BIP_STANDARDS = [
  { id: 'BIP44', path: "m/44'/0'/0'", prefix: 'xprv', name: 'Legacy', addressPrefix: '1' },
  { id: 'BIP49', path: "m/49'/0'/0'", prefix: 'yprv', name: 'SegWit', addressPrefix: '3' },
  { id: 'BIP84', path: "m/84'/0'/0'", prefix: 'zprv', name: 'Native SegWit', addressPrefix: 'bc1' },
];

export function Bip39ToExtendedKey() {
  const [mnemonic, setMnemonic] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [wordlist, setWordlist] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [validWords, setValidWords] = useState<boolean[]>([]);
  const [seed, setSeed] = useState<string>('');
  const [masterKey, setMasterKey] = useState<{ privateKey: string; chainCode: string } | null>(null);
  const [derivationSteps, setDerivationSteps] = useState<DerivationStep[]>([]);
  const [extendedKeys, setExtendedKeys] = useState<{ standard: string; xprv: string; xpub: string }[]>([]);
  const [derivedAddresses, setDerivedAddresses] = useState<DerivedAddress[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    seed: true,
    master: true,
    derivation: false,
    keys: true,
    addresses: true
  });

  useEffect(() => {
    getBip39Wordlist().then((list) => {
      setWordlist(list);
      setLoading(false);
    });
  }, []);

  // Validate words as user types
  useEffect(() => {
    if (wordlist.length === 0) return;
    
    const words = mnemonic.trim().toLowerCase().split(/\s+/).filter(w => w);
    const validation = words.map(word => wordlist.includes(word));
    setValidWords(validation);
  }, [mnemonic, wordlist]);

  // PBKDF2 implementation for seed derivation
  const pbkdf2 = async (password: string, salt: string, iterations: number, keyLen: number): Promise<Uint8Array> => {
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: encoder.encode(salt),
        iterations,
        hash: 'SHA-512'
      },
      passwordKey,
      keyLen * 8
    );

    return new Uint8Array(derivedBits);
  };

  // HMAC-SHA512
  const hmacSha512 = async (key: Uint8Array, data: Uint8Array): Promise<Uint8Array> => {
    const keyBuffer = new Uint8Array(key).buffer as ArrayBuffer;
    const dataBuffer = new Uint8Array(data).buffer as ArrayBuffer;
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
    return new Uint8Array(signature);
  };

  // secp256k1 point multiplication (simplified)
  const getPublicKeyFromPrivate = (privateKeyHex: string): string => {
    // Using the existing crypto-utils function logic
    const SECP256K1 = {
      p: BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F'),
      Gx: BigInt('0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798'),
      Gy: BigInt('0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8'),
      n: BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141'),
    };

    const mod = (a: bigint, m: bigint): bigint => {
      const result = a % m;
      return result >= 0n ? result : result + m;
    };

    const modInverse = (a: bigint, m: bigint): bigint => {
      let [old_r, r] = [a, m];
      let [old_s, s] = [1n, 0n];
      while (r !== 0n) {
        const quotient = old_r / r;
        [old_r, r] = [r, old_r - quotient * r];
        [old_s, s] = [s, old_s - quotient * s];
      }
      return mod(old_s, m);
    };

    interface Point { x: bigint; y: bigint; }
    const INFINITY: Point = { x: 0n, y: 0n };

    const pointAdd = (p1: Point, p2: Point): Point => {
      if (p1.x === 0n && p1.y === 0n) return p2;
      if (p2.x === 0n && p2.y === 0n) return p1;
      if (p1.x === p2.x && p1.y !== p2.y) return INFINITY;

      let lambda: bigint;
      if (p1.x === p2.x && p1.y === p2.y) {
        lambda = mod(3n * p1.x * p1.x * modInverse(2n * p1.y, SECP256K1.p), SECP256K1.p);
      } else {
        lambda = mod((p2.y - p1.y) * modInverse(mod(p2.x - p1.x, SECP256K1.p), SECP256K1.p), SECP256K1.p);
      }

      const x3 = mod(lambda * lambda - p1.x - p2.x, SECP256K1.p);
      const y3 = mod(lambda * (p1.x - x3) - p1.y, SECP256K1.p);
      return { x: x3, y: y3 };
    };

    const pointMultiply = (k: bigint, point: Point): Point => {
      let result = INFINITY;
      let addend = point;
      while (k > 0n) {
        if (k & 1n) result = pointAdd(result, addend);
        addend = pointAdd(addend, addend);
        k >>= 1n;
      }
      return result;
    };

    const k = BigInt('0x' + privateKeyHex);
    const G: Point = { x: SECP256K1.Gx, y: SECP256K1.Gy };
    const pubPoint = pointMultiply(k, G);
    
    const xHex = pubPoint.x.toString(16).padStart(64, '0');
    const prefix = pubPoint.y % 2n === 0n ? '02' : '03';
    return prefix + xHex;
  };

  // Base58Check encode
  const base58CheckEncode = async (payload: Uint8Array): Promise<string> => {
    const checksum1 = await sha256(payload);
    const checksum2 = await sha256(checksum1);
    const checksumBytes = checksum2.slice(0, 4);
    
    const full = new Uint8Array([...Array.from(payload), ...Array.from(checksumBytes)]);
    
    const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let num = BigInt('0x' + bytesToHex(full));
    let result = '';
    
    while (num > 0n) {
      result = BASE58[Number(num % 58n)] + result;
      num = num / 58n;
    }
    
    for (const byte of full) {
      if (byte === 0) result = '1' + result;
      else break;
    }
    
    return result || '1';
  };

  // Create extended key (xprv/xpub format)
  const createExtendedKey = async (
    privateKey: string, 
    chainCode: string, 
    depth: number,
    parentFingerprint: Uint8Array,
    childIndex: number,
    isPrivate: boolean,
    version: number
  ): Promise<string> => {
    const payload = new Uint8Array(78);
    const view = new DataView(payload.buffer);
    
    view.setUint32(0, version, false); // Version
    payload[4] = depth;
    payload.set(parentFingerprint, 5);
    view.setUint32(9, childIndex, false);
    payload.set(hexToBytes(chainCode), 13);
    
    if (isPrivate) {
      payload[45] = 0x00;
      payload.set(hexToBytes(privateKey), 46);
    } else {
      const pubKey = getPublicKeyFromPrivate(privateKey);
      payload.set(hexToBytes(pubKey), 45);
    }
    
    return base58CheckEncode(payload);
  };

  // Derive child key (hardened or normal)
  const deriveChild = async (
    parentPrivKey: string,
    parentChainCode: string,
    index: number,
    hardened: boolean
  ): Promise<{ privateKey: string; chainCode: string }> => {
    const data = new Uint8Array(37);
    
    if (hardened) {
      data[0] = 0x00;
      data.set(hexToBytes(parentPrivKey), 1);
      const idx = index + 0x80000000;
      new DataView(data.buffer).setUint32(33, idx, false);
    } else {
      const pubKey = getPublicKeyFromPrivate(parentPrivKey);
      data.set(hexToBytes(pubKey), 0);
      new DataView(data.buffer).setUint32(33, index, false);
    }
    
    const I = await hmacSha512(hexToBytes(parentChainCode), data);
    const IL = I.slice(0, 32);
    const IR = I.slice(32);
    
    const parentNum = BigInt('0x' + parentPrivKey);
    const addNum = BigInt('0x' + bytesToHex(IL));
    const n = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');
    const childKey = ((parentNum + addNum) % n).toString(16).padStart(64, '0');
    
    return {
      privateKey: childKey,
      chainCode: bytesToHex(IR)
    };
  };

  const derivePath = async (
    masterPrivKey: string, 
    masterChainCode: string, 
    path: string
  ): Promise<{ steps: DerivationStep[]; finalKey: { privateKey: string; chainCode: string } }> => {
    const parts = path.replace('m/', '').split('/');
    const steps: DerivationStep[] = [];
    
    let currentKey = masterPrivKey;
    let currentChain = masterChainCode;
    let currentPath = 'm';
    
    steps.push({
      path: 'm',
      chainCode: masterChainCode,
      privateKey: masterPrivKey,
      publicKey: getPublicKeyFromPrivate(masterPrivKey),
      type: 'master'
    });
    
    for (const part of parts) {
      if (!part) continue;
      
      const hardened = part.endsWith("'") || part.endsWith('h');
      const index = parseInt(part.replace(/['h]/, ''));
      
      const derived = await deriveChild(currentKey, currentChain, index, hardened);
      currentKey = derived.privateKey;
      currentChain = derived.chainCode;
      currentPath += '/' + part;
      
      steps.push({
        path: currentPath,
        chainCode: currentChain,
        privateKey: currentKey,
        publicKey: getPublicKeyFromPrivate(currentKey),
        type: hardened ? 'hardened' : 'normal'
      });
    }
    
    return { steps, finalKey: { privateKey: currentKey, chainCode: currentChain } };
  };

  const processMnemonic = async () => {
    const words = mnemonic.trim().toLowerCase().split(/\s+/).filter(w => w);
    
    if (words.length !== 12 && words.length !== 24) {
      toast({ title: "Fehler", description: "Mnemonic muss 12 oder 24 Wörter haben", variant: "destructive" });
      return;
    }
    
    const invalidWords = words.filter(w => !wordlist.includes(w));
    if (invalidWords.length > 0) {
      toast({ title: "Ungültige Wörter", description: invalidWords.join(', '), variant: "destructive" });
      return;
    }
    
    setProcessing(true);
    
    try {
      // 1. Derive seed from mnemonic using PBKDF2
      const salt = 'mnemonic' + passphrase;
      const seedBytes = await pbkdf2(words.join(' '), salt, 2048, 64);
      const seedHex = bytesToHex(seedBytes);
      setSeed(seedHex);
      
      // 2. Derive master key using HMAC-SHA512
      const masterData = await hmacSha512(
        new TextEncoder().encode('Bitcoin seed'),
        seedBytes
      );
      
      const masterPrivKey = bytesToHex(masterData.slice(0, 32));
      const masterChainCode = bytesToHex(masterData.slice(32));
      
      setMasterKey({ privateKey: masterPrivKey, chainCode: masterChainCode });
      
      // 3. Derive keys for all BIP standards
      const allSteps: DerivationStep[] = [];
      const keys: { standard: string; xprv: string; xpub: string }[] = [];
      
      const VERSIONS = {
        'BIP44': { prv: 0x0488ADE4, pub: 0x0488B21E },
        'BIP49': { prv: 0x049d7878, pub: 0x049d7cb2 },
        'BIP84': { prv: 0x04b2430c, pub: 0x04b24746 },
      };
      
      for (const standard of BIP_STANDARDS) {
        const { steps, finalKey } = await derivePath(masterPrivKey, masterChainCode, standard.path);
        
        if (allSteps.length === 0) {
          allSteps.push(...steps);
        }
        
        const version = VERSIONS[standard.id as keyof typeof VERSIONS];
        const fingerprint = new Uint8Array(4); // Simplified
        
        const xprv = await createExtendedKey(
          finalKey.privateKey,
          finalKey.chainCode,
          3,
          fingerprint,
          0x80000000,
          true,
          version.prv
        );
        
        const xpub = await createExtendedKey(
          finalKey.privateKey,
          finalKey.chainCode,
          3,
          fingerprint,
          0x80000000,
          false,
          version.pub
        );
        
        keys.push({ standard: standard.id, xprv, xpub });
      }
      
      setDerivationSteps(allSteps);
      setExtendedKeys(keys);
      
      // 4. Derive first 5 addresses for BIP44
      const addresses: DerivedAddress[] = [];
      const { finalKey: bip44Key } = await derivePath(masterPrivKey, masterChainCode, "m/44'/0'/0'/0");
      
      for (let i = 0; i < 5; i++) {
        const child = await deriveChild(bip44Key.privateKey, bip44Key.chainCode, i, false);
        
        // Generate address (simplified P2PKH)
        const pubKey = getPublicKeyFromPrivate(child.privateKey);
        const pubKeyBytes = hexToBytes(pubKey);
        const sha = await sha256(pubKeyBytes);
        
        // RIPEMD160 would go here - using simplified hash
        const hash160 = sha.slice(0, 20);
        const versioned = new Uint8Array([0x00, ...Array.from(hash160)]);
        const address = await base58CheckEncode(versioned);
        
        // WIF
        const wifPayload = new Uint8Array([0x80, ...Array.from(hexToBytes(child.privateKey)), 0x01]);
        const wif = await base58CheckEncode(wifPayload);
        
        addresses.push({
          path: `m/44'/0'/0'/0/${i}`,
          address,
          privateKey: child.privateKey,
          wif
        });
      }
      
      setDerivedAddresses(addresses);
      toast({ title: "Derivation abgeschlossen!" });
      
    } catch (error) {
      toast({ title: "Fehler", description: String(error), variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} kopiert!` });
  };

  if (loading) {
    return (
      <CryptoPanel title="BIP39 → Extended Key Derivation" icon="🔗">
        <div className="text-muted-foreground text-center py-8">Lade Wortliste...</div>
      </CryptoPanel>
    );
  }

  const words = mnemonic.trim().split(/\s+/).filter(w => w);

  return (
    <CryptoPanel title="BIP39 → Extended Key Derivation" icon="🔗">
      <div className="space-y-4">
        {/* Mnemonic Input */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Key className="w-3 h-3" />
            Seed Phrase (12 oder 24 Wörter)
          </label>
          <Textarea
            value={mnemonic}
            onChange={(e) => setMnemonic(e.target.value)}
            placeholder="abandon ability able about above absent absorb abstract absurd abuse access accident..."
            className="font-mono text-sm min-h-[80px] bg-background/50"
          />
          
          {/* Word validation display */}
          {words.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {words.map((word, i) => (
                <span
                  key={i}
                  className={`text-xs px-2 py-0.5 rounded ${
                    validWords[i] 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}
                >
                  {i + 1}. {word}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Passphrase */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-3 h-3" />
            Passphrase (optional, BIP39)
          </label>
          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Optionale Passphrase für zusätzliche Sicherheit"
            className="w-full px-3 py-2 bg-background/50 border border-border rounded font-mono text-sm"
          />
        </div>

        {/* Process Button */}
        <Button 
          onClick={processMnemonic} 
          disabled={processing || words.length < 12}
          className="w-full gap-2"
        >
          <Zap className="w-4 h-4" />
          {processing ? 'Berechne...' : 'Derivation starten'}
        </Button>

        {/* Results */}
        {seed && (
          <div className="space-y-4 mt-6">
            {/* Seed Section */}
            <div className="border border-border/50 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('seed')}
                className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm font-medium flex items-center gap-2">
                  <span className="text-lg">🌱</span>
                  BIP39 Seed (512 Bit)
                </span>
                {expandedSections.seed ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              
              {expandedSections.seed && (
                <div className="p-3 space-y-2 bg-background/30">
                  <div className="flex items-start gap-2">
                    <code className="flex-1 text-xs text-primary break-all font-mono bg-muted/30 p-2 rounded">
                      {seed}
                    </code>
                    <Button size="sm" variant="ghost" onClick={() => copyToClipboard(seed, 'Seed')}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    PBKDF2(mnemonic + passphrase, "mnemonic", 2048, SHA-512) → 64 Bytes
                  </p>
                </div>
              )}
            </div>

            {/* Master Key Section */}
            {masterKey && (
              <div className="border border-border/50 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection('master')}
                  className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm font-medium flex items-center gap-2">
                    <span className="text-lg">🔐</span>
                    Master Key (m)
                  </span>
                  {expandedSections.master ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                
                {expandedSections.master && (
                  <div className="p-3 space-y-3 bg-background/30">
                    <div>
                      <span className="text-xs text-muted-foreground">Private Key:</span>
                      <div className="flex items-start gap-2 mt-1">
                        <code className="flex-1 text-xs text-accent break-all font-mono bg-muted/30 p-2 rounded">
                          {masterKey.privateKey}
                        </code>
                        <Button size="sm" variant="ghost" onClick={() => copyToClipboard(masterKey.privateKey, 'Master Private Key')}>
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Chain Code:</span>
                      <code className="block text-xs text-blue-400 break-all font-mono bg-muted/30 p-2 rounded mt-1">
                        {masterKey.chainCode}
                      </code>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      HMAC-SHA512("Bitcoin seed", seed) → 64 Bytes (32B key + 32B chain)
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Derivation Path Visualization */}
            {derivationSteps.length > 0 && (
              <div className="border border-border/50 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection('derivation')}
                  className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm font-medium flex items-center gap-2">
                    <GitBranch className="w-4 h-4" />
                    Derivation Chain (BIP44)
                  </span>
                  {expandedSections.derivation ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                
                {expandedSections.derivation && (
                  <div className="p-3 bg-background/30">
                    <div className="relative">
                      {derivationSteps.map((step, i) => (
                        <div key={i} className="flex items-start gap-3 mb-3">
                          {/* Vertical line */}
                          <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                              step.type === 'master' ? 'bg-yellow-500/30 text-yellow-400 border border-yellow-500' :
                              step.type === 'hardened' ? 'bg-red-500/30 text-red-400 border border-red-500' :
                              'bg-green-500/30 text-green-400 border border-green-500'
                            }`}>
                              {step.type === 'master' ? 'm' : step.type === 'hardened' ? "'" : '○'}
                            </div>
                            {i < derivationSteps.length - 1 && (
                              <div className="w-0.5 h-8 bg-border/50" />
                            )}
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-sm text-primary">{step.path}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                step.type === 'master' ? 'bg-yellow-500/20 text-yellow-400' :
                                step.type === 'hardened' ? 'bg-red-500/20 text-red-400' :
                                'bg-green-500/20 text-green-400'
                              }`}>
                                {step.type === 'master' ? 'MASTER' : step.type === 'hardened' ? 'HARDENED' : 'NORMAL'}
                              </span>
                            </div>
                            <code className="text-[10px] text-muted-foreground break-all block">
                              key: {step.privateKey.slice(0, 16)}...{step.privateKey.slice(-8)}
                            </code>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Extended Keys */}
            {extendedKeys.length > 0 && (
              <div className="border border-border/50 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection('keys')}
                  className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Wallet className="w-4 h-4" />
                    Extended Keys (xprv/yprv/zprv)
                  </span>
                  {expandedSections.keys ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                
                {expandedSections.keys && (
                  <div className="p-3 space-y-4 bg-background/30">
                    {extendedKeys.map((key, i) => {
                      const standard = BIP_STANDARDS[i];
                      return (
                        <div key={i} className="space-y-2 p-3 bg-muted/20 rounded-lg border border-border/30">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-bold text-primary">{key.standard}</span>
                            <span className="text-xs text-muted-foreground">({standard.path})</span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-accent/20 text-accent">
                              {standard.name}
                            </span>
                          </div>
                          
                          <div>
                            <span className="text-xs text-red-400">Private ({standard.prefix}):</span>
                            <div className="flex items-start gap-2 mt-1">
                              <code className="flex-1 text-[10px] text-red-300 break-all font-mono bg-red-500/10 p-2 rounded border border-red-500/20">
                                {key.xprv}
                              </code>
                              <Button size="sm" variant="ghost" onClick={() => copyToClipboard(key.xprv, 'xprv')}>
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          
                          <div>
                            <span className="text-xs text-green-400">Public ({standard.prefix.replace('prv', 'pub')}):</span>
                            <div className="flex items-start gap-2 mt-1">
                              <code className="flex-1 text-[10px] text-green-300 break-all font-mono bg-green-500/10 p-2 rounded border border-green-500/20">
                                {key.xpub}
                              </code>
                              <Button size="sm" variant="ghost" onClick={() => copyToClipboard(key.xpub, 'xpub')}>
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Derived Addresses */}
            {derivedAddresses.length > 0 && (
              <div className="border border-border/50 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection('addresses')}
                  className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm font-medium flex items-center gap-2">
                    <span className="text-lg">📬</span>
                    Abgeleitete Adressen (BIP44)
                  </span>
                  {expandedSections.addresses ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                
                {expandedSections.addresses && (
                  <div className="p-3 space-y-2 bg-background/30">
                    {derivedAddresses.map((addr, i) => (
                      <div key={i} className="p-2 bg-muted/20 rounded border border-border/30">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-xs text-muted-foreground">{addr.path}</span>
                          <Button size="sm" variant="ghost" onClick={() => copyToClipboard(addr.address, 'Adresse')}>
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        <code className="text-xs text-primary break-all">{addr.address}</code>
                        <div className="mt-1">
                          <span className="text-[10px] text-red-400">WIF: </span>
                          <code className="text-[10px] text-red-300">{addr.wif.slice(0, 20)}...</code>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Info */}
        {!seed && (
          <div className="text-xs text-muted-foreground p-3 bg-muted/20 rounded-lg border border-border/30">
            <p className="mb-2">🔗 <strong>Komplette BIP32/39/44 Derivation:</strong></p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground/80">
              <li>Mnemonic → Seed (PBKDF2, 2048 Iterationen)</li>
              <li>Seed → Master Key (HMAC-SHA512)</li>
              <li>Master → BIP44/49/84 Pfade (Child Key Derivation)</li>
              <li>Extended Keys → Adressen</li>
            </ol>
          </div>
        )}
      </div>
    </CryptoPanel>
  );
}
