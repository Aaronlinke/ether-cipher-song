import { useState } from "react";
import { CryptoPanel } from "./CryptoPanel";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { toast } from "@/hooks/use-toast";
import { 
  Search, 
  Loader2, 
  Wallet, 
  Copy, 
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw
} from "lucide-react";
import { base58Decode, bytesToHex, privateKeyToAddress } from "@/lib/crypto-utils";

interface WalletResult {
  input: string;
  inputType: 'wif' | 'hex' | 'address' | 'unknown';
  address: string;
  privateKey?: string;
  balance: string;
  balanceSat: number;
  txCount: number;
  status: 'checking' | 'found' | 'empty' | 'error';
  error?: string;
}

export function WifBalanceChecker() {
  const [inputText, setInputText] = useState('');
  const [results, setResults] = useState<WalletResult[]>([]);
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Detect input type
  const detectInputType = (input: string): 'wif' | 'hex' | 'address' | 'unknown' => {
    const cleaned = input.trim();
    
    // WIF starts with 5, K, L (mainnet) or 9, c (testnet)
    if (/^[5KL][1-9A-HJ-NP-Za-km-z]{50,51}$/.test(cleaned)) {
      return 'wif';
    }
    
    // Hex private key (64 chars)
    if (/^[0-9a-fA-F]{64}$/.test(cleaned)) {
      return 'hex';
    }
    
    // Bitcoin address (P2PKH, P2SH, Bech32)
    if (/^[13][1-9A-HJ-NP-Za-km-z]{25,34}$/.test(cleaned) || 
        /^bc1[a-zA-HJ-NP-Z0-9]{25,89}$/.test(cleaned)) {
      return 'address';
    }
    
    return 'unknown';
  };

  // Decode WIF to private key
  const wifToPrivateKey = (wif: string): { privateKey: string; compressed: boolean } => {
    const decoded = base58Decode(wif);
    
    // Remove version byte and checksum
    const withoutVersion = decoded.slice(1, -4);
    
    // Check if compressed
    const compressed = withoutVersion.length === 33 && withoutVersion[32] === 0x01;
    const privateKey = compressed 
      ? bytesToHex(withoutVersion.slice(0, 32))
      : bytesToHex(withoutVersion);
    
    return { privateKey, compressed };
  };

  // Fetch balance from blockchain API
  const fetchBalance = async (address: string): Promise<{ balance: number; txCount: number }> => {
    try {
      // Using blockchain.info API (free, no key required)
      const response = await fetch(
        `https://blockchain.info/balance?active=${address}&cors=true`
      );
      
      if (!response.ok) {
        throw new Error('API request failed');
      }
      
      const data = await response.json();
      const info = data[address];
      
      return {
        balance: info?.final_balance || 0,
        txCount: info?.n_tx || 0
      };
    } catch (error) {
      // Fallback to blockstream
      try {
        const response = await fetch(
          `https://blockstream.info/api/address/${address}`
        );
        
        if (!response.ok) {
          throw new Error('Blockstream API failed');
        }
        
        const data = await response.json();
        
        return {
          balance: (data.chain_stats?.funded_txo_sum || 0) - (data.chain_stats?.spent_txo_sum || 0),
          txCount: data.chain_stats?.tx_count || 0
        };
      } catch {
        throw new Error('Alle APIs fehlgeschlagen');
      }
    }
  };

  // Format satoshis to BTC
  const formatBTC = (satoshis: number): string => {
    const btc = satoshis / 100000000;
    if (btc === 0) return '0 BTC';
    if (btc < 0.00001) return `${satoshis} sat`;
    return `${btc.toFixed(8)} BTC`;
  };

  // Process input and check balances
  const checkBalances = async () => {
    // Parse input - support various separators
    const lines = inputText
      .split(/[\n,;|\t]+/)
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    if (lines.length === 0) {
      toast({ title: "Keine Eingabe", description: "Bitte WIF, Hex oder Adressen eingeben", variant: "destructive" });
      return;
    }
    
    setChecking(true);
    setProgress({ current: 0, total: lines.length });
    setResults([]);
    
    const newResults: WalletResult[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const input = lines[i];
      const inputType = detectInputType(input);
      
      setProgress({ current: i + 1, total: lines.length });
      
      const result: WalletResult = {
        input,
        inputType,
        address: '',
        balance: '0 BTC',
        balanceSat: 0,
        txCount: 0,
        status: 'checking'
      };
      
      try {
        let address = '';
        let privateKey = '';
        
        switch (inputType) {
          case 'wif': {
            const { privateKey: pk, compressed } = wifToPrivateKey(input);
            privateKey = pk;
            address = await privateKeyToAddress(pk, compressed);
            result.privateKey = pk;
            break;
          }
          case 'hex': {
            privateKey = input;
            address = await privateKeyToAddress(input, true);
            result.privateKey = input;
            break;
          }
          case 'address': {
            address = input;
            break;
          }
          default:
            throw new Error('Unbekanntes Format');
        }
        
        result.address = address;
        
        // Fetch balance
        const { balance, txCount } = await fetchBalance(address);
        result.balanceSat = balance;
        result.balance = formatBTC(balance);
        result.txCount = txCount;
        result.status = balance > 0 ? 'found' : 'empty';
        
      } catch (error) {
        result.status = 'error';
        result.error = error instanceof Error ? error.message : 'Unbekannter Fehler';
      }
      
      newResults.push(result);
      setResults([...newResults]);
      
      // Rate limiting - 200ms between requests
      if (i < lines.length - 1) {
        await new Promise(r => setTimeout(r, 200));
      }
    }
    
    setChecking(false);
    
    const found = newResults.filter(r => r.status === 'found').length;
    const total = formatBTC(newResults.reduce((sum, r) => sum + r.balanceSat, 0));
    
    toast({ 
      title: "Prüfung abgeschlossen",
      description: `${found} Wallet(s) mit Guthaben gefunden. Total: ${total}`
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Kopiert!" });
  };

  const exportResults = () => {
    const csv = [
      'Input,Typ,Adresse,Balance,TX,Private Key',
      ...results.map(r => 
        `"${r.input}","${r.inputType}","${r.address}","${r.balance}",${r.txCount},"${r.privateKey || ''}"`
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wallet-balances.csv';
    a.click();
    
    toast({ title: "CSV exportiert!" });
  };

  const foundCount = results.filter(r => r.status === 'found').length;
  const emptyCount = results.filter(r => r.status === 'empty').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const totalBalance = results.reduce((sum, r) => sum + r.balanceSat, 0);

  return (
    <CryptoPanel title="Bulk Balance Checker" icon="💰">
      <div className="space-y-4">
        {/* Input Area */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Wallet className="w-3 h-3" />
            WIF / HEX / Adressen (Bulk-Eingabe)
          </label>
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Füge hier WIF-Schlüssel, Hex-Private-Keys oder Bitcoin-Adressen ein...

Beispiele:
5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ
L1aW4aubDFB7yfras2S1mN3bqg9nwySY8nkoLmJebSLD5BWv3ENZ
1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa

Trenne mit: Zeilenumbruch, Komma, Semikolon, Tab oder |`}
            className="font-mono text-xs min-h-[150px] bg-background/50"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={checkBalances} 
            disabled={checking || !inputText.trim()}
            className="gap-2"
          >
            {checking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Prüfe {progress.current}/{progress.total}...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Balances prüfen
              </>
            )}
          </Button>
          
          {results.length > 0 && (
            <>
              <Button variant="outline" onClick={() => setResults([])} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Zurücksetzen
              </Button>
              <Button variant="outline" onClick={exportResults} className="gap-2">
                <ExternalLink className="w-4 h-4" />
                CSV Export
              </Button>
            </>
          )}
        </div>

        {/* Summary */}
        {results.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-muted/30 rounded-lg border border-border/50">
            <div className="text-center">
              <div className="text-lg font-bold text-primary">{results.length}</div>
              <div className="text-xs text-muted-foreground">Geprüft</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-400">{foundCount}</div>
              <div className="text-xs text-muted-foreground">Mit Guthaben</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-yellow-400">{emptyCount}</div>
              <div className="text-xs text-muted-foreground">Leer</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-accent">{formatBTC(totalBalance)}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </div>
        )}

        {/* Results List */}
        {results.length > 0 && (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {results.map((result, i) => (
              <div 
                key={i}
                className={`p-3 rounded-lg border ${
                  result.status === 'found' 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : result.status === 'error'
                    ? 'bg-red-500/10 border-red-500/30'
                    : result.status === 'checking'
                    ? 'bg-blue-500/10 border-blue-500/30'
                    : 'bg-muted/20 border-border/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {/* Status & Type */}
                    <div className="flex items-center gap-2 mb-1">
                      {result.status === 'checking' && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
                      {result.status === 'found' && <CheckCircle className="w-4 h-4 text-green-400" />}
                      {result.status === 'empty' && <XCircle className="w-4 h-4 text-yellow-400" />}
                      {result.status === 'error' && <AlertTriangle className="w-4 h-4 text-red-400" />}
                      
                      <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase ${
                        result.inputType === 'wif' ? 'bg-purple-500/20 text-purple-400' :
                        result.inputType === 'hex' ? 'bg-blue-500/20 text-blue-400' :
                        result.inputType === 'address' ? 'bg-green-500/20 text-green-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {result.inputType}
                      </span>
                      
                      {result.status === 'found' && (
                        <span className="text-sm font-bold text-green-400">
                          {result.balance}
                        </span>
                      )}
                    </div>
                    
                    {/* Address */}
                    {result.address && (
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-primary break-all">{result.address}</code>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 w-6 p-0"
                          onClick={() => copyToClipboard(result.address)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <a 
                          href={`https://blockstream.info/address/${result.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                    
                    {/* TX Count */}
                    {result.txCount > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {result.txCount} Transaktion(en)
                      </div>
                    )}
                    
                    {/* Error */}
                    {result.error && (
                      <div className="text-xs text-red-400 mt-1">{result.error}</div>
                    )}
                    
                    {/* Private Key (truncated) */}
                    {result.privateKey && result.status === 'found' && (
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[10px] text-red-400">🔑</span>
                        <code className="text-[10px] text-red-300">
                          {result.privateKey.slice(0, 16)}...{result.privateKey.slice(-8)}
                        </code>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-5 w-5 p-0"
                          onClick={() => copyToClipboard(result.privateKey!)}
                        >
                          <Copy className="w-2 h-2" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        {results.length === 0 && !checking && (
          <div className="text-xs text-muted-foreground p-3 bg-muted/20 rounded-lg border border-border/30">
            <p className="mb-2">💰 <strong>Bulk Balance Checker:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground/80">
              <li><strong>WIF:</strong> Wallet Import Format (5..., K..., L...)</li>
              <li><strong>HEX:</strong> 64-Zeichen Private Key</li>
              <li><strong>Adresse:</strong> Bitcoin Adresse (1..., 3..., bc1...)</li>
              <li>Unterstützt Bulk-Eingabe mit verschiedenen Trennzeichen</li>
              <li>Live-Abfrage via Blockchain.info / Blockstream API</li>
            </ul>
          </div>
        )}
      </div>
    </CryptoPanel>
  );
}
