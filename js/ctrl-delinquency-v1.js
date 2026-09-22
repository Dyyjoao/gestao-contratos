import { abrirPagina, admin } from "./core.js";
import { $, esc, msg, permite, listarDocumentos, atualizarDocumento, empresasSelecionadasIds, nomeEmpresa, moeda, dataBr, emitirAlteracao } from "./shared.js";

let vendas=[],carregando=false,editId=null;
const pagina=()=>$("pagina-ctrl-inadimplencia-v1");
const hoje=()=>new Date().toISOString().slice(0,10);
const competenciaAtual=()=>new Date().toISOString().slice(0,7);
const podeVer=()=>admin()||permite("controladoria","editar")||permite("controladoria","inadimplencia")||permite("controladoria","inadimplenciaEditar");
const podeEditar=()=>admin()||permite("controladoria","editar")||permite("controladoria","inadimplenciaEditar");
const n=v=>{const x=Number(v||0);return Number.isFinite(x)?x:0};

function fimMes(comp){const[a,m]=String(comp||"").split("-").map(Number);if(!a||!m)return hoje();return new Date(a,m,0,12).toISOString().slice(0,10)}
function dataReferencia(){const comp=$("inadCompetencia")?.value||competenciaAtual(),fim=fimMes(comp);return fim>hoje()?hoje():fim}
function diffDias(venc,ref=dataReferencia()){if(!venc)return 0;const a=new Date(`${venc}T12:00:00`),b=new Date(`${ref}T12:00:00`);return Math.max(0,Math.floor((b-a)/86400000))}
function valorOriginal(v){return n(v.valor)}
function valorRecebido(v){return n(v.valorRecebido??v.valorFaturado)}
function dataRecebimento(v){return v.dataRecebimento||v.dataFaturamento||""}
function saldo(v){return Math.max(0,valorOriginal(v)-valorRecebido(v))}
function statusFinanceiro(v){
  if(v.status==="cancelada")return"cancelado";
  if(valorRecebido(v)>=valorOriginal(v)&&valorOriginal(v)>0)return"recebido";
  if(valorRecebido(v)>0)return"parcial";
  if(v.statusFinanceiro==="negociado")return"negociado";
  return"aberto"
}
function abertoNaReferencia(v){
  if(v.status==="cancelada")return false;
  const dr=dataRecebimento(v);
  if(statusFinanceiro(v)==="recebido"&&dr&&dr<=dataReferencia())return false;
  return saldo(v)>0
}
function bucket(v){
  if(!v.vencimento)return"sem_vencimento";
  if(!abertoNaReferencia(v))return"fora";
  const ref=dataReferencia();if(v.vencimento>ref)return"a_vencer";
  const d=diffDias(v.vencimento,ref);if(d<=30)return"1_30";if(d<=60)return"31_60";if(d<=90)return"61_90";return"90_mais"
}
function pct(a,b){return b>0?`${(a/b*100).toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1})}%`:"0,0%"}
function statusNome(s){return({aberto:"Em aberto",parcial:"Parcial",negociado:"Negociado",recebido:"Recebido",cancelado:"Cancelado"})[s]||s||"—"}
function statusClasse(s){return s==="recebido"?"status-ativo":s==="cancelado"?"status-inativo":s==="negociado"?"status-pendente":s==="parcial"?"status-pendente":"status-atrasado"}
function selecionadas(){return new Set(empresasSelecionadasIds())}
function competenciaVenda(v){return String(v.data||"").slice(0,7)}
function vendasVisiveis(){
  const comp=$("inadCompetencia")?.value||competenciaAtual(),filtro=$("inadFiltro")?.value||"todos",busca=String($("inadBusca")?.value||"").trim().toLowerCase();
  return vendas.filter(v=>{
    if(v.status==="cancelada"&&filtro!=="cancelado"&&filtro!=="todos")return false;
    if(competenciaVenda(v)&&competenciaVenda(v)>comp)return false;
    const b=bucket(v),st=statusFinanceiro(v);
    if(filtro!=="todos"&&b!==filtro&&st!==filtro)return false;
    if(busca&&!`${v.cliente||""} ${v.documento||""} ${v.vendedorNome||""}`.toLowerCase().includes(busca))return false;
    return true
  })
}

