import { db, state, admin, $, esc } from "./core.js";
import { collection, getDocs, getDoc, doc, query, where } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const STORAGE_PREFIX="sig_contexto_global";
const MESES=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
const NOMES_MESES=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const PERIODOS={
  total:{label:"Total",indices:[0,1,2,3,4,5,6,7,8,9,10,11]},
  t1:{label:"T1 · Jan–Mar",indices:[0,1,2]},
  t2:{label:"T2 · Abr–Jun",indices:[3,4,5]},
  t3:{label:"T3 · Jul–Set",indices:[6,7,8]},
  t4:{label:"T4 · Out–Dez",indices:[9,10,11]}
};
NOMES_MESES.forEach((nome,i)=>PERIODOS[`m${String(i+1).padStart(2,"0")}`]={label:nome,indices:[i]});

function idsEmpresasUsuario(){
  return [...new Set([state.usuario?.empresaId,...(Array.isArray(state.usuario?.empresasAcesso)?state.usuario.empresasAcesso:[])].filter(Boolean))];
}
function chaveStorage(){return `${STORAGE_PREFIX}:${state.usuario?.id||"anon"}`}
function nomeEmpresa(e){return e?.nomeFantasia||e?.razaoSocial||e?.id||"Empresa"}
function contextoSalvo(){
  try{return JSON.parse(localStorage.getItem(chaveStorage())||"{}")||{}}catch{return{}}
}
function salvarContexto(){
  try{localStorage.setItem(chaveStorage(),JSON.stringify({
    grupoId:grupoAtualId(),
    empresaIds:empresasSelecionadasIds(),
    todasEmpresas:state.todasEmpresasSelecionadas===true,
    ano:periodoAno(),
    periodo:periodoChave()
  }))}catch{}
}

function garantirCss(){
  if(document.getElementById("sig-contexto-global-css"))return;
  const s=document.createElement("style");s.id="sig-contexto-global-css";s.textContent=`
  .contexto-global{display:flex;align-items:flex-end;gap:8px;min-width:0;margin-left:auto;margin-right:10px}
  .ctx-campo{display:grid;gap:3px;min-width:120px;position:relative}.ctx-campo>label{font-size:8px;font-weight:850;letter-spacing:.06em;text-transform:uppercase;color:#7b8794}
  .ctx-select,.ctx-empresas summary{height:34px;border:1px solid #d7e1e6;border-radius:9px;background:#fff;color:#263746;padding:0 10px;font:inherit;font-size:11px;font-weight:750;box-sizing:border-box}
  .ctx-select{min-width:130px}.ctx-grupo{max-width:190px}.ctx-empresas{position:relative;min-width:175px}.ctx-empresas summary{display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;list-style:none}.ctx-empresas summary::-webkit-details-marker{display:none}.ctx-empresas summary:after{content:'▾';font-size:9px;color:#667085}
  .ctx-empresas[open] summary{border-color:#0c9488;box-shadow:0 0 0 2px rgba(12,148,136,.08)}
  .ctx-empresas-pop{position:absolute;right:0;top:39px;z-index:1200;width:285px;max-height:330px;overflow:auto;background:#fff;border:1px solid #d7e1e6;border-radius:11px;box-shadow:0 16px 35px rgba(16,24,40,.14);padding:8px}
  .ctx-check{display:flex;align-items:center;gap:9px;padding:8px 7px;border-radius:7px;font-size:11px;color:#344054;cursor:pointer}.ctx-check:hover{background:#f5f8f9}.ctx-check input{accent-color:#0c9488}.ctx-check.todas{font-weight:850;border-bottom:1px solid #eaecf0;margin-bottom:4px;padding-bottom:10px}
  .ctx-periodo{display:flex;align-items:center;gap:4px}.ctx-ano-btn{width:30px;height:34px;border:1px solid #d7e1e6;background:#fff;border-radius:8px;color:#52606d;font-weight:850;cursor:pointer}.ctx-ano-btn:hover{border-color:#0c9488;color:#087a6f}.ctx-ano-atual{height:34px;min-width:58px;border-radius:8px;background:#0b1f33;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:850}
  .ctx-alerta-multi{position:fixed;right:18px;bottom:18px;z-index:1300;background:#0b1f33;color:#fff;border-radius:11px;padding:10px 13px;font-size:11px;box-shadow:0 12px 26px rgba(11,31,51,.22);max-width:330px}.ctx-alerta-multi strong{color:#7de3d5}
  @media(max-width:1100px){.contexto-global{flex-wrap:wrap;justify-content:flex-end}.ctx-campo{min-width:105px}.ctx-empresas{min-width:150px}}
  @media(max-width:760px){.contexto-global{width:100%;order:3;margin:8px 0 0;display:grid;grid-template-columns:1fr 1fr}.ctx-campo,.ctx-empresas{min-width:0}.ctx-select{width:100%;min-width:0}.ctx-periodo{align-self:end}.ctx-empresas-pop{left:0;right:auto;width:min(285px,85vw)}}`;
  document.head.appendChild(s);
}

