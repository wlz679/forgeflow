# ForgeFlowKit 上线 forgeflowkit.com（腾讯注册 + Cloudflare 仅 DNS + Pages）实施计划

> **给 agentic worker：** 必备子技能：用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 按任务逐步执行。步骤用 checkbox（`- [ ]`）追踪。

**目标：** 把 ForgeFlowKit 从"本地构建完成"推到"上线 forgeflowkit.com（海外，免备案）+ 隐私友好的流量统计"——为后续 SEO 和流量数据驱动的产品决策打基础。

**架构：** Astro 4.16.19 生成的纯静态站点（141 个 HTML 页）。部署到 **Cloudflare Pages**（免费全球 CDN + 免费 SSL）。域名 `forgeflowkit.com` 在 **腾讯云** 注册；DNS 迁到 **Cloudflare 仅 DNS 模式**（免费、关闭 Cloudflare 代理——只用它当权威 DNS），这样 Cloudflare Pages 才能自动管理根域名的 CNAME flattening。Plausible Analytics 做 GDPR 友好的流量统计。Gitee（主仓）→ GitHub 镜像。

**技术栈：** Astro 4.16.19（静态）· Cloudflare Pages（托管 + CDN）· 腾讯云注册商（域名）· Cloudflare DNS（免费仅 DNS zone）· DNSPod（NS 切换）· Plausible Analytics · Gitee → GitHub 镜像 · @astrojs/sitemap

---

## 相对 plan-v1（2026-06-22）的决策变更

| 项目 | plan-v1 | plan-v2（本文） | 原因 |
|---|---|---|---|
| 域名注册商 | Cloudflare Registrar | **腾讯云** | 用户 2026-06-23 在腾讯买的 |
| DNS 服务商 | Cloudflare（代理） | **Cloudflare（仅 DNS）** | Pages 需要根域名 CNAME flattening；只有 Cloudflare DNS 支持 |
| 部署区域 | 未指定 | **海外** | 免备案 |
| Pages 集成 | DNS 自动接管 | DNS 自动接管（NS 切换之后） | 最终状态相同，搭建步骤更长 |

**Pre-flight 已验证（2026-06-22，沿用）：**
- ✅ `astro.config.mjs` 含 `site: 'https://forgeflowkit.com'`（第 6 行）
- ✅ `src/layouts/BaseLayout.astro` 已存在，含 `<head>` 段
- ✅ `@astrojs/sitemap` 集成已配置
- ✅ `pnpm build` 产出 141 个页面
- ✅ Git remote：`gitee.com:wlz679/calcKit.git`（尚未有 GitHub）
- ✅ master 分支

**⚠️ 工作树警告（2026-06-23）：**
当前 master 工作树有**与本次部署无关的 in-flight 改动**（来自另一个 i18n drift 修复任务）：
- 已修改：`dist/en/solopreneur-burn-rate-calculator/index.html`
- 已修改：`dist/zh/solopreneur-burn-rate-calculator/index.html`
- 已修改：`src/i18n/translations.ts`
- 未跟踪：`scripts/_audit-howTouse.cjs`
- 未跟踪：`scripts/_verify-counts.cjs`

这些**不能**进部署 commit。本次部署的代码改动只涉及 `src/layouts/BaseLayout.astro` 和新增 `public/` 下的 2 个文件，跟上面这些都不沾边。**建议：开一个干净的 git worktree** 干部署活（`superpowers:using-git-worktrees`），避免冲突。如果只能在 master 上干，用精确路径 `git add`（永远不要 `git add -u dist/` 或 `git add .`）。

---

## 实施状态（2026-06-23）—— Task 1-3 在 master 上已完成

**2026-06-23 的 pre-flight 验证发现：Task 1-3 在本计划创建之前就已经在 master 上实现完了。** 原 plan-v1（`2026-06-22-deploy-forgeflowkit.md`）是在代码 commit 之后才写的，列成了"待办"——这是文档与现实的脱节，未来的 agent 不预先检查就可能重复执行。

