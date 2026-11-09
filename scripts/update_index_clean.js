const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../kindred-customer-messaging/index.html');
let content = fs.readFileSync(indexPath, 'utf8');

// 1. Remove custom cursor
content = content.replace('  <!-- Desktop Custom Cursor -->\n  <div id="custom-cursor" class="custom-cursor"><span class="cursor-label" id="cursor-label">VIEW</span></div>\n', '');
content = content.replace('<div id="custom-cursor" class="custom-cursor"><span class="cursor-label" id="cursor-label">VIEW</span></div>\n', '');

// 2. Identify start and end of #page-landing
const startTag = '<div class="page-container active" id="page-landing">';
const endTagMarker = 'PAGE 2: DEDICATED FEATURES PAGE';

const startIndex = content.indexOf(startTag);
const markerIndex = content.indexOf(endTagMarker);

if (startIndex === -1 || markerIndex === -1) {
  console.error("Could not find delimiters for #page-landing", { startIndex, markerIndex });
  process.exit(1);
}

// Find the last </div> before PAGE 2 marker
const beforeMarker = content.substring(0, markerIndex);
const lastDivIndex = beforeMarker.lastIndexOf('</div>');

const newLandingHtml = `<div class="page-container active" id="page-landing">
    <!-- Top Announcement Bar -->
    <div class="top-announcement">
      <span class="status-badge">SANDBOX DEMO ENVIRONMENT</span>
      <span>PILOT v2.4 · TCPA & QUIET HOURS ENFORCED</span>
    </div>

    <!-- Main Site Header -->
    <header class="site-header">
      <div class="header-inner">
        <a class="brand-wrap" href="#/">
          <span class="brand-circle">k.</span>
          <span>kindred<span class="brand-slash">/</span></span>
        </a>

        <nav class="main-nav" id="main-nav-links">
          <a href="#how-it-works">How It Works</a>
          <a href="#features">Features</a>
          <a href="#security">Security</a>
          <a href="#/dashboard" data-route="/dashboard">Live Demo</a>
        </nav>

        <div class="header-actions">
          <a href="#/login" class="button-outline small" data-route="/login">Sign In</a>
          <a href="#/dashboard" class="button-dark small" data-route="/dashboard">Explore Platform <span>↗</span></a>
          <button class="nav-toggle-btn" aria-label="Toggle navigation menu" id="nav-toggle-btn">☰</button>
        </div>
      </div>
    </header>

    <main class="landing-wrap">
      <!-- 1. Hero Section -->
      <section class="hero-clean" id="hero">
        <div class="site-container">
          <div class="hero-grid">
            <div class="hero-content fade-in-scroll">
              <div class="mono-kicker">
                <span class="kicker-dot"></span>
                <span>KINDRED // RELATIONSHIP AUTOMATION</span>
              </div>
              <h1 class="hero-title">
                Every customer <em class="hero-serif-word">conversation</em>, thoughtfully connected.
              </h1>
              <p class="hero-description">
                One intelligent platform to manage customer relationships, automate timely compliance-checked communication, and build lasting connections through SMS and WhatsApp.
              </p>
              <div class="hero-actions">
                <a class="button-dark" href="#/dashboard" data-route="/dashboard">
                  <span>Explore the platform</span> <span>↗</span>
                </a>
                <a class="button-outline" href="#/signup" data-route="/signup">
                  <span>Get started</span> <span>＋</span>
                </a>
              </div>
              <div class="hero-footnote">
                <span>●</span>
                <span>FROM 10 TEST CONTACTS TO 5,000 BORROWER RELATIONSHIPS</span>
              </div>
            </div>

            <!-- Single Clean Product Visual -->
            <div class="hero-visual-card fade-in-scroll">
              <div class="visual-card-header">
                <div class="sender-info">
                  <div class="sender-avatar">K</div>
                  <div>
                    <div class="sender-name">Kindred Advisory</div>
                    <div class="sender-sub">SMS Verified Channel</div>
                  </div>
                </div>
                <span class="channel-pill">● LIVE CHANNEL</span>
              </div>
              <div class="visual-card-body">
                <div class="message-eyebrow">DIWALI PILOT CAMPAIGN</div>
                <div class="message-text">
                  "Wishing you and your family a very happy Diwali! May the festival bring light, happiness and prosperity. — The Kindred Team"
                </div>
                <div class="message-optout">Reply STOP to opt out</div>
              </div>
              <div class="visual-card-footer">
                <div class="stat-item">
                  <div class="val">147 Chars</div>
                  <div class="lbl">1 GSM Segment</div>
                </div>
                <div class="stat-item">
                  <div class="val">Enforced</div>
                  <div class="lbl">Quiet Hours</div>
                </div>
                <div class="stat-item">
                  <div class="val">10 / 10</div>
                  <div class="lbl">Delivered</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 2. How It Works (3 Simple Steps) -->
      <section class="section-clean" id="how-it-works">
        <div class="site-container">
          <div class="section-header fade-in-scroll">
            <div class="mono-kicker">01 / HOW IT WORKS</div>
            <h2>Three simple steps from intent to delivery.</h2>
            <p>Automate borrower touchpoints without losing the human voice or violating compliance rules.</p>
          </div>
          <div class="steps-grid">
            <div class="step-card fade-in-scroll">
              <span class="step-num">STEP 01</span>
              <h3>Milestone Detection</h3>
              <p>Connect customer loan dates, rate locks, and cultural calendar moments automatically without spreadsheet chaos.</p>
            </div>
            <div class="step-card fade-in-scroll">
              <span class="step-num">STEP 02</span>
              <h3>Autonomous Compliance</h3>
              <p>Built-in TCPA consent verification, automatic quiet-hours scheduling (8 PM - 9 AM), and instant STOP opt-out suppression.</p>
            </div>
            <div class="step-card fade-in-scroll">
              <span class="step-num">STEP 03</span>
              <h3>Two-Way Relationship</h3>
              <p>Incoming borrower replies route to a shared relationship inbox with verified mortgage rate citations and advisor handoff.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- 3. Features (6 Compact Items, 2x3 Grid) -->
      <section class="section-clean" id="features">
        <div class="site-container">
          <div class="section-header fade-in-scroll">
            <div class="mono-kicker">02 / PLATFORM CAPABILITIES</div>
            <h2>Built for high-trust financial relationships.</h2>
            <p>Every tool designed specifically for mortgage professionals, relationship managers, and compliance officers.</p>
          </div>
          <div class="features-grid">
            <div class="feature-item-card fade-in-scroll">
              <span class="feat-tag">TWO-WAY MESSAGING</span>
              <h3>Two-Way Relationship Inbox</h3>
              <p>Unified borrower conversations across SMS and WhatsApp with team collision prevention, verified rate citations, and instant staff handoff.</p>
            </div>
            <div class="feature-item-card fade-in-scroll">
              <span class="feat-tag">CONSENT PROTOCOL</span>
              <h3>Compliance by Default</h3>
              <p>Documented express consent timestamps and source agreements stored per borrower. Immediate STOP suppression protects against TCPA liability.</p>
            </div>
            <div class="feature-item-card fade-in-scroll">
              <span class="feat-tag">CARRIER DELIVERY</span>
              <h3>Smart SMS with GSM-7 Sizing</h3>
              <p>Real-time segment breakdown (147 chars · 1 segment) prevents costly double-billing and broken emoji encodings before carrier dispatch.</p>
            </div>
            <div class="feature-item-card fade-in-scroll">
              <span class="feat-tag">META APPROVED</span>
              <h3>Official WhatsApp Business API</h3>
              <p>Pre-approved Meta holiday and rate snapshot templates with cryptographic authentication and verified business identity.</p>
            </div>
            <div class="feature-item-card fade-in-scroll">
              <span class="feat-tag">RATE BENCHMARKS</span>
              <h3>Mortgage Knowledge Guardrails</h3>
              <p>Weekly conforming benchmarks (6.125% 30-yr fixed) signed off by compliance officers. AI suggestions strictly cite internal tables.</p>
            </div>
            <div class="feature-item-card fade-in-scroll">
              <span class="feat-tag">7-YEAR LOGGING</span>
              <h3>Cryptographic Action Trail</h3>
              <p>Every preview, template approval, delivery status webhook, and opt-out request is recorded chronologically without exposing raw borrower PII.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- 4. Security and Compliance Checklist -->
      <section class="section-clean" id="security">
        <div class="site-container">
          <div class="section-header fade-in-scroll">
            <div class="mono-kicker">03 / SECURITY & COMPLIANCE</div>
            <h2>Trust engineered at every layer.</h2>
            <p>Financial relationship messaging demands rigorous regulatory alignment. Kindred enforces compliance before carrier dispatch.</p>
          </div>
          <div class="checklist-grid">
            <div class="checklist-item fade-in-scroll">
              <div class="check-icon">✓</div>
              <div>
                <strong>TCPA 47 U.S.C. § 227 Compliance</strong>
                <p>Prior express written consent verified for every recipient before message queueing.</p>
              </div>
            </div>
            <div class="checklist-item fade-in-scroll">
              <div class="check-icon">✓</div>
              <div>
                <strong>Quiet Hours Protection</strong>
                <p>Automated restriction preventing outbound dispatch between 8:00 PM and 9:00 AM recipient local time.</p>
              </div>
            </div>
            <div class="checklist-item fade-in-scroll">
              <div class="check-icon">✓</div>
              <div>
                <strong>Immediate Opt-Out Suppression</strong>
                <p>Inbound STOP, UNSUBSCRIBE, or QUIT keywords automatically suppress contacts across all tenant campaigns.</p>
              </div>
            </div>
            <div class="checklist-item fade-in-scroll">
              <div class="check-icon">✓</div>
              <div>
                <strong>Carrier-Grade A2P 10DLC</strong>
                <p>Verified campaign registration with major telecom carriers prevents spam filtering and delivery drops.</p>
              </div>
            </div>
            <div class="checklist-item fade-in-scroll">
              <div class="check-icon">✓</div>
              <div>
                <strong>SOC 2 Type II Architecture</strong>
                <p>Encrypted in transit (TLS 1.3) and at rest (AES-256) with role-based access controls and immutable event trails.</p>
              </div>
            </div>
            <div class="checklist-item fade-in-scroll">
              <div class="check-icon">✓</div>
              <div>
                <strong>Zero AI Hallucination Policy</strong>
                <p>Smart suggestions strictly cite signed rate sheets; speculative or unlicensed advice is prohibited by policy.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 5. Platform Demo (Interactive Preview) -->
      <section class="section-clean" id="platform-demo">
        <div class="site-container">
          <div class="section-header fade-in-scroll">
            <div class="mono-kicker">04 / INTERACTIVE PLATFORM DEMO</div>
            <h2>Experience the workflow firsthand.</h2>
            <p>Switch between the Campaign Composer, Two-Way Inbox, and Knowledge Base to see Kindred in action.</p>
          </div>

          <!-- Showcase Navigation Tabs -->
          <div class="demo-tabs-bar fade-in-scroll">
            <button class="demo-tab-button active" data-showcase="composer">Campaign Composer</button>
            <button class="demo-tab-button" data-showcase="inbox">Two-Way Inbox</button>
            <button class="demo-tab-button" data-showcase="rates">Mortgage Benchmarks</button>
          </div>

          <!-- Slide 1: Campaign Composer -->
          <div class="demo-preview-card showcase-slide fade-in-scroll" data-slide="composer">
            <div class="demo-split">
              <div class="demo-text">
                <span class="mono-kicker">PRE-SEND ORCHESTRATION</span>
                <h3>Preview before you send.</h3>
                <p>
                  Draft messages with real-time GSM-7 SMS segment calculation and pre-approved Meta WhatsApp templates. Run full dry-run sending simulations without broadcasting live messages.
                </p>
                <a href="#/dashboard/composer" class="button-dark small" data-route="/dashboard/composer">
                  <span>Open Composer</span> <span>↗</span>
                </a>
              </div>
              <div class="demo-visual-box">
                <div class="mono-kicker" style="margin-bottom: 10px;">SAMPLE DIWALI PILOT MESSAGE</div>
                <div style="background: #ffffff; padding: 16px; border: 1px solid var(--border-subtle); border-radius: 6px; font-size: 0.9375rem; margin-bottom: 14px; line-height: 1.55;">
                  Wishing you and your family a very happy Diwali! May the festival bring light, happiness and prosperity. — The Kindred Team (Reply STOP to opt out)
                </div>
                <div style="display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 0.75rem; color: var(--ink-muted);">
                  <span>154 Chars · 1 GSM Segment</span>
                  <span style="color: var(--green); font-weight: 600;">✓ Pre-send Checks Passed</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Slide 2: Two-Way Inbox -->
          <div class="demo-preview-card showcase-slide fade-in-scroll" data-slide="inbox" style="display: none;">
            <div class="demo-split">
              <div class="demo-text">
                <span class="mono-kicker">CONVERSATIONAL EXCELLENCE</span>
                <h3>Two-way conversations that know their limits.</h3>
                <p>
                  Inbound customer replies appear instantly in a shared relationship inbox. Our constrained assistant recommends replies citing verified rate sheets while escalating sensitive advice to loan officers.
                </p>
                <a href="#/dashboard/inbox" class="button-dark small" data-route="/dashboard/inbox">
                  <span>Open Two-Way Inbox</span> <span>↗</span>
                </a>
              </div>
              <div class="demo-visual-box">
                <div class="mono-kicker" style="margin-bottom: 10px;">AI SMART REPLY RECOMMENDATION</div>
                <div style="background: var(--lime-subtle); border: 1px solid #c7d89b; padding: 14px; border-radius: 6px; font-size: 0.875rem; margin-bottom: 12px; line-height: 1.55;">
                  <b>Intent:</b> Rate Inquiry (94% High Confidence)<br>
                  <em>"As of today's verified rate update (effective Nov 6, 2026), our conforming 30-year fixed benchmark is at 6.125%..."</em>
                </div>
                <div style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--ink-muted);">
                  Source: Approved Rate Snapshot #2026-W45 · Dual officer sign-off
                </div>
              </div>
            </div>
          </div>

          <!-- Slide 3: Mortgage Benchmarks -->
          <div class="demo-preview-card showcase-slide fade-in-scroll" data-slide="rates" style="display: none;">
            <div class="demo-split">
              <div class="demo-text">
                <span class="mono-kicker">COMPLIANCE INTELLIGENCE</span>
                <h3>Never guess a mortgage rate.</h3>
                <p>
                  All mortgage benchmark data is fed from verified secondary market feeds and signed off weekly by compliance. Disclaimers, APR, and points are automatically calculated.
                </p>
                <a href="#/dashboard/knowledge" class="button-dark small" data-route="/dashboard/knowledge">
                  <span>Explore Knowledge Base</span> <span>↗</span>
                </a>
              </div>
              <div class="demo-visual-box">
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); padding-bottom: 10px; margin-bottom: 10px; font-size: 0.875rem;">
                  <span>30-Yr Fixed Conforming</span>
                  <strong>6.125%</strong>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); padding-bottom: 10px; margin-bottom: 10px; font-size: 0.875rem;">
                  <span>15-Yr Fixed Conforming</span>
                  <strong>5.450%</strong>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.875rem;">
                  <span>FHA 30-Year Fixed</span>
                  <strong>5.750%</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 6. FAQ Section (5 Questions) -->
      <section class="section-clean" id="faq">
        <div class="site-container">
          <div class="section-header fade-in-scroll">
            <div class="mono-kicker">05 / FREQUENTLY ASKED QUESTIONS</div>
            <h2>Everything you need to know.</h2>
            <p>Clear answers on channels, compliance enforcement, and our demonstration pilot environment.</p>
          </div>
          <div class="faq-list">
            <details class="faq-item fade-in-scroll" open>
              <summary class="faq-summary">
                <span>What messaging channels does Kindred support?</span>
                <span class="faq-toggle-icon">＋</span>
              </summary>
              <div class="faq-content">
                Kindred natively supports carrier-grade A2P 10DLC SMS and the official WhatsApp Business Platform (via Meta Cloud API). Each contact profile tracks preferred delivery channels, verified country codes, and consent evidence.
              </div>
            </details>

            <details class="faq-item fade-in-scroll">
              <summary class="faq-summary">
                <span>How does Kindred enforce TCPA and quiet-hours compliance?</span>
                <span class="faq-toggle-icon">＋</span>
              </summary>
              <div class="faq-content">
                Every contact's timezone is resolved via E.164 area code and geographical profile. Automated queueing prevents messages from being transmitted outside of 9:00 AM – 8:00 PM recipient local time. If a campaign is scheduled during quiet hours, messages are automatically queued for the next compliant window.
              </div>
            </details>

            <details class="faq-item fade-in-scroll">
              <summary class="faq-summary">
                <span>Can customers opt out automatically?</span>
                <span class="faq-toggle-icon">＋</span>
              </summary>
              <div class="faq-content">
                Yes. Any inbound keyword such as STOP, UNSUBSCRIBE, END, or QUIT triggers immediate global suppression across all tenant campaigns. The contact is marked suppressed in the directory and logged to the 7-year audit trail.
              </div>
            </details>

            <details class="faq-item fade-in-scroll">
              <summary class="faq-summary">
                <span>Does the AI assistant quote custom interest rates or scenarios?</span>
                <span class="faq-toggle-icon">＋</span>
              </summary>
              <div class="faq-content">
                No. Kindred’s smart suggestions are strictly constrained to cite approved benchmark rate sheets signed off weekly by your compliance officer. The assistant never generates speculative rate promises, APR estimates, or unlicensed credit advice.
              </div>
            </details>

            <details class="faq-item fade-in-scroll">
              <summary class="faq-summary">
                <span>Is this a live telecom service or a demonstration pilot?</span>
                <span class="faq-toggle-icon">＋</span>
              </summary>
              <div class="faq-content">
                This environment is a sandbox demonstration prototype. It comes pre-loaded with 10 verified test borrower contacts, simulated carrier delivery webhooks, compliant rate benchmarks, and interactive composer tools. No actual SMS or WhatsApp fees are incurred.
              </div>
            </details>
          </div>
        </div>
      </section>

      <!-- 7. Final Call To Action (The Single Dark Chapter) -->
      <section class="final-cta-dark">
        <div class="site-container">
          <div class="mono-kicker" style="color: var(--lime);">
            <span class="kicker-dot"></span>
            <span>KINDRED CUSTOMER MESSAGING</span>
          </div>
          <h2>Every conversation counts.<br>Start building lasting connections.</h2>
          <p>
            Experience how automated, compliance-checked messaging transforms customer relationships. Explore the full pilot workspace with 10 pre-loaded borrower relationships.
          </p>
          <div class="cta-buttons">
            <a href="#/dashboard" class="button-light" data-route="/dashboard">
              <span>Launch Pilot Workspace</span> <span>↗</span>
            </a>
            <a href="#/signup" class="button-outline-light" data-route="/signup">
              <span>Create Sandbox Account</span> <span>＋</span>
            </a>
          </div>
        </div>
      </section>
    </main>

    <!-- 8. Clean Site Footer -->
    <footer class="site-footer-clean">
      <div class="site-container">
        <div class="footer-grid">
          <div class="footer-brand-col">
            <a class="brand-wrap" href="#/">
              <span class="brand-circle">k.</span>
              <span>kindred<span class="brand-slash">/</span></span>
            </a>
            <p>Intelligent Customer Messaging and Relationship Automation Platform. Designed for high-trust mortgage lenders and financial advisors.</p>
          </div>
          <div class="footer-links-col">
            <h4>PLATFORM</h4>
            <ul>
              <li><a href="#how-it-works">How It Works</a></li>
              <li><a href="#features">Features</a></li>
              <li><a href="#security">Security & Trust</a></li>
              <li><a href="#faq">Frequently Asked</a></li>
            </ul>
          </div>
          <div class="footer-links-col">
            <h4>CHANNELS</h4>
            <ul>
              <li><a href="#features">A2P 10DLC SMS</a></li>
              <li><a href="#features">WhatsApp Business API</a></li>
              <li><a href="#security">TCPA Quiet Hours</a></li>
              <li><a href="#security">Audit Trail Logging</a></li>
            </ul>
          </div>
          <div class="footer-links-col">
            <h4>WORKSPACE</h4>
            <ul>
              <li><a href="#/dashboard" data-route="/dashboard">Launch Workspace ↗</a></li>
              <li><a href="#/login" data-route="/login">Advisor Sign In</a></li>
              <li><a href="#/signup" data-route="/signup">Create Account</a></li>
            </ul>
          </div>
        </div>

        <div class="footer-bottom-bar">
          <div>
            <span>© 2026 Kindred Messaging Platform Inc. Demonstration Pilot Environment.</span>
          </div>
          <div class="footer-status-pill">
            <span>ALL SYSTEMS OPERATIONAL</span>
          </div>
        </div>
      </div>
    </footer>
  </div>`;

// Splice new content
const updatedContent = content.substring(0, startIndex) + newLandingHtml + content.substring(lastDivIndex + 6);
fs.writeFileSync(indexPath, updatedContent, 'utf8');
console.log("Successfully updated index.html with clean landing structure.");
