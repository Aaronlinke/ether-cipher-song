import { useState, useEffect, useCallback } from 'react';
import { 
  Atom, Brain, Bitcoin, Clock, Zap, Waves, Target, Sparkles, 
  TrendingUp, Shield, Binary, Globe, Eye, Cpu, Activity, 
  BarChart3, Layers, GitBranch, Infinity, Flame
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

// ============================================================================
// CHAOS KONSTANTEN - Lorenz System Parameter
// ============================================================================
const LORENZ = { sigma: 10, rho: 28, beta: 8/3 };
const PHI = 1.618033988749895;
const PLANCK = 6.62607015e-34;
const EULER = 2.718281828459045;

// ============================================================================
// MODULE DEFINITION - Alle wissenschaftlichen Tools
// ============================================================================
interface OmegaModule {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  category: 'crypto' | 'physics' | 'math' | 'ai' | 'chaos';
  description: string;
  power: number; // 0-100 Leistungsfaktor
  status: 'active' | 'standby' | 'computing';
  chaosIndex: number;
}

const OMEGA_MODULES: OmegaModule[] = [
  { id: 'bitcoin-puzzle', name: 'Bitcoin Puzzle Solver', icon: Bitcoin, color: '#F7931A', category: 'crypto', description: 'SECP256K1 + Delta-Solver + Ur-Zahl Heuristik', power: 95, status: 'standby', chaosIndex: 0.87 },
  { id: 'ecdsa', name: 'ECDSA Crypto Module', icon: Shield, color: '#00D4AA', category: 'crypto', description: 'Elliptische Kurven Signatur & Verifikation', power: 92, status: 'standby', chaosIndex: 0.65 },
  { id: 'sha256', name: 'SHA-256 Paper Computer', icon: Binary, color: '#6366F1', category: 'crypto', description: 'Analog Mining - Schritt für Schritt', power: 88, status: 'standby', chaosIndex: 0.42 },
  { id: 'moire', name: 'Moiré Encryption', icon: Layers, color: '#EC4899', category: 'crypto', description: 'Analoge Steganographie durch Interferenz', power: 78, status: 'standby', chaosIndex: 0.91 },
  { id: 'quantum', name: 'Quantum Module', icon: Atom, color: '#8B5CF6', category: 'physics', description: 'Bloch-Sphäre & Quanten-Zeitumkehr', power: 97, status: 'standby', chaosIndex: 0.99 },
  { id: 'vacuum', name: 'Quantum Vacuum Simulator', icon: Sparkles, color: '#06B6D4', category: 'physics', description: 'Hawking-Strahlung & Casimir-Effekt', power: 94, status: 'standby', chaosIndex: 0.88 },
  { id: 'cosmology', name: 'Cosmology Calculator', icon: Globe, color: '#F59E0B', category: 'physics', description: 'Zeitdilatation & Schwarzschild-Metrik', power: 91, status: 'standby', chaosIndex: 0.73 },
  { id: 'dgl', name: 'DGL Solver', icon: TrendingUp, color: '#10B981', category: 'math', description: 'Differentialgleichungen alle Presets', power: 89, status: 'standby', chaosIndex: 0.56 },
  { id: 'inverse', name: 'Inverse Math', icon: GitBranch, color: '#EF4444', category: 'math', description: 'Rückwärtsrechnung & Umkehrfunktionen', power: 86, status: 'standby', chaosIndex: 0.61 },
  { id: 'bifurcation', name: 'Bifurcation Diagram', icon: Activity, color: '#F97316', category: 'chaos', description: 'Chaos-Analyse & Lyapunov-Exponent', power: 93, status: 'standby', chaosIndex: 0.95 },
  { id: 'lorenz', name: 'Lorenz Attractor', icon: Infinity, color: '#A855F7', category: 'chaos', description: '3D Chaos-Visualisierung', power: 90, status: 'standby', chaosIndex: 1.0 },
  { id: 'seir', name: 'SEIR Simulator', icon: Waves, color: '#14B8A6', category: 'math', description: 'Epidemie-Modellierung', power: 85, status: 'standby', chaosIndex: 0.68 },
  { id: 'swarm', name: 'Omega Swarm Intelligence', icon: Brain, color: '#8B5CF6', category: 'ai', description: 'Emergente KI & Kollektive Synchronisation', power: 96, status: 'standby', chaosIndex: 0.84 },
  { id: 'urzahl', name: 'Ur-Zahl Generator', icon: Flame, color: '#DC2626', category: 'math', description: '9-fache Spiegelung für universelle Seeds', power: 87, status: 'standby', chaosIndex: 0.77 },
  { id: 'chronoplast', name: 'Linke Chronoplast', icon: Clock, color: '#7C3AED', category: 'physics', description: 'Zeit-Geometrie-Konstruktion', power: 88, status: 'standby', chaosIndex: 0.82 },
  { id: 'ai-assistant', name: 'OMNI-GENESIS KI', icon: Cpu, color: '#3B82F6', category: 'ai', description: 'Superintelligenz mit universellem Wissen', power: 99, status: 'standby', chaosIndex: 0.93 },
];

// ============================================================================
// CHAOS BERECHNUNG - Lorenz System Step
// ============================================================================
function lorenzStep(x: number, y: number, z: number, dt: number = 0.01) {
  const dx = LORENZ.sigma * (y - x);
  const dy = x * (LORENZ.rho - z) - y;
  const dz = x * y - LORENZ.beta * z;
  return {
    x: x + dx * dt,
    y: y + dy * dt,
    z: z + dz * dt
  };
}

// ============================================================================
// HAUPTKOMPONENTE
// ============================================================================
export function OmegaChaosDashboard() {
  const [modules, setModules] = useState<OmegaModule[]>(OMEGA_MODULES);
  const [chaosState, setChaosState] = useState({ x: 1, y: 1, z: 1 });
  const [globalEntropy, setGlobalEntropy] = useState(0);
  const [systemPower, setSystemPower] = useState(0);
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const [cosmicPulse, setCosmicPulse] = useState(0);
  const [quantumCoherence, setQuantumCoherence] = useState(0.5);
  
  // Chaos-Animation
  useEffect(() => {
    const interval = setInterval(() => {
      setChaosState(prev => lorenzStep(prev.x, prev.y, prev.z));
      setCosmicPulse(p => (p + 0.02) % (Math.PI * 2));
      
      // Globale Entropie basierend auf Chaos
      setGlobalEntropy(prev => {
        const chaos = Math.abs(Math.sin(chaosState.x * 0.1)) * 100;
        return prev * 0.95 + chaos * 0.05;
      });
      
      // Quanten-Kohärenz oszilliert
      setQuantumCoherence(Math.sin(cosmicPulse) * 0.3 + 0.5);
      
    }, 50);
    return () => clearInterval(interval);
  }, [chaosState, cosmicPulse]);

  // System-Power berechnen
  useEffect(() => {
    const activePower = modules
      .filter(m => activeModules.includes(m.id))
      .reduce((sum, m) => sum + m.power, 0);
    const avgPower = activeModules.length > 0 ? activePower / activeModules.length : 0;
    setSystemPower(avgPower);
  }, [activeModules, modules]);

  const toggleModule = useCallback((id: string) => {
    setActiveModules(prev => {
      if (prev.includes(id)) {
        toast.info(`${modules.find(m => m.id === id)?.name} deaktiviert`);
        return prev.filter(m => m !== id);
      } else {
        toast.success(`${modules.find(m => m.id === id)?.name} aktiviert!`);
        return [...prev, id];
      }
    });
    
    setModules(prev => prev.map(m => 
      m.id === id 
        ? { ...m, status: m.status === 'active' ? 'standby' : 'active' }
        : m
    ));
  }, [modules]);

  const activateAll = () => {
    setActiveModules(modules.map(m => m.id));
    setModules(prev => prev.map(m => ({ ...m, status: 'active' })));
    toast.success('🚀 ALLE SYSTEME AKTIVIERT - OMEGA MODUS!');
  };

  const getCategoryModules = (category: OmegaModule['category']) => 
    modules.filter(m => m.category === category);

  const CategorySection = ({ category, title, icon: Icon }: { category: OmegaModule['category'], title: string, icon: React.ElementType }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
        <Icon className="w-4 h-4" />
        {title}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {getCategoryModules(category).map(module => (
          <button
            key={module.id}
            onClick={() => toggleModule(module.id)}
            className={`
              relative p-3 rounded-lg border transition-all duration-300
              ${activeModules.includes(module.id)
                ? 'bg-gradient-to-br from-card to-muted border-primary shadow-lg shadow-primary/20'
                : 'bg-card/50 border-border hover:border-primary/50 hover:bg-card'
              }
            `}
          >
            <div className="flex items-start gap-3">
              <div 
                className={`
                  p-2 rounded-lg transition-all
                  ${activeModules.includes(module.id) ? 'animate-pulse' : ''}
                `}
                style={{ backgroundColor: module.color + '20' }}
              >
                <module.icon className="w-5 h-5" style={{ color: module.color }} />
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium text-sm">{module.name}</div>
                <div className="text-xs text-muted-foreground line-clamp-1">
                  {module.description}
                </div>
              </div>
            </div>
            
            {/* Power Bar */}
            <div className="mt-2 flex items-center gap-2">
              <Progress value={module.power} className="h-1 flex-1" />
              <span className="text-xs text-muted-foreground">{module.power}%</span>
            </div>
            
            {/* Status Indicator */}
            {activeModules.includes(module.id) && (
              <div 
                className="absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: module.color }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="rounded-xl border border-crypto-purple/30 bg-gradient-to-br from-card via-card/95 to-muted/50 backdrop-blur-sm p-6 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Atom 
              className="w-10 h-10 text-crypto-purple" 
              style={{ 
                transform: `rotate(${cosmicPulse * 57.3}deg)`,
                filter: `drop-shadow(0 0 ${10 + Math.sin(cosmicPulse) * 5}px rgba(139, 92, 246, 0.5))`
              }} 
            />
            <div className="absolute inset-0 animate-ping opacity-30">
              <Atom className="w-10 h-10 text-crypto-purple" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-crypto-purple via-pink-500 to-orange-500 bg-clip-text text-transparent">
              OMEGA CHAOS COMMAND
            </h3>
            <p className="text-sm text-muted-foreground">
              Universelles Wissenschafts-Dashboard • {activeModules.length}/{modules.length} Module aktiv
            </p>
          </div>
        </div>
        
        <Button 
          onClick={activateAll}
          className="bg-gradient-to-r from-crypto-purple to-pink-600 hover:from-crypto-purple/90 hover:to-pink-600/90"
        >
          <Zap className="w-4 h-4 mr-2" />
          OMEGA MODUS
        </Button>
      </div>

      {/* Global Status Display */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Activity className="w-4 h-4" />
            System Power
          </div>
          <div className="text-2xl font-bold text-green-500">{systemPower.toFixed(1)}%</div>
          <Progress value={systemPower} className="h-1 mt-2" />
        </div>
        
        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Flame className="w-4 h-4" />
            Chaos-Index
          </div>
          <div className="text-2xl font-bold text-orange-500">{globalEntropy.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground mt-1">
            Lorenz: ({chaosState.x.toFixed(1)}, {chaosState.y.toFixed(1)}, {chaosState.z.toFixed(1)})
          </div>
        </div>
        
        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Atom className="w-4 h-4" />
            Quanten-Kohärenz
          </div>
          <div className="text-2xl font-bold text-purple-500">{(quantumCoherence * 100).toFixed(1)}%</div>
          <Progress value={quantumCoherence * 100} className="h-1 mt-2" />
        </div>
        
        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Eye className="w-4 h-4" />
            Goldener Schnitt
          </div>
          <div className="text-2xl font-bold text-yellow-500">φ = {PHI.toFixed(6)}</div>
          <div className="text-xs text-muted-foreground mt-1">Universelle Harmonie</div>
        </div>
      </div>

      {/* Chaos Visualizer Bar */}
      <div className="mb-6 p-3 rounded-lg bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 border border-primary/20">
        <div className="flex items-center gap-4">
          <div className="text-xs font-medium text-muted-foreground uppercase">Chaos-Welle</div>
          <div className="flex-1 h-8 relative overflow-hidden rounded">
            {Array.from({ length: 50 }).map((_, i) => {
              const height = Math.abs(Math.sin(cosmicPulse + i * 0.2) * Math.cos(chaosState.x * 0.1 + i * 0.1)) * 100;
              return (
                <div
                  key={i}
                  className="absolute bottom-0 w-1 rounded-t transition-all duration-100"
                  style={{
                    left: `${i * 2}%`,
                    height: `${height}%`,
                    backgroundColor: `hsl(${260 + i * 2}, 70%, 60%)`,
                    opacity: 0.8
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Module Grid by Category */}
      <div className="space-y-6">
        <CategorySection category="crypto" title="Kryptographie" icon={Shield} />
        <CategorySection category="physics" title="Quantenphysik" icon={Atom} />
        <CategorySection category="math" title="Mathematik" icon={BarChart3} />
        <CategorySection category="chaos" title="Chaos-Theorie" icon={Infinity} />
        <CategorySection category="ai" title="Künstliche Intelligenz" icon={Brain} />
      </div>

      {/* Footer Info */}
      <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-crypto-purple/10 to-pink-500/10 border border-primary/20">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-crypto-purple" />
            <span className="text-muted-foreground">
              <strong className="text-foreground">{modules.length}</strong> wissenschaftliche Module bereit
            </span>
          </div>
          <div className="text-muted-foreground">
            Planck: ℏ = {PLANCK.toExponential(2)} J·s
          </div>
        </div>
      </div>
    </div>
  );
}
