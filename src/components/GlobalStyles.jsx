import C from "../config/styles.config";

function GlobalStyles(){ return <style>{`
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
  `}</style>; 
}

export default GlobalStyles;