import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Line, Text, Html } from '@react-three/drei';
import * as THREE from 'three';

interface BlochSphereProps {
  // Bloch-Vektor Koordinaten
  x: number;
  y: number;
  z: number;
  // Optional: Trajektorie
  trajectory?: { x: number; y: number; z: number }[];
  // Labels anzeigen
  showLabels?: boolean;
}

function BlochVector({ x, y, z }: { x: number; y: number; z: number }) {
  const ref = useRef<THREE.Mesh>(null);
  
  // Normalisieren falls nötig
  const length = Math.sqrt(x*x + y*y + z*z);
  const nx = length > 0 ? x / length : 0;
  const ny = length > 0 ? y / length : 0;
  const nz = length > 0 ? z / length : 0;
  
  useFrame((state) => {
    if (ref.current) {
      // Leichtes Pulsieren
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      ref.current.scale.setScalar(scale);
    }
  });
  
  return (
    <group>
      {/* Vektor-Linie */}
      <Line
        points={[[0, 0, 0], [nx, ny, nz]]}
        color="#a855f7"
        lineWidth={3}
      />
      
      {/* Pfeilspitze */}
      <mesh ref={ref} position={[nx, ny, nz]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={0.5} />
      </mesh>
      
      {/* Projektion auf xy-Ebene */}
      <Line
        points={[[0, 0, 0], [nx, ny, 0]]}
        color="#f59e0b"
        lineWidth={1}
        opacity={0.5}
        transparent
      />
      <Line
        points={[[nx, ny, 0], [nx, ny, nz]]}
        color="#f59e0b"
        lineWidth={1}
        opacity={0.5}
        transparent
        dashed
        dashScale={10}
      />
    </group>
  );
}

function TrajectoryLine({ points }: { points: { x: number; y: number; z: number }[] }) {
  const linePoints = useMemo(() => {
    return points.map(p => new THREE.Vector3(p.x, p.y, p.z));
  }, [points]);
  
  if (points.length < 2) return null;
  
  return (
    <Line
      points={linePoints}
      color="#22c55e"
      lineWidth={2}
      opacity={0.7}
      transparent
    />
  );
}

function BlochSphereScene({ x, y, z, trajectory, showLabels = true }: BlochSphereProps) {
  return (
    <>
      {/* Beleuchtung */}
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />
      <pointLight position={[-10, -10, -10]} intensity={0.4} />
      
      {/* Bloch-Kugel (transparent) */}
      <Sphere args={[1, 32, 32]}>
        <meshStandardMaterial 
          color="#3b82f6" 
          transparent 
          opacity={0.15} 
          wireframe={false}
          side={THREE.DoubleSide}
        />
      </Sphere>
      
      {/* Wireframe */}
      <Sphere args={[1, 16, 16]}>
        <meshBasicMaterial 
          color="#3b82f6" 
          transparent 
          opacity={0.3} 
          wireframe
        />
      </Sphere>
      
      {/* Koordinatenachsen */}
      {/* X-Achse (rot) */}
      <Line points={[[-1.3, 0, 0], [1.3, 0, 0]]} color="#ef4444" lineWidth={2} />
      {/* Y-Achse (grün) */}
      <Line points={[[0, -1.3, 0], [0, 1.3, 0]]} color="#22c55e" lineWidth={2} />
      {/* Z-Achse (blau) */}
      <Line points={[[0, 0, -1.3], [0, 0, 1.3]]} color="#3b82f6" lineWidth={2} />
      
      {/* Äquator-Kreis */}
      {(() => {
        const points: THREE.Vector3[] = [];
        for (let i = 0; i <= 64; i++) {
          const angle = (i / 64) * Math.PI * 2;
          points.push(new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0));
        }
        return <Line points={points} color="#6b7280" lineWidth={1} opacity={0.5} transparent />;
      })()}
      
      {/* Meridian-Kreise */}
      {[0, Math.PI/2].map((phi, idx) => {
        const points: THREE.Vector3[] = [];
        for (let i = 0; i <= 64; i++) {
          const theta = (i / 64) * Math.PI * 2;
          points.push(new THREE.Vector3(
            Math.cos(phi) * Math.sin(theta),
            Math.sin(phi) * Math.sin(theta),
            Math.cos(theta)
          ));
        }
        return <Line key={idx} points={points} color="#6b7280" lineWidth={1} opacity={0.3} transparent />;
      })}
      
      {/* Basis-Zustände Labels */}
      {showLabels && (
        <>
          <Html position={[0, 0, 1.4]} center>
            <div className="text-blue-400 font-mono text-sm font-bold bg-background/80 px-1 rounded">|0⟩</div>
          </Html>
          <Html position={[0, 0, -1.4]} center>
            <div className="text-blue-400 font-mono text-sm font-bold bg-background/80 px-1 rounded">|1⟩</div>
          </Html>
          <Html position={[1.4, 0, 0]} center>
            <div className="text-red-400 font-mono text-xs bg-background/80 px-1 rounded">|+⟩</div>
          </Html>
          <Html position={[-1.4, 0, 0]} center>
            <div className="text-red-400 font-mono text-xs bg-background/80 px-1 rounded">|-⟩</div>
          </Html>
          <Html position={[0, 1.4, 0]} center>
            <div className="text-green-400 font-mono text-xs bg-background/80 px-1 rounded">|+i⟩</div>
          </Html>
          <Html position={[0, -1.4, 0]} center>
            <div className="text-green-400 font-mono text-xs bg-background/80 px-1 rounded">|-i⟩</div>
          </Html>
        </>
      )}
      
      {/* Trajektorie */}
      {trajectory && trajectory.length > 1 && (
        <TrajectoryLine points={trajectory} />
      )}
      
      {/* Bloch-Vektor */}
      <BlochVector x={x} y={y} z={z} />
      
      {/* Kamera-Kontrollen */}
      <OrbitControls 
        enablePan={false}
        enableZoom={true}
        minDistance={2}
        maxDistance={6}
        autoRotate
        autoRotateSpeed={0.5}
      />
    </>
  );
}

export function BlochSphere3D({ x, y, z, trajectory, showLabels = true }: BlochSphereProps) {
  return (
    <div className="w-full h-72 rounded-lg overflow-hidden border border-border/30 bg-background/50 relative">
      <Canvas
        camera={{ position: [2, 2, 2], fov: 50 }}
        style={{ background: 'transparent' }}
      >
        <BlochSphereScene x={x} y={y} z={z} trajectory={trajectory} showLabels={showLabels} />
      </Canvas>
      
      {/* Info Overlay */}
      <div className="absolute bottom-2 left-2 p-2 rounded bg-background/80 backdrop-blur-sm text-xs">
        <div className="flex items-center gap-3">
          <span className="text-crypto-purple font-mono">
            ⟨σ⟩ = ({x.toFixed(2)}, {y.toFixed(2)}, {z.toFixed(2)})
          </span>
        </div>
      </div>
      
      {/* Legende */}
      <div className="absolute top-2 right-2 p-2 rounded bg-background/80 backdrop-blur-sm text-xs space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-3 h-0.5 bg-crypto-purple"></span>
          <span className="text-muted-foreground">Bloch-Vektor</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-0.5 bg-green-500"></span>
          <span className="text-muted-foreground">Trajektorie</span>
        </div>
      </div>
    </div>
  );
}
