import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { fonts } from "../MainVideo";

export const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 20 } });
  const line = interpolate(spring({ frame: frame - 20, fps, config: { damping: 40 } }), [0, 1], [0, 900]);
  const glow = 0.4 + Math.sin(frame / 8) * 0.15;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
      <div style={{ fontFamily: fonts.mono, fontSize: 14, letterSpacing: 6, color: "#00ff88aa", marginBottom: 20, opacity: s }}>
        ▮ ALL SYSTEMS ONLINE ▮
      </div>
      <div style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: 160, letterSpacing: 6, color: "#f5c518", textShadow: `0 0 ${40 + glow * 60}px #f5c518, 0 0 120px #f5c51844`, opacity: s, transform: `scale(${interpolate(s, [0, 1], [0.85, 1])})`, lineHeight: 1 }}>
        OMEGA
      </div>
      <div style={{ width: line, height: 2, background: "linear-gradient(90deg, transparent, #f5c518, transparent)", marginTop: 24 }} />
      <div style={{ fontFamily: fonts.mono, fontSize: 22, color: "#eafff2", marginTop: 26, letterSpacing: 4, opacity: s }}>
        MATHEMATIK  ·  KRYPTOGRAFIE  ·  BILDUNG
      </div>
      <div style={{ fontFamily: fonts.mono, fontSize: 14, color: "#8fd3a8", marginTop: 40, opacity: s, letterSpacing: 3 }}>
        Alle Berechnungen laufen lokal in Ihrem Browser
      </div>
    </AbsoluteFill>
  );
};