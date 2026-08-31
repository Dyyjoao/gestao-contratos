import "./shell.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, setPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const firebaseConfig={
  apiKey:"AIzaSyDhFhXmyg44MqDkMHxgwVJ4DxEW-qqiDkU",
  authDomain:"gestao-de-contratos-b266b.firebaseapp.com",
  projectId:"gestao-de-contratos-b266b",
  storageBucket:"gestao-de-contratos-b266b.firebasestorage.app",
  messagingSenderId:"1090500586579",
  appId:"1:1090500586579:web:90419b7abe37540eeeeaa6"
};

export const app=initializeApp(firebaseConfig);
export const auth=getAuth(app);
export const db=getFirestore(app);
export const firebaseConfigPublic=firebaseConfig;
export const state={usuario:null,perfil:null,grupo:null,empresas:new Map(),usuarios:new Map(),perfis:new Map()};
export const $=id=>document.getElementById(id);
export const on=(el,ev,fn)=>el?.addEventListener(ev,fn);
export const esc=v=>v==null?"-":String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
export const norm=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
export function msg(el,texto,sucesso=false){if(!el)return;el.textContent=texto;el.classList.toggle("sucesso",sucesso)}
export function admin(){return state.perfil?.acessoTotal===true}
export function permite(modulo,acao="visualizar"){return admin()||state.perfil?.permissoes?.[modulo]?.[acao]===true}
export function podeAdministrar(){return admin()||permite("administracao")||["empresas","usuarios","perfisAcesso","grupoEmpresarial"].some(m=>permite(m))}

const SESSION_KEY="sig_login_confirmado";
const telaLogin=$("telaLogin"),sistema=$("sistema"),formLogin=$("formLogin"),email=$("email"),senha=$("senha"),mensagemLogin=$("mensagemLogin"),nomeUsuario=$("nomeUsuario"),btnSair=$("btnSair"),tituloPagina=$("tituloPagina"),subtitulo=$("subtituloContexto"),btnEntrar=formLogin?.querySelector('button[type="submit"]');
const MENUS={
  dashboard:["menuDashboard","dashboard"],contratos:["menuContratos","contratos"],prestadores:["menuPrestadores","prestadores"],frota:["menuFrota","frota"],almoxarifado:["menuAlmoxarifado","almoxarifado"],cotacoes:["menuCotacoes","cotacoes"],controladoria:["menuControladoria","controladoria"]
};
const TITULOS={dashboard:"Dashboard",contratos:"Contratos",prestadores:"Prestadores & Oficinas",frota:"Frota",almoxarifado:"Almoxarifado",cotacoes:"Solicitações & Cotações",controladoria:"Controladoria & Planejamento",administracao:"Administração",empresas:"Empresas",usuarios:"Usuários",perfis:"Perfis de Acesso",grupo:"Grupo Empresarial"};
let loginBusy=false;

function setBusy(v,t="Entrando..."){loginBusy=v;if(btnEntrar){btnEntrar.disabled=v;btnEntrar.textContent=v?"Entrando...":"Entrar"}if(v)msg(mensagemLogin,t)}
function erroLogin(e){return {"auth/invalid-credential":"E-mail ou senha inválidos.","auth/user-disabled":"Este acesso foi desativado.","auth/too-many-requests":"Muitas tentativas. Aguarde alguns minutos.","auth/network-request-failed":"Falha de conexão. Verifique sua internet."}[e?.code]||"Não foi possível entrar. Tente novamente."}

export function abrirPagina(nome){
  const p=$(`pagina-${nome}`);if(!p)return;
  document.querySelectorAll(".pagina").forEach(x=>x.classList.add("hidden"));p.classList.remove("hidden");
  document.querySelectorAll(".menu-item").forEach(x=>x.classList.remove("ativo"));
  const administrativa=["administracao","empresas","usuarios","perfis","grupo"].includes(nome);
  (administrativa?$("menuAdministracao"):document.querySelector(`.menu-item[data-pagina="${nome}"]`))?.classList.add("ativo");
  if(tituloPagina)tituloPagina.textContent=TITULOS[nome]||"SIG";
  if(subtitulo)subtitulo.textContent=state.grupo?.nome||"Sistema Integrado de Gestão";
  window.scrollTo({top:0,behavior:"smooth"});
  window.dispatchEvent(new CustomEvent("sig:page",{detail:{pagina:nome}}));
}

