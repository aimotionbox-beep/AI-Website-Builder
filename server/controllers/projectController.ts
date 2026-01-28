import {Request, Response} from 'express'
import prisma from '../lib/prisma.js';
import openai from '../configs/openai.js';
import archiver from 'archiver';

// Controller Function to Make Revision
export const makeRevision = async (req: Request, res: Response) => {
    const userId = req.userId;

    try {
        
        const {projectId} = req.params;
        const {message} = req.body;

        const user = await prisma.user.findUnique({
            where: {id: userId}
        })

        if(!userId || !user){
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if(user.credits < 5){
            return res.status(403).json({ message: 'add more credits to make changes' });
        }

        if(!message || message.trim() === ''){
            return res.status(400).json({ message: 'Please enter a valid prompt' });
        }

        const currentProject = await prisma.websiteProject.findUnique({
            where: {id: projectId, userId},
            include: {versions: true}
        })

        if(!currentProject){
            return res.status(404).json({ message: 'Project not found' });
        }

        await prisma.conversation.create({
            data: {
                role: 'user',
                content: message,
                projectId
            }
        })

        await prisma.user.update({
            where: {id: userId},
            data: {credits: {decrement: 5}}
        })

        // Enhance user prompt
        const promptEnhanceResponse = await openai.chat.completions.create({
            model: 'openai/gpt-5.2-codex',
            messages: [
                {
                    role: 'system',
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
                    role: 'user',
                    content: `User's request: "${message}"`
                }
            ]
        })

        const enhancedPrompt = promptEnhanceResponse.choices[0].message.content;

        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: `I've enhanced your prompt to: "${enhancedPrompt}"`,
                projectId
            }
        })
        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: 'Now making changes to your website...',
                projectId
            }
        })

        // Extract HTML from current code (JSON or string)
        let currentHtml = currentProject.current_code;
        try {
            const json = JSON.parse(currentHtml);
            if(json.files) {
                 const indexFile = json.files.find((f:any) => f.path === '/index.html' || f.path === 'index.html');
                 if(indexFile) currentHtml = indexFile.content;
            }
        } catch(e) {
            // It's raw HTML, use as is
        }

        // Generate website code
        const codeGenerationResponse = await openai.chat.completions.create({
            model: 'openai/gpt-5.2-codex',
            messages: [
                {
                    role: 'system',
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
                    role: 'user',
                    content: `
                    Here is the current website code: "${currentHtml}" The user wants this change: "${enhancedPrompt}"`
                }
            ]
        })

        const generatedHtml = codeGenerationResponse.choices[0].message.content || '';

        if(!generatedHtml){
             await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: "Unable to generate the code, please try again",
                projectId
            }
        })
        await prisma.user.update({
            where: {id: userId},
            data: {credits: {increment: 5}}
        })
        return;
        }

        // Wrap HTML in JSON structure for Sandpack
        const projectStructure = {
            template: 'static',
            files: [
                {
                    path: '/index.html',
                    content: generatedHtml.replace(/```[a-z]*\n?/gi, '')
                        .replace(/```$/g, '')
                        .trim()
                }
            ]
        };
        const code = JSON.stringify(projectStructure);

        const version = await prisma.version.create({
            data: {
                code,
                description: 'changes made',
                projectId
            }
        })

        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: "I've made the changes to your website! You can now preview it",
                projectId
            }
        })

        await prisma.websiteProject.update({
            where: {id: projectId},
            data: {
                current_code: code,
                current_version_index: version.id
            }
        })
        

        res.json({message: 'Changes made successfully'})
    } catch (error : any) {
        await prisma.user.update({
            where: {id: userId},
            data: {credits: {increment: 5}}
        })
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// Controller Function to rollback to a specific version
export const rollbackToVersion = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if(!userId){
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { projectId, versionId } = req.params;

        const project = await prisma.websiteProject.findUnique({
            where: {id: projectId, userId},
            include: {versions: true}
        })

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const version = project.versions.find((version)=>version.id === versionId);

        if(!version){
            return res.status(404).json({ message: 'Version not found' });
        }

        await prisma.websiteProject.update({
            where: {id: projectId, userId},
            data: {
                current_code: version.code,
                current_version_index: version.id
            }
        })

        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: "I've rolled back your website to selected version. You can now preview it",
                projectId
            }
        })

        res.json({ message: 'Version rolled back' });
    } catch (error : any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// Controller Function to Delete a Project
export const deleteProject = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const { projectId } = req.params;

        await prisma.websiteProject.delete({
            where: {id: projectId, userId},
        })

        res.json({ message: 'Project deleted successfully' });
    } catch (error : any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// Controller for getting project code for preview
export const getProjectPreview = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const { projectId } = req.params;

        if(!userId){
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const project = await prisma.websiteProject.findFirst({
            where: {id: projectId, userId},
            include: {versions: true}
        })

        if(!project){
            return res.status(404).json({ message: 'Project not found' });
        }

        res.json({ project });
    } catch (error : any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// Get published projects
export const getPublishedProjects = async (req: Request, res: Response) => {
    try {
       
        const projects = await prisma.websiteProject.findMany({
            where: {isPublished: true},
            include: {user: true}
        })

        res.json({ projects });
    } catch (error : any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// Get a single project by id
export const getProjectById = async (req: Request, res: Response) => {
    try {
       const { projectId } = req.params;

        const project = await prisma.websiteProject.findFirst({
            where: {id: projectId},
        })

        if(!project || project.isPublished === false || !project?.current_code){
            return res.status(404).json({ message: 'Project not found' });
        }

        res.json({ code: project.current_code });
    } catch (error : any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// Controller to save project code
export const saveProjectCode = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const { projectId } = req.params;
        const {code} = req.body;

        if(!userId){
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if(!code){
            return res.status(400).json({ message: 'Code is required' });
        }

        const project = await prisma.websiteProject.findUnique({
            where: {id: projectId, userId}
        })

        if(!project){
            return res.status(404).json({ message: 'Project not found' });
        }

        await prisma.websiteProject.update({
            where: {id: projectId},
            data: {current_code: code, current_version_index: ''}
        })

        res.json({ message: 'Project saved successfully' });
    } catch (error : any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// Controller to Download Project as ZIP
export const downloadProject = async (req: Request, res: Response) => {
    try {
        const { code, projectName } = req.body;

        if (!code) {
            return res.status(400).json({ message: 'Code is required' });
        }

        const safeProjectName = (projectName || 'project').replace(/[^a-z0-9]/gi, '_').toLowerCase();

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${safeProjectName}.zip"`);

        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        archive.on('error', function(err: any) {
            res.status(500).send({message: err.message});
        });

        archive.pipe(res);

        // Try to parse JSON structure robustly
        let isJson = false;
        let projectStructure: any = null;
        try {
            projectStructure = JSON.parse(code);
        } catch (e) {
            try {
                const match = code.match(/```json\n?([\s\S]*?)\n?```/);
                if (match) {
                    projectStructure = JSON.parse(match[1]);
                } else {
                    const clean = code.replace(/```json/g, '').replace(/```/g, '').trim();
                    projectStructure = JSON.parse(clean);
                }
            } catch (e2) {
                // Not JSON, will treat as HTML string
            }
        }

        if (projectStructure && projectStructure.files && Array.isArray(projectStructure.files)) {
            isJson = true;
        }

        if (isJson && projectStructure) {
            // Add all files from structured JSON
            projectStructure.files.forEach((file: any) => {
                let path = file.path;
                if (!path) return;

                // Normalize leading slash for zip
                if (path.startsWith('/')) path = path.substring(1);

                // Ensure content exists
                const content = typeof file.content === 'string' ? file.content : JSON.stringify(file.content ?? '', null, 2);
                archive.append(content, { name: path });
            });
        } else {
            // Fallback: single-page HTML with minimal backend scaffold
            archive.append(code, { name: 'frontend/index.html' });

            const packageJson = {
                name: safeProjectName,
                version: '1.0.0',
                description: 'Generated by AI Website Builder',
                main: 'server.js',
                scripts: {
                    start: 'node server.js',
                    dev: 'nodemon server.js'
                },
                dependencies: {
                    express: '^4.18.2',
                    dotenv: '^16.3.1'
                },
                devDependencies: {
                    nodemon: '^3.0.1'
                }
            };
            archive.append(JSON.stringify(packageJson, null, 2), { name: 'backend/package.json' });

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
            archive.append(serverJs, { name: 'backend/server.js' });
            archive.append('PORT=3000', { name: 'backend/.env.example' });

            const readme = `
# ${projectName || 'AI Generated Project'}
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
            archive.append(readme, { name: 'README.md' });
        }

        await archive.finalize();
    } catch (error: any) {
        console.log(error.code || error.message);
        if (!res.headersSent) {
            res.status(500).json({ message: error.message });
        }
    }
}
