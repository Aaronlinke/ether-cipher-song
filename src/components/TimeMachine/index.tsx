import { useState } from 'react';
import { Clock, Atom, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PersonalSignature } from './PersonalSignature';
import { AlgorithmBackward } from './AlgorithmBackward';
import { CosmologyCalculator } from './CosmologyCalculator';
import { InverseMath } from './InverseMath';
import { DifferentialEquationSolver } from './DifferentialEquationSolver';
import { QuantumModule } from './QuantumModule';
import { SEIRSimulator } from './SEIRSimulator';
import { MirrorMode } from './MirrorMode';
import { AIAssistant } from './AIAssistant';
import { QuantumVacuumSimulator } from './QuantumVacuumSimulator';
import { ECDSACryptoModule } from './ECDSACryptoModule';
import { BifurcationDiagram } from './BifurcationDiagram';
import { UrZahlGenerator } from './UrZahlGenerator';
import { LinkeChronoplast } from './LinkeChronoplast';
import { SHA256PaperComputer } from './SHA256PaperComputer';
import { MoireEncryption } from './MoireEncryption';
import { OmegaSwarmIntelligence } from './OmegaSwarmIntelligence';
import { BitcoinPuzzleSolver } from './BitcoinPuzzleSolver';
import { type PersonalSignature as SignatureType } from '@/lib/time-machine-utils';

interface TimeMachineProps {
  onBack?: () => void;
}

export function TimeMachine({ onBack }: TimeMachineProps) {
  const [signature, setSignature] = useState<SignatureType | null>(null);
  const [userName, setUserName] = useState('Aaron Linke');

  const handleSignatureChange = (sig: SignatureType, name: string) => {
    setSignature(sig);
    setUserName(name);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        {onBack && (
          <Button onClick={onBack} variant="ghost" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück
          </Button>
        )}
        <div className="flex-1">
          <h2 className="font-display text-2xl md:text-3xl text-crypto-purple gold-glow flex items-center gap-3">
            <Clock className="w-8 h-8" />
            OMNI-GENESIS Zeitmaschine
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Universeller Rückwärtsrechner v5.0 • Ur-Zahl • Chronoplast • Moiré • Schwarm-KI
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
          <Atom size={14} className="text-crypto-purple animate-pulse" />
          <span>Für {userName}</span>
        </div>
      </div>

      <PersonalSignature onSignatureChange={handleSignatureChange} />

      <MirrorMode>
        {/* Ur-Zahl & Chronoplast */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <UrZahlGenerator />
          <LinkeChronoplast />
        </div>

        {/* SHA-256 & Moiré */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <SHA256PaperComputer />
          <MoireEncryption />
        </div>

        {/* Schwarm-Intelligenz & Bitcoin Puzzle */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <OmegaSwarmIntelligence />
          <BitcoinPuzzleSolver />
        </div>

        {/* Core Modules */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <AlgorithmBackward />
          <CosmologyCalculator personalSignature={signature || undefined} userName={userName} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <ECDSACryptoModule />
          <BifurcationDiagram />
        </div>

        <div className="mt-6"><InverseMath /></div>
        <div className="mt-6"><DifferentialEquationSolver /></div>
        <div className="mt-6"><SEIRSimulator /></div>
        <div className="mt-6"><QuantumVacuumSimulator /></div>
        <div className="mt-6"><QuantumModule /></div>
      </MirrorMode>

      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-crypto-purple/20 bg-card/50 backdrop-blur-sm">
          <div className="w-2 h-2 rounded-full bg-crypto-purple animate-pulse" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Alle Berechnungen sind mathematisch korrekt und invertierbar
          </span>
        </div>
      </div>

      <AIAssistant />
    </div>
  );
}

export { PersonalSignature } from './PersonalSignature';
export { AlgorithmBackward } from './AlgorithmBackward';
export { CosmologyCalculator } from './CosmologyCalculator';
export { InverseMath } from './InverseMath';
export { DifferentialEquationSolver } from './DifferentialEquationSolver';
export { QuantumModule } from './QuantumModule';
export { SEIRSimulator } from './SEIRSimulator';
export { MirrorMode } from './MirrorMode';
export { AIAssistant } from './AIAssistant';
export { QuantumVacuumSimulator } from './QuantumVacuumSimulator';
export { ECDSACryptoModule } from './ECDSACryptoModule';
export { BifurcationDiagram } from './BifurcationDiagram';
export { UrZahlGenerator } from './UrZahlGenerator';
export { LinkeChronoplast } from './LinkeChronoplast';
export { SHA256PaperComputer } from './SHA256PaperComputer';
export { MoireEncryption } from './MoireEncryption';
export { OmegaSwarmIntelligence } from './OmegaSwarmIntelligence';
export { BitcoinPuzzleSolver } from './BitcoinPuzzleSolver';
