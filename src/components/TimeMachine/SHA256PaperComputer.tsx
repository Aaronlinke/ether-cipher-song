import { useState } from 'react';
import { Binary, FileText, Hash, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Step {
  round: number;
  operation: string;
  values: string[];
  description: string;
}

export function SHA256PaperComputer() {
  const [input, setInput] = useState('Hello');
  const [steps, setSteps] = useState<Step[]>([]);
  const [finalHash, setFinalHash] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [running, setRunning] = useState(false);

  // SHA-256 Konstanten (erste 32 Bits der Kubikwurzeln der ersten 64 Primzahlen)
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  // Initial Hash Values (Quadratwurzeln der ersten 8 Primzahlen)
  const H_INIT = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  // Bit-Operationen
  const rotr = (n: number, x: number) => ((x >>> n) | (x << (32 - n))) >>> 0;
  const ch = (x: number, y: number, z: number) => ((x & y) ^ (~x & z)) >>> 0;
  const maj = (x: number, y: number, z: number) => ((x & y) ^ (x & z) ^ (y & z)) >>> 0;
  const sigma0 = (x: number) => (rotr(2, x) ^ rotr(13, x) ^ rotr(22, x)) >>> 0;
  const sigma1 = (x: number) => (rotr(6, x) ^ rotr(11, x) ^ rotr(25, x)) >>> 0;
  const gamma0 = (x: number) => (rotr(7, x) ^ rotr(18, x) ^ (x >>> 3)) >>> 0;
  const gamma1 = (x: number) => (rotr(17, x) ^ rotr(19, x) ^ (x >>> 10)) >>> 0;

  const toHex = (n: number) => n.toString(16).padStart(8, '0');
  const toBin = (n: number) => n.toString(2).padStart(32, '0');

  const computeSHA256 = async () => {
    setRunning(true);
    setSteps([]);
    setCurrentStep(0);

    const newSteps: Step[] = [];

    // 1. Padding
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const bitLength = data.length * 8;
    
    // Pad to 448 bits mod 512
    const padded = [...data, 0x80];
    while ((padded.length * 8) % 512 !== 448) {
      padded.push(0x00);
    }
    
    // Append length as 64-bit big-endian
    for (let i = 7; i >= 0; i--) {
      padded.push((bitLength >>> (i * 8)) & 0xff);
    }

    newSteps.push({
      round: 0,
      operation: 'PADDING',
      values: [
        `Input: "${input}"`,
        `Länge: ${data.length} Bytes = ${bitLength} Bits`,
        `Nach Padding: ${padded.length} Bytes = ${padded.length * 8} Bits`
      ],
      description: 'Schritt 1: Nachricht auf 512-Bit Block auffüllen'
    });

    // 2. Parse into 32-bit words
    const M: number[] = [];
    for (let i = 0; i < padded.length; i += 4) {
      M.push((padded[i] << 24) | (padded[i + 1] << 16) | (padded[i + 2] << 8) | padded[i + 3]);
    }

    newSteps.push({
      round: 0,
      operation: 'PARSE',
      values: M.slice(0, 8).map((w, i) => `W[${i}] = ${toHex(w)}`),
      description: 'Schritt 2: In 32-Bit Wörter aufteilen'
    });

    // 3. Message Schedule (erweitere auf 64 Wörter)
    const W = [...M];
    for (let i = 16; i < 64; i++) {
      W[i] = (gamma1(W[i - 2]) + W[i - 7] + gamma0(W[i - 15]) + W[i - 16]) >>> 0;
    }

    newSteps.push({
      round: 0,
      operation: 'EXPANSION',
      values: [
        'Message Schedule erweitert auf 64 Wörter:',
        ...W.slice(16, 20).map((w, i) => `W[${i + 16}] = ${toHex(w)}`)
      ],
      description: 'Schritt 3: Message Schedule auf 64 Wörter erweitern'
    });

    // 4. Kompression
    let [a, b, c, d, e, f, g, h] = H_INIT;

    for (let i = 0; i < 64; i++) {
      const T1 = (h + sigma1(e) + ch(e, f, g) + K[i] + W[i]) >>> 0;
      const T2 = (sigma0(a) + maj(a, b, c)) >>> 0;
      
      h = g;
      g = f;
      f = e;
      e = (d + T1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (T1 + T2) >>> 0;

      if (i < 4 || i >= 60) {
        newSteps.push({
          round: i + 1,
          operation: `ROUND ${i}`,
          values: [
            `T1 = Σ1(e) + Ch(e,f,g) + h + K[${i}] + W[${i}]`,
            `T2 = Σ0(a) + Maj(a,b,c)`,
            `a=${toHex(a)} b=${toHex(b)}`,
            `e=${toHex(e)} f=${toHex(f)}`
          ],
          description: `Kompressionsrunde ${i}: Rotation & Addition`
        });
      }
    }

    // 5. Finaler Hash
    const H = [
      (H_INIT[0] + a) >>> 0,
      (H_INIT[1] + b) >>> 0,
      (H_INIT[2] + c) >>> 0,
      (H_INIT[3] + d) >>> 0,
      (H_INIT[4] + e) >>> 0,
      (H_INIT[5] + f) >>> 0,
      (H_INIT[6] + g) >>> 0,
      (H_INIT[7] + h) >>> 0
    ];

    const hash = H.map(toHex).join('');

    newSteps.push({
      round: 64,
      operation: 'FINAL',
      values: H.map((h, i) => `H[${i}] = ${toHex(h)}`),
      description: 'Schritt 5: Finale Hash-Werte addieren'
    });

    setSteps(newSteps);
    setFinalHash(hash);
    setRunning(false);
  };

  return (
    <Card className="border-crypto-purple/30 bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-crypto-purple">
          <FileText className="w-5 h-5" />
          SHA-256 Papier-Computer
        </CardTitle>
        <CardDescription>
          "Analog Mining" - SHA-256 Schritt für Schritt wie mit Stift und Papier
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nachricht eingeben..."
            className="font-mono"
          />
          <Button onClick={computeSHA256} disabled={running}>
            <Play className="w-4 h-4 mr-2" />
            Berechnen
          </Button>
        </div>

        {/* Schritte */}
        {steps.length > 0 && (
          <ScrollArea className="h-[300px] rounded border border-crypto-purple/20 p-4">
            <div className="space-y-4">
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    step.operation === 'FINAL' 
                      ? 'bg-green-500/10 border-green-500/30' 
                      : 'bg-muted/30 border-crypto-purple/20'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded bg-crypto-purple/20 text-crypto-purple text-xs font-mono">
                      {step.operation}
                    </span>
                    <span className="text-sm text-muted-foreground">{step.description}</span>
                  </div>
                  <div className="font-mono text-xs space-y-1">
                    {step.values.map((v, i) => (
                      <p key={i} className="text-muted-foreground">{v}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Finaler Hash */}
        {finalHash && (
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
            <Label className="text-green-500 flex items-center gap-2">
              <Hash className="w-4 h-4" />
              SHA-256 Hash
            </Label>
            <p className="font-mono text-sm mt-2 break-all">{finalHash}</p>
            <p className="text-xs text-muted-foreground mt-2">
              256 Bits = 64 Hex-Zeichen • Zeitaufwand mit Papier: ~1.5 Tage pro Hash
            </p>
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-muted-foreground p-3 bg-muted/20 rounded space-y-2">
          <p><strong>Die 3 Kernoperationen (physisch ausführbar):</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li><code>XOR</code>: Zwei Papierstreifen gegen Licht halten</li>
            <li><code>ROTR</code>: Papierstreifen abschneiden und vorne ankleben</li>
            <li><code>ADD mod 2³²</code>: Binäre Addition mit Übertrag (verfällt am Ende)</li>
          </ul>
          <p className="text-crypto-purple">
            → Bitcoin ist keine Software. Bitcoin ist reine Mathematik.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
