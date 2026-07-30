// ============================================================
// STRATUM-BRIDGE — TCP <-> HTTP Gateway für Solo-Mining
// Browser können kein TCP/Stratum sprechen. Diese Function hält
// eine echte Socket-Verbindung zu einem Solo-Pool (ckpool) offen,
// liefert Jobs an den Browser und submitted gefundene Shares.
// ============================================================
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const POOLS: Record<string, { host: string; port: number }> = {
  'solo.ckpool.org:443': { host: 'solo.ckpool.org', port: 443 },
  'eusolo.ckpool.org:443': { host: 'eusolo.ckpool.org', port: 443 },
  'solo.ckpool.org': { host: 'solo.ckpool.org', port: 3333 },
  'eusolo.ckpool.org': { host: 'eusolo.ckpool.org', port: 3333 },
};

interface Job {
  job_id: string;
  prevhash: string;
  coinb1: string;
  coinb2: string;
  merkle_branch: string[];
  version: string;
  nbits: string;
  ntime: string;
  clean_jobs: boolean;
}

interface Session {
  conn: Deno.TcpConn;
  reader: ReadableStreamDefaultReader<Uint8Array>;
  buffer: string;
  extranonce1: string;
  extranonce2_size: number;
  difficulty: number;
  job: Job | null;
  worker: string;
  nextId: number;
  lastUsed: number;
  closed: boolean;
  /** Genau EIN offener read()-Aufruf pro Session — sonst wirft der Reader / läuft der Speicher voll. */
  pendingRead: Promise<ReadableStreamReadResult<Uint8Array>> | null;
}

// Session-Cache pro Function-Instanz. Läuft die Instanz aus, muss der
// Client eine neue Session anfordern (klare Fehlermeldung unten).
const sessions = new Map<string, Session>();
const SESSION_TTL_MS = 10 * 60 * 1000;

function gc() {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.lastUsed > SESSION_TTL_MS) {
      try { s.conn.close(); } catch { /* already closed */ }
      sessions.delete(id);
    }
  }
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function send(s: Session, method: string, params: unknown[]): Promise<number> {
  const id = s.nextId++;
  await s.conn.write(encoder.encode(JSON.stringify({ id, method, params }) + '\n'));
  return id;
}

/** Liest Zeilen bis `match` true liefert oder Timeout. Verarbeitet Notifications nebenbei. */
async function readUntil(
  s: Session,
  match: (msg: any) => boolean,
  timeoutMs = 15000,
): Promise<any | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    let nl = s.buffer.indexOf('\n');
    while (nl >= 0) {
      const line = s.buffer.slice(0, nl).trim();
      s.buffer = s.buffer.slice(nl + 1);
      if (line) {
        let msg: any;
        try { msg = JSON.parse(line); } catch { msg = null; }
        if (msg) {
          if (msg.method === 'mining.set_difficulty') s.difficulty = Number(msg.params?.[0]) || s.difficulty;
          if (msg.method === 'mining.notify') {
            const p = msg.params ?? [];
            s.job = {
              job_id: p[0], prevhash: p[1], coinb1: p[2], coinb2: p[3],
              merkle_branch: p[4] ?? [], version: p[5], nbits: p[6], ntime: p[7],
              clean_jobs: !!p[8],
            };
          }
          if (match(msg)) return msg;
        }
      }
      nl = s.buffer.indexOf('\n');
    }

    // Nur EINEN read() gleichzeitig offen halten und nur darauf warten.
    if (!s.pendingRead) s.pendingRead = s.reader.read();
    const current = s.pendingRead;
    let timer: number | undefined;
    const chunk = await Promise.race([
      current,
      new Promise<'timeout'>((r) => {
        timer = setTimeout(() => r('timeout'), Math.max(deadline - Date.now(), 1)) as unknown as number;
      }),
    ]);
    if (timer !== undefined) clearTimeout(timer);

    if (chunk === 'timeout') return null;      // read() bleibt offen, wird beim nächsten Aufruf weiterverwendet
    s.pendingRead = null;
    if (chunk.done) { s.closed = true; return null; }
    if (chunk.value) s.buffer += decoder.decode(chunk.value, { stream: true });
  }
  return null;
}

