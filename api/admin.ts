import type { VercelRequest,VercelResponse } from "@vercel/node";
import { getJson,putJson,requireAdmin,usersKey,profileKey,effectiveRole,displayUsername,canonicalUsername } from "./lib/storage.js";

type UserIndex=Record<string,{userId:string;salt:string;hash:string}>;
function send(res:VercelResponse,status:number,body:unknown){return res.status(status).json(body);}

export default async function handler(req:VercelRequest,res:VercelResponse){
 try{
  const admin=await requireAdmin(req);
  if(!admin)return send(res,403,{error:"אין לך גישה לממשק הניהול"});
  const users=(await getJson<UserIndex>(usersKey))||{};
  if(req.method==="GET"){
   const stats=await getJson<Record<string,any>>("_system/stats.json")||{};
   const list=[];
   for(const [canonical,account] of Object.entries(users)){
    const profile=await getJson<any>(profileKey(account.userId));
    if(profile)list.push({userId:account.userId,username:displayUsername(profile.username||canonical),role:effectiveRole(profile),createdAt:profile.createdAt,avatarUrl:profile.avatarKey?"/api/auth?action=avatar&userId="+encodeURIComponent(account.userId):undefined});
   }
   list.sort((a,b)=>a.username.localeCompare(b.username,"he"));
   return send(res,200,{stats,users:list});
  }
  if(req.method==="PATCH"){
   const body=typeof req.body==="string"?JSON.parse(req.body):(req.body||{});
   const userId=String(body.userId||""); const role=String(body.role||"");
   if(!userId||!["user","admin"].includes(role))return send(res,400,{error:"נתוני הרשאה לא תקינים"});
   if(userId===admin.userId&&role!=="admin")return send(res,400,{error:"אי אפשר להסיר את הרשאת המנהל מהחשבון הנוכחי"});
   const entry=Object.values(users).find(v=>v.userId===userId);
   if(!entry)return send(res,404,{error:"המשתמש לא נמצא"});
   const profile=await getJson<any>(profileKey(userId));
   if(!profile)return send(res,404,{error:"פרופיל המשתמש לא נמצא"});
   profile.role=role;profile.updatedAt=new Date().toISOString();await putJson(profileKey(userId),profile);
   return send(res,200,{user:{userId,username:displayUsername(profile.username),role:effectiveRole(profile)}});
  }
  return send(res,405,{error:"Method not allowed"});
 }catch(error:any){console.error("[VoiceMaster][admin][ERROR]",error?.stack||error);return send(res,500,{error:error?.message||"Admin error"});}
}
