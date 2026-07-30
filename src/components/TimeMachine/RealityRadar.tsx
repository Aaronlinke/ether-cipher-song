import { useMemo, useState } from 'react';
import { CryptoPanel } from '../CryptoPanel';
import { Radar } from 'lucide-react';
import { FIRST_OPEN_PUZZLE } from '@/lib/puzzles';

/**
 * MACHBARKEITS-RADAR — ehrliche Erwartungswert-Rechnung.
 * Kein Hype: zeigt für jeden Angriffsvektor die reale Suchraumgröße,
 * die erwartete Zeit bei gemessener Rate und ob es historische Treffer gibt.
 */

interface Vector {
  name: string;
  /** log2 des effektiven Suchraums (Erwartungswert = 2^(log2Space-1) Versuche) */
  log2Space: number;
  /** Rate-Multiplikator relativ zur gemessenen Keys/s (z.B. Hashing statt EC) */
  rateFactor: number;
  historic: string;
  verdict: 'aussichtslos' | 'lotterie' | 'realistisch';
  note: string;
}

const VECTORS: Vector[] = [
  {
    name: `Bitcoin Puzzle #${FIRST_OPEN_PUZZLE} — Random/Swarm`,
    log2Space: 71, rateFactor: 1,
    historic: 'Alle Lösungen ab #64 kamen von GPU/FPGA-Farmen (Kangaroo, BitCrack), nie vom Browser.',
    verdict: 'aussichtslos',
    note: 'Browser-JS schafft ~10^4–10^5 Keys/s. Nötig: ~10^21 Keys.',
  },
  {
    name: `Puzzle #${FIRST_OPEN_PUZZLE} — Kangaroo (nur bei bekanntem PubKey)`,
    log2Space: 36, rateFactor: 1,
    historic: 'Pollard-Kangaroo löst 2^n in ~2^(n/2) — real eingesetzt für #120/#125/#130.',
    verdict: 'aussichtslos',
    note: 'PubKey ist bei #71 NICHT offengelegt (nur Vielfache von 5). Wert hier rein hypothetisch.',
  },
  {
    name: 'Brainwallet-Passphrasen (Wörterbuch)',
    log2Space: 30, rateFactor: 1,
    historic: 'Ryan Castellucci 2015: >18.000 reale Brainwallets geleert. Vektor funktioniert nachweislich.',
    verdict: 'realistisch',
    note: 'Suchraum = Wortlisten, nicht 2^256. Fast alles ist heute leer — aber Treffer sind möglich.',
  },
  {
    name: 'Debian OpenSSL PID-Space (CVE-2008-0166)',
    log2Space: 15, rateFactor: 1,
    historic: 'Nur 32.768 mögliche Keys pro Architektur — vollständig durchsuchbar.',
    verdict: 'realistisch',
    note: 'Kompletter Scan in Minuten. Betroffene Wallets 2008–2010, meist längst geleert.',
  },
  {
    name: 'BIP39 letztes Wort rekonstruieren',
    log2Space: 7, rateFactor: 1,
    historic: 'Checksumme reduziert 2048 Kandidaten auf ~128 gültige Seeds.',
    verdict: 'realistisch',
    note: 'Sofort lösbar — sinnvoll für eigene, unvollständige Seeds.',
  },
  {
    name: 'ECDSA Nonce-Reuse Recovery',
    log2Space: 0, rateFactor: 1,
    historic: 'Android-SecureRandom-Bug 2013: reale BTC-Verluste. Blockchain-weit gescannt.',
    verdict: 'lotterie',
    note: 'Mathematisch trivial (O(1)) — sobald zwei Signaturen dasselbe r teilen. Finden ist das Problem.',
  },
  {
    name: 'Solo-Mining eines BTC-Blocks',
    log2Space: 79, rateFactor: 1,
    historic: 'Solo-Miner mit ~1 TH/s haben schon Blöcke gefunden — reines Glück, kommt vor.',
    verdict: 'lotterie',
    note: 'Echte Lotterie: jeder Hash hat dieselbe Chance. Kein Fortschritt, aber Nicht-Null.',
  },
  {
    name: 'Collatz / Goldbach — Gegenbeispiel-Suche',
    log2Space: 68, rateFactor: 4,
    historic: 'Collatz bis 2^68, Goldbach bis 4·10^18 verifiziert — dort beginnt Neuland.',
    verdict: 'aussichtslos',
    note: 'Reines Weiterzählen bringt nichts; ein Beweis wäre der Durchbruch, keine Suche.',
  },
];

