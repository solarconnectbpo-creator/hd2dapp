/**
 * Nimbus Roofing Proprietary Knowledge Base
 * RAG (Retrieval-Augmented Generation) Data Store
 * 
 * This knowledge base contains proprietary business data used by the
 * Nimbus SEO Agent Pro for generating semantically relevant, keyword-rich content.
 */

export interface NimbusKnowledgeBase {
  keywordStrategy: {
    broadRoofingTerms: string[];
    geographicModifiers: string[];
    specificServices: string[];
    problemSolutionKeywords: string[];
    longTailQueries: string[];
    brandTerms: string[];
    intentBasedKeywords: string[];
  };
  claimsSuccessData: {
    avgSupplementValue: string;
    proprietaryMeasurements: string[];
    legalCompliance: string;
    targetMinValue: string;
    targetMaxValue: string;
  };
  operationalEfficiency: {
    speed: string;
    warranty: string;
    certifications: string[];
  };
  serviceArea: {
    primary: string;
    neighborhoods: string[];
    coverage: string;
  };
  expertise: {
    yearsInBusiness: number;
    founder: string;
    specializations: string[];
    insurancePartners: string[];
  };
  materials: {
    preferredBrand: string;
    shingleTypes: string[];
    warranty: string;
    impactResistance: string;
  };
}

