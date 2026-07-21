import { useEffect, useState } from 'react';
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from '@/components/ui/command';
import {
  Binary, Clock, Calculator, Pickaxe, Zap, Archive, Sparkles,
  Shield, Search, Hash, KeyRound, Cpu, Radar, Command,
} from 'lucide-react';

type Cmd = {
  id: string; label: string; hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void; group: string;
};

const scrollTo = (sel: string) => () => {
  const el = document.querySelector(sel);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

export function NexusCommandPalette({
  onSwitchView,
}: { onSwitchView: (v: 'crypto' | 'timemachine') => void }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const run = (fn: () => void) => { setOpen(false); setTimeout(fn, 50); };

  const cmds: Cmd[] = [
    { id: 'view-crypto', label: 'Ansicht: Kryptografie', icon: Binary, group: 'Navigation', action: () => onSwitchView('crypto') },
    { id: 'view-tm', label: 'Ansicht: Zeitmaschine', icon: Clock, group: 'Navigation', action: () => onSwitchView('timemachine') },

    { id: 'universal', label: 'Universal-Calculator', hint: 'Omni-Input, Auto-Detect', icon: Calculator, group: 'Rechner', action: () => { onSwitchView('crypto'); setTimeout(scrollTo('[data-mod="universal"]'), 100); } },
    { id: 'mega', label: 'MegaSolver', hint: 'Alle Analysen parallel', icon: Sparkles, group: 'Rechner', action: () => { onSwitchView('crypto'); setTimeout(scrollTo('[data-mod="mega"]'), 100); } },
    { id: 'svrc', label: 'SVRC-Crypto', hint: 'Axiom-Engine + Forge', icon: Shield, group: 'Rechner', action: () => { onSwitchView('crypto'); setTimeout(scrollTo('[data-mod="svrc"]'), 100); } },
    { id: 'manifest', label: 'Manifestation-Engine', hint: 'Void · Chaos · Spin', icon: Zap, group: 'Rechner', action: () => { onSwitchView('crypto'); setTimeout(scrollTo('[data-mod="manifest"]'), 100); } },

    { id: 'solo', label: 'Solo-Miner', hint: 'Echtes SHA-256d auf Bitcoin-Tip', icon: Pickaxe, group: 'Mining & Hunt', action: () => { onSwitchView('crypto'); setTimeout(scrollTo('[data-mod="solo"]'), 100); } },
    { id: 'brute', label: 'Brute-Force / 7-Bot-Swarm', hint: 'Puzzle #72+', icon: Radar, group: 'Mining & Hunt', action: () => { onSwitchView('crypto'); setTimeout(scrollTo('[data-mod="brute"]'), 100); } },
    { id: 'chall', label: 'Crypto-Challenges', hint: 'RSA, Riemann, P=NP', icon: Search, group: 'Mining & Hunt', action: () => { onSwitchView('crypto'); setTimeout(scrollTo('[data-mod="chall"]'), 100); } },

    { id: 'zip', label: 'Zip-Runner', hint: 'Sandbox + Auto-Fix', icon: Archive, group: 'Tools', action: () => { onSwitchView('crypto'); setTimeout(scrollTo('[data-mod="zip"]'), 100); } },
    { id: 'addr', label: 'Address-Generator', icon: KeyRound, group: 'Tools', action: () => { onSwitchView('crypto'); setTimeout(scrollTo('[data-mod="addr"]'), 100); } },
    { id: 'hash', label: 'Hash-Visualizer', icon: Hash, group: 'Tools', action: () => { onSwitchView('crypto'); setTimeout(scrollTo('[data-mod="hash"]'), 100); } },
    { id: 'bip39', label: 'BIP-39 Generator + xKey', icon: KeyRound, group: 'Tools', action: () => { onSwitchView('crypto'); setTimeout(scrollTo('[data-mod="bip39"]'), 100); } },
    { id: 'wif', label: 'WIF-Konverter + Balance', icon: Cpu, group: 'Tools', action: () => { onSwitchView('crypto'); setTimeout(scrollTo('[data-mod="wif"]'), 100); } },
  ];

  const groups = Array.from(new Set(cmds.map(c => c.group)));

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full border border-crypto-gold/40 bg-background/80 backdrop-blur text-xs text-crypto-gold hover:bg-crypto-gold/10 shadow-lg shadow-crypto-gold/20"
        aria-label="Command Palette öffnen"
      >
        <Command className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Nexus</span>
        <kbd className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-muted/40 border border-border/30">⌘K</kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Modul suchen — „miner", „puzzle", „hash"..." />
        <CommandList>
          <CommandEmpty>Nichts gefunden.</CommandEmpty>
          {groups.map((g, i) => (
            <div key={g}>
              {i > 0 && <CommandSeparator />}
              <CommandGroup heading={g}>
                {cmds.filter(c => c.group === g).map(c => (
                  <CommandItem key={c.id} onSelect={() => run(c.action)}>
                    <c.icon className="w-4 h-4 mr-2 text-crypto-gold" />
                    <span>{c.label}</span>
                    {c.hint && <span className="ml-auto text-[10px] text-muted-foreground">{c.hint}</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}