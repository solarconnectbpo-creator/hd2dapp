import { describe, expect, it } from "vitest";
import {
  buildCustomerStormDamageReportHtml,
  buildCustomerStormDamageReportText,
  buildStormDamageReport,
  customerStormDamageReportFilename,
} from "./stormDamageReport";

const sampleProject = {
  name: "Job",
  address: "9 Oak Ave",
  photos: [
    {
      id: "ph-1",
      capturedAt: "2026-08-01T12:00:00.000Z",
      imageDataUrl: "data:image/jpeg;base64,a",
      caption: "North slope",
      aiSummary: {
        damageTypes: ["Hail", "Missing Shingles"],
        severity: 4,
        recommendedAction: "Insurance Claim Help",
        notes: "Granule loss visible on north face.",
        summary: "Hail bruising on north slope.",
      },
    },
    {
      id: "ph-2",
      capturedAt: "2026-08-01T12:01:00.000Z",
      imageDataUrl: "data:image/jpeg;base64,b",
      aiSummary: {
        damageTypes: ["Wind"],
        severity: 3,
        recommendedAction: "Further Inspection",
        notes: "Lifted shingles at ridge.",
        summary: "Wind lift at ridge.",
      },
    },
  ],
};

describe("buildStormDamageReport", () => {
  it("handles empty photos", () => {
    const report = buildStormDamageReport({
      name: "123 Main — storm damage",
      address: "123 Main St",
      photos: [],
    });
    expect(report).toContain("STORM DAMAGE REPORT");
    expect(report).toContain("No site photos yet");
  });

  it("aggregates AI photo findings", () => {
    const report = buildStormDamageReport(sampleProject);
    expect(report).toContain("9 Oak Ave");
    expect(report).toContain("Hail");
    expect(report).toContain("Wind");
    expect(report).toContain("Insurance Claim Help");
    expect(report).toContain("North slope");
    expect(report).toContain("peak severity 4/5");
  });
});

describe("customer storm damage report", () => {
  it("builds homeowner-facing plaintext with branding", () => {
    const text = buildCustomerStormDamageReportText(sampleProject, {
      companyName: "Hardcore Closers Roofing",
      preparedBy: "Alex Rep",
      contactPhone: "555-0100",
    });
    expect(text).toContain("PROPERTY DAMAGE REPORT");
    expect(text).toContain("Hardcore Closers Roofing");
    expect(text).toContain("Alex Rep");
    expect(text).toContain("9 Oak Ave");
    expect(text).toContain("Insurance Claim Help");
    expect(text).toContain("does not replace a licensed inspection");
  });

  it("builds printable HTML with escaped content and photo cards", () => {
    const html = buildCustomerStormDamageReportHtml(
      {
        ...sampleProject,
        notes: 'Owner said <script>alert("x")</script>',
      },
      {
        companyName: "Acme Roofing & Co",
        contactEmail: "hello@acme.test",
      },
    );
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("Customer damage report");
    expect(html).toContain("Acme Roofing &amp; Co");
    expect(html).toContain("9 Oak Ave");
    expect(html).toContain("Hail bruising on north slope.");
    expect(html).toContain("data:image/jpeg;base64,a");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain('<script>alert("x")</script>');
    expect(html).toContain("Save as PDF");
  });

  it("creates a safe download filename", () => {
    expect(customerStormDamageReportFilename({ name: "Job", address: "123 Main St!" })).toMatch(
      /^damage-report-123-Main-St-\d{4}-\d{2}-\d{2}\.html$/,
    );
  });
});
