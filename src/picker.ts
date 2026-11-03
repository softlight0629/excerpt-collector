import {
  App,
  FuzzySuggestModal,
  Modal,
  Notice,
  Setting,
  TFile,
  type FuzzyMatch,
} from "obsidian";
import type ExcerptCollectorPlugin from "./main";
import type { CollectRequest, CollectTarget } from "./types";
import { getDateParts, normalizeVaultPath } from "./format";
import { t } from "./i18n";

/** 目标选择框中的一项：预设目标或全库搜索到的笔记 */
export type TargetItem =
  | { kind: "preset"; target: CollectTarget }
  | { kind: "file"; file: TFile };

/**
 * 收录目标选择框。
 * 预设目标始终排在前面；开启全库搜索后，其余 Markdown 笔记也可以直接作为目标。
 */
export class TargetPickerModal extends FuzzySuggestModal<TargetItem> {
  private readonly request: CollectRequest;

  /** 选择框存续期间条目不会变化，缓存一次避免输入时反复扫描全库 */
  private itemsCache: TargetItem[] | null = null;

  /**
   * 数字快速选择。用箭头函数保存引用，便于 onClose 时移除。
   * 仅在输入框为空时生效，避免影响正常的文字搜索。
   */
  private readonly handleNumberKey = (event: KeyboardEvent) => {
    if (!this.plugin.settings.enableNumberSelect) {
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    if (this.inputEl.value.trim() !== "") {
      return;
    }
    if (!/^[1-9]$/.test(event.key)) {
      return;
    }

    const number = Number(event.key);
    const target = this.plugin.settings.targets.find(
      (item) => item.number === number && item.path.trim() !== "",
    );
    if (!target) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.close();
    void this.plugin.collectToTarget(target, this.request);
  };

  constructor(
    app: App,
    private readonly plugin: ExcerptCollectorPlugin,
    request: CollectRequest,
  ) {
    super(app);
    this.request = request;
    this.limit = 100;
    this.setPlaceholder(t("picker.placeholder"));
  }

  getItems(): TargetItem[] {
    if (this.itemsCache) {
      return this.itemsCache;
    }

    const presetPaths = new Set<string>();
    const items: TargetItem[] = [];

    for (const target of this.plugin.settings.targets) {
      const path = normalizeVaultPath(target.path);
      if (!path) {
        continue;
      }
      presetPaths.add(path);
      items.push({ kind: "preset", target });
    }

    if (this.plugin.settings.allowVaultSearch) {
      const files = this.app.vault
        .getMarkdownFiles()
        .filter(
          (file) =>
            file.path !== this.request.sourceFile.path &&
            !presetPaths.has(file.path),
        )
        .sort((a, b) => a.path.localeCompare(b.path));

      for (const file of files) {
        items.push({ kind: "file", file });
      }
    }

    this.itemsCache = items;
    return items;
  }

  getItemText(item: TargetItem): string {
    if (item.kind === "preset") {
      const number = item.target.number > 0 ? `${item.target.number} ` : "";
      return `${number}${item.target.name} ${item.target.path}`;
    }
    return `${item.file.basename} ${item.file.path}`;
  }

  renderSuggestion(
    match: FuzzyMatch<TargetItem>,
    el: HTMLElement,
  ): void {
    const item = match.item;
    el.addClass("ec-suggest-item");

    if (item.kind === "preset") {
      if (item.target.number > 0) {
        el.createSpan({
          cls: "ec-suggest-number",
          text: String(item.target.number),
        });
      }

      const info = el.createDiv({ cls: "ec-suggest-info" });
      info.createDiv({
        cls: "ec-suggest-name",
        text: item.target.name || item.target.path,
      });
      info.createDiv({
        cls: "ec-suggest-path",
        text: normalizeVaultPath(item.target.path),
      });

      // 目标笔记尚未创建时给出提示，但允许用户继续选择（写入时会明确报错）
      const targetFile = this.app.vault.getAbstractFileByPath(
        normalizeVaultPath(item.target.path),
      );
      if (!(targetFile instanceof TFile)) {
        el.createSpan({
          cls: "ec-suggest-warning",
          text: t("picker.fileMissing"),
        });
      }
      return;
    }

    const info = el.createDiv({ cls: "ec-suggest-info" });
    info.createDiv({
      cls: "ec-suggest-name",
      text: item.file.basename,
    });
    info.createDiv({
      cls: "ec-suggest-path",
      text: item.file.path,
    });
    el.createSpan({
      cls: "ec-suggest-tag",
      text: t("picker.vaultNote"),
    });
  }

  onChooseItem(item: TargetItem): void {
    if (item.kind === "preset") {
      void this.plugin.collectToTarget(item.target, this.request);
      return;
    }

    // 从全库搜索选中的笔记作为一次性目标，不自动写入预设列表
    const target: CollectTarget = {
      id: "",
      name: item.file.basename,
      path: item.file.path,
      number: 0,
    };
    void this.plugin.collectToTarget(target, this.request);
  }

  onOpen(): void {
    super.onOpen();

    const instructions = [
      { command: "↑↓", purpose: t("common.move") },
      { command: "↵", purpose: t("common.choose") },
      { command: "esc", purpose: t("common.escape") },
    ];
    if (
      this.plugin.settings.enableNumberSelect &&
      this.plugin.settings.targets.some((target) => target.number > 0)
    ) {
      instructions.unshift({
        command: "1-9",
        purpose: t("picker.numberHint"),
      });
    }
    this.setInstructions(instructions);

    this.inputEl.addEventListener("keydown", this.handleNumberKey);
  }

  onClose(): void {
    this.inputEl.removeEventListener("keydown", this.handleNumberKey);
    super.onClose();
  }
}

/** 通用的库内笔记选择框（设置面板中用来挑选目标路径） */
export class FilePickerModal extends FuzzySuggestModal<TFile> {
  private itemsCache: TFile[] | null = null;

