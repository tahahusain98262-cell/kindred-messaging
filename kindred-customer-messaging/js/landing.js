/**
 * Kindred — Landing Page Controller & Motion System (landing.js)
 * Interactive product showcase switcher, mobile navigation, text scramble effects,
 * and scroll-triggered intersection observers.
 */

window.KINDRED_LANDING = (() => {
  const { $, $$, on } = window.KINDRED_UTILS;

  const SCRAMBLE_CHARS = "ABCDEF0123456789_//<>[]*#";

  /**
   * Scramble text effect for technical monospace labels
   */
  function scrambleText(element, duration = 350) {
    if (!element || element.dataset.scrambling === "true") return;
    element.dataset.scrambling = "true";
    const originalText = element.dataset.origText || element.textContent;
    element.dataset.origText = originalText;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      const revealedLength = Math.floor(progress * originalText.length);

      let result = originalText.slice(0, revealedLength);
      for (let i = revealedLength; i < originalText.length; i++) {
        const char = originalText[i];
        if (char === " " || char === "/" || char === "[" || char === "]" || char === "(" || char === ")") {
          result += char;
        } else {
          result += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        }
      }
      element.textContent = result;

      if (progress >= 1) {
        clearInterval(interval);
        element.textContent = originalText;
        element.dataset.scrambling = "false";
      }
    }, 30);
  }

  let lenisInstance = null;

  /**
   * Initialize Lenis smooth scroll and connect with GSAP ScrollTrigger
   */
  function initSmoothScroll() {
    if (typeof Lenis === "undefined") return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    try {
      lenisInstance = new Lenis({
        duration: 1.15,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: "vertical",
        gestureOrientation: "vertical",
        smoothWheel: true,
        wheelMultiplier: 0.9,
        touchMultiplier: 1.5
      });

      function raf(time) {
        if (lenisInstance) lenisInstance.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);

      if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
        gsap.registerPlugin(ScrollTrigger);
        lenisInstance.on("scroll", ScrollTrigger.update);
        gsap.ticker.add((time) => {
          if (lenisInstance) lenisInstance.raf(time * 1000);
        });
        gsap.ticker.lagSmoothing(0);
      }
      document.documentElement.classList.add("lenis");
    } catch (e) {
      console.warn("Lenis initialization skipped:", e);
    }
  }

  /**
   * Initialize Hero living composition, typewriter, counter & mouse parallax
   */
  function initHeroInteractions() {
    const heroStage = $("#hero-pinned-stage");
    if (heroStage) {
      setTimeout(() => heroStage.classList.add("is-loaded"), 80);
    }

    // Typewriter effect on hero kicker
    const kicker = $("#hero-typewriter-kicker");
    if (kicker) {
      const fullText = "01 // THE CONVERSATION LAYER";
      kicker.textContent = "";
      let idx = 0;
      const typeTimer = setInterval(() => {
        if (idx < fullText.length) {
          kicker.textContent += fullText[idx];
          idx++;
        } else {
          clearInterval(typeTimer);
        }
      }, 35);
    }

    // Animated Ticking Counter (0 -> 10)
    const counterEl = $("#hero-sent-count-num");
    if (counterEl) {
      let count = 0;
      const tickTimer = setInterval(() => {
        count++;
        counterEl.textContent = count;
        if (count >= 10) clearInterval(tickTimer);
      }, 85);
    }

    // Gentle Parallax on Mouse Move
    const visual = $("#hero-visual-stage");
    const cardBack = $("#hero-parallax-back");
    const cardFront = $("#hero-dive-card");
    if (visual && cardBack && cardFront && window.innerWidth > 900) {
      on(visual, "mousemove", (e) => {
        const rect = visual.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        cardBack.style.transform = `rotate(-10deg) translate(${x * -6}px, ${y * -6}px)`;
        cardFront.style.transform = `rotate(6deg) translate(${x * 8}px, ${y * 8}px)`;
      });
      on(visual, "mouseleave", () => {
        cardBack.style.transform = "rotate(-10deg) translate(0px, 0px)";
        cardFront.style.transform = "rotate(6deg) translate(0px, 0px)";
      });
    }

    // Hero-to-Demo Scroll-Dive Interaction
    initHeroScrollDive();
  }

  /**
   * Hero Scroll-Dive Transition via GSAP ScrollTrigger & Lenis
   */
  function initHeroScrollDive() {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined" || window.innerWidth <= 900) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    ScrollTrigger.create({
      trigger: "#hero-scroll-track",
      start: "top top",
      end: "bottom bottom",
      scrub: 0.6,
      onUpdate: (self) => {
        const p = self.progress;
        const heroContent = $(".hero-content");
        const cardBack = $("#hero-parallax-back");
        const heroSun = $(".hero-sun");
        const orbit1 = $(".hero-orbit-one");
        const orbit2 = $(".hero-orbit-two");
        const chips = $$(".hero-floating-badge");
        const diveCard = $("#hero-dive-card");
        const cue = $("#scroll-dive-cue");

        if (heroContent) heroContent.style.opacity = Math.max(0, 1 - p * 2.2);
        if (cardBack) cardBack.style.opacity = Math.max(0, 1 - p * 2.5);
        if (heroSun) heroSun.style.opacity = Math.max(0, 1 - p * 3);
        if (orbit1) orbit1.style.opacity = Math.max(0, 1 - p * 3);
        if (orbit2) orbit2.style.opacity = Math.max(0, 1 - p * 3);
        chips.forEach(c => c.style.opacity = Math.max(0, 1 - p * 3));
        if (cue) cue.style.opacity = Math.max(0, 1 - p * 4);

        if (diveCard) {
          const scale = 1 + p * 1.35;
          const rot = 6 * (1 - p);
          const transY = p * 40;
          diveCard.style.transform = `rotate(${rot}deg) scale(${scale}) translateY(${transY}px)`;
        }
      }
    });
  }

  /**
   * Initialize The Ledger cost-of-time strike-through animation
   */
  function initLedgerAnimation() {
    const ledger = $("#section-ledger");
    if (!ledger) return;

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            ledger.classList.add("in-view");
            const strikeLine = $("#ledger-strike-line");
            if (strikeLine) strikeLine.style.transform = "scaleX(1)";
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.3 });
      observer.observe(ledger);
    }
  }

  /**
   * Initialize The Journey of One Message SVG thread drawing
   */
  function initJourneyTimeline() {
    const journey = $("#section-message-journey");
    const activeLine = $("#journey-active-line");
    if (!journey || !activeLine) return;

    if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
      ScrollTrigger.create({
        trigger: "#section-message-journey",
        start: "top 75%",
        end: "bottom 60%",
        scrub: 0.5,
        onUpdate: (self) => {
          const p = self.progress;
          activeLine.setAttribute("x2", String(p * 1200));
        }
      });
    }
  }

  /**
   * Initialize Features Index row hover & artifact switcher
   */
  function initFeaturesIndexHover() {
    const rows = $$(".feature-row");
    const previewBox = $("#features-preview-box");
    const kicker = $("#preview-box-kicker");
    if (!rows.length || !previewBox) return;

    const titles = {
      compose: "LIVE PREVIEW · 01 COMPOSE",
      inbox: "LIVE PREVIEW · 02 TWO-WAY INBOX",
      quiet: "LIVE PREVIEW · 03 QUIET HOURS GUARD",
      suppress: "LIVE PREVIEW · 04 SUPPRESSION ENGINE",
      channels: "LIVE PREVIEW · 05 MULTI-CHANNEL SWITCH",
      audit: "LIVE PREVIEW · 06 AUDIT & COMPLIANCE"
    };

    rows.forEach(row => {
      const activate = () => {
        const target = row.dataset.target;
        if (!target) return;

        rows.forEach(r => r.classList.remove("active"));
        row.classList.add("active");

        const contents = $$(".preview-state-content");
        contents.forEach(c => {
          if (c.dataset.content === target) {
            c.classList.add("active");
          } else {
            c.classList.remove("active");
          }
        });

        if (kicker && titles[target]) {
          kicker.textContent = titles[target];
        }
      };

      on(row, "mouseenter", activate);
      on(row, "click", activate);
    });
  }

  /**
   * Initialize Receipt Section stamp bounce and audit checklist reveal
   */
  function initReceiptSection() {
    const receipt = $("#section-receipt-audit");
    if (!receipt) return;

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            receipt.classList.add("in-view");
            const stamp = $("#receipt-stamp-box");
            if (stamp) {
              stamp.style.transform = "rotate(-8deg) scale(1)";
              stamp.style.opacity = "1";
            }
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.25 });
      observer.observe(receipt);
    }
  }

  /**
   * Cycle announcement ticker messages every 6 seconds
   */
  function initAnnouncementTicker() {
    const textEl = $("#announcement-ticker-text");
    if (!textEl) return;

    const messages = [
      "SANDBOX DEMO ENVIRONMENT · PILOT READY",
      "QUIET HOURS ENFORCED · 8PM-9AM RECIPIENT TIME",
      "1 CONTACT SUPPRESSED · TCPA OPT-OUT HONORED",
      "VERIFIED TELNYX SANDBOX · 10/10 CONSENT AUDITED"
    ];
    let index = 0;

    setInterval(() => {
      textEl.classList.add("ticker-switching");
      setTimeout(() => {
        index = (index + 1) % messages.length;
        textEl.textContent = messages[index];
        textEl.classList.remove("ticker-switching");
      }, 300);
    }, 6000);
  }

  /**
   * Initialize desktop-only custom cursor with contextual label expansion
   */
  function initCustomCursor() {
    const cursor = $("#custom-cursor");
    const label = $("#cursor-label");
    if (!cursor || !label) return;

    // Check touch / reduced motion
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isTouch || isReduced) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let cursorX = mouseX;
    let cursorY = mouseY;
    let isMoving = false;

    window.addEventListener("pointermove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!isMoving) {
        document.body.classList.add("cursor-active");
        isMoving = true;
      }
    });

    window.addEventListener("pointerleave", () => {
      document.body.classList.remove("cursor-active");
      isMoving = false;
    });

    // Smooth RAF cursor positioning
    function renderCursor() {
      cursorX += (mouseX - cursorX) * 0.22;
      cursorY += (mouseY - cursorY) * 0.22;
      cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0) translate(-50%, -50%)`;
      requestAnimationFrame(renderCursor);
    }
    renderCursor();

    // Contextual hover states
    const interactiveSelectors = [
      { sel: ".button-dark, .button-light, .button-outline", text: "[OPEN]" },
      { sel: ".feature-row", text: "[EXPLORE]" },
      { sel: ".journey-station", text: "[AUDIT]" },
      { sel: ".showcase-tab-btn", text: "[SWITCH]" },
      { sel: ".footer-wordmark-text", text: "kindred/" },
      { sel: ".hotspot-trigger", text: "[TOUR]" },
      { sel: "a", text: "[LINK]" }
    ];

    document.addEventListener("pointerover", (e) => {
      for (const item of interactiveSelectors) {
        const target = e.target.closest(item.sel);
        if (target) {
          cursor.classList.add("expanded");
          label.textContent = item.text;
          return;
        }
      }
      cursor.classList.remove("expanded");
    });
  }

  /**
   * Initialize thin left-edge mono scroll index tracking
   */
  function initScrollIndexRail() {
    const items = $$(".scroll-index-item[data-section]");
    if (!items.length) return;

    const sectionIds = ["section-hero", "section-ledger", "section-message-journey", "section-features-index", "section-receipt-audit"];
    const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean);

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            items.forEach(item => {
              if (item.dataset.section === id) {
                item.classList.add("active");
              } else {
                item.classList.remove("active");
              }
            });
          }
        });
      }, { threshold: 0.35 });

      sections.forEach(s => observer.observe(s));
    }
  }

  /**
   * Initialize landing page interactions and motion observers
   */
  function init() {
    initSmoothScroll();
    initHeroInteractions();
    initLedgerAnimation();
    initJourneyTimeline();
    initFeaturesIndexHover();
    initReceiptSection();
    initAnnouncementTicker();
    initCustomCursor();
    initScrollIndexRail();

    // Smooth back to top link
    const btnBackToTop = $("#btn-back-to-top");
    if (btnBackToTop) {
      on(btnBackToTop, "click", (e) => {
        e.preventDefault();
        if (lenisInstance) {
          lenisInstance.scrollTo(0, { duration: 1.2 });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
    }

    // 1. Mobile navigation drawer toggle
    const menuToggle = $(".nav-toggle-btn");
    const mainNav = $(".main-nav");
    if (menuToggle && mainNav) {
      on(menuToggle, "click", () => {
        mainNav.classList.toggle("open");
      });
    }

    // Close mobile nav on anchor link click
    $$(".main-nav a").forEach(a => {
      on(a, "click", () => {
        if (mainNav) mainNav.classList.remove("open");
      });
    });

    // 2. Interactive Product Showcase switcher
    $$(".showcase-tab-btn").forEach(btn => {
      on(btn, "click", () => {
        $$(".showcase-tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const tab = btn.dataset.showcase;

        $$(".showcase-slide").forEach(slide => {
          if (slide.dataset.slide === tab) {
            slide.style.display = "block";
          } else {
            slide.style.display = "none";
          }
        });
      });
    });

    // 3. Technical label text scramble effects on hover
    const scrambleTargets = $$(".mono-kicker, .hero-kicker, .auth-card-kicker, .blueprint-card div:first-child");
    scrambleTargets.forEach(el => {
      on(el, "mouseenter", () => {
        scrambleText(el, 320);
      });
    });

    // 4. Scroll-triggered reveal animations via IntersectionObserver
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            // Optionally scramble any nested mono kickers once when scrolled into view
            const kicker = entry.target.querySelector(".mono-kicker");
            if (kicker && !kicker.dataset.revealed) {
              kicker.dataset.revealed = "true";
              scrambleText(kicker, 400);
            }
          }
        });
      }, {
        threshold: 0.15,
        rootMargin: "0px 0px -40px 0px"
      });

      const animatedCards = $$(".editorial-card, .stat-block, .security-box, .blueprint-card, .timeline-item, .auth-card");
      animatedCards.forEach(card => {
        card.classList.add("reveal-on-scroll");
        observer.observe(card);
      });
    }
  }

  return {
    init,
    scrambleText
  };
})();
