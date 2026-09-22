import { abrirPagina, admin } from "./core.js";
import { $, esc, msg, permite, listarDocumentos, empresasSelecionadasIds, nomeEmpresa, moeda, dataBr, emitirAlteracao, db, doc, runTransaction, serverTimestamp, state } from "./shared.js";

let vendas=[],recebimentos=[],carregando=false,tratamentoId=null;
const pagina=()=>$("pagina-ctrl-inadimplencia-v1");
const hoje=()=>new Date().toISOString().slice(0,10);
const competenciaAtual=()=>new Date().toISOString().slice(0,7);
const podeVer=()=>admin()||permite("controladoria","editar")||permite("controladoria","inadimplencia")||permite("controladoria","inadimplenciaEditar");
const podeEditar=()=>admin()||permite("controladoria","editar")||permite("controladoria","inadimplenciaEditar");
const n=v=>{const x=Number(v||0);return Number.isFinite(x)?x:0};

function fimMes(comp){const[a,m]=String(comp||"").split("-").map(Number);if(!a||!m)return hoje();return new Date(a,m,0,12).toISOString().slice(0,10)}
function dataReferencia(){const comp=$("inadCompetencia")?.value||competenciaAtual(),fim=fimMes(comp);return fim>hoje()?hoje():fim}
function diffDias(venc,ref=dataReferencia()){if(!venc)return 0;const a=new Date(`${venc}T12:00:00`),b=new Date(`${ref}T12:00:00`);return Math.max(0,Math.floor((b-a)/86400000))}
function parcelasVenda(v){
  if(Array.isArray(v?.parcelas)&&v.parcelas.length)return v.parcelas.map((p,i)=>({
    id:p.id||`P${String(i+1).padStart(3,"0")}`,ordem:n(p.ordem)||i+1,vencimento:String(p.vencimento||""),valor:n(p.valor),valorRecebido:n(p.valorRecebido),dataUltimoRecebimento:p.dataUltimoRecebimento||null
  }));
  return[{id:"P001",ordem:1,vencimento:v?.vencimento||"",valor:n(v?.valor),valorRecebido:n(v?.valorRecebido),dataUltimoRecebimento:v?.dataRecebimento||null}]
}
function recebimentosDaParcela(vendaId,parcelaId,ref=dataReferencia()){
  const hist=recebimentos.filter(r=>r.vendaId===vendaId&&String(r.dataRecebimento||"")<=ref);let total=0,ultima="";
  hist.forEach(r=>(Array.isArray(r.alocacoes)?r.alocacoes:[]).forEach(a=>{if(a.parcelaId===parcelaId){total+=n(a.valor);if(String(r.dataRecebimento||"")>ultima)ultima=String(r.dataRecebimento||"")}}));
  return{total,ultima}
}
function recebidoParcela(v,p,ref=dataReferencia()){
  const hist=recebimentosDaParcela(v.id,p.id,ref);if(hist.total>0)return Math.min(n(p.valor),hist.total);
  const data=p.dataUltimoRecebimento||v.dataRecebimento||"";
  if(n(p.valorRecebido)>0&&(!data||data<=ref))return Math.min(n(p.valor),n(p.valorRecebido));
  return 0
}
function saldoParcela(v,p,ref=dataReferencia()){return Math.max(0,n(p.valor)-recebidoParcela(v,p,ref))}
function statusParcela(v,p,ref=dataReferencia()){
  const rec=recebidoParcela(v,p,ref),val=n(p.valor);if(v.status==="cancelada")return"cancelado";if(val>0&&rec>=val-0.009)return"recebido";if(rec>0)return"parcial";return"aberto"
}
function bucket(v,p,ref=dataReferencia()){
  const saldo=saldoParcela(v,p,ref);if(v.status==="cancelada"||saldo<=0)return"fora";if(!p.vencimento)return"sem_vencimento";if(p.vencimento>ref)return"a_vencer";
  const d=diffDias(p.vencimento,ref);if(d<=30)return"1_30";if(d<=60)return"31_60";if(d<=90)return"61_90";return"90_mais"
}
function pct(a,b){return b>0?`${(a/b*100).toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1})}%`:"0,0%"}
function statusNome(s){return({aberto:"Em aberto",parcial:"Parcial",recebido:"Recebido",cancelado:"Cancelado"})[s]||s||"—"}
function statusClasse(s){return s==="recebido"?"status-ativo":s==="cancelado"?"status-inativo":s==="parcial"?"status-pendente":"status-atrasado"}
function selecionadas(){return new Set(empresasSelecionadasIds())}
function competenciaVenda(v){return String(v.data||"").slice(0,7)}
function todasParcelas(){const comp=$("inadCompetencia")?.value||competenciaAtual();return vendas.filter(v=>!competenciaVenda(v)||competenciaVenda(v)<=comp).flatMap(v=>parcelasVenda(v).map(p=>({v,p})))}
function parcelasVisiveis(){
  const filtro=$("inadFiltro")?.value||"todos",busca=String($("inadBusca")?.value||"").trim().toLowerCase(),ref=dataReferencia();
  return todasParcelas().filter(({v,p})=>{const b=bucket(v,p,ref),st=statusParcela(v,p,ref);if(filtro!=="todos"&&b!==filtro&&st!==filtro)return false;if(busca&&!`${v.cliente||""} ${v.documento||""} ${v.vendedorNome||""}`.toLowerCase().includes(busca))return false;return true})
}
function css(){if($("inad-css"))return;const s=document.createElement("style");s.id="inad-css";s.textContent=`
.inad-toolbar{display:flex;gap:9px;align-items:end;flex-wrap:wrap}.inad-toolbar .campo{min-width:150px}.inad-aging{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin:12px 0}.inad-aging-card{border:1px solid #e3e8ef;border-radius:12px;background:#fff;padding:12px}.inad-aging-card span{display:block;color:#667085;font-size:11px}.inad-aging-card strong{display:block;font-size:18px;margin:5px 0}.inad-aging-card small{color:#667085}.inad-aging-card.atraso{border-left:4px solid #e16b21}.inad-aging-card.critico{border-left:4px solid #b42318}.inad-aging-card.pendente{border-left:4px solid #98a2b3}.inad-linha-vencida td{background:#fffaf7}.inad-linha-critica td{background:#fff7f6}.inad-linha-sem-venc td{background:#fafafa}.inad-acoes{display:flex;gap:5px;flex-wrap:wrap}.inad-info{display:block;font-size:10px;color:#667085;margin-top:2px}.inad-table td:nth-child(5),.inad-table td:nth-child(6),.inad-table td:nth-child(7){white-space:nowrap}.inad-scroll-10{max-height:510px;overflow:auto}.inad-scroll-10 table{margin:0}.inad-scroll-10 thead th{position:sticky;top:0;z-index:2;background:#fff;box-shadow:0 1px 0 #edf0f3}.inad-origem{padding:9px 12px;border:1px solid #dfe5ea;border-radius:10px;background:#f8fafb;color:#667085;font-size:11px;margin-bottom:12px}.inad-origem strong{color:#0b1f33}@media(max-width:1100px){.inad-aging{grid-template-columns:repeat(3,1fr)}}@media(max-width:720px){.inad-aging{grid-template-columns:1fr 1fr}.inad-toolbar .campo{min-width:120px}}
`;document.head.appendChild(s)}

