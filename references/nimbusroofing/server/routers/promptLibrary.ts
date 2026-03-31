import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import * as promptService from "../promptLibraryService";

export const promptLibraryRouter = router({
  // Get all prompts with optional filtering
  getAll: publicProcedure
    .input(
      z
        .object({
          category: z.string().optional(),
          searchQuery: z.string().optional(),
          isFeatured: z.boolean().optional(),
          isActive: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return await promptService.getAllPrompts(input || undefined);
    }),

  // Get single prompt by ID
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await promptService.getPromptById(input.id);
    }),

  // Record prompt usage (copy to clipboard)
  recordUsage: publicProcedure
    .input(
      z.object({
        promptId: z.number(),
        customizationValues: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await promptService.recordPromptUsage(
        input.promptId,
        ctx.user?.id || undefined,
        input.customizationValues
      );
      return { success: true };
    }),

  // Get categories with counts
  getCategories: publicProcedure.query(async () => {
    const categories = await promptService.getCategoriesWithCounts();
    return categories;
  }),

  // Get prompt stats
  getStats: protectedProcedure
    .input(z.object({ promptId: z.number() }))
    .query(async ({ input }) => {
      return await promptService.getPromptStats(input.promptId);
    }),

  // Favorites
  getFavorites: protectedProcedure.query(async ({ ctx }) => {
    return await promptService.getUserFavorites(ctx.user.id);
  }),

  addToFavorites: protectedProcedure
    .input(
      z.object({
        promptId: z.number(),
        notes: z.string().optional(),
        customDefaults: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await promptService.addToFavorites(
        ctx.user.id,
        input.promptId,
        input.notes || undefined,
        input.customDefaults || undefined
      );
      return { success: true };
    }),

  removeFromFavorites: protectedProcedure
    .input(z.object({ promptId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await promptService.removeFromFavorites(ctx.user.id, input.promptId);
      return { success: true };
    }),

  isFavorited: protectedProcedure
    .input(z.object({ promptId: z.number() }))
    .query(async ({ input, ctx }) => {
      return await promptService.isFavorited(ctx.user.id, input.promptId);
    }),

  // Custom prompts
  createCustom: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        category: z.string(),
        promptText: z.string(),
        customizationFields: z.array(z.any()).optional(),
        isShared: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await promptService.createCustomPrompt({
        ...input,
        customizationFields: input.customizationFields
          ? JSON.stringify(input.customizationFields)
          : null,
        createdBy: ctx.user.id,
      });
      return { success: true };
    }),

  getMyCustom: protectedProcedure.query(async ({ ctx }) => {
    return await promptService.getUserCustomPrompts(ctx.user.id);
  }),

  getSharedCustom: publicProcedure.query(async () => {
    return await promptService.getSharedCustomPrompts();
  }),

  // Search across all prompts
  search: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input, ctx }) => {
      return await promptService.searchAllPrompts(input.query, ctx.user?.id || undefined);
    }),

  // Seed initial prompts (admin only)
  seedPrompts: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new Error("Unauthorized");
    }
    await promptService.seedPrompts();
    return { success: true };
  }),
});
