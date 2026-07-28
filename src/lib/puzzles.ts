/**
 * ZENTRALE PUZZLE-DATENBANK — Single Source of Truth
 * Quelle: privatekeys.pw/puzzles/bitcoin-puzzle-tx (verifiziert)
 *
 * Gelöst: #1–#70 sowie #75, #80, #85, #90, #95, #100, #105, #110, #115, #120, #125, #130.
 * Alles andere ab #71 ist OFFEN. Erstes offenes Puzzle: #71 (7.1 BTC).
 */

export interface PuzzleEntry {
  n: number;
  address: string;
  reward: number;
}

/** Alle noch UNGELÖSTEN Puzzles mit verifizierter Adresse. */
export const OPEN_PUZZLES: PuzzleEntry[] = [
  { n: 71, address: '1PWo3JeB9jrGwfHDNpdGK54CRas7fsVzXU', reward: 7.1 },
  { n: 72, address: '1JTK7s9YVYywfm5XUH7RNhHJH1LshCaRFR', reward: 7.2 },
  { n: 73, address: '12VVRNPi4SJqUTsp6FmqDqY5sGosDtysn4', reward: 7.3 },
  { n: 74, address: '1FWGcVDK3JGzCC3WtkYetULPszMaK2Jksv', reward: 7.4 },
  { n: 76, address: '1DJh2eHFYQfACPmrvpyWc8MSTYKh7w9eRF', reward: 7.6 },
  { n: 77, address: '1Bxk4CQdqL9p22JEtDfdXMsng1XacifUtE', reward: 7.7 },
  { n: 78, address: '15qF6X51huDjqTmF9BJgxXdt1xcj46Jmhb', reward: 7.8 },
  { n: 79, address: '1ARk8HWJMn8js8tQmGUJeQHjSE7KRkn2t8', reward: 7.9 },
  { n: 81, address: '15qsCm78whspNQFydGJQk5rexzxTQopnHZ', reward: 8.1 },
  { n: 82, address: '13zYrYhhJxp6Ui1VV7pqa5WDhNWM45ARAC', reward: 8.2 },
  { n: 83, address: '14MdEb4eFcT3MVG5sPFG4jGLuHJSnt1Dk2', reward: 8.3 },
  { n: 84, address: '1CMq3SvFcVEcpLMuuH8PUcNiqsK1oicG2D', reward: 8.4 },
  { n: 86, address: '1K3x5L6G57Y494fDqBfrojD28UJv4s5JcK', reward: 8.6 },
  { n: 87, address: '1PxH3K1Shdjb7gSEoTX7UPDZ6SH4qGPrvq', reward: 8.7 },
  { n: 88, address: '16AbnZjZZipwHMkYKBSfswGWKDmXHjEpSf', reward: 8.8 },
  { n: 89, address: '19QciEHbGVNY4hrhfKXmcBBCrJSBZ6TaVt', reward: 8.9 },
  { n: 91, address: '1EzVHtmbN4fs4MiNk3ppEnKKhsmXYJ4s74', reward: 9.1 },
  { n: 92, address: '1AE8NzzgKE7Yhz7BWtAcAAxiFMbPo82NB5', reward: 9.2 },
  { n: 93, address: '17Q7tuG2JwFFU9rXVj3uZqRtioH3mx2Jad', reward: 9.3 },
  { n: 94, address: '1K6xGMUbs6ZTXBnhw1pippqwK6wjBWtNpL', reward: 9.4 },
  { n: 96, address: '15ANYzzCp5BFHcCnVFzXqyibpzgPLWaD8b', reward: 9.6 },
  { n: 97, address: '18ywPwj39nGjqBrQJSzZVq2izR12MDpDr8', reward: 9.7 },
  { n: 98, address: '1CaBVPrwUxbQYYswu32w7Mj4HR4maNoJSX', reward: 9.8 },
  { n: 99, address: '1JWnE6p6UN7ZJBN7TtcbNDoRcjFtuDWoNL', reward: 9.9 },
  { n: 101, address: '1CKCVdbDJasYmhswB6HKZHEAnNaDpK7W4n', reward: 10.1 },
  { n: 102, address: '1PXv28YxmYMaB8zxrKeZBW8dt2HK7RkRPX', reward: 10.2 },
  { n: 103, address: '1AcAmB6jmtU6AiEcXkmiNE9TNVPsj9DULf', reward: 10.3 },
  { n: 104, address: '1EQJvpsmhazYCcKX5Au6AZmZKRnzarMVZu', reward: 10.4 },
  { n: 106, address: '18KsfuHuzQaBTNLASyj15hy4LuqPUo1FNB', reward: 10.6 },
  { n: 107, address: '15EJFC5ZTs9nhsdvSUeBXjLAuYq3SWaxTc', reward: 10.7 },
  { n: 108, address: '1HB1iKUqeffnVsvQsbpC6dNi1XKbyNuqao', reward: 10.8 },
  { n: 109, address: '1GvgAXVCbA8FBjXfWiAms4ytFeJcKsoyhL', reward: 10.9 },
  { n: 111, address: '1824ZJQ7nKJ9QFTRBqn7z7dHV5EGpzUpH3', reward: 11.1 },
  { n: 112, address: '18A7NA9FTsnJxWgkoFfPAFbQzuQxpRtCos', reward: 11.2 },
  { n: 113, address: '1NeGn21dUDDeqFQ63xb2SpgUuXuBLA4WT4', reward: 11.3 },
  { n: 114, address: '174SNxfqpdMGYy5YQcfLbSTK3MRNZEePoy', reward: 11.4 },
  { n: 116, address: '1MnJ6hdhvK37VLmqcdEwqC3iFxyWH2PHUV', reward: 11.6 },
  { n: 117, address: '1KNRfGWw7Q9Rmwsc6NT5zsdvEb9M2Wkj5Z', reward: 11.7 },
  { n: 118, address: '1PJZPzvGX19a7twf5HyD2VvNiPdHLzm9F6', reward: 11.8 },
  { n: 119, address: '1GuBBhf61rnvRe4K8zu8vdQB3kHzwFqSy7', reward: 11.9 },
  { n: 121, address: '1GDSuiThEV64c166LUFC9uDcVdGjqkxKyh', reward: 12.1 },
  { n: 122, address: '1Me3ASYt5JCTAK2XaC32RMeH34PdprrfDx', reward: 12.2 },
  { n: 123, address: '1CdufMQL892A69KXgv6UNBD17ywWqYpKut', reward: 12.3 },
  { n: 124, address: '1BkkGsX9ZM6iwL3zbqs7HWBV7SvosR6m8N', reward: 12.4 },
  { n: 126, address: '1AWCLZAjKbV1P7AHvaPNCKiB7ZWVDMxFiz', reward: 12.6 },
  { n: 127, address: '1G6EFyBRU86sThN3SSt3GrHu1sA7w7nzi4', reward: 12.7 },
  { n: 128, address: '1MZ2L1gFrCtkkn6DnTT2e4PFUTHw9gNwaj', reward: 12.8 },
  { n: 129, address: '1Hz3uv3nNZzBVMXLGadCucgjiCs5W9vaGz', reward: 12.9 },
  { n: 131, address: '16zRPnT8znwq42q7XeMkZUhb1bKqgRogyy', reward: 13.1 },
  { n: 132, address: '1KrU4dHE5WrW8rhWDsTRjR21r8t3dsrS3R', reward: 13.2 },
  { n: 133, address: '17uDfp5r4n441xkgLFmhNoSW1KWp6xVLD', reward: 13.3 },
  { n: 134, address: '13A3JrvXmvg5w9XGvyyR4JEJqiLz8ZySY3', reward: 13.4 },
  { n: 135, address: '16RGFo6hjq9ym6Pj7N5H7L1NR1rVPJyw2v', reward: 13.5 },
  { n: 136, address: '1UDHPdovvR985NrWSkdWQDEQ1xuRiTALq', reward: 13.6 },
  { n: 137, address: '15nf31J46iLuK1ZkTnqHo7WgN5cARFK3RA', reward: 13.7 },
  { n: 138, address: '1Ab4vzG6wEQBDNQM1B2bvUz4fqXXdFk2WT', reward: 13.8 },
  { n: 139, address: '1Fz63c775VV9fNyj25d9Xfw3YHE6sKCxbt', reward: 13.9 },
  { n: 140, address: '1QKBaU6WAeycb3DbKbLBkX7vJiaS8r42Xo', reward: 14.0 },
  { n: 141, address: '1CD91Vm97mLQvXhrnoMChhJx4TP9MaQkJo', reward: 14.1 },
  { n: 142, address: '15MnK2jXPqTMURX4xC3h4mAZxyCcaWWEDD', reward: 14.2 },
  { n: 143, address: '13N66gCzWWHEZBxhVxG18P8wyjEWF9Yoi1', reward: 14.3 },
  { n: 144, address: '1NevxKDYuDcCh1ZMMi6ftmWwGrZKC6j7Ux', reward: 14.4 },
  { n: 145, address: '19GpszRNUej5yYqxXoLnbZWKew3KdVLkXg', reward: 14.5 },
  { n: 146, address: '1M7ipcdYHey2Y5RZM34MBbpugghmjaV89P', reward: 14.6 },
  { n: 147, address: '18aNhurEAJsw6BAgtANpexk5ob1aGTwSeL', reward: 14.7 },
  { n: 148, address: '1FwZXt6EpRT7Fkndzv6K4b4DFoT4trbMrV', reward: 14.8 },
  { n: 149, address: '1CXvTzR6qv8wJ7eprzUKeWxyGcHwDYP1i2', reward: 14.9 },
  { n: 150, address: '1MUJSJYtGPVGkBCTqGspnxyHahpt5Te8jy', reward: 15.0 },
  { n: 151, address: '13Q84TNNvgcL3HJiqQPvyBb9m4hxjS3jkV', reward: 15.1 },
  { n: 152, address: '1LuUHyrQr8PKSvbcY1v1PiuGuqFjWpDumN', reward: 15.2 },
  { n: 153, address: '18192XpzzdDi2K11QVHR7td2HcPS6Qs5vg', reward: 15.3 },
  { n: 154, address: '1NgVmsCCJaKLzGyKLFJfVequnFW9ZvnMLN', reward: 15.4 },
  { n: 155, address: '1AoeP37TmHdFh8uN72fu9AqgtLrUwcv2wJ', reward: 15.5 },
  { n: 156, address: '1FTpAbQa4h8trvhQXjXnmNhqdiGBd1oraE', reward: 15.6 },
  { n: 157, address: '14JHoRAdmJg3XR4RjMDh6Wed6ft6hzbQe9', reward: 15.7 },
  { n: 158, address: '19z6waranEf8CcP8FqNgdwUe1QRxvUNKBG', reward: 15.8 },
  { n: 159, address: '14u4nA5sugaswb6SZgn5av2vuChdMnD9E5', reward: 15.9 },
  { n: 160, address: '1NBC8uXJy1GiJ6drkiZa1WuKn51ps7EPTv', reward: 16.0 },
];

