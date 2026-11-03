import type { TranslationKey } from "./i18n";
import type { ExcerptCollectorSettings } from "./types";

/** 撤销栈最大长度，避免 data.json 无限增长 */
export const UNDO_LIMIT = 50;

/** 阅读视图选区快照的有效期（毫秒） */
export const READING_SELECTION_TTL = 90_000;

/** 默认设置 */
export const DEFAULT_SETTINGS: ExcerptCollectorSettings = {
  targets: [],
  insertPosition: "end",
  // 实际默认值会在加载时按界面语言生成，这里使用英文回退值
  heading: "## Excerpts",
  template: "{{content}}",
  enableContextMenu: true,
  enableDefaultHotkey: true,
  pathScope: "",
  allowVaultSearch: true,
  enableNumberSelect: true,
};

/** 追加格式预设：选择后覆盖模板 */
export interface TemplatePreset {
  key: string;
  /** 名称翻译 key，由设置面板通过 t() 渲染 */
  labelKey: TranslationKey;
  /** 模板内容翻译 key，选择预设时通过 t() 生成 */
  templateKey: TranslationKey;
}

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    key: "plain",
    labelKey: "preset.plain",
    templateKey: "preset.template.plain",
  },
  {
    key: "source",
    labelKey: "preset.source",
    templateKey: "preset.template.source",
  },
  {
    key: "timestamp",
    labelKey: "preset.timestamp",
    templateKey: "preset.template.timestamp",
  },
  {
    key: "source-timestamp",
    labelKey: "preset.sourceTimestamp",
    templateKey: "preset.template.sourceTimestamp",
  },
  {
    key: "separator",
    labelKey: "preset.separator",
    templateKey: "preset.template.separator",
  },
];

/** 生成一个足够唯一的本地 ID（不依赖 crypto.randomUUID，兼容移动端旧内核） */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
