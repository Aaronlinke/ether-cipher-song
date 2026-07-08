import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { fonts } from "../MainVideo";

export const Panel: React.FC<{ children: React.ReactNode; title: string; accent?: string; delay?: number }> = ({ children, title, accent = "#00ff88", delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 180 } });
  const y = interpolate(s, [0, 1], [40, 0]);
  return (
    <div style={{
      opacity: s, transform: `translateY(${y}px)`,
      background: "rgba(8,14,18,0.85)", border: `1px solid ${accent}55`, borderRadius: 6,
      boxShadow: `0 0 40px ${accent}22, inset 0 0 20px ${accent}11`, padding: 24,
      backdropFilter: "none",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, borderBottom: `1px solid ${accent}33`, paddingBottom: 10 }}>
        <div style={{ width: 10, height: 10, borderRadius: 999, background: accent, boxShadow: `0 0 10px ${accent}` }} />
        <div style={{ fontFamily: fonts.display, fontSize: 14, letterSpacing: 3, color: accent, textTransform: "uppercase" }}>{title}</div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: 999, background: "#ff445533" }} />
          <div style={{ width: 8, height: 8, borderRadius: 999, background: "#ffaa0033" }} />
          <div style={{ width: 8, height: 8, borderRadius: 999, background: "#00ff8833" }} />
        </div>
      </div>
      {children}
    </div>
  );
};

export const HUD: React.FC<{ label: string }> = ({ label }) => {
  const frame = useCurrentFrame();
  const dots = ".".repeat((Math.floor(frame / 6) % 4));
  return (
    <div style={{ position: "absolute", top: 40, left: 60, fontFamily: fonts.mono, fontSize: 14, color: "#00ff88aa", letterSpacing: 2 }}>
      ▶ {label}{dots}
    </div>
  );
};

export const Corner: React.FC = () => (
  <div style={{ position: "absolute", top: 40, right: 60, fontFamily: fonts.mono, fontSize: 12, color: "#00ff8888", textAlign: "right", lineHeight: 1.6 }}>
    <div>PROJECT OMEGA v6.0</div>
    <div style={{ color: "#00ff88" }}>● SECURE • LOCAL • BROWSER</div>
  </div>
);