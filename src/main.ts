import {
  Notice,
  Plugin,
  TFile,
  debounce,
  moment,
  type Menu,
} from "obsidian";
import {
  DEFAULT_SETTINGS,
  UNDO_LIMIT,
  generateId,
} from "./constants";
import {
  containsContentPlaceholder,
  getDateParts,
  insertEntry,
  locateInsertedText,
  matchesPathScope,
  normalizeVaultPath,
  renderTemplate,
  type InsertionResult,
  type TemplateContext,
} from "./format";
import {
  getDefaultHeading,
  getWeekdayNames,
  initI18n,
  t,
} from "./i18n";
import { captureReadingSnapshot, getCollectRequest, getEditorSelectionsText } from "./selection";
import {
  StatsModal,
  TargetPickerModal,
} from "./picker";
import { ExcerptCollectorSettingTab } from "./settings";
import type {
  CollectRequest,
  CollectTarget,
  ExcerptCollectorSettings,
  InsertPosition,
  PluginData,
  SelectionSnapshot,
  TargetStats,
  UndoRecord,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readInsertPosition(value: unknown): InsertPosition {
  return value === "start" || value === "heading" || value === "end"
    ? value
    : "end";
}

/**
 * 读取 Obsidian 界面语言。
 * Obsidian 会把 moment 的 locale 同步为界面语言（如 zh-cn / en），
 * 该 API 兼容插件声明的最低版本，不依赖较新的 getLanguage()。
 */
function detectAppLanguage(): string {
  try {
    return moment.locale();
  } catch {
    return "en";
  }
}

/** 将未知数据整理成合法的收录目标 */
function normalizeTarget(value: unknown): CollectTarget {
  const data = isRecord(value) ? value : {};
  const number = typeof data.number === "number" ? data.number : 0;
  return {
    id: readString(data.id, "") || generateId(),
    name: readString(data.name, ""),
    path: normalizeVaultPath(readString(data.path, "")),
    number: Number.isInteger(number) ? number : 0,
  };
}

/** 校验并整理撤销记录 */
function normalizeUndoStack(value: unknown): UndoRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry): UndoRecord | null => {
      if (!isRecord(entry)) {
        return null;
      }
      const targetPath = normalizeVaultPath(
        readString(entry.targetPath, ""),
      );
      const insertedText = readString(entry.insertedText, "");
      if (!targetPath || !insertedText) {
        return null;
      }
      return {
        id: readString(entry.id, "") || generateId(),
        targetPath,
        targetName: readString(entry.targetName, "") || targetPath,
        sourcePath: normalizeVaultPath(
          readString(entry.sourcePath, ""),
        ),
        sourceName: readString(entry.sourceName, ""),
        insertedText,
        offset: typeof entry.offset === "number" ? entry.offset : -1,
        createdAt: readString(entry.createdAt, ""),
      };
    })
    .filter((entry): entry is UndoRecord => entry !== null)
    .slice(-UNDO_LIMIT);
}

/** 校验并整理统计信息 */
function normalizeStats(value: unknown): Record<string, TargetStats> {
  if (!isRecord(value)) {
    return {};
  }

  const stats: Record<string, TargetStats> = {};
  for (const [path, entry] of Object.entries(value)) {
    if (!isRecord(entry)) {
      continue;
    }
    const count =
      typeof entry.count === "number" && Number.isFinite(entry.count)
        ? Math.max(0, Math.floor(entry.count))
        : 0;
    stats[path] = {
      count,
      lastAt: readString(entry.lastAt, ""),
    };
  }
  return stats;
}

/**
 * Excerpt Collector 主类。
 *
 * 核心约束：本插件只读取源笔记的选区，绝不调用 replaceSelection 或任何
 * 修改源笔记的编辑器写操作。唯一会写入的文件是用户选择的目标笔记。
 */
export default class ExcerptCollectorPlugin extends Plugin {
  settings: ExcerptCollectorSettings = {
    ...DEFAULT_SETTINGS,
    targets: [],
  };

