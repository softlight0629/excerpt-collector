# Excerpt Collector（选中文本收录器）

在 Obsidian 中选中任意文字，一键**复制并追加**到预设的目标笔记。**源笔记永远不会被修改**：不删除、不替换、不添加链接、不改格式。

现有插件（Note Refactor、Note Composer 等）通常采用“提取—替换”逻辑，会剪切源笔记中的文字或替换成链接。Excerpt Collector 专注于另一种高频需求：**复制—追加**。小说摘录、论文素材、知识卡片、会议待办、写作灵感——任何“从 A 笔记挑内容，汇总到 B 笔记”的整理工作都适用。

## 功能

- ✅ 命令面板 / 默认快捷键（`Cmd/Ctrl + Shift + E`）/ 编辑器右键菜单 / 左侧功能区图标触发
- ✅ `FuzzySuggestModal` 模糊选择预设目标，也可从全库 Markdown 笔记中临时选择
- ✅ 数字编号 1-9 快速选择；每本目标笔记可分配编号，也可绑定独立快捷键跳过弹窗
- ✅ 插入位置：末尾 / 开头（自动跳过 YAML frontmatter）/ 指定标题下（插入到该章节末尾）
- ✅ 自定义格式模板，支持来源链接、时间戳、分隔符等占位符
- ✅ 阅读视图选区支持（命令面板会清空 DOM 选区，插件做了选区缓存兜底）
- ✅ 多光标 / 多选区批量收录
- ✅ 撤销上一次收录（精确移除上次插入的片段）
- ✅ 按目标笔记累计收录条数与最近收录时间
- ✅ 路径范围限制：只在指定目录的笔记中显示收录命令
- ✅ 中英双语界面：设置面板、命令、通知、弹窗和格式预设自动跟随 Obsidian 语言
- ✅ 纯本地插件，无网络请求，支持移动端

## 安装

### 手动安装

1. 下载 Release 中的 `main.js`、`manifest.json`、`styles.css`。
2. 放到你的库：`.obsidian/plugins/excerpt-collector/`。
3. 重启 Obsidian，在「设置 → 第三方插件」中启用 **Excerpt Collector**。

### 从源码构建

```bash
git clone <repo-url>
cd excerpt-collector
npm install
npm run build
```

将生成的 `main.js`、`manifest.json`、`styles.css` 复制到目标库的 `.obsidian/plugins/excerpt-collector/`。

## 快速开始

1. 打开「设置 → Excerpt Collector」，点击「添加收录目标」。
2. 为每个目标填写显示名称、目标笔记路径（如 `收录/摘录集.md`），可选分配数字编号。
3. 在任意笔记中选中文字，执行命令「收录选中文字到笔记」。
4. 在弹出的选择框中选择目标（或按数字键），内容即被追加到目标笔记中。
5. 源笔记保持原样。

> 目标笔记必须已经存在。插件不会自动创建笔记，避免路径输错时产生意外文件。

## 界面语言

插件会自动跟随 Obsidian 的界面语言：

- `zh`、`zh-CN`、`zh-TW` 等中文语言使用简体中文；
- 其他语言使用英文，英文也是未知语言的回退语言。

设置面板、命令名称、Notice 提示、目标选择框、统计/确认弹窗、格式预设名称及其模板内容、`{{weekday}}` 占位符都会随语言变化。切换 Obsidian 语言后，需要重新加载插件（或重启 Obsidian）才会更新已注册的命令名称。

默认标题也会按语言生成：中文为 `## 收录`，英文为 `## Excerpts`；已有设置和笔记内容不会被改写。

## 使用示例

- 读小说时摘录台词、战斗描写，分别归入「摘录集」「名言集」
- 阅读文献/课程笔记时，把关键结论收录到「论文素材」「知识卡片」
- 整理会议记录时，把待办事项、金句摘出到「行动清单」「语录集」
- 写作时从素材笔记中挑句子，归入「灵感库」「引用池」

## 格式模板

