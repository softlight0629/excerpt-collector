import assert from "node:assert/strict";
import Module, { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * 构建产物冒烟测试：
 * 用最小的 Obsidian API 替身加载 main.js，验证收录、源笔记保护、撤销和统计。
 * 运行前需要先执行 npm run build。
 */

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const bundlePath = path.resolve(scriptDir, "..", "main.js");

const notices = [];

class Notice {
  constructor(message) {
    notices.push(String(message));
  }
}

class TFile {
  constructor(filePath) {
    this.path = filePath;
    this.name = filePath.split("/").at(-1);
    this.basename = this.name.replace(/\.[^.]+$/, "");
    this.extension = this.name.includes(".")
      ? this.name.split(".").pop()
      : "";
    this.stat = { mtime: 0 };
  }
}

class MarkdownView {}

class Plugin {
  constructor(app, manifest) {
    this.app = app;
    this.manifest = manifest;
    this.commands = [];
    this.ribbonIcons = [];
    this.settingTabs = [];
  }

  addCommand(command) {
    this.commands.push(command);
  }

  addRibbonIcon(icon, title, callback) {
    this.ribbonIcons.push({ icon, title, callback });
    return {};
  }

  addSettingTab(tab) {
    this.settingTabs.push(tab);
  }

  registerEvent(ref) {
    return ref;
  }

  registerDomEvent(el, name, callback) {
    return { el, name, callback };
  }

  async loadData() {
    return this.__initialData ?? null;
  }

  async saveData(data) {
    this.__savedData = data;
  }
}

class PluginSettingTab {
  constructor(app, plugin) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = {};
  }
}

class Modal {
  constructor(app) {
    this.app = app;
    this.titleEl = { setText() {} };
    this.contentEl = { empty() {} };
  }

  open() {}
  close() {}
  onOpen() {}
  onClose() {}
}

class FuzzySuggestModal {
  constructor(app) {
    this.app = app;
  }

  setPlaceholder() {
    return this;
  }

  setInstructions() {
    return this;
  }

  open() {}
  close() {}
  onOpen() {}
  onClose() {}
}

class Setting {
  constructor() {}
}

function debounce(fn) {
  const wrapped = (...args) => fn(...args);
  wrapped.cancel = () => {};
  wrapped.run = () => fn();
  return wrapped;
}

let stubLanguage = "zh";

const stub = {
  Notice,
  TFile,
  MarkdownView,
  Plugin,
  PluginSettingTab,
  Modal,
  FuzzySuggestModal,
  Setting,
  debounce,
  getLanguage: () => stubLanguage,
  moment: {
    locale: () => stubLanguage,
  },
};

const obsidianModule = new Proxy(stub, {
  get(target, property) {
    if (property in target) {
      return target[property];
    }
    throw new Error(
      `冒烟测试：代码使用了未模拟的 Obsidian 导出 ${String(property)}`,
    );
  },
});

// 拦截 CJS require("obsidian")
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "obsidian") {
    return obsidianModule;
  }
  return originalLoad.call(this, request, parent, isMain);
};

globalThis.document = {};

let ExcerptCollectorPlugin;
try {
  const require = createRequire(import.meta.url);
  const loaded = require(bundlePath);
  ExcerptCollectorPlugin = loaded.default ?? loaded;
} finally {
  Module._load = originalLoad;
}

assert.equal(
  typeof ExcerptCollectorPlugin,
  "function",
  "无法从构建产物中取得插件主类",
);

// ---------------------------------------------------------------------------
// 模拟 Vault
// ---------------------------------------------------------------------------

const sourceFile = new TFile("摘录源/示例小说.md");
sourceFile.content = "真正的勇敢，是明知会输，仍然去做。";

const targetFile = new TFile("收录/摘录集.md");
targetFile.content = "# 摘录集\n## 收录\n已有条目\n## 其他\n不要动\n";

