export class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
  }
}

export const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Validate an optional array of non-empty strings. */
export function strList(v, name) {
  if (v == null) return [];
  if (!Array.isArray(v) || v.some((x) => typeof x !== 'string' || x === '')) {
    throw new ConfigError(`"${name}" must be an array of non-empty strings`);
  }
  return [...v];
}

export const unique = (list) => [...new Set(list)];
