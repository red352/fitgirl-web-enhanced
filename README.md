# FitGirl Web Enhanced

<p align="center">
  <a href="https://github.com/red352/fitgirl-web-enhanced/releases"><img src="https://img.shields.io/badge/Userscript-v1.5.0-blue.svg?style=flat-square" alt="Userscript Version" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg?style=flat-square" alt="License" /></a>
  <a href="https://fitgirl-repacks.site/"><img src="https://img.shields.io/badge/Target-fitgirl--repacks.site-purple.svg?style=flat-square" alt="Target Site" /></a>
  <a href="#权限与隐私安全"><img src="https://img.shields.io/badge/Permissions-Minimal-success.svg?style=flat-square" alt="Permissions: Minimal" /></a>
  <a href="package.json"><img src="https://img.shields.io/badge/Built_with-Vite_%7C_TypeScript-646CFF.svg?style=flat-square" alt="Tech Stack" /></a>
</p>

<p align="center">
  面向 <strong>FitGirl Repacks</strong> 的现代化、轻量级且无损可逆的用户脚本（Userscript）。<br />
  在严格保留站点所有原始正文、下载镜像、视频截图与 Magnet 链接的前提下，通过工程化手段重构网格排版与阅读体验。
</p>

<p align="center">
  <a href="https://raw.githubusercontent.com/red352/fitgirl-web-enhanced/master/dist/fitgirl-enhanced.user.js"><strong>🚀 一键安装 Userscript</strong></a> ·
  <a href="https://cdn.jsdelivr.net/gh/red352/fitgirl-web-enhanced@master/dist/fitgirl-enhanced.user.js">备用 CDN 安装</a> ·
  <a href="https://github.com/red352/fitgirl-web-enhanced/issues">反馈问题 / 提交建议</a>
</p>

---

## 目录