function opcoesPeriodo(){
  return `<optgroup label="Períodos"><option value="total">Total</option><option value="t1">T1 · Jan–Mar</option><option value="t2">T2 · Abr–Jun</option><option value="t3">T3 · Jul–Set</option><option value="t4">T4 · Out–Dez</option></optgroup><optgroup label="Meses">${NOMES_MESES.map((m,i)=>`<option value="m${String(i+1).padStart(2,"0")}">${m}</option>`).join("")}</optgroup>`;
}

function montarContexto(){
  if($("contextoGlobal"))return $("contextoGlobal");
  const usuario=document.querySelector(".app-topbar .usuario");if(!usuario)return null;
  garantirCss();
  const wrap=document.createElement("div");wrap.id="contextoGlobal";wrap.className="contexto-global";wrap.innerHTML=`
    <div class="ctx-campo"><label for="grupoContexto">Grupo empresarial</label><select id="grupoContexto" class="ctx-select ctx-grupo" aria-label="Grupo empresarial"></select></div>
    <div class="ctx-campo"><label>Empresas</label><details id="empresasContexto" class="ctx-empresas"><summary id="empresasContextoResumo">Carregando...</summary><div id="empresasContextoLista" class="ctx-empresas-pop"></div></details></div>
    <div class="ctx-campo"><label>Exercício</label><div class="ctx-periodo"><button id="ctxAnoAnterior" class="ctx-ano-btn" type="button" aria-label="Exercício anterior">‹</button><span id="ctxAnoAtual" class="ctx-ano-atual"></span><button id="ctxAnoProximo" class="ctx-ano-btn" type="button" aria-label="Próximo exercício">›</button></div></div>
    <div class="ctx-campo"><label for="periodoContexto">Competência</label><select id="periodoContexto" class="ctx-select" aria-label="Competência">${opcoesPeriodo()}</select></div>`;
  usuario.before(wrap);
  $("ctxAnoAnterior")?.addEventListener("click",()=>definirPeriodo(periodoAno()-1,periodoChave()));
  $("ctxAnoProximo")?.addEventListener("click",()=>definirPeriodo(periodoAno()+1,periodoChave()));
  $("periodoContexto")?.addEventListener("change",e=>definirPeriodo(periodoAno(),e.target.value));
  return wrap;
}

async function buscarEmpresasPermitidas(){
  const mapa=new Map();if(!state.usuario?.grupoId)return mapa;
  if(admin()||state.usuario?.acessoGlobal===true){
    const snap=await getDocs(query(collection(db,"empresas"),where("grupoId","==",state.usuario.grupoId)));
    snap.forEach(r=>{const d=r.data();if(d.ativo!==false)mapa.set(r.id,{id:r.id,...d})});
  }else{
    for(const id of idsEmpresasUsuario()){
      try{const snap=await getDoc(doc(db,"empresas",id));if(snap.exists()){const d=snap.data();if(d.ativo!==false&&d.grupoId===state.usuario.grupoId)mapa.set(snap.id,{id:snap.id,...d})}}catch(e){console.warn("Não foi possível carregar empresa permitida",id,e)}
    }
  }
  state.empresas=new Map([...state.empresas,...mapa]);return mapa;
}

function ocultarSeletoresLocais(){
  const ids=["contratoEmpresa","prestadorEmpresa","veiculoEmpresa","itemEmpresa","cotacaoEmpresa","ctrlEmpresa","controladoriaEmpresaFiltro"];
  ids.forEach(id=>{const el=$(id);if(!el)return;const campo=el.closest(".campo");if(campo){campo.classList.add("empresa-local-oculta");campo.setAttribute("aria-hidden","true")}});
}

