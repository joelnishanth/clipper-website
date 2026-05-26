/** @type {Readonly<{ downloadUrl: string; formEndpoint: string | null; storageKey: string }>} */
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

  /** localStorage key — repeat visitors skip the modal */
  storageKey: "clipper_download_registered_v1",
};