| Task | 状态 | master 上的 commit |
|---|---|---|
| 1. Plausible 接入 BaseLayout | ✅ **已完成** | `53a01ea feat(analytics): add Plausible script to BaseLayout (deferred, 1KB, GDPR-friendly)`（2026-06-22 16:33） |
| 2. `public/_headers`（Cloudflare Pages） | ✅ **已完成** | `bdbc19b feat(deploy): add Cloudflare Pages _headers (security + cache)` |
| 3. `public/_redirects`（www→apex 301） | ✅ **已完成** | `838035b feat(deploy): add www→apex 301 redirect via Cloudflare Pages _redirects` |

验证方法（在 repo 根目录、master 分支上跑）：

```bash
# BaseLayout 含 Plausible、data-domain 正确
grep 'plausible.io' src/layouts/BaseLayout.astro

# _headers 和 _redirects 存在于 public/
ls public/_headers public/_redirects

# Plausible 出现在构建产物中（141 页里有 140 页——那 1 页要么用了别的 layout，
# 要么不是 HTML 资源比如 robots.txt）
grep -lr 'plausible.io' dist/ | wc -l   # 期望：140
```

**执行本计划时，跳过 Task 1-3。** 下面的章节仅作历史参考（当初做了什么）和规范依据（万一需要重新验证或重新应用）。**不要**重复加 Plausible / `_headers` / `_redirects`——已经存在了。

**剩下的活只有 Task 4-9**——全是用户操作（4-8）加上线后验证（9）。下文修订后的 Task 4 和 Task 7 已适配"**腾讯注册商 + Cloudflare 仅 DNS**"这套方案。

---

## Task 1：在 BaseLayout 加 Plausible 统计

**文件：**
- 修改：`src/layouts/BaseLayout.astro`（在 `<link rel="icon" ...>` 这一行后、`{schema && ...}` 这一行前插入）

**为什么：** Plausible 提供 GDPR 友好的流量统计，不需要 cookie banner。一个 `<script>` 标签，~1 KB，不影响 Core Web Vitals。

- [ ] **Step 1.1：读 BaseLayout 找插入位置**

读 `src/layouts/BaseLayout.astro`，找到 `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />` 这一行。确认紧接着的下一行是 `{schema && ...}`（schema JSON-LD 那一行）。

- [ ] **Step 1.2：插入 Plausible 脚本**

在 favicon link 那行**之后**插入（`{schema && ...}` 那行之前）：

```astro
<script defer data-domain="forgeflowkit.com" src="https://plausible.io/js/script.js"></script>
```

最终 `<head>` 长这样：

```astro
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
  <meta name="description" content={description} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:image" content={ogImage} />
  <meta property="og:type" content="website" />
  <meta name="robots" content="index, follow" />
  <link rel="sitemap" href="/sitemap-index.xml" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <script defer data-domain="forgeflowkit.com" src="https://plausible.io/js/script.js"></script>
  {schema && <script type="application/ld+json" set:html={schema} />}
</head>
```

- [ ] **Step 1.3：构建并验证 dist/ 里出现脚本标签**

跑：`pnpm build 2>&1 | tail -5`
期望："141 page(s) built"——构建成功。

再跑：`grep -l "plausible.io/js/script.js" dist/en/solopreneur-cac-calculator/index.html`
期望：打印出该文件路径（Plausible 脚本已经在渲染输出里了）。

顺便多看几页确认 BaseLayout 全局生效：
跑：`grep -lr "plausible.io/js/script.js" dist/en/ | wc -l`
期望：~33（每个英文页一个）。

- [ ] **Step 1.4：提交（精确 add——排除工作树里无关的改动）**

```bash
git add src/layouts/BaseLayout.astro
git add dist/
# 确认 staged 状态只有部署相关——没有 i18n drift 文件、没有 burn-rate dist
git status
git diff --staged --stat | head -20
git commit -m "feat(analytics): add Plausible script to BaseLayout (deferred, 1KB, GDPR-friendly)"
```

**提交前的 sanity check：** `git status` 应该只显示 BaseLayout + 141 个 dist 文件已 staged。如果看到 `solopreneur-burn-rate-calculator/index.html` 或 `src/i18n/translations.ts` 也被 staged，停下来取消：`git restore --staged <path>`。

