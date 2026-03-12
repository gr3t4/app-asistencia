import C from "../config/styles.config";

function Empty({icon,msg}){ return <div style={{textAlign:"center",padding:"60px 0",color:C.muted}}><div style={{fontSize:46,marginBottom:12}}>{icon}</div><p style={{fontSize:14}}>{msg}</p></div>; }
function Toast({msg}){ return <div style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",background:"#1e293b",border:`1px solid ${C.border}`,color:C.text,padding:"12px 24px",borderRadius:12,fontSize:14,fontWeight:500,boxShadow:"0 8px 32px rgba(0,0,0,0.4)",zIndex:1000,animation:"toastIn .3s ease",whiteSpace:"nowrap"}}>{msg}</div>; }
function Glow({top,bottom,left,right,color,size="45vw"}){ return <div style={{position:"fixed",top,bottom,left,right,width:size,height:size,borderRadius:"50%",background:`radial-gradient(circle,rgba(${color},0.07) 0%,transparent 70%)`,pointerEvents:"none",zIndex:0}}/>; }
function Pill({color,label}){ return <span style={{background:`${color}18`,color,border:`1px solid ${color}33`,borderRadius:6,padding:"3px 10px",fontSize:12}}>{label}</span>; }
function Avatar({name}){ return <div style={{width:38,height:38,borderRadius:10,background:`linear-gradient(135deg,${C.accent}33,${C.purple}33)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,color:C.accent,flexShrink:0}}>{name?.charAt(0).toUpperCase()}</div>; }
function StatusBadge({active}){ return <span style={{background:active?`${C.success}18`:`${C.danger}18`,color:active?C.success:C.danger,border:`1px solid ${active?C.success:C.danger}44`,borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>{active?"Activo":"Inactivo"}</span>; }
function RoleBadge({role}){ const t=role==="teacher"; return <span style={{background:t?`${C.accent}18`:`${C.warning}18`,color:t?C.accent:C.warning,border:`1px solid ${t?C.accent:C.warning}44`,borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>{t?"Docente":role==="admin"?"Admin":"Lectura"}</span>; }

export {
    Empty,
    Toast,
    Glow,
    Pill,
    Avatar,
    StatusBadge,
    RoleBadge
}