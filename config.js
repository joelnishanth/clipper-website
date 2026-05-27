/** @type {Readonly<{ downloadUrl: string; formEndpoint: string | null; verificationApi: string | null; turnstileSiteKey: string | null; storageKey: string; emailStorageKey: string }>} */
window.CLIPPER_SIGNUP = {
  /** GitHub release DMG — opened after successful signup */
  downloadUrl:
    "https://github.com/joelnishanth/clipper-website/releases/download/v1.2.1/Clipper-1.2.1.dmg",

  /**
   * Formspree form URL (https://formspree.io/f/xxxxxxxx).
   * Create a free form at https://formspree.io → point notifications to hello@offlyn.ai
   * Set to null to skip API (download only — for local dev).
   */
  formEndpoint: "https://formspree.io/f/xlgvppoa",

  /**
   * Cloudflare Worker URL for email verification (see docs/email-verification.md).
   * Example: "https://clipper-signup-api.your-subdomain.workers.dev"
   * Set to null to skip verification (local UI testing only).
   */
  verificationApi: null,

  /**
   * Cloudflare Turnstile site key (public — safe in the browser).
   * Create at https://dash.cloudflare.com → Turnstile (add clipper.offlyn.ai).
   * Paste the SECRET key in Formspree → Settings → CAPTCHA → Cloudflare Turnstile.
   * Set to null if CAPTCHA is disabled in Formspree.
   */
  turnstileSiteKey: null,

  /** localStorage key — set after a successful verified signup */
  storageKey: "clipper_download_registered_v1",

  /** Saved email for pre-fill on repeat download clicks */
  emailStorageKey: "clipper_download_email_v1",
};
