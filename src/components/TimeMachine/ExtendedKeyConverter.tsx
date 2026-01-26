import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Key, ArrowRightLeft, Copy, Check, Zap, Info, Link2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Extended Key Prefixes (Base58Check encoded)
const KEY_VERSIONS = {
  // Mainnet
  xprv: { prefix: '0488ade4', type: 'private', network: 'mainnet', standard: 'BIP44', description: 'Legacy (P2PKH)' },
  xpub: { prefix: '0488b21e', type: 'public', network: 'mainnet', standard: 'BIP44', description: 'Legacy (P2PKH)' },
  yprv: { prefix: '049d7878', type: 'private', network: 'mainnet', standard: 'BIP49', description: 'SegWit (P2SH-P2WPKH)' },
  ypub: { prefix: '049d7cb2', type: 'public', network: 'mainnet', standard: 'BIP49', description: 'SegWit (P2SH-P2WPKH)' },
  zprv: { prefix: '04b2430c', type: 'private', network: 'mainnet', standard: 'BIP84', description: 'Native SegWit (P2WPKH)' },
  zpub: { prefix: '04b24746', type: 'public', network: 'mainnet', standard: 'BIP84', description: 'Native SegWit (P2WPKH)' },
  // Testnet
  tprv: { prefix: '04358394', type: 'private', network: 'testnet', standard: 'BIP44', description: 'Testnet Legacy' },
  tpub: { prefix: '043587cf', type: 'public', network: 'testnet', standard: 'BIP44', description: 'Testnet Legacy' },
  uprv: { prefix: '044a4e28', type: 'private', network: 'testnet', standard: 'BIP49', description: 'Testnet SegWit' },
  upub: { prefix: '044a5262', type: 'public', network: 'testnet', standard: 'BIP49', description: 'Testnet SegWit' },
  vprv: { prefix: '045f18bc', type: 'private', network: 'testnet', standard: 'BIP84', description: 'Testnet Native SegWit' },
  vpub: { prefix: '045f1cf6', type: 'public', network: 'testnet', standard: 'BIP84', description: 'Testnet Native SegWit' },
};

// Base58 alphabet
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

// SHA256 implementation
async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const buffer = new ArrayBuffer(data.length);
  new Uint8Array(buffer).set(data);
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return new Uint8Array(hash);
}

// Double SHA256 for checksum
async function doubleSha256(data: Uint8Array): Promise<Uint8Array> {
  return sha256(await sha256(data));
}

// Hex to bytes
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// Bytes to hex
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Base58 decode
function base58Decode(str: string): Uint8Array {
  const bytes: number[] = [0];
  for (const char of str) {
    let value = BASE58_ALPHABET.indexOf(char);
    if (value === -1) throw new Error(`Invalid Base58 character: ${char}`);
    
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = bytes[i] * 58 + value;
      value = 0;
    }
    
    let carry = 0;
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] += carry;
      carry = Math.floor(bytes[i] / 256);
      bytes[i] %= 256;
    }
    
    while (carry > 0) {
      bytes.push(carry % 256);
      carry = Math.floor(carry / 256);
    }
  }
  
  // Handle leading zeros
  for (const char of str) {
    if (char !== '1') break;
    bytes.push(0);
  }
  
  return new Uint8Array(bytes.reverse());
}

// Base58 encode
function base58Encode(bytes: Uint8Array): string {
  const digits = [0];
  
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] * 256;
      digits[i] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  
  // Handle leading zeros
  let result = '';
  for (const byte of bytes) {
    if (byte !== 0) break;
    result += '1';
  }
  
  for (let i = digits.length - 1; i >= 0; i--) {
    result += BASE58_ALPHABET[digits[i]];
  }
  
  return result;
}

// Decode extended key
function decodeExtendedKey(key: string): { version: string; depth: number; fingerprint: string; childIndex: number; chainCode: string; keyData: string } | null {
  try {
    const decoded = base58Decode(key);
    if (decoded.length !== 82) return null;
    
    const version = bytesToHex(decoded.slice(0, 4));
    const depth = decoded[4];
    const fingerprint = bytesToHex(decoded.slice(5, 9));
    const childIndex = (decoded[9] << 24) | (decoded[10] << 16) | (decoded[11] << 8) | decoded[12];
    const chainCode = bytesToHex(decoded.slice(13, 45));
    const keyData = bytesToHex(decoded.slice(45, 78));
    
    return { version, depth, fingerprint, childIndex, chainCode, keyData };
  } catch {
    return null;
  }
}

