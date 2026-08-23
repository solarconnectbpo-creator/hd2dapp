import { describe, expect, it } from "vitest";
import { buildCoxMoSolarContractHtml, dollarsInWords } from "./buildCoxMoSolarContractHtml";
import { CORVUS_PRO_SOLAR, COX_MO_SOLAR_COMPANY } from "./coxMoSolarCompany";
import { emptyCoxMoSolarContractFields } from "./coxMoSolarContractTypes";
import { mapCoxMoSolarContractFields } from "./mapCoxMoSolarContractFields";

describe("Cox MO solar contract pack", () => {
  it("maps proposal fields into the Missouri solar contract", () => {
    const fields = mapCoxMoSolarContractFields({
      proposal: {
        profile: "residential",
        companyName: "Cox Solar",
        companyAddress: "",
        companyWebsite: "",
        logoDataUrl: "",
        preparedBy: "Alex Rep",
        clientName: "Jordan Homeowner",
        clientCompany: "",
        clientEmail: "jordan@example.com",
        clientPhone: "4175551212",
        contactEmail: "",
        contactPhone: "4175550100",
        proposalTitle: "8.4 kW rooftop PV",
        inclusions: "Roof-mounted modules, hybrid inverter, monitoring",
        exclusions: "Main-panel upgrade",
        paymentSchedule: "Deposit 20%; balance at PTO",
        warranty: "10-year workmanship",
        alternates: "",
        financingNotes: "Subject to lender approval",
      },
      address: "1200 E Republic Rd, Springfield, MO 65804",
      stateCode: "MO",
      contractDate: "8/23/2026",
      contractSum: 28500,
      systemSizeKw: "8.4",
      panelCount: "21",
      inverter: "Hybrid 7.6 kW",
      county: "Greene",
    });
    expect(fields.customerName).toBe("Jordan Homeowner");
    expect(fields.streetAddress).toBe("1200 E Republic Rd");
    expect(fields.cityStateZip).toContain("Springfield");
    expect(fields.cityStateZip).toContain("MO");
    expect(fields.contractorRepName).toBe("Alex Rep");
    expect(fields.contractDate).toBe("8/23/2026");
    expect(fields.contractSum).toBe("28,500");
    expect(fields.specifications).toContain("8.4 kW rooftop PV");
    expect(fields.specifications).toContain("Roof-mounted modules");
    expect(fields.paymentTerms).toContain("Deposit 20%");
    expect(fields.county).toBe("Greene");
  });

  it("formats whole-dollar amounts in words", () => {
    expect(dollarsInWords("28500")).toBe("Twenty Eight Thousand Five Hundred");
    expect(dollarsInWords("$1,015")).toBe("One Thousand Fifteen");
    expect(dollarsInWords("")).toBe("");
  });

  it("builds HTML with Cox Solar brand, Corvus EC license, and Missouri statutes", () => {
    const html = buildCoxMoSolarContractHtml(
      emptyCoxMoSolarContractFields({
        customerName: "Test Customer",
        streetAddress: "1 Test Rd",
        cityStateZip: "Springfield, MO 65804",
        contractDate: "8/23/2026",
        contractSum: "28500",
        specifications: "Roof-mounted photovoltaic system",
        ecLicenseNumber: "EC-TEST-123",
      }),
    );
    expect(html).toContain("Cox Solar");
    expect(html).toContain(COX_MO_SOLAR_COMPANY.phoneDisplay);
    expect(html).toContain(CORVUS_PRO_SOLAR.legalName);
    expect(html).toContain(CORVUS_PRO_SOLAR.addressLine1);
    expect(html).toContain("EC-TEST-123");
    expect(html).toContain("Missouri Statewide Electrical Contractor");
    expect(html).toContain("RSMo 407.710");
    expect(html).toContain("407.700");
    expect(html).toContain("CHAPTER 429, RSMO");
    expect(html).toContain("LIEN WAIVERS");
    expect(html).toContain("442.012");
    expect(html).toContain("442.404");
    expect(html).toContain("386.890");
    expect(html).toContain("Twenty Eight Thousand Five Hundred");
    expect(html).toContain("Copy 1 of 2");
    expect(html).toContain("Copy 2 of 2");
    expect(html).toContain("WHITE — LENDER");
    expect(html).not.toContain("Freedom Solar");
    expect(html).not.toContain("Florida");
    expect(html).not.toContain("815 ILCS");
    expect(html).not.toContain("§558");
    expect(html).not.toContain("CILB");
    expect(html).not.toContain("Repair King");
  });
});
