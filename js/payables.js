import { abrirPagina } from "./core.js";
import {
  $, on, esc, norm, msg, state, admin, permite, moeda, dataBr, diasAte, hojeIso,
  preencherEmpresaSelect, listarDocumentos, criarDocumento, atualizarDocumento,
  emitirAlteracao, abrirBox, fecharBox, nomeEmpresa
} from "./shared.js";
import { confirmarAcaoAdministrativa, atualizarComAuditoria } from "./admin-actions.js";

const COLECAO="contasPagar";
const MODULO="contasPagar";
let dados=[];
let editId=null;

const podeVer=()=>admin()||permite(MODULO,"visualizar")||permite(MODULO,"cadastrar")||permite(MODULO,"editar")||permite(MODULO,"baixar")||permite(MODULO,"estornar");
const podeCadastrar=()=>admin()||permite(MODULO,"cadastrar");
const podeEditar=()=>admin()||permite(MODULO,"editar");
const podeBaixar=()=>admin()||permite(MODULO,"baixar");
const podeEstornar=()=>admin();
const n=v=>{const x=Number(v||0);return Number.isFinite(x)?x:0};
const addDias=(iso,dias)=>{const [a,m,d]=String(iso).split("-").map(Number),x=new Date(Date.UTC(a,m-1,d));x.setUTCDate(x.getUTCDate()+dias);return x.toISOString().slice(0,10)};
const addMeses=(iso,q)=>{const [a,m,d]=String(iso).split("-").map(Number),x=new Date(Date.UTC(a,m-1+q,1)),ultimo=new Date(Date.UTC(x.getUTCFullYear(),x.getUTCMonth()+1,0)).getUTCDate();x.setUTCDate(Math.min(d,ultimo));return x.toISOString().slice(0,10)};
const statusAberto=x=>!["pago","estornado","cancelado"].includes(x?.status);
const origemNome=x=>x?.origem==="contrato"?"Contrato":x?.recorrenciaId?"Recorrente":"Manual";

