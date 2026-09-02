# FitGirl Web Enhanced

> A lightweight, responsive and reversible userscript that reorganizes FitGirl Repacks pages without collecting data or replacing original links.

FitGirl Web Enhanced 是面向 `fitgirl-repacks.site` 的渐进增强 Userscript。它将冗长的文章流重排为紧凑卡片与宽屏详情布局，同时保留全部原始正文、截图、试玩视频、下载链接和 magnet URL。随时可切换回原站布局，且选择会保存在浏览器中。

[一键安装 Userscript](https://raw.githubusercontent.com/red352/fitgirl-web-enhanced/master/dist/fitgirl-enhanced.user.js) · [反馈问题](https://github.com/red352/fitgirl-web-enhanced/issues)

## 核心功能

- 浏览页在宽屏使用双列编辑式卡片；中小屏自动单列，避免右侧大面积空白。
- 列表卡片与详情页的 Screenshots & Gameplay 默认展开展示全部截图与试玩视频，并可在 View 菜单中随时切换默认折叠/展开。
- Direct Links 与 Torrent 合并为一个 `Download Mirrors` disclosure；`Repack Features` 和 `Game Description` 默认关闭。
- `Most Popular Repacks of the Week` 改为桌面右侧抽屉、移动端底部 Sheet，不再常驻占位。
- `Upcoming Repacks` 桌面为可横向浏览的紧凑信息带，移动端可折叠且不截断条目，支持条目快速点击搜索。
- 搜索结果复用首页卡片并显示完整信息网格；Updates Digest、Popular Repacks、A-Z、Updates List 与月度归档使用统一的响应式视觉系统。
- 顶部保留桌面 hover 子菜单；Browse 抽屉覆盖全部路由和按年份折叠的 Monthly Archives。
- 基于 `@run-at: document-start` 与同步 Fast-Path 偏好注入，彻底消除页面首屏未样式化闪现（FOUC）。
- 原生 `<details>/<summary>`、清晰焦点样式、至少 44px 触控目标、Esc 关闭和焦点归还。
- View 控制菜单收纳 **Enhanced View** 视图模式与 **Expand Screenshots** 媒体预览开关；Original View 隐藏所有增强按钮并仅显示右下角固定恢复入口，完整恢复原节点顺序、属性及侧栏。

## 实际渲染

以下截图由当前构建产物在固定 HTML fixture 中真实运行后生成，并由 Playwright 视觉回归保护。

### 桌面浏览页

![桌面浏览页](docs/assets/listing-desktop.png)

### 移动浏览页

![移动浏览页](docs/assets/listing-mobile.png)

### 桌面详情页

![桌面详情页](docs/assets/detail-desktop.png)

### 移动热门榜单

![移动热门榜单](docs/assets/popular-mobile.png)

## 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/)、Violentmonkey 或 Greasemonkey。
2. 打开 [Raw 安装地址](https://raw.githubusercontent.com/red352/fitgirl-web-enhanced/master/dist/fitgirl-enhanced.user.js)。
3. 在脚本管理器的安装页确认。之后访问 `https://fitgirl-repacks.site/` 即可使用。

脚本通过元数据中的 `@updateURL` 与 `@downloadURL` 检查 `master` 分支的发布产物；版本判断由 `@version` 驱动。

## 使用说明

- 默认启用 **Enhanced View**。顶部 **View** 菜单可切换 **Enhanced View** 模式以及 **Expand Screenshots**（截图与试玩默认展开状态）；原站模式下右下角入口可随时恢复。
- 点击 **Browse** 可访问完整站点路由与 Monthly Archives；点击 **Popular** 打开热门榜单。
- 下载、特性和游戏介绍默认收起，点击标题或使用键盘 `Enter` / `Space` 展开。
- 若增强界面异常，先切换到 Original View；也可在浏览器站点数据中清除键 `fitgirl-web-enhanced:v1:layout` 与 `fitgirl-web-enhanced:v1:media-expand`。

## 兼容性

| 环境                                        | 支持情况                 |
| ------------------------------------------- | ------------------------ |
| Tampermonkey / Violentmonkey / Greasemonkey | 支持标准 Userscript 安装 |
| Chromium、Firefox 最新稳定版                | 主要目标                 |
| 390px 手机至 1920px 宽屏                    | 自动响应式适配           |
| JavaScript 被禁用                           | 保持原站页面，不执行增强 |

目标站点基于 WordPress，站点结构发生重大调整后可能需要更新 DOM 适配器。脚本对缺失节点采用安全回退，不会为了样式删除无法识别的正文。

## 权限与隐私

- `@grant none`：不申请脚本管理器特权 API。
- 不发起跨域请求，不上传或收集浏览数据。
- 仅使用当前页面已有内容和图片地址。
- 用户首选项保存在同源 `localStorage` 与 IndexedDB；主键为 `fitgirl-web-enhanced:v1:layout` 与 `fitgirl-web-enhanced:v1:media-expand`，不含任何跨站数据。

## 本地开发

要求 Node.js `>=22.12` 和 npm。

```bash
npm ci
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

生产构建输出为 `dist/fitgirl-enhanced.user.js`。提交前建议运行：

```bash
npm run check
npm run test:e2e
```

## 架构简介

- `src/dom.ts`：页面识别、栏目解析、热门榜单解析和可逆 DOM 事务。
- `src/ui.ts`：卡片、完整媒体墙、disclosure、顶部导航、归档抽屉、View 菜单（Enhanced View & Expand Screenshots 开关）和 dialog 控制器。
- `src/preferences.ts`：零权限的 localStorage/IndexedDB 双层偏好容错存储与同步 Fast-Path。
- `src/style.css`：全部增强样式均限定在 `html[data-fwe-mode="enhanced"]`，以媒体查询和容器查询完成响应式布局。
- `test/`：Vitest/jsdom 单元测试、确定性 fixture、五档视口端到端测试和视觉快照。
- `vite.config.ts`：`vite-plugin-monkey` 元数据配置（`@run-at: document-start`）及单文件发布构建。

增强时，事务会记录节点原父级、相邻节点、原属性与原 class；停用时逆序恢复。MutationObserver 只处理尚未标记的文章，避免 AJAX 内容或重复回调产生嵌套包装。

## 故障排查

- **页面看起来仍是原站：** 检查脚本是否启用，并确认地址为 HTTPS 的 `fitgirl-repacks.site`。
- **部分文章未变成卡片：** Updates Digest 等特殊内容会故意使用全宽保守布局，确保不丢失正文。
- **站点更新后排版异常：** 切换 Original View 后在 [Issues](https://github.com/red352/fitgirl-web-enhanced/issues) 提供页面地址、浏览器版本和截图。
- **自动更新未触发：** 在脚本管理器中手动“检查更新”，并确认 GitHub Raw 可访问。

## 贡献

欢迎提交 Issue 或 Pull Request。请保持改动聚焦，使用祈使式提交信息，并确保 `npm run check`、`npm run test:e2e` 和构建产物同步检查通过。维护者：[@red352](https://github.com/red352)。

## 免责声明

本项目仅改善网页的本地显示与交互，不托管、索引或分发任何游戏文件，也不隶属于 FitGirl Repacks。使用者应遵守所在地法律、目标站点规则及软件许可；作者不对第三方内容、链接可用性或使用后果负责。

## 许可证

[MIT](LICENSE) © 2026 red352
