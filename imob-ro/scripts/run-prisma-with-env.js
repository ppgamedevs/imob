const fs = require("fs");
const cp = require("child_process");
const path = require("path");
const p = path.resolve(__dirname, "..", ".env.local");
if (!fs.existsSync(p)) {
  console.error(".env.local not found:", p);
  process.exit(1);
}
const s = fs.readFileSync(p, "utf8");
s.split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([^#=\s]+)=(.*)$/);
  if (m) {
    let v = m[2].trim();
    v = v.replace(/^\"|\"$/g, "");
    process.env[m[1].trim()] = v;
  }
});
console.log("Loaded env vars from", p);
try {
  cp.execSync("pnpm --dir d:/imob-ro/imob/imob-ro exec prisma validate", { stdio: "inherit" });
  cp.execSync("pnpm --dir d:/imob-ro/imob/imob-ro exec prisma generate", { stdio: "inherit" });
  console.log("prisma validate + generate succeeded");
} catch (err) {
  console.error("prisma commands failed");
  process.exit(1);
}
