import path from 'node:path';
import readline from 'node:readline';
import * as p from '@clack/prompts';
import { mergePresets } from './config.mjs';
import { describeProfile, fieldValues, renderRows } from './describe.mjs';
import { READ_ONLY_TOOLS, THINKING_LEVELS } from './presets.mjs';
import { presetToProfile, profileToPreset } from './profile.mjs';

const OTHER = '__other__';
const FIELDS = ['model', 'thinking', 'tools', 'extensions', 'skills'];

/** Wait for a single key. Enter -> 'enter'; Esc / Ctrl-C -> 'q'; others only if in `valid`. */
export function readKey(valid, { stdin = process.stdin } = {}) {
  return new Promise((resolve) => {
    readline.emitKeypressEvents(stdin);
    const wasRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();
    const onKey = (str, key = {}) => {
      let k = null;
      if (key.ctrl && key.name === 'c') k = 'q';
      else if (key.name === 'return' || key.name === 'enter') k = 'enter';
      else if (key.name === 'escape') k = 'q';
      else if (str && valid.includes(str.toLowerCase())) k = str.toLowerCase();
      if (!k) return;
      stdin.off('keypress', onKey);
      stdin.setRawMode(Boolean(wasRaw));
      stdin.pause();
      resolve(k);
    };
    stdin.on('keypress', onKey);
  });
}

const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
const presetLabel = (t, name) => (t.has(`preset.${name}`) ? t(`preset.${name}`) : name);
const presetHint = (t, name, def) => (t.has(`preset.${name}.desc`) ? t(`preset.${name}.desc`) : def?.description);

async function pickPreset({ t, presets, current }) {
  const value = await p.select({
    message: t('pickPreset'),
    initialValue: presets[current] ? current : undefined,
    options: Object.entries(presets).map(([name, def]) => ({
      value: name,
      label: presetLabel(t, name),
      hint: presetHint(t, name, def),
    })),
  });
  return p.isCancel(value) ? null : value;
}

// ---- single questions: each returns the new value, or undefined if the user backed out ----

async function askModel({ t, current, models }) {
  const options = [{ value: '', label: t('opt.piDefault') }, ...models.map((m) => ({ value: m, label: m }))];
  if (current && !models.includes(current)) options.push({ value: current, label: current });
  options.push({ value: OTHER, label: t('opt.otherModel') });
  let model = await p.select({ message: t('edit.model'), initialValue: current ?? '', options });
  if (p.isCancel(model)) return undefined;
  if (model === OTHER) {
    model = await p.text({ message: t('opt.modelName'), initialValue: current ?? '' });
    if (p.isCancel(model)) return undefined;
  }
  return model.trim() || null;
}

async function askThinking({ t, current }) {
  const level = await p.select({
    message: t('edit.thinking'),
    initialValue: current ?? '',
    options: [{ value: '', label: t('opt.piDefault') }, ...THINKING_LEVELS.map((l) => ({ value: l, label: l }))],
  });
  return p.isCancel(level) ? undefined : level || null;
}

async function askTools({ t, current }) {
  const now =
    current === null ? 'all'
    : current.length === 0 ? 'none'
    : sameSet(current, READ_ONLY_TOOLS) ? 'readonly'
    : 'custom';
  const options = [
    { value: 'all', label: t('opt.toolsAll') },
    { value: 'readonly', label: t('opt.toolsReadOnly') },
    { value: 'none', label: t('opt.toolsNone') },
  ];
  if (now === 'custom') options.push({ value: 'custom', label: current.join(', ') });
  const choice = await p.select({ message: t('edit.tools'), initialValue: now, options });
  if (p.isCancel(choice)) return undefined;
  if (choice === 'all') return null;
  if (choice === 'none') return [];
  if (choice === 'readonly') return [...READ_ONLY_TOOLS];
  return current;
}

/**
 * The checklist: every extension (or skill) found, ticked if it will load.
 * Everything ticked means "all" (Pi's own discovery, which also covers anything
 * this tool cannot list); anything unticked switches discovery off and loads
 * exactly the ticked ones. Returns the new { mode, load }, or null if nothing changed.
 */
