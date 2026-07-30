import { useEffect, useRef, useState } from 'react';
import { Pickaxe, Play, Square, RefreshCw, Trophy, AlertTriangle, Wallet, Plug, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CryptoPanel } from './CryptoPanel';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  buildCoinbase, buildHeaderHex, difficultyToTarget, merkleRoot,
  nbitsToTarget, randomExtranonce2, type StratumJob,
} from '@/lib/stratum';
import { saveHit } from '@/lib/hit-vault';

// ─────────────────────────────────────────────────────────────
// Stratum-Worker: sweept Nonces gegen ein echtes Share-Target
// ─────────────────────────────────────────────────────────────
const STRATUM_WORKER_SRC = `
import { sha256 } from 'https://esm.sh/@noble/hashes@2.0.1/sha2.js';
function hexToBytes(hex){const o=new Uint8Array(hex.length/2);for(let i=0;i<o.length;i++)o[i]=parseInt(hex.substr(i*2,2),16);return o;}
function bytesToHex(b){let s='';for(let i=0;i<b.length;i++){s+=b[i].toString(16).padStart(2,'0');}return s;}
function revHex(h){let o='';for(let i=h.length-2;i>=0;i-=2)o+=h.substr(i,2);return o;}
function sha256d(b){return sha256(sha256(b));}
function toBig(le){let h=0n;for(let i=le.length-1;i>=0;i--){h=(h<<8n)|BigInt(le[i]);}return h;}
let running=false,hdr=null,nonce=0,shareTarget=0n,netTarget=0n;
self.onmessage=(e)=>{
  const m=e.data;
  if(m.type==='start'){
    hdr=hexToBytes(m.header);
    nonce=(m.startNonce>>>0);
    shareTarget=BigInt(m.shareTarget);
    netTarget=BigInt(m.netTarget);
    running=true; loop();
  } else if(m.type==='stop'){ running=false; }
};
function loop(){
  const CHUNK=6000; const t0=performance.now();
  for(let i=0;i<CHUNK && running;i++){
    const n=(nonce+i)>>>0;
    hdr[76]=n&0xff; hdr[77]=(n>>>8)&0xff; hdr[78]=(n>>>16)&0xff; hdr[79]=(n>>>24)&0xff;
    const h=sha256d(hdr); const v=toBig(h);
    if(v<=shareTarget){
      postMessage({type:'share',nonce:n,hash:revHex(bytesToHex(h)),block:v<=netTarget});
    }
  }
  nonce=(nonce+CHUNK)>>>0;
  postMessage({type:'tick',hashes:CHUNK,seconds:(performance.now()-t0)/1000,nonce});
  if(running) setTimeout(loop,0);
}
`;