function montar(){
  if($("pagina-contas-pagar"))return;
  const menuContratos=$("menuContratos"),sep=document.querySelector(".sidebar-menu .menu-separador");
  if(!$("menuContasPagar")){
    const b=document.createElement("button");b.id="menuContasPagar";b.className="menu-item";b.dataset.pagina="contas-pagar";b.type="button";b.textContent="Contas a Pagar";
    if(menuContratos)menuContratos.after(b);else sep?.before(b);
    on(b,"click",()=>abrir());
  }
  const main=document.querySelector("main.conteudo");if(!main)return;
  const p=document.createElement("section");p.id="pagina-contas-pagar";p.className="pagina hidden";p.innerHTML=`
    <div class="pagina-cabecalho"><div><span class="eyebrow">PAGAMENTOS</span><h2>Contas a Pagar</h2><p>Cockpit operacional de compromissos fixos e vencimentos. Não alimenta DRE, Budget ou Forecast.</p></div><div class="ap-head-actions"><button id="btnAtualizarContasPagar" class="btn-secundario" type="button">Atualizar</button><button id="btnNovaContaPagar" class="btn-primario" type="button">+ Nova conta</button></div></div>
    <div class="kpi-grid kpi-grid-5 ap-kpis">
      <button class="kpi-card ap-kpi-btn" data-ap-atalho="vencidos" type="button"><span>Vencido</span><strong id="apKpiVencido">—</strong><small id="apKpiVencidoValor">—</small></button>
      <button class="kpi-card ap-kpi-btn" data-ap-atalho="hoje" type="button"><span>Vence hoje</span><strong id="apKpiHoje">—</strong><small id="apKpiHojeValor">—</small></button>
      <button class="kpi-card ap-kpi-btn" data-ap-atalho="7" type="button"><span>Próximos 7 dias</span><strong id="apKpi7">—</strong><small id="apKpi7Valor">—</small></button>
      <button class="kpi-card ap-kpi-btn" data-ap-atalho="30" type="button"><span>Próximos 30 dias</span><strong id="apKpi30">—</strong><small id="apKpi30Valor">—</small></button>
      <div class="kpi-card"><span>Pago no período</span><strong id="apKpiPago">—</strong><small id="apKpiPagoValor">—</small></div>
    </div>
    <section id="formContaPagarContainer" class="form-card hidden"><div class="form-card-titulo"><div><h3 id="tituloContaPagar">Nova conta</h3><p>Cadastre um compromisso operacional. Para obrigações contratuais, prefira alimentar pelo próprio Contrato.</p></div></div><form id="formContaPagar"><div class="form-grid form-grid-3">
      <div class="campo"><label for="apEmpresa">Empresa</label><select id="apEmpresa" required></select></div>
      <div class="campo"><label for="apFornecedor">Fornecedor / favorecido</label><input id="apFornecedor" required></div>
      <div class="campo"><label for="apDocumento">Documento / referência</label><input id="apDocumento" placeholder="NF, boleto, mensalidade..."></div>
      <div class="campo campo-span-2"><label for="apDescricao">Descrição</label><input id="apDescricao" required placeholder="Ex.: aluguel mensal da unidade"></div>
      <div class="campo"><label for="apCategoria">Categoria operacional</label><input id="apCategoria" placeholder="Ex.: aluguel, sistema, energia"></div>
      <div class="campo"><label for="apVencimento">Vencimento</label><input id="apVencimento" type="date" required></div>
      <div class="campo"><label for="apValor">Valor</label><input id="apValor" type="number" min="0.01" step="0.01" required></div>
      <div class="campo"><label for="apResponsavel">Responsável</label><input id="apResponsavel" placeholder="Quem acompanha este pagamento"></div>
      <div class="campo campo-span-2"><label class="ap-check"><input id="apRecorrente" type="checkbox"><span><strong>Repetir mensalmente</strong><small>Gera parcelas mensais independentes para controle do cockpit.</small></span></label></div>
      <div class="campo"><label for="apRecorrenteAte">Repetir até</label><input id="apRecorrenteAte" type="date" disabled></div>
      <div class="campo campo-span-3"><label for="apObservacao">Observação</label><textarea id="apObservacao" rows="2"></textarea></div>
    </div><div class="form-acoes"><button id="btnCancelarContaPagar" class="btn-secundario" type="button">Cancelar</button><button class="btn-primario" type="submit">Salvar</button></div><p id="mensagemContaPagar" class="mensagem-form"></p></form></section>
    <section class="lista-card"><div class="lista-cabecalho ap-filtros-head"><div><h3>Agenda de pagamentos</h3><p id="apQuantidade">Carregando...</p></div><div class="ap-filtros">
      <select id="apFiltroStatus"><option value="abertos">Em aberto</option><option value="pago">Pagos</option><option value="estornado">Estornados</option><option value="todos">Todos</option></select>
      <select id="apFiltroOrigem"><option value="">Todas as origens</option><option value="manual">Manual</option><option value="recorrente">Recorrente</option><option value="contrato">Contrato</option></select>
      <input id="apFiltroInicio" type="date" title="Vencimento inicial"><input id="apFiltroFim" type="date" title="Vencimento final"><input id="apBusca" class="campo-busca" type="search" placeholder="Buscar fornecedor, descrição ou documento">
    </div></div><div class="tabela-container"><table class="tabela ap-table"><thead><tr><th>Vencimento</th><th>Pagamento</th><th>Fornecedor / compromisso</th><th>Origem</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead><tbody id="apLista"><tr><td colspan="7">Carregando...</td></tr></tbody></table></div></section>`;
  main.appendChild(p);
  const st=document.createElement("style");st.id="sig-contas-pagar-css";st.textContent=`
  .ap-head-actions,.ap-filtros{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.ap-kpis{margin-bottom:14px}.ap-kpi-btn{text-align:left;border:1px solid #e4e7ec;cursor:pointer}.ap-kpi-btn:hover{border-color:#0c9488;transform:translateY(-1px)}.ap-filtros-head{align-items:flex-start}.ap-filtros select,.ap-filtros input[type=date]{border:1px solid #d0d5dd;border-radius:8px;padding:8px;background:#fff;color:#344054}.ap-check{display:flex;gap:9px;align-items:flex-start;padding:9px;border:1px solid #e4e7ec;border-radius:9px;background:#f8fafb}.ap-check span,.ap-check strong,.ap-check small{display:block}.ap-check small{margin-top:3px;color:#667085}.ap-table td:nth-child(5){font-weight:850;white-space:nowrap}.ap-vencido{color:#b42318;font-weight:850}.ap-hoje{color:#b54708;font-weight:850}.ap-origem{display:inline-flex;border-radius:999px;padding:3px 7px;background:#eef3f5;color:#475467;font-size:9px;font-weight:800}.ap-origem.contrato{background:#e8f6f4;color:#06736b}.ap-status{display:inline-flex;border-radius:999px;padding:3px 7px;font-size:9px;font-weight:850}.ap-status.aberto{background:#eef3f5;color:#475467}.ap-status.vencido{background:#fee4e2;color:#b42318}.ap-status.hoje{background:#fef0c7;color:#b54708}.ap-status.pago{background:#dcfae6;color:#067647}.ap-status.estornado,.ap-status.cancelado{background:#f2f4f7;color:#667085}.ap-contrato-lock{color:#98a2b3;font-size:9px}@media(max-width:900px){.ap-filtros{width:100%}.ap-filtros>*{flex:1;min-width:150px}}
  `;document.head.appendChild(st);
  on($("btnAtualizarContasPagar"),"click",carregar);on($("btnNovaContaPagar"),"click",()=>abrirForm());on($("btnCancelarContaPagar"),"click",fecharForm);on($("formContaPagar"),"submit",salvar);on($("apRecorrente"),"change",atualizarRecorrencia);
  ["apFiltroStatus","apFiltroOrigem","apFiltroInicio","apFiltroFim"].forEach(id=>on($(id),"change",render));on($("apBusca"),"input",render);
  document.querySelectorAll("[data-ap-atalho]").forEach(b=>on(b,"click",()=>atalho(b.dataset.apAtalho)));
}

