import { getDb } from "../db";
import { leads } from "../../drizzle/schema";
import { desc, eq, and, gte, lte, sql } from "drizzle-orm";
import ExcelJS from 'exceljs';

/**
 * Lead Export Service
 * 
 * Handles lead tracking, auto-categorization, and export to Excel/Google Sheets.
 * Integrates with event dispatcher to auto-categorize calls and emails.
 */

export interface LeadData {
  id?: number;
  name: string;
  phone?: string;
  email?: string;
  source: 'call' | 'email' | 'form' | 'chat';
  leadType: 'quote' | 'emergency' | 'general' | 'insurance' | 'repair';
  priority: 'high' | 'medium' | 'low';
  sentiment?: 'positive' | 'neutral' | 'negative';
  callDuration?: number; // seconds
  notes?: string;
  followUpDate?: Date;
  status: 'new' | 'contacted' | 'quoted' | 'converted' | 'lost';
  assignedTo?: number; // user ID
  createdAt?: Date;
}

export interface LeadFilters {
  source?: 'call' | 'email' | 'form' | 'chat';
  status?: 'new' | 'contacted' | 'quoted' | 'converted' | 'lost';
  priority?: 'high' | 'medium' | 'low';
  dateFrom?: Date;
  dateTo?: Date;
  assignedTo?: number;
}

/**
 * Auto-categorize lead based on content and context
 */
export async function categorizeLead(params: {
  source: LeadData['source'];
  content: string;
  sentiment?: string;
  callDuration?: number;
}): Promise<{ leadType: LeadData['leadType']; priority: LeadData['priority'] }> {
  const { source, content, sentiment, callDuration } = params;
  const lowerContent = content.toLowerCase();

  // Determine lead type
  let leadType: LeadData['leadType'] = 'general';
  
  if (lowerContent.includes('quote') || lowerContent.includes('estimate') || lowerContent.includes('price') || lowerContent.includes('cost')) {
    leadType = 'quote';
  } else if (lowerContent.includes('emergency') || lowerContent.includes('leak') || lowerContent.includes('urgent') || lowerContent.includes('storm damage')) {
    leadType = 'emergency';
  } else if (lowerContent.includes('insurance') || lowerContent.includes('claim') || lowerContent.includes('adjuster')) {
    leadType = 'insurance';
  } else if (lowerContent.includes('repair') || lowerContent.includes('fix') || lowerContent.includes('damage')) {
    leadType = 'repair';
  }

  // Determine priority
  let priority: LeadData['priority'] = 'medium';
  
  // High priority conditions
  if (leadType === 'emergency') {
    priority = 'high';
  } else if (sentiment === 'negative' && source === 'call') {
    priority = 'high';
  } else if (lowerContent.includes('asap') || lowerContent.includes('today') || lowerContent.includes('immediately')) {
    priority = 'high';
  } else if (callDuration && callDuration > 300) { // 5+ minute calls are serious
    priority = 'high';
  }
  
  // Low priority conditions
  if (leadType === 'general' && sentiment === 'neutral') {
    priority = 'low';
  } else if (lowerContent.includes('just browsing') || lowerContent.includes('information only')) {
    priority = 'low';
  }

  return { leadType, priority };
}

/**
 * Create a new lead in the database
 */
export async function createLead(leadData: LeadData): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(leads).values({
    name: leadData.name,
    phone: leadData.phone,
    email: leadData.email,
    source: leadData.source,
    leadType: leadData.leadType,
    priority: leadData.priority,
    sentiment: leadData.sentiment,
    callDuration: leadData.callDuration,
    notes: leadData.notes,
    followUpDate: leadData.followUpDate,
    status: leadData.status || 'new',
    assignedTo: leadData.assignedTo,
  });

  return Number(result.insertId);
}

/**
 * Get all leads with optional filters
 */
