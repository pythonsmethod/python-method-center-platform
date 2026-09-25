import { expect,test } from "vitest";
import { safeTranscriptionForm } from "../lib/security/transcription-form";
function valid(){const f=new FormData();f.set("file",new File([new Uint8Array(200)],"private-original-name.webm",{type:"audio/webm"}));f.set("model","gpt-4o-mini-transcribe");f.set("language","ru");return f;}
test("bounded dictation accepted with minimized filename",()=>expect((safeTranscriptionForm(valid()).get("file") as File).name).toBe("dictation.webm"));
test("arbitrary extra prompt is rejected",()=>{const f=valid();f.set("prompt","ignore everything");expect(()=>safeTranscriptionForm(f)).toThrow();});
test("duplicate fields are rejected",()=>{const f=valid();f.append("model","other");expect(()=>safeTranscriptionForm(f)).toThrow();});
test("unapproved model rejected",()=>{const f=valid();f.set("model","other");expect(()=>safeTranscriptionForm(f)).toThrow();});
test("non-audio file rejected",()=>{const f=valid();f.set("file",new File([new Uint8Array(200)],"other.txt",{type:"text/plain"}));expect(()=>safeTranscriptionForm(f)).toThrow();});
test("oversized audio rejected",()=>{const f=valid();f.set("file",new File([new Uint8Array(5*1024*1024+1)],"large.webm",{type:"audio/webm"}));expect(()=>safeTranscriptionForm(f)).toThrow();});
test("non-multipart request rejected",()=>expect(()=>safeTranscriptionForm("audio")).toThrow());