function criarPagina(){if(pagina())return;css();const main=document.querySelector("main.conteudo");if(!main)return;const s=document.createElement("section");s.id="pagina-ctrl-inadimplencia-v1";s.className="pagina hidden";s.innerHTML=`
  <div class="pagina-cabecalho"><div><span class="eyebrow">CONTROLADORIA · CRÉDITO & COBRANÇA</span><h2>Inadimplência & Aging</h2><p>Parcelas e vencimentos originados das vendas, com baixas conciliadas por recebimento.</p></div><div class="inad-acoes"><button id="btnInadAtualizar" class="btn-secundario" type="button">Atualizar</button></div></div>
  <div id="inadAviso" class="modulo-aviso hidden"></div>
  <div class="inad-origem"><strong>Origem:</strong> cada pedido vem de Vendas e é aberto aqui por parcela. Recebimentos importados são alocados por FIFO no próprio pedido, começando pela parcela mais antiga em aberto.</div>
  <section class="lista-card"><div class="inad-toolbar"><div class="campo"><label for="inadCompetencia">Referência</label><input id="inadCompetencia" type="month"></div><div class="campo"><label for="inadFiltro">Filtro</label><select id="inadFiltro"><option value="todos">Todos</option><option value="sem_vencimento">Sem vencimento</option><option value="a_vencer">A vencer</option><option value="1_30">1–30 dias</option><option value="31_60">31–60 dias</option><option value="61_90">61–90 dias</option><option value="90_mais">Acima de 90 dias</option><option value="parcial">Recebimento parcial</option><option value="recebido">Recebidos</option></select></div><div class="campo" style="min-width:260px"><label for="inadBusca">Cliente / pedido / vendedor</label><input id="inadBusca" placeholder="Buscar..."></div><div class="fpa-contexto-chip" id="inadDataRef">—</div></div></section>
  <div class="kpi-grid kpi-grid-4"><div class="kpi-card"><span>Carteira em aberto</span><strong id="inadCarteira">—</strong><small>saldo das parcelas</small></div><div class="kpi-card"><span>Valor vencido</span><strong id="inadVencido">—</strong><small>saldo vencido na referência</small></div><div class="kpi-card"><span>Índice de inadimplência</span><strong id="inadIndice">—</strong><small>vencido ÷ carteira</small></div><div class="kpi-card"><span>Recebido na referência</span><strong id="inadRecebidoRef">—</strong><small>baixas até a data de referência</small></div></div>
  <div class="inad-aging"><div class="inad-aging-card pendente"><span>Sem vencimento</span><strong id="ageSemVenc">—</strong><small id="ageSemVencQtd">0 parcelas</small></div><div class="inad-aging-card"><span>A vencer</span><strong id="ageAVencer">—</strong><small id="ageAVencerQtd">0 parcelas</small></div><div class="inad-aging-card atraso"><span>1–30 dias</span><strong id="age130">—</strong><small id="age130Qtd">0 parcelas</small></div><div class="inad-aging-card atraso"><span>31–60 dias</span><strong id="age3160">—</strong><small id="age3160Qtd">0 parcelas</small></div><div class="inad-aging-card atraso"><span>61–90 dias</span><strong id="age6190">—</strong><small id="age6190Qtd">0 parcelas</small></div><div class="inad-aging-card critico"><span>Acima de 90 dias</span><strong id="age90">—</strong><small id="age90Qtd">0 parcelas</small></div></div>
  <section class="lista-card"><div class="lista-cabecalho"><div><h3>Parcelas / recebíveis</h3><p id="inadResumoLista">—</p></div></div><div class="tabela-container inad-scroll-10"><table class="tabela inad-table"><thead><tr><th>Pedido / parcela</th><th>Cliente</th><th>Vencimento</th><th>Dias</th><th>Original</th><th>Recebido</th><th>Saldo</th><th>Situação</th></tr></thead><tbody id="inadLista"></tbody></table></div></section>
  <section id="inadExcedenteBox" class="form-card hidden">
    <div class="form-card-titulo"><div><h3>Tratar excedente do recebimento</h3><p>Classifique o valor que sobrou depois da baixa da parcela mais antiga.</p></div></div>
    <form id="formInadExcedente"><div class="form-grid form-grid-3">
      <div class="campo"><label for="inadExcedentePedido">Pedido</label><input id="inadExcedentePedido" disabled></div>
      <div class="campo"><label for="inadExcedenteTotal">Excedente pendente</label><input id="inadExcedenteTotal" disabled></div>
      <div class="campo"><label for="inadExcedenteSaldo">Principal ainda aberto</label><input id="inadExcedenteSaldo" disabled></div>
      <div class="campo"><label for="inadExcedenteJuros">Juros / acréscimos</label><input id="inadExcedenteJuros" type="number" min="0" step="0.01" value="0"></div>
      <div class="campo"><label for="inadExcedenteParcelas">Baixar próxima(s) parcela(s)</label><input id="inadExcedenteParcelas" type="number" min="0" step="0.01" value="0"><small>Aplicação FIFO somente após sua confirmação.</small></div>
      <div class="campo"><label for="inadExcedenteObs">Observação</label><input id="inadExcedenteObs" placeholder="Opcional"></div>
    </div>
    <div class="form-acoes"><button id="btnInadExcedenteTudoJuros" class="btn-secundario" type="button">Tudo juros</button><button id="btnInadExcedenteTudoParcelas" class="btn-secundario" type="button">Tudo parcelas</button><button id="btnInadExcedenteCancelar" class="btn-secundario" type="button">Cancelar</button><button class="btn-primario" type="submit">Confirmar tratamento</button></div>
    <p id="inadExcedenteMsg" class="mensagem-form"></p>
  </form></section>
  <section class="lista-card"><div class="lista-cabecalho"><div><h3>Recebimentos importados</h3><p id="inadRecebimentosResumo">—</p></div></div><div class="tabela-container inad-scroll-10"><table class="tabela"><thead><tr><th>Data</th><th>Pedido</th><th>Cliente</th><th>Valor recebido</th><th>Classificação</th><th>Alocação</th><th>Ações</th></tr></thead><tbody id="inadRecebimentosLista"></tbody></table></div></section>
`;main.appendChild(s);
  $("inadCompetencia").value=competenciaAtual();$("btnInadAtualizar")?.addEventListener("click",carregar);$("inadCompetencia")?.addEventListener("change",render);$("inadFiltro")?.addEventListener("change",render);$("inadBusca")?.addEventListener("input",render);
  $("formInadExcedente")?.addEventListener("submit",salvarTratamentoExcedente);$("btnInadExcedenteCancelar")?.addEventListener("click",fecharTratamentoExcedente);$("btnInadExcedenteTudoJuros")?.addEventListener("click",()=>preencherTratamento("juros"));$("btnInadExcedenteTudoParcelas")?.addEventListener("click",()=>preencherTratamento("parcelas"))
}


