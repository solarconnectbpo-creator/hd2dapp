import { eq, desc, and, gte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, leads, projects, chatConversations, blogPosts, InsertBlogPost, BlogPost } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Blog post queries
export async function createBlogPost(post: InsertBlogPost) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(blogPosts).values(post);
  return result;
}

export async function getAllBlogPosts(limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  const posts = await db
    .select()
    .from(blogPosts)
    .orderBy(blogPosts.createdAt)
    .limit(limit)
    .offset(offset);

  return posts;
}

export async function getPublishedBlogPosts(limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  const posts = await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.isPublished, true))
    .orderBy(blogPosts.publishedAt)
    .limit(limit)
    .offset(offset);

  return posts;
}

export async function getBlogPostBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.slug, slug))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateBlogPost(id: number, updates: Partial<InsertBlogPost>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(blogPosts).set(updates).where(eq(blogPosts.id, id));
}

export async function deleteBlogPost(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(blogPosts).where(eq(blogPosts.id, id));
}

export async function incrementBlogPostViews(id: number) {
  const db = await getDb();
  if (!db) return;

  const post = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
  if (post.length > 0) {
    await db.update(blogPosts).set({ viewCount: (post[0].viewCount || 0) + 1 }).where(eq(blogPosts.id, id));
  }
}

// Admin dashboard queries
export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  // Total leads
  const totalLeadsResult = await db.select({ count: sql<number>`count(*)` }).from(leads);
  const totalLeads = totalLeadsResult[0]?.count || 0;

  // New leads this week
  const newLeadsThisWeekResult = await db.select({ count: sql<number>`count(*)` })
    .from(leads)
    .where(gte(leads.createdAt, startOfWeek));
  const newLeadsThisWeek = newLeadsThisWeekResult[0]?.count || 0;

  // Active projects
  const activeProjectsResult = await db.select({ count: sql<number>`count(*)` })
    .from(projects)
    .where(sql`${projects.status} IN ('quoted', 'approved', 'in_progress')`);
  const activeProjects = activeProjectsResult[0]?.count || 0;

  // Completed this month
  const completedThisMonthResult = await db.select({ count: sql<number>`count(*)` })
    .from(projects)
    .where(and(
      eq(projects.status, 'completed'),
      gte(projects.completionDate, startOfMonth)
    ));
  const completedThisMonth = completedThisMonthResult[0]?.count || 0;

  // Chat conversations
  const chatConversationsResult = await db.select({ count: sql<number>`count(*)` }).from(chatConversations);
  const chatConversationsCount = chatConversationsResult[0]?.count || 0;

  // Active chats
  const activeChatsResult = await db.select({ count: sql<number>`count(*)` })
    .from(chatConversations)
    .where(eq(chatConversations.status, 'active'));
  const activeChats = activeChatsResult[0]?.count || 0;

  // Revenue this month
  const revenueThisMonthResult = await db.select({ total: sql<number>`COALESCE(SUM(${projects.projectValue}), 0)` })
    .from(projects)
    .where(and(
      eq(projects.status, 'completed'),
      gte(projects.completionDate, startOfMonth)
    ));
  const revenueThisMonth = revenueThisMonthResult[0]?.total || 0;

  // Revenue last month
  const revenueLastMonthResult = await db.select({ total: sql<number>`COALESCE(SUM(${projects.projectValue}), 0)` })
    .from(projects)
    .where(and(
      eq(projects.status, 'completed'),
      gte(projects.completionDate, startOfLastMonth),
      sql`${projects.completionDate} <= ${endOfLastMonth}`
    ));
  const revenueLastMonth = revenueLastMonthResult[0]?.total || 0;

  const revenueGrowth = revenueLastMonth > 0 
    ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)
    : 0;

  return {
    totalLeads,
    newLeadsThisWeek,
    activeProjects,
    completedThisMonth,
    chatConversations: chatConversationsCount,
    activeChats,
    revenueThisMonth,
    revenueGrowth,
  };
}

export async function getRecentLeads(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(leads).orderBy(desc(leads.createdAt)).limit(limit);
}

// Weather Alert Database Functions
export async function getWeatherAlertHistory(limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  const { weatherAlerts } = await import("../drizzle/schema");
  const { desc } = await import("drizzle-orm");

  return await db
    .select()
    .from(weatherAlerts)
    .orderBy(desc(weatherAlerts.createdAt))
    .limit(limit);
}

export async function getAlertByNwsId(nwsId: string) {
  const db = await getDb();
  if (!db) return null;

  const { weatherAlerts } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");

  const results = await db
    .select()
    .from(weatherAlerts)
    .where(eq(weatherAlerts.nwsId, nwsId))
    .limit(1);

  return results.length > 0 ? results[0] : null;
}

// ============================================
// NOTIFICATION FUNCTIONS
// ============================================

/**
 * Create a new notification
 */
export async function createNotification(notification: any): Promise<any | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create notification: database not available");
    return null;
  }

  try {
    const { notifications } = await import("../drizzle/schema");
    const result = await db.insert(notifications).values(notification);
    const insertId = result[0].insertId;
    
    // Fetch and return the created notification
    const created = await db.select().from(notifications).where(eq(notifications.id, Number(insertId))).limit(1);
    return created.length > 0 ? created[0] : null;
  } catch (error) {
    console.error("[Database] Failed to create notification:", error);
    return null;
  }
}

/**
 * Get notifications for a specific user (or all users if userId is null)
 */
export async function getUserNotifications(userId: number | null, includeRead: boolean = false): Promise<any[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get notifications: database not available");
    return [];
  }

  try {
    const { notifications } = await import("../drizzle/schema");
    const { or, isNull } = await import("drizzle-orm");
    
    let query = db.select().from(notifications);
    
    // Filter by user (null = broadcast to all users)
    if (userId !== null) {
      query = query.where(
        or(
          eq(notifications.userId, userId),
          isNull(notifications.userId)
        )
      ) as any;
    } else {
      query = query.where(isNull(notifications.userId)) as any;
    }
    
    // Filter by read status
    if (!includeRead) {
      query = query.where(eq(notifications.isRead, false)) as any;
    }
    
    // Order by newest first
    const results = await query.orderBy(desc(notifications.createdAt));
    
    // Filter out expired notifications
    const now = new Date();
    return results.filter((n: any) => !n.expiresAt || new Date(n.expiresAt) > now);
  } catch (error) {
    console.error("[Database] Failed to get notifications:", error);
    return [];
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot mark notification as read: database not available");
    return false;
  }

  try {
    const { notifications } = await import("../drizzle/schema");
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notificationId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to mark notification as read:", error);
    return false;
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete notification: database not available");
    return false;
  }

  try {
    const { notifications } = await import("../drizzle/schema");
    await db.delete(notifications).where(eq(notifications.id, notificationId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete notification:", error);
    return false;
  }
}

/**
 * Get all notifications (admin view)
 */
export async function getAllNotifications(limit: number = 100, offset: number = 0): Promise<any[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get all notifications: database not available");
    return [];
  }

  try {
    const { notifications } = await import("../drizzle/schema");
    const results = await db.select()
      .from(notifications)
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);
    return results;
  } catch (error) {
    console.error("[Database] Failed to get all notifications:", error);
    return [];
  }
}
