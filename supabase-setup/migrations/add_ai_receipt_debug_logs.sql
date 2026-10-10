-- Debug log for AI-based receipt extraction (OpenRouter calls)
-- Lets us track prompt + raw model output over time for prompt tuning.
-- Text-only: the receipt image itself is NOT stored here.

CREATE TABLE IF NOT EXISTS public.ai_receipt_debug_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  model TEXT NOT NULL,
  prompt TEXT NOT NULL,
  raw_response TEXT,
  parsed_transaction_count INTEGER,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  latency_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_ai_receipt_debug_logs_user_id ON public.ai_receipt_debug_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_receipt_debug_logs_created_at ON public.ai_receipt_debug_logs(created_at DESC);

ALTER TABLE public.ai_receipt_debug_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own debug logs" ON public.ai_receipt_debug_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own debug logs" ON public.ai_receipt_debug_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
