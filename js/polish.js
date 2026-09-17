import { $, on } from "./core.js";

const style=document.createElement("style");
style.textContent=`
button:disabled{opacity:.62;cursor:wait;transform:none!important}
#mensagemLogin{min-height:22px;margin-top:14px;font-weight:650;line-height:1.35}
.login-card{border:1px solid rgba(255,255,255,.12)}
.login-card .campo input{font-size:16px}
.admin-card-button:focus-visible,.btn-primario:focus-visible,.btn-secundario:focus-visible,.btn-acao:focus-visible,.menu-item:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid rgba(20,184,166,.28);outline-offset:2px}
.toast-sig{position:fixed;right:18px;bottom:18px;z-index:500;max-width:360px;padding:12px 15px;border-radius:10px;background:#0b1f33;color:#fff;box-shadow:0 16px 40px rgba(0,0,0,.22);font-size:13px;line-height:1.4;animation:sigIn .18s ease}
.toast-sig.ok{background:#087a55}.toast-sig.erro{background:#8f1c13}@keyframes sigIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@media(max-width:620px){
 .conteudo{padding:16px 12px 22px!important}.welcome h2,.pagina-cabecalho h2{font-size:22px!important}.pagina-cabecalho{gap:14px!important}.pagina-cabecalho>.btn-primario{width:100%;min-height:44px}
 .admin-card{min-height:145px!important;padding:20px!important}.admin-card-link{margin-top:15px!important}.mini-card{padding:14px 16px!important}.mini-card strong{font-size:21px!important}
 .form-card{padding:17px!important}.form-acoes{display:grid!important;grid-template-columns:1fr!important}.form-acoes button{width:100%;min-height:44px}.campo input,.campo select,.campo-busca{min-height:46px!important;font-size:16px!important}
 .tabela-container{margin:0 -1px}.tabela th,.tabela td{padding:12px 13px!important}.acoes-tabela{min-width:150px}
 .modal-overlay{align-items:end!important;padding:0!important}.modal-card{width:100%!important;max-width:none!important;border-radius:18px 18px 0 0!important;padding:22px 18px max(22px,env(safe-area-inset-bottom))!important}
 .login-page{padding:16px!important;align-items:center}.login-card{padding:28px 22px!important;border-radius:18px!important}.login-logo{width:56px!important;height:56px!important;border-radius:15px!important;margin-bottom:18px!important}.login-card h1{font-size:23px!important}.login-subtitulo{margin-bottom:22px!important}
}
`;
document.head.appendChild(style);

let toastTimer;
export function toast(texto,tipo=""){let el=$("sigToast");if(!el){el=document.createElement("div");el.id="sigToast";el.className="toast-sig";document.body.appendChild(el)}el.className=`toast-sig ${tipo}`;el.textContent=texto;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.remove(),3200)}

on(window,"offline",()=>toast("Sem conexão. Algumas ações ficarão indisponíveis.","erro"));
on(window,"online",()=>toast("Conexão restabelecida.","ok"));
window.addEventListener("unhandledrejection",evento=>{console.error("Falha não tratada no SIG:",evento.reason)});
