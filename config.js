/** @type {Readonly<{ downloadUrl: string; formEndpoint: string | null; storageKey: string; emailStorageKey: string }>} */
window.CLIPPER_SIGNUP = {
  /** GitHub release DMG — opened after successful signup */
  downloadUrl:
    "https://github.com/joelnishanth/clipper-website/releases/download/v1.2.0/Clipper-1.2.0.dmg",

  /**
   * Formspree form URL (https://formspree.io/f/xxxxxxxx).
   * Create a free form at https://formspree.io → point notifications to hello@offlyn.ai
   * Set to null to skip API (download only — for local dev).
   */
  formEndpoint: "https://formspree.io/f/xlgvppoa",

  /** localStorage key — set after a successful signup */
  storageKey: "clipper_download_registered_v1",

  /** Saved email for pre-fill on repeat download clicks */
  emailStorageKey: "clipper_download_email_v1",
};