// ─────────────────────────────────────────────────────────────
// Inline Web-Worker: echter Bitcoin SHA-256d Nonce-Sweep
// ─────────────────────────────────────────────────────────────
const WORKER_SRC = `
import { sha256 } from 'https://esm.sh/@noble/hashes@2.0.1/sha2.js';

function hexToBytes(hex){const o=new Uint8Array(hex.length/2);for(let i=0;i<o.length;i++)o[i]=parseInt(hex.substr(i*2,2),16);return o;}
function bytesToHex(b){let s='';for(let i=0;i<b.length;i++){const h=b[i].toString(16);s+=h.length===1?'0'+h:h;}return s;}
function revHex(h){let o='';for(let i=h.length-2;i>=0;i-=2)o+=h.substr(i,2);return o;}
function u32le(n){const b=new Uint8Array(4);new DataView(b.buffer).setUint32(0,n>>>0,true);return b;}
function sha256d(bytes){return sha256(sha256(bytes));}

// Difficulty 1 target
const DIFF1=0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffn;
function hashDiff(bytesLE){
  // hash comes big-endian conceptually; bitcoin compares as reversed
  let h=0n;for(let i=bytesLE.length-1;i>=0;i--){h=(h<<8n)|BigInt(bytesLE[i]);}
  if(h===0n)return 0;
  const s=100000000n;return Number((DIFF1*s)/h)/1e8;
}

let running=false, hdr=null, startNonce=0, totalHashes=0, bestDiff=0, bestHash='';

self.onmessage=(e)=>{
  const m=e.data;
  if(m.type==='start'){
    hdr=hexToBytes(m.header); // 80 bytes, nonce field at offset 76..79
    startNonce=(m.startNonce>>>0);
    running=true; totalHashes=0; bestDiff=0; bestHash='';
    loop();
  } else if(m.type==='stop'){ running=false; }
};

function loop(){
  const CHUNK=8000;
  const t0=performance.now();
  for(let i=0;i<CHUNK && running;i++){
    const n=(startNonce+i)>>>0;
    hdr[76]=n&0xff; hdr[77]=(n>>>8)&0xff; hdr[78]=(n>>>16)&0xff; hdr[79]=(n>>>24)&0xff;
    const h=sha256d(hdr);
    const d=hashDiff(h);
    if(d>bestDiff){bestDiff=d;bestHash=revHex(bytesToHex(h));postMessage({type:'best',diff:d,hash:bestHash,nonce:n});}
  }
  totalHashes+=CHUNK;
  startNonce=(startNonce+CHUNK)>>>0;
  const dt=(performance.now()-t0)/1000;
  postMessage({type:'tick',hashes:CHUNK,seconds:dt,nonce:startNonce});
  if(running) setTimeout(loop,0);
}
`;

