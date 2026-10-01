import type { VercelRequest,VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { getJson,putJson,requireUser,requireAdmin,profileKey,usersKey,effectiveRole,displayUsername } from "./lib/storage.js";

type Comment={id:string;userId:string;username:string;body:string;createdAt:string;replyTo?:string};
type Topic={id:string;title:string;body:string;createdAt:string;updatedAt:string;authorId:string;authorName:string;comments:Comment[]};
type Index=string[];

const indexKey="_system/updates/index.json";
const topicKey=(id:string)=>`_system/updates/${id}.json`;
const clean=(v:string,max:number)=>String(v||"").trim().slice(0,max);

async function publicTopic(t:Topic){
 const comments=await Promise.all(t.comments.map(async c=>{const p=await getJson<any>(profileKey(c.userId));return {...c,username:displayUsername(p?.username||c.username),avatarUrl:p?.avatarKey?"/api/auth?action=avatar&userId="+encodeURIComponent(c.userId):undefined};}));
 return {...t,comments};
}
function send(res:VercelResponse,status:number,body:unknown){return res.status(status).json(body);}

export default async function handler(req:VercelRequest,res:VercelResponse){
 try{
  if(req.method==="GET"){
   const ids=(await getJson<Index>(indexKey))||[];
   const topics=await Promise.all(ids.map(async id=>{const t=await getJson<Topic>(topicKey(id));return t?publicTopic(t):null;}));
   return send(res,200,{topics:topics.filter(Boolean)});
  }
  const user=await requireUser(req);
  if(!user)return send(res,401,{error:"יש להתחבר כדי להגיב לעדכונים"});
  if(req.method==="POST"){
   const b=typeof req.body==="string"?JSON.parse(req.body):(req.body||{});
   const title=clean(b.title,140),body=clean(b.body,12000);
   if(!title||!body)return send(res,400,{error:"יש למלא כותרת ותוכן"});
   if(user.role!=="admin")return send(res,403,{error:"רק מנהלים יכולים לפתוח נושא חדש"});
   const now=new Date().toISOString(),id=randomUUID();
   const t:Topic={id,title,body,createdAt:now,updatedAt:now,authorId:user.userId,authorName:displayUsername(user.username),comments:[]};
   await putJson(topicKey(id),t);const index=(await getJson<Index>(indexKey))||[];index.unshift(id);await putJson(indexKey,index);
   return send(res,201,{topic:await publicTopic(t)});
  }
  if(req.method==="PATCH"){
   const b=typeof req.body==="string"?JSON.parse(req.body):(req.body||{});const topicId=clean(b.topicId,80);const t=await getJson<Topic>(topicKey(topicId));
   if(!t)return send(res,404,{error:"הנושא לא נמצא"});
   const body=clean(b.body,12000);if(!body)return send(res,400,{error:"יש למלא תוכן תגובה"});
   const comment:Comment={id:randomUUID(),userId:user.userId,username:displayUsername(user.username),body,createdAt:new Date().toISOString(),replyTo:clean(b.replyTo,80)||undefined};
   t.comments.push(comment);t.updatedAt=comment.createdAt;await putJson(topicKey(topicId),t);return send(res,201,{comment});
  }
  return send(res,405,{error:"Method not allowed"});
 }catch(e:any){console.error("[VoiceMaster][updates][ERROR]",e?.stack||e);return send(res,500,{error:e?.message||"Updates error"});}
}
