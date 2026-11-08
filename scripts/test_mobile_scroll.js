const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

const PORT = 9229;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function waitForTabs(port, retries = 10) {
  for (let i = 0; i < retries; i++) {
    try {
      const tabs = await getJson(`http://127.0.0.1:${port}/json/list`);
      if (tabs && tabs.length > 0) return tabs;
    } catch (e) {}
    await sleep(500);
  }
  throw new Error('Failed to connect to Chrome on port ' + port);
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
        if (msg.error) reject(msg.error); else resolve(msg.result);
      }
    };
  }
  ready() { return new Promise(r => this.ws.readyState === 1 ? r() : this.ws.onopen = () => r()); }
  send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.ws.close(); }
}

async function testMobile() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-mob-'));
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=' + PORT,
    '--disable-gpu',
    '--no-sandbox',
    '--user-data-dir=' + tmpDir
  ]);
  
  try {
    const tabs = await waitForTabs(PORT);
    const pageTab = tabs.find(t => t.type === 'page') || tabs[0];
    const cdp = new CDPClient(pageTab.webSocketDebuggerUrl);
    await cdp.ready();

    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      mobile: true,
      hasTouch: true
    });
    await cdp.send('Page.navigate', { url: 'http://localhost:3000/' });
    await sleep(2000);

    const checkLenis = await cdp.send('Runtime.evaluate', {
      expression: 'Boolean(window.KINDRED_LANDING && window.KINDRED_LANDING.lenis)',
      returnByValue: true
    });
    console.log('Mobile Lenis initialized (should be false for native scroll):', checkLenis.result.value);

    const initialY = await cdp.send('Runtime.evaluate', {
      expression: 'window.scrollY',
      returnByValue: true
    });
    console.log('Initial mobile scrollY:', initialY.result.value);

    // Synthesize touch scroll gesture
    await cdp.send('Input.synthesizeScrollGesture', {
      x: 195,
      y: 500,
      yDistance: -300,
      gestureSourceType: 'touch'
    });
    await sleep(800);

    const afterScroll = await cdp.send('Runtime.evaluate', {
      expression: 'window.scrollY',
      returnByValue: true
    });
    console.log('After touch synthesizeScrollGesture scrollY:', afterScroll.result.value);

    // Also test window.scrollTo on mobile
    await cdp.send('Runtime.evaluate', {
      expression: 'window.scrollTo(0, 1500)',
      returnByValue: true
    });
    await sleep(400);

    const afterScrollTo = await cdp.send('Runtime.evaluate', {
      expression: 'window.scrollY',
      returnByValue: true
    });
    console.log('After window.scrollTo(0, 1500):', afterScrollTo.result.value);

    cdp.close();
  } finally {
    chrome.kill();
  }
}

testMobile().catch(console.error);

