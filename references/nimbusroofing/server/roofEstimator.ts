/**
 * Roof Estimation Calculator
 * Based on Nimbus production code with proper pitch/slope math
 * Handles EagleView-style sloped area inputs and generates insurance-ready estimates
 */

export interface Facet {
  areaSqft: number;
  pitch: string; // e.g., "6/12"
  label?: string;
  areaType: 'PLANAR' | 'SLOPED'; // PLANAR gets multiplied by pitch; SLOPED does not
}

export interface LinearFeatures {
  ridges: number;
  hips: number;
  valleys: number;
  eaves: number;
  rakes: number;
}

export interface RoofEstimatorInput {
  facets: Facet[];
  linearFeatures: LinearFeatures;
  perimeter: number;
  numPipeJacks: number;
  numVents: number;
  numExhaust: number;
  includeIceWater?: boolean;
  wasteOverridePct?: number;
}

export interface LineItem {
  desc: string;
  qty: string;
  unitRateLabor: number;
  unitRateMaterial: number;
  labor: number;
  material: number;
  total: number;
}

export interface EstimateSummary {
  totalSlopedSqft: number;
  totalSlopedSquares: number;
  wastePct: number;
  totalWithWasteSq: number;
  iceWaterSq: number;
  laborSubtotal: number;
  materialSubtotal: number;
  subtotal: number;
  taxableBase: number;
  tax: number;
  op: number;
  grandTotal: number;
}

export interface EstimateResult {
  summary: EstimateSummary;
  lineItems: LineItem[];
}

// Texas market rates (Dec 2025) - tune these based on your actual pricing
const COSTS = {
  tear_off_per_sq: { labor: 60.00, material: 20.00 },
  synthetic_underlayment_per_sq: { labor: 35.00, material: 30.00 },
  ice_water_per_sq: { labor: 45.00, material: 65.00 },
  shingles_3tab_per_sq: { labor: 230.00, material: 150.00 },
  shingles_architectural_per_sq: { labor: 250.00, material: 180.00 },
  shingles_impact_resistant_per_sq: { labor: 270.00, material: 220.00 },
  starter_per_lf: { labor: 1.25, material: 1.25 },
  drip_edge_per_lf: { labor: 1.50, material: 1.50 },
  valley_metal_per_lf: { labor: 5.00, material: 5.00 },
  pipe_jack_per_ea: { labor: 45.00, material: 40.00 },
  roof_vent_per_ea: { labor: 55.00, material: 45.00 },
  exhaust_cap_per_ea: { labor: 75.00, material: 65.00 },
  ridge_vent_per_lf: { labor: 9.00, material: 6.00 },
};

const TAX_RATE = 0.0825; // 8.25% Texas sales tax
const OP_RATE = 0.20; // 20% overhead & profit (10/10)
const ICE_WATER_EAVE_WIDTH_FT = 3.0; // 36 inches
const ICE_WATER_VALLEY_WIDTH_FT = 3.0; // 36 inches

/**
 * Convert pitch string (e.g., "6/12") to slope multiplier
 */
function pitchToMultiplier(pitch: string): number {
  const [riseStr, runStr] = pitch.split('/');
  const rise = parseFloat(riseStr);
  const run = parseFloat(runStr);
  return Math.sqrt(1 + Math.pow(rise / run, 2));
}

/**
 * Calculate sloped area for a facet
 */
function facetSlopedArea(facet: Facet): number {
  if (facet.areaType === 'SLOPED') {
    return facet.areaSqft; // Already sloped, don't multiply again
  }
  return facet.areaSqft * pitchToMultiplier(facet.pitch);
}

/**
 * Main estimation function
 */
