import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildCommand, formatCommand } from './command.mjs';
import { mergePresets } from './config.mjs';
import { SUGGESTED_PRESETS } from './presets.mjs';
import { discoverExtensions, discoverSkills, listOllamaModels } from './discover.mjs';
import { detectLang, makeT } from './i18n.mjs';
import { resolvePath } from './paths.mjs';
import { presetToProfile } from './profile.mjs';
import { loadConfig, loadProfile, saveProfile, updateConfig } from './store.mjs';
import { ConfigError } from './validate.mjs';

class UsageError extends Error {}

export function parseArgs(argv, t = makeT('en')) {
  const dash = argv.indexOf('--');
  const own = dash === -1 ? argv : argv.slice(0, dash);
  const opts = {
    yes: false, dryRun: false, show: false, save: false, edit: false,
    preset: null, help: false, version: false, command: null, addSuggested: false,
    passthrough: dash === -1 ? [] : argv.slice(dash + 1),
  };
  for (let i = 0; i < own.length; i++) {
    const a = own[i];
    if (a === '-y' || a === '--yes') opts.yes = true;
    else if (a === '-n' || a === '--dry-run') opts.dryRun = true;
    else if (a === '--show') opts.show = true;
    else if (a === '--save') opts.save = true;
    else if (a === '--edit') opts.edit = true;
    else if (a === '--add-suggested') opts.addSuggested = true;
    else if (a === '-h' || a === '--help') opts.help = true;
    else if (a === '-v' || a === '--version') opts.version = true;
    else if (a === '-p' || a === '--preset') {
      const v = own[++i];
      if (!v || v.startsWith('-')) throw new UsageError(t('err.missingValue', { opt: a }));
      opts.preset = v;
    } else if (a.startsWith('--preset=')) opts.preset = a.slice('--preset='.length);
    else if (a.startsWith('-')) throw new UsageError(t('err.unknownOption', { opt: a }));
    else if (a === 'config' && i === 0) opts.command = 'config';
    else if (opts.preset === null) opts.preset = a; // `pi-here quick`
    else throw new UsageError(t('err.extraArg', { arg: a }));
  }
  return opts;
}

function runChild(cmd, args, env) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: 'inherit', env });
    // Ctrl-C reaches the child through the terminal; do not die before it does.
    const ignore = () => {};
    process.on('SIGINT', ignore);
    const done = (result) => {
      process.off('SIGINT', ignore);
      resolve(result);
    };
    child.on('error', (error) => done({ error }));
    child.on('exit', (code, signal) => done({ code, signal }));
  });
}

