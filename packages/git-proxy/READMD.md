Git Proxy（A → B → Upstream）

将 A（开发机）的 Git 操作通过 B（中转机）代理到 upstream，确保 fetch/pull 同步 upstream、push 强一致（非删除）与删除弱一致。

---

## 1. 使用方式（发布到 npm 后）

包名：`@zhujianshi/git-proxy`
CLI：`zjs-git-proxy`

安装：

```bash
npm i -g @zhujianshi/git-proxy
```

或使用 npx：

```bash
npx @zhujianshi/git-proxy gate
npx @zhujianshi/git-proxy hook
```

CLI 用法（安装后）：

```bash
zjs-git-proxy gate [--append-auth]
zjs-git-proxy hook
```

说明：CLI 命令名为 `zjs-git-proxy`（避免与其他包冲突）。

本仓库本地调试：

```bash
node git-proxy.js gate
node git-proxy.js hook
```

package.json（发布到 npm 的示例）：

```json
{
  "name": "@zhujianshi/git-proxy",
  "version": "0.1.0",
  "description": "Git proxy for A -> B -> upstream with gate/hooks",
  "type": "module",
  "bin": {
    "zjs-git-proxy": "./git-proxy.cjs"
  },
  "exports": {
    ".": {
      "import": "./git-proxy.js",
      "require": "./git-proxy.cjs"
    }
  },
  "files": [
    "git-proxy.js",
    "git-proxy.cjs",
    "templates/",
    "READMD.md"
  ],
  "engines": {
    "node": ">=18"
  }
}
```

---

## 2. 快速开始（以一个项目为例）

### 2.1 A 侧准备

1. 准备两把 SSH key（Git-only 与 Admin）
2. 配置 SSH alias（建议 `b-git` 与 `b-admin`）
3. 在项目根目录创建 `proxy.config.json`

SSH config 示例：

```sshconfig
Host b-git
  HostName lan_ip
  User name
  IdentityFile ~/.ssh/id_ed25519_gitproxy
  IdentitiesOnly yes

Host b-admin
  HostName lan_ip
  User name
  IdentityFile ~/.ssh/id_ed25519_login
  IdentitiesOnly yes
```

### 2.2 执行（每台 B 只需一次 gate）

```bash
zjs-git-proxy gate
zjs-git-proxy hook
```

之后对当前项目的 `git pull / git push` 正常使用即可。

---

## 3. 配置文件（proxy.config.json）

示例：

```json
{
  "projectName": "projectName",
  "upstreamUrl": "git@gitlab.git",
  "proxyBase": "~/git-proxy",

  "bGitSsh": "b-git",
  "bAdminSsh": "b-admin",

  "remoteName": "origin",
  "remoteShell": "bash",
  "remoteShellArgs": ["--noprofile", "--norc", "-s"],

  "auth": {
    "gitPublicKeyPath": "~/.ssh/id_ed25519_gitproxy.pub",
    "autoAppendAuthorizedKeys": true
  }
}
```

字段说明：

| 字段                            | 说明                                                    |
| ------------------------------- | ------------------------------------------------------- |
| `projectName`                   | 项目名（B 侧目录名）                                    |
| `upstreamUrl`                   | upstream 仓库地址（必填或可自动推断）                   |
| `proxyBase`                     | B 侧 proxy 根目录（默认 `~/git-proxy`）                 |
| `bGitSsh`                       | A 侧 Git 操作用 SSH alias                               |
| `bAdminSsh`                     | A 侧部署/管理用 SSH alias                               |
| `remoteName`                    | A 侧 remote 名称（默认 `origin`）                       |
| `remoteShell`                   | B 侧执行 shell（默认 `bash`）                           |
| `remoteShellArgs`               | B 侧 shell 参数                                         |
| `auth.gitPublicKeyPath`         | A 侧 Git-only 公钥路径                                  |
| `auth.autoAppendAuthorizedKeys` | 是否自动追加到 B 侧 `authorized_keys`                   |

Windows 作为 B（Git-Bash）：

- 保持 `proxyBase` 为 Unix 风格路径
- 如需指定 bash 路径：

```json
{
  "remoteShell": "C:\\Program Files\\Git\\bin\\bash.exe",
  "remoteShellArgs": ["--noprofile", "--norc", "-s"]
}
```

---

## 4. 配置读取与默认值（运行时行为）

脚本在当前工作目录读取 `proxy.config.json`，并做合并与补全：

- `projectName`：默认取当前目录名
- `proxyBase`：默认 `~/git-proxy`
- `bGitSsh`：默认 `bSsh` 或 `b-git`
- `bAdminSsh`：默认 `bSsh` 或 `b-admin`
- `remoteName`：默认 `origin`
- `remoteShell/remoteShellArgs`：默认 `bash` + `--noprofile --norc -s`
- `auth.gitPublicKeyPath`：默认 `~/.ssh/id_ed25519_gitproxy.pub`
- `auth.autoAppendAuthorizedKeys`：默认 `false`

`upstreamUrl` 的来源：

1. 优先使用 `proxy.config.json` 中的 `upstreamUrl`
2. 若缺失，则读取 A 侧 Git：

   ```bash
   git remote get-url <remoteName>
   ```

   并通过启发式判断避免把 proxy 本身当作 upstream
3. 若仍为空，则报错并提示手动填写

---

## 5. 内部实现原理

### 5.1 架构

```
A (dev) --ssh(git-only)--> B (proxy) --ssh/https--> upstream
```

### 5.2 Gate 与 Hook 的职责

| 场景         | 组件                      | 作用                                  |
| ------------ | ------------------------- | ------------------------------------- |
| fetch / pull | `~/.ssh/git-proxy-gate`   | 拉代码前先同步 upstream               |
| push(非删除) | `.git/hooks/pre-receive`  | upstream 成功才接受 push              |
| push(删除)   | `.git/hooks/post-receive` | 本地先删除，再同步 upstream（弱一致） |

### 5.3 关键流程

- fetch/pull：A 发起 `git-upload-pack` → gate 同步 upstream → 继续上传
- push（非删除）：pre-receive 先 push upstream，成功后允许 A 的 push
- push（删除）：pre-receive 放行删除，post-receive 再同步 upstream

---

## 6. 常见排错

- `ssh b-git` 进不了 shell：正常，Git-only key 被 forced-command 限制
- Gate 部署报权限错误：确认 `ssh b-admin bash -lc 'cd ~ && pwd'` 正常
- GUI 不生效：确认 `git remote -v` 的 remote 指向 `b-git:...`

---

## 7. 扩展建议

- 不要在 gate 中加入项目逻辑
- 不要在 pre-receive 中 fetch
- proxyBase 可迁移：修改 config 后重新运行 `gate`