export function configurarMenus(){
  Object.entries(MENUS).forEach(([modulo,[id]])=>$(id)?.classList.toggle("hidden",!permite(modulo)));
  $("menuAdministracao")?.classList.toggle("hidden",!podeAdministrar());
  document.querySelectorAll("[data-ir-pagina]").forEach(b=>{const p=b.dataset.irPagina;b.classList.toggle("hidden",!permite(p))});
}
function primeira(){for(const m of ["dashboard","contratos","cotacoes","frota","almoxarifado","prestadores","controladoria"])if(permite(m))return m;if(podeAdministrar())return"administracao";return"dashboard"}

export async function carregarGrupoAtual(){if(!state.usuario?.grupoId){state.grupo=null;return}const s=await getDoc(doc(db,"gruposEmpresariais",state.usuario.grupoId));state.grupo=s.exists()?{id:s.id,...s.data()}:null}

function idsEmpresasUsuario(){return [...new Set([state.usuario?.empresaId,...(Array.isArray(state.usuario?.empresasAcesso)?state.usuario.empresasAcesso:[])].filter(Boolean))]}
async function carregarEmpresasAdministrativas(grupoId){
  const mapa=new Map();
  const precisa=admin()||permite("empresas","visualizar")||permite("empresas","cadastrar")||permite("empresas","editar")||permite("usuarios","visualizar")||permite("usuarios","cadastrar")||permite("usuarios","editar");
  if(!precisa)return mapa;
  if(admin()||state.usuario?.acessoGlobal===true){
    const s=await getDocs(query(collection(db,"empresas"),where("grupoId","==",grupoId)));s.forEach(r=>mapa.set(r.id,{id:r.id,...r.data()}));
  }else{
    for(const id of idsEmpresasUsuario()){try{const s=await getDoc(doc(db,"empresas",id));if(s.exists()&&s.data().grupoId===grupoId)mapa.set(s.id,{id:s.id,...s.data()})}catch{}}
  }
  return mapa;
}
async function carregarUsuariosAdministrativos(grupoId){
  const mapa=new Map();
  if(!(admin()||permite("usuarios","visualizar")))return mapa;
  const s=await getDocs(query(collection(db,"usuarios"),where("grupoId","==",grupoId)));s.forEach(r=>mapa.set(r.id,{id:r.id,...r.data()}));return mapa;
}
async function carregarPerfisAdministrativos(grupoId){
  const mapa=new Map();
  const precisa=admin()||permite("perfisAcesso","visualizar")||permite("perfisAcesso","cadastrar")||permite("perfisAcesso","editar")||permite("usuarios","cadastrar")||permite("usuarios","editar");
  if(!precisa)return mapa;
  const s=await getDocs(query(collection(db,"perfisAcesso"),where("grupoId","==",grupoId)));s.forEach(r=>mapa.set(r.id,{id:r.id,...r.data()}));
  if(admin()){try{const ap=await getDoc(doc(db,"perfisAcesso","administrador"));if(ap.exists())mapa.set(ap.id,{id:ap.id,...ap.data()})}catch{}}
  return mapa;
}

export async function carregarAdmin(){
  if(!podeAdministrar()||!state.usuario?.grupoId)return;
  const grupoId=state.usuario.grupoId;
  const [empresas,usuarios,perfis]=await Promise.all([carregarEmpresasAdministrativas(grupoId),carregarUsuariosAdministrativos(grupoId),carregarPerfisAdministrativos(grupoId)]);
  state.empresas=empresas;state.usuarios=usuarios;state.perfis=perfis;
  if(state.usuario&&!state.usuarios.has(state.usuario.id))state.usuarios.set(state.usuario.id,state.usuario);
  if(state.perfil&&!state.perfis.has(state.perfil.id))state.perfis.set(state.perfil.id,state.perfil);
}

