import { createHash } from "node:crypto";
import type { ClinicalEvidenceItem, ClinicalTokenProvenance } from "./types";
import { tokenRect, type SpatialToken } from "./spatial-table";
import type { NormalizedPage } from "@/lib/document-extraction/types";

// Ignore OCR spacing differences, but retain punctuation and symbols because they
// can distinguish comparators, ranges and otherwise identical clinical values.
const canonical = (value: string) => value.normalize("NFKC").toLowerCase().replace(/\s+/gu, "");
const hash = (value: string) => createHash("sha256").update(canonical(value)).digest("hex");

export type ProvenanceResult =
  | { status: "P3"; provenance: ClinicalTokenProvenance }
  | { status: "P2"; reason: "EMPTY_SOURCE_TEXT" | "NO_EXACT_TOKEN_MATCH" | "AMBIGUOUS_TOKEN_MATCH" | "INVALID_TOKEN_ID" | "INVALID_TOKEN_GEOMETRY" };

export function findExactTokenProvenance(sourceText: string, page: number, tokens: SpatialToken[]): ProvenanceResult {
  const wanted=canonical(sourceText);
  if(!wanted) return {status:"P2",reason:"EMPTY_SOURCE_TEXT"};
  const pageTokens=tokens.filter(t=>t.page===page);
  if(new Set(pageTokens.map(t=>t.id)).size!==pageTokens.length||pageTokens.some(t=>!t.id.trim())) return {status:"P2",reason:"INVALID_TOKEN_ID"};
  if(pageTokens.some(t=>!tokenRect(t))) return {status:"P2",reason:"INVALID_TOKEN_GEOMETRY"};
  const matches:Array<{start:number;end:number}> = [];
  for(let start=0;start<pageTokens.length;start++){
    let combined="";
    for(let end=start;end<pageTokens.length&&combined.length<=wanted.length;end++){
      combined+=canonical(pageTokens[end].text);
      if(combined===wanted) matches.push({start,end});
      if(!wanted.startsWith(combined)) break;
    }
  }
  if(!matches.length) return {status:"P2",reason:"NO_EXACT_TOKEN_MATCH"};
  if(matches.length>1) return {status:"P2",reason:"AMBIGUOUS_TOKEN_MATCH"};
  const match=matches[0], selected=pageTokens.slice(match.start,match.end+1);
  const anchors=selected.map(t=>t.textAnchor).filter((a):a is {start:number;end:number}=>Boolean(a));
  const validAnchors=anchors.length===selected.length&&anchors.every((anchor,index)=>Number.isSafeInteger(anchor.start)&&Number.isSafeInteger(anchor.end)&&anchor.start>=0&&anchor.end>=anchor.start&&(index===0||anchor.start>=anchors[index-1].end));
  const confidences=selected.map(t=>t.confidence).filter((v):v is number=>v!==null);
  return {status:"P3",provenance:{level:"P3",page,tokenIds:selected.map(t=>t.id),tokenStartIndex:match.start,tokenEndIndex:match.end,documentTextSpan:validAnchors?{start:anchors[0].start,end:anchors.at(-1)!.end}:null,exactSourceText:selected.map(t=>t.text).join(" "),normalizedSourceHash:hash(sourceText),minimumTokenConfidence:confidences.length===selected.length?Math.min(...confidences):null,matchMethod:"UNIQUE_CONTIGUOUS_TOKEN_SEQUENCE",relationValidation:null}};
}

export function attachExactTokenProvenance(facts: ClinicalEvidenceItem[], tokens: SpatialToken[]): ClinicalEvidenceItem[] {
  return facts.map(fact=>{
    if(fact.tokenProvenance) return fact;
    const result=findExactTokenProvenance(fact.originalText,fact.sourcePage,tokens);
    if(result.status==="P3") return {...fact,tokenProvenance:result.provenance,verificationIssues:(fact.verificationIssues??[]).filter(issue=>issue!=="MISSING_TOKEN_PROVENANCE")};
    return {...fact,tokenProvenance:null,verificationIssues:[...new Set([...(fact.verificationIssues??[]),"MISSING_TOKEN_PROVENANCE",`TOKEN_PROVENANCE_${result.reason}`])]};
  });
}

export function createNativeTokenProvenance(sourceText:string,page:number,tokens:SpatialToken[]):ClinicalTokenProvenance|null{
  if(!tokens.length||new Set(tokens.map(t=>t.id)).size!==tokens.length||tokens.some(t=>t.page!==page||!tokenRect(t))) return null;
  const confidences=tokens.map(t=>t.confidence).filter((v):v is number=>v!==null), anchors=tokens.map(t=>t.textAnchor).filter((a):a is {start:number;end:number}=>Boolean(a));
  return {level:"P3",page,tokenIds:tokens.map(t=>t.id),tokenStartIndex:0,tokenEndIndex:tokens.length-1,documentTextSpan:anchors.length===tokens.length?{start:Math.min(...anchors.map(a=>a.start)),end:Math.max(...anchors.map(a=>a.end))}:null,exactSourceText:sourceText,normalizedSourceHash:hash(sourceText),minimumTokenConfidence:confidences.length===tokens.length?Math.min(...confidences):null,matchMethod:"PARSER_NATIVE_TOKEN_SET",relationValidation:null};
}

export function spatialTokensFromNormalizedPage(page:NormalizedPage):SpatialToken[]{
  return page.tokens.flatMap(token=>{
    const coordinates=token.boundingPoly as SpatialToken["coordinates"]|undefined;
    if(!coordinates?.normalizedVertices?.length) return [];
    return [{id:token.id,text:token.text,page:page.pageNumber,coordinates,confidence:token.confidence??null,textAnchor:token.textAnchor}];
  });
}

export function validateIndependentRelation(provenance: ClinicalTokenProvenance, validation:{method:string;independentSignal:boolean;passed:boolean}):ClinicalTokenProvenance{
  if(!validation.independentSignal||!validation.passed) return provenance;
  return {...provenance,level:"P4",relationValidation:{method:validation.method,independentSignal:true,passed:true}};
}
