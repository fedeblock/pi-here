import fcntl, json, os, pty, re, select, shutil, struct, sys, tempfile, termios, time

BIN = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "bin", "pi-here.mjs"))
NODE = shutil.which("node")
ANSI = re.compile(r"\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][^\x07]*\x07")
DOWN, ENTER, SPACE = "\x1b[B", "\r", " "


def make_world(config=None, profile=None, extensions=()):
    root = tempfile.mkdtemp(prefix="pihere-pty-")
    for d in ("shims", "proj", "home", "agent/extensions"):
        os.makedirs(os.path.join(root, d), exist_ok=True)
    out = os.path.join(root, "args.txt")
    for name in ("ollama", "pi"):
        p = os.path.join(root, "shims", name)
        with open(p, "w") as f:
            f.write(
                "#!/bin/sh\n"
                'if [ "$1" = "list" ]; then\n'
                "  echo 'NAME ID SIZE MODIFIED'\n"
                "  echo 'qwen3.8:27b abc 26GB now'\n"
                "  echo 'qwen3:14b-q8_0 def 16GB now'\n"
                "  exit 0\nfi\n"
                f'echo {name} > "{out}"\nprintf \'%s\\n\' "$@" >> "{out}"\n'
            )
        os.chmod(p, 0o755)
    for e in extensions:
        open(os.path.join(root, "agent/extensions", e), "w").close()
    if config is not None:
        p = os.path.join(root, "home/.config/pi-here/config.json")
        os.makedirs(os.path.dirname(p), exist_ok=True)
        json.dump(config, open(p, "w"))
    if profile is not None:
        p = os.path.join(root, "proj/.pi/profile.json")
        os.makedirs(os.path.dirname(p), exist_ok=True)
        json.dump(profile, open(p, "w"))
    return root, out


def drive(root, steps, timeout=10, args=()):
    env = {
        "PATH": f"{root}/shims:/usr/bin:/bin:" + os.path.dirname(NODE),
        "HOME": f"{root}/home",
        "XDG_CONFIG_HOME": f"{root}/home/.config",
        "PI_CODING_AGENT_DIR": f"{root}/agent",
        "PI_HERE_LANG": "en",
        "TERM": "xterm-256color",
    }
    pid, fd = pty.fork()
    if pid == 0:
        os.chdir(f"{root}/proj")
        os.execve(NODE, [NODE, BIN, *args], env)
    fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", 50, 140, 0, 0))
    raw, offset = "", 0

    def pump(wait):
        nonlocal raw
        r, _, _ = select.select([fd], [], [], wait)
        if r:
            try:
                data = os.read(fd, 65536)
            except OSError:
                return False
            if not data:
                return False
            raw += data.decode("utf8", "replace")
        return True

    for expect, keys in steps:
        deadline = time.time() + timeout
        while True:
            text = ANSI.sub("", raw[offset:])
            if re.search(expect, text):
                break
            if time.time() > deadline:
                print("TIMEOUT waiting for", repr(expect))
                print(ANSI.sub("", raw)[-1500:])
                os.kill(pid, 9)
                return None, ANSI.sub("", raw)
            pump(0.1)
        offset = len(raw)
        time.sleep(0.15)
        for k in keys if isinstance(keys, list) else [keys]:
            os.write(fd, k.encode())
            time.sleep(0.15)
    end = time.time() + timeout
    while time.time() < end and pump(0.1):
        pass
    _, status = os.waitpid(pid, 0)
    return os.waitstatus_to_exitcode(status), ANSI.sub("", raw)


def called(out):
    return open(out).read().split() if os.path.exists(out) else []


def check(name, cond, detail=""):
    print(("PASS " if cond else "FAIL ") + name + ("" if cond else f"  -> {detail}"))
    return cond


ok = True
UP = "\x1b[A"


def read_cfg(root):
    p = f"{root}/home/.config/pi-here/config.json"
    return json.load(open(p)) if os.path.exists(p) else {}


# A. Enter on the preview launches the default preset (build)
root, out = make_world()
code, text = drive(root, [("↵ launch", ENTER)])
ok &= check("A launch default", code == 0 and called(out) == ["ollama", "launch", "pi", "--", "--thinking", "medium"], (code, called(out)))
ok &= check("A nothing saved", not os.path.exists(f"{root}/proj/.pi/profile.json"))

# B. `pi-here review`: preview shows that preset, Enter launches it
root, out = make_world()
code, text = drive(root, [("↵ launch", ENTER)], args=["review"])
ok &= check("B positional preset", code == 0 and called(out) == ["ollama", "launch", "pi", "--", "--thinking", "high", "--tools", "read,grep,find,ls"], (code, called(out)))

