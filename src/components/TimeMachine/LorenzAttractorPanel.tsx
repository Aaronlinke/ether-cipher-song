import { useState, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Infinity, Play, Pause, RotateCcw, GitCompare } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// LORENZ ATTRAKTOR - Klassisches Chaos-System
// Vergleich mit SRIL H-N-G Trajektorie
// ═══════════════════════════════════════════════════════════════════════════

interface LorenzParams {
  sigma: number;
  rho: number;
  beta: number;
}

interface Point3D {
  x: number; y: number; z: number;
}

const DEFAULT_LORENZ: LorenzParams = { sigma: 10, rho: 28, beta: 8 / 3 };

// SRIL Parameter (aus OmniGenesisEngine)
const SRIL = { alpha: 0.245, beta: 0.152, gamma: 0.985, delta: 0.112, eta: 0.088 };
const SRIL_INIT = { H: -4.256, N: 5.824, G: 1.952 };

function lorenzStep(p: Point3D, params: LorenzParams, dt = 0.005): Point3D {
  const dx = params.sigma * (p.y - p.x);
  const dy = p.x * (params.rho - p.z) - p.y;
  const dz = p.x * p.y - params.beta * p.z;
  return { x: p.x + dx * dt, y: p.y + dy * dt, z: p.z + dz * dt };
}

function srilStep(p: { H: number; N: number; G: number }) {
  const H1 = p.H + SRIL.alpha * p.N - SRIL.beta * p.G;
  const N1 = SRIL.gamma * p.N + SRIL.delta * Math.abs(p.H);
  const G1 = p.G + SRIL.eta * (H1 + N1);
  return { H: H1, N: N1, G: G1 };
}

function precomputeLorenz(params: LorenzParams, steps: number): Point3D[] {
  const pts: Point3D[] = [{ x: 1, y: 1, z: 1 }];
  for (let i = 1; i < steps; i++) {
    pts.push(lorenzStep(pts[i - 1], params));
  }
  return pts;
}

function precomputeSRIL(steps: number, scale: number): Point3D[] {
  const pts: Point3D[] = [];
  let s = { ...SRIL_INIT };
  for (let i = 0; i < steps; i++) {
    pts.push({ x: s.H / scale, y: s.N / scale, z: s.G / scale });
    s = srilStep(s);
  }
  return pts;
}

// ── 3D Scene ──────────────────────────────────────────────────────────────
function AnimatedDot({ trajectory, color }: { trajectory: THREE.Vector3[]; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const idxRef = useRef(0);
  useFrame(() => {
    if (ref.current && trajectory.length > 0) {
      idxRef.current = (idxRef.current + 0.6) % trajectory.length;
      ref.current.position.copy(trajectory[Math.floor(idxRef.current)]);
    }
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.18, 10, 10]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} />
    </mesh>
  );
}

function Axes() {
  return (
    <>
      <Line points={[[-22, 0, 0], [22, 0, 0]]} color="#ef4444" lineWidth={1} opacity={0.3} transparent />
      <Line points={[[0, -22, 0], [0, 22, 0]]} color="#22c55e" lineWidth={1} opacity={0.3} transparent />
      <Line points={[[0, 0, 0], [0, 0, 55]]} color="#3b82f6" lineWidth={1} opacity={0.3} transparent />
      <Text position={[23, 0, 0]} fontSize={1.5} color="#ef4444">X</Text>
      <Text position={[0, 23, 0]} fontSize={1.5} color="#22c55e">Y</Text>
      <Text position={[0, 0, 56]} fontSize={1.5} color="#3b82f6">Z</Text>
    </>
  );
}

