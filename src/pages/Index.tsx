import { Header } from '@/components/Header';
import { HashVisualizer } from '@/components/HashVisualizer';
import { Base58Converter } from '@/components/Base58Converter';
import { EntropyMeter } from '@/components/EntropyMeter';
import { AlgorithmFlow } from '@/components/AlgorithmFlow';
import { MatrixRain } from '@/components/MatrixRain';
import { WifConverter } from '@/components/WifConverter';
import { BruteForceCalculator } from '@/components/BruteForceCalculator';
import { AddressGenerator } from '@/components/AddressGenerator';
import { Bip39Generator } from '@/components/Bip39Generator';

const Index = () => {
  return (
    <div className="min-h-screen relative">
      {/* Background Effect */}
      <MatrixRain />

      {/* Content */}
      <div className="relative z-10">
        <Header />

        <main className="container mx-auto px-4 py-8">
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

          {/* Algorithm Flow - Full Width */}
          <div className="mb-8">
            <AlgorithmFlow />
          </div>

          {/* Address Generator - Full Width */}
          <div className="mb-8">
            <AddressGenerator />
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <HashVisualizer />
            <Base58Converter />
            <EntropyMeter />
          </div>

          {/* Second Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <WifConverter />
            <BruteForceCalculator />
          </div>

          {/* BIP39 Generator - Full Width */}
          <div className="mb-8">
            <Bip39Generator />
          </div>

          {/* Info Section */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-crypto-gold/20 bg-card/50 backdrop-blur-sm">
              <div className="w-2 h-2 rounded-full bg-crypto-green animate-pulse" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                Alle Berechnungen laufen lokal in Ihrem Browser
              </span>
            </div>
          </div>
        </main>

        {/* Footer */}
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
