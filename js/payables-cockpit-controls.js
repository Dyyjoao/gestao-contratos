import { admin } from "./core.js";
import {
  $, esc, state, moeda, dataBr, hojeIso, listarDocumentos, atualizarDocumento, emitirAlteracao
} from "./shared.js";

const MODULO="contasPagar";
let dados=[];
let contas=[];
let carregando=false;
let editandoId="";
let vinculoPendente=null;

const podeVincularBanco=()=>admin();
const contaNome=x=>x?`${x.nome||"Conta"}${x.banco?` · ${x.banco}`:""}`:"";
const contaPlanejadaId=x=>x?.contaBancariaId||x?.contaBancariaIdPrevista||"";
const contaPlanejadaNome=x=>x?.contaBancariaNome||x?.contaBancariaNomePrevista||contaNome(contas.find(c=>c.id===contaPlanejadaId(x)))||"";
const contaPagaId=x=>x?.contaBancariaIdPagamento||contaPlanejadaId(x);
const contaPagaNome=x=>x?.contaBancariaNomePagamento||contaPlanejadaNome(x);
const contaEfetivaId=x=>x?.status==="pago"?contaPagaId(x):contaPlanejadaId(x);
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
    #pagina-contas-pagar .ap-banco-pagamento strong{display:block;color:#344054;font-size:10px}
    #pagina-contas-pagar .ap-banco-previsto{display:block;margin-top:2px;color:#98a2b3;font-size:8px}
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

function opcoesConta(empresaId,valor=""){
  const elegiveis=contas.filter(c=>!empresaId||c.empresaId===empresaId);
  return '<option value="">Selecione a conta</option>'+elegiveis.map(c=>`<option value="${esc(c.id)}" ${c.id===valor?"selected":""}>${esc(contaNome(c))}</option>`).join("");
}

function garantirCampoConta(){
  const form=$("formContaPagar"),grid=form?.querySelector(".form-grid");if(!grid)return;
  let sel=$("apContaBancariaPrevista");
  if(!sel){
    const campo=document.createElement("div");campo.className="campo";campo.innerHTML='<label for="apContaBancariaPrevista">Conta bancária prevista</label><select id="apContaBancariaPrevista"><option value="">Selecione a conta</option></select>';
    const resp=$("apResponsavel")?.closest(".campo");if(resp)resp.after(campo);else grid.appendChild(campo);sel=$("apContaBancariaPrevista");
    sel.disabled=!podeVincularBanco();
    $("apEmpresa")?.addEventListener("change",()=>preencherContaLancamento(sel.value));
  }
  preencherContaLancamento(sel.value);
}

function preencherContaLancamento(valor=""){
  const sel=$("apContaBancariaPrevista");if(!sel)return;const empresaId=$("apEmpresa")?.value||"";
  if(podeVincularBanco()){sel.innerHTML=opcoesConta(empresaId,valor);sel.disabled=false}else{sel.innerHTML='<option value="">Definida pelo Administrador</option>';sel.disabled=true}
}

async function preencherContaEdicao(id=""){
  await carregarDados();const x=dados.find(a=>a.id===id);preencherContaLancamento(contaPlanejadaId(x));
}

function rotularPeriodo(){
  const filtros=document.querySelector("#pagina-contas-pagar .ap-filtros");if(!filtros)return;
  [["apFiltroInicio","De"],["apFiltroFim","Até"]].forEach(([id,texto])=>{
    const input=$(id);if(!input||input.closest(".ap-periodo-campo"))return;
    const w=document.createElement("label");w.className="ap-periodo-campo";w.innerHTML=`<span>${texto}</span>`;input.before(w);w.appendChild(input);
  });
  garantirFiltroConta();
  if(!$("btnLimparPeriodoAp")){
    const b=document.createElement("button");b.id="btnLimparPeriodoAp";b.type="button";b.className="btn-secundario";b.textContent="Limpar período";
    b.addEventListener("click",()=>{if($("apFiltroInicio"))$("apFiltroInicio").value="";if($("apFiltroFim"))$("apFiltroFim").value="";$("apFiltroInicio")?.dispatchEvent(new Event("change",{bubbles:true}));});filtros.appendChild(b);
  }
  if(!$("btnImprimirSelecaoAp")){
    const b=document.createElement("button");b.id="btnImprimirSelecaoAp";b.type="button";b.className="btn-secundario";b.textContent="Imprimir seleção";b.addEventListener("click",imprimirSelecao);filtros.appendChild(b);
  }
}