---

## Task 2：加 Cloudflare Pages 安全头

**文件：**
- 新建：`public/_headers`

**为什么：** `_headers` 是 Cloudflare Pages 的约定（Netlify 也支持）。让我们集中设置安全 + 缓存头，不用每页配。不加这个，站点上线时就没有 CSP / X-Frame-Options 之类的头。

- [ ] **Step 2.1：创建 `public/_headers`**

建文件 `public/_headers`，内容如下（**Unix LF 行尾——不要 CRLF**）：

```
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  # Astro 已经内联了关键 CSS，所以 HTML 可以激进缓存
  Cache-Control: public, max-age=0, must-revalidate

/_astro/*
  # Astro 的指纹哈希内容；激进缓存（1 年）
  Cache-Control: public, max-age=31536000, immutable

/sitemap-index.xml
  /sitemap-0.xml
  Cache-Control: public, max-age=3600

/favicon.svg
  /og-default.png
  Cache-Control: public, max-age=86400
```

`_headers` 语法：路径 glob 单独一行，下面缩进的是头。Cloudflare Pages 部署时从 `public/` 读取这个文件。

- [ ] **Step 2.2：构建并验证 _headers 被复制到 dist**

跑：`pnpm build 2>&1 | tail -3`
再跑：`ls dist/_headers && echo "exists" && cat dist/_headers`
期望：文件存在于 dist 根目录，内容跟上面一致。

- [ ] **Step 2.3：提交**

```bash
git add public/_headers dist/_headers
git diff --staged --stat
git commit -m "feat(deploy): add Cloudflare Pages _headers (security + cache)"
```

---

## Task 3：加 www → apex 重定向（统一规范域名）

**文件：**
- 新建：`public/_redirects`

**为什么：** SEO 最佳实践——选一个规范域名（根域 `forgeflowkit.com`），把另一个（`www.forgeflowkit.com`）301 重定向过去。避免重复内容惩罚。

- [ ] **Step 3.1：创建 `public/_redirects`**

建文件 `public/_redirects`，内容如下（**Unix LF**）：

```
# www → apex（301 永久）
https://www.forgeflowkit.com/* https://forgeflowkit.com/:splat 301

# 强制 HTTPS（Cloudflare Pages 一般自动做，显式写出来更稳）
/http://* https://forgeflowkit.com/:splat 301
```

第一条处理 `www.forgeflowkit.com` → `forgeflowkit.com`。第二条是 `http://` URL 的安全网。

- [ ] **Step 3.2：构建并验证 _redirects 被复制**

跑：`pnpm build 2>&1 | tail -3`
再跑：`cat dist/_redirects`
期望：两条规则都在。

- [ ] **Step 3.3：提交**

```bash
git add public/_redirects dist/_redirects
git diff --staged --stat
git commit -m "feat(deploy): add www→apex 301 redirect via Cloudflare Pages _redirects"
```

---

## Task 4（修订版）：在腾讯买域名 + 把 DNS 迁到 Cloudflare

> ⚠️ **用户操作**——需要腾讯云账号 + Cloudflare 账号 + 付款方式。无法完全自动化。（域名 2026-06-23 已购于腾讯，剩下只有 DNS 切换步骤。）

**文件：** 无（DNS 配置全在 web UI 里完成。）

- [ ] **Step 4.1：注册 Cloudflare 账号（如果还没有）**

去 https://dash.cloudflare.com/sign-up 注册。**免费套餐够用**——我们只用 Cloudflare 的 DNS 服务，不用它的代理/CDN。

- [ ] **Step 4.2：把 forgeflowkit.com 加成 Cloudflare zone（仅 DNS）**

