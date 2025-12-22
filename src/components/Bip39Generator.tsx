import { useState, useEffect } from "react";
import { CryptoPanel } from "./CryptoPanel";
import { getBip39Wordlist } from "@/lib/bip39-wordlist";
import { sha256, generateRandomBytes, bytesToHex, bytesToBinary } from "@/lib/crypto-utils";
import { Shuffle, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "@/hooks/use-toast";

interface MnemonicWord {
  index: number;
  word: string;
  binary: string;
}

export function Bip39Generator() {
  const [wordCount, setWordCount] = useState<12 | 24>(12);
  const [entropy, setEntropy] = useState<Uint8Array | null>(null);
  const [checksum, setChecksum] = useState<string>("");
  const [words, setWords] = useState<MnemonicWord[]>([]);
  const [wordlist, setWordlist] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getBip39Wordlist().then((list) => {
      setWordlist(list);
      setLoading(false);
    });
  }, []);

  const generateMnemonic = async () => {
    if (wordlist.length !== 2048) return;

    // 12 words = 128 bits, 24 words = 256 bits
    const entropyBits = wordCount === 12 ? 128 : 256;
    const entropyBytes = entropyBits / 8;
    const checksumBits = entropyBits / 32;

    // Generate random entropy
    const entropyData = generateRandomBytes(entropyBytes);
    setEntropy(entropyData);

    // Calculate SHA-256 hash for checksum
    const hash = await sha256(entropyData);
    const hashBinary = bytesToBinary(hash);
    const checksumPart = hashBinary.slice(0, checksumBits);
    setChecksum(checksumPart);

    // Combine entropy + checksum
    const entropyBinary = bytesToBinary(entropyData);
    const combined = entropyBinary + checksumPart;

    // Split into 11-bit groups and map to words
    const mnemonicWords: MnemonicWord[] = [];
    for (let i = 0; i < wordCount; i++) {
      const binary = combined.slice(i * 11, (i + 1) * 11);
      const index = parseInt(binary, 2);
      mnemonicWords.push({
        index,
        word: wordlist[index],
        binary,
      });
    }
    setWords(mnemonicWords);
  };

  const copyMnemonic = () => {
    const phrase = words.map((w) => w.word).join(" ");
    navigator.clipboard.writeText(phrase);
    setCopied(true);
    toast({ title: "Seed Phrase kopiert!" });
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <CryptoPanel title="BIP39 Mnemonic Generator" icon="🌱">
        <div className="text-muted-foreground text-center py-8">
          Lade Wortliste...
        </div>
      </CryptoPanel>
    );
  }

  return (
    <CryptoPanel title="BIP39 Mnemonic Generator" icon="🌱">
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-2">
            <Button
              variant={wordCount === 12 ? "default" : "outline"}
              size="sm"
              onClick={() => setWordCount(12)}
            >
              12 Wörter
            </Button>
            <Button
              variant={wordCount === 24 ? "default" : "outline"}
              size="sm"
              onClick={() => setWordCount(24)}
            >
              24 Wörter
            </Button>
          </div>
          <Button onClick={generateMnemonic} className="gap-2">
            <Shuffle className="w-4 h-4" />
            Generieren
          </Button>
        </div>

        {/* Mnemonic Display */}
        {words.length > 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {words.map((w, i) => (
                <div
                  key={i}
                  className="bg-card border border-border rounded-lg p-2 text-center"
                >
                  <div className="text-xs text-muted-foreground mb-1">
                    #{i + 1}
                  </div>
                  <div className="font-mono text-sm text-primary">{w.word}</div>
                  <div className="text-[10px] text-muted-foreground/70 mt-1">
                    [{w.index}]
                  </div>
                </div>
              ))}
            </div>

            {/* Copy Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={copyMnemonic}
              className="gap-2"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Kopiert!" : "Seed Phrase kopieren"}
            </Button>

            {/* Technical Details Toggle */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Technische Details
            </button>

            {showDetails && entropy && (
              <div className="space-y-3 text-xs bg-muted/30 rounded-lg p-4">
                <div>
                  <span className="text-muted-foreground">Entropie ({entropy.length * 8} Bit):</span>
                  <div className="font-mono text-primary break-all mt-1">
                    {bytesToHex(entropy)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Checksum ({checksum.length} Bit):</span>
                  <div className="font-mono text-accent mt-1">{checksum}</div>
                </div>
                <div className="text-muted-foreground">
                  <span className="text-foreground">Formel:</span> {entropy.length * 8} Bit Entropie + {checksum.length} Bit Checksum = {entropy.length * 8 + checksum.length} Bit = {wordCount} × 11 Bit
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info */}
        {words.length === 0 && (
          <div className="text-sm text-muted-foreground">
            Generiert eine BIP39-kompatible Seed Phrase mit kryptografisch sicherer Entropie.
          </div>
        )}
      </div>
    </CryptoPanel>
  );
}
