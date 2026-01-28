// server.ts
import express3 from "express";
import "dotenv/config";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";

// lib/auth.ts
import "dotenv/config";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

// lib/prisma.ts
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

// generated/prisma/client.ts
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// generated/prisma/internal/class.ts
import * as runtime from "@prisma/client/runtime/client";
var config = {
  "previewFeatures": [],
  "clientVersion": "7.1.0",
  "engineVersion": "ab635e6b9d606fa5c8fb8b1a7f909c3c3c1c98ba",
  "activeProvider": "postgresql",
  "inlineSchema": '// This is your Prisma schema file,\n// learn more about it in the docs: https://pris.ly/d/prisma-schema\n\n// Looking for ways to speed up your queries, or scale easily with your serverless or edge functions?\n// Try Prisma Accelerate: https://pris.ly/cli/accelerate-init\n\ngenerator client {\n  provider = "prisma-client"\n  output   = "../generated/prisma"\n}\n\ndatasource db {\n  provider = "postgresql"\n}\n\nmodel User {\n  id            String   @id\n  email         String\n  name          String\n  totalCreation Int      @default(0)\n  credits       Int      @default(20)\n  createdAt     DateTime @default(now())\n  updatedAt     DateTime @updatedAt\n  emailVerified Boolean  @default(false)\n\n  // Relations\n  projects     WebsiteProject[]\n  sessions     Session[]\n  accounts     Account[]\n  transactions Transaction[]\n\n  @@map("user")\n}\n\nmodel WebsiteProject {\n  id                    String  @id @default(uuid())\n  name                  String\n  initial_prompt        String\n  current_code          String?\n  current_version_index String  @default("")\n  userId                String\n  isPublished           Boolean @default(false)\n\n  // Relations\n  conversation Conversation[]\n  versions     Version[]\n  user         User           @relation(fields: [userId], references: [id])\n\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n}\n\nenum Role {\n  user\n  assistant\n}\n\nmodel Conversation {\n  id        String   @id @default(uuid())\n  role      Role\n  content   String\n  timestamp DateTime @default(now())\n  projectId String\n\n  // Relations\n  project WebsiteProject @relation(fields: [projectId], references: [id], onDelete: Cascade)\n}\n\nmodel Version {\n  id          String   @id @default(uuid())\n  code        String\n  description String?\n  timestamp   DateTime @default(now())\n  projectId   String\n\n  // Relations\n  project WebsiteProject @relation(fields: [projectId], references: [id], onDelete: Cascade)\n}\n\nmodel Transaction {\n  id        String   @id @default(uuid())\n  isPaid    Boolean  @default(false)\n  planId    String\n  amount    Float\n  credits   Int\n  userId    String\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  // Relations\n  user User @relation(fields: [userId], references: [id], onDelete: Cascade)\n}\n\nmodel Session {\n  id        String   @id\n  expiresAt DateTime\n  token     String\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n  ipAddress String?\n  userAgent String?\n  userId    String\n  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  @@unique([token])\n  @@index([userId])\n  @@map("session")\n}\n\nmodel Account {\n  id                    String    @id\n  accountId             String\n  providerId            String\n  userId                String\n  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)\n  accessToken           String?\n  refreshToken          String?\n  idToken               String?\n  accessTokenExpiresAt  DateTime?\n  refreshTokenExpiresAt DateTime?\n  scope                 String?\n  password              String?\n  createdAt             DateTime  @default(now())\n  updatedAt             DateTime  @updatedAt\n\n  @@index([userId])\n  @@map("account")\n}\n\nmodel Verification {\n  id         String   @id\n  identifier String\n  value      String\n  expiresAt  DateTime\n  createdAt  DateTime @default(now())\n  updatedAt  DateTime @updatedAt\n\n  @@index([identifier])\n  @@map("verification")\n}\n',
  "runtimeDataModel": {
    "models": {},
    "enums": {},
    "types": {}
  }
};
config.runtimeDataModel = JSON.parse('{"models":{"User":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"email","kind":"scalar","type":"String"},{"name":"name","kind":"scalar","type":"String"},{"name":"totalCreation","kind":"scalar","type":"Int"},{"name":"credits","kind":"scalar","type":"Int"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"},{"name":"emailVerified","kind":"scalar","type":"Boolean"},{"name":"projects","kind":"object","type":"WebsiteProject","relationName":"UserToWebsiteProject"},{"name":"sessions","kind":"object","type":"Session","relationName":"SessionToUser"},{"name":"accounts","kind":"object","type":"Account","relationName":"AccountToUser"},{"name":"transactions","kind":"object","type":"Transaction","relationName":"TransactionToUser"}],"dbName":"user"},"WebsiteProject":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"name","kind":"scalar","type":"String"},{"name":"initial_prompt","kind":"scalar","type":"String"},{"name":"current_code","kind":"scalar","type":"String"},{"name":"current_version_index","kind":"scalar","type":"String"},{"name":"userId","kind":"scalar","type":"String"},{"name":"isPublished","kind":"scalar","type":"Boolean"},{"name":"conversation","kind":"object","type":"Conversation","relationName":"ConversationToWebsiteProject"},{"name":"versions","kind":"object","type":"Version","relationName":"VersionToWebsiteProject"},{"name":"user","kind":"object","type":"User","relationName":"UserToWebsiteProject"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":null},"Conversation":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"role","kind":"enum","type":"Role"},{"name":"content","kind":"scalar","type":"String"},{"name":"timestamp","kind":"scalar","type":"DateTime"},{"name":"projectId","kind":"scalar","type":"String"},{"name":"project","kind":"object","type":"WebsiteProject","relationName":"ConversationToWebsiteProject"}],"dbName":null},"Version":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"code","kind":"scalar","type":"String"},{"name":"description","kind":"scalar","type":"String"},{"name":"timestamp","kind":"scalar","type":"DateTime"},{"name":"projectId","kind":"scalar","type":"String"},{"name":"project","kind":"object","type":"WebsiteProject","relationName":"VersionToWebsiteProject"}],"dbName":null},"Transaction":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"isPaid","kind":"scalar","type":"Boolean"},{"name":"planId","kind":"scalar","type":"String"},{"name":"amount","kind":"scalar","type":"Float"},{"name":"credits","kind":"scalar","type":"Int"},{"name":"userId","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"},{"name":"user","kind":"object","type":"User","relationName":"TransactionToUser"}],"dbName":null},"Session":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"expiresAt","kind":"scalar","type":"DateTime"},{"name":"token","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"},{"name":"ipAddress","kind":"scalar","type":"String"},{"name":"userAgent","kind":"scalar","type":"String"},{"name":"userId","kind":"scalar","type":"String"},{"name":"user","kind":"object","type":"User","relationName":"SessionToUser"}],"dbName":"session"},"Account":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"accountId","kind":"scalar","type":"String"},{"name":"providerId","kind":"scalar","type":"String"},{"name":"userId","kind":"scalar","type":"String"},{"name":"user","kind":"object","type":"User","relationName":"AccountToUser"},{"name":"accessToken","kind":"scalar","type":"String"},{"name":"refreshToken","kind":"scalar","type":"String"},{"name":"idToken","kind":"scalar","type":"String"},{"name":"accessTokenExpiresAt","kind":"scalar","type":"DateTime"},{"name":"refreshTokenExpiresAt","kind":"scalar","type":"DateTime"},{"name":"scope","kind":"scalar","type":"String"},{"name":"password","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":"account"},"Verification":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"identifier","kind":"scalar","type":"String"},{"name":"value","kind":"scalar","type":"String"},{"name":"expiresAt","kind":"scalar","type":"DateTime"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":"verification"}},"enums":{},"types":{}}');
async function decodeBase64AsWasm(wasmBase64) {
  const { Buffer } = await import("node:buffer");
  const wasmArray = Buffer.from(wasmBase64, "base64");
  return new WebAssembly.Module(wasmArray);
}
config.compilerWasm = {
  getRuntime: async () => await import("@prisma/client/runtime/query_compiler_bg.postgresql.mjs"),
  getQueryCompilerWasmModule: async () => {
    const { wasm } = await import("@prisma/client/runtime/query_compiler_bg.postgresql.wasm-base64.mjs");
    return await decodeBase64AsWasm(wasm);
  }
};
function getPrismaClientClass() {
  return runtime.getPrismaClient(config);
}

