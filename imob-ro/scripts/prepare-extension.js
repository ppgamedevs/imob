/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const src = path.join(root, "extensions", "chrome");
const out = path.join(root, "dist", "extension");
const replaceDomain = process.env.REPLACE_DOMAIN || null;

function copyRecursive(srcDir, destDir) {
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  for (const name of fs.readdirSync(srcDir)) {
    const srcPath = path.join(srcDir, name);
    const destPath = path.join(destDir, name);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      let content = fs.readFileSync(srcPath, "utf8");
      if (replaceDomain) {
        content = content.split("YOUR_DOMAIN").join(replaceDomain);
      }
      fs.writeFileSync(destPath, content, "utf8");
    }
  }
}

if (!fs.existsSync(src)) {
  console.error("Source extension not found at", src);
  process.exit(1);
}

if (fs.existsSync(out)) {
  console.log("Cleaning", out);
  fs.rmSync(out, { recursive: true, force: true });
}

copyRecursive(src, out);
console.log(
  "Extension copied to",
  out + (replaceDomain ? ` (replaced YOUR_DOMAIN -> ${replaceDomain})` : ""),
);
