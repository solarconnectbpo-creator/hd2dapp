import { hashPassword, verifyPassword } from "../auth/password";
import { signAuthPayload, verifyAuthToken, type AuthUser } from "../auth/token";
import { isValidEmail, normalizeDisplayName } from "../auth/validation";
import { verifyGoogleIdToken } from "../auth/googleIdToken";
import {
  ensureDbUserFromEnvLogin,
  findUserByEmail,
  findUserByGoogleSub,
  findUserById,
  insertUser,
  rowToAuthUser,
  updateUserGoogleSub,
} from "../auth/userDb";
import { evaluateAccess } from "../auth/access";
import { isValidUsStateCode, normalizeState, type PlacementPref } from "../auth/orgDb";
import { sendSignupNotification } from "./signupNotify";

export type AuthEnv = {
  DB: any;
  SESSION_SECRET?: string;
  AUTH_ADMIN_EMAIL?: string;
  AUTH_ADMIN_PASSWORD?: string;
  /** Display name for the env-based admin user (default "Admin"). */
  AUTH_ADMIN_NAME?: string;
  AUTH_COMPANY_EMAIL?: string;
  AUTH_COMPANY_PASSWORD?: string;
  AUTH_REP_EMAIL?: string;
  AUTH_REP_PASSWORD?: string;
  /** When "false", POST /api/auth/register is disabled. Defaults to enabled. */
  AUTH_SIGNUP_ENABLED?: string;
  /**
   * When "true", allow login via Worker AUTH_* email/password slots (demo/admin/company/rep).
   * Defaults to off so production is not open to baked-in or misconfigured demo passwords.
   */
  AUTH_ENV_LOGIN_ENABLED?: string;
  /**
   * When "true", GET /api/auth/me returns 401 if the user id is not found in D1 (removed accounts).
   * D1 query errors return 503 so clients can retry instead of forcing logout.
   */
  AUTH_REQUIRE_DB_USER_FOR_ME?: string;
  /**
   * When "true", skip approval + paid-membership gating (local dev / break-glass).
   * Production should leave unset so company/rep need admin approval + active billing.
   */
  AUTH_SKIP_ACCESS_GATE?: string;
  /** Resend API key — when set, new sign-ups trigger an email to SIGNUP_NOTIFY_TO. */
  RESEND_API_KEY?: string;
  /** Recipient for sign-up alerts (default admin@hardcoredoortodoorclosers.com). */
  SIGNUP_NOTIFY_TO?: string;
  /** Verified Resend sender, e.g. HD2D <noreply@hardcoredoortodoorclosers.com> */
  RESEND_FROM?: string;
  /** Google OAuth Web client id (same as Vite `VITE_GOOGLE_CLIENT_ID`) — verifies ID token `aud`. */
  GOOGLE_CLIENT_ID?: string;
};

function jsonHeaders(cors: Record<string, string>) {
  return { ...cors, "Content-Type": "application/json" };
}

function getSecret(env: AuthEnv): string {
  return (env.SESSION_SECRET || "dev-session-secret-change-me").trim();
}

/** Match Worker `AUTH_*` passwords; case-insensitive so mobile/caps-lock typos still work. D1 users stay case-sensitive via verifyPassword. */
function staticEnvPasswordMatches(stored: string, input: string): boolean {
  if (stored === input) return true;
  return stored.length > 0 && stored.toLowerCase() === input.toLowerCase();
}

function isEnvLoginEnabled(env: AuthEnv): boolean {
  return (env.AUTH_ENV_LOGIN_ENABLED || "").trim().toLowerCase() === "true";
}

