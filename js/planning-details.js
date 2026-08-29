import {
  $, on, esc, msg, moeda, empresaAtualId,
  listarDocumentos, criarDocumento, atualizarDocumento
} from "./shared.js";

const MESES=[
  ["jan","Jan",1],["fev","Fev",2],["mar","Mar",3],["abr","Abr",4],["mai","Mai",5],["jun","Jun",6],
  ["jul","Jul",7],["ago","Ago",8],["set","Set",9],["out","Out",10],["nov","Nov",11],["dez","Dez",12]
];

let contratos=[];
let detalhes=[];
let contexto=null;

const n=v=>{const x=Number(v||0);return Number.isFinite(x)?x:0};
const vazio=()=>Object.fromEntries(MESES.map(([m])=>[m,0]));
const total=v=>MESES.reduce((s,[m])=>s+n(v?.[m]),0);

function isoMes(ano,mes){return `${ano}-${String(mes).padStart(2,"0")}-01`}
function mesesEntre(aAno,aMes,bAno,bMes){return (bAno-aAno)*12+(bMes-aMes)}
function dentroVigencia(c,ano,mes){
  const alvo=isoMes(ano,mes);
  const inicio=String(c.inicio||"").slice(0,7)+"-01";
  const fim=String(c.fim||"9999-12-31").slice(0,7)+"-01";
  return (!inicio||alvo>=inicio)&&(!fim||alvo<=fim);
}
function valorContratoMes(c,ano,mes){
  if(!dentroVigencia(c,ano,mes))return 0;
  let valor=n(c.valorMensal);
  const regra=c.regraReajuste||{};
  const perc=n(regra.percentualProjetado);
  const dataReaj=String(c.reajuste||"");
  if(!perc||regra.tipo==="sem_reajuste"||!dataReaj)return valor;
  const [ra,rm]=dataReaj.slice(0,7).split("-").map(Number);
  const diff=mesesEntre(ra,rm,ano,mes);
  if(diff<0)return valor;
  const periodicidade=Math.max(1,n(regra.periodicidadeMeses)||12);
  const aplicacoes=Math.floor(diff/periodicidade)+1;
  return valor*Math.pow(1+perc/100,aplicacoes);
}
function valoresContrato(c,ano){return Object.fromEntries(MESES.map(([m,,num])=>[m,valorContratoMes(c,ano,num)]))}
function contratoDescricao(c){return `${c.numero||"Contrato"} · ${c.fornecedor||"Fornecedor"}`}
function contratoComentario(c){
  const r=c.regraReajuste||{};
  const partes=[c.comentarioPlanejamento||c.objeto||""];
  if(r.tipo==="indice"&&r.indice)partes.push(`${r.indice} projetado ${n(r.percentualProjetado).toLocaleString("pt-BR",{maximumFractionDigits:2})}%`);
  else if(r.tipo==="percentual_fixo")partes.push(`reajuste ${n(r.percentualProjetado).toLocaleString("pt-BR",{maximumFractionDigits:2})}%`);
  if(c.reajuste)partes.push(`data-base ${String(c.reajuste).split("-").reverse().join("/")}`);
  return partes.filter(Boolean).join(" · ");
}

