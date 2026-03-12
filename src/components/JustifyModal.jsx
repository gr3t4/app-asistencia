import { useState } from "react";
import C from "../config/styles.config";

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

export default JustifyModal;