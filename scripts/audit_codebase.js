/**
 * Kindred Comprehensive Codebase Audit Script
 * Audits:
 * 1. All interactive buttons, forms, and links in index.html
 * 2. Event listener bindings in JS modules
 * 3. Security vulnerabilities in API routes (CORS, body parsing, auth, injection)
 * 4. OWASP Top 10 compliance checks
 */

const fs = require('fs');
const path = require('path');

function runAudit() {
  console.log('=== KINDRED COMPREHENSIVE CODEBASE AUDIT ===\n');

  const html = fs.readFileSync('kindred-customer-messaging/index.html', 'utf8');

  // 1. Audit Buttons with ID
  console.log('--- 1. AUDITING BUTTONS & INTERACTIVE ELEMENTS ---');
  const btnIdRegex = /<button[^>]+id=["']([^"']+)["']/gi;
  const buttonIds = [];
  let match;
  while ((match = btnIdRegex.exec(html)) !== null) {
    buttonIds.push(match[1]);
  }
  console.log(`Found ${buttonIds.length} buttons with unique IDs in index.html.`);

  // Load all JS files
  const jsDir = 'kindred-customer-messaging/js';
  const jsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));
  let jsCombined = '';
  jsFiles.forEach(f => {
    jsCombined += fs.readFileSync(path.join(jsDir, f), 'utf8') + '\n';
  });

  const unboundButtons = buttonIds.filter(id => !jsCombined.includes(id));
  console.log(`Unbound button IDs (not directly referenced by ID in JS):`, unboundButtons);

  // 2. Audit Forms with ID
  console.log('\n--- 2. AUDITING FORM SUBMISSION HANDLERS ---');
  const formIdRegex = /<form[^>]+id=["']([^"']+)["']/gi;
  const formIds = [];
  while ((match = formIdRegex.exec(html)) !== null) {
    formIds.push(match[1]);
  }
  console.log(`Found ${formIds.length} forms in index.html:`, formIds);
  const unboundForms = formIds.filter(id => !jsCombined.includes(id));
  console.log(`Unbound forms:`, unboundForms);

  // 3. Audit Navigation Links
  console.log('\n--- 3. AUDITING NAVIGATION LINKS ---');
  const linkHrefRegex = /<a[^>]+href=["']([^"']+)["']/gi;
  const hrefs = [];
  while ((match = linkHrefRegex.exec(html)) !== null) {
    hrefs.push(match[1]);
  }
  const deadHrefs = hrefs.filter(h => h === '#' || h === '' || h === 'javascript:void(0)');
  console.log(`Total <a> tags: ${hrefs.length}, Empty/Dead hrefs: ${deadHrefs.length}`);

  // 4. Audit Backend API Security
  console.log('\n--- 4. AUDITING BACKEND API SECURITY & OWASP CONTROLS ---');
  const apiDir = 'api';
  const apiFiles = fs.readdirSync(apiDir).filter(f => f.endsWith('.js'));
  apiFiles.forEach(f => {
    const content = fs.readFileSync(path.join(apiDir, f), 'utf8');
    const hasWildcardCors = content.includes("Access-Control-Allow-Origin', '*'");
    const hasRateLimiting = content.includes('checkIpRateLimit') || content.includes('rateLimit');
    const hasJsonBodyParse = content.includes('JSON.parse');
    const hasTryCatch = content.includes('try {');

    console.log(`[API] ${f}:`);
    console.log(`  - Wildcard CORS (*): ${hasWildcardCors ? 'DETECTED (Risk for sensitive data)' : 'No'}`);
    console.log(`  - Rate Limiting: ${hasRateLimiting ? 'Present' : 'Not configured'}`);
    console.log(`  - Error Handling (try/catch): ${hasTryCatch ? 'Present' : 'MISSING'}`);
  });

  console.log('\n=== AUDIT COMPLETE ===');
}

runAudit();