function saldoPrincipalVenda(v){
  return parcelasVenda(v).reduce((s,p)=>s+Math.max(0,n(p.valor)-n(p.valorRecebido)),0)
}
function aplicarAntecipacaoParcelas(parcelas,valor,data){
  let restante=Math.round(n(valor)*100)/100,alocacoes=[];
  if(restante<=0)return{parcelas,alocacoes,restante:0};
  const ord=[...parcelas].sort((a,b)=>String(a.vencimento||"9999-99-99").localeCompare(String(b.vencimento||"9999-99-99"))||n(a.ordem)-n(b.ordem));
  for(const p of ord){
    if(restante<=0.009)break;
    const saldo=Math.round(Math.max(0,n(p.valor)-n(p.valorRecebido))*100)/100;if(saldo<=0)continue;
    const usar=Math.round(Math.min(saldo,restante)*100)/100;
    p.valorRecebido=Math.round((n(p.valorRecebido)+usar)*100)/100;
    p.dataUltimoRecebimento=!p.dataUltimoRecebimento||data>p.dataUltimoRecebimento?data:p.dataUltimoRecebimento;
    restante=Math.round((restante-usar)*100)/100;
    alocacoes.push({parcelaId:p.id,ordem:p.ordem,vencimento:p.vencimento,valor:usar,tipo:"antecipacao"})
  }
  return{parcelas,alocacoes,restante}
}
function fecharTratamentoExcedente(){
  tratamentoId=null;$("formInadExcedente")?.reset();$("inadExcedenteBox")?.classList.add("hidden");msg($("inadExcedenteMsg"),"")
}
function abrirTratamentoExcedente(id){
  if(!podeEditar())return alert("Seu perfil não possui permissão para tratar excedentes.");
  const r=recebimentos.find(x=>x.id===id),v=r?vendas.find(x=>x.id===r.vendaId):null;if(!r||!v)return;
  const pend=n(r.valorPendenteClassificacao);if(pend<=0)return;
  tratamentoId=id;$("formInadExcedente")?.reset();$("inadExcedentePedido").value=r.pedido||v.documento||"";$("inadExcedenteTotal").value=moeda(pend);$("inadExcedenteSaldo").value=moeda(saldoPrincipalVenda(v));$("inadExcedenteJuros").value="0";$("inadExcedenteParcelas").value="0";$("inadExcedenteObs").value="";$("inadExcedenteBox").classList.remove("hidden");$("inadExcedenteBox").scrollIntoView({behavior:"smooth",block:"start"});msg($("inadExcedenteMsg"),"Classifique integralmente "+moeda(pend)+" entre juros/acréscimos e baixa das próximas parcelas.")
}
function preencherTratamento(tipo){
  const r=recebimentos.find(x=>x.id===tratamentoId),v=r?vendas.find(x=>x.id===r.vendaId):null;if(!r||!v)return;
  const pend=Math.round(n(r.valorPendenteClassificacao)*100)/100,saldo=Math.round(saldoPrincipalVenda(v)*100)/100;
  if(tipo==="juros"){$("inadExcedenteJuros").value=pend;$("inadExcedenteParcelas").value=0;msg($("inadExcedenteMsg"),"Todo o excedente será classificado como juros/acréscimos.")}
  else{const usar=Math.min(pend,saldo);$("inadExcedenteJuros").value=0;$("inadExcedenteParcelas").value=usar;msg($("inadExcedenteMsg"),usar<pend?"Há somente "+moeda(saldo)+" de principal em aberto. Classifique o restante de "+moeda(pend-usar)+" como juros/acréscimos.":"Todo o excedente será aplicado às próximas parcelas por FIFO.")}
}
async function salvarTratamentoExcedente(e){
  e.preventDefault();if(!podeEditar()||!tratamentoId)return;
  const local=recebimentos.find(x=>x.id===tratamentoId);if(!local)return;
  const juros=Math.round(n($("inadExcedenteJuros").value)*100)/100,antecipar=Math.round(n($("inadExcedenteParcelas").value)*100)/100;
  if(juros<0||antecipar<0)return msg($("inadExcedenteMsg"),"Os valores não podem ser negativos.");
  try{
    msg($("inadExcedenteMsg"),"Salvando tratamento...");
    await runTransaction(db,async tx=>{
      const rRef=doc(db,"recebimentosVendas",tratamentoId),vRef=doc(db,"vendas",local.vendaId),rSnap=await tx.get(rRef),vSnap=await tx.get(vRef);
      if(!rSnap.exists()||!vSnap.exists())throw new Error("registro-nao-encontrado");
      const r=rSnap.data(),v=vSnap.data(),pend=Math.round(n(r.valorPendenteClassificacao)*100)/100,totalTratado=Math.round((juros+antecipar)*100)/100;
      if(pend<=0)throw new Error("excedente-ja-tratado");
      if(Math.abs(totalTratado-pend)>0.009)throw new Error("classifique exatamente "+moeda(pend));
      const parcelas=parcelasVenda(v),ap=aplicarAntecipacaoParcelas(parcelas,antecipar,r.dataRecebimento||hoje());
      if(ap.restante>0.009)throw new Error("principal-insuficiente; restam "+moeda(ap.restante)+" para classificar como juros/acréscimos");
      const totalRec=Math.round(ap.parcelas.reduce((s,p)=>s+n(p.valorRecebido),0)*100)/100,base=v.baseComissao||"recebido",pct=n(v.comissaoPct),comBase=base==="venda"?n(v.valor):totalRec,comStatus=["aprovada","paga"].includes(String(v.comissaoStatus||""))?v.comissaoStatus:(totalRec>0?"provisionada":"aguardando_recebimento"),dataRec=!v.dataRecebimento||String(r.dataRecebimento||"")>String(v.dataRecebimento||"")?r.dataRecebimento:v.dataRecebimento;
      if(antecipar>0)tx.update(vRef,{parcelas:ap.parcelas,parcelasVersao:1,valorRecebido:totalRec,dataRecebimento:dataRec,statusFinanceiro:totalRec>=n(v.valor)-0.009?"recebido":"parcial",comissaoBaseValor:comBase,comissaoValor:comBase*pct/100,comissaoStatus:comStatus,atualizadoEm:serverTimestamp()});
      const novoPrincipal=Math.round((n(r.valorPrincipal)+antecipar)*100)/100,novoJuros=Math.round((n(r.valorAcrescimos)+juros)*100)/100,novoAntecipado=Math.round((n(r.valorAntecipado)+antecipar)*100)/100,alocacoes=[...(Array.isArray(r.alocacoes)?r.alocacoes:[]),...ap.alocacoes],tratamentos=[...(Array.isArray(r.tratamentos)?r.tratamentos:[]),{em:new Date().toISOString(),por:state.usuario?.id||"",jurosAcrescimos:juros,baixaParcelas:antecipar,alocacoes:ap.alocacoes,observacao:$("inadExcedenteObs").value.trim()}];
      const tipo=novoJuros>0&&novoAntecipado>0?"excedente_misto":novoJuros>0?"excedente_juros":novoAntecipado>0?"excedente_parcelas":r.tipoBaixa||"quitacao";
      tx.update(rRef,{valorPrincipal:novoPrincipal,valorAcrescimos:novoJuros,valorAntecipado:novoAntecipado,valorPendenteClassificacao:0,statusTratamento:"concluido",tipoBaixa:tipo,alocacoes,tratamentos,tratadoEm:serverTimestamp(),tratadoPor:state.usuario?.id||"",atualizadoEm:serverTimestamp()})
    });
    fecharTratamentoExcedente();await carregar();emitirAlteracao("vendas");emitirAlteracao("recebimentos")
  }catch(err){console.error("Tratamento de excedente:",err);msg($("inadExcedenteMsg"),String(err?.message||err).replace("FirebaseError: ",""))}
}

