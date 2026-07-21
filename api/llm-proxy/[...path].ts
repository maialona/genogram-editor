/**
 * Vercel serverless proxy for OpenAI-compatible chat APIs.
 * Mirrors the Vite dev middleware in vite.config.ts:
 *   POST /llm-proxy/chat/completions?target=https://api.deepseek.com
 *   → POST https://api.deepseek.com/chat/completions
 *
 * Host allowlist prevents open-proxy / SSRF abuse. Extra hosts via
 * LLM_PROXY_ALLOWED_HOSTS (comma-separated hostnames).
 */

export const config = {
  maxDuration: 60,
};

const DEFAULT_ALLOWED_HOSTS = [
  "api.x.ai",
  "api.openai.com",
  "api.deepseek.com",
];

type VercelReq = {
  method?: string;
  query: Partial<Record<string, string | string[]>>;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type VercelRes = {
  status: (code: number) => VercelRes;
  setHeader: (name: string, value: string) => void;
  end: (body?: string) => void;
};

function headerValue(
  headers: VercelReq["headers"],
  name: string
): string | undefined {
  const raw = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

function getAllowedHosts(): Set<string> {
  const extra = (process.env.LLM_PROXY_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...DEFAULT_ALLOWED_HOSTS, ...extra]);
}

function pathFromQuery(path: string | string[] | undefined): string {
  if (Array.isArray(path)) {
    return path.length > 0 ? `/${path.join("/")}` : "";
  }
  if (typeof path === "string" && path.length > 0) {
    return path.startsWith("/") ? path : `/${path}`;
  }
  return "";
}

function jsonError(res: VercelRes, status: number, message: string): void {
  res.status(status);
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ error: { message } }));
}

function resolveTarget(
  targetBase: string,
  restPath: string
): { ok: true; dest: URL } | { ok: false; status: number; message: string } {
  if (!targetBase) {
    return { ok: false, status: 400, message: "Missing target query" };
  }

  let target: URL;
  try {
    target = new URL(targetBase);
  } catch {
    return { ok: false, status: 400, message: "Invalid target URL" };
  }

  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return { ok: false, status: 400, message: "target must be http(s)" };
  }

  // Production proxy only allows https (except local-style http for rare custom).
  if (target.protocol !== "https:") {
    return {
      ok: false,
      status: 400,
      message: "target must use https on the production proxy",
    };
  }

  const host = target.hostname.toLowerCase();
  if (!getAllowedHosts().has(host)) {
    return {
      ok: false,
      status: 403,
      message: `Host not allowed by proxy: ${host}. Built-in: ${DEFAULT_ALLOWED_HOSTS.join(", ")}. Add more via LLM_PROXY_ALLOWED_HOSTS.`,
    };
  }

  const base = target.toString().replace(/\/$/, "");
  const dest = new URL(`${base}${restPath || ""}`);
  return { ok: true, dest };
}

function serializeBody(body: unknown): string | undefined {
  if (body == null || body === "") return undefined;
  if (typeof body === "string") return body;
  if (Buffer.isBuffer(body)) return body.toString("utf8");
  return JSON.stringify(body);
}

export default async function handler(
  req: VercelReq,
  res: VercelRes
): Promise<void> {
  try {
    if (req.method === "OPTIONS") {
      res.status(204);
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Authorization, Content-Type"
      );
      res.end();
      return;
    }

    if (req.method !== "POST") {
      jsonError(res, 405, "Method not allowed");
      return;
    }

    const targetParam = req.query.target;
    const targetBase =
      typeof targetParam === "string"
        ? targetParam
        : Array.isArray(targetParam)
          ? (targetParam[0] ?? "")
          : "";

    const restPath = pathFromQuery(req.query.path);
    const resolved = resolveTarget(targetBase, restPath);
    if (!resolved.ok) {
      jsonError(res, resolved.status, resolved.message);
      return;
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    const auth = headerValue(req.headers, "authorization");
    if (auth) headers.Authorization = auth;
    const contentType = headerValue(req.headers, "content-type");
    if (contentType) headers["Content-Type"] = contentType;
    else headers["Content-Type"] = "application/json";

    const body = serializeBody(req.body);

    const upstream = await fetch(resolved.dest, {
      method: "POST",
      headers,
      body,
    });

    res.status(upstream.status);
    const ct = upstream.headers.get("content-type");
    if (ct) res.setHeader("Content-Type", ct);
    const text = await upstream.text();
    res.end(text);
  } catch (err) {
    jsonError(
      res,
      502,
      err instanceof Error ? err.message : "LLM proxy failed"
    );
  }
}
