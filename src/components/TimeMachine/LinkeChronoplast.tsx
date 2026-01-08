import { useState, useRef, useEffect } from 'react';
import { Crosshair, Target, Compass, Zap, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface Vector {
  N: number; // Navigation (Intention) - Richtung
  G: number; // Geometrie (Widerstand) - Feldradius
  H: number; // Enthalpie (Chaos) - Ablenkwinkel
}

interface IntersectionPoint {
  x: number;
  y: number;
  time: number;
  stability: number;
}

export function LinkeChronoplast() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [vectors, setVectors] = useState<Vector>({ N: 45, G: 150, H: 30 });
  const [origin, setOrigin] = useState({ x: 100, y: 300 });
  const [intersection, setIntersection] = useState<IntersectionPoint | null>(null);
  const [animating, setAnimating] = useState(false);
  const animationRef = useRef<number>(0);

  // Berechne Schnittpunkt (wo Strahl N den Kreis G unter Winkel H trifft)
  const calculateIntersection = (): IntersectionPoint | null => {
    const { N, G, H } = vectors;
    
    // Konvertiere Winkel zu Radiant
    const nRad = (N * Math.PI) / 180;
    const hRad = (H * Math.PI) / 180;
    
    // Effektiver Winkel nach Ablenkung
    const effectiveAngle = nRad + hRad;
    
    // Kreismittelpunkt (Center des Widerstandsfeldes)
    const centerX = origin.x + 200;
    const centerY = origin.y;
    
    // Strahl-Richtung
    const dx = Math.cos(effectiveAngle);
    const dy = -Math.sin(effectiveAngle);
    
    // Strahl-Ursprung
    const ox = origin.x;
    const oy = origin.y;
    
    // Löse quadratische Gleichung für Schnittpunkt
    const a = dx * dx + dy * dy;
    const b = 2 * (dx * (ox - centerX) + dy * (oy - centerY));
    const c = (ox - centerX) ** 2 + (oy - centerY) ** 2 - G ** 2;
    
    const discriminant = b * b - 4 * a * c;
    
    if (discriminant < 0) return null;
    
    const t = (-b + Math.sqrt(discriminant)) / (2 * a);
    if (t < 0) return null;
    
    const x = ox + t * dx;
    const y = oy + t * dy;
    
    // Zeit = Distanz / "Lichtgeschwindigkeit" (normiert)
    const distance = Math.sqrt((x - ox) ** 2 + (y - oy) ** 2);
    const time = distance / 100; // Normierte Zeit
    
    // Stabilität basierend auf Winkelabweichung
    const stability = Math.cos(hRad) * 100;
    
    return { x, y, time, stability };
  };

  // Zeichne Visualisierung
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);
    
    // Grid
    ctx.strokeStyle = 'rgba(147, 51, 234, 0.1)';
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
    
    const { N, G, H } = vectors;
    const centerX = origin.x + 200;
    const centerY = origin.y;
    
    // Zeichne Widerstandsfeld (Kreis G)
    ctx.beginPath();
    ctx.arc(centerX, centerY, G, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 165, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 165, 0, 0.05)';
    ctx.fill();
    
    // Label für G
    ctx.fillStyle = '#ffa500';
    ctx.font = '12px monospace';
    ctx.fillText(`G = ${G}px (Widerstandsfeld)`, centerX - 60, centerY - G - 10);
    
    // Zeichne Ursprung
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#9333ea';
    ctx.fill();
    
    // Zeichne Navigationsstrahl (N)
    const nRad = (N * Math.PI) / 180;
    const hRad = (H * Math.PI) / 180;
    const rayLength = 500;
    
    // Original Intention (ohne Ablenkung)
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(
      origin.x + rayLength * Math.cos(nRad),
      origin.y - rayLength * Math.sin(nRad)
    );
    ctx.strokeStyle = 'rgba(147, 51, 234, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Effektiver Strahl (mit Ablenkung H)
    const effectiveAngle = nRad + hRad;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(
      origin.x + rayLength * Math.cos(effectiveAngle),
      origin.y - rayLength * Math.sin(effectiveAngle)
    );
    ctx.strokeStyle = '#9333ea';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Labels
    ctx.fillStyle = '#9333ea';
    ctx.fillText(`N = ${N}° (Intention)`, origin.x + 20, origin.y - 20);
    ctx.fillStyle = '#22c55e';
    ctx.fillText(`H = ${H}° (Chaos)`, origin.x + 20, origin.y + 30);
    
    // Zeichne Schnittpunkt
    if (intersection) {
      // Verbindungslinie zum Schnittpunkt
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(intersection.x, intersection.y);
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Schnittpunkt
      ctx.beginPath();
      ctx.arc(intersection.x, intersection.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#22c55e';
      ctx.fill();
      
      // Pulsierender Effekt
      ctx.beginPath();
      ctx.arc(intersection.x, intersection.y, 20 + Math.sin(Date.now() / 200) * 5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Info
      ctx.fillStyle = '#22c55e';
      ctx.font = '14px monospace';
      ctx.fillText(`EREIGNIS`, intersection.x + 20, intersection.y - 25);
      ctx.font = '11px monospace';
      ctx.fillText(`t = ${intersection.time.toFixed(3)} Einheiten`, intersection.x + 20, intersection.y - 10);
      ctx.fillText(`Stabilität: ${intersection.stability.toFixed(1)}%`, intersection.x + 20, intersection.y + 5);
    }
    
    // Legende
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.fillText('LINKE-CHRONOPLAST: Zeit-Geometrie-Konstruktion', 10, 20);
    ctx.fillStyle = '#888';
    ctx.fillText('N = Navigation (Intention) | G = Geometrie (Feld) | H = Enthalpie (Chaos)', 10, 35);
  };

  // Animationsloop
  const animate = () => {
    const newIntersection = calculateIntersection();
    setIntersection(newIntersection);
    draw();
    
    if (animating) {
      animationRef.current = requestAnimationFrame(animate);
    }
  };

  useEffect(() => {
    const newIntersection = calculateIntersection();
    setIntersection(newIntersection);
    draw();
  }, [vectors, origin]);

  useEffect(() => {
    if (animating) {
      animationRef.current = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animationRef.current);
  }, [animating]);

  return (
    <Card className="border-crypto-purple/30 bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-crypto-purple">
          <Crosshair className="w-5 h-5" />
          Linke-Chronoplast
        </CardTitle>
        <CardDescription>
          Zeit-Geometrie-Konstruktion: Ereignisse triangulieren durch Vektorschnitt
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Canvas */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={600}
            height={400}
            className="w-full rounded-lg border border-crypto-purple/20 bg-black"
          />
          <Button
            size="sm"
            variant="secondary"
            className="absolute top-2 right-2"
            onClick={() => setAnimating(!animating)}
          >
            <Play className="w-4 h-4 mr-1" />
            {animating ? 'Stop' : 'Animieren'}
          </Button>
        </div>

        {/* Parameter */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-purple-500" />
              N (Navigation): {vectors.N}°
            </Label>
            <Slider
              value={[vectors.N]}
              onValueChange={([v]) => setVectors(prev => ({ ...prev, N: v }))}
              min={0}
              max={90}
            />
            <p className="text-xs text-muted-foreground">Richtung der Intention</p>
          </div>
          
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Target className="w-4 h-4 text-orange-500" />
              G (Geometrie): {vectors.G}px
            </Label>
            <Slider
              value={[vectors.G]}
              onValueChange={([v]) => setVectors(prev => ({ ...prev, G: v }))}
              min={50}
              max={200}
            />
            <p className="text-xs text-muted-foreground">Radius des Widerstandsfeldes</p>
          </div>
          
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-green-500" />
              H (Enthalpie): {vectors.H}°
            </Label>
            <Slider
              value={[vectors.H]}
              onValueChange={([v]) => setVectors(prev => ({ ...prev, H: v }))}
              min={-45}
              max={45}
            />
            <p className="text-xs text-muted-foreground">Ablenkungswinkel (Chaos)</p>
          </div>
        </div>

        {/* Ergebnis */}
        {intersection && (
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
            <h4 className="font-semibold text-green-500 mb-2">📍 Ereignis-Triangulation</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Position X:</span>
                <p className="font-mono">{intersection.x.toFixed(1)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Position Y:</span>
                <p className="font-mono">{intersection.y.toFixed(1)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Zeit t:</span>
                <p className="font-mono">{intersection.time.toFixed(4)} Einheiten</p>
              </div>
              <div>
                <span className="text-muted-foreground">Stabilität:</span>
                <p className="font-mono">{intersection.stability.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        )}

        {/* Formel */}
        <div className="text-xs text-muted-foreground p-3 bg-muted/20 rounded">
          <strong>Prinzip:</strong> Ein Ereignis ist der <em>einzige</em> geometrisch mögliche Schnittpunkt 
          zwischen dem Intentionsstrahl (N) und dem Widerstandsfeld (G), modifiziert durch Chaos (H).
          <br />
          <code className="text-crypto-purple">Ereignis = N ∩ G | Ablenkung(H)</code>
        </div>
      </CardContent>
    </Card>
  );
}