function css(){if($("inad-css"))return;const s=document.createElement("style");s.id="inad-css";s.textContent=`
.inad-toolbar{display:flex;gap:9px;align-items:end;flex-wrap:wrap}.inad-toolbar .campo{min-width:150px}.inad-aging{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin:12px 0}.inad-aging-card{border:1px solid #e3e8ef;border-radius:12px;background:#fff;padding:12px}.inad-aging-card span{display:block;color:#667085;font-size:11px}.inad-aging-card strong{display:block;font-size:18px;margin:5px 0}.inad-aging-card small{color:#667085}.inad-aging-card.atraso{border-left:4px solid #e16b21}.inad-aging-card.critico{border-left:4px solid #b42318}.inad-aging-card.pendente{border-left:4px solid #98a2b3}.inad-linha-vencida td{background:#fffaf7}.inad-linha-critica td{background:#fff7f6}.inad-linha-sem-venc td{background:#fafafa}.inad-acoes{display:flex;gap:5px;flex-wrap:wrap}.inad-info{display:block;font-size:10px;color:#667085;margin-top:2px}.inad-table td:nth-child(5),.inad-table td:nth-child(6),.inad-table td:nth-child(7){white-space:nowrap}.inad-origem{padding:9px 12px;border:1px solid #dfe5ea;border-radius:10px;background:#f8fafb;color:#667085;font-size:11px;margin-bottom:12px}.inad-origem strong{color:#0b1f33}@media(max-width:1100px){.inad-aging{grid-template-columns:repeat(3,1fr)}}@media(max-width:720px){.inad-aging{grid-template-columns:1fr 1fr}.inad-toolbar .campo{min-width:120px}}
`;document.head.appendChild(s)}