function atualizarRecorrencia(){const c=$("apRecorrente"),ate=$("apRecorrenteAte");if(!ate)return;ate.disabled=!c?.checked;if(!c?.checked)ate.value=""}
function fecharForm(){editId=null;fecharBox($("formContaPagarContainer"),$("formContaPagar"),$("mensagemContaPagar"));atualizarRecorrencia()}
async function abrirForm(item=null){
  if(!podeCadastrar()&&!item)return;
  if(item?.origem==="contrato")return alert("Esta obrigação é alimentada pelo contrato. Edite valor, vigência ou vencimento no módulo de Contratos.");
  editId=item?.id||null;const form=$("formContaPagar");form?.reset();await preencherEmpresaSelect($("apEmpresa"),{valorAtual:item?.empresaId||state.usuario?.empresaId});
  $("tituloContaPagar").textContent=item?"Editar conta":"Nova conta";$("apFornecedor").value=item?.fornecedor||"";$("apDocumento").value=item?.documento||"";$("apDescricao").value=item?.descricao||"";$("apCategoria").value=item?.categoria||"";$("apVencimento").value=item?.vencimento||hojeIso();$("apValor").value=item?Number(item.valor||0):"";$("apResponsavel").value=item?.responsavel||"";$("apObservacao").value=item?.observacao||"";$("apRecorrente").checked=false;$("apRecorrente").disabled=!!item;atualizarRecorrencia();
  abrirBox($("formContaPagarContainer"),$("apFornecedor"));$("formContaPagarContainer")?.scrollIntoView({behavior:"smooth",block:"start"});
}

