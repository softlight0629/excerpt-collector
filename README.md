# Excerpt Collector

Select text in any Obsidian note and **copy-append** it to preset target notes with one action. **The source note is never modified**—no deletions, replacements, links, or formatting changes.

[简体中文](README.zh-CN.md)

Similar plugins (Note Refactor, Note Composer, etc.) usually follow an extract-and-replace workflow that cuts text from the source note or replaces it with a link. Excerpt Collector focuses on a different common need: **copy and append**. Use it for fiction excerpts, research material, knowledge cards, meeting action items, writing inspiration—any workflow that involves picking content from note A and collecting it into note B.

## Features

- ✅ Trigger from the command palette, the default hotkey (`Cmd/Ctrl + Shift + E`), the editor context menu, or the ribbon icon
- ✅ Fuzzy target picker for preset targets, with optional vault-wide Markdown note search
- ✅ Numbered quick selection (1-9); assign numbers to targets or bind dedicated hotkeys to numbered commands to skip the picker
- ✅ Insertion positions: end / start (automatically after YAML frontmatter) / under a specified heading (at the end of that section)
- ✅ Custom entry templates with source link, timestamp, separator, and other placeholders
- ✅ Reading View support, with a selection snapshot fallback when the command palette clears the DOM selection
- ✅ Multi-cursor and multi-selection batch collection
- ✅ Undo the last collection by removing the exact inserted fragment
- ✅ Per-target statistics with entry counts and last collection time
- ✅ Path-scope filtering so collection commands only appear in selected folders
- ✅ Bilingual UI (English / Simplified Chinese) that follows Obsidian's language setting
- ✅ Fully local, no network requests, mobile friendly

## Installation

Requires Obsidian 1.5.0 or newer.

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/softlight0629/excerpt-collector/releases/latest).
2. Place them in your vault at `.obsidian/plugins/excerpt-collector/`.
3. Restart Obsidian, then enable **Excerpt Collector** under Settings → Community plugins.

### Build from source

```bash
git clone https://github.com/softlight0629/excerpt-collector.git
cd excerpt-collector
npm install
npm run build
```

Copy the generated `main.js`, `manifest.json`, and `styles.css` into `.obsidian/plugins/excerpt-collector/` in your vault.

## Quick start

1. Open Settings → Excerpt Collector and click **Add collection target**.
2. Pick the target note from the dropdown, then optionally adjust its display name and assign a number.
3. Select text in any note and run **Collect selected text to note**.
4. Choose a target in the picker, or press its number. The text is appended to the target note.
5. The source note remains unchanged.

> The target note must already exist. The plugin does not create notes automatically, avoiding stray files caused by a mistyped path.

## Interface language

The plugin follows Obsidian's interface language:

- `zh`, `zh-CN`, `zh-TW`, and other Chinese locales use Simplified Chinese.
- All other languages use English, which is also the fallback for unknown languages.

Settings, command names, notifications, target pickers, statistics and confirmation modals, format preset names and preset templates, and the `{{weekday}}` placeholder all follow the selected language. Reload the plugin (or restart Obsidian) after changing the app language to update registered command names.

The default heading is localized too: `## Excerpts` in English and `## 收录` in Chinese. Existing settings and note content are never rewritten by a language change.

## Use cases

- Collect memorable dialogue and descriptions from fiction into an "Excerpts" or "Quotes" note
- Save key conclusions from papers and course notes into "Research material" or "Knowledge cards"
- Extract action items and quotable lines from meeting notes into an "Action list" or "Quotes"
- Pick sentences from source material while writing and collect them into an "Ideas" or "References" note

## Entry templates

Choose a preset in Settings or edit the template directly. The template **must include `{{content}}`**; collection is blocked otherwise so the selected text cannot be lost.

| Placeholder | Meaning |
| --- | --- |
| `{{content}}` | Selected text (required) |
| `{{source}}` | Source note name without extension |
| `{{sourceLink}}` | Source note link, such as `[[Note name]]` |
| `{{sourcePath}}` | Full path of the source note |
| `{{target}}` | Target note display name |
| `{{targetPath}}` | Full path of the target note |
| `{{date}}` | Local date, `YYYY-MM-DD` |
| `{{time}}` | Local time, `HH:mm` |
| `{{datetime}}` | Local date and time, `YYYY-MM-DD HH:mm` |
| `{{weekday}}` | Weekday, such as `Friday` in English or `周五` in Chinese |

Example:

```markdown
> Excerpted from {{sourceLink}} · {{datetime}}

{{content}}
```

Built-in presets: plain text, with source, with timestamp, with source and timestamp, and with a `---` separator. Preset names and the text generated by presets (such as “Excerpted from”) follow the interface language.

> `{{sourceLink}}` uses the note name to generate `[[Note name]]`. If your vault contains notes with the same name, use `{{sourcePath}}` in custom text to avoid ambiguous links.

