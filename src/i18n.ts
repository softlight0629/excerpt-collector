/**
 * 轻量 i18n 模块：不依赖 Obsidian API，便于单元测试。
 *
 * 语言由插件 onload 时读取 Obsidian 的 getLanguage() 决定：
 * - zh / zh-CN / zh-TW 等以 zh 开头的语言使用简体中文；
 * - 其余语言使用英文（也是未知语言的回退语言）。
 *
 * 切换 Obsidian 界面语言后，需要重新加载插件（或重启 Obsidian）生效。
 */

export type PluginLanguage = "zh" | "en";

const EN = {
  "common.cancel": "Cancel",
  "common.confirm": "OK",
  "common.close": "Close",
  "common.move": "Move",
  "common.choose": "Select",
  "common.escape": "Close",
  "common.unnamedTarget": "Unnamed target",

  "command.collect": "Collect selected text to note",
  "command.undo": "Undo last collection",
  "command.stats": "View collection statistics",
  "command.collectNumber": "Collect to target number {number}",
  "ribbon.collect": "Collect selected text",
  "menu.collect": "Collect to note",

  "notice.selectText": "Select some text first.",
  "notice.openMarkdown": "Open a Markdown note first.",
  "notice.outOfScope":
    "The current note is outside the configured collection path scope.",
  "notice.noTargets":
    "No collection targets are available. Add a target in the plugin settings first.",
  "notice.noNumberTarget":
    "There is no collection target with number {number}.",
  "notice.targetNoPath":
    'Target "{name}" has no note path configured.',
  "notice.sourceProtection":
    "The target cannot be the source note itself. This plugin never modifies the source note.",
  "notice.templateMissingContent":
    "The format template is missing the {{content}} placeholder, so collection was cancelled to avoid losing the selected text.",
  "notice.targetMissing": "Target note not found: {path}",
  "notice.targetNotMarkdown":
    "The target file is not a Markdown note.",
  "notice.templateEmpty":
    "The format template produced empty content, so collection was cancelled.",
  "notice.writeFailed":
    "Failed to write to the target note: {path}",
  "notice.writeFailedEmpty":
    "Failed to write to the target note: no content was generated.",
  "notice.collected": 'Collected to "{name}".',
  "notice.headingNotFound":
    'Heading "{heading}" was not found; content was appended to the end of the note instead.',
  "notice.nothingToUndo": "There is no collection to undo.",
  "notice.undoTargetMissing":
    "Cannot undo: target note not found ({path}). Skipped this record.",
  "notice.undoWriteFailed":
    "Undo failed: could not write to the target note.",
  "notice.undone": 'Undid the last collection (target: "{name}").',
  "notice.undoContentChanged":
    "The last collected content was modified or deleted and cannot be undone automatically. Skipped this record.",
  "notice.openSettingsHint":
    "Add collection targets in Settings → Community plugins → Excerpt Collector.",

  "picker.placeholder": "Choose a target note…",
  "picker.fileMissing": "File not found",
  "picker.vaultNote": "Vault note",
  "picker.numberHint": "Press a number to choose",
  "filePicker.placeholder": "Search notes in the vault…",

  "stats.title": "Collection statistics",
  "stats.empty":
    "No collections yet. After a successful collection, entry counts will appear here by target note.",
  "stats.summary":
    "Collected {total} entries across {targetCount} target notes.",
  "stats.target": "Target note",
  "stats.path": "Path",
  "stats.count": "Entries",
  "stats.lastAt": "Last collected",
  "stats.hint":
    "Statistics are counted by target path. If a target note is renamed, old statistics remain under the previous path.",

  "preset.plain": "Plain text (selected text only)",
  "preset.source": "With source",
  "preset.timestamp": "With timestamp",
  "preset.sourceTimestamp": "With source and timestamp",
  "preset.separator": "With separator ---",
  "preset.template.plain": "{{content}}",
  "preset.template.source":
    "> Excerpted from {{sourceLink}}\n\n{{content}}",
  "preset.template.timestamp":
    "{{content}}\n\n> Collected on {{datetime}}",
  "preset.template.sourceTimestamp":
    "> Excerpted from {{sourceLink}} · {{datetime}}\n\n{{content}}",
  "preset.template.separator": "---\n\n{{content}}",

  "default.heading": "## Excerpts",

  "settings.title": "Excerpt Collector settings",
  "settings.intro":
    "Select text in any note and copy-collect it into a preset target note. The source note is never modified.",
  "settings.targets": "Collection targets ({count})",
  "settings.targetsHint":
    "The display name is used in the picker and success messages; the path must be the full path of a Markdown note in the vault. Numbers 1-9 are optional and enable quick selection.",
  "settings.noTargets":
    'No collection targets yet. Click "Add collection target" below, or choose any note directly while vault-wide search is enabled.',
  "settings.addTarget": "Add collection target",
  "settings.targetLabel": "Target {index}",
  "settings.noNumber": "No number",
  "settings.numberOption": "Number {number}",
  "settings.numberAria": "Number",
  "settings.chooseFileTooltip": "Choose a note from the vault",
  "settings.deleteTargetTooltip": "Delete this target",
  "settings.targetNamePlaceholder": "Display name",
  "settings.targetPathPlaceholder":
    "Target note path, e.g. Collections/Excerpts.md",
  "settings.targetNameAria": "Target display name",
  "settings.targetPathAria": "Target note path",
  "settings.newTargetName": "New target",
  "settings.statusNoPath": "No target path configured.",
  "settings.statusFound": "✓ Note found: {path}",
  "settings.statusNotMarkdown":
    "The target is a file but not a Markdown note.",
  "settings.statusMissing":
    "⚠ Target note not found. Collection will report an error.",
  "settings.formatSection": "Format",
  "settings.preset": "Format preset",
  "settings.presetDesc":
    "Choosing a preset overwrites the template below. You can also edit the template directly.",
  "settings.choosePreset": "Choose a preset…",
  "settings.template": "Entry template",
  "settings.templateDesc":
    "Supports placeholders such as {{content}}, {{source}}, and {{date}}. The template must include {{content}}.",
  "settings.templateWarning":
    "⚠ The template is missing the {{content}} placeholder. Collection is blocked to avoid losing the selected text.",
  "settings.placeholdersSummary": "Show available placeholders",
  "settings.placeholder.content": "Selected text (required)",
  "settings.placeholder.source":
    "Source note name (without extension)",
  "settings.placeholder.sourceLink":
    "Source note link, e.g. [[Note name]]",
  "settings.placeholder.sourcePath":
    "Full path of the source note",
  "settings.placeholder.target": "Target display name",
  "settings.placeholder.targetPath":
    "Full path of the target note",
  "settings.placeholder.date": "Local date, YYYY-MM-DD",
  "settings.placeholder.time": "Local time, HH:mm",
  "settings.placeholder.datetime":
    "Local date and time, YYYY-MM-DD HH:mm",
  "settings.placeholder.weekday": "Weekday, e.g. Friday",
  "settings.insertPosition": "Default insertion position",
  "settings.insertPositionDesc":
    '"Start" inserts after YAML frontmatter so metadata is not damaged.',
  "settings.posEnd": "End",
  "settings.posStart": "Start",
  "settings.posHeading": "Under a heading",
  "settings.heading": "Target heading",
  "settings.headingDesc":
    "For example: ## Excerpts. Content is inserted at the end of that heading's section; if the heading is not found, it falls back to the end of the note. Only ATX headings starting with # are supported.",
  "settings.behaviorSection": "Behavior",
  "settings.contextMenu": "Enable editor context menu",
  "settings.contextMenuDesc":
    'Show "Collect to note" when right-clicking selected text in the editor.',
  "settings.defaultHotkey": "Enable default hotkey",
  "settings.defaultHotkeyDesc":
    "Default: Cmd/Ctrl+Shift+E. Requires reloading the plugin after changing this option.",
  "settings.hotkeyNotice":
    "The default hotkey will take effect after reloading the plugin.",
  "settings.vaultSearch": "Allow vault-wide fuzzy search",
  "settings.vaultSearchDesc":
    "Also list other Markdown notes in the picker as one-off targets.",
  "settings.numberSelect": "Enable numbered quick selection",
  "settings.numberSelectDesc":
    'Press 1-9 in the target picker. Also enables the "Collect to target number N" commands, which you can bind to hotkeys to skip the picker.',
  "settings.pathScope": "Path scope restriction",
  "settings.pathScopeDesc":
    "Leave empty for no restriction. One glob per line or comma-separated, e.g. Sources/**, Course Notes/*.md. A rule without wildcards or an extension is treated as a folder.",
  "settings.scopePlaceholder": "Sources/**\nCourse Notes/*.md",
  "settings.scopeNoActive": "No note is currently open.",
  "settings.scopeUnrestricted":
    'No path restriction is active; the open note "{name}" can be used.',
  "settings.scopeInside": 'The current note "{name}" is in scope.',
  "settings.scopeOutside":
    'The current note "{name}" is outside the scope; collection commands will be hidden.',
  "settings.maintenanceSection": "Statistics & maintenance",
  "settings.stats": "Collection statistics",
  "settings.statsDesc":
    "Collected {total} entries across {targetCount} target notes.",
  "settings.viewDetails": "View details",
  "settings.undoHistory": "Undo history",
  "settings.undoHistoryDesc":
    "Saved {count} undoable records (maximum {limit}).",
  "settings.clearUndo": "Clear undo history",
  "settings.clearUndoTitle": "Clear undo history",
  "settings.clearUndoMessage":
    'This removes all "Undo last collection" history but does not delete collected content.',
  "settings.clear": "Clear",
  "settings.clearStats": "Clear statistics",
  "settings.clearStatsDesc":
    "Only clears counters; no note content is modified.",
  "settings.clearStatsTitle": "Clear collection statistics",
  "settings.clearStatsMessage":
    "Clear all collection counters? Note content will not be affected.",
  "settings.footer":
    "Excerpt Collector v{version} · This plugin never modifies the source note",
  "settings.errorAction":
    "The operation failed. Check the developer console for details.",
} as const;

