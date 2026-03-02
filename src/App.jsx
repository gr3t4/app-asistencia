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
//  JUSTIFICATION MODAL
// ════════════════════════════════════════════════════════════════
function JustifyModal({ student, date, currentReason, onSave, onClose }) {
  const [reason, setReason] = useState(currentReason || "");
  const presets = ["Enfermedad / Cita médica","Asunto familiar","Trámite escolar","Accidente o emergencia","Viaje autorizado","Otro motivo"];

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20,animation:"fadeUp .2s ease"}}>
      <div style={{background:C.card,border:`1px solid ${C.excused}55`,borderRadius:20,padding:"28px 28px",width:"100%",maxWidth:460,boxShadow:"0 30px 80px rgba(0,0,0,0.6)"}}>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:22}}>
          <div style={{width:48,height:48,borderRadius:14,background:`${C.excused}22`,border:`1px solid ${C.excused}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📝</div>
          <div>
            <div style={{fontWeight:700,fontSize:16,color:C.text}}>Justificar Falta</div>
            <div style={{color:C.muted,fontSize:13,marginTop:2}}>{student.name} · {fmtDate(date)}</div>
          </div>
        </div>

        {/* Preset reasons */}
        <div style={{marginBottom:16}}>
          <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1,marginBottom:10}}>MOTIVOS RÁPIDOS</div>
          <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
            {presets.map(p=>(
              <button key={p} className="btn" onClick={()=>setReason(p)}
                style={{background:reason===p?`${C.excused}33`:`${C.excused}0d`,color:reason===p?C.excused:C.muted,
                  border:`1px solid ${reason===p?C.excused:C.border}`,borderRadius:8,padding:"6px 12px",fontSize:12,fontFamily:"inherit",transition:"all .15s"}}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Custom reason */}
        <div style={{marginBottom:22}}>
          <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1,marginBottom:8}}>MOTIVO PERSONALIZADO</div>
          <textarea
            className="inp"
            placeholder="Escribe el motivo de la justificación..."
            value={reason}
            onChange={e=>setReason(e.target.value)}
            style={{resize:"vertical",minHeight:80,lineHeight:1.6,width:"100%"}}
          />
        </div>

        <div style={{display:"flex",gap:10}}>
          <button className="btn" onClick={()=>onSave(reason.trim())}
            style={{flex:1,background:`linear-gradient(135deg,${C.excused},#0891b2)`,color:"#fff",borderRadius:10,padding:"12px 0",fontSize:14,fontWeight:600,fontFamily:"inherit"}}>
            📝 Guardar justificación
          </button>
          <button className="btn" onClick={onClose}
            style={{background:"none",color:C.muted,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 18px",fontSize:14,fontFamily:"inherit"}}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  EXPORT MODAL — elige qué exportar
// ════════════════════════════════════════════════════════════════
function ExportModal({ onExport, onClose, hasMultipleDates }) {
  const options = [
    { id:"date",    icon:"📅", label:"Asistencia de hoy",          desc:"Una hoja con el estado de la fecha activa" },
    { id:"full",    icon:"📊", label:"Reporte completo",           desc:"Matriz alumnos × fechas con totales y porcentajes" },
    { id:"justify", icon:"📝", label:"Justificaciones",            desc:"Lista de todas las faltas justificadas y sus motivos" },
    { id:"student", icon:"👤", label:"Resumen por alumno",         desc:"Una hoja por alumno con su historial completo" },
    { id:"all",     icon:"📦", label:"Todo en un archivo",         desc:"Todas las hojas anteriores en un solo .xlsx" },
  ];
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20,animation:"fadeUp .2s ease"}}>
      <div style={{background:C.card,border:`1px solid ${C.purple}55`,borderRadius:20,padding:"28px",width:"100%",maxWidth:500,boxShadow:"0 30px 80px rgba(0,0,0,0.6)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:22}}>
          <span style={{fontSize:28}}>📦</span>
          <div>
            <div style={{fontWeight:700,fontSize:17}}>Exportar a Excel</div>
            <div style={{color:C.muted,fontSize:13,marginTop:2}}>Elige el tipo de reporte</div>
          </div>
          <button className="btn" onClick={onClose} style={{marginLeft:"auto",background:"none",color:C.muted,fontSize:20,padding:"4px 8px"}}>×</button>
        </div>
        <div style={{display:"grid",gap:9}}>
          {options.filter(o=>o.id!=="full"||hasMultipleDates).map((o,i)=>(
            <button key={o.id} className="btn row-hover" onClick={()=>{onExport(o.id);onClose();}}
              style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 18px",
                display:"flex",alignItems:"center",gap:14,textAlign:"left",width:"100%",animation:`slideIn .25s ease both`,animationDelay:`${i*.06}s`}}>
              <div style={{width:42,height:42,borderRadius:12,background:`${C.purple}22`,border:`1px solid ${C.purple}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{o.icon}</div>
              <div>
                <div style={{fontWeight:600,fontSize:14,color:C.text}}>{o.label}</div>
                <div style={{color:C.muted,fontSize:12,marginTop:2}}>{o.desc}</div>
              </div>
              <span style={{marginLeft:"auto",color:C.accent,fontSize:13}}>→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  AUTH SCREEN
// ════════════════════════════════════════════════════════════════
function AuthScreen({ onLogin }) {
  const [mode,setMode]         = useState("login");
  const [username,setUsername] = useState("");
  const [password,setPassword] = useState("");
  const [name,setName]         = useState("");
  const [error,setError]       = useState("");
  const [busy,setBusy]         = useState(false);

  async function submit() {
    setError(""); setBusy(true);
    if(!username.trim()||!password.trim()){setError("Completa todos los campos");setBusy(false);return;}
    if(mode==="register"){
      if(!name.trim()){setError("Ingresa tu nombre");setBusy(false);return;}
      const{data:ex}=await sb.from("users").select("id").eq("username",username).maybeSingle();
      if(ex){setError("Usuario ya existe");setBusy(false);return;}
      const{data,error:err}=await sb.from("users").insert({username,password,name,role:"teacher"}).select().single();
      if(err){setError("Error: "+err.message);setBusy(false);return;}
      const u={id:data.id,username:data.username,name:data.name,role:data.role};
      setSession(u);onLogin(u);
    }else{
      const{data,error:err}=await sb.from("users").select("*").eq("username",username).eq("password",password).maybeSingle();
      if(err||!data){setError("Credenciales incorrectas");setBusy(false);return;}
      if(data.active===false){setError("Cuenta desactivada. Contacta al administrador.");setBusy(false);return;}
      const u={id:data.id,username:data.username,name:data.name,role:data.role};
      setSession(u);onLogin(u);
    }
    setBusy(false);
  }

  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif",padding:"0"}}>
      <GlobalStyles/>
      <Glow top="-20%" left="-10%" color="59,130,246"/>
      <Glow bottom="-20%" right="-10%" color="139,92,246"/>
      <div style={{background:C.card,border:"none",borderRadius:0,padding:"40px 28px",width:"100%",maxWidth:"100%",minHeight:"100vh",boxShadow:"none",position:"relative",zIndex:1,animation:"fadeUp .4s ease both",display:"flex",flexDirection:"column",justifyContent:"center"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:44}}>📋</div>
          <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:28,color:C.text,fontWeight:700}}>AsistenciaApp</h1>
          <p style={{color:C.muted,fontSize:13,marginTop:6}}>Powered by Supabase ⚡</p>
        </div>
        <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,marginBottom:28}}>
          {["login","register"].map(m=>(
            <button key={m} className={`btn tab${mode===m?" tab-on":""}`} onClick={()=>{setMode(m);setError("");}}
              style={{flex:1,padding:"10px 0",background:"none",color:C.muted,borderBottom:"2px solid transparent",fontSize:14,fontFamily:"inherit",fontWeight:500}}>
              {m==="login"?"Iniciar sesión":"Registrarse"}
            </button>
          ))}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {mode==="register"&&<input className="inp" placeholder="Tu nombre completo" value={name} onChange={e=>setName(e.target.value)}/>}
          <input className="inp" placeholder="Usuario" value={username} onChange={e=>setUsername(e.target.value)}/>
          <input className="inp" type="password" placeholder="Contraseña" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/>
          {error&&<div style={{color:C.danger,fontSize:13,textAlign:"center"}}>{error}</div>}
          <button className="btn" onClick={submit} disabled={busy}
            style={{background:`linear-gradient(135deg,${C.accent},${C.purple})`,color:"#fff",borderRadius:10,padding:"14px 0",fontSize:15,fontWeight:600,fontFamily:"inherit",marginTop:4}}>
            {busy?"Conectando...":(mode==="login"?"Entrar":"Crear cuenta")}
          </button>
        </div>
        <div style={{marginTop:16,textAlign:"center",fontSize:12,color:C.muted}}>
  ¿Problemas para entrar?{" "}
  <a href="https://wa.me/521TUNUMERO" target="_blank" rel="noreferrer"
    style={{color:C.success,fontWeight:700,textDecoration:"none"}}>
    gr3t4
  </a>
</div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  ADMIN PANEL
// ════════════════════════════════════════════════════════════════
function AdminPanel({ user, onLogout }) {
  const [tab,setTab]               = useState("overview");
  const [users,setUsers]           = useState([]);
  const [allSessions,setAllSessions]= useState([]);
  const [toast,setToast]           = useState(null);
  const [selectedUser,setSelectedUser]= useState(null);
  const [userSessions,setUserSessions]= useState([]);
  const [newU,setNewU]             = useState({username:"",password:"",name:"",role:"teacher"});
  const [newPass,setNewPass]       = useState({old:"",new1:"",new2:""});
  const [passErr,setPassErr]       = useState("");
  const [loading,setLoading]       = useState(true);
  const [editPassTarget,setEditPassTarget] = useState(null);
  const [editPassVal,setEditPassVal]       = useState({new1:"",new2:""});
  const [editPassErr,setEditPassErr]       = useState("");

  useEffect(()=>{loadAll();},[]);

  async function loadAll(){
    setLoading(true);
    const{data:ud}=await sb.from("users").select("*").order("created_at",{ascending:false});
    setUsers(ud||[]);
    const{data:sd}=await sb.from("sessions").select(`id,name,date,created_at,owner:users(id,username,name),students(count),attendance(date,status)`).order("created_at",{ascending:false});
    setAllSessions((sd||[]).map(s=>({
      ...s,
      studentCount:s.students?.[0]?.count||0,
      datesCount:[...new Set((s.attendance||[]).map(a=>a.date))].length,
      lateCount:(s.attendance||[]).filter(a=>a.status==="late").length,
      excusedCount:(s.attendance||[]).filter(a=>a.status==="excused").length,
    })));
    setLoading(false);
  }

  async function viewUserSessions(userId,userName){
    const{data}=await sb.from("sessions").select(`id,name,date,created_at,students(count),attendance(date,status)`).eq("owner_id",userId).order("created_at",{ascending:false});
    setUserSessions((data||[]).map(s=>({...s,studentCount:s.students?.[0]?.count||0,datesCount:[...new Set((s.attendance||[]).map(a=>a.date))].length,excusedCount:(s.attendance||[]).filter(a=>a.status==="excused").length})));
    setSelectedUser({id:userId,name:userName}); setTab("user-detail");
  }
  async function toggleUserActive(uid,cur){await sb.from("users").update({active:!cur}).eq("id",uid);setUsers(p=>p.map(u=>u.id===uid?{...u,active:!cur}:u));showToast(!cur?"✅ Activado":"🚫 Desactivado");}
  async function deleteUser(uid,uname){if(!window.confirm(`¿Eliminar "${uname}"?`))return;await sb.from("users").delete().eq("id",uid);setUsers(p=>p.filter(u=>u.id!==uid));await loadAll();showToast("🗑️ Eliminado");}
  async function createUser(){
    if(!newU.username.trim()||!newU.password.trim()||!newU.name.trim()){showToast("⚠️ Completa los campos");return;}
    const{data:ex}=await sb.from("users").select("id").eq("username",newU.username).maybeSingle();
    if(ex){showToast("⚠️ Ya existe");return;}
    const{data,error}=await sb.from("users").insert({...newU,created_by_admin:true}).select().single();
    if(error){showToast("❌ "+error.message);return;}
    setUsers(p=>[data,...p]);setNewU({username:"",password:"",name:"",role:"teacher"});showToast("✅ Creado");
  }
  async function changeAdminPass(){
    setPassErr("");
    const{data}=await sb.from("users").select("password").eq("id",user.id).single();
    if(newPass.old!==data.password){setPassErr("Contraseña incorrecta");return;}
    if(newPass.new1.length<4){setPassErr("Mínimo 4 caracteres");return;}
    if(newPass.new1!==newPass.new2){setPassErr("No coinciden");return;}
    await sb.from("users").update({password:newPass.new1}).eq("id",user.id);
    setNewPass({old:"",new1:"",new2:""});showToast("🔒 Actualizada");
  }
  function showToast(msg){setToast(msg);setTimeout(()=>setToast(null),3000);}
  async function changeUserPass(){
    setEditPassErr("");
    if(editPassVal.new1.length<4){setEditPassErr("Mínimo 4 caracteres");return;}
    if(editPassVal.new1!==editPassVal.new2){setEditPassErr("Las contraseñas no coinciden");return;}
    const{error}=await sb.from("users").update({password:editPassVal.new1}).eq("id",editPassTarget.id);
    if(error){setEditPassErr("Error: "+error.message);return;}
    setEditPassTarget(null);setEditPassVal({new1:"",new2:""});
    showToast("🔒 Contraseña de "+editPassTarget.name+" actualizada");
  }

  const totalUsers=users.filter(u=>u.role!=="admin").length;
  const activeUsers=users.filter(u=>u.role!=="admin"&&u.active!==false).length;
  const totalSess=allSessions.length;
  const totalStu=allSessions.reduce((a,s)=>a+(s.studentCount||0),0);
  const totalLate=allSessions.reduce((a,s)=>a+(s.lateCount||0),0);
  const totalExcused=allSessions.reduce((a,s)=>a+(s.excusedCount||0),0);

  const TABS=[{id:"overview",label:"📊 Resumen"},{id:"users",label:"👥 Usuarios"},{id:"sessions",label:"📚 Sesiones"},{id:"settings",label:"⚙️ Ajustes"}];

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'DM Sans',sans-serif",color:C.text}}>
      <GlobalStyles/>
      <Glow top="-15%" right="-5%" color="245,158,11" size="40vw"/>
      <Glow bottom="-10%" left="-5%" color="139,92,246" size="35vw"/>
      {toast&&<Toast msg={toast}/>}
      {editPassTarget&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20,animation:"fadeUp .2s ease"}}>
          <div style={{background:"#1a2235",border:`1px solid ${C.accent}55`,borderRadius:20,padding:"28px",width:"100%",maxWidth:420,boxShadow:"0 30px 80px rgba(0,0,0,0.6)"}}>
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:22}}>
              <div style={{width:46,height:46,borderRadius:14,background:`${C.accent}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🔑</div>
              <div><div style={{fontWeight:700,fontSize:16,color:"#e2e8f0"}}>Cambiar contraseña</div><div style={{color:"#64748b",fontSize:13,marginTop:2}}>{editPassTarget.name} (@{editPassTarget.username})</div></div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div><div style={{fontSize:11,color:"#64748b",marginBottom:5}}>Nueva contraseña</div><input className="inp" type="password" placeholder="••••••" autoFocus value={editPassVal.new1} onChange={e=>setEditPassVal(p=>({...p,new1:e.target.value}))}/></div>
              <div><div style={{fontSize:11,color:"#64748b",marginBottom:5}}>Confirmar contraseña</div><input className="inp" type="password" placeholder="••••••" value={editPassVal.new2} onChange={e=>setEditPassVal(p=>({...p,new2:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&changeUserPass()}/></div>
              {editPassErr&&<div style={{color:"#ef4444",fontSize:12}}>{editPassErr}</div>}
              <div style={{display:"flex",gap:10,marginTop:4}}>
                <button className="btn" onClick={changeUserPass} style={{flex:1,background:`linear-gradient(135deg,${C.accent},${C.purple})`,color:"#fff",borderRadius:10,padding:"12px 0",fontSize:14,fontWeight:600,fontFamily:"inherit"}}>Guardar contraseña</button>
                <button className="btn" onClick={()=>{setEditPassTarget(null);setEditPassVal({new1:"",new2:""});setEditPassErr("");}} style={{background:"none",color:"#64748b",border:"1px solid #1e2d45",borderRadius:10,padding:"12px 16px",fontSize:14,fontFamily:"inherit"}}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <header style={{borderBottom:`1px solid ${C.border}`,background:C.surface,padding:"0 24px",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 20px rgba(0,0,0,0.3)"}}>
        <div style={{maxWidth:1000,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:60}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            {tab==="user-detail"&&<button className="btn" onClick={()=>setTab("users")} style={{background:"none",color:C.muted,fontSize:20,padding:"4px 8px"}}>←</button>}
            <span style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:18,background:`linear-gradient(135deg,${C.gold},#ef8c00)`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>🛡️ Panel Admin</span>
            <span style={{background:`${C.gold}22`,color:C.gold,border:`1px solid ${C.gold}44`,borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>ADMIN</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:12,color:C.teal}}>⚡ Supabase</span>
            <span style={{fontSize:13,color:C.muted}}>👤 {user.name}</span>
            <button className="btn" onClick={onLogout} style={{background:"rgba(239,68,68,0.1)",color:C.danger,border:`1px solid rgba(239,68,68,0.2)`,borderRadius:8,padding:"6px 14px",fontSize:13,fontFamily:"inherit"}}>Salir</button>
          </div>
        </div>
      </header>
      {tab!=="user-detail"&&(
        <div style={{borderBottom:`1px solid ${C.border}`,background:C.surface,padding:"0 24px"}}>
          <div style={{maxWidth:1000,margin:"0 auto",display:"flex",gap:4}}>
            {TABS.map(t=><button key={t.id} className="btn" onClick={()=>setTab(t.id)}
              style={{background:"none",color:tab===t.id?C.gold:C.muted,borderBottom:tab===t.id?`2px solid ${C.gold}`:"2px solid transparent",padding:"12px 18px",fontSize:14,fontFamily:"inherit",fontWeight:tab===t.id?600:400,transition:"all .2s"}}>{t.label}</button>)}
          </div>
        </div>
      )}
      <main style={{maxWidth:1000,margin:"0 auto",padding:"28px 20px",position:"relative",zIndex:1}}>
        {loading&&tab==="overview"&&<div style={{textAlign:"center",padding:"60px 0",color:C.muted}}>Cargando...</div>}

        {!loading&&tab==="overview"&&(
          <div style={{animation:"fadeUp .4s ease both"}}>
            <h2 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:22,fontWeight:700,marginBottom:20}}>Resumen Global</h2>
            <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:12,marginBottom:28}}>
              {[
                {label:"Usuarios",v:totalUsers,color:C.accent,icon:"👥"},
                {label:"Sesiones",v:totalSess,color:C.purple,icon:"📚"},
                {label:"Alumnos",v:totalStu,color:C.teal,icon:"🎓"},
                {label:"Activos",v:activeUsers,color:C.success,icon:"✅"},
                {label:"Retardos",v:totalLate,color:C.late,icon:"🕐"},
                {label:"Justificadas",v:totalExcused,color:C.excused,icon:"📝"},
              ].map(st=>(
                <div key={st.label} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"16px 12px",textAlign:"center"}}>
                  <div style={{fontSize:22,marginBottom:4}}>{st.icon}</div>
                  <div style={{fontSize:22,fontWeight:700,color:st.color,fontFamily:"'Space Grotesk',sans-serif"}}>{st.v}</div>
                  <div style={{color:C.muted,fontSize:11,marginTop:2}}>{st.label}</div>
                </div>
              ))}
            </div>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:"20px 24px"}}>
              <div style={{fontSize:13,fontWeight:700,color:C.muted,letterSpacing:1,marginBottom:16}}>ÚLTIMAS SESIONES</div>
              {allSessions.length===0?<Empty icon="📭" msg="Sin sesiones"/>:(
                <div style={{display:"grid",gap:10}}>
                  {allSessions.slice(0,6).map((s,i)=>(
                    <div key={s.id} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 14px",background:C.surface,borderRadius:10,animation:`slideIn .3s ease both`,animationDelay:`${i*.05}s`}}>
                      <div style={{width:38,height:38,borderRadius:10,background:`linear-gradient(135deg,${C.purple}22,${C.accent}22)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>📚</div>
                      <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13}}>{s.name}</div><div style={{color:C.muted,fontSize:11,marginTop:2}}>por <span style={{color:C.accent}}>{s.owner?.name}</span> · {fmtDate(s.date)}</div></div>
                      <div style={{display:"flex",gap:8,fontSize:12}}>
                        <span style={{color:C.muted}}>👥 {s.studentCount}</span>
                        <span style={{color:C.muted}}>📅 {s.datesCount}</span>
                        {s.lateCount>0&&<span style={{color:C.late}}>🕐 {s.lateCount}</span>}
                        {s.excusedCount>0&&<span style={{color:C.excused}}>📝 {s.excusedCount}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab==="users"&&(
          <div style={{animation:"fadeUp .4s ease both"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h2 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:22,fontWeight:700}}>Gestión de Usuarios</h2>
              <span style={{color:C.muted,fontSize:13}}>{totalUsers} usuarios</span>
            </div>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:"20px 24px",marginBottom:20}}>
              <div style={{fontSize:12,fontWeight:700,color:C.gold,letterSpacing:1,marginBottom:14}}>➕ CREAR NUEVO USUARIO</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto auto",gap:10,alignItems:"end"}}>
                <div><div style={{fontSize:11,color:C.muted,marginBottom:5}}>Nombre</div><input className="inp" placeholder="Nombre completo" value={newU.name} onChange={e=>setNewU({...newU,name:e.target.value})}/></div>
                <div><div style={{fontSize:11,color:C.muted,marginBottom:5}}>Usuario</div><input className="inp" placeholder="username" value={newU.username} onChange={e=>setNewU({...newU,username:e.target.value})}/></div>
                <div><div style={{fontSize:11,color:C.muted,marginBottom:5}}>Contraseña</div><input className="inp" type="password" placeholder="••••••" value={newU.password} onChange={e=>setNewU({...newU,password:e.target.value})}/></div>
                <div><div style={{fontSize:11,color:C.muted,marginBottom:5}}>Rol</div><select className="inp" value={newU.role} onChange={e=>setNewU({...newU,role:e.target.value})} style={{cursor:"pointer"}}><option value="teacher">Docente</option><option value="viewer">Solo lectura</option></select></div>
                <button className="btn" onClick={createUser} style={{background:`linear-gradient(135deg,${C.success},#059669)`,color:"#fff",borderRadius:10,padding:"10px 18px",fontSize:13,fontWeight:600,fontFamily:"inherit",whiteSpace:"nowrap"}}>Crear</button>
              </div>
            </div>
            {users.filter(u=>u.role!=="admin").length===0?<Empty icon="👥" msg="Sin usuarios"/>:(
              <div style={{display:"grid",gap:10}}>
                {users.filter(u=>u.role!=="admin").map((u,i)=>(
                  <div key={u.id} className="row-hover" style={{background:C.card,border:`1px solid ${u.active===false?`${C.danger}33`:C.border}`,borderRadius:14,padding:"16px 20px",display:"flex",alignItems:"center",gap:14,animation:`slideIn .3s ease both`,animationDelay:`${i*.05}s`,opacity:u.active===false?.6:1}}>
                    <Avatar name={u.name}/>
                    <div style={{flex:1}}><div style={{fontWeight:600,fontSize:14}}>{u.name}</div><div style={{color:C.muted,fontSize:12,marginTop:2}}>@{u.username} · {fmtDT(u.created_at)}{u.created_by_admin&&<span style={{color:C.gold,marginLeft:6,fontSize:11}}>★</span>}</div></div>
                    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                      <RoleBadge role={u.role}/><StatusBadge active={u.active!==false}/>
                      <button className="btn" onClick={()=>viewUserSessions(u.id,u.name)} style={{background:`${C.accent}22`,color:C.accent,border:`1px solid ${C.accent}44`,borderRadius:8,padding:"6px 12px",fontSize:12,fontFamily:"inherit"}}>📚</button>
                      <button className="btn" onClick={()=>{setEditPassTarget({id:u.id,name:u.name,username:u.username});setEditPassVal({new1:"",new2:""});setEditPassErr("");}} style={{background:`${C.purple}22`,color:C.purple,border:`1px solid ${C.purple}44`,borderRadius:8,padding:"6px 12px",fontSize:12,fontFamily:"inherit"}} title="Cambiar contraseña">🔑</button>
                      <button className="btn" onClick={()=>toggleUserActive(u.id,u.active!==false)} style={{background:u.active===false?`${C.success}22`:`${C.warning}22`,color:u.active===false?C.success:C.warning,border:`1px solid ${u.active===false?C.success:C.warning}44`,borderRadius:8,padding:"6px 12px",fontSize:12,fontFamily:"inherit"}}>{u.active===false?"Activar":"Desactivar"}</button>
                      <button className="btn" onClick={()=>deleteUser(u.id,u.username)} style={{background:"rgba(239,68,68,0.1)",color:C.danger,border:`1px solid rgba(239,68,68,0.2)`,borderRadius:8,padding:"6px 10px",fontSize:13}}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab==="user-detail"&&selectedUser&&(
          <div style={{animation:"fadeUp .4s ease both"}}>
            <h2 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:20,fontWeight:700,marginBottom:20}}>Sesiones de <span style={{color:C.accent}}>{selectedUser.name}</span></h2>
            {userSessions.length===0?<Empty icon="📭" msg="Sin sesiones"/>:(
              <div style={{display:"grid",gap:10}}>
                {userSessions.map((s,i)=>(
                  <div key={s.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"16px 20px",display:"flex",alignItems:"center",gap:16,animation:`slideIn .3s ease both`,animationDelay:`${i*.05}s`}}>
                    <div style={{width:44,height:44,borderRadius:12,background:`linear-gradient(135deg,${C.accent}22,${C.purple}22)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>📚</div>
                    <div style={{flex:1}}><div style={{fontWeight:600,fontSize:14}}>{s.name}</div><div style={{color:C.muted,fontSize:12,marginTop:2}}>📅 {fmtDate(s.date)}</div></div>
                    <div style={{display:"flex",gap:12,fontSize:13,color:C.muted}}>
                      <span>👥 {s.studentCount}</span><span>📅 {s.datesCount}</span>
                      {s.excusedCount>0&&<span style={{color:C.excused}}>📝 {s.excusedCount}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab==="sessions"&&(
          <div style={{animation:"fadeUp .4s ease both"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h2 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:22,fontWeight:700}}>Todas las Sesiones</h2>
              <span style={{color:C.muted,fontSize:13}}>{totalSess} sesiones</span>
            </div>
            {allSessions.length===0?<Empty icon="📚" msg="Sin sesiones"/>:(
              <div style={{display:"grid",gap:10}}>
                {allSessions.map((s,i)=>(
                  <div key={s.id} className="row-hover" style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"16px 20px",display:"flex",alignItems:"center",gap:16,animation:`slideIn .3s ease both`,animationDelay:`${i*.04}s`}}>
                    <div style={{width:44,height:44,borderRadius:12,background:`linear-gradient(135deg,${C.teal}22,${C.purple}22)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>📚</div>
                    <div style={{flex:1}}><div style={{fontWeight:600,fontSize:14}}>{s.name}</div><div style={{color:C.muted,fontSize:12,marginTop:3}}>👤 <span style={{color:C.accent}}>{s.owner?.name}</span> · {fmtDate(s.date)}</div></div>
                    <div style={{display:"flex",gap:8,fontSize:12}}>
                      <Pill color={C.teal} label={`👥 ${s.studentCount}`}/>
                      <Pill color={C.purple} label={`📅 ${s.datesCount}`}/>
                      {s.lateCount>0&&<Pill color={C.late} label={`🕐 ${s.lateCount}`}/>}
                      {s.excusedCount>0&&<Pill color={C.excused} label={`📝 ${s.excusedCount}`}/>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab==="settings"&&(
          <div style={{animation:"fadeUp .4s ease both",maxWidth:520}}>
            <h2 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:22,fontWeight:700,marginBottom:20}}>Ajustes</h2>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:"24px"}}>
              <div style={{fontSize:12,fontWeight:700,color:C.gold,letterSpacing:1,marginBottom:16}}>🔒 CAMBIAR CONTRASEÑA</div>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {[["old","Actual"],["new1","Nueva"],["new2","Confirmar"]].map(([k,l])=>(
                  <div key={k}><div style={{fontSize:11,color:C.muted,marginBottom:5}}>{l}</div><input className="inp" type="password" placeholder="••••••" value={newPass[k]} onChange={e=>setNewPass({...newPass,[k]:e.target.value})}/></div>
                ))}
                {passErr&&<div style={{color:C.danger,fontSize:12}}>{passErr}</div>}
                <button className="btn" onClick={changeAdminPass} style={{background:`linear-gradient(135deg,${C.gold},#ef8c00)`,color:"#000",borderRadius:10,padding:"12px 0",fontSize:14,fontWeight:700,fontFamily:"inherit"}}>Actualizar</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  TEACHER APP
// ════════════════════════════════════════════════════════════════
function TeacherApp({ user, onLogout }) {
  const [sessions,setSessions]         = useState([]);
  const [activeSession,setActiveSess]  = useState(null);
  const [view,setView]                 = useState("sessions");
  const [students,setStudents]         = useState([]);
  const [selectedDate,setSelectedDate] = useState(today());
  const [attendance,setAttendance]     = useState({}); // {id: {status, reason}}
  const [allDates,setAllDates]         = useState([]);
  const [searchQuery,setSearchQuery]   = useState("");
  const [searchResult,setSearchResult] = useState(null);
  const [filter,setFilter]             = useState("all");
  const [showNewSess,setShowNewSess]   = useState(false);
  const [newSessName,setNewSessName]   = useState("");
  const [newSessDate,setNewSessDate]   = useState(today());
  const [toast,setToast]               = useState(null);
  const [saving,setSaving]             = useState(false);
  const [justifyTarget,setJustifyTarget]= useState(null); // {student, date}
  const [showExport,setShowExport]     = useState(false);
  const fileRef = useRef();

  useEffect(()=>{ loadSessions(); },[]);

  async function loadSessions(){
    const{data}=await sb.from("sessions").select("*").eq("owner_id",user.id).order("created_at",{ascending:false});
    setSessions(data||[]);
  }

  async function selectSession(s){
    setActiveSess(s);
    const{data:studs}=await sb.from("students").select("*").eq("session_id",s.id).order("created_at");
    setStudents(studs||[]);
    const{data:attRows}=await sb.from("attendance").select("date").eq("session_id",s.id);
    const dates=[...new Set((attRows||[]).map(r=>r.date))].sort().reverse();
    setAllDates(dates);
    const d=today();setSelectedDate(d);
    await loadAttendanceForDate(s.id,d);
    setFilter("all");setSearchQuery("");setSearchResult(null);setView("attendance");
  }

  async function loadAttendanceForDate(sessionId,date){
    const{data}=await sb.from("attendance").select("student_id,status,reason").eq("session_id",sessionId).eq("date",date);
    const m={};(data||[]).forEach(r=>{m[r.student_id]={status:r.status,reason:r.reason||""};});
    setAttendance(m);
  }

  async function changeDate(d){setSelectedDate(d);await loadAttendanceForDate(activeSession.id,d);setFilter("all");}

  async function saveAttendanceForDate(){
    setSaving(true);
    const upserts=students.map(s=>({
      session_id:activeSession.id,student_id:s.id,date:selectedDate,
      status:attendance[s.id]?.status||"pending",
      reason:attendance[s.id]?.reason||null,
    }));
    if(upserts.length>0){
      const{error}=await sb.from("attendance").upsert(upserts,{onConflict:"student_id,date"});
      if(error){showToast("❌ "+error.message);setSaving(false);return;}
    }
    const dates=allDates.includes(selectedDate)?allDates:[...allDates,selectedDate].sort().reverse();
    setAllDates(dates);showToast("💾 Guardado — "+fmtDate(selectedDate));setSaving(false);
  }

  function toggleAtt(id,status){
    setAttendance(prev=>({...prev,[id]:{...(prev[id]||{}),status}}));
  }

  function markAll(status){
    const att={};students.forEach(s=>att[s.id]={status,reason:""});setAttendance(att);
    showToast(STATUS[status].icon+" Todos: "+STATUS[status].label);
  }

  function openJustify(student){
    setJustifyTarget({student,date:selectedDate});
  }

  function saveJustification(reason){
    const id=justifyTarget.student.id;
    setAttendance(prev=>({...prev,[id]:{status:"excused",reason}}));
    setJustifyTarget(null);
    showToast("📝 Justificación guardada");
  }

  async function createSession(){
    if(!newSessName.trim())return;
    const{data,error}=await sb.from("sessions").insert({owner_id:user.id,name:newSessName.trim(),date:newSessDate}).select().single();
    if(error){showToast("❌ "+error.message);return;}
    setSessions(p=>[data,...p]);setShowNewSess(false);setNewSessName("");setNewSessDate(today());showToast("✅ Creada");
  }
  async function deleteSession(id){await sb.from("sessions").delete().eq("id",id);setSessions(p=>p.filter(s=>s.id!==id));showToast("🗑️ Eliminada");}

  async function importExcel(e){
    const file=e.target.files[0];if(!file)return;
    const wb=XLSX.read(await file.arrayBuffer());
    const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1});
    const imp=rows.flatMap(r=>r[0]&&String(r[0]).trim()?[String(r[0]).trim()]:[]);
    if(!imp.length){showToast("⚠️ Sin nombres");return;}
    const existing=students.map(s=>s.name.toLowerCase());
    const newNames=imp.filter(n=>!existing.includes(n.toLowerCase()));
    if(!newNames.length){showToast("ℹ️ Todos ya existen");return;}
    const{data,error}=await sb.from("students").insert(newNames.map(n=>({session_id:activeSession.id,name:n}))).select();
    if(error){showToast("❌ "+error.message);return;}
    setStudents(p=>[...p,...data]);showToast(`📥 ${data.length} importados`);e.target.value="";
  }
  async function addStudent(name){
    const{data,error}=await sb.from("students").insert({session_id:activeSession.id,name:name.trim()}).select().single();
    if(error){showToast("❌ "+error.message);return;}setStudents(p=>[...p,data]);
  }
  async function removeStudent(id){
    await sb.from("students").delete().eq("id",id);
    setStudents(p=>p.filter(s=>s.id!==id));
    setAttendance(p=>{const a={...p};delete a[id];return a;});
  }

  async function searchStudent(q){
    const query=q.trim().toLowerCase();if(!query||!activeSession){setSearchResult(null);return;}
    const found=students.find(s=>s.name.toLowerCase().includes(query));
    if(!found){setSearchResult({notFound:true,query:q});return;}
    const{data}=await sb.from("attendance").select("date,status,reason").eq("student_id",found.id).order("date",{ascending:false});
    setSearchResult({student:found,history:data||[]});setView("student-history");
  }

  // ── EXPORT ENGINE ──────────────────────────────────────────
  async function handleExport(type){
    const sessName=activeSession?.name||"sesion";
    const dateList=[...allDates].sort();
    const{data:allAtt}=await sb.from("attendance").select("student_id,date,status,reason").eq("session_id",activeSession.id);
    const idx={};(allAtt||[]).forEach(r=>{if(!idx[r.student_id])idx[r.student_id]={};idx[r.student_id][r.date]={status:r.status,reason:r.reason||""};});

    const wb=XLSX.utils.book_new();

    // ── Hoja 1: fecha activa ──
    function sheetDate(){
      const rows=[
        ["Alumno","Estado","Motivo justificación"],
        ...students.map(s=>{
          const rec=attendance[s.id]||{};
          return[s.name, STATUS[rec.status||"pending"]?.label||"-", rec.reason||""];
        })
      ];
      return XLSX.utils.aoa_to_sheet(rows);
    }

    // ── Hoja 2: reporte completo ──
    function sheetFull(){
      const header=["Alumno",...dateList,"Presencias","Retardos","Justificadas","Faltas","% Asist."];
      const rows=students.map(s=>{
        const row=[s.name,...dateList.map(d=>STATUS[idx[s.id]?.[d]?.status]?.short||"-")];
        const ps=row.slice(1).filter(x=>x==="P").length;
        const rs=row.slice(1).filter(x=>x==="R").length;
        const js=row.slice(1).filter(x=>x==="J").length;
        const fs=row.slice(1).filter(x=>x==="F").length;
        const pct=dateList.length>0?Math.round(((ps+rs+js)/dateList.length)*100)+"%":"-";
        return[...row,ps,rs,js,fs,pct];
      });
      return XLSX.utils.aoa_to_sheet([header,...rows]);
    }

    // ── Hoja 3: justificaciones ──
    function sheetJustify(){
      const rows=[["Alumno","Fecha","Motivo"]];
      for(const s of students){
        for(const d of dateList){
          const rec=idx[s.id]?.[d];
          if(rec?.status==="excused") rows.push([s.name,d,rec.reason||"(sin motivo)"]);
        }
      }
      if(rows.length===1) rows.push(["Sin faltas justificadas","",""]);
      return XLSX.utils.aoa_to_sheet(rows);
    }

    // ── Hoja 4: resumen por alumno ──
    function sheetsPerStudent(){
      const sheets=[];
      for(const s of students){
        const rows=[["Fecha","Estado","Motivo"]];
        for(const d of dateList){
          const rec=idx[s.id]?.[d];
          rows.push([d, STATUS[rec?.status||"pending"]?.label||"-", rec?.status==="excused"?rec.reason||"":"" ]);
        }
        const ps=rows.slice(1).filter(r=>r[1]==="Presente").length;
        const rs=rows.slice(1).filter(r=>r[1]==="Retardo").length;
        const js=rows.slice(1).filter(r=>r[1]==="Justificada").length;
        const fs=rows.slice(1).filter(r=>r[1]==="Ausente").length;
        rows.push([]);
        rows.push(["RESUMEN","",""]);
        rows.push(["Presencias",ps,""]);
        rows.push(["Retardos",rs,""]);
        rows.push(["Justificadas",js,""]);
        rows.push(["Faltas",fs,""]);
        rows.push(["% Asistencia",dateList.length>0?Math.round(((ps+rs+js)/dateList.length)*100)+"%":"-",""]);
        sheets.push({name:s.name.substring(0,30),ws:XLSX.utils.aoa_to_sheet(rows)});
      }
      return sheets;
    }

    if(type==="date"){
      XLSX.utils.book_append_sheet(wb,sheetDate(),`Asist_${selectedDate}`);
      XLSX.writeFile(wb,`asistencia_${sessName}_${selectedDate}.xlsx`);
    } else if(type==="full"){
      XLSX.utils.book_append_sheet(wb,sheetFull(),"Reporte completo");
      XLSX.writeFile(wb,`reporte_${sessName}.xlsx`);
    } else if(type==="justify"){
      XLSX.utils.book_append_sheet(wb,sheetJustify(),"Justificaciones");
      XLSX.writeFile(wb,`justificaciones_${sessName}.xlsx`);
    } else if(type==="student"){
      const sheets=sheetsPerStudent();
      if(!sheets.length){showToast("⚠️ Sin alumnos");return;}
      sheets.forEach(({name,ws})=>XLSX.utils.book_append_sheet(wb,ws,name));
      XLSX.writeFile(wb,`alumnos_${sessName}.xlsx`);
    } else if(type==="all"){
      XLSX.utils.book_append_sheet(wb,sheetDate(),`Asist_${selectedDate}`);
      XLSX.utils.book_append_sheet(wb,sheetFull(),"Reporte completo");
      XLSX.utils.book_append_sheet(wb,sheetJustify(),"Justificaciones");
      sheetsPerStudent().forEach(({name,ws})=>XLSX.utils.book_append_sheet(wb,ws,name));
      XLSX.writeFile(wb,`completo_${sessName}.xlsx`);
    }
    showToast("📥 Excel descargado");
  }

  function showToast(msg){setToast(msg);setTimeout(()=>setToast(null),3000);}

  const getStatus = (id) => attendance[id]?.status||"pending";
  const counts={
    present:students.filter(s=>getStatus(s.id)==="present").length,
    late:   students.filter(s=>getStatus(s.id)==="late").length,
    excused:students.filter(s=>getStatus(s.id)==="excused").length,
    absent: students.filter(s=>getStatus(s.id)==="absent").length,
    pending:students.filter(s=>getStatus(s.id)==="pending").length,
  };
  const filteredStudents=students.filter(s=>filter==="all"?true:filter==="pending"?getStatus(s.id)==="pending":getStatus(s.id)===filter);
  const isViewer=user.role==="viewer";

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'DM Sans',sans-serif",color:C.text}}>
      <GlobalStyles/>
      <Glow top="-15%" right="-5%" color="59,130,246" size="40vw"/>
      <Glow bottom="-10%" left="-5%" color="139,92,246" size="35vw"/>
      {toast&&<Toast msg={toast}/>}

      {/* Justify modal */}
      {justifyTarget&&(
        <JustifyModal
          student={justifyTarget.student}
          date={justifyTarget.date}
          currentReason={attendance[justifyTarget.student.id]?.reason||""}
          onSave={saveJustification}
          onClose={()=>setJustifyTarget(null)}
        />
      )}

      {/* Export modal */}
      {showExport&&(
        <ExportModal
          hasMultipleDates={allDates.length>0}
          onExport={handleExport}
          onClose={()=>setShowExport(false)}
        />
      )}

      <header style={{borderBottom:`1px solid ${C.border}`,background:C.surface,padding:"0 24px",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 20px rgba(0,0,0,0.3)"}}>
        <div style={{maxWidth:980,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:60}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {view!=="sessions"&&<button className="btn" onClick={()=>{if(view==="student-history"){setView("attendance");setSearchResult(null);setSearchQuery("");}else{setView("sessions");setActiveSess(null);}}} style={{background:"none",color:C.muted,fontSize:20,padding:"4px 8px"}}>←</button>}
            <span style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:18,background:`linear-gradient(135deg,${C.accent},${C.purple})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>📋 AsistenciaApp</span>
            <span style={{fontSize:12,color:C.teal}}>⚡</span>
            {activeSession&&view!=="sessions"&&<span style={{color:C.muted,fontSize:13}}>/ {activeSession.name}</span>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {isViewer&&<span style={{background:`${C.warning}22`,color:C.warning,border:`1px solid ${C.warning}44`,borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>SOLO LECTURA</span>}
            <span style={{fontSize:13,color:C.muted}}>👤 {user.name}</span>
            <button className="btn" onClick={onLogout} style={{background:"rgba(239,68,68,0.1)",color:C.danger,border:`1px solid rgba(239,68,68,0.2)`,borderRadius:8,padding:"6px 14px",fontSize:13,fontFamily:"inherit"}}>Salir</button>
          </div>
        </div>
      </header>

      <main style={{maxWidth:980,margin:"0 auto",padding:"28px 20px",position:"relative",zIndex:1}}>

        {/* SESSIONS */}
        {view==="sessions"&&(
          <div style={{animation:"fadeUp .4s ease both"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
              <div><h2 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:22,fontWeight:700}}>Mis Sesiones</h2><p style={{color:C.muted,fontSize:13,marginTop:4}}>Selecciona una sesión</p></div>
              {!isViewer&&<button className="btn" onClick={()=>setShowNewSess(true)} style={{background:`linear-gradient(135deg,${C.accent},${C.purple})`,color:"#fff",borderRadius:10,padding:"10px 20px",fontSize:14,fontWeight:600,fontFamily:"inherit"}}>+ Nueva Sesión</button>}
            </div>
            {showNewSess&&!isViewer&&(
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:24,marginBottom:20,animation:"fadeUp .3s ease both"}}>
                <h3 style={{marginBottom:16,fontSize:15,fontWeight:600}}>Nueva Sesión</h3>
                <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                  <input className="inp" placeholder="Nombre (ej. Matemáticas 3A)" value={newSessName} onChange={e=>setNewSessName(e.target.value)} style={{flex:2,minWidth:200}}/>
                  <input className="inp" type="date" value={newSessDate} onChange={e=>setNewSessDate(e.target.value)} style={{flex:1}}/>
                  <button className="btn" onClick={createSession} style={{background:C.success,color:"#fff",borderRadius:10,padding:"10px 20px",fontSize:14,fontWeight:600,fontFamily:"inherit"}}>Crear</button>
                  <button className="btn" onClick={()=>setShowNewSess(false)} style={{background:"none",color:C.muted,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 16px",fontSize:14,fontFamily:"inherit"}}>Cancelar</button>
                </div>
              </div>
            )}
            {sessions.length===0?<Empty icon="🗂️" msg="No hay sesiones. ¡Crea la primera!"/>:(
              <div style={{display:"grid",gap:12}}>
                {sessions.map((s,i)=>(
                  <div key={s.id} className="row-hover" onClick={()=>selectSession(s)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"18px 20px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",animation:`slideIn .3s ease both`,animationDelay:`${i*.05}s`}}>
                    <div style={{display:"flex",alignItems:"center",gap:16}}>
                      <div style={{width:44,height:44,borderRadius:12,background:`linear-gradient(135deg,${C.accent}22,${C.purple}22)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>📚</div>
                      <div><div style={{fontWeight:600,fontSize:15}}>{s.name}</div><div style={{color:C.muted,fontSize:12,marginTop:2}}>📅 {fmtDate(s.date)}</div></div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{color:C.accent,fontSize:13}}>Abrir →</span>
                      {!isViewer&&<button className="btn" onClick={e=>{e.stopPropagation();deleteSession(s.id);}} style={{background:"rgba(239,68,68,0.1)",color:C.danger,border:"none",borderRadius:8,padding:"6px 10px"}}>🗑️</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ATTENDANCE */}
        {view==="attendance"&&activeSession&&(
          <div style={{animation:"fadeUp .4s ease both"}}>

            {/* Date panel */}
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:18,padding:"20px 22px",marginBottom:20}}>
              <div style={{fontSize:11,color:C.teal,fontWeight:700,letterSpacing:1,marginBottom:14}}>SELECTOR DE FECHA</div>
              <div style={{display:"flex",gap:16,flexWrap:"wrap",alignItems:"flex-start"}}>
                <div><div style={{fontSize:12,color:C.muted,marginBottom:8}}>Fecha activa</div><input className="inp" type="date" value={selectedDate} onChange={e=>changeDate(e.target.value)} style={{width:180}}/></div>
                <div style={{flex:1,minWidth:200}}>
                  <div style={{fontSize:12,color:C.muted,marginBottom:8}}>Guardadas <span style={{background:`${C.accent}22`,color:C.accent,borderRadius:20,padding:"1px 8px",fontSize:11}}>{allDates.length}</span></div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",maxHeight:64,overflowY:"auto"}}>
                    {allDates.length===0&&<span style={{color:C.muted,fontSize:12,fontStyle:"italic"}}>Sin registros</span>}
                    {allDates.map(d=><button key={d} className="btn" onClick={()=>changeDate(d)} style={{background:d===selectedDate?C.accent:`${C.accent}15`,color:d===selectedDate?"#fff":C.accent,border:`1px solid ${d===selectedDate?C.accent:C.accent+"44"}`,borderRadius:8,padding:"4px 10px",fontSize:11,fontFamily:"inherit",fontWeight:600}}>{d}</button>)}
                  </div>
                </div>
                {!isViewer&&<button className="btn" onClick={saveAttendanceForDate} disabled={saving} style={{background:`linear-gradient(135deg,${C.teal},${C.accent})`,color:"#fff",borderRadius:12,padding:"12px 22px",fontSize:14,fontWeight:600,fontFamily:"inherit",boxShadow:`0 4px 20px ${C.teal}33`,whiteSpace:"nowrap",alignSelf:"flex-end"}}>{saving?"Guardando...":"💾 Guardar fecha"}</button>}
              </div>
            </div>

            {/* Search */}
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 18px",marginBottom:20}}>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <span style={{fontSize:18}}>🔍</span>
                <input className="inp" placeholder="Buscar alumno y ver su historial..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchStudent(searchQuery)} style={{flex:1,background:"transparent",border:"none",padding:0,fontSize:14}}/>
                <button className="btn" onClick={()=>searchStudent(searchQuery)} style={{background:`${C.purple}22`,color:C.purple,border:`1px solid ${C.purple}44`,borderRadius:8,padding:"7px 16px",fontSize:13,fontFamily:"inherit",fontWeight:600,whiteSpace:"nowrap"}}>Ver historial</button>
                {searchQuery&&<button className="btn" onClick={()=>{setSearchQuery("");setSearchResult(null);}} style={{background:"none",color:C.muted,border:"none",fontSize:18,padding:"0 4px"}}>×</button>}
              </div>
              {searchResult?.notFound&&<div style={{color:C.warning,fontSize:12,marginTop:8,paddingLeft:28}}>⚠️ No se encontró alumno</div>}
            </div>

            {/* Stats — 5 tarjetas */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:18}}>
              {[
                {label:"Presentes",  count:counts.present, color:C.success, icon:"✅"},
                {label:"Retardos",   count:counts.late,    color:C.late,    icon:"🕐"},
                {label:"Justificadas",count:counts.excused,color:C.excused, icon:"📝"},
                {label:"Ausentes",   count:counts.absent,  color:C.danger,  icon:"❌"},
                {label:"Pendientes", count:counts.pending,  color:C.muted,   icon:"⏳"},
              ].map(st=>(
                <div key={st.label} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"13px 10px",textAlign:"center"}}>
                  <div style={{fontSize:20}}>{st.icon}</div>
                  <div style={{fontSize:22,fontWeight:700,color:st.color,fontFamily:"'Space Grotesk',sans-serif"}}>{st.count}</div>
                  <div style={{color:C.muted,fontSize:11}}>{st.label}</div>
                </div>
              ))}
            </div>

            {/* Segmented progress */}
            {students.length>0&&(
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"13px 20px",marginBottom:16}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:7,fontSize:12}}>
                  <span style={{color:C.muted}}>Progreso — {fmtDate(selectedDate)}</span>
                  <span style={{color:C.accent,fontWeight:600}}>{students.length-counts.pending}/{students.length}</span>
                </div>
                <div style={{background:C.border,borderRadius:6,height:8,overflow:"hidden",display:"flex"}}>
                  {[{v:counts.present,c:C.success},{v:counts.late,c:C.late},{v:counts.excused,c:C.excused},{v:counts.absent,c:C.danger}].map((seg,i)=>(
                    <div key={i} style={{height:"100%",width:`${(seg.v/Math.max(students.length,1))*100}%`,background:seg.c,transition:"width .4s ease"}}/>
                  ))}
                </div>
                <div style={{display:"flex",gap:14,marginTop:8,fontSize:11,flexWrap:"wrap"}}>
                  <span style={{color:C.success}}>✅ {counts.present}</span>
                  <span style={{color:C.late}}>🕐 {counts.late}</span>
                  <span style={{color:C.excused}}>📝 {counts.excused}</span>
                  <span style={{color:C.danger}}>❌ {counts.absent}</span>
                  <span style={{color:C.muted}}>⏳ {counts.pending}</span>
                </div>
              </div>
            )}

            {/* Toolbar */}
            {!isViewer&&(
              <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14,alignItems:"center"}}>
                <button className="btn" onClick={()=>fileRef.current.click()} style={{background:`${C.accent}22`,color:C.accent,border:`1px solid ${C.accent}44`,borderRadius:10,padding:"9px 14px",fontSize:13,fontWeight:600,fontFamily:"inherit"}}>📥 Excel</button>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={importExcel} style={{display:"none"}}/>
                <AddStudentInline onAdd={addStudent}/>
                <div style={{marginLeft:"auto",display:"flex",gap:7,flexWrap:"wrap"}}>
                  <button className="btn" onClick={()=>markAll("present")} style={{background:`${C.success}22`,color:C.success,border:`1px solid ${C.success}44`,borderRadius:9,padding:"8px 11px",fontSize:13}}>✅ Todos</button>
                  <button className="btn" onClick={()=>markAll("late")}    style={{background:`${C.late}22`,   color:C.late,   border:`1px solid ${C.late}44`,   borderRadius:9,padding:"8px 11px",fontSize:13}}>🕐 Todos</button>
                  <button className="btn" onClick={()=>markAll("absent")}  style={{background:`${C.danger}22`, color:C.danger, border:`1px solid ${C.danger}44`, borderRadius:9,padding:"8px 11px",fontSize:13}}>❌ Todos</button>
                  {/* Export button */}
                  <button className="btn" onClick={()=>setShowExport(true)}
                    style={{background:`linear-gradient(135deg,${C.purple},${C.accent})`,color:"#fff",borderRadius:9,padding:"8px 16px",fontSize:13,fontWeight:600,fontFamily:"inherit",boxShadow:`0 3px 12px ${C.purple}44`}}>
                    📦 Exportar
                  </button>
                </div>
              </div>
            )}

            {/* Filter chips */}
            <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
              {[["all","Todos",C.accent],["present","Presentes",C.success],["late","Retardos",C.late],["excused","Justificadas",C.excused],["absent","Ausentes",C.danger],["pending","Pendientes",C.muted]].map(([f,l,color])=>(
                <button key={f} className="btn chip" onClick={()=>setFilter(f)}
                  style={{background:filter===f?`${color}22`:"transparent",color:filter===f?color:C.muted,borderColor:filter===f?color:C.border}}>
                  {l}
                </button>
              ))}
            </div>

            {/* Student list */}
            {students.length===0?<Empty icon="👥" msg="No hay alumnos. Importa un Excel o agrégalos manualmente."/>:(
              <div style={{display:"grid",gap:8}}>
                {filteredStudents.map((s,i)=>{
                  const st=getStatus(s.id);
                  const cfg=STATUS[st];
                  const reason=attendance[s.id]?.reason||"";
                  return(
                    <div key={s.id} className="row-hover" style={{background:C.card,border:`1px solid ${cfg.color}44`,borderRadius:12,padding:"13px 18px",animation:`slideIn .3s ease both`,animationDelay:`${i*.025}s`}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
                        <div style={{display:"flex",alignItems:"center",gap:12}}>
                          <div style={{width:38,height:38,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,background:cfg.bg,color:cfg.color,flexShrink:0}}>
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{fontWeight:500,fontSize:14}}>{s.name}</div>
                            <div style={{fontSize:11,color:cfg.color,display:"flex",alignItems:"center",gap:4,marginTop:2}}>
                              <span>{cfg.icon}</span><span>{cfg.label}</span>
                              {st==="excused"&&reason&&<span style={{color:C.muted,marginLeft:4}}>· {reason.length>30?reason.substring(0,30)+"…":reason}</span>}
                            </div>
                          </div>
                        </div>

                        <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
                          {/* Historial */}
                          <button className="btn" onClick={()=>{setSearchQuery(s.name);searchStudent(s.name);}} title="Ver historial"
                            style={{background:`${C.purple}18`,color:C.purple,border:`1px solid ${C.purple}44`,borderRadius:8,padding:"5px 9px",fontSize:13}}>📅</button>

                          {!isViewer&&<>
                            <button className="btn" onClick={()=>toggleAtt(s.id,"present")} title="Presente"
                              style={{background:st==="present"?C.success:"transparent",color:st==="present"?"#fff":C.success,border:`1.5px solid ${C.success}66`,borderRadius:8,padding:"5px 10px",fontSize:13}}>✅</button>
                            <button className="btn" onClick={()=>toggleAtt(s.id,"late")} title="Retardo"
                              style={{background:st==="late"?C.late:"transparent",color:st==="late"?"#fff":C.late,border:`1.5px solid ${C.late}66`,borderRadius:8,padding:"5px 10px",fontSize:13}}>🕐</button>
                            {/* Justificar — botón especial */}
                            <button className="btn" onClick={()=>openJustify(s)} title="Justificar falta"
                              style={{background:st==="excused"?C.excused:"transparent",color:st==="excused"?"#fff":C.excused,border:`1.5px solid ${C.excused}66`,borderRadius:8,padding:"5px 10px",fontSize:13,fontWeight:st==="excused"?700:400}}>
                              📝
                            </button>
                            <button className="btn" onClick={()=>toggleAtt(s.id,"absent")} title="Ausente"
                              style={{background:st==="absent"?C.danger:"transparent",color:st==="absent"?"#fff":C.danger,border:`1.5px solid ${C.danger}66`,borderRadius:8,padding:"5px 10px",fontSize:13}}>❌</button>
                            <button className="btn" onClick={()=>removeStudent(s.id)} style={{background:"none",color:C.muted,border:"none",padding:"4px 7px",fontSize:14,opacity:.5}}>×</button>
                          </>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* STUDENT HISTORY */}
        {view==="student-history"&&searchResult?.student&&(
          <div style={{animation:"fadeUp .4s ease both"}}>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:20,padding:"28px",marginBottom:20}}>
              <div style={{display:"flex",alignItems:"center",gap:18,marginBottom:24}}>
                <div style={{width:62,height:62,borderRadius:16,background:`linear-gradient(135deg,${C.accent}33,${C.purple}33)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,fontWeight:700,color:C.accent}}>{searchResult.student.name.charAt(0).toUpperCase()}</div>
                <div><h2 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:20,fontWeight:700}}>{searchResult.student.name}</h2><div style={{color:C.muted,fontSize:13,marginTop:3}}>Historial — {activeSession?.name}</div></div>
              </div>
              {(()=>{
                const total=searchResult.history.length;
                const pres=searchResult.history.filter(h=>h.status==="present").length;
                const late=searchResult.history.filter(h=>h.status==="late").length;
                const exc=searchResult.history.filter(h=>h.status==="excused").length;
                const aus=searchResult.history.filter(h=>h.status==="absent").length;
                const pct=total>0?Math.round(((pres+late+exc)/total)*100):0;
                return(
                  <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8,marginBottom:24}}>
                    {[
                      {label:"Clases",v:total,color:C.accent,icon:"📅"},
                      {label:"Presencias",v:pres,color:C.success,icon:"✅"},
                      {label:"Retardos",v:late,color:C.late,icon:"🕐"},
                      {label:"Justificadas",v:exc,color:C.excused,icon:"📝"},
                      {label:"Faltas",v:aus,color:C.danger,icon:"❌"},
                      {label:"% Asist.",v:pct+"%",color:pct>=80?C.success:pct>=60?C.warning:C.danger,icon:"📊"},
                    ].map(st=>(
                      <div key={st.label} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"11px 8px",textAlign:"center"}}>
                        <div>{st.icon}</div>
                        <div style={{fontSize:18,fontWeight:700,color:st.color,fontFamily:"'Space Grotesk',sans-serif",marginTop:4}}>{st.v}</div>
                        <div style={{color:C.muted,fontSize:10,marginTop:2}}>{st.label}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
              {searchResult.history.length===0?<Empty icon="📭" msg="Sin registros guardados"/>:(
                <>
                  <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1,marginBottom:10}}>LÍNEA DE TIEMPO</div>
                  <div style={{display:"grid",gap:8,maxHeight:400,overflowY:"auto"}}>
                    {searchResult.history.map((h,i)=>{
                      const cfg=STATUS[h.status]||STATUS.pending;
                      return(
                        <div key={h.date} style={{background:C.surface,border:`1px solid ${cfg.color}33`,borderRadius:10,padding:"12px 16px",animation:`slideIn .25s ease both`,animationDelay:`${i*.04}s`}}>
                          <div style={{display:"flex",alignItems:"center",gap:14}}>
                            <div style={{fontSize:18}}>{cfg.icon}</div>
                            <div style={{flex:1}}>
                              <div style={{fontWeight:500,fontSize:13}}>{fmtDate(h.date)}</div>
                              <div style={{fontSize:11,color:C.muted}}>{h.date}</div>
                            </div>
                            <div style={{fontSize:12,fontWeight:600,color:cfg.color,background:`${cfg.color}18`,border:`1px solid ${cfg.color}44`,borderRadius:6,padding:"3px 12px"}}>{cfg.label}</div>
                          </div>
                          {h.status==="excused"&&h.reason&&(
                            <div style={{marginTop:8,marginLeft:32,background:`${C.excused}11`,border:`1px solid ${C.excused}33`,borderRadius:8,padding:"8px 12px",fontSize:12,color:C.excused}}>
                              <span style={{fontWeight:600}}>Motivo: </span>{h.reason}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            <button className="btn" onClick={()=>{setView("attendance");setSearchResult(null);setSearchQuery("");}} style={{background:`${C.accent}22`,color:C.accent,border:`1px solid ${C.accent}44`,borderRadius:10,padding:"10px 20px",fontSize:14,fontFamily:"inherit"}}>← Volver</button>
          </div>
        )}
      </main>
    </div>
  );
}

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