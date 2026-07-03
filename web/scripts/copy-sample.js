const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const source = path.join(root, "data", "output", "tanguytare_display_profile.json");
const targetDir = path.join(__dirname, "..", "public", "sample");
const target = path.join(targetDir, "tanguytare_display_profile.json");

if (!fs.existsSync(source)) {
  console.error(`Missing source file: ${source}`);
  process.exit(1);
}

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(source, target);
console.log(`Copied ${source} -> ${target}`);
