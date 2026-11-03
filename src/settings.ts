import {
  App,
  Notice,
  PluginSettingTab,
  Setting,
  TFile,
  debounce,
} from "obsidian";
import type ExcerptCollectorPlugin from "./main";
import {
  TEMPLATE_PRESETS,
  UNDO_LIMIT,
  generateId,
} from "./constants";
import {
  containsContentPlaceholder,
  matchesPathScope,
  normalizeVaultPath,
} from "./format";
import {
  ConfirmModal,
  FilePickerModal,
  StatsModal,
} from "./picker";
import {
  getDefaultHeading,
  isDefaultTargetName,
  t,
  type TranslationKey,
} from "./i18n";
import type { CollectTarget, InsertPosition } from "./types";

type BooleanSettingKey =
  | "enableContextMenu"
  | "enableDefaultHotkey"
  | "allowVaultSearch"
  | "enableNumberSelect";

/** 插件设置面板 */
export class ExcerptCollectorSettingTab extends PluginSettingTab {
  /** 文本输入防抖保存，避免每按一次键就写盘 */
  private readonly saveSoon = debounce(() => {
    void this.plugin.saveSettings();
  }, 300);

  constructor(
    app: App,
    private readonly plugin: ExcerptCollectorPlugin,
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("ec-settings");

    containerEl.createEl("h2", { text: t("settings.title") });
    containerEl.createEl("p", {
      cls: "ec-settings-intro",
      text: t("settings.intro"),
    });

    this.renderTargetSection(containerEl);
    this.renderFormatSection(containerEl);
    this.renderBehaviorSection(containerEl);
    this.renderMaintenanceSection(containerEl);

    containerEl.createDiv({
      cls: "ec-footer ec-hint",
      text: t("settings.footer", {
        version: this.plugin.manifest.version,
      }),
    });
  }

  hide(): void {
    // 关闭设置面板时立即落盘，避免防抖中的最后一次修改丢失
    void this.plugin.saveSettings();
    super.hide();
  }

  // ---------------------------------------------------------------------------
  // 收录目标
  // ---------------------------------------------------------------------------

  private renderTargetSection(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName(
        t("settings.targets", {
          count: this.plugin.settings.targets.length,
        }),
      )
      .setHeading();

    containerEl.createEl("p", {
      cls: "ec-hint",
      text: t("settings.targetsHint"),
    });

    if (this.plugin.settings.targets.length === 0) {
      containerEl.createEl("p", {
        cls: "ec-hint ec-empty-targets",
        text: t("settings.noTargets"),
      });
    }

    this.plugin.settings.targets.forEach((target, index) => {
      this.renderTargetCard(containerEl, target, index);
    });

    new Setting(containerEl).addButton((button) => {
      button
        .setButtonText(t("settings.addTarget"))
        .setCta()
        .onClick(() => {
          const usedNumbers = new Set(
            this.plugin.settings.targets
              .map((target) => target.number)
              .filter((number) => number > 0),
          );
          let number = 0;
          for (let candidate = 1; candidate <= 9; candidate++) {
            if (!usedNumbers.has(candidate)) {
              number = candidate;
              break;
            }
          }

          this.plugin.settings.targets.push({
            id: generateId(),
            name: t("settings.newTargetName"),
            path: "",
            number,
          });
          void this.plugin.saveSettings();
          this.display();
        });
    });
  }

