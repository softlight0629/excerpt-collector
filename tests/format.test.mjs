import test from "node:test";
import assert from "node:assert/strict";
import {
  containsContentPlaceholder,
  findHeadingInsertOffset,
  findStartInsertOffset,
  getDateParts,
  insertEntry,
  locateInsertedText,
  matchesPathScope,
  normalizeVaultPath,
  renderTemplate,
} from "../src/format.ts";

const context = {
  content: "正文里写着 {{date}}",
  source: "源笔记",
  sourcePath: "摘录源/源笔记.md",
  sourceLink: "[[源笔记]]",
  target: "摘录集",
  targetPath: "收录/摘录集.md",
  date: "2026-01-02",
  time: "03:04",
  datetime: "2026-01-02 03:04",
  weekday: "周五",
};

test("模板：替换占位符，且不二次渲染选中文本", () => {
  const rendered = renderTemplate(
    "> 摘自 {{sourceLink}} · {{date}}\n\n{{content}}",
    context,
  );
  assert.equal(
    rendered,
    "> 摘自 [[源笔记]] · 2026-01-02\n\n正文里写着 {{date}}",
  );
});

test("模板：识别 {{content}} 占位符", () => {
  assert.equal(containsContentPlaceholder("{{content}}"), true);
  assert.equal(containsContentPlaceholder("{{ content }}"), true);
  assert.equal(containsContentPlaceholder("只有 {{date}}"), false);
});

test("日期：本地日期、时间与星期", () => {
  assert.deepEqual(getDateParts(new Date(2026, 0, 2, 3, 4)), {
    date: "2026-01-02",
    time: "03:04",
    datetime: "2026-01-02 03:04",
    weekday: "周五",
  });
});

test("日期：支持传入其他语言的星期名称", () => {
  const englishWeekdays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  assert.equal(
    getDateParts(new Date(2026, 0, 2, 3, 4), englishWeekdays).weekday,
    "Friday",
  );
});

test("路径范围：空设置不限制", () => {
  assert.equal(matchesPathScope("任意/笔记.md", ""), true);
  assert.equal(matchesPathScope("任意/笔记.md", "   "), true);
});

test("路径范围：文件夹、glob 与多规则", () => {
  assert.equal(matchesPathScope("摘录源/小说.md", "摘录源/**"), true);
  assert.equal(matchesPathScope("摘录源/子目录/小说.md", "摘录源/**"), true);
  assert.equal(matchesPathScope("摘录源2/小说.md", "摘录源/**"), false);
  assert.equal(matchesPathScope("摘录源/小说.md", "摘录源"), true);
  assert.equal(matchesPathScope("课程笔记/第一课.md", "课程笔记/*.md"), true);
  assert.equal(
    matchesPathScope("课程笔记/子目录/第一课.md", "课程笔记/*.md"),
    false,
  );
  assert.equal(
    matchesPathScope("笔记.md", "摘录源/**\n课程笔记/*.md, 笔记.md"),
    true,
  );
});

test("路径范围：** 可匹配根目录与子目录", () => {
  assert.equal(matchesPathScope("根笔记.md", "**/*.md"), true);
  assert.equal(matchesPathScope("目录/笔记.md", "**/*.md"), true);
});

test("路径范围：反斜杠与开头 / 会被规范化", () => {
  assert.equal(matchesPathScope("摘录源\\小说.md", "摘录源/**"), true);
  assert.equal(matchesPathScope("摘录源/小说.md", "/摘录源/**"), true);
  assert.equal(normalizeVaultPath(" 收录\\摘录集.md "), "收录/摘录集.md");
});

test("插入位置：开头跳过 YAML frontmatter", () => {
  const content = "---\ntags: test\n---\n# 标题\n正文";
  assert.equal(findStartInsertOffset(content), 19);

  const result = insertEntry(content, "新条目", "start");
  assert.equal(
    result.content,
    "---\ntags: test\n---\n\n新条目\n\n# 标题\n正文",
  );
  assert.equal(result.offset, 19);
});

test("插入位置：没有 frontmatter 时插到真正开头", () => {
  assert.equal(findStartInsertOffset("# 标题\n正文"), 0);
  const result = insertEntry("# 标题\n正文", "新条目", "start");
  assert.equal(result.content, "新条目\n\n# 标题\n正文");
});

test("插入位置：末尾自动补齐空行", () => {
  const result = insertEntry("已有内容\n", "新条目", "end");
  assert.equal(result.content, "已有内容\n\n新条目\n");
  assert.equal(result.insertedText, "\n新条目\n");
  assert.equal(result.offset, 5);
});

test("插入位置：空文件末尾", () => {
  const result = insertEntry("", "新条目", "end");
  assert.equal(result.content, "新条目\n");
  assert.equal(result.insertedText, "新条目\n");
  assert.equal(result.offset, 0);
});

