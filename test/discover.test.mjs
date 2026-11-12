import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { describeProfile, fieldValues, renderRows } from '../src/describe.mjs';
import { discoverExtensions, discoverSkills, parseOllamaList } from '../src/discover.mjs';
import { makeT } from '../src/i18n.mjs';
import { normalizeProfile } from '../src/profile.mjs';

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-here-disc-'));
  const agent = path.join(root, 'agent');
  const proj = path.join(root, 'proj');
  const w = async (rel, text = '') => {
    await fs.mkdir(path.dirname(rel), { recursive: true });
    await fs.writeFile(rel, text);
  };
  await w(path.join(agent, 'extensions', 'a.ts'));
  await w(path.join(agent, 'extensions', 'b.js'));
  await w(path.join(agent, 'extensions', 'notes.txt'));
  await w(path.join(agent, 'extensions', '.hidden.ts'));
  await w(path.join(agent, 'extensions', 'c', 'index.ts'));
  await w(path.join(agent, 'extensions', 'd', 'readme.md'));
  await w(path.join(proj, '.pi', 'extensions', 'p.ts'));
  await w(path.join(agent, 'skills', 's1', 'SKILL.md'));
  await w(path.join(agent, 'skills', 's2', 'notes.md'));
  await w(path.join(agent, 'skills', 'loose.md'));
  await w(path.join(proj, '.pi', 'skills', 'ps', 'SKILL.md'));
  return { env: { PI_CODING_AGENT_DIR: agent }, cwd: proj, home: root, agent, proj };
}

test('extensions: files and entry-point folders, global before project', async () => {
  const f = await fixture();
  const found = await discoverExtensions(f);
  assert.deepEqual(
    found.map((e) => `${e.scope}:${e.name}`),
    ['global:a.ts', 'global:b.js', 'global:c', 'project:p.ts'],
  );
  assert.equal(found[0].path, path.join(f.agent, 'extensions', 'a.ts'));
});

test('skills: folders with SKILL.md and loose .md files', async () => {
  const f = await fixture();
  const found = await discoverSkills(f);
  assert.deepEqual(
    found.map((e) => `${e.scope}:${e.name}`),
    ['global:loose.md', 'global:s1', 'project:ps'],
  );
});

test('nothing installed: empty lists, no errors', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-here-empty-'));
  const ctx = { env: { PI_CODING_AGENT_DIR: path.join(root, 'none') }, cwd: root, home: root };
  assert.deepEqual(await discoverExtensions(ctx), []);
  assert.deepEqual(await discoverSkills(ctx), []);
});

test('ollama list parsing', () => {
  const out = [
    'NAME                      ID            SIZE     MODIFIED',
    'qwen3.8:27b               abc123        26 GB    2 days ago',
    'qwen3:14b-q8_0            def456        16 GB    3 weeks ago',
    '',
  ].join('\n');
  assert.deepEqual(parseOllamaList(out), ['qwen3.8:27b', 'qwen3:14b-q8_0']);
});

test('preview rows say how many extensions are loaded out of those found', () => {
  const t = makeT('en');
  const found = { extensions: [{}, {}, {}], skills: [] };
  const all = Object.fromEntries(describeProfile(normalizeProfile({ thinking: 'low' }), t, 'CMD', found));
  assert.equal(all.Model, 'Pi default');
  assert.equal(all.Thinking, 'low');
  assert.equal(all.Extensions, 'all (3 found)');
  assert.equal(all.Skills, 'none found');
  assert.equal(all.Command, 'CMD');

  const some = Object.fromEntries(describeProfile(
    normalizeProfile({ extensions: { mode: 'only', load: ['/x/permission-gate.ts', '/x/protected-paths.ts'] } }), t, 'CMD', found,
  ));
  assert.equal(some.Extensions, 'permission-gate.ts, protected-paths.ts  (2 of 3)');
  assert.match(renderRows(Object.entries(some)), /^Model +Pi default$/m);
});

