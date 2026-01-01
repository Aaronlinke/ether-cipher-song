import { useState } from 'react';
import { ArrowLeftRight, Search, Sigma, Waves } from 'lucide-react';
import { CryptoPanel } from '@/components/CryptoPanel';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { solveInverse, lambertW, mandelbrotIteration } from '@/lib/time-machine-utils';

const PRESET_FUNCTIONS = [
  { id: 'quadratic', name: 'x² (Quadrat)', fn: (x: number) => x * x, latex: 'f(x) = x²' },
  { id: 'cubic', name: 'x³ (Kubik)', fn: (x: number) => x * x * x, latex: 'f(x) = x³' },
  { id: 'exp', name: 'eˣ (Exponential)', fn: (x: number) => Math.exp(x), latex: 'f(x) = eˣ' },
  { id: 'sin', name: 'sin(x)', fn: (x: number) => Math.sin(x), latex: 'f(x) = sin(x)' },
  { id: 'cos', name: 'cos(x)', fn: (x: number) => Math.cos(x), latex: 'f(x) = cos(x)' },
  { id: 'log', name: 'ln(x)', fn: (x: number) => x > 0 ? Math.log(x) : NaN, latex: 'f(x) = ln(x)' },
  { id: 'xex', name: 'x·eˣ (Lambert)', fn: (x: number) => x * Math.exp(x), latex: 'f(x) = x·eˣ' },
  { id: 'sinx2', name: 'sin(x²)', fn: (x: number) => Math.sin(x * x), latex: 'f(x) = sin(x²)' },
];