function Scene({
  lorenzPts, srilPts, showSRIL
}: {
  lorenzPts: THREE.Vector3[];
  srilPts: THREE.Vector3[];
  showSRIL: boolean;
}) {
  // Farbverlauf Lorenz: blau→lila
  const lorenzSegments = useMemo(() => {
    const segs: { points: THREE.Vector3[]; color: string }[] = [];
    const sz = Math.max(1, Math.floor(lorenzPts.length / 10));
    for (let i = 0; i < lorenzPts.length - 1; i += sz) {
      const slice = lorenzPts.slice(i, Math.min(i + sz + 1, lorenzPts.length));
      if (slice.length < 2) continue;
      const r = i / lorenzPts.length;
      segs.push({ points: slice, color: `rgb(${Math.round(80 + r * 90)},${Math.round(r * 60)},${Math.round(220 - r * 60)})` });
    }
    return segs;
  }, [lorenzPts]);

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[40, 40, 40]} intensity={1.2} />
      <pointLight position={[-30, -20, 20]} intensity={0.5} color="#a855f7" />

      <Axes />

      {/* Lorenz-Attraktor */}
      {lorenzSegments.map((s, i) => (
        <Line key={i} points={s.points} color={s.color} lineWidth={1.5} opacity={0.85} transparent />
      ))}
      {lorenzPts.length > 1 && <AnimatedDot trajectory={lorenzPts} color="#3b82f6" />}

      {/* SRIL-Overlay */}
      {showSRIL && srilPts.length > 1 && (
        <>
          <Line points={srilPts} color="#f59e0b" lineWidth={2} opacity={0.7} transparent dashed dashScale={5} dashSize={0.8} gapSize={0.4} />
          <AnimatedDot trajectory={srilPts} color="#f59e0b" />
        </>
      )}

      <OrbitControls enablePan enableZoom minDistance={15} maxDistance={200} autoRotate autoRotateSpeed={0.4} />
    </>
  );
}

