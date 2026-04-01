import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { KaTeXRenderer } from './KaTeXRenderer';
import { ArrowRight, Play, RotateCcw, CheckCircle2, Loader2 } from 'lucide-react';

type PipelineStage = 'idle' | 'edhi' | 'pfe' | 'sor' | 'uae' | 'complete';

interface StageResult {
  status: 'pending' | 'running' | 'done';
  output: string;
  metric: number;
  detail: string;
}

interface PipelineState {
  stage: PipelineStage;
  hashInput: string;
  results: {
    edhi: StageResult;
    pfe: StageResult;
    sor: StageResult;
    uae: StageResult;
  };
}

const STAGE_INFO = {
  edhi: { label: 'EDHI', color: '#f59e0b', desc: 'Hash-Inversion via FV-Feldgleichung', icon: '⚡' },
  pfe: { label: 'PFE', color: '#8b5cf6', desc: 'Primfeld-Resonanz & Windungsindex', icon: '🌊' },
  sor: { label: 'SOR', color: '#ef4444', desc: 'Nonce-Extraktion & Signatur-Rewriting', icon: '🛡' },
  uae: { label: 'UAE', color: '#3b82f6', desc: 'Symmetrische Cipher-Dekonstruktion', icon: '🔒' },
} as const;

const INITIAL_RESULT: StageResult = { status: 'pending', output: '', metric: 0, detail: '' };

