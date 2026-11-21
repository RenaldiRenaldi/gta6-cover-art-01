import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const documentRoot = dirname(fileURLToPath(import.meta.url));
const portNumber = Number(process.env.PORT || 8080);
const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.svg', 'image/svg+xml'],
  ['.woff2', 'font/woff2'],
]);
if (!Number.isInteger(portNumber) || portNumber < 0 || portNumber > 65535) {
  throw new Error('PORT must identify a valid TCP port.');
}
const listener = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname);
    let resourcePath = resolve(documentRoot, `.${pathname}`);
    if (resourcePath !== documentRoot && !resourcePath.startsWith(documentRoot + sep)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    if (pathname === '/') resourcePath = resolve(documentRoot, 'app', 'index.html');
    try {
      await stat(resourcePath);
    } catch {
      resourcePath = resolve(documentRoot, 'app', `.${pathname}`);
    }
    if ((await stat(resourcePath)).isDirectory()) resourcePath = resolve(resourcePath, 'index.html');
    const payload = await readFile(resourcePath);
    response.writeHead(200, { 'Content-Type': contentTypes.get(extname(resourcePath)) || 'application/octet-stream' });
    response.end(request.method === 'HEAD' ? undefined : payload);
  } catch {
    response.writeHead(404).end('Not found');
  }
});
listener.listen(portNumber, '127.0.0.1', () => {
  process.stdout.write(`Preview available at http://127.0.0.1:${portNumber}/app/\n`);
});