在设置中可以直接选择预设，也可以自由编辑模板。模板**必须包含 `{{content}}`**；缺少时插件会阻止收录，避免丢失选中内容。

| 占位符 | 含义 |
| --- | --- |
| `{{content}}` | 选中的正文（必填） |
| `{{source}}` | 源笔记名（不含扩展名） |
| `{{sourceLink}}` | 源笔记链接，如 `[[笔记名]]` |
| `{{sourcePath}}` | 源笔记完整路径 |
| `{{target}}` | 目标笔记显示名称 |
| `{{targetPath}}` | 目标笔记完整路径 |
| `{{date}}` | 本地日期，`YYYY-MM-DD` |
| `{{time}}` | 本地时间，`HH:mm` |
| `{{datetime}}` | 本地日期时间，`YYYY-MM-DD HH:mm` |
| `{{weekday}}` | 星期几，如中文界面的 `周五` 或英文界面的 `Friday` |

示例：

```markdown
> 摘自 {{sourceLink}} · {{datetime}}

{{content}}
```

内置预设：纯文本、带来源标注、带时间戳、带来源和时间、带分隔符 `---`。预设名称和预设生成的文字（如“摘自/Excerpted from”）会随界面语言变化。

> `{{sourceLink}}` 使用笔记名生成 `[[笔记名]]`。如果库中存在同名笔记，建议改用 `{{sourcePath}}` 自定义文本，避免链接歧义。

## 插入位置

- **末尾**（默认）：追加到目标笔记最后。
- **开头**：插入到 YAML frontmatter 之后；没有 frontmatter 时就是文件开头。
- **指定标题下**：插入到指定标题所在章节的末尾，不会越过后面的同级或更高级标题。支持 `## 收录` 或只写 `收录`（匹配任意级别）；仅解析 `#` 开头的 ATX 标题，并会忽略代码块中的伪标题。找不到标题时回退到笔记末尾并提示。

## 数字编号与快捷键

- 目标选择框打开且输入框为空时，按 `1`-`9` 直接选择对应编号的目标。
- 插件同时注册「收录到编号 N 的目标」命令；你可以在「设置 → 快捷键」中为它们绑定按键，从而完全跳过弹窗。
- 主命令默认快捷键为 `Cmd/Ctrl + Shift + E`，可在设置中关闭（需要重新加载插件生效），也可在 Obsidian 快捷键设置中覆盖。

## 阅读视图

在阅读视图（Reading View）中选中文字后，通过命令面板、功能区图标触发收录即可。命令面板可能清空浏览器 DOM 选区，插件会缓存最近 90 秒内的阅读视图选区作为兜底。

## 批量收录

在编辑视图中使用多光标（`Alt/Option + 点击`）或多选区选中多段文字，收录时会按位置顺序合并为一条记录，段与段之间用空行分隔。

## 撤销

执行命令「撤销上一次收录」，插件会从目标笔记中精确移除上次插入的完整片段（包含自动补齐的换行）。如果目标笔记在收录后被手动编辑，插件会尝试按内容重新定位；找不到时提示并跳过该记录，不会误删其他内容。

撤销记录最多保留 50 条，随插件数据持久化。

## 收录统计

执行命令「查看收录统计」，或在设置面板查看累计条数。统计按目标笔记路径累计；目标笔记重命名后旧统计会保留在原路径下。清空统计不会影响笔记内容。

## 路径范围限制

为避免日常笔记误触，可以设置只在特定路径中显示收录命令。留空表示不限制；多个规则用换行或逗号分隔，支持 glob：

```text
摘录源/**
课程笔记/*.md
```

- `*` 匹配单段路径（不跨 `/`）
- `**` 匹配任意层级
- `?` 匹配单个非 `/` 字符
- 不含通配符且没有扩展名的规则按文件夹处理（`摘录源` 等价于 `摘录源/**`）
- 匹配不区分大小写，支持中文路径

不在范围内时，命令会被隐藏，右键菜单也不会出现。

