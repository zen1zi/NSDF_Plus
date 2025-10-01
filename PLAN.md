# NSDF 助手开发计划

> 面向 0.2.0 版本，聚焦 DeepFlood / NodeSeek 双站稳定性与模块可扩展性。

## 总体目标
- 提升远程配置与缓存机制的稳定性，确保 Tampermonkey 热更新顺畅。
- 强化核心模块（设置面板、自动签到、UI 美化）的跨站兼容性与可配置性。
- 补齐开发文档与调试流程，降低新模块接入成本。
- 明确版本节奏与手动验证步骤，保障上线质量。

## 里程碑规划
### M1：基础设施巩固（目标：2024-11-15）
- 梳理 `main.js` 缓存逻辑，增加缓存失效日志。
- 在 `modules/config.json` 引入 `checksum` / `lastUpdated` 字段，辅助远程比对。
- 为 `settings` 模块补充 README 中缺失的 UI 配置说明。

### M2：核心模块完善（目标：2024-12-01）
- `autoSignIn`：抽象站点签到流程，支持备用接口和失败重试。
- `uiEnhance`：整理样式注入点，拆分 DeepFlood / NodeSeek 差异片段。
- `contentPreview`：增加移动端检测，避免在窄屏过度占位。

### M3：新特性与发布（目标：2025-01-15）
- 新增“模块健康检查”工具页，列出加载耗时、缓存命中情况。
- 规划 0.2.0 发布：更新 `@version`、撰写变更日志，验证脚本在两站点运行。
- 准备 GreasyFork 发布说明，说明权限、安装步骤与兼容站点。

## 功能迭代清单
- `settings`：
    - 支持搜索模块与一键重置配置。
    - 在设置面板内提示缓存更新时间。
- `autoSignIn`：
    - 增加“错峰签到”模式，随机延迟范围可配置。
    - 记录最近签到时间至 `df_AUTOSIGNIN_LAST_RUN`，用于状态展示。
- `uiEnhance`：
    - 提供自定义主题色入口（同步存储在 `df_UI_THEME`）。
    - 针对 NodeSeek 贴子列表优化响应式布局。
- `quickReply`：
    - 允许用户保存常用回复模版到 GM 存储。
    - 引入键盘快捷键（例如 `Alt+Enter`）提交。
- `contentPreview`：
    - 支持 Markdown / BBCode 模式切换，自动识别当前站点默认格式。
    - 增加渲染错误回退，避免阻塞发帖流程。
- 新模块候选：
    - `notificationBridge`：合并两站私信 / 提醒入口的提醒气泡。
    - `postTracker`：记录浏览过的帖子并在列表标记。

## 技术债与优化
- `main.js`：
    - 抽离 `fetchWithCache` 为可复用 helper，编写独立 README。
    - 增加 `[DF助手]` 级别的错误捕获与重试。
- 模块目录：
    - 统一 README 模板，补齐缺失模块文档。
    - 样式文件若存在多站差异，统一使用 BEM 命名。
- 研发流程：
    - 补充 `node --check`、`eslint`、浏览器调试的联调 checklist。
    - 建议引入 Vitest 针对纯函数（如数据格式化）进行轻量测试。

## 验证与发布流程
1. 本地 `node --check main.js`，逐个模块 `node --check modules/<id>/index.js`。
2. 导入 Tampermonkey，清空 `df_module_cache_*`，验证远程拉取成功。
3. 在 DeepFlood / NodeSeek 各执行一次关键用户路径：签到、发帖、快捷回复、预览。
4. 观察控制台 `[DF助手]` 日志，确保无报错、无重复初始化。
5. 发布前更新 `@version`、`modules/config.json` 的 `version`，同步变更日志。
6. 备份远程配置至仓库 release 分支，便于回滚。

## 风险与应对
- 远程配置缓存失效：增加缓存命中日志与回退策略。
- 双站 DOM 结构变化：建立监控清单，采用 `querySelector` 宽松匹配。
- Tampermonkey 权限审查：每次发布时复核 `@grant` 列表，保留必需权限。

## 资源与协作
- 负责人：
    - 基础设施 / 发布：维护者 A
    - 核心模块（autoSignIn, settings）：维护者 B
    - UI / 内容相关模块：维护者 C
- 协调方式：使用 GitHub Discussions 记录需求，PR 需附手动验证截图。
- 每周例会回顾模块稳定性，滚动更新本计划。

