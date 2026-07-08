import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useMemo } from "react";

const CHARS = "01ABCDEF7f9a3c2Ⲟ⟁∇⊗⚡₿ΞΩλψ";

export const MatrixRain: React.FC = () => {
  const frame = useCurrentFrame();
  const cols = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 60; i++) {
      arr.push({
        x: (i / 60) * 100,
        speed: 0.6 + ((i * 37) % 100) / 100 * 1.4,
        offset: (i * 91) % 100,
        len: 6 + ((i * 13) % 12),
        seed: i * 7,
      });
    }
    return arr;
  }, []);
  return (
    <AbsoluteFill style={{ overflow: "hidden", opacity: 0.55 }}>
      {cols.map((c, i) => {
        const y = ((frame * c.speed + c.offset) % 130) - 20;
        return (
          <div key={i} style={{ position: "absolute", left: `${c.x}%`, top: `${y}%`, fontFamily: "monospace", fontSize: 18, lineHeight: 1.1, color: "#00ff88", textShadow: "0 0 8px #00ff88" }}>
            {Array.from({ length: c.len }).map((_, j) => (
              <div key={j} style={{ opacity: 1 - j / c.len, color: j === 0 ? "#eafff2" : undefined }}>
                {CHARS[(c.seed + j + Math.floor(frame / 3)) % CHARS.length]}
              </div>
            ))}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};