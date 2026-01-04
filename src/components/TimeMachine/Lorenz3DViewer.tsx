import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Text } from '@react-three/drei';
import * as THREE from 'three';

interface Lorenz3DViewerProps {
  forwardTrajectory: { y: number[] }[];
  backwardTrajectory: { y: number[] }[];
}

function LorenzTrajectory({ 
  points, 
  color, 
  opacity = 1,
  dashed = false 
}: { 
  points: THREE.Vector3[]; 
  color: string;
  opacity?: number;
  dashed?: boolean;
}) {
  return (
    <Line
      points={points}
      color={color}
      lineWidth={2}
      opacity={opacity}
      transparent
      dashed={dashed}
      dashScale={dashed ? 10 : 1}
      dashSize={dashed ? 0.5 : 1}
      gapSize={dashed ? 0.3 : 0}
    />
  );
}

function StartEndMarkers({ 
  start, 
  end 
}: { 
  start: THREE.Vector3; 
  end: THREE.Vector3;
}) {
  return (
    <>
      {/* Startpunkt */}
      <mesh position={start}>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} />
      </mesh>
      
      {/* Endpunkt */}
      <mesh position={end}>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
      </mesh>
    </>
  );
}

function AxisLabels() {
  return (
    <>
      <Text position={[25, 0, 0]} fontSize={2} color="hsl(271, 91%, 65%)">X</Text>
      <Text position={[0, 25, 0]} fontSize={2} color="hsl(217, 91%, 60%)">Y</Text>
      <Text position={[0, 0, 55]} fontSize={2} color="hsl(45, 93%, 47%)">Z</Text>
    </>
  );
}

function AnimatedParticle({ trajectory, color }: { trajectory: THREE.Vector3[]; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const indexRef = useRef(0);
  
  useFrame(() => {
    if (ref.current && trajectory.length > 0) {
      indexRef.current = (indexRef.current + 0.5) % trajectory.length;
      const pos = trajectory[Math.floor(indexRef.current)];
      ref.current.position.copy(pos);
    }
  });
  
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.5, 8, 8]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
    </mesh>
  );
}

function Scene({ forwardTrajectory, backwardTrajectory }: Lorenz3DViewerProps) {
  const forwardPoints = useMemo(() => {
    return forwardTrajectory.map(p => new THREE.Vector3(p.y[0], p.y[1], p.y[2]));
  }, [forwardTrajectory]);
  
  const backwardPoints = useMemo(() => {
    return backwardTrajectory.map(p => new THREE.Vector3(p.y[0], p.y[1], p.y[2]));
  }, [backwardTrajectory]);
  
  const start = forwardPoints[0] || new THREE.Vector3(0, 0, 0);
  const end = forwardPoints[forwardPoints.length - 1] || new THREE.Vector3(0, 0, 0);
  
  return (
    <>
      {/* Beleuchtung */}
      <ambientLight intensity={0.4} />
      <pointLight position={[50, 50, 50]} intensity={1} />
      <pointLight position={[-50, -50, -50]} intensity={0.5} />
      
      {/* Achsen */}
      <Line
        points={[[-20, 0, 0], [20, 0, 0]]}
        color="hsl(271, 91%, 65%)"
        lineWidth={1}
        opacity={0.4}
        transparent
      />
      <Line
        points={[[0, -20, 0], [0, 20, 0]]}
        color="hsl(217, 91%, 60%)"
        lineWidth={1}
        opacity={0.4}
        transparent
      />
      <Line
        points={[[0, 0, 0], [0, 0, 50]]}
        color="hsl(45, 93%, 47%)"
        lineWidth={1}
        opacity={0.4}
        transparent
      />
      
      <AxisLabels />
      
      {/* Trajektorien */}
      {forwardPoints.length > 1 && (
        <>
          <LorenzTrajectory points={forwardPoints} color="#a855f7" />
          <AnimatedParticle trajectory={forwardPoints} color="#a855f7" />
        </>
      )}
      
      {backwardPoints.length > 1 && (
        <LorenzTrajectory points={backwardPoints} color="#f59e0b" opacity={0.7} dashed />
      )}
      
      {/* Start/Ende Marker */}
      {forwardPoints.length > 0 && (
        <StartEndMarkers start={start} end={end} />
      )}
      
      {/* Kamera-Kontrollen */}
      <OrbitControls 
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={20}
        maxDistance={150}
      />
    </>
  );
}

export function Lorenz3DViewer({ forwardTrajectory, backwardTrajectory }: Lorenz3DViewerProps) {
  return (
    <div className="w-full h-80 rounded-lg overflow-hidden border border-border/30 bg-background/50">
      <Canvas
        camera={{ position: [40, 40, 60], fov: 60 }}
        style={{ background: 'transparent' }}
      >
        <Scene forwardTrajectory={forwardTrajectory} backwardTrajectory={backwardTrajectory} />
      </Canvas>
      
      {/* Legende */}
      <div className="absolute bottom-2 left-2 flex gap-3 text-xs bg-background/80 backdrop-blur-sm rounded px-2 py-1">
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-crypto-purple"></span>
          Vorwärts
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-crypto-gold" style={{ borderBottom: '2px dashed' }}></span>
          Rückwärts
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          Start
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500"></span>
          Ende
        </span>
      </div>
    </div>
  );
}