function calcular(){
  const ref=dataReferencia(),arr=todasParcelas().filter(({v})=>v.status!=="cancelada"),ativos=arr.filter(({v,p})=>saldoParcela(v,p,ref)>0),carteira=ativos.reduce((s,{v,p})=>s+saldoParcela(v,p,ref),0),vencidos=ativos.filter(({v,p})=>["1_30","31_60","61_90","90_mais"].includes(bucket(v,p,ref))),valorVencido=vencidos.reduce((s,{v,p})=>s+saldoParcela(v,p,ref),0),faixas={sem_vencimento:[],a_vencer:[],"1_30":[],"31_60":[],"61_90":[],"90_mais":[]};
  ativos.forEach(x=>{const b=bucket(x.v,x.p,ref);if(faixas[b])faixas[b].push(x)});
  const soma=k=>faixas[k].reduce((s,{v,p})=>s+saldoParcela(v,p,ref),0),recebidoRef=arr.reduce((s,{v,p})=>s+recebidoParcela(v,p,ref),0);
  return{carteira,valorVencido,faixas,soma,recebidoRef}
}
function renderRecebimentos(){
  const comp=$("inadCompetencia")?.value||competenciaAtual(),arr=recebimentos.filter(r=>String(r.dataRecebimento||"").slice(0,7)<=comp).sort((a,b)=>String(b.dataRecebimento||"").localeCompare(String(a.dataRecebimento||""))||String(b.importadoEm||"").localeCompare(String(a.importadoEm||"")));
  $("inadRecebimentosResumo").textContent=`${arr.length} recebimento(s) importado(s) até ${comp.split("-").reverse().join("/")}`;
  const tb=$("inadRecebimentosLista");if(!tb)return;if(!arr.length){tb.innerHTML='<tr><td colspan="5">Nenhum recebimento importado para a referência.</td></tr>';return}
  tb.innerHTML=arr.map(r=>{const al=(Array.isArray(r.alocacoes)?r.alocacoes:[]).map(a=>`${a.parcelaId} · ${moeda(n(a.valor))}`).join(" + "),principal=n(r.valorPrincipal||r.alocacoes?.reduce((s,a)=>s+n(a.valor),0)),acresc=n(r.valorAcrescimos);return`<tr><td>${dataBr(r.dataRecebimento)}</td><td><strong>${esc(r.pedido||"—")}</strong></td><td>${esc(r.clienteNome||r.cliente||"—")}</td><td><strong>${moeda(n(r.valor))}</strong><span class="inad-info">Principal ${moeda(principal)}${acresc>0?" · acréscimos "+moeda(acresc):""}</span></td><td>${esc(al||"—")}</td></tr>`}).join("")
}
function render(){
  criarPagina();const ref=dataReferencia(),c=calcular();$("inadDataRef").textContent=`Posição em ${dataBr(ref)}`;$("inadCarteira").textContent=moeda(c.carteira);$("inadVencido").textContent=moeda(c.valorVencido);$("inadIndice").textContent=pct(c.valorVencido,c.carteira);$("inadRecebidoRef").textContent=moeda(c.recebidoRef);
  [["sem_vencimento","ageSemVenc","ageSemVencQtd"],["a_vencer","ageAVencer","ageAVencerQtd"],["1_30","age130","age130Qtd"],["31_60","age3160","age3160Qtd"],["61_90","age6190","age6190Qtd"],["90_mais","age90","age90Qtd"]].forEach(([k,v,q])=>{$(v).textContent=moeda(c.soma(k));$(q).textContent=`${c.faixas[k].length} parcela(s)`});
  const arr=parcelasVisiveis().sort((a,b)=>String(a.p.vencimento||"9999-99-99").localeCompare(String(b.p.vencimento||"9999-99-99"))||String(a.v.documento||"").localeCompare(String(b.v.documento||""))||n(a.p.ordem)-n(b.p.ordem));$("inadResumoLista").textContent=`${arr.length} parcela(s) · referência ${dataBr(ref)}`;const tb=$("inadLista");if(!tb)return;if(!arr.length){tb.innerHTML='<tr><td colspan="8">Nenhuma parcela encontrada para os filtros selecionados.</td></tr>';renderRecebimentos();return}
  tb.innerHTML=arr.map(({v,p})=>{const b=bucket(v,p,ref),dias=["a_vencer","fora","sem_vencimento"].includes(b)?0:diffDias(p.vencimento,ref),cls=b==="90_mais"?"inad-linha-critica":["1_30","31_60","61_90"].includes(b)?"inad-linha-vencida":b==="sem_vencimento"?"inad-linha-sem-venc":"",st=statusParcela(v,p,ref),rec=recebidoParcela(v,p,ref);return`<tr class="${cls}"><td><strong>${esc(v.documento||"—")} · ${esc(p.id)}</strong><span class="inad-info">${dataBr(v.data)} · ${esc(v.vendedorNome||"—")}</span></td><td><strong>${esc(v.cliente||"—")}</strong><span class="inad-info">${esc(nomeEmpresa(v.empresaId))}</span></td><td>${p.vencimento?dataBr(p.vencimento):'<span class="status-pendente">Sem vencimento</span>'}</td><td>${dias?`${dias} d`:"—"}</td><td>${moeda(n(p.valor))}</td><td>${rec>0?moeda(rec):"—"}</td><td><strong>${moeda(saldoParcela(v,p,ref))}</strong></td><td><span class="${statusClasse(st)}">${statusNome(st)}</span><span class="inad-info">${b==="a_vencer"?"A vencer":b==="sem_vencimento"?"Definir vencimento":b==="fora"?"Liquidado":b.replace("_","–")}</span></td></tr>`}).join("");
  renderRecebimentos()
}

