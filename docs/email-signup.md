# Email signup on download

Updated: 2026-05-26

The marketing site captures email **when the user clicks any “Download for Mac” button**, then starts the DMG download.

**Email verification** (6-digit code) is available when `verificationApi` is configured. See [email-verification.md](email-verification.md) for Worker + Resend setup.

## Recommended stack: Formspree + static site

| Why Formspree | Detail |
|---|---|
| Works on GitHub Pages | No backend — `fetch()` POST from the browser |
| Free tier | 50 submissions/month |
| Notifications | Email to `hello@offlyn.ai` on each signup |
| Export | CSV or Zapier → Loops, Mailchimp, Notion, etc. |

### Setup (5 minutes)

1. Create account at [formspree.io](https://formspree.io)
2. **New form** → name it `Clipper download`
3. Set notification email to `hello@offlyn.ai`
4. Copy the form endpoint: `https://formspree.io/f/xxxxxxxx`
5. Paste into `config.js`:

```javascript
window.CLIPPER_SIGNUP = {
  downloadUrl: "https://github.com/joelnishanth/clipper-website/releases/download/v1.2.1/Clipper-1.2.1.dmg",
  formEndpoint: "https://formspree.io/f/YOUR_FORM_ID",
  verificationApi: "https://clipper-signup-api.your-account.workers.dev", // or null
  recaptchaSiteKey: "YOUR_RECAPTCHA_V3_SITE_KEY", // or null
  storageKey: "clipper_download_registered_v1",
};
```

6. Commit, push to `main` — GitHub Pages redeploys automatically
7. Submit a test email from the live site and confirm Formspree receives it

### Fields sent

| Field | Example |
|---|---|
| `email` | `user@company.com` |
| `source` | `clipper-website-download` |
| `_subject` | `Clipper download signup` |

## User flow

```
Click "Download for Mac"
        │
        ├─ Returning verified user (same email)? → DMG download
        │
        ├─ verificationApi configured? → email → 6-digit code → verify → download
        │
        ├─ download-status.json → available: false → waitlist message
        │
        └─ First visit (no verification) → modal → email → Formspree → download or waitlist
```

See [email-verification.md](email-verification.md) for the verification step.

## Download 404

If users hit a GitHub 404 after signup, **no release has been published yet**. The site reads `download-status.json`:

- `"available": false` — shows a high-demand waitlist message instead of a broken DMG link (default until first release)
- `"available": true` — triggers `Clipper-1.2.1.dmg` after signup

The **Release Clipper** workflow sets `available: true` automatically when a DMG is published. See [release-setup.md](release-setup.md).

## Local development

With `formEndpoint: null` in `config.js`, the modal still appears but **skips the API** and downloads directly after email entry. Use this for UI testing without burning Formspree quota.

To test the full flow locally, set a real Formspree URL temporarily.

## Alternatives

| Service | Best for |
|---|---|
| **[Loops.so](https://loops.so)** | Product email + waitlist; API from static site |
| **[Buttondown](https://buttondown.com)** | Newsletter-first; embed or API |
| **[Tally](https://tally.so)** | Hosted form embed (less custom UX) |
| **Google Sheet + Apps Script** | Zero cost, full control, more setup |
| **Supabase / Firebase** | If you already have a backend |

Formspree is the default because it matches GitHub Pages with minimal setup.

## Privacy copy

The modal states emails are for Clipper updates only. Link to a privacy policy when you have one (recommended before scaling traffic).

## Spam protection

Formspree’s **default reCAPTCHA uses a redirect page** — that breaks our AJAX signup. Pick one:

| Option | When to use |
|---|---|
| **Disable CAPTCHA** (recommended) | Fastest fix; Formspree still filters spam |
| **Custom reCAPTCHA / Turnstile key** | Keep CAPTCHA on the modal; requires widget + keys in `config.js` |

### reCAPTCHA v2 (checkbox — current setup)

| Key | Where |
|---|---|
| **Site key** (public) | `config.js` → `recaptchaSiteKey` |
| **Secret key** (private) | Formspree → form Settings → CAPTCHA → **Custom reCAPTCHA** |
| **Version** | `config.js` → `recaptchaVersion: 2` |

The download modal shows a checkbox widget. Users must tick it before submit.

If you create a **v3** key instead, set `recaptchaVersion: 3` (invisible, no checkbox).

Example `config.js`:

```javascript
recaptchaSiteKey: "6LcxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxX",
recaptchaVersion: 2,
```

In [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin), add domains:

- `clipper.offlyn.ai`
- `localhost` (for local testing)

The modal renders a v2 checkbox and sends `g-recaptcha-response` with each Formspree POST. **Do not** put the secret key in `config.js`.

### Fix: “In order to submit via AJAX…” error

If the modal shows:

> In order to submit via AJAX, you need to set a custom key or reCAPTCHA must be disabled in this form's settings page.

Do this in [Formspree](https://formspree.io):

1. Open form **Clipper download** (`xlgvppoa`)
2. Go to **Settings** → **Spam protection** / **CAPTCHA**
3. **Turn CAPTCHA off** (toggle off), **Save**
4. Retry download on the live site

Verify with:

```bash
curl -s -X POST "https://formspree.io/f/xlgvppoa" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","source":"clipper-website-download"}'
```

Expected: `{"ok":true}` — not an `error` about AJAX/reCAPTCHA.

## Troubleshooting

### Submissions not in Formspree dashboard

1. **Activate the form** — Formspree emails a confirmation link when you create the form. Click it before expecting submissions to appear.
2. **Disable reCAPTCHA** on this form — AJAX signup cannot complete reCAPTCHA unless you embed their widget. In Formspree → form → Settings → disable reCAPTCHA.
3. **Check spam** in Formspree and in `hello@offlyn.ai`.
4. **Ad blockers** — some block `formspree.io`. Test in a private window with extensions off.
5. **Repeat visits** — the email modal always opens on Download. Returning users see their saved email pre-filled (`clipper_download_email_v1`); clear `clipper_download_registered_v1` and `clipper_download_email_v1` in DevTools to re-test as a new visitor.

### User sees an error in the modal

Open the browser console (⌥⌘I → Console). Common causes:

| Error | Fix |
|---|---|
| AJAX / custom key / reCAPTCHA | Formspree → form Settings → **disable CAPTCHA** (see [Spam protection](#spam-protection)) |
| CORS / blocked by client | Disable ad blocker; if using a custom domain, submit once so Formspree allowlists it |
| 422 validation | Invalid email format |
| 403 / 429 | Form locked or Formspree rate limit — upgrade plan or wait |

### API test (should return `"ok":true`)

```bash
curl -s -X POST "https://formspree.io/f/xlgvppoa" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","_replyto":"you@example.com","source":"clipper-website-download"}'
```
