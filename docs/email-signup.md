# Email signup on download

Updated: 2026-05-24

The marketing site captures email **when the user clicks any “Download for Mac” button**, then starts the DMG download.

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
  downloadUrl: "https://github.com/joelnishanth/clipper-website/releases/download/v1.2.0/Clipper-1.2.0.dmg",
  formEndpoint: "https://formspree.io/f/YOUR_FORM_ID",
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
        ├─ download-status.json → available: true + already signed up? → DMG download
        │
        ├─ Already signed up but no release yet? → waitlist / high-demand message
        │
        └─ First visit → modal → email → Formspree → download or pending message
```

## Download 404

If users hit a GitHub 404 after signup, **no release has been published yet**. The site reads `download-status.json`:

- `"available": false` — shows a high-demand waitlist message instead of a broken DMG link (default until first release)
- `"available": true` — triggers `Clipper-1.2.0.dmg` after signup

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

- Formspree built-in spam filtering
- Do **not** enable reCAPTCHA on this form (breaks AJAX signup unless you embed their widget)

## Troubleshooting

### Submissions not in Formspree dashboard

1. **Activate the form** — Formspree emails a confirmation link when you create the form. Click it before expecting submissions to appear.
2. **Disable reCAPTCHA** on this form — AJAX signup cannot complete reCAPTCHA unless you embed their widget. In Formspree → form → Settings → disable reCAPTCHA.
3. **Check spam** in Formspree and in `hello@offlyn.ai`.
4. **Ad blockers** — some block `formspree.io`. Test in a private window with extensions off.
5. **Repeat visits** — after one successful signup, the modal is skipped (`localStorage` key `clipper_download_registered_v1`). Clear it in DevTools to re-test.

### User sees an error in the modal

Open the browser console (⌥⌘I → Console). Common causes:

| Error | Fix |
|---|---|
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
