import { buildSystemPrompt } from "./systemPrompt";
import { parseAiGenogramDraft } from "./parseAiResponse";
import type { AiGenerateResult, AiSettings } from "./types";
import { AiClientError } from "./types";

interface ChatCompletionResponse {
  choices?: Array<{
    message?: { content?: string | null };
    finish_reason?: string;
  }>;
  error?: { message?: string; type?: string };
}

function resolveEndpoint(settings: AiSettings): string {
  const apiBase = settings.baseUrl.replace(/\/$/, "");
  if (settings.useProxy) {
    // Path after /llm-proxy is forwarded; target is the API base (e.g. https://api.x.ai/v1)
    return `/llm-proxy/chat/completions?target=${encodeURIComponent(apiBase)}`;
  }
  return `${apiBase}/chat/completions`;
}

/**
 * Call an OpenAI-compatible chat completions API and parse a genogram draft.
 */
export async function generateGenogramDraft(
  description: string,
  settings: AiSettings,
  signal?: AbortSignal
): Promise<AiGenerateResult> {
  const apiKey = settings.apiKey.trim();
  if (!apiKey) {
    throw new AiClientError("no_key", "請先在設定中輸入 API Key");
  }
  if (!/^[\x00-\x7F]+$/.test(apiKey)) {
    throw new AiClientError(
      "invalid_key",
      "API Key 含有無效字元，請重新貼上供應商提供的 API Key"
    );
  }

  const text = description.trim();
  if (!text) {
    throw new AiClientError("empty", "請描述個案的家庭關係");
  }

  const url = resolveEndpoint(settings);
  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildSystemPrompt() },
          {
            role: "user",
            content: `請根據以下描述產生家系圖 JSON：\n\n${text}`,
          },
        ],
      }),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw err;
    }
    const msg = err instanceof Error ? err.message : String(err);
    if (/failed to fetch|networkerror|cors/i.test(msg)) {
      throw new AiClientError(
        "cors",
        "無法連線 API（可能是 CORS 或網路問題）。請開啟「使用本機代理」（本機需 npm run dev；Vercel 部署已內建代理）。"
      );
    }
    throw new AiClientError("network", `網路錯誤：${msg}`);
  }

  let body: ChatCompletionResponse | null = null;
  const rawText = await response.text();
  try {
    body = rawText ? (JSON.parse(rawText) as ChatCompletionResponse) : null;
  } catch {
    body = null;
  }

  if (!response.ok) {
    const apiMsg =
      body?.error?.message ||
      (rawText.length < 280 ? rawText : `HTTP ${response.status}`);
    if (
      response.status === 404 &&
      settings.useProxy &&
      (/NOT_FOUND|page could not be found|Cannot POST \/llm-proxy/i.test(
        rawText
      ) ||
        /NOT_FOUND|page could not be found/i.test(apiMsg))
    ) {
      throw new AiClientError(
        "http",
        "找不到 AI 代理（/llm-proxy）。本機請用 npm run dev；線上請確認已部署含 Vercel serverless proxy 的版本。",
        response.status
      );
    }
    if (response.status === 401 || response.status === 403) {
      const isProxyHostBlock =
        settings.useProxy && /Host not allowed by proxy/i.test(apiMsg);
      throw new AiClientError(
        "http",
        isProxyHostBlock
          ? `代理拒絕此 Base URL（${response.status}）：${apiMsg}`
          : `API Key 無效或權限不足（${response.status}）：${apiMsg}`,
        response.status
      );
    }
    throw new AiClientError(
      "http",
      `API 錯誤（${response.status}）：${apiMsg}`,
      response.status
    );
  }

  const content = body?.choices?.[0]?.message?.content;
  if (!content || !content.trim()) {
    throw new AiClientError("empty", "模型沒有回傳內容，請再試一次");
  }

  const { draft, warnings } = parseAiGenogramDraft(content);
  return { draft, warnings, rawContent: content };
}
