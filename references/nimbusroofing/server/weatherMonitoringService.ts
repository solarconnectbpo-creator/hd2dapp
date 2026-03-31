/**
 * Weather Monitoring Service
 * Continuously monitors NWS alerts and triggers content generation
 */

import { nwsWeatherService, WeatherAlert } from "./nwsWeatherService";
import { generateSEOContent } from "./seoAgentPro";
import { getDb } from "./db";
import { weatherAlerts, blogPosts } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

export class WeatherMonitoringService {
  private isMonitoring = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes

  /**
   * Start monitoring weather alerts
   */
  async startMonitoring() {
    if (this.isMonitoring) {
      console.log("[Weather Monitor] Already monitoring");
      return;
    }

    this.isMonitoring = true;
    console.log("[Weather Monitor] Starting weather alert monitoring...");
    console.log(`[Weather Monitor] Checking every ${this.CHECK_INTERVAL_MS / 1000 / 60} minutes`);

    // Initial check
    await this.checkForAlerts();

    // Set up periodic checks
    this.checkInterval = setInterval(async () => {
      await this.checkForAlerts();
    }, this.CHECK_INTERVAL_MS);
  }

  /**
   * Stop monitoring weather alerts
   */
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isMonitoring = false;
    console.log("[Weather Monitor] Stopped monitoring");
  }

  /**
   * Check for new weather alerts and process them
   */
  async checkForAlerts() {
    try {
      console.log("[Weather Monitor] Checking for active alerts...");
      
      const alerts = await nwsWeatherService.getStormAlerts();
      
      if (alerts.length === 0) {
        console.log("[Weather Monitor] No storm alerts detected");
        return;
      }

      console.log(`[Weather Monitor] Found ${alerts.length} storm alert(s)`);

      for (const alert of alerts) {
        await this.processAlert(alert);
      }
    } catch (error) {
      console.error("[Weather Monitor] Error checking alerts:", error);
    }
  }

  /**
   * Process a single weather alert
   */
  private async processAlert(alert: WeatherAlert) {
    try {
      const db = await getDb();
      if (!db) {
        console.error("[Weather Monitor] Database not available");
        return;
      }

      // Check if we've already processed this alert
      const existing = await db
        .select()
        .from(weatherAlerts)
        .where(eq(weatherAlerts.nwsId, alert.id))
        .limit(1);

      if (existing.length > 0) {
        console.log(`[Weather Monitor] Alert ${alert.id} already processed`);
        return;
      }

      console.log(`[Weather Monitor] Processing new alert: ${alert.event}`);
      console.log(`[Weather Monitor] Headline: ${alert.headline}`);
      console.log(`[Weather Monitor] Area: ${alert.areaDesc}`);

      // Save alert to database
      const alertRecord = {
        nwsId: alert.id,
        event: alert.event,
        headline: alert.headline,
        description: alert.description,
        severity: alert.severity,
        urgency: alert.urgency,
        onset: alert.onset,
        expires: alert.expires,
        areaDesc: alert.areaDesc,
        isStormRelated: alert.isStormRelated,
        contentTriggered: false,
      };

      await db.insert(weatherAlerts).values(alertRecord);

      // Trigger content generation if applicable
      if (alert.shouldTriggerContent) {
        await this.triggerContentGeneration(alert);
      }

      // Notify owner about the alert
      await notifyOwner({
        title: `🌩️ Weather Alert: ${alert.event}`,
        content: `
**New Storm Alert Detected**

**Event:** ${alert.event}
**Severity:** ${alert.severity}
**Urgency:** ${alert.urgency}
**Area:** ${alert.areaDesc}

**Headline:**
${alert.headline}

**Content Generation:** ${alert.shouldTriggerContent ? "✅ Triggered" : "❌ Not triggered"}

**Onset:** ${alert.onset.toLocaleString()}
**Expires:** ${alert.expires.toLocaleString()}
        `.trim()
      });

    } catch (error) {
      console.error("[Weather Monitor] Error processing alert:", error);
    }
  }

  /**
   * Trigger automated content generation for a weather alert
   */
  private async triggerContentGeneration(alert: WeatherAlert) {
    try {
      console.log(`[Weather Monitor] Triggering content generation for: ${alert.event}`);

      const db = await getDb();
      if (!db) {
        console.error("[Weather Monitor] Database not available for content generation");
        return;
      }

      // Generate content topic and keywords from alert
      const topic = nwsWeatherService.generateContentTopic(alert);
      const keywords = nwsWeatherService.generateKeywords(alert);

      console.log(`[Weather Monitor] Generating content: "${topic}"`);

      // Generate SEO-optimized content
      const generatedContent = await generateSEOContent(
        topic,
        "McKinney, Texas",
        keywords
      );

      console.log(`[Weather Monitor] Content generated: ${generatedContent.metadata.wordCount} words`);

      // Create slug from title
      const slug = generatedContent.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        + `-${Date.now()}`; // Add timestamp to ensure uniqueness

      // Save blog post to database (auto-publish)
      const blogPostData = {
        title: generatedContent.title,
        slug,
        excerpt: generatedContent.excerpt,
        content: generatedContent.content,
        featuredImage: generatedContent.visualUrl,
        authorId: 1, // System-generated content
        category: "Storm Damage",
        tags: JSON.stringify(["storm damage", "emergency", "weather alert"]),
        keywords: generatedContent.keywords.join(", "),
        metaTitle: generatedContent.title,
        metaDescription: generatedContent.excerpt,
        isPublished: true, // Auto-publish storm-triggered content
        publishedAt: new Date(),
      };

      const result = await db.insert(blogPosts).values(blogPostData);
      const blogPostId = result[0]?.insertId;

      console.log(`[Weather Monitor] Blog post created and published: ID ${blogPostId}`);

      // Update weather alert record with blog post reference
      await db
        .update(weatherAlerts)
        .set({ 
          contentTriggered: true,
          blogPostId: blogPostId ? Number(blogPostId) : null
        })
        .where(eq(weatherAlerts.nwsId, alert.id));

      // Notify owner about content generation
      await notifyOwner({
        title: `✅ Storm Content Auto-Published`,
        content: `
**AI-Generated Blog Post Published**

**Alert:** ${alert.event}
**Title:** ${generatedContent.title}
**Word Count:** ${generatedContent.metadata.wordCount}
**SEO Score:** ${generatedContent.metadata.seoScore}/100
**Reading Time:** ${generatedContent.metadata.readingTime} min

**Keywords:** ${generatedContent.keywords.join(", ")}

**Status:** ✅ Published and live on website

The content is now live and ready to capture search traffic from homeowners affected by this storm event.
        `.trim()
      });

      console.log(`[Weather Monitor] Content generation completed successfully`);

    } catch (error) {
      console.error("[Weather Monitor] Error generating content:", error);
      
      // Notify owner about failure
      await notifyOwner({
        title: `❌ Storm Content Generation Failed`,
        content: `Failed to generate content for alert: ${alert.event}\n\nError: ${error}`
      });
    }
  }

  /**
   * Manual trigger for testing
   */
  async manualCheck() {
    console.log("[Weather Monitor] Manual check triggered");
    await this.checkForAlerts();
  }
}

/**
 * Singleton instance
 */
export const weatherMonitoringService = new WeatherMonitoringService();
