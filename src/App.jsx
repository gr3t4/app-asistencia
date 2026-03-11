// ══════════════════════════════════════════════════════════════
//  AsistenciaApp v3 — Justificaciones + Exportación completa
//  npm install @supabase/supabase-js xlsx
// ══════════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || "https://xbxpufhqijgrxlqzthiy.supabase.co";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_4PwY5ThtKDjcojNjit48TQ_q5-puxm1";
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

const C = {
  bg:"#0a0e1a", surface:"#111827", card:"#1a2235", border:"#1e2d45",
  accent:"#3b82f6", success:"#10b981", danger:"#ef4444", warning:"#f59e0b",
  text:"#e2e8f0", muted:"#64748b", purple:"#8b5cf6", teal:"#14b8a6",
  gold:"#f59e0b", late:"#f97316", excused:"#06b6d4",
};

// ── Status config ─────────────────────────────────────────────
const STATUS = {
  present: { label:"Presente",   icon:"✅", color:C.success, short:"P", bg:"#10b98122" },
  absent:  { label:"Ausente",    icon:"❌", color:C.danger,  short:"F", bg:"#ef444422" },
  late:    { label:"Retardo",    icon:"🕐", color:C.late,    short:"R", bg:"#f9731622" },
  excused: { label:"Justificada",icon:"📝", color:C.excused, short:"J", bg:"#06b6d422" },
  pending: { label:"Sin reg.",   icon:"⏳", color:C.muted,   short:"-", bg:"#64748b22" },
};

const today   = () => new Date().toISOString().split("T")[0];
const fmtDate = (d) => new Date(d+"T12:00:00").toLocaleDateString("es-MX",{weekday:"short",day:"numeric",month:"short",year:"numeric"});
const fmtDT   = (iso) => new Date(iso).toLocaleDateString("es-MX",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});

const getSession   = ()  => { try{ return JSON.parse(localStorage.getItem("asist_session"))||null; }catch{return null;} };
const setSession   = (u) => localStorage.setItem("asist_session", JSON.stringify(u));
const clearSession = ()  => localStorage.removeItem("asist_session");


// ════════════════════════════════════════════════════════════════
//  ROOT
// ════════════════════════════════════════════════════════════════
export default function App() {
  const [user,setUser]       = useState(null);
  const [loading,setLoading] = useState(true);
  useEffect(()=>{ const s=getSession(); if(s) setUser(s); setLoading(false); },[]);
  function logout(){ clearSession(); setUser(null); }
  if(loading) return <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:C.muted,fontFamily:"DM Sans"}}>Cargando...</span></div>;
  if(!user) return <AuthScreen onLogin={setUser}/>;
  if(user.role==="admin") return <AdminPanel user={user} onLogout={logout}/>;
  return <TeacherApp user={user} onLogout={logout}/>;
}

// ── Shared ──
function AddStudentInline({onAdd}){
  const [open,setOpen]=useState(false);const [name,setName]=useState("");
  function submit(){if(!name.trim())return;onAdd(name.trim());setName("");setOpen(false);}
  if(!open) return <button className="btn" onClick={()=>setOpen(true)} style={{background:`${C.success}22`,color:C.success,border:`1px solid ${C.success}44`,borderRadius:10,padding:"9px 14px",fontSize:13,fontWeight:600,fontFamily:"inherit"}}>+ Alumno</button>;
  return <div style={{display:"flex",gap:8,animation:"fadeUp .2s ease"}}>
    <input className="inp" placeholder="Nombre del alumno" value={name} autoFocus onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} style={{width:220}}/>
    <button className="btn" onClick={submit} style={{background:C.success,color:"#fff",borderRadius:10,padding:"9px 12px",fontSize:13,fontFamily:"inherit",border:"none"}}>✓</button>
    <button className="btn" onClick={()=>setOpen(false)} style={{background:"none",color:C.muted,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 10px",fontSize:13}}>✕</button>
  </div>;
}
function Empty({icon,msg}){ return <div style={{textAlign:"center",padding:"60px 0",color:C.muted}}><div style={{fontSize:46,marginBottom:12}}>{icon}</div><p style={{fontSize:14}}>{msg}</p></div>; }
function Toast({msg}){ return <div style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",background:"#1e293b",border:`1px solid ${C.border}`,color:C.text,padding:"12px 24px",borderRadius:12,fontSize:14,fontWeight:500,boxShadow:"0 8px 32px rgba(0,0,0,0.4)",zIndex:1000,animation:"toastIn .3s ease",whiteSpace:"nowrap"}}>{msg}</div>; }
function Glow({top,bottom,left,right,color,size="45vw"}){ return <div style={{position:"fixed",top,bottom,left,right,width:size,height:size,borderRadius:"50%",background:`radial-gradient(circle,rgba(${color},0.07) 0%,transparent 70%)`,pointerEvents:"none",zIndex:0}}/>; }
function Pill({color,label}){ return <span style={{background:`${color}18`,color,border:`1px solid ${color}33`,borderRadius:6,padding:"3px 10px",fontSize:12}}>{label}</span>; }
function Avatar({name}){ return <div style={{width:38,height:38,borderRadius:10,background:`linear-gradient(135deg,${C.accent}33,${C.purple}33)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,color:C.accent,flexShrink:0}}>{name?.charAt(0).toUpperCase()}</div>; }
function StatusBadge({active}){ return <span style={{background:active?`${C.success}18`:`${C.danger}18`,color:active?C.success:C.danger,border:`1px solid ${active?C.success:C.danger}44`,borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>{active?"Activo":"Inactivo"}</span>; }
function RoleBadge({role}){ const t=role==="teacher"; return <span style={{background:t?`${C.accent}18`:`${C.warning}18`,color:t?C.accent:C.warning,border:`1px solid ${t?C.accent:C.warning}44`,borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>{t?"Docente":role==="admin"?"Admin":"Lectura"}</span>; }
function GlobalStyles(){ return <style>{`
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  html{-webkit-text-size-adjust:100%;}
  body{background:${C.bg};overflow-x:hidden;width:100%;max-width:100vw;}
  input,select,textarea{outline:none;}
  ::-webkit-scrollbar{width:5px;height:5px;}
  ::-webkit-scrollbar-track{background:${C.surface};}
  ::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px;}
  .btn{cursor:pointer;border:none;transition:all .18s;}
  .btn:hover{filter:brightness(1.1);}
  .btn:active{filter:brightness(.95);}
  .inp{background:${C.surface};border:1.5px solid ${C.border};color:${C.text};border-radius:10px;padding:10px 14px;font-size:16px!important;font-family:inherit;transition:border-color .2s;width:100%;}
  .inp:focus{border-color:${C.accent};}
  .inp::placeholder{color:${C.muted};}
  textarea.inp{font-family:inherit;}
  .tab-on{color:${C.text}!important;border-bottom:2px solid ${C.accent}!important;}
  .row-hover{transition:background .15s;}
  .row-hover:hover{background:rgba(255,255,255,0.025)!important;}
  .chip{cursor:pointer;transition:all .15s;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;font-family:inherit;border:1.5px solid;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);}}
  @keyframes slideIn{from{opacity:0;transform:translateX(-14px);}to{opacity:1;transform:translateX(0);}}
  @keyframes toastIn{from{opacity:0;transform:translateY(16px) scale(.92);}to{opacity:1;transform:translateY(0) scale(1);}}
  @media(max-width:640px){
    main{padding:14px 10px!important;}
    .btn:hover{transform:none!important;filter:none!important;}
    .chip{padding:5px 10px!important;font-size:11px!important;}
    .row-hover:hover{transform:none!important;}
  }
`}</style>; }