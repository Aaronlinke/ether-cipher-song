import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Atom, Play, Pause, RotateCcw, Maximize2 } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// SRIL 3D PHASENRAUM-VISUALIZER
// H, N, G Trajektorien als 3D-Attraktor
// ═══════════════════════════════════════════════════════════════════════════

const SRIL = {
  alpha: 0.245, beta: 0.152, gamma: 0.985, delta: 0.112, eta: 0.088
};

const UR_TRIADE = { H: -4.256, N: 5.824, G: 1.952 };

interface SRILPoint {
  H: number; N: number; G: number; t: number;
}

const srilStep = (s: SRILPoint): SRILPoint => {
  const H1 = s.H + SRIL.alpha * s.N - SRIL.beta * s.G;
  const N1 = SRIL.gamma * s.N + SRIL.delta * Math.abs(s.H);
  const G1 = s.G + SRIL.eta * (H1 + N1);
  return { H: H1, N: N1, G: G1, t: s.t + 1 };
};

function TrajectoryLine({ points, color }: { points: THREE.Vector3[]; color: string }) {
  if (points.length < 2) return null;
  return (
    <Line
      points={points}
      color={color}
      lineWidth={2}
      opacity={0.9}
      transparent
    />
  );
}

function AnimatedParticle({ trajectory, color }: { trajectory: THREE.Vector3[]; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const indexRef = useRef(0);
  const trailRef = useRef<THREE.Mesh[]>([]);

  useFrame(() => {
    if (ref.current && trajectory.length > 0) {
      indexRef.current = (indexRef.current + 0.3) % trajectory.length;
      const pos = trajectory[Math.floor(indexRef.current)];
      ref.current.position.copy(pos);
    }
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.15, 12, 12]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={1.2}
      />
    </mesh>
  );
}

function GlowingSphere({ position, color, size = 0.12 }: { position: THREE.Vector3; color: string; size?: number }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[size, 12, 12]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} transparent opacity={0.7} />
    </mesh>
  );
}

function AxesHelper() {
  return (
    <>
      <Line points={[[-15, 0, 0], [15, 0, 0]]} color="hsl(0, 70%, 50%)" lineWidth={1} opacity={0.3} transparent />
      <Line points={[[0, -15, 0], [0, 15, 0]]} color="hsl(217, 70%, 50%)" lineWidth={1} opacity={0.3} transparent />
      <Line points={[[0, 0, -15], [0, 0, 15]]} color="hsl(120, 70%, 50%)" lineWidth={1} opacity={0.3} transparent />
      <Text position={[16, 0, 0]} fontSize={1.2} color="hsl(0, 70%, 60%)">H</Text>
      <Text position={[0, 16, 0]} fontSize={1.2} color="hsl(217, 70%, 60%)">N</Text>
      <Text position={[0, 0, 16]} fontSize={1.2} color="hsl(120, 70%, 60%)">G</Text>
    </>
  );
}

function Scene({ trajectory, scale }: { trajectory: SRILPoint[]; scale: number }) {
  const points = useMemo(() => {
    return trajectory.map(p => new THREE.Vector3(
      p.H / scale,
      p.N / scale,
      p.G / scale
    ));
  }, [trajectory, scale]);

  // Farbverlauf: lila → gold basierend auf Position in der Trajektorie
  const gradientPoints = useMemo(() => {
    const segments: { points: THREE.Vector3[]; color: string }[] = [];
    const segSize = Math.max(1, Math.floor(points.length / 8));

    for (let i = 0; i < points.length - 1; i += segSize) {
      const slice = points.slice(i, Math.min(i + segSize + 1, points.length));
      if (slice.length < 2) continue;
      const ratio = i / points.length;
      const r = Math.round(168 + ratio * 87);
      const g = Math.round(85 + ratio * 73);
      const b = Math.round(247 - ratio * 100);
      segments.push({ points: slice, color: `rgb(${r},${g},${b})` });
    }
    return segments;
  }, [points]);

  const start = points[0] || new THREE.Vector3();
  const end = points[points.length - 1] || new THREE.Vector3();

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[30, 30, 30]} intensity={1} />
      <pointLight position={[-20, -20, 20]} intensity={0.4} color="#a855f7" />

      <AxesHelper />

      {/* Trajektorie mit Farbverlauf */}
      {gradientPoints.map((seg, i) => (
        <TrajectoryLine key={i} points={seg.points} color={seg.color} />
      ))}

      {/* Animiertes Partikel */}
      {points.length > 1 && (
        <AnimatedParticle trajectory={points} color="#f59e0b" />
      )}

      {/* Start (grün) und Ende (rot) */}
      {points.length > 0 && (
        <>
          <GlowingSphere position={start} color="#22c55e" size={0.2} />
          <GlowingSphere position={end} color="#ef4444" size={0.2} />
        </>
      )}

      {/* Projektionen auf Ebenen (Ghost-Lines) */}
      {points.length > 1 && (
        <>
          {/* XY-Projektion (H-N Ebene) am Boden */}
          <Line
            points={points.map(p => new THREE.Vector3(p.x, p.y, -15))}
            color="#a855f7"
            lineWidth={0.5}
            opacity={0.15}
            transparent
          />
          {/* XZ-Projektion (H-G Ebene) an Rückwand */}
          <Line
            points={points.map(p => new THREE.Vector3(p.x, -15, p.z))}
            color="#3b82f6"
            lineWidth={0.5}
            opacity={0.15}
            transparent
          />
        </>
      )}

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={100}
        autoRotate
        autoRotateSpeed={0.5}
      />
    </>
  );
}

