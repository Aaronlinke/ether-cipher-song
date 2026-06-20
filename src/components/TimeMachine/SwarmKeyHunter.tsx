import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bug, 
  Zap, 
  Target, 
  Play, 
  Pause, 
  RotateCcw,
  Brain,
  Sparkles,
  TrendingUp,
  Network,
  Eye
} from 'lucide-react';

// ==================== SWARM INTELLIGENCE TYPES ====================

interface SwarmAgent {
  id: number;
  type: 'scout' | 'worker' | 'queen' | 'mutator' | 'memory';
  position: bigint; // Current key position
  velocity: bigint; // Search direction
  fitness: number; // How close to target
  pheromone: number; // Communication strength
  discoveries: string[];
  energy: number;
  generation: number;
}

interface PheromoneTrail {
  position: bigint;
  strength: number;
  depositor: number;
  timestamp: number;
}

interface SwarmMemory {
  hotspots: Map<string, number>; // Promising regions
  deadZones: Set<string>; // Already explored
  patterns: string[]; // Discovered patterns
  bestFitness: number;
  bestPosition: bigint;
}

interface SwarmMetrics {
  totalAgents: number;
  averageFitness: number;
  convergence: number;
  diversity: number;
  pheromoneStrength: number;
  explorationRate: number;
  exploitationRate: number;
}

// ==================== BITCOIN PUZZLE TARGETS ====================

// Aktuell OFFENE Bitcoin-Puzzles (Stand 2026): #72 und höher.
// Puzzles #1–#71 sind bereits gelöst (#71 zuletzt im April 2024).
function puzzleRange(bits: number): { min: bigint; max: bigint } {
  return { min: 1n << BigInt(bits - 1), max: (1n << BigInt(bits)) - 1n };
}
const OPEN_PUZZLE_LIST: { bits: number; address: string }[] = [
  { bits: 72, address: '1JTK7s9YVYywfm5XUH7RNhHJH1LshCaRFR' },
  { bits: 73, address: '12VVRNPi4SJqUTsp6FmqDqY5sGosDtysn4' },
  { bits: 74, address: '1FWGcVDK3JGzCC3WtkYetULPszMaK2Jksv' },
  { bits: 75, address: '1J36UjUByGroXcCvmj13U6uwaVv9caEeAt' },
  { bits: 76, address: '1DJh2eHFYQfACPmrvpyWc8MSTYKh7w9eRF' },
  { bits: 77, address: '1Bxk4CQdqL9p22JEtDfdXMsng1XacifUtE' },
  { bits: 78, address: '15qF6X51huDjqTmF9BJgxXdt1xcj46Jmhb' },
  { bits: 79, address: '1ARk8HWJMn8js8tQmGUJeQHjSE7KRkn2t8' },
  { bits: 80, address: '1BCf6rHUW6m3iH2ptsvnjgLruAiPQQepLe' },
];
const PUZZLE_TARGETS: { [key: number]: { address: string; minKey: bigint; maxKey: bigint; bits: number } } =
  Object.fromEntries(
    OPEN_PUZZLE_LIST.map(({ bits, address }) => {
      const { min, max } = puzzleRange(bits);
      return [bits, { address, minKey: min, maxKey: max, bits }];
    })
  );

// ==================== SWARM CORE ENGINE ====================

class SwarmIntelligenceEngine {
  private agents: SwarmAgent[] = [];
  private pheromones: PheromoneTrail[] = [];
  private memory: SwarmMemory;
  private targetAddress: string = '';
  private searchSpace: { min: bigint; max: bigint } = { min: BigInt(0), max: BigInt(0) };
  
  // Swarm parameters
  private readonly EVAPORATION_RATE = 0.02;
  private readonly PHEROMONE_DEPOSIT = 1.0;
  private readonly EXPLORATION_PROB = 0.3;
  private readonly MUTATION_RATE = 0.1;
  
  constructor() {
    this.memory = {
      hotspots: new Map(),
      deadZones: new Set(),
      patterns: [],
      bestFitness: 0,
      bestPosition: BigInt(0)
    };
  }
  
