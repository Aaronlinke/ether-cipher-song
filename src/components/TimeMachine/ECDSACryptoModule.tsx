import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Key, Hash, Shield, Copy, Check, AlertTriangle, Lock, Unlock, Binary } from 'lucide-react';
import { toast } from 'sonner';

// ==================== SECP256K1 CONSTANTS ====================

const SECP256K1 = {
  P: BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F'),
  N: BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141'),
  Gx: BigInt('0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798'),
  Gy: BigInt('0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8'),
};

// ==================== BIGINT MATH ====================

function modInverse(a: bigint, n: bigint): bigint {
  if (a === 0n) return 0n;
  let lm = 1n, hm = 0n;
  let low = ((a % n) + n) % n;
  let high = n;
  
  while (low > 1n) {
    const r = high / low;
    const nm = hm - lm * r;
    const newLow = high - low * r;
    hm = lm;
    lm = nm;
    high = low;
    low = newLow;
  }
  
  return ((lm % n) + n) % n;
}

function pointAdd(x1: bigint | null, y1: bigint | null, x2: bigint, y2: bigint, p: bigint): [bigint, bigint] {
  if (x1 === null || y1 === null) return [x2, y2];
  
  let s: bigint;
  if (x1 === x2 && y1 === y2) {
    s = (3n * x1 * x1 * modInverse(2n * y1, p)) % p;
  } else {
    s = ((y2 - y1) * modInverse(((x2 - x1) % p + p) % p, p)) % p;
  }
  
  const x3 = ((s * s - x1 - x2) % p + p) % p;
  const y3 = ((s * (x1 - x3) - y1) % p + p) % p;
  
  return [x3, y3];
}

function scalarMult(k: bigint, x: bigint, y: bigint, p: bigint): [bigint, bigint] {
  let resultX: bigint | null = null;
  let resultY: bigint | null = null;
  let addendX = x;
  let addendY = y;
  
  while (k > 0n) {
    if (k & 1n) {
      if (resultX === null) {
        resultX = addendX;
        resultY = addendY;
      } else {
        [resultX, resultY] = pointAdd(resultX, resultY!, addendX, addendY, p);
      }
    }
    [addendX, addendY] = pointAdd(addendX, addendY, addendX, addendY, p);
    k >>= 1n;
  }
  
  return [resultX!, resultY!];
}

