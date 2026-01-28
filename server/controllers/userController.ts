import {Request, Response} from 'express'
import prisma from '../lib/prisma.js';
import openai from '../configs/openai.js';
import Stripe from 'stripe'

// Get User Credits
export const getUserCredits = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if(!userId){
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const user = await prisma.user.findUnique({
            where: {id: userId}
        })

        res.json({credits: user?.credits})
    } catch (error : any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// Controller Function to create New Project
export const createUserProject = async (req: Request, res: Response) => {
    const userId = req.userId;
    try {
        const { initial_prompt } = req.body;

        if(!userId){
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const user = await prisma.user.findUnique({
            where: {id: userId}
        })

        if(user && user.credits < 5){
            return res.status(403).json({ message: 'add credits to create more projects' });
        }

        // Create a new project
        const project = await prisma.websiteProject.create({
            data: {
                name: initial_prompt.length > 50 ? initial_prompt.substring(0, 47) + '...' : initial_prompt,
                initial_prompt,
                userId
            }
        })

        // Update User's Total Creation
        await prisma.user.update({
            where: {id: userId},
            data: {totalCreation: {increment: 1}}
        })

        await prisma.conversation.create({
            data: {
                role: 'user',
                content: initial_prompt,
                projectId: project.id
            }
        })

        await prisma.user.update({
            where: {id: userId},
            data: {credits: {decrement: 5}}
        })

        res.json({projectId: project.id})

        // Enhance user prompt
        const promptEnhanceResponse = await openai.chat.completions.create({
            model: 'openai/gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
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
                    role: 'user',
                    content: initial_prompt
                }
            ]
        })

        const enhancedPrompt = promptEnhanceResponse.choices[0].message.content;

        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: `I've enhanced your prompt to: "${enhancedPrompt}"`,
                projectId: project.id
            }
        })

        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: 'now generating your website...',
                projectId: project.id
            }
        })

        // Generate website code
        const codeGenerationResponse = await openai.chat.completions.create({
            model: 'openai/gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: `
                    You are an expert full-stack developer. Create a complete, production-ready application based on this request: "${enhancedPrompt}"

                    CRITICAL REQUIREMENTS:
                    1.  **Full Stack & Flexibility**: Do NOT restrict yourself to static HTML unless explicitly requested. You MUST generate a full frontend and backend codebase using the most appropriate modern technology stack (e.g., React, Next.js, Vue, Node/Express, etc.) for the requirements.
                    2.  **Output Format**: You MUST return a single valid JSON object containing the file structure.
                        The JSON schema must be:
                        \`\`\`json
                        {
                          "type": "project-structure",
                          "template": "react", // Options: "react", "react-ts", "vue", "vue-ts", "vanilla", "vanilla-ts", "angular", "svelte", "solid", "node"
                          "files": [
                            {
                              "path": "path/to/file.ext", // e.g., "/App.js", "/public/index.html", "/server/index.js"
                              "content": "file content here"
                            }
                          ]
                        }
                        \`\`\`
                    3.  **Preview & Runtime Compatibility**:
                        - The generated code will be previewed in a **client-side sandbox** (Sandpack).
                        - **Frontend**: Ensure the frontend is fully functional in the preview. Use standard imports (e.g., \`import React from 'react'\`).
                        - **Backend**: If a backend is required (e.g., Node/Express), generate the full backend code in a \`server/\` directory for the user to download.
                        - **Data Fetching**: Since the backend cannot run in the client-side preview, **you MUST mock API calls in the frontend** so the preview works immediately.
                          - Example:
                            \`\`\`javascript
                            // Real API call (commented out)
                            // const res = await fetch('/api/data');
                            // const data = await res.json();
                            
                            // Mock data for preview
                            const data = [{ id: 1, name: "Sample Data" }];
                            \`\`\`
                    4.  **Content**:
                        - Include ALL necessary configuration files (package.json, tsconfig.json, .env.example, etc.).
                        - Include a README.md with clear setup and running instructions.
                        - Ensure the code is production-ready, clean, and well-commented.
                        - For styling, use Tailwind CSS (via CDN or standard config) if applicable.
                    5.  **Output Format**: Return the valid JSON object wrapped in a markdown code block (\`\`\`json ... \`\`\`).
                    `
                },
                {
                    role: 'user',
                    content: enhancedPrompt || ''
                }
            ]
        })

        const code = codeGenerationResponse.choices[0].message.content || '';

        if(!code){
             await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: "Unable to generate the code, please try again",
                projectId: project.id
            }
        })
        await prisma.user.update({
            where: {id: userId},
            data: {credits: {increment: 5}}
        })
        return;
        }

        // Extract JSON from markdown if present
        const jsonMatch = code.match(/```json\n?([\s\S]*?)\n?```/);
        const cleanCode = jsonMatch ? jsonMatch[1].trim() : code.trim();

        // Create Version for the project
        const version = await prisma.version.create({
            data: {
                code: cleanCode,
                description: 'Initial version',
                projectId: project.id
            }
        })

        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: "I've created your website! You can now preview it and request any changes.",
                projectId: project.id
            }
        })

        await prisma.websiteProject.update({
            where: {id: project.id},
            data: {
                current_code: cleanCode,
                current_version_index: version.id
            }
        })

    } catch (error : any) {
        await prisma.user.update({
            where: {id: userId},
            data: {credits: {increment: 5}}
        })
        console.log(error);
        if (!res.headersSent) {
            res.status(500).json({ message: error.message });
        }
    }
}

