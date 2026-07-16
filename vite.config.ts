import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Dev/preview proxy so the browser can call OpenAI-compatible APIs without CORS.
 * Client calls: POST /llm-proxy?target=https://api.x.ai/v1/chat/completions
 * rewritten to:  POST https://api.x.ai/v1/chat/completions
 */
function llmProxyPlugin(): Plugin {
  const handler = async (
    req: import("http").IncomingMessage,
    res: import("http").ServerResponse
  ) => {
    try {
      const host = req.headers.host ?? "localhost";
      const url = new URL(req.url ?? "/", `http://${host}`);
      const targetBase = url.searchParams.get("target");
      if (!targetBase) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: { message: "Missing target query" } }));
        return;
      }

      let target: URL;
      try {
        target = new URL(targetBase);
      } catch {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: { message: "Invalid target URL" } }));
        return;
      }

      if (target.protocol !== "https:" && target.protocol !== "http:") {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({ error: { message: "target must be http(s)" } })
        );
        return;
      }

      // Append remaining path after /llm-proxy (e.g. /chat/completions)
      const prefix = "/llm-proxy";
      const rest = url.pathname.startsWith(prefix)
        ? url.pathname.slice(prefix.length)
        : "";
      const dest = new URL(
        `${target.toString().replace(/\/$/, "")}${rest || ""}`
      );

      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const body = Buffer.concat(chunks);

      const headers: Record<string, string> = {};
      const auth = req.headers.authorization;
      if (auth) headers.Authorization = auth;
      const contentType = req.headers["content-type"];
      if (contentType) headers["Content-Type"] = contentType;
      headers.Accept = "application/json";

      const upstream = await fetch(dest, {
        method: req.method ?? "POST",
        headers,
        body: body.length > 0 ? body : undefined,
      });

      res.statusCode = upstream.status;
      const ct = upstream.headers.get("content-type");
      if (ct) res.setHeader("Content-Type", ct);
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.end(buf);
    } catch (err) {
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: {
            message:
              err instanceof Error ? err.message : "LLM proxy failed",
          },
        })
      );
    }
  };

  return {
    name: "llm-proxy",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith("/llm-proxy")) {
          void handler(req, res);
          return;
        }
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith("/llm-proxy")) {
          void handler(req, res);
          return;
        }
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), llmProxyPlugin()],
});
