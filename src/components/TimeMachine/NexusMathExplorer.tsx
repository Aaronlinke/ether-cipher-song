import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, BookOpen, ChevronDown, ChevronRight, Sparkles, Download } from 'lucide-react';
import { NEXUS_CATEGORIES, searchFormulas, getTotalFormulaCount, type Formula, type FormulaCategory } from '@/lib/nexus-formulas';

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  intermediate: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  advanced: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  expert: 'bg-red-500/20 text-red-400 border-red-500/30',
};

function FormulaCard({ formula, catColor }: { formula: Formula; catColor: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="border border-border/30 rounded-lg p-3 hover:border-border/60 transition-colors cursor-pointer bg-card/30"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {expanded ? <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" /> : <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />}
            <h4 className="text-sm font-semibold text-foreground truncate">{formula.name}</h4>
          </div>
          <div className="ml-5 font-mono text-xs p-2 rounded bg-background/60 border border-border/20 overflow-x-auto whitespace-nowrap" style={{ color: catColor }}>
            {formula.latex}
          </div>
        </div>
        <Badge variant="outline" className={`text-[9px] shrink-0 ${DIFFICULTY_COLORS[formula.difficulty]}`}>
          {formula.difficulty}
        </Badge>
      </div>

      {expanded && (
        <div className="mt-3 ml-5 space-y-2 text-xs animate-in fade-in duration-200">
          <p className="text-muted-foreground leading-relaxed">{formula.description}</p>

          {/* Variables */}
          <div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Variablen</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1">
              {Object.entries(formula.variables).map(([sym, desc]) => (
                <div key={sym} className="flex gap-2">
                  <code className="text-crypto-gold font-mono text-[11px] shrink-0">{sym}</code>
                  <span className="text-muted-foreground">{desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Properties */}
          {formula.properties && formula.properties.length > 0 && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Eigenschaften</span>
              <ul className="mt-1 space-y-0.5">
                {formula.properties.map((p, i) => (
                  <li key={i} className="text-muted-foreground font-mono text-[10px]">• {p}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Applications */}
          {formula.applications && formula.applications.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {formula.applications.map((app) => (
                <Badge key={app} variant="outline" className="text-[9px] border-border/30 text-muted-foreground">
                  {app}
                </Badge>
              ))}
            </div>
          )}

          {/* Alternative Forms */}
          {formula.alternativeForms && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Alternative Formen</span>
              {formula.alternativeForms.map((af, i) => (
                <div key={i} className="font-mono text-[10px] text-muted-foreground mt-0.5">{af}</div>
              ))}
            </div>
          )}

          {/* Origin */}
          {formula.origin && (
            <div className="text-[10px] text-muted-foreground italic border-t border-border/20 pt-1 mt-2">
              📖 {formula.origin}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CategorySection({ category }: { category: FormulaCategory }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="mb-4">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 w-full text-left mb-2 hover:opacity-80 transition-opacity"
      >
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
        <h3 className="text-sm font-display uppercase tracking-wider" style={{ color: category.color }}>
          {category.name}
        </h3>
        <Badge variant="outline" className="text-[9px] border-border/30 ml-1">{category.formulas.length}</Badge>
        {collapsed ? <ChevronRight className="w-3 h-3 ml-auto text-muted-foreground" /> : <ChevronDown className="w-3 h-3 ml-auto text-muted-foreground" />}
      </button>
      {!collapsed && (
        <>
          <p className="text-[10px] text-muted-foreground mb-2 ml-5">{category.description}</p>
          <div className="space-y-2">
            {category.formulas.map((f) => (
              <FormulaCard key={f.id} formula={f} catColor={category.color} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function NexusMathExplorer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const totalFormulas = useMemo(() => getTotalFormulaCount(), []);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return NEXUS_CATEGORIES;
    const results = searchFormulas(searchQuery);
    const map = new Map<string, { category: FormulaCategory; formulas: Formula[] }>();
    for (const r of results) {
      if (!map.has(r.category.id)) {
        map.set(r.category.id, { category: r.category, formulas: [] });
      }
      map.get(r.category.id)!.formulas.push(r.formula);
    }
    return Array.from(map.values()).map(({ category, formulas }) => ({
      ...category,
      formulas,
    }));
  }, [searchQuery]);

  const tabCategories = useMemo(() => {
    if (activeTab === 'all') return filteredCategories;
    return filteredCategories.filter((c) => c.id === activeTab);
  }, [activeTab, filteredCategories]);

  const searchResultCount = filteredCategories.reduce((s, c) => s + c.formulas.length, 0);

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify({ categories: NEXUS_CATEGORIES }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nexus-mathematics-v2.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Difficulty stats
  const diffStats = useMemo(() => {
    const stats = { beginner: 0, intermediate: 0, advanced: 0, expert: 0 };
    NEXUS_CATEGORIES.forEach((c) => c.formulas.forEach((f) => { stats[f.difficulty]++; }));
    return stats;
  }, []);

  return (
    <Card className="border-border/30 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-crypto-gold" />
            <span className="text-crypto-gold">NEXUS</span> Mathematics Explorer v2.0
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-crypto-gold/30 text-crypto-gold text-[10px]">
              {totalFormulas} Formeln • {NEXUS_CATEGORIES.length} Kategorien
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleExportJSON} className="h-7 text-[10px]">
              <Download className="w-3 h-3 mr-1" /> JSON
            </Button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-3 mt-2">
          {Object.entries(diffStats).map(([d, count]) => (
            <div key={d} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${d === 'beginner' ? 'bg-emerald-500' : d === 'intermediate' ? 'bg-blue-500' : d === 'advanced' ? 'bg-amber-500' : 'bg-red-500'}`} />
              <span className="text-[9px] text-muted-foreground">{d}: {count}</span>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Suche Formeln, Variablen, Anwendungen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background/60 border-border/30 text-sm h-9"
          />
          {searchQuery && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
              {searchResultCount} Treffer
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Category quick-nav */}
        <ScrollArea className="w-full">
          <div className="flex gap-1 pb-3 overflow-x-auto">
            <Button
              variant={activeTab === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('all')}
              className="text-[10px] h-6 shrink-0"
            >
              <Sparkles className="w-3 h-3 mr-1" /> Alle
            </Button>
            {NEXUS_CATEGORIES.map((cat) => (
              <Button
                key={cat.id}
                variant={activeTab === cat.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(cat.id)}
                className="text-[10px] h-6 shrink-0"
                style={activeTab === cat.id ? { backgroundColor: cat.color + '33', color: cat.color, borderColor: cat.color + '55' } : {}}
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </ScrollArea>

        {/* Formulas */}
        <ScrollArea className="h-[600px] pr-2">
          {tabCategories.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Keine Ergebnisse für „{searchQuery}"
            </div>
          ) : (
            tabCategories.map((cat) => (
              <CategorySection key={cat.id} category={cat} />
            ))
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
