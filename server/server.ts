import express, { Request, Response } from "express";
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
 * Stripe webhook MUST come before express.json()
 */
app.post(
  "/api/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

/**
 * JSON parser (after webhook)
 */
app.use(express.json({ limit: "50mb" }));

/**
 * Better Auth Routes
 * Handles all auth endpoints
 */
app.all("/api/auth/:path(*)", toNodeHandler(auth));

/**
 * Health Check
 */
app.get("/", (req: Request, res: Response) => {
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
  console.log(`🚀 Server running at http://localhost:${port}`);
});
