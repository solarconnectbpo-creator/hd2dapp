import type { DamagePhoto, FieldProject } from "./fieldProjectTypes";

/** Build a contractor-facing storm damage report from per-photo AI drafts. */
export function buildStormDamageReport(project: Pick<FieldProject, "name" | "address" | "photos" | "notes">): string {
  const photos = project.photos;
  const withAi = photos.filter((p) => p.aiSummary);
  const lines: string[] = [];

  lines.push("STORM DAMAGE REPORT");
  lines.push("===================");
  lines.push(`Property: ${project.address || project.name}`);
  lines.push(`Generated: ${new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`);
  lines.push(`Photos documented: ${photos.length}`);
  lines.push("");

  if (withAi.length === 0) {
    lines.push(
      photos.length === 0
        ? "No site photos yet. Capture roof and elevation images to generate AI findings."
        : "Photos saved. AI analysis pending or unavailable — findings will appear when analysis completes.",
    );
    if (project.notes?.trim()) {
      lines.push("");
      lines.push("Site notes");
      lines.push("----------");
      lines.push(project.notes.trim());
    }
    return lines.join("\n").slice(0, 8000);
  }

  const allTypes = new Set<string>();
  let maxSeverity = 1;
  const actions = new Map<string, number>();
  for (const p of withAi) {
    const ai = p.aiSummary!;
    for (const t of ai.damageTypes) allTypes.add(t);
    if (ai.severity > maxSeverity) maxSeverity = ai.severity;
    actions.set(ai.recommendedAction, (actions.get(ai.recommendedAction) ?? 0) + 1);
  }

  let topAction = "Further Inspection";
  let topCount = 0;
  for (const [action, count] of actions) {
    if (count > topCount) {
      topAction = action;
      topCount = count;
    }
  }

  lines.push("Executive summary");
  lines.push("-----------------");
  lines.push(
    `Visible indicators suggest ${[...allTypes].join(", ") || "possible storm-related wear"} ` +
      `with peak severity ${maxSeverity}/5 across ${withAi.length} analyzed photo(s). ` +
      `Recommended next step: ${topAction}. ` +
      `This is a visual assist only — a physical inspection is required before any claim or scope.`,
  );
  lines.push("");

  lines.push("Observed damage types");
  lines.push("--------------------");
  lines.push([...allTypes].length ? [...allTypes].map((t) => `• ${t}`).join("\n") : "• Further inspection needed");
  lines.push("");

  lines.push("Recommended action");
  lines.push("------------------");
  lines.push(topAction);
  lines.push("");

  lines.push("Photo findings");
  lines.push("--------------");
  const ordered = [...photos].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  ordered.forEach((ph, i) => {
    lines.push(formatPhotoFinding(i + 1, ph));
    lines.push("");
  });

  lines.push("Disclaimer");
  lines.push("----------");
  lines.push(
    "AI drafts support field documentation and do not replace licensed inspection, engineering, or insurer determinations.",
  );

  if (project.notes?.trim()) {
    lines.push("");
    lines.push("Field notes");
    lines.push("-----------");
    lines.push(project.notes.trim());
  }

  return lines.join("\n").slice(0, 8000);
}

function formatPhotoFinding(index: number, ph: DamagePhoto): string {
  const when = (() => {
    try {
      return new Date(ph.capturedAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
    } catch {
      return ph.capturedAt;
    }
  })();
  const caption = ph.caption?.trim() || `Photo ${index}`;
  if (!ph.aiSummary) {
    return `${index}. ${caption} (${when})\n   Analysis pending.`;
  }
  const ai = ph.aiSummary;
  return (
    `${index}. ${caption} (${when})\n` +
    `   ${ai.summary}\n` +
    `   Types: ${ai.damageTypes.join(", ") || "—"}; Severity ${ai.severity}/5; Action: ${ai.recommendedAction}\n` +
    `   ${ai.notes}`
  );
}
