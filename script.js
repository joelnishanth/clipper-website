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
      "https://github.com/joelnishanth/clipper-website/releases/latest/download/Clipper-latest.dmg",
    formEndpoint: null,
    storageKey: "clipper_download_registered_v1",
  };

  /* ── Download + email signup ── */
  function initDownloadSignup() {
    const modal = document.getElementById("download-modal");
    const form = document.getElementById("download-signup-form");
    const emailInput = document.getElementById("signup-email");
    const errorEl = document.getElementById("download-signup-error");
    const submitBtn = document.getElementById("download-signup-submit");
    const signupState = document.getElementById("download-signup-state");
    const successState = document.getElementById("download-success-state");
    const successTextEl = document.getElementById("download-signup-success-text");
    const releasesLink = document.getElementById("download-releases-link");
    const triggers = document.querySelectorAll(".js-download");

    if (!modal || !form || !emailInput || !submitBtn) return;

    let downloadStatus = {
      available: false,
      downloadUrl: signupConfig.downloadUrl,
      releasesUrl: "https://github.com/joelnishanth/clipper-website/releases",
      pendingMessage:
        "We're experiencing a surge in demand right now. You've been added to the waitlist — we'll email you as soon as a download opens up.",
    };

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

    const isRegistered = () => localStorage.getItem(signupConfig.storageKey) === "1";

    const markRegistered = () => {
      try {
        localStorage.setItem(signupConfig.storageKey, "1");
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

    const showSignupForm = () => {
      if (signupState) signupState.hidden = false;
      if (successState) successState.hidden = true;
      submitBtn.disabled = false;
      submitBtn.textContent = "Download for Mac";
    };

    const showPendingMessage = () => {
      if (signupState) signupState.hidden = true;
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
      modal.hidden = false;
      modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      window.setTimeout(() => emailInput.focus(), 50);
    };

    const closeModal = () => {
      modal.hidden = true;
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      if (errorEl) errorEl.hidden = true;
      form.reset();
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

    const showError = (message) => {
      if (!errorEl) return;
      errorEl.textContent = message;
      errorEl.hidden = false;
    };

    const submitSignup = async (email) => {
      if (!signupConfig.formEndpoint) {
        markRegistered();
        return { ok: true, skipped: true };
      }

      const response = await fetch(signupConfig.formEndpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          source: "clipper-website-download",
          _subject: "Clipper download signup",
        }),
      });

      if (!response.ok) {
        let detail = "Something went wrong. Try again or email hello@offlyn.ai.";
        try {
          const data = await response.json();
          if (data.error) detail = data.error;
        } catch {
          /* use default */
        }
        throw new Error(detail);
      }

      markRegistered();
      return { ok: true };
    };

    const handleDownloadIntent = async (event) => {
      event.preventDefault();
      navMobile?.classList.remove("open");
      await loadDownloadStatus();

      if (isRegistered()) {
        if (downloadStatus.available) {
          triggerDownload();
        } else {
          openModal();
          showPendingMessage();
        }
        return;
      }

      openModal();
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

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (errorEl) errorEl.hidden = true;

      const honeypot = form.querySelector('input[name="_gotcha"]');
      if (honeypot?.value) {
        closeModal();
        return;
      }

      const email = emailInput.value.trim();
      if (!email || !emailInput.checkValidity()) {
        showError("Enter a valid email address.");
        emailInput.focus();
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Starting download…";

      try {
        await submitSignup(email);
        await completeDownloadFlow();
      } catch (error) {
        showError(error instanceof Error ? error.message : "Could not submit. Try again.");
        submitBtn.disabled = false;
        submitBtn.textContent = "Download for Mac";
      }
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
