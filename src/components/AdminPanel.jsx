import { useState } from "react";
import sb from "../config/supabase.config";
import { fmtDate, fmtDT } from "../config/date.config";
import { Pill, Toast, Empty, Avatar, StatusBadge, RoleBadge } from "./Utils";

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

export default AdminPanel;