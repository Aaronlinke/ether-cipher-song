import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CryptoPanelProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  glowColor?: 'gold' | 'green' | 'blue' | 'purple';
}

export function CryptoPanel({ title, icon, children, className, glowColor = 'gold' }: CryptoPanelProps) {
  const glowStyles = {
    gold: 'border-crypto-gold/30 hover:border-crypto-gold/50',
    green: 'border-crypto-green/30 hover:border-crypto-green/50',
    blue: 'border-crypto-blue/30 hover:border-crypto-blue/50',
    purple: 'border-crypto-purple/30 hover:border-crypto-purple/50',
  };

  const titleStyles = {
    gold: 'text-crypto-gold',
    green: 'text-crypto-green',
    blue: 'text-crypto-blue',
    purple: 'text-crypto-purple',
  };

  return (
    <div
      className={cn(
        'relative bg-card/80 backdrop-blur-sm rounded border transition-all duration-300',
        'panel-glow matrix-bg',
        glowStyles[glowColor],
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/30">
        {icon && <span className={titleStyles[glowColor]}>{icon}</span>}
        <h3 className={cn('font-display text-sm uppercase tracking-widest', titleStyles[glowColor])}>
          {title}
        </h3>
        <div className="flex-1" />
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-crypto-red/50" />
          <div className="w-2 h-2 rounded-full bg-crypto-orange/50" />
          <div className="w-2 h-2 rounded-full bg-crypto-green/50" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {children}
      </div>

      {/* Scanline overlay */}
      <div className="absolute inset-0 scanline opacity-5 pointer-events-none rounded" />
    </div>
  );
}
