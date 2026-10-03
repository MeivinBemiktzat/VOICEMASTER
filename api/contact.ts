import type { VercelRequest,VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { getJson,putJson,requireUser,requireAdmin,displayUsername } from "./lib/storage.js";
type Contact={id:string;userId:string;username:string;type:string;subject:string;body:string;rating?:number;createdAt:string};
const key="_system/contacts/index.json"; const clean=(v:string,max:number)=>String(v||"").trim().slice(0,max);
const send=(r:VercelResponse,s:number,b:unknown)=>r.status(s).json(b);
export default async function handler(req:VercelRequest,res:VercelResponse){try{const user=await requireUser(req);if(!user)return send(res,401,{error:"יש להתחבר"});
if(req.method==="GET"){if(user.role!=="admin")return send(res,403,{error:"אין לך גישה"});return send(res,200,{contacts:(await getJson<Contact[]>(key))||[]});}
if(req.method==="POST"){const b=typeof req.body==="string"?JSON.parse(req.body):(req.body||{});const type=clean(b.type,60),subject=clean(b.subject,160),body=clean(b.body,12000);const rating=Number(b.rating)||undefined;if(!type||!body)return send(res,400,{error:"יש למלא סוג פנייה ותוכן"});if(type==="משוב"&&(rating===undefined||rating<1||rating>5))return send(res,400,{error:"במשוב יש לבחור דירוג בין 1 ל-5"});const item:Contact={id:randomUUID(),userId:user.userId,username:displayUsername(user.username),type,subject,body,rating,createdAt:new Date().toISOString()};const all=(await getJson<Contact[]>(key))||[];all.unshift(item);await putJson(key,all);return send(res,201,{contact:item});}
if(req.method==="DELETE"){if(user.role!=="admin")return send(res,403,{error:"אין לך גישה"});const id=clean((typeof req.body==="string"?JSON.parse(req.body):req.body||{}).id,80);const all=(await getJson<Contact[]>(key))||[];await putJson(key,all.filter(x=>x.id!==id));return send(res,200,{ok:true});}
return send(res,405,{error:"Method not allowed"});}catch(e:any){return send(res,500,{error:e?.message||"Contact error"});}}