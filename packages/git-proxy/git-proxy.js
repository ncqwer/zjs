#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";

let REMOTE_SHELL = "bash";
let REMOTE_SHELL_ARGS = ["--noprofile", "--norc", "-s"];

function die(msg) {
  console.error(msg);
  process.exit(1);
}

function expandHome(p) {
  if (!p) return p;
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  return p;
}

function readFile(p) {
  if (!fs.existsSync(p)) die(`Missing file: ${p}`);
  return fs.readFileSync(p, "utf8").replace(/\r/g, "");
}

function writeJsonPretty(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

function git(args, cwd, { capture = false } = {}) {
  try {
    if (capture)
      return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
    execFileSync("git", args, { cwd, stdio: "inherit" });
    return "";
  } catch (e) {
    if (capture) return "";
    throw e;
  }
}

function ssh(host, remoteCmd, { capture = false } = {}) {
  const args = [host, REMOTE_SHELL, ...REMOTE_SHELL_ARGS];
  const input = remoteCmd.endsWith("\n") ? remoteCmd : remoteCmd + "\n";
  if (capture) {
    const out = execFileSync("ssh", args, { encoding: "utf8", input });
    return lastNonEmptyLine(out);
  }
  execFileSync("ssh", args, { stdio: ["pipe", "inherit", "inherit"], input });
  return "";
}

function sshCapture(host, remoteCmd) {
  const args = [host, REMOTE_SHELL, ...REMOTE_SHELL_ARGS];
  const input = remoteCmd.endsWith("\n") ? remoteCmd : remoteCmd + "\n";
  return execFileSync("ssh", args, { encoding: "utf8", input });
}

function lastNonEmptyLine(out) {
  const lines = out.replace(/\r/g, "").split("\n");
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i].trim();
    if (line) return line;
  }
  return "";
}

function extractMarkedValue(out, marker) {
  const lines = out.replace(/\r/g, "").split("\n");
  for (const line of lines) {
    const idx = line.indexOf(marker);
    if (idx !== -1) return line.slice(idx + marker.length);
  }
  return lastNonEmptyLine(out);
}