async function editResource({ t, kind, current, items, abs }) {
  const known = new Set(items.map((i) => i.path));
  // Paths written by hand in a profile are shown too, so they can be unticked.
  const extras = current.load
    .map(abs)
    .filter((x) => !known.has(x))
    .map((x) => ({ name: path.basename(x), path: x, scope: 'custom' }));
  const all = [...items, ...extras];
  if (all.length === 0) {
    p.log.info(t(`none.${kind}`));
    return null;
  }
  const loaded = new Set(current.load.map(abs));
  const picked = await p.multiselect({
    message: t(`pick.${kind}`),
    options: all.map((i) => ({ value: i.path, label: i.name, hint: i.from ?? i.scope })),
    initialValues: all.filter((i) => current.mode === 'all' || loaded.has(i.path)).map((i) => i.path),
    required: false,
  });
  if (p.isCancel(picked)) return null;
  if (extras.length === 0 && items.every((i) => picked.includes(i.path))) return { mode: 'all', load: [] };
  return { mode: 'only', load: picked };
}

/**
 * One menu with every setting and its current value; pick one to change it.
 * Used for "edit this run" and for configuring a preset. Returns the edited profile.
 */
async function editProfile({ t, profile, discovered, models, abs, title, markCustom }) {
  const next = structuredClone(profile);
  let last = 'model';
  for (;;) {
    const values = fieldValues(next, t, discovered);
    const width = Math.max(...FIELDS.map((f) => t(`label.${f}`).length));
    const choice = await p.select({
      message: title,
      initialValue: last,
      options: [
        ...FIELDS.map((f) => ({ value: f, label: `${t(`label.${f}`).padEnd(width)}  ${values[f]}` })),
        { value: 'done', label: `✔ ${t('edit.done')}` },
      ],
    });
    if (p.isCancel(choice) || choice === 'done') break;
    const snapshot = JSON.stringify(next);

    if (choice === 'model') {
      const v = await askModel({ t, current: next.model, models });
      if (v !== undefined) next.model = v;
    } else if (choice === 'thinking') {
      const v = await askThinking({ t, current: next.thinking });
      if (v !== undefined) next.thinking = v;
    } else if (choice === 'tools') {
      const v = await askTools({ t, current: next.tools });
      if (v !== undefined) next.tools = v;
    } else {
      const v = await editResource({ t, kind: choice, current: next[choice], items: discovered[choice], abs });
      if (v) next[choice] = v;
    }
    // After a change the cursor waits on "Done": one Enter finishes, arrows go back for more.
    last = JSON.stringify(next) !== snapshot ? 'done' : choice;
  }

  const strip = ({ preset, ...rest }) => JSON.stringify(rest);
  if (markCustom && strip(next) !== strip(profile)) next.preset = 'custom';
  return next;
}

// ---- configure: change what each preset loads, for every folder ----

