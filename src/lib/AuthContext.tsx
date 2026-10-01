import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type User = { userId: string; username: string; avatarDataUrl?: string };
type AuthValue = { user: User | null; loading: boolean; register: (username:string,password:string)=>Promise<void>; login:(username:string,password:string)=>Promise<void>; logout:()=>Promise<void>; uploadAvatar:(file:File)=>Promise<void>; };

const AuthContext = createContext<AuthValue | null>(null);
async function call(action:string, body?:unknown, method="POST") {
  const r=await fetch("/api/auth?action="+encodeURIComponent(action), {method, credentials:"same-origin", headers: body ? {"Content-Type":"application/json"} : undefined, body: body ? JSON.stringify(body) : undefined});
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data.error || "שגיאת התחברות");
  return data;
}
export function AuthProvider({children}:{children:ReactNode}) {
  const [user,setUser]=useState<User|null>(null); const [loading,setLoading]=useState(true);
  useEffect(()=>{ call("me",undefined,"GET").then(d=>setUser(d.user)).catch(()=>setUser(null)).finally(()=>setLoading(false)); },[]);
  const register=async(username:string,password:string)=>{const d=await call("register",{username,password});setUser(d.user);};
  const login=async(username:string,password:string)=>{const d=await call("login",{username,password});setUser(d.user);};
  const logout=async()=>{await call("logout");setUser(null);};
  const uploadAvatar=async(file:File)=>{const reader=new FileReader(); const data=await new Promise<string>((res,rej)=>{reader.onload=()=>res(String(reader.result));reader.onerror=()=>rej(reader.error);reader.readAsDataURL(file);}); const d=await call("avatar",{avatarDataUrl:data});setUser(d.user);};
  return <AuthContext.Provider value={{user,loading,register,login,logout,uploadAvatar}}>{children}</AuthContext.Provider>;
}
export function useAuth(){const v=useContext(AuthContext);if(!v)throw new Error("useAuth must be used inside AuthProvider");return v;}
