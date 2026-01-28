import express from "express";
/**
 * ⚠️ FINAL NOTE
 * This project uses `better-auth`.
 * All authentication routes are handled here:
 *
 *   app.all("/api/auth/*", toNodeHandler(auth))
 *
 * DO NOT add signup/login/get-session routes here.
 * This file exists only to avoid import or TS errors.
 */
const router = express.Router();
export default router;
