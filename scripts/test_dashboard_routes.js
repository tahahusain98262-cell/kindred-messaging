const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

const PORT = 9241;
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

async function runRouteTests() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-routes-'));
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

    console.log('--- TEST ROUTE: /#/dashboard ---');
    await cdp.send('Page.navigate', { url: 'http://localhost:3000/#/dashboard' });
    await sleep(1500);

    const dashboardCheck = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const dash = document.getElementById('page-dashboard');
        const composer = document.getElementById('composer-message-input');
        const inbox = document.getElementById('inbox-threads-container');
        const contacts = document.getElementById('contacts-table-body');
        return {
          dashboardActive: dash ? dash.classList.contains('active') : false,
          composerInputExists: !!composer,
          inboxThreadsExists: !!inbox,
          contactsTableExists: !!contacts
        };
      })()`,
      returnByValue: true
    });
    console.log('Dashboard active check:', dashboardCheck.result.value);

    console.log('--- TEST ROUTE: /#/login ---');
    await cdp.send('Page.navigate', { url: 'http://localhost:3000/#/login' });
    await sleep(800);

    const loginCheck = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const login = document.getElementById('page-login');
        const form = document.getElementById('form-login');
        return {
          loginActive: login ? login.classList.contains('active') : false,
          formExists: !!form
        };
      })()`,
      returnByValue: true
    });
    console.log('Login active check:', loginCheck.result.value);

    console.log('--- TEST ROUTE: /#/signup ---');
    await cdp.send('Page.navigate', { url: 'http://localhost:3000/#/signup' });
    await sleep(800);

    const signupCheck = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const signup = document.getElementById('page-signup');
        const form = document.getElementById('form-signup');
        return {
          signupActive: signup ? signup.classList.contains('active') : false,
          formExists: !!form
        };
      })()`,
      returnByValue: true
    });
    console.log('Signup active check:', signupCheck.result.value);

    console.log('Total console errors:', cdp.errors.length);

    cdp.close();
  } finally {
    chrome.kill();
  }
}

runRouteTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
