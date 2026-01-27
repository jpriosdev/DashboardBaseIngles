#!/usr/bin/env node

import http from 'http';

const url = 'http://localhost:3000/api/team-analysis';
const max = 30;

function fetchOnce(){
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', err => reject(err));
  });
}

(async () => {
  for (let i = 0; i < max; i++) {
    try {
      const r = await fetchOnce();
      if (r.status === 200) {
        console.log(r.body);
        process.exit(0);
      } else {
        console.error('Status', r.status);
      }
    } catch (e) {
      // silencio y reintento
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  console.error('Timeout waiting for /api/team-analysis');
  process.exit(1);
})();
