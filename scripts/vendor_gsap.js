const fs = require('fs');
const path = require('path');
const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(get(res.headers.location));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  const vendorDir = path.join(__dirname, '..', 'kindred-customer-messaging', 'js', 'vendor');
  if (!fs.existsSync(vendorDir)) fs.mkdirSync(vendorDir, { recursive: true });

  console.log('Downloading GSAP core...');
  const gsapCode = await get('https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js');
  fs.writeFileSync(path.join(vendorDir, 'gsap.min.js'), gsapCode);
  console.log('Saved gsap.min.js (' + gsapCode.length + ' bytes)');

  console.log('Downloading ScrollTrigger...');
  const stCode = await get('https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js');
  fs.writeFileSync(path.join(vendorDir, 'ScrollTrigger.min.js'), stCode);
  console.log('Saved ScrollTrigger.min.js (' + stCode.length + ' bytes)');
}

main().catch(console.error);