function garantirDrawer(){
  if($("drawerPlanejamento"))return;
  const style=document.createElement("style");
  style.textContent=`
    .planejamento-detalhar{margin-top:5px;border:0;background:transparent;color:#0b8077;font-size:9px;font-weight:850;cursor:pointer;padding:0}
    .planejamento-detalhar:hover{text-decoration:underline}
    .planning-overlay{position:fixed;inset:0;z-index:120;background:rgba(11,31,51,.38);display:flex;justify-content:flex-end}
    .planning-overlay.hidden{display:none}
    .planning-drawer{width:min(1100px,94vw);height:100%;overflow:auto;background:#f7f9fb;padding:20px;box-shadow:-12px 0 30px rgba(11,31,51,.18)}
    .planning-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:14px}.planning-head h3{margin:0;color:#0b1f33}.planning-head p{margin:5px 0 0;color:#667085;font-size:12px}.planning-close{border:1px solid #d0d5dd;background:#fff;border-radius:9px;width:40px;height:40px;cursor:pointer}
    .planning-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:14px}.planning-summary .kpi-card strong{font-size:18px}
    .planning-table-wrap{overflow:auto;background:#fff;border:1px solid #e4e7ec;border-radius:12px}.planning-table{border-collapse:collapse;min-width:1450px;width:100%;font-size:10px}.planning-table th,.planning-table td{border-bottom:1px solid #eaecf0;border-right:1px solid #eaecf0;padding:7px;white-space:nowrap}.planning-table th{background:#f8fafc;color:#475467;position:sticky;top:0;z-index:2}.planning-table .desc{min-width:220px;text-align:left}.planning-table .coment{min-width:280px;text-align:left;white-space:normal}.planning-table input{width:88px;height:30px;border:1px solid #d0d5dd;border-radius:6px;padding:0 6px;text-align:right}.planning-origin{display:inline-flex;border-radius:999px;padding:3px 6px;font-size:8px;font-weight:850;background:#eef3f5;color:#475467}.planning-origin.contrato{background:#e8fbf7;color:#087a6f}.planning-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.planning-new{margin-top:14px;padding:14px;background:#fff;border:1px solid #e4e7ec;border-radius:12px}.planning-new-grid{display:grid;grid-template-columns:1.2fr 1.8fr;gap:10px;margin-bottom:10px}.planning-new input{height:38px;border:1px solid #d0d5dd;border-radius:8px;padding:0 9px}.planning-new-months{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:7px}.planning-new-months label{font-size:9px;color:#667085}.planning-new-months input{width:100%;height:34px}.planning-msg{font-size:11px;color:#667085;margin-left:auto}
    @media(max-width:700px){.planning-drawer{width:100vw;padding:14px}.planning-summary{grid-template-columns:1fr}.planning-new-grid{grid-template-columns:1fr}.planning-new-months{grid-template-columns:repeat(2,minmax(0,1fr))}}
  `;
  document.head.appendChild(style);
  const overlay=document.createElement("div");
  overlay.id="drawerPlanejamento";
  overlay.className="planning-overlay hidden";
  overlay.innerHTML=`<aside class="planning-drawer" role="dialog" aria-modal="true" aria-labelledby="planningTitulo">
    <div class="planning-head"><div><h3 id="planningTitulo">Detalhamento da linha</h3><p id="planningSubtitulo"></p></div><button id="btnFecharPlanning" class="planning-close" type="button" aria-label="Fechar">✕</button></div>
    <div class="planning-summary"><div class="kpi-card"><span>Contratos / drivers</span><strong id="planningQtdContratos">0</strong></div><div class="kpi-card"><span>Linhas manuais</span><strong id="planningQtdManuais">0</strong></div><div class="kpi-card"><span>Total projetado</span><strong id="planningTotal">R$ 0,00</strong></div></div>
    <div class="planning-actions"><button id="btnAplicarDetalhamento" class="btn-primario" type="button">Aplicar soma à linha</button><span id="planningMensagem" class="planning-msg"></span></div>
    <div class="planning-table-wrap"><table class="planning-table"><thead><tr><th>Origem</th><th class="desc">Descrição</th><th class="coment">Comentário / memória</th>${MESES.map(([,n])=>`<th>${n}</th>`).join("")}<th>Total</th></tr></thead><tbody id="planningLinhas"></tbody></table></div>
    <section class="planning-new"><strong>+ Incluir linha manual</strong><div class="planning-new-grid"><input id="planningNovaDescricao" placeholder="Descrição da linha"><input id="planningNovoComentario" placeholder="Comentário / memória de cálculo"></div><div class="planning-new-months">${MESES.map(([m,n])=>`<label>${n}<input data-planning-novo-mes="${m}" type="number" step="0.01" value="0"></label>`).join("")}</div><div class="planning-actions"><button id="btnSalvarLinhaPlanning" class="btn-secundario" type="button">Adicionar linha</button></div></section>
  </aside>`;
  document.body.appendChild(overlay);
  on($("btnFecharPlanning"),"click",fechar);
  on(overlay,"click",e=>{if(e.target===overlay)fechar()});
  on($("btnSalvarLinhaPlanning"),"click",salvarLinhaManual);
  on($("btnAplicarDetalhamento"),"click",aplicarNaMatriz);
}

