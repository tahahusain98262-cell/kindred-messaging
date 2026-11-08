const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

const PORT = 9232;
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

async function testTouchDirections() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-mob4-'));
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

    // Test with yDistance: -400, repeatCount: 2, speed: 800
    try {
      await cdp.send('Input.synthesizeScrollGesture', {
        x: 150,
        y: 400,
        yDistance: -400,
        speed: 800,
        gestureSourceType: 'touch'
      });
      await sleep(1000);
      const res1 = await cdp.send('Runtime.evaluate', { expression: 'window.scrollY', returnByValue: true });
      console.log('Test yDistance -400:', res1.result.value);
    } catch(e) {
      console.log('Error 1:', e);
    }

    // Also test Keyboard DownArrow on mobile
    await cdp.send('Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      windowsVirtualKeyCode: 40,
      key: 'ArrowDown',
      code: 'ArrowDown'
    });
    await cdp.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      windowsVirtualKeyCode: 40,
      key: 'ArrowDown',
      code: 'ArrowDown'
    });
    await sleep(500);
    const resKey = await cdp.send('Runtime.evaluate', { expression: 'window.scrollY', returnByValue: true });
    console.log('Test ArrowDown on mobile:', resKey.result.value);

    cdp.close();
  } finally {
    chrome.kill();
  }
}

testTouchDirections().catch(console.error);

