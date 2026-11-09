const https = require('https');

https.get('https://kindred-messaging.vercel.app', res => {
  console.log('STATUS:', res.statusCode);
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const hasHeroClean = d.includes('hero-clean');
    const hasHowItWorks = d.includes('how-it-works');
    const hasCustomCursor = d.includes('custom-cursor');
    console.log({
      statusCode: res.statusCode,
      hasHeroClean,
      hasHowItWorks,
      hasCustomCursor,
      contentLength: d.length
    });
  });
}).on('error', console.error);
