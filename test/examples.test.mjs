import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { mergePresets, normalizeConfig } from '../src/config.mjs';
import { SUGGESTED_PRESETS } from '../src/presets.mjs';
import { normalizeProfile, presetToProfile } from '../src/profile.mjs';

const read = async (name) => JSON.parse(await fs.readFile(new URL(`../examples/${name}`, import.meta.url), 'utf8'));

test('examples/config.example.json is valid and its presets resolve', async () => {
  const config = normalizeConfig(await read('config.example.json'));
  assert.equal(config.legacyAlways, false);
  const presets = mergePresets(config);
  for (const name of ['quick', 'build', 'review', 'plan', 'superpowers', 'advisor']) {
    assert.equal(presetToProfile(name, presets).preset, name);
  }
  assert.equal(presetToProfile('quick', presets).extensions.load.length, 2);
});

test('examples/profile.example.json is valid', async () => {
  const profile = normalizeProfile(await read('profile.example.json'));
  assert.equal(profile.model, 'qwen3.8:27b');
});

test('the example config carries exactly the suggested presets', async () => {
  const raw = await read('config.example.json');
  for (const [name, def] of Object.entries(SUGGESTED_PRESETS)) assert.deepEqual(raw.presets[name], def, name);
});