export function UTASPipelineConnector() {
  const [state, setState] = useState<PipelineState>({
    stage: 'idle',
    hashInput: 'e3b0c44298fc1c149afbf4c8996fb924',
    results: { edhi: { ...INITIAL_RESULT }, pfe: { ...INITIAL_RESULT }, sor: { ...INITIAL_RESULT }, uae: { ...INITIAL_RESULT } },
  });

  const runPipeline = useCallback(() => {
    const stages: (keyof typeof STAGE_INFO)[] = ['edhi', 'pfe', 'sor', 'uae'];
    let stageIdx = 0;

    setState(prev => ({
      ...prev,
      stage: 'edhi',
      results: {
        edhi: { ...INITIAL_RESULT, status: 'running' },
        pfe: { ...INITIAL_RESULT },
        sor: { ...INITIAL_RESULT },
        uae: { ...INITIAL_RESULT },
      },
    }));

    const randHex = (len: number) => Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    const advanceStage = () => {
      const currentStage = stages[stageIdx];

      // Simulate computation for current stage
      setTimeout(() => {
        let output = '';
        let metric = 0;
        let detail = '';

        switch (currentStage) {
          case 'edhi':
            output = randHex(32);
            metric = 0.72 + Math.random() * 0.25;
            detail = `∮∇_HFV Φ(t) dt = ${(Math.random() * 2 - 1).toFixed(4)} | Res(𝒦) = ${(Math.random() * 0.5).toFixed(4)}`;
            break;
          case 'pfe':
            output = randHex(16);
            metric = 0.65 + Math.random() * 0.3;
            detail = `Windungsindex k = ${Math.floor(Math.random() * 1000)} | Torsion ∫ = ${(Math.random() * 3.14).toFixed(4)}`;
            break;
          case 'sor':
            output = `r'=${randHex(16)} s'=${randHex(16)}`;
            metric = 0.55 + Math.random() * 0.4;
            detail = `Ψ(CPU,t) Kohärenz = ${(0.7 + Math.random() * 0.3).toFixed(3)} | Nonce-Bits: ${randHex(8)}`;
            break;
          case 'uae':
            output = randHex(64);
            metric = 0.6 + Math.random() * 0.35;
            detail = `ERL-Pfade: ${Math.floor(Math.random() * 500 + 100)} | K-Singularität: ${randHex(8)}`;
            break;
        }

        setState(prev => {
          const newResults = { ...prev.results };
          newResults[currentStage] = { status: 'done', output, metric, detail };

          stageIdx++;
          const nextStage = stages[stageIdx];
          if (nextStage) {
            newResults[nextStage] = { ...INITIAL_RESULT, status: 'running' };
          }

          return {
            ...prev,
            stage: nextStage || 'complete',
            results: newResults,
          };
        });

        if (stageIdx < stages.length) {
          advanceStage();
        }
      }, 1200 + Math.random() * 800);
    };

    advanceStage();
  }, []);

  const reset = () => {
    setState({
      stage: 'idle',
      hashInput: state.hashInput,
      results: { edhi: { ...INITIAL_RESULT }, pfe: { ...INITIAL_RESULT }, sor: { ...INITIAL_RESULT }, uae: { ...INITIAL_RESULT } },
    });
  };

  const isRunning = state.stage !== 'idle' && state.stage !== 'complete';
  const stageProgress = { idle: 0, edhi: 25, pfe: 50, sor: 75, uae: 90, complete: 100 };

  return (
    <Card className="border-border/30 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <ArrowRight className="w-5 h-5 text-crypto-gold" />
          <span className="text-crypto-gold">UTAS</span> Pipeline — Dekonstruktions-Kette
        </CardTitle>
        <div className="mt-2 bg-background/60 border border-border/20 rounded p-2">
          <KaTeXRenderer
            latex="\\mathcal{F}_{in} \\xrightarrow{\\hat{E}} \\mathcal{F}_{hash} \\xrightarrow{\\hat{P}} k_{ECC} \\xrightarrow{\\hat{S}} (r',s') \\xrightarrow{\\hat{U}} \\mathcal{F}_{plain}"
            displayMode
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input */}
        <div>
          <label className="text-[9px] text-muted-foreground uppercase tracking-wider">Target Hash (EDHI-Input)</label>
          <Input
            value={state.hashInput}
            onChange={(e) => setState(prev => ({ ...prev, hashInput: e.target.value }))}
            className="mt-1 bg-background/60 border-border/30 text-xs h-8 font-mono"
            disabled={isRunning}
          />
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <Button size="sm" onClick={runPipeline} disabled={isRunning} className="flex-1">
            <Play className="w-3 h-3 mr-1" /> Pipeline starten
          </Button>
          <Button size="sm" variant="ghost" onClick={reset} disabled={isRunning}>
            <RotateCcw className="w-3 h-3" />
          </Button>
        </div>

        {/* Progress */}
        {state.stage !== 'idle' && (
          <Progress value={stageProgress[state.stage]} className="h-1.5" />
        )}

        {/* Pipeline stages */}
        <div className="space-y-2">
          {(Object.keys(STAGE_INFO) as (keyof typeof STAGE_INFO)[]).map((key, idx) => {
            const info = STAGE_INFO[key];
            const result = state.results[key];
            const isActive = result.status === 'running';
            const isDone = result.status === 'done';

            return (
              <div
                key={key}
                className={`border rounded-lg p-3 transition-all duration-300 ${
                  isActive ? 'border-border/60 bg-card/60 shadow-sm' :
                  isDone ? 'border-border/40 bg-background/40' :
                  'border-border/20 bg-background/20 opacity-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{info.icon}</span>
                  <span className="text-[11px] font-semibold" style={{ color: info.color }}>{info.label}</span>
                  <span className="text-[9px] text-muted-foreground flex-1">{info.desc}</span>
                  {isActive && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                  {isDone && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                </div>

                {isDone && (
                  <div className="mt-2 space-y-1 animate-in fade-in duration-300">
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] text-muted-foreground">Score:</span>
                      <div className="flex-1 h-1 bg-muted rounded-full">
                        <div className="h-full rounded-full" style={{ width: `${result.metric * 100}%`, backgroundColor: info.color }} />
                      </div>
                      <span className="text-[9px] font-mono" style={{ color: info.color }}>{(result.metric * 100).toFixed(1)}%</span>
                    </div>
                    <code className="block text-[8px] text-muted-foreground font-mono break-all">{result.detail}</code>
                    <code className="block text-[9px] font-mono break-all" style={{ color: info.color }}>→ {result.output}</code>
                    {idx < 3 && (
                      <div className="text-center text-muted-foreground text-[10px]">
                        ↓ Output → nächster Operator
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Final result */}
        {state.stage === 'complete' && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 animate-in fade-in duration-500">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-400">Pipeline komplett</span>
            </div>
            <div className="text-[9px] text-muted-foreground space-y-1 font-mono">
              <div>EDHI → PFE: Hash-Inversion → Primfeld-Mapping</div>
              <div>PFE → SOR: ECC-Windungsindex → Nonce-Extraktion</div>
              <div>SOR → UAE: Signatur → Symmetrische Dekonstruktion</div>
            </div>
            <div className="mt-2 text-[9px] text-muted-foreground">
              Gesamt-Kohärenz:{' '}
              <span className="text-emerald-400 font-semibold">
                {(Object.values(state.results).reduce((s, r) => s + r.metric, 0) / 4 * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
