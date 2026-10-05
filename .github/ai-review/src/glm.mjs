// glm.mjs — client Z.ai OpenAI-compatible + parse findings từ phản hồi model.

export class GlmError extends Error {
  constructor(message, { status, retryable } = {}) {
    super(message);
    this.name = 'GlmError';
    this.status = status;
    this.retryable = retryable;
  }
}

const RETRY_DELAYS_MS = [5000, 15000]; // free-tier thường quá tải theo spike — backoff đủ dài
const DEFAULT_BASE_URL = 'https://api.z.ai/api/paas/v4';
const DEFAULT_MODEL = 'glm-5.3-flash';

export async function callGLM({
  system,
  user,
  baseUrl = DEFAULT_BASE_URL,
  apiKey,
  model = DEFAULT_MODEL,
  fetchImpl = fetch,
  timeoutMs = 120000,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
}) {
  if (!apiKey) {
    throw new GlmError('Thiếu AI_API_KEY', { retryable: false });
  }
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  const payload = JSON.stringify({
    model,
    temperature: 0.1,
    max_tokens: 4000,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });

  const attempt = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: payload,
        signal: controller.signal,
      });
      if (!res.ok) {
        // body lỗi có thể là {error:{message}} (OpenAI/Zhipu) hoặc [{error:{message}}] (Gemini),
        // hoặc không phải JSON — đọc text một lần rồi suy ra message.
        const text = await res.text().catch(() => '');
        let errData = null;
        try {
          errData = JSON.parse(text);
        } catch {
          /* giữ text nguyên văn */
        }
        const errObj = Array.isArray(errData) ? errData[0]?.error : errData?.error;
        const apiMsg = errObj?.message ?? (text || `HTTP ${res.status}`).slice(0, 200);
        const retryable = res.status === 429 || res.status >= 500;
        throw new GlmError(`AI API lỗi: ${apiMsg}`, { status: res.status, retryable });
      }
      const data = await res.json().catch(() => ({}));
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        throw new GlmError('AI trả về phản hồi không có nội dung', { retryable: false });
      }
      return content;
    } catch (err) {
      if (err instanceof GlmError) throw err;
      // lỗi mạng / abort → coi như retryable
      throw new GlmError(`AI API lỗi mạng: ${err.message}`, { retryable: true });
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    return { raw: await attempt() };
  } catch (err) {
    if (err instanceof GlmError && err.retryable) {
      let last = err;
      for (const delay of RETRY_DELAYS_MS) {
        await sleep(delay);
        try {
          return { raw: await attempt() };
        } catch (retryErr) {
          if (!(retryErr instanceof GlmError && retryErr.retryable)) throw retryErr;
          last = retryErr;
        }
      }
      throw last;
    }
    throw err;
  }
}

const VALID_SEVERITIES = new Set(['critical', 'major', 'minor']);

export function parseFindings(raw) {
  if (typeof raw !== 'string' || raw.length === 0) return null;

  let text = raw.trim();
  let parsed = tryParse(text);
  if (parsed === undefined) {
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) parsed = tryParse(fence[1].trim());
  }
  if (parsed === undefined) {
    const m = text.match(/"findings"\s*:\s*(\[[\s\S]*\])/);
    if (m) parsed = tryParse(`{"findings": ${m[1]}}`);
  }
  if (parsed === undefined || parsed === null || typeof parsed !== 'object') return null;

  const findings = parsed.findings;
  if (!Array.isArray(findings)) return null;

  return findings.filter(
    (f) => f && typeof f === 'object' && VALID_SEVERITIES.has(f.severity)
  );
}

function tryParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return undefined;
  }
}