test("插入位置：指定标题下，停在下一个同级标题前", () => {
  const content = "# 笔记\n## 收录\n已有内容\n## 其他\n不要动\n";
  const result = insertEntry(content, "新条目", "heading", "## 收录");

  assert.equal(result.headingFound, true);
  assert.equal(
    result.content,
    "# 笔记\n## 收录\n已有内容\n\n新条目\n\n## 其他\n不要动\n",
  );
});

test("插入位置：标题模式只写文字时匹配任意级别", () => {
  const content = "# 笔记\n### 收录\n已有\n## 其他\n";
  const result = insertEntry(content, "新条目", "heading", "收录");
  assert.equal(result.headingFound, true);
  assert.ok(result.content.includes("已有\n\n新条目\n\n## 其他"));
});

test("插入位置：更深层的标题不会提前结束章节", () => {
  const content = "## 收录\n正文\n### 子节\n子内容\n## 其他\n";
  const result = insertEntry(content, "新条目", "heading", "## 收录");
  assert.equal(
    result.content,
    "## 收录\n正文\n### 子节\n子内容\n\n新条目\n\n## 其他\n",
  );
});

test("插入位置：跳过 frontmatter 中的 YAML 注释伪标题", () => {
  const content = [
    "---",
    "tags:",
    "  - 测试",
    "# 收录",
    "---",
    "## 收录",
    "已有内容",
    "## 其他",
    "不要动",
    "",
  ].join("\n");

  const result = insertEntry(content, "新条目", "heading", "## 收录");
  assert.equal(result.headingFound, true);
  assert.ok(
    result.content.includes(
      "## 收录\n已有内容\n\n新条目\n\n## 其他",
    ),
  );
});

test("插入位置：frontmatter 里同名的注释不会误匹配", () => {
  const content = ["---", "# 收录", "---", "正文", ""].join("\n");
  const result = insertEntry(content, "新条目", "heading", "## 收录");
  assert.equal(result.headingFound, false);
  assert.ok(result.content.endsWith("正文\n\n新条目\n"));
});

test("插入位置：忽略代码块中的伪标题", () => {
  const content = [
    "## 收录",
    "```md",
    "## 伪标题",
    "```",
    "已有内容",
    "## 其他",
    "不要动",
    "",
  ].join("\n");

  const result = insertEntry(content, "新条目", "heading", "## 收录");
  assert.equal(result.headingFound, true);
  assert.ok(result.content.includes("已有内容\n\n新条目\n\n## 其他"));
  assert.ok(!result.content.includes("伪标题\n\n新条目"));
});

test("插入位置：更长的代码围栏不会被内部短围栏提前关闭", () => {
  const content = [
    "## 收录",
    "````md",
    "```",
    "## 伪标题",
    "```",
    "````",
    "已有内容",
    "## 其他",
    "不要动",
    "",
  ].join("\n");

  const result = insertEntry(content, "新条目", "heading", "## 收录");
  assert.equal(result.headingFound, true);
  assert.ok(result.content.includes("已有内容\n\n新条目\n\n## 其他"));
  assert.ok(!result.content.includes("伪标题\n\n新条目"));
});

test("插入位置：找不到标题时回退到末尾并标记", () => {
  const result = insertEntry("已有内容\n", "新条目", "heading", "## 不存在");
  assert.equal(result.headingFound, false);
  assert.equal(result.content, "已有内容\n\n新条目\n");
});

test("插入位置：标题为空时回退到末尾", () => {
  const result = insertEntry("已有内容\n", "新条目", "heading", "   ");
  assert.equal(result.headingFound, false);
  assert.equal(result.content, "已有内容\n\n新条目\n");
});

test("插入位置：CRLF 会被规范化", () => {
  const result = insertEntry("a\r\nb\r\n", "新条目", "end");
  assert.equal(result.content, "a\nb\n\n新条目\n");
});

test("撤销定位：删除插入片段可精确还原原文", () => {
  const original = "# 标题\n\n## 收录\n\n已有内容\n## 其他\n内容";
  const insertion = insertEntry(original, "> 摘自 [[源]]\n\n新条目", "heading", "## 收录");
  const offset = locateInsertedText(
    insertion.content,
    insertion.insertedText,
    insertion.offset,
  );

  assert.notEqual(offset, -1);
  const restored =
    insertion.content.slice(0, offset) +
    insertion.content.slice(offset + insertion.insertedText.length);
  assert.equal(restored, original);
});

test("撤销定位：偏移失效时回退到最后一次相同片段", () => {
  const content = "前文\n\n新条目\n\n中间\n\n新条目\n";
  const offset = locateInsertedText(content, "\n\n新条目\n", -1);
  assert.equal(offset, content.lastIndexOf("\n\n新条目\n"));
});

test("撤销定位：内容不存在返回 -1", () => {
  assert.equal(locateInsertedText("完全不同", "新条目", 0), -1);
});

test("标题查找：未闭合的 frontmatter 不当作元数据", () => {
  assert.equal(findStartInsertOffset("---\n没有结束"), 0);
  assert.deepEqual(findHeadingInsertOffset("正文", "## 收录"), {
    offset: 2,
    found: false,
  });
});
