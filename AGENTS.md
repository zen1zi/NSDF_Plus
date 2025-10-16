# Repository Guidelines

> 当前版本：0.2.1（每次更新代码或发版时，请同步更新 `main.js` 的 `@version` 与 `modules/config.json` 的 `version` 字段，保持两处版本号一致）

## Project Structure & Module Organization
`main.js` 是 Tampermonkey 的入口脚本，负责拉取远程配置并加载模块。每个功能位于 `modules/<moduleId>/index.js`，使用 IIFE 包裹并调用 `DFRegisterModule` 注册。模块 ID 必须与目录名、`modules/config.json` 记录保持一致；新增或重命名模块时同步更新该配置文件。静态资源放在 `rd/`，开发文档紧贴对应模块。

## Build, Test, and Development Commands
项目是纯 JavaScript，无需打包器。开发时可以运行 `node --check main.js` 与 `node --check modules/<moduleId>/index.js` 快速检查语法。若需要更严格校验，可安装 ESLint（`npm install --save-dev eslint`）并执行 `npx eslint main.js modules/**/*.js --max-warnings=0`。调试时将 `main.js` 导入 Tampermonkey，并开启开发者模式以绕过缓存。

## Coding Style & Naming Conventions
保持现有 ES6 模块结构：IIFE、`'use strict';`、模块对象定义 `id`、`name`、`settings`、`init` 等生命周期方法。字符串使用单引号，四空格缩进，`GM_*` 持久化键名采用 `df_` 前缀的全大写蛇形常量。控制台日志统一以 `[DF助手]` 开头，方便过滤。

## Testing Guidelines
暂无自动化测试，主要依赖浏览器手动验证。调试时在 DeepFlood 站内实际操作：切换主题、打开帖子、触发签到等，确保无控制台报错。修改 `modules/config.json` 后，清空 Tampermonkey 存储确认远程加载是否正确。若新增纯函数，可根据需要引入 Vitest 等轻量测试框架。

## Commit & Pull Request Guidelines
提交信息使用陈述式动词并包含模块名称，例如 `autoPage: adjust default threshold`。将不相关的改动拆分为多个提交，便于回溯。拉取请求需说明用户影响、手动测试步骤，并在发布前更新 `@version` 与变更日志。

## Security & Configuration Tips
`CONFIG_URL` 指向线上 RAW 配置，请确保地址稳定可靠。跨域请求使用 `credentials: 'include'` 时谨慎处理用户数据，不要泄露敏感信息。发布到 GreasyFork 之前请确认只申请必要的 GM 权限。
