# Engines · 独立平行子引擎层

本目录为五层架构的第2层，包含各大独立平行子引擎。

## 架构说明

每个子引擎目录包含：
- `index.html` - 对外公开演示入口
- `assets/` - 子引擎专属静态资源（如适用）
- `modules/` - 子引擎专属模块（如适用）
- `*-private-engine/` - 对应子引擎的涉密内核（SEALED_FOR_COPYRIGHT_DEPOSIT）

## 子引擎列表

| 目录 | 说明 |
|------|------|
| gamemind/ | GameMind 全域通用博弈总基座，全系统公共底层 |
| airmind/ | AirMind V2.0 低空全域人机神经协同调度引擎 |
| airmind-private-engine/ | AirMind 私有涉密内核 |
| mindspeak/ | MindSpeak V19.0 四层跨域数理同构翻译引擎 |
| mindspeak-private-engine/ | MindSpeak 私有涉密内核 |
| evolvemind/ | EvolveMind 进阶思维认知演化引擎 |
| moodmind/ | MoodMind 非标资产估值底座 |
| geom-compute/ | 几何心智空间·全域大模型算力错峰调度与二进制底层执行底座 |
