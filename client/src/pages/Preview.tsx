import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2Icon } from "lucide-react";
import ProjectPreview from "../components/ProjectPreview";
import type { Project, Version } from "../types";
import api from "@/configs/axios";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";


const Preview = () => {

  const {data: session, isPending} = authClient.useSession()
  const { projectId, versionId } = useParams()
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCode = async () => {
   try {
    const { data } = await api.get(`/api/user/project/${projectId}`)
    const projectData = data.project;
    
    if(!projectData) {
      toast.error("Project not found");
      setLoading(false);
      return;
    }

    setCode(projectData.current_code || '')
    
    if(versionId && projectData.versions){
      const version = projectData.versions.find((v: Version) => v.id === versionId);
      if(version){
        setCode(version.code)
      }
    }
    setLoading(false)
   } catch (error: any) {
    toast.error(error?.response?.data?.message || error.message);
    console.log(error);
    setLoading(false);
   }
  }

  useEffect(()=>{
    if(!isPending && session?.user){
      fetchCode()
    }
  },[session?.user])

  if(loading || (!code && !loading)){
    return (
      <div className='flex flex-col items-center justify-center h-screen gap-4'>
        <Loader2Icon className='size-7 animate-spin text-indigo-200' />
        {!code && !loading && <p className="text-gray-400">Generating preview...</p>}
      </div>
    )
  }
  return (
    <div className="h-screen">
      {code && <ProjectPreview project={{current_code: code} as Project} isGenerating={false} showEditorPanel={false}/>}
    </div>
  )
}

export default Preview