  pluginData: PluginData = {
    settings: this.settings,
    undoStack: [],
    stats: {},
  };

  /** 阅读视图选区快照，命令面板清空 DOM 选区后用来兜底 */
  private readingSnapshot: SelectionSnapshot | null = null;

  /** 串行化 data.json 写入，避免并发保存互相覆盖 */
  private saveChain: Promise<unknown> = Promise.resolve();

  /** 监听阅读视图选区变化（防抖） */
  private readonly captureSelection = debounce(() => {
    this.readingSnapshot = captureReadingSnapshot(
      this.app,
      this.readingSnapshot,
    );
  }, 150, true);

  async onload(): Promise<void> {
    // 在生成默认值、注册命令和构建设置面板之前确定界面语言
    initI18n(detectAppLanguage());

    await this.loadPluginData();

    this.registerCommands();
    this.registerEditorMenu();

    this.addRibbonIcon("archive", t("ribbon.collect"), () => {
      void this.openTargetPicker();
    });

    this.addSettingTab(new ExcerptCollectorSettingTab(this.app, this));

    // 持续记录阅读视图中的选区，解决命令面板导致选区丢失的问题
    this.registerDomEvent(document, "selectionchange", () => {
      this.captureSelection();
    });

    // 切换笔记后丢弃旧快照，避免把上一篇的选区带到当前笔记
    this.registerEvent(
      this.app.workspace.on("file-open", () => {
        this.readingSnapshot = null;
      }),
    );
  }

  onunload(): void {
    this.captureSelection.cancel();
  }

  // ---------------------------------------------------------------------------
  // 数据读写
  // ---------------------------------------------------------------------------

  private async loadPluginData(): Promise<void> {
    let raw: unknown = null;
    try {
      raw = await this.loadData();
    } catch (error) {
      // data.json 损坏时退回默认设置，避免整个插件无法加载
      console.error(
        "[Excerpt Collector] 读取插件数据失败，使用默认设置",
        error,
      );
    }

    const rawObject = isRecord(raw) ? raw : {};
    const stored = isRecord(rawObject.settings)
      ? rawObject.settings
      : rawObject;

    const targets = Array.isArray(stored.targets)
      ? stored.targets.map(normalizeTarget)
      : [];

    // 保证 1-9 编号唯一；重复或越界的编号会被清空
    const usedNumbers = new Set<number>();
    for (const target of targets) {
      if (
        !Number.isInteger(target.number) ||
        target.number < 1 ||
        target.number > 9 ||
        usedNumbers.has(target.number)
      ) {
        target.number = 0;
      } else {
        usedNumbers.add(target.number);
      }
    }

    const settings: ExcerptCollectorSettings = {
      targets,
      insertPosition: readInsertPosition(stored.insertPosition),
      heading: readString(stored.heading, getDefaultHeading()),
      template: readString(stored.template, DEFAULT_SETTINGS.template),
      enableContextMenu: readBoolean(
        stored.enableContextMenu,
        DEFAULT_SETTINGS.enableContextMenu,
      ),
      enableDefaultHotkey: readBoolean(
        stored.enableDefaultHotkey,
        DEFAULT_SETTINGS.enableDefaultHotkey,
      ),
      pathScope: readString(stored.pathScope, DEFAULT_SETTINGS.pathScope),
      allowVaultSearch: readBoolean(
        stored.allowVaultSearch,
        DEFAULT_SETTINGS.allowVaultSearch,
      ),
      enableNumberSelect: readBoolean(
        stored.enableNumberSelect,
        DEFAULT_SETTINGS.enableNumberSelect,
      ),
    };

    this.settings = settings;
    this.pluginData = {
      settings,
      undoStack: normalizeUndoStack(rawObject.undoStack),
      stats: normalizeStats(rawObject.stats),
    };
  }

  /** 保存设置与撤销/统计信息（串行执行，失败只记录日志不打断用户操作） */
  saveSettings(): Promise<void> {
    this.saveChain = this.saveChain
      .catch(() => undefined)
      .then(() => this.saveData(this.pluginData));

    return this.saveChain.then(
      () => undefined,
      (error: unknown) => {
        console.error("[Excerpt Collector] 保存插件数据失败", error);
      },
    );
  }

