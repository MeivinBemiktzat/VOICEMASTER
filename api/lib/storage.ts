import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const endpoint = process.env.HF_S3_ENDPOINT || "https://s3.hf.co";
const namespace = process.env.HF_STORAGE_NAMESPACE;
const bucket = process.env.HF_STORAGE_BUCKET;
const secret = process.env.VOICEMASTER_SESSION_SECRET;
const accessKeyId = process.env.HF_S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.HF_S3_SECRET_ACCESS_KEY;
const missing = [["HF_STORAGE_NAMESPACE",namespace],["HF_STORAGE_BUCKET",bucket],["VOICEMASTER_SESSION_SECRET",secret],["HF_S3_ACCESS_KEY_ID",accessKeyId],["HF_S3_SECRET_ACCESS_KEY",secretAccessKey]].filter(([,v])=>!v).map(([n])=>n);
if(missing.length)throw new Error(`Missing environment variables: ${missing.join(", ")}`);

export const s3=new S3Client({region:process.env.HF_S3_REGION||"us-east-1",endpoint:`${endpoint}/${namespace}`,forcePathStyle:true,requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",credentials:{accessKeyId,secretAccessKey}});
export function signSession(id:string){return `${id}.${createHmac("sha256",secret!).update(id).digest("hex")}`;}
export function verifySession(value:string|undefined){if(!value)return null;const[id,sig]=value.split(".");if(!id||!sig||!/^[a-f0-9-]{36}$/.test(id)||!/^[a-f0-9]{64}$/.test(sig))return null;const expected=createHmac("sha256",secret!).update(id).digest("hex");try{return timingSafeEqual(Buffer.from(sig),Buffer.from(expected))?id:null;}catch{return null;}}
export function getSession(req:any,res:any){const cookies=String(req.headers?.cookie||"");const existing=verifySession(cookies.match(/(?:^|;\s*)vm_session=([^;]+)/)?.[1]);if(existing)return existing;const id=randomUUID();res.setHeader("Set-Cookie",`vm_session=${signSession(id)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`);return id;}

export const key=(userId:string,suffix:string)=>`users/${userId}/${suffix}`;
export const statsKey="_system/stats.json";
export const usersKey="_system/users.json";
export const profileKey=(userId:string)=>key(userId,"profile.json");
export const avatarKey=(userId:string,extension:string)=>key(userId,`avatar.${extension}`);

export function canonicalUsername(value:string){return value.trim().replace(/\s+/g,"-").toLocaleLowerCase("he-IL");}
export function displayUsername(value:string){return value.trim().replace(/-/g," ").replace(/\s+/g," ");}
export function seededAdminUsername(value:string){const c=canonicalUsername(value);return c===canonicalUsername("מייבין במקצת")||c===canonicalUsername("אריה AI");}
export function effectiveRole(profile:any):"user"|"admin"{return profile?.role==="admin"?"admin":profile?.role==="user"?"user":seededAdminUsername(profile?.username||"")?"admin":"user";}

export async function requireUser(req:any){
  const raw=String(req.headers?.cookie||"").match(/(?:^|;\s*)vm_auth=([^;]+)/)?.[1];if(!raw)return null;
  try{const[payload,sig]=raw.split(".");if(!payload||!sig)return null;const expected=createHmac("sha256",secret!).update(payload).digest("hex");if(sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null;const parsed=JSON.parse(Buffer.from(payload,"base64url").toString());if(typeof parsed.userId!=="string")return null;const profile=await getJson<any>(profileKey(parsed.userId));return profile?{...profile,role:effectiveRole(profile)}:null;}catch{return null;}
}
export async function requireAdmin(req:any){const user=await requireUser(req);return user?.role==="admin"?user:null;}

export async function putJson(objectKey:string,value:unknown){await s3.send(new PutObjectCommand({Bucket:bucket!,Key:objectKey,Body:JSON.stringify(value),ContentType:"application/json; charset=utf-8"}));}
export async function getJson<T>(objectKey:string):Promise<T|null>{try{const result=await s3.send(new GetObjectCommand({Bucket:bucket!,Key:objectKey}));const text=await result.Body?.transformToString();return text?JSON.parse(text) as T:null;}catch(error:any){if(error?.$metadata?.httpStatusCode===404||error?.name==="NoSuchKey"||error?.name==="NotFound")return null;throw error;}}
export async function getObject(objectKey:string){return s3.send(new GetObjectCommand({Bucket:bucket!,Key:objectKey}));}
export async function putObject(objectKey:string,body:Buffer,contentType:string){await s3.send(new PutObjectCommand({Bucket:bucket!,Key:objectKey,Body:body,ContentType:contentType}));}
export async function objectExists(objectKey:string){try{await s3.send(new HeadObjectCommand({Bucket:bucket!,Key:objectKey}));return true;}catch{return false;}}
export async function signedUpload(objectKey:string,contentType:string){return getSignedUrl(s3,new PutObjectCommand({Bucket:bucket!,Key:objectKey,ContentType:contentType}),{expiresIn:900});}
export async function signedDownload(objectKey:string){return getSignedUrl(s3,new GetObjectCommand({Bucket:bucket!,Key:objectKey}),{expiresIn:3600});}
export async function removeObject(objectKey:string){await s3.send(new DeleteObjectCommand({Bucket:bucket!,Key:objectKey}));}
export async function listKeys(prefix:string){const result=await s3.send(new ListObjectsV2Command({Bucket:bucket!,Prefix:prefix}));return(result.Contents||[]).map(i=>i.Key).filter(Boolean) as string[];}
export async function ensureProfile(userId:string){if(await objectExists(profileKey(userId)))return false;await putJson(profileKey(userId),{userId,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),role:"user"});return true;}
export async function updateStats(delta:Record<string,number>){const current=(await getJson<Record<string,any>>(statsKey))||{users:0,voiceoversCreated:0,voiceoversToday:0,totalCharacters:0,lastUpdated:new Date().toISOString()};for(const[n,a]of Object.entries(delta))current[n]=Number(current[n]||0)+a;current.lastUpdated=new Date().toISOString();await putJson(statsKey,current);return current;}
