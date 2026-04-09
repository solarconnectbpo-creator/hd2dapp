/**
 * Compare who serves the apex vs Cloudflare Pages preview.
 * If apex shows Server: Vercel and Pages shows cloudflare, DNS still points the apex at Vercel.
 *
 * Usage: npm run pages:check-origin
 */
const TARGETS = [
  ["https://hardcoredoortodoorclosers.com/", "Apex (production)"],
  ["https://main.hd2d-closers.pages.dev/", "Pages branch (reference)"],
];

async function probe(url) {
  const res = await fetch(url, { method: "HEAD", redirect: "follow" });
  return {
    finalUrl: res.url,
    server: res.headers.get("server")?.trim() || "(no Server header)",
    via: res.headers.get("x-vercel-id") ? "vercel" : res.headers.get("cf-ray") ? "cloudflare" : "?",
  };
}

async function main() {
  console.log("HD2D production origin check\n");
  for (const [url, label] of TARGETS) {
    try {
      const p = await probe(url);
      console.log(`${label}`);
      console.log(`  ${url}`);
      console.log(`  Server: ${p.server}`);
      console.log("");
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      const cause = err.cause instanceof Error ? ` (${err.cause.message})` : "";
      console.error(`${label} FAILED: ${err.message}${cause}\n`);
    }
  }

  console.log(
    "Expected: both should be served by Cloudflare (Server often includes \"cloudflare\").\n" +
      "If apex shows Vercel: remove apex from Vercel Domains, fix Cloudflare DNS (no A → 76.76.21.21),\n" +
      "and ensure Workers & Pages → hd2d-closers → Custom domains has hardcoredoortodoorclosers.com Active.\n" +
      "See README \"Apex still on Vercel\".",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

