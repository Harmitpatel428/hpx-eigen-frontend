import http from 'http';
import fs from 'fs';

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.end();
    return;
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', () => {
    console.log('--- BROWSER ERROR REPORT ---');
    console.log(body);
    console.log('----------------------------');
    fs.writeFileSync('browser-error.log', body);
    res.end('ok');
    process.exit(0);
  });
});

server.listen(9999, () => {
  console.log('Error server listening on 9999');
  fs.writeFileSync('browser-error.log', 'waiting...');
});
