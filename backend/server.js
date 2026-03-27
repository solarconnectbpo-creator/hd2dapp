import cors from "cors";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const reportsDir = path.join(__dirname, "reports");

if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "roof-report-api" });
});

app.post("/api/report", (req, res) => {
  const { features = [], area = 0, address = "", state = "", pitch = "" } = req.body ?? {};

  const report = {
    id: Date.now(),
    total_area_sqft: Number(area) || 0,
    roof_sections: Array.isArray(features) ? features.length : 0,
    created_at: new Date().toISOString(),
    address,
    state,
    pitch,
    features: Array.isArray(features) ? features : [],
  };

  const filePath = path.join(reportsDir, `report-${report.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2), "utf8");

  res.json({ success: true, report });
});

app.get("/api/reports", (_req, res) => {
  const files = fs
    .readdirSync(reportsDir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse();

  const reports = files.map((file) =>
    JSON.parse(fs.readFileSync(path.join(reportsDir, file), "utf8")),
  );

  res.json(reports);
});

app.listen(5000, () => {
  console.log("Roof report API running on port 5000");
});
