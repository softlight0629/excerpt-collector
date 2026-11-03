import type { InsertPosition } from "./types";

/**
 * 本文件只包含纯函数（不依赖 Obsidian API），便于单元测试。
 * 所有函数都不会修改源笔记，只负责生成要写入目标笔记的文本。
 */

export interface TemplateContext {
  content: string;
  source: string;
  sourcePath: string;
  sourceLink: string;
  target: string;
  targetPath: string;
  date: string;
  time: string;
  datetime: string;
  weekday: string;
}

export interface DateParts {
  date: string;
  time: string;
  datetime: string;
  weekday: string;
}

export interface HeadingInsertionResult {
  /** 插入点在该章节末尾的字符偏移量 */
  offset: number;
  /** 是否真的找到了指定标题 */
  found: boolean;
}

export interface InsertionResult {
  /** 写入后的完整文件内容 */
  content: string;
  /** 实际插入的完整文本（含插件补充的换行），撤销时按原样移除 */
  insertedText: string;
  /** 插入文本在写入后文件中的起始偏移量 */
  offset: number;
  /** 指定标题模式下是否找到标题 */
  headingFound: boolean;
}

const PLACEHOLDER_RE =
  /\{\{\s*(content|source|sourcePath|sourceLink|target|targetPath|date|time|datetime|weekday)\s*\}\}/g;

/** 默认星期名称（中文）；插件运行时会传入当前界面语言对应的名称 */
const DEFAULT_WEEKDAYS = [
  "周日",
  "周一",
  "周二",
  "周三",
  "周四",
  "周五",
  "周六",
];

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** 获取本地时区的日期/时间片段 */
export function getDateParts(
  now: Date = new Date(),
  weekdayLabels: string[] = DEFAULT_WEEKDAYS,
): DateParts {
  const date = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(
    now.getDate(),
  )}`;
  const time = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  return {
    date,
    time,
    datetime: `${date} ${time}`,
    weekday: weekdayLabels[now.getDay()] ?? "",
  };
}

/** 模板是否包含必需的 {{content}} 占位符 */
export function containsContentPlaceholder(template: string): boolean {
  return /\{\{\s*content\s*\}\}/.test(template);
}

/**
 * 渲染模板。
 * 只对模板本身做一次替换，选中文本里即使含有 {{date}} 也不会被二次替换。
 */
export function renderTemplate(
  template: string,
  context: TemplateContext,
): string {
  return template.replace(PLACEHOLDER_RE, (_match, key: string) => {
    const value = context[key as keyof TemplateContext];
    return typeof value === "string" ? value : "";
  });
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 统一库内路径：去除首尾空白、反斜杠转正斜杠、去掉开头的 / */
export function normalizeVaultPath(path: string): string {
  return path.trim().replace(/\\/g, "/").replace(/^\/+/, "");
}

/**
 * 将 glob 转换为正则：
 *   *  匹配单段（不跨 /）
 *   ** 匹配任意字符（可跨 /）
 *   ?  匹配单个非 / 字符
 * 路径匹配不区分大小写，兼容 Windows 与中文路径。
 */
export function globToRegExp(pattern: string): RegExp {
  const normalized = pattern.replace(/\\/g, "/");
  let regex = "";

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];

    if (char === "*") {
      if (normalized[i + 1] === "*") {
        // ** 可跨目录
        regex += ".*";
        i += 1;
        // 吃掉紧跟的 "/"，使 a/**/b 也能匹配 a/b
        if (normalized[i + 1] === "/") {
          i += 1;
        }
      } else {
        regex += "[^/]*";
      }
    } else if (char === "?") {
      regex += "[^/]";
    } else {
      regex += escapeRegExp(char);
    }
  }

  return new RegExp(`^${regex}$`, "i");
}

/**
 * 判断笔记路径是否匹配设置中的路径范围。
 * 多个规则可用换行、英文逗号或中文逗号分隔；留空表示不限制。
 * 不含通配符且没有扩展名的规则按文件夹处理（如「摘录源」等价于「摘录源/**」）。
 */
export function matchesPathScope(path: string, scope: string): boolean {
  const patterns = scope
    .split(/[\n,，]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (patterns.length === 0) {
    return true;
  }

  const normalizedPath = normalizeVaultPath(path);

  return patterns.some((pattern) => {
    let normalizedPattern = normalizeVaultPath(pattern);

    if (!/[*?]/.test(normalizedPattern) && !/\.[A-Za-z0-9]+$/.test(normalizedPattern)) {
      // 只写了文件夹名/路径：按该文件夹下所有笔记处理
      normalizedPattern = `${normalizedPattern.replace(/\/+$/, "")}/**`;
    } else if (normalizedPattern.endsWith("/")) {
      normalizedPattern += "**";
    }

    return globToRegExp(normalizedPattern).test(normalizedPath);
  });
}

/** 找到 YAML frontmatter 结束后的偏移量；没有 frontmatter 时返回 0 */
export function findStartInsertOffset(content: string): number {
  const normalized = content.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");

  if ((lines[0] ?? "").trim() !== "---") {
    return 0;
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "---" || line === "...") {
      let offset = 0;
      for (let j = 0; j <= i; j++) {
        offset += lines[j].length + 1;
      }
      return Math.min(offset, normalized.length);
    }
  }

  return 0;
}

