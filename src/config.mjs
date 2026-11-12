import { BUILTIN_PRESETS } from './presets.mjs';
import { normalizeProfile } from './profile.mjs';
import { ConfigError, isObj, strList } from './validate.mjs';

/**
 * Global config, ~/.config/pi-here/config.json:
 *
 * {
 *   "launcher": "ollama",       // "ollama" runs `ollama launch pi -- ...`; "pi" runs `pi ...`
 *   "ollamaArgs": [],           // extra args for `ollama launch pi`, before the "--"
 *   "defaultPreset": "build",   // used in folders with no saved profile
 *   "presets": {                // yours; same fields as a profile, plus "description"
 *     "quick": { "thinking": "low", "extensions": { "mode": "only", "load": ["~/.pi/agent/extensions/guard.ts"] } }
 *   }
 * }
 *
 * `legacyAlways` is true when an old "always" key is still present (it was removed).
 */
export function normalizeConfig(raw = {}) {
  if (!isObj(raw)) throw new ConfigError('the config must be a JSON object');

  const launcher = raw.launcher ?? 'ollama';
  if (launcher !== 'ollama' && launcher !== 'pi') {
    throw new ConfigError('"launcher" must be "ollama" or "pi"');
  }

  if (raw.defaultPreset != null && typeof raw.defaultPreset !== 'string') {
    throw new ConfigError('"defaultPreset" must be a string');
  }

  if (raw.presets != null && !isObj(raw.presets)) {
    throw new ConfigError('"presets" must be an object');
  }
  const presets = raw.presets ?? {};
  for (const [name, def] of Object.entries(presets)) {
    try {
      normalizeProfile(def);
    } catch (err) {
      throw new ConfigError(`preset "${name}": ${err.message}`);
    }
  }

  const always = isObj(raw.always) ? raw.always : {};
  const legacyAlways = Boolean(always.extensions?.length || always.skills?.length);

  return {
    launcher,
    ollamaArgs: strList(raw.ollamaArgs, 'ollamaArgs'),
    defaultPreset: raw.defaultPreset ?? 'build',
    presets,
    legacyAlways,
  };
}

export function mergePresets(config) {
  return { ...BUILTIN_PRESETS, ...config.presets };
}
