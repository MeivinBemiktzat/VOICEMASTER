import type { VercelRequest,VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { getJson,putJson,requireUser,requireAdmin,displayUsername } from "./lib/storage.js";
type Comment={id:string;userId:string;username:string;body:string;createdAt:string;replyTo?:string};
type Topic={id:string;title:string;body:string;createdAt:string;updatedAt:string;authorId:string;authorName:string;comments:Comment[]};
const indexKey="_system/updates/index.json"; const topicKey=(id:string)=>`_system/updates/${id}.json`;
const clean=(v:string,max:number)=>String(v||"").trim().slice(0,max);
const send=(r:VercelResponse,s:number,b:unknown)=>r.status(s).json(b);
export default async function handler(req:VercelRequest,res:VercelResponse){try{
 const ids=(await getJson<string[]>(indexKey))||[];
 if(req.method==="GET"){const topics=await Promise.all(ids.map(async id=>getJson<Topic>(topicKey(id))));return send(res,200,{topics:topics.filter(Boolean)});}
 const user=await requireUser(req);if(!user)return send(res,401,{error:"יש להתחבר"});
 const b=typeof req.body==="string"?JSON.parse(req.body):(req.body||{});const id=clean(b.topicId,80);
 if(req.method==="POST"){if(user.role!=="admin")return send(res,403,{error:"רק מנהלים יכולים לפתוח נושא"});const title=clean(b.title,140),body=clean(b.body,12000);if(!title||!body)return send(res,400,{error:"יש למלא כותרת ותוכן"});const now=new Date().toISOString(),topic:Topic={id:randomUUID(),title,body,createdAt:now,updatedAt:now,authorId:user.userId,authorName:displayUsername(user.username),comments:[]};await putJson(topicKey(topic.id),topic);await putJson(indexKey,[topic.id,...ids]);return send(res,201,{topic});}
 const topic=await getJson<Topic>(topicKey(id));if(!topic)return send(res,404,{error:"הנושא לא נמצא"});
 if(req.method==="PATCH"){if(user.role==="admin" && b.action==="edit"){topic.title=clean(b.title,140);topic.body=clean(b.body,12000);topic.updatedAt=new Date().toISOString();await putJson(topicKey(id),topic);return send(res,200,{topic});}if(user.role==="admin" && b.action==="delete"){await putJson(topicKey(id),null as any);await putJson(indexKey,ids.filter(x=>x!==id));return send(res,200,{ok:true});}const body=clean(b.body,12000);if(!body)return send(res,400,{error:"יש למלא תוכן תגובה"});const comment:Comment={id:randomUUID(),userId:user.userId,username:displayUsername(user.username),body,createdAt:new Date().toISOString(),replyTo:clean(b.replyTo,80)||undefined};topic.comments.push(comment);topic.updatedAt=comment.createdAt;await putJson(topicKey(id),topic);return send(res,201,{comment});}
 if(req.method==="DELETE"){if(user.role!=="admin")return send(res,403,{error:"רק מנהלים יכולים למחוק"});const commentId=clean(b.commentId,80);topic.comments=topic.comments.filter(c=>c.id!==commentId);topic.updatedAt=new Date().toISOString();await putJson(topicKey(id),topic);return send(res,200,{ok:true});}
 if(req.method==="PUT"){if(user.role!=="admin")return send(res,403,{error:"רק מנהלים יכולים לערוך"});const comment=topic.comments.find(c=>c.id===clean(b.commentId,80));if(!comment)return send(res,404,{error:"התגובה לא נמצאה"});comment.body=clean(b.body,12000);topic.updatedAt=new Date().toISOString();await putJson(topicKey(id),topic);return send(res,200,{comment});}
 return send(res,405,{error:"Method not allowed"});
}catch(e:any){console.error("[VoiceMaster][updates]",e?.stack||e);return send(res,500,{error:e?.message||"Updates error"});}}