function escapeForSingleQuotes(s) {
  return s.replace(/'/g, `'\\''`).replace(/\r/g, "");
}

function parseFlags(argv) {
  const sub = argv[2];
  const flags = {};
  for (const a of argv.slice(3)) if (a.startsWith("--")) flags[a] = true;
  return { sub, flags };
}

/**
 * Ensure proxy.config.json exists and is complete.
 * - Fill defaults
 * - Infer upstreamUrl from current remote if missing
 * - Prefer separating admin ssh vs git ssh:
 *    - bAdminSsh: used for deployment (write files on B)
 *    - bGitSsh: used for git remote on A (GUI/CLI)
 */
function ensureConfig(repoRoot) {
  const cfgPath = path.join(repoRoot, "proxy.config.json");
  const repoName = path.basename(repoRoot);

  let cfg = {};
  if (!fs.existsSync(cfgPath)) {
    die(
      `Missing config: ${cfgPath}\n` +
        `Please create proxy.config.json in the repo root first.`
    );
  }
  cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));

  // Defaults
  cfg.proxyBase = cfg.proxyBase || "~/git-proxy";
  cfg.projectName = cfg.projectName || repoName;

  // SSH aliases (recommended)
  cfg.bGitSsh = cfg.bGitSsh || cfg.bSsh || "b-git";
  cfg.bAdminSsh = cfg.bAdminSsh || cfg.bSsh || "b-admin";

  // Auth section
  cfg.auth = cfg.auth || {};
  cfg.auth.gitPublicKeyPath =
    cfg.auth.gitPublicKeyPath || "~/.ssh/id_ed25519_gitproxy.pub";
  cfg.auth.autoAppendAuthorizedKeys = !!cfg.auth.autoAppendAuthorizedKeys;

  // Remote shell to run commands on B (default: bash)
  cfg.remoteShell = cfg.remoteShell || "bash";
  cfg.remoteShellArgs = Array.isArray(cfg.remoteShellArgs)
    ? cfg.remoteShellArgs
    : ["--noprofile", "--norc", "-s"];

  // Git remote name on A (default: origin)
  cfg.remoteName = cfg.remoteName || "origin";

  // Infer upstreamUrl if missing: read current remote, but avoid using proxy remote as upstream
  if (!cfg.upstreamUrl) {
    const origin = git(["remote", "get-url", cfg.remoteName], repoRoot, {
      capture: true,
    });
    // Heuristic: if origin looks like our proxy path (contains "/.git" under proxyBase or starts with b-git:)
    const looksLikeProxy =
      origin.startsWith(`${cfg.bGitSsh}:`) ||
      origin.includes("/git-proxy/") ||
      origin.endsWith("/.git");
    if (origin && !looksLikeProxy) cfg.upstreamUrl = origin;
  }

  if (!cfg.upstreamUrl) {
    die(
        `proxy.config.json missing "upstreamUrl" and cannot infer from current remote (${cfg.remoteName}).\n` +
        `Please set upstreamUrl in proxy.config.json first.`
    );
  }

  writeJsonPretty(cfgPath, cfg);
  return { cfg, cfgPath };
}

function applyRemoteShell(cfg) {
  REMOTE_SHELL = cfg.remoteShell || "bash";
  REMOTE_SHELL_ARGS = Array.isArray(cfg.remoteShellArgs)
    ? cfg.remoteShellArgs
    : ["--noprofile", "--norc", "-s"];
}

function toBaseAbsRemote(proxyBase) {
  // returns bash snippet to compute PROXY_BASE_ABS and HOME_DIR on B reliably (without relying on $HOME existing)
  return `
HOME_DIR="$(cd ~ && pwd)"
if [[ '${escapeForSingleQuotes(proxyBase)}' == "~" ]]; then
  PROXY_BASE_ABS="$HOME_DIR"
elif [[ '${escapeForSingleQuotes(proxyBase)}' == "~/"* ]]; then
  PROXY_BASE_ABS="$HOME_DIR/${escapeForSingleQuotes(proxyBase).slice(2)}"
else
  PROXY_BASE_ABS='${escapeForSingleQuotes(proxyBase)}'
fi
if command -v cygpath >/dev/null 2>&1; then
  case "$PROXY_BASE_ABS" in
    [A-Za-z]:\\\\*|\\\\\\\\*)
      PROXY_BASE_ABS="$(cygpath -u "$PROXY_BASE_ABS")"
      ;;
  esac
fi
`;
}

function cmdGate(repoRoot, cfg, flags) {
  const gateTpl = readFile(path.join(repoRoot, "templates", "gate"));
  const adminHost = cfg.bAdminSsh;

  // Deploy ~/.ssh/git-proxy-gate on B, with PROXY_BASE expanded on B
  const remote = `
set -euo pipefail
${toBaseAbsRemote(cfg.proxyBase)}
mkdir -p "$HOME_DIR/.ssh"
mkdir -p "$PROXY_BASE_ABS"

GATE_PATH="$HOME_DIR/.ssh/git-proxy-gate"
cat > "$GATE_PATH" <<'SH'
${gateTpl.replace(/__PROXY_BASE_ABS__/g, "__WILL_BE_REPLACED__")}
SH

# Replace placeholder with absolute base (portable sed)
sed -i '' "s|__WILL_BE_REPLACED__|$PROXY_BASE_ABS|g" "$GATE_PATH" 2>/dev/null || \
  sed -i "s|__WILL_BE_REPLACED__|$PROXY_BASE_ABS|g" "$GATE_PATH"

chmod +x "$GATE_PATH"
echo "proxy: gate installed at $GATE_PATH" >&2
echo "proxy: proxyBase(abs) = $PROXY_BASE_ABS" >&2
`;
  ssh(adminHost, remote);

  const homeOut = sshCapture(
    adminHost,
    `cd ~ && printf '__HOME_DIR__%s\\n' "$(pwd)"`
  );
  const bHomeAbs = extractMarkedValue(homeOut, "__HOME_DIR__");
  const gateAbs = `${bHomeAbs}/.ssh/git-proxy-gate`;

  console.log(`\n[B] ✅ Gate deployed: ${gateAbs}`);
  console.log(`[A] Git remote host alias (bGitSsh): ${cfg.bGitSsh}`);
  console.log(`[A] Admin deploy host alias (bAdminSsh): ${cfg.bAdminSsh}`);

  // Print authorized_keys line for Git-only key
  const pubPath = expandHome(cfg.auth?.gitPublicKeyPath || "");
  if (!pubPath || !fs.existsSync(pubPath)) {
    console.log(
      `\n[A] gitPublicKeyPath not found: ${pubPath || "(empty)"}\n` +
        `Add Git-only key to B authorized_keys like:\n` +
        `command="${gateAbs}",no-pty,no-port-forwarding,no-agent-forwarding,no-X11-forwarding <PUBLIC_KEY_LINE>\n`
    );
    return;
  }

  const pubLine = fs
    .readFileSync(pubPath, "utf8")
    .trim()
    .split(/\r?\n/)
    .find(Boolean);
  const forcedLine =
    `command="${gateAbs}",no-pty,no-port-forwarding,no-agent-forwarding,no-X11-forwarding ` +
    pubLine;

  console.log(
    "\n[B] authorized_keys line for Git-only key (one key manages ALL projects):\n"
  );
  console.log(forcedLine + "\n");

  const shouldAppend =
    flags["--append-auth"] || cfg.auth?.autoAppendAuthorizedKeys;
  if (shouldAppend) {
    const keyBody = pubLine.split(" ").slice(1).join(" ");
    const appendCmd = `
set -euo pipefail
HOME_DIR="$(cd ~ && pwd)"
mkdir -p "$HOME_DIR/.ssh"
touch "$HOME_DIR/.ssh/authorized_keys"
grep -F '${escapeForSingleQuotes(
            keyBody
          )}' "$HOME_DIR/.ssh/authorized_keys" >/dev/null 2>&1 || \
  echo '${escapeForSingleQuotes(
    forcedLine
  )}' >> "$HOME_DIR/.ssh/authorized_keys"