export function InverseMath() {
  const [selectedFunction, setSelectedFunction] = useState('quadratic');
  const [targetValue, setTargetValue] = useState(4);
  const [rangeMin, setRangeMin] = useState(-10);
  const [rangeMax, setRangeMax] = useState(10);
  const [solutions, setSolutions] = useState<number[]>([]);
  
  // Mandelbrot State
  const [cReal, setCReal] = useState(-0.7);
  const [cImag, setCImag] = useState(0.27);
  const [mandelbrotResult, setMandelbrotResult] = useState<any>(null);
  
  // Lambert W State
  const [lambertInput, setLambertInput] = useState(1);
  const [lambertResult, setLambertResult] = useState<number | null>(null);

  const solveFn = () => {
    const preset = PRESET_FUNCTIONS.find(p => p.id === selectedFunction);
    if (!preset) return;
    
    const results = solveInverse(preset.fn, targetValue, [rangeMin, rangeMax]);
    setSolutions(results);
  };

  const calculateLambert = () => {
    const result = lambertW(lambertInput);
    setLambertResult(result);
  };

  const calculateMandelbrot = () => {
    const result = mandelbrotIteration(cReal, cImag, 100);
    setMandelbrotResult(result);
  };

  const currentPreset = PRESET_FUNCTIONS.find(p => p.id === selectedFunction);

  return (
    <CryptoPanel 
      title="Inverse Mathematik" 
      icon={<ArrowLeftRight size={16} />} 
      glowColor="green"
    >
      <div className="space-y-4">
        {/* Inverse Function Solver */}
        <div className="bg-background/30 rounded p-3 border border-crypto-green/20">
          <h4 className="text-crypto-green text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
            <Search className="w-3 h-3" />
            Funktions-Umkehrung: f(x) = y → x = ?
          </h4>
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Funktion</label>
                <Select value={selectedFunction} onValueChange={setSelectedFunction}>
                  <SelectTrigger className="bg-background/50 border-crypto-green/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_FUNCTIONS.map(fn => (
                      <SelectItem key={fn.id} value={fn.id}>{fn.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Zielwert y =</label>
                <Input
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(parseFloat(e.target.value) || 0)}
                  step="0.1"
                  className="bg-background/50 border-crypto-gold/30"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Bereich min</label>
                <Input
                  type="number"
                  value={rangeMin}
                  onChange={(e) => setRangeMin(parseFloat(e.target.value) || -10)}
                  className="bg-background/50 border-border/30"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Bereich max</label>
                <Input
                  type="number"
                  value={rangeMax}
                  onChange={(e) => setRangeMax(parseFloat(e.target.value) || 10)}
                  className="bg-background/50 border-border/30"
                />
              </div>
            </div>

            <Button
              onClick={solveFn}
              className="w-full bg-crypto-green/20 hover:bg-crypto-green/30 text-crypto-green border border-crypto-green/30"
            >
              <Sigma className="w-4 h-4 mr-2" />
              Löse {currentPreset?.latex} = {targetValue}
            </Button>

            {solutions.length > 0 && (
              <div className="bg-background/50 rounded p-2 animate-hash">
                <div className="text-xs text-muted-foreground mb-1">
                  {solutions.length} Lösung{solutions.length > 1 ? 'en' : ''} gefunden:
                </div>
                <div className="font-mono text-crypto-green space-x-3">
                  {solutions.map((s, i) => (
                    <span key={i}>x = {s}</span>
                  ))}
                </div>
              </div>
            )}
            {solutions.length === 0 && targetValue !== 0 && (
              <div className="text-xs text-muted-foreground">
                Klicke "Löse" um x zu finden
              </div>
            )}
          </div>
        </div>

        {/* Lambert W Function */}
        <div className="bg-background/30 rounded p-3 border border-crypto-purple/20">
          <h4 className="text-crypto-purple text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
            <Waves className="w-3 h-3" />
            Lambert W-Funktion: W(z)·e<sup>W(z)</sup> = z
          </h4>
          
          <div className="flex gap-2">
            <Input
              type="number"
              value={lambertInput}
              onChange={(e) => setLambertInput(parseFloat(e.target.value) || 0)}
              step="0.1"
              placeholder="z eingeben"
              className="bg-background/50 border-crypto-purple/30 flex-1"
            />
            <Button
              onClick={calculateLambert}
              className="bg-crypto-purple/20 hover:bg-crypto-purple/30 text-crypto-purple border border-crypto-purple/30"
            >
              W(z)
            </Button>
          </div>
          
          {lambertResult !== null && (
            <div className="mt-2 font-mono text-sm animate-hash">
              <span className="text-muted-foreground">W({lambertInput}) = </span>
              <span className="text-crypto-purple">
                {isNaN(lambertResult) ? 'undefiniert' : lambertResult.toFixed(10)}
              </span>
            </div>
          )}
        </div>

        {/* Mandelbrot Analysis */}
        <div className="bg-background/30 rounded p-3 border border-crypto-blue/20">
          <h4 className="text-crypto-blue text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
            <span>∞</span>
            Mandelbrot-Iteration: z<sub>n+1</sub> = z<sub>n</sub>² + c
          </h4>
          
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Re(c)</label>
              <Input
                type="number"
                value={cReal}
                onChange={(e) => setCReal(parseFloat(e.target.value) || 0)}
                step="0.01"
                className="bg-background/50 border-crypto-blue/30"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Im(c)</label>
              <Input
                type="number"
                value={cImag}
                onChange={(e) => setCImag(parseFloat(e.target.value) || 0)}
                step="0.01"
                className="bg-background/50 border-crypto-blue/30"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={calculateMandelbrot}
                className="w-full bg-crypto-blue/20 hover:bg-crypto-blue/30 text-crypto-blue border border-crypto-blue/30"
              >
                Iterieren
              </Button>
            </div>
          </div>
          
          {mandelbrotResult && (
            <div className="text-xs font-mono animate-hash space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">c =</span>
                <span className="text-crypto-blue">
                  {mandelbrotResult.c.re} + {mandelbrotResult.c.im}i
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Iterationen:</span>
                <span className={mandelbrotResult.escaped ? 'text-crypto-orange' : 'text-crypto-green'}>
                  {mandelbrotResult.iterations}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className={mandelbrotResult.escaped ? 'text-crypto-red' : 'text-crypto-green'}>
                  {mandelbrotResult.escaped ? 'Entflohen (außerhalb)' : 'Gefangen (in Menge)'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Formula */}
        <div className="text-center text-xs text-muted-foreground pt-2 border-t border-border/30">
          <code className="text-crypto-green">
            f⁻¹(y) = {'{x : f(x) = y}'} via Newton-Raphson
          </code>
        </div>
      </div>
    </CryptoPanel>
  );
}
