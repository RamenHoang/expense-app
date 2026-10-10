import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

export type AIReceiptDebugLogInput = {
  model: string;
  prompt: string;
  rawResponse?: string | null;
  parsedTransactionCount?: number | null;
  success: boolean;
  errorMessage?: string | null;
  latencyMs?: number;
};

export const aiDebugLogService = {
  /** Fire-and-forget: never throws, so it can't break the caller's flow. */
  logReceiptExtraction: async (input: AIReceiptDebugLogInput): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('ai_receipt_debug_logs').insert({
        user_id: user.id,
        model: input.model,
        prompt: input.prompt,
        raw_response: input.rawResponse ?? null,
        parsed_transaction_count: input.parsedTransactionCount ?? null,
        success: input.success,
        error_message: input.errorMessage ?? null,
        latency_ms: input.latencyMs ?? null,
      });

      if (error) {
        logger.error('[AIDebugLog] Failed to insert debug log', error);
      }
    } catch (err) {
      logger.error('[AIDebugLog] Unexpected error while logging', err);
    }
  },
};
