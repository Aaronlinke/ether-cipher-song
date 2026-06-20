import { Trophy, ExternalLink } from 'lucide-react';
import { CryptoPanel } from './CryptoPanel';

interface Challenge {
  name: string;
  category: 'crypto' | 'math' | 'bitcoin' | 'quantum';
  status: 'offen' | 'teilweise' | 'gelöst';
  prize: string;
  description: string;
  url?: string;
}

const CHALLENGES: Challenge[] = [
  {
    name: 'Bitcoin Puzzle #72 → #160',
    category: 'bitcoin', status: 'offen',
    prize: '≈ 990 BTC kumuliert',
    description: 'Private Keys verteilt über aufsteigende Bit-Bereiche. Aktuell offen ab #72 (≈ 0.72 BTC) bis #160. Public Keys nur für durch 5 teilbare Indizes bekannt.',
    url: 'https://privatekeys.pw/puzzles/bitcoin-puzzle-tx',
  },
  {
    name: 'RSA Factoring Challenge (RSA-2048)',
    category: 'crypto', status: 'offen',
    prize: '$200.000 (historisch, zurückgezogen)',
    description: 'Faktorisierung der 2048-Bit RSA-Zahl. Bisher größte gelöste: RSA-250 (2020). Hauptziel klassischer Zahlentheorie.',
    url: 'https://en.wikipedia.org/wiki/RSA_numbers',
  },
  {
    name: 'ECDLP auf secp256k1',
    category: 'crypto', status: 'offen',
    prize: 'Faktisch alle Bitcoin (≈ 2 Bio. $)',
    description: 'Diskreter Logarithmus auf der Bitcoin-Kurve. Best-Algorithmus Pollard-Rho: √N ≈ 2^128 Operationen.',
  },
  {
    name: 'P vs NP',
    category: 'math', status: 'offen',
    prize: '$1.000.000 (Clay Millennium)',
    description: 'Sind alle in polynomieller Zeit verifizierbaren Probleme auch in polynomieller Zeit lösbar? Konsequenz: bricht alle moderne Kryptografie.',
    url: 'https://www.claymath.org/millennium-problems',
  },
  {
    name: 'Riemann-Hypothese',
    category: 'math', status: 'offen',
    prize: '$1.000.000 (Clay)',
    description: 'Alle nicht-trivialen Nullstellen von ζ(s) liegen auf Re(s)=1/2. Beweist Primzahlverteilung → relevant für SRIL & UrZahl.',
  },
  {
    name: 'Collatz-Vermutung (3n+1)',
    category: 'math', status: 'offen',
    prize: '$120 (Erdős)',
    description: 'Endet jede Iteration von n→n/2 (gerade) bzw. 3n+1 (ungerade) bei 1? Verifiziert bis 2^68, kein Beweis.',
  },
  {
    name: 'Goldbach-Vermutung',
    category: 'math', status: 'offen',
    prize: '$1.000.000 (Faber, abgelaufen)',
    description: 'Jede gerade Zahl > 2 ist Summe zweier Primzahlen. Verifiziert bis 4·10^18.',
  },
  {
    name: 'BBS Generator Backdoor (Dual_EC_DRBG)',
    category: 'crypto', status: 'teilweise',
    prize: '—',
    description: 'NSA-Hintertür im NIST-RNG. Frage: Existiert ähnliche Struktur in secp256k1-Konstanten?',
  },
  {
    name: 'GIMPS — Mersenne-Primzahl M_p, p > 82.589.933',
    category: 'math', status: 'offen',
    prize: '$3.000 + $150.000 ab 100M Stellen',
    description: 'Distributed Search nach neuen Mersenne-Primes 2^p − 1. Letzter Fund 2018.',
    url: 'https://www.mersenne.org/',
  },
  {
    name: 'Quantum Supremacy auf secp256k1',
    category: 'quantum', status: 'offen',
    prize: 'Bricht Bitcoin / alle EC-Wallets',
    description: 'Shor-Algorithmus auf ~2330 logischen Qubits → ECDLP in Polynomzeit. Aktuell ~1000 physische Qubits, error-corrected fern.',
  },
  {
    name: 'AES-256 Key Recovery',
    category: 'crypto', status: 'offen',
    prize: '—',
    description: 'Bester bekannter Angriff: Biclique mit 2^254.4. Praktisch nicht durchführbar. Quantenangriff: Grover → 2^128.',
  },
  {
    name: 'Twin Prime Conjecture',
    category: 'math', status: 'offen',
    prize: '—',
    description: 'Gibt es unendlich viele Primzahlpaare (p, p+2)? Zhang (2013): unendlich viele Lücken ≤ 7·10^7, inzwischen ≤ 246.',
  },
];

const catColors: Record<Challenge['category'], string> = {
  crypto: 'text-crypto-green border-crypto-green/40',
  math: 'text-crypto-blue border-crypto-blue/40',
  bitcoin: 'text-crypto-gold border-crypto-gold/40',
  quantum: 'text-crypto-purple border-crypto-purple/40',
};
const statusColors: Record<Challenge['status'], string> = {
  offen: 'bg-crypto-red/20 text-crypto-red',
  teilweise: 'bg-crypto-orange/20 text-crypto-orange',
  gelöst: 'bg-crypto-green/20 text-crypto-green',
};

export function CryptoChallenges() {
  return (
    <CryptoPanel
      title="Offene Krypto- & Mathe-Herausforderungen"
      icon={<Trophy className="w-4 h-4" />}
      glowColor="purple"
    >
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Kuratierte Liste mathematischer und kryptografischer Probleme, an denen unsere Engine (SRIL, Δ-Solver,
          SwarmKeyHunter, Masterformel, UTAS) arbeiten kann. Bitcoin Puzzle <span className="text-crypto-gold">#71</span> ist
          gefallen — aktuelles Ziel: <span className="text-crypto-orange">#72</span>.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CHALLENGES.map((c, i) => (
            <div key={i} className={`border rounded p-3 bg-background/40 ${catColors[c.category]}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="font-display text-xs uppercase tracking-wider">{c.name}</div>
                <span className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-widest ${statusColors[c.status]}`}>
                  {c.status}
                </span>
              </div>
              <div className="text-[11px] text-crypto-gold/80 mb-1 font-mono">{c.prize}</div>
              <p className="text-xs text-foreground/80 leading-relaxed">{c.description}</p>
              {c.url && (
                <a
                  href={c.url} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-[10px] text-crypto-blue hover:underline"
                >
                  Quelle <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </CryptoPanel>
  );
}