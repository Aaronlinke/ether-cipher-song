import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { fonts } from "../MainVideo";
import { Panel, HUD, Corner } from "./_shared";

const LINES = [
  "input  = 12345678901234567890",
  "sha256 → 7f9a3c2b8e4d1a5f6c9b8e2d…",
  "ripemd160 → 4b0a3c8e2d9f1b7a6c5d4e3f…",
  "pubkey_x = 0x79BE667EF9DCBBAC55A0…",
  "wif     = KwDiBf89QgGbjEhKnhXJuH…",
  "addr    = 1A2b3C4d5E6f7G8h9I0jK…",
  "✓ VERIFIED • entropy 253.7 bits",
];

export const SceneUniversalCalc: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ padding: 100 }}>
      <HUD label="TEST 01 › UniversalCalculator" />
      <Corner />
      <div style={{ height: 60 }} />
      <div style={{ fontFamily: fonts.display, fontSize: 64, color: "#f5c518", letterSpacing: 4, textShadow: "0 0 30px #f5c51888" }}>
        UNIVERSAL CALCULATOR
      </div>
      <div style={{ fontFamily: fonts.mono, color: "#8fd3a8", marginBottom: 30 }}>
        Auto-Detect › HEX / DEC / BIN / WIF / PubKey / Address
      </div>
      <Panel title="Live Pipeline" accent="#f5c518" delay={10}>
        <div style={{ fontFamily: fonts.mono, fontSize: 22, lineHeight: 1.7 }}>
          {LINES.map((l, i) => {
            const start = 20 + i * 8;
            const op = interpolate(frame, [start, start + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const clr = l.startsWith("✓") ? "#00ff88" : "#eafff2";
            return <div key={i} style={{ opacity: op, color: clr }}>{l}</div>;
          })}
        </div>
      </Panel>
    </AbsoluteFill>
  );
};