import fs from "fs";
const src = fs.readFileSync("public/bookmarklet.js", "utf8");
const mini = "javascript:" + encodeURIComponent(src.replace(/\s+/g, " ").trim());
fs.writeFileSync("public/bookmarklet.min.txt", mini);
console.log("Wrote public/bookmarklet.min.txt");
