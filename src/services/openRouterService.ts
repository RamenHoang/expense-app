import { fetch as expoFetch } from 'expo/fetch';
import { logger } from '../utils/logger';
import { aiDebugLogService } from './aiDebugLogService';

const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || '';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'deepseek/deepseek-v4.1-flash';

const EXTRACTION_PROMPT = `Nhiệm vụ: Trích xuất thông tin của TỪNG MẶT HÀNG (line item) trên hóa đơn trong hình đính kèm.
Chỉ trả về duy nhất mảng JSON, tuyệt đối không in markdown \`\`\`json, không giải thích hay nói thêm bất cứ từ nào.

Quy tắc map dữ liệu cho từng mặt hàng:
- "amount": Thành tiền của mặt hàng (line total). Định dạng số nguyên (integer), không chứa dấu phẩy/chấm/khoảng trắng.
- "date": Lấy ngày in trên hóa đơn (đang ở định dạng Việt Nam DD/MM/YYYY), chuyển đổi bắt buộc sang định dạng YYYY-MM-DD. Mọi mặt hàng đều dùng chung ngày này.
- "description": Tên mặt hàng (giữ nguyên in hoa), kèm theo số lượng và đơn giá trong ngoặc đơn. Ví dụ: "MIEN GOI NEM VIET CUONG 100G-SME (1 Goi x 10100)".

Output format:
[
  {
    "amount": integer,
    "date": "YYYY-MM-DD",
    "description": "string"
  }
]`;

export type AIExtractedTransaction = {
  amount: number;
  date: string | null;
  description: string;
};

/**
 * Scans text for complete top-level `{...}` objects (brace-depth + string-aware),
 * so a partially-streamed JSON array can still yield each finished item early —
 * before the closing `]` (or the whole response) has arrived.
 */
function extractCompleteJsonObjects(text: string): string[] {
  const objects: string[] = [];
  let depth = 0;
  let objStart = -1;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escapeNext) escapeNext = false;
      else if (ch === '\\') escapeNext = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '{') {
      if (depth === 0) objStart = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && objStart !== -1) {
        objects.push(text.slice(objStart, i + 1));
        objStart = -1;
      }
    }
  }

  return objects;
}

function parseTransactionObject(raw: string): AIExtractedTransaction | null {
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj.amount === 'number' && obj.amount > 0) {
      return {
        amount: obj.amount,
        date: typeof obj.date === 'string' ? obj.date : null,
        description: typeof obj.description === 'string' ? obj.description : '',
      };
    }
  } catch {
    // Not a (yet) valid object — ignore.
  }
  return null;
}

/**
 * Reads an OpenAI/OpenRouter-compatible SSE stream, accumulating `delta.content`.
 * Calls `onItem` once per fully-streamed transaction, in order, as soon as it's parseable —
 * callers don't have to wait for the whole response to see results come in one by one.
 * Throws on a mid-stream error payload (`{"error": {...}}` or `finish_reason: "error"`),
 * and always releases the stream reader via `finally`.
 */
async function readSseStream(
  body: ReadableStream<Uint8Array>,
  onItem?: (transaction: AIExtractedTransaction) => void
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let accumulated = '';
  let emittedCount = 0;

  try {
    outer: while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? ''; // keep the last (possibly incomplete) line for next read

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':') || !trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice('data:'.length).trim();
        if (payload === '[DONE]') break outer;

        let json: any;
        try {
          json = JSON.parse(payload);
        } catch {
          continue; // malformed/partial SSE chunk — self-corrects on the next line
        }

        // Mid-stream error: HTTP 200 + SSE already open, but the payload reports a failure.
        if (json.error) {
          throw new Error(json.error.message || 'OpenRouter stream error');
        }
        if (json.choices?.[0]?.finish_reason === 'error') {
          throw new Error('Stream terminated due to error');
        }

        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          accumulated += delta;

          if (onItem) {
            const objects = extractCompleteJsonObjects(accumulated);
            for (; emittedCount < objects.length; emittedCount++) {
              const tx = parseTransactionObject(objects[emittedCount]);
              if (tx) onItem(tx);
            }
          }
        }
      }
    }
  } finally {
    // Always release the reader — on normal completion, an early "[DONE]" break, or a throw above.
    reader.cancel().catch(() => {});
  }

  return accumulated;
}

/**
 * Extracts line items from a receipt image via OpenRouter (streamed).
 * @param onItem called once per transaction as soon as it finishes streaming, in order.
 */
export async function extractTransactionsFromImage(
  base64Image: string,
  mimeType: string = 'image/jpeg',
  onItem?: (transaction: AIExtractedTransaction) => void
): Promise<AIExtractedTransaction[]> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('Missing EXPO_PUBLIC_OPENROUTER_API_KEY');
  }

  const startedAt = Date.now();
  let accumulated = '';

  try {
    const response = await expoFetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        temperature: 0,
        stream: true,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: EXTRACTION_PROMPT },
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${base64Image}` },
              },
            ],
          },
        ],
      }),
    });

    // Pre-stream error: a non-200 means the body is a plain error JSON, not SSE.
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter error ${response.status}: ${errText}`);
    }
    if (!response.body) {
      throw new Error('OpenRouter response has no body to stream');
    }

    accumulated = await readSseStream(response.body, onItem);

    if (!accumulated) {
      throw new Error('OpenRouter returned an empty response');
    }

    const transactions = extractCompleteJsonObjects(accumulated)
      .map(parseTransactionObject)
      .filter((tx): tx is AIExtractedTransaction => tx !== null);

    if (transactions.length === 0) {
      logger.error('[OpenRouter] No valid transaction objects found in model response', accumulated);
      throw new Error('Could not parse transaction data from AI response');
    }

    aiDebugLogService.logReceiptExtraction({
      model: OPENROUTER_MODEL,
      prompt: EXTRACTION_PROMPT,
      rawResponse: accumulated,
      parsedTransactionCount: transactions.length,
      success: true,
      latencyMs: Date.now() - startedAt,
    });

    return transactions;
  } catch (err: any) {
    aiDebugLogService.logReceiptExtraction({
      model: OPENROUTER_MODEL,
      prompt: EXTRACTION_PROMPT,
      rawResponse: accumulated || null,
      success: false,
      errorMessage: err?.message || String(err),
      latencyMs: Date.now() - startedAt,
    });
    throw err;
  }
}