## Insertion positions

- **End** (default): append to the end of the target note.
- **Start**: insert after YAML frontmatter; if there is no frontmatter, insert at the beginning of the file.
- **Under a heading**: insert at the end of the specified heading's section, without crossing the next heading of the same or higher level. Supports `## Excerpts` or just `Excerpts` (matching any level). Only ATX headings starting with `#` are parsed, and pseudo-headings inside code blocks are ignored. If the heading is not found, the plugin falls back to the end of the note and shows a notice.

## Numbered selection and hotkeys

- When the target picker is open and its input is empty, press `1`-`9` to choose the target with that number.
- The plugin also registers commands named **Collect to target number N**. Bind them in Settings → Hotkeys to skip the picker entirely.
- The main command's default hotkey is `Cmd/Ctrl + Shift + E`. You can disable the default in the plugin settings (requires reloading the plugin) or override it in Obsidian's hotkey settings.

## Reading View

Select text in Reading View and trigger collection from the command palette or ribbon icon. The command palette may clear the browser DOM selection, so the plugin caches the most recent Reading View selection for 90 seconds as a fallback.

## Batch collection

In the editor, use multiple cursors (`Alt/Option + click`) or multiple selections to select several passages. Collection merges them into one record in position order, separated by blank lines.

## Undo

Run **Undo last collection**. The plugin removes the exact fragment inserted by the previous collection, including newlines added automatically. If the target note was edited afterwards, it tries to relocate the fragment by content; if the fragment cannot be found, it reports this and skips the record without deleting unrelated content.

Up to 50 undo records are kept and persisted with the plugin data.

## Statistics

Run **View collection statistics**, or check the totals in the settings panel. Statistics are counted by target path; if a target note is renamed, old statistics remain under the previous path. Clearing statistics never modifies note content.

## Path scope

To avoid accidental collection in everyday notes, restrict collection commands to specific paths. Leave the field empty for no restriction; separate multiple rules with newlines or commas. Glob support:

```text
Sources/**
Course Notes/*.md
```

- `*` matches one path segment (does not cross `/`)
- `**` matches any number of path segments
- `?` matches a single character other than `/`
- A rule without wildcards and without an extension is treated as a folder (`Sources` is equivalent to `Sources/**`)
- Matching is case-insensitive and supports non-ASCII paths

Outside the configured scope, collection commands are hidden and the context menu item is not shown.

## Source note protection

This is a hard constraint of the plugin:

- Selections are read only through `Editor.getSelection()`, `Editor.getRange()`, or the DOM `Selection` API.
- The code never calls `editor.replaceSelection()`, `editor.replaceRange()`, or any other editor write operation.
- The only file write path is `Vault.process()`, and it only runs on the target note chosen by the user.
- If a target resolves to the same file as the source note, the collection is rejected.
- Paste, delete, add-link, and format operations never happen on the source note.

## Development

```bash
npm install
npm run dev        # esbuild watch
npm run check      # TypeScript type check
npm test           # unit tests (templates, glob, heading insertion, undo location, i18n)
npm run test:smoke # load the built bundle with a mocked Obsidian API
npm run test:all   # unit tests + smoke test
npm run build      # type check + production build
npm run deploy:test
```

> Unit tests use Node's built-in TypeScript type stripping and require Node 22.18+.

Project structure:

```text
excerpt-collector/
├── src/
│   ├── main.ts        # plugin entry, commands, context menu, collection/undo flow
│   ├── settings.ts    # settings panel
│   ├── picker.ts      # target picker, file picker, statistics, confirm modals
│   ├── selection.ts   # editor/Reading View selection reading and caching
│   ├── format.ts      # pure helpers: templates, glob, heading insertion, undo location
│   ├── i18n.ts        # English/Chinese translations, language detection, weekdays
│   ├── constants.ts   # defaults and template presets
│   └── types.ts       # shared types
├── tests/             # unit tests using the Node test runner
├── scripts/           # test-vault deployment and smoke-test scripts
├── manifest.json
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
└── styles.css
```

### Local test vault

The development setup uses a separate `test-vault/` directory next to this repository. It is not published with the plugin and contains example source notes, preset target notes, and a manual test checklist:

- `插件测试说明.md`: 13 manual test steps
- `摘录源/示例小说.md`, `摘录源/课程笔记.md`: example sources
- `收录/摘录集.md`, `收录/名言集.md`: preset targets
- `.obsidian/plugins/excerpt-collector/`: plugin build and preconfigured `data.json`

Run `npm run build && npm run deploy:test` to copy the latest build into the test vault without overwriting `data.json`. Open `test-vault` as a vault in Obsidian; if the plugin is not enabled automatically, enable it under Community plugins.

## License

MIT
