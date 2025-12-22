import { Binary, Cpu, Activity } from 'lucide-react';
import { useEffect, useState } from 'react';

export function Header() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-crypto-gold/20 bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Binary size={32} className="text-crypto-gold animate-pulse-glow" />
              <div className="absolute inset-0 bg-crypto-gold/20 blur-xl" />
            </div>
            <div>
              <h1 className="font-display text-xl md:text-2xl text-crypto-gold tracking-wider gold-glow">
                CRYPTO MATH
              </h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                Kryptografie • Base58 • Hashes • Algorithmen
              </p>
            </div>
          </div>

          {/* Status */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity size={14} className="text-crypto-green animate-pulse" />
              <span>SYSTEM ONLINE</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Cpu size={14} className="text-crypto-blue" />
              <span className="font-mono">
                {time.toLocaleTimeString('de-DE', { hour12: false })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
