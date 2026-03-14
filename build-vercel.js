import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { mkdir, cp } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.url.replace('file://', ''), '..');

function findFrontendDir() {
  const candidates = [
    resolve(root, 'frontend-new'),
    resolve(root, '../frontend-new'),
    resolve(root, 'frontend'),
    resolve(root, '../frontend'),
  ];

  for (const dir of candidates) {
    if (existsSync(resolve(dir, 'package.json'))) {
      return dir;
    }
  }

  throw new Error('Could not locate frontend directory (frontend-new)');
}

async function main() {
  const frontendDir = findFrontendDir();
  const outputDir = resolve(root, 'dist');
  const frontendDist = resolve(frontendDir, 'dist');

  console.log('Using frontend directory:', frontendDir);
  console.log('Building frontend...');

  execSync('npm ci', { cwd: frontendDir, stdio: 'inherit' });
  execSync('npm run build', { cwd: frontendDir, stdio: 'inherit' });

  if (existsSync(outputDir)) {
    rmSync(outputDir, { recursive: true, force: true });
  }

  await mkdir(outputDir, { recursive: true });
  await cp(frontendDist, outputDir, { recursive: true });

  console.log('Copied build output to', outputDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
