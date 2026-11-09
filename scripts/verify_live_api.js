const https = require('https');

function checkEndpoint(url, options = {}) {
  return new Promise((resolve) => {
    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });
    req.on('error', (err) => resolve({ error: err.message }));
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function verify() {
  console.log('--- VERIFYING LIVE VERCEL DEPLOYMENT ---');

  // Check 1: Front-end Homepage
  const home = await checkEndpoint('https://kindred-messaging.vercel.app/');
  console.log('Homepage Status:', home.statusCode, '(content length:', home.body.length, ')');

  // Check 2: GET /api/messages
  const msgRes = await checkEndpoint('https://kindred-messaging.vercel.app/api/messages');
  console.log('GET /api/messages Status:', msgRes.statusCode);
  if (msgRes.statusCode === 200) {
    try {
      const data = JSON.parse(msgRes.body);
      console.log('  PASS: /api/messages returns JSON:', {
        success: data.success,
        testMode: data.testMode,
        allowedNumbersCount: data.allowedNumbersCount
      });
    } catch (e) {
      console.log('  Output:', msgRes.body.slice(0, 100));
    }
  } else {
    console.log('  Output:', msgRes.body.slice(0, 100));
  }
}

verify();
