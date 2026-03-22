import { appendRoofReportsBatch } from "./roofReportStorage";
import { createBulkDamageReportFromLead } from "./createBulkDamageReportFromLead";
import type {
  DamageRoofReport,
  PropertySelection,
  RoofReportCreatedBy,
} from "./roofReportTypes";

export type BulkPersistDamageReportsOptions = {
  companyNameFallback?: string;
  createdBy?: RoofReportCreatedBy;
  onProgress?: (done: number, total: number) => void;
};

const BATCH_SIZE = 50;

/**
 * Saves one AI-assisted damage report per lead (batched for browser storage).
 */
export async function persistBulkDamageReportsFromLeads(
  leads: PropertySelection[],
  opts: BulkPersistDamageReportsOptions = {},
): Promise<{ reports: DamageRoofReport[]; compact: boolean }> {
  if (leads.length === 0) {
    return { reports: [], compact: false };
  }

  const base = Date.now();
  const compact = leads.length >= 80;
  const out: DamageRoofReport[] = [];

  for (let start = 0; start < leads.length; start += BATCH_SIZE) {
    const end = Math.min(start + BATCH_SIZE, leads.length);
    const batch: DamageRoofReport[] = [];
    for (let i = start; i < end; i++) {
      batch.push(
        createBulkDamageReportFromLead(leads[i], {
          idSeed: base + i,
          companyNameFallback: opts.companyNameFallback,
          createdBy: opts.createdBy,
          compact,
        }),
      );
    }
    await appendRoofReportsBatch(batch);
    out.push(...batch);
    opts.onProgress?.(end, leads.length);
  }

  return { reports: out, compact };
}
