import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Activity, Play, RotateCcw, Users, AlertTriangle, Heart, Shield } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';

// ==================== SEIR MODELL ====================

interface SEIRState {
  S: number; // Susceptible (Anfällig)
  E: number; // Exposed (Exponiert/Inkubation)
  I: number; // Infected (Infiziert)
  R: number; // Recovered (Genesen)
  t: number;
}

interface SEIRParams {
  beta: number;    // Übertragungsrate
  sigma: number;   // Inkubationsrate (1/Inkubationszeit)
  gamma: number;   // Genesungsrate (1/Infektionsdauer)
  N: number;       // Gesamtpopulation
}

function solveSEIR(
  initial: SEIRState,
  params: SEIRParams,
  days: number,
  dt: number = 0.1
): SEIRState[] {
  const { beta, sigma, gamma, N } = params;
  const points: SEIRState[] = [initial];
  
  let state = { ...initial };
  const steps = Math.floor(days / dt);
  
  for (let i = 0; i < steps; i++) {
    const { S, E, I, R, t } = state;
    
    // SEIR Differentialgleichungen
    const dS = -beta * S * I / N;
    const dE = beta * S * I / N - sigma * E;
    const dI = sigma * E - gamma * I;
    const dR = gamma * I;
    
    state = {
      S: Math.max(0, S + dS * dt),
      E: Math.max(0, E + dE * dt),
      I: Math.max(0, I + dI * dt),
      R: Math.max(0, R + dR * dt),
      t: t + dt
    };
    
    // Nur jeden n-ten Punkt speichern
    if (i % 10 === 0) {
      points.push({ ...state });
    }
  }
  
  return points;
}

// Rückwärts-SEIR (Zeitumkehr)
function solveSEIRBackward(
  finalState: SEIRState,
  params: SEIRParams,
  days: number,
  dt: number = 0.1
): SEIRState[] {
  const { beta, sigma, gamma, N } = params;
  const points: SEIRState[] = [];
  
  let state = { ...finalState };
  const steps = Math.floor(days / dt);
  
  for (let i = steps; i >= 0; i--) {
    if (i % 10 === 0) {
      points.unshift({ ...state, t: i * dt });
    }
    
    const { S, E, I, R } = state;
    
    // Rückwärts: Vorzeichen umkehren
    const dS = beta * S * I / N;
    const dE = -beta * S * I / N + sigma * E;
    const dI = -sigma * E + gamma * I;
    const dR = -gamma * I;
    
    state = {
      S: Math.max(0, S + dS * dt),
      E: Math.max(0, E + dE * dt),
      I: Math.max(0, I + dI * dt),
      R: Math.max(0, R + dR * dt),
      t: state.t - dt
    };
  }
  
  return points;
}