# C. 'p' switches preset on the preview (build -> down -> review is 3rd; quick is 1st)
root, out = make_world()
code, text = drive(root, [("↵ launch", "p"), ("Preset", [DOWN, ENTER]), ("↵ launch", ENTER)])
ok &= check("C p switches preset", code == 0 and "--tools" in called(out) and "high" in called(out), (code, called(out)))

# D. 's' saves for the folder and stays on the preview; next run uses it
root, out = make_world()
code, text = drive(root, [("↵ launch", "s"), ("Saved as the default", "q")])
ok &= check("D s saves and stays", code == 130 and os.path.exists(f"{root}/proj/.pi/profile.json") and called(out) == [], (code, called(out)))
code, text = drive(root, [("default for this folder", ENTER)])
ok &= check("D saved folder default is reused", code == 0 and called(out)[:3] == ["ollama", "launch", "pi"], (code, called(out), text[-300:]))

# E. 'q' cancels with 130
root, out = make_world()
code, text = drive(root, [("↵ launch", "q")])
ok &= check("E cancel", code == 130 and called(out) == [], (code, called(out)))

# F. 'e': one menu; pick Extensions, untick one, Done -> only the ticked one is loaded
root, out = make_world(extensions=("alpha.ts", "beta.ts"))
code, text = drive(root, [
    ("↵ launch", "e"),
    ("Edit", [DOWN, DOWN, DOWN, ENTER]),
    ("Extensions to load", [DOWN, SPACE, ENTER]),
    ("Edit", ENTER),                           # the cursor is already on Done
    ("↵ launch", ENTER),
])
c = called(out)
ok &= check(
    "F untick one extension",
    code == 0 and "--no-extensions" in c and any(x.endswith("alpha.ts") for x in c) and not any(x.endswith("beta.ts") for x in c),
    (code, c, text[-600:]),
)
ok &= check("F preview says 1 of 2", "(1 of 2)" in text, text[-600:])
ok &= check("F preview says edited", "Edited for this run" in text)

# G. 'e': thinking and tools, read in the menu
root, out = make_world()
code, text = drive(root, [
    ("↵ launch", "e"),
    ("Edit", [DOWN, ENTER]),                     # Thinking
    ("Thinking level", [UP, UP, ENTER]),         # starts on medium (build) -> low -> minimal
    ("Edit", [UP, UP, UP, ENTER]),               # cursor waits on Done; up to Tools
    ("Read-only", [DOWN, ENTER]),
    ("Edit", ENTER),                             # waiting on Done again
    ("↵ launch", ENTER),
])
c = called(out)
ok &= check("G thinking + tools", code == 0 and "minimal" in c and "read,grep,find,ls" in c, (code, c, text[-500:]))
ok &= check("G menu shows values", re.search(r"Thinking +minimal", text) is not None, text[-800:])

# H. 'c': edit the quick preset (leave one extension out); it is saved in the config and applies to any folder
root, out = make_world(extensions=("alpha.ts", "beta.ts"))
code, text = drive(root, [
    ("↵ launch", "c"),
    ("Configure", ENTER),                        # first entry: quick
    ("Preset \"quick\"", [DOWN, DOWN, DOWN, ENTER]),   # Extensions
    ("Extensions to load", [SPACE, ENTER]),      # untick alpha.ts
    ("Preset \"quick\"", ENTER),                  # cursor waits on Done
    ("Configure", ENTER),                         # cursor waits on Done
    ("↵ launch", "q"),
])
q = read_cfg(root).get("presets", {}).get("quick", {})
ok &= check("H configure saves preset", code == 130 and q.get("extensions", {}).get("mode") == "only" and len(q["extensions"]["load"]) == 1, (code, read_cfg(root), text[-600:]))

# I. `pi-here config` standalone: change launcher to pi
root, out = make_world()
code, text = drive(root, [
    ("Configure", [DOWN, DOWN, DOWN, DOWN, DOWN, ENTER]),  # quick, build, review, New, Default, Launcher
    ("Launcher", [DOWN, ENTER]),
    ("Configure", ENTER),                        # cursor waits on Done
    ("Stored in", []),
], args=["config"])
ok &= check("I config standalone", code == 0 and read_cfg(root).get("launcher") == "pi" and called(out) == [], (code, read_cfg(root), called(out), text[-400:]))

# J. an old "always" setting only produces a notice
root, out = make_world(config={"always": {"extensions": ["/x.ts"]}})
code, text = drive(root, [("↵ launch", ENTER)])
ok &= check("J legacy always notice", code == 0 and "no longer used" in text and called(out)[-2:] == ["--thinking", "medium"], (code, called(out), text[:400]))

print("\nALL OK" if ok else "\nSOME FAILED")
sys.exit(0 if ok else 1)
