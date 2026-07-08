import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { fonts } from "../MainVideo";
import { Panel, HUD, Corner } from "./_shared";

const FILES = ["index.html", "app.jsx", "main.py", "utils.ts", "styles.css", "README.md"];
const LOG = [
  "[zip] entpacke archive.zip …",
  "[scan] 6 Dateien erkannt",
  "[fix] smart-quotes → normalisiert",
  "[fix] CRLF → LF",
  "[babel] transpiliere app.jsx (JSX+TS)",
  "[pyodide] lade Python-Runtime …",
  "[✓] Sandbox bereit • rendere iframe",
];

export const SceneZipRunner: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ padding: 100 }}>
      <HUD label="TEST 04 › ZipRunner + Auto-Fix" />
      <Corner />
      <div style={{ height: 60 }} />
      <div style={{ fontFamily: fonts.display, fontSize: 64, color: "#b16dff", letterSpacing: 4, textShadow: "0 0 30px #b16dff88" }}>
        ZIP RUNNER
      </div>
      <div style={{ fontFamily: fonts.mono, color: "#8fd3a8", marginBottom: 24 }}>
        ZIP hochladen › Auto-Fix › Babel + Pyodide › Live-Sandbox
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24 }}>
        <Panel title="Archive" accent="#b16dff" delay={8}>
          <div style={{ fontFamily: fonts.mono, fontSize: 20, lineHeight: 1.9 }}>
            {FILES.map((f, i) => {
              const op = interpolate(frame, [15 + i * 5, 22 + i * 5], [0, 1], { extrapolateRight: "clamp" });
              return <div key={f} style={{ opacity: op, color: "#eafff2" }}>▸ {f}</div>;
            })}
          </div>
        </Panel>
        <Panel title="Console" accent="#b16dff" delay={14}>
          <div style={{ fontFamily: fonts.mono, fontSize: 18, lineHeight: 1.8, background: "#020608", padding: 16, minHeight: 260 }}>
            {LOG.map((l, i) => {
              const op = interpolate(frame, [22 + i * 7, 30 + i * 7], [0, 1], { extrapolateRight: "clamp" });
              const clr = l.includes("✓") ? "#00ff88" : l.includes("fix") ? "#f5c518" : "#8fd3a8";
              return <div key={i} style={{ opacity: op, color: clr }}>{l}</div>;
            })}
          </div>
        </Panel>
      </div>
    </AbsoluteFill>
  );
};