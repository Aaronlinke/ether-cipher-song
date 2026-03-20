import { useState, useCallback, useEffect, useRef } from 'react';
import { Radio, Play, Pause, RotateCcw, Zap, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';

// ═══════════════════════════════════════════════════════════════════════════
// 2D-FFT FREQUENZANALYZER für SRIL-Daten
// Detektiert Periodizitäten in H, N, G Trajektorien
// ═══════════════════════════════════════════════════════════════════════════

const SRIL = {
  alpha: 0.245, beta: 0.152, gamma: 0.985, delta: 0.112, eta: 0.088
};

const UR = { H: -4.256, N: 5.824, G: 1.952 };

interface FreqBin {
  freq: number;
  magnitudeH: number;
  magnitudeN: number;
  magnitudeG: number;
  phase: number;
}

// Diskrete Fourier-Transformation (DFT)
const computeDFT = (signal: number[]): { magnitude: number[]; phase: number[] } => {
  const N = signal.length;
  const magnitude: number[] = [];
  const phase: number[] = [];

  for (let k = 0; k < Math.floor(N / 2); k++) {
    let re = 0, im = 0;
    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * k * n) / N;
      re += signal[n] * Math.cos(angle);
      im -= signal[n] * Math.sin(angle);
    }
    magnitude.push(Math.sqrt(re * re + im * im) / N);
    phase.push(Math.atan2(im, re));
  }
  return { magnitude, phase };
};

// Autokorrelation für Periodizitätsdetektion
const autoCorrelate = (signal: number[]): number[] => {
  const N = signal.length;
  const mean = signal.reduce((a, b) => a + b, 0) / N;
  const centered = signal.map(v => v - mean);
  const result: number[] = [];

  for (let lag = 0; lag < Math.floor(N / 2); lag++) {
    let sum = 0, norm = 0;
    for (let i = 0; i < N - lag; i++) {
      sum += centered[i] * centered[i + lag];
      norm += centered[i] * centered[i];
    }
    result.push(norm > 0 ? sum / norm : 0);
  }
  return result;
};

// Finde dominante Frequenzen
const findPeaks = (magnitudes: number[], threshold: number = 0.1): number[] => {
  const peaks: number[] = [];
  for (let i = 1; i < magnitudes.length - 1; i++) {
    if (magnitudes[i] > magnitudes[i - 1] && magnitudes[i] > magnitudes[i + 1] && magnitudes[i] > threshold) {
      peaks.push(i);
    }
  }
  return peaks;
};

