/**
 * File Processor for Xactimate XML, PDF, and XLSX uploads
 * Extracts data from various file formats for building code validation
 */

import { invokeLLM } from './_core/llm';

export interface ProcessedFileData {
  filename: string;
  fileType: 'xml' | 'pdf' | 'xlsx';
  extractedData: any;
  metadata: {
    address?: string;
    projectId?: string;
    date?: string;
    contractor?: string;
  };
}

export interface ValidationResult {
  complianceScore: number; // 0-100
  status: 'compliant' | 'warnings' | 'non-compliant';
  discrepancies: Array<{
    category: string;
    issue: string;
    severity: 'low' | 'medium' | 'high';
    codeReference: string;
    recommendation: string;
  }>;
  codeUpgrades: Array<{
    item: string;
    currentSpec: string;
    recommendedSpec: string;
    costImpact: string;
    justification: string;
  }>;
  summary: string;
}

/**
 * Process uploaded file and extract relevant data
 */
export async function processUploadedFile(
  filePath: string,
  filename: string
): Promise<ProcessedFileData> {
  const fileType = getFileType(filename);

  switch (fileType) {
    case 'pdf':
      return await processPDF(filePath, filename);
    case 'xlsx':
      return await processXLSX(filePath, filename);
    case 'xml':
      return await processXML(filePath, filename);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

/**
 * Validate estimate data against Texas building codes
 */
export async function validateAgainstBuildingCodes(
  fileData: ProcessedFileData
): Promise<ValidationResult> {
  const prompt = `You are a Texas building code compliance expert specializing in roofing systems.

Analyze this roofing estimate/inspection data and validate it against Texas Building Code requirements for McKinney, Collin County:

**File:** ${fileData.filename}
**Type:** ${fileData.fileType}
**Location:** ${fileData.metadata.address || 'McKinney, TX'}

**Extracted Data:**
${JSON.stringify(fileData.extractedData, null, 2)}

**Texas Building Code Requirements (McKinney, Collin County):**
- Wind Speed Requirement: 115 mph (ASCE 7-16)
- Minimum Asphalt Shingle Weight: 240 lb/sq
- Recommended Hail Rating: Class 4 Impact Resistant
- Minimum Roof Slope: 2:12
- Underlayment: ASTM D226 Type II or ASTM D4869 (synthetic)
- Ice & Water Shield: Required in valleys and eaves (minimum 36")
- Ventilation: 1 sq ft per 150 sq ft of attic space (NFA)
- Flashing: Galvanized steel or aluminum, minimum 26 gauge
- Fasteners: Minimum 1-1/4" roofing nails, 4 per shingle

Generate a comprehensive compliance report with:

1. **Compliance Score (0-100)**: Overall compliance percentage
2. **Status**: "compliant" (90-100), "warnings" (70-89), or "non-compliant" (<70)
3. **Discrepancies**: List specific issues found with:
   - Category (materials, installation, ventilation, flashing, etc.)
   - Issue description
   - Severity (low/medium/high)
   - Code reference (specific code section)
   - Recommendation to fix

4. **Code Upgrades**: Recommended improvements with:
   - Item name
   - Current specification
   - Recommended specification
   - Estimated cost impact
   - Justification (why this upgrade matters)

5. **Summary**: 2-3 sentence executive summary

Be aggressive but justified. Look for missing items, underspecified materials, and opportunities for code upgrades that improve longevity and insurability.

Return ONLY valid JSON matching this structure:
{
  "complianceScore": number,
  "status": "compliant" | "warnings" | "non-compliant",
  "discrepancies": [...],
  "codeUpgrades": [...],
  "summary": "string"
}`;

  const response = await invokeLLM({
    messages: [
      {
        role: 'system',
        content: 'You are a Texas building code expert. Return ONLY valid JSON, no markdown formatting.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'building_code_validation',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            complianceScore: { type: 'number' },
            status: { type: 'string', enum: ['compliant', 'warnings', 'non-compliant'] },
            discrepancies: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  category: { type: 'string' },
                  issue: { type: 'string' },
                  severity: { type: 'string', enum: ['low', 'medium', 'high'] },
                  codeReference: { type: 'string' },
                  recommendation: { type: 'string' },
                },
                required: ['category', 'issue', 'severity', 'codeReference', 'recommendation'],
                additionalProperties: false,
              },
            },
            codeUpgrades: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  item: { type: 'string' },
                  currentSpec: { type: 'string' },
                  recommendedSpec: { type: 'string' },
                  costImpact: { type: 'string' },
                  justification: { type: 'string' },
                },
                required: ['item', 'currentSpec', 'recommendedSpec', 'costImpact', 'justification'],
                additionalProperties: false,
              },
            },
            summary: { type: 'string' },
          },
          required: ['complianceScore', 'status', 'discrepancies', 'codeUpgrades', 'summary'],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  const result = JSON.parse(content || '{}');

  return result as ValidationResult;
}