export const NIMBUS_KNOWLEDGE: NimbusKnowledgeBase = {
  keywordStrategy: {
    broadRoofingTerms: [
      "roofing", "roofer", "roof repair", "roof replacement", "roof installation",
      "roofing contractors", "roofing companies", "commercial roofing",
      "residential roofing", "industrial roofing", "flat roof repair",
      "metal roof installation", "shingle roof repair", "tile roof replacement",
      "roof leak repair", "emergency roof repair", "storm damage roof repair",
      "new roof cost", "best roofing company", "affordable roofing",
      "local roofing", "roof maintenance", "roof inspection", "roofing services"
    ],
    geographicModifiers: [
      "McKinney TX", "Dallas TX", "Fort Worth TX", "Plano TX", "Frisco TX", "Allen TX",
      "Prosper TX", "Celina TX", "Anna TX", "Melissa TX", "Little Elm TX", "The Colony TX",
      "Lewisville TX", "Denton TX", "Garland TX", "Richardson TX", "Irving TX",
      "Grand Prairie TX", "Arlington TX", "Flower Mound TX", "Carrollton TX",
      "Grapevine TX", "Southlake TX", "Keller TX", "Mansfield TX", "Rockwall TX",
      "Royse City TX", "Wylie TX", "Murphy TX", "Parker TX", "Fairview TX",
      "Lucas TX", "Farmersville TX", "Princeton TX", "Savannah TX", "Union Park TX",
      "Aubrey TX", "Cross Roads TX", "Corinth TX", "Lake Dallas TX", "Highland Village TX",
      "Argyle TX", "Roanoke TX", "Haslet TX", "Justin TX", "New Fairview TX",
      "Krum TX", "Sanger TX", "Decatur TX", "Bridgeport TX", "Springtown TX",
      "Azle TX", "Benbrook TX", "Burleson TX", "Cleburne TX", "Crowley TX",
      "Euless TX", "Bedford TX", "North Richland Hills TX", "Hurst TX", "Colleyville TX",
      "Westlake TX", "Trophy Club TX", "Saginaw TX", "Watauga TX", "Haltom City TX",
      "Forest Hill TX", "Kennedale TX", "Rendon TX", "Joshua TX", "Keene TX",
      "Godley TX", "Granbury TX", "Weatherford TX", "Mineral Wells TX", "Midlothian TX",
      "Waxahachie TX", "Ennis TX", "Corsicana TX", "Terrell TX", "Kaufman TX",
      "Forney TX", "Sunnyvale TX", "Mesquite TX", "Rowlett TX", "Sachse TX",
      "Nevada TX", "Josephine TX", "Caddo Mills TX", "Greenville TX", "Commerce TX",
      "Howe TX", "Van Alstyne TX", "Sherman TX", "Denison TX", "Pottsboro TX",
      "Gainesville TX", "Collin County TX", "Denton County TX", "Tarrant County TX",
      "Dallas County TX", "Rockwall County TX", "Kaufman County TX", "Ellis County TX"
    ],
    specificServices: [
      "asphalt shingle roofing", "metal roofing", "TPO roofing", "EPDM roofing",
      "PVC roofing", "slate roofing", "tile roofing", "wood shake roofing",
      "synthetic roofing", "solar roof installation", "skylight repair",
      "skylight installation", "gutter repair", "gutter installation",
      "soffit repair", "fascia repair", "chimney repair", "roof vent installation",
      "attic ventilation", "roof decking repair", "roof decking replacement",
      "roof insulation", "waterproofing roof", "roof coatings", "green roofing",
      "cool roof systems", "spray foam roofing", "modified bitumen roofing",
      "built-up roofing", "roof flashing repair", "roof valley repair",
      "ridge cap repair", "soffit and fascia replacement", "gutter guard installation",
      "commercial flat roof", "commercial metal roof", "industrial roof repair",
      "restaurant roof repair", "church roof repair", "school roof repair",
      "office building roof repair", "retail roof repair", "warehouse roof repair",
      "apartment complex roof repair", "condo roof repair", "HOA roofing",
      "multi-family roofing", "steep slope roofing", "low slope roofing"
    ],
    problemSolutionKeywords: [
      "roof leak fix", "roof damage repair", "hail damage roof repair",
      "wind damage roof repair", "storm damage roofing", "roof emergency",
      "leaky roof repair", "missing shingles repair", "roof sagging repair",
      "collapsed roof repair", "rotten wood roof repair", "ice dam removal",
      "attic mold roof", "roof condensation", "noisy roof", "roof insurance claim",
      "insurance approved roofing contractor", "filing roof insurance claim",
      "help with roof claim"
    ],
    longTailQueries: [
      "how much does a new roof cost", "average cost of roof replacement",
      "roof repair near me open now", "best time to replace a roof",
      "signs I need a new roof", "how to choose a roofing contractor",
      "roofing companies with good reviews", "licensed and insured roofing contractors",
      "free roof inspection", "get a roof estimate",
      "what to do if your roof is leaking", "emergency roof tarp service",
      "roofing options for my home", "is my roof damaged by hail",
      "how long does a roof last", "metal roof vs shingle roof",
      "TPO roof vs EPDM roof", "roofing financing options",
      "roofing payment plans", "local roofers near me",
      "top rated roofing companies", "experienced roofers",
      "certified roofing professionals", "roofing testimonials",
      "roofing case studies", "roofing frequently asked questions",
      "what to look for in a roofing company", "roof repair vs roof replacement cost"
    ],
    brandTerms: [
      "Nimbus Roofing", "Nimbus Roofing reviews", "Nimbus Roofing contact",
      "Nimbus Roofing services", "Dustin D. Moore Nimbus Roofing",
      "Nimbus AI-Roofing Agent", "Nimbus Roofing McKinney"
    ],
    intentBasedKeywords: [
      "roofing estimate", "roof repair quote", "find a roofer",
      "roofing company near me", "hire roofing contractor",
      "schedule roof inspection", "get roof quote", "contact roofer"
    ]
  },
  claimsSuccessData: {
    avgSupplementValue: "$4,200+",
    proprietaryMeasurements: [
      "Slopes (8/12, 12/12 pitch calculations)",
      "Rotted decking quantities with precise measurements",
      "Ice and water barrier status assessment",
      "Pipe painting status (three-thirds painted method)",
      "Hail damage impact point mapping",
      "Wind damage assessment protocols"
    ],
    legalCompliance: "Texas Deductible Law Mandate - Full legal compliance in all insurance claim processes",
    targetMinValue: "$20,000",
    targetMaxValue: "$100,000 for residential steep slope hail damage claims (up to 100 sq)"
  },
  operationalEfficiency: {
    speed: "Complete roof replacement in one day, starting at sunrise",
    warranty: "5-year workmanship warranty on all installations",
    certifications: [
      "Owens Corning Preferred Contractor",
      "Texas Licensed Roofing Contractor",
      "Dustin Moore - Texas All Lines Adjuster License #2820344",
      "NTRCA Member (North Texas Roofing Contractors Association)"
    ]
  },
  serviceArea: {
    primary: "McKinney, Texas",
    neighborhoods: [
      "Stonebridge Ranch",
      "Craig Ranch",
      "Eldorado Heights",
      "Trinity Falls",
      "Tucker Hill",
      "Adriatica Village"
    ],
    coverage: "Serving McKinney, Plano, Frisco, Allen, and surrounding Collin County areas"
  },
  expertise: {
    yearsInBusiness: 10,
    founder: "Dustin Moore, Professional Roofer since 2015",
    specializations: [
      "Storm damage restoration",
      "Insurance claims assistance",
      "Residential steep slope roofing",
      "Commercial flat roof systems",
      "Emergency roof repairs",
      "Hail damage assessment"
    ],
    insurancePartners: [
      "State Farm",
      "Allstate",
      "USAA",
      "Farmers Insurance",
      "Liberty Mutual",
      "Nationwide"
    ]
  },
  materials: {
    preferredBrand: "Owens Corning Duration Series",
    shingleTypes: [
      "Duration IR (Impact Resistant) Class 3",
      "Duration Storm (Class 4 Impact Resistance)",
      "Duration Flex (Algae Resistant)",
      "Architectural shingles with 130 MPH wind resistance"
    ],
    warranty: "Limited Lifetime Warranty from Owens Corning + 5-year workmanship warranty",
    impactResistance: "Class 3 and Class 4 impact-resistant shingles for hail protection"
  }
};

