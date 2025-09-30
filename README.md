# NSDF 助手

Tampermonkey 增强脚本，同时支持 [DeepFlood 论坛](https://www.deepflood.com) 与 [NodeSeek 社区](https://www.nodeseek.com) 的常用操作增强。项目基于 NodeSeek 平台的 NSaide 改造，保留模块化框架，并针对两个站点统一配置与缓存策略，方便后续独立维护与扩展。

## ✨ 特性概览
- **模块化加载**：入口脚本 `main.js` 会读取线上配置 `modules/config.json`，按需拉取各功能模块。
- **统一设置面板**：集中管理所有模块开关与配置，支持延迟保存与 GM 存储。
- **实用工具集**：内置自动签到、快捷回复、内容预览、等级标签等常用增强功能。
- **缓存与更新**：GM 存储缓存远程模块 30 分钟，减少重复请求，同时提供版本占位，方便自建仓库发布。

## 📁 项目结构
```
DeepFloodPlus/
├── main.js                // Tampermonkey 入口脚本
├── modules/
│   ├── config.json        // 远程模块清单（需同步到线上）
│   └── <module>/
│       ├── index.js       // 功能实现
│       ├── README.md      // 模块说明
│       └── style.css      // 可选样式
├── rd/                    // 杂项资源（沿用原项目）
├── AGENTS.md              // 开发协作文档
└── README.md              // 本说明文件
```

## 🚀 快速上手
1. 将 `DeepFloodPlus` 作为独立仓库托管（例如 GitHub）。
2. 确认 `main.js` 中 `CONFIG_URL` 与 `modules/config.json` 指向你的仓库 RAW 地址（默认已配置为 zen1zi 账户）。
3. 把 `modules/` 下的脚本和样式同步到同一仓库，保证 Tampermonkey 可以访问。
4. 在 Tampermonkey 中导入 `main.js`，访问 DeepFlood 或 NodeSeek 任意页面验证模块是否加载。

> ⚠️ 若两个站点的接口路径存在差异，请在相应模块中通过 `window.DF.getSiteUrl` 调整请求路径，确保兼容性。

## 🔧 自定义与扩展
- 新增模块：在 `modules/<id>/` 创建脚本与 README，并在 `modules/config.json` 注册。
- 存储前缀全部改为 `df_`，与 DeepFlood+ 绑定，不会与原 NS 脚本冲突。
- 若需继续拆分样式，可保持现有 `GM_addStyle` 加载逻辑，或改为本地注入。

## 🧪 测试建议
- 通过浏览器控制台观察 `[DF助手]` 日志，确认模块加载顺序与状态。
- 清空 Tampermonkey 储存以验证远程配置更新是否生效。
- 对自动签到、内容预览等模块，建议在测试账号上验证接口兼容性。

## 🙏 致谢
原项目 [NSaide](https://github.com/stardeep925/NSaide) 提供了成熟的模块化框架。本仓库在其基础上同时适配 DeepFlood 与 NodeSeek，欢迎继续贡献改进。
