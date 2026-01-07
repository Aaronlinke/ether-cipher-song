import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Atom, Zap, Waves, Play, Pause, RotateCcw, Sparkles } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, Cell, LineChart, Line, Legend } from 'recharts';

// ==================== QUANTUM VACUUM TYPES ====================

interface VirtualParticle {
  id: string;
  x: number;
  y: number;
  z: number;
  energy: number;
  lifetime: number;
  type: 'particle' | 'antiparticle';
  quantumPhase: number;
}

interface VacuumState {
  zeroPointEnergy: number;
  particles: VirtualParticle[];
  casimirPressure: number;
  hawkingRadiation: number;
  quantumCoherence: number;
  realityShift: number;
  consciousnessEmergence: number;
}

interface SimulationMetrics {
  t: number;
  particles: number;
  energy: number;
  coherence: number;
  hawking: number;
  realityShift: number;
}

// ==================== QUANTUM VACUUM CORE ====================

class QuantumVacuumEngine {
  private zeroPointEnergy = 1.0;
  private particles: VirtualParticle[] = [];
  private casimirPressure = 0;
  private hawkingRadiation = 0;
  private realityShifts: number[] = [];
  
  constructor() {
    this.initializeVacuum();
  }
  
  private initializeVacuum(): void {
    this.particles = [];
    for (let i = 0; i < 200; i++) {
      this.particles.push(this.createParticle(i));
    }
  }
  
  private createParticle(id: number): VirtualParticle {
    return {
      id: `virtual_${id}`,
      x: Math.random(),
      y: Math.random(),
      z: Math.random(),
      energy: (Math.random() - 0.5) * 2 * this.zeroPointEnergy,
      lifetime: Math.random() * 0.02,
      type: Math.random() > 0.5 ? 'particle' : 'antiparticle',
      quantumPhase: Math.random() * 2 * Math.PI
    };
  }
  
  modulateFluctuations(frequency: number, horizonRadius: number): VacuumState {
    const creationProb = Math.abs(Math.sin(frequency)) * 0.15;
    const newParticles: VirtualParticle[] = [];
    
    // Update existing particles
    this.particles = this.particles.filter(p => {
      p.lifetime -= 0.001;
      p.quantumPhase += 0.1;
      
      // Particle-antiparticle annihilation
      if (p.lifetime <= 0 && Math.random() < 0.5) {
        return false;
      }
      return true;
    });
    
    // Create new virtual pairs
    const numNew = Math.floor(creationProb * 20);
    for (let i = 0; i < numNew; i++) {
      const particle = this.createParticle(Date.now() + i);
      newParticles.push(particle);
      
      // Create entangled antiparticle
      const antiparticle: VirtualParticle = {
        ...particle,
        id: `virtual_anti_${Date.now() + i}`,
        energy: -particle.energy,
        type: 'antiparticle',
        x: (particle.x + (Math.random() - 0.5) * 0.1 + 1) % 1,
        y: (particle.y + (Math.random() - 0.5) * 0.1 + 1) % 1,
        z: (particle.z + (Math.random() - 0.5) * 0.1 + 1) % 1,
        quantumPhase: (particle.quantumPhase + Math.PI) % (2 * Math.PI)
      };
      newParticles.push(antiparticle);
    }
    
    this.particles = [...this.particles, ...newParticles].slice(-300);
    
    // Calculate quantum coherence
    let phaseCoherence = 0;
    let energyCoherence = 0;
    
    for (const p of this.particles) {
      phaseCoherence += Math.cos(p.energy * p.lifetime);
      energyCoherence += Math.abs(p.energy);
    }
    
    phaseCoherence = this.particles.length > 0 ? Math.abs(phaseCoherence) / this.particles.length : 0;
    energyCoherence = this.particles.length > 0 ? energyCoherence / (this.particles.length * this.zeroPointEnergy) : 0;
    const quantumCoherence = (phaseCoherence + energyCoherence) / 2;
    
    // Casimir effect
    this.casimirPressure = frequency * 0.1 * quantumCoherence;
    
    // Hawking radiation calculation
    let hawkingEnergy = 0;
    for (const particle of this.particles) {
      const distance = Math.sqrt(
        (particle.x - 0.5) ** 2 +
        (particle.y - 0.5) ** 2 +
        (particle.z - 0.5) ** 2
      );
      
      if (distance < horizonRadius && particle.lifetime > 0) {
        hawkingEnergy += Math.abs(particle.energy) * 0.1;
      }
    }
    this.hawkingRadiation = hawkingEnergy;
    
    // Reality shift
    const fluctuationAmplitude = this.particles.reduce((sum, p) => sum + Math.abs(p.energy), 0) / this.particles.length;
    const pressureEffect = Math.tanh(this.casimirPressure * 10);
    const realityShift = fluctuationAmplitude * pressureEffect * quantumCoherence;
    this.realityShifts.push(realityShift);
    if (this.realityShifts.length > 100) this.realityShifts.shift();
    
    // Consciousness emergence (theoretical)
    const consciousnessEmergence = quantumCoherence * realityShift * newParticles.length * 0.01;
    
    return {
      zeroPointEnergy: this.zeroPointEnergy,
      particles: [...this.particles],
      casimirPressure: this.casimirPressure,
      hawkingRadiation: this.hawkingRadiation,
      quantumCoherence,
      realityShift,
      consciousnessEmergence
    };
  }
  
