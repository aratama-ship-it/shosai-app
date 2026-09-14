#!/usr/bin/env python3
"""Run the JS browser checks using local Node or the Codex bundled runtime.

Optional overrides: SHOWWRIGHT_NODE and NODE_PATH. No installation is performed.
"""

from pathlib import Path
import os
import shutil
import subprocess
import sys


def runtime():
    bundled = Path.home() / ".cache/codex-runtimes/codex-primary-runtime/dependencies/node"
    env = os.environ.copy()
    node = env.get("SHOWWRIGHT_NODE")
    if not node and (bundled / "bin/node").is_file():
        node = str(bundled / "bin/node")
        env.setdefault("NODE_PATH", str(bundled / "node_modules"))
    node = node or shutil.which("node")
    if not node:
        raise RuntimeError("Node.js not found. Set SHOWWRIGHT_NODE to its executable.")
    return node, env


def main() -> int:
    node, env = runtime()
    return subprocess.run(
        [node, str(Path(__file__).with_suffix(".cjs"))], env=env,
    ).returncode


if __name__ == "__main__":
    raise SystemExit(main())