const fileMap = new Map([
  [sourceFile.path, sourceFile],
  [targetFile.path, targetFile],
]);

const app = {
  vault: {
    getMarkdownFiles() {
      return [...new Set(fileMap.values())].filter(
        (file) => file.extension.toLowerCase() === "md",
      );
    },
    getAbstractFileByPath(filePath) {
      return fileMap.get(filePath) ?? null;
    },
    async process(file, fn) {
      const next = fn(file.content);
      file.content = next;
      return next;
    },
  },
  workspace: {
    getActiveFile() {
      return sourceFile;
    },
    getActiveViewOfType() {
      return null;
    },
    on() {
      return {};
    },
  },
};

const initialData = {
  settings: {
    targets: [
      {
        id: "target-excerpts",
        name: "摘录集",
        path: "收录/摘录集.md",
        number: 1,
      },
      {
        id: "target-quotes",
        name: "名言集",
        path: "收录/名言集.md",
        number: 2,
      },
    ],
    insertPosition: "heading",
    heading: "## 收录",
    template: "> 摘自 {{sourceLink}} · {{datetime}}\n\n{{content}}",
    enableContextMenu: true,
    enableDefaultHotkey: true,
    pathScope: "",
    allowVaultSearch: true,
    enableNumberSelect: true,
  },
  undoStack: [],
  stats: {},
};

const plugin = new ExcerptCollectorPlugin(app, {
  id: "excerpt-collector",
  version: "0.1.0",
});
plugin.__initialData = initialData;

await plugin.onload();

assert.equal(plugin.settings.targets.length, 2, "设置未正确加载");
assert.ok(
  plugin.commands.some((command) => command.id === "collect-selection"),
  "未注册主命令",
);
assert.ok(
  plugin.commands.some((command) => command.id === "undo-last-collection"),
  "未注册撤销命令",
);
assert.equal(plugin.ribbonIcons.length, 1, "未注册功能区按钮");
assert.equal(
  plugin.commands.find((command) => command.id === "collect-selection")
    .name,
  "收录选中文字到笔记",
  "中文界面下命令名称不正确",
);
assert.equal(
  plugin.ribbonIcons[0].title,
  "收录选中文字",
  "中文界面下功能区按钮标题不正确",
);

const request = {
  text: "真正的勇敢，是明知会输，仍然去做。",
  sourceFile,
  sourceMode: "editor",
};

// 1. 正常收录 ---------------------------------------------------------------
const sourceBefore = sourceFile.content;
const targetBefore = targetFile.content;
const target = plugin.settings.targets[0];

await plugin.collectToTarget(target, request);

assert.equal(sourceFile.content, sourceBefore, "源笔记被修改了！");
assert.ok(targetFile.content.includes(request.text), "目标笔记中没有收录内容");
assert.ok(
  targetFile.content.includes("> 摘自 [[示例小说]]"),
  "模板中的来源链接未渲染",
);
assert.ok(
  targetFile.content.indexOf(request.text) <
    targetFile.content.indexOf("## 其他"),
  "内容没有插入到指定标题的章节内",
);
assert.equal(
  plugin.pluginData.stats[targetFile.path].count,
  1,
  "统计条数不正确",
);
assert.equal(plugin.pluginData.undoStack.length, 1, "撤销记录未保存");
assert.equal(sourceFile.content, sourceBefore, "源笔记被修改了！");

// 2. 撤销 -------------------------------------------------------------------
await plugin.undoLastCollection();

assert.equal(targetFile.content, targetBefore, "撤销后目标笔记未精确还原");
assert.equal(sourceFile.content, sourceBefore, "撤销过程修改了源笔记！");
assert.equal(
  plugin.pluginData.stats[targetFile.path].count,
  0,
  "撤销后统计未减一",
);
assert.equal(plugin.pluginData.undoStack.length, 0, "撤销记录未弹出");

// 3. 禁止收录到源笔记本身 ---------------------------------------------------
notices.length = 0;
sourceFile.content = sourceBefore;

