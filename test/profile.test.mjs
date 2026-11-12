import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { mergePresets, normalizeConfig } from '../src/config.mjs';
import { normalizeProfile, presetToProfile, profileToPreset } from '../src/profile.mjs';
import { loadConfig, loadProfile, saveProfile, updateConfig } from '../src/store.mjs';
import { ConfigError } from '../src/validate.mjs';

test('an empty profile gets complete defaults', () => {
  assert.deepEqual(normalizeProfile({}), {
    version: 1,
    preset: 'custom',
    model: null,
    thinking: null,
    tools: null,
    extensions: { mode: 'all', load: [] },
    skills: { mode: 'all', load: [] },
    contextFiles: true,
    extraArgs: [],
  });
});

test('invalid values are rejected with a readable message', () => {
  assert.throws(() => normalizeProfile({ thinking: 'turbo' }), /thinking.*one of/);
  assert.throws(() => normalizeProfile({ extensions: { mode: 'some' } }), /extensions\.mode/);
  assert.throws(() => normalizeProfile({ extensions: 'all' }), /extensions/);
  assert.throws(() => normalizeProfile({ tools: 'read' }), /tools/);
  assert.throws(() => normalizeProfile({ model: 3 }), /model/);
  assert.throws(() => normalizeProfile([]), ConfigError);
});

test('unknown preset lists the available ones', () => {
  const presets = mergePresets(normalizeConfig());
  assert.throws(() => presetToProfile('nope', presets), /Available: quick, build, review/);
});

test('config: defaults, validation, and custom presets', () => {
  const config = normalizeConfig({ presets: { mine: { thinking: 'minimal' } } });
  assert.equal(config.launcher, 'ollama');
  assert.equal(config.defaultPreset, 'build');
  assert.equal(presetToProfile('mine', mergePresets(config)).thinking, 'minimal');
  assert.throws(() => normalizeConfig({ launcher: 'docker' }), /launcher/);
  assert.throws(() => normalizeConfig({ presets: { bad: { thinking: 'x' } } }), /preset "bad"/);
});

test('a custom preset can replace a built-in one', () => {
  const config = normalizeConfig({ presets: { quick: { thinking: 'off' } } });
  assert.equal(presetToProfile('quick', mergePresets(config)).thinking, 'off');
});

test('an old "always" key is flagged, and otherwise ignored', () => {
  assert.equal(normalizeConfig({ always: { extensions: ['/x.ts'] } }).legacyAlways, true);
  assert.equal(normalizeConfig({ always: { skills: ['/s'] } }).legacyAlways, true);
  assert.equal(normalizeConfig({ always: { extensions: [], skills: [] } }).legacyAlways, false);
  assert.equal(normalizeConfig({}).legacyAlways, false);
  assert.ok(!('always' in normalizeConfig({ always: { extensions: ['/x.ts'] } })));
});

test('profileToPreset keeps only what differs from Pi defaults, and round-trips', () => {
  assert.deepEqual(profileToPreset(normalizeProfile({})), {});

  const profile = normalizeProfile({
    preset: 'mine',
    model: 'm',
    thinking: 'low',
    tools: ['read'],
    extensions: { mode: 'only', load: ['/a.ts'] },
    skills: { mode: 'only', load: [] },
    contextFiles: false,
    extraArgs: ['--x'],
  });
  const back = normalizeProfile(profileToPreset(profile));
  assert.deepEqual({ ...back, preset: 'mine' }, profile);
});

test('store: profile round trip and invalid JSON', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-here-'));
  const profile = normalizeProfile({ preset: 'build', thinking: 'low', model: 'm' });
  const file = await saveProfile(dir, profile);
  assert.equal(file, path.join(dir, '.pi', 'profile.json'));
  assert.deepEqual((await loadProfile(dir)).profile, profile);

  await fs.writeFile(file, '{ nope');
  await assert.rejects(loadProfile(dir), /profile\.json: invalid JSON/);
});

test('store: updateConfig changes only the given keys and drops the old "always"', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-here-upd-'));
  const home = path.join(dir, 'home');
  const env = { XDG_CONFIG_HOME: path.join(home, '.config') };

  const first = await loadConfig(env, home);
  assert.equal(first.exists, false);

  const raw = { launcher: 'pi', always: { extensions: ['/old.ts'] }, presets: { mine: { thinking: 'low' } } };
  await fs.mkdir(path.dirname(first.file), { recursive: true });
  await fs.writeFile(first.file, JSON.stringify(raw));

  const loaded = await loadConfig(env, home);
  assert.equal(loaded.config.legacyAlways, true);
  await updateConfig(loaded.file, loaded.raw, { defaultPreset: 'quick' });

  const after = JSON.parse(await fs.readFile(first.file, 'utf8'));
  assert.deepEqual(after, { launcher: 'pi', presets: { mine: { thinking: 'low' } }, defaultPreset: 'quick' });
  assert.equal((await loadConfig(env, home)).config.legacyAlways, false);
});