/** Bereits gelöste Puzzle-Nummern (Key ist öffentlich bekannt). */
export const SOLVED_PUZZLES: number[] = [
  ...Array.from({ length: 70 }, (_, i) => i + 1),
  75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130,
];

/** Das erste noch offene Puzzle — aktuelles Primärziel des Schwarms. */
export const FIRST_OPEN_PUZZLE = OPEN_PUZZLES[0].n; // 71

/** Adresse -> Puzzle-Nummer (nur offene Puzzles). */
export const OPEN_PUZZLE_BY_ADDRESS: Record<string, number> = Object.fromEntries(
  OPEN_PUZZLES.map((p) => [p.address, p.n]),
);

/** Puzzle-Nummer -> Adresse (nur offene Puzzles). */
export const OPEN_PUZZLE_ADDRESS: Record<number, string> = Object.fromEntries(
  OPEN_PUZZLES.map((p) => [p.n, p.address]),
);

/** Puzzles, deren Public Key durch eine Ausgangs-Transaktion offengelegt ist (Vielfache von 5). */
export function hasPublicKey(n: number): boolean {
  return n % 5 === 0;
}

export function isSolved(n: number): boolean {
  return SOLVED_PUZZLES.includes(n);
}

export function puzzleRange(bits: number): { min: bigint; max: bigint } {
  return { min: 1n << BigInt(bits - 1), max: (1n << BigInt(bits)) - 1n };
}

export function puzzleReward(n: number): number {
  return n / 10;
}

export function puzzleStatusLabel(n: number): string {
  if (isSolved(n)) return `Bereits gelöst (Key öffentlich bekannt)`;
  const entry = OPEN_PUZZLES.find((p) => p.n === n);
  if (entry) return `OFFEN — ${entry.reward.toFixed(1)} BTC Preisgeld`;
  return n > 160 ? 'Existiert nicht (Puzzle endet bei #160)' : 'Unbekannter Status';
}

/** Die n schwierigkeitsärmsten offenen Puzzles — Presets für Rechner. */
export function topOpenPuzzles(count = 10): PuzzleEntry[] {
  return OPEN_PUZZLES.slice(0, count);
}
