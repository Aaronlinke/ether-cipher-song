import { useState, useEffect, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { FlipHorizontal, FlipVertical, RotateCcw, Sparkles } from 'lucide-react';

interface MirrorModeProps {
  children: ReactNode;
  className?: string;
}

type MirrorType = 'none' | 'horizontal' | 'vertical' | 'both' | 'rotate';

export function MirrorMode({ children, className = '' }: MirrorModeProps) {
  const [mirrorType, setMirrorType] = useState<MirrorType>('none');
  const [isAnimating, setIsAnimating] = useState(false);
  
  const handleMirrorChange = (type: MirrorType) => {
    setIsAnimating(true);
    setMirrorType(type);
    setTimeout(() => setIsAnimating(false), 500);
  };
  
  const getTransformStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
    };
    
    switch (mirrorType) {
      case 'horizontal':
        return { ...base, transform: 'scaleX(-1)' };
      case 'vertical':
        return { ...base, transform: 'scaleY(-1)' };
      case 'both':
        return { ...base, transform: 'scale(-1, -1)' };
      case 'rotate':
        return { ...base, transform: 'rotate(180deg)' };
      default:
        return { ...base, transform: 'none' };
    }
  };
  
  const mirrorModes: { type: MirrorType; icon: typeof FlipHorizontal; label: string; description: string }[] = [
    { type: 'none', icon: RotateCcw, label: 'Normal', description: 'Keine Spiegelung' },
    { type: 'horizontal', icon: FlipHorizontal, label: 'H-Spiegel', description: 'Links ↔ Rechts' },
    { type: 'vertical', icon: FlipVertical, label: 'V-Spiegel', description: 'Oben ↔ Unten' },
    { type: 'both', icon: Sparkles, label: 'Voll', description: 'Vollständige Inversion' },
    { type: 'rotate', icon: RotateCcw, label: '180°', description: 'Rotation um 180°' },
  ];
  
  return (
    <div className={`relative ${className}`}>
      {/* Spiegel-Kontrollen */}
      <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-crypto-purple/10 to-crypto-gold/10 border border-crypto-purple/30">
        <div className="flex items-center gap-2 mb-3">
          <FlipHorizontal className="w-5 h-5 text-crypto-gold" />
          <h3 className="text-sm font-semibold text-crypto-gold">Spiegel-Modus</h3>
          <span className="text-xs text-muted-foreground ml-2">
            Visualisiere Rückwärtsrechnung durch räumliche Spiegelung
          </span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {mirrorModes.map(mode => (
            <Button
              key={mode.type}
              size="sm"
              variant={mirrorType === mode.type ? "default" : "outline"}
              className={`
                ${mirrorType === mode.type 
                  ? 'bg-crypto-purple text-white' 
                  : 'border-border/50 hover:border-crypto-purple/50'
                }
                transition-all duration-200
              `}
              onClick={() => handleMirrorChange(mode.type)}
            >
              <mode.icon className="w-4 h-4 mr-1" />
              {mode.label}
            </Button>
          ))}
        </div>
        
        {mirrorType !== 'none' && (
          <div className="mt-2 p-2 rounded bg-crypto-purple/10 border border-crypto-purple/20">
            <p className="text-xs text-crypto-purple flex items-center gap-2">
              <Sparkles className="w-3 h-3" />
              <span>
                <strong>{mirrorModes.find(m => m.type === mirrorType)?.description}</strong>
                {' '}— Die Zeitumkehr wird visuell dargestellt
              </span>
            </p>
          </div>
        )}
      </div>
      
      {/* Gespiegelter Inhalt */}
      <div 
        style={getTransformStyle()}
        className={`
          ${isAnimating ? 'pointer-events-none' : ''}
          origin-center
        `}
      >
        {/* Spiegel-Overlay-Effekt während Animation */}
        {isAnimating && (
          <div className="absolute inset-0 bg-gradient-to-r from-crypto-purple/20 to-crypto-gold/20 z-50 pointer-events-none animate-pulse rounded-lg" />
        )}
        
        {children}
      </div>
      
      {/* Spiegel-Indikator */}
      {mirrorType !== 'none' && (
        <div className="fixed bottom-4 right-4 p-2 rounded-full bg-crypto-purple/80 backdrop-blur-sm shadow-lg z-50">
          <div className="flex items-center gap-2 px-2">
            <FlipHorizontal className="w-4 h-4 text-white" />
            <span className="text-xs text-white font-semibold uppercase tracking-wider">
              {mirrorModes.find(m => m.type === mirrorType)?.label}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Standalone Spiegel-Button für kompakte Nutzung
export function MirrorToggle({ 
  onToggle, 
  isMirrored 
}: { 
  onToggle: () => void; 
  isMirrored: boolean;
}) {
  return (
    <Button
      onClick={onToggle}
      size="sm"
      variant={isMirrored ? "default" : "outline"}
      className={`
        ${isMirrored 
          ? 'bg-crypto-gold text-black hover:bg-crypto-gold/80' 
          : 'border-crypto-gold/30 text-crypto-gold hover:bg-crypto-gold/10'
        }
        transition-all duration-300
      `}
    >
      <FlipHorizontal className={`w-4 h-4 mr-2 transition-transform duration-300 ${isMirrored ? 'scale-x-[-1]' : ''}`} />
      {isMirrored ? 'Gespiegelt' : 'Spiegeln'}
    </Button>
  );
}