export function SRILPhaseSpace3D() {
  const [trajectory, setTrajectory] = useState<SRILPoint[]>([{ ...UR_TRIADE, t: 0 }]);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(100);
  const [scale, setScale] = useState(1);
  const [maxPoints, setMaxPoints] = useState(500);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-Generation
  const startStop = () => {
    if (running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setRunning(false);
    } else {
      setRunning(true);
      intervalRef.current = setInterval(() => {
        setTrajectory(prev => {
          const last = prev[prev.length - 1];
          const next = srilStep(last);
          const updated = [...prev, next];
          // Auto-scale
          const maxVal = Math.max(
            Math.abs(next.H), Math.abs(next.N), Math.abs(next.G)
          );
          if (maxVal > 15 * scale) {
            setScale(Math.ceil(maxVal / 10));
          }
          return updated.slice(-maxPoints);
        });
      }, speed);
    }
  };

  const reset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setTrajectory([{ ...UR_TRIADE, t: 0 }]);
    setScale(1);
  };

  const lastPoint = trajectory[trajectory.length - 1];
  const lyapunovEstimate = trajectory.length > 10
    ? Math.log(Math.abs(lastPoint.H - trajectory[trajectory.length - 10].H) + 1e-10) / 10
    : 0;

  return (
    <Card className="border-crypto-purple/30 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-crypto-purple">
              <Atom className="w-5 h-5" />
              SRIL Phasenraum 3D
            </CardTitle>
            <CardDescription className="font-mono text-xs mt-1">
              H-N-G Attraktor • Chaotische Dynamik • Lyapunov-Analyse
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              t = {lastPoint.t}
            </Badge>
            <Badge variant="outline" className={`text-xs ${lyapunovEstimate > 0 ? 'text-red-400 border-red-400/30' : 'text-green-400 border-green-400/30'}`}>
              λ ≈ {lyapunovEstimate.toFixed(3)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* 3D Canvas */}
        <div className="w-full h-72 rounded-lg overflow-hidden border border-border/30 bg-black/40 relative">
          <Canvas
            camera={{ position: [20, 15, 20], fov: 55 }}
            style={{ background: 'transparent' }}
          >
            <Scene trajectory={trajectory} scale={scale} />
          </Canvas>

          {/* Overlay-Legende */}
          <div className="absolute bottom-2 left-2 flex gap-3 text-[9px] bg-background/70 backdrop-blur-sm rounded px-2 py-1">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Start
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Aktuell
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-crypto-purple inline-block" />
              Trajektorie
            </span>
          </div>
          <div className="absolute top-2 right-2 text-[9px] bg-background/70 backdrop-blur-sm rounded px-2 py-1 font-mono text-muted-foreground">
            Scale: 1:{scale}
          </div>
        </div>

        {/* Kontrollen */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant={running ? "destructive" : "default"}
              onClick={startStop}
              className="flex-1 text-xs"
            >
              {running ? <Pause className="w-3 h-3 mr-1" /> : <Play className="w-3 h-3 mr-1" />}
              {running ? 'Stop' : 'Start'}
            </Button>
            <Button size="sm" variant="ghost" onClick={reset}>
              <RotateCcw className="w-3 h-3" />
            </Button>
          </div>
          <div>
            <Label className="text-[10px]">Speed: {speed}ms</Label>
            <Slider
              value={[speed]}
              onValueChange={([v]) => {
                setSpeed(v);
                if (running && intervalRef.current) {
                  clearInterval(intervalRef.current);
                  intervalRef.current = setInterval(() => {
                    setTrajectory(prev => {
                      const last = prev[prev.length - 1];
                      const next = srilStep(last);
                      return [...prev, next].slice(-maxPoints);
                    });
                  }, v);
                }
              }}
              min={20} max={500} step={10}
              className="mt-1"
            />
          </div>
        </div>

        {/* Metriken */}
        <div className="grid grid-cols-5 gap-1.5">
          <div className="p-1.5 bg-muted/30 rounded text-center">
            <div className="text-xs font-bold text-red-400">{lastPoint.H.toFixed(2)}</div>
            <div className="text-[8px] text-muted-foreground">H</div>
          </div>
          <div className="p-1.5 bg-muted/30 rounded text-center">
            <div className="text-xs font-bold text-blue-400">{lastPoint.N.toFixed(2)}</div>
            <div className="text-[8px] text-muted-foreground">N</div>
          </div>
          <div className="p-1.5 bg-muted/30 rounded text-center">
            <div className="text-xs font-bold text-green-400">{lastPoint.G.toFixed(2)}</div>
            <div className="text-[8px] text-muted-foreground">G</div>
          </div>
          <div className="p-1.5 bg-muted/30 rounded text-center">
            <div className="text-xs font-bold text-amber-400">{trajectory.length}</div>
            <div className="text-[8px] text-muted-foreground">Punkte</div>
          </div>
          <div className="p-1.5 bg-muted/30 rounded text-center">
            <div className={`text-xs font-bold ${lyapunovEstimate > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {lyapunovEstimate > 0 ? 'Chaos' : 'Stabil'}
            </div>
            <div className="text-[8px] text-muted-foreground">Dynamik</div>
          </div>
        </div>

        {/* Formeln */}
        <div className="p-2 bg-muted/20 rounded text-[9px] font-mono space-y-0.5 text-muted-foreground">
          <div>Phasenraum: ℝ³ = (H, N, G)</div>
          <div>Lyapunov: λ = lim(t→∞) (1/t) · ln|δ(t)/δ(0)|</div>
          <div>λ {'>'} 0 → Chaos • λ {'<'} 0 → Attraktor</div>
        </div>
      </CardContent>
    </Card>
  );
}
