import type { App, Editor, EditorPosition } from "obsidian";
import { MarkdownView } from "obsidian";
import type { CollectRequest, SelectionSnapshot } from "./types";
import { READING_SELECTION_TTL } from "./constants";

/** 比较两个编辑器位置的前后顺序 */
function comparePosition(a: EditorPosition, b: EditorPosition): number {
  return a.line - b.line || a.ch - b.ch;
}

/**
 * 获取编辑器中的全部选区文字（支持多光标批量收录）。
 * 只读取编辑器状态，绝不调用 replaceSelection 等写操作。
 */
export function getEditorSelectionsText(editor: Editor): string | null {
  const normalized = editor
    .listSelections()
    .map((selection) => {
      const forward =
        comparePosition(selection.anchor, selection.head) <= 0;
      return forward
        ? { from: selection.anchor, to: selection.head }
        : { from: selection.head, to: selection.anchor };
    })
    .sort(
      (a, b) =>
        comparePosition(a.from, b.from) || comparePosition(a.to, b.to),
    );

  const seen = new Set<string>();
  const parts: string[] = [];

  for (const { from, to } of normalized) {
    if (from.line === to.line && from.ch === to.ch) {
      continue;
    }

    const key = `${from.line}:${from.ch}-${to.line}:${to.ch}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    const text = editor.getRange(from, to).trim();
    if (text.length > 0) {
      parts.push(text);
    }
  }

  return parts.length > 0 ? parts.join("\n\n") : null;
}

/**
 * 读取阅读视图中的 DOM 选区。
 * 使用视图所在窗口的 Selection，兼容弹出窗口。
 */
export function getPreviewSelectionText(
  view: MarkdownView,
): string | null {
  if (view.getMode() !== "preview") {
    return null;
  }

  const doc = view.containerEl.ownerDocument;
  const selection = doc.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return null;
  }

  const text = selection.toString().trim();
  if (!text) {
    return null;
  }

  const previewEl =
    view.containerEl.querySelector(".markdown-preview-view") ??
    view.containerEl;
  if (!previewEl) {
    return null;
  }

  // 确保选区确实位于当前阅读视图内，排除侧边栏或弹窗中的选中文字
  const anchor = selection.anchorNode;
  const focus = selection.focusNode;
  if (
    !anchor ||
    !focus ||
    !previewEl.contains(anchor) ||
    !previewEl.contains(focus)
  ) {
    return null;
  }

  return text.replace(/\r\n/g, "\n");
}

/**
 * 从当前活动视图捕获待收录内容。
 * 编辑视图使用 Editor 选区；阅读视图使用 DOM 选区或最近一次快照。
 */
export function getCollectRequest(
  app: App,
  snapshot: SelectionSnapshot | null,
): CollectRequest | null {
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  const file = app.workspace.getActiveFile();

  if (!view || !file || file.extension.toLowerCase() !== "md") {
    return null;
  }

  if (view.getMode() === "preview") {
    let text = getPreviewSelectionText(view);

    // 命令面板可能会清空 DOM 选区，使用最近捕获的快照兜底
    if (
      !text &&
      snapshot &&
      snapshot.path === file.path &&
      Date.now() - snapshot.capturedAt <= READING_SELECTION_TTL
    ) {
      text = snapshot.text;
    }

    if (!text) {
      return null;
    }

    return {
      text,
      sourceFile: file,
      sourceMode: "preview",
    };
  }

  const text = view.editor ? getEditorSelectionsText(view.editor) : null;
  if (!text) {
    return null;
  }

  return {
    text,
    sourceFile: file,
    sourceMode: "editor",
  };
}

/**
 * 更新阅读视图选区快照。
 * - 只有阅读视图里存在非空选区时才更新；
 * - 选区被命令面板清空时不覆盖旧快照。
 */
export function captureReadingSnapshot(
  app: App,
  current: SelectionSnapshot | null,
): SelectionSnapshot | null {
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  const file = app.workspace.getActiveFile();

  if (!view || !file || file.extension.toLowerCase() !== "md") {
    return current;
  }
  if (view.getMode() !== "preview") {
    return current;
  }

  const text = getPreviewSelectionText(view);
  if (!text) {
    return current;
  }

  return {
    text,
    path: file.path,
    capturedAt: Date.now(),
  };
}