test('wording when nothing is known, and for an empty selection', () => {
  const t = makeT('en');
  assert.equal(fieldValues(normalizeProfile({}), t).extensions, 'all (Pi default discovery)');
  const none = normalizeProfile({ extensions: { mode: 'only' }, skills: { mode: 'only' } });
  assert.equal(fieldValues(none, t, { extensions: [{}], skills: [{}] }).extensions, 'none  (0 of 1)');
  assert.equal(fieldValues(none, t).skills, 'none');
  assert.equal(fieldValues(normalizeProfile({ tools: ['read', 'grep'] }), t).tools, 'read, grep');
});


test('packages: settings.json entries resolve to their manifest extensions and skills', async () => {
  const f = await fixture();
  const w = async (rel, text = '') => {
    await fs.mkdir(path.dirname(rel), { recursive: true });
    await fs.writeFile(rel, text);
  };
  const pkgs = path.join(f.agent, 'npm', 'node_modules');
  await w(path.join(pkgs, '@acme', 'plan', 'package.json'), JSON.stringify({ name: '@acme/plan', pi: { extensions: ['./dist/index.ts'] } }));
  await w(path.join(pkgs, '@acme', 'plan', 'dist', 'index.ts'));
  await w(path.join(pkgs, 'flow', 'package.json'), JSON.stringify({ name: 'flow', pi: { extensions: ['./a.ts', './b.ts'], skills: ['./skills'] } }));
  await w(path.join(pkgs, 'flow', 'a.ts'));
  await w(path.join(pkgs, 'flow', 'b.ts'));
  await w(path.join(pkgs, 'flow', 'skills', 'tdd', 'SKILL.md'));
  await w(path.join(pkgs, 'plain', 'package.json'), JSON.stringify({ name: 'plain' }));
  await w(path.join(pkgs, 'plain', 'skills', 'only', 'SKILL.md'));
  await w(path.join(f.proj, '.pi', 'npm', 'node_modules', 'local', 'package.json'), JSON.stringify({ name: 'local', pi: { extensions: ['./x.ts'] } }));
  await w(path.join(f.proj, '.pi', 'npm', 'node_modules', 'local', 'x.ts'));
  await w(path.join(f.agent, 'settings.json'), JSON.stringify({
    packages: ['npm:@acme/plan@1.2.0', { source: 'npm:flow' }, 'npm:plain', 'npm:missing'],
  }));
  await w(path.join(f.proj, '.pi', 'settings.json'), JSON.stringify({ packages: ['npm:local'] }));

  const ext = await discoverExtensions(f);
  const byName = Object.fromEntries(ext.map((e) => [e.name, e]));
  assert.equal(byName['@acme/plan'].path, path.join(pkgs, '@acme', 'plan', 'dist', 'index.ts'));
  assert.equal(byName['@acme/plan'].scope, 'package');
  assert.ok(byName['flow:a.ts'] && byName['flow:b.ts'], 'a package with two entries lists each one');
  assert.ok(byName.local);
  assert.ok(!Object.keys(byName).some((n) => n.includes('missing')));
  // loose extensions still come first
  assert.equal(ext[0].scope, 'global');

  const skills = await discoverSkills(f);
  const sk = skills.filter((s) => s.scope === 'package').map((s) => `${s.name}@${s.from}`).sort();
  assert.deepEqual(sk, ['only@plain', 'tdd@flow']);
});

test('packages: the preview names a package by its name, not "index.ts"', () => {
  const t = makeT('en');
  const p = '/x/node_modules/@acme/plan/dist/index.ts';
  const profile = normalizeProfile({ extensions: { mode: 'only', load: [p] } });
  const v = fieldValues(profile, t, { extensions: [{ name: '@acme/plan', path: p }, {}], skills: [] });
  assert.equal(v.extensions, '@acme/plan  (1 of 2)');
});