// Encode extended key
async function encodeExtendedKey(version: string, depth: number, fingerprint: string, childIndex: number, chainCode: string, keyData: string): Promise<string> {
  const data = new Uint8Array(78);
  
  // Version (4 bytes)
  const versionBytes = hexToBytes(version);
  data.set(versionBytes, 0);
  
  // Depth (1 byte)
  data[4] = depth;
  
  // Fingerprint (4 bytes)
  const fingerprintBytes = hexToBytes(fingerprint);
  data.set(fingerprintBytes, 5);
  
  // Child index (4 bytes)
  data[9] = (childIndex >> 24) & 0xff;
  data[10] = (childIndex >> 16) & 0xff;
  data[11] = (childIndex >> 8) & 0xff;
  data[12] = childIndex & 0xff;
  
  // Chain code (32 bytes)
  const chainCodeBytes = hexToBytes(chainCode);
  data.set(chainCodeBytes, 13);
  
  // Key data (33 bytes)
  const keyDataBytes = hexToBytes(keyData);
  data.set(keyDataBytes, 45);
  
  // Checksum (4 bytes)
  const checksum = await doubleSha256(data);
  const withChecksum = new Uint8Array(82);
  withChecksum.set(data, 0);
  withChecksum.set(checksum.slice(0, 4), 78);
  
  return base58Encode(withChecksum);
}

// Convert between key versions
async function convertKey(inputKey: string, targetPrefix: keyof typeof KEY_VERSIONS): Promise<string | null> {
  const decoded = decodeExtendedKey(inputKey);
  if (!decoded) return null;
  
  const targetVersion = KEY_VERSIONS[targetPrefix];
  if (!targetVersion) return null;
  
  // Check if conversion is valid (private to private, public to public)
  const inputType = Object.values(KEY_VERSIONS).find(v => v.prefix === decoded.version)?.type;
  if (inputType !== targetVersion.type) return null;
  
  return encodeExtendedKey(
    targetVersion.prefix,
    decoded.depth,
    decoded.fingerprint,
    decoded.childIndex,
    decoded.chainCode,
    decoded.keyData
  );
}

// Detect key type
function detectKeyType(key: string): { prefix: keyof typeof KEY_VERSIONS; info: typeof KEY_VERSIONS[keyof typeof KEY_VERSIONS] } | null {
  const decoded = decodeExtendedKey(key);
  if (!decoded) return null;
  
  for (const [prefix, info] of Object.entries(KEY_VERSIONS)) {
    if (info.prefix === decoded.version) {
      return { prefix: prefix as keyof typeof KEY_VERSIONS, info };
    }
  }
  return null;
}

