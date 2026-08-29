import { db, state, admin, $, esc } from "./core.js";
import { collection, getDocs, getDoc, doc, query, where } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const STORAGE_PREFIX="sig_empresa_contexto";

function idsEmpresasUsuario(){
  return [...new Set([state.usuario?.empresaId,...(Array.isArray(state.usuario?.empresasAcesso)?state.usuario.empresasAcesso:[])].filter(Boolean))];
}

function chaveStorage(){return `${STORAGE_PREFIX}:${state.usuario?.id||"anon"}`}

function nomeEmpresa(e){return e?.nomeFantasia||e?.razaoSocial||e?.id||"Empresa"}

function montarSeletor(){
  if($("empresaContexto"))return $("empresaContexto");
  const usuario=document.querySelector(".app-topbar .usuario");
  if(!usuario)return null;
  const wrap=document.createElement("div");
  wrap.className="empresa-contexto";
  wrap.innerHTML=`<label for="empresaContexto">Empresa</label><select id="empresaContexto" aria-label="Empresa ativa"></select>`;
  usuario.before(wrap);
  return wrap.querySelector("select");
}

async function buscarEmpresasPermitidas(){
  const mapa=new Map();
  if(!state.usuario?.grupoId)return mapa;
  if(admin()||state.usuario?.acessoGlobal===true){
    const snap=await getDocs(query(collection(db,"empresas"),where("grupoId","==",state.usuario.grupoId)));
    snap.forEach(r=>{const d=r.data();if(d.ativo!==false)mapa.set(r.id,{id:r.id,...d})});
  }else{
    for(const id of idsEmpresasUsuario()){
      try{
        const snap=await getDoc(doc(db,"empresas",id));
        if(snap.exists()){
          const d=snap.data();
          if(d.ativo!==false&&d.grupoId===state.usuario.grupoId)mapa.set(snap.id,{id:snap.id,...d});
        }
      }catch(e){console.warn("Não foi possível carregar empresa permitida",id,e)}
    }
  }
  state.empresas=new Map([...state.empresas,...mapa]);
  return mapa;
}

function ocultarSeletoresLocais(){
  const ids=[
    "contratoEmpresa","prestadorEmpresa","veiculoEmpresa","itemEmpresa","cotacaoEmpresa",
    "ctrlEmpresa","controladoriaEmpresaFiltro"
  ];
  ids.forEach(id=>{
    const el=$(id);if(!el)return;
    const campo=el.closest(".campo");
    if(campo){campo.classList.add("empresa-local-oculta");campo.setAttribute("aria-hidden","true")}
  });
}

function atualizarSubtitulo(){
  const subt=$("subtituloContexto");
  const e=state.empresas.get(state.empresaAtualId);
  if(subt)subt.textContent=e?`${state.grupo?.nome||"Grupo"} · ${nomeEmpresa(e)}`:(state.grupo?.nome||"Sistema Integrado de Gestão");
}

function reabrirPaginaAtual(){
  const pagina=document.querySelector(".pagina:not(.hidden)");
  const nome=pagina?.id?.replace("pagina-","");
  if(nome)window.dispatchEvent(new CustomEvent("sig:page",{detail:{pagina:nome,empresaId:state.empresaAtualId}}));
  window.dispatchEvent(new CustomEvent("sig:empresa-changed",{detail:{empresaId:state.empresaAtualId}}));
}

export function empresaAtualId(){return state.empresaAtualId||state.usuario?.empresaId||""}
export function empresaAtual(){return state.empresas.get(empresaAtualId())||null}

export function definirEmpresaAtual(id,{emitir=true}={}){
  if(!id||!state.empresas.has(id))return false;
  state.empresaAtualId=id;
  try{localStorage.setItem(chaveStorage(),id)}catch{}
  const seletor=$("empresaContexto");if(seletor&&seletor.value!==id)seletor.value=id;
  atualizarSubtitulo();
  ocultarSeletoresLocais();
  if(emitir)reabrirPaginaAtual();
  return true;
}

export async function carregarContextoEmpresa(){
  const seletor=montarSeletor();if(!seletor)return;
  seletor.disabled=true;seletor.innerHTML='<option>Carregando empresas...</option>';
  try{
    const mapa=await buscarEmpresasPermitidas();
    const arr=[...mapa.values()].sort((a,b)=>nomeEmpresa(a).localeCompare(nomeEmpresa(b),"pt-BR"));
    if(!arr.length){seletor.innerHTML='<option value="">Nenhuma empresa disponível</option>';state.empresaAtualId="";return}
    seletor.innerHTML=arr.map(e=>`<option value="${esc(e.id)}">${esc(nomeEmpresa(e))}</option>`).join("");
    let salvo="";try{salvo=localStorage.getItem(chaveStorage())||""}catch{}
    const inicial=[salvo,state.usuario?.empresaId,arr[0]?.id].find(id=>id&&mapa.has(id));
    definirEmpresaAtual(inicial,{emitir:false});
    seletor.disabled=arr.length===1;
    seletor.title=arr.length===1?"Seu acesso está restrito a esta empresa":"Trocar empresa ativa";
    ocultarSeletoresLocais();
    reabrirPaginaAtual();
  }catch(e){
    console.error("Erro ao carregar contexto da empresa",e);
    seletor.innerHTML='<option value="">Erro ao carregar empresas</option>';
  }
}

document.addEventListener("change",e=>{
  if(e.target?.id==="empresaContexto")definirEmpresaAtual(e.target.value);
});

window.addEventListener("sig:ready",carregarContextoEmpresa);
window.addEventListener("sig:page",()=>{ocultarSeletoresLocais();atualizarSubtitulo()});
