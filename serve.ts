import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const publicRoot = resolve(fileURLToPath(new URL('./app', import.meta.url)));
const portAt = process.argv.indexOf('--port');
const chosenPort = portAt < 0 ? 8080 : Number(process.argv[portAt + 1]);
const port = Number.isInteger(chosenPort) && chosenPort > 0 && chosenPort < 65536 ? chosenPort : 8080;
const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
};

createServer((request, response) => {
  let path;
  try {
    path = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('Invalid path');
    return;
  }
  if (path.endsWith('/')) path += 'index.html';
  const file = resolve(join(publicRoot, path));
  if (file !== publicRoot && !file.startsWith(publicRoot + sep)) {
    response.writeHead(403).end('Outside the app folder');
    return;
  }
  try {
    const stat = statSync(file);
    if (!stat.isFile()) throw new Error('Not a file');
    response.writeHead(200, {
      'content-type': types[extname(file).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404).end('File not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`Afterglow is ready at http://localhost:${port}`));