  initializeSwarm(puzzleNum: number, numAgents: number): void {
    const puzzle = PUZZLE_TARGETS[puzzleNum];
    if (!puzzle) return;
    
    this.targetAddress = puzzle.address;
    this.searchSpace = { min: puzzle.minKey, max: puzzle.maxKey };
    this.agents = [];
    this.pheromones = [];
    
    const range = puzzle.maxKey - puzzle.minKey;
    
    // Create diverse agent types
    for (let i = 0; i < numAgents; i++) {
      const type = this.getAgentType(i, numAgents);
      const position = puzzle.minKey + BigInt(Math.floor(Math.random() * Number(range % BigInt(Number.MAX_SAFE_INTEGER))));
      
      this.agents.push({
        id: i,
        type,
        position,
        velocity: this.calculateInitialVelocity(type, range),
        fitness: 0,
        pheromone: 1.0,
        discoveries: [],
        energy: 100,
        generation: 0
      });
    }
    
    // Reset memory
    this.memory = {
      hotspots: new Map(),
      deadZones: new Set(),
      patterns: [],
      bestFitness: 0,
      bestPosition: puzzle.minKey
    };
  }
  
  private getAgentType(index: number, total: number): SwarmAgent['type'] {
    const ratio = index / total;
    if (ratio < 0.1) return 'queen'; // 10% queens - strategic coordinators
    if (ratio < 0.3) return 'scout'; // 20% scouts - exploration
    if (ratio < 0.7) return 'worker'; // 40% workers - exploitation
    if (ratio < 0.85) return 'mutator'; // 15% mutators - random jumps
    return 'memory'; // 15% memory - pattern recognition
  }
  
  private calculateInitialVelocity(type: SwarmAgent['type'], range: bigint): bigint {
    const baseVelocity = range / BigInt(1000000);
    
    switch (type) {
      case 'queen':
        return baseVelocity * BigInt(10); // Large jumps
      case 'scout':
        return baseVelocity * BigInt(5); // Medium exploration
      case 'worker':
        return baseVelocity; // Fine-grained search
      case 'mutator':
        return BigInt(Math.floor(Math.random() * 1000000)) * baseVelocity; // Random
      case 'memory':
        return baseVelocity / BigInt(2); // Very fine
    }
  }
  
  // Fitness function using address character matching
  private calculateFitness(position: bigint): number {
    // Convert position to hex string for pattern matching
    const hexKey = position.toString(16).padStart(16, '0');
    
    // Simple fitness: check for patterns in the key
    let fitness = 0;
    
    // Pattern matching with target address
    const targetChars = this.targetAddress.toLowerCase().split('');
    const keyChars = hexKey.split('');
    
    // Check for character frequency matches
    const targetFreq = new Map<string, number>();
    const keyFreq = new Map<string, number>();
    
    for (const c of targetChars) {
      targetFreq.set(c, (targetFreq.get(c) || 0) + 1);
    }
    for (const c of keyChars) {
      keyFreq.set(c, (keyFreq.get(c) || 0) + 1);
    }
    
    // Compare frequencies
    for (const [char, count] of targetFreq) {
      const keyCount = keyFreq.get(char) || 0;
      fitness += Math.min(count, keyCount) * 0.1;
    }
    
    // Bonus for interesting patterns
    if (hexKey.includes('dead')) fitness += 0.5;
    if (hexKey.includes('cafe')) fitness += 0.5;
    if (hexKey.includes('face')) fitness += 0.5;
    if (/(.)\1{3,}/.test(hexKey)) fitness += 0.3; // Repeated chars
    
    // Bonus for golden ratio proximity
    const goldenRatio = 1.618033988749895;
    const keyNum = Number(position % BigInt(Number.MAX_SAFE_INTEGER));
    const goldenDist = Math.abs((keyNum % 1000000) / 618033 - 1);
    fitness += Math.max(0, 1 - goldenDist) * 0.2;
    
    return Math.min(1, fitness);
  }
  