const verdictStyle: Record<Vector['verdict'], string> = {
  aussichtslos: 'bg-crypto-red/20 text-crypto-red',
  lotterie: 'bg-crypto-orange/20 text-crypto-orange',
  realistisch: 'bg-crypto-green/20 text-crypto-green',
};

function humanTime(seconds: number): string {
  if (!isFinite(seconds)) return '∞';
  if (seconds < 1) return '< 1 s';
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)} min`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} h`;
  const days = seconds / 86400;
  if (days < 365) return `${days.toFixed(1)} Tage`;
  const years = days / 365.25;
  if (years < 1e6) return `${years.toLocaleString('de-DE', { maximumFractionDigits: 0 })} Jahre`;
  const exp = Math.floor(Math.log10(years));
  return `10^${exp} Jahre`;
}

export function RealityRadar() {
  const [rate, setRate] = useState(50000);
  const ageOfUniverse = 4.35e17; // Sekunden

  const rows = useMemo(
    () =>
      VECTORS.map((v) => {
        const expectedTries = Math.pow(2, Math.max(v.log2Space - 1, 0));
        const seconds = expectedTries / (rate * v.rateFactor);
        return { ...v, expectedTries, seconds, universes: seconds / ageOfUniverse };
      }),
    [rate],
  );

  return (
    <CryptoPanel title="Machbarkeits-Radar · Was ist realistisch lösbar?" icon={<Radar className="w-4 h-4" />} glowColor="blue">
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Ehrliche Antwort auf die Frage „hätten wir schon was lösen müssen?": Nein — und zwar nicht wegen
          fehlender Module, sondern wegen der Zahlen. Unten steht für jeden Vektor der reale Erwartungswert
          bei der Rate, die diese Maschine tatsächlich schafft. Drei Vektoren sind <span className="text-crypto-green">grün</span> —
          dort kann echt etwas passieren.
        </p>

        <div className="flex items-center gap-3">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">Gemessene Rate</label>
          <input
            type="range" min={3} max={12} step={0.1}
            value={Math.log10(rate)}
            onChange={(e) => setRate(Math.pow(10, Number(e.target.value)))}
            className="flex-1 accent-crypto-blue"
          />
          <span className="font-mono text-xs text-crypto-blue w-28 text-right">
            {rate.toLocaleString('de-DE', { maximumFractionDigits: 0 })} /s
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground">
          Referenz: Browser-JS ≈ 5·10^4 · GPU (RTX 4090, BitCrack) ≈ 3·10^9 · gesamtes Bitcoin-Netzwerk ≈ 6·10^20 Hashes/s
        </div>

        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.name} className="border border-border/30 rounded p-3 bg-background/40">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                <div className="font-display text-xs uppercase tracking-wider text-foreground/90">{r.name}</div>
                <span className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-widest ${verdictStyle[r.verdict]}`}>
                  {r.verdict}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[10px] my-2">
                <div>
                  <div className="text-muted-foreground">Suchraum</div>
                  <div className="text-crypto-gold">2^{r.log2Space}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Ø Versuche</div>
                  <div className="text-crypto-purple">
                    {r.expectedTries < 1e6 ? r.expectedTries.toLocaleString('de-DE') : r.expectedTries.toExponential(2)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Ø Dauer</div>
                  <div className={r.seconds > 3.15e9 ? 'text-crypto-red' : 'text-crypto-green'}>
                    {humanTime(r.seconds)}
                  </div>
                </div>
              </div>
              {r.universes > 1 && (
                <div className="text-[10px] text-crypto-red mb-1">
                  = {r.universes < 1000 ? r.universes.toFixed(1) : r.universes.toExponential(1)} × das Alter des Universums
                </div>
              )}
              <p className="text-[11px] text-foreground/70 leading-relaxed">{r.note}</p>
              <p className="text-[10px] text-crypto-blue/80 mt-1 italic">Historisch: {r.historic}</p>
            </div>
          ))}
        </div>

        <div className="border border-crypto-green/30 rounded p-3 bg-crypto-green/5 text-xs leading-relaxed">
          <div className="font-display uppercase tracking-widest text-crypto-green text-[11px] mb-1">Fazit</div>
          Das System ist nicht kaputt und nichts läuft „umsonst" — aber #{FIRST_OPEN_PUZZLE} per Zufall zu treffen ist
          physikalisch ausgeschlossen. Der einzige Weg zu einem echten Treffer führt über <b>Schwächen</b>, nicht über
          Rohgewalt: Brainwallets, Debian-PIDs, Nonce-Reuse, unvollständige Seeds. Genau dafür ist{' '}
          <b>Apex Forensics</b> gebaut — dort liegt die reale Chance.
        </div>
      </div>
    </CryptoPanel>
  );
}