function serializeHeader(h: {
  version: number; previousblockhash: string; merkle_root: string;
  timestamp: number; bits: number; nonce: number;
}): string {
  const u32 = (n: number) => {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setUint32(0, n >>> 0, true);
    return [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  };
  const rev = (hex: string) => {
    let o = ''; for (let i = hex.length - 2; i >= 0; i -= 2) o += hex.substr(i, 2);
    return o;
  };
  return u32(h.version) + rev(h.previousblockhash) + rev(h.merkle_root)
    + u32(h.timestamp) + u32(h.bits) + u32(h.nonce);
}

type Tip = {
  height: number; hash: string; version: number; previousblockhash: string;
  merkle_root: string; timestamp: number; bits: number; nonce: number;
};

export function SoloMiner() {
  const [tip, setTip] = useState<Tip | null>(null);
  const [running, setRunning] = useState(false);
  const [hashes, setHashes] = useState(0);
  const [hps, setHps] = useState(0);
  const [best, setBest] = useState<{ diff: number; hash: string; nonce: number } | null>(null);
  const [nonce, setNonce] = useState(0);
  const [err, setErr] = useState<string>('');
  const [payout, setPayout] = useState<string>(() => localStorage.getItem('solo_payout') || '');
  const [reward, setReward] = useState<number | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const lastTick = useRef<number>(0);
  const acc = useRef<number>(0);

  // ---- Stratum-Bridge State ----
  const [mode, setMode] = useState<'lottery' | 'stratum'>('lottery');
  const [pool, setPool] = useState('solo.ckpool.org:443');
  const [session, setSession] = useState<string | null>(null);
  const [job, setJob] = useState<StratumJob | null>(null);
  const [difficulty, setDifficulty] = useState(1);
  const [shares, setShares] = useState({ found: 0, accepted: 0, rejected: 0 });
  const [connecting, setConnecting] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const en2Ref = useRef<string>('');
  const jobRef = useRef<StratumJob | null>(null);
  const sessionRef = useRef<string | null>(null);

  const pushLog = (s: string) =>
    setLog((l) => [`${new Date().toLocaleTimeString()} · ${s}`, ...l].slice(0, 40));

  const bridge = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('stratum-bridge', { body });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const loadTip = async () => {
    setErr('');
    try {
      const hashRes = await fetch('https://mempool.space/api/blocks/tip/hash').then(r => r.text());
      const b = await fetch(`https://mempool.space/api/block/${hashRes}`).then(r => r.json());
      setTip({
        height: b.height, hash: b.id, version: b.version,
        previousblockhash: b.previousblockhash, merkle_root: b.merkle_root,
        timestamp: b.timestamp, bits: b.bits, nonce: b.nonce,
      });
      // Block-Reward des nächsten Blocks (Halvings alle 210 000)
      const nextH = (b.height || 0) + 1;
      const halvings = Math.floor(nextH / 210000);
      setReward(halvings >= 64 ? 0 : 50 / Math.pow(2, halvings));
    } catch (e) { setErr(String(e)); }
  };

  useEffect(() => { loadTip(); }, []);
  useEffect(() => () => { workerRef.current?.terminate(); }, []);

  const start = () => {
    if (!tip) return;
    setHashes(0); setBest(null); setHps(0); acc.current = 0; lastTick.current = performance.now();
    // Mine the NEXT block: previoushash = current tip, own random merkle_root as "solo lottery"
    // For pure demo/lottery we mine on the tip header with fresh nonces to search for a lower hash.
    const headerHex = serializeHeader(tip);
    const blob = new Blob([WORKER_SRC], { type: 'application/javascript' });
    const w = new Worker(URL.createObjectURL(blob), { type: 'module' });
    workerRef.current = w;
    w.onmessage = (e) => {
      const m = e.data;
      if (m.type === 'tick') {
        acc.current += m.hashes;
        setHashes(h => h + m.hashes);
        setNonce(m.nonce);
        const now = performance.now();
        const dt = (now - lastTick.current) / 1000;
        if (dt > 0.5) { setHps(acc.current / dt); acc.current = 0; lastTick.current = now; }
      } else if (m.type === 'best') {
        setBest({ diff: m.diff, hash: m.hash, nonce: m.nonce });
      }
    };
    w.postMessage({ type: 'start', header: headerHex, startNonce: (Math.random() * 0xffffffff) >>> 0 });
    setRunning(true);
  };

  const stop = () => {
    workerRef.current?.postMessage({ type: 'stop' });
    workerRef.current?.terminate();
    workerRef.current = null;
    setRunning(false);
  };

  // ---------- Stratum ----------
  const startStratum = async () => {
    setErr(''); setConnecting(true);
    try {
      const data = await bridge({ action: 'connect', address: payout.trim(), pool, workerName: 'omega' });
      if (!data.job) throw new Error('Pool hat keinen Job geliefert — später erneut versuchen.');
      sessionRef.current = data.session;
      setSession(data.session);
      setDifficulty(data.difficulty || 1);
      setJob(data.job); jobRef.current = data.job;
      pushLog(`Verbunden mit ${pool} · extranonce1=${data.extranonce1} · diff=${data.difficulty}`);
      mineJob(data.job, data.extranonce1, data.extranonce2_size, data.difficulty || 1);
      setRunning(true);
      toast.success('Stratum-Bridge aktiv — echte Shares werden submitted');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg); pushLog('FEHLER: ' + msg); toast.error(msg);
    } finally {
      setConnecting(false);
    }
  };

  const mineJob = (j: StratumJob, extranonce1: string, en2size: number, diff: number) => {
    const en2 = randomExtranonce2(en2size);
    en2Ref.current = en2;
    const coinbase = buildCoinbase(j.coinb1, extranonce1, en2, j.coinb2);
    const merkle = merkleRoot(coinbase, j.merkle_branch);
    const header = buildHeaderHex({ version: j.version, prevhash: j.prevhash, merkle, ntime: j.ntime, nbits: j.nbits });

    workerRef.current?.terminate();
    setHashes(0); acc.current = 0; lastTick.current = performance.now();
    const blob = new Blob([STRATUM_WORKER_SRC], { type: 'application/javascript' });
    const w = new Worker(URL.createObjectURL(blob), { type: 'module' });
    workerRef.current = w;
    w.onmessage = (e) => {
      const m = e.data;
      if (m.type === 'tick') {
        acc.current += m.hashes;
        setHashes((h) => h + m.hashes);
        setNonce(m.nonce);
        const now = performance.now();
        const dt = (now - lastTick.current) / 1000;
        if (dt > 0.5) { setHps(acc.current / dt); acc.current = 0; lastTick.current = now; }
      } else if (m.type === 'share') {
        submitShare(m.nonce, m.hash, m.block);
      }
    };
    w.postMessage({
      type: 'start',
      header,
      startNonce: (Math.random() * 0xffffffff) >>> 0,
      shareTarget: difficultyToTarget(diff).toString(),
      netTarget: nbitsToTarget(j.nbits).toString(),
    });
  };

  const submitShare = async (n: number, hash: string, isBlock: boolean) => {
    const j = jobRef.current, sid = sessionRef.current;
    if (!j || !sid) return;
    setShares((s) => ({ ...s, found: s.found + 1 }));
    pushLog(`${isBlock ? '🏆 BLOCK-KANDIDAT' : 'Share'} gefunden · nonce=${n.toString(16)} · ${hash.slice(0, 20)}…`);
    try {
      const res = await bridge({
        action: 'submit', session: sid, job_id: j.job_id,
        extranonce2: en2Ref.current, ntime: j.ntime,
        nonce: (n >>> 0).toString(16).padStart(8, '0'),
      });
      if (res.accepted) {
        setShares((s) => ({ ...s, accepted: s.accepted + 1 }));
        pushLog('✅ Pool: ACCEPTED');
        if (isBlock) {
          toast.success('🏆 BLOCK GEFUNDEN UND AKZEPTIERT!');
          saveHit({
            source: 'SoloMiner', address: payout.trim(), private_key: '—',
            note: `Block-Kandidat akzeptiert · job ${j.job_id} · nonce ${n.toString(16)} · ${hash}`,
          }).catch(() => {});
        }
      } else {
        setShares((s) => ({ ...s, rejected: s.rejected + 1 }));
        pushLog('❌ Pool: REJECTED · ' + JSON.stringify(res.poolError));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setShares((s) => ({ ...s, rejected: s.rejected + 1 }));
      pushLog('Submit-Fehler: ' + msg);
      if (msg.includes('session_expired')) stopStratum();
    }
  };

  const stopStratum = async () => {
    workerRef.current?.postMessage({ type: 'stop' });
    workerRef.current?.terminate();
    workerRef.current = null;
    setRunning(false);
    const sid = sessionRef.current;
    sessionRef.current = null; setSession(null);
    if (sid) { try { await bridge({ action: 'disconnect', session: sid }); } catch { /* egal */ } }
    pushLog('Verbindung getrennt.');
  };

  return (
    <CryptoPanel
      title="SOLO-MINER — Echter SHA-256d Nonce-Sweep auf Bitcoin-Tip"
      icon={<Pickaxe className="w-4 h-4" />}
      glowColor="gold"
    >
      <div className="space-y-3">
        {/* Modus-Umschalter */}
        <div className="flex gap-2">
          <button
            onClick={() => !running && setMode('lottery')}
            className={`flex-1 text-[10px] uppercase tracking-widest px-2 py-1.5 rounded border transition-colors ${
              mode === 'lottery' ? 'border-crypto-gold/60 text-crypto-gold bg-crypto-gold/10' : 'border-border/30 text-muted-foreground'
            }`}
          >
            Lottery-Simulation
          </button>
          <button
            onClick={() => !running && setMode('stratum')}
            className={`flex-1 text-[10px] uppercase tracking-widest px-2 py-1.5 rounded border transition-colors ${
              mode === 'stratum' ? 'border-crypto-green/60 text-crypto-green bg-crypto-green/10' : 'border-border/30 text-muted-foreground'
            }`}
          >
            <Plug className="w-3 h-3 inline mr-1" /> Stratum-Bridge (live)
          </button>
        </div>

        {mode === 'lottery' ? (
          <div className="border border-crypto-orange/40 bg-crypto-orange/5 rounded p-2.5 text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-crypto-orange font-bold uppercase tracking-widest text-[10px]">
              <AlertTriangle className="w-3 h-3" /> Reality-Check
            </div>
            <p className="text-muted-foreground leading-relaxed">
              In diesem Modus hasht der Miner <b className="text-crypto-gold">echt</b>, submitted aber nichts —
              er sweept Nonces auf dem aktuellen Tip-Header. Für echte Auszahlung:
              rechts auf <b className="text-crypto-green">Stratum-Bridge</b> umschalten.
            </p>
          </div>
        ) : (
          <div className="border border-crypto-green/40 bg-crypto-green/5 rounded p-2.5 text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-crypto-green font-bold uppercase tracking-widest text-[10px]">
              <Zap className="w-3 h-3" /> Bridge aktiv gebaut
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Die Edge-Function <b className="text-crypto-green">stratum-bridge</b> hält eine echte TCP-Verbindung
              zum Solo-Pool. Der Pool baut die Coinbase mit <b>deiner</b> Adresse als Worker-Namen —
              ein gefundener Block wird von ckpool direkt an diese Adresse ausgezahlt.
              Gefundene Shares gehen sofort per <span className="font-mono">mining.submit</span> raus.
              <br />
              <span className="text-crypto-orange">Ehrlich bleibt:</span> Browser-Hashrate ist ~10^5 H/s gegen
              ~10^21 H/s Netzwerk — die Chance ist real, aber winzig.
            </p>
          </div>
        )}

        {/* Payout Wallet */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
            <Wallet className="w-3 h-3" /> Payout-Adresse {mode === 'stratum' && <span className="text-crypto-green">· Pflicht</span>}
          </label>
          <input
            value={payout}
            onChange={(e) => { setPayout(e.target.value); localStorage.setItem('solo_payout', e.target.value); }}
            placeholder="bc1q... oder 1..."
            className="w-full bg-background/40 border border-crypto-gold/30 rounded px-2 py-1.5 font-mono text-xs text-crypto-gold focus:outline-none focus:border-crypto-gold/70"
          />
          {reward !== null && (
            <div className="text-[10px] text-muted-foreground">
              Theoretischer Block-Reward: <span className="text-crypto-gold">{reward} BTC</span>
              {' '}+ Fees {payout ? '→ deine Adresse' : '(keine Adresse gesetzt)'}
            </div>
          )}
        </div>

        {err && <div className="text-xs text-crypto-red">{err}</div>}

        {mode === 'stratum' && (
          <div className="space-y-2">
            <div className="flex gap-2 flex-wrap items-center">
              <select
                value={pool}
                onChange={(e) => setPool(e.target.value)}
                disabled={running}
                className="bg-background/40 border border-crypto-green/30 rounded px-2 py-1.5 text-xs font-mono text-crypto-green"
              >
                <option value="solo.ckpool.org:443">solo.ckpool.org:443</option>
                <option value="eusolo.ckpool.org:443">eusolo.ckpool.org:443</option>
                <option value="solo.ckpool.org">solo.ckpool.org:3333</option>
                <option value="eusolo.ckpool.org">eusolo.ckpool.org:3333</option>
              </select>
              {!running ? (
                <Button
                  onClick={startStratum}
                  disabled={!payout.trim() || connecting}
                  className="bg-crypto-green/20 text-crypto-green border border-crypto-green/50 hover:bg-crypto-green/30"
                >
                  <Plug className="w-4 h-4 mr-2" /> {connecting ? 'Verbinde…' : 'Bridge verbinden & minen'}
                </Button>
              ) : (
                <Button onClick={stopStratum} variant="outline" className="border-crypto-red/40 text-crypto-red">
                  <Square className="w-4 h-4 mr-2" /> Trennen
                </Button>
              )}
            </div>

            {job && (
              <div className="border border-crypto-green/30 bg-background/40 rounded p-2.5 space-y-1 font-mono text-[11px]">
                <div className="flex justify-between"><span className="text-muted-foreground">Job-ID</span><span className="text-crypto-green">{job.job_id}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Pool-Difficulty</span><span className="text-crypto-green">{difficulty}</span></div>
                <div className="break-all"><span className="text-muted-foreground">Prev: </span>{job.prevhash}</div>
                <div className="flex flex-wrap gap-3">
                  <span><span className="text-muted-foreground">nbits: </span>{job.nbits}</span>
                  <span><span className="text-muted-foreground">ntime: </span>{job.ntime}</span>
                  <span><span className="text-muted-foreground">Branches: </span>{job.merkle_branch.length}</span>
                </div>
                <div className="text-muted-foreground">Session {session?.slice(0, 8)}…</div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 text-xs font-mono">
              <Stat label="Shares" value={String(shares.found)} />
              <Stat label="Accepted" value={String(shares.accepted)} />
              <Stat label="Rejected" value={String(shares.rejected)} />
            </div>

            {log.length > 0 && (
              <div className="border border-border/30 bg-background/30 rounded p-2 max-h-40 overflow-y-auto space-y-0.5">
                {log.map((l, i) => (
                  <div key={i} className="font-mono text-[10px] text-muted-foreground">{l}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {tip && (
          <div className="border border-crypto-gold/30 bg-background/40 rounded p-2.5 space-y-1 font-mono text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Block Height</span><span className="text-crypto-gold">#{tip.height}</span></div>
            <div className="break-all"><span className="text-muted-foreground">Tip Hash: </span>{tip.hash}</div>
            <div className="break-all"><span className="text-muted-foreground">Prev: </span>{tip.previousblockhash}</div>
            <div className="break-all"><span className="text-muted-foreground">Merkle: </span>{tip.merkle_root}</div>
            <div className="flex flex-wrap gap-3">
              <span><span className="text-muted-foreground">Bits: </span>0x{tip.bits.toString(16)}</span>
              <span><span className="text-muted-foreground">Time: </span>{tip.timestamp}</span>
              <span><span className="text-muted-foreground">Version: </span>{tip.version}</span>
            </div>
          </div>
        )}

        {mode === 'lottery' && (
          <div className="flex gap-2 flex-wrap">
            <Button onClick={loadTip} variant="outline" size="sm" className="border-crypto-gold/40 text-crypto-gold">
              <RefreshCw className="w-4 h-4 mr-2" /> Tip neu laden
            </Button>
            {!running ? (
              <Button onClick={start} disabled={!tip} className="bg-crypto-gold/20 text-crypto-gold border border-crypto-gold/50 hover:bg-crypto-gold/30">
                <Play className="w-4 h-4 mr-2" /> Mining starten
              </Button>
            ) : (
              <Button onClick={stop} variant="outline" className="border-crypto-red/40 text-crypto-red">
                <Square className="w-4 h-4 mr-2" /> Stop
              </Button>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
          <Stat label="Hashes" value={hashes.toLocaleString()} />
          <Stat label="H/s" value={hps ? hps.toFixed(0) : '—'} />
          <Stat label="Nonce" value={'0x' + nonce.toString(16).padStart(8, '0')} />
          <Stat label="Best Diff" value={best ? best.diff.toFixed(4) : '—'} />
        </div>

        {best && (
          <div className="border border-crypto-gold/40 bg-crypto-gold/5 rounded p-2.5 space-y-1">
            <div className="text-[10px] uppercase tracking-widest text-crypto-gold flex items-center gap-1">
              <Trophy className="w-3 h-3" /> Bester Hash
            </div>
            <div className="font-mono text-xs break-all text-crypto-gold/90">{best.hash}</div>
            <div className="text-[10px] text-muted-foreground">bei Nonce 0x{best.nonce.toString(16)}</div>
          </div>
        )}
      </div>
    </CryptoPanel>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border/30 bg-background/30 rounded px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-crypto-gold truncate">{value}</div>
    </div>
  );
}