import { defineEventHandler, getHeader, createError, H3Event } from "h3";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
const authClient = serviceAccount && serviceAccount !== "{}"
    ? getAuth(initializeApp({ credential: cert(JSON.parse(serviceAccount)) }))
    : null;

if (!authClient) {
    console.warn("[auth] FIREBASE_SERVICE_ACCOUNT is not set; skipping Firebase token verification");
}

export default defineEventHandler(async (event: H3Event) => {
    if (!authClient) return;

    const authHeader = getHeader(event, "authorization");

    if (!authHeader) {
        throw createError({ statusCode: 401, statusMessage: "Missing token" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = await authClient.verifyIdToken(token);
        event.context.user = decoded;
    } catch (e) {
        throw createError({ statusCode: 401, statusMessage: "Invalid token" });
    }
});