function fechar(){$("drawerPlanejamento")?.classList.add("hidden");contexto=null}
function versaoAtual(cenario,ano){return cenario==="budget"?($("budgetVersao")?.value.trim()||`Budget ${ano} - V1`):($("forecastVersao")?.value.trim()||"F01")}
function centroAtual(cenario){return $(cenario==="budget"?"budgetCentro":"forecastCentro")?.value||""}

function linhasContrato(){
  if(!contexto)return[];
  return contratos.filter(c=>c.status==="ativo"&&c.planejamentoAtivo===true&&c.contaGerencialId===contexto.contaId&&(c.centroCustoId||"")===(contexto.centroCustoId||""))
    .map(c=>({id:c.id,origem:"contrato",descricao:contratoDescricao(c),comentario:contratoComentario(c),valores:valoresContrato(c,contexto.ano)}));
}
function linhasManuais(){
  if(!contexto)return[];
  return detalhes.filter(x=>x.cenario===contexto.cenario&&Number(x.exercicio)===contexto.ano&&x.versao===contexto.versao&&x.contaId===contexto.contaId&&(x.centroCustoId||"")===(contexto.centroCustoId||""));
}
function todasLinhas(){return [...linhasContrato(),...linhasManuais()]}
function somaLinhas(){
  const s=vazio();
  todasLinhas().forEach(l=>MESES.forEach(([m])=>s[m]+=n(l.valores?.[m])));
  return s;
}

function renderDrawer(){
  if(!contexto)return;
  const cts=linhasContrato(),mans=linhasManuais(),linhas=[...cts,...mans],soma=somaLinhas();
  $("planningTitulo").textContent=`Detalhamento · ${contexto.nomeConta}`;
  $("planningSubtitulo").textContent=`${contexto.cenario==="budget"?"Budget":"Forecast"} ${contexto.ano} · ${contexto.versao}`;
  $("planningQtdContratos").textContent=cts.length;
  $("planningQtdManuais").textContent=mans.length;
  $("planningTotal").textContent=moeda(total(soma));
  const tbody=$("planningLinhas");
  tbody.innerHTML=linhas.length?linhas.map(l=>`<tr>
    <td><span class="planning-origin ${l.origem||"manual"}">${l.origem==="contrato"?"Contrato":"Manual"}</span></td>
    <td class="desc"><strong>${esc(l.descricao||"")}</strong></td>
    <td class="coment">${esc(l.comentario||"")}</td>
    ${MESES.map(([m])=>`<td>${moeda(l.valores?.[m])}</td>`).join("")}
    <td><strong>${moeda(total(l.valores||{}))}</strong></td>
  </tr>`).join(""):'<tr><td colspan="16">Nenhum driver ou linha manual para esta conta.</td></tr>';
}

