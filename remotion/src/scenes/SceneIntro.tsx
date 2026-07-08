import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { fonts } from "../MainVideo";

export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 20, stiffness: 100 } });
  const scale = interpolate(s, [0, 1], [0.7, 1]);
  const sub = spring({ frame: frame - 20, fps, config: { damping: 30 } });
  const line = interpolate(spring({ frame: frame - 30, fps, config: { damping: 40 } }), [0, 1], [0, 700]);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
      <div style={{ fontFamily: fonts.mono, fontSize: 14, letterSpacing: 6, color: "#00ff88aa", marginBottom: 18, opacity: sub }}>
        ▮ INITIALISIERE • KRYPTOGRAFIE + ZEITMASCHINE ▮
      </div>
      <div style={{ transform: `scale(${scale})`, opacity: s, fontFamily: fonts.display, fontWeight: 900, fontSize: 140, letterSpacing: 4, color: "#eafff2", textShadow: "0 0 40px #00ff88, 0 0 80px #00ff8855", lineHeight: 1 }}>
        PROJECT<span style={{ color: "#f5c518", textShadow: "0 0 40px #f5c518" }}> OMEGA</span>
      </div>
      <div style={{ width: line, height: 2, background: "linear-gradient(90deg, transparent, #00ff88, transparent)", marginTop: 24 }} />
      <div style={{ fontFamily: fonts.mono, fontSize: 20, color: "#8fd3a8", marginTop: 22, opacity: sub, letterSpacing: 3 }}>
        MATHEMATIK • KRYPTOGRAFIE • BILDUNG
      </div>
    </AbsoluteFill>
  );
};