function atualizarGrupo(){
  const sel=$("grupoContexto");if(!sel)return;
  const g=state.grupo;sel.innerHTML=g?`<option value="${esc(g.id)}">${esc(g.nome||"Grupo empresarial")}</option>`:'<option value="">Sem grupo</option>';sel.disabled=true;sel.title="O acesso atual está vinculado a este grupo empresarial";
  state.grupoAtualId=g?.id||state.usuario?.grupoId||"";
}

function atualizarResumoEmpresas(){
  const resumo=$("empresasContextoResumo"),ids=empresasSelecionadasIds(),permitidas=[...state.empresas.values()].filter(e=>e.ativo!==false&&e.grupoId===grupoAtualId());if(!resumo)return;
  if(!ids.length)resumo.textContent="Nenhuma empresa";
  else if(state.todasEmpresasSelecionadas===true&&ids.length===permitidas.length)resumo.textContent=`Todas (${ids.length})`;
  else if(ids.length===1)resumo.textContent=nomeEmpresa(state.empresas.get(ids[0]));
  else resumo.textContent=`${ids.length} empresas`;
}

function atualizarListaEmpresas(){
  const lista=$("empresasContextoLista");if(!lista)return;
  const arr=[...state.empresas.values()].filter(e=>e.ativo!==false&&e.grupoId===grupoAtualId()).sort((a,b)=>nomeEmpresa(a).localeCompare(nomeEmpresa(b),"pt-BR"));
  const ids=new Set(empresasSelecionadasIds()),todas=arr.length>0&&arr.every(e=>ids.has(e.id));
  lista.innerHTML=`<label class="ctx-check todas"><input id="ctxTodasEmpresas" type="checkbox" ${todas?"checked":""}> Todas as empresas</label>${arr.map(e=>`<label class="ctx-check"><input type="checkbox" data-ctx-empresa="${esc(e.id)}" ${ids.has(e.id)?"checked":""}> <span>${esc(nomeEmpresa(e))}</span></label>`).join("")}`;
  $("ctxTodasEmpresas")?.addEventListener("change",e=>{
    if(e.target.checked)definirEmpresasSelecionadas(arr.map(x=>x.id),{todas:true});
    else definirEmpresasSelecionadas(arr[0]?[arr[0].id]:[],{todas:false});
  });
  lista.querySelectorAll("[data-ctx-empresa]").forEach(ch=>ch.addEventListener("change",()=>{
    let novos=[...lista.querySelectorAll("[data-ctx-empresa]:checked")].map(x=>x.dataset.ctxEmpresa);
    if(!novos.length){ch.checked=true;novos=[ch.dataset.ctxEmpresa]}
    definirEmpresasSelecionadas(novos,{todas:novos.length===arr.length});
  }));
}

function atualizarSubtitulo(){
  const subt=$("subtituloContexto"),ids=empresasSelecionadasIds();if(!subt)return;
  let emp="Nenhuma empresa";if(state.todasEmpresasSelecionadas)emp="Todas as empresas";else if(ids.length===1)emp=nomeEmpresa(state.empresas.get(ids[0]));else if(ids.length>1)emp=`${ids.length} empresas`;
  subt.textContent=`${state.grupo?.nome||"Grupo"} · ${emp} · ${periodoLabel()} ${periodoAno()}`;
}

function emitirContexto(tipo="contexto"){
  const detail={grupoId:grupoAtualId(),empresaIds:empresasSelecionadasIds(),empresaId:empresaUnicaSelecionadaId(),multiEmpresa:empresasSelecionadasIds().length>1,ano:periodoAno(),periodo:periodoChave(),periodoLabel:periodoLabel()};
  window.dispatchEvent(new CustomEvent("sig:contexto-changed",{detail}));
  if(tipo==="empresa"||tipo==="contexto")window.dispatchEvent(new CustomEvent("sig:empresa-changed",{detail}));
  if(tipo==="periodo"||tipo==="contexto")window.dispatchEvent(new CustomEvent("sig:periodo-changed",{detail}));
  const pagina=document.querySelector(".pagina:not(.hidden)"),nome=pagina?.id?.replace("pagina-","");if(nome)window.dispatchEvent(new CustomEvent("sig:page",{detail:{pagina:nome,...detail}}));
}

