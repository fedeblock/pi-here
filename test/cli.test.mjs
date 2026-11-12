import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const BIN = fileURLToPath(new URL('../bin/pi-here.mjs', import.meta.url));

// A throwaway world: HOME, a project folder, and fake `ollama` / `pi` that record their arguments.
async function world() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-here-cli-'));
  const shims = path.join(root, 'shims');
  const proj = path.join(root, 'proj');
  const home = path.join(root, 'home');
  const out = path.join(root, 'args.txt');
  await fs.mkdir(shims);
  await fs.mkdir(proj);
  await fs.mkdir(home);
  for (const name of ['ollama', 'pi']) {
    const file = path.join(shims, name);
    await fs.writeFile(file, `#!/bin/sh\necho "${name}" > "$SHIM_OUT"\nprintf '%s\\n' "$@" >> "$SHIM_OUT"\nexit \${SHIM_EXIT:-0}\n`);
    await fs.chmod(file, 0o755);
  }
  const run = (args, { env = {}, cwd = proj } = {}) =>
    spawnSync(process.execPath, [BIN, ...args], {
      cwd,
      encoding: 'utf8',
      input: '',
      env: {
        PATH: `${shims}:/usr/bin:/bin`,
        HOME: home,
        XDG_CONFIG_HOME: path.join(home, '.config'),
        PI_HERE_LANG: 'en',
        SHIM_OUT: out,
        ...env,
      },
    });
  const called = async () => (await fs.readFile(out, 'utf8').catch(() => '')).split('\n').filter(Boolean);
  const writeConfig = async (cfg) => {
    const file = path.join(home, '.config', 'pi-here', 'config.json');
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(cfg));
    return file;
  };
  const writeProfile = async (p) => {
    await fs.mkdir(path.join(proj, '.pi'), { recursive: true });
    await fs.writeFile(path.join(proj, '.pi', 'profile.json'), typeof p === 'string' ? p : JSON.stringify(p));
  };
  return { root, proj, home, run, called, writeConfig, writeProfile };
}

test('--dry-run prints the command and starts nothing', async () => {
  const w = await world();
  const r = w.run(['--dry-run']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), 'ollama launch pi -- --thinking medium');
  assert.deepEqual(await w.called(), []);
});

test('--yes with no saved profile launches the default preset', async () => {
  const w = await world();
  const r = w.run(['--yes']);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(await w.called(), ['ollama', 'launch', 'pi', '--', '--thinking', 'medium']);
  assert.match(r.stderr, /^\$ ollama launch pi/);
});

test('--preset review plus pass-through arguments after "--"', async () => {
  const w = await world();
  const r = w.run(['-p', 'review', '--yes', '--', '--offline']);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(await w.called(), [
    'ollama', 'launch', 'pi', '--', '--thinking', 'high', '--tools', 'read,grep,find,ls', '--offline',
  ]);
});

test('the folder profile wins over the default preset', async () => {
  const w = await world();
  await w.writeProfile({ thinking: 'minimal', model: 'qwen3.8:27b' });
  const r = w.run(['--yes']);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(await w.called(), [
    'ollama', 'launch', 'pi', '--model', 'qwen3.8:27b', '--', '--thinking', 'minimal',
  ]);
});

test('--save writes .pi/profile.json and the next run reuses it', async () => {
  const w = await world();
  assert.equal(w.run(['--preset', 'review', '--save', '--dry-run']).status, 0);
  const saved = JSON.parse(await fs.readFile(path.join(w.proj, '.pi', 'profile.json'), 'utf8'));
  assert.equal(saved.preset, 'review');
  assert.deepEqual(saved.tools, ['read', 'grep', 'find', 'ls']);
  assert.match(w.run(['--dry-run']).stdout, /--tools read,grep,find,ls/);
});

