import { useState, useMemo } from 'react';
import { Infinity, Sparkles, Hash, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface UrZahlResult {
  binary: string;
  decimal: string;
  hash: string;
  length: number;
  entropy: number;
  goldenRatio: number;
}

export function UrZahlGenerator() {
  const [iterations, setIterations] = useState(9);
  const [initialBits, setInitialBits] = useState('01');
  const [result, setResult] = useState<UrZahlResult | null>(null);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['Ja', 'Nein', 'Vielleicht']);
  const [decision, setDecision] = useState<string | null>(null);

  // SHA-256 Hash (Browser Crypto API)
  const sha256 = async (message: string): Promise<string> => {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Berechne Informationsentropie
  const calculateEntropy = (text: string): number => {
    const freq: Record<string, number> = {};
    for (const char of text) {
      freq[char] = (freq[char] || 0) + 1;
    }
    const len = text.length;
    let entropy = 0;
    for (const count of Object.values(freq)) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  };

  // Ur-Zahl durch n-fache Spiegelung generieren
  const generateUrZahl = async () => {
    let bits = initialBits;
    
    for (let i = 0; i < iterations; i++) {
      // Invertiere alle Bits
      const mirrored = bits.split('').map(b => b === '0' ? '1' : '0').join('');
      bits += mirrored;
    }
    
    // In Dezimal umwandeln (nur ersten 50 Zeichen für BigInt Handhabung)
    const decimal = BigInt('0b' + bits.slice(0, Math.min(bits.length, 256))).toString();
    
    // SHA-256 Hash
    const hash = await sha256(decimal);
    
    // Entropie
    const entropy = calculateEntropy(bits);
    
    // Goldener Schnitt Verhältnis
    const ones = bits.split('').filter(b => b === '1').length;
    const zeros = bits.length - ones;
    const goldenRatio = ones > zeros ? ones / zeros : zeros / ones;
    
    setResult({
      binary: bits.length > 100 ? bits.slice(0, 50) + '...' + bits.slice(-50) : bits,
      decimal: decimal.length > 50 ? decimal.slice(0, 25) + '...' + decimal.slice(-25) : decimal,
      hash,
      length: bits.length,
      entropy,
      goldenRatio
    });
  };

  // Ur-Zahl Entscheidung treffen
  const makeDecision = async () => {
    if (!result || options.length === 0) return;
    
    // Kombiniere Hash mit Frage für deterministischen Seed
    const combinedHash = await sha256(result.hash + question);
    const seed = parseInt(combinedHash.slice(0, 8), 16);
    const index = seed % options.length;
    
    setDecision(options[index]);
  };

  return (
    <Card className="border-crypto-purple/30 bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-crypto-purple">
          <Infinity className="w-5 h-5" />
          Ur-Zahl Generator
        </CardTitle>
        <CardDescription>
          9-fache Spiegelung zur Generierung universeller Entscheidungs-Seeds
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Konfiguration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Initiale Bits</Label>
            <Input
              value={initialBits}
              onChange={(e) => setInitialBits(e.target.value.replace(/[^01]/g, ''))}
              placeholder="01"
              maxLength={8}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label>Spiegelungs-Iterationen: {iterations}</Label>
            <Slider
              value={[iterations]}
              onValueChange={(v) => setIterations(v[0])}
              min={1}
              max={12}
              step={1}
            />
          </div>
        </div>

        <Button onClick={generateUrZahl} className="w-full bg-crypto-purple hover:bg-crypto-purple/80">
          <Sparkles className="w-4 h-4 mr-2" />
          Ur-Zahl Generieren
        </Button>

        {/* Ergebnis */}
        {result && (
          <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-crypto-purple/20">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Länge (Bits)</Label>
                <p className="font-mono text-lg">{result.length.toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Entropie</Label>
                <p className="font-mono text-lg">{result.entropy.toFixed(4)} bits</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Goldenes Verhältnis</Label>
                <p className="font-mono text-lg">{result.goldenRatio.toFixed(6)}</p>
                <p className="text-xs text-muted-foreground">φ = {(1.618033988749895).toFixed(6)}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Hash className="w-3 h-3" /> SHA-256
                </Label>
                <p className="font-mono text-xs break-all">{result.hash.slice(0, 32)}...</p>
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Binär (Ausschnitt)</Label>
              <p className="font-mono text-xs break-all bg-black/30 p-2 rounded mt-1">
                {result.binary}
              </p>
            </div>

            {/* Entscheidungs-Engine */}
            <div className="border-t border-crypto-purple/20 pt-4 mt-4">
              <h4 className="flex items-center gap-2 font-semibold mb-3">
                <GitBranch className="w-4 h-4" />
                Kosmische Entscheidung
              </h4>
              
              <div className="space-y-3">
                <Input
                  placeholder="Deine Frage..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                />
                <Input
                  placeholder="Optionen (kommagetrennt)"
                  defaultValue={options.join(', ')}
                  onChange={(e) => setOptions(e.target.value.split(',').map(o => o.trim()).filter(Boolean))}
                />
                <Button onClick={makeDecision} variant="secondary" className="w-full">
                  Ur-Zahl befragen
                </Button>
                
                {decision && (
                  <div className="text-center p-4 rounded-lg bg-crypto-purple/20 border border-crypto-purple">
                    <p className="text-sm text-muted-foreground mb-1">Die Ur-Zahl spricht:</p>
                    <p className="text-2xl font-bold text-crypto-purple">{decision}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
