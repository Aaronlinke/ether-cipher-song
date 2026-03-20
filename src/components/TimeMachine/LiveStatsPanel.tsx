import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Database, TrendingUp, Activity, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface DbStats {
  totalCandidates: number;
  avgScore: number;
  bestScore: number;
  bestHex: string;
  byPuzzle: Record<number, number>;
  avgEntropy: number;
  recentCount: number;
}

export function LiveStatsPanel() {
  const [stats, setStats] = useState<DbStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Total count
      const { count } = await supabase
        .from('batch_candidates')
        .select('*', { count: 'exact', head: true });

      // Best candidate
      const { data: best } = await supabase
        .from('batch_candidates')
        .select('hex_key, score, entropy, puzzle_number')
        .order('score', { ascending: false })
        .limit(1);

      // Recent (last hour)
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      const { count: recentCount } = await supabase
        .from('batch_candidates')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneHourAgo);

      // All for aggregation
      const { data: all } = await supabase
        .from('batch_candidates')
        .select('score, entropy, puzzle_number')
        .limit(1000);

      const byPuzzle: Record<number, number> = {};
      let totalScore = 0;
      let totalEntropy = 0;

      (all || []).forEach(row => {
        byPuzzle[row.puzzle_number] = (byPuzzle[row.puzzle_number] || 0) + 1;
        totalScore += Number(row.score);
        totalEntropy += Number(row.entropy);
      });

      const len = all?.length || 1;

      setStats({
        totalCandidates: count || 0,
        avgScore: totalScore / len,
        bestScore: best?.[0] ? Number(best[0].score) : 0,
        bestHex: best?.[0]?.hex_key || '-',
        byPuzzle,
        avgEntropy: totalEntropy / len,
        recentCount: recentCount || 0,
      });
      setLastUpdate(new Date());
    } catch (e) {
      console.error('Stats fetch error:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="border-crypto-purple/30 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-crypto-purple" />
          Live Statistik Dashboard
          <Badge variant="outline" className="ml-auto text-xs border-crypto-purple/40">
            Modul 29
          </Badge>
          <Button onClick={fetchStats} size="sm" variant="ghost" disabled={loading} className="h-6 w-6 p-0">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!stats ? (
          <div className="text-center text-muted-foreground text-sm py-8">Lade Statistiken...</div>
        ) : (
          <>
            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                icon={<Database className="w-4 h-4" />}
                label="Gesamt"
                value={stats.totalCandidates.toLocaleString()}
                color="text-foreground"
              />
              <StatCard
                icon={<TrendingUp className="w-4 h-4" />}
                label="Best Score"
                value={stats.bestScore.toFixed(2)}
                color="text-crypto-purple"
              />
              <StatCard
                icon={<Activity className="w-4 h-4" />}
                label="Ø Score"
                value={stats.avgScore.toFixed(3)}
                color="text-foreground"
              />
              <StatCard
                icon={<Activity className="w-4 h-4" />}
                label="Letzte Stunde"
                value={stats.recentCount.toLocaleString()}
                color="text-green-400"
              />
            </div>

            {/* Best Candidate */}
            {stats.bestHex !== '-' && (
              <div className="bg-muted/30 rounded p-3">
                <div className="text-xs text-muted-foreground mb-1">🏆 Bester Kandidat</div>
                <div className="font-mono text-sm text-crypto-purple break-all">{stats.bestHex}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Score: {stats.bestScore.toFixed(2)} • Ø Entropy: {stats.avgEntropy.toFixed(3)}
                </div>
              </div>
            )}

            {/* By Puzzle */}
            {Object.keys(stats.byPuzzle).length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-2">Verteilung nach Puzzle</div>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(stats.byPuzzle).sort(([a], [b]) => Number(a) - Number(b)).map(([puzzle, count]) => (
                    <div key={puzzle} className="bg-muted/30 rounded px-3 py-1.5 text-center">
                      <div className="text-xs text-muted-foreground">#{puzzle}</div>
                      <div className="text-sm font-mono font-bold text-foreground">{count}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Last Update */}
            {lastUpdate && (
              <div className="text-xs text-muted-foreground text-right">
                Aktualisiert: {lastUpdate.toLocaleTimeString()} • Auto-Refresh: 30s
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-muted/30 rounded p-3 text-center">
      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">{icon}</div>
      <div className={`text-xl font-mono font-bold ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
