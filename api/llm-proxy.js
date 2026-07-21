/**
 * Vercel serverless proxy for OpenAI-compatible chat APIs.
 * Mirrors Vite dev middleware (vite.config.ts):
 *   POST /llm-proxy/chat/completions?target=https://api.deepseek.com
 *   → POST https://api.deepseek.com/chat/completions
 *
 * Host allowlist prevents open-proxy / SSRF abuse.
 * Extra hosts: LLM_PROXY_ALLOWED_HOSTS=host1,host2
 *
 * Note: package.json has "type": "module", so this file uses ESM.
 */

const DEFAULT_ALLOWED_HOSTS = [
  "api.x.ai",
  "api.openai.com",
  "api.deepseek.com",
];

function getAllowedHosts() {
  const extra = (process.env.LLM_PROXY_ALLOWED_HOSTS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...DEFAULT_ALLOWED_HOSTS, ...extra]);
}

function firstQuery(value) {
  if (Array.isArray(value)) return value[0] || "";
  return typeof value === "string" ? value : "";
}

function restPathFromQuery(req) {
  const rest = firstQuery(req.query?.rest) || firstQuery(req.query?.path);
  if (rest) {
    return rest.startsWith("/") ? rest : `/${rest}`;
  }
  const urlPath = (req.url || "").split("?")[0] || "";
  const m = urlPath.match(/\/(?:api\/)?llm-proxy(\/.*)?$/);
  if (m && m[1]) return m[1];
  return "/chat/completions";
}

function resolveTarget(targetBase, restPath) {
  if (!targetBase) {
    return { ok: false, status: 400, message: "Missing target query" };
  }

  let target;
  try {
    target = new URL(targetBase);
  } catch {
    return { ok: false, status: 400, message: "Invalid target URL" };
  }

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

function serializeBody(body) {
  if (body == null || body === "") return undefined;
  if (typeof body === "string") return body;
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(body)) {
    return body.toString("utf8");
  }
  return JSON.stringify(body);
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Authorization, Content-Type"
      );
      res.end();
      return;
    }

    if (req.method === "GET") {
      sendJson(res, 200, {
        ok: true,
        service: "genogram-editor-llm-proxy",
        allowedHosts: [...getAllowedHosts()],
      });
      return;
    }

    if (req.method !== "POST") {
      sendJson(res, 405, { error: { message: "Method not allowed" } });
      return;
    }

    const targetBase = firstQuery(req.query?.target);
    const restPath = restPathFromQuery(req);
    const resolved = resolveTarget(targetBase, restPath);
    if (!resolved.ok) {
      sendJson(res, resolved.status, { error: { message: resolved.message } });
      return;
    }

    const headers = { Accept: "application/json" };
    const auth = req.headers.authorization || req.headers.Authorization;
    if (auth) headers.Authorization = auth;
    const contentType =
      req.headers["content-type"] || req.headers["Content-Type"];
    headers["Content-Type"] = contentType || "application/json";

    const body = serializeBody(req.body);

    const upstream = await fetch(resolved.dest.toString(), {
      method: "POST",
      headers,
      body,
    });

    res.statusCode = upstream.status;
    const ct = upstream.headers.get("content-type");
    if (ct) res.setHeader("Content-Type", ct);
    res.end(await upstream.text());
  } catch (err) {
    sendJson(res, 502, {
      error: {
        message: err instanceof Error ? err.message : "LLM proxy failed",
      },
    });
  }
}
