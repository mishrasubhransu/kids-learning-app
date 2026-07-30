// Module loader hooks so node scripts can import the app's src/ modules:
// resolves vite-style extensionless relative imports (./emotions → .js/.jsx)
// and transforms .jsx files with esbuild (already in node_modules via vite).
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';

const exists = (url) =>
  access(fileURLToPath(url)).then(() => true, () => false);

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && !/\.[a-z]+$/.test(specifier)) {
    for (const ext of ['.js', '.jsx', '.json']) {
      const candidate = new URL(specifier + ext, context.parentURL).href;
      if (await exists(candidate)) {
        return { url: candidate, shortCircuit: true };
      }
    }
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.jsx')) {
    const source = await readFile(fileURLToPath(url), 'utf8');
    const { code } = await transform(source, {
      loader: 'jsx',
      jsx: 'automatic',
      format: 'esm',
    });
    return { format: 'module', source: code, shortCircuit: true };
  }
  return nextLoad(url, context);
}
