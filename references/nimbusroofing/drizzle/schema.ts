import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, date } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Leads table for contact form submissions and chatbot interactions
 */
export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  zipCode: varchar("zipCode", { length: 10 }),
  serviceType: varchar("serviceType", { length: 100 }), // Residential, Commercial, Storm Damage, etc.
  urgency: mysqlEnum("urgency", ["low", "medium", "high", "emergency"]).default("medium"),
  message: text("message"),
  source: varchar("source", { length: 50 }), // chatbot, contact_form, phone, etc.
  status: mysqlEnum("status", ["new", "contacted", "qualified", "converted", "lost"]).default("new").notNull(),
  assignedTo: int("assignedTo"), // user id
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

/**
 * Projects table for tracking roofing projects
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId"), // reference to leads table
  projectName: varchar("projectName", { length: 255 }).notNull(),
  customerName: varchar("customerName", { length: 255 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }),
  customerPhone: varchar("customerPhone", { length: 20 }),
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  zipCode: varchar("zipCode", { length: 10 }).notNull(),
  neighborhood: varchar("neighborhood", { length: 100 }), // Stonebridge Ranch, Craig Ranch, etc.
  serviceType: varchar("serviceType", { length: 100 }).notNull(),
  projectValue: int("projectValue"), // in cents
  status: mysqlEnum("status", ["quoted", "approved", "in_progress", "completed", "cancelled"]).default("quoted").notNull(),
  startDate: timestamp("startDate"),
  completionDate: timestamp("completionDate"),
  notes: text("notes"),
  beforeImages: text("beforeImages"), // JSON array of image URLs
  afterImages: text("afterImages"), // JSON array of image URLs
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Testimonials table for customer reviews
 */
