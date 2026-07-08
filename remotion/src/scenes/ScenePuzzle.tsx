import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { fonts } from "../MainVideo";
import { Panel, HUD, Corner } from "./_shared";

const PUZZLES = [
  { n: 71, bits: 71, status: "GELÖST", prize: "0.71 BTC", color: "#00ff88" },
  { n: 72, bits: 72, status: "OFFEN", prize: "0.72 BTC", color: "#f5c518" },
  { n: 73, bits: 73, status: "OFFEN", prize: "0.73 BTC", color: "#f5c518" },
  { n: 74, bits: 74, status: "OFFEN", prize: "0.74 BTC", color: "#f5c518" },
  { n: 75, bits: 75, status: "OFFEN", prize: "0.75 BTC", color: "#f5c518" },
];

export const ScenePuzzle: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ padding: 100 }}>
      <HUD label="TEST 03 › Bitcoin Puzzle Tracker" />
      <Corner />
      <div style={{ height: 60 }} />
      <div style={{ fontFamily: fonts.display, fontSize: 64, color: "#f5c518", letterSpacing: 4, textShadow: "0 0 30px #f5c51888" }}>
        BITCOIN PUZZLES
      </div>
      <div style={{ fontFamily: fonts.mono, color: "#8fd3a8", marginBottom: 24 }}>
        Aktuelle Serie startet bei #72 • #71 gelöst (April 2024)
      </div>
      <Panel title="Open Challenges" accent="#f5c518" delay={8}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 16 }}>
          {PUZZLES.map((p, i) => {
            const op = interpolate(frame, [15 + i * 8, 25 + i * 8], [0, 1], { extrapolateRight: "clamp" });
            const y = interpolate(op, [0, 1], [30, 0]);
            return (
              <div key={p.n} style={{ opacity: op, transform: `translateY(${y}px)`, border: `1px solid ${p.color}55`, borderRadius: 4, padding: 20, background: "#020608" }}>
                <div style={{ fontFamily: fonts.display, fontSize: 42, color: p.color, textShadow: `0 0 20px ${p.color}88` }}>#{p.n}</div>
                <div style={{ fontFamily: fonts.mono, fontSize: 14, color: "#8fd3a8", marginTop: 6 }}>{p.bits}-bit</div>
                <div style={{ fontFamily: fonts.mono, fontSize: 12, marginTop: 12, color: p.color }}>{p.status}</div>
                <div style={{ fontFamily: fonts.mono, fontSize: 16, marginTop: 4, color: "#eafff2" }}>{p.prize}</div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 24, fontFamily: fonts.mono, fontSize: 18, color: "#00ff88" }}>
          ▶ Bruteforce-Estimator › 2^{72} ≈ 4.72 × 10^21 Schlüssel
        </div>
      </Panel>
    </AbsoluteFill>
  );
};