1. 进 Cloudflare dashboard，点 "Add a site"（或 "Add" → "Connect a domain"）。
2. 输入 `forgeflowkit.com` → 点 "Continue"。
3. 选 **Free plan**（$0/月）。
4. Cloudflare 会扫描现有 DNS 记录（~1 分钟）。过一下记录——域名刚买，应该还没有。
5. **关键配置步骤：** 在记录确认页，确保代理状态是 **"DNS only"**（灰色云朵图标 ☁️，**不是**橙色 🟠）。因为现在还没记录，这步其实无所谓——直接点 "Continue" / "Done"。
6. Cloudflare 这时会显示**两个 nameserver 主机名**，你要把域名指向它们。复制下来，长这样：
   ```
   anna.ns.cloudflare.com
   bob.ns.cloudflare.com
   ```
   （你的具体值会不一样，Cloudflare 随机分配。）

- [ ] **Step 4.3：在腾讯 DNSPod 改 NS 记录**

1. 去 https://console.cloud.tencent.com/domain
2. 在域名列表里找到 `forgeflowkit.com` → 点 "解析"（DNSPod）。
3. 进域名详情页，切到 "域名设置" tab。
4. 找到 "DNS 服务器" 那一栏。
5. 点 "修改 DNS 服务器"（不同 UI 版本可能是 "设置 DNS"）。
6. 把默认的腾讯 nameserver（比如 `ns3.dnsv5.com`、`ns4.dnsv5.com`）换成 **Step 4.2 里 Cloudflare 给的那两个**。
7. 确认。腾讯可能要短信验证。

- [ ] **Step 4.4：等 NS 传播（24-48 小时）**

DNS 全球传播要 24-48 小时。这段时间：
- 站点可能时断时续——取决于 DNS 查询命中的还是老的（腾讯）nameserver。
- 有些用户（特别是国内）还会看到腾讯的 nameserver，等他们 ISP 刷新缓存才会切。
- 这是**正常的**——别慌，别动任何东西。

想看进度：
- https://dnschecker.org/#NS/forgeflowkit.com —— 全球传播地图
- 终端：`dig NS forgeflowkit.com +short`（从海外跑比较准）

- [ ] **Step 4.5：验证 NS 切换成功**

终端：
```bash
dig NS forgeflowkit.com +short
```

期望输出：两行，都是 Step 4.2 里 Cloudflare 给的主机名，比如：
```
anna.ns.cloudflare.com.
bob.ns.cloudflare.com.
```

如果看到腾讯的 nameserver（比如 `ns3.dnsv5.com`），说明传播还没完成——再等等。

同时在 Cloudflare dashboard → `forgeflowkit.com` → Overview 页确认。状态应该显示 **"Active"**（不是 "Pending"）。Cloudflare 检测到 NS 切换后会自动从 Pending → Active（通常全球传播到 ~50% 之后几分钟内）。

---

## Task 5：建 GitHub 仓 + 配 Gitee 镜像

> ⚠️ **用户操作**——需要 GitHub 账号。Cloudflare Pages 集成 GitHub（不是 Gitee 直连），所以需要镜像。

**文件：** 无。

Cloudflare Pages 免费版集成 GitHub（或 GitLab）。策略：Gitee 留作主仓，通过 Gitee 自带的镜像功能同步到 GitHub。

- [ ] **Step 5.1：建一个空的 GitHub 仓**

1. 去 https://github.com/new
2. Repository name：`calcKit`（跟 Gitee 仓同名）
3. Visibility：**Public**（Cloudflare Pages 免费版静态站点部署要求 public 仓）
4. **不要**勾选初始化 README、.gitignore、license（Gitee 仓已经有这些，初始化会冲突）
5. 点 "Create repository"

- [ ] **Step 5.2：配 Gitee → GitHub 镜像**

1. 去 https://gitee.com/wlz679/calcKit（已有 Gitee 仓）
2. 点 "管理" → "仓库设置" → "镜像管理"——注意，这个功能要 Gitee Pro / 企业版；免费版走 Step 5.3 的 fallback
3. 在 "镜像到 GitHub" 下，点 "添加镜像"
4. 粘 GitHub 仓 URL：`https://github.com/<your-username>/calcKit.git`
5. 认证：提供 GitHub personal access token，scope 要 `repo`
6. 开启 "Push mirror"（主动推送镜像）
7. 点 "确定"

