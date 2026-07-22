# tools/ — 开发工具脚本

本目录存放项目开发和维护过程中使用的工具脚本。

## 文件清单

| 脚本 | 用途 |
|------|------|
| check-links.js | 全站链接完整性检查 |
| check-nav-final.js | 导航链接最终校验 |
| check-nav-comprehensive.js | 导航链接综合校验 |
| check-index-links.js | index.html 链接校验 |
| check-evidence-pages.js | 证据链页面校验 |
| test-engine.js | 引擎功能测试 |

## 使用方法

```bash
cd /workspace
node tools/check-links.js
```

> 这些脚本为开发/审计阶段工具，不参与生产运行。
