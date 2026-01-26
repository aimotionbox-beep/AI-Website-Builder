import express from "express";
import "dotenv/config";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import userRouter from "./routes/userRoutes.js";
import projectRouter from "./routes/projectRoutes.js";
import { stripeWebhook } from "./controllers/stripeWebhook.js";
const app = express();
const port = process.env.PORT || 3000;
/**
 * CORS Configuration
 */
const corsOptions = {
    origin: process.env.TRUSTED_ORIGINS?.split(",") || [],
    credentials: true,
};
app.use(cors(corsOptions));
/**
 * Stripe webhook (RAW body required)
 * MUST come before express.json()
 */
app.post("/api/stripe", express.raw({ type: "application/json" }), stripeWebhook);
/**
 * JSON parser
 */
app.use(express.json({ limit: "50mb" }));
/**
 * ✅ Better Auth Routes (FINAL & CORRECT)
 * DO NOT use wildcards
 */
app.use("/api/auth", toNodeHandler(auth));
/**
 * Health Check
 */
app.get("/", (req, res) => {
    res.send("Server is Live!");
});
/**
 * Protected API Routes
 */
app.use("/api/user", userRouter);
app.use("/api/project", projectRouter);
/**
 * Start Server
 */
app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
});
