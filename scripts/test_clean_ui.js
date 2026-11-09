const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

const PORT = 9240;
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
    this.errors = [];
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error); else resolve(msg.result);
      } else if (msg.method === 'Console.messageAdded' && msg.params.message.level === 'error') {
        this.errors.push(msg.params.message.text);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        this.errors.push(msg.params.exceptionDetails.text || msg.params.exceptionDetails.exception?.description);
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

async function runTests() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-clean-'));
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

    await cdp.send('Console.enable');
    await cdp.send('Runtime.enable');

    const viewports = [
      { name: 'Mobile Compact', width: 360, height: 740, mobile: true },
      { name: 'Mobile iPhone', width: 390, height: 844, mobile: true },
      { name: 'Tablet Portrait', width: 768, height: 1024, mobile: false },
      { name: 'Tablet Landscape', width: 1024, height: 768, mobile: false },
      { name: 'Desktop Standard', width: 1440, height: 900, mobile: false }
    ];

    console.log('=== TESTING KINDRED SIMPLIFIED CLEAN UI/UX ===');

    for (const vp of viewports) {
      console.log(`\n--- Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: vp.mobile ? 2 : 1,
        mobile: vp.mobile,
        hasTouch: vp.mobile
      });

      await cdp.send('Page.navigate', { url: 'http://localhost:3000/' });
      await sleep(1500);

      // Check overflow
      const overflow = await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          return {
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
            hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
            scrollHeight: document.documentElement.scrollHeight
          };
        })()`,
        returnByValue: true
      });
      console.log('Overflow check:', overflow.result.value);

      // Check Scroll functionality
      const initialY = await cdp.send('Runtime.evaluate', {
        expression: 'window.scrollY',
        returnByValue: true
      });

      // Scroll to 800
      await cdp.send('Runtime.evaluate', {
        expression: 'window.scrollTo(0, 800)',
        returnByValue: true
      });
      await sleep(300);

      const afterScroll = await cdp.send('Runtime.evaluate', {
        expression: 'window.scrollY',
        returnByValue: true
      });
      console.log(`Scroll test: ${initialY.result.value} -> ${afterScroll.result.value}`);

      // Check key sections exist and visible
      const sections = await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          const ids = ['hero', 'how-it-works', 'features', 'security', 'platform-demo', 'faq'];
          return ids.map(id => {
            const el = document.getElementById(id);
            return {
              id,
              exists: !!el,
              offsetHeight: el ? el.offsetHeight : 0
            };
          });
        })()`,
        returnByValue: true
      });
      console.log('Sections status:', sections.result.value);
    }

    console.log('\n=== CONSOLE ERRORS AUDIT ===');
    console.log('Total console errors recorded:', cdp.errors.length);
    if (cdp.errors.length > 0) {
      cdp.errors.forEach((e, i) => console.log(`Error ${i + 1}:`, e));
    }

    cdp.close();
  } finally {
    chrome.kill();
  }
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
