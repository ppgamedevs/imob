/* eslint-disable @typescript-eslint/no-require-imports */
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");
const extDir = path.join(root, "dist", "extension");
const outZip = path.join(root, "dist", "extension.zip");

if (!require("fs").existsSync(extDir)) {
  console.error("Extension directory not found:", extDir);
  process.exit(1);
}

console.log("Creating zip", outZip);
const cmd = "Compress-Archive";
const args = ["-Path", `${extDir}\\*`, "-DestinationPath", outZip, "-Force"];
const res = spawnSync(
  "powershell",
  [
    "-NoProfile",
    "-Command",
    `${cmd} ${args.map((a) => (a.includes(" ") ? `"${a}"` : a)).join(" ")}`,
  ],
  { stdio: "inherit" },
);
if (res.status !== 0) {
  process.exit(res.status || 1);
}
console.log("Zip created");
