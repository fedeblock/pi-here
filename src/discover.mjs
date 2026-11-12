import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { agentDir } from './paths.mjs';

async function entries(dir) {
  try {
    return await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

// Follows symlinks, unlike Dirent.isFile()/isDirectory().
async function kind(full) {
  try {
    const st = await fs.stat(full);
    return st.isDirectory() ? 'dir' : st.isFile() ? 'file' : null;
  } catch {
    return null;
  }
}

async function exists(full) {
  return (await kind(full)) !== null;
}

const SCOPE_ORDER = { global: 0, project: 1, package: 2 };
const sortItems = (items) =>
  items.sort((a, b) =>
    a.scope === b.scope ? a.name.localeCompare(b.name) : SCOPE_ORDER[a.scope] - SCOPE_ORDER[b.scope]);

function roots(sub, { env, cwd, home }) {
  return [
    { dir: path.join(agentDir(env, home), sub), scope: 'global' },
    { dir: path.join(cwd, '.pi', sub), scope: 'project' },
  ];
}

/** Extensions Pi would find by itself: single files or folders with an entry point. */
export async function discoverExtensions({ env = process.env, cwd = process.cwd(), home = os.homedir() } = {}) {
  const found = [];
  for (const { dir, scope } of roots('extensions', { env, cwd, home })) {
    for (const e of await entries(dir)) {
      if (e.name.startsWith('.')) continue;
      const full = path.join(dir, e.name);
      const k = await kind(full);
      if (k === 'file' && /\.(ts|js|mjs|cjs)$/.test(e.name)) {
        found.push({ name: e.name, path: full, scope });
      } else if (k === 'dir') {
        const hasEntry = (await Promise.all(['index.ts', 'index.js', 'package.json'].map((f) => exists(path.join(full, f))))).some(Boolean);
        if (hasEntry) found.push({ name: e.name, path: full, scope });
      }
    }
  }
  for (const pkg of await installedPackages({ env, cwd, home })) {
    for (const rel of pkg.extensions) {
      const full = path.resolve(pkg.dir, rel);
      if (!(await exists(full))) continue;
      const name = pkg.extensions.length === 1 ? pkg.name : `${pkg.name}:${path.basename(full)}`;
      found.push({ name, path: full, scope: 'package', from: pkg.name });
    }
  }
  return sortItems(found);
}

/** Skills inside one directory: folders containing SKILL.md, or loose .md files. */
async function skillsIn(dir, scope) {
  const found = [];
  for (const e of await entries(dir)) {
    if (e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    const k = await kind(full);
    if (k === 'dir' && (await exists(path.join(full, 'SKILL.md')))) {
      found.push({ name: e.name, path: full, scope });
    } else if (k === 'file' && e.name.endsWith('.md')) {
      found.push({ name: e.name, path: full, scope });
    }
  }
  return found;
}

/** Skills Pi would find by itself, plus the ones inside installed Pi packages. */
export async function discoverSkills({ env = process.env, cwd = process.cwd(), home = os.homedir() } = {}) {
  const found = [];
  for (const { dir, scope } of roots('skills', { env, cwd, home })) found.push(...(await skillsIn(dir, scope)));
  for (const pkg of await installedPackages({ env, cwd, home })) {
    for (const rel of pkg.skills) {
      const full = path.resolve(pkg.dir, rel);
      if ((await kind(full)) === 'dir' && (await exists(path.join(full, 'SKILL.md')))) {
        found.push({ name: `${path.basename(full)}`, path: full, scope: 'package', from: pkg.name });
      } else {
        for (const item of await skillsIn(full, 'package')) found.push({ ...item, from: pkg.name });
      }
    }
  }
  return sortItems(found);
}

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

/** Where `pi install` puts a package, from its source string. Null for sources we cannot place. */
export function packageDir(source, base) {
  if (source.startsWith('npm:')) {
    const spec = source.slice(4);
    const at = spec.indexOf('@', 1); // keep the scope's leading "@"
    return path.join(base, 'npm', 'node_modules', at === -1 ? spec : spec.slice(0, at));
  }
  const git = source.replace(/^git:/, '').replace(/^https?:\/\//, '').replace(/^ssh:\/\//, '');
  if (git !== source || /^https?:\/\//.test(source)) {
    return path.join(base, 'git', git.replace(/@[^/@]+$/, '').replace(/\.git$/, ''));
  }
  return null;
}

/**
 * Pi packages listed in settings.json (global and project), with what each one declares in its
 * package.json "pi" manifest. Packages that are not on disk are skipped.
 */
export async function installedPackages({ env = process.env, cwd = process.cwd(), home = os.homedir() } = {}) {
  const out = [];
  const seen = new Set();
  const bases = [
    { base: agentDir(env, home), settings: path.join(agentDir(env, home), 'settings.json') },
    { base: path.join(cwd, '.pi'), settings: path.join(cwd, '.pi', 'settings.json') },
  ];
  for (const { base, settings } of bases) {
    const list = (await readJson(settings))?.packages;
    if (!Array.isArray(list)) continue;
    for (const entry of list) {
      const source = typeof entry === 'string' ? entry : entry?.source;
      if (typeof source !== 'string') continue;
      const dir = packageDir(source, base);
      if (!dir || seen.has(dir) || !(await exists(dir))) continue;
      seen.add(dir);
      const pkg = (await readJson(path.join(dir, 'package.json'))) ?? {};
      const manifest = pkg.pi ?? {};
      const arr = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
      let extensions = arr(manifest.extensions);
      let skills = arr(manifest.skills);
      // No manifest: Pi's conventional folders.
      if (!pkg.pi) {
        if (await exists(path.join(dir, 'extensions'))) extensions = ['./extensions'];
        if (await exists(path.join(dir, 'skills'))) skills = ['./skills'];
      }
      out.push({ source, name: pkg.name ?? path.basename(dir), dir, extensions, skills });
    }
  }
  return out;
}

export function parseOllamaList(text) {
  return text
    .split('\n')
    .slice(1)
    .map((line) => line.trim().split(/\s+/)[0])
    .filter(Boolean);
}

/** Installed Ollama models. Fails soft: returns [] if ollama is missing or slow. */
export function listOllamaModels({ env = process.env } = {}) {
  return new Promise((resolve) => {
    execFile('ollama', ['list'], { env, timeout: 3000 }, (err, stdout) => {
      resolve(err ? [] : parseOllamaList(stdout));
    });
  });
}
