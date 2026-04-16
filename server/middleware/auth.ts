import { defineEventHandler, getHeader, createError, H3Event } from "h3";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const app = initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!))
});

const authClient = getAuth(app);

export default defineEventHandler(async (event: H3Event) => {
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