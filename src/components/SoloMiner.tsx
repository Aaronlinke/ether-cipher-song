import { useEffect, useRef, useState } from 'react';
import { Pickaxe, Play, Square, RefreshCw, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CryptoPanel } from './CryptoPanel';

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
  const workerRef = useRef<Worker | null>(null);
  const lastTick = useRef<number>(0);
  const acc = useRef<number>(0);

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

  return (
    <CryptoPanel
      title="SOLO-MINER — Echter SHA-256d Nonce-Sweep auf Bitcoin-Tip"
      icon={<Pickaxe className="w-4 h-4" />}
      glowColor="gold"
    >
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Lädt den aktuellen Bitcoin-Blockheader von <span className="text-crypto-gold">mempool.space</span> und
          sucht in einem Web-Worker nach Nonces mit möglichst niedrigem SHA-256d. Reine Lotterie —
          aber jeder Hash ist real.
        </p>

        {err && <div className="text-xs text-crypto-red">{err}</div>}

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