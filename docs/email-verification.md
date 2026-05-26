# Email verification on download

Updated: 2026-05-26

Download signup uses a **two-step flow** when `verificationApi` is set in `config.js`:

1. User enters email → receives a **6-digit code** by email  
2. User enters the code → email is verified → download starts (or waitlist message)

This confirms the address is real before adding it to the waitlist or starting a download.

## Architecture

```
Browser (GitHub Pages)          Cloudflare Worker              Resend
        │                              │                          │
        │  POST /v1/send-code          │                          │
        ├─────────────────────────────►│  store hashed OTP in KV  │
        │                              ├─────────────────────────►│ send email
        │                              │                          │
        │  POST /v1/verify-code        │                          │
        ├─────────────────────────────►│  validate OTP            │
        │                              ├──────────► Formspree (optional)
        │◄─────────────────────────────┤  { ok: true }            │
        │  trigger DMG download        │                          │
```

| Component | Role |
|---|---|
| `config.js` → `verificationApi` | Worker base URL; `null` disables verification (local dev) |
| `workers/signup/` | Sends codes, validates OTP, optional Formspree notify |
| Resend | Transactional email delivery |
| Cloudflare KV | Short-lived OTP storage (10 min TTL) |
| Formspree | Lead capture after successful verify (server-side) |

## Deploy the Worker (one-time)

### 1. Resend

1. Create account at [resend.com](https://resend.com)
2. Add and verify sending domain (e.g. `offlyn.ai`) — or use `onboarding@resend.dev` for testing
3. Create API key → copy it

### 2. Cloudflare

1. Install Wrangler: `npm install -g wrangler` (or use local `npm install` in `workers/signup`)
2. Log in: `wrangler login`
3. Create KV namespace:

```bash
cd workers/signup
npm install
wrangler kv namespace create SIGNUP_KV
```

4. Paste the returned `id` into `wrangler.toml` (`REPLACE_WITH_KV_NAMESPACE_ID`)
5. Set secrets:

```bash
wrangler secret put RESEND_API_KEY
wrangler secret put CODE_SECRET          # any long random string
wrangler secret put FORMSPREE_ENDPOINT   # https://formspree.io/f/xlgvppoa
```

6. Update `FROM_EMAIL` in `wrangler.toml` once your domain is verified in Resend
7. Deploy:

```bash
npm run deploy
```

Note the workers.dev URL, e.g. `https://clipper-signup-api.your-account.workers.dev`

### 3. Website config

In `config.js`:

```javascript
verificationApi: "https://clipper-signup-api.your-account.workers.dev",
```

Commit and push — GitHub Pages redeploys automatically.

### 4. CORS

`ALLOWED_ORIGINS` in `wrangler.toml` must include your site origin:

```
https://joelnishanth.github.io
```

Add a custom domain here if you use one later.

## User flow

```
Click "Download for Mac"
        │
        ├─ Returning verified user (same email in localStorage)? → download directly
        │
        ├─ verificationApi is null? → email only → Formspree → download (dev mode)
        │
        └─ New user → email → 6-digit code email → verify → download or waitlist
```

## Local development

| `verificationApi` | Behavior |
|---|---|
| `null` | Skip verification; one-step signup (same as before) |
| Worker URL | Full two-step flow; run `npm run dev` in `workers/signup` and point config at `http://127.0.0.1:8787` |

Add `http://127.0.0.1:8080` to `ALLOWED_ORIGINS` for local static server testing.

## API reference

### `POST /v1/send-code`

```json
{ "email": "user@company.com" }
```

Response: `{ "ok": true, "expiresIn": 600 }`

Rate limit: one send per email per 60 seconds.

### `POST /v1/verify-code`

```json
{ "email": "user@company.com", "code": "123456" }
```

Response: `{ "ok": true }`

Max 5 wrong attempts per code; codes expire after 10 minutes.

## Troubleshooting

| Symptom | Fix |
|---|---|
| CORS error in console | Add site origin to `ALLOWED_ORIGINS` in `wrangler.toml` and redeploy |
| “Could not send verification email” | Check `RESEND_API_KEY`; verify `FROM_EMAIL` domain in Resend |
| Code never arrives | Check spam; confirm Resend dashboard shows delivery |
| Formspree empty after verify | Set `FORMSPREE_ENDPOINT` secret on the worker |
| Modal skips verification | Set `verificationApi` in `config.js` (not `null`) |

## Security notes

- OTP codes are hashed before storage in KV (never stored in plaintext)
- Verification is enforced server-side; localStorage only remembers completed signups for UX
- Use a strong random `CODE_SECRET` and rotate if compromised

See also: [email-signup.md](email-signup.md)
