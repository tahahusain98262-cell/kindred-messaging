const fs = require('fs');
const path = require('path');
const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  const studyDir = path.resolve(__dirname, '..', 'reference_study');
  if (!fs.existsSync(studyDir)) fs.mkdirSync(studyDir, { recursive: true });

  console.log('Fetching https://www.contentarchitecture.dev/ ...');
  const html = await get('https://www.contentarchitecture.dev/');
  fs.writeFileSync(path.join(studyDir, 'index.html'), html);
  console.log('Saved index.html (' + html.length + ' bytes)');

  // Extract CSS urls
  const matches = [...html.matchAll(/href="(\/_next\/static\/[^"]+\.css)"/g)];
  for (const match of matches) {
    const cssUrl = 'https://www.contentarchitecture.dev' + match[1];
    console.log('Fetching ' + cssUrl + ' ...');
    const cssContent = await get(cssUrl);
    const filename = match[1].split('/').pop();
    fs.writeFileSync(path.join(studyDir, filename), cssContent);
    console.log('Saved ' + filename + ' (' + cssContent.length + ' bytes)');
  }
}

main().catch(console.error);

