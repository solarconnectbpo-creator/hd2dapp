import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import XLSX from "xlsx";

const workbookArg = process.argv[2] || "C:/Users/sethk/OneDrive/Desktop/AIcheatsheet_f69bb308.xlsx";
const outArg = process.argv[3] || "src/data/ai-cheatsheet-pricing.json";

const workbookPath = path.resolve(workbookArg);
const outputPath = path.resolve(outArg);

if (!fs.existsSync(workbookPath)) {
  console.error(`Workbook not found: ${workbookPath}`);
  process.exit(1);
}

const wb = XLSX.readFile(workbookPath);
const targetSheets = ["TPO", "Modified Bitumen", "EPDM", "PVC", "Roof Coatings"];

const payload = {
  sourceWorkbook: workbookPath,
  importedAtIso: new Date().toISOString(),
  priceList: "MOSL8X_OCT25",
  sheets: {},
};

for (const sheetName of targetSheets) {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) continue;
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const lines = [];

  for (const row of rows) {
    const description = String(row[0] ?? "").trim();
    const unit = String(row[2] ?? "").trim();
    const remove = Number.parseFloat(String(row[3] ?? ""));
    const replace = Number.parseFloat(String(row[4] ?? ""));
    const tax = Number.parseFloat(String(row[5] ?? ""));
    const oAndP = Number.parseFloat(String(row[6] ?? ""));

    if (!description || description.toUpperCase() === "DESCRIPTION") continue;
    if (!unit || Number.isNaN(replace)) continue;

    lines.push({
      description,
      unit,
      remove: Number.isNaN(remove) ? null : remove,
      replace,
      tax: Number.isNaN(tax) ? 0 : tax,
      oAndP: Number.isNaN(oAndP) ? null : oAndP,
    });
  }

  payload.sheets[sheetName] = lines;
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

console.log(`Imported AI cheat sheet pricing to ${outputPath}`);
