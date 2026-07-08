import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { loadFont as loadDisplay } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { MatrixRain } from "./scenes/MatrixRain";
import { SceneIntro } from "./scenes/SceneIntro";
import { SceneUniversalCalc } from "./scenes/SceneUniversalCalc";
import { SceneSwarm } from "./scenes/SceneSwarm";
import { ScenePuzzle } from "./scenes/ScenePuzzle";
import { SceneZipRunner } from "./scenes/SceneZipRunner";
import { SceneModulesGrid } from "./scenes/SceneModulesGrid";
import { SceneOutro } from "./scenes/SceneOutro";

const display = loadDisplay("normal", { weights: ["700", "900"], subsets: ["latin"] }).fontFamily;
const mono = loadMono("normal", { weights: ["400", "700"], subsets: ["latin"] }).fontFamily;

export const fonts = { display, mono };

export const MainVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const vign = interpolate(frame, [0, 60, durationInFrames - 60, durationInFrames], [0.4, 0.7, 0.7, 0.4]);
  return (
    <AbsoluteFill style={{ background: "#05070a", fontFamily: mono, color: "#e8f5e8" }}>
      <MatrixRain />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={90}>
          <SceneIntro />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={springTiming({ config: { damping: 200 }, durationInFrames: 18 })} />
        <TransitionSeries.Sequence durationInFrames={90}>
          <SceneUniversalCalc />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-left" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })} />
        <TransitionSeries.Sequence durationInFrames={90}>
          <SceneSwarm />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-top-right" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })} />
        <TransitionSeries.Sequence durationInFrames={90}>
          <ScenePuzzle />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={springTiming({ config: { damping: 200 }, durationInFrames: 18 })} />
        <TransitionSeries.Sequence durationInFrames={90}>
          <SceneZipRunner />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-bottom" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })} />
        <TransitionSeries.Sequence durationInFrames={90}>
          <SceneModulesGrid />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={springTiming({ config: { damping: 200 }, durationInFrames: 22 })} />
        <TransitionSeries.Sequence durationInFrames={90}>
          <SceneOutro />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <AbsoluteFill style={{ pointerEvents: "none", background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${vign}) 100%)` }} />
      <AbsoluteFill style={{ pointerEvents: "none", background: "repeating-linear-gradient(to bottom, rgba(0,255,120,0.03) 0px, rgba(0,255,120,0.03) 1px, transparent 2px, transparent 4px)" }} />
    </AbsoluteFill>
  );
};