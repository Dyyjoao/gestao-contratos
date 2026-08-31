import { $, esc, msg, permite, admin } from "./core.js";
import { listarDocumentos, atualizarDocumento, empresaUnicaSelecionadaId } from "./shared.js";
import { contaAnalitica } from "./account-tree.js";
import { contaDre } from "./account-mask.js";

let centroAtual=null,plano=[];
const podeEditar=()=>admin()||permite("controladoria","editar")||permite("controladoria","centrosCusto");
const contaPermitida=c=>c?.status!=="inativo"&&contaAnalitica(c)&&contaDre(c);

function garantirCss(){
  if($("cc-matriz-v2-css"))return;
  const s=document.createElement("style");s.id="cc-matriz-v2-css";s.textContent=`
.ccv2-overlay{position:fixed;inset:0;z-index:1500;background:rgba(11,31,51,.44);display:flex;justify-content:flex-end}.ccv2-overlay.hidden{display:none}.ccv2-drawer{width:min(760px,96vw);height:100%;overflow:auto;background:#f7f9fb;padding:20px;box-shadow:-12px 0 30px rgba(11,31,51,.18)}.ccv2-head{display:flex;justify-content:space-between;gap:14px}.ccv2-head h3{margin:0}.ccv2-close{width:38px;height:38px;border:1px solid #d0d5dd;border-radius:9px;background:#fff;cursor:pointer}.ccv2-alerta{margin:12px 0;padding:10px 12px;border-radius:9px;background:#fff8ed;border:1px solid #f3c98b;color:#8a4b08;font-size:11px}.ccv2-toolbar{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.ccv2-toolbar input{flex:1;min-width:220px}.ccv2-lista{background:#fff;border:1px solid #e4e7ec;border-radius:11px;overflow:hidden}.ccv2-item{display:grid;grid-template-columns:28px 125px 1fr;gap:8px;align-items:center;padding:9px 11px;border-bottom:1px solid #eaecf0;font-size:11px}.ccv2-item:last-child{border-bottom:0}.ccv2-actions{display:flex;gap:8px;align-items:center;margin-top:12px}`;
  document.head.appendChild(s);
}
function garantirDrawer(){
  if($("ccMatrizV2Overlay"))return;
  garantirCss();const d=document.createElement("div");d.id="ccMatrizV2Overlay";d.className="ccv2-overlay hidden";d.innerHTML=`<aside class="ccv2-drawer"><div class="ccv2-head"><div><h3 id="ccMatrizV2Titulo">Contas permitidas</h3><p id="ccMatrizV2Sub"></p></div><button id="btnFecharCcMatrizV2" class="ccv2-close" type="button">✕</button></div><div class="ccv2-alerta"><strong>Regra:</strong> somente contas Analíticas das raízes 3 Receita e 4 Despesa podem ser vinculadas a Centro de Custo. Ativo/Passivo usam CC-BALANCO e Estatísticas usam CC-ESTATISTICO, ambos invisíveis.</div><div class="ccv2-toolbar"><input id="ccMatrizV2Busca" type="search" placeholder="Buscar código ou conta"><button id="btnCcMatrizV2Todas" class="btn-secundario" type="button">Marcar todas</button><button id="btnCcMatrizV2Limpar" class="btn-secundario" type="button">Limpar</button></div><div id="ccMatrizV2Lista" class="ccv2-lista"></div><div class="ccv2-actions"><button id="btnSalvarCcMatrizV2" class="btn-primario" type="button">Salvar permissões</button><span id="mensagemCcMatrizV2" class="mensagem-form"></span></div></aside>`;
  document.body.appendChild(d);$("btnFecharCcMatrizV2")?.addEventListener("click",fechar);d.addEventListener("click",e=>{if(e.target===d)fechar()});$("ccMatrizV2Busca")?.addEventListener("input",renderLista);$("btnCcMatrizV2Todas")?.addEventListener("click",()=>document.querySelectorAll("#ccMatrizV2Lista [data-ccv2-conta]").forEach(x=>x.checked=true));$("btnCcMatrizV2Limpar")?.addEventListener("click",()=>document.querySelectorAll("#ccMatrizV2Lista [data-ccv2-conta]").forEach(x=>x.checked=false));$("btnSalvarCcMatrizV2")?.addEventListener("click",salvar);
}
function fechar(){$("ccMatrizV2Overlay")?.classList.add("hidden");centroAtual=null;msg($("mensagemCcMatrizV2"),"")}
function renderLista(){
  const box=$("ccMatrizV2Lista");if(!box||!centroAtual)return;
  const q=String($("ccMatrizV2Busca")?.value||"").trim().toLowerCase(),sel=new Set(Array.isArray(centroAtual.contasPermitidas)?centroAtual.contasPermitidas:[]),arr=plano.filter(c=>contaPermitida(c)&&(!q||`${c.codigo||""} ${c.nome||""}`.toLowerCase().includes(q))).sort((a,b)=>String(a.codigo||"").localeCompare(String(b.codigo||""),"pt-BR"));
  box.innerHTML=arr.length?arr.map(c=>`<label class="ccv2-item"><input data-ccv2-conta="${esc(c.id)}" type="checkbox" ${sel.has(c.id)?"checked":""}><strong>${esc(c.codigo||"")}</strong><span>${esc(c.nome||"")}</span></label>`).join(""):'<div style="padding:18px;color:#667085;font-size:11px">Nenhuma conta Analítica de Receita/Despesa disponível.</div>';
}
export async function abrirMatrizCentro(id){
  if(!empresaUnicaSelecionadaId())return alert("Selecione apenas uma empresa no cabeçalho.");
  garantirDrawer();$("ccMatrizV2Overlay")?.classList.remove("hidden");msg($("mensagemCcMatrizV2"),"Carregando...");
  try{const[cs,ps]=await Promise.all([listarDocumentos("centrosCusto"),listarDocumentos("planoContasGerencial")]);centroAtual=cs.find(x=>x.id===id);plano=ps;if(!centroAtual)throw new Error("centro-nao-encontrado");$("ccMatrizV2Titulo").textContent=`Contas permitidas · ${centroAtual.codigo||""}`;$("ccMatrizV2Sub").textContent=centroAtual.nome||"Centro de Custo";$("ccMatrizV2Busca").value="";renderLista();$("btnSalvarCcMatrizV2").disabled=!podeEditar();msg($("mensagemCcMatrizV2"),podeEditar()?"":"Seu perfil pode visualizar, mas não alterar.")}catch(e){console.error(e);msg($("mensagemCcMatrizV2"),"Não foi possível carregar a matriz.")}
}
async function salvar(){
  if(!centroAtual||!podeEditar())return;const contasPermitidas=[...document.querySelectorAll("#ccMatrizV2Lista [data-ccv2-conta]:checked")].map(x=>x.dataset.ccv2Conta),b=$("btnSalvarCcMatrizV2");b.disabled=true;msg($("mensagemCcMatrizV2"),"Salvando...");
  try{await atualizarDocumento("centrosCusto",centroAtual.id,{contasPermitidas});centroAtual={...centroAtual,contasPermitidas};msg($("mensagemCcMatrizV2"),`${contasPermitidas.length} conta(s) autorizada(s).`,true);window.dispatchEvent(new CustomEvent("sig:center-accounts-changed",{detail:{centroId:centroAtual.id,contasPermitidas}}))}catch(e){console.error(e);msg($("mensagemCcMatrizV2"),"Não foi possível salvar as permissões.")}finally{b.disabled=!podeEditar()}
}
garantirDrawer();
