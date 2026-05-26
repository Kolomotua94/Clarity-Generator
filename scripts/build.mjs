import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "src");
const outputDir = path.join(root, "dist");
const requiredFiles = ["index.html", "styles.css", "app.js", "clarity.js"];

await rm(outputDir, { force: true, recursive: true });
await mkdir(outputDir, { recursive: true });
await cp(sourceDir, outputDir, { recursive: true });

await Promise.all(
  requiredFiles.map(async (file) => {
    const filePath = path.join(outputDir, file);
    const details = await stat(filePath);

    if (!details.isFile()) {
      throw new Error(`Expected ${filePath} to be a file.`);
    }
  }),
);

console.log(`Built Clarity Generator to ${path.relative(root, outputDir)}`);
