import express, { Request, Response } from "express";
import "dotenv/config";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { toNodeHandler } from "better-auth/node";

import { auth } from "./lib/auth.js";
import userRouter from "./routes/userRoutes.js";
import projectRouter from "./routes/projectRoutes.js";
import { stripeWebhook } from "./controllers/stripeWebhook.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
app.post(
  "/api/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

/**
 * JSON parser
 */
app.use(express.json({ limit: "50mb" }));

/**
 * Serve Static Files (React Frontend)
 */
const isDist = __dirname.endsWith("dist");
const clientDistPath = isDist
    ? path.join(__dirname, "../../client/dist")
    : path.join(__dirname, "../client/dist");

app.use(express.static(clientDistPath));

/**
 * ✅ Better Auth Routes (FINAL & CORRECT)
 * DO NOT use wildcards
 */
app.use("/api/auth", toNodeHandler(auth));

/**
 * Health Check
 */
app.get("/health", (req: Request, res: Response) => {
  res.send("Server is Live!");
});

/**
 * Protected API Routes
 */
app.use("/api/user", userRouter);
app.use("/api/project", projectRouter);

/**
 * SPA Fallback - Serve index.html for all non-API routes
 */
app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) {
        return res.status(404).json({ message: "API endpoint not found" });
    }
    res.sendFile(path.join(clientDistPath, "index.html"));
});

/**
 * Start Server
 */
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