chmod 700 "$HOME_DIR/.ssh"
chmod 600 "$HOME_DIR/.ssh/authorized_keys"
`;
    ssh(adminHost, appendCmd);
    console.log("[B] ✅ authorized_keys appended (idempotent).");
  } else {
    console.log(
      "[B] (Not appended automatically; use --append-auth or set auth.autoAppendAuthorizedKeys=true)"
    );
  }
}

function cmdHook(repoRoot, cfg) {
  if (!fs.existsSync(path.join(repoRoot, ".git"))) {
    die("Not a git repository (missing .git). Run in repo root.");
  }

  const preTpl = readFile(path.join(repoRoot, "templates", "pre-receive"));
  const postTpl = readFile(path.join(repoRoot, "templates", "post-receive"));

  const adminHost = cfg.bAdminSsh;
  const gitHost = cfg.bGitSsh;

  // Create / repair bare repo on B, install pre-receive
  const remote = `
set -euo pipefail
${toBaseAbsRemote(cfg.proxyBase)}
PROJECT_NAME='${escapeForSingleQuotes(cfg.projectName)}'
if [[ "$PROXY_BASE_ABS" == */"$PROJECT_NAME" ]]; then
  REPO_ROOT="$PROXY_BASE_ABS"
else
  REPO_ROOT="$PROXY_BASE_ABS/$PROJECT_NAME"
fi
REPO_DIR="$REPO_ROOT/.git"
mkdir -p "$REPO_DIR"
git init --bare "$REPO_DIR" >/dev/null