function garantirFiltroConta(){
  const filtros=document.querySelector("#pagina-contas-pagar .ap-filtros");if(!filtros)return;
  let sel=$("apFiltroBanco");if(!sel){sel=document.createElement("select");sel.id="apFiltroBanco";sel.title="Conta bancária";sel.addEventListener("change",()=>{decorarTabela();aplicarFiltroConta()});const origem=$("apFiltroOrigem");origem?.after(sel)}
  const atual=sel.value;const mapa=new Map();contas.forEach(c=>mapa.set(c.id,contaNome(c)));dados.forEach(x=>{const id=contaEfetivaId(x),nome=x.status==="pago"?contaPagaNome(x):contaPlanejadaNome(x);if(id&&nome&&!mapa.has(id))mapa.set(id,nome)});
  sel.innerHTML='<option value="">Todas as contas</option><option value="__sem__">Sem conta vinculada</option>'+[...mapa.entries()].sort((a,b)=>a[1].localeCompare(b[1],"pt-BR")).map(([id,nome])=>`<option value="${esc(id)}">${esc(nome)}</option>`).join("");if([...sel.options].some(o=>o.value===atual))sel.value=atual;
}

function garantirModal(){
  if($("apBaixaBackdrop"))return;
  const m=document.createElement("div");m.id="apBaixaBackdrop";m.className="ap-baixa-backdrop hidden";m.innerHTML=`
    <div class="ap-baixa-modal" role="dialog" aria-modal="true" aria-labelledby="apBaixaTitulo">
      <h3 id="apBaixaTitulo">Marcar pagamento</h3><p id="apBaixaResumo">Confirme a baixa do compromisso.</p>
      <div class="ap-baixa-grid"><label>Data do pagamento<input id="apBaixaData" type="date"></label><label>Conta bancária do pagamento<select id="apBaixaBanco"><option value="">Selecione a conta</option></select></label></div>
      <p class="ap-baixa-aviso" id="apBaixaAviso">A conta prevista vem selecionada automaticamente e pode ser alterada na baixa. O cockpit não cria lançamento no Fluxo de Caixa.</p>
      <div class="ap-baixa-acoes"><button id="apBaixaCancelar" class="btn-secundario" type="button">Cancelar</button><button id="apBaixaConfirmar" class="btn-primario" type="button">Confirmar pagamento</button></div>
    </div>`;
  document.body.appendChild(m);$("apBaixaCancelar")?.addEventListener("click",fecharBaixa);m.addEventListener("click",e=>{if(e.target===m)fecharBaixa()});
}
function fecharBaixa(){const m=$("apBaixaBackdrop");if(m){m.classList.add("hidden");delete m.dataset.registroId}}

async function abrirBaixa(id){
  garantirModal();await carregarDados();const x=dados.find(a=>a.id===id);if(!x)return alert("Não foi possível localizar este compromisso.");
  const previstaId=contaPlanejadaId(x),previstaNome=contaPlanejadaNome(x);$("apBaixaResumo").textContent=`${x.fornecedor||"Compromisso"} · ${moeda(x.valor)} · vencimento ${dataBr(x.vencimento)}.`;$("apBaixaData").value=hojeIso();const sel=$("apBaixaBanco");
  if(podeVincularBanco()){
    const elegiveis=contas.filter(c=>c.empresaId===x.empresaId);sel.innerHTML='<option value="">Selecione a conta</option>'+elegiveis.map(c=>`<option value="${esc(c.id)}">${esc(contaNome(c))}</option>`).join("");if(previstaId&&!elegiveis.some(c=>c.id===previstaId))sel.innerHTML+=`<option value="${esc(previstaId)}">${esc(previstaNome||"Conta vinculada")}</option>`;sel.value=previstaId||"";sel.disabled=false;
  }else{
    if(!previstaId)return alert("Este compromisso ainda não tem conta bancária vinculada. O Administrador precisa definir a conta antes da baixa.");sel.innerHTML=`<option value="${esc(previstaId)}">${esc(previstaNome||"Conta vinculada")}</option>`;sel.value=previstaId;sel.disabled=true;
  }
  $("apBaixaAviso").textContent=podeVincularBanco()?"A conta prevista já vem selecionada. Se o pagamento sair por outra conta, troque aqui antes de confirmar. O cockpit continua independente do Fluxo de Caixa.":"A baixa usará a conta já vinculada ao compromisso. A alteração da conta permanece restrita ao Administrador.";
  const m=$("apBaixaBackdrop");m.dataset.registroId=id;m.classList.remove("hidden");$("apBaixaConfirmar").onclick=confirmarBaixa;setTimeout(()=>$("apBaixaData")?.focus(),20);
}

