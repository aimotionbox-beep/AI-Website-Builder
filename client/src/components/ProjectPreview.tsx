import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Project } from '../types';
import { iframeScript } from '../assets/assets';
import EditorPanel from './EditorPanel';
import LoaderSteps from './LoaderSteps';
import { SandpackProvider, SandpackLayout, SandpackCodeEditor, SandpackPreview } from "@codesandbox/sandpack-react";

interface ProjectPreviewProps {
    project: Project;
    isGenerating: boolean;
    device?: 'phone' | 'tablet' | 'desktop';
    showEditorPanel?: boolean;
}

export interface ProjectPreviewRef {
    getCode: ()=> string | undefined;
}

const ProjectPreview = forwardRef<ProjectPreviewRef, ProjectPreviewProps>(({project, isGenerating, device = 'desktop', showEditorPanel = true}, ref) => {

    const iframeRef = useRef<HTMLIFrameElement>(null)
    const [selectedElement, setSelectedElement] = useState<any>(null)

    const resolutions = {
        phone: 'w-[412px]',
        tablet: 'w-[768px]',
        desktop: 'w-full'
    }

    useImperativeHandle(ref, ()=>({
        getCode: ()=>{
            const doc = iframeRef.current?.contentDocument;
            // If we are in file view mode (no iframe document), return the original code (JSON or HTML)
            if(!doc) {
                return project.current_code;
            }

             // 1. Remove our selection class / attributes / outline from all elements
             doc.querySelectorAll('.ai-selected-element,[data-ai-selected]').forEach((el)=>{
                el.classList.remove('ai-selected-element');
                el.removeAttribute('data-ai-selected');
                (el as HTMLElement).style.outline = '';
             })

             // 2. Remove injected style + script from the document
             const previewStyle = doc.getElementById('ai-preview-style');
             if(previewStyle) previewStyle.remove();

             const previewScript = doc.getElementById('ai-preview-script');
             if (previewScript) previewScript.remove()

            // 3. Serialize clean HTML
            const html = doc.documentElement.outerHTML;
            return html;
        }
    }))

    // Check if code is JSON (Full Stack Structure)
    let isJson = false;
    let projectStructure = null;
    let sandpackFiles: any = {};
    let sandpackTemplate: any = 'react';

    try {
        if(project.current_code) {
            projectStructure = JSON.parse(project.current_code);
            if (projectStructure && projectStructure.files && Array.isArray(projectStructure.files)) {
                isJson = true;
                sandpackTemplate = projectStructure.template || 'react';
                
                // Construct Sandpack files
                projectStructure.files.forEach((f: any) => {
                    let path = f.path;
                    // Normalize path: strip client/ prefix if present to make it root for preview
                    if (path.startsWith('client/')) path = path.replace('client/', '');
                    if (path.startsWith('/client/')) path = path.replace('/client/', '');

                    // Skip server files for client-side preview
                    if (path.startsWith('server/') || path.startsWith('/server/')) return;

                    // Ensure leading slash
                    if (!path.startsWith('/')) path = '/' + path;

                    sandpackFiles[path] = f.content;
                });
            }
        }
    } catch (e) {
        // Not JSON
    }

    useEffect(()=>{
        const handleMessage = (event: MessageEvent)=>{
            if(event.data.type === 'ELEMENT_SELECTED'){
                setSelectedElement(event.data.payload);
            }else if(event.data.type === 'CLEAR_SELECTION'){
                setSelectedElement(null)
            }
        }
        window.addEventListener('message', handleMessage);
        return ()=> window.removeEventListener('message', handleMessage)
    },[])

    const handleUpdate = (updates: any)=>{
        if(iframeRef.current?.contentWindow){
            iframeRef.current.contentWindow.postMessage({
                type: 'UPDATE_ELEMENT',
                payload: updates
            }, '*')
        }
    }

    const injectPreview = (html: string)=>{
        if(!html) return '';
        if(!showEditorPanel) return html

        if(html.includes('</body>')){
            return html.replace('</body>', iframeScript + '</body>')
        }else{
            return html + iframeScript;
        }
    }

  return (
    <div className='relative h-full bg-gray-900 flex-1 rounded-xl overflow-hidden max-sm:ml-2'>
      {project.current_code ? (
        isJson ? (
            <SandpackProvider 
                template={sandpackTemplate} 
                files={sandpackFiles} 
                theme="dark"
                options={{
                    externalResources: ["https://cdn.tailwindcss.com"]
                }}
                className="h-full w-full"
            >
                <SandpackLayout className="h-full w-full !rounded-none !border-none">
                    <SandpackCodeEditor 
                        showTabs 
                        closableTabs 
                        showLineNumbers 
                        showInlineErrors 
                        wrapContent 
                        style={{height: '100%'}} 
                    />
                    <SandpackPreview 
                        showNavigator 
                        showRefreshButton 
                        showOpenInCodeSandbox={false} 
                        style={{height: '100%'}} 
                    />
                </SandpackLayout>
            </SandpackProvider>
        ) : (
        <>
        <iframe 
        ref={iframeRef}
        srcDoc={injectPreview(project.current_code)}
        className={`h-full max-sm:w-full ${resolutions[device]} mx-auto transition-all`}
        />
        {showEditorPanel && selectedElement && (
            <EditorPanel selectedElement={selectedElement}
            onUpdate={handleUpdate} onClose={()=>{
                setSelectedElement(null);
                if(iframeRef.current?.contentWindow){
                    iframeRef.current.contentWindow.postMessage({type: 'CLEAR_SELECTION_REQUEST'}, '*')
                }
            }}/>
        )}
        </>
        )
      ): isGenerating && (
        <LoaderSteps />
      )}
    </div>
  )
})

export default ProjectPreview
