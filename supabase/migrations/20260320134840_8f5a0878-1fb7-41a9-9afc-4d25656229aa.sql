
CREATE TABLE public.batch_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  puzzle_number INTEGER NOT NULL DEFAULT 66,
  hex_key TEXT NOT NULL,
  score NUMERIC NOT NULL DEFAULT 0,
  entropy NUMERIC NOT NULL DEFAULT 0,
  hamming_weight NUMERIC,
  source TEXT DEFAULT 'batch-runner',
  filters_passed TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.batch_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read batch_candidates"
  ON public.batch_candidates FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert batch_candidates"
  ON public.batch_candidates FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE INDEX idx_batch_candidates_score ON public.batch_candidates(score DESC);
CREATE INDEX idx_batch_candidates_puzzle ON public.batch_candidates(puzzle_number);
