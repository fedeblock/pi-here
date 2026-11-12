import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCommand, formatCommand, shellQuote } from '../src/command.mjs';
import { mergePresets, normalizeConfig } from '../src/config.mjs';
import { normalizeProfile, presetToProfile } from '../src/profile.mjs';

const opts = { cwd: '/proj', home: '/home/u' };
const config = normalizeConfig();
const preset = (name) => presetToProfile(name, mergePresets(config));

test('build preset: only the thinking level, through ollama launch', () => {
  assert.deepEqual(buildCommand(preset('build'), config, opts), {
    cmd: 'ollama',
    args: ['launch', 'pi', '--', '--thinking', 'medium'],
  });
});

test('quick preset: lower thinking and no skills', () => {
  assert.deepEqual(buildCommand(preset('quick'), config, opts).args, [
    'launch', 'pi', '--', '--thinking', 'low', '--no-skills',
  ]);
});

test('review preset: read-only built-in tools', () => {
  assert.deepEqual(buildCommand(preset('review'), config, opts).args, [
    'launch', 'pi', '--', '--thinking', 'high', '--tools', 'read,grep,find,ls',
  ]);
});

test('extensions "all" add no flags; "only" switches discovery off and lists exactly those', () => {
  const all = normalizeProfile({ extensions: { mode: 'all', load: ['/ignored.ts'] } });
  assert.deepEqual(buildCommand(all, config, opts).args, ['launch', 'pi']);

  const only = normalizeProfile({
    extensions: { mode: 'only', load: ['~/.pi/agent/extensions/guard.ts', '/abs/b.ts'] },
  });
  assert.deepEqual(buildCommand(only, config, opts).args, [
    'launch', 'pi', '--',
    '--no-extensions',
    '--extension', '/home/u/.pi/agent/extensions/guard.ts',
    '--extension', '/abs/b.ts',
  ]);
});

test('"only" with an empty list loads nothing', () => {
  const none = normalizeProfile({ extensions: { mode: 'only', load: [] } });
  assert.deepEqual(buildCommand(none, config, opts).args, ['launch', 'pi', '--', '--no-extensions']);
});

test('skills in "only" mode', () => {
  const profile = normalizeProfile({ skills: { mode: 'only', load: ['/s/extra', '~/.pi/agent/skills/core'] } });
  assert.deepEqual(buildCommand(profile, config, opts).args.slice(3), [
    '--no-skills', '--skill', '/s/extra', '--skill', '/home/u/.pi/agent/skills/core',
  ]);
});

test('duplicates are removed and relative paths resolve against the project', () => {
  const profile = normalizeProfile({
    extensions: { mode: 'only', load: ['/abs/guard.ts', '/abs/guard.ts', '.pi/extensions/local.ts'] },
  });
  const ext = buildCommand(profile, config, opts).args.filter((a, i, all) => all[i - 1] === '--extension');
  assert.deepEqual(ext, ['/abs/guard.ts', '/proj/.pi/extensions/local.ts']);
});

test('empty tool list means --no-tools', () => {
  const profile = normalizeProfile({ tools: [] });
  assert.deepEqual(buildCommand(profile, config, opts).args, ['launch', 'pi', '--', '--no-tools']);
});

test('order: model, ollamaArgs, then "--", then profile flags, extraArgs, passthrough', () => {
  const cfg = normalizeConfig({ ollamaArgs: ['-y'] });
  const profile = normalizeProfile({ model: 'qwen3.8:27b', thinking: 'low', extraArgs: ['--x'] });
  const { args } = buildCommand(profile, cfg, { ...opts, passthrough: ['--y'] });
  assert.deepEqual(args, ['launch', 'pi', '--model', 'qwen3.8:27b', '-y', '--', '--thinking', 'low', '--x', '--y']);
});

test('launcher "pi" runs pi directly', () => {
  const cfg = normalizeConfig({ launcher: 'pi' });
  const profile = normalizeProfile({ model: 'm', thinking: 'high' });
  assert.deepEqual(buildCommand(profile, cfg, opts), { cmd: 'pi', args: ['--model', 'm', '--thinking', 'high'] });
});

test('contextFiles:false adds --no-context-files', () => {
  const { args } = buildCommand(normalizeProfile({ contextFiles: false }), config, opts);
  assert.ok(args.includes('--no-context-files'));
});

test('shellQuote / formatCommand', () => {
  assert.equal(shellQuote('qwen3.8:27b'), 'qwen3.8:27b');
  assert.equal(shellQuote('a b'), "'a b'");
  assert.equal(shellQuote("it's"), "'it'\\''s'");
  assert.equal(formatCommand({ cmd: 'pi', args: ['--tools', 'read,grep'] }), 'pi --tools read,grep');
});