function criarPagina(){if(pagina())return;css();const main=document.querySelector("main.conteudo");if(!main)return;const s=document.createElement("section");s.id="pagina-ctrl-inadimplencia-v1";s.className="pagina hidden";s.innerHTML=`
  <div class="pagina-cabecalho"><div><span class="eyebrow">CONTROLADORIA · CRÉDITO & COBRANÇA</span><h2>Inadimplência & Aging</h2><p>Carteira financeira construída diretamente a partir do histórico de vendas.</p></div><div class="inad-acoes"><button id="btnInadAtualizar" class="btn-secundario" type="button">Atualizar</button></div></div>
  <div id="inadAviso" class="modulo-aviso hidden"></div>
  <div class="inad-origem"><strong>Origem:</strong> Vendas & Comissões. Vencimentos e baixas financeiras feitos aqui atualizam a própria venda; não existe cadastro paralelo de título nesta tela.</div>
  <section class="lista-card"><div class="inad-toolbar"><div class="campo"><label for="inadCompetencia">Referência</label><input id="inadCompetencia" type="month"></div><div class="campo"><label for="inadFiltro">Filtro</label><select id="inadFiltro"><option value="todos">Todos</option><option value="sem_vencimento">Sem vencimento</option><option value="a_vencer">A vencer</option><option value="1_30">1–30 dias</option><option value="31_60">31–60 dias</option><option value="61_90">61–90 dias</option><option value="90_mais">Acima de 90 dias</option><option value="parcial">Recebimento parcial</option><option value="negociado">Negociados</option><option value="recebido">Recebidos</option><option value="cancelado">Cancelados</option></select></div><div class="campo" style="min-width:260px"><label for="inadBusca">Cliente / pedido / vendedor</label><input id="inadBusca" placeholder="Buscar..."></div><div class="fpa-contexto-chip" id="inadDataRef">—</div></div></section>
  <div class="kpi-grid kpi-grid-4"><div class="kpi-card"><span>Carteira em aberto</span><strong id="inadCarteira">—</strong><small>saldo das vendas não liquidadas</small></div><div class="kpi-card"><span>Valor vencido</span><strong id="inadVencido">—</strong><small>saldo vencido na referência</small></div><div class="kpi-card"><span>Índice de inadimplência</span><strong id="inadIndice">—</strong><small>vencido ÷ carteira em aberto</small></div><div class="kpi-card"><span>Sem vencimento</span><strong id="inadSemVenc">—</strong><small id="inadSemVencQtd">0 venda(s)</small></div></div>
  <div class="inad-aging"><div class="inad-aging-card pendente"><span>Sem vencimento</span><strong id="ageSemVenc">—</strong><small id="ageSemVencQtd">0 vendas</small></div><div class="inad-aging-card"><span>A vencer</span><strong id="ageAVencer">—</strong><small id="ageAVencerQtd">0 vendas</small></div><div class="inad-aging-card atraso"><span>1–30 dias</span><strong id="age130">—</strong><small id="age130Qtd">0 vendas</small></div><div class="inad-aging-card atraso"><span>31–60 dias</span><strong id="age3160">—</strong><small id="age3160Qtd">0 vendas</small></div><div class="inad-aging-card atraso"><span>61–90 dias</span><strong id="age6190">—</strong><small id="age6190Qtd">0 vendas</small></div><div class="inad-aging-card critico"><span>Acima de 90 dias</span><strong id="age90">—</strong><small id="age90Qtd">0 vendas</small></div></div>
  <section id="inadFormBox" class="form-card hidden"><div class="form-card-titulo"><div><h3 id="inadFormTitulo">Atualizar recebível</h3><p>Pedido e valor original vêm de Vendas. Aqui você informa vencimento e baixa financeira.</p></div></div><form id="formInad"><div class="form-grid form-grid-3">
    <div class="campo"><label for="inadEmpresa">Empresa</label><input id="inadEmpresa" disabled></div>
    <div class="campo"><label for="inadDocumento">Pedido / documento</label><input id="inadDocumento" disabled></div>
    <div class="campo"><label for="inadVendaData">Data da venda</label><input id="inadVendaData" disabled></div>
    <div class="campo campo-span-2"><label for="inadCliente">Cliente</label><input id="inadCliente" disabled></div>
    <div class="campo"><label for="inadVendedor">Vendedor</label><input id="inadVendedor" disabled></div>
    <div class="campo"><label for="inadValorOriginal">Valor da venda</label><input id="inadValorOriginal" disabled></div>
    <div class="campo"><label for="inadVencimento">Vencimento</label><input id="inadVencimento" type="date"></div>
    <div class="campo"><label for="inadValorRecebido">Valor recebido</label><input id="inadValorRecebido" type="number" min="0" step="0.01"></div>
    <div class="campo"><label for="inadDataRecebimento">Data da baixa</label><input id="inadDataRecebimento" type="date"></div>
    <div class="campo"><label for="inadStatusFinanceiro">Situação</label><select id="inadStatusFinanceiro"><option value="aberto">Em aberto</option><option value="negociado">Negociado</option></select></div>
    <div class="campo campo-span-2"><label for="inadObservacaoFinanceira">Observação financeira / negociação</label><input id="inadObservacaoFinanceira"></div>
  </div><div class="form-acoes"><button id="btnInadCancelar" class="btn-secundario" type="button">Cancelar</button><button class="btn-primario" type="submit">Salvar atualização</button></div><p id="inadMensagem" class="mensagem-form"></p></form></section>
  <section class="lista-card"><div class="lista-cabecalho"><div><h3>Histórico de vendas / recebíveis</h3><p id="inadResumoLista">—</p></div></div><div class="tabela-container"><table class="tabela inad-table"><thead><tr><th>Venda</th><th>Cliente / pedido</th><th>Vencimento</th><th>Dias</th><th>Vendido</th><th>Recebido</th><th>Saldo</th><th>Situação</th><th>Ações</th></tr></thead><tbody id="inadLista"></tbody></table></div></section>`;main.appendChild(s);
  $("inadCompetencia").value=competenciaAtual();$("btnInadAtualizar")?.addEventListener("click",carregar);$("btnInadCancelar")?.addEventListener("click",fecharForm);$("formInad")?.addEventListener("submit",salvar);$("inadCompetencia")?.addEventListener("change",render);$("inadFiltro")?.addEventListener("change",render);$("inadBusca")?.addEventListener("input",render);$("inadValorRecebido")?.addEventListener("input",ajustarBaixa)
}