git --git-dir="$REPO_DIR" remote remove upstream >/dev/null 2>&1 || true
git --git-dir="$REPO_DIR" remote add upstream '${escapeForSingleQuotes(
    cfg.upstreamUrl
  )}'
git --git-dir="$REPO_DIR" config --unset-all remote.upstream.fetch >/dev/null 2>&1 || true
git --git-dir="$REPO_DIR" config remote.upstream.fetch '+refs/heads/*:refs/heads/*'
git --git-dir="$REPO_DIR" config --add remote.upstream.fetch '+refs/tags/*:refs/tags/*'
git --git-dir="$REPO_DIR" config --unset-all remote.upstream.mirror >/dev/null 2>&1 || true

mkdir -p "$REPO_DIR/hooks"
cat > "$REPO_DIR/hooks/pre-receive" <<'HOOK'
${preTpl}
HOOK
chmod +x "$REPO_DIR/hooks/pre-receive"

cat > "$REPO_DIR/hooks/post-receive" <<'HOOK'
${postTpl}
HOOK
chmod +x "$REPO_DIR/hooks/post-receive"

echo "proxy: repo = $REPO_DIR" >&2
`;
  ssh(adminHost, remote);

  // Compute B absolute base to write remote URL
  let bBaseAbs = "";
  const isWindowsPath = /^([A-Za-z]:\\|\\\\)/.test(cfg.proxyBase);
  if (cfg.proxyBase.startsWith("/") && !isWindowsPath) {
    bBaseAbs = cfg.proxyBase;
  } else {
    const baseOut = sshCapture(
      adminHost,
      `
set -euo pipefail
${toBaseAbsRemote(cfg.proxyBase)}
printf '__PROXY_BASE_ABS__%s\\n' "$PROXY_BASE_ABS"
`
    );
    bBaseAbs = extractMarkedValue(baseOut, "__PROXY_BASE_ABS__");
  }
  const bRepoRoot = bBaseAbs.endsWith(`/${cfg.projectName}`)
    ? bBaseAbs
    : `${bBaseAbs}/${cfg.projectName}`;
  const bRepo = `${bRepoRoot}/.git`;

  // Rewrite local remote to gitHost (forces git-only key via ~/.ssh/config)
  const originUrl = `${gitHost}:${bRepo}`;
  console.log(`[A] set ${cfg.remoteName} => ${originUrl}`);

  git(["remote", "remove", cfg.remoteName], repoRoot, { capture: false });
  git(["remote", "add", cfg.remoteName, originUrl], repoRoot, {
    capture: false,
  });

  console.log(
    `✅ pre-receive installed & ${cfg.remoteName} rewritten for this repo.`
  );
}

function usage() {
  console.log(`Usage:
  node git-proxy-init.js gate [--append-auth]
  node git-proxy-init.js hook

What it does:
  gate:
    - merges/updates proxy.config.json (fills defaults; keeps your upstreamUrl)
    - deploys B: ~/.ssh/git-proxy-gate (single file)
    - prints authorized_keys line for Git-only key (optional append)

  hook:
    - merges/updates proxy.config.json (fills defaults; tries infer upstreamUrl if missing)
    - creates/repairs B: <proxyBase>/<projectName>/.git (bare)
    - installs templates/pre-receive as hooks/pre-receive
    - rewrites local remote (default: origin) to: <bGitSsh>:<B-absolute-path-to-proxy-repo>
`);
}

function main() {
  const repoRoot = process.cwd();
  const { sub, flags } = parseFlags(process.argv);
  if (!sub || (sub !== "gate" && sub !== "hook")) {
    usage();
    process.exit(0);
  }

  const { cfg, cfgPath } = ensureConfig(repoRoot);
  console.log(`[A] config ensured: ${cfgPath}`);
  applyRemoteShell(cfg);

  if (sub === "gate") return cmdGate(repoRoot, cfg, flags);
  if (sub === "hook") return cmdHook(repoRoot, cfg);
}

main();
