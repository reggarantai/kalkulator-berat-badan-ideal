// Server statis kecil untuk tes browser, tanpa dependency.
// Pemakaian: node tests/e2e/server.js [port]
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const AKAR = path.resolve(__dirname, '../..');
const PORT = Number(process.argv[2]) || 4173;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

http
  .createServer((req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    let berkas = path.join(AKAR, decodeURIComponent(pathname));
    // Tolak path yang keluar dari folder proyek
    if (berkas !== AKAR && !berkas.startsWith(AKAR + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    if (pathname.endsWith('/')) berkas = path.join(berkas, 'index.html');
    fs.readFile(berkas, (err, isi) => {
      if (err) {
        res.writeHead(404).end('Tidak ditemukan');
        return;
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(berkas)] || 'application/octet-stream' });
      res.end(isi);
    });
  })
  .listen(PORT, '127.0.0.1', () => console.log(`Server tes: http://127.0.0.1:${PORT}/`));