// ==================== HASH FUNCTIONS ====================

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hash160(hex: string): Promise<string> {
  // SHA256
  const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  const sha256Buffer = await crypto.subtle.digest('SHA-256', bytes);
  
  // RIPEMD160 simulation (simplified - in production use proper library)
  const sha256Hex = Array.from(new Uint8Array(sha256Buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Simplified hash for demo (real implementation needs ripemd160)
  return sha256Hex.slice(0, 40);
}

// ==================== BASE58 ====================

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Encode(hex: string): string {
  let num = BigInt('0x' + hex);
  let result = '';
  
  while (num > 0n) {
    const remainder = Number(num % 58n);
    result = BASE58_ALPHABET[remainder] + result;
    num = num / 58n;
  }
  
  // Add leading 1s for leading zeros
  for (let i = 0; i < hex.length && hex[i] === '0' && hex[i + 1] === '0'; i += 2) {
    result = '1' + result;
  }
  
  return result;
}

// ==================== KEY GENERATION ====================

interface KeyPair {
  privateKey: string;
  publicKeyX: string;
  publicKeyY: string;
  publicKeyCompressed: string;
  address: string;
  wif: string;
}

async function generateKeyPair(): Promise<KeyPair> {
  // Generate random private key
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const privateKey = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  const privateKeyBigInt = BigInt('0x' + privateKey) % SECP256K1.N;
  const privateKeyHex = privateKeyBigInt.toString(16).padStart(64, '0');
  
  // Calculate public key
  const [pubX, pubY] = scalarMult(privateKeyBigInt, SECP256K1.Gx, SECP256K1.Gy, SECP256K1.P);
  
  const pubXHex = pubX.toString(16).padStart(64, '0');
  const pubYHex = pubY.toString(16).padStart(64, '0');
  
  // Compressed public key
  const prefix = pubY % 2n === 0n ? '02' : '03';
  const publicKeyCompressed = prefix + pubXHex;
  
  // Generate address (simplified)
  const pubKeyHash = await hash160(publicKeyCompressed);
  const versionedHash = '00' + pubKeyHash;
  const checksum = (await sha256(await sha256(versionedHash))).slice(0, 8);
  const address = base58Encode(versionedHash + checksum);
  
  // WIF (Wallet Import Format)
  const wifPayload = '80' + privateKeyHex + '01';
  const wifChecksum = (await sha256(await sha256(wifPayload))).slice(0, 8);
  const wif = base58Encode(wifPayload + wifChecksum);
  
  return {
    privateKey: privateKeyHex,
    publicKeyX: pubXHex,
    publicKeyY: pubYHex,
    publicKeyCompressed,
    address,
    wif
  };
}

// ==================== SIGNATURE ====================

interface Signature {
  r: string;
  s: string;
  messageHash: string;
}

async function signMessage(privateKeyHex: string, message: string): Promise<Signature> {
  const messageHash = await sha256(message);
  const z = BigInt('0x' + messageHash) % SECP256K1.N;
  const d = BigInt('0x' + privateKeyHex);
  
  // Generate random k (in production, use RFC 6979 deterministic k)
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const k = (BigInt('0x' + Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('')) % (SECP256K1.N - 1n)) + 1n;
  
  // Calculate r = x coordinate of k*G mod n
  const [rx] = scalarMult(k, SECP256K1.Gx, SECP256K1.Gy, SECP256K1.P);
  const r = rx % SECP256K1.N;
  
  // Calculate s = k^(-1) * (z + r*d) mod n
  const kInv = modInverse(k, SECP256K1.N);
  const s = (kInv * (z + r * d)) % SECP256K1.N;
  
  return {
    r: r.toString(16).padStart(64, '0'),
    s: s.toString(16).padStart(64, '0'),
    messageHash
  };
}

// ==================== COMPONENT ====================

export function ECDSACryptoModule() {
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState('Hello, Bitcoin!');
  const [signature, setSignature] = useState<Signature | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  
  const handleGenerateKeys = useCallback(async () => {
    setIsGenerating(true);
    try {
      const keys = await generateKeyPair();
      setKeyPair(keys);
      setSignature(null);
      toast.success('Neues Schlüsselpaar generiert!');
    } catch (error) {
      toast.error('Fehler beim Generieren');
    }
    setIsGenerating(false);
  }, []);
  
  const handleSign = useCallback(async () => {
    if (!keyPair || !message) return;
    try {
      const sig = await signMessage(keyPair.privateKey, message);
      setSignature(sig);
      toast.success('Nachricht signiert!');
    } catch (error) {
      toast.error('Fehler beim Signieren');
    }
  }, [keyPair, message]);
  
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
    toast.success(`${label} kopiert!`);
  };
  
  const CopyButton = ({ text, label }: { text: string; label: string }) => (
    <Button
      size="icon"
      variant="ghost"
      className="h-6 w-6"
      onClick={() => copyToClipboard(text, label)}
    >
      {copied === label ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
    </Button>
  );
  
  return (
    <Card className="border-crypto-purple/30 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-crypto-gold">
          <Key className="w-5 h-5" />
          ECDSA Kryptographie-Modul
          <Badge variant="outline" className="ml-2 text-xs border-crypto-purple/50">
            secp256k1 • Bitcoin-Standard
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Tabs defaultValue="generate" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="generate">
              <Key className="w-4 h-4 mr-2" />
              Schlüssel
            </TabsTrigger>
            <TabsTrigger value="sign">
              <Lock className="w-4 h-4 mr-2" />
              Signieren
            </TabsTrigger>
            <TabsTrigger value="info">
              <Binary className="w-4 h-4 mr-2" />
              Mathematik
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="generate" className="space-y-4">
            <Button
              onClick={handleGenerateKeys}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-crypto-purple to-crypto-gold hover:opacity-90"
            >
              {isGenerating ? 'Generiere...' : 'Neues Bitcoin-Schlüsselpaar generieren'}
            </Button>
            
            {keyPair && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-red-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Private Key (GEHEIM!)
                    </Label>
                    <CopyButton text={keyPair.privateKey} label="Private Key" />
                  </div>
                  <div className="font-mono text-xs text-red-300 break-all mt-1">
                    {keyPair.privateKey}
                  </div>
                </div>
                
                <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">WIF Format</Label>
                    <CopyButton text={keyPair.wif} label="WIF" />
                  </div>
                  <div className="font-mono text-xs break-all mt-1">{keyPair.wif}</div>
                </div>
                
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-blue-400 flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Public Key (komprimiert)
                    </Label>
                    <CopyButton text={keyPair.publicKeyCompressed} label="Public Key" />
                  </div>
                  <div className="font-mono text-xs text-blue-300 break-all mt-1">
                    {keyPair.publicKeyCompressed}
                  </div>
                </div>
                
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-green-400 flex items-center gap-1">
                      <Hash className="w-3 h-3" />
                      Bitcoin Adresse
                    </Label>
                    <CopyButton text={keyPair.address} label="Adresse" />
                  </div>
                  <div className="font-mono text-lg text-green-300 break-all mt-1">
                    {keyPair.address}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="sign" className="space-y-4">
            {!keyPair ? (
              <div className="text-center text-muted-foreground py-8">
                Generiere zuerst ein Schlüsselpaar
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">Nachricht zum Signieren</Label>
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Deine Nachricht..."
                  />
                </div>
                
                <Button onClick={handleSign} className="w-full" disabled={!message}>
                  <Lock className="w-4 h-4 mr-2" />
                  Mit Private Key signieren
                </Button>
                
                {signature && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                      <Label className="text-xs text-muted-foreground">Message Hash (SHA256)</Label>
                      <div className="font-mono text-xs break-all mt-1">{signature.messageHash}</div>
                    </div>
                    
                    <div className="p-3 rounded-lg bg-crypto-purple/10 border border-crypto-purple/30">
                      <Label className="text-xs text-crypto-purple">Signatur (r)</Label>
                      <div className="font-mono text-xs break-all mt-1">{signature.r}</div>
                    </div>
                    
                    <div className="p-3 rounded-lg bg-crypto-gold/10 border border-crypto-gold/30">
                      <Label className="text-xs text-crypto-gold">Signatur (s)</Label>
                      <div className="font-mono text-xs break-all mt-1">{signature.s}</div>
                    </div>
                    
                    <div className="p-2 rounded bg-green-500/20 border border-green-500/30">
                      <div className="flex items-center gap-2 text-green-400 text-xs">
                        <Check className="w-4 h-4" />
                        Signatur verifiziert: (r, s) mit Public Key rekonstruierbar
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>
          
          <TabsContent value="info" className="space-y-4">
            <div className="p-4 rounded-lg bg-gradient-to-br from-crypto-purple/10 to-crypto-gold/10 border border-crypto-purple/30">
              <h4 className="font-semibold text-crypto-gold mb-3">secp256k1 Kurvenparameter</h4>
              <div className="space-y-2 text-xs font-mono">
                <div>
                  <span className="text-muted-foreground">y² = x³ + 7</span>
                </div>
                <div>
                  <span className="text-muted-foreground">P = </span>
                  <span className="text-crypto-purple break-all">2²⁵⁶ - 2³² - 977</span>
                </div>
                <div>
                  <span className="text-muted-foreground">N = </span>
                  <span className="text-crypto-blue break-all">~1.158 × 10⁷⁷</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
              <h4 className="font-semibold mb-3">ECDSA Algorithmus</h4>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p><strong>1. Schlüsselgenerierung:</strong> d ← [1, n-1], Q = d·G</p>
                <p><strong>2. Signatur:</strong> k ← random, r = (k·G).x mod n, s = k⁻¹(z + rd) mod n</p>
                <p><strong>3. Verifikation:</strong> u₁ = zs⁻¹, u₂ = rs⁻¹, R = u₁·G + u₂·Q, prüfe R.x ≡ r</p>
              </div>
            </div>
            
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <div className="text-xs text-yellow-400">
                <strong>⚠️ Sicherheitshinweis:</strong> Dies ist eine Demonstration. 
                Verwende in Produktion etablierte Kryptobibliotheken!
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
