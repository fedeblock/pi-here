import assert from 'node:assert/strict';
import test from 'node:test';
import { detectLang, makeT, messages } from '../src/i18n.mjs';

test('English and Spanish define exactly the same keys', () => {
  assert.deepEqual(Object.keys(messages.es).sort(), Object.keys(messages.en).sort());
});

test('placeholders match between languages', () => {
  const vars = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  for (const key of Object.keys(messages.en)) {
    assert.deepEqual(vars(messages.es[key]), vars(messages.en[key]), key);
  }
});

test('language detection and interpolation', () => {
  assert.equal(detectLang({ LANG: 'es_ES.UTF-8' }), 'es');
  assert.equal(detectLang({ LANG: 'en_US.UTF-8' }), 'en');
  assert.equal(detectLang({ LANG: 'es_ES.UTF-8', PI_HERE_LANG: 'en' }), 'en');
  assert.equal(detectLang({}), 'en');
  assert.equal(makeT('en')('intro', { folder: 'x' }), 'pi-here · x');
  assert.equal(makeT('en')('no.such.key'), 'no.such.key');
  assert.equal(makeT('es').has('preset.quick'), true);
});
