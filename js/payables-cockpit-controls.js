import { admin, permite } from "./core.js";
import {
  $, esc, state, moeda, dataBr, hojeIso, listarDocumentos, atualizarDocumento, emitirAlteracao
} from "./shared.js";

const MODULO="contasPagar";
let dados=[];
let contas=[];
let carregando=false;

const podeVincularBanco=()=>admin();
const contaNome=x=>x?`${x.nome||"Conta"}${x.banco?` · ${x.banco}`:""}`:"";
const idRegistroDaLinha=row=>{
  const el=row?.querySelector("[data-ap-pagar],[data-ap-editar],[data-ap-estornar],[data-ap-reabrir]");
  return el?.dataset?.apPagar||el?.dataset?.apEditar||el?.dataset?.apEstornar||el?.dataset?.apReabrir||"";
};

async function carregarDados(){
  if(carregando)return;
  carregando=true;
  try{dados=await listarDocumentos("contasPagar")}catch(e){console.warn("Cockpit: contas a pagar indisponíveis",e);dados=[]}
  if(podeVincularBanco()){
    try{contas=(await listarDocumentos("contasBancarias")).filter(x=>x.status!=="inativo")}catch(e){console.warn("Cockpit: contas bancárias indisponíveis",e);contas=[]}
  }else contas=[];
  carregando=false;
}

function instalarCss(){
  if($("sig-payables-controls-css"))return;
  const s=document.createElement("style");s.id="sig-payables-controls-css";s.textContent=`
    #pagina-contas-pagar .ap-periodo-campo{display:grid;gap:3px;min-width:142px}
    #pagina-contas-pagar .ap-periodo-campo>span{font-size:9px;font-weight:850;text-transform:uppercase;letter-spacing:.04em;color:#667085}
    #pagina-contas-pagar .ap-periodo-campo input{width:100%}
    #pagina-contas-pagar .ap-banco-pagamento{display:block;margin-top:3px;color:#667085;font-size:9px;font-weight:650}
    .ap-baixa-backdrop{position:fixed;inset:0;z-index:5000;background:rgba(11,31,51,.48);display:grid;place-items:center;padding:18px}
    .ap-baixa-modal{width:min(520px,100%);background:#fff;border-radius:16px;border:1px solid #dfe5ea;box-shadow:0 24px 70px rgba(11,31,51,.25);padding:22px}
    .ap-baixa-modal h3{margin:0;color:#0b1f33;font-size:20px}.ap-baixa-modal p{margin:7px 0 18px;color:#667085;line-height:1.45}
    .ap-baixa-grid{display:grid;grid-template-columns:1fr 1.5fr;gap:12px}.ap-baixa-grid label{display:grid;gap:6px;font-size:12px;font-weight:750;color:#344054}
    .ap-baixa-grid input,.ap-baixa-grid select{min-height:42px;border:1px solid #d0d5dd;border-radius:9px;padding:9px 10px;background:#fff}
    .ap-baixa-acoes{display:flex;justify-content:flex-end;gap:9px;margin-top:18px}
    .ap-baixa-aviso{margin-top:10px!important;font-size:11px;color:#667085!important}
    @media(max-width:760px){.ap-baixa-grid{grid-template-columns:1fr}}
  `;document.head.appendChild(s);
}

function rotularPeriodo(){
  const filtros=document.querySelector("#pagina-contas-pagar .ap-filtros");if(!filtros)return;
  [["apFiltroInicio","De"],["apFiltroFim","Até"]].forEach(([id,texto])=>{
    const input=$(id);if(!input||input.closest(".ap-periodo-campo"))return;
    const w=document.createElement("label");w.className="ap-periodo-campo";w.innerHTML=`<span>${texto}</span>`;
    input.before(w);w.appendChild(input);
  });
  if(!$("btnLimparPeriodoAp")){
    const b=document.createElement("button");b.id="btnLimparPeriodoAp";b.type="button";b.className="btn-secundario";b.textContent="Limpar período";
    b.addEventListener("click",()=>{if($("apFiltroInicio"))$("apFiltroInicio").value="";if($("apFiltroFim"))$("apFiltroFim").value="";$("apFiltroInicio")?.dispatchEvent(new Event("change",{bubbles:true}));});
    filtros.appendChild(b);
  }
  if(!$("btnImprimirSelecaoAp")){
    const b=document.createElement("button");b.id="btnImprimirSelecaoAp";b.type="button";b.className="btn-secundario";b.textContent="Imprimir seleção";b.addEventListener("click",imprimirSelecao);filtros.appendChild(b);
  }
}