export async function getAllLeads(filters?: LeadFilters): Promise<LeadData[]> {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(leads);

  // Apply filters
  const conditions = [];
  if (filters?.source) {
    conditions.push(eq(leads.source, filters.source));
  }
  if (filters?.status) {
    conditions.push(eq(leads.status, filters.status));
  }
  if (filters?.priority) {
    conditions.push(eq(leads.priority, filters.priority));
  }
  if (filters?.assignedTo) {
    conditions.push(eq(leads.assignedTo, filters.assignedTo));
  }
  if (filters?.dateFrom) {
    conditions.push(gte(leads.createdAt, filters.dateFrom));
  }
  if (filters?.dateTo) {
    conditions.push(lte(leads.createdAt, filters.dateTo));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const results = await query.orderBy(desc(leads.createdAt));
  return results as LeadData[];
}

/**
 * Update lead status
 */
export async function updateLeadStatus(leadId: number, status: LeadData['status'], notes?: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = { status };
  if (notes) {
    updateData.notes = notes;
  }

  await db.update(leads).set(updateData).where(eq(leads.id, leadId));
}

/**
 * Export leads to Excel (.xlsx)
 */
export async function exportToExcel(filters?: LeadFilters): Promise<Buffer> {
  const leadsData = await getAllLeads(filters);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Leads');

  // Define columns
  worksheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Name', key: 'name', width: 20 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Source', key: 'source', width: 12 },
    { header: 'Type', key: 'leadType', width: 12 },
    { header: 'Priority', key: 'priority', width: 10 },
    { header: 'Sentiment', key: 'sentiment', width: 12 },
    { header: 'Call Duration (min)', key: 'callDuration', width: 18 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Notes', key: 'notes', width: 40 },
    { header: 'Follow-Up Date', key: 'followUpDate', width: 15 },
    { header: 'Created At', key: 'createdAt', width: 18 },
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1976D2' }, // Material Blue
  };
  worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

  // Add data rows
  leadsData.forEach(lead => {
    worksheet.addRow({
      id: lead.id,
      name: lead.name,
      phone: lead.phone || '',
      email: lead.email || '',
      source: lead.source,
      leadType: lead.leadType,
      priority: lead.priority,
      sentiment: lead.sentiment || '',
      callDuration: lead.callDuration ? Math.round(lead.callDuration / 60) : '',
      status: lead.status,
      notes: lead.notes || '',
      followUpDate: lead.followUpDate ? lead.followUpDate.toISOString().split('T')[0] : '',
      createdAt: lead.createdAt ? lead.createdAt.toISOString().replace('T', ' ').split('.')[0] : '',
    });
  });

  // Auto-filter
  worksheet.autoFilter = {
    from: 'A1',
    to: 'M1',
  };

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Format leads for Google Sheets (2D array)
 */
export function formatForGoogleSheets(leadsData: LeadData[]): any[][] {
  const headers = [
    'ID', 'Name', 'Phone', 'Email', 'Source', 'Type', 'Priority', 
    'Sentiment', 'Call Duration (min)', 'Status', 'Notes', 'Follow-Up Date', 'Created At'
  ];

  const rows = leadsData.map(lead => [
    lead.id || '',
    lead.name,
    lead.phone || '',
    lead.email || '',
    lead.source,
    lead.leadType,
    lead.priority,
    lead.sentiment || '',
    lead.callDuration ? Math.round(lead.callDuration / 60) : '',
    lead.status,
    lead.notes || '',
    lead.followUpDate ? lead.followUpDate.toISOString().split('T')[0] : '',
    lead.createdAt ? lead.createdAt.toISOString().replace('T', ' ').split('.')[0] : '',
  ]);

  return [headers, ...rows];
}

/**
 * Get callback queue (high priority leads that need follow-up)
 */
export async function getCallbackQueue(): Promise<LeadData[]> {
  const db = await getDb();
  if (!db) return [];

  const results = await db
    .select()
    .from(leads)
    .where(
      and(
        eq(leads.status, 'new'),
        eq(leads.priority, 'high')
      )
    )
    .orderBy(desc(leads.createdAt));

  return results as LeadData[];
}
