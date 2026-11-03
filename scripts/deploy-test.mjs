import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * 将构建产物复制到独立测试 Vault 的插件目录。
 * 只复制运行所需文件，不会覆盖测试 Vault 中的 data.json。
 */
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(scriptDir, "..");
const targetDir = path.join(
  projectDir,
  "..",
  "test-vault",
  ".obsidian",
  "plugins",
  "excerpt-collector",
);

const files = ["main.js", "manifest.json", "styles.css"];

await mkdir(targetDir, { recursive: true });

for (const file of files) {
  await copyFile(
    path.join(projectDir, file),
    path.join(targetDir, file),
  );
  console.log(`已复制 ${file}`);
}

console.log(`\n测试 Vault 插件目录：${targetDir}`);
