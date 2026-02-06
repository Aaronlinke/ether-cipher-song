import { useState } from 'react';
import { Clock, Atom, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { OmegaChaosDashboard } from './OmegaChaosDashboard';
import { SwarmKeyHunter } from './SwarmKeyHunter';
import { ExtendedKeyConverter } from './ExtendedKeyConverter';
import { MasterformelEngine } from './MasterformelEngine';
import { OmniGenesisEngine } from './OmniGenesisEngine';
import { SRILPipeline } from './SRILPipeline';
import { FrequencyAnalyzer } from './FrequencyAnalyzer';
import { DeltaSolver } from './DeltaSolver';
import { type PersonalSignature as SignatureType } from '@/lib/time-machine-utils';

interface TimeMachineProps {
  onBack?: () => void;
}

export function TimeMachine({ onBack }: TimeMachineProps) {
  const [signature, setSignature] = useState<SignatureType | null>(null);
  const [userName, setUserName] = useState('Aaron Linke');
  const [activeTab, setActiveTab] = useState('dashboard');

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
            Universeller Rückwärtsrechner v6.0 • OMEGA CHAOS COMMAND
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
          <Atom size={14} className="text-crypto-purple animate-pulse" />
          <span>Für {userName}</span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden sm:inline">Command Center</span>
            <span className="sm:hidden">Center</span>
          </TabsTrigger>
          <TabsTrigger value="crypto">Krypto</TabsTrigger>
          <TabsTrigger value="physics">Physik</TabsTrigger>
          <TabsTrigger value="math">Mathe & KI</TabsTrigger>
        </TabsList>

        {/* DASHBOARD TAB - Command Center */}
        <TabsContent value="dashboard" className="mt-6">
          <PersonalSignature onSignatureChange={handleSignatureChange} />
          <div className="mt-6">
            <OmniGenesisEngine />
          </div>
          <div className="mt-6">
            <OmegaChaosDashboard />
          </div>
          <div className="mt-6">
            <AIAssistant />
          </div>
        </TabsContent>

        {/* CRYPTO TAB */}
        <TabsContent value="crypto" className="mt-6 space-y-6">
          <MirrorMode>
            <SRILPipeline />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <BitcoinPuzzleSolver />
              <MasterformelEngine />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <DeltaSolver />
              <SwarmKeyHunter />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <ECDSACryptoModule />
              <ExtendedKeyConverter />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <SHA256PaperComputer />
              <MoireEncryption />
            </div>
          </MirrorMode>
        </TabsContent>

        {/* PHYSICS TAB */}
        <TabsContent value="physics" className="mt-6 space-y-6">
          <MirrorMode>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <QuantumModule />
              <QuantumVacuumSimulator />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <CosmologyCalculator personalSignature={signature || undefined} userName={userName} />
              <LinkeChronoplast />
            </div>
            <div className="mt-6">
              <BifurcationDiagram />
            </div>
          </MirrorMode>
        </TabsContent>

        {/* MATH & AI TAB */}
        <TabsContent value="math" className="mt-6 space-y-6">
          <MirrorMode>
            <FrequencyAnalyzer />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <UrZahlGenerator />
              <OmegaSwarmIntelligence />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <AlgorithmBackward />
              <InverseMath />
            </div>
            <div className="mt-6">
              <DifferentialEquationSolver />
            </div>
            <div className="mt-6">
              <SEIRSimulator />
            </div>
          </MirrorMode>
        </TabsContent>
      </Tabs>

      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-crypto-purple/20 bg-card/50 backdrop-blur-sm">
          <div className="w-2 h-2 rounded-full bg-crypto-purple animate-pulse" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            22 wissenschaftliche Module • SRIL-Pipeline integriert • Mathematisch korrekt
          </span>
        </div>
      </div>
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
export { OmegaChaosDashboard } from './OmegaChaosDashboard';
export { SwarmKeyHunter } from './SwarmKeyHunter';
export { ExtendedKeyConverter } from './ExtendedKeyConverter';
export { MasterformelEngine } from './MasterformelEngine';
export { OmniGenesisEngine } from './OmniGenesisEngine';
export { SRILPipeline } from './SRILPipeline';
export { FrequencyAnalyzer } from './FrequencyAnalyzer';
export { DeltaSolver } from './DeltaSolver';
