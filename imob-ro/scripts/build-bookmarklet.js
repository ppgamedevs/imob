const fs = require("fs");
const path = require("path");
const srcPath = path.join(__dirname, "..", "public", "bookmarklet.js");
const outPath = path.join(__dirname, "..", "public", "bookmarklet.min.txt");
const src = fs.readFileSync(srcPath, "utf8");
const mini = "javascript:" + encodeURIComponent(src.replace(/\s+/g, " ").trim());
fs.writeFileSync(outPath, mini, "utf8");
console.log("Wrote public/bookmarklet.min.txt");
