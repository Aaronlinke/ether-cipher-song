import { useState } from 'react';
import { CryptoPanel } from './CryptoPanel';
import { GitBranch, ChevronRight, Lock, Key, Wallet } from 'lucide-react';

const steps = [
  {
    id: 'entropy',
    label: 'Random Entropy',
    description: '256 bits of true randomness',
    icon: <Key size={16} />,
    color: 'crypto-purple',
    example: 'e8f32e723...256 bits'
  },
  {
    id: 'privkey',
    label: 'Private Key',
    description: 'Your secret (never share!)',
    icon: <Lock size={16} />,
    color: 'crypto-red',
    example: '5HueCGU8r...'
  },
  {
    id: 'pubkey',
    label: 'Public Key (ECDSA)',
    description: 'Derived via secp256k1',
    icon: <GitBranch size={16} />,
    color: 'crypto-blue',
    example: '04d0de0a...'
  },
  {
    id: 'hash',
    label: 'Hash160',
    description: 'SHA256 → RIPEMD160',
    icon: <GitBranch size={16} />,
    color: 'crypto-green',
    example: '89abcdef...'
  },
  {
    id: 'address',
    label: 'Address',
    description: 'Base58Check encoded',
    icon: <Wallet size={16} />,
    color: 'crypto-gold',
    example: '1BvBMSE...'
  }
];

export function AlgorithmFlow() {
  const [activeStep, setActiveStep] = useState<string | null>(null);

  return (
    <CryptoPanel title="Key Derivation Flow" icon={<GitBranch size={16} />} glowColor="gold" className="col-span-full">
      <div className="space-y-4">
        {/* Flow Visualization */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
          {steps.map((step, i) => (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => setActiveStep(activeStep === step.id ? null : step.id)}
                className={`flex flex-col items-center p-3 rounded border transition-all min-w-[100px] ${
                  activeStep === step.id
                    ? `border-${step.color}/60 bg-${step.color}/10`
                    : 'border-border/30 hover:border-border/60'
                }`}
              >
                <div className={`text-${step.color} mb-2`}>{step.icon}</div>
                <span className="text-xs text-foreground whitespace-nowrap">{step.label}</span>
              </button>
              {i < steps.length - 1 && (
                <ChevronRight size={20} className="text-muted-foreground mx-1 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Step Detail */}
        {activeStep && (
          <div className="bg-muted/20 rounded p-4 animate-hash">
            {(() => {
              const step = steps.find(s => s.id === activeStep);
              if (!step) return null;
              return (
                <div className="space-y-2">
                  <h4 className={`text-${step.color} font-display uppercase tracking-wider text-sm`}>
                    {step.label}
                  </h4>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  <div className="font-mono text-xs bg-background/50 rounded p-2 text-foreground/70">
                    Example: <span className={`text-${step.color}`}>{step.example}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Formula */}
        <div className="text-center text-xs text-muted-foreground pt-2 border-t border-border/30">
          <code className="text-crypto-gold">
            Address = Base58Check( 0x00 || RIPEMD160( SHA256( ECDSA_pubkey(privkey) ) ) )
          </code>
        </div>
      </div>
    </CryptoPanel>
  );
}