配完之后，每次 `git push gitee master` 会自动也推到 GitHub。

- [ ] **Step 5.3（fallback——如果镜像功能不可用）：手动镜像**

```bash
git remote add github https://github.com/<your-username>/calcKit.git
git push github master
```

（一次性。之后手动 `git push github master`，或者 `git config --global push.default matching` 后加进脚本。）

- [ ] **Step 5.4：验证镜像生效**

推完新 commit 之后（比如 Task 3 提交后）：
- GitHub 仓 `https://github.com/<your-username>/calcKit` 应该已经有最新 commits。
- 镜像可能要 1-2 分钟传播。

---

## Task 6：Cloudflare Pages 接入 GitHub 仓

> ⚠️ **用户操作**——在 Cloudflare dashboard 完成。必须**在 Task 4 之后**（DNS 在 Cloudflare 上激活）。

**文件：** 无。

- [ ] **Step 6.1：建 Cloudflare Pages 项目**

1. Cloudflare dashboard，点 "Workers & Pages" → "Create" → "Pages" tab → "Connect to Git"
2. 选 GitHub，授权 Cloudflare 访问仓（一次性 OAuth）。
3. 选 `calcKit` 仓。
4. 点 "Begin setup"

- [ ] **Step 6.2：配构建设置**

| 设置 | 值 |
|---|---|
| Project name | `calckit`（预览 URL 是 `calckit.pages.dev`） |
| Production branch | `master` |
| Framework preset | `Astro`（Cloudflare 自动检测） |
| Build command | `pnpm install --frozen-lockfile && pnpm build` |
| Build output directory | `dist` |
| Root directory | （留空） |
| 环境变量 | `NODE_VERSION` = `20` |
|  | `PNPM_VERSION` = `9` |

为什么用 `--frozen-lockfile`：保证 Cloudflare 端的构建跟仓里提交的 lockfile 一致（防止漂移）。

- [ ] **Step 6.3：保存并部署**

点 "Save and Deploy"。第一次构建要 2-3 分钟。Cloudflare 实时显示 build log。

期望："Success! Your site is deployed to https://calckit.pages.dev"（预览 URL，还没绑自定义域名）。

- [ ] **Step 6.4：验证预览 URL**

浏览器打开 `https://calckit.pages.dev`。应该看到 ForgeFlowKit 首页。
打开 `https://calckit.pages.dev/sitemap-index.xml`——应该看到 sitemap index。
打开 `https://calckit.pages.dev/en/solopreneur-cac-calculator`——应该看到 CAC 计算器。

任何一页挂了，看 Cloudflare dashboard 里的 build log。最常见问题：漏配 `NODE_VERSION` 环境变量 → Cloudflare 用老 Node，不支持 Astro 4。

---

## Task 7（修订版）：把 forgeflowkit.com 加成 Cloudflare Pages 自定义域名

> ⚠️ **用户操作**——在 Cloudflare dashboard 完成。依赖 Task 4 NS 传播完成 + Task 5/6 完成。

**文件：** 无（Cloudflare 现在是该 zone 的权威 DNS，DNS 自动管理）。

- [ ] **Step 7.1：给 Pages 项目加自定义域名**

1. Cloudflare Pages 项目 dashboard，点 "Custom domains" tab。
2. 点 "Set up a custom domain"
3. 输入 `forgeflowkit.com` → 点 "Continue"
4. Cloudflare 检测到域名在 Cloudflare DNS 上，会**自动添加** CNAME 记录。记录长这样：
   ```
   forgeflowkit.com  CNAME  calckit.pages.dev  （DNS only，灰云）
   ```
   点 "Activate domain"。Cloudflare Pages 还会通过 Let's Encrypt 自动签 SSL 证书。

5. （可选但推荐）加 `www.forgeflowkit.com` → Cloudflare 自动加 CNAME → Task 3 写的 `_redirects` 规则把流量导到 apex。

- [ ] **Step 7.2：验证 HTTPS 工作**

