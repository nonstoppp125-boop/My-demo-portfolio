/* ============================================================
   DATA ANALYST PORTFOLIO — script.js
   Vanilla JavaScript | GitHub Pages | No build tools required
   ============================================================ */

(() => {
  "use strict";

  /* ----------------------------------------------------------
     1. HELPERS
     ---------------------------------------------------------- */

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

  const clamp = (value, min, max) =>
    Math.min(max, Math.max(min, value));

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  const STORAGE_KEY = "glassPortfolioSettingsV1";

  /* ----------------------------------------------------------
     2. DEFAULT SETTINGS
     ---------------------------------------------------------- */

  const defaults = {
    theme: "ice",
    glassBlur: 18,
    glassOpacity: 0.12,
    borderOpacity: 0.24,
    animationSpeed: 1,
    ambientEffects: true,
    characterMovement: true,
    reducedMotion: false,
    lampOn: true
  };

  const themes = {
    ice: {
      name: "Ice Blue",
      accent: "#86e8ff",
      accentRgb: "134, 232, 255",
      secondary: "#7ba7ff",
      glow: "rgba(91, 218, 255, 0.22)"
    },
    lavender: {
      name: "Lavender Mist",
      accent: "#c6a7ff",
      accentRgb: "198, 167, 255",
      secondary: "#91a8ff",
      glow: "rgba(177, 135, 255, 0.22)"
    },
    sage: {
      name: "Sage Glass",
      accent: "#a9edc7",
      accentRgb: "169, 237, 199",
      secondary: "#7fd8d1",
      glow: "rgba(105, 224, 179, 0.20)"
    },
    rose: {
      name: "Rose Quartz",
      accent: "#ffb6d3",
      accentRgb: "255, 182, 211",
      secondary: "#d9a5ff",
      glow: "rgba(255, 142, 194, 0.20)"
    },
    amber: {
      name: "Warm Pearl",
      accent: "#ffd49a",
      accentRgb: "255, 212, 154",
      secondary: "#ffb99a",
      glow: "rgba(255, 186, 104, 0.19)"
    },
    mono: {
      name: "Silver Frost",
      accent: "#e2e9f5",
      accentRgb: "226, 233, 245",
      secondary: "#aab9d0",
      glow: "rgba(197, 213, 239, 0.16)"
    }
  };

  let settings = { ...defaults };
  let lampOn = defaults.lampOn;
  let pointerX = 0.5;
  let pointerY = 0.35;
  let animationFrame = 0;
  let resizeTimer = null;
  let toastTimer = null;

  /* ----------------------------------------------------------
     3. SAFE SETTINGS LOADING
     ---------------------------------------------------------- */

  function loadSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) {
        settings = { ...defaults };
        return;
      }

      const parsed = JSON.parse(saved);

      settings = {
        ...defaults,
        ...parsed
      };

      if (!themes[settings.theme]) {
        settings.theme = defaults.theme;
      }

      settings.glassBlur = clamp(
        Number(settings.glassBlur) || defaults.glassBlur,
        0,
        35
      );

      settings.glassOpacity = clamp(
        Number(settings.glassOpacity) || defaults.glassOpacity,
        0.04,
        0.35
      );

      settings.borderOpacity = clamp(
        Number(settings.borderOpacity) || defaults.borderOpacity,
        0.05,
        0.65
      );

      settings.animationSpeed = clamp(
        Number(settings.animationSpeed) || defaults.animationSpeed,
        0.2,
        2
      );

      lampOn = Boolean(settings.lampOn);
    } catch (error) {
      settings = { ...defaults };
      lampOn = defaults.lampOn;
    }
  }

  function saveSettings() {
    try {
      settings.lampOn = lampOn;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      showToast("Settings apply for this visit only.");
    }
  }

  /* ----------------------------------------------------------
     4. THEME APPLICATION
     ---------------------------------------------------------- */

  function applyTheme(themeName) {
    const theme = themes[themeName];

    if (!theme) return;

    settings.theme = themeName;

    const root = document.documentElement;

    root.style.setProperty("--accent", theme.accent);
    root.style.setProperty("--accent-rgb", theme.accentRgb);
    root.style.setProperty("--accent-secondary", theme.secondary);
    root.style.setProperty("--accent-glow", theme.glow);

    root.dataset.theme = themeName;

    $$("[data-theme-choice]").forEach((button) => {
      const active = button.dataset.themeChoice === themeName;

      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    $$("[data-theme-name]").forEach((element) => {
      element.textContent = theme.name;
    });

    saveSettings();
  }

  /* ----------------------------------------------------------
     5. GLASS SETTINGS
     ---------------------------------------------------------- */

  function applyGlassSettings() {
    const root = document.documentElement;

    root.style.setProperty(
      "--glass-blur",
      `${settings.glassBlur}px`
    );

    root.style.setProperty(
      "--glass-opacity",
      String(settings.glassOpacity)
    );

    root.style.setProperty(
      "--glass-border-opacity",
      String(settings.borderOpacity)
    );

    root.style.setProperty(
      "--animation-speed",
      String(
        settings.reducedMotion || prefersReducedMotion.matches
          ? 0
          : settings.animationSpeed
      )
    );

    document.body.classList.toggle(
      "ambient-disabled",
      !settings.ambientEffects
    );

    document.body.classList.toggle(
      "character-motion-disabled",
      !settings.characterMovement
    );

    document.body.classList.toggle(
      "reduced-motion",
      settings.reducedMotion || prefersReducedMotion.matches
    );

    updateControlValues();
  }

  function updateControlValues() {
    const controls = {
      "[data-setting='glassBlur']": settings.glassBlur,
      "[data-setting='glassOpacity']": settings.glassOpacity,
      "[data-setting='borderOpacity']": settings.borderOpacity,
      "[data-setting='animationSpeed']": settings.animationSpeed
    };

    Object.entries(controls).forEach(([selector, value]) => {
      const input = $(selector);

      if (input) input.value = String(value);
    });

    const ambient = $("[data-setting='ambientEffects']");
    if (ambient) ambient.checked = settings.ambientEffects;

    const character = $("[data-setting='characterMovement']");
    if (character) character.checked = settings.characterMovement;

    const reduced = $("[data-setting='reducedMotion']");
    if (reduced) reduced.checked = settings.reducedMotion;
  }

  function bindRangeSetting(selector, settingName, min, max) {
    const input = $(selector);
    if (!input) return;

    input.addEventListener("input", () => {
      settings[settingName] = clamp(
        Number(input.value),
        min,
        max
      );

      applyGlassSettings();
      saveSettings();
    });
  }

  /* ----------------------------------------------------------
     6. SETTINGS PANEL
     ---------------------------------------------------------- */

  function setPanelOpen(panel, open) {
    if (!panel) return;

    panel.classList.toggle("is-open", open);
    panel.setAttribute("aria-hidden", String(!open));

    const trigger = $(`[aria-controls="${panel.id}"]`);

    if (trigger) {
      trigger.setAttribute("aria-expanded", String(open));
    }

    if (open) {
      const firstControl = $("button, input, select", panel);

      if (firstControl) {
        window.setTimeout(() => firstControl.focus(), 80);
      }
    }
  }

  function toggleSettingsPanel() {
    const panel = $("#settingsPanel, [data-settings-panel]");

    if (!panel) {
      showToast("Add the settings panel markup to index.html first.");
      return;
    }

    setPanelOpen(panel, !panel.classList.contains("is-open"));
  }

  function bindSettingsPanel() {
    $$("[data-settings-toggle], #settingsToggle").forEach((button) => {
      button.addEventListener("click", toggleSettingsPanel);
    });

    $$("[data-settings-close]").forEach((button) => {
      button.addEventListener("click", () => {
        const panel = button.closest(
          "#settingsPanel, [data-settings-panel]"
        );

        setPanelOpen(panel, false);
      });
    });

    $$("[data-theme-choice]").forEach((button) => {
      button.addEventListener("click", () => {
        applyTheme(button.dataset.themeChoice);
      });
    });

    bindRangeSetting(
      "[data-setting='glassBlur']",
      "glassBlur",
      0,
      35
    );

    bindRangeSetting(
      "[data-setting='glassOpacity']",
      "glassOpacity",
      0.04,
      0.35
    );

    bindRangeSetting(
      "[data-setting='borderOpacity']",
      "borderOpacity",
      0.05,
      0.65
    );

    bindRangeSetting(
      "[data-setting='animationSpeed']",
      "animationSpeed",
      0.2,
      2
    );

    [
      "ambientEffects",
      "characterMovement",
      "reducedMotion"
    ].forEach((name) => {
      const input = $(`[data-setting="${name}"]`);

      if (!input) return;

      input.addEventListener("change", () => {
        settings[name] = input.checked;
        applyGlassSettings();
        saveSettings();
      });
    });

    $$("[data-settings-reset]").forEach((button) => {
      button.addEventListener("click", resetSettings);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;

      const panel = $("#settingsPanel, [data-settings-panel]");

      if (panel?.classList.contains("is-open")) {
        setPanelOpen(panel, false);
      }
    });
  }

  function resetSettings() {
    settings = { ...defaults };
    lampOn = defaults.lampOn;

    applyTheme(settings.theme);
    applyGlassSettings();
    applyLampState();
    saveSettings();

    showToast("Appearance settings reset.");
  }

  /* ----------------------------------------------------------
     7. HANGING GLASS LAMP
     Click the rope/control itself to toggle the lamp.
     ---------------------------------------------------------- */

  function applyLampState() {
    document.body.classList.toggle("lamp-on", lampOn);
    document.body.classList.toggle("lamp-off", !lampOn);

    const lamp = $("[data-glass-lamp], #glassLamp");
    const rope = $("[data-lamp-rope], #lampRope");

    if (lamp) {
      lamp.setAttribute("data-state", lampOn ? "on" : "off");
      lamp.setAttribute("aria-label", lampOn ? "Lamp is on" : "Lamp is off");
    }

    if (rope) {
      rope.setAttribute("aria-pressed", String(lampOn));
      rope.setAttribute(
        "aria-label",
        lampOn ? "Turn hanging lamp off" : "Turn hanging lamp on"
      );
    }

    $$("[data-lamp-status]").forEach((element) => {
      element.textContent = lampOn ? "LIGHT ON" : "LIGHT OFF";
    });

    saveSettings();
  }

  function toggleLamp() {
    lampOn = !lampOn;
    applyLampState();

    if (lampOn) {
      showToast("The glass light is glowing.");
      characterReact("happy");
    } else {
      showToast("Ambient light dimmed.");
      characterReact("sleepy");
    }
  }

  function bindLamp() {
    const rope = $("[data-lamp-rope], #lampRope");

    if (rope) {
      rope.addEventListener("click", toggleLamp);

      if (
        rope.tagName !== "BUTTON" &&
        rope.getAttribute("role") !== "button"
      ) {
        rope.setAttribute("role", "button");
        rope.setAttribute("tabindex", "0");
      }

      rope.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggleLamp();
        }
      });
    }

    const lamp = $("[data-glass-lamp], #glassLamp");

    if (lamp) {
      lamp.addEventListener("click", (event) => {
        if (event.target.closest("[data-lamp-rope], #lampRope")) {
          return;
        }

        showToast("Tap the hanging rope to switch the light.");
      });
    }

    applyLampState();
  }

  /* ----------------------------------------------------------
     8. MASCOT INTERACTIONS
     ---------------------------------------------------------- */

  function getMascot() {
    return $(
      "[data-mascot], #mascot, .mascot-character, .mascot-wrap"
    );
  }

  function characterReact(mood) {
    const mascot = getMascot();
    if (!mascot) return;

    mascot.dataset.mood = mood;

    mascot.classList.remove(
      "mascot-react",
      "mascot-happy",
      "mascot-sleepy"
    );

    void mascot.offsetWidth;

    mascot.classList.add("mascot-react");

    if (mood === "happy") mascot.classList.add("mascot-happy");
    if (mood === "sleepy") mascot.classList.add("mascot-sleepy");

    window.setTimeout(() => {
      mascot.classList.remove(
        "mascot-react",
        "mascot-happy",
        "mascot-sleepy"
      );

      if (mascot.dataset.mood === mood) {
        delete mascot.dataset.mood;
      }
    }, 1000);
  }

  function bindMascotInteractions() {
    const mascot = getMascot();

    if (!mascot) return;

    mascot.addEventListener("click", () => {
      const moods = ["happy", "curious", "excited"];
      const nextMood = moods[Math.floor(Math.random() * moods.length)];

      characterReact(nextMood);
      showToast("Your glass companion says hello!");
    });

    mascot.addEventListener("pointerenter", () => {
      if (settings.characterMovement) {
        mascot.classList.add("mascot-hover");
      }
    });

    mascot.addEventListener("pointerleave", () => {
      mascot.classList.remove("mascot-hover");
    });
  }

  function bindPointerMovement() {
    const isTouchOnly =
      window.matchMedia("(hover: none)").matches;

    if (isTouchOnly || prefersReducedMotion.matches) return;

    document.addEventListener(
      "pointermove",
      (event) => {
        pointerX = event.clientX / window.innerWidth;
        pointerY = event.clientY / window.innerHeight;

        document.documentElement.style.setProperty(
          "--pointer-x",
          `${pointerX * 100}%`
        );

        document.documentElement.style.setProperty(
          "--pointer-y",
          `${pointerY * 100}%`
        );

        if (!settings.characterMovement) return;

        const mascot = getMascot();

        if (!mascot) return;

        const moveX = (pointerX - 0.5) * 12;
        const moveY = (pointerY - 0.5) * 9;

        mascot.style.setProperty("--mascot-pointer-x", `${moveX}px`);
        mascot.style.setProperty("--mascot-pointer-y", `${moveY}px`);
      },
      { passive: true }
    );
  }

  /* ----------------------------------------------------------
     9. AMBIENT PARTICLES
     ---------------------------------------------------------- */

  function createAmbientParticles() {
    const container = $(
      "[data-ambient-particles], #ambientParticles"
    );

    if (!container || container.dataset.generated === "true") {
      return;
    }

    container.dataset.generated = "true";

    const fragment = document.createDocumentFragment();
    const particleCount = window.innerWidth < 600 ? 10 : 20;

    for (let i = 0; i < particleCount; i += 1) {
      const particle = document.createElement("span");

      particle.className = "ambient-particle";
      particle.setAttribute("aria-hidden", "true");

      particle.style.setProperty(
        "--particle-x",
        `${Math.random() * 100}%`
      );

      particle.style.setProperty(
        "--particle-y",
        `${Math.random() * 100}%`
      );

      particle.style.setProperty(
        "--particle-size",
        `${2 + Math.random() * 5}px`
      );

      particle.style.setProperty(
        "--particle-delay",
        `${Math.random() * -20}s`
      );

      particle.style.setProperty(
        "--particle-duration",
        `${12 + Math.random() * 18}s`
      );

      fragment.appendChild(particle);
    }

    container.appendChild(fragment);
  }

  /* ----------------------------------------------------------
     10. MOBILE NAVIGATION
     ---------------------------------------------------------- */

  function bindMobileNavigation() {
    const toggle = $(
      "[data-menu-toggle], #menuToggle, .menu-toggle"
    );

    const menu = $(
      "[data-navigation], #primaryNavigation, .primary-navigation"
    );

    if (!toggle || !menu) return;

    toggle.addEventListener("click", () => {
      const open = !menu.classList.contains("is-open");

      menu.classList.toggle("is-open", open);
      toggle.classList.toggle("is-active", open);
      toggle.setAttribute("aria-expanded", String(open));
      menu.setAttribute("aria-hidden", String(!open));
    });

    $$("a", menu).forEach((link) => {
      link.addEventListener("click", () => {
        menu.classList.remove("is-open");
        toggle.classList.remove("is-active");
        toggle.setAttribute("aria-expanded", "false");
        menu.setAttribute("aria-hidden", "true");
      });
    });
  }

  /* ----------------------------------------------------------
     11. SCROLL PROGRESS + REVEAL ANIMATIONS
     ---------------------------------------------------------- */

  function updateScrollProgress() {
    const progress = $(
      "[data-scroll-progress], #scrollProgress"
    );

    if (!progress) return;

    const scrollableHeight =
      document.documentElement.scrollHeight - window.innerHeight;

    const ratio =
      scrollableHeight > 0
        ? window.scrollY / scrollableHeight
        : 0;

    progress.style.transform = `scaleX(${clamp(ratio, 0, 1)})`;
  }

  function bindScrollProgress() {
    let scheduled = false;

    window.addEventListener(
      "scroll",
      () => {
        if (scheduled) return;

        scheduled = true;

        window.requestAnimationFrame(() => {
          updateScrollProgress();
          scheduled = false;
        });
      },
      { passive: true }
    );

    updateScrollProgress();
  }

  function bindRevealAnimations() {
    const elements = $$(
      "[data-reveal], .reveal-on-scroll, .reveal"
    );

    if (!elements.length) return;

    if (
      !("IntersectionObserver" in window) ||
      prefersReducedMotion.matches ||
      settings.reducedMotion
    ) {
      elements.forEach((element) => {
        element.classList.add("is-visible");
      });

      return;
    }

    const observer = new IntersectionObserver(
      (entries, currentObserver) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("is-visible");
          currentObserver.unobserve(entry.target);
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -40px 0px"
      }
    );

    elements.forEach((element) => observer.observe(element));
  }

  /* ----------------------------------------------------------
     12. ACTIVE NAVIGATION LINK
     ---------------------------------------------------------- */

  function bindActiveNavigation() {
    const sections = $$("main section[id], section[id]");

    const links = $$(
      'nav a[href^="#"], [data-navigation] a[href^="#"]'
    );

    if (!sections.length || !links.length) return;

    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          links.forEach((link) => {
            const active =
              link.getAttribute("href") === `#${entry.target.id}`;

            link.classList.toggle("is-active", active);

            if (active) {
              link.setAttribute("aria-current", "location");
            } else {
              link.removeAttribute("aria-current");
            }
          });
        });
      },
      {
        rootMargin: "-30% 0px -55% 0px",
        threshold: 0
      }
    );

    sections.forEach((section) => observer.observe(section));
  }

  /* ----------------------------------------------------------
     13. TOAST NOTIFICATIONS
     ---------------------------------------------------------- */

  function showToast(message) {
    let toast = $("[data-toast], #portfolioToast");

    if (!toast) {
      toast = document.createElement("div");
      toast.id = "portfolioToast";
      toast.dataset.toast = "";
      toast.className = "portfolio-toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add("is-visible");

    window.clearTimeout(toastTimer);

    toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 2600);
  }

  /* ----------------------------------------------------------
     14. BACK TO TOP
     ---------------------------------------------------------- */

  function bindBackToTop() {
    $$("[data-back-to-top], #backToTop").forEach((button) => {
      button.addEventListener("click", () => {
        window.scrollTo({
          top: 0,
          behavior:
            prefersReducedMotion.matches || settings.reducedMotion
              ? "auto"
              : "smooth"
        });
      });
    });
  }

  /* ----------------------------------------------------------
     15. CURRENT YEAR
     ---------------------------------------------------------- */

  function setCurrentYear() {
    $$("[data-current-year], #currentYear").forEach((element) => {
      element.textContent = String(new Date().getFullYear());
    });
  }

  /* ----------------------------------------------------------
     16. LOADING SCREEN
     ---------------------------------------------------------- */

  function hideLoader() {
  const loader = $(
    "#preloader, [data-page-loader], #pageLoader, .page-loader"
  );

  if (!loader) return;

  loader.classList.add("is-hidden");
  loader.setAttribute("aria-hidden", "true");

  window.setTimeout(() => {
    loader.hidden = true;
  }, 700);
}

  /* ----------------------------------------------------------
     17. OPTIONAL CONTACT FORM VALIDATION
     Does not pretend to send messages without a backend.
     ---------------------------------------------------------- */

  function bindContactForm() {
    const form = $("[data-contact-form], #contactForm");

    if (!form) return;

    form.addEventListener("submit", (event) => {
      const action = form.getAttribute("action");

      if (!action || action === "#") {
        event.preventDefault();

        showToast(
          "Contact form needs a real form service or email link."
        );
      }
    });
  }

  /* ----------------------------------------------------------
     18. COPY EMAIL BUTTON
     ---------------------------------------------------------- */

  function bindCopyButtons() {
    $$("[data-copy-text]").forEach((button) => {
      button.addEventListener("click", async () => {
        const value = button.dataset.copyText;

        if (!value) return;

        try {
          await navigator.clipboard.writeText(value);
          showToast("Copied to clipboard.");
        } catch (error) {
          showToast("Clipboard access is unavailable in this browser.");
        }
      });
    });
  }

  /* ----------------------------------------------------------
     19. ACCESSIBLE EXTERNAL LINKS
     ---------------------------------------------------------- */

  function secureExternalLinks() {
    $$('a[target="_blank"]').forEach((link) => {
      const current = link.getAttribute("rel") || "";

      const values = new Set(current.split(/\s+/).filter(Boolean));

      values.add("noopener");
      values.add("noreferrer");

      link.setAttribute("rel", [...values].join(" "));
    });
  }

  /* ----------------------------------------------------------
     20. BOOT
     ---------------------------------------------------------- */

  function init() {
    loadSettings();

    applyTheme(settings.theme);
    applyGlassSettings();

    bindSettingsPanel();
    bindLamp();
    bindMascotInteractions();
    bindPointerMovement();
    createAmbientParticles();
    bindMobileNavigation();
    bindScrollProgress();
    bindRevealAnimations();
    bindActiveNavigation();
    bindBackToTop();
    setCurrentYear();
    bindContactForm();
    bindCopyButtons();
    secureExternalLinks();

    if (document.readyState === "complete") {
      hideLoader();
    } else {
      window.addEventListener("load", hideLoader, { once: true });
    }

    prefersReducedMotion.addEventListener?.("change", () => {
      applyGlassSettings();
    });

    window.addEventListener("resize", () => {
      window.clearTimeout(resizeTimer);

      resizeTimer = window.setTimeout(() => {
        const particles = $(
          "[data-ambient-particles], #ambientParticles"
        );

        if (particles) {
          particles.replaceChildren();
          delete particles.dataset.generated;
          createAmbientParticles();
        }
      }, 250);
    });

    document.documentElement.classList.add("js-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
