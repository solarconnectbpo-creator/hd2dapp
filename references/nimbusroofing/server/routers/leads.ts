import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getAllLeads,
  createLead,
  updateLeadStatus,
  exportToExcel,
  getCallbackQueue,
  type LeadFilters,
} from "../automation/leadExportService";
import {
  syncLeadsToGoogleSheets,
  createLeadTrackingSheet,
  getSpreadsheetUrl,
  shareSpreadsheet,
} from "../automation/googleSheetsSync";

/**
 * Lead Management Router
 * 
 * Handles lead tracking, export, and Google Sheets synchronization.
 */

export const leadsRouter = router({
  /**
   * Get all leads with optional filters
   */
  getAll: protectedProcedure
    .input(
      z.object({
        source: z.enum(['call', 'email', 'form', 'chat']).optional(),
        status: z.enum(['new', 'contacted', 'quoted', 'converted', 'lost']).optional(),
        priority: z.enum(['high', 'medium', 'low']).optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const filters: LeadFilters = {};
      
      if (input?.source) filters.source = input.source;
      if (input?.status) filters.status = input.status;
      if (input?.priority) filters.priority = input.priority;
      if (input?.dateFrom) filters.dateFrom = new Date(input.dateFrom);
      if (input?.dateTo) filters.dateTo = new Date(input.dateTo);

      const leads = await getAllLeads(filters);
      return { leads };
    }),

  /**
   * Get callback queue (high priority leads)
   */
  getCallbackQueue: protectedProcedure.query(async () => {
    const leads = await getCallbackQueue();
    return { leads };
  }),

  /**
   * Update lead status
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        status: z.enum(['new', 'contacted', 'quoted', 'converted', 'lost']),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await updateLeadStatus(input.leadId, input.status, input.notes);
      return { success: true };
    }),

  /**
   * Export leads to Excel
   */
  exportToExcel: protectedProcedure
    .input(
      z.object({
        source: z.enum(['call', 'email', 'form', 'chat']).optional(),
        status: z.enum(['new', 'contacted', 'quoted', 'converted', 'lost']).optional(),
        priority: z.enum(['high', 'medium', 'low']).optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      }).optional()
    )
    .mutation(async ({ input }) => {
      const filters: LeadFilters = {};
      
      if (input?.source) filters.source = input.source;
      if (input?.status) filters.status = input.status;
      if (input?.priority) filters.priority = input.priority;
      if (input?.dateFrom) filters.dateFrom = new Date(input.dateFrom);
      if (input?.dateTo) filters.dateTo = new Date(input.dateTo);

      const buffer = await exportToExcel(filters);
      
      // Convert buffer to base64 for transmission
      const base64 = buffer.toString('base64');
      
      return {
        success: true,
        filename: `leads-export-${new Date().toISOString().split('T')[0]}.xlsx`,
        data: base64,
      };
    }),

  /**
   * Create new Google Sheets for lead tracking
   */
  createGoogleSheet: protectedProcedure
    .input(
      z.object({
        title: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const spreadsheetId = await createLeadTrackingSheet(input.title);
      
      if (!spreadsheetId) {
        throw new Error("Failed to create Google Sheet. Check GOOGLE_SHEETS_CREDENTIALS.");
      }

      return {
        success: true,
        spreadsheetId,
        url: getSpreadsheetUrl(spreadsheetId),
      };
    }),

  /**
   * Sync leads to Google Sheets
   */
  syncToGoogleSheets: protectedProcedure
    .input(
      z.object({
        spreadsheetId: z.string(),
        source: z.enum(['call', 'email', 'form', 'chat']).optional(),
        status: z.enum(['new', 'contacted', 'quoted', 'converted', 'lost']).optional(),
        priority: z.enum(['high', 'medium', 'low']).optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const filters: LeadFilters = {};
      
      if (input.source) filters.source = input.source;
      if (input.status) filters.status = input.status;
      if (input.priority) filters.priority = input.priority;
      if (input.dateFrom) filters.dateFrom = new Date(input.dateFrom);
      if (input.dateTo) filters.dateTo = new Date(input.dateTo);

      const result = await syncLeadsToGoogleSheets(input.spreadsheetId, filters);
      
      return {
        success: result.success,
        rowsUpdated: result.rowsUpdated,
        url: getSpreadsheetUrl(input.spreadsheetId),
      };
    }),

  /**
   * Share Google Sheet with email address
   */
  shareGoogleSheet: protectedProcedure
    .input(
      z.object({
        spreadsheetId: z.string(),
        emailAddress: z.string().email(),
        role: z.enum(['reader', 'writer', 'owner']).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const success = await shareSpreadsheet(
        input.spreadsheetId,
        input.emailAddress,
        input.role || 'writer'
      );

      return { success };
    }),

  /**
   * Get lead statistics
   */
  getStats: protectedProcedure.query(async () => {
    const allLeads = await getAllLeads();
    
    const stats = {
      total: allLeads.length,
      new: allLeads.filter(l => l.status === 'new').length,
      contacted: allLeads.filter(l => l.status === 'contacted').length,
      quoted: allLeads.filter(l => l.status === 'quoted').length,
      converted: allLeads.filter(l => l.status === 'converted').length,
      lost: allLeads.filter(l => l.status === 'lost').length,
      highPriority: allLeads.filter(l => l.priority === 'high').length,
      bySource: {
        call: allLeads.filter(l => l.source === 'call').length,
        email: allLeads.filter(l => l.source === 'email').length,
        form: allLeads.filter(l => l.source === 'form').length,
        chat: allLeads.filter(l => l.source === 'chat').length,
      },
      byType: {
        quote: allLeads.filter(l => l.leadType === 'quote').length,
        emergency: allLeads.filter(l => l.leadType === 'emergency').length,
        general: allLeads.filter(l => l.leadType === 'general').length,
        insurance: allLeads.filter(l => l.leadType === 'insurance').length,
        repair: allLeads.filter(l => l.leadType === 'repair').length,
      },
    };

    return stats;
  }),
});