等 1-2 分钟（CNAME 的 DNS 传播 + SSL 证书签发）：
- 打开 `https://forgeflowkit.com`——应该看到 ForgeFlowKit，SSL 有效（浏览器没警告）。
- 打开 `https://www.forgeflowkit.com`——应该 301 重定向到 `https://forgeflowkit.com`。
- 点地址栏小锁 → "Connection is secure"，签发方是 Cloudflare / Let's Encrypt。

- [ ] **Step 7.3：验证 Plausible 在统计**

1. 浏览器打开 `https://forgeflowkit.com`
2. 开 DevTools → Network tab → 刷新
3. 应该看到 `https://plausible.io/js/script.js` 的请求（200 OK）
4. 跳到一个计算器页（比如 `/en/solopreneur-cac-calculator`）→ 又一个 Plausible 请求（pageview）
5. 去 https://plausible.io/forgeflowkit.com（你的 Plausible dashboard）→ 等 5-10 秒 → 应该看到 pageviews

如果 Plausible 没数据：清浏览器缓存、关广告拦截器（有些隐私扩展会拦 Plausible）。

---

## Task 8：把 sitemap 提交到 Search Console + Bing

> ⚠️ **用户操作**——需要 Google + Bing 账号。**可以跟 Task 7 并行**（DNS 传播不影响 sitemap 提交；Google 等 DNS 通了自然会重试索引）。

**文件：** 无（Search Console 验证全在 web UI）。

- [ ] **Step 8.1：Google Search Console**

1. 去 https://search.google.com/search-console/
2. 点 "Add property" → "URL prefix" → 输入 `https://forgeflowkit.com`
3. 验证方式：**DNS TXT 记录**（推荐——不改代码）
   - Google 给一条 TXT 记录，类似 `google-site-verification=abc123...`
   - 在 Cloudflare DNS 的 `forgeflowkit.com` zone 里加一条 TXT 记录：
     - Name：`@`
     - Content：`<Google 给的验证串>`
     - TTL：Auto
   - 回 Search Console 点 "Verify"——通常 1-2 分钟通过。
4. 验证后，去 "Sitemaps"（左侧栏）→ 输入 `sitemap-index.xml` → 点 "Submit"
5. 等 24-48 小时 Google 抓取。看 "Pages" 报告查索引情况。

- [ ] **Step 8.2：Bing Webmaster Tools**

1. 去 https://www.bing.com/webmasters
2. "Add a site" → 输入 `https://forgeflowkit.com`
3. 验证：Step 8.1 的同一条 TXT 记录对 Bing 也有效——一条记录两边都能用。
4. 提交 sitemap：`https://forgeflowkit.com/sitemap-index.xml`

- [ ] **Step 8.3：验证 hreflang 标签**

站点有 en/zh 两套页面。验证 hreflang 设置正确：
- `curl -s https://forgeflowkit.com/en/solopreneur-cac-calculator | grep -i hreflang`
- 期望：看到 `<link rel="alternate" hreflang="en" href="https://forgeflowkit.com/en/...">` 和 `<link rel="alternate" hreflang="zh" href="https://forgeflowkit.com/zh/...">`

如果 hreflang 缺失，那是 Astro 配置的另一件事——单独立 follow-up plan 加 `@astrojs/i18n` 集成。眼下 en 和 zh 也能各自被索引。

---

## Task 9：Lighthouse 审计 + 修关键问题

**文件：** 看结果（如果 pre-flight 通过通常不用改）。

- [ ] **Step 9.1：对生产 URL 跑 Lighthouse**

用 Chrome DevTools：
1. 打开 `https://forgeflowkit.com/en/solopreneur-cac-calculator`（最有代表性的页面）
2. DevTools → Lighthouse tab
3. 选：Performance、Accessibility、Best Practices、SEO
4. Mode：Mobile
5. 点 "Analyze page load"

期望分数（目标）：
- Performance：≥ 90
- Accessibility：≥ 95
- Best Practices：≥ 95
- SEO：= 100（已经有 og:tags、meta description、sitemap、robots）

- [ ] **Step 9.2：修发现的问题**

