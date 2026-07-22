import { supabase } from "@/integrations/supabase/client";

export type Hit = {
  id: string;
  source: string;
  bot: string | null;
  bits: number | null;
  puzzle: number | null;
  private_key: string;
  address: string;
  target_address: string | null;
  balance_sats: number | null;
  note: string | null;
  meta: any;
  created_at: string;
};

export type NewHit = Omit<Partial<Hit>, "id" | "created_at"> & {
  source: string;
  private_key: string;
  address: string;
};

export async function saveHit(hit: NewHit) {
  const { data, error } = await supabase.from("hits").insert(hit as any).select().single();
  if (error) throw error;
  return data as Hit;
}

export async function listHits(limit = 50) {
  const { data, error } = await supabase
    .from("hits")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Hit[];
}

export function subscribeHits(cb: (h: Hit) => void) {
  const ch = supabase
    .channel("hits-live")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "hits" }, (p) => cb(p.new as Hit))
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}