export function FrequencyAnalyzer() {
  const [samples, setSamples] = useState(256);
  const [historyH, setHistoryH] = useState<number[]>([]);
  const [historyN, setHistoryN] = useState<number[]>([]);
  const [historyG, setHistoryG] = useState<number[]>([]);
  const [freqData, setFreqData] = useState<FreqBin[]>([]);
  const [autoCorr, setAutoCorr] = useState<{ lag: number; r: number }[]>([]);
  const [dominantFreqs, setDominantFreqs] = useState<{ variable: string; freqs: number[] }[]>([]);
  const [isCollecting, setIsCollecting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const log = useCallback((msg: string) => {
    setLogs(prev => [...prev.slice(-50), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  // Sammle SRIL-Daten
  const collectData = useCallback(() => {
    setIsCollecting(true);
    setFreqData([]);
    setAutoCorr([]);
    setDominantFreqs([]);
    log(`Sammle ${samples} SRIL-Iterationen...`);

    let state = { ...UR };
    const hArr: number[] = [];
    const nArr: number[] = [];
    const gArr: number[] = [];

    for (let i = 0; i < samples; i++) {
      hArr.push(state.H);
      nArr.push(state.N);
      gArr.push(state.G);

      const H1 = state.H + SRIL.alpha * state.N - SRIL.beta * state.G;
      const N1 = SRIL.gamma * state.N + SRIL.delta * Math.abs(state.H);
      const G1 = state.G + SRIL.eta * (H1 + N1);
      state = { H: H1, N: N1, G: G1 };
    }

    setHistoryH(hArr);
    setHistoryN(nArr);
    setHistoryG(gArr);
    setProgress(50);
    log(`Daten gesammelt. Starte FFT-Analyse...`);

    // DFT berechnen
    const fftH = computeDFT(hArr);
    const fftN = computeDFT(nArr);
    const fftG = computeDFT(gArr);

    const bins: FreqBin[] = fftH.magnitude.map((_, i) => ({
      freq: i,
      magnitudeH: fftH.magnitude[i],
      magnitudeN: fftN.magnitude[i],
      magnitudeG: fftG.magnitude[i],
      phase: fftH.phase[i]
    }));

    setFreqData(bins);

    // Autokorrelation (nur H als Beispiel)
    const acH = autoCorrelate(hArr);
    setAutoCorr(acH.map((r, lag) => ({ lag, r })));

    // Dominante Frequenzen
    const peaksH = findPeaks(fftH.magnitude);
    const peaksN = findPeaks(fftN.magnitude);
    const peaksG = findPeaks(fftG.magnitude);

    setDominantFreqs([
      { variable: 'H (Enthalpie)', freqs: peaksH },
      { variable: 'N (Navigation)', freqs: peaksN },
      { variable: 'G (Geometrie)', freqs: peaksG },
    ]);

    setProgress(100);
    setIsCollecting(false);

    log(`FFT abgeschlossen: ${bins.length} Frequenzbins`);
    log(`Dominante Frequenzen H: [${peaksH.join(', ')}]`);
    log(`Dominante Frequenzen N: [${peaksN.join(', ')}]`);
    log(`Dominante Frequenzen G: [${peaksG.join(', ')}]`);

    if (peaksH.length === 0 && peaksN.length === 0 && peaksG.length === 0) {
      log('⚠ Keine dominanten Frequenzen → System divergiert aperiodisch (chaotisch)');
    } else {
      log('✓ Periodische Strukturen gefunden → Vorhersagbare Muster möglich');
    }
  }, [samples, log]);

  const timeSeriesData = historyH.slice(0, 200).map((h, i) => ({
    t: i,
    H: parseFloat(h.toFixed(3)),
    N: parseFloat((historyN[i] || 0).toFixed(3)),
    G: parseFloat((historyG[i] || 0).toFixed(3)),
  }));

  return (
    <Card className="border-crypto-purple/30 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-crypto-purple">
              <Radio className="w-5 h-5" />
              Frequenz-Analyzer
            </CardTitle>
            <CardDescription className="font-mono text-xs mt-1">
              DFT/FFT • Autokorrelation • Periodizitäts-Detektion
            </CardDescription>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {samples} Samples
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label className="text-xs">Samples: {samples}</Label>
            <Slider
              value={[samples]}
              onValueChange={([v]) => setSamples(v)}
              min={64} max={1024} step={64}
              className="mt-1"
            />
          </div>
          <Button size="sm" onClick={collectData} disabled={isCollecting} className="text-xs">
            <BarChart3 className="w-3 h-3 mr-1" />
            Analyse starten
          </Button>
        </div>

        {progress > 0 && progress < 100 && (
          <div>
            <div className="text-[10px] text-muted-foreground mb-1">Fortschritt...</div>
            <div className="h-1 bg-muted rounded overflow-hidden">
              <div className="h-full bg-crypto-purple transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Zeitserie */}
        {timeSeriesData.length > 0 && (
          <div>
            <div className="text-[10px] text-muted-foreground mb-1">Zeitserie H, N, G</div>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="t" stroke="#666" fontSize={9} />
                  <YAxis stroke="#666" fontSize={9} />
                  <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #333', fontSize: 10 }} />
                  <Line type="monotone" dataKey="H" stroke="#ef4444" strokeWidth={1} dot={false} />
                  <Line type="monotone" dataKey="N" stroke="#3b82f6" strokeWidth={1} dot={false} />
                  <Line type="monotone" dataKey="G" stroke="#22c55e" strokeWidth={1} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Frequenzspektrum */}
        {freqData.length > 0 && (
          <div>
            <div className="text-[10px] text-muted-foreground mb-1">Frequenzspektrum (Magnitude)</div>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={freqData.slice(1, 64)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="freq" stroke="#666" fontSize={9} />
                  <YAxis stroke="#666" fontSize={9} />
                  <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #333', fontSize: 10 }} />
                  <Bar dataKey="magnitudeH" fill="#ef4444" fillOpacity={0.7} />
                  <Bar dataKey="magnitudeN" fill="#3b82f6" fillOpacity={0.7} />
                  <Bar dataKey="magnitudeG" fill="#22c55e" fillOpacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Autokorrelation */}
        {autoCorr.length > 0 && (
          <div>
            <div className="text-[10px] text-muted-foreground mb-1">Autokorrelation R(τ) von H</div>
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={autoCorr.slice(0, 64)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="lag" stroke="#666" fontSize={9} />
                  <YAxis stroke="#666" fontSize={9} domain={[-1, 1]} />
                  <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #333', fontSize: 10 }} />
                  <Area type="monotone" dataKey="r" stroke="#a855f7" fill="#a855f7" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Dominante Frequenzen */}
        {dominantFreqs.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] text-muted-foreground">Dominante Frequenzen:</div>
            {dominantFreqs.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] font-mono">
                <span className={i === 0 ? 'text-red-400' : i === 1 ? 'text-blue-400' : 'text-green-400'}>
                  {d.variable}:
                </span>
                <span className="text-foreground">
                  {d.freqs.length > 0 ? `f = [${d.freqs.join(', ')}]` : 'aperiodisch'}
                </span>
                {d.freqs.length > 0 && (
                  <Badge variant="outline" className="text-[9px] h-4">
                    T ≈ {d.freqs[0] > 0 ? Math.round(samples / d.freqs[0]) : '∞'}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Mathematische Formeln */}
        <div className="p-2 bg-muted/20 rounded text-[9px] font-mono space-y-0.5 text-muted-foreground">
          <div>X(k) = Σ x(n)·e^(-j·2π·k·n/N), k = 0,...,N/2-1</div>
          <div>R(τ) = Σ (x(t) - μ)(x(t+τ) - μ) / σ²</div>
          <div>Periodizität: T = N / f_dominant</div>
        </div>

        {/* Log */}
        <ScrollArea className="h-20 rounded border border-muted bg-black/30">
          <div className="p-2 space-y-0.5">
            {logs.map((l, i) => (
              <div key={i} className="font-mono text-[9px] text-green-400/80">{l}</div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