await plugin.collectToTarget(
  {
    id: "self",
    name: "源笔记",
    path: sourceFile.path,
    number: 0,
  },
  request,
);
assert.equal(sourceFile.content, sourceBefore, "源笔记被写入了！");
assert.ok(
  notices.some((notice) => notice.includes("源笔记")),
  "没有给出源笔记保护提示",
);

// 3.1 大小写不同的路径解析到同一个文件时也要拒绝
fileMap.set("摘录源/示例小说.MD", sourceFile);
await plugin.collectToTarget(
  {
    id: "self-case",
    name: "源笔记",
    path: "摘录源/示例小说.MD",
    number: 0,
  },
  request,
);
assert.equal(sourceFile.content, sourceBefore, "大小写别名绕过了源笔记保护！");
fileMap.delete("摘录源/示例小说.MD");

// 4. 目标不存在 -------------------------------------------------------------
notices.length = 0;
await plugin.collectToTarget(
  {
    id: "missing",
    name: "缺失",
    path: "收录/不存在.md",
    number: 0,
  },
  request,
);
assert.ok(
  notices.some((notice) => notice.includes("目标笔记不存在")),
  "缺失目标没有提示",
);

// 5. 模板缺少 {{content}} 时阻止收录 ----------------------------------------
notices.length = 0;
const templateBefore = plugin.settings.template;
plugin.settings.template = "> 收录于 {{datetime}}";
const guardTargetBefore = targetFile.content;
await plugin.collectToTarget(target, request);
assert.equal(targetFile.content, guardTargetBefore, "危险模板仍然写入了内容");
assert.ok(
  notices.some((notice) => notice.includes("{{content}}")),
  "缺少 {{content}} 时没有提示",
);
plugin.settings.template = templateBefore;

// 6. 路径范围影响命令可见性 -------------------------------------------------
const mainCommand = plugin.commands.find(
  (command) => command.id === "collect-selection",
);
plugin.settings.pathScope = "日常/**";
assert.equal(
  mainCommand.checkCallback(true),
  false,
  "路径范围不匹配时命令仍然可见",
);
plugin.settings.pathScope = "";

// 7. 数字编号命令可见性 -----------------------------------------------------
const numberCommand = plugin.commands.find(
  (command) => command.id === "collect-to-number-1",
);
assert.equal(
  numberCommand.checkCallback(true),
  true,
  "编号目标存在时快捷命令不可用",
);

// 8. 数据已持久化 -----------------------------------------------------------
assert.ok(plugin.__savedData, "插件数据没有保存");

// 9. 英文界面 ---------------------------------------------------------------
stubLanguage = "en";
const enPlugin = new ExcerptCollectorPlugin(app, {
  id: "excerpt-collector",
  version: "0.1.0",
});
enPlugin.__initialData = initialData;
await enPlugin.onload();

assert.equal(
  enPlugin.commands.find(
    (command) => command.id === "collect-selection",
  ).name,
  "Collect selected text to note",
  "英文界面下命令名称不正确",
);
assert.equal(
  enPlugin.commands.find(
    (command) => command.id === "undo-last-collection",
  ).name,
  "Undo last collection",
  "英文界面下撤销命令名称不正确",
);
assert.equal(
  enPlugin.ribbonIcons[0].title,
  "Collect selected text",
  "英文界面下功能区按钮标题不正确",
);

console.log("冒烟测试通过：");
console.log("  ✓ 收录写入目标笔记且源笔记零改动");
console.log("  ✓ 指定标题章节定位正确");
console.log("  ✓ 撤销精确还原目标笔记并更新统计");
console.log("  ✓ 源笔记本身（含大小写别名）被拒绝作为目标");
console.log("  ✓ 缺失目标与危险模板被拦截");
console.log("  ✓ 路径范围与数字编号命令逻辑正常");
console.log("  ✓ 中英文界面文案随 Obsidian 语言切换");