常见问题和修法（如果有）：
- **Performance < 90**：很可能是 `ai-api-cost-comparison` 的柱状图或 `openai-token-calculator` 的模型列表塞了太多 JS。可能需要 code splitting。不在本计划范围——单独立 follow-up。
- **Accessibility < 95**：很可能是分级指示器（🟢🟡🟠🔴）的色彩对比度。可能要加文字标签（🟢 Healthy）。不在本计划范围——单独立 follow-up。
- **Best Practices < 95**：看 console 错误。常见原因：漏 `<meta name="theme-color">`。BaseLayout 简单修一下。
- **SEO < 100**：几乎肯定是 100——已经有 og:tags、结构化数据、sitemap、robots meta。

任何 < 90 的分数记录到 follow-up issue。**不要**因为这个卡上线——先发后迭代。

---

## Self-Review

**Spec 覆盖：**
- [x] Plausible 集成 → Task 1
- [x] Cloudflare Pages 安全头 → Task 2
- [x] www → apex 重定向 → Task 3
- [x] 域名注册（腾讯）→ Task 4（修订）
- [x] DNS 迁到 Cloudflare（仅 DNS）→ Task 4（修订）
- [x] GitHub 仓 + Gitee 镜像 → Task 5
- [x] Cloudflare Pages 部署 → Task 6
- [x] 自定义域名绑定（NS 传播后）→ Task 7（修订）
- [x] Sitemap 提交 → Task 8
- [x] 质量验证 → Task 9

**占位符扫描：** 没有 "TBD" / "TODO" / "以后实现"。用户操作步骤是显式的，不是含糊带过。

**类型一致性：** N/A——这是基础设施/部署计划，没有新的 TypeScript 类型。

**范围检查：** 单一子系统（部署 + 统计）。没有拆成子计划。

**Out of scope（如需另立计划）：**
- Plausible 自定义事件统计（按钮点击等）——以后再加
- A/B 测试
- 加新计算器（方向 1）
- V4 engine 升级（方向 3）
- Cloudflare Workers（为未来 SSR 准备）
- Plausible 自托管 vs 云端——用户选了云端；预算有变再考虑

**工作树隔离（推荐）：** 用一个干净的 git worktree 做 Task 1-3，避免覆盖 in-flight 的 i18n drift 修复。详见上面的 "工作树警告"。

---

## 执行交接

计划已保存到 `docs/superpowers/plans/2026-06-23-deploy-forgeflowkit-tencent-dns.md`（英文版）和 `.zh.md`（中文版）。两种执行方式：

**1. Subagent-Driven（推荐）**——每个任务派一个新 subagent，任务间 review，迭代快。适合并行做 Task 1-3（彼此独立）。

**2. Inline Execution**——在本会话用 `executing-plans` 跑，批量执行 + 检查点。

**对 Task 1-3 的推荐：** 用新 git worktree + inline execution。Worktree 隔离掉 master 上 in-flight 的 i18n drift 修复。

**用户操作任务说明：** Task 4-8 是 USER ACTION（要 Cloudflare 账号、GitHub 账号、腾讯 DNSPod 权限、付款、dashboard 点击）。计划把步骤写清楚了但 Claude 不能代跑。用户自己手做这几步，Claude 负责 Task 1-3（代码活）和 Task 9（上线后验证）。

**用户的时间关键路径：**
- Task 4 NS 切换启动 24-48h 传播时钟
- 传播完成（~1 天）后，Task 5-7 紧接着跑（总共 ~10 分钟）
- Task 8（sitemap 提交）可以跟 Task 7 并行

**建议的用户执行顺序：**
1. 立即开 Task 4.2-4.3（Cloudflare 加 zone + NS 切换）——这步启动传播时钟
2. 等的时候：做 Task 5（GitHub 仓 + 镜像）
3. NS 激活后（Task 4.5）：做 Task 6（Pages 接 GitHub）→ 等第一次部署
4. 做 Task 7（自定义域名绑定）——Cloudflare 自动管 DNS（zone 在它那）
5. 做 Task 8（Search Console + Bing）——可以跟 7 并行
6. 24-48h 后：做 Task 9（Lighthouse 审计）