async function openSession(poolKey: string, worker: string): Promise<Session> {
  const pool = POOLS[poolKey] ?? POOLS['solo.ckpool.org'];
  const conn = await Deno.connect({ hostname: pool.host, port: pool.port });
  const s: Session = {
    conn,
    reader: conn.readable.getReader(),
    buffer: '',
    extranonce1: '',
    extranonce2_size: 4,
    difficulty: 1,
    job: null,
    worker,
    nextId: 1,
    lastUsed: Date.now(),
    closed: false,
    pendingRead: null,
  };

  const subId = await send(s, 'mining.subscribe', ['project-omega/1.0']);
  const sub = await readUntil(s, (m) => m.id === subId);
  if (!sub || sub.error) throw new Error('mining.subscribe fehlgeschlagen: ' + JSON.stringify(sub?.error ?? 'timeout'));
  s.extranonce1 = sub.result?.[1] ?? '';
  s.extranonce2_size = Number(sub.result?.[2]) || 4;

  const authId = await send(s, 'mining.authorize', [worker, 'x']);
  const auth = await readUntil(s, (m) => m.id === authId);
  if (!auth || auth.result !== true) {
    throw new Error(
      'mining.authorize abgelehnt — bei ckpool ist der Worker-Name deine BTC-Adresse (optional .workername). Antwort: ' +
        JSON.stringify(auth?.error ?? auth?.result ?? 'timeout'),
    );
  }

  // Auf den ersten Job warten (kommt meist direkt nach authorize)
  if (!s.job) await readUntil(s, (m) => m.method === 'mining.notify', 20000);
  return s;
}

function jobPayload(id: string, s: Session) {
  return {
    session: id,
    extranonce1: s.extranonce1,
    extranonce2_size: s.extranonce2_size,
    difficulty: s.difficulty,
    job: s.job,
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  gc();

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? '');

    // ---------- CONNECT ----------
    if (action === 'connect') {
      const address = String(body.address ?? '').trim();
      if (!/^(bc1|[13])[a-zA-Z0-9]{20,70}$/.test(address)) {
        return json({ error: 'Ungültige Bitcoin-Payout-Adresse.' }, 400);
      }
      const worker = body.workerName ? `${address}.${String(body.workerName).slice(0, 32)}` : address;
      const s = await openSession(String(body.pool ?? 'solo.ckpool.org:443'), worker);
      const id = crypto.randomUUID();
      sessions.set(id, s);
      return json({ ok: true, ...jobPayload(id, s) });
    }

    // ---------- POLL (neuer Job / Difficulty) ----------
    if (action === 'poll') {
      const s = sessions.get(String(body.session ?? ''));
      if (!s) return json({ error: 'session_expired' }, 410);
      s.lastUsed = Date.now();
      // kurz lauschen; wenn nichts kommt, aktuellen Job zurückgeben
      await readUntil(s, (m) => m.method === 'mining.notify', Number(body.waitMs ?? 3000));
      return json({ ok: true, ...jobPayload(String(body.session), s) });
    }

    // ---------- SUBMIT ----------
    if (action === 'submit') {
      const sid = String(body.session ?? '');
      const s = sessions.get(sid);
      if (!s) return json({ error: 'session_expired' }, 410);
      s.lastUsed = Date.now();
      const { job_id, extranonce2, ntime, nonce } = body;
      if (!job_id || !extranonce2 || !ntime || !nonce) {
        return json({ error: 'job_id, extranonce2, ntime und nonce sind Pflicht.' }, 400);
      }
      const id = await send(s, 'mining.submit', [s.worker, job_id, extranonce2, ntime, nonce]);
      const res = await readUntil(s, (m) => m.id === id, 20000);
      if (!res) return json({ error: 'Keine Antwort vom Pool (Timeout).' }, 504);
      return json({ ok: res.result === true, accepted: res.result === true, poolError: res.error ?? null });
    }

    // ---------- DISCONNECT ----------
    if (action === 'disconnect') {
      const sid = String(body.session ?? '');
      const s = sessions.get(sid);
      if (s) { try { s.conn.close(); } catch { /* noop */ } sessions.delete(sid); }
      return json({ ok: true });
    }

    return json({ error: 'Unbekannte action. Erlaubt: connect | poll | submit | disconnect' }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});