/** Copy the suggested presets into the config, never replacing a preset that already exists. */
export async function addSuggested({ t, cfg, store, abs, write }) {
  const have = cfg.config.presets;
  const added = [];
  const skipped = [];
  for (const name of Object.keys(SUGGESTED_PRESETS)) (name in have ? skipped : added).push(name);
  if (added.length) {
    await store.update({
      presets: { ...cfg.raw.presets, ...Object.fromEntries(added.map((n) => [n, SUGGESTED_PRESETS[n]])) },
    });
  }
  write(`${added.length ? t('sug.added', { names: added.join(', ') }) : t('sug.none')}\n`);
  if (skipped.length) write(`${t('sug.skipped', { names: skipped.join(', ') })}\n`);
  const missing = new Set();
  for (const n of added) {
    for (const res of [SUGGESTED_PRESETS[n].extensions, SUGGESTED_PRESETS[n].skills]) {
      for (const p of res.load) if (!existsSync(abs(p))) missing.add(p.match(/node_modules\/((?:@[^/]+\/)?[^/]+)\//)?.[1] ?? p);
    }
  }
  for (const pkg of missing) write(`${t('sug.missing', { pkg })}\n`);
}

function version() {
  const pkg = new URL('../package.json', import.meta.url);
  return JSON.parse(readFileSync(pkg, 'utf8')).version;
}

/** Entry point. Returns the process exit code. */
export async function main(argv, { env = process.env, cwd = process.cwd(), home = os.homedir() } = {}) {
  const t = makeT(detectLang(env));
  let opts;
  try {
    opts = parseArgs(argv, t);
  } catch (err) {
    if (!(err instanceof UsageError)) throw err;
    process.stderr.write(`pi-here: ${err.message}\n\n${t('usage')}\n`);
    return 2;
  }
  if (opts.help) {
    process.stdout.write(`${t('usage')}\n`);
    return 0;
  }
  if (opts.version) {
    process.stdout.write(`${version()}\n`);
    return 0;
  }

  const tty = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  const interactive = tty && !opts.yes && !opts.dryRun && !opts.show;

  try {
    let cfg = await loadConfig(env, home);
    if (cfg.config.legacyAlways) process.stderr.write(`pi-here: ${t('legacy.always')}\n`);

    // Changes to the global config go through here; `cfg` is re-read so the rest of the run sees them.
    const store = {
      get: () => cfg,
      update: async (patch) => {
        await updateConfig(cfg.file, cfg.raw, patch);
        cfg = await loadConfig(env, home);
      },
    };
    const abs = (x) => resolvePath(x, { cwd, home });
    const getPresets = () => mergePresets(cfg.config);
    const fromPreset = (name) => presetToProfile(name, getPresets());
    const discover = async () => ({
      extensions: await discoverExtensions({ env, cwd, home }),
      skills: await discoverSkills({ env, cwd, home }),
    });

    // The UI (and @clack/prompts) is only loaded when it is actually needed.
    const ui = interactive || (opts.command === 'config' && tty) ? await import('./ui.mjs') : null;

    if (opts.addSuggested) {
      await addSuggested({ t, cfg, store, abs, write: (s) => process.stdout.write(s) });
      return 0;
    }

    if (opts.command === 'config') {
      if (!ui) {
        process.stdout.write(`${cfg.file}\n`);
        return 0;
      }
      const [discovered, models] = await Promise.all([discover(), listOllamaModels({ env })]);
      await ui.configureStandalone({ t, store, discovered, models, abs });
      return 0;
    }

    const saved = await loadProfile(cwd);
    let profile;
    let source;
    if (opts.preset) {
      profile = fromPreset(opts.preset);
      source = 'preset';
    } else if (saved.profile) {
      profile = saved.profile;
      source = 'folder';
    } else {
      profile = fromPreset(cfg.config.defaultPreset);
      source = 'default';
    }

    const build = (pr) => buildCommand(pr, cfg.config, { cwd, home, passthrough: opts.passthrough });

    if (interactive) {
      const [discovered, models] = await Promise.all([discover(), listOllamaModels({ env })]);
      const result = await ui.interactive({
        t, profile, source, store, discovered, models, abs, getPresets, fromPreset,
        folder: path.basename(cwd) || cwd,
        preview: (pr) => formatCommand(build(pr)).split(home).join('~'), // display only: shorter lines
        saveFolder: (pr) => saveProfile(cwd, pr),
        startWithEdit: opts.edit,
      });
      if (result.action === 'cancel') return 130;
      profile = result.profile;
    }

    const command = build(profile);

    if (opts.save) {
      const file = await saveProfile(cwd, profile);
      process.stderr.write(`${t('saved', { path: file })}\n`);
    }

    if (opts.show) {
      process.stdout.write(`${JSON.stringify({ profile, command: formatCommand(command) }, null, 2)}\n`);
      return 0;
    }
    if (opts.dryRun) {
      process.stdout.write(`${formatCommand(command)}\n`);
      return 0;
    }
    if (!interactive) process.stderr.write(`$ ${formatCommand(command)}\n`);

    const result = await runChild(command.cmd, command.args, env);
    if (result.error) {
      if (result.error.code === 'ENOENT') {
        process.stderr.write(`pi-here: ${t('err.launcherNotFound', { cmd: command.cmd, path: cfg.file })}\n`);
        return 127;
      }
      throw result.error;
    }
    if (result.signal) return 128 + (os.constants.signals[result.signal] ?? 0);
    return result.code ?? 0;
  } catch (err) {
    if (err instanceof ConfigError) {
      process.stderr.write(`pi-here: ${err.message}\n`);
      return 1;
    }
    throw err;
  }
}