// generated/prisma/internal/prismaNamespace.ts
import * as runtime2 from "@prisma/client/runtime/client";
var getExtensionContext = runtime2.Extensions.getExtensionContext;
var NullTypes2 = {
  DbNull: runtime2.NullTypes.DbNull,
  JsonNull: runtime2.NullTypes.JsonNull,
  AnyNull: runtime2.NullTypes.AnyNull
};
var TransactionIsolationLevel = runtime2.makeStrictEnum({
  ReadUncommitted: "ReadUncommitted",
  ReadCommitted: "ReadCommitted",
  RepeatableRead: "RepeatableRead",
  Serializable: "Serializable"
});
var defineExtension = runtime2.Extensions.defineExtension;

// generated/prisma/client.ts
globalThis["__dirname"] = path.dirname(fileURLToPath(import.meta.url));
var PrismaClient = getPrismaClientClass();

// lib/prisma.ts
var connectionString = `${process.env.DATABASE_URL}`;
var adapter = new PrismaPg({ connectionString });
var prisma = new PrismaClient({ adapter });
var prisma_default = prisma;

// lib/auth.ts
var trustedOrigins = process.env.TRUSTED_ORIGINS?.split(",") || [];
var auth = betterAuth({
  database: prismaAdapter(prisma_default, {
    provider: "postgresql"
  }),
  emailAndPassword: {
    enabled: true
  },
  user: {
    deleteUser: { enabled: true }
  },
  trustedOrigins,
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  advanced: {
    cookies: {
      session_token: {
        name: "auth_session",
        attributes: {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
          path: "/"
        }
      }
    }
  }
});

