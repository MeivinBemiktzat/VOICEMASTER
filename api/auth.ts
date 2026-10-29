import type { VercelRequest,VercelResponse } from "@vercel/node";
import { randomUUID,scryptSync,randomBytes,timingSafeEqual,createHmac } from "node:crypto";
import { getJson,putJson,putObject,removeObject,profileKey,avatarKey,usersKey,canonicalUsername,displayUsername,effectiveRole,seededAdminUsername,getObject } from "./lib/storage.js";

export const config = { api: { bodyParser: false } };\n\ntype UserIndex=Record<string,{userId:string;salt:string;hash:string}>;
type Profile={userId:string;username:string;createdAt:string;updatedAt:string;role?:"user"|"admin";avatarKey?:string;avatarContentType?:string};
const secret=process.env.VOICEMASTER_SESSION_SECRET!;
function send(res:VercelResponse,status:number,body:unknown){return res.status(status).json(body);}
function hashPassword(password:string,salt:string){return scryptSync(password,salt,64).toString("hex");}
function authToken(userId:string){const payload=Buffer.from(JSON.stringify({userId})).toString("base64url");return payload+"."+createHmac("sha256",secret).update(payload).digest("hex");}
function setAuth(res:VercelResponse,userId:string){res.setHeader("Set-Cookie","vm_auth="+authToken(userId)+"; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000");}
function clearAuth(res:VercelResponse){res.setHeader("Set-Cookie","vm_auth=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");}
function getAuth(req:VercelRequest){const raw=String(req.headers.cookie||"").match(/(?:^|;\s*)vm_auth=([^;]+)/)?.[1];if(!raw)return null;try{const[payload,sig]=raw.split(".");if(!payload||!sig)return null;const expected=createHmac("sha256",secret).update(payload).digest("hex");if(sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null;const parsed=JSON.parse(Buffer.from(payload,"base64url").toString());return typeof parsed.userId==="string"?parsed.userId:null;}catch{return null;}}
function publicUser(p:Profile){return{userId:p.userId,username:displayUsername(p.username),role:effectiveRole(p),avatarUrl:p.avatarKey?"/api/auth?action=avatar":undefined};}
async function rawBody(req:VercelRequest):Promise<Buffer>{
 const body=(req as any).body;
 if(Buffer.isBuffer(body))return body;
 if(body instanceof Uint8Array)return Buffer.from(body);
 if(body instanceof ArrayBuffer)return Buffer.from(body);
 if(typeof body==="string")return Buffer.from(body);
 if(body&&typeof body==="object")return Buffer.from(JSON.stringify(body));
 const chunks:Buffer[]=[];
 for await (const chunk of req as any) chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk));
 return Buffer.concat(chunks);
}
async function bodyJson(req:VercelRequest){const bytes=await rawBody(req);if(!bytes.length)return {};return JSON.parse(bytes.toString("utf8"));}
async function migrateAvatar(p:Profile){const old=(p as any).avatarDataUrl;if(!old||p.avatarKey)return p;const m=String(old).match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/);if(!m)return p;const type=m[1],ext=m[2]==="jpeg"||m[2]==="jpg"?"jpg":m[2],k=avatarKey(p.userId,ext);await putObject(k,Buffer.from(m[3],"base64"),type);const updated:any={...p,avatarKey:k,avatarContentType:type,updatedAt:new Date().toISOString()};delete updated.avatarDataUrl;await putJson(profileKey(p.userId),updated);return updated;}