test('a preset in the config can list exactly which extensions to load', async () => {
  const w = await world();
  await w.writeConfig({
    presets: {
      lean: {
        thinking: 'low',
        extensions: { mode: 'only', load: ['~/.pi/agent/extensions/permission-gate.ts'] },
      },
    },
  });
  const r = w.run(['lean', '--dry-run']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(
    r.stdout.trim(),
    `ollama launch pi -- --thinking low --no-extensions --extension ${w.home}/.pi/agent/extensions/permission-gate.ts`,
  );
});

test('the preset can be given as a plain argument, with -p, or with --preset=', async () => {
  const w = await world();
  const expected = 'ollama launch pi -- --thinking high --tools read,grep,find,ls';
  assert.equal(w.run(['review', '--dry-run']).stdout.trim(), expected);
  assert.equal(w.run(['-p', 'review', '--dry-run']).stdout.trim(), expected);
  assert.equal(w.run(['--preset=review', '--dry-run']).stdout.trim(), expected);
  const r = w.run(['quick', 'review', '--dry-run']);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Unexpected argument: review/);
});

test('defaultPreset in the config is what a folder without a profile starts from', async () => {
  const w = await world();
  await w.writeConfig({ defaultPreset: 'review' });
  assert.match(w.run(['--dry-run']).stdout, /--tools read,grep,find,ls/);
});

test('an old "always" key triggers a notice but does not break anything', async () => {
  const w = await world();
  await w.writeConfig({ always: { extensions: ['/x.ts'] } });
  const r = w.run(['--dry-run']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), 'ollama launch pi -- --thinking medium');
  assert.match(r.stderr, /"always" setting.*no longer used/);
});

test('launcher "pi" skips ollama', async () => {
  const w = await world();
  await w.writeConfig({ launcher: 'pi' });
  const r = w.run(['--yes']);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(await w.called(), ['pi', '--thinking', 'medium']);
});

test('the exit code of Pi is passed through', async () => {
  const w = await world();
  assert.equal(w.run(['--yes'], { env: { SHIM_EXIT: '3' } }).status, 3);
});

test('a missing launcher gives a clear message and exit 127', async () => {
  const w = await world();
  const r = w.run(['--yes'], { env: { PATH: '/nonexistent' } });
  assert.equal(r.status, 127);
  assert.match(r.stderr, /Command not found: ollama.*"launcher"/);
});

test('--show prints profile and command as JSON', async () => {
  const w = await world();
  const out = JSON.parse(w.run(['--show', '-p', 'quick']).stdout);
  assert.equal(out.profile.preset, 'quick');
  assert.equal(out.command, 'ollama launch pi -- --thinking low --no-skills');
});

test('errors: bad profile, unknown preset, unknown option, missing value', async () => {
  const w = await world();
  await w.writeProfile('{ nope');
  let r = w.run(['--yes']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /profile\.json: invalid JSON/);

  await w.writeProfile({ thinking: 'turbo' });
  r = w.run(['--yes']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /profile\.json: .*thinking/);

  await fs.rm(path.join(w.proj, '.pi'), { recursive: true });
  r = w.run(['-p', 'nope', '--yes']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Unknown preset "nope". Available: quick, build, review/);

  r = w.run(['--wat']);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Unknown option: --wat/);

  r = w.run(['--preset']);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /needs a value/);
});

test('"config" without a terminal just prints where the config lives', async () => {
  const w = await world();
  const r = w.run(['config']);
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), path.join(w.home, '.config', 'pi-here', 'config.json'));
});

test('Spanish output when requested', async () => {
  const w = await world();
  const r = w.run(['--wat'], { env: { PI_HERE_LANG: 'es' } });
  assert.match(r.stderr, /Opción desconocida: --wat/);
});


test('config --add-suggested adds the package presets once and never overwrites', async () => {
  const w = await world();
  await w.writeConfig({ presets: { plan: { thinking: 'low' } } });
  const r = w.run(['config', '--add-suggested']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Added presets: superpowers, advisor/);
  assert.match(r.stdout, /Left as they were.*: plan/);
  assert.match(r.stdout, /pi install npm:@tsubus\/pi-superpowers/);
  const cfg = JSON.parse(await fs.readFile(path.join(w.home, '.config', 'pi-here', 'config.json'), 'utf8'));
  assert.equal(cfg.presets.plan.thinking, 'low');
  assert.ok(cfg.presets.superpowers.extensions.load[0].startsWith('~/.pi/agent/npm/node_modules/'));
  const again = w.run(['config', '--add-suggested']);
  assert.match(again.stdout, /Nothing to add/);
});