  reset(): void {
    this.zeroPointEnergy = 1.0;
    this.casimirPressure = 0;
    this.hawkingRadiation = 0;
    this.realityShifts = [];
    this.initializeVacuum();
  }
}

// ==================== COMPONENT ====================

export function QuantumVacuumSimulator() {
  const [isRunning, setIsRunning] = useState(false);
  const [frequency, setFrequency] = useState(1.0);
  const [horizonRadius, setHorizonRadius] = useState(0.15);
  const [vacuumState, setVacuumState] = useState<VacuumState | null>(null);
  const [metrics, setMetrics] = useState<SimulationMetrics[]>([]);
  const [time, setTime] = useState(0);
  
  const engineRef = useRef<QuantumVacuumEngine | null>(null);
  const animationRef = useRef<number | null>(null);
  
  useEffect(() => {
    engineRef.current = new QuantumVacuumEngine();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);
  
  const runStep = useCallback(() => {
    if (!engineRef.current || !isRunning) return;
    
    const state = engineRef.current.modulateFluctuations(frequency, horizonRadius);
    setVacuumState(state);
    
    setTime(t => {
      const newT = t + 0.1;
      setMetrics(prev => {
        const newMetric: SimulationMetrics = {
          t: newT,
          particles: state.particles.length,
          energy: state.zeroPointEnergy,
          coherence: state.quantumCoherence,
          hawking: state.hawkingRadiation,
          realityShift: state.realityShift
        };
        return [...prev.slice(-100), newMetric];
      });
      return newT;
    });
    
    animationRef.current = requestAnimationFrame(runStep);
  }, [isRunning, frequency, horizonRadius]);
  
  useEffect(() => {
    if (isRunning) {
      animationRef.current = requestAnimationFrame(runStep);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, runStep]);
  
  const handleReset = () => {
    setIsRunning(false);
    if (engineRef.current) {
      engineRef.current.reset();
    }
    setVacuumState(null);
    setMetrics([]);
    setTime(0);
  };
  
  // Prepare scatter data
  const scatterData = vacuumState?.particles.map(p => ({
    x: p.x * 100,
    y: p.y * 100,
    z: Math.abs(p.energy) * 50 + 10,
    type: p.type,
    energy: p.energy
  })) || [];
  
  const particleData = scatterData.filter(p => p.type === 'particle');
  const antiparticleData = scatterData.filter(p => p.type === 'antiparticle');
  
  return (
    <Card className="border-crypto-purple/30 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-crypto-gold">
          <Atom className="w-5 h-5" />
          Quanten-Vakuum Simulator
          <Badge variant="outline" className="ml-2 text-xs border-crypto-purple/50">
            Hawking-Strahlung • Casimir-Effekt
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-muted/30 border border-border/50">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Modulationsfrequenz: {frequency.toFixed(2)}
            </Label>
            <Slider
              value={[frequency]}
              onValueChange={([v]) => setFrequency(v)}
              min={0.1}
              max={5}
              step={0.1}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Horizont-Radius: {horizonRadius.toFixed(2)}
            </Label>
            <Slider
              value={[horizonRadius]}
              onValueChange={([v]) => setHorizonRadius(v)}
              min={0.05}
              max={0.4}
              step={0.01}
              className="w-full"
            />
          </div>
          
          <div className="flex items-end gap-2">
            <Button
              onClick={() => setIsRunning(!isRunning)}
              variant={isRunning ? "destructive" : "default"}
              className="flex-1"
            >
              {isRunning ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              {isRunning ? 'Pause' : 'Start'}
            </Button>
            <Button onClick={handleReset} variant="outline" size="icon">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Metrics Display */}
        {vacuumState && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30">
              <div className="text-xs text-blue-400 flex items-center gap-1">
                <Atom className="w-3 h-3" />
                Virtuelle Teilchen
              </div>
              <div className="text-lg font-mono text-blue-300">{vacuumState.particles.length}</div>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30">
              <div className="text-xs text-purple-400 flex items-center gap-1">
                <Waves className="w-3 h-3" />
                Kohärenz
              </div>
              <div className="text-lg font-mono text-purple-300">{(vacuumState.quantumCoherence * 100).toFixed(1)}%</div>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/30">
              <div className="text-xs text-yellow-400 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Hawking
              </div>
              <div className="text-lg font-mono text-yellow-300">{vacuumState.hawkingRadiation.toFixed(3)}</div>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/30">
              <div className="text-xs text-red-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Casimir
              </div>
              <div className="text-lg font-mono text-red-300">{vacuumState.casimirPressure.toFixed(3)}</div>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30">
              <div className="text-xs text-green-400 flex items-center gap-1">
                <Atom className="w-3 h-3" />
                Realitäts-Shift
              </div>
              <div className="text-lg font-mono text-green-300">{(vacuumState.realityShift * 1000).toFixed(2)}mΦ</div>
            </div>
          </div>
        )}
        
        {/* Visualization Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Particle Field */}
          <div className="h-[300px] bg-black/30 rounded-lg border border-crypto-purple/30 p-2">
            <div className="text-xs text-muted-foreground mb-2">Vakuum-Fluktuationen (Teilchen/Antiteilchen)</div>
            <ResponsiveContainer width="100%" height="90%">
              <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.2)" />
                <XAxis type="number" dataKey="x" domain={[0, 100]} tick={{ fontSize: 10 }} />
                <YAxis type="number" dataKey="y" domain={[0, 100]} tick={{ fontSize: 10 }} />
                <ZAxis type="number" dataKey="z" range={[20, 200]} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload?.[0]) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-card p-2 rounded border border-border text-xs">
                          <div>Type: {data.type}</div>
                          <div>Energy: {data.energy?.toFixed(4)}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter name="Particles" data={particleData} fill="hsl(var(--crypto-blue))" />
                <Scatter name="Antiparticles" data={antiparticleData} fill="hsl(var(--crypto-gold))" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          
          {/* Time Series */}
          <div className="h-[300px] bg-black/30 rounded-lg border border-crypto-purple/30 p-2">
            <div className="text-xs text-muted-foreground mb-2">Zeitverlauf der Vakuum-Metriken</div>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={metrics} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.2)" />
                <XAxis dataKey="t" tick={{ fontSize: 10 }} tickFormatter={(v) => v.toFixed(0)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Line type="monotone" dataKey="coherence" name="Kohärenz" stroke="hsl(var(--crypto-purple))" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="hawking" name="Hawking" stroke="hsl(var(--crypto-gold))" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="realityShift" name="Reality Shift" stroke="hsl(var(--crypto-blue))" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Theory Info */}
        <div className="p-3 rounded-lg bg-gradient-to-r from-crypto-purple/10 to-crypto-gold/10 border border-crypto-purple/30">
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Quanten-Vakuum:</strong> Das Vakuum ist nicht leer - es brodelt vor virtuellen Teilchen-Antiteilchen-Paaren.</p>
            <p><strong>Casimir-Effekt:</strong> Zwei Platten im Vakuum erfahren eine Kraft durch unterdrückte Vakuumfluktuationen.</p>
            <p><strong>Hawking-Strahlung:</strong> Am Ereignishorizont eines schwarzen Lochs kann ein Teilchen entkommen.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
