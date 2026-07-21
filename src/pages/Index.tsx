import { useState } from 'react';
import { Header } from '@/components/Header';
import { HashVisualizer } from '@/components/HashVisualizer';
import { Base58Converter } from '@/components/Base58Converter';
import { EntropyMeter } from '@/components/EntropyMeter';
import { AlgorithmFlow } from '@/components/AlgorithmFlow';
import { MatrixRain } from '@/components/MatrixRain';
import { WifConverter } from '@/components/WifConverter';
import { BruteForceCalculator } from '@/components/BruteForceCalculator';
import { UniversalCalculator } from '@/components/UniversalCalculator';
import { MegaSolver } from '@/components/MegaSolver';
import { ManifestationEngine } from '@/components/ManifestationEngine';
import { SVRCCrypto } from '@/components/SVRCCrypto';
import { CryptoChallenges } from '@/components/CryptoChallenges';
import { ZipRunner } from '@/components/ZipRunner';
import { SoloMiner } from '@/components/SoloMiner';
import { AddressGenerator } from '@/components/AddressGenerator';
import { Bip39Generator } from '@/components/Bip39Generator';
import { Bip39ToExtendedKey } from '@/components/Bip39ToExtendedKey';
import { WifBalanceChecker } from '@/components/WifBalanceChecker';
import { TimeMachine } from '@/components/TimeMachine';
import { LegalDisclaimer } from '@/components/LegalDisclaimer';
import { Button } from '@/components/ui/button';
import { Clock, Binary } from 'lucide-react';

const Index = () => {
  const [activeView, setActiveView] = useState<'crypto' | 'timemachine'>('crypto');

  return (
    <div className="min-h-screen relative">
      <MatrixRain />

      <div className="relative z-10">
        <Header />

        <main className="container mx-auto px-4 py-8">
          {/* Legal Disclaimer at top */}
          <LegalDisclaimer />

          {/* View Toggle */}
          <div className="flex justify-center gap-4 mb-8">
            <Button
              onClick={() => setActiveView('crypto')}
              variant={activeView === 'crypto' ? 'default' : 'outline'}
              className={activeView === 'crypto' 
                ? 'bg-crypto-gold/20 text-crypto-gold border border-crypto-gold/50' 
                : 'border-border/30 hover:bg-muted/20'}
            >
              <Binary className="w-4 h-4 mr-2" />
              Kryptografie
            </Button>
            <Button
              onClick={() => setActiveView('timemachine')}
              variant={activeView === 'timemachine' ? 'default' : 'outline'}
              className={activeView === 'timemachine' 
                ? 'bg-crypto-purple/20 text-crypto-purple border border-crypto-purple/50' 
                : 'border-border/30 hover:bg-muted/20'}
            >
              <Clock className="w-4 h-4 mr-2" />
              Zeitmaschine
            </Button>
          </div>

          {activeView === 'timemachine' ? (
            <TimeMachine />
          ) : (
            <>
              {/* Hero Section */}
              <div className="text-center mb-12">
                <h2 className="font-display text-3xl md:text-5xl text-foreground mb-4 tracking-wide">
                  Visualize <span className="text-crypto-gold gold-glow">Cryptography</span>
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Interaktive Tools zum Verstehen von kryptografischen Algorithmen, 
                  Hash-Funktionen und Kodierungssystemen.
                </p>
              </div>

              <div className="mb-8"><AlgorithmFlow /></div>
              <div className="mb-8"><UniversalCalculator /></div>
              <div className="mb-8"><MegaSolver /></div>
              <div className="mb-8"><ManifestationEngine /></div>
              <div className="mb-8"><SVRCCrypto /></div>
              <div className="mb-8"><CryptoChallenges /></div>
              <div className="mb-8"><ZipRunner /></div>
              <div className="mb-8"><SoloMiner /></div>
              <div className="mb-8"><AddressGenerator /></div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <HashVisualizer />
                <Base58Converter />
                <EntropyMeter />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <WifConverter />
                <BruteForceCalculator />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <Bip39Generator />
                <WifBalanceChecker />
              </div>
              <div className="mb-8"><Bip39ToExtendedKey /></div>

              <div className="mt-12 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-crypto-gold/20 bg-card/50 backdrop-blur-sm">
                  <div className="w-2 h-2 rounded-full bg-crypto-green animate-pulse" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">
                    Alle Berechnungen laufen lokal in Ihrem Browser
                  </span>
                </div>
              </div>
            </>
          )}
        </main>

        <footer className="border-t border-border/20 mt-16 py-6">
          <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
            <p>Mathematik • Kryptografie • Bildung</p>
            <p className="mt-1 text-crypto-gold/50">
              2^256 ≈ 1.16 × 10^77 mögliche Schlüssel
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Index;