export type TranslationKey = keyof typeof EN;

const ZH: Record<TranslationKey, string> = {
  "common.cancel": "取消",
  "common.confirm": "确定",
  "common.close": "关闭",
  "common.move": "移动",
  "common.choose": "选择",
  "common.escape": "关闭",
  "common.unnamedTarget": "未命名目标",

  "command.collect": "收录选中文字到笔记",
  "command.undo": "撤销上一次收录",
  "command.stats": "查看收录统计",
  "command.collectNumber": "收录到编号 {number} 的目标",
  "ribbon.collect": "收录选中文字",
  "menu.collect": "收录到笔记",

  "notice.selectText": "请先在笔记中选中要收录的文字。",
  "notice.openMarkdown": "请先打开一篇 Markdown 笔记。",
  "notice.outOfScope": "当前笔记不在插件设置的收录路径范围内。",
  "notice.noTargets":
    "没有可用的收录目标笔记，请先在插件设置中添加目标。",
  "notice.noNumberTarget": "没有编号为 {number} 的收录目标。",
  "notice.targetNoPath": "「{name}」没有设置目标路径。",
  "notice.sourceProtection":
    "目标笔记不能是源笔记本身：本插件不会修改源笔记。",
  "notice.templateMissingContent":
    "追加格式模板缺少 {{content}} 占位符，为避免丢失内容已取消收录。",
  "notice.targetMissing": "目标笔记不存在：{path}",
  "notice.targetNotMarkdown": "目标文件不是 Markdown 笔记。",
  "notice.templateEmpty": "追加格式模板渲染结果为空，已取消收录。",
  "notice.writeFailed": "写入目标笔记失败：{path}",
  "notice.writeFailedEmpty":
    "写入目标笔记失败：没有生成可插入的内容。",
  "notice.collected": "已收录到「{name}」",
  "notice.headingNotFound":
    "未找到标题「{heading}」，已改为追加到笔记末尾。",
  "notice.nothingToUndo": "没有可撤销的收录记录。",
  "notice.undoTargetMissing":
    "无法撤销：目标笔记不存在（{path}）。已跳过该记录。",
  "notice.undoWriteFailed": "撤销失败：无法写入目标笔记。",
  "notice.undone": "已撤销上一次收录（目标：「{name}」）。",
  "notice.undoContentChanged":
    "上次收录的内容已被修改或删除，无法自动撤销。已跳过该记录。",
  "notice.openSettingsHint":
    "请在「设置 → 第三方插件 → Excerpt Collector」中添加收录目标。",

  "picker.placeholder": "选择收录目标笔记…",
  "picker.fileMissing": "文件不存在",
  "picker.vaultNote": "库内笔记",
  "picker.numberHint": "按编号快速选择",
  "filePicker.placeholder": "搜索库中的笔记…",

  "stats.title": "收录统计",
  "stats.empty":
    "暂无收录记录。收录成功后，这里会按目标笔记累计条目数量。",
  "stats.summary": "累计收录 {total} 条，覆盖 {targetCount} 个目标笔记。",
  "stats.target": "目标笔记",
  "stats.path": "路径",
  "stats.count": "条数",
  "stats.lastAt": "最近收录",
  "stats.hint":
    "统计按目标笔记路径累计；目标笔记被重命名后，旧统计会保留在原路径下。",

  "preset.plain": "纯文本（仅选中内容）",
  "preset.source": "带来源标注",
  "preset.timestamp": "带时间戳",
  "preset.sourceTimestamp": "带来源和时间",
  "preset.separator": "带分隔符 ---",
  "preset.template.plain": "{{content}}",
  "preset.template.source":
    "> 摘自 {{sourceLink}}\n\n{{content}}",
  "preset.template.timestamp":
    "{{content}}\n\n> 收录于 {{datetime}}",
  "preset.template.sourceTimestamp":
    "> 摘自 {{sourceLink}} · {{datetime}}\n\n{{content}}",
  "preset.template.separator": "---\n\n{{content}}",

  "default.heading": "## 收录",

  "settings.title": "Excerpt Collector 设置",
  "settings.intro":
    "选中任意笔记中的文字，一键复制收录到预设的目标笔记。源笔记永远不会被修改。",
  "settings.targets": "收录目标（{count}）",
  "settings.targetsHint":
    "显示名称用于选择框和成功提示；路径必须是库内 Markdown 笔记的完整路径。数字编号可选，用于快速选择。",
  "settings.noTargets":
    "还没有收录目标。点击下方「添加收录目标」创建一个，或在开启全库搜索时直接从任意笔记中选择。",
  "settings.addTarget": "添加收录目标",
  "settings.targetLabel": "目标 {index}",
  "settings.noNumber": "无编号",
  "settings.numberOption": "编号 {number}",
  "settings.numberAria": "编号",
  "settings.chooseFileTooltip": "从库中选择笔记",
  "settings.deleteTargetTooltip": "删除该收录目标",
  "settings.targetNamePlaceholder": "显示名称",
  "settings.targetPathPlaceholder": "目标笔记路径，例如：收录/摘录集.md",
  "settings.targetNameAria": "目标显示名称",
  "settings.targetPathAria": "目标笔记路径",
  "settings.newTargetName": "新收录目标",
  "settings.statusNoPath": "尚未设置目标路径。",
  "settings.statusFound": "✓ 已找到笔记：{path}",
  "settings.statusNotMarkdown": "目标是文件，但不是 Markdown 笔记。",
  "settings.statusMissing": "⚠ 找不到目标笔记，收录时会提示错误。",
  "settings.formatSection": "收录格式",
  "settings.preset": "套用格式预设",
  "settings.presetDesc":
    "选择预设会覆盖下方模板；也可以直接编辑模板。",
  "settings.choosePreset": "选择预设…",
  "settings.template": "追加格式模板",
  "settings.templateDesc":
    "支持 {{content}} {{source}} {{date}} 等占位符，模板必须包含 {{content}}。",
  "settings.templateWarning":
    "⚠ 模板缺少 {{content}} 占位符，收录会被阻止，以免丢失选中内容。",
  "settings.placeholdersSummary": "查看可用占位符",
  "settings.placeholder.content": "选中的正文（必填）",
  "settings.placeholder.source": "源笔记名（不含扩展名）",
  "settings.placeholder.sourceLink": "源笔记链接，如 [[笔记名]]",
  "settings.placeholder.sourcePath": "源笔记在库中的完整路径",
  "settings.placeholder.target": "目标笔记的显示名称",
  "settings.placeholder.targetPath": "目标笔记的完整路径",
  "settings.placeholder.date": "本地日期，YYYY-MM-DD",
  "settings.placeholder.time": "本地时间，HH:mm",
  "settings.placeholder.datetime": "本地日期时间，YYYY-MM-DD HH:mm",
  "settings.placeholder.weekday": "星期几，如 周五",
  "settings.insertPosition": "默认插入位置",
  "settings.insertPositionDesc":
    "「开头」会插入到 YAML frontmatter 之后，避免破坏元数据。",
  "settings.posEnd": "末尾",
  "settings.posStart": "开头",
  "settings.posHeading": "指定标题下",
  "settings.heading": "目标标题",
  "settings.headingDesc":
    "例如：## 收录。内容会插入到该标题所在章节的末尾；找不到标题时回退到笔记末尾。仅支持 # 开头的 ATX 标题。",
  "settings.behaviorSection": "行为",
  "settings.contextMenu": "启用编辑器右键菜单",
  "settings.contextMenuDesc":
    "在编辑器中选中文字后右键，显示「收录到笔记」。",
  "settings.defaultHotkey": "启用默认快捷键",
  "settings.defaultHotkeyDesc":
    "默认 Cmd/Ctrl+Shift+E；修改此项后需要重新加载插件才会生效。",
  "settings.hotkeyNotice": "默认快捷键将在重新加载插件后生效。",
  "settings.vaultSearch": "允许从全库模糊搜索",
  "settings.vaultSearchDesc":
    "目标选择框除预设目标外，还会列出库内其他 Markdown 笔记，作为一次性目标。",
  "settings.numberSelect": "启用数字编号快速选择",
  "settings.numberSelectDesc":
    "在目标选择框中按 1-9 直接选择；同时启用「收录到编号 N 的目标」命令，可自行绑定快捷键以跳过弹窗。",
  "settings.pathScope": "路径范围限制",
  "settings.pathScopeDesc":
    "留空表示不限制。每行或逗号分隔一个 glob，例如：摘录源/**、课程笔记/*.md。不含通配符且无扩展名的规则按文件夹处理。",
  "settings.scopePlaceholder": "摘录源/**\n课程笔记/*.md",
  "settings.scopeNoActive": "当前没有打开的笔记。",
  "settings.scopeUnrestricted":
    "当前未限制路径范围；打开的笔记「{name}」可收录。",
  "settings.scopeInside": "当前笔记「{name}」在范围内。",
  "settings.scopeOutside":
    "当前笔记「{name}」不在范围内，收录命令会被隐藏。",
  "settings.maintenanceSection": "统计与维护",
  "settings.stats": "收录统计",
  "settings.statsDesc": "累计收录 {total} 条，覆盖 {targetCount} 个目标笔记。",
  "settings.viewDetails": "查看详情",
  "settings.undoHistory": "撤销记录",
  "settings.undoHistoryDesc":
    "当前保存 {count} 条可撤销记录（最多 {limit} 条）。",
  "settings.clearUndo": "清空撤销记录",
  "settings.clearUndoTitle": "清空撤销记录",
  "settings.clearUndoMessage":
    "这会移除所有「撤销上一次收录」的历史记录，但不会删除已收录的内容。",
  "settings.clear": "清空",
  "settings.clearStats": "清空统计",
  "settings.clearStatsDesc": "只清空计数数据，不会修改任何笔记内容。",
  "settings.clearStatsTitle": "清空收录统计",
  "settings.clearStatsMessage":
    "确定清空所有收录计数吗？笔记内容不会受到影响。",
  "settings.footer":
    "Excerpt Collector v{version} · 本插件不会修改源笔记",
  "settings.errorAction": "操作失败，请查看开发者控制台日志。",
};

