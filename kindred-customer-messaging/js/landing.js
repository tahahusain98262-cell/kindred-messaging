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

  /**
   * Initialize landing page interactions and motion observers
   */
  function init() {
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
