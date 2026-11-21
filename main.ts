import { cpSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const sourceRoot = dirname(fileURLToPath(import.meta.url));
const destinationSetting = process.env.MAKEFUN_OUTPUT_DIR;
if (!destinationSetting) {
  throw new Error('Set MAKEFUN_OUTPUT_DIR before building this entry.');
}
const destinationRoot = resolve(destinationSetting);
if (destinationRoot === sourceRoot || sourceRoot.startsWith(destinationRoot + '/')) {
  throw new Error('Choose an output directory outside the source root.');
}
const imageRoot = join(sourceRoot, 'screenshots');
const imageNames = readdirSync(imageRoot).sort();
if (imageNames.length > 4) {
  throw new Error('The entry permits at most four screenshot files.');
}
for (const imageName of imageNames) {
  const imageInfo = statSync(join(imageRoot, imageName));
  if (!imageInfo.isFile() || imageInfo.size > 262144) {
    throw new Error(`Screenshot exceeds the file requirements: ${imageName}`);
  }
}
mkdirSync(destinationRoot, { recursive: true });
for (const folderName of ['app', 'screenshots']) {
  cpSync(join(sourceRoot, folderName), join(destinationRoot, folderName), { recursive: true });
}
const dossierBytes = buildDossier(destinationRoot, {
  text_max_bytes: 262144,
  screenshots: { max: 4, max_bytes: 262144 },
});
writeFileSync(join(destinationRoot, 'dossier.json'), dossierBytes);