export function ExtendedKeyConverter() {
  const [inputKey, setInputKey] = useState('');
  const [detectedType, setDetectedType] = useState<{ prefix: string; info: typeof KEY_VERSIONS[keyof typeof KEY_VERSIONS] } | null>(null);
  const [decodedData, setDecodedData] = useState<ReturnType<typeof decodeExtendedKey>>(null);
  const [conversions, setConversions] = useState<{ prefix: string; key: string; info: typeof KEY_VERSIONS[keyof typeof KEY_VERSIONS] }[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('convert');
  const { toast } = useToast();

  useEffect(() => {
    if (inputKey.length > 100) {
      const detected = detectKeyType(inputKey);
      setDetectedType(detected);
      
      const decoded = decodeExtendedKey(inputKey);
      setDecodedData(decoded);
      
      if (detected && decoded) {
        // Generate all possible conversions
        const generateConversions = async () => {
          const results: { prefix: string; key: string; info: typeof KEY_VERSIONS[keyof typeof KEY_VERSIONS] }[] = [];
          
          for (const [prefix, info] of Object.entries(KEY_VERSIONS)) {
            if (info.type === detected.info.type && info.network === detected.info.network) {
              const converted = await convertKey(inputKey, prefix as keyof typeof KEY_VERSIONS);
              if (converted) {
                results.push({ prefix, key: converted, info });
              }
            }
          }
          
          setConversions(results);
        };
        
        generateConversions();
      }
    } else {
      setDetectedType(null);
      setDecodedData(null);
      setConversions([]);
    }
  }, [inputKey]);

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
    toast({
      title: "Kopiert!",
      description: `${label} wurde in die Zwischenablage kopiert.`,
    });
  };

  const getKeyColor = (prefix: string) => {
    if (prefix.startsWith('x')) return 'text-crypto-gold';
    if (prefix.startsWith('y')) return 'text-crypto-green';
    if (prefix.startsWith('z')) return 'text-crypto-blue';
    if (prefix.startsWith('t') || prefix.startsWith('u') || prefix.startsWith('v')) return 'text-crypto-purple';
    return 'text-foreground';
  };

  return (
    <Card className="border-crypto-blue/30 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-crypto-blue">
          <Key className="w-5 h-5" />
          Extended Key Converter
          <Badge variant="outline" className="ml-2 border-crypto-blue/50 text-crypto-blue">
            xprv/yprv/zprv
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Konvertiere zwischen BIP44/BIP49/BIP84 Extended Keys • Mathematische Verbindung aller Standards
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="convert">
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Konvertieren
            </TabsTrigger>
            <TabsTrigger value="analyze">
              <Zap className="w-4 h-4 mr-2" />
              Analysieren
            </TabsTrigger>
            <TabsTrigger value="info">
              <Info className="w-4 h-4 mr-2" />
              Standards
            </TabsTrigger>
          </TabsList>

          <TabsContent value="convert" className="space-y-4 mt-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Extended Key eingeben (xprv/xpub/yprv/ypub/zprv/zpub)</label>
              <Input
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="xprv9s21ZrQH143K..."
                className="font-mono text-xs bg-background/50 border-border/50"
              />
            </div>

            {detectedType && (
              <div className="p-3 rounded-lg bg-background/50 border border-border/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Erkannter Typ:</span>
                  <Badge className={`${getKeyColor(detectedType.prefix)} bg-transparent border`}>
                    {detectedType.prefix.toUpperCase()} - {detectedType.info.description}
                  </Badge>
                </div>
                
                <div className="border-t border-border/30 pt-3">
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Link2 className="w-3 h-3" />
                    Verfügbare Konvertierungen:
                  </p>
                  <div className="space-y-2">
                    {conversions.map(({ prefix, key, info }) => (
                      <div key={prefix} className="flex items-center justify-between p-2 rounded bg-muted/30">
                        <div>
                          <Badge variant="outline" className={`${getKeyColor(prefix)} text-xs`}>
                            {prefix}
                          </Badge>
                          <span className="text-xs text-muted-foreground ml-2">{info.standard}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            {key.slice(0, 15)}...{key.slice(-8)}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => copyToClipboard(key, prefix.toUpperCase())}
                          >
                            {copiedKey === key ? (
                              <Check className="w-3 h-3 text-crypto-green" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="analyze" className="space-y-4 mt-4">
            {decodedData ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 rounded bg-muted/30">
                    <p className="text-xs text-muted-foreground">Depth</p>
                    <p className="font-mono text-crypto-gold">{decodedData.depth}</p>
                  </div>
                  <div className="p-2 rounded bg-muted/30">
                    <p className="text-xs text-muted-foreground">Child Index</p>
                    <p className="font-mono text-crypto-green">{decodedData.childIndex}</p>
                  </div>
                </div>
                
                <div className="p-2 rounded bg-muted/30">
                  <p className="text-xs text-muted-foreground">Parent Fingerprint</p>
                  <p className="font-mono text-xs text-crypto-blue break-all">{decodedData.fingerprint}</p>
                </div>
                
                <div className="p-2 rounded bg-muted/30">
                  <p className="text-xs text-muted-foreground">Chain Code (256-bit Entropy)</p>
                  <p className="font-mono text-xs text-crypto-purple break-all">{decodedData.chainCode}</p>
                </div>
                
                <div className="p-2 rounded bg-muted/30">
                  <p className="text-xs text-muted-foreground">Key Data (Private/Public)</p>
                  <p className="font-mono text-xs text-crypto-orange break-all">{decodedData.keyData}</p>
                </div>

                <div className="p-3 rounded bg-crypto-purple/10 border border-crypto-purple/30">
                  <p className="text-xs text-crypto-purple flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    MATHEMATISCHE VERBINDUNG
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Der Chain Code + Key Data ermöglicht die Ableitung aller Child-Keys. 
                    Zusammen mit dem Puzzle-Solver können hieraus systematisch Adressen generiert werden.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground text-sm py-8">
                Gib einen Extended Key ein, um die Struktur zu analysieren
              </p>
            )}
          </TabsContent>

          <TabsContent value="info" className="mt-4">
            <div className="space-y-3">
              <div className="p-3 rounded bg-crypto-gold/10 border border-crypto-gold/30">
                <p className="text-sm font-medium text-crypto-gold">BIP44 (xprv/xpub)</p>
                <p className="text-xs text-muted-foreground">
                  Legacy-Adressen beginnend mit "1". Standard-Derivation: m/44'/0'/0'/0/0
                </p>
              </div>
              
              <div className="p-3 rounded bg-crypto-green/10 border border-crypto-green/30">
                <p className="text-sm font-medium text-crypto-green">BIP49 (yprv/ypub)</p>
                <p className="text-xs text-muted-foreground">
                  SegWit-wrapped Adressen beginnend mit "3". Standard-Derivation: m/49'/0'/0'/0/0
                </p>
              </div>
              
              <div className="p-3 rounded bg-crypto-blue/10 border border-crypto-blue/30">
                <p className="text-sm font-medium text-crypto-blue">BIP84 (zprv/zpub)</p>
                <p className="text-xs text-muted-foreground">
                  Native SegWit (Bech32) Adressen beginnend mit "bc1q". Standard-Derivation: m/84'/0'/0'/0/0
                </p>
              </div>

              <div className="p-3 rounded bg-muted/30 border border-border/30 mt-4">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Mathematische Grundlage:</strong> Alle Extended Keys 
                  basieren auf dem gleichen ECDSA secp256k1 Schlüsselmaterial. Die unterschiedlichen Präfixe 
                  (x/y/z) definieren nur den Ableitungspfad und Adresstyp.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
