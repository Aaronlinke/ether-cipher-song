import { useState, useRef, useMemo } from 'react';
import JSZip from 'jszip';
import { CryptoPanel } from './CryptoPanel';
import { Button } from '@/components/ui/button';
import { Upload, Play, FileCode, Folder, Package, AlertTriangle, Terminal, X } from 'lucide-react';

type EntryKind = 'html' | 'js' | 'python' | 'php' | 'binary' | 'unknown';

interface ExtractedFile {
  path: string;
  name: string;
  size: number;
  isText: boolean;
  text?: string;
  blob: Blob;
  url: string;
}

const TEXT_EXT = /\.(html?|css|js|mjs|cjs|ts|tsx|jsx|json|txt|md|py|php|xml|svg|csv|yml|yaml|toml|ini|sh|bat)$/i;
const BINARY_EXT = /\.(exe|apk|jar|dll|so|dylib|bin|wasm)$/i;

function detectEntry(files: ExtractedFile[]): { kind: EntryKind; entry?: ExtractedFile } {
  const byName = (n: string) =>
    files.find(f => f.name.toLowerCase() === n) ||
    files.find(f => f.path.toLowerCase().endsWith('/' + n));
  const html = byName('index.html') || files.find(f => /\.html?$/i.test(f.name));
  if (html) return { kind: 'html', entry: html };
  const py = byName('main.py') || files.find(f => f.name.endsWith('.py'));
  if (py) return { kind: 'python', entry: py };
  const js = byName('app.js') || byName('index.js') || files.find(f => /\.m?js$/i.test(f.name));
  if (js) return { kind: 'js', entry: js };
  const php = byName('index.php') || files.find(f => f.name.endsWith('.php'));
  if (php) return { kind: 'php', entry: php };
  const bin = files.find(f => BINARY_EXT.test(f.name));
  if (bin) return { kind: 'binary', entry: bin };
  return { kind: 'unknown' };
}