/** Only used when AUTH_ENV_LOGIN_ENABLED=true (local/dev). Defaults match former baked-in demo accounts. */
function staticEnvUsers(env: AuthEnv): Array<{ user: AuthUser; password: string }> {
  const adminName = (env.AUTH_ADMIN_NAME || "Admin").trim() || "Admin";
  const adminEmail = (env.AUTH_ADMIN_EMAIL || "admin@hardcoredoortodoorclosers.com").trim();
  const adminPassword = (env.AUTH_ADMIN_PASSWORD || "AdminTest123!").trim();
  const companyEmail = (env.AUTH_COMPANY_EMAIL || "test.company@hardcoredoortodoorclosers.com").trim();
  const companyPassword = (env.AUTH_COMPANY_PASSWORD || "TestCompany123!").trim();
  const repEmail = (env.AUTH_REP_EMAIL || "test.rep@hardcoredoortodoorclosers.com").trim();
  const repPassword = (env.AUTH_REP_PASSWORD || "TestRep123!").trim();
  return [
    {
      user: { id: "admin-1", email: adminEmail, name: adminName, user_type: "admin" },
      password: adminPassword,
    },
    {
      user: { id: "company-1", email: companyEmail, name: "Test Company", user_type: "company" },
      password: companyPassword,
    },
    {
      user: { id: "rep-1", email: repEmail, name: "Test Rep", user_type: "sales_rep" },
      password: repPassword,
    },
  ];
}

async function issueToken(env: AuthEnv, user: AuthUser): Promise<{ token: string; expiresAt: number }> {
  const expMs = Date.now() + 1000 * 60 * 60 * 12;
  const token = await signAuthPayload(
    {
      sub: user.id,
      email: user.email,
      user_type: user.user_type,
      exp: expMs,
    },
    getSecret(env),
  );
  return { token, expiresAt: expMs };
}

export async function getBearerPayload(request: Request, env: AuthEnv) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return null;
  return verifyAuthToken(token, getSecret(env));
}