export function calculateRoofEstimate(input: RoofEstimatorInput, shingleType: 'standard' | 'architectural' | 'impact_resistant' = 'architectural'): EstimateResult {
  const {
    facets,
    linearFeatures,
    perimeter,
    numPipeJacks,
    numVents,
    numExhaust,
    includeIceWater = true,
    wasteOverridePct,
  } = input;

  // Calculate total sloped area
  const totalSlopedSqft = facets.reduce((sum, f) => sum + facetSlopedArea(f), 0);
  const totalSquares = totalSlopedSqft / 100.0;

  // Apply waste factor
  const wastePct = wasteOverridePct !== undefined ? wasteOverridePct : 15.0;
  const totalWithWasteSq = totalSquares * (1.0 + wastePct / 100.0);

  // Ice & Water calculation
  let iceWaterSqft = 0.0;
  if (includeIceWater) {
    const eavesArea = linearFeatures.eaves * ICE_WATER_EAVE_WIDTH_FT;
    const valleyArea = linearFeatures.valleys * ICE_WATER_VALLEY_WIDTH_FT;
    iceWaterSqft = eavesArea + valleyArea;
  }
  const iceWaterSq = iceWaterSqft / 100.0;

  const lineItems: LineItem[] = [];
  let laborSub = 0.0;
  let materialSub = 0.0;

  // Helper to add line items
  const addLine = (
    desc: string,
    qtyVal: number,
    qtyUnit: string,
    rateKey: keyof typeof COSTS,
    qtyDisplay?: string
  ) => {
    const rates = COSTS[rateKey];
    const labor = qtyVal * rates.labor;
    const material = qtyVal * rates.material;
    const total = labor + material;

    lineItems.push({
      desc,
      qty: qtyDisplay || `${qtyVal.toFixed(2)} ${qtyUnit}`,
      unitRateLabor: rates.labor,
      unitRateMaterial: rates.material,
      labor: parseFloat(labor.toFixed(2)),
      material: parseFloat(material.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
    });

    laborSub += labor;
    materialSub += material;
  };

  // Tear-off (no waste)
  addLine(
    'Tear off & dispose composition shingles',
    totalSquares,
    'SQ',
    'tear_off_per_sq',
    `${totalSquares.toFixed(2)} SQ`
  );

  // Synthetic underlayment (with waste)
  addLine(
    'Install synthetic underlayment (full deck)',
    totalWithWasteSq,
    'SQ',
    'synthetic_underlayment_per_sq',
    `${totalWithWasteSq.toFixed(2)} SQ`
  );

  // Ice & Water Shield
  if (iceWaterSq > 0) {
    addLine(
      'Install Ice & Water Shield (eaves + valleys)',
      iceWaterSq,
      'SQ',
      'ice_water_per_sq',
      `${iceWaterSq.toFixed(2)} SQ`
    );
  }

  // Drip Edge
  if (perimeter > 0) {
    addLine(
      'Install metal drip edge (full perimeter)',
      perimeter,
      'LF',
      'drip_edge_per_lf',
      `${perimeter.toFixed(2)} LF`
    );
  }

  // Starter course
  if (perimeter > 0) {
    addLine(
      'Install universal starter course',
      perimeter,
      'LF',
      'starter_per_lf',
      `${perimeter.toFixed(2)} LF`
    );
  }

  // Valley metal flashing
  if (linearFeatures.valleys > 0) {
    addLine(
      'R&R valley metal flashing',
      linearFeatures.valleys,
      'LF',
      'valley_metal_per_lf',
      `${linearFeatures.valleys.toFixed(2)} LF`
    );
  }

  // Shingles (with waste) - select type
  const shingleRateKey = 
    shingleType === 'impact_resistant' ? 'shingles_impact_resistant_per_sq' :
    shingleType === 'architectural' ? 'shingles_architectural_per_sq' :
    'shingles_3tab_per_sq';
  
  const shingleDesc = 
    shingleType === 'impact_resistant' ? 'Install Class 4 IR architectural shingles' :
    shingleType === 'architectural' ? 'Install architectural composition shingles' :
    'Install 3-tab 25yr composition shingles';

  addLine(
    shingleDesc,
    totalWithWasteSq,
    'SQ',
    shingleRateKey,
    `${totalWithWasteSq.toFixed(2)} SQ`
  );

  // Ridge vent
  if (linearFeatures.ridges > 0) {
    addLine(
      'Install ridge vent',
      linearFeatures.ridges,
      'LF',
      'ridge_vent_per_lf',
      `${linearFeatures.ridges.toFixed(2)} LF`
    );
  }

  // Pipe jacks
  if (numPipeJacks > 0) {
    addLine(
      'R&R pipe flashing jacks',
      numPipeJacks,
      'EA',
      'pipe_jack_per_ea',
      `${numPipeJacks} EA`
    );
  }

  // Roof vents
  if (numVents > 0) {
    addLine(
      'R&R roof vents',
      numVents,
      'EA',
      'roof_vent_per_ea',
      `${numVents} EA`
    );
  }

  // Exhaust caps
  if (numExhaust > 0) {
    addLine(
      'R&R exhaust vent caps',
      numExhaust,
      'EA',
      'exhaust_cap_per_ea',
      `${numExhaust} EA`
    );
  }

  const subtotal = laborSub + materialSub;

  // Tax on materials only (Texas standard)
  const taxableBase = materialSub;
  const tax = taxableBase * TAX_RATE;

  // O&P on subtotal
  const op = subtotal * OP_RATE;

  const grandTotal = subtotal + tax + op;

  return {
    summary: {
      totalSlopedSqft: parseFloat(totalSlopedSqft.toFixed(1)),
      totalSlopedSquares: parseFloat(totalSquares.toFixed(2)),
      wastePct,
      totalWithWasteSq: parseFloat(totalWithWasteSq.toFixed(2)),
      iceWaterSq: parseFloat(iceWaterSq.toFixed(2)),
      laborSubtotal: parseFloat(laborSub.toFixed(2)),
      materialSubtotal: parseFloat(materialSub.toFixed(2)),
      subtotal: parseFloat(subtotal.toFixed(2)),
      taxableBase: parseFloat(taxableBase.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      op: parseFloat(op.toFixed(2)),
      grandTotal: parseFloat(grandTotal.toFixed(2)),
    },
    lineItems,
  };
}

/**
 * Simplified estimation for quick quotes (single pitch, estimated measurements)
 */
export function quickEstimate(
  roofSqft: number,
  pitch: string = '6/12',
  stories: number = 1,
  shingleType: 'standard' | 'architectural' | 'impact_resistant' = 'architectural'
): EstimateResult {
  // Estimate linear features based on roof size
  const estimatedPerimeter = Math.sqrt(roofSqft) * 4 * 1.2; // Rough estimate
  const estimatedRidges = estimatedPerimeter * 0.15;
  const estimatedHips = estimatedPerimeter * 0.25;
  const estimatedValleys = estimatedPerimeter * 0.10;
  const estimatedEaves = estimatedPerimeter * 0.50;
  const estimatedRakes = estimatedPerimeter * 0.10;

  // Estimate penetrations based on stories
  const estimatedPipeJacks = 3 + (stories - 1) * 2;
  const estimatedVents = 2 + (stories - 1);
  const estimatedExhaust = 1 + (stories - 1);

  return calculateRoofEstimate(
    {
      facets: [
        {
          areaSqft: roofSqft,
          pitch,
          label: 'Main Roof Area',
          areaType: 'PLANAR',
        },
      ],
      linearFeatures: {
        ridges: estimatedRidges,
        hips: estimatedHips,
        valleys: estimatedValleys,
        eaves: estimatedEaves,
        rakes: estimatedRakes,
      },
      perimeter: estimatedPerimeter,
      numPipeJacks: estimatedPipeJacks,
      numVents: estimatedVents,
      numExhaust: estimatedExhaust,
    },
    shingleType
  );
}
