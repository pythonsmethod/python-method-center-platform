import {createHash} from "node:crypto";
import {createSupabaseServiceClient} from "@/lib/supabase/service";
import {assistantSource,renderSourceContext} from "./source-context";

/** An explicit private method source is required; philosophy/general prompts
 * are not a substitute for Karen's clinical protocol. No client projection. */
export async function getPrivateClinicalMethodForReview():Promise<{status:"ready";context:string;version:string}|{status:"missing"|"unavailable"}> {
 const db=createSupabaseServiceClient();if(!db)return {status:"unavailable"};
 const {data,error}=await db.from("assistant_knowledge").select("id,title,content,collection,audience,topic,updated_at")
  .eq("collection","method").eq("audience","staff").eq("topic","clinical_protocol").eq("is_active",true).order("id").limit(41);
 if(error||!data||data.length>40)return {status:"unavailable"};
 if(!data.length)return {status:"missing"};
 if(data.some(r=>r.collection!=="method"||r.audience!=="staff"||r.topic!=="clinical_protocol"||typeof r.content!=="string"||!r.content.trim())||JSON.stringify(data).length>60000)return {status:"unavailable"};
 const version=createHash("sha256").update(JSON.stringify(data)).digest("hex");
 return {status:"ready",version,context:renderSourceContext([assistantSource({id:"karen_private_clinical_method",kind:"center_knowledge",origin:"assistant_knowledge.collection=method;audience=staff",availability:"available",retrievedAt:new Date().toISOString(),scope:"Private designated method sources, version "+version+"; not patient evidence or authorization",data})])};
}
