/**
 * Posts API endpoints
 * Twitter/X-style posting engine with AI analysis and engagement tracking
 */

import { analyzePostContent } from "../ai/socialModel";

interface Env {
  DB: any;
  OPENAI_API_KEY: string;
  [key: string]: any;
}

interface User {
  id: string;
  email: string;
  [key: string]: any;
}

/**
 * POST /api/posts/create
 * Create a new post with AI content analysis
 */
export async function createPost(req: Request, env: Env, user: User) {
  try {
    const body = await req.json();
    const { content, mediaUrl } = body;

    if (!content || content.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Missing content" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const id = crypto.randomUUID();

    // AI analysis
    const ai = await analyzePostContent(env, content);
    const hashtags = ai.hashtags.join(",");

    // Insert post
    await env.DB.prepare(
      `INSERT INTO posts (id, user_id, content, media_url, hashtags)
       VALUES (?, ?, ?, ?, ?)`,
    )
      .bind(id, user.id, content, mediaUrl || "", hashtags)
      .run();

    return new Response(
      JSON.stringify({
        id,
        score: ai.score,
        hashtags: ai.hashtags,
        category: ai.category,
        notes: ai.notes,
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Create post error:", error);
    return new Response(JSON.stringify({ error: "Failed to create post" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * GET /api/posts/feed
 * Get personalized feed for authenticated user
 */
export async function getFeed(req: Request, env: Env, user: User) {
  try {
    const posts = await env.DB.prepare(
      `
      SELECT p.*,
        (SELECT COUNT(*) FROM post_engagement WHERE post_id = p.id AND type = 'like') AS likes,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments
      FROM posts p
      ORDER BY datetime(p.created_at) DESC
      LIMIT 50
      `,
    ).all();

    return new Response(JSON.stringify(posts.results || []), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Get feed error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch feed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * POST /api/posts/like
 * Like a post
 */
export async function likePost(req: Request, env: Env, user: User) {
  try {
    const body = await req.json();
    const { postId } = body;

    if (!postId) {
      return new Response(JSON.stringify({ error: "Missing postId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Insert engagement
    await env.DB.prepare(
      `INSERT INTO post_engagement (id, post_id, user_id, type)
       VALUES (?, ?, ?, 'like')`,
    )
      .bind(crypto.randomUUID(), postId, user.id)
      .run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Like post error:", error);
    return new Response(JSON.stringify({ error: "Failed to like post" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * GET /api/posts/trending
 * Get trending posts by engagement
 */
export async function getTrendingPosts(req: Request, env: Env, user: User) {
  try {
    const posts = await env.DB.prepare(
      `
      SELECT
        p.*,
        (
          (SELECT COUNT(*) FROM post_engagement WHERE post_id = p.id AND type = 'like') * 2 +
          (SELECT COUNT(*) FROM comments WHERE post_id = p.id) * 3
        ) AS score
      FROM posts p
      ORDER BY score DESC, p.created_at DESC
      LIMIT 25
      `,
    ).all();

    return new Response(JSON.stringify(posts.results || []), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Get trending posts error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch trending posts" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
