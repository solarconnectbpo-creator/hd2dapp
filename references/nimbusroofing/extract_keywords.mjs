import XLSX from 'xlsx';
import fs from 'fs';

// Files to process
const files = [
  '/home/ubuntu/upload/RoofingKeywords.xlsx',
  '/home/ubuntu/upload/_Backlinks,Nimbusconnections.xlsx',
  '/home/ubuntu/upload/_CampaignPrebuiltHeadline-Subheadline_HOOKS-Keywords-Hashtags-ScriptPrompt-Content_Prebuilt.xlsx'
];

const allData = {};

files.forEach(filePath => {
  try {
    console.log(`\n📁 Processing: ${filePath}`);
    const workbook = XLSX.readFile(filePath);
    
    workbook.SheetNames.forEach(sheetName => {
      console.log(`  📄 Sheet: ${sheetName}`);
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      // Print first 10 rows to understand structure
      console.log(`  First 10 rows:`);
      data.slice(0, 10).forEach((row, idx) => {
        console.log(`    Row ${idx}:`, JSON.stringify(row));
      });
      
      allData[`${filePath.split('/').pop()}_${sheetName}`] = data;
    });
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
});

// Save to JSON for analysis
fs.writeFileSync('/tmp/keyword_data.json', JSON.stringify(allData, null, 2));
console.log('\n✅ Data saved to /tmp/keyword_data.json');
