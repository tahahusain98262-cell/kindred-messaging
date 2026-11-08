const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9222;
const USER_DATA = path.join(__dirname, '..', 'reference_study', 'chrome_temp_profile');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
  }

  ready() {
    return new Promise(resolve => {
      if (this.ws.readyState === WebSocket.OPEN) resolve();
      else this.ws.onopen = () => resolve();
    });
  }

  send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.ws.close();
  }
}

async function main() {
  const outputDir = path.join(__dirname, '..', 'reference_study');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  console.log('Launching headless Chrome on port ' + PORT + '...');
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + USER_DATA,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    'about:blank'
  ]);

  // Wait for Chrome debugger endpoint to be ready
  let targets = null;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    try {
      targets = await getJson('http://127.0.0.1:' + PORT + '/json/list');
      if (targets && targets.length > 0) break;
    } catch (e) {}
  }

  if (!targets || targets.length === 0) {
    console.error('Failed to connect to Chrome debugging endpoint');
    chrome.kill();
    return;
  }

  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  console.log('Connecting to target:', pageTarget.title, pageTarget.webSocketDebuggerUrl);

  const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
  await client.ready();
  console.log('CDP connection established.');

  await client.send('Page.enable');
  await client.send('DOM.enable');
  await client.send('CSS.enable');

  // --- 1. CAPTURE AT 1440px ---
  console.log('Navigating to https://www.contentarchitecture.dev/ at 1440px...');
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });

  await client.send('Page.navigate', { url: 'https://www.contentarchitecture.dev/' });
  await sleep(4000); // Wait for page fonts, Lenis, and animations

  console.log('Capturing 1440px viewport (Hero)...');
  const hero1440 = await client.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(outputDir, 'contentarchitecture_1440_hero.png'), Buffer.from(hero1440.data, 'base64'));

  console.log('Capturing 1440px full page...');
  const metrics1440 = await client.send('Page.getLayoutMetrics');
  const fullWidth1440 = metrics1440.contentSize.width;
  const fullHeight1440 = Math.min(metrics1440.contentSize.height, 12000);

  const full1440 = await client.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: fullWidth1440, height: fullHeight1440, scale: 1 }
  });
  fs.writeFileSync(path.join(outputDir, 'contentarchitecture_1440_full.png'), Buffer.from(full1440.data, 'base64'));
  console.log('Saved 1440px screenshots (hero & full page).');

  // --- 2. CAPTURE AT 390px (Mobile) ---
  console.log('Switching to 390px mobile viewport...');
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  await sleep(2000);

  console.log('Capturing 390px viewport (Hero)...');
  const hero390 = await client.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(outputDir, 'contentarchitecture_390_hero.png'), Buffer.from(hero390.data, 'base64'));

  const metrics390 = await client.send('Page.getLayoutMetrics');
  const fullWidth390 = metrics390.contentSize.width;
  const fullHeight390 = Math.min(metrics390.contentSize.height, 15000);

  console.log('Capturing 390px full page...');
  const full390 = await client.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: fullWidth390, height: fullHeight390, scale: 1 }
  });
  fs.writeFileSync(path.join(outputDir, 'contentarchitecture_390_full.png'), Buffer.from(full390.data, 'base64'));
  console.log('Saved 390px mobile screenshots (hero & full page).');

  // --- 3. INSPECT PAGE METRICS & SCRIPTS ---
  const inspectionResult = await client.send('Runtime.evaluate', {
    expression: `(() => {
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4')).map(h => ({
        tag: h.tagName,
        text: h.innerText.slice(0, 60),
        fontFamily: getComputedStyle(h).fontFamily,
        fontSize: getComputedStyle(h).fontSize,
        lineHeight: getComputedStyle(h).lineHeight,
        letterSpacing: getComputedStyle(h).letterSpacing,
        fontWeight: getComputedStyle(h).fontWeight
      }));

      const monoElements = Array.from(document.querySelectorAll('.font-mono, [class*="mono"], code, pre')).slice(0, 15).map(el => ({
        text: el.innerText.slice(0, 40),
        fontFamily: getComputedStyle(el).fontFamily,
        fontSize: getComputedStyle(el).fontSize,
        color: getComputedStyle(el).color
      }));

      const buttons = Array.from(document.querySelectorAll('button, a.button, a[class*="btn"]')).slice(0, 10).map(b => ({
        text: b.innerText.slice(0, 30),
        padding: getComputedStyle(b).padding,
        background: getComputedStyle(b).backgroundColor,
        borderRadius: getComputedStyle(b).borderRadius,
        border: getComputedStyle(b).border
      }));

      return {
        hasLenis: !!window.lenis || document.documentElement.classList.contains('lenis'),
        hasGsap: !!window.gsap,
        hasFramerMotion: !!window.__framer_motion,
        headings: headings.slice(0, 10),
        monoCount: monoElements.length,
        sampleMono: monoElements.slice(0, 5),
        sampleButtons: buttons
      };
    })()`,
    returnByValue: true
  });

  fs.writeFileSync(path.join(outputDir, 'computed_inspection.json'), JSON.stringify(inspectionResult.result ? inspectionResult.result.value : inspectionResult, null, 2));
  console.log('Saved computed_inspection.json');

  client.close();
  chrome.kill();
  console.log('Done!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
