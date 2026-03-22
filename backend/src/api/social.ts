/**
 * Social/Explore API endpoints
 * Curated content discovery and trending algorithms
 */

interface Env {
  DB: any;
  [key: string]: any;
}

interface User {
  id: string;
  email: string;
  [key: string]: any;
}

/**
 * GET /api/social/explore
 * Explore page with curated mix of trending and recent posts
 */
export async function getExplorePage(req: Request, env: Env, user: User) {
  try {
    const posts = await env.DB.prepare(
      `
      SELECT p.*,
        (
          (SELECT COUNT(*) FROM post_engagement WHERE post_id = p.id AND type = 'like') * 2 +
          (SELECT COUNT(*) FROM comments WHERE post_id = p.id) * 3
        ) AS score
      FROM posts p
      ORDER BY score DESC, p.created_at DESC
      LIMIT 100
      `,
    ).all();

    return new Response(JSON.stringify(posts.results || []), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Get explore page error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch explore page" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

/**
 * GET /api/social/posts/search
 * Search posts by hashtag or content
 */
export async function searchPosts(req: Request, env: Env, user: User) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("q") || "";

    if (query.length < 2) {
      return new Response(JSON.stringify({ error: "Query too short" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const posts = await env.DB.prepare(
      `
      SELECT p.*,
        (
          (SELECT COUNT(*) FROM post_engagement WHERE post_id = p.id AND type = 'like') * 2 +
          (SELECT COUNT(*) FROM comments WHERE post_id = p.id) * 3
        ) AS score
      FROM posts p
      WHERE p.content LIKE ? OR p.hashtags LIKE ?
      ORDER BY score DESC, p.created_at DESC
      LIMIT 50
      `,
    )
      .bind(`%${query}%`, `%${query}%`)
      .all();

    return new Response(JSON.stringify(posts.results || []), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Search posts error:", error);
    return new Response(JSON.stringify({ error: "Failed to search posts" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