async function confirmarBaixa(){
  const m=$("apBaixaBackdrop"),id=m?.dataset?.registroId||"",x=dados.find(a=>a.id===id);if(!x)return;const dataPagamento=$("apBaixaData")?.value||hojeIso(),contaId=podeVincularBanco()?$("apBaixaBanco")?.value||"":contaPlanejadaId(x);if(!contaId)return alert("Selecione a conta bancária usada no pagamento.");
  const conta=contas.find(c=>c.id===contaId),nome=contaNome(conta)||($("apBaixaBanco")?.options?.[$("apBaixaBanco").selectedIndex]?.textContent||contaPlanejadaNome(x));const alteracoes={status:"pago",dataPagamento,pagoPor:state.usuario?.id||"",contaBancariaIdPagamento:contaId,contaBancariaNomePagamento:nome};
  try{$("apBaixaConfirmar").disabled=true;await atualizarDocumento("contasPagar",id,alteracoes);fecharBaixa();emitirAlteracao(MODULO);setTimeout(async()=>{await carregarDados();preparar()},120)}catch(e){console.error(e);alert("Não foi possível marcar o pagamento.")}finally{if($("apBaixaConfirmar"))$("apBaixaConfirmar").disabled=false}
}

function bancoHtml(x){
  const planejado=contaPlanejadaNome(x),pago=contaPagaNome(x);if(x?.status==="pago"&&pago){const mudou=planejado&&pago!==planejado;return`<span class="ap-banco-pagamento"><strong>${esc(pago)}</strong>${mudou?`<span class="ap-banco-previsto">Prevista: ${esc(planejado)}</span>`:""}</span>`}return planejado?`<span class="ap-banco-pagamento"><strong>${esc(planejado)}</strong><span class="ap-banco-previsto">Prevista</span></span>`:"—";
}

function decorarTabela(){
  const tabela=document.querySelector("#pagina-contas-pagar .ap-table");if(!tabela)return;const cab=tabela.querySelector("thead tr");if(cab&&!cab.querySelector("[data-ap-col-banco]")){const th=document.createElement("th");th.dataset.apColBanco="1";th.textContent="Conta bancária";cab.insertBefore(th,cab.lastElementChild)}
  tabela.querySelectorAll("tbody tr").forEach(row=>{const id=idRegistroDaLinha(row);if(!id)return;const x=dados.find(a=>a.id===id);let td=row.querySelector("[data-ap-cell-banco]");if(!td){td=document.createElement("td");td.dataset.apCellBanco="1";row.insertBefore(td,row.lastElementChild)}td.innerHTML=bancoHtml(x)});aplicarFiltroConta();
}

function aplicarFiltroConta(){
  const tabela=document.querySelector("#pagina-contas-pagar .ap-table"),filtro=$("apFiltroBanco")?.value||"";if(!tabela)return;let visiveis=0;
  tabela.querySelectorAll("tbody tr").forEach(row=>{const id=idRegistroDaLinha(row);if(!id)return;const x=dados.find(a=>a.id===id),idConta=contaEfetivaId(x);const mostrar=!filtro||(filtro==="__sem__"?!idConta:idConta===filtro);row.style.display=mostrar?"":"none";row.dataset.apBancoOculto=mostrar?"0":"1";if(mostrar)visiveis++});
  const q=$("apQuantidade");if(q&&filtro)q.textContent=`${visiveis} exibido(s) na conta selecionada · ${dados.length} registro(s) no contexto`;
}

function capturarVinculoFormulario(e){
  if(e.target?.id!=="formContaPagar"||!podeVincularBanco())return;const sel=$("apContaBancariaPrevista"),contaId=sel?.value||"";if(!contaId){e.preventDefault();e.stopImmediatePropagation();const m=$("mensagemContaPagar");if(m)m.textContent=contas.length?"Selecione a conta bancária prevista para este compromisso.":"Cadastre uma conta bancária antes de criar o compromisso.";return}
  const conta=contas.find(c=>c.id===contaId);vinculoPendente={editId:editandoId,idsAntes:new Set(dados.map(x=>x.id)),contaId,contaNome:contaNome(conta)};
}