  // ---------------------------------------------------------------------------
  // 对外查询
  // ---------------------------------------------------------------------------

  /** 根据目标路径获取显示名（优先使用设置中的显示名称） */
  getDisplayNameForPath(path: string): string {
    const target = this.settings.targets.find((item) => item.path === path);
    if (target && target.name.trim()) {
      return target.name;
    }
    const filename = path.split("/").pop() ?? path;
    return filename.replace(/\.md$/i, "");
  }

  /** 根据数字编号查找收录目标 */
  getTargetByNumber(number: number): CollectTarget | null {
    return (
      this.settings.targets.find(
        (target) => target.number === number && target.path.trim() !== "",
      ) ?? null
    );
  }

  /** 当前活动笔记是否为 Markdown 文件 */
  getActiveMarkdownFile(): TFile | null {
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension.toLowerCase() !== "md") {
      return null;
    }
    return file;
  }

  /** 路径是否在设置的范围内（留空则始终为 true） */
  isPathInScope(path: string): boolean {
    return matchesPathScope(path, this.settings.pathScope);
  }

  /** 打开本插件的设置面板（使用 Obsidian 内部设置 API，失败时给出提示） */
  openSettings(): void {
    const internal = this.app as unknown as {
      setting?: {
        open?: () => void;
        openTabById?: (id: string) => void;
      };
    };

    if (internal.setting?.open && internal.setting.openTabById) {
      internal.setting.open();
      internal.setting.openTabById(this.manifest.id);
      return;
    }

    new Notice(t("notice.openSettingsHint"));
  }

  // ---------------------------------------------------------------------------
  // 命令与菜单注册
  // ---------------------------------------------------------------------------

  private registerCommands(): void {
    this.addCommand({
      id: "collect-selection",
      name: t("command.collect"),
      hotkeys: this.settings.enableDefaultHotkey
        ? [{ modifiers: ["Mod", "Shift"], key: "e" }]
        : [],
      checkCallback: (checking) => {
        const file = this.getActiveMarkdownFile();
        if (!file || !this.isPathInScope(file.path)) {
          return false;
        }
        if (!checking) {
          void this.openTargetPicker();
        }
        return true;
      },
    });

    this.addCommand({
      id: "undo-last-collection",
      name: t("command.undo"),
      checkCallback: (checking) => {
        if (this.pluginData.undoStack.length === 0) {
          return false;
        }
        if (!checking) {
          void this.undoLastCollection();
        }
        return true;
      },
    });

    this.addCommand({
      id: "show-collection-stats",
      name: t("command.stats"),
      callback: () => {
        new StatsModal(this.app, this).open();
      },
    });

    // 数字编号快捷命令：用户可在 Obsidian 快捷键设置中绑定按键，跳过选择框
    for (let number = 1; number <= 9; number++) {
      this.addCommand({
        id: `collect-to-number-${number}`,
        name: t("command.collectNumber", { number }),
        checkCallback: (checking) => {
          if (!this.settings.enableNumberSelect) {
            return false;
          }
          const file = this.getActiveMarkdownFile();
          if (!file || !this.isPathInScope(file.path)) {
            return false;
          }
          if (!this.getTargetByNumber(number)) {
            return false;
          }
          if (!checking) {
            this.collectToNumber(number);
          }
          return true;
        },
      });
    }
  }

  private registerEditorMenu(): void {
    this.registerEvent(
      this.app.workspace.on(
        "editor-menu",
        (menu: Menu, editor, view) => {
          if (!this.settings.enableContextMenu) {
            return;
          }

          const file = view.file;
          if (!file || file.extension.toLowerCase() !== "md") {
            return;
          }
          if (!this.isPathInScope(file.path)) {
            return;
          }

          // 在右键菜单打开时就冻结选区文字，避免后续焦点变化导致选区丢失
          const text = getEditorSelectionsText(editor);
          if (!text) {
            return;
          }

          const request: CollectRequest = {
            text,
            sourceFile: file,
            sourceMode: "editor",
          };

          menu.addItem((item) => {
            item
              .setTitle(t("menu.collect"))
              .setIcon("archive")
              .onClick(() => {
                this.openTargetPickerFor(request);
              });
          });
        },
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // 收录流程
  // ---------------------------------------------------------------------------

  /** 命令/功能区按钮入口：读取当前选区并打开目标选择框 */
  async openTargetPicker(): Promise<void> {
    const request = this.prepareRequest();
    if (!request) {
      return;
    }
    this.openTargetPickerFor(request);
  }

  private openTargetPickerFor(request: CollectRequest): void {
    if (!this.hasAvailableTargets(request)) {
      new Notice(t("notice.noTargets"), 6000);
      this.openSettings();
      return;
    }

    new TargetPickerModal(this.app, this, request).open();
  }

  /**
   * 从当前视图读取待收录文字，并在失败时给出明确提示。
   * 注意：只读取选区，不修改编辑器。
   */
  private prepareRequest(): CollectRequest | null {
    const file = this.getActiveMarkdownFile();
    if (!file) {
      new Notice(t("notice.openMarkdown"));
      return null;
    }

    if (!this.isPathInScope(file.path)) {
      new Notice(t("notice.outOfScope"));
      return null;
    }

    const request = getCollectRequest(this.app, this.readingSnapshot);
    if (!request) {
      new Notice(t("notice.selectText"));
      return null;
    }

    // 快照只用于当前这一次操作；用过后清除，避免无选区时重复收录旧内容
    if (request.sourceMode === "preview") {
      this.readingSnapshot = null;
    }

    return request;
  }

  /** 是否存在可选目标（预设目标或全库搜索） */
  private hasAvailableTargets(request: CollectRequest): boolean {
    if (this.settings.targets.some((target) => target.path.trim() !== "")) {
      return true;
    }
    if (!this.settings.allowVaultSearch) {
      return false;
    }
    return this.app.vault
      .getMarkdownFiles()
      .some((file) => file.path !== request.sourceFile.path);
  }

  /** 数字编号快捷收录：跳过选择框直接写入 */
  private collectToNumber(number: number): void {
    const request = this.prepareRequest();
    if (!request) {
      return;
    }

    const target = this.getTargetByNumber(number);
    if (!target) {
      new Notice(t("notice.noNumberTarget", { number }));
      return;
    }

    void this.collectToTarget(target, request);
  }

  /**
   * 将选中内容写入目标笔记。
   * 这是整个插件唯一的写文件入口；永远只写目标文件，不触碰源笔记。
   */
  async collectToTarget(
    target: CollectTarget,
    request: CollectRequest,
  ): Promise<void> {
    const targetPath = normalizeVaultPath(target.path);

    if (!targetPath) {
      new Notice(
        t("notice.targetNoPath", {
          name: target.name.trim() || t("common.unnamedTarget"),
        }),
      );
      return;
    }

    if (targetPath === request.sourceFile.path) {
      new Notice(t("notice.sourceProtection"));
      return;
    }

    if (!containsContentPlaceholder(this.settings.template)) {
      new Notice(t("notice.templateMissingContent"), 6000);
      return;
    }

    const targetFile = this.app.vault.getAbstractFileByPath(targetPath);
    if (!(targetFile instanceof TFile)) {
      new Notice(t("notice.targetMissing", { path: targetPath }));
      return;
    }

    // 双重保护：路径大小写/写法不同但解析到同一个文件时也要拒绝
    if (
      targetFile === request.sourceFile ||
      targetFile.path === request.sourceFile.path
    ) {
      new Notice(t("notice.sourceProtection"));
      return;
    }

    if (targetFile.extension.toLowerCase() !== "md") {
      new Notice(t("notice.targetNotMarkdown"));
      return;
    }

    const parts = getDateParts(new Date(), getWeekdayNames());
    const templateContext: TemplateContext = {
      content: request.text,
      source: request.sourceFile.basename,
      sourcePath: request.sourceFile.path,
      sourceLink: `[[${request.sourceFile.basename}]]`,
      target: target.name || targetFile.basename,
      targetPath: targetFile.path,
      date: parts.date,
      time: parts.time,
      datetime: parts.datetime,
      weekday: parts.weekday,
    };

    const rendered = renderTemplate(this.settings.template, templateContext);
    if (!rendered.trim()) {
      new Notice(t("notice.templateEmpty"));
      return;
    }

    const position = this.settings.insertPosition;
    const heading = this.settings.heading;
    let insertion: InsertionResult | undefined;

    try {
      // vault.process 会读取最新内容、执行回调并原子写回
      await this.app.vault.process(targetFile, (content) => {
        const result = insertEntry(content, rendered, position, heading);
        insertion = result;
        return result.content;
      });
    } catch (error) {
      console.error("[Excerpt Collector] 写入目标笔记失败", error);
      new Notice(t("notice.writeFailed", { path: targetFile.path }), 6000);
      return;
    }

    if (!insertion) {
      new Notice(t("notice.writeFailedEmpty"));
      return;
    }

    const nowIso = new Date().toISOString();
    const targetName = target.name.trim() || targetFile.basename;

    // 记录撤销信息（插入片段包含插件补齐的换行，可精确还原）
    const record: UndoRecord = {
      id: generateId(),
      targetPath: targetFile.path,
      targetName,
      sourcePath: request.sourceFile.path,
      sourceName: request.sourceFile.basename,
      insertedText: insertion.insertedText,
      offset: insertion.offset,
      createdAt: nowIso,
    };
    this.pluginData.undoStack.push(record);
    if (this.pluginData.undoStack.length > UNDO_LIMIT) {
      this.pluginData.undoStack.splice(
        0,
        this.pluginData.undoStack.length - UNDO_LIMIT,
      );
    }

    const stats = this.pluginData.stats[targetFile.path] ?? {
      count: 0,
      lastAt: "",
    };
    stats.count += 1;
    stats.lastAt = nowIso;
    this.pluginData.stats[targetFile.path] = stats;

    await this.saveSettings();

    new Notice(t("notice.collected", { name: targetName }));

    if (position === "heading" && !insertion.headingFound) {
      new Notice(t("notice.headingNotFound", { heading }), 6000);
    }
  }

  /**
   * 撤销上一次收录：从目标笔记中移除上次插入的完整片段。
   * 如果目标内容已被编辑导致找不到原片段，会跳过该记录并给出提示。
   */
  async undoLastCollection(): Promise<void> {
    const record =
      this.pluginData.undoStack[this.pluginData.undoStack.length - 1];
    if (!record) {
      new Notice(t("notice.nothingToUndo"));
      return;
    }

    const targetFile = this.app.vault.getAbstractFileByPath(
      record.targetPath,
    );
    if (!(targetFile instanceof TFile)) {
      this.pluginData.undoStack.pop();
      await this.saveSettings();
      new Notice(
        t("notice.undoTargetMissing", { path: record.targetPath }),
        6000,
      );
      return;
    }

    let removed = false;

    try {
      await this.app.vault.process(targetFile, (content) => {
        const offset = locateInsertedText(
          content,
          record.insertedText,
          record.offset,
        );
        if (offset < 0) {
          return content;
        }
        removed = true;
        return (
          content.slice(0, offset) +
          content.slice(offset + record.insertedText.length)
        );
      });
    } catch (error) {
      console.error("[Excerpt Collector] 撤销收录失败", error);
      new Notice(t("notice.undoWriteFailed"), 6000);
      return;
    }

    this.pluginData.undoStack.pop();

    if (removed) {
      const stats = this.pluginData.stats[record.targetPath];
      if (stats && stats.count > 0) {
        stats.count -= 1;
      }
      await this.saveSettings();
      new Notice(t("notice.undone", { name: record.targetName }));
      return;
    }

    await this.saveSettings();
    new Notice(t("notice.undoContentChanged"), 6000);
  }
}