  step(): { agents: SwarmAgent[]; metrics: SwarmMetrics; bestKey: string } {
    // Phase 1: Calculate fitness for all agents
    for (const agent of this.agents) {
      agent.fitness = this.calculateFitness(agent.position);
      
      // Update global best
      if (agent.fitness > this.memory.bestFitness) {
        this.memory.bestFitness = agent.fitness;
        this.memory.bestPosition = agent.position;
        
        // Deposit strong pheromone
        this.pheromones.push({
          position: agent.position,
          strength: agent.fitness * 10,
          depositor: agent.id,
          timestamp: Date.now()
        });
      }
    }
    
    // Phase 2: Update pheromones (evaporation)
    this.pheromones = this.pheromones
      .map(p => ({ ...p, strength: p.strength * (1 - this.EVAPORATION_RATE) }))
      .filter(p => p.strength > 0.01);
    
    // Phase 3: Move agents based on type
    for (const agent of this.agents) {
      this.moveAgent(agent);
    }
    
    // Phase 4: Calculate metrics
    const metrics = this.calculateMetrics();
    
    return {
      agents: [...this.agents],
      metrics,
      bestKey: '0x' + this.memory.bestPosition.toString(16)
    };
  }
  
  private moveAgent(agent: SwarmAgent): void {
    const range = this.searchSpace.max - this.searchSpace.min;
    
    switch (agent.type) {
      case 'queen':
        // Queens coordinate - move towards best positions
        if (Math.random() < 0.7) {
          agent.position = this.memory.bestPosition + 
            BigInt(Math.floor((Math.random() - 0.5) * Number(agent.velocity)));
        } else {
          // Random teleport
          agent.position = this.searchSpace.min + 
            BigInt(Math.floor(Math.random() * Number(range % BigInt(Number.MAX_SAFE_INTEGER))));
        }
        break;
        
      case 'scout':
        // Scouts explore - follow pheromone trails sometimes
        if (this.pheromones.length > 0 && Math.random() < 0.5) {
          const trail = this.pheromones[Math.floor(Math.random() * this.pheromones.length)];
          agent.position = trail.position + 
            BigInt(Math.floor((Math.random() - 0.5) * Number(agent.velocity) * 10));
        } else {
          agent.position += agent.velocity * BigInt(Math.random() > 0.5 ? 1 : -1);
        }
        break;
        
      case 'worker':
        // Workers exploit - fine-grained search near good positions
        if (agent.fitness > 0.3) {
          // Stay and search locally
          agent.position += BigInt(Math.floor((Math.random() - 0.5) * Number(agent.velocity)));
        } else {
          // Move towards nearest pheromone
          const nearestPheromone = this.findNearestPheromone(agent.position);
          if (nearestPheromone) {
            agent.position = nearestPheromone.position + 
              BigInt(Math.floor((Math.random() - 0.5) * Number(agent.velocity)));
          } else {
            agent.position += agent.velocity;
          }
        }
        break;
        
      case 'mutator':
        // Mutators make random jumps
        if (Math.random() < this.MUTATION_RATE) {
          agent.position = this.searchSpace.min + 
            BigInt(Math.floor(Math.random() * Number(range % BigInt(Number.MAX_SAFE_INTEGER))));
        } else {
          agent.position += agent.velocity * BigInt(Math.random() > 0.5 ? 1 : -1);
        }
        agent.velocity = this.calculateInitialVelocity('mutator', range);
        break;
        
      case 'memory':
        // Memory agents recognize patterns
        const hexKey = agent.position.toString(16);
        const patterns = this.findPatterns(hexKey);
        
        if (patterns.length > 0) {
          agent.discoveries.push(...patterns);
          this.memory.patterns.push(...patterns);
          
          // High fitness discovery - deposit pheromone
          this.pheromones.push({
            position: agent.position,
            strength: 5,
            depositor: agent.id,
            timestamp: Date.now()
          });
        }
        
        agent.position += BigInt(Math.floor((Math.random() - 0.5) * Number(agent.velocity)));
        break;
    }
    
    // Ensure position stays in bounds
    if (agent.position < this.searchSpace.min) {
      agent.position = this.searchSpace.min;
    }
    if (agent.position > this.searchSpace.max) {
      agent.position = this.searchSpace.max;
    }
    
    // Energy decay
    agent.energy -= 0.1;
    if (agent.energy <= 0) {
      // Respawn at random position
      agent.energy = 100;
      agent.position = this.searchSpace.min + 
        BigInt(Math.floor(Math.random() * Number((this.searchSpace.max - this.searchSpace.min) % BigInt(Number.MAX_SAFE_INTEGER))));
      agent.generation++;
    }
  }
  