// Controller Function to Get A Single User Project
export const getUserProject = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if(!userId){
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const {projectId} = req.params;

       const project = await prisma.websiteProject.findUnique({
        where: {id: projectId, userId},
        include: {
            conversation: {
                orderBy: {timestamp: 'asc'}
            },
            versions: {orderBy: {timestamp: 'asc'}}
        }
       })

        res.json({project})

    } catch (error : any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// Controller Function to Get All Users Projects
export const getUserProjects = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if(!userId){
            return res.status(401).json({ message: 'Unauthorized' });
        }

       const projects = await prisma.websiteProject.findMany({
        where: {userId},
        orderBy: {updatedAt: 'desc'}
       })

        res.json({projects})

    } catch (error : any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// Controller Function to Toggle Project Publish
export const togglePublish = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if(!userId){
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const {projectId} = req.params;

        const project = await prisma.websiteProject.findUnique({
            where: {id: projectId, userId}
        })

        if(!project){
            return res.status(404).json({ message: 'Project not found' });
        }

        await prisma.websiteProject.update({
            where: {id: projectId},
            data: {isPublished: !project.isPublished}
        })
       
        res.json({message: project.isPublished ? 'Project Unpublished' : 'Project Published Successfully'})

    } catch (error : any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// Controller Function to Purchase Credits
export const purchaseCredits = async (req: Request, res: Response) => {
    try {
        interface Plan {
            credits: number;
            amount: number;
        }

        const plans = {
            basic: {credits: 100, amount: 5},
            pro: {credits: 400, amount: 19},
            enterprise: {credits: 1000, amount: 49},
        }

        const userId = req.userId;
        const {planId} = req.body as {planId: keyof typeof plans}
        const origin = req.headers.origin as string;

        const plan: Plan = plans[planId]

        if(!plan){
            return res.status(404).json({ message: 'Plan not found' });
        }

        const transaction = await prisma.transaction.create({
            data: {
                userId: userId!,
                planId: req.body.planId,
                amount: plan.amount,
                credits: plan.credits
            }
        })

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

        const session = await stripe.checkout.sessions.create({
                success_url: `${origin}/loading`,
                cancel_url: `${origin}`,
                line_items: [
                    {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `AiSiteBuilder - ${plan.credits} credits`
                        },
                        unit_amount: Math.floor(transaction.amount) * 100
                    },
                    quantity: 1
                    },
                ],
                mode: 'payment',
                metadata: {
                    transactionId: transaction.id,
                    appId: 'ai-site-builder'
                },
                expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // Expires in 30 minutes
                });

        res.json({payment_link: session.url})

    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}