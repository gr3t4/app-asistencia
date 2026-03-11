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
            <p style={{color:C.muted,fontSize:13,marginTop:6}}></p>
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

export default AuthScreen;