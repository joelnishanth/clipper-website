/** @type {Readonly<{ downloadUrl: string; formEndpoint: string | null; verificationApi: string | null; recaptchaSiteKey: string | null; recaptchaVersion: 2 | 3; storageKey: string; emailStorageKey: string }>} */
window.CLIPPER_SIGNUP = {
  /** GitHub release DMG — opened after successful signup */
  downloadUrl:
    "https://github.com/joelnishanth/clipper-website/releases/download/v1.5.2/Clipper-1.5.2.dmg",

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
   * Google reCAPTCHA site key (public — safe in the browser).
   * Create at https://www.google.com/recaptcha/admin (add clipper.offlyn.ai).
   * Paste the SECRET key in Formspree → Settings → CAPTCHA → Custom reCAPTCHA.
   * Set recaptchaSiteKey to null if CAPTCHA is disabled in Formspree.
   */
  recaptchaSiteKey: "6LfRiP4sAAAAAF7iBFuDN11G0R4mJhF-Q4M9-D7p",

  /** 2 = checkbox widget (Formspree custom v2 key). 3 = invisible score-based key. */
  recaptchaVersion: 2,

  /** localStorage key — set after a successful verified signup */
  storageKey: "clipper_download_registered_v1",

  /** Saved email for pre-fill on repeat download clicks */
  emailStorageKey: "clipper_download_email_v1",
};