export async function configure({ t, store, discovered, models, abs }) {
  let last;
  for (;;) {
    const { config } = store.get();
    const presets = mergePresets(config);
    const choice = await p.select({
      message: t('conf.title'),
      initialValue: last,
      options: [
        ...Object.entries(presets).map(([name, def]) => ({
          value: `preset:${name}`,
          label: presetLabel(t, name),
          hint: presetHint(t, name, def),
        })),
        { value: 'new', label: t('conf.new') },
        { value: 'default', label: `${t('conf.default')}: ${presetLabel(t, config.defaultPreset)}` },
        { value: 'launcher', label: `${t('conf.launcher')}: ${config.launcher}` },
        { value: 'back', label: `← ${t('conf.back')}` },
      ],
    });
    if (p.isCancel(choice) || choice === 'back') return;
    last = 'back'; // after any change the cursor waits on Back

    if (choice.startsWith('preset:')) {
      const name = choice.slice('preset:'.length);
      const before = presetToProfile(name, presets);
      const after = await editProfile({
        t, profile: before, discovered, models, abs,
        title: t('edit.presetTitle', { name: presetLabel(t, name) }), markCustom: false,
      });
      if (JSON.stringify(profileToPreset(after)) !== JSON.stringify(profileToPreset(before))) {
        const description = config.presets[name]?.description;
        await store.update({
          presets: { ...config.presets, [name]: { ...(description ? { description } : {}), ...profileToPreset(after) } },
        });
      }
    } else if (choice === 'new') {
      const name = await p.text({
        message: t('conf.newName'),
        validate: (v) => {
          if (!/^[\w.-]+$/.test(v ?? '') || v === 'config') return t('conf.nameBad');
          if (presets[v]) return t('conf.nameTaken');
          return undefined;
        },
      });
      if (p.isCancel(name)) continue;
      const base = presetToProfile(config.defaultPreset, presets);
      const after = await editProfile({
        t, profile: base, discovered, models, abs,
        title: t('edit.presetTitle', { name }), markCustom: false,
      });
      await store.update({ presets: { ...config.presets, [name]: profileToPreset(after) } });
    } else if (choice === 'default') {
      const name = await pickPreset({ t, presets, current: config.defaultPreset });
      if (name && name !== config.defaultPreset) await store.update({ defaultPreset: name });
    } else if (choice === 'launcher') {
      const launcher = await p.select({
        message: t('conf.launcher'),
        initialValue: config.launcher,
        options: [
          { value: 'ollama', label: 'ollama', hint: t('conf.launcher.ollama') },
          { value: 'pi', label: 'pi', hint: t('conf.launcher.pi') },
        ],
      });
      if (!p.isCancel(launcher) && launcher !== config.launcher) await store.update({ launcher });
    }
  }
}

/** `pi-here config`: the same menu on its own screen. */
export async function configureStandalone(ctx) {
  p.intro(ctx.t('conf.intro'));
  await configure(ctx);
  p.outro(ctx.t('conf.done', { path: ctx.store.get().file }));
}

// ---- the launch screen ----

function heading(t, profile, source) {
  const name = presetLabel(t, profile.preset);
  if (source === 'folder') return t('title.folder', { name });
  if (profile.preset === 'custom') return t('title.custom');
  if (source === 'default') return t('title.default', { name });
  return name;
}

/**
 * Preview, then Enter to launch. Returns { action: 'launch' | 'cancel', profile }.
 *
 * ctx: { t, folder, profile, source: 'folder' | 'default' | 'preset', store, discovered,
 *        models, abs, getPresets(), fromPreset(name), preview(profile),
 *        saveFolder(profile), startWithEdit }
 */
export async function interactive(ctx) {
  const { t, store, discovered, models, abs, getPresets, fromPreset, preview, saveFolder } = ctx;
  let { profile, source } = ctx;

  p.intro(t('intro', { folder: ctx.folder }));

  let pending = ctx.startWithEdit ? 'e' : null;
  for (;;) {
    if (!pending) {
      p.note(renderRows(describeProfile(profile, t, preview(profile), discovered)), heading(t, profile, source));
      p.log.message(t('keys'));
      pending = await readKey(['p', 'e', 's', 'c', 'q']);
    }
    const key = pending;
    pending = null;

    if (key === 'enter') {
      p.outro(t('launching'));
      return { action: 'launch', profile };
    }
    if (key === 'q') {
      p.cancel(t('cancelled'));
      return { action: 'cancel', profile };
    }
    if (key === 'p') {
      const name = await pickPreset({ t, presets: getPresets(), current: profile.preset });
      if (name !== null) {
        const fresh = fromPreset(name);
        profile = { ...fresh, model: fresh.model ?? profile.model };
        source = 'preset';
      }
    }
    if (key === 'e') {
      profile = await editProfile({
        t, profile, discovered, models, abs, title: t('edit.title'), markCustom: true,
      });
    }
    if (key === 's') {
      const file = await saveFolder(profile);
      p.log.success(t('saved', { path: file }));
      source = 'folder';
    }
    if (key === 'c') {
      await configure({ t, store, discovered, models, abs });
      // Show the preset as it is now, in case it was just edited.
      if (source === 'default') profile = fromPreset(store.get().config.defaultPreset);
      else if (source === 'preset' && getPresets()[profile.preset]) {
        profile = { ...fromPreset(profile.preset), model: profile.model };
      }
    }
  }
}
