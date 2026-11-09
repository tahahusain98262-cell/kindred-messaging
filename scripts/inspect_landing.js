const fs = require('fs');
const html = fs.readFileSync('kindred-customer-messaging/index.html', 'utf8');
const lines = html.split('\n');

console.log('Total lines:', lines.length);

lines.forEach((l, i) => {
  if (l.includes('id="page-') || l.includes('id="section-') || l.includes('<section') || l.includes('class="site-header') || l.includes('class="hero-') || l.includes('id="custom-cursor') || l.includes('id="command-palette') || l.includes('id="scroll-index-track')) {
    console.log(`${i + 1}: ${l.trim().slice(0, 90)}`);
  }
});
