import { drizzle } from "drizzle-orm/mysql2";
import { leads } from "../drizzle/schema";

const db = drizzle(process.env.DATABASE_URL!);

const customerLeads = [
  {
    name: "Lisa Prior",
    phone: "(469) 667-9665",
    email: null,
    address: "7901 Medina Way, McKinney, TX 75071",
    source: "referral",
    leadType: "quote",
    priority: "medium",
    status: "new",
    sentiment: "neutral",
    notes: "Residential roofing quote request",
    companyCamUrl: null,
  },
  {
    name: "Michael Mannix",
    phone: null,
    email: null,
    address: "1215 Brooklyn Dr, McKinney, TX 75071",
    source: "inspection",
    leadType: "inspection",
    priority: "medium",
    status: "contacted",
    sentiment: "positive",
    notes: "Roof inspection completed - photos available",
    companyCamUrl: "https://app.companycam.com/galleries/MgN7QRU2",
  },
  {
    name: "Ellen Krause",
    phone: null,
    email: null,
    address: "1105 Cherry Blossom St, Anna, TX 75409",
    source: "inspection",
    leadType: "repair",
    priority: "high",
    status: "qualified",
    sentiment: "positive",
    notes: "Storm damage repair - photos show significant damage",
    companyCamUrl: "https://app.companycam.com/galleries/6EqmpQmQ",
  },
  {
    name: "Byron Foot",
    phone: null,
    email: null,
    address: "7420 Elm Fork Dr, McKinney, TX 75071",
    source: "inspection",
    leadType: "quote",
    priority: "medium",
    status: "contacted",
    sentiment: "neutral",
    notes: "Roof replacement quote - inspection photos available",
    companyCamUrl: "https://app.companycam.com/galleries/L1utkHDz",
  },
  {
    name: "Don and Cindy Vermeer",
    phone: null,
    email: null,
    address: "7609 Blanco Trail, McKinney, TX 75071",
    source: "inspection",
    leadType: "insurance",
    priority: "high",
    status: "new",
    sentiment: "neutral",
    notes: "Insurance claim assistance needed - inspection completed",
    companyCamUrl: "https://app.companycam.com/galleries/YVSwjenY",
  },
  {
    name: "Melinda Mioni",
    phone: "(972) 523-9490",
    email: "Melinda.mione@gmail.com",
    address: "801 Llano Falls, McKinney, TX 75071",
    source: "call",
    leadType: "quote",
    priority: "medium",
    status: "new",
    sentiment: "positive",
    notes: "Called for roofing quote - very interested",
    companyCamUrl: null,
  },
  {
    name: "Entowu Femi",
    phone: "(317) 514-0331",
    email: "phemtol@yahoo.com",
    address: "7712 Weatherford Trace, McKinney, TX 75071",
    source: "email",
    leadType: "repair",
    priority: "high",
    status: "contacted",
    sentiment: "neutral",
    notes: "Roof repair needed - photos show leak damage",
    companyCamUrl: "https://app.companycam.com/galleries/mF4FajBa",
  },
];

async function importLeads() {
  console.log("Importing 7 customer leads...");

  for (const lead of customerLeads) {
    try {
      await db.insert(leads).values({
        ...lead,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`✓ Imported: ${lead.name}`);
    } catch (error) {
      console.error(`✗ Failed to import ${lead.name}:`, error);
    }
  }

  console.log("\n✅ Lead import complete!");
  process.exit(0);
}

importLeads().catch((error) => {
  console.error("Import failed:", error);
  process.exit(1);
});