function garantirModal(){
  if($("apBaixaBackdrop"))return;
  const m=document.createElement("div");m.id="apBaixaBackdrop";m.className="ap-baixa-backdrop hidden";m.innerHTML=`
    <div class="ap-baixa-modal" role="dialog" aria-modal="true" aria-labelledby="apBaixaTitulo">
      <h3 id="apBaixaTitulo">Marcar pagamento</h3><p id="apBaixaResumo">Confirme a baixa do compromisso.</p>
      <div class="ap-baixa-grid"><label>Data do pagamento<input id="apBaixaData" type="date"></label><label>Conta bancária<select id="apBaixaBanco"><option value="">Sem conta vinculada</option></select></label></div>
      <p class="ap-baixa-aviso" id="apBaixaAviso">O vínculo bancário identifica por qual conta o compromisso foi pago. Este cockpit continua independente do Fluxo de Caixa e não cria lançamento financeiro automaticamente.</p>
      <div class="ap-baixa-acoes"><button id="apBaixaCancelar" class="btn-secundario" type="button">Cancelar</button><button id="apBaixaConfirmar" class="btn-primario" type="button">Confirmar pagamento</button></div>
    </div>`;
  document.body.appendChild(m);$("apBaixaCancelar")?.addEventListener("click",fecharBaixa);m.addEventListener("click",e=>{if(e.target===m)fecharBaixa()});
}

function fecharBaixa(){const m=$("apBaixaBackdrop");if(m){m.classList.add("hidden");delete m.dataset.registroId}}

async function abrirBaixa(id){
  garantirModal();await carregarDados();const x=dados.find(a=>a.id===id);if(!x)return alert("Não foi possível localizar este compromisso.");
  $("apBaixaResumo").textContent=`${x.fornecedor||"Compromisso"} · ${moeda(x.valor)} · vencimento ${dataBr(x.vencimento)}.`;
  $("apBaixaData").value=hojeIso();const sel=$("apBaixaBanco");sel.innerHTML='<option value="">Sem conta vinculada</option>';
  const elegiveis=contas.filter(c=>c.empresaId===x.empresaId);sel.innerHTML+=elegiveis.map(c=>`<option value="${esc(c.id)}">${esc(contaNome(c))}</option>`).join("");sel.disabled=!podeVincularBanco();
  $("apBaixaAviso").textContent=podeVincularBanco()?"O vínculo bancário identifica por qual conta o compromisso foi pago. Este cockpit continua independente do Fluxo de Caixa e não cria lançamento financeiro automaticamente.":"Seu perfil pode marcar o compromisso como pago, mas o vínculo com conta bancária permanece restrito ao Administrador para preservar as permissões bancárias já vigentes no SIG.";
  const m=$("apBaixaBackdrop");m.dataset.registroId=id;m.classList.remove("hidden");
  const confirmar=$("apBaixaConfirmar");confirmar.onclick=confirmarBaixa;setTimeout(()=>$("apBaixaData")?.focus(),20);
}

async function confirmarBaixa(){
  const m=$("apBaixaBackdrop"),id=m?.dataset?.registroId||"",x=dados.find(a=>a.id===id);if(!x)return;
  const dataPagamento=$("apBaixaData")?.value||hojeIso(),contaId=podeVincularBanco()?$("apBaixaBanco")?.value||"":"",conta=contas.find(c=>c.id===contaId)||null;
  const alteracoes={status:"pago",dataPagamento,pagoPor:state.usuario?.id||""};
  if(podeVincularBanco()){alteracoes.contaBancariaIdPagamento=contaId;alteracoes.contaBancariaNomePagamento=contaNome(conta)}
  try{$("apBaixaConfirmar").disabled=true;await atualizarDocumento("contasPagar",id,alteracoes);fecharBaixa();emitirAlteracao(MODULO);setTimeout(async()=>{await carregarDados();decorarTabela()},120)}catch(e){console.error(e);alert("Não foi possível marcar o pagamento.")}finally{if($("apBaixaConfirmar"))$("apBaixaConfirmar").disabled=false}
}