  private renderTargetCard(
    containerEl: HTMLElement,
    target: CollectTarget,
    index: number,
  ): void {
    const card = containerEl.createDiv({ cls: "ec-target-card" });

    const header = new Setting(card)
      .setName(t("settings.targetLabel", { index: index + 1 }))
      .setClass("ec-target-header");

    header.addDropdown((dropdown) => {
      dropdown.addOption("0", t("settings.noNumber"));
      for (let number = 1; number <= 9; number++) {
        dropdown.addOption(
          String(number),
          t("settings.numberOption", { number }),
        );
      }
      dropdown.setValue(String(target.number));
      dropdown.selectEl.setAttribute(
        "aria-label",
        t("settings.numberAria"),
      );
      dropdown.onChange((value) => {
        const number = Number(value);
        if (number > 0) {
          // 编号唯一：占用其他目标已使用的编号时，清除对方编号
          for (const other of this.plugin.settings.targets) {
            if (other.id !== target.id && other.number === number) {
              other.number = 0;
            }
          }
        }
        target.number = number;
        void this.plugin.saveSettings();
        this.display();
      });
    });

    header.addExtraButton((button) => {
      button
        .setIcon("search")
        .setTooltip(t("settings.chooseFileTooltip"))
        .onClick(() => {
          new FilePickerModal(this.app, (file) => {
            target.path = file.path;
            if (
              !target.name.trim() ||
              isDefaultTargetName(target.name)
            ) {
              target.name = file.basename;
            }
            void this.plugin.saveSettings();
            this.display();
          }).open();
        });
    });

    header.addExtraButton((button) => {
      button
        .setIcon("trash")
        .setTooltip(t("settings.deleteTargetTooltip"))
        .onClick(() => {
          const targetIndex = this.plugin.settings.targets.findIndex(
            (item) => item.id === target.id,
          );
          if (targetIndex >= 0) {
            this.plugin.settings.targets.splice(targetIndex, 1);
          }
          void this.plugin.saveSettings();
          this.display();
        });
    });

    const status = card.createDiv({ cls: "ec-hint ec-target-status" });
    const updateStatus = () => this.updateTargetStatus(status, target);

    const inputs = new Setting(card).setClass("ec-target-inputs");

    inputs.addText((text) => {
      text
        .setPlaceholder(t("settings.targetNamePlaceholder"))
        .setValue(target.name)
        .onChange((value) => {
          target.name = value;
          this.saveSoon();
        });
      text.inputEl.addClass("ec-input-name");
      text.inputEl.setAttribute(
        "aria-label",
        t("settings.targetNameAria"),
      );
    });

    inputs.addText((text) => {
      text
        .setPlaceholder(t("settings.targetPathPlaceholder"))
        .setValue(target.path)
        .onChange((value) => {
          target.path = normalizeVaultPath(value);
          this.saveSoon();
          updateStatus();
        });
      text.inputEl.addClass("ec-input-path");
      text.inputEl.setAttribute(
        "aria-label",
        t("settings.targetPathAria"),
      );
    });

    updateStatus();
  }

  private updateTargetStatus(
    status: HTMLElement,
    target: CollectTarget,
  ): void {
    status.empty();

    const path = normalizeVaultPath(target.path);

    if (!path) {
      status.setText(t("settings.statusNoPath"));
      status.className = "ec-hint ec-target-status ec-warning";
      return;
    }

    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile && file.extension.toLowerCase() === "md") {
      status.setText(t("settings.statusFound", { path: file.path }));
      status.className = "ec-hint ec-target-status ec-ok";
      return;
    }