const DICTIONARIES: Record<
  PluginLanguage,
  Record<TranslationKey, string>
> = {
  en: EN,
  zh: ZH,
};

const WEEKDAYS: Record<PluginLanguage, string[]> = {
  en: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ],
  zh: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
};

let currentLanguage: PluginLanguage | null = null;

/** 将任意语言代码归一化为插件支持的语言；未知语言回退英文 */
export function detectLanguage(
  raw: string | null | undefined,
): PluginLanguage {
  const code = (raw ?? "").trim().toLowerCase();
  return code.startsWith("zh") ? "zh" : "en";
}

/** 初始化/切换语言（插件 onload 时调用） */
export function initI18n(
  rawLanguage?: string | null,
): PluginLanguage {
  currentLanguage = detectLanguage(rawLanguage);
  return currentLanguage;
}

export function getI18nLanguage(): PluginLanguage {
  return currentLanguage ?? "en";
}

/** 翻译指定 key，并替换 {name} 形式的参数 */
export function t(
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  const dictionary = DICTIONARIES[getI18nLanguage()];
  let text = dictionary[key] ?? EN[key] ?? key;

  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }

  return text;
}

/** 返回当前语言的星期名称数组（用于 {{weekday}}） */
export function getWeekdayNames(): string[] {
  return [...WEEKDAYS[getI18nLanguage()]];
}

/** 新安装时的默认标题（随界面语言变化） */
export function getDefaultHeading(): string {
  return t("default.heading");
}

/** 判断目标名称是否仍是“新收录目标”的默认值（任一语言） */
export function isDefaultTargetName(name: string): boolean {
  const normalized = name.trim();
  return (
    normalized === EN["settings.newTargetName"] ||
    normalized === ZH["settings.newTargetName"]
  );
}