function serieDatas(inicio,fim){const out=[];for(let i=0;i<36;i++){const d=addMeses(inicio,i);if(d>fim)break;out.push(d)}return out}
async function salvar(ev){
  ev.preventDefault();if(editId&&!podeEditar())return;const empresaId=$("apEmpresa")?.value||"",fornecedor=$("apFornecedor")?.value.trim()||"",descricao=$("apDescricao")?.value.trim()||"",vencimento=$("apVencimento")?.value||"",valor=n($("apValor")?.value),rec=$("apRecorrente")?.checked===true,ate=$("apRecorrenteAte")?.value||"",mensagem=$("mensagemContaPagar");
  if(!empresaId||!fornecedor||!descricao||!vencimento||valor<=0)return msg(mensagem,"Preencha empresa, fornecedor, descrição, vencimento e valor.");if(rec&&(!ate||ate<vencimento))return msg(mensagem,"Na recorrência mensal, informe uma data final igual ou posterior ao primeiro vencimento.");
  const base={empresaId,fornecedor,documento:$("apDocumento")?.value.trim()||"",descricao,categoria:$("apCategoria")?.value.trim()||"",valor,responsavel:$("apResponsavel")?.value.trim()||"",observacao:$("apObservacao")?.value.trim()||"",origem:"manual",status:"aberto"};
  try{msg(mensagem,"Salvando...");if(editId){await atualizarDocumento(COLECAO,editId,{...base,vencimento})}else if(rec){const serie=`ap_${Date.now()}_${String(state.usuario?.id||"").slice(0,8)}`;for(const d of serieDatas(vencimento,ate))await criarDocumento(COLECAO,{...base,vencimento:d,recorrenciaId:serie,recorrencia:"mensal"})}else await criarDocumento(COLECAO,{...base,vencimento});emitirAlteracao(MODULO);msg(mensagem,"Conta salva com sucesso.",true);await carregar();setTimeout(fecharForm,450)}catch(e){console.error(e);msg(mensagem,"Não foi possível salvar a conta.")}
}

function statusInfo(x){if(x.status==="pago")return{chave:"pago",nome:"Pago"};if(x.status==="estornado")return{chave:"estornado",nome:"Estornado"};if(x.status==="cancelado")return{chave:"cancelado",nome:"Cancelado"};const d=diasAte(x.vencimento);if(d!==null&&d<0)return{chave:"vencido",nome:`Vencido ${Math.abs(d)}d`};if(d===0)return{chave:"hoje",nome:"Vence hoje"};return{chave:"aberto",nome:"Em aberto"}}
function classeVenc(x){const d=diasAte(x.vencimento);return statusAberto(x)&&d<0?"ap-vencido":statusAberto(x)&&d===0?"ap-hoje":""}
function origemFiltro(x){return x.origem==="contrato"?"contrato":x.recorrenciaId?"recorrente":"manual"}
function filtrados(){const status=$("apFiltroStatus")?.value||"abertos",origem=$("apFiltroOrigem")?.value||"",ini=$("apFiltroInicio")?.value||"",fim=$("apFiltroFim")?.value||"",q=norm($("apBusca")?.value||"");return dados.filter(x=>{
  if(status==="abertos"&&!statusAberto(x))return false;if(status==="pago"&&x.status!=="pago")return false;if(status==="estornado"&&x.status!=="estornado")return false;if(origem&&origemFiltro(x)!==origem)return false;if(ini&&x.vencimento<ini)return false;if(fim&&x.vencimento>fim)return false;if(q&&![x.fornecedor,x.descricao,x.documento,x.categoria,x.responsavel].some(v=>norm(v).includes(q)))return false;return true}).sort((a,b)=>String(a.vencimento||"").localeCompare(String(b.vencimento||""))||String(a.fornecedor||"").localeCompare(String(b.fornecedor||""),"pt-BR"))}
