import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Project } from '../types';
import { iframeScript } from '../assets/assets';
import EditorPanel from './EditorPanel';
import LoaderSteps from './LoaderSteps';

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
    try {
        if(project.current_code) {
            projectStructure = JSON.parse(project.current_code);
            if (projectStructure && projectStructure.files && Array.isArray(projectStructure.files)) {
                isJson = true;
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
            <div className="h-full w-full overflow-auto p-4 text-white font-mono text-sm">
                <div className="mb-4">
                    <h2 className="text-xl font-bold mb-2">Project Generated: {projectStructure.stack || 'Full Stack'}</h2>
                    <p className="text-gray-400 mb-4">This is a full-stack project. You can browse the files below or download the project to run it.</p>
                </div>
                <div className="space-y-4">
                    {projectStructure.files.map((file: any, index: number) => (
                        <div key={index} className="border border-gray-700 rounded-lg p-3 bg-gray-800">
                            <h3 className="text-indigo-400 font-semibold mb-2">{file.path}</h3>
                            <pre className="overflow-x-auto bg-gray-950 p-2 rounded text-xs text-gray-300">
                                <code>{file.content.slice(0, 300)}...</code>
                            </pre>
                        </div>
                    ))}
                </div>
            </div>
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