// ── Hauptkomponente ────────────────────────────────────────────────────────
export function LorenzAttractorPanel() {
  const [params, setParams] = useState<LorenzParams>(DEFAULT_LORENZ);
  const [steps, setSteps] = useState(4000);
  const [showSRIL, setShowSRIL] = useState(false);
  const [running, setRunning] = useState(true);

  const lorenzRaw = useMemo(() => precomputeLorenz(params, steps), [params, steps]);
  const srilRaw = useMemo(() => precomputeSRIL(steps, 8), [steps]);

  const lorenzPts = useMemo(() =>
    lorenzRaw.map(p => new THREE.Vector3(p.x, p.y, p.z)),
    [lorenzRaw]
  );
  const srilPts = useMemo(() =>
    srilRaw.map(p => new THREE.Vector3(p.x, p.y, p.z)),
    [srilRaw]
  );

  const last = lorenzRaw[lorenzRaw.length - 1] ?? { x: 0, y: 0, z: 0 };

  // Lyapunov-Schätzung (vereinfacht)
  const lyapunov = useMemo(() => {
    if (lorenzRaw.length < 20) return 0;
    const d0 = Math.sqrt(
      (lorenzRaw[10].x - lorenzRaw[0].x) ** 2 +
      (lorenzRaw[10].y - lorenzRaw[0].y) ** 2 +
      (lorenzRaw[10].z - lorenzRaw[0].z) ** 2
    );
    const d1 = Math.sqrt(
      (lorenzRaw[lorenzRaw.length - 1].x - lorenzRaw[lorenzRaw.length - 11].x) ** 2 +
      (lorenzRaw[lorenzRaw.length - 1].y - lorenzRaw[lorenzRaw.length - 11].y) ** 2 +
      (lorenzRaw[lorenzRaw.length - 1].z - lorenzRaw[lorenzRaw.length - 11].z) ** 2
    );
    return Math.log(d1 / (d0 + 1e-12)) / 10;
  }, [lorenzRaw]);

  const reset = () => setParams(DEFAULT_LORENZ);

  return (
    <Card className="border-crypto-purple/30 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-blue-400">
              <Infinity className="w-5 h-5" />
              Lorenz-Attraktor 3D
            </CardTitle>
            <CardDescription className="font-mono text-xs mt-1">
              σ={params.sigma} ρ={params.rho} β={params.beta.toFixed(2)} • {steps} Punkte
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="font-mono text-xs text-red-400 border-red-400/30">
              λ ≈ {lyapunov.toFixed(3)}
            </Badge>
            <Badge variant="outline" className="font-mono text-xs text-orange-400">
              CHAOS
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* 3D Canvas */}
        <div className="w-full h-72 rounded-lg overflow-hidden border border-border/30 bg-black/40 relative">
          <Canvas
            camera={{ position: [40, 30, 50], fov: 55 }}
            style={{ background: 'transparent' }}
          >
            <Scene lorenzPts={lorenzPts} srilPts={srilPts} showSRIL={showSRIL} />
          </Canvas>

          {/* Legende */}
          <div className="absolute bottom-2 left-2 flex gap-3 text-[9px] bg-background/70 backdrop-blur-sm rounded px-2 py-1">
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-blue-500 inline-block" />
              Lorenz (σ,ρ,β)
            </span>
            {showSRIL && (
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-amber-500 inline-block" />
                SRIL (H,N,G)
              </span>
            )}
          </div>
          <div className="absolute top-2 right-2 text-[9px] bg-background/70 backdrop-blur-sm rounded px-2 py-1 font-mono text-muted-foreground">
            ({last.x.toFixed(1)}, {last.y.toFixed(1)}, {last.z.toFixed(1)})
          </div>
        </div>

        {/* SRIL-Overlay Toggle */}
        <div className="flex items-center justify-between p-2 bg-muted/20 rounded border border-border/20">
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-medium">SRIL-Overlay (H,N,G)</span>
          </div>
          <Switch checked={showSRIL} onCheckedChange={setShowSRIL} />
        </div>

        {/* Parameter-Kontrollen */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-[10px]">σ (Sigma): {params.sigma.toFixed(1)}</Label>
            <Slider
              value={[params.sigma]}
              onValueChange={([v]) => setParams(p => ({ ...p, sigma: v }))}
              min={1} max={20} step={0.5}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-[10px]">ρ (Rho): {params.rho.toFixed(1)}</Label>
            <Slider
              value={[params.rho]}
              onValueChange={([v]) => setParams(p => ({ ...p, rho: v }))}
              min={10} max={50} step={0.5}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-[10px]">β (Beta): {params.beta.toFixed(2)}</Label>
            <Slider
              value={[params.beta]}
              onValueChange={([v]) => setParams(p => ({ ...p, beta: v }))}
              min={0.5} max={5} step={0.1}
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label className="text-[10px]">Trajektorienlänge: {steps}</Label>
          <Slider
            value={[steps]}
            onValueChange={([v]) => setSteps(v)}
            min={500} max={10000} step={500}
            className="mt-1"
          />
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={reset} className="text-xs">
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset (σ=10, ρ=28, β=8/3)
          </Button>
        </div>

        {/* Metriken */}
        <div className="grid grid-cols-4 gap-1.5">
          <div className="p-1.5 bg-muted/30 rounded text-center">
            <div className="text-xs font-bold text-red-400">{last.x.toFixed(1)}</div>
            <div className="text-[8px] text-muted-foreground">X</div>
          </div>
          <div className="p-1.5 bg-muted/30 rounded text-center">
            <div className="text-xs font-bold text-green-400">{last.y.toFixed(1)}</div>
            <div className="text-[8px] text-muted-foreground">Y</div>
          </div>
          <div className="p-1.5 bg-muted/30 rounded text-center">
            <div className="text-xs font-bold text-blue-400">{last.z.toFixed(1)}</div>
            <div className="text-[8px] text-muted-foreground">Z</div>
          </div>
          <div className="p-1.5 bg-muted/30 rounded text-center">
            <div className="text-xs font-bold text-red-400">λ {'>'} 0</div>
            <div className="text-[8px] text-muted-foreground">Chaos</div>
          </div>
        </div>

        {/* Formel */}
        <div className="p-2 bg-muted/20 rounded text-[9px] font-mono space-y-0.5 text-muted-foreground">
          <div>ẋ = σ(y−x) | ẏ = x(ρ−z)−y | ż = xy−βz</div>
          <div>σ={params.sigma}, ρ={params.rho}, β={params.beta.toFixed(4)}</div>
          <div>Klassischer Chaos-Attraktor • Sensitivität gegenüber Anfangsbedingungen</div>
        </div>
      </CardContent>
    </Card>
  );
}