// routes/userRoutes.ts
import express from "express";

// configs/openai.ts
import OpenAI from "openai";
var openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.AI_API_KEY
});
var openai_default = openai;

// controllers/userController.ts
import Stripe from "stripe";
var getUserCredits = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const user = await prisma_default.user.findUnique({
      where: { id: userId }
    });
    res.json({ credits: user?.credits });
  } catch (error) {
    console.log(error.code || error.message);
    res.status(500).json({ message: error.message });
  }
};
var createUserProject = async (req, res) => {
  const userId = req.userId;
  try {
    const { initial_prompt } = req.body;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const user = await prisma_default.user.findUnique({
      where: { id: userId }
    });
    if (user && user.credits < 5) {
      return res.status(403).json({ message: "add credits to create more projects" });
    }
    const project = await prisma_default.websiteProject.create({
      data: {
        name: initial_prompt.length > 50 ? initial_prompt.substring(0, 47) + "..." : initial_prompt,
        initial_prompt,
        userId
      }
    });
    await prisma_default.user.update({
      where: { id: userId },
      data: { totalCreation: { increment: 1 } }
    });
    await prisma_default.conversation.create({
      data: {
        role: "user",
        content: initial_prompt,
        projectId: project.id
      }
    });
    await prisma_default.user.update({
      where: { id: userId },
      data: { credits: { decrement: 5 } }
    });
    res.json({ projectId: project.id });
    const promptEnhanceResponse = await openai_default.chat.completions.create({
      model: "openai/gpt-5.2-codex",
      messages: [
        {
          role: "system",
          content: `
                    You are a prompt enhancement specialist. Take the user's website request and expand it into a detailed, comprehensive prompt that will help create the best possible website.

                    Enhance this prompt by:
                    1. Adding specific design details (layout, color scheme, typography)
                    2. Specifying key sections and features
                    3. Describing the user experience and interactions
                    4. Including modern web design best practices
                    5. Mentioning responsive design requirements
                    6. Adding any missing but important elements

                    Return ONLY the enhanced prompt, nothing else. Make it detailed but concise (2-3 paragraphs max).`
        },
        {
          role: "user",
          content: initial_prompt
        }
      ]
    });
    const enhancedPrompt = promptEnhanceResponse.choices[0].message.content;
    await prisma_default.conversation.create({
      data: {
        role: "assistant",
        content: `I've enhanced your prompt to: "${enhancedPrompt}"`,
        projectId: project.id
      }
    });
    await prisma_default.conversation.create({
      data: {
        role: "assistant",
        content: "now generating your website...",
        projectId: project.id
      }
    });
    const codeGenerationResponse = await openai_default.chat.completions.create({
      model: "openai/gpt-5.2-codex",
      messages: [
        {
          role: "system",
          content: `
                     You are an expert web developer. Create a complete, production-ready, single-page website based on this request: "${enhancedPrompt}"

                    CRITICAL REQUIREMENTS:
                    - You MUST output valid HTML ONLY. 
                    - Use Tailwind CSS for ALL styling
                    - Include this EXACT script in the <head>: <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
                    - Use Tailwind utility classes extensively for styling, animations, and responsiveness
                    - Make it fully functional and interactive with JavaScript in <script> tag before closing </body>
                    - Use modern, beautiful design with great UX using Tailwind classes
                    - Make it responsive using Tailwind responsive classes (sm:, md:, lg:, xl:)
                    - Use Tailwind animations and transitions (animate-*, transition-*)
                    - Include all necessary meta tags
                    - Use Google Fonts CDN if needed for custom fonts
                    - Use placeholder images from https://placehold.co/600x400
                    - Use Tailwind gradient classes for beautiful backgrounds
                    - Make sure all buttons, cards, and components use Tailwind styling

                    CRITICAL HARD RULES:
                    1. You MUST put ALL output ONLY into message.content.
                    2. You MUST NOT place anything in "reasoning", "analysis", "reasoning_details", or any hidden fields.
                    3. You MUST NOT include internal thoughts, explanations, analysis, comments, or markdown.
                    4. Do NOT include markdown, explanations, notes, or code fences.

                    The HTML should be complete and ready to render as-is with Tailwind CSS.`
        },
        {
          role: "user",
          content: enhancedPrompt || ""
        }
      ]
    });
    const code = codeGenerationResponse.choices[0].message.content || "";
    if (!code) {
      await prisma_default.conversation.create({
        data: {
          role: "assistant",
          content: "Unable to generate the code, please try again",
          projectId: project.id
        }
      });
      await prisma_default.user.update({
        where: { id: userId },
        data: { credits: { increment: 5 } }
      });
      return;
    }
    const version = await prisma_default.version.create({
      data: {
        code: code.replace(/```[a-z]*\n?/gi, "").replace(/```$/g, "").trim(),
        description: "Initial version",
        projectId: project.id
      }
    });
    await prisma_default.conversation.create({
      data: {
        role: "assistant",
        content: "I've created your website! You can now preview it and request any changes.",
        projectId: project.id
      }
    });
    await prisma_default.websiteProject.update({
      where: { id: project.id },
      data: {
        current_code: code.replace(/```[a-z]*\n?/gi, "").replace(/```$/g, "").trim(),
        current_version_index: version.id
      }
    });
  } catch (error) {
    await prisma_default.user.update({
      where: { id: userId },
      data: { credits: { increment: 5 } }
    });
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};
var getUserProject = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { projectId } = req.params;
    const project = await prisma_default.websiteProject.findUnique({
      where: { id: projectId, userId },
      include: {
        conversation: {
          orderBy: { timestamp: "asc" }
        },
        versions: { orderBy: { timestamp: "asc" } }
      }
    });
    res.json({ project });
  } catch (error) {
    console.log(error.code || error.message);
    res.status(500).json({ message: error.message });
  }
};
var getUserProjects = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const projects = await prisma_default.websiteProject.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" }
    });
    res.json({ projects });
  } catch (error) {
    console.log(error.code || error.message);
    res.status(500).json({ message: error.message });
  }
};
var togglePublish = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { projectId } = req.params;
    const project = await prisma_default.websiteProject.findUnique({
      where: { id: projectId, userId }
    });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    await prisma_default.websiteProject.update({
      where: { id: projectId },
      data: { isPublished: !project.isPublished }
    });
    res.json({ message: project.isPublished ? "Project Unpublished" : "Project Published Successfully" });
  } catch (error) {
    console.log(error.code || error.message);
    res.status(500).json({ message: error.message });
  }
};
var purchaseCredits = async (req, res) => {
  try {
    const plans = {
      basic: { credits: 100, amount: 5 },
      pro: { credits: 400, amount: 19 },
      enterprise: { credits: 1e3, amount: 49 }
    };
    const userId = req.userId;
    const { planId } = req.body;
    const origin = req.headers.origin;
    const plan = plans[planId];
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }
    const transaction = await prisma_default.transaction.create({
      data: {
        userId,
        planId: req.body.planId,
        amount: plan.amount,
        credits: plan.credits
      }
    });
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      success_url: `${origin}/loading`,
      cancel_url: `${origin}`,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `AiSiteBuilder - ${plan.credits} credits`
            },
            unit_amount: Math.floor(transaction.amount) * 100
          },
          quantity: 1
        }
      ],
      mode: "payment",
      metadata: {
        transactionId: transaction.id,
        appId: "ai-site-builder"
      },
      expires_at: Math.floor(Date.now() / 1e3) + 30 * 60
      // Expires in 30 minutes
    });
    res.json({ payment_link: session.url });
  } catch (error) {
    console.log(error.code || error.message);
    res.status(500).json({ message: error.message });
  }
};

