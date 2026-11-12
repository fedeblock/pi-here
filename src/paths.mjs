import os from 'node:os';
import path from 'node:path';

export function expandHome(p, home = os.homedir()) {
  if (p === '~') return home;
  if (p.startsWith('~/')) return path.join(home, p.slice(2));
  return p;
}

/** Resolve a user-written path: expands "~" and anchors relative paths at cwd. */
export function resolvePath(p, { cwd = process.cwd(), home = os.homedir() } = {}) {
  return path.resolve(cwd, expandHome(p, home));
}

export function configPath(env = process.env, home = os.homedir()) {
  const base = env.XDG_CONFIG_HOME || path.join(home, '.config');
  return path.join(base, 'pi-here', 'config.json');
}

export function profilePath(cwd) {
  return path.join(cwd, '.pi', 'profile.json');
}

/** Pi's agent directory (PI_CODING_AGENT_DIR overrides ~/.pi/agent). */
export function agentDir(env = process.env, home = os.homedir()) {
  if (env.PI_CODING_AGENT_DIR) return resolvePath(env.PI_CODING_AGENT_DIR, { home });
  return path.join(home, '.pi', 'agent');
}