## 源笔记保护

这是本插件的硬性约束：

- 获取选区只使用 `Editor.getSelection()` / `Editor.getRange()` / DOM `Selection`，全部是只读操作。
- 代码中不存在 `editor.replaceSelection()`、`editor.replaceRange()` 等修改编辑器的调用。
- 唯一写文件入口是 `Vault.process()`，且只对用户选择的目标笔记执行。
- 目标笔记如果与源笔记相同，会被直接拒绝。
- 粘贴、删除、加链接等操作一律不会发生。

## 独立测试 Vault

仓库同级目录中的 `test-vault/` 是独立测试库，包含示例源笔记、预设目标笔记和详细测试清单：

- `插件测试说明.md`：12 项手动测试步骤
- `摘录源/示例小说.md`、`摘录源/课程笔记.md`：示例源
- `收录/摘录集.md`、`收录/名言集.md`：预配置目标
- `.obsidian/plugins/excerpt-collector/`：插件目录与预置配置（`data.json`）

运行 `npm run build && npm run deploy:test` 可将最新构建复制到测试 Vault（不会覆盖 `data.json`）。用 Obsidian「打开文件夹作为仓库」选择 `test-vault` 即可；如果插件未自动启用，请在第三方插件设置中手动启用。

## 开发

```bash
npm install
npm run dev        # esbuild watch
npm run check      # TypeScript 类型检查
npm test           # 单元测试（模板/glob/标题插入/撤销定位/i18n）
npm run test:smoke # 用模拟的 Obsidian API 加载构建产物，验证收录/撤销/保护逻辑
npm run test:all   # 单元测试 + 冒烟测试
npm run build      # 类型检查 + 生产构建
npm run deploy:test
```

> 单元测试使用 Node 内置的 TypeScript 类型剥离，需要 Node 22.18+。

项目结构：

```text
excerpt-collector/
├── src/
│   ├── main.ts        # 插件入口、命令、右键菜单、收录/撤销流程
│   ├── settings.ts    # 设置面板
│   ├── picker.ts      # 目标选择、文件选择、统计、确认弹窗
│   ├── selection.ts   # 编辑视图/阅读视图选区读取与缓存
│   ├── format.ts      # 纯函数：模板、glob、标题定位、插入、撤销定位
│   ├── i18n.ts        # 中英文翻译、语言检测、星期与默认标题
│   ├── constants.ts   # 默认设置、预设模板
│   └── types.ts       # 共享类型
├── tests/             # Node 内置测试运行器的单元测试
├── scripts/           # 测试 Vault 部署脚本
├── manifest.json
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
└── styles.css
```

## 发布准备清单

- [x] `manifest.json` 填写（id、name、description、author、minAppVersion）
- [x] README 功能说明、安装方法、使用示例
- [x] LICENSE（MIT）
- [ ] 将 `manifest.json`、`package.json`、`LICENSE` 中的作者名 `a` 改为你的正式署名
- [ ] 添加 README 截图/GIF
- [ ] 创建 GitHub 仓库并发布 Release（包含 `main.js`、`manifest.json`、`styles.css`）
- [ ] 提交 Obsidian 社区插件列表 PR（`obsidian-releases`）
- [x] README 明确声明：**本插件不会修改源笔记**

## English Summary

**Excerpt Collector** copies selected text into preset target notes without ever modifying the source note. It uses a copy-and-append workflow instead of the extract-and-replace approach of similar plugins.

Features: fuzzy target picker, vault-wide fallback search, numbered quick-select (1-9), configurable insertion position (end / start after frontmatter / under a heading), custom templates with source link and timestamp placeholders, reading-view support, multi-cursor batch collection, undo, per-target statistics, path-scope filtering, and a bilingual UI.

The settings panel, commands, notices, pickers, and template presets are available in English and Simplified Chinese. The UI follows Obsidian's language setting and falls back to English for other languages; reload the plugin after changing the app language. Fully local, no network access.

## License

MIT
