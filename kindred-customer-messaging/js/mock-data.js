/**
 * Kindred Customer Messaging — Mock Database & Persistence Engine (mock-data.js)
 * Full state management with localStorage persistence for:
 * - Session & Authentication (Login, Signup, Logout, Route Guarding)
 * - Contacts (Create, Read, Update, Delete, Search, Filter)
 * - Campaigns (Create, Update, Delete, Schedule, Filter)
 * - Conversations (Threads, Messages, Inbound Simulation, Inbound STOP Suppression)
 * - Mortgage Rates & FAQs (Compliance Benchmarks)
 * - Settings, Policies & Immutable Audit Logs
 */

window.KINDRED_DATA = (() => {
  const STORAGE_KEY = "kindred_demo_state_v2";

  const INITIAL_STATE = {
    session: {
      isAuthenticated: true, // Default to demo logged-in user, can be logged out
      user: {
        id: "usr_001",
        name: "Rachel Adams",
        email: "rachel.adams@kindredlending.com",
        role: "Compliance Officer & Admin",
        avatar: "RA",
        organization: "Kindred Lending Partners"
      }
    },

    organization: {
      name: "Kindred Lending Partners",
      slug: "kindred-lending",
      tier: "Enterprise Sandbox",
      timezone: "America/New_York (EST)",
      quietHours: "8:00 PM – 9:00 AM EST",
      activeContacts: 10,
      maxContacts: 10,
      channels: {
        sms: { status: "Active (Sandbox)", senderNumber: "+1 (800) 555-0199", profileId: "prof_kd_8291" },
        whatsapp: { status: "Provisioned (Sandbox)", wabaId: "waba_kd_98231", phone: "+1 (800) 555-0199" }
      }
    },

    metrics: {
      totalContacts: 10,
      verifiedConsent: 8,
      pendingProof: 1,
      optedOut: 1,
      messagesSent: 142,
      deliveryRate: 98.6,
      activeCampaigns: 2,
      unreadReplies: 2
    },

    campaigns: [
      {
        id: "cmp-001",
        name: "Diwali Greetings — Pilot 2026",
        channel: "SMS & WhatsApp",
        status: "Draft",
        approvalStatus: "Pending Approval",
        recipientsCount: 10,
        createdAt: "2026-11-06",
        scheduledFor: "2026-11-09 10:00 AM EST",
        messageText: "Wishing you and your family a very happy Diwali! May the festival bring light, happiness and prosperity. — The Kindred Team (Reply STOP to opt out)"
      },
      {
        id: "cmp-002",
        name: "Weekly Rate Advisory — Conforming",
        channel: "WhatsApp",
        status: "Scheduled",
        approvalStatus: "Approved by Compliance",
        recipientsCount: 6,
        createdAt: "2026-11-05",
        scheduledFor: "2026-11-10 11:30 AM EST",
        messageText: "Kindred Market Update: Conforming 30-yr fixed benchmark is 6.125% (effective Nov 6). Review pre-approval options with your advisor. Reply STOP to opt out."
      },
      {
        id: "cmp-003",
        name: "Thanksgiving Community Note",
        channel: "SMS",
        status: "Completed",
        approvalStatus: "Delivered",
        recipientsCount: 10,
        createdAt: "2026-10-28",
        scheduledFor: "2026-11-01 09:00 AM EST",
        messageText: "Warmest seasonal wishes from all of us at Kindred Lending. We are grateful for the opportunity to partner with you and your family."
      }
    ],

    contacts: [
      {
        id: "ct-001",
        name: "Aarav Sharma",
        phone: "+1 (555) 234-0101",
        email: "aarav.sharma@example.com",
        channel: "SMS & WhatsApp",
        consentStatus: "Verified",
        consentSource: "Client Web Portal Onboarding",
        consentDate: "2026-10-15 14:22 EST",
        purpose: "Greetings & Rate Alerts",
        status: "Active",
        timezone: "America/New_York",
        preferredLanguage: "English",
        loanType: "Conventional Fixed",
        tags: ["Past Borrower", "Festival Greetings", "Rate Alerts"],
        lastContacted: "2026-11-01"
      },
      {
        id: "ct-002",
        name: "Priya Patel",
        phone: "+1 (555) 345-0102",
        email: "priya.patel@example.com",
        channel: "WhatsApp",
        consentStatus: "Verified",
        consentSource: "In-Person Consultation Agreement",
        consentDate: "2026-09-28 11:05 EST",
        purpose: "Greetings & Advisory",
        status: "Active",
        timezone: "America/New_York",
        preferredLanguage: "English",
        loanType: "Jumbo Purchase",
        tags: ["Active Pre-Approval", "Festival Greetings"],
        lastContacted: "2026-11-04"
      },
      {
        id: "ct-003",
        name: "Marcus Vance",
        phone: "+1 (555) 456-0103",
        email: "marcus.v@example.com",
        channel: "SMS",
        consentStatus: "Verified",
        consentSource: "Loan Application Consent Doc",
        consentDate: "2026-10-02 09:30 EST",
        purpose: "Greetings & Updates",
        status: "Active",
        timezone: "America/Chicago",
        preferredLanguage: "English",
        loanType: "FHA 30-Year",
        tags: ["Closed Client", "Festival Greetings"],
        lastContacted: "2026-10-25"
      },
      {
        id: "ct-004",
        name: "Elena Rostova",
        phone: "+1 (555) 567-0104",
        email: "elena.r@example.com",
        channel: "SMS & WhatsApp",
        consentStatus: "Verified",
        consentSource: "Advisory Agreement Form",
        consentDate: "2026-10-20 16:45 EST",
        purpose: "Rate Advisory",
        status: "Active",
        timezone: "America/New_York",
        preferredLanguage: "English",
        loanType: "Cash-out Refinance",
        tags: ["Refinance Lead", "Festival Greetings"],
        lastContacted: "2026-11-06"
      },
      {
        id: "ct-005",
        name: "David Chen",
        phone: "+1 (555) 678-0105",
        email: "david.chen@example.com",
        channel: "SMS",
        consentStatus: "Verified",
        consentSource: "Web Portal Opt-In Form",
        consentDate: "2026-10-18 10:12 EST",
        purpose: "Greetings Only",
        status: "Active",
        timezone: "America/Los_Angeles",
        preferredLanguage: "English",
        loanType: "First-Time Homebuyer",
        tags: ["First-Time Buyer", "Festival Greetings"],
        lastContacted: "2026-10-30"
      },
      {
        id: "ct-006",
        name: "Ananya Iyer",
        phone: "+1 (555) 789-0106",
        email: "ananya.iyer@example.com",
        channel: "WhatsApp",
        consentStatus: "Verified",
        consentSource: "Customer Referral Consent",
        consentDate: "2026-10-22 13:40 EST",
        purpose: "Greetings & Rate Advisory",
        status: "Active",
        timezone: "America/New_York",
        preferredLanguage: "English",
        loanType: "VA 30-Year",
        tags: ["Past Borrower", "Festival Greetings"],
        lastContacted: "2026-11-02"
      },
      {
        id: "ct-007",
        name: "James Thornton",
        phone: "+1 (555) 890-0107",
        email: "j.thornton@example.com",
        channel: "SMS",
        consentStatus: "Pending Verification",
        consentSource: "Imported Lead (Awaiting Proof of Consent)",
        consentDate: "2026-11-01 08:00 EST",
        purpose: "Pending Verification",
        status: "Pending",
        timezone: "America/Chicago",
        preferredLanguage: "English",
        loanType: "Conventional 15-Year",
        tags: ["Inquiry", "Pending Proof"],
        lastContacted: "Never"
      },
      {
        id: "ct-008",
        name: "Sunita Kapoor",
        phone: "+1 (555) 901-0108",
        email: "sunita.k@example.com",
        channel: "SMS & WhatsApp",
        consentStatus: "Verified",
        consentSource: "Web Portal Opt-In Form",
        consentDate: "2026-10-29 17:15 EST",
        purpose: "Greetings & Rate Alerts",
        status: "Active",
        timezone: "America/New_York",
        preferredLanguage: "English",
        loanType: "Conventional Fixed",
        tags: ["Festival Greetings", "Rate Alerts"],
        lastContacted: "2026-11-05"
      },
      {
        id: "ct-009",
        name: "Robert Morales",
        phone: "+1 (555) 012-0109",
        email: "robert.m@example.com",
        channel: "SMS",
        consentStatus: "Suppressed (Opted Out)",
        consentSource: "Inbound 'STOP' SMS keyword",
        consentDate: "2026-11-03 19:12 EST",
        purpose: "Suppressed (Do Not Contact)",
        status: "Opted-Out",
        timezone: "America/Denver",
        preferredLanguage: "English",
        loanType: "Investment Property",
        tags: ["Suppressed", "Do Not Contact"],
        lastContacted: "2026-11-03"
      },
      {
        id: "ct-010",
        name: "Kavita Rao",
        phone: "+1 (555) 123-0110",
        email: "kavita.rao@example.com",
        channel: "WhatsApp",
        consentStatus: "Verified",
        consentSource: "Client Onboarding Form",
        consentDate: "2026-10-25 15:30 EST",
        purpose: "Greetings & Rate Advisory",
        status: "Active",
        timezone: "America/New_York",
        preferredLanguage: "English",
        loanType: "Jumbo Fixed",
        tags: ["Active Buyer", "Festival Greetings"],
        lastContacted: "2026-11-07"
      }
    ],

    conversations: [
      {
        id: "conv-1",
        contactId: "ct-002",
        contactName: "Priya Patel",
        phone: "+1 (555) 345-0102",
        channel: "WhatsApp",
        unread: true,
        lastUpdated: "12 mins ago",
        status: "Needs Reply",
        intent: "Mortgage Rate Inquiry",
        confidence: "94% High Confidence",
        suggestedReply: "Hi Priya! As of today's verified rate update (effective Nov 6, 2026), our conforming 30-year fixed benchmark is at 6.125% (APR 6.240%). Let us know if you'd like a personalized pre-approval breakdown!",
        citation: "Approved Rate Snapshot #2026-W45 (Effective Nov 6, 2026 · Compliance Verified)",
        messages: [
          {
            id: "m-101",
            sender: "Kindred",
            direction: "outbound",
            channel: "WhatsApp",
            text: "Wishing you and your family a joyous Diwali! May the season bring brightness and prosperity. — Kindred Mortgage Team",
            timestamp: "Yesterday 10:15 AM",
            status: "delivered"
          },
          {
            id: "m-102",
            sender: "Priya Patel",
            direction: "inbound",
            channel: "WhatsApp",
            text: "Thank you so much! By the way, could you tell me where 30-year fixed rates are trending this week?",
            timestamp: "Today 11:42 AM",
            status: "received"
          }
        ]
      },
      {
        id: "conv-2",
        contactId: "ct-003",
        contactName: "Marcus Vance",
        phone: "+1 (555) 456-0103",
        channel: "SMS",
        unread: false,
        lastUpdated: "1 hour ago",
        status: "Responded",
        intent: "Festival Greeting Response",
        confidence: "98% High Confidence",
        suggestedReply: "Thank you Marcus! We truly appreciate having you as part of our community. Wishing you wonderful celebrations!",
        citation: "Standard Relationship Greetings Policy v1.4",
        messages: [
          {
            id: "m-201",
            sender: "Kindred",
            direction: "outbound",
            channel: "SMS",
            text: "Wishing you and your family a very happy Diwali! May the festival bring light, happiness and prosperity. — The Kindred Team (Reply STOP to opt out)",
            timestamp: "Yesterday 09:30 AM",
            status: "delivered"
          },
          {
            id: "m-202",
            sender: "Marcus Vance",
            direction: "inbound",
            channel: "SMS",
            text: "Happy Diwali to you all! Thanks for remembering.",
            timestamp: "Today 10:14 AM",
            status: "received"
          },
          {
            id: "m-203",
            sender: "Kindred",
            direction: "outbound",
            channel: "SMS",
            text: "Thank you Marcus! We truly appreciate having you as part of our community.",
            timestamp: "Today 10:20 AM",
            status: "delivered"
          }
        ]
      },
      {
        id: "conv-3",
        contactId: "ct-004",
        contactName: "Elena Rostova",
        phone: "+1 (555) 567-0104",
        channel: "SMS",
        unread: true,
        lastUpdated: "3 hours ago",
        status: "Escalate to Human",
        intent: "Personalized Refinance Advice",
        confidence: "48% Low / Sensitive",
        suggestedReply: "Hello Elena, our Senior Loan Advisor Sarah has received your inquiry regarding refinancing your specific loan structure and will call you this afternoon at your preferred number.",
        citation: "Escalation Policy: Individualized financial advice cannot be handled autonomously.",
        messages: [
          {
            id: "m-301",
            sender: "Elena Rostova",
            direction: "inbound",
            channel: "SMS",
            text: "Hi, I have $340k left on my 6.8% mortgage. Would refinancing now save me money if closing costs are $4,500?",
            timestamp: "Today 08:30 AM",
            status: "received"
          }
        ]
      }
    ],

    rates: [
      {
        id: "rt-1",
        product: "30-Year Fixed Conforming",
        rate: "6.125%",
        apr: "6.240%",
        points: "0.25",
        trend: "-0.125%",
        status: "Approved",
        effectiveDate: "Nov 6, 2026",
        approvedBy: "Rachel Adams (Compliance Officer)",
        source: "Verified Secondary Market Benchmark"
      },
      {
        id: "rt-2",
        product: "15-Year Fixed Conforming",
        rate: "5.450%",
        apr: "5.580%",
        points: "0.20",
        trend: "0.000%",
        status: "Approved",
        effectiveDate: "Nov 6, 2026",
        approvedBy: "Rachel Adams (Compliance Officer)",
        source: "Verified Secondary Market Benchmark"
      },
      {
        id: "rt-3",
        product: "30-Year Fixed FHA",
        rate: "5.750%",
        apr: "6.450%",
        points: "0.15",
        trend: "-0.050%",
        status: "Approved",
        effectiveDate: "Nov 6, 2026",
        approvedBy: "Rachel Adams (Compliance Officer)",
        source: "HUD Secondary Pricing Feed"
      },
      {
        id: "rt-4",
        product: "30-Year Fixed VA",
        rate: "5.625%",
        apr: "5.820%",
        points: "0.00",
        trend: "-0.100%",
        status: "Approved",
        effectiveDate: "Nov 6, 2026",
        approvedBy: "Rachel Adams (Compliance Officer)",
        source: "VA Lenders Benchmark"
      },
      {
        id: "rt-5",
        product: "5/1 ARM Conforming",
        rate: "5.875%",
        apr: "6.710%",
        points: "0.30",
        trend: "+0.075%",
        status: "Approved",
        effectiveDate: "Nov 6, 2026",
        approvedBy: "Rachel Adams (Compliance Officer)",
        source: "Verified Secondary Market Benchmark"
      }
    ],

    rateFaqs: [
      {
        q: "How frequently are mortgage rates updated in Kindred?",
        a: "Rates are pulled from verified secondary market feeds and must be reviewed and signed off by our compliance officer every Friday morning before being published to communication templates."
      },
      {
        q: "Can AI autonomously quote rates to prospective borrowers?",
        a: "No. The system only provides current benchmark ranges from verified snapshots and always directs borrowers to a licensed loan officer for individualized pre-approvals."
      },
      {
        q: "What disclaimers are automatically appended to rate messages?",
        a: "All messages containing rate information include the effective date, APR, point assumptions, and the disclaimer: 'Rates subject to change without notice. Licensed Mortgage Broker NMLS #000000.'"
      }
    ],

    auditLogs: [
      {
        id: "log-101",
        timestamp: "2026-11-08 11:45 EST",
        actor: "Rachel Adams (Admin)",
        action: "CAMPAIGN_PREVIEW",
        details: "Previewed Diwali greeting campaign across SMS and WhatsApp devices."
      },
      {
        id: "log-102",
        timestamp: "2026-11-08 10:15 EST",
        actor: "System Scheduler",
        action: "QUIET_HOURS_ENFORCED",
        details: "Send window held until 09:00 AM EST per tenant quiet hours policy."
      },
      {
        id: "log-103",
        timestamp: "2026-11-07 16:30 EST",
        actor: "Rachel Adams (Admin)",
        action: "RATE_SNAPSHOT_APPROVED",
        details: "Approved Weekly Mortgage Benchmark Snapshot #2026-W45."
      },
      {
        id: "log-104",
        timestamp: "2026-11-06 14:10 EST",
        actor: "Compliance Guard",
        action: "CONSENT_VERIFIED",
        details: "Audited 10 pilot contacts: 8 verified active, 1 pending proof, 1 suppressed."
      },
      {
        id: "log-105",
        timestamp: "2026-11-03 19:12 EST",
        actor: "Inbound Webhook",
        action: "SUPPRESSION_TRIGGERED",
        details: "Inbound 'STOP' received from +1 (555) 012-0109. Added to suppression registry."
      }
    ],

    analytics: {
      deliveryHistory: [
        { day: "Mon", sent: 24, delivered: 24, failed: 0 },
        { day: "Tue", sent: 32, delivered: 31, failed: 1 },
        { day: "Wed", sent: 18, delivered: 18, failed: 0 },
        { day: "Thu", sent: 40, delivered: 39, failed: 1 },
        { day: "Fri", sent: 28, delivered: 28, failed: 0 }
      ],
      channels: {
        sms: 64,
        whatsapp: 36
      },
      optOutRate: 0.7,
      averageResponseTime: "8.4 mins"
    }
  };

  // State loader with localStorage support
  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure session exists
        if (!parsed.session) parsed.session = INITIAL_STATE.session;
        return parsed;
      }
    } catch (e) {
      console.warn("Could not load state from localStorage:", e);
    }
    return JSON.parse(JSON.stringify(INITIAL_STATE));
  }

  const state = loadState();

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("Could not save to localStorage:", e);
    }
  }

  function resetState() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    Object.assign(state, JSON.parse(JSON.stringify(INITIAL_STATE)));
    saveState();
  }

  function addAuditLog(action, details, actor) {
    const actorName = actor || (state.session?.user?.name ? `${state.session.user.name} (${state.session.user.role || 'User'})` : "Operator (Demo)");
    const now = new Date();
    const timestamp = now.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }) +
      " " + now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) + " EST";
    const newLog = {
      id: "log-" + Date.now(),
      timestamp,
      actor: actorName,
      action,
      details
    };
    state.auditLogs.unshift(newLog);
    saveState();
    return newLog;
  }

  // Authentication Operations
  function login(email, password, remember = true) {
    if (!email || !password) {
      return { success: false, message: "Email and password are required." };
    }
    const cleanEmail = email.trim().toLowerCase();
    // Validate email pattern
    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      return { success: false, message: "Please enter a valid work email address." };
    }

    // Specific check for official demo account
    if (cleanEmail === "rachel.adams@kindredlending.com" && password !== "demo2026pass") {
      return { success: false, message: "Invalid password for Rachel Adams. Use 'demo2026pass'." };
    }

    // General password length check for any other workspace account
    if (password.length < 6) {
      return { success: false, message: "Password must be at least 6 characters." };
    }

    state.session.isAuthenticated = true;
    state.session.user = {
      id: "usr_001",
      name: cleanEmail.includes("rachel") ? "Rachel Adams" : cleanEmail.split("@")[0].replace(".", " ").replace(/\b\w/g, l => l.toUpperCase()),
      email: cleanEmail,
      role: "Compliance Officer & Admin",
      avatar: cleanEmail.includes("rachel") ? "RA" : cleanEmail.slice(0, 2).toUpperCase(),
      organization: "Kindred Lending Partners"
    };
    if (remember) {
      saveState();
    }
    addAuditLog("USER_LOGIN", `User ${state.session.user.name} signed in successfully.`);
    return { success: true, user: state.session.user };
  }

  function signup(fullName, businessName, email, password) {
    if (!fullName || !businessName || !email || !password) {
      return { success: false, message: "All fields are required for demo registration." };
    }
    state.session.isAuthenticated = true;
    state.session.user = {
      id: "usr_" + Date.now(),
      name: fullName,
      email: email,
      role: "Account Owner / Admin",
      avatar: fullName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "KD",
      organization: businessName
    };
    state.organization.name = businessName;
    saveState();
    addAuditLog("USER_REGISTERED", `New organization workspace created for ${businessName} by ${fullName}.`);
    return { success: true, user: state.session.user };
  }

  function logout() {
    addAuditLog("USER_LOGOUT", `User ${state.session.user?.name || 'User'} signed out.`);
    state.session.isAuthenticated = false;
    saveState();
  }

  // Contact CRUD Operations
  function addContact(contact) {
    const newId = contact.id || ("ct-" + String(state.contacts.length + 1).padStart(3, "0"));
    const entry = Object.assign({ id: newId }, contact);
    state.contacts.unshift(entry);
    state.metrics.totalContacts = state.contacts.length;
    saveState();
    addAuditLog("CONTACT_ADDED", `Added contact ${entry.name} (${entry.phone}) to pilot directory`);
    return entry;
  }

  function updateContact(contactId, updatedData) {
    const contact = state.contacts.find(c => c.id === contactId);
    if (!contact) return false;
    Object.assign(contact, updatedData);
    saveState();
    addAuditLog("CONTACT_UPDATED", `Updated profile and consent preferences for ${contact.name} (${contact.id})`);
    return contact;
  }

  function deleteContact(contactId) {
    const index = state.contacts.findIndex(c => c.id === contactId);
    if (index === -1) return false;
    const removed = state.contacts.splice(index, 1)[0];
    state.metrics.totalContacts = state.contacts.length;
    saveState();
    addAuditLog("CONTACT_DELETED", `Removed contact ${removed.name} (${removed.phone}) from pilot directory`);
    return true;
  }

  // Campaign CRUD Operations
  function createCampaign(data) {
    const newId = "cmp-" + String(state.campaigns.length + 1).padStart(3, "0");
    const newCampaign = {
      id: newId,
      name: data.name || "Untitled Campaign",
      channel: data.channel || "SMS",
      status: "Draft",
      approvalStatus: "Unsubmitted",
      recipientsCount: data.recipientsCount || state.contacts.length,
      createdAt: new Date().toISOString().substring(0, 10),
      scheduledFor: data.scheduledFor || "Not scheduled",
      messageText: data.messageText || ""
    };
    state.campaigns.unshift(newCampaign);
    state.metrics.activeCampaigns = state.campaigns.filter(c => c.status !== "Completed").length;
    saveState();
    addAuditLog("CAMPAIGN_CREATED", `Drafted new campaign '${newCampaign.name}' for ${newCampaign.recipientsCount} recipients`);
    return newCampaign;
  }

  function updateCampaign(campaignId, data) {
    const campaign = state.campaigns.find(c => c.id === campaignId);
    if (!campaign) return false;
    Object.assign(campaign, data);
    saveState();
    addAuditLog("CAMPAIGN_UPDATED", `Updated parameters for campaign '${campaign.name}' (${campaign.id})`);
    return campaign;
  }

  function deleteCampaign(campaignId) {
    const index = state.campaigns.findIndex(c => c.id === campaignId);
    if (index === -1) return false;
    const removed = state.campaigns.splice(index, 1)[0];
    state.metrics.activeCampaigns = state.campaigns.filter(c => c.status !== "Completed").length;
    saveState();
    addAuditLog("CAMPAIGN_DELETED", `Deleted campaign draft '${removed.name}'`);
    return true;
  }

  return {
    get session() { return state.session; },
    get organization() { return state.organization; },
    get metrics() { return state.metrics; },
    get campaigns() { return state.campaigns; },
    get contacts() { return state.contacts; },
    get conversations() { return state.conversations; },
    get rates() { return state.rates; },
    get rateFaqs() { return state.rateFaqs; },
    get auditLogs() { return state.auditLogs; },
    get analytics() { return state.analytics; },
    saveState,
    resetState,
    addAuditLog,
    login,
    signup,
    logout,
    addContact,
    updateContact,
    deleteContact,
    createCampaign,
    updateCampaign,
    deleteCampaign
  };
})();