// ============================================================================
// FILE TYPE PROCESSORS
// ============================================================================

function getFileType(filename: string): 'xml' | 'pdf' | 'xlsx' {
  const ext = filename.toLowerCase().split('.').pop();
  if (ext === 'xml') return 'xml';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'xlsx' || ext === 'xls') return 'xlsx';
  throw new Error(`Unsupported file extension: ${ext}`);
}

async function processPDF(filePath: string, filename: string): Promise<ProcessedFileData> {
  // Use Gemini Vision to extract data from PDF
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  // Extract text from PDF
  const { stdout } = await execAsync(`pdftotext "${filePath}" -`);
  const textContent = stdout.trim();

  // Use LLM to structure the data
  const prompt = `Extract structured roofing data from this PDF content:

${textContent}

Extract and return JSON with:
- address: property address
- projectId: any project/estimate ID
- date: date of report
- contractor: contractor name
- lineItems: array of roofing items with quantities and descriptions
- measurements: roof measurements (square footage, pitch, etc.)
- materials: materials specified

Return ONLY valid JSON.`;

  const response = await invokeLLM({
    messages: [
      { role: 'system', content: 'Extract structured data from roofing documents. Return ONLY valid JSON.' },
      { role: 'user', content: prompt },
    ],
  });

  const extractedData = JSON.parse(response.choices[0].message.content || '{}');

  return {
    filename,
    fileType: 'pdf',
    extractedData,
    metadata: {
      address: extractedData.address,
      projectId: extractedData.projectId,
      date: extractedData.date,
      contractor: extractedData.contractor,
    },
  };
}

async function processXLSX(filePath: string, filename: string): Promise<ProcessedFileData> {
  // For now, return placeholder - would need xlsx parsing library
  return {
    filename,
    fileType: 'xlsx',
    extractedData: {
      note: 'XLSX processing requires additional parsing library',
      filename,
    },
    metadata: {},
  };
}

async function processXML(filePath: string, filename: string): Promise<ProcessedFileData> {
  const fs = await import('fs');
  const xmlContent = fs.readFileSync(filePath, 'utf-8');

  // Use LLM to parse XML structure
  const prompt = `Parse this Xactimate XML and extract structured roofing data:

${xmlContent.substring(0, 5000)} ${xmlContent.length > 5000 ? '...(truncated)' : ''}

Extract:
- Property address
- Line items with codes, descriptions, quantities, and prices
- Material specifications
- Total estimate amount

Return ONLY valid JSON.`;

  const response = await invokeLLM({
    messages: [
      { role: 'system', content: 'Parse Xactimate XML. Return ONLY valid JSON.' },
      { role: 'user', content: prompt },
    ],
  });

  const extractedData = JSON.parse(response.choices[0].message.content || '{}');

  return {
    filename,
    fileType: 'xml',
    extractedData,
    metadata: {
      address: extractedData.address,
    },
  };
}
