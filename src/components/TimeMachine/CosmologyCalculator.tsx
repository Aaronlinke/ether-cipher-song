import { useState } from 'react';
import { Globe, Telescope, Clock, Thermometer, Layers } from 'lucide-react';
import { CryptoPanel } from '@/components/CryptoPanel';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  calculateCosmologyBackward, 
  type CosmologyModel, 
  type CosmologyDataPoint,
  type PersonalSignature,
  CONSTANTS 
} from '@/lib/time-machine-utils';

interface CosmologyCalculatorProps {
  personalSignature?: PersonalSignature;
  userName?: string;
}

export function CosmologyCalculator({ personalSignature, userName = 'Benutzer' }: CosmologyCalculatorProps) {
  const [H0, setH0] = useState(70.0);
  const [Omega_m, setOmega_m] = useState(0.3);
  const [Omega_lambda, setOmega_lambda] = useState(0.7);
  const [T0, setT0] = useState(2.725);
  const [model, setModel] = useState<CosmologyModel>('LambdaCDM');
  const [results, setResults] = useState<CosmologyDataPoint[]>([]);
  const [keyPoints, setKeyPoints] = useState<any[]>([]);

  const calculate = () => {
    const data = calculateCosmologyBackward(
      { H0, Omega_m, Omega_lambda, T0 },
      model,
      personalSignature
    );
    setResults(data);

    // Wichtige kosmische Ereignisse finden
    const events = [
      { name: 'Heute', z: 0, T: T0, t: 0 },
      { name: 'Rekombination', z: 1100, T: T0 * 1100, t: data.find(d => d.z >= 1000)?.time_years },
      { name: 'Erste Sterne', z: 20, T: T0 * 20, t: data.find(d => d.z >= 19)?.time_years },
      { name: 'Dunkle Energie dominiert', z: 0.4, T: T0 * 1.4, t: data.find(d => d.z >= 0.3)?.time_years },
    ];
    setKeyPoints(events);
  };

  const formatNumber = (n: number, decimals: number = 2) => {
    if (Math.abs(n) > 1e6 || Math.abs(n) < 1e-4) {
      return n.toExponential(decimals);
    }
    return n.toFixed(decimals);
  };

  return (
    <CryptoPanel 
      title="Kosmologie-Zeitmaschine" 
      icon={<Telescope size={16} />} 
      glowColor="gold"
    >
      <div className="space-y-4">
        {/* Model Selection */}
        <Tabs value={model} onValueChange={(v) => setModel(v as CosmologyModel)}>
          <TabsList className="grid grid-cols-4 bg-background/50">
            <TabsTrigger value="LambdaCDM" className="text-xs data-[state=active]:bg-crypto-gold/20">
              ΛCDM
            </TabsTrigger>
            <TabsTrigger value="MaterieDominiert" className="text-xs data-[state=active]:bg-crypto-blue/20">
              Materie
            </TabsTrigger>
            <TabsTrigger value="StrahlungsDominiert" className="text-xs data-[state=active]:bg-crypto-orange/20">
              Strahlung
            </TabsTrigger>
            <TabsTrigger value="Persoenlich" className="text-xs data-[state=active]:bg-crypto-purple/20">
              {userName.substring(0, 6)}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Parameters */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              H₀ [km/s/Mpc]
            </label>
            <Input
              type="number"
              value={H0}
              onChange={(e) => setH0(parseFloat(e.target.value) || 70)}
              step="0.1"
              className="bg-background/50 border-crypto-gold/30"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              T₀ [K]
            </label>
            <Input
              type="number"
              value={T0}
              onChange={(e) => setT0(parseFloat(e.target.value) || 2.725)}
              step="0.001"
              className="bg-background/50 border-crypto-orange/30"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Ω<sub>m</sub> (Materie)
            </label>
            <Input
              type="number"
              value={Omega_m}
              onChange={(e) => setOmega_m(parseFloat(e.target.value) || 0.3)}
              step="0.01"
              min={0}
              max={1}
              className="bg-background/50 border-crypto-blue/30"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Ω<sub>Λ</sub> (Dunkle Energie)
            </label>
            <Input
              type="number"
              value={Omega_lambda}
              onChange={(e) => setOmega_lambda(parseFloat(e.target.value) || 0.7)}
              step="0.01"
              min={0}
              max={1}
              className="bg-background/50 border-crypto-purple/30"
            />
          </div>
        </div>

        <Button
          onClick={calculate}
          className="w-full bg-crypto-gold/20 hover:bg-crypto-gold/30 text-crypto-gold border border-crypto-gold/30"
        >
          <Globe className="w-4 h-4 mr-2" />
          Universum zurückrechnen
        </Button>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-3 animate-hash">
            {/* Key Events */}
            <div className="bg-background/30 rounded p-3 border border-crypto-gold/20">
              <h4 className="text-crypto-gold text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                <Clock className="w-3 h-3" />
                Kosmische Ereignisse
              </h4>
              <div className="space-y-2">
                {keyPoints.map((event, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-foreground">{event.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-crypto-blue">z = {event.z}</span>
                      <span className="text-crypto-orange">{formatNumber(event.T)} K</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Data Table */}
            <div className="bg-background/30 rounded p-3 border border-border/20 max-h-48 overflow-y-auto">
              <div className="grid grid-cols-5 gap-2 text-[10px] font-mono text-muted-foreground border-b border-border/20 pb-1 mb-2 sticky top-0 bg-background/90">
                <span>z</span>
                <span>T [K]</span>
                <span>a(t)</span>
                <span>H(z)</span>
                <span>ρ [kg/m³]</span>
              </div>
              {results.filter((_, i) => i % 5 === 0).map((point, i) => (
                <div key={i} className="grid grid-cols-5 gap-2 text-[10px] font-mono">
                  <span className="text-crypto-blue">{formatNumber(point.z)}</span>
                  <span className="text-crypto-orange">{formatNumber(point.temperature_K)}</span>
                  <span className="text-crypto-green">{formatNumber(point.scale_factor, 4)}</span>
                  <span className="text-crypto-purple">{formatNumber(point.hubble)}</span>
                  <span className="text-muted-foreground">{formatNumber(point.density)}</span>
                </div>
              ))}
            </div>

            {/* Model Info */}
            <div className="text-xs text-muted-foreground space-y-1">
              {model === 'LambdaCDM' && (
                <div>
                  <span className="text-crypto-gold">Λ-CDM:</span> H(z) = H₀√(Ω<sub>m</sub>(1+z)³ + Ω<sub>Λ</sub>)
                </div>
              )}
              {model === 'MaterieDominiert' && (
                <div>
                  <span className="text-crypto-blue">Materie:</span> a(t) ∝ t<sup>2/3</sup>, H(z) = H₀(1+z)<sup>3/2</sup>
                </div>
              )}
              {model === 'StrahlungsDominiert' && (
                <div>
                  <span className="text-crypto-orange">Strahlung:</span> a(t) ∝ t<sup>1/2</sup>, H(z) = H₀(1+z)²
                </div>
              )}
              {model === 'Persoenlich' && personalSignature && (
                <div>
                  <span className="text-crypto-purple">{userName}:</span> D<sub>f</sub> = {personalSignature.fractalDimension.toFixed(4)}, χ = {personalSignature.chaosConstant.toFixed(4)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Formula */}
        <div className="text-center text-xs text-muted-foreground pt-2 border-t border-border/30">
          <code className="text-crypto-gold">
            T(z) = T₀ × (1+z) | a(z) = 1/(1+z) | ρ(z) = ρ₀ × (1+z)³
          </code>
        </div>
      </div>
    </CryptoPanel>
  );
}
