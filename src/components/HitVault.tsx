import { useEffect, useState } from 'react';
import { CryptoPanel } from './CryptoPanel';
import { Database, Copy, ExternalLink, Trash2 } from 'lucide-react';
import { listHits, subscribeHits, type Hit } from '@/lib/hit-vault';
import { emit } from '@/lib/pipeline-bus';
import { Send } from 'lucide-react';
import { toast } from 'sonner';

export function HitVault() {
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    listHits(100)
      .then(setHits)
      .catch((e) => toast.error('Hit-Vault laden fehlgeschlagen: ' + e.message))
      .finally(() => setLoading(false));
    const unsub = subscribeHits((h) => {
      setHits((prev) => [h, ...prev].slice(0, 100));
      toast.success(`🔔 Neuer Hit im Vault: ${h.source}`);
    });
    return unsub;
  }, []);

  const filtered = filter
    ? hits.filter((h) =>
        [h.source, h.bot, h.address, h.private_key, h.note, String(h.puzzle ?? '')]
          .filter(Boolean)
          .some((x) => String(x).toLowerCase().includes(filter.toLowerCase()))
      )
    : hits;

  const copy = (s: string) => {
    navigator.clipboard.writeText(s);
    toast.success('In Zwischenablage kopiert');
  };

  return (
    <CryptoPanel title="Hit-Vault · Persistente Fund-Datenbank" icon={<Database className="w-4 h-4" />} glowColor="green">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {loading ? 'Lade...' : `${hits.length} Einträge`} · Live-Sync aktiv
          </span>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter: Adresse, Bot, Puzzle #, Note..."
            className="flex-1 min-w-[180px] bg-background/60 border border-border/30 rounded px-2 py-1 text-xs font-mono"
          />
        </div>

        {filtered.length === 0 && !loading && (
          <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-border/30 rounded">
            Noch keine Hits gespeichert. Sobald ein Bot / Miner / SVRC-Forge einen Treffer landet, erscheint er hier live — für alle sichtbar.
          </div>
        )}

        <div className="space-y-2 max-h-[420px] overflow-y-auto">
          {filtered.map((h) => (
            <div key={h.id} className="border border-border/30 rounded p-2 bg-background/40 hover:border-crypto-green/40 transition-colors">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-crypto-green/10 text-crypto-green uppercase tracking-wider">
                  {h.source}
                </span>
                {h.puzzle && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-crypto-gold/10 text-crypto-gold">
                    Puzzle #{h.puzzle}
                  </span>
                )}
                {h.bot && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-crypto-purple/10 text-crypto-purple">
                    Bot {h.bot}
                  </span>
                )}
                {h.bits != null && (
                  <span className="text-[9px] text-muted-foreground">{h.bits} bit</span>
                )}
                {h.balance_sats != null && h.balance_sats > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-crypto-orange/20 text-crypto-orange font-bold">
                    💰 {(h.balance_sats / 1e8).toFixed(8)} BTC
                  </span>
                )}
                <span className="ml-auto text-[9px] text-muted-foreground">
                  {new Date(h.created_at).toLocaleString()}
                </span>
              </div>
              <div className="grid gap-1 text-[10px] font-mono">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground w-14 shrink-0">addr:</span>
                  <span className="text-crypto-gold break-all">{h.address}</span>
                  <button onClick={() => copy(h.address)} className="ml-auto shrink-0 opacity-60 hover:opacity-100">
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => emit({ kind: 'address', value: h.address, source: 'Vault', target: 'universal' })}
                    className="shrink-0 opacity-60 hover:opacity-100"
                    title="An Pipeline senden"
                  >
                    <Send className="w-3 h-3" />
                  </button>
                  <a
                    href={`https://mempool.space/address/${h.address}`}
                    target="_blank" rel="noreferrer"
                    className="shrink-0 opacity-60 hover:opacity-100"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground w-14 shrink-0">priv:</span>
                  <span className="text-crypto-green break-all">{h.private_key}</span>
                  <button onClick={() => copy(h.private_key)} className="ml-auto shrink-0 opacity-60 hover:opacity-100">
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => emit({ kind: 'key', value: h.private_key, source: 'Vault', target: 'universal' })}
                    className="shrink-0 opacity-60 hover:opacity-100"
                    title="An Pipeline senden"
                  >
                    <Send className="w-3 h-3" />
                  </button>
                </div>
                {h.target_address && (
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground w-14 shrink-0">target:</span>
                    <span className="text-crypto-blue break-all">{h.target_address}</span>
                  </div>
                )}
                {h.note && (
                  <div className="text-muted-foreground text-[9px] italic">{h.note}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </CryptoPanel>
  );
}