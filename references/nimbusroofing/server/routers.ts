import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { leads } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";
import { sendUrgentLeadSms, isSmsConfigured } from "./smsService";
import { generateAutoResponse, sendAutoResponse } from "./aiAutoResponder";
import { generateSEOContent, generateBatchContent } from "./seoAgentPro";
import { protectedProcedure } from "./_core/trpc";
import { nwsWeatherService } from "./nwsWeatherService";
import { weatherMonitoringService } from "./weatherMonitoringService";
import { updateSitemap } from "./sitemapService";
import { promptLibraryRouter } from "./routers/promptLibrary";
import { agentsRouter } from "./routers/agents";
import { twilioRouter } from "./routers/twilio";
import { leadsRouter } from "./routers/leads";
import { sovereignAuditRouter } from "./routers/sovereignAudit";

export const appRouter = router({
  system: systemRouter,
  sovereignAudit: sovereignAuditRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Leads router for contact form submissions
  leads: router({
    create: publicProcedure
      .input(
        z.object({
          name: z.string(),
          email: z.string().email().optional().or(z.literal('')),
          phone: z.string(),
          address: z.string().optional(),
          city: z.string().optional(),
          zipCode: z.string().optional(),
          serviceType: z.string().optional(),
          urgency: z.enum(["low", "medium", "high", "emergency"]).optional(),
          message: z.string().optional(),
          source: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const db_instance = await db.getDb();
        if (!db_instance) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        // Insert lead into database
        const leadData: any = {
          name: input.name,
          phone: input.phone,
          source: input.source,
          status: "new",
        };
        
        if (input.email) leadData.email = input.email;
        if (input.address) leadData.address = input.address;
        if (input.city) leadData.city = input.city;
        if (input.zipCode) leadData.zipCode = input.zipCode;
        if (input.serviceType) leadData.serviceType = input.serviceType;
        if (input.urgency) leadData.urgency = input.urgency;
        if (input.message) leadData.message = input.message;
        
        await db_instance.insert(leads).values(leadData);

        // Send email notification to owner
        const urgencyLabel = input.urgency === "emergency" ? "🚨 EMERGENCY" : input.urgency === "high" ? "⚠️ HIGH PRIORITY" : "";
        await notifyOwner({
          title: `${urgencyLabel} New Lead: ${input.name}`,
          content: `
**New Contact Form Submission**

**Name:** ${input.name}
**Phone:** ${input.phone}
**Email:** ${input.email || 'Not provided'}
**Service:** ${input.serviceType || 'Not specified'}
**Urgency:** ${input.urgency || 'Not specified'}
**Location:** ${input.city ? `${input.city}, ${input.zipCode || ''}` : 'Not provided'}

**Message:**
${input.message || 'No message provided'}

**Source:** ${input.source}
          `.trim()
        });

        // Generate and send AI-powered auto-response to customer
        if (input.email) {
          try {
            console.log("[AI Auto-Responder] Generating intelligent response...");
            const autoResponse = await generateAutoResponse({
              name: input.name,
              email: input.email,
              phone: input.phone,
              serviceType: input.serviceType || "General Inquiry",
              urgency: input.urgency || "medium",
              location: input.city ? `${input.city}, ${input.zipCode || ''}` : undefined,
              message: input.message || ""
            });
            
            console.log("[AI Auto-Responder] Response generated:", {
              category: autoResponse.category,
              priority: autoResponse.priority,
              subject: autoResponse.subject
            });
            
            // Send auto-response email to customer
            await sendAutoResponse(input.email, autoResponse);
            
            // Log suggested actions for team
            console.log("[AI Auto-Responder] Suggested actions:", autoResponse.suggestedActions);
          } catch (error) {
            console.error("[AI Auto-Responder] Failed to generate/send response:", error);
            // Continue processing even if auto-response fails
          }
        }

        // Send SMS for urgent/emergency leads
        if (input.urgency === "emergency" || input.urgency === "high") {
          if (isSmsConfigured()) {
            console.log(`[SMS] Sending SMS for ${input.urgency} priority lead...`);
            await sendUrgentLeadSms({
              name: input.name,
              phone: input.phone,
              email: input.email,
              serviceType: input.serviceType,
              urgency: input.urgency,
              city: input.city,
              message: input.message,
            });
          } else {
            console.warn('[SMS] Twilio not configured. SMS notification skipped.');
          }
        }

        return { success: true };
      }),
  }),

  // Admin router for dashboard and management
  admin: router({ getDashboardStats: publicProcedure.query(async () => {
      return await db.getDashboardStats();
    }),
    getRecentLeads: publicProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input }) => {
        return await db.getRecentLeads(input.limit);
      }),
  }),

  // Chat router for AI chatbot
  chat: router({
    sendMessage: publicProcedure
      .input(
        z.object({
          message: z.string(),
          conversationHistory: z.array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string(),
            })
          ).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { message, conversationHistory = [] } = input;

        // Build conversation context for Gemini AI
        const systemPrompt = `You are Nimbus AI, an expert roofing assistant for Nimbus Roofing in McKinney, Texas. Your role is to help potential customers with:

- Providing information about roofing services (residential, commercial, storm damage, insurance claims)
- Answering questions about roof replacement costs, materials, and timelines
- Scheduling free roof inspections
- Explaining the insurance claim process
- Discussing HOA requirements for McKinney neighborhoods (Stonebridge Ranch, Craig Ranch, etc.)
- Providing emergency contact information for urgent repairs

Key Information:
- Company: Nimbus Roofing, founded by Dustin Moore in 2015
- Phone: (214) 612-6696
- Location: McKinney, TX 75071
- Services: Residential & Commercial Roofing, Storm Damage Restoration, Insurance Claims Assistance, Emergency Repairs
- Certifications: Owens Corning Preferred Contractor, GAF Certified
- Available: 24/7 for emergencies
- Average roof replacement cost in McKinney: $12,000-$18,000 for architectural shingles

Guidelines:
- Be friendly, professional, and helpful
- Always offer to schedule a free inspection
- Provide the phone number (214) 612-6696 for urgent matters
- Use markdown formatting for better readability
- Keep responses concise but informative
- If asked about specific pricing, explain it depends on roof size, materials, and complexity
- Emphasize licensed, insured, and local expertise
- Mention 150+ completed projects in Stonebridge Ranch when relevant`;

        const messages = [
          { role: "system" as const, content: systemPrompt },
          ...conversationHistory.map(msg => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          })),
          { role: "user" as const, content: message },
        ];

        try {
          const response = await invokeLLM({
            messages,
          });

          const rawContent = response.choices[0]?.message?.content;
          const assistantMessage = typeof rawContent === 'string' 
            ? rawContent 
            : "I apologize, but I'm having trouble responding right now. Please call us at (214) 612-6696 for immediate assistance.";

          return {
            response: assistantMessage,
          };
        } catch (error) {
          console.error("Chatbot error:", error);
          return {
            response: "I apologize, but I'm experiencing technical difficulties. Please call us directly at **(214) 612-6696** for immediate assistance with your roofing needs. We're available 24/7 for emergencies!",
          };
        }
      }),
  }),

  // Blog router for SEO content management
  blog: router({
    // Public endpoints
    getPublished: publicProcedure
      .input(
        z.object({
          limit: z.number().optional().default(50),
          offset: z.number().optional().default(0),
        })
      )
      .query(async ({ input }) => {
        const posts = await db.getPublishedBlogPosts(input.limit, input.offset);
        return posts;
      }),

    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const post = await db.getBlogPostBySlug(input.slug);
        if (!post) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Blog post not found",
          });
        }
        
        // Increment view count
        await db.incrementBlogPostViews(post.id);
        
        return post;
      }),

    // Admin endpoints
    getAll: protectedProcedure
      .input(
        z.object({
          limit: z.number().optional().default(50),
          offset: z.number().optional().default(0),
        })
      )
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        const posts = await db.getAllBlogPosts(input.limit, input.offset);
        return posts;
      }),

    create: protectedProcedure
      .input(
        z.object({
          title: z.string(),
          slug: z.string(),
          excerpt: z.string().optional(),
          content: z.string(),
          featuredImage: z.string().optional(),
          category: z.string().optional(),
          tags: z.string().optional(),
          metaTitle: z.string().optional(),
          metaDescription: z.string().optional(),
          keywords: z.string().optional(),
          isPublished: z.boolean().optional().default(false),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }

        const postData: any = {
          ...input,
          authorId: ctx.user.id,
          publishedAt: input.isPublished ? new Date() : null,
        };

        await db.createBlogPost(postData);
        return { success: true };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          slug: z.string().optional(),
          excerpt: z.string().optional(),
          content: z.string().optional(),
          featuredImage: z.string().optional(),
          category: z.string().optional(),
          tags: z.string().optional(),
          metaTitle: z.string().optional(),
          metaDescription: z.string().optional(),
          keywords: z.string().optional(),
          isPublished: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }

        const { id, ...updates } = input;
        
        // If publishing, set publishedAt
        if (updates.isPublished === true) {
          (updates as any).publishedAt = new Date();
        }

        await db.updateBlogPost(id, updates);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }

        await db.deleteBlogPost(input.id);
        return { success: true };
      }),

    // AI Content Generation
    generateContent: protectedProcedure
      .input(
        z.object({
          topic: z.string(),
          geoTarget: z.string().optional(),
          keywords: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }

        try {
          console.log("[SEO Agent Pro] Generating content for:", input.topic);
          const generatedContent = await generateSEOContent(
            input.topic,
            input.geoTarget,
            input.keywords
          );

          return generatedContent;
        } catch (error) {
          console.error("[SEO Agent Pro] Content generation failed:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to generate content",
          });
        }
      }),

    // Batch Import from Generated Files
    batchImportFromFiles: protectedProcedure
      .input(
        z.object({
          directory: z.string().default('/home/ubuntu/nimbus-roofing/generated_articles'),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }

        const fs = await import('fs');
        const path = await import('path');
        
        try {
          const files = fs.readdirSync(input.directory).filter(f => f.endsWith('.md')).sort();
          console.log(`[Batch Import] Found ${files.length} markdown files`);
          
          const results = [];
          
          for (const file of files) {
            try {
              const filepath = path.join(input.directory, file);
              const content = fs.readFileSync(filepath, 'utf8');
              
              // Parse frontmatter
              const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
              if (!frontmatterMatch) {
                results.push({ file, success: false, error: 'No frontmatter found' });
                continue;
              }
              
              const frontmatter = frontmatterMatch[1];
              const articleContent = frontmatterMatch[2];
              
              // Extract metadata
              const titleMatch = frontmatter.match(/title: (.+)/);
              const keywordMatch = frontmatter.match(/primary_keyword: (.+)/);
              
              const title = titleMatch ? titleMatch[1] : 'Untitled';
              const keyword = keywordMatch ? keywordMatch[1] : '';
              
              // Create slug
              const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
              
              // Generate excerpt
              const firstParagraph = articleContent.split('\n\n').find(p => p.trim() && !p.startsWith('#')) || articleContent.substring(0, 300);
              const excerpt = firstParagraph.replace(/[#*]/g, '').replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').substring(0, 200).trim() + '...';
              const metaDescription = excerpt.substring(0, 157) + '...';
              
              // Determine category
              let category = 'General';
              if (keyword.includes('storm') || keyword.includes('hail') || keyword.includes('wind')) {
                category = 'Storm Damage';
              } else if (keyword.includes('insurance') || keyword.includes('claim')) {
                category = 'Insurance';
              } else if (keyword.includes('repair') || keyword.includes('maintenance')) {
                category = 'Maintenance';
              } else if (keyword.includes('commercial')) {
                category = 'Commercial';
              } else if (keyword.includes('residential')) {
                category = 'Residential';
              }
              
              // Create blog post
              await db.createBlogPost({
                title,
                slug,
                content: articleContent,
                excerpt,
                metaTitle: title,
                metaDescription,
                keywords: keyword,
                authorId: ctx.user.id,
                category,
                isPublished: true,
                publishedAt: new Date(),
              });
              
              results.push({ file, title, success: true });
              console.log(`[Batch Import] ✅ Imported: ${title}`);
            } catch (error: any) {
              results.push({ file, success: false, error: error.message });
              console.error(`[Batch Import] ❌ Failed: ${file}`, error.message);
            }
          }
          
          return {
            success: true,
            results,
            summary: {
              total: files.length,
              successful: results.filter(r => r.success).length,
              failed: results.filter(r => !r.success).length,
            },
          };
        } catch (error: any) {
          console.error('[Batch Import] Fatal error:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Batch import failed: ${error.message}`,
          });
        }
      }),

    // City Expansion Generator (Generate articles for all DFW cities)
    generateCityExpansion: protectedProcedure
      .input(
        z.object({
          cities: z.array(z.string()).optional(),
          autoPublish: z.boolean().optional().default(false),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }

        // Get all cities from knowledge base if not specified
        const { NIMBUS_KNOWLEDGE } = await import('./nimbusKnowledgeBase');
        const allCities = NIMBUS_KNOWLEDGE.keywordStrategy.geographicModifiers
          .filter(city => city.includes('TX') && !city.includes('County'));
        
        // Filter out cities we already have articles for
        const existingCities = ['McKinney TX', 'Plano TX', 'Frisco TX', 'Allen TX', 'Prosper TX', 'Celina TX'];
        const citiesToGenerate = input.cities || allCities.filter(city => !existingCities.includes(city));
        
        console.log(`[City Expansion] Generating articles for ${citiesToGenerate.length} cities...`);
        
        const topics = citiesToGenerate.map(city => ({
          topic: `Roofing ${city}`,
          geoTarget: city,
          keywords: [`roofing ${city.toLowerCase()}`, `roofer ${city.toLowerCase()}`, `roof repair ${city.toLowerCase()}`],
        }));
        
        try {
          const results = await generateBatchContent(topics, 5); // 5 concurrent
          
          // Auto-publish if requested
          if (input.autoPublish) {
            for (const result of results) {
              if (result.content.length > 0) {
                const slug = result.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                const excerpt = result.content.substring(0, 200).replace(/[#*]/g, '') + '...';
                
                await db.createBlogPost({
                  title: result.title,
                  slug,
                  content: result.content,
                  excerpt,
                  metaTitle: result.title,
                  metaDescription: result.excerpt,
                  keywords: result.keywords.join(', '),
                  authorId: ctx.user.id,
                  category: 'Geographic',
                  isPublished: true,
                  publishedAt: new Date(),
                });
                
                // Update sitemap after publishing
                updateSitemap('https://www.nimbusroofing.com').catch(err => {
                  console.warn('[City Expansion] Sitemap update failed (non-critical):', err);
                });
              }
            }
          }
          
          return {
            success: true,
            results,
            summary: {
              total: citiesToGenerate.length,
              successful: results.filter(r => r.content.length > 0).length,
              failed: results.filter(r => r.content.length === 0).length,
              autoPublished: input.autoPublish,
            },
          };
        } catch (error: any) {
          console.error('[City Expansion] Generation failed:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `City expansion failed: ${error.message}`,
          });
        }
      }),

    // Service Matrix Generator (Generate service × city combinations)
    generateServiceMatrix: protectedProcedure
      .input(
        z.object({
          cities: z.array(z.string()),
          services: z.array(z.string()),
          autoPublish: z.boolean().optional().default(false),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }

        // Generate all combinations
        const combinations: Array<{ topic: string; geoTarget: string; keywords: string[] }> = [];
        
        for (const city of input.cities) {
          for (const service of input.services) {
            combinations.push({
              topic: `${service} ${city}`,
              geoTarget: city,
              keywords: [
                `${service.toLowerCase()} ${city.toLowerCase()}`,
                `${service.toLowerCase()} near me`,
                `best ${service.toLowerCase()} ${city.toLowerCase()}`,
              ],
            });
          }
        }
        
        console.log(`[Service Matrix] Generating ${combinations.length} service × city combinations...`);
        
        try {
          const results = await generateBatchContent(combinations, 5);
          
          // Auto-publish if requested
          if (input.autoPublish) {
            for (const result of results) {
              if (result.content.length > 0) {
                const slug = result.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                const excerpt = result.content.substring(0, 200).replace(/[#*]/g, '') + '...';
                
                await db.createBlogPost({
                  title: result.title,
                  slug,
                  content: result.content,
                  excerpt,
                  metaTitle: result.title,
                  metaDescription: result.excerpt,
                  keywords: result.keywords.join(', '),
                  authorId: ctx.user.id,
                  category: 'Service',
                  isPublished: true,
                  publishedAt: new Date(),
                });
                
                // Update sitemap after publishing
                updateSitemap('https://www.nimbusroofing.com').catch(err => {
                  console.warn('[Service Matrix] Sitemap update failed (non-critical):', err);
                });
              }
            }
          }
          
          return {
            success: true,
            results,
            summary: {
              total: combinations.length,
              successful: results.filter(r => r.content.length > 0).length,
              failed: results.filter(r => r.content.length === 0).length,
              autoPublished: input.autoPublish,
            },
          };
        } catch (error: any) {
          console.error('[Service Matrix] Generation failed:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Service matrix generation failed: ${error.message}`,
          });
        }
      }),

    // Manual Sitemap Update
    updateSitemap: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }

        try {
          const result = await updateSitemap('https://www.nimbusroofing.com');
          return result;
        } catch (error: any) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Sitemap update failed: ${error.message}`,
          });
        }
      }),

    // Batch Content Generation (OPTIMIZED: Generate multiple articles at once)
    generateBatch: protectedProcedure
      .input(
        z.object({
          topics: z.array(
            z.object({
              topic: z.string(),
              geoTarget: z.string().optional(),
              keywords: z.array(z.string()).optional(),
            })
          ),
          maxConcurrent: z.number().optional().default(3),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }

        try {
          console.log(`[SEO Agent Pro] Starting batch generation for ${input.topics.length} topics...`);
          const results = await generateBatchContent(input.topics, input.maxConcurrent);
          return {
            success: true,
            results,
            summary: {
              total: results.length,
              successful: results.filter(r => r.content.length > 0).length,
              failed: results.filter(r => r.content.length === 0).length,
            },
          };
        } catch (error) {
          console.error("[SEO Agent Pro] Batch generation failed:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to generate batch content",
          });
        }
      }),
  }),

  // Weather monitoring router for storm detection
  weather: router({
    // Get current active alerts
    getActiveAlerts: publicProcedure.query(async () => {
      const alerts = await nwsWeatherService.getActiveAlerts();
      return alerts;
    }),

    // Get storm-specific alerts
    getStormAlerts: publicProcedure.query(async () => {
      const alerts = await nwsWeatherService.getStormAlerts();
      return alerts;
    }),

    // Check if monitoring is active
    getMonitoringStatus: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      
      return {
        isMonitoring: true, // Always monitoring when server is running
        checkInterval: "5 minutes",
        lastCheck: new Date(),
      };
    }),

    // Manual trigger for alert check (admin only)
    manualCheck: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      await weatherMonitoringService.manualCheck();
      return { success: true, message: "Manual check completed" };
    }),

    // Get weather alert history from database
    getAlertHistory: protectedProcedure
      .input(
        z.object({
          limit: z.number().optional().default(50),
        })
      )
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }

        const alerts = await db.getWeatherAlertHistory(input.limit);
        return alerts;
      }),
  }),

  // Notifications router for custom user notifications
  notifications: router({
    // Get user's notifications
    getMyNotifications: publicProcedure
      .input(
        z.object({
          includeRead: z.boolean().optional().default(false),
        })
      )
      .query(async ({ input, ctx }) => {
        const userId = ctx.user?.id || null;
        const notifications = await db.getUserNotifications(userId, input.includeRead);
        return notifications;
      }),

    // Mark notification as read
    markAsRead: publicProcedure
      .input(
        z.object({
          id: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        const success = await db.markNotificationAsRead(input.id);
        return { success };
      }),

    // Delete notification
    delete: publicProcedure
      .input(
        z.object({
          id: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        const success = await db.deleteNotification(input.id);
        return { success };
      }),

    // Create notification (admin only)
    create: protectedProcedure
      .input(
        z.object({
          userId: z.number().nullable().optional(),
          title: z.string(),
          message: z.string(),
          type: z.enum(["info", "success", "warning", "error"]).optional().default("info"),
          actionUrl: z.string().optional(),
          actionText: z.string().optional(),
          expiresAt: z.date().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }

        const notification = await db.createNotification(input);
        return { success: true, notification };
      }),

    // Get all notifications (admin only)
    getAll: protectedProcedure
      .input(
        z.object({
          limit: z.number().optional().default(100),
          offset: z.number().optional().default(0),
        })
      )
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }

        const notifications = await db.getAllNotifications(input.limit, input.offset);
        return notifications;
      }),
  }),

  // AI Chatbot router
  chatbot: router({
    // Send message and get response
    sendMessage: publicProcedure
      .input(
        z.object({
          sessionId: z.string(),
          message: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const { generateChatbotResponse } = await import('./chatbot');
        
        const result = await generateChatbotResponse(
          input.sessionId,
          input.message
        );
        
        return result;
      }),

    // Get initial greeting
    getGreeting: publicProcedure.query(async () => {
      const { getChatbotGreeting } = await import('./chatbot');
      return getChatbotGreeting();
    }),

    // Get quick reply suggestions
    getQuickReplies: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        const { getQuickReplies, getChatSession } = await import('./chatbot');
        const session = getChatSession(input.sessionId);
        return getQuickReplies(session);
      }),

    // Get chatbot analytics (admin only)
    getAnalytics: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      
      const { getChatbotAnalytics } = await import('./chatbot');
      return getChatbotAnalytics();
    }),
  }),

  // File validation router for Xactimate XML/PDF uploads
  validation: router({    
    // Upload file and process validation
    uploadFile: publicProcedure
      .input(
        z.object({
          filename: z.string(),
          fileContent: z.string(), // base64 encoded
          fileType: z.enum(["xml", "pdf", "xlsx", "other"]),
          fileSize: z.number(),
          mimeType: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { processUploadedFile, validateAgainstBuildingCodes } = await import('./fileProcessor');
        const { storagePut } = await import('./storage');
        const { uploadedFiles, validationReports } = await import('../drizzle/schema');
        
        const db_instance = await db.getDb();
        if (!db_instance) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        }

        try {
          // Decode base64 file content
          const fileBuffer = Buffer.from(input.fileContent, 'base64');
          
          // Generate unique filename
          const timestamp = Date.now();
          const randomSuffix = Math.random().toString(36).substring(7);
          const fileExtension = input.filename.split('.').pop();
          const s3Key = `validation/${timestamp}-${randomSuffix}.${fileExtension}`;
          
          // Upload to S3
          const { url: s3Url } = await storagePut(s3Key, fileBuffer, input.mimeType);
          
          // Save file record to database
          const [uploadedFile] = await db_instance.insert(uploadedFiles).values({
            filename: `${timestamp}-${randomSuffix}.${fileExtension}`,
            originalFilename: input.filename,
            fileType: input.fileType,
            fileSize: input.fileSize,
            mimeType: input.mimeType,
            s3Key,
            s3Url,
            uploadedBy: ctx.user?.id,
            processingStatus: 'processing',
          }).$returningId();
          
          // Write file temporarily for processing
          const fs = await import('fs');
          const path = await import('path');
          const tmpDir = '/tmp/validation';
          if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
          }
          const tmpFilePath = path.join(tmpDir, `${timestamp}-${randomSuffix}.${fileExtension}`);
          fs.writeFileSync(tmpFilePath, fileBuffer);
          
          // Process file and validate
          const fileData = await processUploadedFile(tmpFilePath, input.filename);
          const validationResult = await validateAgainstBuildingCodes(fileData);
          
          // Clean up temp file
          fs.unlinkSync(tmpFilePath);
          
          // Update file status
          const { eq } = await import('drizzle-orm');
          await db_instance.update(uploadedFiles)
            .set({
              processingStatus: 'completed',
              metadata: JSON.stringify(fileData.extractedData),
              documentType: fileData.fileType === 'pdf' ? 'EagleView' : 'Xactimate',
            })
            .where(eq(uploadedFiles.id, uploadedFile.id));
          
          // Save validation report
          const [report] = await db_instance.insert(validationReports).values({
            fileId: uploadedFile.id,
            address: fileData.metadata.address,
            reportId: fileData.metadata.projectId,
            complianceScore: validationResult.complianceScore,
            status: validationResult.status,
            discrepancies: JSON.stringify(validationResult.discrepancies),
            codeUpgrades: JSON.stringify(validationResult.codeUpgrades),
            summary: validationResult.summary,
            estimatedUpgradeCost: validationResult.codeUpgrades.reduce((sum: number, upgrade: any) => {
              const cost = parseInt(upgrade.costImpact.replace(/[^0-9]/g, '')) || 0;
              return sum + (cost * 100); // convert to cents
            }, 0),
            roofMeasurements: JSON.stringify(fileData.extractedData),
          }).$returningId();
          
          return {
            success: true,
            fileId: uploadedFile.id,
            reportId: report.id,
            validationResult,
          };
        } catch (error: any) {
          console.error('[Validation] File upload error:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `File processing failed: ${error.message}`,
          });
        }
      }),

    // Get validation report by ID
    getReport: publicProcedure
      .input(z.object({ reportId: z.number() }))
      .query(async ({ input }) => {
        const { validationReports, uploadedFiles } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        
        const db_instance = await db.getDb();
        if (!db_instance) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        }

        const [report] = await db_instance
          .select()
          .from(validationReports)
          .where(eq(validationReports.id, input.reportId))
          .limit(1);

        if (!report) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Report not found' });
        }

        // Get associated file
        const [file] = await db_instance
          .select()
          .from(uploadedFiles)
          .where(eq(uploadedFiles.id, report.fileId))
          .limit(1);

        return {
          ...report,
          discrepancies: JSON.parse(report.discrepancies),
          codeUpgrades: JSON.parse(report.codeUpgrades),
          roofMeasurements: report.roofMeasurements ? JSON.parse(report.roofMeasurements) : null,
          file,
        };
      }),

    // List all validation reports
    listReports: publicProcedure.query(async () => {
      const { validationReports, uploadedFiles } = await import('../drizzle/schema');
      const { desc, eq } = await import('drizzle-orm');
      
      const db_instance = await db.getDb();
      if (!db_instance) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const reports = await db_instance
        .select({
          id: validationReports.id,
          address: validationReports.address,
          reportId: validationReports.reportId,
          complianceScore: validationReports.complianceScore,
          status: validationReports.status,
          summary: validationReports.summary,
          createdAt: validationReports.createdAt,
          filename: uploadedFiles.originalFilename,
        })
        .from(validationReports)
        .leftJoin(uploadedFiles, eq(validationReports.fileId, uploadedFiles.id))
        .orderBy(desc(validationReports.createdAt))
        .limit(50);

      return reports;
    }),
  }),

  // Instant Quote System
  quote: router({
    // Quick estimate based on basic inputs
    getQuickEstimate: publicProcedure
      .input(
        z.object({
          roofSqft: z.number().min(500).max(10000),
          pitch: z.string().default('6/12'),
          stories: z.number().int().min(1).max(3).default(1),
          shingleType: z.enum(['standard', 'architectural', 'impact_resistant']).default('architectural'),
          customerName: z.string().optional(),
          customerEmail: z.string().email().optional(),
          customerPhone: z.string().optional(),
          address: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { quickEstimate } = await import('./roofEstimator');
        const { invokeLLM } = await import('./_core/llm');
        
        // Calculate estimate
        const estimate = quickEstimate(
          input.roofSqft,
          input.pitch,
          input.stories,
          input.shingleType
        );

        // Generate AI-powered quote summary
        const shingleTypeLabel = 
          input.shingleType === 'impact_resistant' ? 'Class 4 Impact-Resistant Architectural' :
          input.shingleType === 'architectural' ? 'Architectural Composition' :
          '3-Tab Composition';

        const aiPrompt = `Generate a professional, concise roofing quote summary for a homeowner in McKinney, Texas.

Project Details:
- Roof Size: ${estimate.summary.totalSlopedSquares} squares (${estimate.summary.totalSlopedSqft} sq ft)
- Pitch: ${input.pitch}
- Stories: ${input.stories}
- Shingle Type: ${shingleTypeLabel}
- Total Cost: $${estimate.summary.grandTotal.toLocaleString()}

Write a 2-3 sentence summary that:
1. Confirms the roof replacement scope
2. Highlights the quality materials (synthetic underlayment, ice & water shield, ${shingleTypeLabel} shingles)
3. Mentions the estimate includes all labor, materials, permits, and disposal
4. Emphasizes this is a detailed, insurance-ready estimate

Tone: Professional, confident, reassuring. Do not use salesy language.`;

        const aiSummary = await invokeLLM({
          messages: [
            { role: 'system', content: 'You are a professional roofing estimator for Nimbus Roofing in McKinney, Texas.' },
            { role: 'user', content: aiPrompt },
          ],
        });

        const summary = aiSummary.choices[0]?.message?.content || 
          `Complete roof replacement for ${estimate.summary.totalSlopedSquares} squares using ${shingleTypeLabel} shingles. Includes synthetic underlayment, ice & water shield, ridge vent, and all necessary flashings. This detailed estimate covers all labor, materials, permits, and disposal.`;

        // Save lead if contact info provided
        if (input.customerEmail || input.customerPhone) {
          const { leads } = await import('../drizzle/schema');
          const db_instance = await db.getDb();
          
          if (db_instance) {
            try {
              const leadData: any = {
                name: input.customerName || 'Instant Quote Lead',
                email: input.customerEmail || 'noemail@placeholder.com',
                source: 'instant_quote',
                status: 'new',
                urgency: 'medium',
                notes: `Instant quote requested: ${estimate.summary.totalSlopedSquares} sq, ${input.shingleType} shingles, $${estimate.summary.grandTotal}`,
              };
              if (input.customerPhone) leadData.phone = input.customerPhone;
              if (input.address) leadData.address = input.address;
              
              await db_instance.insert(leads).values(leadData);
            } catch (error) {
              console.error('[Quote] Failed to save lead:', error);
            }
          }
        }

        return {
          estimate,
          aiSummary: summary,
          quoteId: `NR-${Date.now()}`,
        };
      }),

    // Detailed estimate with custom measurements
    getDetailedEstimate: publicProcedure
      .input(
        z.object({
          facets: z.array(
            z.object({
              areaSqft: z.number(),
              pitch: z.string(),
              label: z.string().optional(),
              areaType: z.enum(['PLANAR', 'SLOPED']),
            })
          ),
          linearFeatures: z.object({
            ridges: z.number(),
            hips: z.number(),
            valleys: z.number(),
            eaves: z.number(),
            rakes: z.number(),
          }),
          perimeter: z.number(),
          numPipeJacks: z.number().int(),
          numVents: z.number().int(),
          numExhaust: z.number().int(),
          shingleType: z.enum(['standard', 'architectural', 'impact_resistant']).default('architectural'),
          customerName: z.string().optional(),
          customerEmail: z.string().email().optional(),
          customerPhone: z.string().optional(),
          address: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { calculateRoofEstimate } = await import('./roofEstimator');
        
        const estimate = calculateRoofEstimate(
          {
            facets: input.facets,
            linearFeatures: input.linearFeatures,
            perimeter: input.perimeter,
            numPipeJacks: input.numPipeJacks,
            numVents: input.numVents,
            numExhaust: input.numExhaust,
          },
          input.shingleType
        );

        // Save lead if contact info provided
        if (input.customerEmail || input.customerPhone) {
          const { leads } = await import('../drizzle/schema');
          const db_instance = await db.getDb();
          
          if (db_instance) {
            try {
              const leadData: any = {
                name: input.customerName || 'Detailed Quote Lead',
                email: input.customerEmail || 'noemail@placeholder.com',
                source: 'detailed_quote',
                status: 'new',
                urgency: 'high',
                notes: `Detailed quote requested: ${estimate.summary.totalSlopedSquares} sq, ${input.shingleType} shingles, $${estimate.summary.grandTotal}`,
              };
              if (input.customerPhone) leadData.phone = input.customerPhone;
              if (input.address) leadData.address = input.address;
              
              await db_instance.insert(leads).values(leadData);
            } catch (error) {
              console.error('[Quote] Failed to save lead:', error);
            }
          }
        }

        return {
          estimate,
          quoteId: `NR-${Date.now()}-DTL`,
        };
      }),
  }),

  // SEO Management router for keyword tracking and content generation
  seo: router({
    // Get all keywords
    getKeywords: publicProcedure.query(async () => {
      const { seoKeywords } = await import('../drizzle/schema');
      const db_instance = await db.getDb();
      if (!db_instance) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }
      const keywords = await db_instance.select().from(seoKeywords);
      return keywords;
    }),

    // Get all content templates
    getTemplates: publicProcedure.query(async () => {
      const { contentTemplates } = await import('../drizzle/schema');
      const db_instance = await db.getDb();
      if (!db_instance) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }
      const templates = await db_instance.select().from(contentTemplates);
      return templates;
    }),

    // Get all backlinks
    getBacklinks: publicProcedure.query(async () => {
      const { backlinks } = await import('../drizzle/schema');
      const db_instance = await db.getDb();
      if (!db_instance) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }
      const backlinkData = await db_instance.select().from(backlinks);
      return backlinkData;
    }),

    // Generate content using RAG system
    generateContent: publicProcedure
      .input(
        z.object({
          topic: z.string(),
          contentType: z.enum(['blog', 'service_page', 'neighborhood', 'social', 'email']),
        })
      )
      .mutation(async ({ input }) => {
        const { generateSeoContent } = await import('./ragSystem');
        const content = await generateSeoContent({
          topic: input.topic,
          contentType: input.contentType,
        });
        return content;
      }),

    // Fetch Domain Authority for a single backlink
    fetchDomainAuthority: protectedProcedure
      .input(
        z.object({
          backlinkId: z.number(),
          sourceUrl: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }

        const { fetchDomainAuthority, extractDomain } = await import('./mozApi');
        const { backlinks } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        
        // Extract domain from source URL
        const domain = extractDomain(input.sourceUrl);
        
        // Fetch DA from Moz API
        const metrics = await fetchDomainAuthority(domain);
        
        if (!metrics) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch Domain Authority. Please check MOZ_API_TOKEN configuration.',
          });
        }

        // Update backlink in database
        const db_instance = await db.getDb();
        if (!db_instance) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        }

        await db_instance
          .update(backlinks)
          .set({ domainAuthority: metrics.domainAuthority })
          .where(eq(backlinks.id, input.backlinkId));

        return {
          success: true,
          domainAuthority: metrics.domainAuthority,
          pageAuthority: metrics.pageAuthority,
          spamScore: metrics.spamScore,
        };
      }),

    // Check link status for a single backlink
    checkLinkStatus: protectedProcedure
      .input(z.object({ backlinkId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }

        const { checkLink } = await import('./linkChecker');
        const { backlinks } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        
        const db_instance = await db.getDb();
        if (!db_instance) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        }

        // Get the backlink
        const [backlink] = await db_instance.select().from(backlinks).where(eq(backlinks.id, input.backlinkId)).limit(1);
        if (!backlink || !backlink.sourceUrl) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Backlink not found' });
        }

        // Check the link
        const result = await checkLink(backlink.sourceUrl);
        
        // Update status if broken
        if (result.status === 'broken' || result.status === 'timeout') {
          await db_instance.update(backlinks)
            .set({ status: 'broken' })
            .where(eq(backlinks.id, input.backlinkId));
        } else if (result.status === 'active') {
          await db_instance.update(backlinks)
            .set({ status: 'active' })
            .where(eq(backlinks.id, input.backlinkId));
        }

        return result;
      }),

    // Check all backlinks for broken links
    checkAllLinks: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }

        const { checkLinks, getLinkCheckSummary } = await import('./linkChecker');
        const { backlinks } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        
        const db_instance = await db.getDb();
        if (!db_instance) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        }

        // Get all backlinks
        const allBacklinks = await db_instance.select().from(backlinks);
        const urls = allBacklinks
          .filter(b => b.sourceUrl)
          .map(b => b.sourceUrl!);

        // Check all links
        const results = await checkLinks(urls, {
          timeout: 10000,
          delayBetweenRequests: 1000,
          maxConcurrent: 5,
        });

        // Update statuses in database
        let updated = 0;
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const backlink = allBacklinks[i];
          
          let newStatus: 'active' | 'pending' | 'broken' | 'removed' = backlink.status;
          if (result.status === 'broken' || result.status === 'timeout') {
            newStatus = 'broken';
          } else if (result.status === 'active') {
            newStatus = 'active';
          }

          if (newStatus !== backlink.status) {
            await db_instance.update(backlinks)
              .set({ status: newStatus })
              .where(eq(backlinks.id, backlink.id));
            updated++;
          }
        }

        const summary = getLinkCheckSummary(results);
        
        // Send notification if broken links found
        if (summary.broken > 0) {
          await notifyOwner({
            title: `⚠️ ${summary.broken} Broken Backlinks Detected`,
            content: `Link checker found ${summary.broken} broken backlinks out of ${summary.total} total links. Please review the Backlink Dashboard to fix or remove broken links.`,
          });
        }

        return {
          ...summary,
          updated,
        };
      }),

    // Batch refresh Domain Authority for all backlinks
    refreshAllDomainAuthority: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }

        const { batchFetchDomainAuthority, extractDomain } = await import('./mozApi');
        const { backlinks } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        
        // Get all backlinks
        const db_instance = await db.getDb();
        if (!db_instance) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        }

        const allBacklinks = await db_instance.select().from(backlinks);
        
        // Extract unique domains
        const domainSet = new Set(
          allBacklinks
            .filter(b => b.sourceUrl)
            .map(b => extractDomain(b.sourceUrl!))
        );
        const domains = Array.from(domainSet);

        // Batch fetch DA scores
        const metricsMap = await batchFetchDomainAuthority(domains);

        // Update each backlink
        let updated = 0;
        for (const backlink of allBacklinks) {
          if (!backlink.sourceUrl) continue;
          
          const domain = extractDomain(backlink.sourceUrl);
          const metrics = metricsMap.get(domain);
          
          if (metrics) {
            await db_instance
              .update(backlinks)
              .set({ domainAuthority: metrics.domainAuthority })
              .where(eq(backlinks.id, backlink.id));
            updated++;
          }
        }

        return {
          success: true,
          totalBacklinks: allBacklinks.length,
          updated,
          message: `Successfully updated ${updated} out of ${allBacklinks.length} backlinks`,
        };
      }),

    // Manual update Domain Authority for a backlink
    updateDomainAuthority: protectedProcedure
      .input(
        z.object({
          backlinkId: z.number(),
          domainAuthority: z.number().min(0).max(100),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }

        const { backlinks } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        
        const db_instance = await db.getDb();
        if (!db_instance) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        }

        await db_instance
          .update(backlinks)
          .set({ domainAuthority: input.domainAuthority })
          .where(eq(backlinks.id, input.backlinkId));

        return { success: true };
      }),
  }),

  // Callback Management router
  callbacks: router({
    // Get all callbacks with filters
    getAll: protectedProcedure
      .input(
        z.object({
          status: z.enum(["pending", "scheduled", "completed", "cancelled", "no_answer"]).optional(),
          urgency: z.enum(["low", "medium", "high", "emergency"]).optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          limit: z.number().optional().default(100),
        })
      )
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Admin access required' });
        }

        const db_instance = await db.getDb();
        if (!db_instance) throw new Error("Database not available");

        const { callbackRequests } = await import('../drizzle/schema');
        const { eq, and, gte, lte, desc } = await import('drizzle-orm');

        // Build filter conditions
        const conditions = [];
        if (input.status) conditions.push(eq(callbackRequests.status, input.status));
        if (input.urgency) conditions.push(eq(callbackRequests.urgency, input.urgency));
        if (input.startDate) conditions.push(gte(callbackRequests.createdAt, new Date(input.startDate)));
        if (input.endDate) conditions.push(lte(callbackRequests.createdAt, new Date(input.endDate)));

        const callbacks = await db_instance
          .select()
          .from(callbackRequests)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(callbackRequests.createdAt))
          .limit(input.limit);

        return callbacks;
      }),

    // Update callback status
    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["pending", "scheduled", "completed", "cancelled", "no_answer"]),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Admin access required' });
        }

        const db_instance = await db.getDb();
        if (!db_instance) throw new Error("Database not available");

        const { callbackRequests } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');

        const updateData: any = {
          status: input.status,
          updatedAt: new Date(),
        };

        if (input.notes) updateData.notes = input.notes;
        if (input.status === 'completed') updateData.completedAt = new Date();

        await db_instance
          .update(callbackRequests)
          .set(updateData)
          .where(eq(callbackRequests.id, input.id));

        return { success: true };
      }),

    // Assign callback to sales rep
    assign: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          assignedTo: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Admin access required' });
        }

        const db_instance = await db.getDb();
        if (!db_instance) throw new Error("Database not available");

        const { callbackRequests } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');

        await db_instance
          .update(callbackRequests)
          .set({
            assignedTo: input.assignedTo,
            updatedAt: new Date(),
          })
          .where(eq(callbackRequests.id, input.id));

        return { success: true };
      }),

    // Initiate call from dashboard
    initiateCall: protectedProcedure
      .input(
        z.object({
          id: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Admin access required' });
        }

        const db_instance = await db.getDb();
        if (!db_instance) throw new Error("Database not available");

        const { callbackRequests } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');

        // Get callback request
        const callbacks = await db_instance
          .select()
          .from(callbackRequests)
          .where(eq(callbackRequests.id, input.id))
          .limit(1);

        if (callbacks.length === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Callback request not found' });
        }

        const callback = callbacks[0];

        // Use the initiateCall function from callerFeatures
        const { initiateCall } = await import('./callerFeatures');
        const result = await initiateCall({
          name: callback.name,
          phone: callback.phone,
          reason: callback.requestReason || 'Callback request',
          conversationContext: callback.conversationContext || undefined,
          userProfileId: callback.userProfileId || undefined,
        });

        if (result.success) {
          // Update callback status
          await db_instance
            .update(callbackRequests)
            .set({
              status: 'scheduled',
              updatedAt: new Date(),
            })
            .where(eq(callbackRequests.id, input.id));
        }

        return result;
      }),

    // Get call history for a callback
    getCallHistory: protectedProcedure
      .input(
        z.object({
          callbackId: z.number(),
        })
      )
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Admin access required' });
        }

        const db_instance = await db.getDb();
        if (!db_instance) throw new Error("Database not available");

        const { callTracking } = await import('../drizzle/schema');
        const { eq, desc } = await import('drizzle-orm');

        const calls = await db_instance
          .select()
          .from(callTracking)
          .where(eq(callTracking.callbackRequestId, input.callbackId))
          .orderBy(desc(callTracking.createdAt));

        return calls;
      }),

    // Send SMS to callback recipient
    sendSms: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          message: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }

        const db_instance = await db.getDb();
        if (!db_instance) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        }

        const { callbackRequests } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');

        // Get callback details
        const [callback] = await db_instance
          .select()
          .from(callbackRequests)
          .where(eq(callbackRequests.id, input.id))
          .limit(1);

        if (!callback) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Callback not found' });
        }

        // Send SMS via Twilio
        const { sendSms } = await import('./smsService');
        await sendSms(callback.phone, input.message);

        return { success: true, message: 'SMS sent successfully' };
      }),

    // Get statistics
    getStats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Admin access required' });
      }

      const db_instance = await db.getDb();
      if (!db_instance) throw new Error("Database not available");

      const { callbackRequests } = await import('../drizzle/schema');
      const { eq, count } = await import('drizzle-orm');

      const allCallbacks = await db_instance.select().from(callbackRequests);

      const stats = {
        total: allCallbacks.length,
        pending: allCallbacks.filter(c => c.status === 'pending').length,
        scheduled: allCallbacks.filter(c => c.status === 'scheduled').length,
        completed: allCallbacks.filter(c => c.status === 'completed').length,
        emergency: allCallbacks.filter(c => c.urgency === 'emergency').length,
        high: allCallbacks.filter(c => c.urgency === 'high').length,
      };

      return stats;
    }),
  }),

  // AI Learnings router for semantic memory dashboard
  aiLearnings: router({
    // Get learnings by type
    getByType: protectedProcedure
      .input(
        z.object({
          type: z.enum(["faq", "objection", "pain_point", "feature_request", "knowledge_gap", "successful_response", "failed_response", "industry_insight", "competitor_mention", "pricing_feedback"]),
          limit: z.number().optional().default(50),
        })
      )
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }

        const db_instance = await db.getDb();
        if (!db_instance) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        }

        const { aiLearnings } = await import('../drizzle/schema');
        const { eq, desc } = await import('drizzle-orm');

        const learnings = await db_instance
          .select()
          .from(aiLearnings)
          .where(eq(aiLearnings.learningType, input.type))
          .orderBy(desc(aiLearnings.frequency), desc(aiLearnings.confidence))
          .limit(input.limit);

        return learnings;
      }),

    // Get analytics summary
    getAnalytics: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const db_instance = await db.getDb();
      if (!db_instance) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const { aiLearnings, chatConversations } = await import('../drizzle/schema');
      const { count, avg, eq, sql } = await import('drizzle-orm');

      // Get total learnings
      const totalResult = await db_instance
        .select({ count: count() })
        .from(aiLearnings);
      const totalLearnings = totalResult[0]?.count || 0;

      // Get validated count
      const validatedResult = await db_instance
        .select({ count: count() })
        .from(aiLearnings)
        .where(eq(aiLearnings.isValidated, true));
      const validatedCount = validatedResult[0]?.count || 0;

      // Get average confidence
      const avgConfidenceResult = await db_instance
        .select({ avg: avg(aiLearnings.confidence) })
        .from(aiLearnings);
      const avgConfidence = Math.round(Number(avgConfidenceResult[0]?.avg || 0));

      // Get total conversations
      const conversationsResult = await db_instance
        .select({ count: count() })
        .from(chatConversations);
      const totalConversations = conversationsResult[0]?.count || 0;

      const validationRate = totalLearnings > 0 ? Math.round((validatedCount / totalLearnings) * 100) : 0;

      return {
        totalLearnings,
        validatedCount,
        validationRate,
        avgConfidence,
        totalConversations,
      };
    }),

    // Validate a learning
    validate: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          isValidated: z.boolean(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }

        const db_instance = await db.getDb();
        if (!db_instance) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        }

        const { aiLearnings } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');

        await db_instance
          .update(aiLearnings)
          .set({
            isValidated: input.isValidated,
            validatedBy: ctx.user.id,
            validatedAt: new Date(),
            isActive: input.isValidated, // Deactivate if rejected
            updatedAt: new Date(),
          })
          .where(eq(aiLearnings.id, input.id));

        return { success: true };
      }),
  }),

  // API Keys Management router
  apiKeys: router({
    // Generate new API key
    generate: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          description: z.string().optional(),
          permissions: z.array(z.string()),
          rateLimit: z.number().default(1000),
          expiresAt: z.date().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }

        const { generateApiKey } = await import('./apiKeyService');
        const result = await generateApiKey({
          name: input.name,
          description: input.description,
          permissions: input.permissions,
          rateLimit: input.rateLimit,
          expiresAt: input.expiresAt,
        });

        return result;
      }),

    // List all API keys
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const { listApiKeys } = await import('./apiKeyService');
      const keys = await listApiKeys();
      return keys;
    }),

    // Revoke API key
    revoke: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }

        const { revokeApiKey } = await import('./apiKeyService');
        await revokeApiKey(input.id);
        return { success: true };
      }),

    // Get API request logs
    getLogs: protectedProcedure
      .input(
        z.object({
          apiKeyId: z.number().optional(),
          limit: z.number().default(100),
        })
      )
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }

        const db_instance = await db.getDb();
        if (!db_instance) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        }

        const { apiRequestLogs } = await import('../drizzle/schema');
        const { eq, desc } = await import('drizzle-orm');

        let query = db_instance
          .select()
          .from(apiRequestLogs)
          .orderBy(desc(apiRequestLogs.createdAt))
          .limit(input.limit);

        if (input.apiKeyId) {
          query = query.where(eq(apiRequestLogs.apiKeyId, input.apiKeyId)) as any;
        }

        const logs = await query;
        return logs;
      }),
  }),

  // Email Delivery Monitoring
  emailDelivery: router({
    // Get all email delivery logs with filters
    getAll: protectedProcedure
      .input(
        z.object({
          status: z.enum(["queued", "sent", "delivered", "bounced", "failed", "opened", "clicked"]).optional(),
          templateType: z.enum(["callback_confirmation", "lead_notification", "sms_confirmation", "custom"]).optional(),
          search: z.string().optional(),
          limit: z.number().default(50),
          offset: z.number().default(0),
        })
      )
      .query(async ({ input }) => {
        const db_instance = await db.getDb();
        if (!db_instance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        const { emailDeliveryLogs } = await import("../drizzle/schema");
        const { eq, like, and, or, desc } = await import("drizzle-orm");

        // Build filters
        const filters = [];
        if (input.status) filters.push(eq(emailDeliveryLogs.status, input.status));
        if (input.templateType) filters.push(eq(emailDeliveryLogs.templateType, input.templateType));
        if (input.search) {
          filters.push(
            or(
              like(emailDeliveryLogs.to, `%${input.search}%`),
              like(emailDeliveryLogs.subject, `%${input.search}%`)
            )
          );
        }

        const logs = await db_instance
          .select()
          .from(emailDeliveryLogs)
          .where(filters.length > 0 ? and(...filters) : undefined)
          .orderBy(desc(emailDeliveryLogs.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        return logs;
      }),

    // Get email analytics
    getAnalytics: protectedProcedure
      .input(
        z.object({
          days: z.number().default(7),
        })
      )
      .query(async ({ input }) => {
        const db_instance = await db.getDb();
        if (!db_instance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        const { emailDeliveryLogs } = await import("../drizzle/schema");
        const { gte, sql } = await import("drizzle-orm");

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - input.days);

        // Get all logs from the period
        const logs = await db_instance
          .select()
          .from(emailDeliveryLogs)
          .where(gte(emailDeliveryLogs.createdAt, startDate));

        // Calculate metrics
        const total = logs.length;
        const delivered = logs.filter(l => l.status === "delivered" || l.status === "opened" || l.status === "clicked").length;
        const bounced = logs.filter(l => l.status === "bounced").length;
        const opened = logs.filter(l => l.status === "opened" || l.status === "clicked").length;
        const clicked = logs.filter(l => l.status === "clicked").length;

        return {
          total,
          delivered,
          bounced,
          opened,
          clicked,
          deliveryRate: total > 0 ? (delivered / total) * 100 : 0,
          bounceRate: total > 0 ? (bounced / total) * 100 : 0,
          openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
          clickRate: opened > 0 ? (clicked / opened) * 100 : 0,
        };
      }),

    // Get email events for a specific message
    getEvents: protectedProcedure
      .input(
        z.object({
          messageId: z.string(),
        })
      )
      .query(async ({ input }) => {
        const db_instance = await db.getDb();
        if (!db_instance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        const { emailEvents } = await import("../drizzle/schema");
        const { eq, desc } = await import("drizzle-orm");

        const events = await db_instance
          .select()
          .from(emailEvents)
          .where(eq(emailEvents.messageId, input.messageId))
          .orderBy(desc(emailEvents.timestamp));

        return events;
      }),
  }),

  // Prompt Library router
  prompts: promptLibraryRouter,

  // AI Agents router
  agents: agentsRouter,

  // Twilio Phone Manager router
  twilio: twilioRouter,

  // Lead Tracking router
  leads: leadsRouter,
});

export type AppRouter = typeof appRouter;