async function abrirDetalhe(cenario,tr){
  garantirDrawer();
  const contaId=cenario==="budget"?tr.dataset.budgetConta:tr.dataset.forecastConta;
  const cel=tr.querySelector(".conta-col");
  const nomeConta=cel?.querySelector("span")?.textContent||cel?.textContent.trim()||"Conta";
  const ano=Number($(cenario==="budget"?"budgetAno":"forecastAno")?.value||new Date().getFullYear());
  contexto={cenario,contaId,nomeConta,ano,versao:versaoAtual(cenario,ano),centroCustoId:centroAtual(cenario),tr};
  $("drawerPlanejamento").classList.remove("hidden");
  msg($("planningMensagem"),"Carregando detalhamento...");
  try{
    [contratos,detalhes]=await Promise.all([listarDocumentos("contratos"),listarDocumentos("planejamentoDetalhes")]);
    renderDrawer();
    msg($("planningMensagem"),"");
  }catch(e){console.error(e);msg($("planningMensagem"),"As regras do Firebase ainda precisam liberar o detalhamento.")}
}

function instrumentarTabela(tabela,cenario){
  if(!tabela)return;
  const seletor=cenario==="budget"?"tr[data-budget-conta]":"tr[data-forecast-conta]";
  tabela.querySelectorAll(seletor).forEach(tr=>{
    const cel=tr.querySelector(".conta-col");if(!cel||cel.querySelector(".planejamento-detalhar"))return;
    const b=document.createElement("button");b.type="button";b.className="planejamento-detalhar";b.textContent="Detalhar linhas";
    on(b,"click",()=>abrirDetalhe(cenario,tr));cel.appendChild(b);
  });
}
function instrumentar(){instrumentarTabela($("tabelaBudget"),"budget");instrumentarTabela($("tabelaForecast"),"forecast")}

async function salvarLinhaManual(){
  if(!contexto)return;
  const descricao=$("planningNovaDescricao")?.value.trim();
  if(!descricao)return msg($("planningMensagem"),"Informe a descrição da nova linha.");
  const valores=Object.fromEntries(MESES.map(([m])=>[m,n(document.querySelector(`[data-planning-novo-mes="${m}"]`)?.value)]));
  const d={
    cenario:contexto.cenario,exercicio:contexto.ano,versao:contexto.versao,
    contaId:contexto.contaId,centroCustoId:contexto.centroCustoId,
    origem:"manual",descricao,comentario:$("planningNovoComentario")?.value.trim()||"",valores
  };
  try{
    msg($("planningMensagem"),"Adicionando linha...");
    await criarDocumento("planejamentoDetalhes",d);
    detalhes=await listarDocumentos("planejamentoDetalhes");
    $("planningNovaDescricao").value="";$("planningNovoComentario").value="";
    document.querySelectorAll("[data-planning-novo-mes]").forEach(i=>i.value=0);
    renderDrawer();msg($("planningMensagem"),"Linha adicionada.",true);
  }catch(e){console.error(e);msg($("planningMensagem"),"Não foi possível adicionar a linha.")}
}

function aplicarNaMatriz(){
  if(!contexto?.tr)return;
  const soma=somaLinhas(),tr=contexto.tr;
  if(contexto.cenario==="budget"){
    MESES.forEach(([m])=>{const i=tr.querySelector(`[data-budget-mes="${m}"]`);if(i){i.value=n(soma[m]).toFixed(2);i.dispatchEvent(new Event("input",{bubbles:true}))}});
  }else{
    MESES.forEach(([m])=>{const i=tr.querySelector(`[data-forecast-mes="${m}"]`);if(i){i.value=n(soma[m]).toFixed(2);i.dispatchEvent(new Event("input",{bubbles:true}))}});
  }
  msg($("planningMensagem"),"Soma aplicada à linha. Salve o Budget/Forecast para confirmar.",true);
}

function bind(){
  garantirDrawer();
  [$("tabelaBudget"),$("tabelaForecast")].forEach(t=>{if(t)new MutationObserver(instrumentar).observe(t,{childList:true,subtree:true})});
  window.addEventListener("sig:page",e=>{if(e.detail?.pagina==="controladoria")setTimeout(instrumentar,120)});
  window.addEventListener("sig:empresa-changed",()=>{contratos=[];detalhes=[];fechar()});
  window.addEventListener("sig:contract-driver-changed",()=>{contratos=[]});
}

bind();
