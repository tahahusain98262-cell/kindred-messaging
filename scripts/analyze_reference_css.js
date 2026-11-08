const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '..', 'reference_study', '3ic889zmhg_4r.css');
const htmlPath = path.join(__dirname, '..', 'reference_study', 'index.html');

const css = fs.readFileSync(cssPath, 'utf8');
const html = fs.readFileSync(htmlPath, 'utf8');

console.log('=== CONTENTARCHITECTURE.DEV CSS & DOM ANALYSIS ===\n');

// 1. Fonts
const fontFamilies = [...new Set(css.match(/font-family:[^;}]+/g) || [])];
console.log('--- FONT FAMILIES ---');
fontFamilies.forEach(f => console.log(' ', f));

// 2. Letter Spacing (Tracking)
const tracking = [...new Set(css.match(/letter-spacing:[^;}]+/g) || [])];
console.log('\n--- LETTER SPACING / TRACKING ---');
tracking.slice(0, 15).forEach(t => console.log(' ', t));

// 3. Easing & Transitions
const easings = [...new Set(css.match(/cubic-bezier\([^)]+\)/g) || [])];
console.log('\n--- EASING CURVES ---');
easings.forEach(e => console.log(' ', e));

const transitions = [...new Set(css.match(/transition(-[a-z]+)?:[^;}]+/g) || [])];
console.log('\n--- TRANSITIONS ---');
transitions.slice(0, 10).forEach(t => console.log(' ', t));

// 4. Color Palette Tokens
const hexColors = [...new Set(css.match(/#[0-9a-fA-F]{3,8}/g) || [])];
console.log('\n--- KEY HEX COLORS ---');
console.log(' Total unique colors:', hexColors.length);
console.log(' Samples:', hexColors.slice(0, 20).join(', '));

// 5. Monospace & Caption Labels
const monoClasses = [...new Set(html.match(/class="[^"]*mono[^"]*"/g) || [])];
console.log('\n--- MONO CLASSES IN DOM (Sample) ---');
monoClasses.slice(0, 8).forEach(c => console.log(' ', c));

// 6. Numbered Labels & Badges
const numberedTokens = [...new Set(html.match(/\b\d{2,3}\s*\/\s*[A-Z_ ]+/g) || [])];
console.log('\n--- NUMBERED / MONO LABELS ---');
numberedTokens.slice(0, 10).forEach(n => console.log(' ', n));

// 7. Scroll & Animation Libraries
console.log('\n--- LIBRARIES DETECTED ---');
console.log(' Has Lenis:', html.includes('lenis') || css.includes('lenis'));
console.log(' Has GSAP:', html.includes('gsap') || css.includes('gsap'));
console.log(' Has ScrollTrigger:', html.includes('ScrollTrigger') || css.includes('scrollTrigger'));
console.log(' Has View Transitions:', css.includes('view-transition') || html.includes('view-transition'));

// 8. Grid & Column Classes
const gridClasses = [...new Set(html.match(/class="[^"]*(grid|col-|gap-|px-|py-)[^"]*"/g) || [])];
console.log('\n--- GRID & LAYOUT PATTERNS (Sample) ---');
gridClasses.slice(0, 8).forEach(g => console.log(' ', g));

