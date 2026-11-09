/**
 * Kindred — Landing Page Controller (landing.js)
 * Clean, calm, lightweight interactions:
 * - Gentle fade-in on scroll (IntersectionObserver, opacity + 12px translate, once)
 * - Mobile navigation menu toggle
 * - Interactive product showcase tabs (Composer / Inbox / Rates)
 * - Smooth anchor scroll navigation
 */

window.KINDRED_LANDING = (() => {
  const { $, $$ } = window.KINDRED_UTILS || {
    $: (s, c = document) => c.querySelector(s),
    $$: (s, c = document) => Array.from(c.querySelectorAll(s))
  };

  /**
   * Gentle fade-in on scroll:
   * Observes elements with .fade-in-scroll and adds .is-visible once
   */
  function initScrollReveals() {
    if (!("IntersectionObserver" in window)) {
      $$(".fade-in-scroll").forEach(el => el.classList.add("is-visible"));
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      $$(".fade-in-scroll").forEach(el => el.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.08,
      rootMargin: "0px 0px -20px 0px"
    });

    $$(".fade-in-scroll").forEach(el => observer.observe(el));
  }

  /**
   * Mobile Navigation Toggle
   */
  function initMobileNav() {
    const toggleBtn = $("#nav-toggle-btn");
    const mainNav = $("#main-nav-links");
    if (!toggleBtn || !mainNav) return;

    toggleBtn.addEventListener("click", () => {
      mainNav.classList.toggle("open");
    });

    // Close menu when clicking any nav link
    $$("a", mainNav).forEach(a => {
      a.addEventListener("click", () => {
        mainNav.classList.remove("open");
      });
    });
  }

  /**
   * Interactive Demo / Showcase Tabs Switcher
   */
  function initShowcaseTabs() {
    const tabBtns = $$(".demo-tab-button");
    const slides = $$(".showcase-slide");
    if (!tabBtns.length) return;

    tabBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.showcase;
        if (!target) return;

        tabBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        slides.forEach(slide => {
          if (slide.dataset.slide === target) {
            slide.style.display = "block";
          } else {
            slide.style.display = "none";
          }
        });
      });
    });
  }

  /**
   * Smooth Anchor Scroll
   */
  function initSmoothAnchorScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener("click", function (e) {
        const href = this.getAttribute("href");
        if (!href || href.startsWith("#/")) return; // Let client router handle routing
        if (href === "#") return;

        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
  }

  function init() {
    initScrollReveals();
    initMobileNav();
    initShowcaseTabs();
    initSmoothAnchorScroll();
  }

  return {
    init
  };
})();
