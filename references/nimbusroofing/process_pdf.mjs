import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

// Extract text from PDF
const { stdout } = await execAsync('pdftotext "/home/ubuntu/nimbus-roofing/uploaded_files/DonaldOjieagleview.PDF" -');
const textContent = stdout.trim();

console.log('=== EXTRACTED PDF TEXT ===');
console.log(textContent.substring(0, 2000));
console.log('\n... (truncated for brevity)');

// Save to file for analysis
fs.writeFileSync('/home/ubuntu/nimbus-roofing/extracted_eagleview.txt', textContent);
console.log('\n✅ Saved to extracted_eagleview.txt');
