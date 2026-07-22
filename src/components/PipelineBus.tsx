import { useEffect, useState } from 'react';
import {
  emit, subscribe, getHistory, clearHistory,
  type PipelinePayload, type PipelineTarget,
} from '@/lib/pipeline-bus';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GitBranch, Send, Trash2, X, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { toast } from 'sonner';

const TARGET_LABEL: Record<Exclude<PipelineTarget, 'any'>, string> = {
  universal: 'Universal',
  bruteforce: 'BruteForce',
  svrc: 'SVRC',
  megasolver: 'MegaSolver',
  vault: 'Vault',
};

export function PipelineBus() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [items, setItems] = useState<PipelinePayload[]>(getHistory());

  useEffect(() => {
    return subscribe(() => setItems(getHistory()));
  }, []);

  const send = (p: PipelinePayload, to: Exclude<PipelineTarget, 'any'>) => {
    emit({ kind: p.kind, value: p.value, source: `bus→${TARGET_LABEL[to]}`, target: to, meta: p.meta });
    toast.success(`→ ${TARGET_LABEL[to]}`);
  };

  const unread = items.length;

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-crypto-purple/60 bg-black/80 px-4 py-2 text-crypto-purple shadow-lg backdrop-blur hover:bg-crypto-purple/20"
        aria-label="Pipeline-Bus öffnen"
      >
        <GitBranch className="h-4 w-4" />
        <span className="text-xs font-mono">PIPELINE</span>
        {unread > 0 && (
          <Badge className="bg-crypto-gold text-black text-[10px] h-4 min-w-4 px-1">{unread}</Badge>
        )}
      </button>

      {open && (
        <div className="fixed bottom-16 right-4 z-40 w-[min(420px,calc(100vw-2rem))] rounded-lg border border-crypto-purple/40 bg-black/95 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between border-b border-crypto-purple/30 px-3 py-2">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-crypto-purple" />
              <span className="font-mono text-sm text-crypto-purple">Pipeline-Bus</span>
              <Badge variant="outline" className="text-[10px] border-crypto-purple/40 text-crypto-purple/80">
                {items.length}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setCollapsed(!collapsed)}>
                {collapsed ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { clearHistory(); setItems([]); }}>
                <Trash2 className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setOpen(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {!collapsed && (
            <ScrollArea className="h-[360px]">
              <div className="p-2 space-y-2">
                {items.length === 0 && (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    Noch keine Payloads.<br />
                    Module können via <code className="text-crypto-gold">emit()</code> hierher senden.
                  </div>
                )}
                {items.map((p) => (
                  <div key={p.id} className="rounded border border-crypto-purple/20 bg-black/60 p-2">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[9px] border-crypto-gold/40 text-crypto-gold h-4 px-1">
                          {p.kind}
                        </Badge>
                        <span className="truncate max-w-[120px]">{p.source}</span>
                      </div>
                      <span>{new Date(p.ts).toLocaleTimeString()}</span>
                    </div>
                    <div className="font-mono text-[11px] text-crypto-green break-all mb-2">
                      {p.value.length > 100 ? p.value.slice(0, 100) + '…' : p.value}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Button
                        size="sm" variant="ghost"
                        className="h-6 px-2 text-[10px]"
                        onClick={() => { navigator.clipboard.writeText(p.value); toast.success('Kopiert'); }}
                      >
                        <Copy className="h-3 w-3 mr-1" />Copy
                      </Button>
                      {(Object.keys(TARGET_LABEL) as Array<keyof typeof TARGET_LABEL>).map((t) => (
                        <Button
                          key={t}
                          size="sm" variant="ghost"
                          className="h-6 px-2 text-[10px] text-crypto-purple hover:bg-crypto-purple/20"
                          onClick={() => send(p, t)}
                        >
                          <Send className="h-3 w-3 mr-1" />{TARGET_LABEL[t]}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      )}
    </>
  );
}