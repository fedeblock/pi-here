import { THINKING_LEVELS } from './presets.mjs';
import { ConfigError, isObj, strList } from './validate.mjs';

function resource(v, name) {
  if (v == null) return { mode: 'all', load: [] };
  if (!isObj(v)) {
    throw new ConfigError(`"${name}" must be an object like {"mode":"all"} or {"mode":"only","load":[...]}`);
  }
  const mode = v.mode ?? 'all';
  if (mode !== 'all' && mode !== 'only') {
    throw new ConfigError(`"${name}.mode" must be "all" or "only"`);
  }
  return { mode, load: strList(v.load, `${name}.load`) };
}

/**
 * Turn raw JSON into a complete, validated profile.
 *
 * - model:        null = whatever Pi is configured to use
 * - thinking:     null = Pi default, otherwise one of THINKING_LEVELS
 * - tools:        null = all, [] = none, ["read", ...] = allowlist
 * - extensions:   {mode:"all"} = Pi's normal discovery;
 *                 {mode:"only", load:[paths]} = discovery off, load just these
 * - skills:       same shape as extensions
 * - contextFiles: false = do not read AGENTS.md / CLAUDE.md
 * - extraArgs:    appended to the Pi command as-is
 */
export function normalizeProfile(raw) {
  if (!isObj(raw)) throw new ConfigError('a profile must be a JSON object');

  if (raw.model != null && typeof raw.model !== 'string') {
    throw new ConfigError('"model" must be a string or null');
  }
  const model = typeof raw.model === 'string' && raw.model.trim() ? raw.model.trim() : null;

  if (raw.thinking != null && !THINKING_LEVELS.includes(raw.thinking)) {
    throw new ConfigError(`"thinking" must be one of: ${THINKING_LEVELS.join(', ')}`);
  }

  if (raw.preset != null && typeof raw.preset !== 'string') {
    throw new ConfigError('"preset" must be a string');
  }

  return {
    version: 1,
    preset: raw.preset ?? 'custom',
    model,
    thinking: raw.thinking ?? null,
    tools: raw.tools == null ? null : strList(raw.tools, 'tools'),
    extensions: resource(raw.extensions, 'extensions'),
    skills: resource(raw.skills, 'skills'),
    contextFiles: raw.contextFiles !== false,
    extraArgs: strList(raw.extraArgs, 'extraArgs'),
  };
}

export function presetToProfile(name, presets) {
  const preset = presets[name];
  if (!preset) {
    throw new ConfigError(`Unknown preset "${name}". Available: ${Object.keys(presets).join(', ')}`);
  }
  return normalizeProfile({ ...preset, preset: name });
}

/**
 * The compact form stored under "presets" in the config: only what differs
 * from Pi's defaults, so the file stays readable.
 */
export function profileToPreset(profile) {
  const out = {};
  if (profile.model) out.model = profile.model;
  if (profile.thinking) out.thinking = profile.thinking;
  if (profile.tools) out.tools = [...profile.tools];
  if (profile.extensions.mode === 'only') out.extensions = { mode: 'only', load: [...profile.extensions.load] };
  if (profile.skills.mode === 'only') out.skills = { mode: 'only', load: [...profile.skills.load] };
  if (!profile.contextFiles) out.contextFiles = false;
  if (profile.extraArgs.length) out.extraArgs = [...profile.extraArgs];
  return out;
}
