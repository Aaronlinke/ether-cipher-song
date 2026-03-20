import { useState, useEffect } from 'react';
import { Brain, Cpu, Network, Zap, TrendingUp, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';

interface Agent {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  state: number; // -1, 0, 1
  phase: number;
  signature: number;
}

interface SwarmState {
  agents: Agent[];
  globalConsensus: number;
  emergenceLevel: number;
  stability: boolean;
  cycle: number;
}

export function OmegaSwarmIntelligence() {
  const [agentCount, setAgentCount] = useState(20);
  const [connectionRadius, setConnectionRadius] = useState(100);
  const [swarm, setSwarm] = useState<SwarmState | null>(null);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<number[]>([]);

  // Initialisiere Schwarm
  const initializeSwarm = () => {
    const agents: Agent[] = [];
    for (let i = 0; i < agentCount; i++) {
      agents.push({
        id: i,
        x: Math.random() * 400 + 50,
        y: Math.random() * 200 + 50,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        state: Math.random() > 0.5 ? 1 : -1,
        phase: Math.random() * Math.PI * 2,
        signature: Math.floor(Math.random() * 1000000)
      });
    }
    
    setSwarm({
      agents,
      globalConsensus: 0,
      emergenceLevel: 0,
      stability: false,
      cycle: 0
    });
    setHistory([]);
  };

  // Schwarm-Schritt (Delta-Solver inspiriert)
  const stepSwarm = () => {
    if (!swarm) return;

    const newAgents = swarm.agents.map(agent => {
      // Finde Nachbarn innerhalb des Verbindungsradius
      const neighbors = swarm.agents.filter(other => {
        if (other.id === agent.id) return false;
        const dx = other.x - agent.x;
        const dy = other.y - agent.y;
        return Math.sqrt(dx * dx + dy * dy) < connectionRadius;
      });

      // Berechne Einfluss der Nachbarn
      let sumX = 0, sumY = 0, sumState = 0, sumPhase = 0;
      
      for (const neighbor of neighbors) {
        const dx = neighbor.x - agent.x;
        const dy = neighbor.y - agent.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        
        // Kohäsion + Separation
        if (dist < 30) {
          sumX -= dx / dist;
          sumY -= dy / dist;
        } else {
          sumX += dx / dist * 0.5;
          sumY += dy / dist * 0.5;
        }
        
        // Zustandssynchronisation
        sumState += neighbor.state;
        sumPhase += Math.sin(neighbor.phase - agent.phase);
      }

      // Neue Geschwindigkeit
      const newVx = agent.vx + sumX * 0.1;
      const newVy = agent.vy + sumY * 0.1;
      
      // Begrenze Geschwindigkeit
      const speed = Math.sqrt(newVx * newVx + newVy * newVy);
      const maxSpeed = 3;
      const vx = speed > maxSpeed ? newVx / speed * maxSpeed : newVx;
      const vy = speed > maxSpeed ? newVy / speed * maxSpeed : newVy;

      // Neue Position
      let x = agent.x + vx;
      let y = agent.y + vy;
      
      // Randbedingungen
      if (x < 0 || x > 500) { x = Math.max(0, Math.min(500, x)); }
      if (y < 0 || y > 300) { y = Math.max(0, Math.min(300, y)); }

      // Zustandsupdate (Mehrheitsentscheidung)
      const newState = neighbors.length > 0 
        ? (sumState > 0 ? 1 : sumState < 0 ? -1 : agent.state)
        : agent.state;

      // Phasensynchronisation
      const newPhase = (agent.phase + sumPhase * 0.1 + 0.01) % (Math.PI * 2);

      return {
        ...agent,
        x, y, vx, vy,
        state: newState,
        phase: newPhase,
        signature: (agent.signature * 0x9E3779B9) >>> 0 // Pseudo-Hash Update
      };
    });

    // Berechne globale Metriken
    const totalState = newAgents.reduce((sum, a) => sum + a.state, 0);
    const globalConsensus = Math.abs(totalState) / newAgents.length;
    
    // Emergenz = Phasenkohärenz
    const avgPhase = newAgents.reduce((sum, a) => sum + a.phase, 0) / newAgents.length;
    const phaseVariance = newAgents.reduce((sum, a) => sum + Math.abs(a.phase - avgPhase), 0) / newAgents.length;
    const emergenceLevel = Math.max(0, 1 - phaseVariance / Math.PI);

    // Stabilität prüfen
    const stability = globalConsensus > 0.8 && emergenceLevel > 0.5;

    setSwarm({
      agents: newAgents,
      globalConsensus,
      emergenceLevel,
      stability,
      cycle: swarm.cycle + 1
    });

    setHistory(prev => [...prev.slice(-99), globalConsensus * 100]);
  };

  // Animation Loop
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (running && swarm) {
      interval = setInterval(stepSwarm, 50);
    }
    return () => clearInterval(interval);
  }, [running, swarm]);

  useEffect(() => {
    initializeSwarm();
  }, [agentCount]);

  return (
    <Card className="border-crypto-purple/30 bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-crypto-purple">
          <Network className="w-5 h-5" />
          OMEGA Schwarm-Intelligenz
        </CardTitle>
        <CardDescription>
          Emergente KI durch kollektive Synchronisation - Delta-Solver Architektur
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Visualisierung */}
        <div className="relative bg-black rounded-lg border border-crypto-purple/20 overflow-hidden" style={{ height: 300 }}>
          <svg width="100%" height="100%" viewBox="0 0 500 300">
            {/* Verbindungen */}
            {swarm?.agents.map(agent => 
              swarm.agents
                .filter(other => {
                  if (other.id === agent.id) return false;
                  const dx = other.x - agent.x;
                  const dy = other.y - agent.y;
                  return Math.sqrt(dx * dx + dy * dy) < connectionRadius;
                })
                .map(other => (
                  <line
                    key={`${agent.id}-${other.id}`}
                    x1={agent.x}
                    y1={agent.y}
                    x2={other.x}
                    y2={other.y}
                    stroke={agent.state === other.state ? 'rgba(147, 51, 234, 0.3)' : 'rgba(255, 165, 0, 0.2)'}
                    strokeWidth={1}
                  />
                ))
            )}
            
            {/* Agenten */}
            {swarm?.agents.map(agent => (
              <g key={agent.id}>
                <circle
                  cx={agent.x}
                  cy={agent.y}
                  r={8 + Math.sin(agent.phase) * 3}
                  fill={agent.state > 0 ? '#9333ea' : agent.state < 0 ? '#f59e0b' : '#666'}
                  opacity={0.8}
                />
                <circle
                  cx={agent.x}
                  cy={agent.y}
                  r={4}
                  fill="#fff"
                />
              </g>
            ))}
          </svg>
          
          {/* Overlay Info */}
          <div className="absolute top-2 left-2 bg-black/80 p-2 rounded text-xs font-mono">
            <p>Zyklus: {swarm?.cycle || 0}</p>
            <p className={swarm?.stability ? 'text-green-500' : 'text-orange-500'}>
              {swarm?.stability ? '✓ STABIL' : '○ KONVERGIEREND'}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <Button onClick={() => setRunning(!running)} variant={running ? "destructive" : "default"}>
            {running ? 'Stop' : 'Start'}
          </Button>
          <Button onClick={initializeSwarm} variant="outline">
            Reset
          </Button>
          <Button onClick={stepSwarm} variant="outline" disabled={running}>
            Schritt
          </Button>
        </div>

        {/* Parameter */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Agenten: {agentCount}
            </Label>
            <Slider
              value={[agentCount]}
              onValueChange={([v]) => setAgentCount(v)}
              min={5}
              max={50}
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Verbindungsradius: {connectionRadius}px
            </Label>
            <Slider
              value={[connectionRadius]}
              onValueChange={([v]) => setConnectionRadius(v)}
              min={30}
              max={200}
            />
          </div>
        </div>

        {/* Metriken */}
        {swarm && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <Brain className="w-3 h-3" />
                Globaler Konsensus
              </Label>
              <Progress value={swarm.globalConsensus * 100} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">
                {(swarm.globalConsensus * 100).toFixed(1)}%
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Emergenz-Level
              </Label>
              <Progress value={swarm.emergenceLevel * 100} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">
                {(swarm.emergenceLevel * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        )}

        {/* History Graph */}
        {history.length > 1 && (
          <div className="h-16 bg-muted/20 rounded border border-crypto-purple/20 p-2">
            <svg width="100%" height="100%" viewBox={`0 0 ${history.length} 100`} preserveAspectRatio="none">
              <polyline
                points={history.map((v, i) => `${i},${100 - v}`).join(' ')}
                fill="none"
                stroke="#9333ea"
                strokeWidth="2"
              />
            </svg>
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-muted-foreground p-3 bg-muted/20 rounded">
          <strong>Archetyp 7: Emergenz</strong> - Das Ganze ist mehr als die Summe der Teile.
          <br />
          Agenten synchronisieren ihre Phasen und Zustände durch lokale Interaktion.
          <span className="text-crypto-purple">
            → Kollektive Intelligenz entsteht ohne zentrale Kontrolle.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