function decorarTabela(){
  const tabela=document.querySelector("#pagina-contas-pagar .ap-table");if(!tabela)return;
  const cab=tabela.querySelector("thead tr");if(cab&&!cab.querySelector("[data-ap-col-banco]")){const th=document.createElement("th");th.dataset.apColBanco="1";th.textContent="Conta paga";cab.insertBefore(th,cab.lastElementChild)}
  tabela.querySelectorAll("tbody tr").forEach(row=>{
    if(row.querySelector("[data-ap-cell-banco]"))return;const id=idRegistroDaLinha(row);if(!id)return;const x=dados.find(a=>a.id===id);const td=document.createElement("td");td.dataset.apCellBanco="1";td.innerHTML=x?.status==="pago"&&x?.contaBancariaNomePagamento?`<span class="ap-banco-pagamento">${esc(x.contaBancariaNomePagamento)}</span>`:"—";row.insertBefore(td,row.lastElementChild);
  });
}

function textoSelect(id){const s=$(id);return s?.options?.[s.selectedIndex]?.textContent||""}
function imprimirSelecao(){
  const tabela=document.querySelector("#pagina-contas-pagar .ap-table");if(!tabela)return;
  const clone=tabela.cloneNode(true);clone.querySelectorAll("thead tr,tbody tr").forEach(tr=>tr.lastElementChild?.remove());clone.querySelectorAll("button").forEach(b=>b.remove());
  const ini=$("apFiltroInicio")?.value||"",fim=$("apFiltroFim")?.value||"";
  const periodo=ini||fim?`${ini?dataBr(ini):"início"} a ${fim?dataBr(fim):"sem limite"}`:"Todos os vencimentos exibidos";
  const ids=[...tabela.querySelectorAll("tbody tr")].map(idRegistroDaLinha).filter(Boolean),selecionados=dados.filter(x=>ids.includes(x.id)),total=selecionados.reduce((s,x)=>s+Number(x.valor||0),0);
  const w=window.open("","_blank","width=1100,height=760");if(!w)return alert("O navegador bloqueou a janela de impressão. Libere pop-ups para o SIG e tente novamente.");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Cockpit de Pagamentos Fixos</title><style>body{font-family:Arial,sans-serif;color:#1f2937;padding:26px}h1{margin:0;color:#0b1f33;font-size:23px}.meta{margin:8px 0 18px;color:#667085;font-size:12px}.resumo{display:flex;gap:18px;margin:12px 0 18px;padding:10px 12px;background:#f4f7f9;border-radius:8px;font-size:12px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border-bottom:1px solid #dfe5ea;padding:8px;text-align:left;vertical-align:top}th{background:#f4f7f9;color:#344054}.ap-status,.ap-origem{font-weight:700}.acoes-tabela{display:none}@media print{body{padding:0}}</style></head><body><h1>Cockpit de Pagamentos Fixos</h1><div class="meta">Período: ${esc(periodo)} · Status: ${esc(textoSelect("apFiltroStatus"))} · Origem: ${esc(textoSelect("apFiltroOrigem"))}</div><div class="resumo"><strong>${ids.length} compromisso(s) na seleção</strong><span>Total previsto: ${esc(moeda(total))}</span></div>${clone.outerHTML}</body></html>`);w.document.close();w.focus();setTimeout(()=>w.print(),120);
}

function preparar(){
  instalarCss();rotularPeriodo();garantirModal();decorarTabela();
}

const obs=new MutationObserver(()=>preparar());obs.observe(document.body,{childList:true,subtree:true});
document.addEventListener("click",e=>{const b=e.target?.closest?.("#pagina-contas-pagar [data-ap-pagar]");if(!b)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();abrirBaixa(b.dataset.apPagar)},true);
window.addEventListener("sig:ready",async()=>{await carregarDados();setTimeout(()=>{preparar();decorarTabela()},30)});
window.addEventListener("sig:page",async e=>{if(e.detail?.pagina!=="contas-pagar")return;await carregarDados();setTimeout(()=>{preparar();decorarTabela()},80)});
window.addEventListener("sig:data-changed",async e=>{if(e.detail?.modulo!==MODULO)return;await carregarDados();setTimeout(decorarTabela,120)});
preparar();
