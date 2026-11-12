import fs from 'node:fs/promises';
import path from 'node:path';
import { normalizeConfig } from './config.mjs';
import { configPath, profilePath } from './paths.mjs';
import { normalizeProfile } from './profile.mjs';
import { ConfigError } from './validate.mjs';

/** Read JSON. Returns undefined if the file does not exist. */
export async function readJson(file) {
  let text;
  try {
    text = await fs.readFile(file, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return undefined;
    throw err;
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new ConfigError(`${file}: invalid JSON (${err.message})`);
  }
}

/** Write JSON atomically (temp file + rename). */
export async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`);
  await fs.rename(tmp, file);
}

function withFile(file, fn) {
  try {
    return fn();
  } catch (err) {
    if (err instanceof ConfigError) throw new ConfigError(`${file}: ${err.message}`);
    throw err;
  }
}

export async function loadConfig(env, home) {
  const file = configPath(env, home);
  const raw = await readJson(file);
  const config = withFile(file, () => normalizeConfig(raw ?? {}));
  return { file, exists: raw !== undefined, raw: raw ?? {}, config };
}

/**
 * Change some keys of the config file, preserving everything else in it.
 * The removed "always" key is dropped on the first save.
 */
export async function updateConfig(file, raw, patch) {
  const next = { ...raw, ...patch };
  delete next.always;
  await writeJson(file, next);
  return next;
}

export async function loadProfile(cwd) {
  const file = profilePath(cwd);
  const raw = await readJson(file);
  if (raw === undefined) return { file, profile: null };
  return { file, profile: withFile(file, () => normalizeProfile(raw)) };
}

export async function saveProfile(cwd, profile) {
  const file = profilePath(cwd);
  await writeJson(file, normalizeProfile(profile));
  return file;
}
