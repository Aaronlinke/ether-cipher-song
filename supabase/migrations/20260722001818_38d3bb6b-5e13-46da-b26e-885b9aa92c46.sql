CREATE TABLE public.hits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  bot TEXT,
  bits INTEGER,
  puzzle INTEGER,
  private_key TEXT NOT NULL,
  address TEXT NOT NULL,
  target_address TEXT,
  balance_sats BIGINT,
  note TEXT,
  meta JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.hits TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hits TO authenticated;
GRANT ALL ON public.hits TO service_role;
ALTER TABLE public.hits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read hits" ON public.hits FOR SELECT USING (true);
CREATE POLICY "Public insert hits" ON public.hits FOR INSERT WITH CHECK (true);
CREATE INDEX hits_created_at_idx ON public.hits (created_at DESC);
CREATE INDEX hits_puzzle_idx ON public.hits (puzzle);