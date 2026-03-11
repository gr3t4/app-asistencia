import * as XLSX from "xlsx";
import sb from "../config/supabase.config";

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

export default TeacherApp;