export function grupoAtualId(){return state.grupoAtualId||state.grupo?.id||state.usuario?.grupoId||""}
export function empresasSelecionadasIds(){
  const ids=Array.isArray(state.empresasSelecionadasIds)?state.empresasSelecionadasIds.filter(id=>state.empresas.has(id)):[];
  if(ids.length)return [...new Set(ids)];
  const fallback=state.empresaAtualId||state.usuario?.empresaId;return fallback?[fallback]:[];
}
export function empresaAtualId(){return empresasSelecionadasIds()[0]||""}
export function empresaUnicaSelecionadaId(){const ids=empresasSelecionadasIds();return ids.length===1?ids[0]:""}
export function empresaAtual(){const id=empresaUnicaSelecionadaId()||empresaAtualId();return state.empresas.get(id)||null}
export function temUmaEmpresaSelecionada(){return empresasSelecionadasIds().length===1}
export function periodoAno(){return Number(state.periodoAno)||new Date().getFullYear()}
export function periodoChave(){return PERIODOS[state.periodoChave]?state.periodoChave:`m${String(new Date().getMonth()+1).padStart(2,"0")}`}
export function periodoAtual(){const chave=periodoChave(),p=PERIODOS[chave]||PERIODOS.total;return{ano:periodoAno(),chave,label:p.label,indices:[...p.indices],meses:p.indices.map(i=>MESES[i])}}
export function periodoLabel(){return periodoAtual().label}
export function periodoMeses(){return periodoAtual().meses}

export function definirEmpresasSelecionadas(ids,{emitir=true,todas=false}={}){
  const validos=[...new Set((ids||[]).filter(id=>state.empresas.has(id)&&state.empresas.get(id)?.grupoId===grupoAtualId()&&state.empresas.get(id)?.ativo!==false))];
  if(!validos.length)return false;
  state.empresasSelecionadasIds=validos;state.empresaAtualId=validos[0];state.todasEmpresasSelecionadas=todas===true;
  atualizarResumoEmpresas();atualizarListaEmpresas();atualizarSubtitulo();ocultarSeletoresLocais();salvarContexto();if(emitir)emitirContexto("empresa");return true;
}

export function definirPeriodo(ano,chave,{emitir=true}={}){
  const a=Math.max(2020,Math.min(2100,Number(ano)||new Date().getFullYear())),p=PERIODOS[chave]?chave:"total";
  state.periodoAno=a;state.periodoChave=p;if($("ctxAnoAtual"))$("ctxAnoAtual").textContent=String(a);if($("periodoContexto"))$("periodoContexto").value=p;atualizarSubtitulo();salvarContexto();if(emitir)emitirContexto("periodo");return true;
}

export async function carregarContextoEmpresa(){
  if(!montarContexto())return;atualizarGrupo();
  const resumo=$("empresasContextoResumo");if(resumo)resumo.textContent="Carregando...";
  try{
    const mapa=await buscarEmpresasPermitidas(),arr=[...mapa.values()].sort((a,b)=>nomeEmpresa(a).localeCompare(nomeEmpresa(b),"pt-BR"));
    if(!arr.length){state.empresasSelecionadasIds=[];state.empresaAtualId="";atualizarResumoEmpresas();return}
    const salvo=contextoSalvo(),permitidos=new Set(arr.map(e=>e.id));let ids=(Array.isArray(salvo.empresaIds)?salvo.empresaIds:[]).filter(id=>permitidos.has(id));
    if(salvo.todasEmpresas===true)ids=arr.map(e=>e.id);if(!ids.length){const inicial=[state.usuario?.empresaId,arr[0]?.id].find(id=>id&&permitidos.has(id));ids=inicial?[inicial]:[arr[0].id]}
    state.periodoAno=Number(salvo.ano)||new Date().getFullYear();state.periodoChave=PERIODOS[salvo.periodo]?salvo.periodo:`m${String(new Date().getMonth()+1).padStart(2,"0")}`;
    definirEmpresasSelecionadas(ids,{emitir:false,todas:salvo.todasEmpresas===true&&ids.length===arr.length});definirPeriodo(state.periodoAno,state.periodoChave,{emitir:false});atualizarListaEmpresas();ocultarSeletoresLocais();emitirContexto("contexto");
  }catch(e){console.error("Erro ao carregar contexto global",e);if(resumo)resumo.textContent="Erro ao carregar"}
}

window.addEventListener("sig:ready",carregarContextoEmpresa);
window.addEventListener("sig:page",()=>{ocultarSeletoresLocais();atualizarSubtitulo()});
