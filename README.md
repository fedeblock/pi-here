# pi-here

[Español](README.es.md)

## Why I made this

I have worked with commercial models served by third parties for a long time, but I wanted to give a
self-hosted setup a chance: Ollama with Pi. Claude Code did not convince me for that, and I was
recommended a lighter environment, so I tried Pi: a blank slate on which to build, starting from a light base.

I missed a tool that makes configuring each project easy, so I built `pi-here`. I hope it is useful to you.
Use it at your own risk, and if you like it, leave a comment.

---

A per-folder launcher for the [Pi coding agent](https://pi.dev). Run it in a project folder, see
exactly what Pi will be started with, and press **Enter**. Four things you can do, nothing more:

1. **Launch with a preset**: `pi-here review`
2. **Launch with the default**: `pi-here`
3. **Preview before launching**: both of the above show the full profile and command first
4. **Configure**: choose which extensions and skills each preset loads (`c`, or `pi-here config`)

```
┌  pi-here · my-project
│
◇  build · default ───────────────────────────────────────────────────────╮
│                                                                         │
│  Model       Pi default                                                 │
│  Thinking    medium                                                     │
│  Tools       all                                                        │
│  Extensions  all (4 found)                                              │
│  Skills      all (2 found)                                              │
│  Command     ollama launch pi -- --thinking medium                      │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────╯
│
│  ↵ launch · p preset · e edit this run · s save for this folder · c configure · q quit
```

## Why

Every tool schema, extension and skill adds tokens to the system prompt, and with a local model that
means slower prompt processing and more cache invalidation. Which extensions you want depends on the
job: a quick fix, a build session, a read-only review. `pi-here` makes that choice explicit, cheap
to repeat, and remembered per folder. Pi reads extensions and skills at startup, so the decision
belongs at launch, which is where this tool sits.

## Status

Early (0.1.0). What has been exercised:

- 52 unit and CLI tests (`npm test`), the CLI ones against fake `ollama` and `pi` binaries.
- The interactive screens, driven through a pseudo-terminal (`npm run test:tui`).
- `ollama launch pi -- --thinking <level>` forwarding, confirmed by hand on Pi 1.5.2 with Ollama.

What has **not** been verified against a real install: the other Pi flags this tool emits
(`--tools`, `--no-extensions`, `--extension`, `--no-skills`, `--skill`, `--no-context-files`,
`--model` through `ollama launch`). They come from Pi's documented CLI. Use `pi-here --dry-run` to see
the exact command first, and see [Checking it works](#checking-it-works).

macOS and Linux. Windows is untested.

## Install

Requirements: [Node.js](https://nodejs.org) 20.12 or newer, the [Pi coding agent](https://pi.dev), and
(for the default launcher) [Ollama](https://ollama.com) with a model Pi can use. Not on npm yet, so from a clone:

```sh
git clone https://github.com/fedeblock/pi-here.git
cd pi-here
npm install
npm link            # puts `pi-here` on your PATH
pi-here --version   # check
```

Update: `git pull && npm install` in the clone. Remove: `npm unlink -g pi-here`, then delete the clone and,
if you want, `~/.config/pi-here/`.

## Use

```sh
cd ~/projects/my-project
pi-here              # the default preset (or this folder's saved profile)
pi-here review       # a named preset
pi-here config       # choose what each preset loads, without launching
```

Every launch starts with the preview. Keys on it:

| Key | Does |
|---|---|
| `Enter` | launch exactly what is shown |
| `p` | pick another preset |
| `e` | tweak this run only (model, thinking, tools, extensions, skills); gone when Pi exits |
| `s` | save what is shown as this folder's default (stays on screen) |
| `c` | configure presets: change what they load, add one, set the default |
| `q`, `Esc` | cancel (exit code 130) |

### Choosing extensions and skills

Press `c`, pick a preset, then **Extensions** or **Skills**. You get a checklist of everything found;
tick what the preset should load:

- everything ticked: Pi's normal discovery, no flags added
- some ticked: discovery is switched off and only those are passed (`--no-extensions --extension ...`)
- none ticked: nothing loads

The choice is saved in the preset, so it applies in every folder. The same checklist is under `e` for
a one-off change. If a preset does not list extensions at all, it loads everything Pi finds.

What the checklist lists:

- extensions in `~/.pi/agent/extensions/` and `<project>/.pi/extensions/` (a `.ts`/`.js` file, or a
  folder with `index.ts`/`index.js`/`package.json`), and skills in `~/.pi/agent/skills/` and
  `<project>/.pi/skills/` (folders with a `SKILL.md`, or loose `.md` files)
- **Pi packages** installed with `pi install`: the ones named in `packages` of
  `~/.pi/agent/settings.json` or `<project>/.pi/settings.json`. Each package's extensions and
  skills come from the `pi` section of its `package.json`, and a package's skills are listed one by one.
  Only `npm:` and `git:` sources are resolved, from where `pi install` puts them.

`PI_CODING_AGENT_DIR` is honoured. Paths you wrote into the config by hand are kept.

On Pi 1.5.2, `--no-extensions` and `--no-skills` do switch off what packages provide (checked by
hand with three packages installed), so a preset that does not tick a package really leaves it out.
Picking a package's extension passes the path of its entry file with `--extension`, and Pi loaded
`@narumitw/pi-plan-mode` that way. A package's skills (`--skill`) and `@tsubus/pi-superpowers`
loaded the same way, and `/plan` from `pi-plan-mode` worked. `rpiv-advisor` has not been tried through a preset yet.

### Command line

| Option | Does |
|---|---|
| `NAME`, `-p NAME`, `--preset NAME` | start from that preset |
| `-y`, `--yes` | launch without the preview |
| `-n`, `--dry-run` | print the command and exit |
| `--edit` | open the editor first |
| `--save` | save the resolved profile as this folder's default |
| `--show` | print the resolved profile and command as JSON |
| `config` | choose what each preset loads, without launching |
| `config --add-suggested` | add the [suggested presets](#the-presets) to your config (never replaces yours) |
| `-- <args>` | everything after `--` is appended to the Pi command |

Without a terminal (scripts, CI) it never asks anything: it behaves as if `--yes` was given. The exit
code is Pi's own. Output language follows `LANG`; force it with `PI_HERE_LANG=en|es`.

## Presets

| Preset | For | What it sets |
|---|---|---|
| `quick` | small tasks, smallest prompt | thinking `low`; no skills |
| `build` | everyday work (default) | thinking `medium` |
| `review` | auditing without changing anything | thinking `high`; tools limited to `read, grep, find, ls` |

None of them restricts extensions until you choose to. Edit them with `c`, or add your own in the
config file. Three more, for Pi packages, are [suggested below](#suggested-extensions-and-skills).

## Files

### `~/.config/pi-here/config.json` (global; `$XDG_CONFIG_HOME` is honoured)

`c` writes this for you. By hand:

```json
{
  "launcher": "ollama",
  "ollamaArgs": [],
  "defaultPreset": "build",
  "presets": {
    "quick": {
      "thinking": "low",
      "extensions": { "mode": "only", "load": ["~/.pi/agent/extensions/permission-gate.ts"] },
      "skills": { "mode": "only", "load": [] }
    },
    "plan": { "thinking": "high", "tools": ["read", "grep", "find", "ls"] }
  }
}
```

| Key | Meaning |
|---|---|
| `launcher` | `"ollama"` runs `ollama launch pi ...`; `"pi"` runs `pi ...` directly |
| `ollamaArgs` | extra arguments for `ollama launch pi`, placed before the `--` |
| `defaultPreset` | used in folders without a saved profile |
| `presets` | your own presets (same fields as a profile); they can replace built-in ones |

A complete file is in [`examples/config.example.json`](examples/config.example.json).

> **Upgrading from an earlier version:** the `always` setting was removed. Put the extensions you
> want into each preset instead. pi-here tells you once per run if it still finds the old key; the
> next time you change a setting with `c`, the key is dropped from the file.

### `<project>/.pi/profile.json` (per folder)

Written by `s` / `--save`. Every field is optional when you write it by hand.

| Field | Values |
|---|---|
| `model` | a model name, or `null` for whatever Pi is configured to use |
| `thinking` | `off`, `minimal`, `low`, `medium`, `high`, `xhigh`, or `null` |
| `tools` | `null` = all, `[]` = none, or an allowlist such as `["read","grep"]` |
| `extensions`, `skills` | `{"mode":"all"}` or `{"mode":"only","load":["path", ...]}` |
| `contextFiles` | `false` skips `AGENTS.md` / `CLAUDE.md` |
| `extraArgs` | appended to the Pi command as-is |

Commit it if the team should share it. See [`examples/profile.example.json`](examples/profile.example.json).

## What it runs

| Profile | Pi flag |
|---|---|
| `thinking` | `--thinking <level>` |
| `tools` | `--tools a,b,c` or `--no-tools` |
| `extensions.mode: "only"` | `--no-extensions` and one `--extension <path>` each |
| `skills.mode: "only"` | `--no-skills` and one `--skill <path>` each |
| `contextFiles: false` | `--no-context-files` |
| `model` | `--model <name>` (to `ollama launch pi`, or to `pi` with `launcher: "pi"`) |

With the default launcher the result looks like
`ollama launch pi --model qwen3.8:27b -- --thinking low --no-extensions --extension /home/you/.pi/agent/extensions/permission-gate.ts --no-skills`.

## Suggested extensions and skills

`pi-here` does not install anything and does not ship extensions: it chooses what Pi loads. If you want
a starting set, these are community packages for Pi. **Read a package's code before installing it:
extensions run with your user's permissions** (see the [disclaimer](#disclaimer)).

### How they are installed

In the terminal, with Pi itself (not with `pi-here`):

```sh
pi install npm:@narumitw/pi-plan-mode      # for every folder (written to ~/.pi/agent/settings.json)
pi install -l npm:@narumitw/pi-plan-mode   # only for the current folder (written to .pi/settings.json)
pi list                                    # what is installed
pi remove npm:@narumitw/pi-plan-mode       # uninstall
pi -e npm:@narumitw/pi-plan-mode           # try it for one run without installing
```

Everything installed this way loads in **every** Pi run, with or without `pi-here`. `pi-here` is how you
stop that: a preset that ticks only some of them (`c`) leaves the rest out. Then:

```sh
pi-here config --add-suggested   # adds the presets below to your config; never replaces one you already have
```

It prints `pi install` lines for any package it does not find on your machine.

### What was tried with `pi-here`

| Package | Preset | What it gives you | Checked |
|---|---|---|---|
| [`@narumitw/pi-plan-mode`](https://www.npmjs.com/package/@narumitw/pi-plan-mode) | `plan` | `/plan`: a read-only mode where the agent explores and writes an implementation plan before any file is touched | loaded through a preset, `/plan` works (Pi 1.5.2) |
| [`@tsubus/pi-superpowers`](https://www.npmjs.com/package/@tsubus/pi-superpowers) | `superpowers` | Superpowers, a software-development method built from skills the agent loads when they apply | extension and skills loaded through a preset (Pi 1.5.2) |
| [`@juicesharp/rpiv-advisor`](https://www.npmjs.com/package/@juicesharp/rpiv-advisor) | `advisor` | an `advisor` tool: the model hands the conversation to a second, stronger model and gets a plan or a correction back; you choose that model with `/advisor` | installed, **not** run through a preset yet; the reviewer may be a paid API |

"Checked" means seen working on one machine (macOS, Ollama, `qwen3.8:27b`), not a guarantee for yours. Whether
a local 27B model follows these workflows well is a separate question the preset cannot answer.

### The presets

| Preset | Thinking | Loads |
|---|---|---|
| `plan` | high | only `pi-plan-mode`; no skills |
| `superpowers` | medium | only the Superpowers extension and seven of its skills |
| `advisor` | medium | only `rpiv-advisor`; no skills |

Each one loads nothing else, so add the extensions you always want (a permission gate, for example) with
`c`. Superpowers adds its skill list and a start-up instruction to every prompt, which a local model has to
process each time, so it is a preset of its own rather than part of the everyday one.

### Superpowers skills

The package carries 15 skills. The preset ticks the first seven; the checklist (`c`) lists all of them, one by one.

| Skill | Use |
|---|---|
| `using-superpowers` | start of a conversation: how to find and use the other skills (the extension relies on it) |
| `brainstorming` | before any creative work or new feature: settle what to build |
| `writing-plans` | turn a spec into a step-by-step plan before touching code |
| `executing-plans` | carry out a written plan in the current session |
| `test-driven-development` | write the test first, then the code |
| `systematic-debugging` | find the cause of a bug or failing test before proposing a fix |
| `verification-before-completion` | run the checks and look at the output before saying something is done |
| `requesting-code-review`, `receiving-code-review` | ask for a review; take feedback with technical rigor |
| `subagent-driven-development`, `dispatching-parallel-agents` | split work across sub-agents; they need a sub-agent extension |
| `using-git-worktrees`, `finishing-a-development-branch` | isolated workspaces; decide how to integrate finished work |
| `writing-skills`, `diagnosing-superpowers` | write your own skills; find out why a session went badly |

### Others worth a look (not tried)

Each was confirmed to exist on npm on 2026-11-12 (version shown); none has been tried with `pi-here`.

| Purpose | Package | Notes |
|---|---|---|
| Containment | [`pi-sandbox`](https://www.npmjs.com/package/pi-sandbox) 0.8.1 | OS-level sandbox with interactive permission prompts; a candidate to replace hand-written guards |
| Tool-call repair | [`pi-tool-repair`](https://www.npmjs.com/package/pi-tool-repair) 0.3.10 | fixes common malformed tool calls before they run; useful with smaller local models |
| Undo | [`pi-rewind`](https://www.npmjs.com/package/pi-rewind) 0.5.0 | checkpoints and `/rewind`; last published March 2026 |
| Sub-agents | [`@tintinweb/pi-subagents`](https://www.npmjs.com/package/@tintinweb/pi-subagents) 0.23.2 | on one local GPU keep concurrency at 1 |
| Web search | [`@blazer2k/searxng-suite`](https://www.npmjs.com/package/@blazer2k/searxng-suite) 0.2.3 | needs a SearxNG instance you run |
| MCP | [`pi-mcp-adapter`](https://www.npmjs.com/package/pi-mcp-adapter) 7.0.1 | only if you use MCP servers |
| In-session toggles | [`@petechu/pi-extension-toggle`](https://www.npmjs.com/package/@petechu/pi-extension-toggle) 0.2.0 | toggles extensions, skills, prompts and themes inside a session; partly overlaps with this tool |
| Skills manager | [`pi-skills-manager`](https://www.npmjs.com/package/pi-skills-manager) 0.2.0 | enable and disable skills from a menu |

## Checking it works

Do this once on a scratch folder, because several flags are unverified:

```sh
mkdir /tmp/try && cd /tmp/try
pi-here --dry-run                 # look at the command
pi-here quick --dry-run           # after choosing extensions for `quick` with `c`
pi-here review                    # then in Pi: the footer should show the thinking level
```

In Pi's startup banner, compare the `[Extensions]` and skills lists between two presets: what a
preset does not tick should be missing, and what it ticks should be there. If a read-only preset
hides an extension's own tools, add their names to `tools`.

## Notes

- Changing extensions or skills changes the system prompt, which invalidates the model's prompt
  cache. Decide at launch; toggle mid-session only when you must.
- With a local Ollama model the cache is also lost when the model unloads (the default
  `keep_alive` is 5 minutes). `OLLAMA_KEEP_ALIVE` on the Ollama server is separate from this
  tool but matters as much.
- `ollama launch pi` manages Pi's `models.json` entries marked `_launch`. Using `--model` through it may
  rewrite those entries; Ollama asks before editing the integration config.
- `--tools` is an allowlist. If extension-provided tools are not available in a restricted preset,
  add their names to the list.

## Development

```sh
npm install
npm test            # unit and CLI tests, no Pi or Ollama needed
npm run test:tui    # drives the interactive screens through a pty (needs python3)
```

Roadmap: npm publication.

## License

[MIT](LICENSE), © 2026 Federico Block.

## Disclaimer

`pi-here` is provided "as is", without warranty of any kind, and you use it **at your own risk**. The
authors are not liable for any damage, data loss, cost or other consequence of using it; the MIT
[license](LICENSE) has the full terms.

- It only builds and runs a command line. What Pi, Ollama, a model or an extension then does is outside its control.
- Coding agents read and change files and run commands. Keep your work under version control and back up
  anything you cannot lose. Restricting tools or extensions in a preset is a convenience, not a security boundary.
- Third-party packages (including the ones suggested here) are written by others, run with your user's
  permissions and can change at any time. Review them before installing. They are suggestions, not endorsements.
- Some tools or models you connect (an advisor, a cloud model) may send your code to a third party or cost money.
- This project is independent: it is not affiliated with or endorsed by Pi, Ollama or any package author.
