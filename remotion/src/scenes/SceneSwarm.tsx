import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { fonts } from "../MainVideo";
import { Panel, HUD, Corner } from "./_shared";

export const SceneSwarm: React.FC = () => {
  const frame = useCurrentFrame();
  const agents = Array.from({ length: 40 }, (_, i) => i);
  return (
    <AbsoluteFill style={{ padding: 100 }}>
      <HUD label="TEST 02 › SwarmKeyHunter • Puzzle #72" />
      <Corner />
      <div style={{ height: 60 }} />
      <div style={{ fontFamily: fonts.display, fontSize: 64, color: "#7cc4ff", letterSpacing: 4, textShadow: "0 0 30px #7cc4ff88" }}>
        SWARM KEY HUNTER
      </div>
      <div style={{ fontFamily: fonts.mono, color: "#8fd3a8", marginBottom: 20 }}>
        Bio-inspirierte Agenten • Pheromon-Pfade • O(n³) Suchraum
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 24 }}>
        <Panel title="Schwarm-Karte" accent="#7cc4ff" delay={8}>
          <div style={{ position: "relative", height: 420, background: "#020608", border: "1px solid #7cc4ff22", overflow: "hidden" }}>
            {agents.map((a) => {
              const t = (frame + a * 5) * 0.03;
              const x = 50 + Math.sin(t + a) * 40 + Math.cos(t * 0.7 + a * 0.3) * 8;
              const y = 50 + Math.cos(t * 0.9 + a * 0.5) * 38 + Math.sin(t * 1.3 + a) * 6;
              const op = interpolate(frame, [a * 1.5, a * 1.5 + 10], [0, 1], { extrapolateRight: "clamp" });
              return <div key={a} style={{ position: "absolute", left: `${x}%`, top: `${y}%`, width: 6, height: 6, borderRadius: 999, background: "#7cc4ff", boxShadow: "0 0 10px #7cc4ff", opacity: op }} />;
            })}
            {/* target */}
            <div style={{ position: "absolute", left: "72%", top: "40%", width: 24, height: 24, borderRadius: 999, border: "2px solid #f5c518", boxShadow: "0 0 20px #f5c518", transform: `translate(-50%,-50%) scale(${1 + Math.sin(frame / 10) * 0.2})` }} />
          </div>
        </Panel>
        <Panel title="Telemetrie" accent="#7cc4ff" delay={16}>
          <div style={{ fontFamily: fonts.mono, fontSize: 20, lineHeight: 2 }}>
            <div>Agenten .......... <span style={{ color: "#f5c518" }}>1024</span></div>
            <div>Iteration ........ <span style={{ color: "#f5c518" }}>{(frame * 12873).toLocaleString()}</span></div>
            <div>Pheromon-Dichte .. <span style={{ color: "#f5c518" }}>{(0.42 + Math.sin(frame / 15) * 0.12).toFixed(3)}</span></div>
            <div>Best-Fitness ..... <span style={{ color: "#00ff88" }}>{(0.71 + frame * 0.001).toFixed(4)}</span></div>
            <div>Ziel ............. <span style={{ color: "#f5c518" }}>Puzzle #72</span></div>
            <div style={{ marginTop: 12, color: "#00ff88" }}>▶ konvergiert…</div>
          </div>
        </Panel>
      </div>
    </AbsoluteFill>
  );
};