export const THINKING_LEVELS = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh'];

export const READ_ONLY_TOOLS = ['read', 'grep', 'find', 'ls'];

/**
 * Built-in starting points. Each is a partial profile; anything omitted takes
 * Pi's own default. Labels and descriptions live in i18n.
 *
 * None of them restricts extensions: they cannot know which of yours are
 * safety guards. Trim the extension list per preset with `c` (configure).
 *
 * - quick:  lower thinking and no skills in the prompt
 * - build:  everyday work
 * - review: read-only tools, high thinking
 */
export const BUILTIN_PRESETS = {
  quick: {
    thinking: 'low',
    skills: { mode: 'only', load: [] },
  },
  build: {
    thinking: 'medium',
  },
  review: {
    thinking: 'high',
    tools: READ_ONLY_TOOLS,
  },
};

const PKG = '~/.pi/agent/npm/node_modules';

/**
 * Presets that use Pi packages. They are not built in: `pi-here config --add-suggested` copies
 * them into your config, only under names you do not already use. Paths are where
 * `pi install npm:<package>` puts a package.
 */
export const SUGGESTED_PRESETS = {
  plan: {
    description: 'Plan before touching code (needs @narumitw/pi-plan-mode)',
    thinking: 'high',
    extensions: { mode: 'only', load: [`${PKG}/@narumitw/pi-plan-mode/dist/index.ts`] },
    skills: { mode: 'only', load: [] },
  },
  superpowers: {
    description: 'Superpowers workflow with seven of its skills (needs @tsubus/pi-superpowers)',
    thinking: 'medium',
    extensions: { mode: 'only', load: [`${PKG}/@tsubus/pi-superpowers/vendor/superpowers/.pi/extensions/superpowers.ts`] },
    skills: {
      mode: 'only',
      load: [
        'using-superpowers',
        'brainstorming',
        'writing-plans',
        'executing-plans',
        'test-driven-development',
        'systematic-debugging',
        'verification-before-completion',
      ].map((s) => `${PKG}/@tsubus/pi-superpowers/vendor/superpowers/skills/${s}`),
    },
  },
  advisor: {
    description: 'Ask a stronger model for a second opinion (needs @juicesharp/rpiv-advisor; may use a paid API)',
    thinking: 'medium',
    extensions: { mode: 'only', load: [`${PKG}/@juicesharp/rpiv-advisor/index.ts`] },
    skills: { mode: 'only', load: [] },
  },
};