/** Rewrite relative asset refs in HTML to blob URLs from our extracted map */
function rewriteHtml(html: string, entry: ExtractedFile, files: ExtractedFile[]): string {
  const dir = entry.path.includes('/') ? entry.path.replace(/\/[^/]+$/, '/') : '';
  const resolve = (ref: string): string | null => {
    if (/^(https?:|data:|blob:|#|\/\/)/i.test(ref)) return null;
    const clean = ref.split('#')[0].split('?')[0];
    if (!clean) return null;
    // try several candidate paths
    const cands = [dir + clean, clean, clean.replace(/^\.\//, dir)];
    for (const c of cands) {
      const norm = c.replace(/\/\.\//g, '/').replace(/[^/]+\/\.\.\//g, '');
      const hit = files.find(f => f.path === norm);
      if (hit) return hit.url;
    }
    return null;
  };
  // src="...", href="...", url(...)
  let out = html.replace(/\b(src|href)\s*=\s*["']([^"']+)["']/gi, (m, attr, ref) => {
    const u = resolve(ref);
    return u ? `${attr}="${u}"` : m;
  });
  out = out.replace(/url\(\s*["']?([^"')]+)["']?\s*\)/gi, (m, ref) => {
    const u = resolve(ref);
    return u ? `url("${u}")` : m;
  });
  // Inline same-zip JS modules referenced via <script src> are already swapped.
  return out;
}

function buildHtmlShellFromJs(js: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>JS Runner</title>
<style>body{font-family:ui-monospace,monospace;background:#0a0a0a;color:#0f0;padding:1rem}</style>
</head><body><div id="app"></div>
<script>
(function(){
  const log = (...a)=>{ const d=document.createElement('div'); d.textContent=a.map(x=>typeof x==='object'?JSON.stringify(x):String(x)).join(' '); document.body.appendChild(d); parent.postMessage({type:'log',data:a.map(String).join(' ')},'*'); };
  const orig = console.log; console.log = (...a)=>{ orig(...a); log(...a); };
  window.onerror = (m)=>log('ERROR:',m);
  try{ ${js}\n }catch(e){ log('ERROR:',e.message); }
})();
</script></body></html>`;
}

function buildPythonShell(code: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Python Runner</title>
<style>body{font-family:ui-monospace,monospace;background:#0a0a0a;color:#0f0;padding:1rem;white-space:pre-wrap}</style>
<script src="https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js"></script>
</head><body>
<div id="out">Lade Pyodide…</div>
<script>
const out = document.getElementById('out');
const append=(s)=>{ out.textContent += s; parent.postMessage({type:'log',data:s},'*'); };
(async()=>{
  try{
    const py = await loadPyodide();
    py.setStdout({batched:(s)=>append(s+'\\n')});
    py.setStderr({batched:(s)=>append('[err] '+s+'\\n')});
    out.textContent = '';
    await py.runPythonAsync(${JSON.stringify(code)});
  }catch(e){ append('FEHLER: '+e.message+'\\n'); }
})();
</script></body></html>`;
}

export function ZipRunner() {
  const [files, setFiles] = useState<ExtractedFile[]>([]);
  const [entry, setEntry] = useState<ExtractedFile | null>(null);
  const [kind, setKind] = useState<EntryKind>('unknown');
  const [zipName, setZipName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState(false);
  const [iframeSrc, setIframeSrc] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const [selected, setSelected] = useState<ExtractedFile | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    files.forEach(f => URL.revokeObjectURL(f.url));
    if (iframeSrc.startsWith('blob:')) URL.revokeObjectURL(iframeSrc);
    setFiles([]); setEntry(null); setKind('unknown'); setZipName('');
    setError(''); setIframeSrc(''); setLogs([]); setSelected(null); setRunning(false);
  };

  const handleFile = async (file: File) => {
    reset();
    setBusy(true); setZipName(file.name);
    try {
      const zip = await JSZip.loadAsync(file);
      const extracted: ExtractedFile[] = [];
      const entries = Object.values(zip.files).filter(e => !e.dir && !e.name.includes('__MACOSX') && !e.name.endsWith('.DS_Store'));
      for (const e of entries) {
        const isText = TEXT_EXT.test(e.name);
        const blob = await e.async('blob');
        const text = isText ? await e.async('string') : undefined;
        const url = URL.createObjectURL(blob);
        const name = e.name.split('/').pop() || e.name;
        extracted.push({ path: e.name, name, size: blob.size, isText, text, blob, url });
      }
      setFiles(extracted);
      const det = detectEntry(extracted);
      setKind(det.kind); setEntry(det.entry || null);
    } catch (err: any) {
      setError(err?.message || 'ZIP konnte nicht gelesen werden.');
    } finally { setBusy(false); }
  };

  const run = () => {
    if (!entry) return;
    setLogs([]); setRunning(true);
    let html = '';
    if (kind === 'html' && entry.text) html = rewriteHtml(entry.text, entry, files);
    else if (kind === 'js' && entry.text) html = buildHtmlShellFromJs(entry.text);
    else if (kind === 'python' && entry.text) html = buildPythonShell(entry.text);
    else if (kind === 'php') {
      setError('PHP benötigt einen Server. Nur Quelltext-Anzeige möglich.');
      setRunning(false); return;
    } else if (kind === 'binary') {
      setError(`${entry.name} ist eine native Binärdatei (${entry.path}). Browser-Sandboxen können .exe/.apk/.dll nicht ausführen — biete Download an.`);
      setRunning(false); return;
    } else {
      setError('Kein ausführbarer Einstiegspunkt gefunden.');
      setRunning(false); return;
    }
    const blob = new Blob([html], { type: 'text/html' });
    setIframeSrc(URL.createObjectURL(blob));
  };

  // listen to iframe logs
  useMemo(() => {
    const onMsg = (ev: MessageEvent) => {
      if (ev?.data?.type === 'log') setLogs(l => [...l.slice(-200), String(ev.data.data)]);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const grouped = useMemo(() => {
    const m: Record<string, ExtractedFile[]> = {};
    files.forEach(f => {
      const dir = f.path.includes('/') ? f.path.replace(/\/[^/]+$/, '') : '/';
      (m[dir] ||= []).push(f);
    });
    return m;
  }, [files]);

  return (
    <CryptoPanel title="ZIP Runner — Programme 1:1 ausführen" icon={<Package size={16} />} glowColor="green" className="col-span-full">
      <div className="space-y-4">
        <div className="text-xs text-muted-foreground">
          Lädt eine ZIP-Datei, erkennt den Einstiegspunkt (<code>index.html</code>, <code>main.py</code>, <code>app.js</code>, <code>index.php</code>, Binärdatei) und führt das Programm in einer Sandbox aus.
          Web-Apps werden 1:1 gerendert (Assets werden via Blob-URLs verlinkt), Python läuft über Pyodide (WASM) im Browser, JS in einer isolierten iframe-Shell.
          Native Binärdateien (.exe/.apk) sind im Browser nicht ausführbar — sie werden inventarisiert.
        </div>

        {/* Upload */}
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
          className="border-2 border-dashed border-crypto-green/30 rounded-lg p-6 text-center bg-muted/10 hover:border-crypto-green/60 transition-colors"
        >
          <Upload className="mx-auto mb-2 text-crypto-green" size={28} />
          <p className="text-sm text-foreground/70 mb-3">
            ZIP hier hineinziehen{zipName && <> – aktuell: <span className="text-crypto-green">{zipName}</span></>}
          </p>
          <input ref={inputRef} type="file" accept=".zip" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          <div className="flex gap-2 justify-center">
            <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}>
              {busy ? 'Lade…' : 'Datei wählen'}
            </Button>
            {files.length > 0 && (
              <Button size="sm" variant="ghost" onClick={reset}>
                <X className="w-3 h-3 mr-1" /> Reset
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 text-xs text-crypto-red bg-crypto-red/10 border border-crypto-red/30 rounded p-3">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {files.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* File tree */}
            <div className="lg:col-span-4 bg-background/40 border border-border/30 rounded p-3 max-h-80 overflow-auto">
              <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wider text-crypto-green">
                <Folder size={14} /> {files.length} Dateien
              </div>
              {Object.entries(grouped).map(([dir, fs]) => (
                <div key={dir} className="mb-2">
                  <div className="text-[10px] text-muted-foreground font-mono">{dir || '/'}</div>
                  {fs.map(f => (
                    <button key={f.path}
                      onClick={() => setSelected(f)}
                      className={`block w-full text-left text-xs font-mono px-2 py-0.5 rounded hover:bg-muted/40 ${
                        selected?.path === f.path ? 'bg-crypto-green/10 text-crypto-green' : ''
                      } ${entry?.path === f.path ? 'border-l-2 border-crypto-gold pl-1' : ''}`}>
                      <FileCode size={10} className="inline mr-1 opacity-50" />
                      {f.name} <span className="text-muted-foreground">({f.size}B)</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {/* Detection + Action */}
            <div className="lg:col-span-8 space-y-3">
              <div className="bg-background/40 border border-border/30 rounded p-3 text-xs space-y-1">
                <div>Typ: <span className="text-crypto-gold uppercase">{kind}</span></div>
                <div>Einstieg: <span className="font-mono text-crypto-green">{entry?.path || '—'}</span></div>
                <Button size="sm" onClick={run} disabled={!entry || kind === 'binary' || kind === 'php'} className="mt-2 bg-crypto-green/20 text-crypto-green border border-crypto-green/50 hover:bg-crypto-green/30">
                  <Play className="w-3 h-3 mr-1" /> Ausführen
                </Button>
              </div>

              {running && iframeSrc && (
                <iframe
                  src={iframeSrc}
                  sandbox="allow-scripts allow-forms allow-modals allow-popups"
                  className="w-full h-96 bg-white rounded border border-crypto-green/40"
                  title="ZIP Runner Output"
                />
              )}

              {logs.length > 0 && (
                <div className="bg-black/80 border border-crypto-green/30 rounded p-2 max-h-48 overflow-auto">
                  <div className="flex items-center gap-1 text-[10px] uppercase text-crypto-green mb-1">
                    <Terminal size={10} /> Konsole
                  </div>
                  <pre className="text-[10px] font-mono text-crypto-green whitespace-pre-wrap">{logs.join('\n')}</pre>
                </div>
              )}

              {selected && (
                <div className="bg-background/40 border border-border/30 rounded p-2">
                  <div className="text-[10px] text-muted-foreground mb-1 font-mono flex justify-between">
                    <span>{selected.path}</span>
                    <a href={selected.url} download={selected.name} className="text-crypto-blue hover:underline">Download</a>
                  </div>
                  {selected.isText ? (
                    <pre className="text-[10px] font-mono max-h-48 overflow-auto text-foreground/80 whitespace-pre">{selected.text?.slice(0, 5000)}</pre>
                  ) : (
                    <div className="text-[10px] text-muted-foreground">Binärdatei ({selected.size} Bytes) — Download verfügbar.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </CryptoPanel>
  );
}