export async function atualizarResumo(){
  if(!podeAdministrar())return;
  try{
    await carregarAdmin();
    if($("resumoEmpresas"))$("resumoEmpresas").textContent=state.empresas.size||"—";
    if($("resumoUsuarios"))$("resumoUsuarios").textContent=permite("usuarios","visualizar")?[...state.usuarios.values()].filter(x=>x.ativo===true).length:"—";
    if($("resumoPerfis"))$("resumoPerfis").textContent=(admin()||permite("perfisAcesso","visualizar"))?[...state.perfis.values()].filter(x=>x.ativo===true).length:"—";
  }catch(e){console.error(e);["resumoEmpresas","resumoUsuarios","resumoPerfis"].forEach(id=>{if($(id))$(id).textContent="—"})}
}

on(formLogin,"submit",async ev=>{
  ev.preventDefault();if(loginBusy)return;
  const em=email?.value.trim(),pw=senha?.value;if(!em||!pw)return;
  setBusy(true);sessionStorage.setItem(SESSION_KEY,"1");
  try{
    await setPersistence(auth,browserSessionPersistence);
    await signInWithEmailAndPassword(auth,em,pw);
    msg(mensagemLogin,"Credenciais validadas. Carregando seu acesso...");
  }catch(e){
    sessionStorage.removeItem(SESSION_KEY);console.error(e);msg(mensagemLogin,erroLogin(e));setBusy(false);
  }
});
on(btnSair,"click",()=>{sessionStorage.removeItem(SESSION_KEY);signOut(auth)});

onAuthStateChanged(auth,async user=>{
  if(!user){state.usuario=state.perfil=state.grupo=null;state.empresas=new Map();state.usuarios=new Map();state.perfis=new Map();sistema?.classList.add("hidden");telaLogin?.classList.remove("hidden");if(nomeUsuario)nomeUsuario.textContent="";setBusy(false);return}
  if(sessionStorage.getItem(SESSION_KEY)!=="1"){
    try{await signOut(auth)}catch{}
    msg(mensagemLogin,"Confirme suas credenciais para iniciar uma nova sessão.");
    setBusy(false);return;
  }
  try{
    setBusy(true,"Validando seu acesso...");
    const us=await getDoc(doc(db,"usuarios",user.uid));if(!us.exists())throw new Error("usuario-nao-autorizado");
    const ud=us.data();if(ud.ativo!==true)throw new Error("usuario-inativo");
    const ps=await getDoc(doc(db,"perfisAcesso",ud.perfilId));if(!ps.exists()||ps.data().ativo!==true)throw new Error("perfil-indisponivel");
    state.usuario={id:user.uid,...ud};state.perfil={id:ps.id,...ps.data()};
    await carregarGrupoAtual();if(state.grupo?.ativo===false)throw new Error("grupo-inativo");
    telaLogin?.classList.add("hidden");sistema?.classList.remove("hidden");if(nomeUsuario)nomeUsuario.textContent=state.usuario.nome||user.email||"Usuário";if(senha)senha.value="";msg(mensagemLogin,"");setBusy(false);
    configurarMenus();abrirPagina(primeira());if(podeAdministrar())atualizarResumo();
    window.dispatchEvent(new Event("sig:ready"));
  }catch(e){
    sessionStorage.removeItem(SESSION_KEY);
    console.error(e);const m={"usuario-nao-autorizado":"Usuário autenticado, mas sem cadastro no SIG.","usuario-inativo":"Este usuário está desativado.","perfil-indisponivel":"Seu perfil de acesso está indisponível.","grupo-inativo":"O grupo empresarial está inativo."};msg(mensagemLogin,m[e.message]||"Não foi possível validar seu acesso.");try{await signOut(auth)}catch{}setBusy(false)
  }
});

document.querySelectorAll(".menu-item").forEach(i=>on(i,"click",async()=>{const p=i.dataset.pagina;if(p==="administracao"&&!podeAdministrar())return;if(MENUS[p]&&!permite(p))return;abrirPagina(p);if(p==="administracao")await atualizarResumo()}));
document.querySelectorAll("[data-voltar-admin]").forEach(b=>on(b,"click",async()=>{abrirPagina("administracao");await atualizarResumo()}));
document.querySelectorAll("[data-ir-pagina]").forEach(b=>on(b,"click",()=>{const p=b.dataset.irPagina;if(permite(p))abrirPagina(p)}));
