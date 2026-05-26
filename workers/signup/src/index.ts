export interface Env {
  SIGNUP_KV: KVNamespace;
  RESEND_API_KEY: string;
  CODE_SECRET: string;
  FORMSPREE_ENDPOINT?: string;
  FROM_EMAIL: string;
  ALLOWED_ORIGINS: string;
}

type PendingRecord = {
  codeHash: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
};

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

const EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");
    const corsHeaders = buildCorsHeaders(origin, env.ALLOWED_ORIGINS);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    try {
      if (request.method === "POST" && url.pathname === "/v1/send-code") {
        const body = await readJson<{ email?: string }>(request);
        const email = normalizeEmail(body.email);
        if (!email || !EMAIL_PATTERN.test(email)) {
          return json({ ok: false, error: "Enter a valid email address." }, 422, corsHeaders);
        }
        await handleSendCode(email, env);
        return json({ ok: true, expiresIn: CODE_TTL_MS / 1000 }, 200, corsHeaders);
      }

      if (request.method === "POST" && url.pathname === "/v1/verify-code") {
        const body = await readJson<{ email?: string; code?: string }>(request);
        const email = normalizeEmail(body.email);
        const code = (body.code || "").trim();
        if (!email || !EMAIL_PATTERN.test(email)) {
          return json({ ok: false, error: "Enter a valid email address." }, 422, corsHeaders);
        }
        if (!/^\d{6}$/.test(code)) {
          return json({ ok: false, error: "Enter the 6-digit code from your email." }, 422, corsHeaders);
        }
        await handleVerifyCode(email, code, env);
        return json({ ok: true }, 200, corsHeaders);
      }

      return json({ ok: false, error: "Not found" }, 404, corsHeaders);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong.";
      const status = message.includes("Wait") ? 429 : message.includes("Invalid") ? 401 : 400;
      return json({ ok: false, error: message }, status, corsHeaders);
    }
  },
};

async function handleSendCode(email: string, env: Env): Promise<void> {
  const key = kvKey(email);
  const now = Date.now();
  const existing = await env.SIGNUP_KV.get<PendingRecord>(key, "json");

  if (existing && now - existing.lastSentAt < RESEND_COOLDOWN_MS) {
    const retryAfter = Math.ceil((RESEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000);
    throw new Error(`Wait ${retryAfter}s before requesting another code.`);
  }

  const code = generateCode();
  const codeHash = await hashCode(email, code, env.CODE_SECRET);
  const record: PendingRecord = {
    codeHash,
    expiresAt: now + CODE_TTL_MS,
    attempts: 0,
    lastSentAt: now,
  };

  await env.SIGNUP_KV.put(key, JSON.stringify(record), {
    expirationTtl: Math.ceil(CODE_TTL_MS / 1000) + 60,
  });

  await sendVerificationEmail(email, code, env);
}

async function handleVerifyCode(email: string, code: string, env: Env): Promise<void> {
  const key = kvKey(email);
  const record = await env.SIGNUP_KV.get<PendingRecord>(key, "json");

  if (!record) {
    throw new Error("Invalid or expired code. Request a new one.");
  }

  if (Date.now() > record.expiresAt) {
    await env.SIGNUP_KV.delete(key);
    throw new Error("Invalid or expired code. Request a new one.");
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await env.SIGNUP_KV.delete(key);
    throw new Error("Too many attempts. Request a new code.");
  }

  const codeHash = await hashCode(email, code, env.CODE_SECRET);
  if (codeHash !== record.codeHash) {
    record.attempts += 1;
    await env.SIGNUP_KV.put(key, JSON.stringify(record), {
      expirationTtl: Math.ceil((record.expiresAt - Date.now()) / 1000) + 60,
    });
    throw new Error("Invalid code. Check your email and try again.");
  }

  await env.SIGNUP_KV.delete(key);
  await notifyFormspree(email, env);
}

async function notifyFormspree(email: string, env: Env): Promise<void> {
  if (!env.FORMSPREE_ENDPOINT) return;

  const response = await fetch(env.FORMSPREE_ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      _replyto: email,
      source: "clipper-website-download",
      verified: true,
      _subject: "Clipper download signup (verified)",
    }),
  });

  if (!response.ok) {
    console.error("Formspree notification failed", response.status, await response.text());
  }
}

async function sendVerificationEmail(email: string, code: string, env: Env): Promise<void> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL,
      to: [email],
      subject: `${code} is your Clipper download code`,
      html: renderEmailHtml(code),
      text: renderEmailText(code),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("Resend error", response.status, detail);
    throw new Error("Could not send verification email. Try again in a moment.");
  }
}

function renderEmailHtml(code: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#18181b;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:420px;background:#ffffff;border:1px solid rgba(110,92,225,0.18);border-radius:16px;padding:32px 28px;">
            <tr>
              <td>
                <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#6e5ce1;">Clipper for Mac</p>
                <h1 style="margin:0 0 12px;font-size:24px;font-weight:600;line-height:1.2;">Verify your email</h1>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#52525b;">Enter this code on the download page to confirm your email and start your download.</p>
                <p style="margin:0 0 8px;font-size:13px;color:#71717a;">Your verification code</p>
                <p style="margin:0 0 24px;font-size:32px;font-weight:700;letter-spacing:0.28em;color:#18181b;">${code}</p>
                <p style="margin:0;font-size:13px;line-height:1.5;color:#71717a;">This code expires in 10 minutes. If you did not request Clipper, you can ignore this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderEmailText(code: string): string {
  return `Your Clipper download verification code is ${code}.\n\nEnter it on the download page to confirm your email. The code expires in 10 minutes.\n\nIf you did not request Clipper, ignore this email.`;
}

function generateCode(): string {
  const value = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return value.toString().padStart(6, "0");
}

async function hashCode(email: string, code: string, secret: string): Promise<string> {
  const data = new TextEncoder().encode(`${email}:${code}:${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function kvKey(email: string): string {
  return `pending:${email}`;
}

function buildCorsHeaders(origin: string | null, allowedOrigins: string): HeadersInit {
  const allowed = allowedOrigins.split(",").map((item) => item.trim());
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };

  if (origin && allowed.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new Error("Invalid request body.");
  }
}

function json(body: Record<string, unknown>, status: number, corsHeaders: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...Object.fromEntries(new Headers(corsHeaders).entries()),
      "Content-Type": "application/json",
    },
  });
}
