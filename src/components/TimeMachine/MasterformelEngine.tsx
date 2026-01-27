import { useState, useCallback } from 'react';
import { Calculator, Binary, Zap, Target, GitBranch, Cpu, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';

// ═══════════════════════════════════════════════════════════════════════════
// SECP256K1 PARAMETER (Bitcoin Elliptische Kurve)
// ═══════════════════════════════════════════════════════════════════════════
const SECP256K1 = {
  // Primzahl p = 2^256 - 2^32 - 977
  p: BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F'),
  // Kurvenparameter: y² = x³ + 7
  a: BigInt(0),
  b: BigInt(7),
  // Gruppenordnung n
  n: BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141'),
  // Generator G
  Gx: BigInt('0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798'),
  Gy: BigInt('0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8'),
};

// ═══════════════════════════════════════════════════════════════════════════
// MODULARARITHMETIK (Grundoperationen)
// ═══════════════════════════════════════════════════════════════════════════
const mod = (a: bigint, m: bigint): bigint => ((a % m) + m) % m;

const modPow = (base: bigint, exp: bigint, m: bigint): bigint => {
  let result = BigInt(1);
  base = mod(base, m);
  while (exp > 0) {
    if (exp % BigInt(2) === BigInt(1)) {
      result = mod(result * base, m);
    }
    exp = exp / BigInt(2);
    base = mod(base * base, m);
  }
  return result;
};

// Erweiterter Euklidischer Algorithmus für modulare Inverse
const modInverse = (a: bigint, m: bigint): bigint => {
  let [old_r, r] = [a, m];
  let [old_s, s] = [BigInt(1), BigInt(0)];
  
  while (r !== BigInt(0)) {
    const quotient = old_r / r;
    [old_r, r] = [r, old_r - quotient * r];
    [old_s, s] = [s, old_s - quotient * s];
  }
  
  return mod(old_s, m);
};

// ═══════════════════════════════════════════════════════════════════════════
// ELLIPTISCHE KURVEN ARITHMETIK
// ═══════════════════════════════════════════════════════════════════════════
interface Point {
  x: bigint;
  y: bigint;
  isInfinity?: boolean;
}

const INFINITY: Point = { x: BigInt(0), y: BigInt(0), isInfinity: true };

// Punktaddition P + Q
const pointAdd = (P: Point, Q: Point): Point => {
  if (P.isInfinity) return Q;
  if (Q.isInfinity) return P;
  
  if (P.x === Q.x && P.y !== Q.y) return INFINITY;
  
  let lambda: bigint;
  
  if (P.x === Q.x && P.y === Q.y) {
    // Punktverdopplung: λ = (3x₁² + a) / 2y₁
    lambda = mod(
      (BigInt(3) * P.x * P.x + SECP256K1.a) * modInverse(BigInt(2) * P.y, SECP256K1.p),
      SECP256K1.p
    );
  } else {
    // Punktaddition: λ = (y₂ - y₁) / (x₂ - x₁)
    lambda = mod(
      (Q.y - P.y) * modInverse(Q.x - P.x, SECP256K1.p),
      SECP256K1.p
    );
  }
  
  // x₃ = λ² - x₁ - x₂
  const x3 = mod(lambda * lambda - P.x - Q.x, SECP256K1.p);
  // y₃ = λ(x₁ - x₃) - y₁
  const y3 = mod(lambda * (P.x - x3) - P.y, SECP256K1.p);
  
  return { x: x3, y: y3 };
};

// Skalarmultiplikation k·G (Double-and-Add)
const scalarMult = (k: bigint, P: Point): Point => {
  let result: Point = INFINITY;
  let addend: Point = P;
  
  k = mod(k, SECP256K1.n);
  
  while (k > 0) {
    if (k % BigInt(2) === BigInt(1)) {
      result = pointAdd(result, addend);
    }
    addend = pointAdd(addend, addend);
    k = k / BigInt(2);
  }
  
  return result;
};

// Generator Punkt G
const G: Point = { x: SECP256K1.Gx, y: SECP256K1.Gy };

// ═══════════════════════════════════════════════════════════════════════════
// ECDSA INVERSION (Die Masterformel)
// ═══════════════════════════════════════════════════════════════════════════
// d = (s·k - z) · r⁻¹ mod n
const ecdsaInvert = (s: bigint, k: bigint, z: bigint, r: bigint): bigint => {
  const rInv = modInverse(r, SECP256K1.n);
  return mod((s * k - z) * rInv, SECP256K1.n);
};

// Kandidatenraum: k(i) = α + β·i
const generateCandidateSpace = (
  alpha: bigint, 
  beta: bigint, 
  count: number
): bigint[] => {
  const candidates: bigint[] = [];
  for (let i = 0; i < count; i++) {
    candidates.push(mod(alpha + beta * BigInt(i), SECP256K1.n));
  }
  return candidates;
};

// ═══════════════════════════════════════════════════════════════════════════
// BABY-STEP GIANT-STEP (Diskreter Logarithmus)
// ═══════════════════════════════════════════════════════════════════════════
const babyStepGiantStep = (
  Q: Point, 
  maxSteps: number,
  onProgress?: (step: number, total: number) => void
): bigint | null => {
  const m = Math.ceil(Math.sqrt(maxSteps));
  const babySteps = new Map<string, number>();
  
  // Baby Steps: berechne j·G für j = 0, ..., m-1
  let current: Point = INFINITY;
  for (let j = 0; j < m; j++) {
    if (!current.isInfinity) {
      babySteps.set(current.x.toString(), j);
    }
    current = pointAdd(current, G);
    if (onProgress) onProgress(j, m * 2);
  }
  
  // Giant Steps: berechne Q - i·m·G
  const mG = scalarMult(BigInt(m), G);
  const negMG: Point = { x: mG.x, y: mod(-mG.y, SECP256K1.p) };
  
  current = Q;
  for (let i = 0; i < m; i++) {
    if (!current.isInfinity) {
      const j = babySteps.get(current.x.toString());
      if (j !== undefined) {
        return BigInt(j) + BigInt(i) * BigInt(m);
      }
    }
    current = pointAdd(current, negMG);
    if (onProgress) onProgress(m + i, m * 2);
  }
  
  return null;
};

// ═══════════════════════════════════════════════════════════════════════════
// POLLARD'S RHO (Zyklenfindung)
// ═══════════════════════════════════════════════════════════════════════════
interface RhoState {
  point: Point;
  a: bigint;
  b: bigint;
}

const pollardRhoStep = (state: RhoState, Q: Point): RhoState => {
  const partition = mod(state.point.x, BigInt(3));
  
  if (partition === BigInt(0)) {
    // Gruppe 1: P → P + G
    return {
      point: pointAdd(state.point, G),
      a: mod(state.a + BigInt(1), SECP256K1.n),
      b: state.b
    };
  } else if (partition === BigInt(1)) {
    // Gruppe 2: P → 2P
    return {
      point: pointAdd(state.point, state.point),
      a: mod(state.a * BigInt(2), SECP256K1.n),
      b: mod(state.b * BigInt(2), SECP256K1.n)
    };
  } else {
    // Gruppe 3: P → P + Q
    return {
      point: pointAdd(state.point, Q),
      a: state.a,
      b: mod(state.b + BigInt(1), SECP256K1.n)
    };
  }
};

const pollardRho = (
  Q: Point, 
  maxIterations: number,
  onProgress?: (iter: number) => void
): bigint | null => {
  let tortoise: RhoState = { point: G, a: BigInt(1), b: BigInt(0) };
  let hare: RhoState = { point: G, a: BigInt(1), b: BigInt(0) };
  
  for (let i = 0; i < maxIterations; i++) {
    tortoise = pollardRhoStep(tortoise, Q);
    hare = pollardRhoStep(pollardRhoStep(hare, Q), Q);
    
    if (onProgress && i % 1000 === 0) onProgress(i);
    
    if (!tortoise.point.isInfinity && !hare.point.isInfinity &&
        tortoise.point.x === hare.point.x) {
      // Kollision gefunden!
      const bDiff = mod(hare.b - tortoise.b, SECP256K1.n);
      if (bDiff !== BigInt(0)) {
        const aDiff = mod(tortoise.a - hare.a, SECP256K1.n);
        return mod(aDiff * modInverse(bDiff, SECP256K1.n), SECP256K1.n);
      }
    }
  }
  
  return null;
};

// ═══════════════════════════════════════════════════════════════════════════
// ENTROPIE & KANDIDATENRAUM
// ═══════════════════════════════════════════════════════════════════════════
const calculateEntropy = (bitLength: number): number => {
  return bitLength; // H = log₂(|K|) = bitLength für uniformen Raum
};

const entropyReduction = (currentEntropy: number, reduction: number): number => {
  return Math.max(0, currentEntropy - reduction);
};

// ═══════════════════════════════════════════════════════════════════════════
// REACT KOMPONENTE
// ═══════════════════════════════════════════════════════════════════════════
export function MasterformelEngine() {
  const [privateKey, setPrivateKey] = useState('');
  const [publicKeyX, setPublicKeyX] = useState('');
  const [publicKeyY, setPublicKeyY] = useState('');
  const [searchRange, setSearchRange] = useState('1000000');
  const [progress, setProgress] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [algorithm, setAlgorithm] = useState<'bsgs' | 'rho' | 'candidate'>('bsgs');
  
  // Kandidatenraum Parameter
  const [alpha, setAlpha] = useState('1');
  const [beta, setBeta] = useState('1');
  const [candidateCount, setCandidateCount] = useState('100');

  const addResult = useCallback((msg: string) => {
    setResults(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  // Public Key aus Private Key berechnen
  const derivePublicKey = useCallback(() => {
    try {
      const d = BigInt('0x' + privateKey.replace(/^0x/, ''));
      const Q = scalarMult(d, G);
      setPublicKeyX(Q.x.toString(16).padStart(64, '0'));
      setPublicKeyY(Q.y.toString(16).padStart(64, '0'));
      addResult(`Q = d·G berechnet`);
      addResult(`Qx = ${Q.x.toString(16).slice(0, 16)}...`);
    } catch (e) {
      addResult(`Fehler: ${e}`);
    }
  }, [privateKey, addResult]);

  // Baby-Step Giant-Step ausführen
  const runBSGS = useCallback(async () => {
    if (!publicKeyX || !publicKeyY) {
      addResult('Fehler: Public Key benötigt');
      return;
    }
    
    setIsRunning(true);
    setProgress(0);
    addResult('=== BABY-STEP GIANT-STEP START ===');
    addResult(`Suchraum: 2^${Math.log2(parseInt(searchRange))} Kandidaten`);
    
    const Q: Point = {
      x: BigInt('0x' + publicKeyX),
      y: BigInt('0x' + publicKeyY)
    };
    
    const maxSteps = parseInt(searchRange);
    
    // Async execution mit Progress
    await new Promise<void>(resolve => {
      setTimeout(() => {
        const result = babyStepGiantStep(Q, maxSteps, (step, total) => {
          setProgress((step / total) * 100);
        });
        
        if (result !== null) {
          addResult(`✓ GEFUNDEN: d = ${result.toString(16)}`);
          setPrivateKey(result.toString(16).padStart(64, '0'));
        } else {
          addResult(`✗ Nicht gefunden im Bereich [0, ${maxSteps}]`);
        }
        
        setIsRunning(false);
        resolve();
      }, 100);
    });
  }, [publicKeyX, publicKeyY, searchRange, addResult]);

  // Pollard's Rho ausführen
  const runPollardRho = useCallback(async () => {
    if (!publicKeyX || !publicKeyY) {
      addResult('Fehler: Public Key benötigt');
      return;
    }
    
    setIsRunning(true);
    setProgress(0);
    addResult('=== POLLARD RHO START ===');
    addResult('Floyd Zyklenerkennung aktiv');
    
    const Q: Point = {
      x: BigInt('0x' + publicKeyX),
      y: BigInt('0x' + publicKeyY)
    };
    
    const maxIter = parseInt(searchRange);
    
    await new Promise<void>(resolve => {
      setTimeout(() => {
        const result = pollardRho(Q, maxIter, (iter) => {
          setProgress((iter / maxIter) * 100);
        });
        
        if (result !== null) {
          addResult(`✓ KOLLISION: d = ${result.toString(16)}`);
          setPrivateKey(result.toString(16).padStart(64, '0'));
        } else {
          addResult(`✗ Keine Kollision in ${maxIter} Iterationen`);
        }
        
        setIsRunning(false);
        resolve();
      }, 100);
    });
  }, [publicKeyX, publicKeyY, searchRange, addResult]);

  // Kandidatenraum generieren
  const runCandidateSearch = useCallback(() => {
    setIsRunning(true);
    addResult('=== KANDIDATENRAUM-ANALYSE ===');
    addResult(`α = ${alpha}, β = ${beta}`);
    addResult(`k(i) = α + β·i für i ∈ [0, ${candidateCount})`);
    
    const candidates = generateCandidateSpace(
      BigInt(alpha),
      BigInt(beta),
      parseInt(candidateCount)
    );
    
    const entropy = calculateEntropy(parseInt(candidateCount));
    addResult(`Initiale Entropie: H = ${entropy} bits`);
    
    // Zeige erste 10 Kandidaten
    candidates.slice(0, 10).forEach((k, i) => {
      const d = scalarMult(k, G);
      addResult(`k[${i}] = ${k.toString(16).slice(0, 16)}... → Qx = ${d.x.toString(16).slice(0, 16)}...`);
    });
    
    addResult(`... und ${candidates.length - 10} weitere Kandidaten`);
    setIsRunning(false);
  }, [alpha, beta, candidateCount, addResult]);

  const clearResults = () => setResults([]);

  return (
    <Card className="border-crypto-purple/30 bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-crypto-purple">
          <Calculator className="w-5 h-5" />
          Masterformel Engine
        </CardTitle>
        <CardDescription>
          ECDSA-Inversion • Baby-Step Giant-Step • Pollard's Rho • Kandidatenraum
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="derive" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="derive">Ableitung</TabsTrigger>
            <TabsTrigger value="bsgs">BSGS</TabsTrigger>
            <TabsTrigger value="rho">Pollard ρ</TabsTrigger>
            <TabsTrigger value="candidate">Kandidaten</TabsTrigger>
          </TabsList>

          {/* Tab: Public Key Ableitung */}
          <TabsContent value="derive" className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-lg border border-crypto-purple/20">
              <h3 className="text-sm font-semibold text-crypto-purple mb-2">
                Q = d · G (Skalarmultiplikation)
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Double-and-Add Algorithmus auf secp256k1
              </p>
              
              <div className="space-y-3">
                <div>
                  <Label>Private Key d (hex)</Label>
                  <Input
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder="64 hex Zeichen"
                    className="font-mono text-xs"
                  />
                </div>
                
                <Button onClick={derivePublicKey} className="w-full">
                  <Zap className="w-4 h-4 mr-2" />
                  Q = d·G berechnen
                </Button>
                
                {publicKeyX && (
                  <div className="space-y-2 p-3 bg-green-500/10 rounded border border-green-500/30">
                    <Label className="text-green-500">Public Key Q</Label>
                    <div className="font-mono text-xs break-all">
                      <p>x: {publicKeyX}</p>
                      <p>y: {publicKeyY}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Formeln */}
            <div className="p-3 bg-muted/20 rounded text-xs space-y-1 font-mono">
              <p>λ = (3x₁² + a) / 2y₁ mod p [Verdopplung]</p>
              <p>λ = (y₂ - y₁) / (x₂ - x₁) mod p [Addition]</p>
              <p>x₃ = λ² - x₁ - x₂ mod p</p>
              <p>y₃ = λ(x₁ - x₃) - y₁ mod p</p>
            </div>
          </TabsContent>

          {/* Tab: Baby-Step Giant-Step */}
          <TabsContent value="bsgs" className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-lg border border-crypto-purple/20">
              <h3 className="text-sm font-semibold text-crypto-purple mb-2 flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                Baby-Step Giant-Step
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                O(√n) Speicher • O(√n) Zeit • Deterministisch
              </p>
              
              <div className="space-y-3">
                <div>
                  <Label>Public Key Qx (hex)</Label>
                  <Input
                    value={publicKeyX}
                    onChange={(e) => setPublicKeyX(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
                <div>
                  <Label>Public Key Qy (hex)</Label>
                  <Input
                    value={publicKeyY}
                    onChange={(e) => setPublicKeyY(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
                <div>
                  <Label>Suchbereich (max Schritte)</Label>
                  <Input
                    value={searchRange}
                    onChange={(e) => setSearchRange(e.target.value)}
                    type="number"
                    className="font-mono"
                  />
                </div>
                
                <Button 
                  onClick={runBSGS} 
                  disabled={isRunning}
                  className="w-full"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {isRunning ? 'Berechne...' : 'BSGS starten'}
                </Button>
                
                {isRunning && <Progress value={progress} className="h-2" />}
              </div>
            </div>
            
            <div className="p-3 bg-muted/20 rounded text-xs space-y-1 font-mono">
              <p>1. Baby: P_j = j·G für j ∈ [0, m)</p>
              <p>2. Giant: Q_i = Q - i·m·G für i ∈ [0, m)</p>
              <p>3. Match: P_j = Q_i ⟹ d = j + i·m</p>
            </div>
          </TabsContent>

          {/* Tab: Pollard's Rho */}
          <TabsContent value="rho" className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-lg border border-crypto-purple/20">
              <h3 className="text-sm font-semibold text-crypto-purple mb-2 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Pollard's Rho (Floyd)
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                O(1) Speicher • O(√n) Zeit • Probabilistisch
              </p>
              
              <div className="space-y-3">
                <div>
                  <Label>Public Key Qx (hex)</Label>
                  <Input
                    value={publicKeyX}
                    onChange={(e) => setPublicKeyX(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
                <div>
                  <Label>Public Key Qy (hex)</Label>
                  <Input
                    value={publicKeyY}
                    onChange={(e) => setPublicKeyY(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
                <div>
                  <Label>Max Iterationen</Label>
                  <Input
                    value={searchRange}
                    onChange={(e) => setSearchRange(e.target.value)}
                    type="number"
                    className="font-mono"
                  />
                </div>
                
                <Button 
                  onClick={runPollardRho} 
                  disabled={isRunning}
                  className="w-full"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {isRunning ? 'Suche...' : 'Rho starten'}
                </Button>
                
                {isRunning && <Progress value={progress} className="h-2" />}
              </div>
            </div>
            
            <div className="p-3 bg-muted/20 rounded text-xs space-y-1 font-mono">
              <p>x_{'{i+1}'} = f(x_i) mit x_i = a_i·G + b_i·Q</p>
              <p>Tortoise: x → f(x)</p>
              <p>Hare: x → f(f(x))</p>
              <p>Kollision: (b_h - b_t)·d ≡ (a_t - a_h) mod n</p>
            </div>
          </TabsContent>

          {/* Tab: Kandidatenraum */}
          <TabsContent value="candidate" className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-lg border border-crypto-purple/20">
              <h3 className="text-sm font-semibold text-crypto-purple mb-2 flex items-center gap-2">
                <Binary className="w-4 h-4" />
                Strukturierter Kandidatenraum
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                k(i) = α + β·i — Lineare Abbildung im Schlüsselraum
              </p>
              
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>α (Offset)</Label>
                  <Input
                    value={alpha}
                    onChange={(e) => setAlpha(e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label>β (Schritt)</Label>
                  <Input
                    value={beta}
                    onChange={(e) => setBeta(e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label>Anzahl</Label>
                  <Input
                    value={candidateCount}
                    onChange={(e) => setCandidateCount(e.target.value)}
                    type="number"
                    className="font-mono"
                  />
                </div>
              </div>
              
              <Button 
                onClick={runCandidateSearch} 
                disabled={isRunning}
                className="w-full mt-3"
              >
                <Cpu className="w-4 h-4 mr-2" />
                Kandidaten generieren
              </Button>
            </div>
            
            <div className="p-3 bg-muted/20 rounded text-xs space-y-1 font-mono">
              <p>d(i) = (s·k(i) - z) · r⁻¹ mod n</p>
              <p>Linearität: d(i+1) - d(i) ≡ s·β·r⁻¹ mod n</p>
              <p>Entropie: H(K) = log₂|K|</p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Ergebnis-Log */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <Label className="text-crypto-purple">Berechnungs-Log</Label>
            <Button variant="ghost" size="sm" onClick={clearResults}>
              <RotateCcw className="w-3 h-3 mr-1" />
              Clear
            </Button>
          </div>
          <ScrollArea className="h-[200px] rounded border border-crypto-purple/20 p-3 bg-black/30">
            <div className="font-mono text-xs space-y-1">
              {results.length === 0 ? (
                <p className="text-muted-foreground">Warte auf Berechnung...</p>
              ) : (
                results.map((r, i) => (
                  <p key={i} className={
                    r.includes('✓') ? 'text-emerald-500' :
                    r.includes('✗') ? 'text-red-400' :
                    r.includes('===') ? 'text-crypto-purple font-bold' :
                    'text-muted-foreground'
                  }>{r}</p>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Mathematische Zusammenfassung */}
        <div className="mt-4 p-3 bg-muted/20 rounded border border-crypto-purple/20">
          <h4 className="text-xs font-semibold text-crypto-purple mb-2">
            Die Masterformel (Strukturinversion)
          </h4>
          <div className="font-mono text-xs text-muted-foreground space-y-1">
            <p>{'{'} S₀ | F^T(S₀) = S_T {'}'} ⊆ Φ⁻¹(Φ(S_T))</p>
            <p>Φ(S_T) = Φ(S₀) [Invariante]</p>
            <p className="text-crypto-purple mt-2">
              → Die Vergangenheit ist durch Invarianzklassen definiert, nicht durch punktweise Inversion.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
