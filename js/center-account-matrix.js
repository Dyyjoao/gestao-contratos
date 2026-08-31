import { $, esc, msg, permite } from "./core.js";
import { listarDocumentos, atualizarDocumento, empresaUnicaSelecionadaId } from "./shared.js";

let centroAtual=null,plano=[];

function podeEditar(){return permite("controladoria","editar")||permite("controladoria","centrosCusto")}
function garantirCss(){
  if($("centro-contas-css"))return;
  const s=document.createElement("style");s.id="centro-contas-css";s.textContent=`
    .cc-overlay{position:fixed;inset:0;z-index:1400;background:rgba(11,31,51,.42);display:flex;justify-content:flex-end}.cc-overlay.hidden{display:none}.cc-drawer{width:min(720px,96vw);height:100%;overflow:auto;background:#f7f9fb;padding:18px;box-shadow:-12px 0 30px rgba(11,31,51,.18)}
    .cc-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.cc-head h3{margin:0;color:#0b1f33}.cc-head p{margin:5px 0;color:#667085;font-size:11px}.cc-close{border:1px solid #d0d5dd;background:#fff;border-radius:9px;width:38px;height:38px;cursor:pointer}
    .cc-alerta{margin:12px 0;padding:10px 12px;border-radius:9px;background:#fff8ed;border:1px solid #f3c98b;color:#8a4b08;font-size:11px}.cc-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:12px 0}.cc-toolbar input{flex:1;min-width:200px;height:36px;border:1px solid #d0d5dd;border-radius:8px;padding:0 9px}.cc-lista{background:#fff;border:1px solid #e4e7ec;border-radius:11px;overflow:hidden}.cc-item{display:grid;grid-template-columns:28px 110px 1fr 130px;gap:8px;align-items:center;padding:9px 11px;border-bottom:1px solid #eaecf0;font-size:11px}.cc-item:last-child{border-bottom:0}.cc-item:hover{background:#f8fafc}.cc-item input{accent-color:#0c9488}.cc-item strong{color:#1d2939}.cc-item small{color:#667085}.cc-actions{display:flex;gap:8px;align-items:center;margin-top:12px}.cc-actions .mensagem-form{margin-left:auto}
    @media(max-width:620px){.cc-item{grid-template-columns:28px 80px 1fr}.cc-item .cc-grupo{display:none}}
  `;document.head.appendChild(s);
}