export function SEIRSimulator() {
  // Parameter mit Slidern
  const [beta, setBeta] = useState(0.4);      // Übertragungsrate
  const [sigma, setSigma] = useState(0.2);    // 1/5 Tage Inkubation
  const [gamma, setGamma] = useState(0.1);    // 1/10 Tage Infektion
  const [population, setPopulation] = useState(10000);
  const [initialInfected, setInitialInfected] = useState(10);
  const [initialExposed, setInitialExposed] = useState(20);
  const [days, setDays] = useState(150);
  
  const [result, setResult] = useState<{
    forward: SEIRState[];
    backward: SEIRState[];
    R0: number;
  } | null>(null);
  
  const solve = () => {
    const params: SEIRParams = { beta, sigma, gamma, N: population };
    const initial: SEIRState = {
      S: population - initialInfected - initialExposed,
      E: initialExposed,
      I: initialInfected,
      R: 0,
      t: 0
    };
    
    // Vorwärts lösen
    const forward = solveSEIR(initial, params, days);
    
    // Endzustand nehmen und rückwärts lösen
    const finalState = forward[forward.length - 1];
    const backward = solveSEIRBackward(finalState, params, days);
    
    // R0 berechnen
    const R0 = beta / gamma;
    
    setResult({ forward, backward, R0 });
  };
  
  const reset = () => {
    setResult(null);
    setBeta(0.4);
    setSigma(0.2);
    setGamma(0.1);
    setPopulation(10000);
    setInitialInfected(10);
    setInitialExposed(20);
    setDays(150);
  };
  
  // Chart-Daten
  const chartData = useMemo(() => {
    if (!result) return [];
    
    return result.forward.map((state, i) => {
      const bwd = result.backward[i] || result.backward[result.backward.length - 1];
      return {
        t: state.t.toFixed(1),
        S_fwd: state.S,
        E_fwd: state.E,
        I_fwd: state.I,
        R_fwd: state.R,
        S_bwd: bwd.S,
        E_bwd: bwd.E,
        I_bwd: bwd.I,
        R_bwd: bwd.R
      };
    });
  }, [result]);
  
  // Peak-Infektion finden
  const peakInfo = useMemo(() => {
    if (!result) return null;
    
    let maxI = 0;
    let peakDay = 0;
    result.forward.forEach(state => {
      if (state.I > maxI) {
        maxI = state.I;
        peakDay = state.t;
      }
    });
    
    return { maxI, peakDay };
  }, [result]);
  
  // Rekonstruktionsfehler
  const error = useMemo(() => {
    if (!result) return null;
    
    const original = {
      S: population - initialInfected - initialExposed,
      E: initialExposed,
      I: initialInfected,
      R: 0
    };
    const reconstructed = result.backward[0];
    
    const errors = {
      S: Math.abs(original.S - reconstructed.S),
      E: Math.abs(original.E - reconstructed.E),
      I: Math.abs(original.I - reconstructed.I),
      R: Math.abs(original.R - reconstructed.R)
    };
    
    return {
      total: errors.S + errors.E + errors.I + errors.R,
      relative: ((errors.S + errors.E + errors.I + errors.R) / population) * 100
    };
  }, [result, population, initialInfected, initialExposed]);
  
  const R0 = beta / gamma;
  
  return (
    <Card className="border-crypto-purple/30 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-crypto-purple">
          <Activity className="w-5 h-5" />
          SEIR-Epidemie-Simulator
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Susceptible-Exposed-Infected-Recovered Modell mit Zeitumkehr
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Parameter-Slider */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Übertragungsrate β */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" />
              Übertragungsrate β = {beta.toFixed(2)}
            </Label>
            <Slider
              value={[beta]}
              onValueChange={(v) => setBeta(v[0])}
              min={0.05}
              max={1.0}
              step={0.05}
              className="py-1"
            />
          </div>
          
          {/* Inkubationsrate σ */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-2">
              <Users className="w-3 h-3" />
              Inkubationsrate σ = {sigma.toFixed(2)} (≈{(1/sigma).toFixed(1)} Tage)
            </Label>
            <Slider
              value={[sigma]}
              onValueChange={(v) => setSigma(v[0])}
              min={0.05}
              max={0.5}
              step={0.01}
              className="py-1"
            />
          </div>
          
          {/* Genesungsrate γ */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-2">
              <Heart className="w-3 h-3" />
              Genesungsrate γ = {gamma.toFixed(2)} (≈{(1/gamma).toFixed(1)} Tage)
            </Label>
            <Slider
              value={[gamma]}
              onValueChange={(v) => setGamma(v[0])}
              min={0.02}
              max={0.3}
              step={0.01}
              className="py-1"
            />
          </div>
          
          {/* Simulationsdauer */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Simulationsdauer = {days} Tage
            </Label>
            <Slider
              value={[days]}
              onValueChange={(v) => setDays(v[0])}
              min={30}
              max={365}
              step={10}
              className="py-1"
            />
          </div>
        </div>
        
        {/* Anfangsbedingungen */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-2 rounded bg-background/40 border border-border/30">
            <Label className="text-xs text-muted-foreground">Population</Label>
            <Slider
              value={[population]}
              onValueChange={(v) => setPopulation(v[0])}
              min={1000}
              max={100000}
              step={1000}
              className="py-1"
            />
            <p className="text-xs font-mono text-foreground">{population.toLocaleString()}</p>
          </div>
          <div className="p-2 rounded bg-background/40 border border-yellow-500/30">
            <Label className="text-xs text-yellow-400">Exponiert (E₀)</Label>
            <Slider
              value={[initialExposed]}
              onValueChange={(v) => setInitialExposed(v[0])}
              min={0}
              max={100}
              step={1}
              className="py-1"
            />
            <p className="text-xs font-mono text-yellow-400">{initialExposed}</p>
          </div>
          <div className="p-2 rounded bg-background/40 border border-red-500/30">
            <Label className="text-xs text-red-400">Infiziert (I₀)</Label>
            <Slider
              value={[initialInfected]}
              onValueChange={(v) => setInitialInfected(v[0])}
              min={1}
              max={100}
              step={1}
              className="py-1"
            />
            <p className="text-xs font-mono text-red-400">{initialInfected}</p>
          </div>
        </div>
        
        {/* R0 Anzeige */}
        <div className={`p-3 rounded-lg flex items-center justify-between ${R0 > 1 ? 'bg-red-500/10 border border-red-500/30' : 'bg-green-500/10 border border-green-500/30'}`}>
          <div className="flex items-center gap-2">
            <Shield className={`w-5 h-5 ${R0 > 1 ? 'text-red-400' : 'text-green-400'}`} />
            <span className="text-sm font-semibold">Basisreproduktionszahl R₀</span>
          </div>
          <span className={`text-xl font-bold font-mono ${R0 > 1 ? 'text-red-400' : 'text-green-400'}`}>
            {R0.toFixed(2)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          {R0 > 1 ? '⚠️ Epidemie breitet sich aus (R₀ > 1)' : '✓ Epidemie klingt ab (R₀ < 1)'}
        </p>
        
        {/* Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={solve}
            className="flex-1 bg-crypto-purple hover:bg-crypto-purple/80"
          >
            <Play className="w-4 h-4 mr-2" />
            Simulieren
          </Button>
          <Button
            onClick={reset}
            variant="outline"
            className="border-border/50"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Ergebnisse */}
        {result && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Peak Info */}
            {peakInfo && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <p className="text-xs text-muted-foreground">Peak Infizierte</p>
                  <p className="text-xl font-bold text-red-400">{Math.round(peakInfo.maxI).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">({((peakInfo.maxI / population) * 100).toFixed(1)}% der Population)</p>
                </div>
                <div className="p-3 rounded-lg bg-background/40 border border-border/30">
                  <p className="text-xs text-muted-foreground">Peak erreicht nach</p>
                  <p className="text-xl font-bold text-foreground">{Math.round(peakInfo.peakDay)} Tagen</p>
                </div>
              </div>
            )}
            
            {/* Rekonstruktionsfehler */}
            {error && (
              <div className={`p-2 rounded text-xs ${error.relative < 1 ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'}`}>
                <span className="font-semibold">Rückwärts-Rekonstruktion:</span>{' '}
                Fehler = {error.total.toFixed(1)} Personen ({error.relative.toFixed(3)}%)
              </div>
            )}
            
            {/* SEIR Chart */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground">SEIR-Verlauf (Vorwärts)</h4>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="t" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={10}
                      tickFormatter={(v) => `${Math.round(parseFloat(v))}d`}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={10}
                      tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '11px'
                      }}
                      formatter={(value: number) => [Math.round(value).toLocaleString(), '']}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    
                    <Area type="monotone" dataKey="S_fwd" name="Anfällig (S)" stroke="hsl(217, 91%, 60%)" fill="hsl(217, 91%, 60%)" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="E_fwd" name="Exponiert (E)" stroke="hsl(45, 93%, 47%)" fill="hsl(45, 93%, 47%)" fillOpacity={0.4} />
                    <Area type="monotone" dataKey="I_fwd" name="Infiziert (I)" stroke="hsl(0, 84%, 60%)" fill="hsl(0, 84%, 60%)" fillOpacity={0.5} />
                    <Area type="monotone" dataKey="R_fwd" name="Genesen (R)" stroke="hsl(142, 76%, 36%)" fill="hsl(142, 76%, 36%)" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* SEIR-Gleichungen */}
            <div className="p-3 rounded-lg bg-background/30 border border-border/20">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">SEIR Differentialgleichungen</h4>
              <div className="font-mono text-xs text-foreground/80 space-y-0.5">
                <p>dS/dt = -βSI/N</p>
                <p>dE/dt = βSI/N - σE</p>
                <p>dI/dt = σE - γI</p>
                <p>dR/dt = γI</p>
                <p className="text-crypto-blue mt-1">R₀ = β/γ = {R0.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