/**
 * SEO Keywords Database - High-Value Target Keywords
 * Organized by category and search intent
 */
export const SEO_KEYWORDS = {
  stormDamage: [
    "hail damage roof repair McKinney TX",
    "storm damage restoration McKinney",
    "roof hail damage insurance claim",
    "wind damage roof repair",
    "emergency roof repair McKinney",
    "24/7 emergency roofing service"
  ],
  insuranceClaims: [
    "roofing company insurance claims assistance",
    "help with roof insurance claim",
    "roof insurance claim process Texas",
    "supplement roof insurance claim",
    "maximize roof insurance payout",
    "Texas deductible law roofing"
  ],
  localSEO: [
    "roofing contractor McKinney TX",
    "best roofer near me McKinney",
    "highest rated roofing company McKinney",
    "McKinney roofing company reviews",
    "trusted roofer McKinney Texas",
    "licensed roofing contractor Collin County"
  ],
  services: [
    "residential roof replacement McKinney",
    "commercial roofing McKinney TX",
    "roof inspection McKinney",
    "roof maintenance plans",
    "steep slope roofing",
    "flat roof repair commercial"
  ],
  materials: [
    "Owens Corning preferred contractor McKinney",
    "impact resistant shingles Texas",
    "Class 4 shingles hail protection",
    "Duration shingles McKinney",
    "architectural shingles installation",
    "130 MPH wind resistant shingles"
  ]
};

/**
 * Content Templates for Different Topics
 */
export const CONTENT_TEMPLATES = {
  stormDamage: {
    title: "Storm Damage Restoration in {location}",
    focus: "Emergency response, insurance claims, rapid repairs",
    cta: "Get a free storm damage inspection within 24 hours"
  },
  insuranceClaims: {
    title: "Maximizing Your Roof Insurance Claim in {location}",
    focus: "Proprietary measurements, supplement value, legal compliance",
    cta: "Schedule a free insurance claim consultation"
  },
  neighborhood: {
    title: "Professional Roofing Services in {neighborhood}, McKinney TX",
    focus: "Local expertise, HOA compliance, neighborhood-specific requirements",
    cta: "Get a free estimate for your {neighborhood} home"
  },
  materials: {
    title: "Best Roofing Materials for Texas Weather",
    focus: "Impact resistance, wind ratings, warranty coverage",
    cta: "See your roof with our AI-powered visualizer"
  }
};

/**
 * Retrieve relevant knowledge based on topic
 */
export function retrieveKnowledge(topic: string): string {
  const knowledge = NIMBUS_KNOWLEDGE;
  
  let context = `Nimbus Roofing - Professional roofing services since 2015\n`;
  context += `Founded by ${knowledge.expertise.founder}\n`;
  context += `Service Area: ${knowledge.serviceArea.coverage}\n\n`;
  
  if (topic.includes('storm') || topic.includes('hail') || topic.includes('damage')) {
    context += `Storm Damage Expertise:\n`;
    context += `- Average supplement value discovered: ${knowledge.claimsSuccessData.avgSupplementValue}\n`;
    context += `- Target claim value range: ${knowledge.claimsSuccessData.targetMinValue} to ${knowledge.claimsSuccessData.targetMaxValue}\n`;
    context += `- Proprietary measurement systems for accurate damage assessment\n`;
    context += `- ${knowledge.claimsSuccessData.legalCompliance}\n\n`;
  }
  
  if (topic.includes('insurance') || topic.includes('claim')) {
    context += `Insurance Claims Assistance:\n`;
    context += `- Licensed Texas All Lines Adjuster on staff (License #2820344)\n`;
    context += `- Proprietary measurement techniques:\n`;
    knowledge.claimsSuccessData.proprietaryMeasurements.forEach(m => {
      context += `  * ${m}\n`;
    });
    context += `\n`;
  }
  
  context += `Operational Excellence:\n`;
  context += `- ${knowledge.operationalEfficiency.speed}\n`;
  context += `- ${knowledge.operationalEfficiency.warranty}\n`;
  context += `- Certifications: ${knowledge.operationalEfficiency.certifications.join(', ')}\n\n`;
  
  context += `Premium Materials:\n`;
  context += `- ${knowledge.materials.preferredBrand}\n`;
  context += `- ${knowledge.materials.warranty}\n`;
  context += `- ${knowledge.materials.impactResistance}\n`;
  
  return context;
}