  constructor(
    app: App,
    private readonly onChoose: (file: TFile) => void,
  ) {
    super(app);
    this.limit = 200;
    this.setPlaceholder(t("filePicker.placeholder"));
  }

  getItems(): TFile[] {
    if (!this.itemsCache) {
      this.itemsCache = this.app.vault
        .getMarkdownFiles()
        .sort((a, b) => a.path.localeCompare(b.path));
    }
    return this.itemsCache;
  }

  getItemText(file: TFile): string {
    return `${file.basename} ${file.path}`;
  }

  renderSuggestion(match: FuzzyMatch<TFile>, el: HTMLElement): void {
    el.addClass("ec-suggest-item");
    const info = el.createDiv({ cls: "ec-suggest-info" });
    info.createDiv({
      cls: "ec-suggest-name",
      text: match.item.basename,
    });
    info.createDiv({
      cls: "ec-suggest-path",
      text: match.item.path,
    });
  }

  onChooseItem(file: TFile): void {
    this.onChoose(file);
  }
}

/** 收录统计详情 */
export class StatsModal extends Modal {
  constructor(
    app: App,
    private readonly plugin: ExcerptCollectorPlugin,
  ) {
    super(app);
  }

  onOpen(): void {
    this.titleEl.setText(t("stats.title"));

    const { contentEl } = this;
    contentEl.empty();

    const entries = Object.entries(this.plugin.pluginData.stats).sort(
      (a, b) => b[1].count - a[1].count,
    );

    if (entries.length === 0) {
      contentEl.createEl("p", { text: t("stats.empty") });
      return;
    }

    const total = entries.reduce(
      (sum, [, stats]) => sum + stats.count,
      0,
    );
    contentEl.createEl("p", {
      cls: "ec-stats-summary",
      text: t("stats.summary", {
        total,
        targetCount: entries.length,
      }),
    });

    const table = contentEl.createEl("table", { cls: "ec-stats-table" });
    const head = table.createEl("thead").createEl("tr");
    head.createEl("th", { text: t("stats.target") });
    head.createEl("th", { text: t("stats.path") });
    head.createEl("th", { text: t("stats.count") });
    head.createEl("th", { text: t("stats.lastAt") });

    const body = table.createEl("tbody");
    for (const [path, stats] of entries) {
      const row = body.createEl("tr");
      row.createEl("td", {
        text: this.plugin.getDisplayNameForPath(path),
      });
      row.createEl("td", { cls: "ec-stats-path", text: path });
      row.createEl("td", { text: String(stats.count) });
      row.createEl("td", { text: this.formatTime(stats.lastAt) });
    }

    contentEl.createEl("p", {
      cls: "ec-hint",
      text: t("stats.hint"),
    });

    new Setting(contentEl).addButton((button) =>
      button
        .setButtonText(t("common.close"))
        .onClick(() => this.close()),
    );
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private formatTime(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return "—";
    }
    const parts = getDateParts(date);
    return `${parts.date} ${parts.time}`;
  }
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
}

/** 简单的确认框，用于清空撤销记录/统计等维护操作 */
export class ConfirmModal extends Modal {
  constructor(
    app: App,
    private readonly options: ConfirmOptions,
  ) {
    super(app);
  }

  onOpen(): void {
    this.titleEl.setText(this.options.title);
    this.contentEl.createEl("p", { text: this.options.message });

    new Setting(this.contentEl)
      .addButton((button) =>
        button
          .setButtonText(this.options.cancelText ?? t("common.cancel"))
          .onClick(() => this.close()),
      )
      .addButton((button) =>
        button
          .setButtonText(this.options.confirmText ?? t("common.confirm"))
          .setWarning()
          .onClick(async () => {
            try {
              await this.options.onConfirm();
            } catch (error) {
              console.error("[Excerpt Collector] 操作失败", error);
              new Notice(t("settings.errorAction"));
            } finally {
              this.close();
            }
          }),
      );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
