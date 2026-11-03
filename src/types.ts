import type { TFile } from "obsidian";

/**
 * 收录目标：设置面板中维护的一本目标笔记。
 */
export interface CollectTarget {
  /** 稳定 ID，用于设置面板增删改时定位目标 */
  id: string;
  /** 显示名称，例如「摘录集」 */
  name: string;
  /** 目标笔记在库中的完整路径，例如「收录/摘录集.md」 */
  path: string;
  /** 可选数字编号（1-9），0 表示不分配 */
  number: number;
}

/** 追加到目标笔记中的位置 */
export type InsertPosition = "end" | "start" | "heading";

/** 插件设置，会持久化到 data.json */
export interface ExcerptCollectorSettings {
  /** 预设收录目标列表 */
  targets: CollectTarget[];
  /** 默认插入位置：末尾 / 开头 / 指定标题下 */
  insertPosition: InsertPosition;
  /** 指定标题（仅在 insertPosition 为 heading 时使用），例如「## 收录」 */
  heading: string;
  /** 追加格式模板，支持 {{content}} 等占位符 */
  template: string;
  /** 是否在编辑器右键菜单中显示「收录到笔记」 */
  enableContextMenu: boolean;
  /** 是否注册默认快捷键 Cmd/Ctrl+Shift+E（需要重新加载插件生效） */
  enableDefaultHotkey: boolean;
  /** 路径范围限制（glob），留空则不限 */
  pathScope: string;
  /** 目标选择框是否允许从全库 Markdown 文档中模糊搜索 */
  allowVaultSearch: boolean;
  /** 是否启用数字编号快速选择（1-9） */
  enableNumberSelect: boolean;
}

/** 一次收录的撤销记录 */
export interface UndoRecord {
  id: string;
  targetPath: string;
  targetName: string;
  sourcePath: string;
  sourceName: string;
  /** 本次实际插入的完整文本（包含插件补充的换行） */
  insertedText: string;
  /** 插入内容在写入后目标文件中的起始偏移量 */
  offset: number;
  /** ISO 时间字符串 */
  createdAt: string;
}

/** 按目标笔记路径累计的收录统计 */
export interface TargetStats {
  count: number;
  /** 最近一次收录的 ISO 时间 */
  lastAt: string;
}

/** data.json 的完整结构 */
export interface PluginData {
  settings: ExcerptCollectorSettings;
  /** 撤销栈，后进先出 */
  undoStack: UndoRecord[];
  /** 统计信息：key 为目标笔记路径 */
  stats: Record<string, TargetStats>;
}

/** 一次待收录操作捕获的上下文：选中文本 + 源笔记 */
export interface CollectRequest {
  text: string;
  sourceFile: TFile;
  sourceMode: "editor" | "preview";
}

/** 阅读视图选区快照：命令面板可能清空 DOM 选区，用它兜底 */
export interface SelectionSnapshot {
  text: string;
  path: string;
  /** 捕获时间戳（毫秒） */
  capturedAt: number;
}
