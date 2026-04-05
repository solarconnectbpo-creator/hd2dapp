import { describe, expect, it } from "vitest";
import {
  ROOFING_BACKUP_SCHEMA_VERSION_V1,
  buildRoofingBackupPayload,
  parseRoofingBackupJson,
} from "./roofingBackup";
import type { Contract, Estimate, Measurement } from "../context/RoofingContext";
import type { FieldProject } from "./fieldProjectTypes";

const sampleM: Measurement = {
  id: "m1",
  projectName: "Test",
  date: "2026-01-01",
  roofMaterial: "Asphalt Shingle",
  roofForm: "gable",
  length: 10,
  width: 20,
  pitch: 6,
  totalArea: 200,
  wastePercentage: 10,
  adjustedArea: 220,
};

const sampleE: Estimate = {
  id: "e1",
  measurementId: "m1",
  projectName: "Test",
  date: "2026-01-01",
  materials: [],
  labor: [],
  subtotal: 100,
  tax: 10,
  total: 110,
};

const sampleC: Contract = {
  id: "c1",
  estimateId: "e1",
  projectName: "Test",
  clientName: "A",
  clientAddress: "1 St",
  clientPhone: "",
  clientEmail: "",
  date: "2026-01-01",
  startDate: "",
  completionDate: "",
  terms: "",
  totalAmount: 110,
  depositAmount: 0,
  status: "draft",
};

const sampleFp: FieldProject = {
  id: "fp1",
  name: "Field",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  pipelineStage: "intake",
  photos: [],
  linkedMeasurementId: null,
  tags: [],
};

describe("parseRoofingBackupJson", () => {
  it("round-trips a valid v2 payload", () => {
    const payload = buildRoofingBackupPayload([sampleM], [sampleE], [sampleC], [sampleFp]);
    const parsed = parseRoofingBackupJson(payload);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.measurements).toHaveLength(1);
    expect(parsed.data.estimates).toHaveLength(1);
    expect(parsed.data.contracts).toHaveLength(1);
    expect(parsed.data.fieldProjects).toHaveLength(1);
  });

  it("accepts v1 backup with empty fieldProjects", () => {
    const r = parseRoofingBackupJson({
      schemaVersion: ROOFING_BACKUP_SCHEMA_VERSION_V1,
      measurements: [sampleM],
      estimates: [sampleE],
      contracts: [sampleC],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.fieldProjects).toEqual([]);
  });

  it("rejects wrong version", () => {
    const r = parseRoofingBackupJson({
      schemaVersion: 99,
      measurements: [],
      estimates: [],
      contracts: [],
    });
    expect(r.ok).toBe(false);
  });
});
