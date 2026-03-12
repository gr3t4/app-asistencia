import { useState } from "react";
import C from "../config/styles.config";

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

export default AddStudentInline;
