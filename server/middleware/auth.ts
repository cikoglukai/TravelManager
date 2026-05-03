import type { H3Event } from "h3";
import { initializeApp, cert, getApps, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const PUBLIC_PATTERNS = [
  /^\/api\/trips\/all$/,
  /^\/api\/destinations(\/|$)/,
];

function isPublicRoute(path: string, method: string): boolean {
  // Likes count is public (GET only); POST/DELETE require auth
  if (/^\/api\/likes\/trip\/[^/]+$/.test(path) && method === 'GET') return true;
  return PUBLIC_PATTERNS.some((p) => p.test(path));
}

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
const isProd = process.env.NODE_ENV === "production";
const skipAuth = !isProd && process.env.SKIP_AUTH === "1";

let authClient: ReturnType<typeof getAuth> | null = null;

try {
  const app =
    getApps().length > 0
      ? getApps()[0]
      : serviceAccountJson && serviceAccountJson !== "{}" && serviceAccountJson !== ""
      ? initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) })
      : initializeApp({
          credential: applicationDefault(),
          projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID,
        }); // ADC fallback (gcloud auth / Cloud Run SA)
  authClient = getAuth(app);
} catch (e) {
  const msg = `[auth] Firebase Admin SDK Initialisierung fehlgeschlagen: ${e}`;
  if (isProd) throw new Error(msg);
  console.warn(msg);
}

export default defineEventHandler(async (event: H3Event) => {
  // event.path includes the query string ("/api/trips/all?q=paris"); strip it
  // before matching anchored regexes in PUBLIC_PATTERNS.
  const rawPath = event.path ?? "";
  const path = rawPath.split("?")[0];

  if (!path.startsWith("/api/")) return; // Nuxt page routes: always pass through
  if (isPublicRoute(path, event.method)) return;
  if (skipAuth) return;

  if (!authClient) return; // non-prod, no SDK, no SKIP_AUTH — skip silently

  // H3 v2 RC: getHeader() breaks on Node.js IncomingMessage headers (no .get() method).
  // event.node.req.headers is always a plain Node.js object — use it directly.
  const authHeader = event.node?.req?.headers?.["authorization"] as string | undefined;

  if (!authHeader?.startsWith("Bearer ")) {
    throw createError({ statusCode: 401, statusMessage: "Missing token" });
  }

  const token = authHeader.slice(7);

  try {
    const decoded = await authClient.verifyIdToken(token);
    event.context.user = decoded;
  } catch {
    throw createError({ statusCode: 401, statusMessage: "Invalid token" });
  }
});