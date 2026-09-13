const https = require('https');

https.get('https://bank-iota-seven.vercel.app/test/mock-sbi-clerk-2024-pyq', res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const regex = /(?:src|href)="(\/_next\/static\/[^"]+)"/g;
    const assets = [];
    let match;
    while ((match = regex.exec(data)) !== null) {
      assets.push(match[1]);
    }
    const uniqueAssets = [...new Set(assets)];
    console.log('Total assets to check:', uniqueAssets.length);
    let checked = 0;
    let failed = 0;

    uniqueAssets.forEach(asset => {
      https.get('https://bank-iota-seven.vercel.app' + asset, r => {
        if (r.statusCode !== 200) {
          console.error('FAILED ASSET:', r.statusCode, asset);
          failed++;
        }
        checked++;
        if (checked === uniqueAssets.length) {
          console.log(`Finished checking assets: ${checked - failed}/${checked} succeeded. Failed: ${failed}`);
        }
      }).on('error', e => console.error('Error fetching asset:', asset, e));
    });
  });
});