function ajustarBaixa(){
  const v=vendas.find(x=>x.id===editId),vr=n($("inadValorRecebido")?.value);
  if(vr>0&&!$("inadDataRecebimento")?.value)$("inadDataRecebimento").value=hoje();
  if(v&&vr>=valorOriginal(v))$("inadStatusFinanceiro").value="aberto"
}
function fecharForm(){editId=null;$("formInad")?.reset();$("inadFormBox")?.classList.add("hidden");msg($("inadMensagem"),"")}
function abrirForm(v){if(!podeEditar())return alert("Seu perfil possui acesso de consulta, mas não permissão para atualizar a carteira.");if(!v)return;editId=v.id;$("formInad")?.reset();$("inadFormTitulo").textContent="Atualizar recebível";$("inadEmpresa").value=nomeEmpresa(v.empresaId);$("inadDocumento").value=v.documento||"";$("inadVendaData").value=dataBr(v.data);$("inadCliente").value=v.cliente||"";$("inadVendedor").value=v.vendedorNome||"";$("inadValorOriginal").value=moeda(valorOriginal(v));$("inadVencimento").value=v.vencimento||"";$("inadValorRecebido").value=valorRecebido(v)||0;$("inadDataRecebimento").value=dataRecebimento(v)||"";$("inadStatusFinanceiro").value=v.statusFinanceiro==="negociado"?"negociado":"aberto";$("inadObservacaoFinanceira").value=v.observacaoFinanceira||"";$("inadFormBox").classList.remove("hidden");$("inadFormBox").scrollIntoView({behavior:"smooth",block:"start"})}

async function salvar(e){
  e.preventDefault();if(!podeEditar()||!editId)return;
  const v=vendas.find(x=>x.id===editId);if(!v)return msg($("inadMensagem"),"Venda não localizada.");
  const original=valorOriginal(v),vr=n($("inadValorRecebido").value),venc=$("inadVencimento").value||null,dr=$("inadDataRecebimento").value||null;
  if(vr<0||vr>original)return msg($("inadMensagem"),"O valor recebido deve ficar entre zero e o valor da venda.");
  if(vr>0&&!dr)return msg($("inadMensagem"),"Informe a data da baixa para o valor recebido.");
  const pctCom=n(v.comissaoPct),comStatusAtual=String(v.comissaoStatus||"");
  let comStatus=vr>0?"provisionada":"aguardando_recebimento";
  if(["aprovada","paga"].includes(comStatusAtual))comStatus=comStatusAtual;
  const d={vencimento:venc,valorRecebido:vr,dataRecebimento:vr>0?dr:null,statusFinanceiro:$("inadStatusFinanceiro").value,observacaoFinanceira:$("inadObservacaoFinanceira").value.trim(),comissaoBaseValor:vr,comissaoValor:vr*pctCom/100,comissaoStatus:comStatus};
  try{msg($("inadMensagem"),"Salvando...");await atualizarDocumento("vendas",v.id,d);fecharForm();await carregar();emitirAlteracao("vendas");msg($("inadAviso"),"Recebimento atualizado na própria venda.",true);$("inadAviso")?.classList.remove("hidden")}catch(err){console.error("Inadimplência:",err);msg($("inadMensagem"),"Não foi possível atualizar a venda. Verifique permissões e regras do Firebase.")}
}
async function marcarRecebido(id){if(!podeEditar())return;const v=vendas.find(x=>x.id===id);if(!v)return;if(!confirm(`Marcar ${v.documento||"esta venda"} como totalmente recebida hoje?`))return;const pctCom=n(v.comissaoPct),vr=valorOriginal(v),st=["aprovada","paga"].includes(String(v.comissaoStatus||""))?v.comissaoStatus:"provisionada";await atualizarDocumento("vendas",id,{valorRecebido:vr,dataRecebimento:hoje(),comissaoBaseValor:vr,comissaoValor:vr*pctCom/100,comissaoStatus:st,statusFinanceiro:"aberto"});await carregar();emitirAlteracao("vendas")}

