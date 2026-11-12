import path from 'node:path';

// A package's entry point is "index.ts"; show the package name instead when we know it.
const names = (list, items = []) =>
  list.map((p) => items.find((i) => i.path === p)?.name ?? path.basename(p)).join(', ');

/**
 * What extensions/skills a profile will load, in one phrase.
 * `found` is how many Pi's standard folders contain (undefined if unknown).
 */
function resourceRow(res, found, t, items) {
  if (res.mode === 'all') {
    if (found === undefined) return t('val.allDiscovered');
    return found === 0 ? t('val.noneFound') : t('val.allFound', { n: found });
  }
  const list = res.load.length ? names(res.load, items) : t('val.none');
  if (found === undefined || found === 0) return list;
  return t('val.ofFound', { list, k: res.load.length, n: found });
}

function toolsRow(tools, t) {
  if (tools === null) return t('val.all');
  if (tools.length === 0) return t('val.none');
  return tools.join(', ');
}

/** The value shown for each editable field. Pure, so it is testable. */
export function fieldValues(profile, t, discovered = {}) {
  return {
    model: profile.model ?? t('val.piDefault'),
    thinking: profile.thinking ?? t('val.piDefault'),
    tools: toolsRow(profile.tools, t),
    extensions: resourceRow(profile.extensions, discovered.extensions?.length, t, discovered.extensions),
    skills: resourceRow(profile.skills, discovered.skills?.length, t, discovered.skills),
  };
}

/** Rows for the preview: [[label, value], ...]. */
export function describeProfile(profile, t, commandLine, discovered = {}) {
  const v = fieldValues(profile, t, discovered);
  return [
    [t('label.model'), v.model],
    [t('label.thinking'), v.thinking],
    [t('label.tools'), v.tools],
    [t('label.extensions'), v.extensions],
    [t('label.skills'), v.skills],
    [t('label.command'), commandLine],
  ];
}

export function renderRows(rows) {
  const width = Math.max(...rows.map(([k]) => k.length));
  return rows.map(([k, v]) => `${k.padEnd(width)}  ${v}`).join('\n');
}