// middlewares/auth.ts
import { fromNodeHeaders } from "better-auth/node";
var protect = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers)
    });
    if (!session || !session?.user) {
      return res.status(401).json({ message: "Unauthorized user" });
    }
    req.userId = session.user.id;
    next();
  } catch (error) {
    console.log(error);
    res.status(401).json({ message: error.code || error.message });
  }
};

// routes/userRoutes.ts
var userRouter = express.Router();
userRouter.get("/credits", protect, getUserCredits);
userRouter.post("/project", protect, createUserProject);
userRouter.get("/project/:projectId", protect, getUserProject);
userRouter.get("/projects", protect, getUserProjects);
userRouter.get("/publish-toggle/:projectId", protect, togglePublish);
userRouter.post("/purchase-credits", protect, purchaseCredits);
var userRoutes_default = userRouter;

// routes/projectRoutes.ts
import express2 from "express";

// controllers/projectController.ts
import archiver from "archiver";
var makeRevision = async (req, res) => {
  const userId = req.userId;
  try {
    const { projectId } = req.params;
    const { message } = req.body;
    const user = await prisma_default.user.findUnique({
      where: { id: userId }
    });
    if (!userId || !user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (user.credits < 5) {
      return res.status(403).json({ message: "add more credits to make changes" });
    }
    if (!message || message.trim() === "") {
      return res.status(400).json({ message: "Please enter a valid prompt" });
    }
    const currentProject = await prisma_default.websiteProject.findUnique({
      where: { id: projectId, userId },
      include: { versions: true }
    });
    if (!currentProject) {
      return res.status(404).json({ message: "Project not found" });
    }
    await prisma_default.conversation.create({
      data: {
        role: "user",
        content: message,
        projectId
      }
    });
    await prisma_default.user.update({
      where: { id: userId },
      data: { credits: { decrement: 5 } }
    });
    const promptEnhanceResponse = await openai_default.chat.completions.create({
      model: "openai/gpt-5.2-codex",
      messages: [
        {
          role: "system",
          content: `
                     You are a prompt enhancement specialist. The user wants to make changes to their website. Enhance their request to be more specific and actionable for a web developer.

                    Enhance this by:
                    1. Being specific about what elements to change
                    2. Mentioning design details (colors, spacing, sizes)
                    3. Clarifying the desired outcome
                    4. Using clear technical terms

                    Return ONLY the enhanced request, nothing else. Keep it concise (1-2 sentences).`
        },
        {
          role: "user",
          content: `User's request: "${message}"`
        }
      ]
    });
    const enhancedPrompt = promptEnhanceResponse.choices[0].message.content;
    await prisma_default.conversation.create({
      data: {
        role: "assistant",
        content: `I've enhanced your prompt to: "${enhancedPrompt}"`,
        projectId
      }
    });
    await prisma_default.conversation.create({
      data: {
        role: "assistant",
        content: "Now making changes to your website...",
        projectId
      }
    });
    const codeGenerationResponse = await openai_default.chat.completions.create({
      model: "openai/gpt-5.2-codex",
      messages: [
        {
          role: "system",
          content: `
                    You are an expert web developer. 

                    CRITICAL REQUIREMENTS:
                    - Return ONLY the complete updated HTML code with the requested changes.
                    - Use Tailwind CSS for ALL styling (NO custom CSS).
                    - Use Tailwind utility classes for all styling changes.
                    - Include all JavaScript in <script> tags before closing </body>
                    - Make sure it's a complete, standalone HTML document with Tailwind CSS
                    - Return the HTML Code Only, nothing else

                    Apply the requested changes while maintaining the Tailwind CSS styling approach.`
        },
        {
          role: "user",
          content: `
                    Here is the current website code: "${currentProject.current_code}" The user wants this change: "${enhancedPrompt}"`
        }
      ]
    });
    const code = codeGenerationResponse.choices[0].message.content || "";
    if (!code) {
      await prisma_default.conversation.create({
        data: {
          role: "assistant",
          content: "Unable to generate the code, please try again",
          projectId
        }
      });
      await prisma_default.user.update({
        where: { id: userId },
        data: { credits: { increment: 5 } }
      });
      return;
    }
    const version = await prisma_default.version.create({
      data: {
        code: code.replace(/```[a-z]*\n?/gi, "").replace(/```$/g, "").trim(),
        description: "changes made",
        projectId
      }
    });
    await prisma_default.conversation.create({
      data: {
        role: "assistant",
        content: "I've made the changes to your website! You can now preview it",
        projectId
      }
    });
    await prisma_default.websiteProject.update({
      where: { id: projectId },
      data: {
        current_code: code.replace(/```[a-z]*\n?/gi, "").replace(/```$/g, "").trim(),
        current_version_index: version.id
      }
    });
    res.json({ message: "Changes made successfully" });
  } catch (error) {
    await prisma_default.user.update({
      where: { id: userId },
      data: { credits: { increment: 5 } }
    });
    console.log(error.code || error.message);
    res.status(500).json({ message: error.message });
  }
};
var rollbackToVersion = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { projectId, versionId } = req.params;
    const project = await prisma_default.websiteProject.findUnique({
      where: { id: projectId, userId },
      include: { versions: true }
    });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    const version = project.versions.find((version2) => version2.id === versionId);
    if (!version) {
      return res.status(404).json({ message: "Version not found" });
    }
    await prisma_default.websiteProject.update({
      where: { id: projectId, userId },
      data: {
        current_code: version.code,
        current_version_index: version.id
      }
    });
    await prisma_default.conversation.create({
      data: {
        role: "assistant",
        content: "I've rolled back your website to selected version. You can now preview it",
        projectId
      }
    });
    res.json({ message: "Version rolled back" });
  } catch (error) {
    console.log(error.code || error.message);
    res.status(500).json({ message: error.message });
  }
};
var deleteProject = async (req, res) => {
  try {
    const userId = req.userId;
    const { projectId } = req.params;
    await prisma_default.websiteProject.delete({
      where: { id: projectId, userId }
    });
    res.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.log(error.code || error.message);
    res.status(500).json({ message: error.message });
  }
};
var getProjectPreview = async (req, res) => {
  try {
    const userId = req.userId;
    const { projectId } = req.params;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const project = await prisma_default.websiteProject.findFirst({
      where: { id: projectId, userId },
      include: { versions: true }
    });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.json({ project });
  } catch (error) {
    console.log(error.code || error.message);
    res.status(500).json({ message: error.message });
  }
};
var getPublishedProjects = async (req, res) => {
  try {
    const projects = await prisma_default.websiteProject.findMany({
      where: { isPublished: true },
      include: { user: true }
    });
    res.json({ projects });
  } catch (error) {
    console.log(error.code || error.message);
    res.status(500).json({ message: error.message });
  }
};
var getProjectById = async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await prisma_default.websiteProject.findFirst({
      where: { id: projectId }
    });
    if (!project || project.isPublished === false || !project?.current_code) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.json({ code: project.current_code });
  } catch (error) {
    console.log(error.code || error.message);
    res.status(500).json({ message: error.message });
  }
};
var saveProjectCode = async (req, res) => {
  try {
    const userId = req.userId;
    const { projectId } = req.params;
    const { code } = req.body;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!code) {
      return res.status(400).json({ message: "Code is required" });
    }
    const project = await prisma_default.websiteProject.findUnique({
      where: { id: projectId, userId }
    });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    await prisma_default.websiteProject.update({
      where: { id: projectId },
      data: { current_code: code, current_version_index: "" }
    });
    res.json({ message: "Project saved successfully" });
  } catch (error) {
    console.log(error.code || error.message);
    res.status(500).json({ message: error.message });
  }
};
var downloadProject = async (req, res) => {
  try {
    const { code, projectName } = req.body;
    if (!code) {
      return res.status(400).json({ message: "Code is required" });
    }
    const safeProjectName = (projectName || "project").replace(/[^a-z0-9]/gi, "_").toLowerCase();
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${safeProjectName}.zip"`);
    const archive = archiver("zip", {
      zlib: { level: 9 }
    });
    archive.on("error", function(err) {
      res.status(500).send({ message: err.message });
    });
    archive.pipe(res);
    let isJson = false;
    let projectStructure = null;
    try {
      projectStructure = JSON.parse(code);
    } catch (e) {
      try {
        const match = code.match(/```json\n?([\s\S]*?)\n?```/);
        if (match) {
          projectStructure = JSON.parse(match[1]);
        } else {
          const clean = code.replace(/```json/g, "").replace(/```/g, "").trim();
          projectStructure = JSON.parse(clean);
        }
      } catch (e2) {
      }
    }
    if (projectStructure && projectStructure.files && Array.isArray(projectStructure.files)) {
      isJson = true;
    }
    if (isJson && projectStructure) {
      projectStructure.files.forEach((file) => {
        let path2 = file.path;
        if (!path2) return;
        if (path2.startsWith("/")) path2 = path2.substring(1);
        const content = typeof file.content === "string" ? file.content : JSON.stringify(file.content ?? "", null, 2);
        archive.append(content, { name: path2 });
      });
    } else {
      archive.append(code, { name: "frontend/index.html" });
      const packageJson = {
        name: safeProjectName,
        version: "1.0.0",
        description: "Generated by AI Website Builder",
        main: "server.js",
        scripts: {
          start: "node server.js",
          dev: "nodemon server.js"
        },
        dependencies: {
          express: "^4.18.2",
          dotenv: "^16.3.1"
        },
        devDependencies: {
          nodemon: "^3.0.1"
        }
      };
      archive.append(JSON.stringify(packageJson, null, 2), { name: "backend/package.json" });
      const serverJs = `
const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, '../frontend')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});
app.listen(PORT, () => {
  console.log(\`Server is running on http://localhost:\${PORT}\`);
});
`.trim();
      archive.append(serverJs, { name: "backend/server.js" });
      archive.append("PORT=3000", { name: "backend/.env.example" });
      const readme = `
# ${projectName || "AI Generated Project"}
This project was generated by AI Website Builder.
## Structure
- frontend/: Static assets and HTML.
- backend/: Simple Express server to serve the frontend.
## Getting Started
1. cd backend
2. npm install
3. npm start
4. Visit http://localhost:3000
`.trim();
      archive.append(readme, { name: "README.md" });
    }
    await archive.finalize();
  } catch (error) {
    console.log(error.code || error.message);
    if (!res.headersSent) {
      res.status(500).json({ message: error.message });
    }
  }
};

