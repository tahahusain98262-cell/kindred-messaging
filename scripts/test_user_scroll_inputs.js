const { spawn } = require('child_process');
const http = require('http');

const PORT = 9224;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d)));
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

async function test() {
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new', '--remote-debugging-port=' + PORT, '--disable-gpu', '--no-sandbox'
  ]);
  try {
    await sleep(1500);
    const tabs = await getJson('http://127.0.0.1:' + PORT + '/json/list');
    const cdp = new CDPClient(tabs[0].webSocketDebuggerUrl);
    await cdp.ready();

    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });

    await cdp.send('Page.navigate', { url: 'http://localhost:3000/' });
    await sleep(2000);

    const check = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        // Expose or find lenis
        // In landing.js, let's see what KINDRED_LANDING has
        return {
          docHeight: document.documentElement.scrollHeight,
          bodyHeight: document.body.scrollHeight,
          winHeight: window.innerHeight,
          limitCalculated: document.documentElement.scrollHeight - window.innerHeight
        };
      })()`,
      returnByValue: true
    });
    console.log("Heights check:", check.result.value);

    cdp.close();
  } finally {
    chrome.kill();
  }
}
test();
