import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { fonts } from "../MainVideo";
import { HUD, Corner } from "./_shared";

const MODULES = [
  ["UniversalCalculator", "#f5c518"],
  ["MegaSolver", "#00ff88"],
  ["ManifestationEngine", "#b16dff"],
  ["SVRC Crypto", "#7cc4ff"],
  ["CryptoChallenges", "#f5c518"],
  ["ZipRunner", "#b16dff"],
  ["SwarmKeyHunter", "#7cc4ff"],
  ["Delta-Solver", "#00ff88"],
  ["Masterformel", "#f5c518"],
  ["OmniGenesis", "#b16dff"],
  ["SRIL Pipeline", "#00ff88"],
  ["FrequencyAnalyzer", "#7cc4ff"],
  ["ECDSA Module", "#f5c518"],
  ["SHA256 Paper", "#00ff88"],
  ["Moiré Encryption", "#b16dff"],
  ["Lorenz Attractor", "#7cc4ff"],
  ["Bloch Sphere", "#b16dff"],
  ["Quantum Vacuum", "#00ff88"],
  ["UTAS EDHI", "#f5c518"],
  ["UTAS PFE", "#7cc4ff"],
  ["UTAS SOR", "#b16dff"],
  ["Bitcoin Puzzles", "#f5c518"],
  ["Bip39 → xPub", "#00ff88"],
  ["Nexus Math", "#7cc4ff"],
  ["Apex Forensics", "#b16dff"],
  ["Chronoplast", "#f5c518"],
  ["Cosmology", "#7cc4ff"],
  ["SEIR Simulator", "#00ff88"],
  ["AI Assistant", "#b16dff"],
  ["+ 6 weitere …", "#eafff2"],
];

export const SceneModulesGrid: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ padding: 80 }}>
      <HUD label="SYSTEM › 35+ Module aktiv" />
      <Corner />
      <div style={{ height: 60 }} />
      <div style={{ fontFamily: fonts.display, fontSize: 64, color: "#eafff2", letterSpacing: 4, textShadow: "0 0 30px #00ff8888" }}>
        DAS GESAMTE SYSTEM
      </div>
      <div style={{ fontFamily: fonts.mono, color: "#8fd3a8", marginBottom: 30 }}>
        Kryptografie • Zeitmaschine • UTAS • Nexus • KI • Alles lokal im Browser
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
        {MODULES.map(([name, color], i) => {
          const s = spring({ frame: frame - i * 1.2, fps, config: { damping: 20, stiffness: 200 } });
          const y = interpolate(s, [0, 1], [20, 0]);
          return (
            <div key={i} style={{
              opacity: s, transform: `translateY(${y}px)`,
              border: `1px solid ${color}55`, background: "rgba(4,8,10,0.85)", padding: "16px 12px",
              borderRadius: 4, boxShadow: `0 0 15px ${color}22`,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: 999, background: color, boxShadow: `0 0 8px ${color}`, marginBottom: 8 }} />
              <div style={{ fontFamily: fonts.mono, fontSize: 14, color: "#eafff2", lineHeight: 1.3 }}>{name}</div>
              <div style={{ fontFamily: fonts.mono, fontSize: 10, color: color, marginTop: 4 }}>● ONLINE</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};