import prisma from '../lib/prisma.js';
import openai from '../configs/openai.js';
import archiver from 'archiver';
// Controller Function to Make Revision
export const makeRevision = async (req, res) => {
    const userId = req.userId;
    try {
        const { projectId } = req.params;
        const { message } = req.body;
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });
        if (!userId || !user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        if (user.credits < 5) {
            return res.status(403).json({ message: 'add more credits to make changes' });
        }
        if (!message || message.trim() === '') {
            return res.status(400).json({ message: 'Please enter a valid prompt' });
        }
        const currentProject = await prisma.websiteProject.findUnique({
            where: { id: projectId, userId },
            include: { versions: true }
        });
        if (!currentProject) {
            return res.status(404).json({ message: 'Project not found' });
        }
        await prisma.conversation.create({
            data: {
                role: 'user',
                content: message,
                projectId
            }
        });
        await prisma.user.update({
            where: { id: userId },
            data: { credits: { decrement: 5 } }
        });
        // 🔹 PROMPT ENHANCEMENT
        // ===============================
        const promptEnhanceResponse = await openai.chat.completions.create({
            model: 'openai/gpt-3.5-turbo',
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
        });
        const enhancedPrompt = promptEnhanceResponse.choices[0].message.content;
        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: `I've enhanced your prompt to: "${enhancedPrompt}"`,
                projectId
            }
        });
        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: 'Now making changes to your website...',
                projectId
            }
        });
        // 🔹 CODE GENERATION
        // ===============================
        const codeGenerationResponse = await openai.chat.completions.create({
            model: 'openai/gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: `
                    You are an expert full-stack developer. Update the project code based on the user's request.

                    CRITICAL REQUIREMENTS:
                    1.  **Full Stack & Flexibility**: Do NOT restrict yourself to static HTML unless explicitly requested. Maintain the existing stack if possible, or migrate/update as requested.
                    2.  **Output Format**: You MUST return a single valid JSON object containing the complete file structure.
                        The JSON schema must be:
                        \`\`\`json
                        {
                          "type": "project-structure",
                          "template": "react", // Options: "react", "react-ts", "vue", "vue-ts", "vanilla", "vanilla-ts", "angular", "svelte", "solid", "node"
                          "stack": "e.g., react-node, nextjs, html-css",
                          "files": [
                            {
                              "path": "path/to/file.ext",
                              "content": "file content here"
                            }
                          ]
                        }
                        \`\`\`
                    3.  **Preview & Runtime Compatibility**:
                        - The generated code will be previewed in a **client-side sandbox** (Sandpack).
                        - **Frontend**: Ensure the frontend is fully functional in the preview. Use standard imports.
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
                        - Include ALL necessary configuration files.
                        - Ensure the code is production-ready.
                    5.  **Output Format**: Return the valid JSON object wrapped in a markdown code block (\`\`\`json ... \`\`\`).
                    `
                },
                {
                    role: 'user',
                    content: `
                    Here is the current website code (it might be JSON or HTML): "${currentProject.current_code}" The user wants this change: "${enhancedPrompt}"`
                }
            ]
        });
        const code = codeGenerationResponse.choices[0].message.content || '';
        if (!code) {
            await prisma.conversation.create({
                data: {
                    role: 'assistant',
                    content: "Unable to generate the code, please try again",
                    projectId
                }
            });
            await prisma.user.update({
                where: { id: userId },
                data: { credits: { increment: 5 } }
            });
            return;
        }
        // Extract JSON from markdown if present
        const jsonMatch = code.match(/```json\n?([\s\S]*?)\n?```/);
        const cleanCode = jsonMatch ? jsonMatch[1].trim() : code.trim();
        const version = await prisma.version.create({
            data: {
                code: cleanCode,
                description: 'changes made',
                projectId
            }
        });
        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: "I've made the changes to your website! You can now preview it",
                projectId
            }
        });
        await prisma.websiteProject.update({
            where: { id: projectId },
            data: {
                current_code: cleanCode,
                current_version_index: version.id
            }
        });
        res.json({ message: 'Changes made successfully' });
    }
    catch (error) {
        await prisma.user.update({
            where: { id: userId },
            data: { credits: { increment: 5 } }
        });
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
};
// Controller Function to rollback to a specific version
export const rollbackToVersion = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { projectId, versionId } = req.params;
        const project = await prisma.websiteProject.findUnique({
            where: { id: projectId, userId },
            include: { versions: true }
        });
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        const version = project.versions.find((version) => version.id === versionId);
        if (!version) {
            return res.status(404).json({ message: 'Version not found' });
        }
        await prisma.websiteProject.update({
            where: { id: projectId, userId },
            data: {
                current_code: version.code,
                current_version_index: version.id
            }
        });
        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: "I've rolled back your website to selected version. You can now preview it",
                projectId
            }
        });
        res.json({ message: 'Version rolled back' });
    }
    catch (error) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
};
// Controller Function to Delete a Project
export const deleteProject = async (req, res) => {
    try {
        const userId = req.userId;
        const { projectId } = req.params;
        await prisma.websiteProject.delete({
            where: { id: projectId, userId },
        });
        res.json({ message: 'Project deleted successfully' });
    }
    catch (error) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
};
// Controller for getting project code for preview
export const getProjectPreview = async (req, res) => {
    try {
        const userId = req.userId;
        const { projectId } = req.params;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const project = await prisma.websiteProject.findUnique({
            where: { id: projectId },
            include: { versions: true }
        });
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        if (project.userId !== userId) {
            return res.status(403).json({ message: 'Unauthorized access' });
        }
        res.json({ project });
    }
    catch (error) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
};
// Get published projects
export const getPublishedProjects = async (req, res) => {
    try {
        const projects = await prisma.websiteProject.findMany({
            where: { isPublished: true },
            include: { user: true }
        });
        res.json({ projects });
    }
    catch (error) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
};
// Get a single project by id
export const getProjectById = async (req, res) => {
    try {
        const { projectId } = req.params;
        const project = await prisma.websiteProject.findFirst({
            where: { id: projectId },
        });
        if (!project || project.isPublished === false || !project?.current_code) {
            return res.status(404).json({ message: 'Project not found' });
        }
        res.json({ code: project.current_code });
    }
    catch (error) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
};
// Controller to save project code
export const saveProjectCode = async (req, res) => {
    try {
        const userId = req.userId;
        const { projectId } = req.params;
        const { code } = req.body;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        if (!code) {
            return res.status(400).json({ message: 'Code is required' });
        }
        const project = await prisma.websiteProject.findUnique({
            where: { id: projectId, userId }
        });
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        await prisma.websiteProject.update({
            where: { id: projectId },
            data: { current_code: code, current_version_index: '' }
        });
        res.json({ message: 'Project saved successfully' });
    }
    catch (error) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
};
// Controller to Download Project as ZIP
export const downloadProject = async (req, res) => {
    try {
        const { code, projectName } = req.body;
        if (!code) {
            return res.status(400).json({ message: 'Code is required' });
        }
        const safeProjectName = (projectName || 'project').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${safeProjectName}.zip"`);
        const archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level.
        });
        archive.on('error', function (err) {
            res.status(500).send({ message: err.message });
        });
        archive.pipe(res);
        // Check if code is JSON (Full Stack Structure)
        let isJson = false;
        let projectStructure = null;
        try {
            // Try standard parse
            projectStructure = JSON.parse(code);
        }
        catch (e) {
            try {
                // Try to extract JSON from markdown if present
                const match = code.match(/```json\n?([\s\S]*?)\n?```/);
                if (match) {
                    projectStructure = JSON.parse(match[1]);
                }
                else {
                    // Try removing markdown without regex if above failed
                    const clean = code.replace(/```json/g, '').replace(/```/g, '').trim();
                    projectStructure = JSON.parse(clean);
                }
            }
            catch (e2) {
                // Not JSON, treat as string (HTML)
            }
        }
        if (projectStructure && projectStructure.files && Array.isArray(projectStructure.files)) {
            isJson = true;
        }
        if (isJson && projectStructure) {
            // Full Stack JSON Structure
            projectStructure.files.forEach((file) => {
                let path = file.path;
                // Remove leading slash if present to avoid absolute path issues in zip
                if (path.startsWith('/'))
                    path = path.substring(1);
                if (path && file.content) {
                    archive.append(file.content, { name: path });
                }
            });
        }
        else {
            // Legacy/HTML Fallback Structure
            // 1. Frontend Source Code (public/index.html)
            archive.append(code, { name: 'frontend/index.html' });
            // 2. Backend Source Code
            // package.json
            const packageJson = {
                "name": safeProjectName,
                "version": "1.0.0",
                "description": "Generated by AI Website Builder",
                "main": "server.js",
                "scripts": {
                    "start": "node server.js",
                    "dev": "nodemon server.js"
                },
                "dependencies": {
                    "express": "^4.18.2",
                    "dotenv": "^16.3.1"
                },
                "devDependencies": {
                    "nodemon": "^3.0.1"
                }
            };
            archive.append(JSON.stringify(packageJson, null, 2), { name: 'backend/package.json' });
            // server.js
            const serverJs = `
const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Handle all routes by serving index.html (SPA fallback)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
    console.log(\`Server is running on http://localhost:\${PORT}\`);
});
`;
            archive.append(serverJs, { name: 'backend/server.js' });
            // .env.example
            archive.append('PORT=3000', { name: 'backend/.env.example' });
            // 3. Root README
            const readme = `
# ${projectName || 'AI Generated Project'}

This project was generated by AI Website Builder.

## Structure

- \`frontend/\`: Contains the static assets and HTML.
- \`backend/\`: Contains a simple Express server to serve the frontend.

## Getting Started

1. Navigate to the backend directory:
   \`\`\`bash
   cd backend
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

3. Start the server:
   \`\`\`bash
   npm start
   \`\`\`

4. Open your browser and visit \`http://localhost:3000\`.
`;
            archive.append(readme.trim(), { name: 'README.md' });
        }
        // Finalize the archive
        await archive.finalize();
    }
    catch (error) {
        console.log(error.code || error.message);
        // If headers are already sent, we can't send JSON error
        if (!res.headersSent) {
            res.status(500).json({ message: error.message });
        }
    }
};