function somar(arr){return arr.reduce((s,x)=>s+n(x.valor),0)}
function faixa(abertos,min,max){return abertos.filter(x=>{const d=diasAte(x.vencimento);return d!==null&&d>=min&&d<=max})}
function renderKpis(){const abertos=dados.filter(statusAberto),venc=abertos.filter(x=>(diasAte(x.vencimento)??0)<0),hj=faixa(abertos,0,0),d7=faixa(abertos,1,7),d30=faixa(abertos,1,30),ini=$("apFiltroInicio")?.value||"",fim=$("apFiltroFim")?.value||"",pagos=dados.filter(x=>x.status==="pago"&&(!ini||x.vencimento>=ini)&&(!fim||x.vencimento<=fim));[["Vencido",venc],["Hoje",hj],["7",d7],["30",d30]].forEach(([id,a])=>{$(`apKpi${id}`).textContent=a.length;$(`apKpi${id}Valor`).textContent=moeda(somar(a))});$("apKpiPago").textContent=pagos.length;$("apKpiPagoValor").textContent=moeda(somar(pagos))}
function render(){if(!$("apLista"))return;renderKpis();const arr=filtrados();$("apQuantidade").textContent=`${arr.length} exibido(s) · ${dados.length} registro(s) no contexto`;if(!arr.length){$("apLista").innerHTML='<tr><td colspan="7">Nenhuma conta encontrada para os filtros selecionados.</td></tr>';return}$("apLista").innerHTML=arr.map(x=>{const s=statusInfo(x),contrato=x.origem==="contrato";return`<tr><td class="${classeVenc(x)}">${dataBr(x.vencimento)}</td><td>${x.status==="pago"?dataBr(x.dataPagamento):"—"}</td><td class="celula-principal"><strong>${esc(x.fornecedor||"Fornecedor")}</strong><span>${esc(x.descricao||"")}${x.documento?` · ${esc(x.documento)}`:""}${x.categoria?` · ${esc(x.categoria)}`:""}</span></td><td><span class="ap-origem ${contrato?"contrato":""}">${origemNome(x)}</span>${contrato?`<small class="ap-contrato-lock">${esc(x.contratoReferencia||"")}</small>`:""}</td><td>${moeda(x.valor)}</td><td><span class="ap-status ${s.chave}">${s.nome}</span></td><td><div class="acoes-tabela">${statusAberto(x)&&podeBaixar()?`<button class="btn-acao destaque" data-ap-pagar="${x.id}" type="button">Baixar</button>`:""}${!contrato&&statusAberto(x)&&podeEditar()?`<button class="btn-acao" data-ap-editar="${x.id}" type="button">Editar</button>`:""}${x.status==="pago"&&podeEstornar()?`<button class="btn-acao" data-ap-reabrir="${x.id}" type="button">Reabrir</button>`:""}${x.status!=="estornado"&&podeEstornar()?`<button class="btn-acao perigo" data-ap-estornar="${x.id}" type="button">Estornar</button>`:""}</div></td></tr>`}).join("");document.querySelectorAll("[data-ap-pagar]").forEach(b=>on(b,"click",()=>baixar(b.dataset.apPagar)));document.querySelectorAll("[data-ap-editar]").forEach(b=>on(b,"click",()=>abrirForm(dados.find(x=>x.id===b.dataset.apEditar))));document.querySelectorAll("[data-ap-estornar]").forEach(b=>on(b,"click",()=>estornar(b.dataset.apEstornar)));document.querySelectorAll("[data-ap-reabrir]").forEach(b=>on(b,"click",()=>reabrir(b.dataset.apReabrir)))}

