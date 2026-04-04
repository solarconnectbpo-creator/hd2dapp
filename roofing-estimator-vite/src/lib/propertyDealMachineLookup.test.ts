import { describe, expect, it } from "vitest";
import { dealMachineResponseRootToPayload } from "./propertyDealMachineLookup";

describe("dealMachineResponseRootToPayload", () => {
  it("maps nested property + owner fields into PropertyImportPayload", () => {
    const root = {
      data: {
        property: {
          formattedAddress: "123 Oak St, Austin, TX 78701",
          streetAddress: "123 Oak St",
          city: "Austin",
          state: "TX",
          zipCode: "78701",
          latitude: 30.27,
          longitude: -97.74,
          squareFootage: 2100,
          yearBuilt: 1998,
          lotSquareFeet: 6000,
          ownerName: "Jane Example",
          ownerPhone: "5125550100",
          ownerEmail: "jane@example.com",
        },
      },
    };
    const p = dealMachineResponseRootToPayload(root);
    expect(p).not.toBeNull();
    expect(p!.address).toContain("Austin");
    expect(p!.ownerName).toContain("Jane");
    expect(p!.source).toBe("dealmachine");
  });

  it("returns null when no property-like object is present", () => {
    expect(dealMachineResponseRootToPayload({ errors: ["nope"] })).toBeNull();
  });

  it("maps API responses that wrap a single property under data.properties[0]", () => {
    const root = {
      data: {
        properties: [
          {
            formattedAddress: "456 Pine Rd, Denver, CO 80202",
            streetAddress: "456 Pine Rd",
            city: "Denver",
            state: "CO",
            zipCode: "80202",
            ownerName: "ACME LLC",
          },
        ],
      },
    };
    const p = dealMachineResponseRootToPayload(root);
    expect(p).not.toBeNull();
    expect(p!.ownerName).toContain("ACME");
  });
});
