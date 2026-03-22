/**
 * Comments API endpoints
 * Post comment management with engagement tracking
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
 * POST /api/comments/create
 * Create a new comment on a post
 */
export async function createComment(req: Request, env: Env, user: User) {
  try {
    const body = await req.json();
    const { postId, content } = body;

    if (!content || content.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Missing content" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!postId) {
      return new Response(JSON.stringify({ error: "Missing postId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const id = crypto.randomUUID();

    // Insert comment
    await env.DB.prepare(
      "INSERT INTO comments (id, post_id, user_id, content) VALUES (?, ?, ?, ?)",
    )
      .bind(id, postId, user.id, content)
      .run();

    return new Response(JSON.stringify({ success: true, id }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Create comment error:", error);
    return new Response(JSON.stringify({ error: "Failed to create comment" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * GET /api/comments/:postId
 * Get all comments for a specific post
 */
export async function getPostComments(
  req: Request,
  env: Env,
  user: User,
  postId: string,
) {
  try {
    const comments = await env.DB.prepare(
      `
      SELECT c.*, u.name AS user_name
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE post_id = ?
      ORDER BY datetime(c.created_at) ASC
      `,
    )
      .bind(postId)
      .all();

    return new Response(JSON.stringify(comments.results || []), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Get comments error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch comments" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