export const testimonials = mysqlTable("testimonials", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId"), // reference to projects table
  customerName: varchar("customerName", { length: 255 }).notNull(),
  customerLocation: varchar("customerLocation", { length: 100 }), // City or neighborhood
  rating: int("rating").notNull(), // 1-5 stars
  reviewText: text("reviewText").notNull(),
  serviceType: varchar("serviceType", { length: 100 }),
  isPublished: boolean("isPublished").default(false).notNull(),
  isFeatured: boolean("isFeatured").default(false).notNull(),
  reviewDate: timestamp("reviewDate").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Testimonial = typeof testimonials.$inferSelect;
export type InsertTestimonial = typeof testimonials.$inferInsert;

/**
 * Blog posts table for SEO content
 */
export const blogPosts = mysqlTable("blogPosts", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  featuredImage: varchar("featuredImage", { length: 500 }),
  authorId: int("authorId").notNull(), // reference to users table
  category: varchar("category", { length: 100 }), // Storm Damage, Insurance, Maintenance, etc.
  tags: text("tags"), // JSON array of tags
  metaTitle: varchar("metaTitle", { length: 255 }),
  metaDescription: text("metaDescription"),
  keywords: text("keywords"), // Comma-separated SEO keywords
  isPublished: boolean("isPublished").default(false).notNull(),
  publishedAt: timestamp("publishedAt"),
  viewCount: int("viewCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = typeof blogPosts.$inferInsert;

/**
 * Neighborhoods table for service area landing pages
 */
export const neighborhoods = mysqlTable("neighborhoods", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  city: varchar("city", { length: 100 }).notNull(),
  zipCodes: text("zipCodes"), // Comma-separated zip codes
  description: text("description"),
  hoaRequirements: text("hoaRequirements"),
  averageProjectCost: int("averageProjectCost"), // in cents
  completedProjects: int("completedProjects").default(0).notNull(),
  metaTitle: varchar("metaTitle", { length: 255 }),
  metaDescription: text("metaDescription"),
  keywords: text("keywords"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Neighborhood = typeof neighborhoods.$inferSelect;
export type InsertNeighborhood = typeof neighborhoods.$inferInsert;

/**
 * Services table for roofing services
 */
export const services = mysqlTable("services", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  shortDescription: text("shortDescription"),
  fullDescription: text("fullDescription"),
  icon: varchar("icon", { length: 100 }), // lucide icon name
  category: mysqlEnum("category", ["residential", "commercial", "emergency", "specialty"]).notNull(),
  features: text("features"), // JSON array of feature strings
  pricing: text("pricing"), // JSON object with pricing info
  metaTitle: varchar("metaTitle", { length: 255 }),
  metaDescription: text("metaDescription"),
  keywords: text("keywords"),
  isActive: boolean("isActive").default(true).notNull(),
  displayOrder: int("displayOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Service = typeof services.$inferSelect;
export type InsertService = typeof services.$inferInsert;

/**
 * Chat conversations table for AI chatbot interactions
 */
export const chatConversations = mysqlTable("chatConversations", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 255 }).notNull().unique(),
  leadId: int("leadId"), // reference to leads table if converted
  visitorName: varchar("visitorName", { length: 255 }),
  visitorEmail: varchar("visitorEmail", { length: 320 }),
  visitorPhone: varchar("visitorPhone", { length: 20 }),
  messages: text("messages").notNull(), // JSON array of messages
  status: mysqlEnum("status", ["active", "converted", "abandoned"]).default("active").notNull(),
  lastMessageAt: timestamp("lastMessageAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChatConversation = typeof chatConversations.$inferSelect;
export type InsertChatConversation = typeof chatConversations.$inferInsert;

/**
 * Backlinks table for SEO backlink tracking
 */
export const backlinks = mysqlTable("backlinks", {
  id: int("id").autoincrement().primaryKey(),
  sourceUrl: varchar("sourceUrl", { length: 500 }).notNull(),
  targetUrl: varchar("targetUrl", { length: 500 }).notNull(),
  anchorText: varchar("anchorText", { length: 255 }),
  platform: varchar("platform", { length: 100 }), // Google My Business, Yelp, BBB, etc.
  status: mysqlEnum("status", ["active", "pending", "broken", "removed"]).default("pending").notNull(),
  domainAuthority: int("domainAuthority"),
  notes: text("notes"),
  lastChecked: timestamp("lastChecked"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Backlink = typeof backlinks.$inferSelect;
export type InsertBacklink = typeof backlinks.$inferInsert;

/**
 * Weather alerts table for storm detection and content triggers
 */
export const weatherAlerts = mysqlTable("weatherAlerts", {
  id: int("id").autoincrement().primaryKey(),
  nwsId: varchar("nwsId", { length: 255 }).notNull().unique(), // NWS alert ID
  event: varchar("event", { length: 255 }).notNull(), // e.g., "Severe Thunderstorm Warning"
  headline: text("headline"),
  description: text("description"),
  severity: varchar("severity", { length: 50 }), // Extreme, Severe, Moderate, Minor
  urgency: varchar("urgency", { length: 50 }), // Immediate, Expected, Future
  onset: timestamp("onset"),
  expires: timestamp("expires"),
  areaDesc: text("areaDesc"),
  isStormRelated: boolean("isStormRelated").default(false).notNull(),
  contentTriggered: boolean("contentTriggered").default(false).notNull(), // Has content been generated?
  blogPostId: int("blogPostId"), // Reference to generated blog post
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WeatherAlert = typeof weatherAlerts.$inferSelect;
export type InsertWeatherAlert = typeof weatherAlerts.$inferInsert;

/**
 * Notifications table for custom user notifications
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // null = all users, specific id = targeted user
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: mysqlEnum("type", ["info", "success", "warning", "error"]).default("info").notNull(),
  actionUrl: varchar("actionUrl", { length: 500 }), // Optional link for notification
  actionText: varchar("actionText", { length: 100 }), // Optional button text
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"), // Optional expiration
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Uploaded files table for Xactimate XML, PDFs, and other documents
 */
export const uploadedFiles = mysqlTable("uploadedFiles", {
  id: int("id").autoincrement().primaryKey(),
  filename: varchar("filename", { length: 255 }).notNull(),
  originalFilename: varchar("originalFilename", { length: 255 }).notNull(),
  fileType: mysqlEnum("fileType", ["xml", "pdf", "xlsx", "other"]).notNull(),
  fileSize: int("fileSize").notNull(), // in bytes
  mimeType: varchar("mimeType", { length: 100 }),
  s3Key: varchar("s3Key", { length: 500 }).notNull(), // S3 storage key
  s3Url: varchar("s3Url", { length: 500 }).notNull(), // Public URL
  uploadedBy: int("uploadedBy"), // user id
  projectId: int("projectId"), // optional reference to projects table
  documentType: varchar("documentType", { length: 100 }), // EagleView, Xactimate, Invoice, etc.
  metadata: text("metadata"), // JSON object with extracted data
  processingStatus: mysqlEnum("processingStatus", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UploadedFile = typeof uploadedFiles.$inferSelect;
export type InsertUploadedFile = typeof uploadedFiles.$inferInsert;

/**
 * Validation reports table for building code compliance reports
 */
export const validationReports = mysqlTable("validationReports", {
  id: int("id").autoincrement().primaryKey(),
  fileId: int("fileId").notNull(), // reference to uploadedFiles table
  address: text("address"),
  reportId: varchar("reportId", { length: 100 }), // External report ID (e.g., EagleView report number)
  complianceScore: int("complianceScore").notNull(), // 0-100
  status: mysqlEnum("status", ["compliant", "warnings", "non-compliant"]).notNull(),
  discrepancies: text("discrepancies").notNull(), // JSON array of discrepancy objects
  codeUpgrades: text("codeUpgrades").notNull(), // JSON array of upgrade recommendations
  summary: text("summary").notNull(),
  estimatedUpgradeCost: int("estimatedUpgradeCost"), // in cents
  roofMeasurements: text("roofMeasurements"), // JSON object with roof data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ValidationReport = typeof validationReports.$inferSelect;
export type InsertValidationReport = typeof validationReports.$inferInsert;

/**
 * SEO Keywords table for keyword tracking and optimization
 */
export const seoKeywords = mysqlTable("seoKeywords", {
  id: int("id").autoincrement().primaryKey(),
  keyword: varchar("keyword", { length: 255 }).notNull().unique(),
  searchVolume: int("searchVolume"), // Monthly search volume
  keywordDifficulty: int("keywordDifficulty"), // 0-100 scale
  cpc: varchar("cpc", { length: 20 }), // Cost per click
  intent: mysqlEnum("intent", ["informational", "navigational", "transactional", "commercial"]),
  category: varchar("category", { length: 100 }), // Geographic, Service, Problem-Solution, etc.
  currentRanking: int("currentRanking"), // Current Google ranking position
  targetRanking: int("targetRanking"), // Target ranking position
  serpFeatures: text("serpFeatures"), // JSON array of SERP features
  relatedKeywords: text("relatedKeywords"), // JSON array of related keywords
  contentGenerated: boolean("contentGenerated").default(false).notNull(),
  blogPostId: int("blogPostId"), // Reference to generated blog post
  isActive: boolean("isActive").default(true).notNull(),
  lastChecked: timestamp("lastChecked"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SeoKeyword = typeof seoKeywords.$inferSelect;
export type InsertSeoKeyword = typeof seoKeywords.$inferInsert;

/**
 * Content templates table for campaign headlines, hooks, and scripts
 */
export const contentTemplates = mysqlTable("contentTemplates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["headline", "subheading", "hook", "script", "email", "social"]).notNull(),
  template: text("template").notNull(),
  keywords: text("keywords"), // JSON array of keywords
  hashtags: text("hashtags"), // JSON array of hashtags
  targetAudience: varchar("targetAudience", { length: 255 }),
  platform: varchar("platform", { length: 100 }), // Facebook, Instagram, Email, Blog, etc.
  campaignId: varchar("campaignId", { length: 100 }), // Campaign identifier
  usageCount: int("usageCount").default(0).notNull(),
  performanceScore: int("performanceScore"), // 0-100 based on engagement
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContentTemplate = typeof contentTemplates.$inferSelect;
export type InsertContentTemplate = typeof contentTemplates.$inferInsert;


/**
 * Semantic Memory System - AI Learning & Conversation Storage
 */

/**
 * Individual chat messages within conversations
 */
export const chatMessages = mysqlTable("chatMessages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(), // Foreign key to chatConversations
  role: mysqlEnum("role", ["user", "assistant", "system", "function"]).notNull(),
  content: text("content").notNull(),
  functionName: varchar("functionName", { length: 255 }), // If role=function, which function was called
  functionArgs: text("functionArgs"), // JSON of function arguments
  functionResult: text("functionResult"), // JSON of function result
  tokens: int("tokens"), // Token count for this message
  sentiment: varchar("sentiment", { length: 50 }), // positive, negative, neutral, frustrated, satisfied
  intent: varchar("intent", { length: 100 }), // pricing_inquiry, emergency_request, general_info, etc.
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

/**
 * AI learnings extracted from conversations - semantic memory
 */
export const aiLearnings = mysqlTable("aiLearnings", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId"), // Optional - source conversation
  learningType: mysqlEnum("learningType", [
    "faq", // Frequently asked question
    "objection", // Common customer objection
    "pain_point", // Customer pain point
    "feature_request", // Feature or service request
    "knowledge_gap", // Gap in AI knowledge
    "successful_response", // Response that led to conversion
    "failed_response", // Response that led to dissatisfaction
    "industry_insight", // New industry knowledge
    "competitor_mention", // Competitor mentioned
    "pricing_feedback", // Pricing-related feedback
  ]).notNull(),
  category: varchar("category", { length: 100 }), // roofing, insurance, pricing, warranty, etc.
  question: text("question"), // Original user question
  answer: text("answer"), // AI response or learned answer
  context: text("context"), // Additional context
  confidence: int("confidence").default(50).notNull(), // 0-100 confidence score
  frequency: int("frequency").default(1).notNull(), // How many times this pattern appeared
  lastSeen: timestamp("lastSeen").defaultNow().notNull(),
  isValidated: boolean("isValidated").default(false).notNull(), // Admin validated this learning
  validatedBy: int("validatedBy"), // Admin user who validated
  validatedAt: timestamp("validatedAt"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AILearning = typeof aiLearnings.$inferSelect;
export type InsertAILearning = typeof aiLearnings.$inferInsert;

/**
 * Knowledge base entries - continuously updated from web sources
 */
export const knowledgeBase = mysqlTable("knowledgeBase", {
  id: int("id").autoincrement().primaryKey(),
  category: varchar("category", { length: 100 }).notNull(), // seo, roofing, warranties, holidays, specials, storms
  subcategory: varchar("subcategory", { length: 100 }), // More specific categorization
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  source: varchar("source", { length: 500 }), // URL or source identifier
  sourceType: mysqlEnum("sourceType", [
    "web_scrape", // Scraped from website
    "api", // From API (NWS, etc.)
    "manual", // Manually entered
    "ai_generated", // Generated by AI
    "conversation", // Extracted from conversation
  ]).notNull(),
  keywords: text("keywords"), // JSON array of keywords
  relevanceScore: int("relevanceScore").default(50).notNull(), // 0-100 relevance to business
  usageCount: int("usageCount").default(0).notNull(), // How many times referenced
  lastUsed: timestamp("lastUsed"),
  isActive: boolean("isActive").default(true).notNull(),
  expiresAt: timestamp("expiresAt"), // For time-sensitive info (holidays, specials, storms)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KnowledgeBase = typeof knowledgeBase.$inferSelect;
export type InsertKnowledgeBase = typeof knowledgeBase.$inferInsert;

/**
 * Feedback loop - tracks AI response quality and improvements
 */
export const aiFeedback = mysqlTable("aiFeedback", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId"), // Source conversation
  messageId: int("messageId"), // Specific message that received feedback
  feedbackType: mysqlEnum("feedbackType", [
    "thumbs_up", // User liked the response
    "thumbs_down", // User disliked the response
    "correction", // User provided correction
    "clarification", // User needed clarification
    "conversion", // Response led to lead capture
    "abandonment", // User left after this response
  ]).notNull(),
  userComment: text("userComment"), // Optional user comment
  systemAnalysis: text("systemAnalysis"), // AI analysis of what went wrong/right
  improvementSuggestion: text("improvementSuggestion"), // Suggested improvement
  wasImplemented: boolean("wasImplemented").default(false).notNull(),
  implementedAt: timestamp("implementedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AIFeedback = typeof aiFeedback.$inferSelect;
export type InsertAIFeedback = typeof aiFeedback.$inferInsert;

/**
 * Storm history database - historical storm data for predictive analysis
 */
export const stormHistory = mysqlTable("stormHistory", {
  id: int("id").autoincrement().primaryKey(),
  eventId: varchar("eventId", { length: 255 }).unique(), // NWS event ID
  eventType: varchar("eventType", { length: 100 }).notNull(), // Hail, Tornado, Thunderstorm, Wind
  severity: mysqlEnum("severity", ["Minor", "Moderate", "Severe", "Extreme"]).notNull(),
  location: varchar("location", { length: 255 }).notNull(), // City/County
  county: varchar("county", { length: 100 }),
  state: varchar("state", { length: 2 }).default("TX").notNull(),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime"),
  description: text("description"),
  hailSize: varchar("hailSize", { length: 50 }), // e.g., "1.5 inches", "golf ball"
  windSpeed: int("windSpeed"), // mph
  damageEstimate: int("damageEstimate"), // Estimated damage in dollars
  leadsGenerated: int("leadsGenerated").default(0), // Leads captured from this storm
  contentGenerated: boolean("contentGenerated").default(false), // Did we auto-generate content?
  blogPostId: int("blogPostId"), // Link to generated blog post
  seasonalPattern: varchar("seasonalPattern", { length: 50 }), // Spring, Summer, Fall, Winter
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StormHistory = typeof stormHistory.$inferSelect;
export type InsertStormHistory = typeof stormHistory.$inferInsert;

/**
 * User profiles for personalized chatbot interactions
 * Tracks anonymous visitors and their preferences over time
 */
export const userProfiles = mysqlTable("userProfiles", {
  id: int("id").autoincrement().primaryKey(),
  fingerprint: varchar("fingerprint", { length: 255 }).notNull().unique(), // Browser fingerprint for anonymous tracking
  email: varchar("email", { length: 320 }), // Optional - captured if user provides it
  phone: varchar("phone", { length: 20 }), // Optional - captured if user provides it
  name: varchar("name", { length: 255 }), // Optional - captured if user provides it
  
  // Progressive profiling data
  interests: text("interests"), // JSON array of topics they've asked about
  painPoints: text("painPoints"), // JSON array of concerns mentioned
  buyerStage: mysqlEnum("buyerStage", ["awareness", "consideration", "decision", "customer"]).default("awareness"),
  preferredContactMethod: mysqlEnum("preferredContactMethod", ["email", "phone", "sms", "none"]),
  
  // Behavioral data
  totalConversations: int("totalConversations").default(0).notNull(),
  totalMessages: int("totalMessages").default(0).notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  firstSeenAt: timestamp("firstSeenAt").defaultNow().notNull(),
  
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

/**
 * Callback requests from chatbot
 * Tracks when users request to be called back
 */
export const callbackRequests = mysqlTable("callbackRequests", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId"), // Reference to leads table if lead exists
  userProfileId: int("userProfileId"), // Reference to userProfiles for personalization
  
  // Contact information
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 320 }),
  
  // Callback preferences
  preferredTime: varchar("preferredTime", { length: 100 }), // "morning", "afternoon", "evening", "asap"
  preferredDate: date("preferredDate"),
  timezone: varchar("timezone", { length: 50 }).default("America/Chicago"),
  
  // Context from conversation
  requestReason: text("requestReason"), // What they want to discuss
  urgency: mysqlEnum("urgency", ["low", "medium", "high", "emergency"]).default("medium"),
  conversationContext: text("conversationContext"), // JSON of recent messages
  
  // Status tracking
  status: mysqlEnum("status", ["pending", "scheduled", "completed", "cancelled", "no_answer"]).default("pending"),
  scheduledFor: timestamp("scheduledFor"),
  completedAt: timestamp("completedAt"),
  assignedTo: varchar("assignedTo", { length: 255 }), // Sales rep name
  
  // Call tracking
  callSid: varchar("callSid", { length: 100 }), // Twilio call SID
  callDuration: int("callDuration"), // Duration in seconds
  callRecordingUrl: varchar("callRecordingUrl", { length: 500 }),
  
  // Notes
  notes: text("notes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CallbackRequest = typeof callbackRequests.$inferSelect;
export type InsertCallbackRequest = typeof callbackRequests.$inferInsert;

/**
 * Call tracking for all outbound and inbound calls
 */
export const callTracking = mysqlTable("callTracking", {
  id: int("id").autoincrement().primaryKey(),
  
  // Twilio data
  callSid: varchar("callSid", { length: 100 }).notNull().unique(),
  direction: mysqlEnum("direction", ["inbound", "outbound"]).notNull(),
  fromNumber: varchar("fromNumber", { length: 20 }).notNull(),
  toNumber: varchar("toNumber", { length: 20 }).notNull(),
  
  // Call details
  status: varchar("status", { length: 50 }), // queued, ringing, in-progress, completed, busy, failed, no-answer
  duration: int("duration"), // Duration in seconds
  recordingUrl: varchar("recordingUrl", { length: 500 }),
  transcription: text("transcription"),
  
  // Context
  leadId: int("leadId"), // Associated lead
  callbackRequestId: int("callbackRequestId"), // Associated callback request
  source: varchar("source", { length: 100 }), // "chatbot", "website_button", "google_ads", etc.
  
  // Outcome
  outcome: mysqlEnum("outcome", ["connected", "voicemail", "no_answer", "busy", "failed"]),
  followUpRequired: boolean("followUpRequired").default(false),
  
  // Metadata
  startedAt: timestamp("startedAt"),
  endedAt: timestamp("endedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CallTracking = typeof callTracking.$inferSelect;
export type InsertCallTracking = typeof callTracking.$inferInsert;

/**
 * SMS opt-ins and message history
 */
export const smsOptIns = mysqlTable("smsOptIns", {
  id: int("id").autoincrement().primaryKey(),
  
  // Contact info
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  
  // Opt-in details
  optedIn: boolean("optedIn").default(true).notNull(),
  optInSource: varchar("optInSource", { length: 100 }), // "chatbot", "website_form", "manual"
  optInDate: timestamp("optInDate").defaultNow().notNull(),
  optOutDate: timestamp("optOutDate"),
  
  // Preferences
  messageTypes: text("messageTypes"), // JSON array: ["alerts", "promotions", "reminders", "updates"]
  frequency: mysqlEnum("frequency", ["all", "important_only", "weekly_digest"]).default("all"),
  
  // Associated records
  leadId: int("leadId"),
  userProfileId: int("userProfileId"),
  
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SmsOptIn = typeof smsOptIns.$inferSelect;
export type InsertSmsOptIn = typeof smsOptIns.$inferInsert;

/**
 * API Keys for external integrations
 * Allows third-party systems to submit leads via REST API
 */
export const apiKeys = mysqlTable("apiKeys", {
  id: int("id").autoincrement().primaryKey(),
  
  // Key details
  key: varchar("key", { length: 64 }).notNull().unique(), // SHA-256 hash of actual key
  name: varchar("name", { length: 255 }).notNull(), // Friendly name (e.g., "Website Contact Form", "Zapier Integration")
  description: text("description"),
  
  // Permissions
  permissions: text("permissions"), // JSON array: ["leads:create", "webhooks:receive"]
  rateLimit: int("rateLimit").default(1000), // Requests per hour
  
  // Status
  isActive: boolean("isActive").default(true).notNull(),
  expiresAt: timestamp("expiresAt"), // Optional expiration date
  lastUsedAt: timestamp("lastUsedAt"),
  
  // Usage tracking
  totalRequests: int("totalRequests").default(0),
  
  // Metadata
  createdBy: varchar("createdBy", { length: 255 }),
  ipWhitelist: text("ipWhitelist"), // JSON array of allowed IPs
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

/**
 * API request logs for monitoring and debugging
 */
export const apiRequestLogs = mysqlTable("apiRequestLogs", {
  id: int("id").autoincrement().primaryKey(),
  
  // Request details
  apiKeyId: int("apiKeyId"),
  endpoint: varchar("endpoint", { length: 255 }).notNull(),
  method: varchar("method", { length: 10 }).notNull(), // GET, POST, PUT, DELETE
  
  // Request/Response
  requestBody: text("requestBody"),
  responseStatus: int("responseStatus"),
  responseBody: text("responseBody"),
  
  // Metadata
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: varchar("userAgent", { length: 500 }),
  duration: int("duration"), // Milliseconds
  
  // Error tracking
  error: text("error"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ApiRequestLog = typeof apiRequestLogs.$inferSelect;
export type InsertApiRequestLog = typeof apiRequestLogs.$inferInsert;


// CTA Interactions - Track user interactions with chatbot CTAs
export const ctaInteractions = mysqlTable("ctaInteractions", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 255 }),
  userFingerprint: varchar("userFingerprint", { length: 255 }),
  ctaType: varchar("ctaType", { length: 50 }), // 'call', 'sms', 'callback', 'inspection', 'estimate'
  ctaText: text("ctaText"),
  ctaContext: text("ctaContext"), // What the user was asking about
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  name: varchar("name", { length: 255 }),
  clicked: boolean("clicked").default(false).notNull(),
  converted: boolean("converted").default(false).notNull(), // Did they complete the action?
  source: varchar("source", { length: 50 }).default("chatbot").notNull(),
  metadata: text("metadata"), // JSON string with additional data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CtaInteraction = typeof ctaInteractions.$inferSelect;
export type InsertCtaInteraction = typeof ctaInteractions.$inferInsert;


/**
 * Email Delivery Logs
 * Tracks all emails sent via SendGrid with delivery status
 */
export const emailDeliveryLogs = mysqlTable("emailDeliveryLogs", {
  id: int("id").autoincrement().primaryKey(),
  messageId: varchar("messageId", { length: 255 }).notNull().unique(), // SendGrid message ID
  to: varchar("to", { length: 320 }).notNull(),
  from: varchar("from", { length: 320 }).notNull(),
  subject: text("subject").notNull(),
  templateType: mysqlEnum("templateType", ["callback_confirmation", "lead_notification", "sms_confirmation", "custom"]).notNull(),
  status: mysqlEnum("status", ["queued", "sent", "delivered", "bounced", "failed", "opened", "clicked"]).default("queued").notNull(),
  bounceReason: text("bounceReason"),
  failureReason: text("failureReason"),
  openedAt: timestamp("openedAt"),
  clickedAt: timestamp("clickedAt"),
  deliveredAt: timestamp("deliveredAt"),
  bouncedAt: timestamp("bouncedAt"),
  sentAt: timestamp("sentAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Email Events
 * Tracks individual events from SendGrid webhooks
 */
export const emailEvents = mysqlTable("emailEvents", {
  id: int("id").autoincrement().primaryKey(),
  emailLogId: int("emailLogId").notNull(),
  messageId: varchar("messageId", { length: 255 }).notNull(),
  event: mysqlEnum("event", ["processed", "delivered", "bounce", "dropped", "deferred", "open", "click", "spam_report", "unsubscribe"]).notNull(),
  reason: text("reason"),
  url: text("url"), // For click events
  userAgent: text("userAgent"),
  ip: varchar("ip", { length: 45 }),
  timestamp: timestamp("timestamp").notNull(),
  rawPayload: text("rawPayload"), // Store full webhook payload for debugging
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmailDeliveryLog = typeof emailDeliveryLogs.$inferSelect;
export type InsertEmailDeliveryLog = typeof emailDeliveryLogs.$inferInsert;
export type EmailEvent = typeof emailEvents.$inferSelect;
export type InsertEmailEvent = typeof emailEvents.$inferInsert;


/**
 * Prompt Library - Perplexity AI prompts for daily tasks
 */
export const promptLibrary = mysqlTable("promptLibrary", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  category: mysqlEnum("category", [
    "storm_intelligence",
    "market_research", 
    "product_research",
    "seo_marketing",
    "lead_management",
    "insurance_claims",
    "business_strategy",
    "sales_support",
    "emergency_operations",
    "technology_research"
  ]).notNull(),
  useCase: text("useCase").notNull(), // When to use this prompt
  promptText: text("promptText").notNull(), // The actual prompt template
  customizationFields: text("customizationFields"), // JSON array of field definitions
  exampleOutput: text("exampleOutput"), // Example of what Perplexity might return
  tags: text("tags"), // JSON array of searchable tags
  isFeatured: boolean("isFeatured").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  usageCount: int("usageCount").default(0).notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
  createdBy: int("createdBy"), // user id
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PromptLibraryItem = typeof promptLibrary.$inferSelect;
export type InsertPromptLibraryItem = typeof promptLibrary.$inferInsert;

/**
 * Prompt Favorites - User's saved favorite prompts
 */
export const promptFavorites = mysqlTable("promptFavorites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // reference to users table
  promptId: int("promptId").notNull(), // reference to promptLibrary table
  notes: text("notes"), // User's personal notes about this prompt
  customDefaults: text("customDefaults"), // JSON object of user's default values for customization fields
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PromptFavorite = typeof promptFavorites.$inferSelect;
export type InsertPromptFavorite = typeof promptFavorites.$inferInsert;

/**
 * Prompt Usage Logs - Track when and how prompts are used
 */
export const promptUsageLogs = mysqlTable("promptUsageLogs", {
  id: int("id").autoincrement().primaryKey(),
  promptId: int("promptId").notNull(),
  userId: int("userId"), // null for anonymous usage
  customizationValues: text("customizationValues"), // JSON object of values used
  copiedAt: timestamp("copiedAt").defaultNow().notNull(),
  resultQuality: mysqlEnum("resultQuality", ["excellent", "good", "fair", "poor"]),
  feedback: text("feedback"), // User feedback on the prompt's effectiveness
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PromptUsageLog = typeof promptUsageLogs.$inferSelect;
export type InsertPromptUsageLog = typeof promptUsageLogs.$inferInsert;

/**
 * Custom Prompts - Team-created custom prompts
 */
export const customPrompts = mysqlTable("customPrompts", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  promptText: text("promptText").notNull(),
  customizationFields: text("customizationFields"), // JSON array
  createdBy: int("createdBy").notNull(),
  isShared: boolean("isShared").default(false).notNull(), // Share with team
  usageCount: int("usageCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CustomPrompt = typeof customPrompts.$inferSelect;
export type InsertCustomPrompt = typeof customPrompts.$inferInsert;

/**
 * ========================================
 * AI AGENT SYSTEM TABLES
 * ========================================
 */

/**
 * Insurance Claims - Uploaded claim documents and analysis results
 */
export const insuranceClaims = mysqlTable("insuranceClaims", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // Customer who uploaded
  leadId: int("leadId"), // Link to lead if applicable
  claimNumber: varchar("claimNumber", { length: 255 }),
  insuranceCompany: varchar("insuranceCompany", { length: 255 }),
  uploadedFileUrl: text("uploadedFileUrl").notNull(), // S3 URL
  uploadedFileName: varchar("uploadedFileName", { length: 255 }),
  ocrText: text("ocrText"), // Extracted text from OCR
  lineItems: text("lineItems"), // JSON array of parsed line items
  missingItems: text("missingItems"), // JSON array of missing required items
  fraudScore: int("fraudScore").default(0).notNull(), // 0-100 risk score
  fraudFlags: text("fraudFlags"), // JSON array of flagged sentences
  supplierPricing: text("supplierPricing"), // JSON object with pricing data
  status: mysqlEnum("status", ["pending", "analyzing", "reviewed", "approved", "rejected", "disputed"]).default("pending").notNull(),
  reviewedBy: int("reviewedBy"), // Admin user ID who reviewed
  reviewNotes: text("reviewNotes"),
  reportUrl: text("reportUrl"), // Generated PDF report URL
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  analyzedAt: timestamp("analyzedAt"),
  reviewedAt: timestamp("reviewedAt"),
});

export type InsuranceClaim = typeof insuranceClaims.$inferSelect;
export type InsertInsuranceClaim = typeof insuranceClaims.$inferInsert;

/**
 * Agent Tasks - Queue and execution log for all AI agent tasks
 */
export const agentTasks = mysqlTable("agentTasks", {
  id: int("id").autoincrement().primaryKey(),
  taskType: varchar("taskType", { length: 100 }).notNull(), // analyzeClaim, detectFraud, getPricing, etc.
  agentName: varchar("agentName", { length: 100 }).notNull(), // ClaimAnalyzer, FraudDetector, etc.
  inputData: text("inputData").notNull(), // JSON input parameters
  outputData: text("outputData"), // JSON result
  status: mysqlEnum("status", ["queued", "processing", "completed", "failed"]).default("queued").notNull(),
  priority: int("priority").default(5).notNull(), // 1-10, higher = more urgent
  errorMessage: text("errorMessage"),
  executionTimeMs: int("executionTimeMs"), // Performance tracking
  retryCount: int("retryCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
});

export type AgentTask = typeof agentTasks.$inferSelect;
export type InsertAgentTask = typeof agentTasks.$inferInsert;

/**
 * Supplier Pricing - Cached pricing data from supplier APIs
 */
export const supplierPricing = mysqlTable("supplierPricing", {
  id: int("id").autoincrement().primaryKey(),
  itemName: varchar("itemName", { length: 255 }).notNull(),
  itemCategory: varchar("itemCategory", { length: 100 }), // shingles, underlayment, flashing, etc.
  supplier: varchar("supplier", { length: 100 }).notNull(), // ABC Supply, Beacon, SRS, etc.
  price: int("price").notNull(), // in cents
  unit: varchar("unit", { length: 50 }).default("each").notNull(), // each, sq ft, bundle, etc.
  sku: varchar("sku", { length: 100 }),
  inStock: boolean("inStock").default(true).notNull(),
  lastUpdated: timestamp("lastUpdated").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SupplierPricing = typeof supplierPricing.$inferSelect;
export type InsertSupplierPricing = typeof supplierPricing.$inferInsert;

/**
 * Fraud Patterns - Learning database for fraud detection
 */
export const fraudPatterns = mysqlTable("fraudPatterns", {
  id: int("id").autoincrement().primaryKey(),
  pattern: text("pattern").notNull(), // Keyword or phrase pattern
  patternType: varchar("patternType", { length: 50 }).notNull(), // keyword, regex, semantic
  category: varchar("category", { length: 100 }).notNull(), // waived_deductible, storm_chaser, etc.
  riskWeight: int("riskWeight").default(10).notNull(), // Contribution to fraud score
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  matchCount: int("matchCount").default(0).notNull(), // How many times it's been triggered
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FraudPattern = typeof fraudPatterns.$inferSelect;
export type InsertFraudPattern = typeof fraudPatterns.$inferInsert;

/**
 * Agent Performance Metrics - Track agent accuracy and performance
 */
export const agentMetrics = mysqlTable("agentMetrics", {
  id: int("id").autoincrement().primaryKey(),
  agentName: varchar("agentName", { length: 100 }).notNull(),
  metricDate: timestamp("metricDate").defaultNow().notNull(),
  tasksCompleted: int("tasksCompleted").default(0).notNull(),
  tasksFailed: int("tasksFailed").default(0).notNull(),
  avgExecutionTimeMs: int("avgExecutionTimeMs"),
  accuracyScore: int("accuracyScore"), // 0-100 based on manual review feedback
  totalCostCents: int("totalCostCents").default(0).notNull(), // API costs
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AgentMetric = typeof agentMetrics.$inferSelect;
export type InsertAgentMetric = typeof agentMetrics.$inferInsert;

/**
 * Phone Calls - Track all incoming/outgoing calls via Twilio
 */
export const phoneCalls = mysqlTable("phoneCalls", {
  id: int("id").autoincrement().primaryKey(),
  twilioCallSid: varchar("twilioCallSid", { length: 100 }).unique(),
  callerId: varchar("callerId", { length: 20 }).notNull(), // Phone number
  callerName: varchar("callerName", { length: 255 }),
  direction: mysqlEnum("direction", ["inbound", "outbound"]).notNull(),
  status: mysqlEnum("status", ["queued", "ringing", "in-progress", "completed", "busy", "failed", "no-answer"]).default("queued").notNull(),
  duration: int("duration"), // in seconds
  recordingUrl: text("recordingUrl"),
  transcription: text("transcription"),
  aiSummary: text("aiSummary"), // AI-generated call summary
  sentiment: mysqlEnum("sentiment", ["positive", "neutral", "negative"]),
  callType: varchar("callType", { length: 50 }), // emergency, quote_request, general_inquiry, complaint
  routedTo: varchar("routedTo", { length: 100 }), // Which agent/department
  leadCreated: boolean("leadCreated").default(false).notNull(),
  leadId: int("leadId"), // Reference to leads table
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PhoneCall = typeof phoneCalls.$inferSelect;
export type InsertPhoneCall = typeof phoneCalls.$inferInsert;

/**
 * Voicemails - Store voicemail recordings and transcriptions
 */
export const voicemails = mysqlTable("voicemails", {
  id: int("id").autoincrement().primaryKey(),
  phoneCallId: int("phoneCallId"), // Reference to phoneCalls table
  callerId: varchar("callerId", { length: 20 }).notNull(),
  callerName: varchar("callerName", { length: 255 }),
  recordingUrl: text("recordingUrl").notNull(),
  transcription: text("transcription"),
  aiSummary: text("aiSummary"), // AI-generated summary
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  sentiment: mysqlEnum("sentiment", ["positive", "neutral", "negative"]),
  isRead: boolean("isRead").default(false).notNull(),
  respondedAt: timestamp("respondedAt"),
  respondedBy: int("respondedBy"), // User ID who responded
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Voicemail = typeof voicemails.$inferSelect;
export type InsertVoicemail = typeof voicemails.$inferInsert;

/**
 * Automation Workflows - Track Make.com and custom workflow executions
 */
export const automationWorkflows = mysqlTable("automationWorkflows", {
  id: int("id").autoincrement().primaryKey(),
  workflowName: varchar("workflowName", { length: 255 }).notNull(),
  workflowType: varchar("workflowType", { length: 100 }).notNull(), // make_com, custom, scheduled
  triggerType: varchar("triggerType", { length: 100 }).notNull(), // phone_call, email, claim_upload, manual
  triggerData: text("triggerData"), // JSON data that triggered the workflow
  status: mysqlEnum("status", ["pending", "running", "completed", "failed"]).default("pending").notNull(),
  executionTimeMs: int("executionTimeMs"),
  errorMessage: text("errorMessage"),
  resultData: text("resultData"), // JSON result from workflow
  makeScenarioId: varchar("makeScenarioId", { length: 100 }), // Make.com scenario ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type AutomationWorkflow = typeof automationWorkflows.$inferSelect;
export type InsertAutomationWorkflow = typeof automationWorkflows.$inferInsert;

/**
 * Email Inbox - AI-categorized email management
 */
export const emailInbox = mysqlTable("emailInbox", {
  id: int("id").autoincrement().primaryKey(),
  messageId: varchar("messageId", { length: 255 }).unique(),
  from: varchar("from", { length: 255 }).notNull(),
  to: varchar("to", { length: 255 }).notNull(),
  subject: text("subject"),
  body: text("body"),
  category: mysqlEnum("category", ["quote_request", "complaint", "general_inquiry", "spam", "urgent"]),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  sentiment: mysqlEnum("sentiment", ["positive", "neutral", "negative"]),
  aiSuggestion: text("aiSuggestion"), // AI-suggested response
  isRead: boolean("isRead").default(false).notNull(),
  respondedAt: timestamp("respondedAt"),
  respondedBy: int("respondedBy"), // User ID who responded
  leadCreated: boolean("leadCreated").default(false).notNull(),
  leadId: int("leadId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmailInbox = typeof emailInbox.$inferSelect;
export type InsertEmailInbox = typeof emailInbox.$inferInsert;


/**
 * Automation Events - Event-driven automation system
 */
export const automationEvents = mysqlTable("automationEvents", {
  id: int("id").autoincrement().primaryKey(),
  eventType: varchar("eventType", { length: 100 }).notNull(), // incoming_call, new_email, voicemail, form_submission, storm_alert
  triggerSource: varchar("triggerSource", { length: 255 }).notNull(), // twilio, gmail, weather_api, website_form
  payload: text("payload").notNull(), // JSON data from trigger
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  actionsTriggered: text("actionsTriggered"), // JSON array of actions executed
  errorMessage: text("errorMessage"),
  processingTimeMs: int("processingTimeMs"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  processedAt: timestamp("processedAt"),
});

export type AutomationEvent = typeof automationEvents.$inferSelect;
export type InsertAutomationEvent = typeof automationEvents.$inferInsert;

/**
 * Blogs - Auto-generated and manual blog posts
 */
export const blogs = mysqlTable("blogs", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  slug: varchar("slug", { length: 500 }).notNull().unique(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  seoKeywords: text("seoKeywords"), // Comma-separated keywords
  metaDescription: text("metaDescription"),
  featuredImage: varchar("featuredImage", { length: 500 }),
  category: varchar("category", { length: 100 }),
  tags: text("tags"), // Comma-separated tags
  status: mysqlEnum("status", ["draft", "scheduled", "published", "archived"]).default("draft").notNull(),
  aiGenerated: boolean("aiGenerated").default(false).notNull(),
  generationPrompt: text("generationPrompt"), // Prompt used to generate content
  publishDate: timestamp("publishDate"),
  authorId: int("authorId"), // User ID or AI
  viewCount: int("viewCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Blog = typeof blogs.$inferSelect;
export type InsertBlog = typeof blogs.$inferInsert;

/**
 * Chatbot Conversations - Track all chatbot interactions
 */
export const chatbotConversations = mysqlTable("chatbotConversations", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 255 }).notNull(),
  userId: int("userId"), // Null if anonymous
  messages: text("messages").notNull(), // JSON array of messages
  resolved: boolean("resolved").default(false).notNull(),
  escalatedToHuman: boolean("escalatedToHuman").default(false).notNull(),
  escalatedAt: timestamp("escalatedAt"),
  feedback: mysqlEnum("feedback", ["positive", "negative", "neutral"]),
  feedbackComment: text("feedbackComment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChatbotConversation = typeof chatbotConversations.$inferSelect;
export type InsertChatbotConversation = typeof chatbotConversations.$inferInsert;

/**
 * Chatbot Knowledge Base - Semantic memory for continuous learning
 */
export const chatbotKnowledgeBase = mysqlTable("chatbotKnowledgeBase", {
  id: int("id").autoincrement().primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: varchar("category", { length: 100 }),
  confidence: int("confidence").default(0).notNull(), // 0-100 confidence score
  usageCount: int("usageCount").default(0).notNull(),
  successRate: int("successRate").default(0).notNull(), // Percentage of positive feedback
  source: varchar("source", { length: 100 }).notNull(), // manual, learned, ai_generated
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChatbotKnowledge = typeof chatbotKnowledgeBase.$inferSelect;
export type InsertChatbotKnowledge = typeof chatbotKnowledgeBase.$inferInsert;

/**
 * Maintenance Tasks - Self-maintenance system scheduler
 */
export const maintenanceTasks = mysqlTable("maintenanceTasks", {
  id: int("id").autoincrement().primaryKey(),
  taskName: varchar("taskName", { length: 255 }).notNull().unique(),
  taskType: varchar("taskType", { length: 100 }).notNull(), // blog_generation, photo_indexing, backlink_check, seo_update, cleanup
  schedule: varchar("schedule", { length: 100 }).notNull(), // cron expression
  isActive: boolean("isActive").default(true).notNull(),
  lastRun: timestamp("lastRun"),
  nextRun: timestamp("nextRun"),
  lastStatus: mysqlEnum("lastStatus", ["success", "failed", "skipped"]),
  lastDurationMs: int("lastDurationMs"),
  lastErrorMessage: text("lastErrorMessage"),
  runCount: int("runCount").default(0).notNull(),
  successCount: int("successCount").default(0).notNull(),
  failureCount: int("failureCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MaintenanceTask = typeof maintenanceTasks.$inferSelect;
export type InsertMaintenanceTask = typeof maintenanceTasks.$inferInsert;


/**
 * Sovereign Audit Logs — Nimbus iQ AI
 * Tracks every audit run through the Sovereign Audit Terminal.
 * Each row = one Xactimate XML audit against IRC building codes.
 */
export const sovereignAuditLogs = mysqlTable("sovereignAuditLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // reference to users table (null for demo runs)
  propertyAddress: text("propertyAddress"),
  claimNumber: varchar("claimNumber", { length: 100 }),
  insuranceCarrier: varchar("insuranceCarrier", { length: 255 }),
  inputType: varchar("inputType", { length: 50 }).notNull(), // xml, pdf, manual
  totalLineItems: int("totalLineItems").default(0).notNull(),
  missingLineItems: int("missingLineItems").default(0).notNull(),
  codeViolations: int("codeViolations").default(0).notNull(),
  originalEstimate: int("originalEstimate").default(0).notNull(), // cents
  recoveryEstimate: int("recoveryEstimate").default(0).notNull(), // cents
  auditResult: text("auditResult"), // full JSON audit result
  reasoningTrace: text("reasoningTrace"), // JSON array of reasoning steps
  status: mysqlEnum("status", ["pending", "running", "completed", "failed"]).default("pending").notNull(),
  durationMs: int("durationMs"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SovereignAuditLog = typeof sovereignAuditLogs.$inferSelect;
export type InsertSovereignAuditLog = typeof sovereignAuditLogs.$inferInsert;
