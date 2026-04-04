/**
 * Verifies the deployed Worker includes the latest health payload (workerBuild).
 * Run after: npx wrangler deploy --env=""
 */
const url = process.argv[2] || "https://hd2d-backend.solarconnectbpo.workers.dev/api/health";
const res = await fetch(url);
const text = await res.text();
let data;
try {
  data = JSON.parse(text);
} catch {
  console.error("Not JSON:", text.slice(0, 200));
  process.exitCode = 1;
}
if (process.exitCode !== 1) {
  if (!data.workerBuild) {
    console.error(
      "Deployed Worker is stale (no workerBuild in /api/health). From backend/: npm run deploy",
    );
    process.exitCode = 1;
  } else {
    console.log("OK workerBuild=", data.workerBuild);
  }
}
