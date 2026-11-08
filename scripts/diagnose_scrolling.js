const { spawn } = require('child_process');
const http = require('http');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9224;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
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
    this.events = [];

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
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
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=' + PORT,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,900'
  ]);

  try {
    await sleep(1500);
    const tabs = await getJson(`http://127.0.0.1:${PORT}/json/list`);
    const pageTab = tabs.find(t => t.type === 'page');
    const cdp = new CDPClient(pageTab.webSocketDebuggerUrl);
    await cdp.ready();

    await cdp.send('Runtime.enable');
    await cdp.send('Console.enable');
    await cdp.send('Log.enable');

    const consoleLogs = [];
    cdp.ws.addEventListener('message', (ev) => {
      const d = JSON.parse(ev.data);
      if (d.method === 'Runtime.consoleAPICalled') {
        consoleLogs.push({ type: d.params.type, args: d.params.args.map(a => a.value || a.description) });
      } else if (d.method === 'Runtime.exceptionThrown') {
        consoleLogs.push({ type: 'EXCEPTION', text: d.params.exceptionDetails.text, exception: d.params.exceptionDetails.exception?.description });
      }
    });

    await cdp.send('Page.navigate', { url: 'http://localhost:3000/' });
    await sleep(2500);

    // Evaluate scroll and DOM properties
    const evalRes = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const docEl = document.documentElement;
        const b = document.body;
        const compHtml = window.getComputedStyle(docEl);
        const compBody = window.getComputedStyle(b);
        const hasGsap = typeof gsap !== 'undefined';
        const hasScrollTrigger = typeof ScrollTrigger !== 'undefined';
        const hasLenis = typeof Lenis !== 'undefined';
        const lenisInst = window.KINDRED_LANDING ? true : false;
        
        return {
          windowScrollY: window.scrollY,
          htmlHeight: compHtml.height,
          htmlOverflow: compHtml.overflow,
          htmlOverflowY: compHtml.overflowY,
          htmlPosition: compHtml.position,
          htmlClasses: docEl.className,
          bodyHeight: compBody.height,
          bodyOverflow: compBody.overflow,
          bodyOverflowY: compBody.overflowY,
          bodyPosition: compBody.position,
          bodyClasses: b.className,
          hasGsap,
          hasScrollTrigger,
          hasLenis,
          totalDocHeight: Math.max(docEl.scrollHeight, b.scrollHeight),
          viewportHeight: window.innerHeight,
          scrollTriggerCount: typeof ScrollTrigger !== 'undefined' ? ScrollTrigger.getAll().length : 0
        };
      })()`,
      returnByValue: true
    });

    console.log("=== DIAGNOSTIC REPORT ===");
    console.log("Console Logs / Exceptions:", JSON.stringify(consoleLogs, null, 2));
    console.log("DOM & CSS Evaluation:", JSON.stringify(evalRes.result.value, null, 2));

    // Now attempt a native wheel scroll simulation
    console.log("--- Testing Wheel Scroll ---");
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel',
      x: 500,
      y: 500,
      deltaX: 0,
      deltaY: 500
    });
    await sleep(500);

    const scrollAfterWheel = await cdp.send('Runtime.evaluate', {
      expression: `window.scrollY`,
      returnByValue: true
    });
    console.log("window.scrollY after 500px wheel:", scrollAfterWheel.result.value);

    // Test window.scrollTo
    console.log("--- Testing window.scrollTo(0, 500) ---");
    await cdp.send('Runtime.evaluate', {
      expression: `window.scrollTo(0, 500); window.scrollY`,
      returnByValue: true
    });
    await sleep(200);
    const scrollAfterScrollTo = await cdp.send('Runtime.evaluate', {
      expression: `window.scrollY`,
      returnByValue: true
    });
    console.log("window.scrollY after scrollTo:", scrollAfterScrollTo.result.value);

    cdp.close();
  } finally {
    chrome.kill();
  }
}

main().catch(err => {
  console.error("Diagnostic error:", err);
});

