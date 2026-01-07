import { useState, createContext, useContext, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowDownUp, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// ==================== CONTEXT FOR CALCULATION DIRECTION ====================

interface MirrorContextType {
  isReversed: boolean;
  direction: 'forward' | 'backward';
}

const MirrorContext = createContext<MirrorContextType>({ isReversed: false, direction: 'forward' });

export const useMirrorMode = () => useContext(MirrorContext);

// ==================== PROPS ====================

interface MirrorModeProps {
  children: ReactNode;
  className?: string;
}

// ==================== COMPONENT ====================

export function MirrorMode({ children, className = '' }: MirrorModeProps) {
  const [isReversed, setIsReversed] = useState(false);
  
  const contextValue: MirrorContextType = {
    isReversed,
    direction: isReversed ? 'backward' : 'forward'
  };
  
  return (
    <MirrorContext.Provider value={contextValue}>
      <div className={`relative ${className}`}>
        {/* Berechnungsrichtungs-Toggle */}
        <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-crypto-purple/10 to-crypto-gold/10 border border-crypto-purple/30">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              {isReversed ? (
                <ArrowUpDown className="w-5 h-5 text-crypto-gold" />
              ) : (
                <ArrowDownUp className="w-5 h-5 text-crypto-purple" />
              )}
              <h3 className="text-sm font-semibold">
                <span className={isReversed ? 'text-crypto-gold' : 'text-crypto-purple'}>
                  Berechnungsrichtung
                </span>
              </h3>
              <Badge variant="outline" className={`text-xs ${isReversed ? 'border-crypto-gold/50 text-crypto-gold' : 'border-crypto-purple/50 text-crypto-purple'}`}>
                {isReversed ? 'RÜCKWÄRTS ⬆' : 'VORWÄRTS ⬇'}
              </Badge>
            </div>
            
            <Button
              onClick={() => setIsReversed(!isReversed)}
              variant={isReversed ? "default" : "outline"}
              className={`
                transition-all duration-300
                ${isReversed 
                  ? 'bg-crypto-gold text-black hover:bg-crypto-gold/80' 
                  : 'border-crypto-purple/50 hover:bg-crypto-purple/20'
                }
              `}
            >
              {isReversed ? (
                <>
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  Rückwärts (t ← T)
                </>
              ) : (
                <>
                  <ArrowDownUp className="w-4 h-4 mr-2" />
                  Vorwärts (t → T)
                </>
              )}
            </Button>
          </div>
          
          {isReversed && (
            <div className="mt-2 p-2 rounded bg-crypto-gold/10 border border-crypto-gold/20">
              <p className="text-xs text-crypto-gold flex items-center gap-2">
                <Sparkles className="w-3 h-3" />
                <span>
                  <strong>Zeitumkehr aktiv:</strong> Alle DGLs werden von Endzustand → Anfangszustand berechnet
                </span>
              </p>
            </div>
          )}
        </div>
        
        {/* Inhalt */}
        {children}
        
        {/* Status-Indikator */}
        {isReversed && (
          <div className="fixed bottom-4 right-4 p-2 rounded-full bg-crypto-gold/90 backdrop-blur-sm shadow-lg z-50">
            <div className="flex items-center gap-2 px-2">
              <ArrowUpDown className="w-4 h-4 text-black" />
              <span className="text-xs text-black font-semibold uppercase tracking-wider">
                Rückwärts
              </span>
            </div>
          </div>
        )}
      </div>
    </MirrorContext.Provider>
  );
}
