// GET /api/tts?v=sarah&t=Hello  or  POST { v, t }
// Returns audio/mpeg. The API key stays in the server environment.
"use strict";
const { TTS_DEFAULT_KEY, TTS_MAX_CHARS, normTtsText, ttsVoiceByKey } = require("../lib/tts-voices");
const { providerConfigured, buildSpeechRequest } = require("./tts-provider");

const WINDOW_MS = 10 * 60 * 1000;
const buckets = new Map();

function rateLimitMax() {
  const n = Number(process.env.TTS_RATE_LIMIT);
  return Number.isFinite(n) && n > 0 ? n : 120;
}

function resetTtsRateLimit() {
  buckets.clear();
}

function clientIp(req) {
  const headers = req.headers || {};
  const fwd = headers["x-forwarded-for"] || headers["X-Forwarded-For"];
  const raw = Array.isArray(fwd) ? fwd[0] : fwd;
  if (raw) return String(raw).split(",")[0].trim() || "unknown";
  return (req.socket && req.socket.remoteAddress) || "local";
}

function rateLimited(ip) {
  const now = Date.now();
  let bucket = buckets.get(ip);
  if (!bucket || now >= bucket.reset) {
    bucket = { count: 0, reset: now + WINDOW_MS };
    buckets.set(ip, bucket);
  }
  bucket.count += 1;
  if (buckets.size > 2000) {
    for (const [key, value] of buckets) {
      if (now >= value.reset) buckets.delete(key);
    }
  }
  return bucket.count > rateLimitMax();
}

function sendJson(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(obj));
}

function queryOf(req) {
  const raw = req.url || "";
  const q = raw.indexOf("?");
  const params = new URLSearchParams(q >= 0 ? raw.slice(q + 1) : "");
  const fromUrl = { v: params.get("v"), t: params.get("t") };
  if (req.query && typeof req.query === "object" && (req.query.t || req.query.v)) {
    return { v: req.query.v, t: req.query.t };
  }
  return fromUrl;
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    if (!req.body.trim()) return {};
    return JSON.parse(req.body);
  }
  if (typeof req[Symbol.asyncIterator] !== "function") return {};
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buf.length;
    if (size > 8192) {
      const err = new Error("too_large");
      err.status = 400;
      throw err;
    }
    chunks.push(buf);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  return JSON.parse(raw);
}

async function handler(req, res) {
  try {
    const method = req.method || "GET";
    if (method !== "GET" && method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return sendJson(res, 405, { error: "method" });
    }
    if (rateLimited(clientIp(req))) return sendJson(res, 429, { error: "rate_limited" });

    let voiceKey = "";
    let text = "";
    if (method === "GET") {
      const q = queryOf(req);
      voiceKey = q.v;
      text = q.t;
    } else {
      let body;
      try { body = await readJsonBody(req); }
      catch (err) {
        return sendJson(res, err.status || 400, { error: "bad_request" });
      }
      voiceKey = body.v || body.voice;
      text = body.t || body.text;
    }

    const key = String(voiceKey || TTS_DEFAULT_KEY).trim();
    if (!ttsVoiceByKey(key)) return sendJson(res, 400, { error: "unknown_voice" });
    const spoken = normTtsText(text);
    if (!spoken) return sendJson(res, 400, { error: "empty" });
    if (spoken.length > TTS_MAX_CHARS) return sendJson(res, 400, { error: "too_long" });
    if (!providerConfigured()) return sendJson(res, 503, { error: "unconfigured" });

    const request = buildSpeechRequest({ text: spoken, voiceKey: key });
    const upstream = await fetch(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(request.body),
    });
    if (!upstream.ok) {
      try { await upstream.arrayBuffer(); } catch (_) {}
      const status = upstream.status === 401 || upstream.status === 402 || upstream.status === 429
        ? upstream.status
        : 502;
      return sendJson(res, status, { error: "voice_unavailable" });
    }
    const bytes = Buffer.from(await upstream.arrayBuffer());
    if (bytes.length < 64) return sendJson(res, 502, { error: "voice_unavailable" });
    res.statusCode = 200;
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.end(bytes);
  } catch (_) {
    if (!res.headersSent && !res.writableEnded) sendJson(res, 502, { error: "voice_unavailable" });
  }
}

handler.resetTtsRateLimit = resetTtsRateLimit;
module.exports = handler;