// routes/projectRoutes.ts
var projectRouter = express2.Router();
projectRouter.post("/download", protect, downloadProject);
projectRouter.post("/revision/:projectId", protect, makeRevision);
projectRouter.put("/save/:projectId", protect, saveProjectCode);
projectRouter.get("/rollback/:projectId/:versionId", protect, rollbackToVersion);
projectRouter.delete("/:projectId", protect, deleteProject);
projectRouter.get("/preview/:projectId", protect, getProjectPreview);
projectRouter.get("/published", getPublishedProjects);
projectRouter.get("/published/:projectId", getProjectById);
var projectRoutes_default = projectRouter;

// controllers/stripeWebhook.ts
import Stripe2 from "stripe";
var stripeWebhook = async (request, response) => {
  const stripe = new Stripe2(process.env.STRIPE_SECRET_KEY);
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (endpointSecret) {
    const signature = request.headers["stripe-signature"];
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        request.body,
        signature,
        endpointSecret
      );
    } catch (err) {
      console.log(`\u26A0\uFE0F Webhook signature verification failed.`, err.message);
      return response.sendStatus(400);
    }
    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object;
        const sessionList = await stripe.checkout.sessions.list({
          payment_intent: paymentIntent.id
        });
        const session = sessionList.data[0];
        const { transactionId, appId } = session.metadata;
        if (appId === "ai-site-builder" && transactionId) {
          const transaction = await prisma_default.transaction.update({
            where: { id: transactionId },
            data: { isPaid: true }
          });
          await prisma_default.user.update({
            where: { id: transaction.userId },
            data: { credits: { increment: transaction.credits } }
          });
        }
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    response.json({ received: true });
  }
};

// server.ts
var app = express3();
var port = process.env.PORT || 3e3;
var corsOptions = {
  origin: process.env.TRUSTED_ORIGINS?.split(",") || [],
  credentials: true
};
app.use(cors(corsOptions));
app.post(
  "/api/stripe",
  express3.raw({ type: "application/json" }),
  stripeWebhook
);
app.use(express3.json({ limit: "50mb" }));
app.use("/api/auth", toNodeHandler(auth));
app.get("/", (req, res) => {
  res.send("Server is Live!");
});
app.use("/api/user", userRoutes_default);
app.use("/api/project", projectRoutes_default);
app.listen(port, () => {
  console.log(`\u{1F680} Server running on port ${port}`);
});