- [项目概述](#项目概述)
- [核心特性](#核心特性)
- [界面预览](#界面预览)
- [安装指南](#安装指南)
- [交互与快捷键](#交互与快捷键)
- [技术架构与设计原则](#技术架构与设计原则)
- [权限与隐私安全](#权限与隐私安全)
- [兼容性](#兼容性)
- [本地开发与测试](#本地开发与测试)
- [常见问题与排障](#常见问题与排障)
- [贡献指南](#贡献指南)
- [免责声明与开源许可](#免责声明与开源许可)

---

## 项目概述

FitGirl Repacks 原版页面基于经典博客流式布局，在现代高分辨率显示器或宽屏设备上存在屏幕利用率低、图文混排篇幅过长、长列表浏览易疲劳等问题。

**FitGirl Web Enhanced** 采用渐进增强策略，在严格遵循最小必要权限原则的前端沙箱环境下工作：

- **布局重构**：将冗长的文章流重塑为行对齐的自适应栅格卡片，大幅提升信息检索效率。
- **评分集成**：智能提取游戏标题并拉取官方 Steam 好评率与评测数据，决策快人一步。
- **无损可逆**：底层采用双向事务记录器，不破坏原始 DOM 结构与原生属性，支持随时一键回退至原生视图。
- **即插即用**：零外部依赖，支持主流浏览器脚本管理器，具备静默自更新机制。

---

## 核心特性

### 1. 严格行拉齐网格流（Row-Aligned Grid Flow）

- **基准行等高拉齐**：采用标准 CSS Grid 布局，每行卡片顶部与底部高度严格对齐（`align-items: stretch`），消除错落瀑布流导致的阅读基线跳跃与新旧顺序混淆。
- **视口断点响应**：
  - **移动端 / 紧凑视口（< 1152px）**：单列自适应流式排版；
  - **标准桌面 / 笔记本（1152px ~ 1699px）**：双列平衡卡片流；
  - **2K / 宽屏显示器（1700px ~ 2399px）**：自适应三列平铺；
  - **4K / 超宽屏显示器（≥ 2400px）**：自适应四列高密度排版。
- **时序权重标识**：
  - 首张最新发布的游戏卡片配有专属光晕高亮；
  - 前三位发布条目使用梯级品红徽章（`#1`, `#2`, `#3`）标定优先级；
  - 卡片顶部包含人性化相对发布时间标签（如 `Today`、`Yesterday`、`2d ago` 等）。
- **海报原比呈现**：游戏封面采用 `object-fit: contain`，杜绝边缘标题与细节截断。

### 2. Steam 游戏评分与评测集成（Steam Ratings & Reviews）

- **智能标题清洗与精准匹配**：
  - 自动提取游戏英文原名，智能剥离 Repack 编号、版本标记、括号修饰（如 `(Denuvoless)`）、注释星号（`*`）、波浪号以及附加包（如 `+ All DLCs*`、`+ Soundtrack Bundle`、`+ Bonus OST`、`+ Artbook` 等）；
  - 自动识别并剥离各类 Edition 发行版后缀（如 `Deluxe Edition`、`Digital Deluxe Edition`），优先生成最精准的基础游戏名候选词（如 `Dragon's Dogma 2`、`Hollowbody`），大幅提升匹配命中率。
- **DLC / 扩展包本体自动追溯**：
  - 当游戏条目为大型 DLC、附加内容包或独立扩展版本时（例如 `The Blood of Dawnwalker: Eclipse Edition` 匹配到 AppID `4417550`），系统通过 Steam API 自动探测其类型与所属主游戏；
  - 自动将查询目标无缝重定向追踪至游戏本体（如 `The Blood of Dawnwalker`），准确拉取本体游戏真实的好评率、评测总数与 Metascore，杜绝因 DLC 评价样本过少导致的数据失真。
- **微胶囊动态加载与失败优雅兜底**：
  - **加载中状态**：卡片右上角显示带有平滑旋转动画（`.fwe-spin`）的动态微胶囊（`查询中...`），明确提示查询进度；
  - **评分徽章**：数据就绪后呈现清晰醒目的好评率与综合评价等级（如 `92% 特别好评 (45.6k)`）及 Metascore；
  - **未收录状态**：若游戏尚未登录 Steam 或暂时无法匹配，展示优雅的灰阶 `未收录` 提示徽章，杜绝突兀空白。
- **富交互评测浮层（Popover）**：
  - 鼠标悬浮或点击评分徽章即可唤出精美浮层，直观展示好评率百分比渐变进度条、好评/差评数量明细以及发行年份；
  - 提供 Steam 官方商店页面一键直达与 SteamDB 历史低价/图表快捷跳转链接；
  - 浮层右上角与单篇详情页信息栏均集成 **强制刷新按钮 🔄**，点击即可驱逐本地旧缓存并实时向 Steam 重新拉取最新数据。
- **高性能本地缓存与独立开关**：
  - 内置 7 天有效期本地 LRU 缓存系统，最小化网络开销，支持多页面跨标签同步；
  - 顶部 **View** 控制菜单中提供 `Show Game Ratings` 开关，可随心一键开启或关闭。

### 3. 多媒体交互灯箱（Lightbox）

- 点击任何截图或视频缩略图即可呼出全屏灯箱，支持即时低清占位并异步平滑切换至高清原图。
- 完整支持原生 `<video>` 演示动画循环播放。
- 深度集成桌面交互：鼠标指针焦点平滑缩放、双击放大/重置、按住平移浏览高分辨率局部细节，以及完整键盘快捷键操作。

### 4. 模态详情与结构收纳

- **列表卡片快捷弹窗**：卡片底部集成 `Download Mirrors`、`Features`、`Description` 快捷触发键，无需离开列表即可在模态弹窗中快速查阅下载链接与详细说明。
- **详情页轻量折叠**：下载源与网盘镜像聚合为标准 Disclosure 折叠块，默认收起特性与介绍，大幅精简页面初次呈现高度。
- **结构规范化**：自动隔离 WordPress 清除浮动伪元素与游离广告节点，避免非预期空白占位；`Upcoming Repacks` 始终全宽吸顶居中。

### 5. 无缝无限滚动（Infinite Scroll）

- 向下滚动接近页面底部时，后台平滑预加载下一页资源并按行追加至列表底部，杜绝页面跳动与重排。
- 在顶部 **View** 控制菜单中提供持久化开关（默认启用），关闭后无损恢复原生数字分页导航。

### 6. Pink Paw Award 荣誉作品与分类索引优化

- **装饰包装容器无损穿透**：
  - 针对 FitGirl 荣获“Personal Pink Paw Award”（粉红爪印奖）的游戏（正文外部包裹着带爪印背景图的特有 `<div>` 容器，如 `/the-alters/`、`/replaced/` 等），智能穿透装饰层并展平内部语义节点；
  - 完整解析并提取下载镜像（BT / 磁力 / 多网盘）、截图相册、游戏特性与正文介绍，彻底解决此类游戏在增强排版下内容缺失的痛点。
- **专属粉红爪印微标**：
  - 自动识别 `category-pink-paw-award` 分类与背景特征，在游戏标题旁点缀专属 `🐾 Pink Paw` 荣誉微标。
- **全站分类与 A-Z 索引网格化**：
  - 自动将 `/games-with-my-personal-pink-paw-award/` 爪印专页及所有采用 `.lcp_catlist` 列表结构的分类页面升级为响应式多列网格卡片布局（`.fwe-directory-az`）。

### 7. 统一导航与抽屉容器

- **热门榜单解耦**：将原常驻侧边栏的 `Most Popular Repacks of the Week` 改为桌面端右侧抽屉、移动端底部抽屉（Bottom Sheet），按需呼出。
- **全局路由面板**：顶部导航提供 **Browse** 下拉面板，快速访问站点常用分类、A-Z 索引与按月历史归档。
- **全站风格一致性**：对搜索结果页、Updates Digest、归档页等特殊页面提供统一的响应式风格适配。

### 8. 零闪烁加载与状态持久化

- 基于 `@run-at: document-start` 注入与同步 Fast-Path 状态预检，在 DOM 解析初期即注入视图控制属性，彻底消除无样式内容闪烁（FOUC）。
- 偏好设置采用 `localStorage` 与 `IndexedDB` 双层容错存储，跨会话与多标签页保持同步。

---

## 界面预览

> 界面预览截图由自动化流水线在真实高分辨率与典型移动端视口下无头渲染实测捕获。

### 1. 浏览与网格流（Listing & Stream Flow）

严格行对齐的响应式卡片网格，自适应适配桌面多列高密度与移动端单列流式布局，集成 Steam 评分微标、时序光晕与相对时间戳：

|        桌面浏览页（等高栅格与评分徽章）        |          移动端浏览页（自适应单列流）           |
| :--------------------------------------------: | :---------------------------------------------: |
| ![桌面浏览页](docs/assets/listing-desktop.png) | ![移动端浏览页](docs/assets/listing-mobile.png) |

### 2. Steam 游戏评分与富交互评测（Steam Ratings & Popover）

智能清洗匹配游戏英文原名，在卡片右上角直观展示 Steam 好评率与 Metascore；悬浮或点击即可唤出包含好评百分比进度条、玩家评测明细、Steam / SteamDB 直达与强制刷新按钮的精美评测浮层：

|                Steam 评测详情浮层与交互卡片                 |
| :---------------------------------------------------------: |
| ![Steam 游戏评分与评测浮层](docs/assets/rating-popover.png) |

### 3. 单篇详情与专属荣誉（Game Detail & Pink Paw Award）

单篇页参数栏聚合 Steam 实时评分，多下载源与网盘镜像规范化折叠；智能穿透“Pink Paw Award”装饰包装层，展示专属粉红爪印荣誉微标并完整呈现游戏特性与相册：

|     经典游戏详情页（折叠收纳与评分信息）      |          Pink Paw 荣誉作品（装饰层穿透与粉红徽章）           |
| :-------------------------------------------: | :----------------------------------------------------------: |
| ![桌面详情页](docs/assets/detail-desktop.png) | ![Pink Paw 荣誉游戏详情页](docs/assets/pink-paw-desktop.png) |

### 4. 模态弹窗、全屏灯箱与手势抽屉（Modals, Lightbox & Gestures）

提供无需离开列表即可快速查阅下载镜像的卡片快捷弹窗、沉浸式多媒体交互灯箱（支持平滑缩放、拖拽平移与高清原图切换）以及移动端自适应底部抽屉：

|       卡片快捷模态弹窗（快速查阅镜像与特性）       |           桌面多媒体交互灯箱（全屏沉浸画廊）            |
| :------------------------------------------------: | :-----------------------------------------------------: |
| ![卡片快捷模态弹窗](docs/assets/modal-desktop.png) | ![桌面多媒体交互灯箱](docs/assets/lightbox-desktop.png) |

|                     移动端热门榜单抽屉（自适应 Bottom Sheet）                     |
| :-------------------------------------------------------------------------------: |
| <img src="docs/assets/popular-mobile.png" alt="移动端热门榜单抽屉" width="360" /> |

---

## 安装指南

### 前置要求

在浏览器中安装任意一款支持现代 Userscript 规范的脚本管理器扩展：

- [Tampermonkey](https://www.tampermonkey.net/)（推荐，Chrome / Edge / Firefox / Safari）
- [Violentmonkey](https://violentmonkey.github.io/)
- [Greasemonkey](https://www.greasespot.net/)

### 安装步骤

1. 点击安装链接：[Raw 脚本安装](https://raw.githubusercontent.com/red352/fitgirl-web-enhanced/master/dist/fitgirl-enhanced.user.js)（国内网络环境可选 [jsDelivr 镜像](https://cdn.jsdelivr.net/gh/red352/fitgirl-web-enhanced@master/dist/fitgirl-enhanced.user.js)）；
2. 脚本管理器将自动弹出确认界面，点击 **安装**（Install）；
3. 访问 [fitgirl-repacks.site](https://fitgirl-repacks.site/)，页面将自动以增强模式呈现。

### 自动更新

脚本在元数据头中声明了 `@updateURL` 与 `@downloadURL`。每次脚本仓库发布新版本后，脚本管理器会在后台检测版本差异并提示自动升级。

---

## 交互与快捷键

### 多媒体灯箱快捷键

| 快捷键                                                        | 功能操作                         |
| :------------------------------------------------------------ | :------------------------------- |
| <kbd>←</kbd>                                                  | 切换至上一张截图 / 媒体          |
| <kbd>→</kbd>                                                  | 切换至下一张截图 / 媒体          |
| <kbd>+</kbd> / <kbd>=</kbd> 或 <kbd>Ctrl</kbd> + <kbd>+</kbd> | 放大当前视图                     |
| <kbd>-</kbd> 或 <kbd>Ctrl</kbd> + <kbd>-</kbd>                | 缩小当前视图                     |
| <kbd>0</kbd> 或 <kbd>Ctrl</kbd> + <kbd>0</kbd>                | 重置缩放与位移为原始比例（1.0x） |
| <kbd>Esc</kbd>                                                | 退出全屏灯箱                     |

### 鼠标与手势交互

- **缩放**：在灯箱开启状态下，使用鼠标滚轮可按当前指针所在焦点进行无级平滑缩放。
- **快速缩放**：双击图片可在原始比例与 2.2 倍放大倍率之间快速切换。
- **拖拽平移**：当图片放大处于视口之外时，按住鼠标左键即可自由拖拽平移画布。
- **模态窗口导航**：所有弹窗与抽屉均支持按 <kbd>Esc</kbd> 快速关闭，或点击背景半透明遮罩层关闭。

---

## 技术架构与设计原则

```
src/
├── dom.ts          # DOM 解析器、正文栏目提取、页面特征识别与双向还原事务管理器
├── ui.ts           # 响应式卡片流、媒体墙、模态弹窗、导航抽屉与 Lightbox 控制器
├── rating.ts       # Steam 评分拉取、标题智能清洗、DLC 本体追溯与 LRU 缓存系统
├── preferences.ts  # 同步 Fast-Path 偏好注入、localStorage / IndexedDB 容错持久化
├── types.ts        # 全局 TypeScript 接口与领域模型定义
├── icons.ts        # 内联 SVG 图标生成器
├── style.css       # 媒体查询、容器查询与基于作用域隔离的样式定义
└── main.ts         # 生命周期初始化入口与运行时沙箱引导
```

- **双向事务记录器（Reversible Transactions）**：
  增强脚本对页面的结构调整并非破坏性修改，而是通过事务记录器捕获节点的原始父级容器、兄弟节点相对位置、行内样式与原始 Class。当切换至 `Original View` 时，事务以逆序精确执行还原，保证与原生页面 100% 一致。
- **动态 Mutation 隔离**：
  内部采用 `WeakSet` 与专用标记属性追踪已处理的 DOM 节点，在无缝无限滚动加载或外部脚本注入时，仅增量处理全新节点，避免重复计算或嵌套包装。
- **样式作用域隔离**：
  所有增强 CSS 样式严格限定在 `html[data-fwe-mode="enhanced"]` 选择器作用域下，确保在原站视图下不残留任何全局样式污染。

---

## 权限与隐私安全

- **最小化权限声明**：脚本严格遵循最小权限原则，仅声明了实现核心功能所必需的特权：
  - `@grant GM_xmlhttpRequest`：用于向 Steam 官方公开商店接口发起跨域只读请求以获取游戏好评率与评测数据；
  - `@grant GM_getValue` / `GM_setValue`：用于脚本管理器级配置持久化与跨标签页同步；
  - `@connect store.steampowered.com`：严格限制仅允许连接 Steam 官方商店域名，禁止访问任何其他未经授权的第三方地址。
- **零隐私追踪与只读请求**：
  - Steam 评分拉取完全基于官方公开只读 API，不携带任何用户 Token、Cookie、账号凭据或个人隐私；
  - 脚本不包含任何统计埋点、探针或第三方数据分析服务，绝不收集或上传用户的任何浏览历史与访问数据。
- **本地存储隔离与命名空间**：本地配置与缓存保存在站点同源存储或 GM 存储中，键名规范如下：
  - `fitgirl-web-enhanced:v1:layout-mode`：视图模式配置（`enhanced` / `original`）；
  - `fitgirl-web-enhanced:v1:media-expand`：详情页媒体默认展开偏好；
  - `fitgirl-web-enhanced:v1:infinite-scroll`：列表页无限滚动开关状态；
  - `fitgirl-web-enhanced:v1:show-ratings`：游戏评分展示开关状态；
  - `fitgirl-web-enhanced:ratings:v1`：Steam 评分与评测本地缓存字典（7 天有效期自动淘汰）。

---

## 兼容性

| 运行环境       | 兼容支持说明                                                                    |
| :------------- | :------------------------------------------------------------------------------ |
| **脚本管理器** | Tampermonkey、Violentmonkey、Greasemonkey 等兼容标准 Userscript 规范的扩展      |
| **浏览器内核** | Chromium 系（Chrome, Edge, Brave, Vivaldi）、Firefox 等最新主流稳定版           |
| **视口跨度**   | 覆盖 390px 移动端单列至 4K+ 超宽屏四列自适应排版                                |
| **异常降级**   | 当 DOM 结构发生未知变更或脚本运行异常时，自动安全降级至原站排版，不影响正文显示 |

---

## 本地开发与测试

### 环境依赖

- [Node.js](https://nodejs.org/) `>= 22.12`
- [npm](https://www.npmjs.com/)

### 工作流命令

```bash
# 安装依赖
npm ci

# 启动本地热重载开发服务
npm run dev

# 静态类型检查
npm run typecheck

# 代码规范检查与格式校验
npm run lint
npm run format:check

# 执行单元测试
npm run test

# 构建生产产物（输出至 dist/fitgirl-enhanced.user.js）
npm run build

# 一键统一升级版本（同步 package.json、package-lock.json、README 徽章并重新编译产物）
npm run bump patch   # 或 minor, major, 1.5.0

# 执行 Playwright 端到端及视觉快照测试
npm run test:e2e

# 自动化重拍文档高清预览图（输出至 docs/assets/）
npm run capture

# 综合前置检查（流水线推荐）
npm run check
```

---

## 常见问题与排障

### Q1: 安装脚本后页面样式未发生变化？

- 请确认当前访问的 URL 是否严格匹配 `https://fitgirl-repacks.site/*`；
- 确认脚本管理器中该脚本已处于“启用”状态；
- 若此前曾切换至原生视图，请点击页面右下角的恢复图标，或在控制台执行 `localStorage.clear()` 重置配置。

### Q2: 为什么个别非游戏文章未呈现为网格卡片？

- Updates Digest、公告通知或特殊格式文章由于不包含标准 Repack 信息段，脚本会主动采用保真全宽布局，以防止漏读关键文本或损坏排版。

### Q3: 站点改版后遇到排版错位如何反馈？

- 建议先通过顶部 **View** 菜单切换至 **Original View** 保证正常访问；
- 欢迎前往 [GitHub Issues](https://github.com/red352/fitgirl-web-enhanced/issues) 提交工单，并附上具体页面链接、浏览器版本及控制台错误日志截图。

### Q4: 为什么个别游戏显示“未收录”或没有 Steam 评分？

- 可能的原因包括：
  1. 该游戏属于非 Steam 平台发行作品（如主机独占移植、Epic/GOG/EA/Ubisoft 独占等），Steam 数据库中无该作品；
  2. 游戏正文标题使用了非官方别名或特殊修饰词，未能成功命中检索候选词；
  3. 您当前的本地网络环境连接 Steam 官方商店公开接口出现超时或受阻。
- **解决方案**：您可以将鼠标悬停在“未收录”微标上，点击浮层中的 **Steam 搜索** 或 **SteamDB 搜索** 快捷键进行手动检索确认；若网络恢复，也可点击浮层中的 **重新查询 🔄** 按钮进行强制重试。

### Q5: 评分信息更新不及时或需要刷新怎么办？

- 脚本默认对已成功拉取的评分在本地缓存 7 天，以大幅降低网络开销并保障瞬时加载速度。
- 如需立即获取该游戏的最新评测数据（例如好评率发生波动或近期转为多半好评），只需将鼠标悬停至评分徽章上（或进入单篇详情页信息栏），点击浮层右上角或参数行末尾的 **强制刷新 🔄** 按钮，系统将自动清除该条目的本地缓存并实时向 Steam 重新拉取最新数据。

---

## 贡献指南

欢迎任何有助于完善本项目体验的贡献！

1. Fork 本仓库并基于最新代码创建分支；
2. 遵循现有的 ESLint 与 Prettier 代码规范；
3. 提交前确保通过 `npm run check` 与 `npm run test:e2e`；
4. 提交清晰、规范的 Git 提交说明（推荐语义化提交，如 `feat: ...`, `fix: ...`）。

---

## 免责声明与开源许可

### 免责声明

本脚本仅属于个人开发用于改善网页排版与本地浏览体验的无侵入式前端增强工具。

- 脚本自身不托管、不存储、不解析、亦不分发任何受版权保护的二进制文件、种子或数据流。
- 脚本与 FitGirl Repacks 官方无任何隶属或雇佣关系。
- 使用者应自行遵守所在国家/地区法律法规，作者不对任何第三方链接的有效性或使用者的行为承担法律责任。

### 开源许可

本项目基于 [MIT 许可证](LICENSE) 授权开源。<br />
Copyright © 2026 red352
