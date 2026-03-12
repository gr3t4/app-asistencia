import C from "../config/styles.config";

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

export default ExportModal;