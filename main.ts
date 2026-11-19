import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const project = dirname(fileURLToPath(import.meta.url));
const destination = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
const screenshotCap = { max: 4, max_bytes: 262144 };

mkdirSync(destination, { recursive: true });
cpSync(resolve(project, 'app'), resolve(destination, 'app'), { recursive: true });
cpSync(resolve(project, 'screenshots'), resolve(destination, 'screenshots'), { recursive: true });
writeFileSync(resolve(destination, 'dossier.json'), buildDossier(destination, {
  text_max_bytes: 163840,
  screenshots: screenshotCap,
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
}));