async function baixar(id){const x=dados.find(a=>a.id===id);if(!x||!statusAberto(x)||!confirm(`Confirmar pagamento de ${moeda(x.valor)} para ${x.fornecedor}?`))return;try{await atualizarDocumento(COLECAO,id,{status:"pago",dataPagamento:hojeIso(),pagoPor:state.usuario?.id||""});emitirAlteracao(MODULO);await carregar()}catch(e){console.error(e);alert("Não foi possível baixar o pagamento.")}}
async function estornar(id){const x=dados.find(a=>a.id===id);if(!x)return;const ok=await confirmarAcaoAdministrativa({titulo:"Estornar conta a pagar",descricao:`A obrigação ${x.fornecedor} · ${moeda(x.valor)} será mantida no histórico sem impacto no cockpit de pagamentos abertos.`,motivoLabel:"Motivo do estorno",confirmarTexto:"Estornar",perigosa:true});if(!ok)return;try{await atualizarComAuditoria({colecao:COLECAO,id,empresaId:x.empresaId,modulo:MODULO,acao:"estorno_conta_pagar",motivo:ok.motivo,resumo:`Estorno de conta a pagar · ${x.fornecedor} · ${x.vencimento}`,snapshotAntes:x,alteracoes:{status:"estornado",estornadoEm:new Date().toISOString(),estornadoPor:state.usuario?.id||"",motivoEstorno:ok.motivo}});emitirAlteracao(MODULO);await carregar()}catch(e){console.error(e);alert("Não foi possível estornar a conta.")}}
async function reabrir(id){const x=dados.find(a=>a.id===id);if(!x||x.status!=="pago")return;const ok=await confirmarAcaoAdministrativa({titulo:"Reabrir pagamento",descricao:`O pagamento de ${x.fornecedor} voltará para Em aberto. A correção ficará registrada na auditoria administrativa.`,motivoLabel:"Motivo da reabertura",confirmarTexto:"Reabrir pagamento"});if(!ok)return;try{await atualizarComAuditoria({colecao:COLECAO,id,empresaId:x.empresaId,modulo:MODULO,acao:"reabertura_pagamento",motivo:ok.motivo,resumo:`Reabertura de pagamento · ${x.fornecedor} · ${x.vencimento}`,snapshotAntes:x,alteracoes:{status:"aberto",dataPagamento:"",pagoPor:"",reabertoEm:new Date().toISOString(),reabertoPor:state.usuario?.id||""}});emitirAlteracao(MODULO);await carregar()}catch(e){console.error(e);alert("Não foi possível reabrir o pagamento.")}}

function atalho(tipo){const hoje=hojeIso();$("apFiltroStatus").value="abertos";$("apFiltroInicio").value="";if(tipo==="vencidos"){$("apFiltroFim").value=addDias(hoje,-1)}else if(tipo==="hoje"){$("apFiltroInicio").value=hoje;$("apFiltroFim").value=hoje}else{$("apFiltroInicio").value=addDias(hoje,1);$("apFiltroFim").value=addDias(hoje,Number(tipo)||30)}render()}
export async function carregar(){if(!podeVer())return;try{dados=await listarDocumentos(COLECAO);render()}catch(e){console.error(e);if($("apLista"))$("apLista").innerHTML='<tr><td colspan="7">Não foi possível carregar Contas a Pagar. Verifique permissões e Rules publicadas.</td></tr>'}}
export function abrirContasPagar(filtro=""){if(!podeVer())return;abrirPagina("contas-pagar");setTimeout(async()=>{await carregar();if(filtro)atalho(filtro)},40)}
window.SIG_ABRIR_CONTAS_PAGAR=abrirContasPagar;
async function abrir(){abrirPagina("contas-pagar");await carregar()}

montar();
if($("menuContasPagar"))$("menuContasPagar").classList.toggle("hidden",!podeVer());if($("btnNovaContaPagar"))$("btnNovaContaPagar").classList.toggle("hidden",!podeCadastrar());
window.addEventListener("sig:ready",()=>{montar();$("menuContasPagar")?.classList.toggle("hidden",!podeVer());if(podeVer())carregar()});window.addEventListener("sig:page",e=>{if(e.detail?.pagina==="contas-pagar")carregar()});window.addEventListener("sig:empresa-changed",()=>{if(!$("pagina-contas-pagar")?.classList.contains("hidden"))carregar()});window.addEventListener("sig:data-changed",e=>{if(e.detail?.modulo===MODULO&&!$("pagina-contas-pagar")?.classList.contains("hidden"))carregar()});