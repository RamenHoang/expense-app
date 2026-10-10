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

function extractJsonBlock(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start !== -1 && end !== -1 && end > start) return text.slice(start, end + 1);
  return text.trim();
}

/** Reads an OpenAI/OpenRouter-compatible SSE stream, accumulating `delta.content`. */
async function readSseStream(
  body: ReadableStream<Uint8Array>,
  onChunk?: (accumulatedText: string) => void
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let accumulated = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? ''; // keep the last (possibly incomplete) line for next read

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(':') || !trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice('data:'.length).trim();
      if (payload === '[DONE]') continue;
      try {
        const json = JSON.parse(payload);
        const delta = json.choices?.[0]?.delta?.content ?? '';
        if (delta) {
          accumulated += delta;
          onChunk?.(accumulated);
        }
      } catch {
        // Ignore a malformed/partial SSE chunk — the stream self-corrects on the next line.
      }
    }
  }

  return accumulated;
}

/**
 * Extracts line items from a receipt image via OpenRouter (streamed).
 * @param onChunk called with the accumulated raw text as tokens stream in, for live progress UI.
 */
export async function extractTransactionsFromImage(
  base64Image: string,
  mimeType: string = 'image/jpeg',
  onChunk?: (accumulatedText: string) => void
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

    if (!response.ok || !response.body) {
      const errText = await response.text();
      throw new Error(`OpenRouter error ${response.status}: ${errText}`);
    }

    accumulated = await readSseStream(response.body, onChunk);

    if (!accumulated) {
      throw new Error('OpenRouter returned an empty response');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(extractJsonBlock(accumulated));
    } catch (err) {
      logger.error('[OpenRouter] Failed to parse JSON from model response', accumulated);
      throw new Error('Could not parse transaction data from AI response');
    }

    if (!Array.isArray(parsed)) {
      throw new Error('AI response is not a JSON array');
    }

    const transactions: AIExtractedTransaction[] = parsed
      .filter((tx: any) => tx && typeof tx.amount === 'number' && tx.amount > 0)
      .map((tx: any) => ({
        amount: tx.amount,
        date: typeof tx.date === 'string' ? tx.date : null,
        description: typeof tx.description === 'string' ? tx.description : '',
      }));

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
