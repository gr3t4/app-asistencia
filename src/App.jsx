// ══════════════════════════════════════════════════════════════
//  AsistenciaApp v3 — Justificaciones + Exportación completa
//  npm install @supabase/supabase-js xlsx
// ══════════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from "react";
import { getSession, clearSession } from "./config/session.config";
import AuthScreen from "./components/AuthScreen";
import C from "./config/styles.config";
import AdminPanel from "./components/AdminPanel";
import TeacherApp from "./components/TeacherApp";

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
