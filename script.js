(function () {
  const menuToggle = document.querySelector(".menu-toggle");
  const navMobile = document.querySelector(".nav-mobile");

  menuToggle?.addEventListener("click", () => {
    navMobile?.classList.toggle("open");
  });

  navMobile?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => navMobile.classList.remove("open"));
  });

  const signupConfig = window.CLIPPER_SIGNUP || {
    downloadUrl:
      "https://github.com/joelnishanth/clipper-website/releases/download/v1.8.0/Clipper-1.8.0.dmg",
    formEndpoint: null,
    verificationApi: null,
    recaptchaSiteKey: null,
    recaptchaVersion: 2,
    storageKey: "clipper_download_registered_v1",
    emailStorageKey: "clipper_download_email_v1",
  };

  let recaptchaLoadPromise = null;
  let recaptchaWidgetId = null;
  let recaptchaToken = "";

  const resetRecaptcha = () => {
    recaptchaToken = "";
    if (recaptchaWidgetId === null || !window.grecaptcha?.reset) return;
    window.grecaptcha.reset(recaptchaWidgetId);
  };

  const loadRecaptchaScript = () => {
    if (window.grecaptcha?.render) return Promise.resolve();
    if (recaptchaLoadPromise) return recaptchaLoadPromise;

    recaptchaLoadPromise = new Promise((resolve, reject) => {
      window.onClipperRecaptchaLoad = () => resolve();

      const script = document.createElement("script");
      script.src = "https://www.google.com/recaptcha/api.js?onload=onClipperRecaptchaLoad&render=explicit";
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        recaptchaLoadPromise = null;
        reject(new Error("Could not load reCAPTCHA."));
      };
      document.head.appendChild(script);
    });

    return recaptchaLoadPromise;
  };

  const renderRecaptchaV2 = async () => {
    const siteKey = signupConfig.recaptchaSiteKey;
    const container = document.getElementById("download-recaptcha-widget");
    if (!siteKey || !container) return;

    await loadRecaptchaScript();

    if (recaptchaWidgetId !== null) {
      return;
    }

    recaptchaWidgetId = window.grecaptcha.render(container, {
      sitekey: siteKey,
      theme: "light",
      callback: (token) => {
        recaptchaToken = token;
      },
      "expired-callback": () => {
        recaptchaToken = "";
      },
    });
  };

  const loadRecaptchaV3 = () => {
    const siteKey = signupConfig.recaptchaSiteKey;
    if (!siteKey) return Promise.resolve();
    if (window.grecaptcha?.execute) return Promise.resolve();
    if (recaptchaLoadPromise) return recaptchaLoadPromise;

    recaptchaLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        recaptchaLoadPromise = null;
        reject(new Error("Could not load reCAPTCHA."));
      };
      document.head.appendChild(script);
    });

    return recaptchaLoadPromise;
  };

  const loadRecaptcha = () => {
    const version = signupConfig.recaptchaVersion ?? 2;
    return version === 3 ? loadRecaptchaV3() : renderRecaptchaV2();
  };

  const getRecaptchaToken = async () => {
    const siteKey = signupConfig.recaptchaSiteKey;
    if (!siteKey) return null;

    const version = signupConfig.recaptchaVersion ?? 2;

    if (version === 3) {
      await loadRecaptchaV3();
      return new Promise((resolve, reject) => {
        window.grecaptcha.ready(() => {
          window.grecaptcha
            .execute(siteKey, { action: "clipper_download" })
            .then(resolve)
            .catch(reject);
        });
      });
    }

    if (recaptchaWidgetId === null) {
      throw new Error("Could not load reCAPTCHA.");
    }

    const token =
      recaptchaToken ||
      window.grecaptcha.getResponse(recaptchaWidgetId) ||
      document.querySelector("#download-recaptcha-widget textarea[name='g-recaptcha-response']")?.value ||
      "";

    if (!token) {
      throw new Error("Complete the reCAPTCHA check below.");
    }

    return token;
  };

  /* ── Download + email signup ── */
  function initDownloadSignup() {
    const modal = document.getElementById("download-modal");
    const form = document.getElementById("download-signup-form");
    const emailInput = document.getElementById("signup-email");
    const errorEl = document.getElementById("download-signup-error");
    const submitBtn = document.getElementById("download-signup-submit");
    const signupState = document.getElementById("download-signup-state");
    const verifyState = document.getElementById("download-verify-state");
    const verifyForm = document.getElementById("download-verify-form");
    const codeInput = document.getElementById("signup-verify-code");
    const verifyErrorEl = document.getElementById("download-verify-error");
    const verifySubmitBtn = document.getElementById("download-verify-submit");
    const verifyEmailDisplay = document.getElementById("verify-email-display");
    const resendBtn = document.getElementById("download-verify-resend");
    const backBtn = document.getElementById("download-verify-back");
    const successState = document.getElementById("download-success-state");
    const successTextEl = document.getElementById("download-signup-success-text");
    const releasesLink = document.getElementById("download-releases-link");
    const triggers = document.querySelectorAll(".js-download");
    const verificationEnabled = Boolean(signupConfig.verificationApi);
    const recaptchaNotice = document.getElementById("download-recaptcha-notice");
    const recaptchaWidget = document.getElementById("download-recaptcha-widget");

    if (!modal || !form || !emailInput || !submitBtn) return;

    if (recaptchaNotice) {
      recaptchaNotice.hidden = !signupConfig.recaptchaSiteKey;
    }
    if (recaptchaWidget) {
      recaptchaWidget.hidden = !signupConfig.recaptchaSiteKey;
      recaptchaWidget.setAttribute(
        "aria-hidden",
        signupConfig.recaptchaSiteKey ? "false" : "true"
      );
    }

    let downloadStatus = {
      available: false,
      downloadUrl: signupConfig.downloadUrl,
      releasesUrl: "https://github.com/joelnishanth/clipper-website/releases",
      pendingMessage:
        "We're experiencing a surge in demand right now. You've been added to the waitlist — we'll email you as soon as a download opens up.",
    };
    let pendingEmail = "";
    let resendTimerId = 0;

    const loadDownloadStatus = async () => {
      try {
        const response = await fetch("/download-status.json", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        downloadStatus = { ...downloadStatus, ...data };
      } catch {
        /* use defaults */
      }
    };

    loadDownloadStatus();

    const emailStorageKey =
      signupConfig.emailStorageKey || `${signupConfig.storageKey}_email`;

    const isRegistered = () => localStorage.getItem(signupConfig.storageKey) === "1";

    const savedEmail = () => {
      try {
        return localStorage.getItem(emailStorageKey) || "";
      } catch {
        return "";
      }
    };

    const markRegistered = (email) => {
      try {
        localStorage.setItem(signupConfig.storageKey, "1");
        if (email) localStorage.setItem(emailStorageKey, email);
      } catch {
        /* private browsing — ignore */
      }
    };

    const triggerDownload = () => {
      const url = downloadStatus.downloadUrl || signupConfig.downloadUrl;
      const link = document.createElement("a");
      link.href = url;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
    };

    const setSubmitLabel = () => {
      const storedEmail = savedEmail();
      const currentEmail = emailInput.value.trim().toLowerCase();
      const returningUser = isRegistered() && storedEmail && storedEmail === currentEmail;

      if (returningUser) {
        submitBtn.textContent = "Download for Mac";
        return;
      }

      submitBtn.textContent = verificationEnabled ? "Send verification code" : "Download for Mac";
    };

    const showSignupForm = () => {
      if (signupState) signupState.hidden = false;
      if (verifyState) verifyState.hidden = true;
      if (successState) successState.hidden = true;
      submitBtn.disabled = false;
      setSubmitLabel();
      if (verifyErrorEl) verifyErrorEl.hidden = true;
      if (codeInput) codeInput.value = "";
    };

    const showVerifyForm = (email) => {
      pendingEmail = email;
      if (signupState) signupState.hidden = true;
      if (verifyState) verifyState.hidden = false;
      if (successState) successState.hidden = true;
      if (verifyEmailDisplay) verifyEmailDisplay.textContent = email;
      if (verifyErrorEl) verifyErrorEl.hidden = true;
      if (verifySubmitBtn) {
        verifySubmitBtn.disabled = false;
        verifySubmitBtn.textContent = "Verify and download";
      }
      window.setTimeout(() => codeInput?.focus(), 50);
    };

    const showPendingMessage = () => {
      if (signupState) signupState.hidden = true;
      if (verifyState) verifyState.hidden = true;
      if (successState) successState.hidden = false;
      if (successTextEl) {
        successTextEl.textContent = downloadStatus.pendingMessage || downloadStatus.message || "";
      }
      if (releasesLink) {
        const releasesUrl = downloadStatus.releasesUrl;
        if (releasesUrl) {
          releasesLink.href = releasesUrl;
          releasesLink.hidden = false;
        } else {
          releasesLink.hidden = true;
        }
      }
    };

    const openModal = () => {
      showSignupForm();
      const storedEmail = savedEmail();
      if (storedEmail) {
        emailInput.value = storedEmail;
      } else {
        emailInput.value = "";
      }
      setSubmitLabel();
      modal.hidden = false;
      modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";

      if (signupConfig.recaptchaSiteKey) {
        window.setTimeout(() => {
          renderRecaptchaV2().catch(() => {
            /* surfaced on submit if still failing */
          });
        }, 0);
      }

      window.setTimeout(() => emailInput.focus(), 50);
    };

    const closeModal = () => {
      modal.hidden = true;
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      if (errorEl) errorEl.hidden = true;
      if (verifyErrorEl) verifyErrorEl.hidden = true;
      form.reset();
      verifyForm?.reset();
      pendingEmail = "";
      window.clearInterval(resendTimerId);
      resendTimerId = 0;
      if (resendBtn) {
        resendBtn.disabled = false;
        resendBtn.textContent = "Resend code";
      }
      resetRecaptcha();
      showSignupForm();
    };

    const completeDownloadFlow = async () => {
      await loadDownloadStatus();
      if (downloadStatus.available) {
        closeModal();
        triggerDownload();
        return;
      }
      showPendingMessage();
    };

    const showError = (message, target = errorEl) => {
      if (!target) return;
      target.textContent = message;
      target.hidden = false;
    };

    const parseApiError = async (response) => {
      try {
        const data = await response.json();
        if (typeof data.error === "string") {
          if (data.error.includes("submit via AJAX")) {
            return `${data.error} Disable CAPTCHA under Formspree → Settings → Spam protection for form xlgvppoa.`;
          }
          return data.error;
        }
        if (Array.isArray(data.errors) && data.errors.length > 0) {
          return data.errors.map((e) => e.message || e.code).join(" ");
        }
      } catch {
        /* ignore */
      }
      return "Something went wrong. Try again or email hi@offlyn.ai.";
    };

    const verificationApiUrl = (path) => {
      const base = (signupConfig.verificationApi || "").replace(/\/$/, "");
      return `${base}${path}`;
    };

    const requestVerificationCode = async (email) => {
      const response = await fetch(verificationApiUrl("/v1/send-code"), {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }
    };

    const verifyEmailCode = async (email, code) => {
      const response = await fetch(verificationApiUrl("/v1/verify-code"), {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code }),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }
    };

    const startResendCooldown = (seconds = 60) => {
      if (!resendBtn) return;
      let remaining = seconds;
      resendBtn.disabled = true;
      resendBtn.textContent = `Resend code in ${remaining}s`;

      window.clearInterval(resendTimerId);
      resendTimerId = window.setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          window.clearInterval(resendTimerId);
          resendTimerId = 0;
          resendBtn.disabled = false;
          resendBtn.textContent = "Resend code";
          return;
        }
        resendBtn.textContent = `Resend code in ${remaining}s`;
      }, 1000);
    };

    const submitSignup = async (email, { verified = false } = {}) => {
      if (isRegistered() && savedEmail() === email) {
        return { ok: true, skipped: true };
      }

      if (verified && signupConfig.verificationApi) {
        markRegistered(email);
        return { ok: true, verified: true };
      }

      if (!signupConfig.formEndpoint) {
        markRegistered(email);
        return { ok: true, skipped: true };
      }

      const payload = {
        email,
        _replyto: email,
        source: "clipper-website-download",
        _subject: "Clipper download signup",
      };

      const recaptchaToken = await getRecaptchaToken();
      if (recaptchaToken) {
        payload["g-recaptcha-response"] = recaptchaToken;
      }

      const response = await fetch(signupConfig.formEndpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      markRegistered(email);
      return { ok: true };
    };

    const handleDownloadIntent = async (event) => {
      event.preventDefault();
      navMobile?.classList.remove("open");
      await loadDownloadStatus();

      openModal();

      if (isRegistered() && !downloadStatus.available) {
        showPendingMessage();
      }
    };

    triggers.forEach((trigger) => {
      trigger.addEventListener("click", handleDownloadIntent);
    });

    modal.querySelectorAll("[data-close-modal]").forEach((el) => {
      el.addEventListener("click", closeModal);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modal.hidden) closeModal();
    });

    emailInput.addEventListener("input", setSubmitLabel);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (errorEl) errorEl.hidden = true;

      const email = emailInput.value.trim().toLowerCase();
      if (!email || !emailInput.checkValidity()) {
        showError("Enter a valid email address.");
        emailInput.focus();
        return;
      }

      submitBtn.disabled = true;
      const returningUser = isRegistered() && savedEmail() === email;

      if (returningUser) {
        submitBtn.textContent = "Starting download…";
      } else if (verificationEnabled) {
        submitBtn.textContent = "Sending code…";
      } else {
        submitBtn.textContent = "Starting download…";
      }

      try {
        if (returningUser) {
          await completeDownloadFlow();
          return;
        }

        if (verificationEnabled) {
          await requestVerificationCode(email);
          showVerifyForm(email);
          startResendCooldown();
          return;
        }

        await submitSignup(email);
        await completeDownloadFlow();
      } catch (error) {
        showError(error instanceof Error ? error.message : "Could not continue. Try again.");
        resetRecaptcha();
      } finally {
        submitBtn.disabled = false;
        setSubmitLabel();
      }
    });

    verifyForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (verifyErrorEl) verifyErrorEl.hidden = true;

      const code = codeInput?.value.trim() || "";
      if (!/^\d{6}$/.test(code)) {
        showError("Enter the 6-digit code from your email.", verifyErrorEl);
        codeInput?.focus();
        return;
      }

      if (!pendingEmail) {
        showSignupForm();
        showError("Enter your email again to request a new code.");
        return;
      }

      if (verifySubmitBtn) {
        verifySubmitBtn.disabled = true;
        verifySubmitBtn.textContent = "Verifying…";
      }

      try {
        await verifyEmailCode(pendingEmail, code);
        await submitSignup(pendingEmail, { verified: true });
        await completeDownloadFlow();
      } catch (error) {
        showError(
          error instanceof Error ? error.message : "Could not verify code. Try again.",
          verifyErrorEl
        );
        if (verifySubmitBtn) {
          verifySubmitBtn.disabled = false;
          verifySubmitBtn.textContent = "Verify and download";
        }
      }
    });

    resendBtn?.addEventListener("click", async () => {
      if (!pendingEmail || resendBtn.disabled) return;
      if (verifyErrorEl) verifyErrorEl.hidden = true;
      resendBtn.disabled = true;
      resendBtn.textContent = "Sending…";

      try {
        await requestVerificationCode(pendingEmail);
        startResendCooldown();
        codeInput?.focus();
      } catch (error) {
        showError(
          error instanceof Error ? error.message : "Could not resend code. Try again.",
          verifyErrorEl
        );
        resendBtn.disabled = false;
        resendBtn.textContent = "Resend code";
      }
    });

    backBtn?.addEventListener("click", () => {
      pendingEmail = "";
      verifyForm?.reset();
      if (verifyErrorEl) verifyErrorEl.hidden = true;
      window.clearInterval(resendTimerId);
      resendTimerId = 0;
      if (resendBtn) {
        resendBtn.disabled = false;
        resendBtn.textContent = "Resend code";
      }
      showSignupForm();
      emailInput.focus();
    });
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── Notes enhancement demo (GSAP crossfade) ── */
  function initNotesDemo() {
    const root = document.getElementById("notes-demo");
    if (!root || typeof gsap === "undefined") return;

    const typingLines = root.querySelectorAll(".typing-line");
    const enhancedLines = root.querySelectorAll(".enhanced-line");
    const gradientEls = root.querySelectorAll(".gradient-text, .gradient-text-grey");
    const enhancedContainer = root.querySelector(".notes-enhanced-layer");
    const phaseBadge = document.getElementById("notes-phase-badge");

    const setPhase = (enhanced) => {
      if (!phaseBadge) return;
      phaseBadge.textContent = enhanced ? "AI enhanced · on-device" : "Your notes";
      phaseBadge.classList.toggle("is-enhanced", enhanced);
    };

    if (prefersReducedMotion) {
      gsap.set(enhancedContainer, { opacity: 1 });
      gsap.set(typingLines, { opacity: 0 });
      gsap.set(gradientEls, { y: "0%" });
      setPhase(true);
      return;
    }

    const clearGradientAnimate = () => {
      gradientEls.forEach((el) => el.classList.remove("gradient-text-animate"));
    };

    setPhase(false);
    gsap.set(enhancedContainer, { opacity: 1 });
    gsap.set(typingLines, { opacity: 1, y: 0 });
    gsap.set(enhancedLines, { opacity: 0 });
    gsap.set(gradientEls, {
      y: "100%",
      onComplete() {
        clearGradientAnimate();
      },
    });

    const tl = gsap.timeline({ delay: 0.6, repeat: -1, repeatDelay: 4, onRepeat: clearGradientAnimate });

    tl.to(typingLines, { opacity: 0, y: -10, duration: 0.35, ease: "power2.in", stagger: 0.04 })
      .call(() => setPhase(true))
      .to(enhancedLines, { opacity: 1, duration: 0.01, stagger: 0.05 }, ">+0.1")
      .to(
        gradientEls,
        {
          y: "0%",
          duration: 0.25,
          ease: "power2.out",
          stagger: {
            each: 0.05,
            onStart() {
              this.targets()[0]?.classList.add("gradient-text-animate");
            },
          },
        },
        "<"
      )
      .to({}, { duration: 3 })
      .call(() => setPhase(false))
      .set(gradientEls, { y: "100%" })
      .set(enhancedLines, { opacity: 0 })
      .set(typingLines, { opacity: 1, y: 0 })
      .call(clearGradientAnimate);
  }

  /* ── Live transcript demo ── */
  const TRANSCRIPT_MESSAGES = [
    { id: 1, speaker: "them", text: "So tell us about AllFound — team size and where you're based?" },
    { id: 2, speaker: "us", text: "We're at about 100 employees, hiring 20 more in Q2." },
    { id: 3, speaker: "them", text: "And you're in SF with a second office?" },
    { id: 4, speaker: "us", text: "Yes — SF HQ plus a growing Austin satellite." },
    { id: 5, speaker: "them", text: "What's your current tooling for internal workflows?" },
    { id: 6, speaker: "us", text: "Tuesday.ai — but data entry is way too manual." },
    { id: 7, speaker: "them", text: "Who's struggling with adoption?" },
    { id: 8, speaker: "us", text: "Finance won't touch it. HR finds it over-engineered." },
    { id: 9, speaker: "them", text: "What are you spending today?" },
    { id: 10, speaker: "us", text: "$180 per employee per year — and leadership wants out." },
    { id: 11, speaker: "them", text: "Any compliance requirements we should know about?" },
    { id: 12, speaker: "us", text: "HIPAA-grade sharing for client documents is non-negotiable." },
    { id: 13, speaker: "them", text: "Makes sense. What does your timeline look like?" },
    { id: 14, speaker: "us", text: "Replacing Tuesday.ai is a top Q2 priority for us." },
    { id: 15, speaker: "them", text: "Happy to send a security whitepaper and set up a broader demo." },
  ];

  function initTranscriptDemo() {
    const panel = document.getElementById("transcript-panel");
    const messagesEl = document.getElementById("transcript-messages");
    if (!panel || !messagesEl) return;

    let messageIndex = 0;
    let intervalId = null;
    let started = false;

    const renderMessage = (msg, isNew) => {
      const bubble = document.createElement("div");
      bubble.className = `transcript-bubble ${msg.speaker}${isNew ? " is-new" : ""}`;
      bubble.textContent = msg.text;
      messagesEl.appendChild(bubble);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    };

    const seedInitial = () => {
      messagesEl.innerHTML = "";
      TRANSCRIPT_MESSAGES.slice(0, 4).forEach((msg) => renderMessage(msg, false));
      messageIndex = 4;
    };

    const startStreaming = () => {
      if (intervalId) return;
      intervalId = window.setInterval(() => {
        if (messageIndex >= TRANSCRIPT_MESSAGES.length) {
          window.clearInterval(intervalId);
          intervalId = null;
          return;
        }
        renderMessage(TRANSCRIPT_MESSAGES[messageIndex], true);
        messageIndex += 1;
      }, 1500);
    };

    const startDemo = () => {
      if (started) return;
      started = true;
      seedInitial();
      if (!prefersReducedMotion) startStreaming();
    };

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              startDemo();
              observer.disconnect();
            }
          });
        },
        { threshold: 0.3 }
      );
      observer.observe(panel);
    } else {
      startDemo();
    }
  }

  /* ── Meeting template carousel ── */
  const MEETING_TEMPLATES = [
    {
      name: "Customer discovery",
      title: "Upstart Health intro call",
      meta: "Today · Jim, Michaela +5",
      sections: [
        {
          heading: "About them",
          items: ["200-employee healthcare startup", "Expanding from Boston to Chicago this year"],
        },
        {
          heading: "Key takeaways",
          items: ["Manual data entry is their biggest pain point", "Need something non-technical teams can use"],
        },
        {
          heading: "Decision-making insights",
          items: ["Jim owns vendor selection", "Michaela needs finance sign-off on pricing"],
        },
        {
          heading: "Budget & timeline",
          items: ["$50–75 per employee per year", "Want to implement before end of Q2"],
        },
        {
          heading: "Next steps",
          items: ["Send product overview deck", "Schedule demo with broader team next week"],
        },
      ],
    },
    {
      name: "Field service",
      title: "CAT 390F — hydraulic fault, Pit 7",
      meta: "Today · Ravi Okonkwo, on-site · Manual: CAT 390F O&M (312 pp.)",
      sections: [
        {
          heading: "Fault reported",
          items: ["Boom drift >40 mm/min with load — operator pulled machine", "Error code E362: main relief valve pressure low"],
        },
        {
          heading: "Diagnosis (ref: manual pp. 187–194)",
          items: ["Main relief valve tested at 4,200 psi — spec is 5,100 psi", "Hydraulic oil sample dark, metallic particles visible", "Boom cylinder rod seal weeping — minor external leak"],
        },
        {
          heading: "Parts & actions taken",
          items: ["Replaced main relief valve cartridge (P/N 284-5658)", "Drained and refilled hydraulic tank — 120 gal CAT HYDO Advanced 10W", "Torqued valve cap to 280 ft-lb per manual p. 192"],
        },
        {
          heading: "Follow-up required",
          items: ["Order boom cylinder reseal kit — schedule for next planned downtime", "Re-sample hydraulic oil at 50-hr mark to confirm no continued contamination", "Update fleet maintenance log in SAP once back in cell range"],
        },
      ],
    },
    {
      name: "User interview",
      title: "Research session #12",
      meta: "Today · Participant A",
      sections: [
        {
          heading: "Background",
          items: ["Product manager at a 50-person SaaS company", "Runs 6–8 external calls per week"],
        },
        {
          heading: "Pain points",
          items: ["Notes scattered across Notion and Apple Notes", "Can't find what was said in last month's call"],
        },
        {
          heading: "Workflow today",
          items: ["Types shorthand during calls", "Spends 20 min after each call cleaning up notes"],
        },
        {
          heading: "Quotes",
          items: ["\"I just want my notes to make sense without extra work\"", "\"Cloud tools make me nervous with client data\""],
        },
        {
          heading: "Follow-ups",
          items: ["Send beta invite when macOS build is ready", "Ask about willingness to pay for offline AI"],
        },
      ],
    },
    {
      name: "Standup",
      title: "Team standup",
      meta: "Today · Engineering",
      sections: [
        {
          heading: "Done yesterday",
          items: ["Merged hybrid search ranking fix", "Added template demo to marketing site"],
        },
        {
          heading: "Doing today",
          items: ["Speaker diarization edge cases", "Onboarding flow for first-time model download"],
        },
        {
          heading: "Blockers",
          items: ["Need Apple Developer cert renewed for notarization"],
        },
        {
          heading: "Kudos",
          items: ["Nice work on the meeting detection false-positive fix"],
        },
      ],
    },
  ];

  const TAB_INTERVAL_MS = 4000;

  function renderTemplateSections(template) {
    const container = document.getElementById("hero-template-sections");
    if (!container) return;
    container.innerHTML = "";

    template.sections.forEach((section, sectionIndex) => {
      const block = document.createElement("div");
      block.className = "template-section";
      block.style.animationDelay = `${sectionIndex * 0.07}s`;

      const title = document.createElement("h4");
      title.textContent = section.heading;
      block.appendChild(title);

      const list = document.createElement("ul");
      list.className = "template-items";
      section.items.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        list.appendChild(li);
      });
      block.appendChild(list);
      container.appendChild(block);
    });
  }

  function initTemplateDemo() {
    const tabsEl = document.querySelector(".hero-template-tabs");
    const titleEl = document.querySelector(".hero-meeting-title");
    const metaEl = document.querySelector(".hero-meeting-meta");
    if (!tabsEl || !titleEl || !metaEl) return;

    let activeIndex = 0;
    let progressKey = 0;
    let intervalId = null;

    const setActive = (index, userInitiated = false) => {
      activeIndex = index;
      if (userInitiated) progressKey += 1;

      const template = MEETING_TEMPLATES[activeIndex];
      titleEl.textContent = template.title;
      metaEl.textContent = template.meta;
      renderTemplateSections(template);

      tabsEl.querySelectorAll(".template-tab").forEach((tab, i) => {
        const isActive = i === activeIndex;
        tab.classList.toggle("is-active", isActive);
        tab.setAttribute("aria-selected", String(isActive));

        let progress = tab.querySelector(".template-tab-progress");
        if (isActive) {
          if (!progress) {
            progress = document.createElement("div");
            progress.className = "template-tab-progress";
            tab.insertBefore(progress, tab.firstChild.nextSibling);
          }
          progress.style.animation = "none";
          // Force reflow to restart CSS animation
          void progress.offsetWidth;
          progress.style.animation = prefersReducedMotion
            ? "none"
            : `progressFill ${TAB_INTERVAL_MS}ms linear forwards`;
          progress.dataset.key = String(progressKey);
        } else if (progress) {
          progress.remove();
        }
      });
    };

    MEETING_TEMPLATES.forEach((template, index) => {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = "template-tab";
      tab.role = "tab";
      tab.setAttribute("aria-selected", "false");
      tab.innerHTML = `<span class="template-tab-bg"></span><span class="template-tab-label">${template.name}</span>`;
      tab.addEventListener("click", () => {
        setActive(index, true);
        restartAutoRotate();
      });
      tabsEl.appendChild(tab);
    });

    const restartAutoRotate = () => {
      if (intervalId) window.clearInterval(intervalId);
      if (prefersReducedMotion) return;
      intervalId = window.setInterval(() => {
        setActive((activeIndex + 1) % MEETING_TEMPLATES.length);
      }, TAB_INTERVAL_MS);
    };

    setActive(0);
    restartAutoRotate();
  }

  initDownloadSignup();
  initNotesDemo();
  initTranscriptDemo();
  initTemplateDemo();
})();