function calcular(){
  const comp=$("inadCompetencia")?.value||competenciaAtual(),arr=vendas.filter(v=>competenciaVenda(v)<=comp&&v.status!=="cancelada"),ativos=arr.filter(abertoNaReferencia),carteira=ativos.reduce((s,v)=>s+saldo(v),0),vencidos=ativos.filter(v=>["1_30","31_60","61_90","90_mais"].includes(bucket(v))),valorVencido=vencidos.reduce((s,v)=>s+saldo(v),0),faixas={sem_vencimento:[],a_vencer:[],"1_30":[],"31_60":[],"61_90":[],"90_mais":[]};
  ativos.forEach(v=>{const b=bucket(v);if(faixas[b])faixas[b].push(v)});
  const soma=k=>faixas[k].reduce((s,v)=>s+saldo(v),0);return{ativos,carteira,valorVencido,faixas,soma}
}
function render(){
  criarPagina();const ref=dataReferencia(),c=calcular();$("inadDataRef").textContent=`Posição em ${dataBr(ref)}`;$("inadCarteira").textContent=moeda(c.carteira);$("inadVencido").textContent=moeda(c.valorVencido);$("inadIndice").textContent=pct(c.valorVencido,c.carteira);$("inadSemVenc").textContent=moeda(c.soma("sem_vencimento"));$("inadSemVencQtd").textContent=`${c.faixas.sem_vencimento.length} venda(s)`;
  [["sem_vencimento","ageSemVenc","ageSemVencQtd"],["a_vencer","ageAVencer","ageAVencerQtd"],["1_30","age130","age130Qtd"],["31_60","age3160","age3160Qtd"],["61_90","age6190","age6190Qtd"],["90_mais","age90","age90Qtd"]].forEach(([k,v,q])=>{$(v).textContent=moeda(c.soma(k));$(q).textContent=`${c.faixas[k].length} venda(s)`});
  const arr=vendasVisiveis().sort((a,b)=>String(a.vencimento||"9999-99-99").localeCompare(String(b.vencimento||"9999-99-99"))||String(b.data||"").localeCompare(String(a.data||"")));$("inadResumoLista").textContent=`${arr.length} venda(s) · referência ${dataBr(ref)}`;const tb=$("inadLista");if(!tb)return;if(!arr.length){tb.innerHTML='<tr><td colspan="9">Nenhuma venda encontrada para os filtros selecionados.</td></tr>';return}
  tb.innerHTML=arr.map(v=>{const b=bucket(v),dias=["a_vencer","fora","sem_vencimento"].includes(b)?0:diffDias(v.vencimento,ref),cls=b==="90_mais"?"inad-linha-critica":["1_30","31_60","61_90"].includes(b)?"inad-linha-vencida":b==="sem_vencimento"?"inad-linha-sem-venc":"",st=statusFinanceiro(v);return`<tr class="${cls}"><td><strong>${dataBr(v.data)}</strong><span class="inad-info">${esc(nomeEmpresa(v.empresaId))}</span></td><td><strong>${esc(v.cliente||"—")}</strong><span class="inad-info">Pedido ${esc(v.documento||"—")} · ${esc(v.vendedorNome||"—")}</span></td><td>${v.vencimento?dataBr(v.vencimento):'<span class="status-pendente">Sem vencimento</span>'}</td><td>${dias?`${dias} d`:"—"}</td><td>${moeda(valorOriginal(v))}</td><td>${moeda(valorRecebido(v))}</td><td><strong>${moeda(saldo(v))}</strong></td><td><span class="${statusClasse(st)}">${statusNome(st)}</span><span class="inad-info">${b==="sem_vencimento"?"Definir vencimento":b==="a_vencer"?"A vencer":b==="fora"?"Liquidado":b.replace("_","–")}</span></td><td><div class="inad-acoes">${podeEditar()?`<button class="btn-acao" data-inad-edit="${v.id}" type="button">Atualizar</button>${saldo(v)>0?`<button class="btn-acao destaque" data-inad-recebido="${v.id}" type="button">Baixa total</button>`:""}`:"—"}</div></td></tr>`}).join("");
  document.querySelectorAll("[data-inad-edit]").forEach(b=>b.onclick=()=>abrirForm(vendas.find(v=>v.id===b.dataset.inadEdit)));document.querySelectorAll("[data-inad-recebido]").forEach(b=>b.onclick=()=>marcarRecebido(b.dataset.inadRecebido))
}

async function carregar(){
  if(carregando||!podeVer())return;carregando=true;const av=$("inadAviso");try{if(av)av.classList.add("hidden");const ids=selecionadas(),vs=await listarDocumentos("vendas");vendas=vs.filter(v=>ids.has(v.empresaId));render()}catch(e){console.error("Inadimplência:",e);vendas=[];render();if(av){av.classList.remove("hidden");av.textContent="Não foi possível carregar o histórico de vendas. Verifique permissões da collection vendas."}}finally{carregando=false}
}

export async function abrir(){criarPagina();if(!podeVer())return alert("Seu perfil não possui permissão para acessar Inadimplência & Aging.");abrirPagina("ctrl-inadimplencia-v1");if($("tituloPagina"))$("tituloPagina").textContent="Inadimplência & Aging";await carregar()}

criarPagina();
window.addEventListener("sig:empresa-changed",()=>{if(pagina()&&!pagina().classList.contains("hidden"))carregar()});
window.addEventListener("sig:data-changed",e=>{if(e.detail?.modulo==="vendas"&&pagina()&&!pagina().classList.contains("hidden"))carregar()});
