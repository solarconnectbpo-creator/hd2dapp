import { describe, expect, it } from "vitest";
import { buildCoxIlContractHtml } from "./buildCoxIlContractHtml";
import { COX_IL_COMPANY } from "./coxIlCompany";
import { emptyCoxIlContractFields } from "./coxIlContractTypes";
import { mapCoxIlContractFields, splitLossAddress } from "./mapCoxIlContractFields";

describe("Cox IL contract pack", () => {
  it("splits loss address into street and city/state/zip", () => {
    expect(splitLossAddress("123 Oak St, Naperville, IL 60540")).toEqual({
      lossAddress: "123 Oak St",
      cityStateZip: "Naperville, IL 60540",
    });
  });

  it("maps proposal fields into the IL contract", () => {
    const fields = mapCoxIlContractFields({
      proposal: {
        profile: "residential",
        companyName: "Cox",
        companyAddress: "",
        companyWebsite: "",
        logoDataUrl: "",
        preparedBy: "Alex Rep",
        clientName: "Jane Homeowner",
        clientCompany: "",
        clientEmail: "jane@example.com",
        clientPhone: "6305551212",
        contactEmail: "",
        contactPhone: "",
        proposalTitle: "Roof",
        inclusions: "",
        exclusions: "",
        paymentSchedule: "",
        warranty: "",
        alternates: "",
        financingNotes: "",
      },
      address: "700 Main St, Oak Brook, IL 60523",
      stateCode: "IL",
      contractDate: "8/2/2026",
    });
    expect(fields.customerName).toBe("Jane Homeowner");
    expect(fields.lossAddress).toBe("700 Main St");
    expect(fields.cityStateZip).toContain("Oak Brook");
    expect(fields.contractorRepName).toBe("Alex Rep");
    expect(fields.contractDate).toBe("8/2/2026");
  });

  it("builds HTML with Cox IL brand, statutes, and Oak Brook contact", () => {
    const html = buildCoxIlContractHtml(
      emptyCoxIlContractFields({
        customerName: "Test Customer",
        lossAddress: "1 Test Rd",
        cityStateZip: "Oak Brook, IL 60523",
        contractDate: "8/2/2026",
      }),
    );
    expect(html).toContain("Cox Roofing &amp; Restoration LLC");
    expect(html).toContain(COX_IL_COMPANY.addressLine1);
    expect(html).toContain(COX_IL_COMPANY.cityStateZip);
    expect(html).toContain(COX_IL_COMPANY.phoneDisplay);
    expect(html).toContain("815 ILCS 513");
    expect(html).toContain("Senior Citizen Exception");
    expect(html).toContain("Insurance Claim Denial");
    expect(html).toContain("Mechanic's Lien Notice");
    expect(html).toContain("Know Your Consumer Rights");
    expect(html).toContain("DuPage County");
    expect(html).not.toContain("Repair King");
    expect(html).not.toContain("Hammer Roofing");
    expect(html).not.toContain("Naperville");
    expect(html).not.toContain("RSMo");
    expect(html).not.toContain("St. Louis County");
  });
});