    if (file instanceof TFile) {
      status.setText(t("settings.statusNotMarkdown"));
    } else {
      status.setText(t("settings.statusMissing"));
    }
    status.className = "ec-hint ec-target-status ec-warning";
  }

  // ---------------------------------------------------------------------------
  // 收录格式
  // ---------------------------------------------------------------------------

  private renderFormatSection(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName(t("settings.formatSection"))
      .setHeading();

    new Setting(containerEl)
      .setName(t("settings.preset"))
      .setDesc(t("settings.presetDesc"))
      .addDropdown((dropdown) => {
        dropdown.addOption("", t("settings.choosePreset"));
        for (const preset of TEMPLATE_PRESETS) {
          dropdown.addOption(preset.key, t(preset.labelKey));
        }
        dropdown.setValue("");
        dropdown.onChange((key) => {
          const preset = TEMPLATE_PRESETS.find((item) => item.key === key);
          if (!preset) {
            return;
          }
          this.plugin.settings.template = t(preset.templateKey);
          void this.plugin.saveSettings();
          this.display();
        });
      });

    const templateWarning = containerEl.createDiv({
      cls: "ec-hint ec-warning ec-template-warning",
    });

    const templateSetting = new Setting(containerEl)
      .setName(t("settings.template"))
      .setDesc(t("settings.templateDesc"))
      .setClass("ec-template-setting");

    templateSetting.addTextArea((text) => {
      text.setValue(this.plugin.settings.template);
      text.inputEl.rows = 5;
      text.inputEl.addClass("ec-template-input");
      text.onChange((value) => {
        this.plugin.settings.template = value;
        this.saveSoon();
        this.updateTemplateWarning(templateWarning, value);
      });
    });

    this.updateTemplateWarning(
      templateWarning,
      this.plugin.settings.template,
    );

    const details = containerEl.createEl("details", {
      cls: "ec-placeholder-help",
    });
    details.createEl("summary", {
      text: t("settings.placeholdersSummary"),
    });
    const list = details.createEl("ul");
    const placeholders: Array<[string, TranslationKey]> = [
      ["{{content}}", "settings.placeholder.content"],
      ["{{source}}", "settings.placeholder.source"],
      ["{{sourceLink}}", "settings.placeholder.sourceLink"],
      ["{{sourcePath}}", "settings.placeholder.sourcePath"],
      ["{{target}}", "settings.placeholder.target"],
      ["{{targetPath}}", "settings.placeholder.targetPath"],
      ["{{date}}", "settings.placeholder.date"],
      ["{{time}}", "settings.placeholder.time"],
      ["{{datetime}}", "settings.placeholder.datetime"],
      ["{{weekday}}", "settings.placeholder.weekday"],
    ];
    for (const [name, descriptionKey] of placeholders) {
      const item = list.createEl("li");
      item.createEl("code", { text: name });
      item.appendText(` — ${t(descriptionKey)}`);
    }

    new Setting(containerEl)
      .setName(t("settings.insertPosition"))
      .setDesc(t("settings.insertPositionDesc"))
      .addDropdown((dropdown) => {
        dropdown.addOption("end", t("settings.posEnd"));
        dropdown.addOption("start", t("settings.posStart"));
        dropdown.addOption("heading", t("settings.posHeading"));
        dropdown.setValue(this.plugin.settings.insertPosition);
        dropdown.onChange((value) => {
          this.plugin.settings.insertPosition = value as InsertPosition;
          void this.plugin.saveSettings();
          this.display();
        });
      });

    if (this.plugin.settings.insertPosition === "heading") {
      new Setting(containerEl)
        .setName(t("settings.heading"))
        .setDesc(t("settings.headingDesc"))
        .addText((text) => {
          text
            .setPlaceholder(getDefaultHeading())
            .setValue(this.plugin.settings.heading)
            .onChange((value) => {
              this.plugin.settings.heading = value;
              this.saveSoon();
            });
          text.inputEl.addClass("ec-heading-input");
        });
    }
  }

  private updateTemplateWarning(
    warning: HTMLElement,
    template: string,
  ): void {
    if (containsContentPlaceholder(template)) {
      warning.setText("");
      warning.style.display = "none";
      return;
    }
    warning.style.display = "";
    warning.setText(t("settings.templateWarning"));
  }

  // ---------------------------------------------------------------------------
  // 行为设置
  // ---------------------------------------------------------------------------

  private renderBehaviorSection(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName(t("settings.behaviorSection"))
      .setHeading();

    this.addToggleSetting(
      containerEl,
      t("settings.contextMenu"),
      t("settings.contextMenuDesc"),
      "enableContextMenu",
    );

    this.addToggleSetting(
      containerEl,
      t("settings.defaultHotkey"),
      t("settings.defaultHotkeyDesc"),
      "enableDefaultHotkey",
      (value) => {
        if (value) {
          new Notice(t("settings.hotkeyNotice"));
        }
      },
    );

    this.addToggleSetting(
      containerEl,
      t("settings.vaultSearch"),
      t("settings.vaultSearchDesc"),
      "allowVaultSearch",
    );

    this.addToggleSetting(
      containerEl,
      t("settings.numberSelect"),
      t("settings.numberSelectDesc"),
      "enableNumberSelect",
    );

    const scopeSetting = new Setting(containerEl)
      .setName(t("settings.pathScope"))
      .setDesc(t("settings.pathScopeDesc"))
      .setClass("ec-scope-setting");

    const scopeHint = containerEl.createDiv({ cls: "ec-hint" });

    scopeSetting.addTextArea((text) => {
      text.setValue(this.plugin.settings.pathScope);
      text.setPlaceholder(t("settings.scopePlaceholder"));
      text.inputEl.rows = 3;
      text.inputEl.addClass("ec-scope-input");
      text.onChange((value) => {
        this.plugin.settings.pathScope = value;
        this.saveSoon();
        this.updateScopeHint(scopeHint, value);
      });
    });

    this.updateScopeHint(scopeHint, this.plugin.settings.pathScope);
  }

  private addToggleSetting(
    containerEl: HTMLElement,
    name: string,
    description: string,
    key: BooleanSettingKey,
    afterChange?: (value: boolean) => void,
  ): void {
    new Setting(containerEl)
      .setName(name)
      .setDesc(description)
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings[key])
          .onChange((value) => {
            this.plugin.settings[key] = value;
            void this.plugin.saveSettings();
            afterChange?.(value);
          });
      });
  }

  private updateScopeHint(hint: HTMLElement, scope: string): void {
    const file = this.app.workspace.getActiveFile();

    if (!file) {
      hint.setText(t("settings.scopeNoActive"));
      hint.className = "ec-hint";
      return;
    }

    if (!scope.trim()) {
      hint.setText(
        t("settings.scopeUnrestricted", { name: file.basename }),
      );
      hint.className = "ec-hint ec-ok";
      return;
    }

    if (matchesPathScope(file.path, scope)) {
      hint.setText(t("settings.scopeInside", { name: file.basename }));
      hint.className = "ec-hint ec-ok";
    } else {
      hint.setText(
        t("settings.scopeOutside", { name: file.basename }),
      );
      hint.className = "ec-hint ec-warning";
    }
  }

  // ---------------------------------------------------------------------------
  // 统计与维护
  // ---------------------------------------------------------------------------

  private renderMaintenanceSection(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName(t("settings.maintenanceSection"))
      .setHeading();

    const stats = this.plugin.pluginData.stats;
    const targetCount = Object.keys(stats).length;
    const total = Object.values(stats).reduce(
      (sum, item) => sum + item.count,
      0,
    );

    new Setting(containerEl)
      .setName(t("settings.stats"))
      .setDesc(
        t("settings.statsDesc", {
          total,
          targetCount,
        }),
      )
      .addButton((button) => {
        button.setButtonText(t("settings.viewDetails")).onClick(() => {
          new StatsModal(this.app, this.plugin).open();
        });
      });

    new Setting(containerEl)
      .setName(t("settings.undoHistory"))
      .setDesc(
        t("settings.undoHistoryDesc", {
          count: this.plugin.pluginData.undoStack.length,
          limit: UNDO_LIMIT,
        }),
      )
      .addButton((button) => {
        button
          .setButtonText(t("settings.clearUndo"))
          .setWarning()
          .onClick(() => {
            new ConfirmModal(this.app, {
              title: t("settings.clearUndoTitle"),
              message: t("settings.clearUndoMessage"),
              confirmText: t("settings.clear"),
              onConfirm: async () => {
                this.plugin.pluginData.undoStack = [];
                await this.plugin.saveSettings();
                this.display();
              },
            }).open();
          });
      });

    new Setting(containerEl)
      .setName(t("settings.clearStatsTitle"))
      .setDesc(t("settings.clearStatsDesc"))
      .addButton((button) => {
        button
          .setButtonText(t("settings.clearStats"))
          .setWarning()
          .onClick(() => {
            new ConfirmModal(this.app, {
              title: t("settings.clearStatsTitle"),
              message: t("settings.clearStatsMessage"),
              confirmText: t("settings.clear"),
              onConfirm: async () => {
                this.plugin.pluginData.stats = {};
                await this.plugin.saveSettings();
                this.display();
              },
            }).open();
          });
      });
  }
}
