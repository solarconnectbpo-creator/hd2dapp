/**
 * Twilio Router
 * tRPC endpoints for phone call management and Twilio webhooks
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  getCallHistory,
  getVoicemails,
  markVoicemailRead,
  storeIncomingCall,
  updateCallWithTranscription,
  storeVoicemail,
} from "../twilioVoiceService";

export const twilioRouter = router({
  /**
   * Get call history (admin only)
   */
  getCallHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(50),
      })
    )
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Unauthorized");
      }

      return await getCallHistory(input.limit);
    }),

  /**
   * Get voicemails
   */
  getVoicemails: protectedProcedure
    .input(
      z.object({
        unreadOnly: z.boolean().optional().default(false),
      })
    )
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Unauthorized");
      }

      return await getVoicemails(input.unreadOnly);
    }),

  /**
   * Mark voicemail as read
   */
  markVoicemailRead: protectedProcedure
    .input(
      z.object({
        voicemailId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Unauthorized");
      }

      await markVoicemailRead(input.voicemailId, ctx.user.id);

      return { success: true };
    }),

  /**
   * Store incoming call (called by Twilio webhook)
   */
  storeIncomingCall: publicProcedure
    .input(
      z.object({
        CallSid: z.string(),
        From: z.string(),
        To: z.string(),
        CallStatus: z.string(),
        Direction: z.string(),
        CallerName: z.string().optional(),
        RecordingUrl: z.string().optional(),
        TranscriptionText: z.string().optional(),
        Duration: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const callId = await storeIncomingCall(input);
      return { success: true, callId };
    }),

  /**
   * Update call with transcription (called by Twilio webhook)
   */
  updateCallTranscription: publicProcedure
    .input(
      z.object({
        CallSid: z.string(),
        TranscriptionText: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const analysis = await updateCallWithTranscription(
        input.CallSid,
        input.TranscriptionText
      );

      return { success: true, analysis };
    }),

  /**
   * Store voicemail (called by Twilio webhook)
   */
  storeVoicemail: publicProcedure
    .input(
      z.object({
        CallSid: z.string(),
        RecordingUrl: z.string(),
        TranscriptionText: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const analysis = await storeVoicemail(
        input.CallSid,
        input.RecordingUrl,
        input.TranscriptionText
      );

      return { success: true, analysis };
    }),
});