  private findNearestPheromone(position: bigint): PheromoneTrail | null {
    if (this.pheromones.length === 0) return null;
    
    let nearest: PheromoneTrail | null = null;
    let minDist = BigInt(Number.MAX_SAFE_INTEGER);
    
    for (const p of this.pheromones) {
      const dist = position > p.position ? position - p.position : p.position - position;
      if (dist < minDist) {
        minDist = dist;
        nearest = p;
      }
    }
    
    return nearest;
  }
  
  private findPatterns(hex: string): string[] {
    const patterns: string[] = [];
    
    // Look for repeating patterns
    if (/(.)\1{2,}/.test(hex)) {
      patterns.push(`repeat:${hex.match(/(.)\1{2,}/)?.[0]}`);
    }
    
    // Look for sequential patterns
    if (/012|123|234|345|456|567|678|789|abc|bcd|cde|def/.test(hex)) {
      patterns.push(`sequence:${hex.match(/012|123|234|345|456|567|678|789|abc|bcd|cde|def/)?.[0]}`);
    }
    
    // Look for palindromes
    for (let i = 0; i < hex.length - 3; i++) {
      const substr = hex.slice(i, i + 4);
      if (substr === substr.split('').reverse().join('')) {
        patterns.push(`palindrome:${substr}`);
      }
    }
    
    return patterns;
  }
  
  private calculateMetrics(): SwarmMetrics {
    const totalAgents = this.agents.length;
    const avgFitness = this.agents.reduce((sum, a) => sum + a.fitness, 0) / totalAgents;
    
    // Calculate diversity (standard deviation of positions)
    const positions = this.agents.map(a => Number(a.position % BigInt(Number.MAX_SAFE_INTEGER)));
    const mean = positions.reduce((a, b) => a + b, 0) / positions.length;
    const variance = positions.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / positions.length;
    const diversity = Math.sqrt(variance) / mean;
    
    // Convergence (how clustered are agents)
    const convergence = 1 - Math.min(1, diversity);
    
    // Exploration vs exploitation ratio
    const scouts = this.agents.filter(a => a.type === 'scout' || a.type === 'mutator').length;
    const workers = this.agents.filter(a => a.type === 'worker' || a.type === 'memory').length;
    const explorationRate = scouts / totalAgents;
    const exploitationRate = workers / totalAgents;
    
    return {
      totalAgents,
      averageFitness: avgFitness,
      convergence,
      diversity,
      pheromoneStrength: this.pheromones.reduce((sum, p) => sum + p.strength, 0),
      explorationRate,
      exploitationRate
    };
  }
  
  reset(): void {
    this.agents = [];
    this.pheromones = [];
    this.memory = {
      hotspots: new Map(),
      deadZones: new Set(),
      patterns: [],
      bestFitness: 0,
      bestPosition: BigInt(0)
    };
  }
}

// ==================== REACT COMPONENT ====================

