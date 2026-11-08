const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9223; // use separate debugging port
const USER_DATA = path.join(__dirname, '..', 'reference_study', 'chrome_kindred_profile');

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

async function capturePhase(phaseName) {
  const outputDir = path.join(__dirname, '..', 'screenshots', phaseName);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  console.log(`[Capture] Launching Chrome for ${phaseName}...`);
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + USER_DATA,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    'about:blank'
  ]);

  let targets = null;
  for (let i = 0; i < 20; i++) {
    await sleep(400);
    try {
      targets = await getJson('http://127.0.0.1:' + PORT + '/json/list');
      if (targets && targets.length > 0) break;
    } catch (e) {}
  }

  if (!targets || targets.length === 0) {
    console.error('Failed to connect to Chrome on port ' + PORT);
    chrome.kill();
    return;
  }

  const target = targets.find(t => t.type === 'page') || targets[0];
  const client = new CDPClient(target.webSocketDebuggerUrl);
  await client.ready();

  await client.send('Page.enable');

  const viewports = [
    { name: '1440px', width: 1440, height: 900, mobile: false, dsf: 1 },
    { name: '768px', width: 768, height: 1024, mobile: false, dsf: 1 },
    { name: '390px', width: 390, height: 844, mobile: true, dsf: 2 }
  ];

  for (const vp of viewports) {
    console.log(`[Capture] Viewport: ${vp.name}...`);
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: vp.dsf,
      mobile: vp.mobile
    });

    await client.send('Page.navigate', { url: 'http://localhost:3000/#/' });
    await sleep(2500);

    // Hero screenshot
    const heroShot = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outputDir, `kindred_${vp.name}_hero.png`), Buffer.from(heroShot.data, 'base64'));

    // Full page screenshot
    const layout = await client.send('Page.getLayoutMetrics');
    const width = layout.contentSize.width;
    const height = Math.min(layout.contentSize.height, 12000);

    const fullShot = await client.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width, height, scale: 1 }
    });
    fs.writeFileSync(path.join(outputDir, `kindred_${vp.name}_full.png`), Buffer.from(fullShot.data, 'base64'));
    console.log(`[Capture] Saved ${vp.name} hero and full page screenshots to ${outputDir}`);
  }

  client.close();
  chrome.kill();
  console.log(`[Capture] Completed screenshots for ${phaseName}`);
}

const phaseArg = process.argv[2] || 'phase1';
capturePhase(phaseArg).catch(console.error);