/**
 * 找到指定标题所在章节的末尾偏移量。
 * - 支持「## 收录」或只写「收录」；只写文字时匹配任意级别标题。
 * - 推荐使用 ATX 标题（# 开头），不解析 Setext 标题。
 * - 忽略代码块中的伪标题。
 */
export function findHeadingInsertOffset(
  content: string,
  heading: string,
): HeadingInsertionResult {
  const normalized = content.replace(/\r\n/g, "\n");
  const spec = heading.trim();

  if (!spec) {
    return { offset: normalized.length, found: false };
  }

  const hashMatch = spec.match(/^(#{1,6})\s+(.+)$/);
  const wantedLevel = hashMatch ? hashMatch[1].length : null;
  const wantedText = (hashMatch ? hashMatch[2] : spec)
    .replace(/\s+#+\s*$/, "")
    .trim();

  if (!wantedText) {
    return { offset: normalized.length, found: false };
  }

  const lines = normalized.split("\n");
  const frontmatterEnd = findStartInsertOffset(normalized);
  let offset = 0;
  let foundLevel: number | null = null;
  let fenceChar: string | null = null;
  let fenceLength = 0;

  for (const line of lines) {
    // 跳过 YAML frontmatter，避免把 YAML 注释里的 # 当成标题
    if (offset < frontmatterEnd) {
      offset += line.length + 1;
      continue;
    }

    // 跟踪代码围栏，避免把代码块里的 # 当成标题
    const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      const markerChar = marker[0];
      if (fenceChar === null) {
        fenceChar = markerChar;
        fenceLength = marker.length;
      } else if (
        fenceChar === markerChar &&
        marker.length >= fenceLength
      ) {
        fenceChar = null;
        fenceLength = 0;
      }
      offset += line.length + 1;
      continue;
    }

    if (fenceChar === null) {
      const headingMatch = line.match(/^ {0,3}(#{1,6})[ \t]+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2].replace(/\s+#+\s*$/, "").trim();

        // 已找到目标章节后，遇到同级或更高级标题即视为章节结束
        if (foundLevel !== null && level <= foundLevel) {
          return { offset, found: true };
        }

        if (
          foundLevel === null &&
          text === wantedText &&
          (wantedLevel === null || level === wantedLevel)
        ) {
          foundLevel = level;
        }
      }
    }

    offset += line.length + 1;
  }

  if (foundLevel !== null) {
    return { offset: normalized.length, found: true };
  }

  return { offset: normalized.length, found: false };
}

/** 去掉条目首尾多余的空行，保留正文本身（包括缩进） */
function normalizeEntry(entry: string): string {
  return entry
    .replace(/\r\n/g, "\n")
    .replace(/^\n+/, "")
    .replace(/\n+$/, "");
}

/**
 * 把一条收录内容插入到目标文本中。
 *
 * 插入位置：
 * - end：文件末尾（默认）
 * - start：YAML frontmatter 之后；没有 frontmatter 时就是文件开头
 * - heading：指定标题所在章节的末尾；找不到标题时回退到文件末尾
 *
 * 会自动补齐合适的空行，保证 Markdown 结构清晰；返回的 insertedText
 * 是包含补齐换行的完整插入片段，撤销时按原样删除即可精确还原。
 */
export function insertEntry(
  content: string,
  entry: string,
  position: InsertPosition,
  heading = "",
): InsertionResult {
  const normalized = content.replace(/\r\n/g, "\n");
  const body = normalizeEntry(entry);
  let offset = normalized.length;
  let headingFound = true;

  if (position === "start") {
    offset = findStartInsertOffset(normalized);
  } else if (position === "heading") {
    const result = findHeadingInsertOffset(normalized, heading);
    offset = result.offset;
    headingFound = result.found;
  }

  const before = normalized.slice(0, offset);
  const after = normalized.slice(offset);

  // 条目与上方内容之间至少空一行
  let lead = "";
  if (before.length > 0) {
    if (before.endsWith("\n\n")) {
      lead = "";
    } else if (before.endsWith("\n")) {
      lead = "\n";
    } else {
      lead = "\n\n";
    }
  }

  // 条目与下方内容之间至少空一行；文件末尾则保留一个换行
  let tail = "";
  if (after.length > 0) {
    if (after.startsWith("\n\n")) {
      tail = "";
    } else if (after.startsWith("\n")) {
      tail = "\n";
    } else {
      tail = "\n\n";
    }
  } else {
    tail = "\n";
  }

  const insertedText = `${lead}${body}${tail}`;

  return {
    content: `${before}${insertedText}${after}`,
    insertedText,
    offset,
    headingFound,
  };
}

/**
 * 在目标文件中定位之前插入的内容。
 * 优先用记录中的偏移量校验；若文件被编辑过导致偏移变化，则退回查找最后一段相同文本。
 * 找不到返回 -1。
 */
export function locateInsertedText(
  content: string,
  insertedText: string,
  offset: number,
): number {
  if (!insertedText) {
    return -1;
  }

  if (
    offset >= 0 &&
    offset <= content.length &&
    content.startsWith(insertedText, offset)
  ) {
    return offset;
  }

  return content.lastIndexOf(insertedText);
}
