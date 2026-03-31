import json
import os
import google.generativeai as genai

# Configure Gemini
api_key = os.environ['GEMINI_API_KEY']
# Remove 'key=' prefix if present
if api_key.startswith('key='):
    api_key = api_key[4:]
genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-2.0-flash-exp')

# Load extracted data
with open('eagleview_data.json', 'r') as f:
    file_data = json.load(f)

prompt = f"""You are a Texas building code compliance expert specializing in roofing systems.

Analyze this EagleView roof measurement report and validate it against Texas Building Code requirements for McKinney, Collin County:

**File:** {file_data['filename']}
**Address:** {file_data['extractedData']['address']}
**Report ID:** {file_data['extractedData']['reportId']}

**Roof Measurements:**
- Total Area: {file_data['extractedData']['measurements']['totalRoofArea']}
- Pitch: {file_data['extractedData']['measurements']['predominantPitch']}
- Stories: {file_data['extractedData']['measurements']['numberOfStories']}
- Ridges/Hips: {file_data['extractedData']['measurements']['totalRidgesHips']}
- Valleys: {file_data['extractedData']['measurements']['totalValleys']}
- Rakes: {file_data['extractedData']['measurements']['totalRakes']}
- Eaves: {file_data['extractedData']['measurements']['totalEaves']}

**Texas Building Code Requirements (McKinney, Collin County):**
- Wind Speed Requirement: 115 mph (ASCE 7-16)
- Minimum Asphalt Shingle Weight: 240 lb/sq
- Recommended Hail Rating: Class 4 Impact Resistant (IR)
- Minimum Roof Slope: 2:12
- Underlayment: ASTM D226 Type II or ASTM D4869 (synthetic)
- Ice & Water Shield: Required in valleys and eaves (minimum 36")
- Ventilation: 1 sq ft per 150 sq ft of attic space (NFA)
- Flashing: Galvanized steel or aluminum, minimum 26 gauge
- Fasteners: Minimum 1-1/4" roofing nails, 4 per shingle

Generate a comprehensive compliance report with:

1. **Compliance Score (0-100)**: Overall compliance percentage
2. **Status**: "compliant" (90-100), "warnings" (70-89), or "non-compliant" (<70)
3. **Discrepancies**: List specific issues with category, severity, code reference, and recommendation
4. **Code Upgrades**: Recommended improvements with cost impact and justification
5. **Summary**: Executive summary

Be aggressive but justified. This is an EagleView measurement report with NO material specifications, so flag ALL missing specifications as discrepancies.

Return ONLY valid JSON.
"""

response = model.generate_content(prompt)
result = json.loads(response.text)

print(json.dumps(result, indent=2))

# Save to file
with open('compliance_report.json', 'w') as f:
    json.dump(result, f, indent=2)

print("\n✅ Saved to compliance_report.json")
