import { useState, useRef, useEffect } from 'react';
import { Layers, Eye, Grid, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';

export function MoireEncryption() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [message, setMessage] = useState('HELLO');
  const [angle1, setAngle1] = useState(0);
  const [angle2, setAngle2] = useState(3);
  const [spacing1, setSpacing1] = useState(10);
  const [spacing2, setSpacing2] = useState(10);
  const [animating, setAnimating] = useState(false);
  const animationRef = useRef<number>(0);
  const [decryptedVisible, setDecryptedVisible] = useState(false);

  // Zeichne Moiré-Muster
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
    
    // Zeichne erstes Gitter (Schlüssel)
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate((angle1 * Math.PI) / 180);
    ctx.strokeStyle = 'rgba(147, 51, 234, 0.7)';
    ctx.lineWidth = 1;
    
    for (let i = -width; i < width; i += spacing1) {
      ctx.beginPath();
      ctx.moveTo(i, -height);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    ctx.restore();
    
    // Zeichne zweites Gitter (Verschlüsselte Nachricht)
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate((angle2 * Math.PI) / 180);
    ctx.strokeStyle = 'rgba(255, 165, 0, 0.7)';
    ctx.lineWidth = 1;
    
    for (let i = -width; i < width; i += spacing2) {
      ctx.beginPath();
      ctx.moveTo(i, -height);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    ctx.restore();
    
    // Versteckte Nachricht im Interferenzmuster
    if (decryptedVisible && Math.abs(angle1 - angle2) < 5 && Math.abs(spacing1 - spacing2) < 2) {
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.font = 'bold 48px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Glow Effekt
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#22c55e';
      ctx.fillText(message, 0, 0);
      
      // Umrandung
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeText(message, 0, 0);
      ctx.restore();
    }
    
    // Encode Nachricht in Gitter (vereinfacht)
    const messageHash = message.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const encodedPattern = messageHash % 360;
    
    // Info Overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 200, 70);
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.fillText(`Gitter 1: ${angle1.toFixed(1)}° @ ${spacing1}px`, 20, 30);
    ctx.fillText(`Gitter 2: ${angle2.toFixed(1)}° @ ${spacing2}px`, 20, 45);
    ctx.fillText(`Δ Winkel: ${Math.abs(angle1 - angle2).toFixed(1)}°`, 20, 60);
    ctx.fillStyle = Math.abs(angle1 - angle2) < 5 ? '#22c55e' : '#f59e0b';
    ctx.fillText(Math.abs(angle1 - angle2) < 5 ? '🔓 RESONANZ' : '🔒 VERSCHLÜSSELT', 20, 75);
  };

  // Animation
  const animate = () => {
    setAngle2(prev => (prev + 0.5) % 360);
    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    draw();
  }, [angle1, angle2, spacing1, spacing2, message, decryptedVisible]);

  useEffect(() => {
    if (animating) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(animationRef.current);
    }
    return () => cancelAnimationFrame(animationRef.current);
  }, [animating]);

  // Prüfe Entschlüsselung
  useEffect(() => {
    setDecryptedVisible(Math.abs(angle1 - angle2) < 5 && Math.abs(spacing1 - spacing2) < 2);
  }, [angle1, angle2, spacing1, spacing2]);

  return (
    <Card className="border-crypto-purple/30 bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-crypto-purple">
          <Layers className="w-5 h-5" />
          Moiré-Verschlüsselung
        </CardTitle>
        <CardDescription>
          Analoge Steganographie durch Interferenzmuster - sichtbar nur mit richtigem Schlüssel
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Canvas */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={500}
            height={300}
            className="w-full rounded-lg border border-crypto-purple/20"
          />
          <div className="absolute top-2 right-2 flex gap-2">
            <Button
              size="sm"
              variant={animating ? "destructive" : "secondary"}
              onClick={() => setAnimating(!animating)}
            >
              {animating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Nachricht */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Versteckte Nachricht
          </Label>
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value.toUpperCase())}
            maxLength={10}
            placeholder="Geheime Nachricht..."
            className="font-mono"
          />
        </div>

        {/* Parameter */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-purple-500 flex items-center gap-2">
              <Grid className="w-4 h-4" />
              Gitter 1 (Dein Schlüssel)
            </h4>
            <div className="space-y-2">
              <Label className="text-xs">Winkel: {angle1.toFixed(1)}°</Label>
              <Slider
                value={[angle1]}
                onValueChange={([v]) => setAngle1(v)}
                min={0}
                max={45}
                step={0.5}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Abstand: {spacing1}px</Label>
              <Slider
                value={[spacing1]}
                onValueChange={([v]) => setSpacing1(v)}
                min={5}
                max={20}
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-orange-500 flex items-center gap-2">
              <Grid className="w-4 h-4" />
              Gitter 2 (Verschlüsselt)
            </h4>
            <div className="space-y-2">
              <Label className="text-xs">Winkel: {angle2.toFixed(1)}°</Label>
              <Slider
                value={[angle2]}
                onValueChange={([v]) => setAngle2(v)}
                min={0}
                max={45}
                step={0.5}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Abstand: {spacing2}px</Label>
              <Slider
                value={[spacing2]}
                onValueChange={([v]) => setSpacing2(v)}
                min={5}
                max={20}
              />
            </div>
          </div>
        </div>

        {/* Status */}
        <div className={`p-4 rounded-lg border ${
          decryptedVisible 
            ? 'bg-green-500/10 border-green-500/30' 
            : 'bg-orange-500/10 border-orange-500/30'
        }`}>
          {decryptedVisible ? (
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔓</span>
              <div>
                <p className="font-semibold text-green-500">Nachricht sichtbar!</p>
                <p className="text-xs text-muted-foreground">
                  Die Gitter sind synchronisiert - Interferenzmuster enthüllt die Nachricht
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔒</span>
              <div>
                <p className="font-semibold text-orange-500">Nachricht verschlüsselt</p>
                <p className="text-xs text-muted-foreground">
                  Passe Winkel und Abstand von Gitter 1 an Gitter 2 an
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground p-3 bg-muted/20 rounded">
          <strong>Prinzip:</strong> Zwei überlagerte Gitter erzeugen ein Moiré-Muster. 
          Nur bei exakter Ausrichtung (gleicher Winkel & Abstand) wird die versteckte Information sichtbar.
          <br />
          <span className="text-crypto-purple">
            → Physische Verschlüsselung ohne Computer möglich!
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