export default async function handler(req:VercelRequest,res:VercelResponse){
 try{
  const action=String(req.query.action||"");const users=(await getJson<UserIndex>(usersKey))||{};
  if(req.method==="POST"&&action==="register"){const b=await bodyJson(req),input=String(b.username||"").trim(),password=String(b.password||""),canonical=canonicalUsername(input);if(canonical.length<3||canonical.length>40)return send(res,400,{error:"שם המשתמש חייב להכיל 3–40 תווים"});if(password.length<6)return send(res,400,{error:"הסיסמה חייבת להכיל לפחות 6 תווים"});if(users[canonical])return send(res,409,{error:"שם המשתמש כבר קיים"});const userId=randomUUID(),salt=randomBytes(16).toString("hex");users[canonical]={userId,salt,hash:hashPassword(password,salt)};await putJson(usersKey,users);const now=new Date().toISOString();const profile:Profile={userId,username:displayUsername(canonical),createdAt:now,updatedAt:now,role:seededAdminUsername(canonical)?"admin":"user"};await putJson(profileKey(userId),profile);const{updateStats}=await import("./lib/storage.js");await updateStats({users:1});setAuth(res,userId);return send(res,201,{user:publicUser(profile)});}
  if(req.method==="POST"&&action==="login"){const b=await bodyJson(req),input=String(b.username||"").trim(),password=String(b.password||""),account=users[canonicalUsername(input)];if(!account)return send(res,401,{error:"שם המשתמש או הסיסמה שגויים"});const actual=Buffer.from(hashPassword(password,account.salt),"hex"),expected=Buffer.from(account.hash,"hex");if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return send(res,401,{error:"שם המשתמש או הסיסמה שגויים"});let profile=await getJson<Profile>(profileKey(account.userId));if(!profile)return send(res,401,{error:"פרופיל המשתמש לא נמצא"});profile=await migrateAvatar(profile);const shown=displayUsername(canonicalUsername(profile.username));if(profile.username!==shown){profile={...profile,username:shown,updatedAt:new Date().toISOString()};await putJson(profileKey(profile.userId),profile);}setAuth(res,account.userId);return send(res,200,{user:publicUser(profile)});}
  if(req.method==="POST"&&action==="logout"){clearAuth(res);return send(res,200,{ok:true});}
  const userId=getAuth(req);if(!userId)return send(res,401,{error:"יש להתחבר כדי להמשיך"});let profile=await getJson<Profile>(profileKey(userId));if(!profile)return send(res,401,{error:"פרופיל המשתמש לא נמצא"});profile=await migrateAvatar(profile);
  if(req.method==="GET"&&action==="me")return send(res,200,{user:publicUser(profile)});
  if(req.method==="POST"&&action==="avatar"){const type=String(req.headers["content-type"]||"").split(";")[0].toLowerCase();if(!["image/png","image/jpeg","image/webp"].includes(type))return send(res,400,{error:"יש להעלות PNG, JPG או WebP"});const bytes=await rawBody(req);if(!bytes.length)return send(res,400,{error:"לא התקבלו נתוני תמונה. נסו להעלות את התמונה שוב."});const ext=type==="image/png"?"png":type==="image/webp"?"webp":"jpg";const k=avatarKey(userId,ext);await putObject(k,bytes,type);if(profile.avatarKey&&profile.avatarKey!==k)await removeObject(profile.avatarKey).catch(()=>{});const updated:any={...profile,avatarKey:k,avatarContentType:type,updatedAt:new Date().toISOString()};delete updated.avatarDataUrl;await putJson(profileKey(userId),updated);return send(res,200,{user:publicUser(updated)});}
  if(req.method==="GET"&&action==="avatar"){if(!profile.avatarKey)return res.status(404).send("No profile image");const result=await getObject(profile.avatarKey),bytes=await result.Body?.transformToByteArray();if(!bytes)return res.status(404).send("No profile image");res.setHeader("Content-Type",profile.avatarContentType||"image/jpeg");res.setHeader("Cache-Control","private, max-age=300");return res.status(200).send(Buffer.from(bytes));}
  return send(res,405,{error:"Method not allowed"});
 }catch(error:any){console.error("[VoiceMaster][auth][ERROR]",error?.stack||error);return send(res,500,{error:error?.message||"Auth error"});}
}
