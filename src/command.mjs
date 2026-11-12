import os from 'node:os';
import { resolvePath } from './paths.mjs';
import { unique } from './validate.mjs';

/**
 * Build the command line for a profile.
 *
 * Flags used (Pi CLI): --thinking, --tools, --no-tools, --no-extensions,
 * --extension, --no-skills, --skill, --no-context-files.
 *
 * Extensions/skills in mode "all" add no flags: Pi discovers them itself. In
 * mode "only" discovery is switched off and exactly the listed paths are loaded.
 */
export function buildCommand(
  profile,
  config,
  { cwd = process.cwd(), home = os.homedir(), passthrough = [] } = {},
) {
  const abs = (p) => resolvePath(p, { cwd, home });
  const piArgs = [];

  if (profile.thinking) piArgs.push('--thinking', profile.thinking);

  if (profile.tools) {
    if (profile.tools.length === 0) piArgs.push('--no-tools');
    else piArgs.push('--tools', profile.tools.join(','));
  }

  if (profile.extensions.mode === 'only') {
    piArgs.push('--no-extensions');
    for (const e of unique(profile.extensions.load.map(abs))) piArgs.push('--extension', e);
  }

  if (profile.skills.mode === 'only') {
    piArgs.push('--no-skills');
    for (const s of unique(profile.skills.load.map(abs))) piArgs.push('--skill', s);
  }

  if (!profile.contextFiles) piArgs.push('--no-context-files');

  piArgs.push(...profile.extraArgs, ...passthrough);

  const model = profile.model ? ['--model', profile.model] : [];

  if (config.launcher === 'pi') {
    return { cmd: 'pi', args: [...model, ...piArgs] };
  }
  return {
    cmd: 'ollama',
    args: ['launch', 'pi', ...model, ...config.ollamaArgs, ...(piArgs.length ? ['--', ...piArgs] : [])],
  };
}

export function shellQuote(s) {
  if (/^[\w@%+=:,./-]+$/.test(s)) return s;
  return `'${s.replaceAll("'", `'\\''`)}'`;
}

export function formatCommand({ cmd, args }) {
  return [cmd, ...args].map(shellQuote).join(' ');
}