async function aplicarVinculoPendente(){
  const p=vinculoPendente;if(!p)return;vinculoPendente=null;await carregarDados();let alvos=[];if(p.editId){const x=dados.find(a=>a.id===p.editId);if(x)alvos=[x]}else alvos=dados.filter(x=>!p.idsAntes.has(x.id)&&x.origem!=="contrato");if(!alvos.length)return;
  for(const x of alvos)await atualizarDocumento("contasPagar",x.id,{contaBancariaId:p.contaId,contaBancariaNome:p.contaNome});editandoId="";emitirAlteracao(MODULO);await carregarDados();setTimeout(preparar,80);
}

function textoSelect(id){const s=$(id);return s?.options?.[s.selectedIndex]?.textContent||""}
function imprimirSelecao(){
  const tabela=document.querySelector("#pagina-contas-pagar .ap-table");if(!tabela)return;const visiveis=[...tabela.querySelectorAll("tbody tr")].filter(tr=>idRegistroDaLinha(tr)&&tr.dataset.apBancoOculto!=="1"&&tr.style.display!=="none");const clone=tabela.cloneNode(true);clone.querySelectorAll('tbody tr[data-ap-banco-oculto="1"]').forEach(tr=>tr.remove());clone.querySelectorAll("thead tr,tbody tr").forEach(tr=>tr.lastElementChild?.remove());clone.querySelectorAll("button").forEach(b=>b.remove());
  const ini=$("apFiltroInicio")?.value||"",fim=$("apFiltroFim")?.value||"",periodo=ini||fim?`${ini?dataBr(ini):"início"} a ${fim?dataBr(fim):"sem limite"}`:"Todos os vencimentos exibidos",ids=visiveis.map(idRegistroDaLinha).filter(Boolean),selecionados=dados.filter(x=>ids.includes(x.id)),total=selecionados.reduce((s,x)=>s+Number(x.valor||0),0),banco=textoSelect("apFiltroBanco")||"Todas as contas";
  const w=window.open("","_blank","width=1100,height=760");if(!w)return alert("O navegador bloqueou a janela de impressão. Libere pop-ups para o SIG e tente novamente.");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Cockpit de Pagamentos Fixos</title><style>body{font-family:Arial,sans-serif;color:#1f2937;padding:26px}h1{margin:0;color:#0b1f33;font-size:23px}.meta{margin:8px 0 18px;color:#667085;font-size:12px}.resumo{display:flex;gap:18px;margin:12px 0 18px;padding:10px 12px;background:#f4f7f9;border-radius:8px;font-size:12px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border-bottom:1px solid #dfe5ea;padding:8px;text-align:left;vertical-align:top}th{background:#f4f7f9;color:#344054}.ap-status,.ap-origem{font-weight:700}.acoes-tabela{display:none}@media print{body{padding:0}}</style></head><body><h1>Cockpit de Pagamentos Fixos</h1><div class="meta">Período: ${esc(periodo)} · Status: ${esc(textoSelect("apFiltroStatus"))} · Origem: ${esc(textoSelect("apFiltroOrigem"))} · Conta: ${esc(banco)}</div><div class="resumo"><strong>${ids.length} compromisso(s) na seleção</strong><span>Total previsto: ${esc(moeda(total))}</span></div>${clone.outerHTML}</body></html>`);w.document.close();w.focus();setTimeout(()=>w.print(),120);
}

function preparar(){instalarCss();garantirCampoConta();rotularPeriodo();garantirModal();garantirFiltroConta();decorarTabela()}

const obs=new MutationObserver(()=>preparar());obs.observe(document.body,{childList:true,subtree:true});
document.addEventListener("submit",capturarVinculoFormulario,true);
document.addEventListener("click",e=>{
  const editar=e.target?.closest?.("#pagina-contas-pagar [data-ap-editar]");if(editar){editandoId=editar.dataset.apEditar||"";setTimeout(()=>preencherContaEdicao(editandoId),80)}
  if(e.target?.closest?.("#btnNovaContaPagar")){editandoId="";setTimeout(()=>preencherContaEdicao(""),80)}
  const b=e.target?.closest?.("#pagina-contas-pagar [data-ap-pagar]");if(!b)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();abrirBaixa(b.dataset.apPagar)
},true);
window.addEventListener("sig:ready",async()=>{await carregarDados();setTimeout(preparar,30)});
window.addEventListener("sig:page",async e=>{if(e.detail?.pagina!=="contas-pagar")return;await carregarDados();setTimeout(preparar,80)});
window.addEventListener("sig:data-changed",async e=>{if(e.detail?.modulo!==MODULO)return;if(vinculoPendente){await aplicarVinculoPendente();return}await carregarDados();setTimeout(preparar,120)});
preparar();