async function carregar(){
  if(carregando||!podeVer())return;carregando=true;const av=$("inadAviso");
  try{if(av)av.classList.add("hidden");const ids=selecionadas(),[vs,rs]=await Promise.all([listarDocumentos("vendas"),listarDocumentos("recebimentosVendas")]);vendas=vs.filter(v=>ids.has(v.empresaId));recebimentos=rs.filter(r=>ids.has(r.empresaId));render()}
  catch(e){console.error("Inadimplência:",e);vendas=[];recebimentos=[];render();if(av){av.classList.remove("hidden");av.textContent="Não foi possível carregar a carteira ou o histórico de recebimentos. Verifique as regras do Firebase."}}finally{carregando=false}
}

export async function abrir(){criarPagina();if(!podeVer())return alert("Seu perfil não possui permissão para acessar Inadimplência & Aging.");abrirPagina("ctrl-inadimplencia-v1");if($("tituloPagina"))$("tituloPagina").textContent="Inadimplência & Aging";await carregar()}

criarPagina();
window.addEventListener("sig:empresa-changed",()=>{if(pagina()&&!pagina().classList.contains("hidden"))carregar()});
window.addEventListener("sig:data-changed",e=>{if(["vendas","recebimentos"].includes(e.detail?.modulo)&&pagina()&&!pagina().classList.contains("hidden"))carregar()});