function garantirDrawer(){
  if($("centroContasOverlay"))return;
  garantirCss();const d=document.createElement("div");d.id="centroContasOverlay";d.className="cc-overlay hidden";d.innerHTML=`<aside class="cc-drawer"><div class="cc-head"><div><h3 id="ccTitulo">Contas permitidas</h3><p id="ccSubtitulo"></p></div><button id="btnFecharCc" class="cc-close" type="button">✕</button></div><div class="cc-alerta">Regra de segurança: somente as contas marcadas aqui aparecem no Input Mensal deste centro de custo.</div><div class="cc-toolbar"><input id="ccBusca" type="search" placeholder="Buscar código ou conta"><button id="btnCcTodas" class="btn-secundario" type="button">Marcar todas</button><button id="btnCcLimpar" class="btn-secundario" type="button">Limpar</button></div><div id="ccLista" class="cc-lista"></div><div class="cc-actions"><button id="btnSalvarCc" class="btn-primario" type="button">Salvar permissões</button><span id="mensagemCc" class="mensagem-form"></span></div></aside>`;document.body.appendChild(d);
  $("btnFecharCc")?.addEventListener("click",fechar);d.addEventListener("click",e=>{if(e.target===d)fechar()});$("ccBusca")?.addEventListener("input",renderLista);$("btnCcTodas")?.addEventListener("click",()=>{document.querySelectorAll("#ccLista [data-cc-conta]").forEach(x=>x.checked=true)});$("btnCcLimpar")?.addEventListener("click",()=>{document.querySelectorAll("#ccLista [data-cc-conta]").forEach(x=>x.checked=false)});$("btnSalvarCc")?.addEventListener("click",salvar);
}
function fechar(){$("centroContasOverlay")?.classList.add("hidden");centroAtual=null;msg($("mensagemCc"),"")}
function renderLista(){const box=$("ccLista");if(!box)return;const q=String($("ccBusca")?.value||"").toLowerCase().trim(),permitidas=new Set(Array.isArray(centroAtual?.contasPermitidas)?centroAtual.contasPermitidas:[]),arr=plano.filter(x=>x.status!=="inativo"&&(!q||`${x.codigo||""} ${x.nome||""}`.toLowerCase().includes(q))).sort((a,b)=>Number(a.ordem||0)-Number(b.ordem||0)||String(a.codigo||"").localeCompare(String(b.codigo||""),"pt-BR"));box.innerHTML=arr.length?arr.map(x=>`<label class="cc-item"><input data-cc-conta="${esc(x.id)}" type="checkbox" ${permitidas.has(x.id)?"checked":""}><strong>${esc(x.codigo||"")}</strong><span>${esc(x.nome||"")}</span><small class="cc-grupo">${esc(x.grupoDre||"-")}</small></label>`).join(""):'<div style="padding:18px;color:#667085;font-size:11px">Nenhuma conta encontrada.</div>'}
async function abrir(id){
  if(!empresaUnicaSelecionadaId())return alert("Para configurar contas de um centro, selecione apenas uma empresa no cabeçalho.");garantirDrawer();$("centroContasOverlay")?.classList.remove("hidden");msg($("mensagemCc"),"Carregando...");
  try{const [centros,contas]=await Promise.all([listarDocumentos("centrosCusto"),listarDocumentos("planoContasGerencial")]);centroAtual=centros.find(x=>x.id===id);plano=contas;if(!centroAtual)throw new Error("centro-nao-encontrado");$("ccTitulo").textContent=`Contas permitidas · ${centroAtual.codigo||""}`;$("ccSubtitulo").textContent=centroAtual.nome||"Centro de custo";$("ccBusca").value="";renderLista();$("btnSalvarCc").disabled=!podeEditar();msg($("mensagemCc"),podeEditar()?"":"Seu perfil pode visualizar, mas não alterar esta matriz.")}
  catch(e){console.error(e);msg($("mensagemCc"),"Não foi possível carregar a matriz deste centro.")}
}
async function salvar(){if(!centroAtual||!podeEditar())return;const contasPermitidas=[...document.querySelectorAll("#ccLista [data-cc-conta]:checked")].map(x=>x.dataset.ccConta);const b=$("btnSalvarCc");b.disabled=true;msg($("mensagemCc"),"Salvando...");try{await atualizarDocumento("centrosCusto",centroAtual.id,{contasPermitidas});centroAtual={...centroAtual,contasPermitidas};msg($("mensagemCc"),`${contasPermitidas.length} conta(s) autorizada(s).`,true);window.dispatchEvent(new CustomEvent("sig:center-accounts-changed",{detail:{centroId:centroAtual.id,contasPermitidas}}))}catch(e){console.error(e);msg($("mensagemCc"),"Não foi possível salvar as permissões.")}finally{b.disabled=!podeEditar()}}

function instrumentar(){
  document.querySelectorAll("#listaCentrosCusto tr").forEach(tr=>{const edit=tr.querySelector("[data-edit-centro]");if(!edit)return;const id=edit.dataset.editCentro;if(tr.querySelector(`[data-contas-centro="${CSS.escape(id)}"]`))return;const b=document.createElement("button");b.type="button";b.className="btn-acao";b.dataset.contasCentro=id;b.textContent="Contas permitidas";b.addEventListener("click",()=>abrir(id));edit.before(b)})
}

garantirDrawer();instrumentar();
const tbody=$("listaCentrosCusto");if(tbody)new MutationObserver(instrumentar).observe(tbody,{childList:true});
window.addEventListener("sig:page",e=>{if(e.detail?.pagina==="controladoria")setTimeout(instrumentar,120)});
