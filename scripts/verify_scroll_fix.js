const { spawn } = require('child_process');
const http = require('http');

const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = 9228;
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
    } catch (e) {
      // wait
    }
    await sleep(500);
  }
  throw new Error('Failed to connect to Chrome on port ' + port);
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
    this.events = [];
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error); else resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
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

async function runVerification() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-test-'));
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
    
    const consoleErrors = [];
    cdp.ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.method === 'Console.messageAdded' && msg.params.message.level === 'error') {
        consoleErrors.push(msg.params.message.text);
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        consoleErrors.push(msg.params.exceptionDetails.text || msg.params.exceptionDetails.exception?.description);
      }
    });

    console.log('--- TEST 1: DESKTOP (1440x900) WHEEL & KEYBOARD SCROLL ---');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });

    await cdp.send('Page.navigate', { url: 'http://localhost:3000/' });
    await sleep(2500);

    const initialScroll = await cdp.send('Runtime.evaluate', {
      expression: 'window.scrollY',
      returnByValue: true
    });
    console.log('Initial window.scrollY:', initialScroll.result.value);

    // Test mouse wheel event
    console.log('Dispatching mouse wheel events...');
    for (let i = 0; i < 5; i++) {
      await cdp.send('Input.dispatchMouseEvent', {
        type: 'mouseWheel',
        x: 500,
        y: 500,
        deltaX: 0,
        deltaY: 120
      });
      await sleep(100);
    }
    await sleep(800); // let lenis animate

    const afterWheelScroll = await cdp.send('Runtime.evaluate', {
      expression: 'window.scrollY',
      returnByValue: true
    });
    console.log('After wheel window.scrollY:', afterWheelScroll.result.value);

    // Test Keyboard PageDown
    console.log('Dispatching PageDown keyboard event...');
    await cdp.send('Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      windowsVirtualKeyCode: 34, // PageDown
      key: 'PageDown',
      code: 'PageDown'
    });
    await cdp.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      windowsVirtualKeyCode: 34,
      key: 'PageDown',
      code: 'PageDown'
    });
    await sleep(800);

    const afterPageDownScroll = await cdp.send('Runtime.evaluate', {
      expression: 'window.scrollY',
      returnByValue: true
    });
    console.log('After PageDown window.scrollY:', afterPageDownScroll.result.value);

    // Test Keyboard ArrowDown
    console.log('Dispatching ArrowDown keyboard event...');
    for (let i = 0; i < 3; i++) {
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
      await sleep(100);
    }
    await sleep(800);

    const afterArrowScroll = await cdp.send('Runtime.evaluate', {
      expression: 'window.scrollY',
      returnByValue: true
    });
    console.log('After ArrowDown window.scrollY:', afterArrowScroll.result.value);

    // Full top-to-bottom scroll test through pinned sections
    console.log('\n--- TEST 2: FULL TOP-TO-BOTTOM SCROLL (Scroll-Dive, Timeline, Demo Workspace) ---');
    const scrollInfo = await cdp.send('Runtime.evaluate', {
      expression: `(async () => {
        const totalHeight = document.documentElement.scrollHeight;
        const positions = [
          totalHeight * 0.25,
          totalHeight * 0.50,
          totalHeight * 0.75,
          totalHeight - window.innerHeight
        ];
        const results = [];
        for (const target of positions) {
          window.scrollTo(0, target);
          await new Promise(r => setTimeout(r, 400));
          results.push({
            target: Math.round(target),
            actual: Math.round(window.scrollY),
            pinSpacersCount: document.querySelectorAll('.pin-spacer').length
          });
        }
        return { totalHeight, results };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });
    console.log('Full scroll results:', JSON.stringify(scrollInfo.result.value, null, 2));

    console.log('\n--- TEST 3: MOBILE TOUCH SCROLL (390x844) ---');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      mobile: true,
      hasTouch: true
    });
    await cdp.send('Page.navigate', { url: 'http://localhost:3000/' });
    await sleep(2000);

    const mobileInitial = await cdp.send('Runtime.evaluate', {
      expression: 'window.scrollY',
      returnByValue: true
    });
    console.log('Mobile initial scrollY:', mobileInitial.result.value);

    // Simulate touch scroll gesture: touchStart at 500, touchMove to 200, touchEnd
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: 200, y: 500 }]
    });
    await sleep(50);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: 200, y: 200 }]
    });
    await sleep(50);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: []
    });
    await sleep(600);

    const mobileAfterTouch = await cdp.send('Runtime.evaluate', {
      expression: 'window.scrollY',
      returnByValue: true
    });
    console.log('Mobile after touch scrollY:', mobileAfterTouch.result.value);

    console.log('\n--- CONSOLE ERRORS CHECK ---');
    console.log('Console errors encountered:', consoleErrors.length);
    if (consoleErrors.length > 0) {
      consoleErrors.forEach((err, idx) => console.log(`Error ${idx + 1}:`, err));
    }

    cdp.close();
  } finally {
    chrome.kill();
  }
}

runVerification().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
