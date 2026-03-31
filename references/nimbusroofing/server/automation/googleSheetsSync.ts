import { google } from 'googleapis';
import { formatForGoogleSheets, getAllLeads, type LeadFilters } from './leadExportService';

/**
 * Google Sheets Sync Service
 * 
 * Real-time synchronization of leads to Google Sheets using Google Sheets API.
 * Requires GOOGLE_SHEETS_CREDENTIALS environment variable with service account JSON.
 */

let sheetsClient: any = null;

/**
 * Initialize Google Sheets API client
 */
function getGoogleSheetsClient() {
  if (sheetsClient) return sheetsClient;

  try {
    // Check if credentials are available
    const credsJson = process.env.GOOGLE_SHEETS_CREDENTIALS;
    if (!credsJson) {
      console.warn('[Google Sheets] GOOGLE_SHEETS_CREDENTIALS not set. Sync disabled.');
      return null;
    }

    const credentials = JSON.parse(credsJson);
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    sheetsClient = google.sheets({ version: 'v4', auth });
    console.log('[Google Sheets] Client initialized successfully');
    return sheetsClient;
  } catch (error) {
    console.error('[Google Sheets] Failed to initialize client:', error);
    return null;
  }
}

/**
 * Create a new Google Sheet for lead tracking
 */
export async function createLeadTrackingSheet(title: string = 'Nimbus Roofing - Lead Tracker'): Promise<string | null> {
  const sheets = getGoogleSheetsClient();
  if (!sheets) return null;

  try {
    const response = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title,
        },
        sheets: [
          {
            properties: {
              title: 'Leads',
              gridProperties: {
                frozenRowCount: 1, // Freeze header row
              },
            },
          },
        ],
      },
    });

    const spreadsheetId = response.data.spreadsheetId;
    console.log('[Google Sheets] Created new sheet:', spreadsheetId);

    // Format header row
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.098, green: 0.463, blue: 0.824 }, // Material Blue
                  textFormat: {
                    foregroundColor: { red: 1, green: 1, blue: 1 },
                    bold: true,
                  },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          },
        ],
      },
    });

    return spreadsheetId;
  } catch (error) {
    console.error('[Google Sheets] Failed to create sheet:', error);
    return null;
  }
}

/**
 * Sync leads to Google Sheets
 */
export async function syncLeadsToGoogleSheets(
  spreadsheetId: string,
  filters?: LeadFilters
): Promise<{ success: boolean; rowsUpdated: number }> {
  const sheets = getGoogleSheetsClient();
  if (!sheets) {
    return { success: false, rowsUpdated: 0 };
  }

  try {
    // Get leads data
    const leadsData = await getAllLeads(filters);
    const sheetData = formatForGoogleSheets(leadsData);

    // Clear existing data
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'Leads!A1:Z',
    });

    // Write new data
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Leads!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: sheetData,
      },
    });

    const rowsUpdated = response.data.updatedRows || 0;
    console.log(`[Google Sheets] Synced ${rowsUpdated} rows to spreadsheet ${spreadsheetId}`);

    return { success: true, rowsUpdated };
  } catch (error) {
    console.error('[Google Sheets] Sync failed:', error);
    return { success: false, rowsUpdated: 0 };
  }
}

/**
 * Append a single lead to Google Sheets (real-time sync)
 */
export async function appendLeadToGoogleSheets(
  spreadsheetId: string,
  leadData: any
): Promise<boolean> {
  const sheets = getGoogleSheetsClient();
  if (!sheets) return false;

  try {
    const row = [
      leadData.id || '',
      leadData.name,
      leadData.phone || '',
      leadData.email || '',
      leadData.source,
      leadData.leadType,
      leadData.priority,
      leadData.sentiment || '',
      leadData.callDuration ? Math.round(leadData.callDuration / 60) : '',
      leadData.status,
      leadData.notes || '',
      leadData.followUpDate ? leadData.followUpDate.toISOString().split('T')[0] : '',
      leadData.createdAt ? leadData.createdAt.toISOString().replace('T', ' ').split('.')[0] : '',
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Leads!A:M',
      valueInputOption: 'RAW',
      requestBody: {
        values: [row],
      },
    });

    console.log(`[Google Sheets] Appended lead ${leadData.id} to spreadsheet`);
    return true;
  } catch (error) {
    console.error('[Google Sheets] Failed to append lead:', error);
    return false;
  }
}

/**
 * Get spreadsheet URL for sharing
 */
export function getSpreadsheetUrl(spreadsheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}

/**
 * Share spreadsheet with email address
 */
export async function shareSpreadsheet(
  spreadsheetId: string,
  emailAddress: string,
  role: 'reader' | 'writer' | 'owner' = 'writer'
): Promise<boolean> {
  try {
    const drive = google.drive({ version: 'v3', auth: getGoogleSheetsClient()?.auth });
    
    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: {
        type: 'user',
        role,
        emailAddress,
      },
    });

    console.log(`[Google Sheets] Shared spreadsheet with ${emailAddress} as ${role}`);
    return true;
  } catch (error) {
    console.error('[Google Sheets] Failed to share spreadsheet:', error);
    return false;
  }
}
