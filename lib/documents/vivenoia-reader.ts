import {createHash} from "node:crypto";
import type {AssistantResult} from "@/lib/assistant/claude";
import type {ChatAttachment} from "@/lib/assistant/attachments";
import {readExternalDocument,type ExternalDocumentReceipt} from "@/lib/vivenoia/external-document-analysis";
/** PMC resolves owner/Case/source. Clinical prompts and history stay in PMC. */
export function createPmcVivenoiaDocumentReader(input:{operationSeed:string;profileId:string;caseId:string;documentId:string;sourceVersion:string;attachment:ChatAttachment;page:number;pageCount:number;locale:"ru"|"en"}) {
 const subjectId="subject-"+createHash("sha256").update(`${input.profileId}:${input.caseId}`).digest("hex").slice(0,32);
 const receipts:ExternalDocumentReceipt[]=[];
 return {
  receipts,modelVersion:"vivenoia-external-document-analysis-v1",
  async read(stage:string,_system:string,_instruction:string,_maxTokens:number):Promise<AssistantResult>{
   const operationId=createHash("sha256").update(`${input.operationSeed}:${input.sourceVersion}:${input.page}:${stage}`).digest("hex");
   const result=await readExternalDocument({version:"1",operationId,tenantId:"pmc-synthetic-staging",applicationId:"pmc-document-worker",actorId:"pmc-document-worker",subjectId,locale:input.locale,
    stage:stage==="header"?"header":stage==="transcription-first"?"literal-first":"literal-second",
    source:{id:`${subjectId}:${input.documentId}`,version:input.sourceVersion,hash:input.sourceVersion,page:input.page,pageCount:input.pageCount,mediaType:input.attachment.mediaType,
     contentHash:createHash("sha256").update(Buffer.from(input.attachment.data,"base64")).digest("hex"),data:input.attachment.data}});
   if(result.receipt)receipts.push(result.receipt);
   if(result.outcome==="complete")return {status:"ok",reply:result.text.replace(/\[\[DOCUMENT_PAGE_END\]\]/g,"[[PMC_PAGE_END]]")};
   return {status:"error",code:"temporarilyDown",message:"VIVENOIA document reading is unavailable",failureClass:"provider_api"};
  }
 };
}