export function SwarmKeyHunter() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SwarmIntelligenceEngine>(new SwarmIntelligenceEngine());
  const animationRef = useRef<number>();
  
  const [isRunning, setIsRunning] = useState(false);
  const [selectedPuzzle, setSelectedPuzzle] = useState(72);
  const [numAgents, setNumAgents] = useState([100]);
  const [speed, setSpeed] = useState([50]);
  
  const [agents, setAgents] = useState<SwarmAgent[]>([]);
  const [metrics, setMetrics] = useState<SwarmMetrics | null>(null);
  const [bestKey, setBestKey] = useState('');
  const [iteration, setIteration] = useState(0);
  const [discoveredPatterns, setDiscoveredPatterns] = useState<string[]>([]);
  
  // Initialize swarm
  useEffect(() => {
    engineRef.current.initializeSwarm(selectedPuzzle, numAgents[0]);
  }, [selectedPuzzle, numAgents]);
  
  // Render swarm visualization
  const renderSwarm = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Dark background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += 50) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }
    
    // Draw agents
    const puzzle = PUZZLE_TARGETS[selectedPuzzle];
    if (!puzzle) return;
    
    const range = puzzle.maxKey - puzzle.minKey;
    
    for (const agent of agents) {
      // Calculate normalized position
      const normalizedPos = Number((agent.position - puzzle.minKey) * BigInt(1000000) / range) / 1000000;
      const x = normalizedPos * width;
      const y = (1 - agent.fitness) * height;
      
      // Color based on type
      let color: string;
      switch (agent.type) {
        case 'queen':
          color = '#ffd700'; // Gold
          break;
        case 'scout':
          color = '#00ffff'; // Cyan
          break;
        case 'worker':
          color = '#00ff00'; // Green
          break;
        case 'mutator':
          color = '#ff00ff'; // Magenta
          break;
        case 'memory':
          color = '#ff6600'; // Orange
          break;
      }
      
      // Draw agent
      const size = agent.type === 'queen' ? 6 : 3;
      
      // Glow effect
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, size * 3, 0, Math.PI * 2);
      ctx.fill();
      
      // Core
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      
      // Energy indicator
      if (agent.type === 'queen') {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, size + 3, 0, (agent.energy / 100) * Math.PI * 2);
        ctx.stroke();
      }
    }
    
    // Draw best position indicator
    if (metrics && metrics.averageFitness > 0) {
      const bestPos = engineRef.current['memory'].bestPosition;
      const normalizedBest = Number((bestPos - puzzle.minKey) * BigInt(1000000) / range) / 1000000;
      const bestX = normalizedBest * width;
      
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(bestX, 0);
      ctx.lineTo(bestX, height);
      ctx.stroke();
      ctx.setLineDash([]);
      
      ctx.fillStyle = '#ff0000';
      ctx.font = '10px monospace';
      ctx.fillText('BEST', bestX + 5, 15);
    }
  }, [agents, metrics, selectedPuzzle]);
  
  // Simulation step
  const simulationStep = useCallback(() => {
    const result = engineRef.current.step();
    
    setAgents(result.agents);
    setMetrics(result.metrics);
    setBestKey(result.bestKey);
    setIteration(prev => prev + 1);
    
    // Collect patterns
    const allPatterns = result.agents
      .flatMap(a => a.discoveries)
      .filter((p, i, arr) => arr.indexOf(p) === i);
    
    if (allPatterns.length > 0) {
      setDiscoveredPatterns(prev => {
        const combined = [...prev, ...allPatterns];
        return combined.filter((p, i) => combined.indexOf(p) === i).slice(-20);
      });
    }
    
    renderSwarm();
    
    if (isRunning) {
      const delay = Math.max(10, 200 - speed[0] * 2);
      animationRef.current = window.setTimeout(() => {
        animationRef.current = requestAnimationFrame(simulationStep);
      }, delay);
    }
  }, [isRunning, speed, renderSwarm]);
  
  useEffect(() => {
    if (isRunning) {
      animationRef.current = requestAnimationFrame(simulationStep);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        clearTimeout(animationRef.current);
      }
    };
  }, [isRunning, simulationStep]);
  
  // Initial render
  useEffect(() => {
    renderSwarm();
  }, []);
  
  const reset = () => {
    setIsRunning(false);
    engineRef.current.reset();
    engineRef.current.initializeSwarm(selectedPuzzle, numAgents[0]);
    setAgents([]);
    setMetrics(null);
    setBestKey('');
    setIteration(0);
    setDiscoveredPatterns([]);
  };
  
  const getAgentCounts = () => {
    const counts = { queen: 0, scout: 0, worker: 0, mutator: 0, memory: 0 };
    for (const agent of agents) {
      counts[agent.type]++;
    }
    return counts;
  };
  
  const counts = getAgentCounts();
  
  return (
    <Card className="bg-black/90 border-emerald-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-emerald-400">
          <Bug className="w-6 h-6" />
          SWARM INTELLIGENCE KEY HUNTER
          <Badge variant="outline" className="ml-2 border-emerald-500 text-emerald-400">
            BIO-INSPIRED
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Ameisenkolonie-Algorithmus × Bienenschwarm-Optimierung × Evolutionäre Suche
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Puzzle Selection */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(PUZZLE_TARGETS).map(([num, puzzle]) => (
            <Button
              key={num}
              variant={selectedPuzzle === parseInt(num) ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setSelectedPuzzle(parseInt(num));
                reset();
              }}
              className={selectedPuzzle === parseInt(num) ? 'bg-emerald-600' : ''}
            >
              Puzzle #{num} ({puzzle.bits} bit)
            </Button>
          ))}
        </div>
        
        {/* Swarm Visualization */}
        <div className="relative rounded-lg overflow-hidden border border-emerald-500/30">
          <canvas 
            ref={canvasRef}
            width={700}
            height={300}
            className="w-full bg-black"
          />
          
          {/* Overlay */}
          <div className="absolute top-2 left-2 flex gap-2">
            <Badge className="bg-emerald-900/80 text-emerald-300">
              Iteration: {iteration.toLocaleString()}
            </Badge>
            <Badge className="bg-purple-900/80 text-purple-300">
              Agents: {agents.length}
            </Badge>
          </div>
          
          {/* Legend */}
          <div className="absolute bottom-2 right-2 flex gap-2 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-400"></span>Queen
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>Scout
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-400"></span>Worker
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-fuchsia-400"></span>Mutator
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-400"></span>Memory
            </span>
          </div>
        </div>
        
        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">
              Schwarmgröße: {numAgents[0]}
            </label>
            <Slider
              value={numAgents}
              onValueChange={setNumAgents}
              min={20}
              max={300}
              step={10}
              disabled={isRunning}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">
              Geschwindigkeit: {speed[0]}%
            </label>
            <Slider
              value={speed}
              onValueChange={setSpeed}
              min={10}
              max={100}
              step={5}
            />
          </div>
          
          <div className="flex items-end gap-2">
            <Button
              onClick={() => setIsRunning(!isRunning)}
              className={isRunning ? 'bg-red-600 hover:bg-red-700 flex-1' : 'bg-emerald-600 hover:bg-emerald-700 flex-1'}
            >
              {isRunning ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              {isRunning ? 'Pause' : 'Start Hunt'}
            </Button>
            <Button variant="outline" onClick={reset}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Best Key Display */}
        {bestKey && (
          <Card className="bg-gradient-to-r from-emerald-900/30 to-cyan-900/30 border-emerald-500/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-bold text-emerald-400">Bester gefundener Schlüssel:</span>
            </div>
            <code className="block bg-black/50 p-2 rounded text-sm text-emerald-300 break-all font-mono">
              {bestKey}
            </code>
            <div className="mt-2 text-xs text-muted-foreground">
              Fitness: {metrics ? (metrics.averageFitness * 100).toFixed(2) : 0}% | 
              Best: {engineRef.current['memory']?.bestFitness.toFixed(4) || 0}
            </div>
          </Card>
        )}
        
        {/* Metrics */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Card className="bg-emerald-900/20 border-emerald-500/30 p-3">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Ø Fitness
              </div>
              <Progress value={metrics.averageFitness * 100} className="mt-2" />
              <div className="text-sm font-mono text-emerald-400 mt-1">
                {(metrics.averageFitness * 100).toFixed(2)}%
              </div>
            </Card>
            
            <Card className="bg-purple-900/20 border-purple-500/30 p-3">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Network className="w-3 h-3" />
                Konvergenz
              </div>
              <Progress value={metrics.convergence * 100} className="mt-2" />
              <div className="text-sm font-mono text-purple-400 mt-1">
                {(metrics.convergence * 100).toFixed(1)}%
              </div>
            </Card>
            
            <Card className="bg-cyan-900/20 border-cyan-500/30 p-3">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Eye className="w-3 h-3" />
                Exploration
              </div>
              <Progress value={metrics.explorationRate * 100} className="mt-2" />
              <div className="text-sm font-mono text-cyan-400 mt-1">
                {(metrics.explorationRate * 100).toFixed(1)}%
              </div>
            </Card>
            
            <Card className="bg-yellow-900/20 border-yellow-500/30 p-3">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Pheromone
              </div>
              <div className="text-sm font-mono text-yellow-400 mt-3">
                {metrics.pheromoneStrength.toFixed(1)}
              </div>
            </Card>
          </div>
        )}
        
        {/* Agent Distribution */}
        <div className="grid grid-cols-5 gap-2">
          <div className="text-center p-2 rounded bg-yellow-900/20 border border-yellow-500/30">
            <div className="text-lg font-bold text-yellow-400">{counts.queen}</div>
            <div className="text-xs text-muted-foreground">Queens</div>
          </div>
          <div className="text-center p-2 rounded bg-cyan-900/20 border border-cyan-500/30">
            <div className="text-lg font-bold text-cyan-400">{counts.scout}</div>
            <div className="text-xs text-muted-foreground">Scouts</div>
          </div>
          <div className="text-center p-2 rounded bg-green-900/20 border border-green-500/30">
            <div className="text-lg font-bold text-green-400">{counts.worker}</div>
            <div className="text-xs text-muted-foreground">Workers</div>
          </div>
          <div className="text-center p-2 rounded bg-fuchsia-900/20 border border-fuchsia-500/30">
            <div className="text-lg font-bold text-fuchsia-400">{counts.mutator}</div>
            <div className="text-xs text-muted-foreground">Mutators</div>
          </div>
          <div className="text-center p-2 rounded bg-orange-900/20 border border-orange-500/30">
            <div className="text-lg font-bold text-orange-400">{counts.memory}</div>
            <div className="text-xs text-muted-foreground">Memory</div>
          </div>
        </div>
        
        {/* Discovered Patterns */}
        {discoveredPatterns.length > 0 && (
          <Card className="bg-gray-900/50 border-orange-500/30 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-bold text-orange-400">Entdeckte Muster:</span>
            </div>
            <ScrollArea className="h-20">
              <div className="flex flex-wrap gap-1">
                {discoveredPatterns.map((pattern, i) => (
                  <Badge key={i} variant="outline" className="text-xs border-orange-500/50 text-orange-300">
                    {pattern}
                  </Badge>
                ))}
              </div>
            </ScrollArea>
          </Card>
        )}
        
        {/* Theory */}
        <div className="p-3 rounded-lg bg-gradient-to-r from-emerald-900/10 to-cyan-900/10 border border-emerald-500/20">
          <h4 className="font-bold text-emerald-400 mb-2 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Wie funktioniert Schwarm-Intelligenz?
          </h4>
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>🐝 Queens:</strong> Strategische Koordinatoren - teleportieren zu vielversprechenden Regionen</p>
            <p><strong>🔍 Scouts:</strong> Erkunder - folgen Pheromon-Spuren, entdecken neue Gebiete</p>
            <p><strong>⚙️ Workers:</strong> Ausbeuter - feinkörnige Suche in vielversprechenden Zonen</p>
            <p><strong>🧬 Mutators:</strong> Zufallssprünge - verhindern lokale Minima</p>
            <p><strong>🧠 Memory:</strong> Mustererkennung - speichern interessante Muster</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default SwarmKeyHunter;
