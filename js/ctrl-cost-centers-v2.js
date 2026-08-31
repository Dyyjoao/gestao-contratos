import { abrirPagina, admin } from "./core.js";
import { $, esc, msg, permite, listarDocumentos, criarDocumento, atualizarDocumento, empresaUnicaSelecionadaId, nomeEmpresa, emitirAlteracao } from "./shared.js";
import { abrirMatrizCentro } from "./center-account-matrix-v2.js";

let centros=[],editId=null,busy=false;
const pagina=()=>$("pagina-ctrl-centros-v2");
const podeEditar=()=>admin()||permite("controladoria","editar")||permite("controladoria","centrosCusto");

function criarPagina(){
  if(pagina())return;const main=document.querySelector("main.conteudo");if(!main)return;
  const s=document.createElement("section");s.id="pagina-ctrl-centros-v2";s.className="pagina hidden";s.innerHTML=`
  <div class="pagina-cabecalho"><div><span class="eyebrow">CONTROLADORIA & FP&A</span><h2>Centros de Custo</h2><p>Estrutura gerencial que identifica onde receitas, custos e despesas acontecem.</p></div><button id="btnNovoCentroV2" class="btn-primario" type="button">+ Novo centro</button></div>
  <div class="modulo-aviso"><strong>Regra:</strong> Centro de Custo responde <em>onde ocorreu</em>; conta gerencial responde <em>o que ocorreu</em>. Ativo/Passivo e Estatísticas utilizam Centros técnicos invisíveis e não aparecem nesta lista.</div>
  <section id="formCentroV2Box" class="form-card hidden"><div class="form-card-titulo"><div><h3 id="tituloCentroV2">Novo Centro de Custo</h3><p>Salvar mantém você nesta tela.</p></div></div><form id="formCentroV2"><div class="form-grid form-grid-3">
    <div class="campo"><label for="centroV2Codigo">Código</label><input id="centroV2Codigo" required placeholder="1000001"></div>
    <div class="campo"><label for="centroV2Nome">Centro de Custo</label><input id="centroV2Nome" required placeholder="Ex.: Produção"></div>
    <div class="campo"><label for="centroV2Responsavel">Responsável</label><input id="centroV2Responsavel" placeholder="Nome do responsável"></div>
    <div class="campo"><label for="centroV2Status">Status</label><select id="centroV2Status"><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></div>
  </div><div class="form-acoes"><button id="btnCancelarCentroV2" class="btn-secundario" type="button">Cancelar</button><button class="btn-primario" type="submit">Salvar centro</button></div><p id="mensagemCentroV2" class="mensagem-form"></p></form></section>
  <section class="lista-card"><div class="lista-cabecalho"><div><h3>Centros cadastrados</h3><p id="centroV2Contexto">—</p></div><button id="btnAtualizarCentroV2" class="btn-secundario" type="button">Atualizar</button></div><div class="tabela-container"><table class="tabela"><thead><tr><th>Código</th><th>Centro de Custo</th><th>Responsável</th><th>Contas vinculadas</th><th>Status</th><th>Ações</th></tr></thead><tbody id="listaCentrosV2"></tbody></table></div></section>`;
  main.appendChild(s);$("btnNovoCentroV2")?.addEventListener("click",()=>abrirForm());$("btnCancelarCentroV2")?.addEventListener("click",fecharForm);$("formCentroV2")?.addEventListener("submit",salvar);$("btnAtualizarCentroV2")?.addEventListener("click",carregar);
}
function render(){
  const tb=$("listaCentrosV2");if(!tb)return;const emp=empresaUnicaSelecionadaId();$("centroV2Contexto").textContent=emp?`${nomeEmpresa(emp)} · ${centros.length} centro(s) de custo`:"Selecione apenas uma empresa no cabeçalho.";
  const arr=[...centros].sort((a,b)=>String(a.codigo||"").localeCompare(String(b.codigo||""),"pt-BR"));tb.innerHTML=arr.length?arr.map(c=>`<tr><td><strong>${esc(c.codigo||"")}</strong></td><td>${esc(c.nome||"")}</td><td>${esc(c.responsavel||"-")}</td><td>${Array.isArray(c.contasPermitidas)?c.contasPermitidas.length:0}</td><td><span class="${c.status==="inativo"?"status-inativo":"status-ativo"}">${c.status==="inativo"?"Inativo":"Ativo"}</span></td><td><div class="conta-acoes-inline">${podeEditar()?`<button class="btn-acao" data-ccv2-contas="${c.id}" type="button">Contas permitidas</button><button class="btn-acao destaque" data-ccv2-edit="${c.id}" type="button">Editar</button>`:"—"}</div></td></tr>`).join(""):'<tr><td colspan="6">Nenhum centro cadastrado.</td></tr>';
  tb.querySelectorAll("[data-ccv2-edit]").forEach(b=>b.addEventListener("click",()=>abrirForm(centros.find(c=>c.id===b.dataset.ccv2Edit))));tb.querySelectorAll("[data-ccv2-contas]").forEach(b=>b.addEventListener("click",()=>abrirMatrizCentro(b.dataset.ccv2Contas)));
}
function abrirForm(c=null){editId=c?.id||null;$("formCentroV2")?.reset();$("centroV2Codigo").value=c?.codigo||"";$("centroV2Nome").value=c?.nome||"";$("centroV2Responsavel").value=c?.responsavel||"";$("centroV2Status").value=c?.status||"ativo";$("tituloCentroV2").textContent=c?`Editar · ${c.codigo||""}`:"Novo Centro de Custo";$("formCentroV2Box")?.classList.remove("hidden");setTimeout(()=>$("centroV2Nome")?.focus(),20)}
function fecharForm(){editId=null;$("formCentroV2Box")?.classList.add("hidden");msg($("mensagemCentroV2"),"")}
async function carregar(){
  criarPagina();const emp=empresaUnicaSelecionadaId();if(busy)return;if(!emp){centros=[];render();return}busy=true;try{centros=await listarDocumentos("centrosCusto");render()}catch(e){console.error(e);msg($("mensagemCentroV2"),"Não foi possível carregar os Centros de Custo.")}finally{busy=false}
}
async function salvar(e){
  e.preventDefault();if(!podeEditar())return;const d={codigo:$("centroV2Codigo").value.trim(),nome:$("centroV2Nome").value.trim(),responsavel:$("centroV2Responsavel").value.trim(),status:$("centroV2Status").value};if(!d.codigo||!d.nome)return msg($("mensagemCentroV2"),"Informe código e Centro de Custo.");if(centros.some(c=>c.id!==editId&&String(c.codigo||"").toLowerCase()===d.codigo.toLowerCase()))return msg($("mensagemCentroV2"),"Já existe um Centro de Custo com este código.");
  try{if(editId)await atualizarDocumento("centrosCusto",editId,d);else await criarDocumento("centrosCusto",d);emitirAlteracao("centrosCusto");fecharForm();await carregar()}catch(err){console.error(err);msg($("mensagemCentroV2"),"Não foi possível salvar o Centro de Custo.")}
}
export function abrir(){criarPagina();abrirPagina("ctrl-centros-v2");const t=$("tituloPagina");if(t)t.textContent="Centros de Custo";carregar()}
export{carregar};
criarPagina();window.addEventListener("sig:empresa-changed",()=>{if(pagina()&&!pagina().classList.contains("hidden"))carregar()});window.addEventListener("sig:center-accounts-changed",()=>{if(pagina()&&!pagina().classList.contains("hidden"))carregar()});
