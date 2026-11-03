import test from "node:test";
import assert from "node:assert/strict";
import {
  detectLanguage,
  getDefaultHeading,
  getI18nLanguage,
  getWeekdayNames,
  initI18n,
  isDefaultTargetName,
  t,
} from "../src/i18n.ts";

test("语言检测：中文变体归为中文，其余回退英文", () => {
  assert.equal(detectLanguage("zh"), "zh");
  assert.equal(detectLanguage("zh-CN"), "zh");
  assert.equal(detectLanguage("zh-TW"), "zh");
  assert.equal(detectLanguage("en"), "en");
  assert.equal(detectLanguage("fr"), "en");
  assert.equal(detectLanguage(null), "en");
  assert.equal(detectLanguage(undefined), "en");
});

test("中英文翻译切换", () => {
  initI18n("en");
  assert.equal(getI18nLanguage(), "en");
  assert.equal(t("command.collect"), "Collect selected text to note");
  assert.equal(t("settings.addTarget"), "Add collection target");

  initI18n("zh-CN");
  assert.equal(getI18nLanguage(), "zh");
  assert.equal(t("command.collect"), "收录选中文字到笔记");
  assert.equal(t("settings.addTarget"), "添加收录目标");
});

test("未知语言回退英文", () => {
  initI18n("de");
  assert.equal(getI18nLanguage(), "en");
  assert.equal(t("common.cancel"), "Cancel");
});

test("参数插值支持多个占位符", () => {
  initI18n("en");
  assert.equal(
    t("notice.collected", { name: "Excerpts" }),
    'Collected to "Excerpts".',
  );
  assert.equal(
    t("settings.targets", { count: 3 }),
    "Collection targets (3)",
  );

  initI18n("zh");
  assert.equal(
    t("notice.collected", { name: "摘录集" }),
    "已收录到「摘录集」",
  );
  assert.equal(
    t("settings.targets", { count: 3 }),
    "收录目标（3）",
  );
});

test("星期名称与默认标题随语言变化", () => {
  initI18n("en");
  const enWeekdays = getWeekdayNames();
  assert.equal(enWeekdays.length, 7);
  assert.equal(enWeekdays[5], "Friday");
  assert.equal(getDefaultHeading(), "## Excerpts");
  assert.ok(
    t("preset.template.source").includes("Excerpted from"),
  );

  initI18n("zh");
  const zhWeekdays = getWeekdayNames();
  assert.equal(zhWeekdays.length, 7);
  assert.equal(zhWeekdays[5], "周五");
  assert.equal(getDefaultHeading(), "## 收录");
  assert.ok(t("preset.template.source").includes("摘自"));
});

test("默认目标名称识别中英文", () => {
  initI18n("zh");
  assert.equal(isDefaultTargetName("新收录目标"), true);
  assert.equal(isDefaultTargetName("New target"), true);
  assert.equal(isDefaultTargetName("我的目标"), false);
  assert.equal(isDefaultTargetName("  New target  "), true);
});

test("所有翻译 key 在中英文之间保持完整", () => {
  // 类型系统已保证 ZH 实现了全部 TranslationKey；
  // 这里再抽查一些设置面板/弹窗 key，防止运行时遗漏。
  const languages = ["en", "zh"];
  const keys = [
    "settings.title",
    "settings.targetsHint",
    "settings.preset",
    "settings.template",
    "settings.pathScope",
    "stats.title",
    "picker.placeholder",
    "common.confirm",
  ];

  for (const language of languages) {
    initI18n(language);
    for (const key of keys) {
      const value = t(key);
      assert.ok(value.length > 0, `${language} 缺少翻译：${key}`);
      assert.notEqual(value, key, `${language} 未翻译：${key}`);
    }
  }
});
