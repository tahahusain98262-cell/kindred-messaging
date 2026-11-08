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

  console.log('Downloading Lenis smooth scroll...');
  const lenisCode = await get('https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js');
  fs.writeFileSync(path.join(vendorDir, 'lenis.min.js'), lenisCode);
  console.log('Saved lenis.min.js (' + lenisCode.length + ' bytes)');
}

main().catch(console.error);