export async function handleAuthRequest(
  request: Request,
  env: AuthEnv,
  path: string,
  corsHeaders: Record<string, string>,
  ctx?: ExecutionContext,
): Promise<Response> {
  const j = jsonHeaders(corsHeaders);
  /** Ignore trailing slashes so `/api/auth/login/` matches. */
  const p = path.replace(/\/+$/, "") || "/";
  try {
  if (p === "/api/auth/login" && request.method === "POST") {
    let body: { email?: string; password?: string } = {};
    try {
      body = (await request.json()) as { email?: string; password?: string };
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Invalid JSON body.", error_code: "INVALID_JSON" }), {
        status: 400,
        headers: j,
      });
    }
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    if (!email || !password) {
      return new Response(
        JSON.stringify({ success: false, error: "Email and password are required.", error_code: "MISSING_FIELDS" }),
        {
          status: 400,
          headers: j,
        },
      );
    }
    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ success: false, error: "Enter a valid email address.", error_code: "INVALID_EMAIL" }), {
        status: 400,
        headers: j,
      });
    }
    // Optional AUTH_* env users (dev only unless explicitly enabled in production).
    const matched = isEnvLoginEnabled(env)
      ? staticEnvUsers(env).find(
          (u) => u.user.email.toLowerCase() === email && staticEnvPasswordMatches(u.password, password),
        )
      : undefined;
    if (matched) {
      try {
        await ensureDbUserFromEnvLogin(env.DB, matched.user, password);
      } catch (e) {
        console.error("ensureDbUserFromEnvLogin:", e);
      }
      let envRow: Awaited<ReturnType<typeof findUserById>> = null;
      try {
        envRow = await findUserById(env.DB, matched.user.id);
      } catch {
        envRow = null;
      }
      const access = evaluateAccess(env, matched.user.user_type, envRow);
      let token: string;
      let expiresAt: number;
      try {
        const issued = await issueToken(env, matched.user);
        token = issued.token;
        expiresAt = issued.expiresAt;
      } catch (e) {
        console.error("login issueToken (env user):", e);
        const detail = e instanceof Error ? e.message : String(e);
        return new Response(
          JSON.stringify({ success: false, error: "Could not create session.", detail }),
          { status: 500, headers: j },
        );
      }
      return new Response(JSON.stringify({ success: true, token, user: matched.user, expiresAt, access }), {
        status: 200,
        headers: j,
      });
    }
    let dbUser: Awaited<ReturnType<typeof findUserByEmail>> = null;
    try {
      dbUser = await findUserByEmail(env.DB, email);
    } catch (e) {
      console.error("login findUserByEmail:", e);
      const detail = e instanceof Error ? e.message : String(e);
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Could not look up user. Run `npm run d1:migrate:remote` once from the backend folder if D1 is new.",
          detail,
          error_code: "DB_UNAVAILABLE",
        }),
        { status: 503, headers: j },
      );
    }
    if (dbUser) {
      let ok = false;
      try {
        ok = await verifyPassword(password, dbUser.salt, dbUser.password_hash);
      } catch (e) {
        console.error("login verifyPassword:", e);
        return new Response(
          JSON.stringify({ success: false, error: "Invalid credentials.", error_code: "INVALID_CREDENTIALS" }),
          {
            status: 401,
            headers: j,
          },
        );
      }
      if (!ok) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid credentials.", error_code: "INVALID_CREDENTIALS" }),
          {
            status: 401,
            headers: j,
          },
        );
      }
      const user = rowToAuthUser(dbUser);
      const access = evaluateAccess(env, user.user_type, dbUser);
      let token: string;
      let expiresAt: number;
      try {
        const issued = await issueToken(env, user);
        token = issued.token;
        expiresAt = issued.expiresAt;
      } catch (e) {
        console.error("login issueToken (db user):", e);
        const detail = e instanceof Error ? e.message : String(e);
        return new Response(
          JSON.stringify({ success: false, error: "Could not create session.", detail }),
          { status: 500, headers: j },
        );
      }
      return new Response(JSON.stringify({ success: true, token, user, expiresAt, access }), { status: 200, headers: j });
    }
    return new Response(JSON.stringify({ success: false, error: "Invalid credentials.", error_code: "INVALID_CREDENTIALS" }), {
      status: 401,
      headers: j,
    });
  }

  if (p === "/api/auth/google" && request.method === "POST") {
    const clientId = (env.GOOGLE_CLIENT_ID || "").trim();
    if (!clientId) {
      return new Response(
        JSON.stringify({ success: false, error: "Google sign-in is not configured.", error_code: "GOOGLE_AUTH_DISABLED" }),
        { status: 501, headers: j },
      );
    }
    type GoogleBody = {
      credential?: string;
      intent?: string;
      accountType?: string;
      name?: string;
      companyName?: string;
      homeState?: string;
      placementPref?: string;
    };
    let body: GoogleBody = {};
    try {
      body = (await request.json()) as GoogleBody;
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Invalid JSON body.", error_code: "INVALID_JSON" }), {
        status: 400,
        headers: j,
      });
    }
    const credential = (body.credential || "").trim();
    if (!credential) {
      return new Response(
        JSON.stringify({ success: false, error: "Google credential is required.", error_code: "MISSING_CREDENTIAL" }),
        { status: 400, headers: j },
      );
    }
    let google: NonNullable<Awaited<ReturnType<typeof verifyGoogleIdToken>>>;
    try {
      const v = await verifyGoogleIdToken(credential, clientId);
      if (!v || !v.email_verified) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Google could not verify this email. Use a verified Google account.",
            error_code: "GOOGLE_TOKEN_INVALID",
          }),
          { status: 401, headers: j },
        );
      }
      google = v;
    } catch (e) {
      console.error("verifyGoogleIdToken:", e);
      return new Response(
        JSON.stringify({ success: false, error: "Google sign-in verification failed.", error_code: "GOOGLE_JWKS_ERROR" }),
        { status: 503, headers: j },
      );
    }
    const email = google.email;
    const intent = (body.intent || "login").trim().toLowerCase();

    async function finishGoogleSession(row: NonNullable<Awaited<ReturnType<typeof findUserByEmail>>>) {
      const user = rowToAuthUser(row);
      const access = evaluateAccess(env, user.user_type, row);
      const issued = await issueToken(env, user);
      return new Response(
        JSON.stringify({ success: true, token: issued.token, user, expiresAt: issued.expiresAt, access }),
        { status: 200, headers: j },
      );
    }

    if (intent === "login") {
      let bySub: Awaited<ReturnType<typeof findUserByGoogleSub>> = null;
      let byEmail: Awaited<ReturnType<typeof findUserByEmail>> = null;
      try {
        bySub = await findUserByGoogleSub(env.DB, google.sub);
        if (!bySub) byEmail = await findUserByEmail(env.DB, email);
      } catch (e) {
        console.error("google login lookup:", e);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Could not look up user. Try again shortly.",
            error_code: "DB_UNAVAILABLE",
          }),
          { status: 503, headers: j },
        );
      }
      if (bySub) {
        if (bySub.email.toLowerCase() !== email) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Google account does not match this profile.",
              error_code: "GOOGLE_EMAIL_MISMATCH",
            }),
            { status: 403, headers: j },
          );
        }
        return await finishGoogleSession(bySub);
      }
      if (byEmail) {
        const existingSub = (byEmail.google_sub || "").trim();
        if (existingSub && existingSub !== google.sub) {
          return new Response(
            JSON.stringify({
              success: false,
              error:
                "This email is linked to a different Google account. Sign in with that Google account or use email and password.",
              error_code: "GOOGLE_ACCOUNT_CONFLICT",
            }),
            { status: 403, headers: j },
          );
        }
        if (!existingSub) {
          try {
            await updateUserGoogleSub(env.DB, byEmail.id, google.sub);
            byEmail = (await findUserByEmail(env.DB, email)) || byEmail;
          } catch (e) {
            console.error("updateUserGoogleSub:", e);
            return new Response(JSON.stringify({ success: false, error: "Could not link Google account.", error_code: "DB_ERROR" }), {
              status: 500,
              headers: j,
            });
          }
        }
        return await finishGoogleSession(byEmail);
      }
      return new Response(
        JSON.stringify({
          success: false,
          error: "No account for this Google email yet. Create an account first, then you can use Google next time.",
          error_code: "GOOGLE_ACCOUNT_NOT_FOUND",
        }),
        { status: 404, headers: j },
      );
    }

    if (intent === "register") {
      const signupOff = (env.AUTH_SIGNUP_ENABLED || "").trim().toLowerCase() === "false";
      if (signupOff) {
        return new Response(
          JSON.stringify({ success: false, error: "Self-service sign up is disabled.", error_code: "SIGNUP_DISABLED" }),
          { status: 403, headers: j },
        );
      }
      let existingSubUser: Awaited<ReturnType<typeof findUserByGoogleSub>> = null;
      let existingEmail: Awaited<ReturnType<typeof findUserByEmail>> = null;
      try {
        existingSubUser = await findUserByGoogleSub(env.DB, google.sub);
        existingEmail = await findUserByEmail(env.DB, email);
      } catch (e) {
        console.error("google register lookup:", e);
        return new Response(
          JSON.stringify({ success: false, error: "Could not verify registration state.", error_code: "DB_UNAVAILABLE" }),
          { status: 503, headers: j },
        );
      }
      if (existingSubUser || existingEmail) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "An account with this email (or Google profile) already exists. Sign in instead.",
            error_code: "EMAIL_TAKEN",
          }),
          { status: 409, headers: j },
        );
      }
      const accountType = (body.accountType || "rep").trim().toLowerCase();
      const isCompany = accountType === "company";
      const nameRaw = normalizeDisplayName(body.name || google.name);
      const displayName = nameRaw || email.split("@")[0];
      const companyNameTrim = (body.companyName || "").trim();
      if (isCompany && companyNameTrim.length < 2) {
        return new Response(JSON.stringify({ success: false, error: "Company name is required (at least 2 characters)." }), {
          status: 400,
          headers: j,
        });
      }
      let homeState = normalizeState(body.homeState || "");
      let placementPref: PlacementPref = "either";
      if (!isCompany) {
        const pp = (body.placementPref || "either").trim().toLowerCase();
        if (pp === "local" || pp === "storm" || pp === "either") placementPref = pp;
        else {
          return new Response(JSON.stringify({ success: false, error: "placementPref must be local, storm, or either." }), {
            status: 400,
            headers: j,
          });
        }
        if (!isValidUsStateCode(homeState)) {
          return new Response(JSON.stringify({ success: false, error: "Select a valid 2-letter US home state." }), {
            status: 400,
            headers: j,
          });
        }
      }
      const id = crypto.randomUUID();
      const t = Math.floor(Date.now() / 1000);
      let saltHex: string;
      let hashHex: string;
      try {
        const randomPw =
          typeof crypto.randomUUID === "function"
            ? `${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "")}`
            : `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}${Date.now()}`;
        const h = await hashPassword(randomPw);
        saltHex = h.saltHex;
        hashHex = h.hashHex;
      } catch (e) {
        console.error("hashPassword google register:", e);
        return new Response(JSON.stringify({ success: false, error: "Could not create account." }), { status: 500, headers: j });
      }
      try {
        if (isCompany) {
          const orgId = crypto.randomUUID();
          await env.DB.batch([
            env.DB
              .prepare(
                `INSERT INTO users (id, email, password_hash, salt, name, user_type, approval_status, billing_status, created_at, updated_at, google_sub)
                 VALUES (?, ?, ?, ?, ?, 'company', 'pending', 'unpaid', ?, ?, ?)`,
              )
              .bind(id, email, hashHex, saltHex, displayName, t, t, google.sub),
            env.DB
              .prepare(
                `INSERT INTO organizations (id, name, service_states, org_kind, created_at, updated_at)
                 VALUES (?, ?, '[]', 'local', ?, ?)`,
              )
              .bind(orgId, companyNameTrim, t, t),
            env.DB
              .prepare(`INSERT INTO org_members (org_id, user_id, role, created_at) VALUES (?, ?, 'owner', ?)`)
              .bind(orgId, id, t),
          ]);
        } else {
          await env.DB.batch([
            env.DB
              .prepare(
                `INSERT INTO users (id, email, password_hash, salt, name, user_type, approval_status, billing_status, created_at, updated_at, google_sub)
                 VALUES (?, ?, ?, ?, ?, 'sales_rep', 'pending', 'unpaid', ?, ?, ?)`,
              )
              .bind(id, email, hashHex, saltHex, displayName, t, t, google.sub),
            env.DB
              .prepare(
                `INSERT INTO rep_profiles (user_id, home_state, placement_pref, status, matched_org_id, created_at, updated_at)
                 VALUES (?, ?, ?, 'pending', NULL, ?, ?)`,
              )
              .bind(id, homeState, placementPref, t, t),
          ]);
        }
      } catch (e) {
        console.error("google register batch:", e);
        const detail = e instanceof Error ? e.message : String(e);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Could not create account. If this persists, ensure D1 migrations are applied (google_sub column).",
            detail,
          }),
          { status: 500, headers: j },
        );
      }
      const user: AuthUser = {
        id,
        email,
        name: displayName,
        user_type: isCompany ? "company" : "sales_rep",
      };
      let regRow: Awaited<ReturnType<typeof findUserById>> = null;
      try {
        regRow = await findUserById(env.DB, id);
      } catch {
        regRow = null;
      }
      const access = evaluateAccess(env, user.user_type, regRow);
      const { token, expiresAt } = await issueToken(env, user);
      const notify = sendSignupNotification(env, {
        newUserEmail: email,
        name: displayName,
        userType: isCompany ? "company" : "sales_rep",
        companyName: isCompany ? companyNameTrim : undefined,
        homeState: isCompany ? undefined : homeState,
      });
      if (ctx) {
        ctx.waitUntil(notify.catch((e) => console.error("[signup-notify]", e)));
      } else {
        void notify.catch((e) => console.error("[signup-notify]", e));
      }
      return new Response(JSON.stringify({ success: true, token, user, expiresAt, access }), { status: 201, headers: j });
    }

    return new Response(
      JSON.stringify({ success: false, error: 'intent must be "login" or "register".', error_code: "INVALID_INTENT" }),
      { status: 400, headers: j },
    );
  }

  if (p === "/api/auth/register" && request.method === "POST") {
    const signupOff = (env.AUTH_SIGNUP_ENABLED || "").trim().toLowerCase() === "false";
    if (signupOff) {
      return new Response(
        JSON.stringify({ success: false, error: "Self-service sign up is disabled.", error_code: "SIGNUP_DISABLED" }),
        {
          status: 403,
          headers: j,
        },
      );
    }
    let body: {
      email?: string;
      password?: string;
      name?: string;
      /** "company" | "rep" — default rep (field sales) for backward compatibility. */
      accountType?: string;
      companyName?: string;
      homeState?: string;
      placementPref?: string;
    } = {};
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Invalid JSON body.", error_code: "INVALID_JSON" }), {
        status: 400,
        headers: j,
      });
    }
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const nameRaw = normalizeDisplayName(body.name || "");
    const accountType = (body.accountType || "rep").trim().toLowerCase();
    const isCompany = accountType === "company";
    if (!email || !password) {
      return new Response(
        JSON.stringify({ success: false, error: "Email and password are required.", error_code: "MISSING_FIELDS" }),
        {
          status: 400,
          headers: j,
        },
      );
    }
    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ success: false, error: "Enter a valid email address.", error_code: "INVALID_EMAIL" }), {
        status: 400,
        headers: j,
      });
    }
    if (password.length < 8) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Password must be at least 8 characters.",
          error_code: "PASSWORD_TOO_SHORT",
        }),
        {
          status: 400,
          headers: j,
        },
      );
    }
    if (password.length > 256) {
      return new Response(
        JSON.stringify({ success: false, error: "Password is too long.", error_code: "PASSWORD_TOO_LONG" }),
        {
          status: 400,
          headers: j,
        },
      );
    }
    if (await findUserByEmail(env.DB, email)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "An account with this email already exists.",
          error_code: "EMAIL_TAKEN",
        }),
        {
          status: 409,
          headers: j,
        },
      );
    }
    const displayName = nameRaw || email.split("@")[0];
    const id = crypto.randomUUID();
    const companyNameTrim = (body.companyName || "").trim();
    if (isCompany && companyNameTrim.length < 2) {
      return new Response(JSON.stringify({ success: false, error: "Company name is required (at least 2 characters)." }), {
        status: 400,
        headers: j,
      });
    }
    let homeState = normalizeState(body.homeState || "");
    let placementPref: PlacementPref = "either";
    if (!isCompany) {
      const pp = (body.placementPref || "either").trim().toLowerCase();
      if (pp === "local" || pp === "storm" || pp === "either") placementPref = pp;
      else {
        return new Response(JSON.stringify({ success: false, error: "placementPref must be local, storm, or either." }), {
          status: 400,
          headers: j,
        });
      }
      if (!isValidUsStateCode(homeState)) {
        return new Response(JSON.stringify({ success: false, error: "Select a valid 2-letter US home state." }), {
          status: 400,
          headers: j,
        });
      }
    }

    const t = Math.floor(Date.now() / 1000);
    let saltHex: string;
    let hashHex: string;
    try {
      const h = await hashPassword(password);
      saltHex = h.saltHex;
      hashHex = h.hashHex;
    } catch (e) {
      console.error("hashPassword register:", e);
      return new Response(JSON.stringify({ success: false, error: "Could not create account." }), { status: 500, headers: j });
    }

    try {
      if (isCompany) {
        const orgId = crypto.randomUUID();
        await env.DB.batch([
          env.DB
            .prepare(
              `INSERT INTO users (id, email, password_hash, salt, name, user_type, approval_status, billing_status, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, 'company', 'pending', 'unpaid', ?, ?)`,
            )
            .bind(id, email, hashHex, saltHex, displayName, t, t),
          env.DB
            .prepare(
              `INSERT INTO organizations (id, name, service_states, org_kind, created_at, updated_at)
               VALUES (?, ?, '[]', 'local', ?, ?)`,
            )
            .bind(orgId, companyNameTrim, t, t),
          env.DB
            .prepare(`INSERT INTO org_members (org_id, user_id, role, created_at) VALUES (?, ?, 'owner', ?)`)
            .bind(orgId, id, t),
        ]);
      } else {
        await env.DB.batch([
          env.DB
            .prepare(
              `INSERT INTO users (id, email, password_hash, salt, name, user_type, approval_status, billing_status, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, 'sales_rep', 'pending', 'unpaid', ?, ?)`,
            )
            .bind(id, email, hashHex, saltHex, displayName, t, t),
          env.DB
            .prepare(
              `INSERT INTO rep_profiles (user_id, home_state, placement_pref, status, matched_org_id, created_at, updated_at)
               VALUES (?, ?, ?, 'pending', NULL, ?, ?)`,
            )
            .bind(id, homeState, placementPref, t, t),
        ]);
      }
    } catch (e) {
      console.error("register batch:", e);
      const detail = e instanceof Error ? e.message : String(e);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Could not create account. If this persists, ensure D1 migrations are applied (orgs/rep_profiles tables).",
          detail,
        }),
        { status: 500, headers: j },
      );
    }

    const user: AuthUser = {
      id,
      email,
      name: displayName,
      user_type: isCompany ? "company" : "sales_rep",
    };
    let regRow: Awaited<ReturnType<typeof findUserById>> = null;
    try {
      regRow = await findUserById(env.DB, id);
    } catch {
      regRow = null;
    }
    const access = evaluateAccess(env, user.user_type, regRow);
    const { token, expiresAt } = await issueToken(env, user);

    const notify = sendSignupNotification(env, {
      newUserEmail: email,
      name: displayName,
      userType: isCompany ? "company" : "sales_rep",
      companyName: isCompany ? companyNameTrim : undefined,
      homeState: isCompany ? undefined : homeState,
    });
    if (ctx) {
      ctx.waitUntil(notify.catch((e) => console.error("[signup-notify]", e)));
    } else {
      void notify.catch((e) => console.error("[signup-notify]", e));
    }

    return new Response(JSON.stringify({ success: true, token, user, expiresAt, access }), { status: 201, headers: j });
  }

  if (p === "/api/auth/me" && request.method === "GET") {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!token) {
      return new Response(JSON.stringify({ success: false, error: "Missing bearer token.", error_code: "MISSING_BEARER" }), {
        status: 401,
        headers: j,
      });
    }
    const payload = await verifyAuthToken(token, getSecret(env));
    if (!payload) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired session.", error_code: "SESSION_EXPIRED" }),
        {
          status: 401,
          headers: j,
        },
      );
    }
    let row: Awaited<ReturnType<typeof findUserById>> = null;
    let meDbError = false;
    try {
      row = await findUserById(env.DB, payload.sub);
    } catch (e) {
      console.error("me findUserById:", e);
      meDbError = true;
      row = null;
    }
    const requireDbUser = (env.AUTH_REQUIRE_DB_USER_FOR_ME || "").trim().toLowerCase() === "true";
    if (requireDbUser) {
      if (meDbError) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Could not verify account. Try again shortly.",
            error_code: "DB_UNAVAILABLE",
          }),
          { status: 503, headers: j },
        );
      }
      if (!row) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Account not found or no longer active. Sign in again.",
            error_code: "ACCOUNT_REMOVED",
          }),
          { status: 401, headers: j },
        );
      }
    }
    // Role comes from the signed JWT (matches login), not D1 — avoids downgrading admin after env login when DB row is stale.
    const user: AuthUser = row
      ? { id: row.id, email: row.email, name: row.name, user_type: payload.user_type }
      : {
          id: payload.sub,
          email: payload.email,
          name: payload.email.split("@")[0],
          user_type: payload.user_type,
        };
    const access = evaluateAccess(env, payload.user_type, row);
    return new Response(JSON.stringify({ success: true, user, access }), { status: 200, headers: j });
  }

  if (p === "/api/auth/logout" && request.method === "POST") {
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: j });
  }

  if (p === "/api/auth" && request.method === "GET") {
    return new Response(
      JSON.stringify({
        success: true,
        message: "HD2D auth API",
        endpoints: {
          login: "POST /api/auth/login  body: { email, password }",
          register: "POST /api/auth/register  body: { email, password, name }",
          me: "GET /api/auth/me  header: Authorization: Bearer <token>",
          logout: "POST /api/auth/logout",
        },
      }),
      { status: 200, headers: j },
    );
  }

  if (p === "/api/auth/login") {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Login requires POST with JSON body { email, password }.",
        receivedMethod: request.method,
      }),
      { status: 405, headers: { ...j, Allow: "POST, OPTIONS" } },
    );
  }
  if (p === "/api/auth/register") {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Registration requires POST with JSON body { email, password, name }.",
        receivedMethod: request.method,
      }),
      { status: 405, headers: { ...j, Allow: "POST, OPTIONS" } },
    );
  }
  if (p === "/api/auth/me") {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Session check requires GET with header Authorization: Bearer <token>.",
        receivedMethod: request.method,
      }),
      { status: 405, headers: { ...j, Allow: "GET, OPTIONS" } },
    );
  }
  if (p === "/api/auth/logout") {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Logout requires POST.",
        receivedMethod: request.method,
      }),
      { status: 405, headers: { ...j, Allow: "POST, OPTIONS" } },
    );
  }

  return new Response(
    JSON.stringify({
      success: false,
      error: "Unknown auth path.",
      path: p,
      method: request.method,
    }),
    { status: 404, headers: j },
  );
  } catch (e) {
    console.error("handleAuthRequest:", e);
    return new Response(
      JSON.stringify({
        success: false,
        error: e instanceof Error ? e.message : "Internal error",
      }),
      { status: 500, headers: j },
    );
  }
}

