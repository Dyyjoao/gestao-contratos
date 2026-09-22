import { abrirPagina, admin } from "./core.js";
import { $, esc, msg, permite, moeda, listarDocumentos, criarDocumento, atualizarDocumento, empresaUnicaSelecionadaId, empresasSelecionadasIds, nomeEmpresa, periodoAno, periodoChave, emitirAlteracao } from "./shared.js";
import { colaboradoresPorFuncao } from "./hr-role-registry.js?v=6";

const MESES=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const PERIODOS={total:[0,1,2,3,4,5,6,7,8,9,10,11],t1:[0,1,2],t2:[3,4,5],t3:[6,7,8],t4:[9,10,11]};
for(let i=0;i<12;i++)PERIODOS[`m${String(i+1).padStart(2,"0")}`]=[i];

let vendedoresRh=[],supervisoresRh=[],configs=[],vendas=[],itensComerciais=[],busy=false,editVendaId="",editItemId="",configAtual=null;
const n=v=>{const x=Number(v||0);return Number.isFinite(x)?x:0};
const pagina=()=>$("pagina-vendas");
const podeVer=()=>admin()||["visualizar","lancar","editar","vendedores","comissoes"].some(a=>permite("vendas",a));
const podeLancar=()=>admin()||permite("vendas","lancar");
const podeEditar=()=>admin()||permite("vendas","editar");
const podeConfig=()=>admin()||permite("vendas","vendedores")||permite("vendas","comissoes");
const podeComissoes=()=>admin()||permite("vendas","comissoes");
const indices=()=>PERIODOS[periodoChave()]||PERIODOS.total;
const hoje=()=>new Date().toISOString().slice(0,10);
const mesData=v=>Number(String(v||"").slice(5,7))-1;
const anoData=v=>Number(String(v||"").slice(0,4));
const valida=v=>v?.status!=="cancelada";
const recebido=v=>n(v?.valorRecebido??v?.valorFaturado);
const dataRecebimento=v=>v?.dataRecebimento||v?.dataFaturamento||"";
const comStatus=v=>v?.comissaoStatus==="aguardando_faturamento"?"aguardando_recebimento":(v?.comissaoStatus||"provisionada");

function css(){if($("sales-css"))return;const l=document.createElement("link");l.id="sales-css";l.rel="stylesheet";l.href="sales.css?v=16";document.head.appendChild(l)}
function pessoaCfg(p,tipo="vendedor"){
  const nome=String(p?.nome||"").trim().toLocaleLowerCase("pt-BR");
  return configs.find(c=>c.tipoComissao===tipo&&c.rhColaboradorId===p.id)||
    configs.find(c=>(!c.tipoComissao||c.tipoComissao===tipo)&&String(c.nome||"").trim().toLocaleLowerCase("pt-BR")===nome)||
    null;
}
function equipeVendedores(){return vendedoresRh.map(p=>({p,cfg:pessoaCfg(p,"vendedor")}))}
function equipeSupervisores(){return supervisoresRh.map(p=>({p,cfg:pessoaCfg(p,"supervisor")}))}
function cfgVenda(id){return configs.find(c=>c.id===id)}
function nomeVend(id,nome=""){return cfgVenda(id)?.nome||nome||"Vendedor não encontrado"}
let assinaturaPeriodoDatas="";
function isoData(a,m,d){return `${String(a).padStart(4,"0")}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`}
function limitesPeriodoPrincipal(){
  const ano=periodoAno(),meses=indices(),primeiro=Math.min(...meses),ultimo=Math.max(...meses);
  const ultimoDia=new Date(ano,ultimo+1,0).getDate();
  return{inicio:isoData(ano,primeiro+1,1),fim:isoData(ano,ultimo+1,ultimoDia)}
}
function sincronizarFiltroDatas(forcar=false){
  const ini=$("salesDataInicial"),fim=$("salesDataFinal");if(!ini||!fim)return;
  const lim=limitesPeriodoPrincipal(),assinatura=`${periodoAno()}|${periodoChave()}`;
  ini.min=lim.inicio;ini.max=lim.fim;fim.min=lim.inicio;fim.max=lim.fim;
  if(forcar||assinatura!==assinaturaPeriodoDatas){
    ini.value=lim.inicio;fim.value=lim.fim;assinaturaPeriodoDatas=assinatura
  }else{
    if(!ini.value||ini.value<lim.inicio||ini.value>lim.fim)ini.value=lim.inicio;
    if(!fim.value||fim.value<lim.inicio||fim.value>lim.fim)fim.value=lim.fim;
    if(ini.value>fim.value)fim.value=ini.value
  }
  const info=$("salesPeriodoDetalhe");
  if(info)info.textContent=`Disponível no período principal: ${formatData(lim.inicio)} a ${formatData(lim.fim)}`
}
function periodoInclui(data){const a=periodoAno(),idx=new Set(indices()),m=mesData(data);return anoData(data)===a&&idx.has(m)}
function filtroDataInclui(data){
  if(!periodoInclui(data))return false;
  const d=String(data||"").slice(0,10),ini=$("salesDataInicial")?.value||"",fim=$("salesDataFinal")?.value||"";
  return(!ini||d>=ini)&&(!fim||d<=fim)
}
function periodoVendas(){return vendas.filter(v=>filtroDataInclui(v.data))}
function periodoRecebimentos(){return vendas.filter(v=>valida(v)&&dataRecebimento(v)&&filtroDataInclui(dataRecebimento(v)))}
function fatorMetaMes(mes){
  const ano=periodoAno(),lim=limitesPeriodoPrincipal(),ini=$("salesDataInicial")?.value||lim.inicio,fim=$("salesDataFinal")?.value||lim.fim;
  if(!indices().includes(mes))return 0;
  const totalDias=new Date(ano,mes+1,0).getDate(),mesIni=isoData(ano,mes+1,1),mesFim=isoData(ano,mes+1,totalDias);
  const a=ini>mesIni?ini:mesIni,b=fim<mesFim?fim:mesFim;if(a>b)return 0;
  const dias=Math.floor((new Date(b+"T00:00:00")-new Date(a+"T00:00:00"))/86400000)+1;
  return dias/totalDias
}
function statusComLabel(s){return({aguardando_recebimento:"Aguardando recebimento",aguardando_faturamento:"Aguardando recebimento",provisionada:"Provisionada",aprovada:"Aprovada",paga:"Paga"})[s]||"Provisionada"}
function formatData(v){return v?String(v).slice(0,10).split("-").reverse().join("/"):"—"}
function resumoParcelas(v){
  const ps=Array.isArray(v?.parcelas)?v.parcelas.filter(p=>n(p.valor)>0):[];
  if(!ps.length)return"";
  const ord=[...ps].sort((a,b)=>String(a.vencimento||"").localeCompare(String(b.vencimento||""))||n(a.ordem)-n(b.ordem)),ini=ord[0]?.vencimento||"",fim=ord[ord.length-1]?.vencimento||"";
  return `${ps.length} parcela(s)${ini?" · "+formatData(ini):""}${fim&&fim!==ini?" → "+formatData(fim):""}`
}
function setText(id,v){if($(id))$(id).textContent=v}


function montar(){
  if(pagina())return;
  css();
  const main=document.querySelector("main.conteudo");if(!main)return;
  const s=document.createElement("section");s.id="pagina-vendas";s.className="pagina hidden";s.innerHTML=`
  <div class="pagina-cabecalho">
    <div><span class="eyebrow">COMERCIAL</span><h2>Vendas</h2><p>Visão comercial de vendas, evolução, vendedores e clientes.</p></div>
    <div class="acoes-cabecalho"><button id="btnSalesAtualizar" class="btn-secundario" type="button">Atualizar</button><button id="btnSalesVenda" class="btn-primario" type="button">+ Venda</button></div>
  </div>
  <div id="salesAviso" class="modulo-aviso hidden"></div>

  <section class="sales-periodo-detalhado">
    <div class="sales-periodo-detalhado-info">
      <strong>Filtro por data</strong>
      <small id="salesPeriodoDetalhe">Intervalo limitado pelo período principal.</small>
    </div>
    <label>De <input id="salesDataInicial" type="date"></label>
    <label>Até <input id="salesDataFinal" type="date"></label>
    <button id="btnSalesPeriodoLimpar" class="btn-secundario" type="button">Período completo</button>
  </section>

  <div class="kpi-grid sales-kpis">
    <div class="kpi-card"><span>Vendido no período</span><strong id="salesKpiVendas">—</strong><small>vendas válidas</small></div>
    <div class="kpi-card"><span>Quantidade de vendas</span><strong id="salesKpiQtd">—</strong><small>pedidos no período</small></div>
    <div class="kpi-card"><span>Ticket médio</span><strong id="salesKpiTicket">—</strong><small>por venda válida</small></div>
    <div class="kpi-card"><span>Clientes no período</span><strong id="salesKpiClientes">—</strong><small>clientes com vendas</small></div>
  </div>

  <section id="salesVendaBox" class="form-card hidden">
    <div class="form-card-titulo"><div><h3 id="salesVendaTitulo">Nova venda</h3><p>Registre aqui somente os dados da venda. Recebimentos e inadimplência são tratados no módulo financeiro.</p></div></div>
    <form id="formSalesVenda"><div class="form-grid form-grid-3">
      <div class="campo"><label for="salesEmpresa">Empresa</label><input id="salesEmpresa" disabled></div>
      <div class="campo"><label for="salesData">Data da venda</label><input id="salesData" type="date" required></div>
      <div class="campo"><label for="salesVendedor">Vendedor</label><select id="salesVendedor" required></select><small>Origem: RH · função Vendedor / Comercial.</small></div>
      <div class="campo campo-span-2"><label for="salesCliente">Cliente</label><input id="salesCliente" required></div>
      <div class="campo"><label for="salesDocumento">Pedido / NF / referência</label><input id="salesDocumento"></div>
      <div class="campo"><label for="salesValor">Valor da venda</label><input id="salesValor" type="number" min="0.01" step="0.01" required><small>Valor financeiro total do pedido/venda.</small></div>
      <div class="campo"><label for="salesStatus">Status da venda</label><select id="salesStatus"><option value="confirmada">Confirmada</option><option value="cancelada">Cancelada</option></select></div>
      <div class="campo campo-span-2"><label for="salesObs">Observação</label><input id="salesObs"></div>
    </div><div class="form-acoes"><button id="btnSalesVendaCancelar" class="btn-secundario" type="button">Cancelar</button><button class="btn-primario" type="submit">Salvar venda</button></div><p id="salesVendaMsg" class="mensagem-form"></p></form>
  </section>

  <div class="sales-grid">
    <section class="lista-card">
      <div class="lista-cabecalho sales-chart-head"><div><h3>Evolução mensal</h3><p id="salesContexto">—</p></div><select id="salesModoGrafico"><option value="valor">R$ · valores</option><option value="percentual">% · participação</option></select></div>
      <div id="salesChart" class="sales-chart"></div>
    </section>
    <section class="lista-card"><div class="lista-cabecalho sales-chart-head"><div><h3>Ranking comercial</h3><p>Participação dos vendedores nas vendas do período.</p></div><select id="salesModoRanking"><option value="valor">R$ · valores</option><option value="percentual">% · participação</option></select></div><div id="salesRanking" class="sales-ranking"></div></section>
  </div>

  <section class="lista-card sales-clientes">
    <div class="lista-cabecalho sales-clientes-head">
      <div><h3>Principais clientes</h3><p>Ranking por valor vendido no período selecionado.</p></div>
      <div class="sales-clientes-filtros">
        <select id="salesClientesOrdem">
          <option value="maior">Maior para menor</option>
          <option value="menor">Menor para maior</option>
          <option value="az">Nome A → Z</option>
          <option value="za">Nome Z → A</option>
        </select>
      </div>
    </div>
    <div id="salesClientesResumo" class="sales-clientes-resumo"></div>
    <div id="salesClientesGrafico" class="sales-clientes-grafico"></div>
    <div class="tabela-container sales-clientes-scroll"><table class="tabela"><thead><tr><th>#</th><th>Cliente</th><th>Vendas</th><th>Valor vendido</th><th>% do total</th></tr></thead><tbody id="salesClientesLista"></tbody></table></div>
  </section>

  <section class="lista-card">
    <div class="lista-cabecalho"><div><h3>Vendas registradas</h3><p id="salesResumo">—</p></div><div class="sales-filtros"><select id="salesFiltroVendedor"><option value="">Todos os vendedores</option></select><select id="salesFiltroStatus"><option value="">Todos os status</option><option value="confirmada">Confirmadas</option><option value="cancelada">Canceladas</option></select></div></div>
    <div class="tabela-container sales-history-scroll"><table class="tabela sales-table"><thead><tr><th>Data</th><th>Vendedor</th><th>Cliente / referência</th><th>Valor vendido</th><th>Status</th><th>Ações</th></tr></thead><tbody id="salesLista"></tbody></table></div>
  </section>`;
  main.appendChild(s);

  sincronizarFiltroDatas(true);
  ["salesDataInicial","salesDataFinal"].forEach(id=>$(id)?.addEventListener("change",()=>{sincronizarFiltroDatas(false);render()}));
  $("btnSalesPeriodoLimpar")?.addEventListener("click",()=>{sincronizarFiltroDatas(true);render()});
  $("btnSalesAtualizar")?.addEventListener("click",carregar);
  $("btnSalesVenda")?.addEventListener("click",()=>abrirVenda());
  $("btnSalesVendaCancelar")?.addEventListener("click",fecharVenda);
  $("formSalesVenda")?.addEventListener("submit",salvarVenda);
  $("salesFiltroVendedor")?.addEventListener("change",render);
  $("salesFiltroStatus")?.addEventListener("change",render);
  $("salesModoGrafico")?.addEventListener("change",render);
  $("salesModoRanking")?.addEventListener("change",render);
  $("salesClientesOrdem")?.addEventListener("change",render);
}

function contextoUnico(){const emp=empresaUnicaSelecionadaId();if(!emp){alert("Para cadastrar ou editar, selecione uma única empresa no cabeçalho.");return""}return emp}
function esconderBotoes(){$("btnSalesVenda")?.classList.toggle("hidden",!podeLancar())}
function fecharVenda(){editVendaId="";$("formSalesVenda")?.reset();$("salesVendaBox")?.classList.add("hidden");msg($("salesVendaMsg"),"")}
function fecharConfig(){configAtual=null;$("formSalesConfig")?.reset();$("salesConfigBox")?.classList.add("hidden");msg($("salesCfgMsg"),"")}
function fecharItem(){editItemId="";$("formSalesItem")?.reset();$("salesItemBox")?.classList.add("hidden");msg($("salesItemMsg"),"")}
function abrirItem(item=null){
  if(!(podeEditar()||podeLancar()))return alert("Seu perfil não pode manter a base de itens.");
  const emp=contextoUnico();if(!emp)return;
  editItemId=item?.id||"";$("formSalesItem")?.reset();$("salesItemTitulo").textContent=item?"Editar item comercial":"Novo item comercial";
  $("salesItemCodigo").value=item?.codigo||"";$("salesItemNome").value=item?.nome||"";$("salesItemCategoria").value=item?.categoria||"";$("salesItemUnidade").value=item?.unidade||"";$("salesItemStatus").value=item?.status||"ativo";
  $("salesItemBox").classList.remove("hidden");$("salesItemBox").scrollIntoView({behavior:"smooth",block:"start"});
}
async function salvarItem(e){
  e.preventDefault();const emp=contextoUnico();if(!emp)return;
  if(!(podeEditar()||podeLancar()))return;
  const d={codigo:$("salesItemCodigo").value.trim(),nome:$("salesItemNome").value.trim(),categoria:$("salesItemCategoria").value.trim(),unidade:$("salesItemUnidade").value.trim().toUpperCase(),status:$("salesItemStatus").value};
  if(!d.nome)return msg($("salesItemMsg"),"Informe a descrição do item.");
  try{msg($("salesItemMsg"),"Salvando...");if(editItemId)await atualizarDocumento("itensComerciais",editItemId,d);else await criarDocumento("itensComerciais",{...d,empresaId:emp});fecharItem();await carregar();emitirAlteracao("vendas")}
  catch(err){console.error(err);msg($("salesItemMsg"),"Não foi possível salvar o item.")}
}
function opcoesItens(valor=""){
  const ativos=itensComerciais.filter(x=>x.status!=="inativo").sort((a,b)=>String(a.nome||"").localeCompare(String(b.nome||""),"pt-BR"));
  return '<option value="">Selecione...</option>'+ativos.map(x=>`<option value="${esc(x.id)}" ${x.id===valor?"selected":""}>${esc(x.codigo?x.codigo+" · ":"")}${esc(x.nome||"")}</option>`).join("");
}
function atualizarTotalVenda(){
  const total=[...document.querySelectorAll("#salesItensVendaLista tr")].reduce((s,tr)=>s+n(tr.querySelector("[data-item-total]")?.dataset.valor),0);
  if($("salesValor"))$("salesValor").value=total?total.toFixed(2):"";
}
function recalcularLinhaItem(tr){
  if(!tr)return;const sel=tr.querySelector("[data-item-id]"),q=tr.querySelector("[data-item-qtd]"),vu=tr.querySelector("[data-item-vu]"),total=tr.querySelector("[data-item-total]"),item=itensComerciais.find(x=>x.id===sel?.value),valor=n(q?.value)*n(vu?.value);
  const un=tr.querySelector("[data-item-un]");if(un)un.textContent=item?.unidade||"—";if(total){total.dataset.valor=String(valor);total.textContent=moeda(valor)}atualizarTotalVenda();
}
function adicionarLinhaItem(dado={}){
  const tb=$("salesItensVendaLista");if(!tb)return;
  const tr=document.createElement("tr");tr.innerHTML=`<td><select data-item-id>${opcoesItens(dado.itemId||"")}</select></td><td><input data-item-qtd type="number" min="0.0001" step="0.0001" value="${n(dado.quantidade)||1}"></td><td data-item-un>${esc(dado.unidade||"—")}</td><td><input data-item-vu type="number" min="0" step="0.01" value="${n(dado.valorUnitario)||""}"></td><td data-item-total data-valor="${n(dado.valorTotal)}">${moeda(n(dado.valorTotal))}</td><td><button data-item-remover class="btn-acao" type="button">Remover</button></td>`;
  tb.appendChild(tr);tr.querySelector("[data-item-id]").onchange=()=>recalcularLinhaItem(tr);tr.querySelector("[data-item-qtd]").oninput=()=>recalcularLinhaItem(tr);tr.querySelector("[data-item-vu]").oninput=()=>recalcularLinhaItem(tr);tr.querySelector("[data-item-remover]").onclick=()=>{tr.remove();atualizarTotalVenda()};recalcularLinhaItem(tr);
}
function itensVendaForm(){
  return [...document.querySelectorAll("#salesItensVendaLista tr")].map(tr=>{const itemId=tr.querySelector("[data-item-id]")?.value||"",item=itensComerciais.find(x=>x.id===itemId),quantidade=n(tr.querySelector("[data-item-qtd]")?.value),valorUnitario=n(tr.querySelector("[data-item-vu]")?.value);return{itemId,codigo:item?.codigo||"",nome:item?.nome||"",categoria:item?.categoria||"",unidade:item?.unidade||"",quantidade,valorUnitario,valorTotal:quantidade*valorUnitario}}).filter(x=>x.itemId&&x.quantidade>0);
}
function renderItensCadastro(){
  const tb=$("salesItensCadastroLista");if(!tb)return;const termo=String($("salesBuscaItem")?.value||"").trim().toLocaleLowerCase("pt-BR"),arr=itensComerciais.filter(x=>[x.codigo,x.nome,x.categoria].some(v=>String(v||"").toLocaleLowerCase("pt-BR").includes(termo))).sort((a,b)=>String(a.nome||"").localeCompare(String(b.nome||""),"pt-BR"));
  tb.innerHTML=arr.length?arr.map(x=>`<tr><td>${esc(x.codigo||"—")}</td><td><strong>${esc(x.nome||"—")}</strong></td><td>${esc(x.categoria||"—")}</td><td>${esc(x.unidade||"—")}</td><td>${x.status==="inativo"?'<span class="status-inativo">Inativo</span>':'<span class="status-ativo">Ativo</span>'}</td><td>${(podeEditar()||podeLancar())?`<button class="btn-acao" data-sales-item-edit="${x.id}" type="button">Editar</button>`:"—"}</td></tr>`).join(""):'<tr><td colspan="6">Nenhum item comercial cadastrado.</td></tr>';
  document.querySelectorAll("[data-sales-item-edit]").forEach(b=>b.onclick=()=>abrirItem(itensComerciais.find(x=>x.id===b.dataset.salesItemEdit)));
}

function abrirConfig(p,tipo){
  if(tipo==="supervisor")return alert("A comissão da supervisão está congelada por enquanto.");
  if(!podeConfig())return alert("Seu perfil não pode alterar metas e comissões.");
  const emp=contextoUnico();if(!emp||p.empresaId!==emp)return;
  const cfg=pessoaCfg(p,tipo);
  configAtual={p,tipo,cfg};
  $("formSalesConfig")?.reset();
  $("salesCfgNome").value=p.nome||"";
  $("salesCfgFuncao").value=tipo==="supervisor"?"Supervisão comercial":"Vendedor / Comercial";
  $("salesCfgMeta").value=tipo==="vendedor"?(n(cfg?.metaMensal)||""):"";
  $("salesCfgMeta").disabled=tipo==="supervisor";
  $("salesCfgPct").value=n(cfg?.comissaoPct)||"";
  $("salesCfgBase").value=tipo==="supervisor"?"Valor vendido no período":"Valor recebido";
  $("salesCfgBaseAjuda").textContent=tipo==="supervisor"?"A comissão é calculada sobre o total vendido no período filtrado.":"A comissão só nasce sobre o que foi efetivamente recebido.";
  $("salesConfigBox").classList.remove("hidden");
  $("salesConfigBox").scrollIntoView({behavior:"smooth",block:"start"});
}
async function salvarConfig(e){
  e.preventDefault();if(!configAtual||!podeConfig())return;
  const {p,tipo,cfg}=configAtual,emp=contextoUnico();if(!emp)return;
  const pct=n($("salesCfgPct").value),meta=tipo==="vendedor"?n($("salesCfgMeta").value):0;
  if(pct<0||pct>100)return msg($("salesCfgMsg"),"Percentual inválido.");
  const d={rhColaboradorId:p.id,nome:p.nome||"",email:p.email||"",cargoNome:p.cargoNome||"",tipoComissao:tipo,metaMensal:meta,comissaoPct:pct,baseComissao:tipo==="supervisor"?"venda":"recebido",status:"ativo"};
  try{
    msg($("salesCfgMsg"),"Salvando...");
    if(cfg)await atualizarDocumento("vendedores",cfg.id,d);else await criarDocumento("vendedores",{...d,empresaId:emp});
    fecharConfig();await carregar();emitirAlteracao("vendas");
  }catch(err){console.error(err);msg($("salesCfgMsg"),"Não foi possível salvar a configuração.")}
}


function preencherVendedores(){
  const sel=$("salesVendedor"),f=$("salesFiltroVendedor"),eq=equipeVendedores().sort((a,b)=>String(a.p.nome||"").localeCompare(String(b.p.nome||""),"pt-BR"));
  if(sel)sel.innerHTML='<option value="">Selecione...</option>'+eq.map(({p,cfg})=>`<option value="${cfg?.id||""}" ${cfg?"":"disabled"}>${esc(p.nome)}${cfg?"":" · cadastro comercial pendente"}</option>`).join("");
  if(f){
    const atual=f.value,mapa=new Map();
    vendas.forEach(v=>{if(v.vendedorId)mapa.set(v.vendedorId,v.vendedorNome||nomeVend(v.vendedorId))});
    eq.filter(x=>x.cfg).forEach(({p,cfg})=>mapa.set(cfg.id,p.nome));
    f.innerHTML='<option value="">Todos os vendedores</option>'+[...mapa.entries()].sort((a,b)=>String(a[1]||"").localeCompare(String(b[1]||""),"pt-BR")).map(([id,nome])=>`<option value="${esc(id)}">${esc(nome)}</option>`).join("");
    if([...f.options].some(o=>o.value===atual))f.value=atual
  }
}


function abrirVenda(v=null){
  if(!(v?podeEditar():podeLancar()))return alert("Seu perfil não possui permissão para esta ação.");
  const emp=contextoUnico();if(!emp)return;
  editVendaId=v?.id||"";$("formSalesVenda")?.reset();$("salesVendaTitulo").textContent=v?"Editar venda":"Nova venda";$("salesEmpresa").value=nomeEmpresa(emp);
  $("salesData").value=v?.data||hoje();$("salesVendedor").value=v?.vendedorId||"";$("salesCliente").value=v?.cliente||"";$("salesDocumento").value=v?.documento||"";
  $("salesStatus").value=v?.status||"confirmada";$("salesObs").value=v?.observacao||"";$("salesValor").value=v?n(v.valor):"";
  $("salesVendaBox").classList.remove("hidden");$("salesVendaBox").scrollIntoView({behavior:"smooth",block:"start"});
}


async function salvarVenda(e){
  e.preventDefault();const nova=!editVendaId;if(nova&&!podeLancar())return;if(!nova&&!podeEditar())return;
  const emp=contextoUnico();if(!emp)return;const cfg=cfgVenda($("salesVendedor").value);if(!cfg)return msg($("salesVendaMsg"),"Selecione um vendedor disponível para lançamento.");
  const atual=nova?null:vendas.find(x=>x.id===editVendaId);if(!nova&&(!atual||atual.empresaId!==emp))return msg($("salesVendaMsg"),"Venda não localizada para a empresa selecionada.");
  const valor=n($("salesValor").value),valorRec=nova?0:recebido(atual),dataRec=nova?null:dataRecebimento(atual),pct=n(nova?cfg.comissaoPct:atual?.comissaoPct??cfg.comissaoPct),st=nova?"aguardando_recebimento":comStatus(atual);
  if(valor<=0)return msg($("salesVendaMsg"),"O valor da venda deve ser maior que zero.");
  if(valorRec>valor)return msg($("salesVendaMsg"),"O valor da venda não pode ficar abaixo do valor já recebido no financeiro.");
  const d={data:$("salesData").value,dataRecebimento:dataRec||null,valorRecebido:valorRec,vendedorId:cfg.id,vendedorRhId:cfg.rhColaboradorId||"",vendedorNome:cfg.nome||"",cliente:$("salesCliente").value.trim(),documento:$("salesDocumento").value.trim(),descricao:"",itens:[],valor,baseComissao:atual?.baseComissao||cfg.baseComissao||"recebido",comissaoPct:pct,comissaoBaseValor:valorRec,comissaoValor:valorRec*pct/100,comissaoStatus:st,status:$("salesStatus").value,observacao:$("salesObs").value.trim()};
  try{msg($("salesVendaMsg"),"Salvando...");if(editVendaId)await atualizarDocumento("vendas",editVendaId,d);else await criarDocumento("vendas",{...d,empresaId:emp});fecharVenda();await carregar();emitirAlteracao("vendas")}
  catch(err){console.error(err);msg($("salesVendaMsg"),"Não foi possível salvar a venda.")}
}

async function cancelarVenda(id){if(!podeEditar())return;const v=vendas.find(x=>x.id===id);if(!v||v.status==="cancelada"||!confirm("Cancelar esta venda? O histórico será preservado e ela deixará de compor os totais de vendas."))return;try{await atualizarDocumento("vendas",id,{status:"cancelada"});await carregar();emitirAlteracao("vendas")}catch(e){console.error(e);alert("Não foi possível cancelar a venda.")}}


function chart(vendidos){
  const el=$("salesChart");if(!el)return;const modo=$("salesModoGrafico")?.value||"valor",totalAno=vendidos.reduce((s,v)=>s+n(v),0);
  const a=modo==="percentual"?vendidos.map(v=>totalAno?v/totalAno*100:0):vendidos;
  const leg=modo==="percentual"?"Participação nas vendas do ano":"Valor vendido";
  const max=Math.max(1,...a),w=900,h=265,p=34,x=i=>p+i*((w-p*2)/11),y=v=>h-p-n(v)/max*(h-p*2),path=arr=>arr.map((v,i)=>`${x(i)},${y(v)}`).join(" "),fmt=v=>modo==="percentual"?`${n(v).toLocaleString("pt-BR",{maximumFractionDigits:1})}%`:moeda(v).replace(",00","");
  el.innerHTML=`<div class="sales-legend"><span><i></i>${leg}</span></div><svg viewBox="0 0 ${w} ${h}"><line x1="${p}" y1="${h-p}" x2="${w-p}" y2="${h-p}" class="sales-axis-line"/><polyline class="sales-line" points="${path(a)}"/>${MESES.map((m,i)=>`<text x="${x(i)}" y="${h-8}" text-anchor="middle">${m}</text>`).join("")}${a.map((v,i)=>v>0?`<text class="sales-value-label" x="${x(i)}" y="${Math.max(10,y(v)-8)}" text-anchor="middle">${fmt(v)}</text>`:"").join("")}</svg>`;
}


function renderClientes(validas){
  const ordem=$("salesClientesOrdem")?.value||"maior",mapa=new Map();
  validas.forEach(v=>{
    const nome=String(v.cliente||"Cliente não informado").trim()||"Cliente não informado",chave=String(v.clienteId||nome.toLocaleLowerCase("pt-BR"));
    const z=mapa.get(chave)||{nome,vendido:0,qtd:0};z.vendido+=n(v.valor);z.qtd++;mapa.set(chave,z)
  });
  let itens=[...mapa.values()];
  if(ordem==="maior")itens.sort((a,b)=>b.vendido-a.vendido||a.nome.localeCompare(b.nome,"pt-BR"));
  else if(ordem==="menor")itens.sort((a,b)=>a.vendido-b.vendido||a.nome.localeCompare(b.nome,"pt-BR"));
  else if(ordem==="az")itens.sort((a,b)=>a.nome.localeCompare(b.nome,"pt-BR"));
  else itens.sort((a,b)=>b.nome.localeCompare(a.nome,"pt-BR"));
  const total=itens.reduce((s,x)=>s+x.vendido,0),max=Math.max(1,...itens.map(x=>x.vendido)),top=itens.slice(0,12);
  const resumo=$("salesClientesResumo");if(resumo)resumo.innerHTML=`<span><strong>${itens.length}</strong> cliente(s)</span><span>Total vendido: <strong>${moeda(total)}</strong></span>`;
  const graf=$("salesClientesGrafico");if(graf)graf.innerHTML=top.length?top.map((x,i)=>`<div class="sales-cliente-bar"><span class="sales-cliente-pos">${i+1}</span><strong title="${esc(x.nome)}">${esc(x.nome)}</strong><i><b style="width:${Math.max(2,x.vendido/max*100)}%"></b></i><em>${moeda(x.vendido)}</em><small>${total?(x.vendido/total*100).toLocaleString("pt-BR",{maximumFractionDigits:1}):0}%</small></div>`).join(""):'<div class="empty-state">Sem clientes no período.</div>';
  const tb=$("salesClientesLista");if(tb)tb.innerHTML=itens.length?itens.map((x,i)=>`<tr><td>${i+1}</td><td><strong>${esc(x.nome)}</strong></td><td>${x.qtd}</td><td>${moeda(x.vendido)}</td><td>${total?(x.vendido/total*100).toLocaleString("pt-BR",{maximumFractionDigits:1}):0}%</td></tr>`).join(""):'<tr><td colspan="5">Nenhum cliente no período selecionado.</td></tr>'
}

function renderAbc(validas){
  const mapa=new Map();
  validas.forEach(v=>{
    const itens=Array.isArray(v.itens)&&v.itens.length?v.itens:[{nome:v.descricao||"Sem material informado",valorTotal:n(v.valor)}];
    itens.forEach(item=>{const nome=String(item.nome||"Sem material informado").trim()||"Sem material informado",k=(item.itemId||nome).toLocaleLowerCase("pt-BR"),z=mapa.get(k)||{nome,valor:0};z.valor+=n(item.valorTotal);mapa.set(k,z)});
  });
  const itens=[...mapa.values()].sort((a,b)=>b.valor-a.valor),total=itens.reduce((s,x)=>s+x.valor,0);let ac=0;
  itens.forEach(x=>{const pct=total?x.valor/total*100:0;ac+=pct;x.pct=pct;x.ac=ac;x.classe=ac<=80?"A":ac<=95?"B":"C"});
  const tb=$("salesAbcLista");if(tb)tb.innerHTML=itens.length?itens.map(x=>`<tr><td><span class="sales-abc-badge ${x.classe.toLowerCase()}">${x.classe}</span></td><td><strong>${esc(x.nome)}</strong></td><td>${moeda(x.valor)}</td><td>${x.pct.toLocaleString("pt-BR",{maximumFractionDigits:1})}%</td><td>${x.ac.toLocaleString("pt-BR",{maximumFractionDigits:1})}%</td><td><div class="sales-abc-bar"><i style="width:${Math.max(2,x.pct)}%"></i></div></td></tr>`).join(""):'<tr><td colspan="6">Sem materiais vendidos no período.</td></tr>';
  const r=$("salesAbcResumo");if(r){const a=itens.filter(x=>x.classe==="A"),av=a.reduce((s,x)=>s+x.valor,0);r.innerHTML=`<span><strong>${itens.length}</strong> item(ns) vendido(s)</span><span>Classe A: <strong>${a.length}</strong> item(ns) · <strong>${(total?av/total*100:0).toLocaleString("pt-BR",{maximumFractionDigits:1})}%</strong> do valor</span><span>Total: <strong>${moeda(total)}</strong></span>`}
}

function renderEquipe(){
  const tb=$("salesEquipeLista");if(!tb)return;
  const vendedores=equipeVendedores(),pendentes=vendedores.filter(x=>!x.cfg).length,pend=$("salesEquipePendentes");
  if(pend){pend.textContent=pendentes?pendentes+" vendedor(es) pendente(s) de configuração":"Todos os vendedores configurados";pend.classList.toggle("status-ativo",!pendentes);pend.classList.toggle("status-inativo",!!pendentes)}
  const linhas=[...vendedores.map(x=>({...x,tipo:"vendedor",funcao:"Vendedor / Comercial"})),...equipeSupervisores().map(x=>({...x,tipo:"supervisor",funcao:"Supervisão comercial"}))].sort((a,b)=>String(a.p.nome||"").localeCompare(String(b.p.nome||""),"pt-BR"));
  tb.innerHTML=linhas.length?linhas.map(({p,cfg,tipo,funcao})=>`<tr><td><strong>${esc(p.nome||"—")}</strong><small>${esc(p.cargoNome||"")}</small></td><td>${funcao}</td><td>${tipo==="vendedor"?moeda(n(cfg?.metaMensal)):"—"}</td><td>${tipo==="supervisor"?'<span class="sales-frozen">Congelada</span>':(cfg?n(cfg.comissaoPct).toLocaleString("pt-BR",{maximumFractionDigits:3})+"%":'<span class="status-inativo">Não configurada</span>')}</td><td>${tipo==="supervisor"?"Regra suspensa":"Valor recebido"}</td><td>${tipo==="vendedor"?(podeConfig()?`<button class="btn-acao" data-sales-config="${p.id}" data-sales-tipo="vendedor" type="button">${cfg?"Configurar":"Configurar comissão"}</button>`:`<button class="btn-acao" type="button" disabled title="Seu perfil precisa da permissão Vendedores ou Comissões">Configurar comissão</button>`):"—"}</td></tr>`).join(""):'<tr><td colspan="6">Nenhum vendedor ou supervisor ativo no RH com função SIG vinculada.</td></tr>';
  document.querySelectorAll("[data-sales-config]").forEach(b=>b.onclick=()=>{const p=vendedoresRh.find(x=>x.id===b.dataset.salesConfig);if(p)abrirConfig(p,"vendedor")});
}


function render(){
  if(!pagina())return;
  sincronizarFiltroDatas(false);
  const ano=periodoAno(),per=periodoVendas(),valid=per.filter(valida),total=valid.reduce((s,v)=>s+n(v.valor),0),q=valid.length;
  const clientes=new Set(valid.map(v=>String(v.clienteId||v.cliente||"").trim().toLocaleLowerCase("pt-BR")).filter(Boolean));
  setText("salesKpiVendas",moeda(total));setText("salesKpiQtd",q.toLocaleString("pt-BR"));setText("salesKpiTicket",moeda(q?total/q:0));setText("salesKpiClientes",clientes.size.toLocaleString("pt-BR"));
  setText("salesContexto",`${empresasSelecionadasIds().length>1?"Empresas consolidadas":"Empresa selecionada"} · Ano ${ano}`);

  const vals=Array(12).fill(0);
  vendas.filter(v=>valida(v)&&anoData(v.data)===ano).forEach(v=>{const m=mesData(v.data);if(m>=0)vals[m]+=n(v.valor)});
  chart(vals);

  const modoRanking=$("salesModoRanking")?.value||"valor",mapa=new Map();
  valid.forEach(v=>{const chave=String(v.vendedorId||v.vendedorNome||"sem-vendedor"),r=mapa.get(chave)||{id:v.vendedorId||"",nome:v.vendedorNome||nomeVend(v.vendedorId),tot:0,qtd:0};r.tot+=n(v.valor);r.qtd++;mapa.set(chave,r)});
  const rank=[...mapa.values()].map(r=>({...r,pct:total?r.tot/total*100:0})).sort((a,b)=>b.tot-a.tot);
  const rb=$("salesRanking");if(rb)rb.innerHTML=rank.length?`
    <div class="sales-rank-head"><span>#</span><span>Vendedor</span><span>${modoRanking==="percentual"?"% do total vendido":"Valor vendido"}</span></div>
    ${rank.map((r,i)=>`<div class="sales-rank-row"><b>${i+1}</b><span class="sales-rank-vendedor"><strong>${esc(r.nome)}</strong><small>${r.qtd} venda(s)</small></span>${modoRanking==="percentual"?`<span class="sales-rank-share"><strong>${r.pct.toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1})}%</strong><i><b style="width:${Math.max(0,Math.min(100,r.pct))}%"></b></i></span>`:`<strong class="sales-rank-valor">${moeda(r.tot)}</strong>`}</div>`).join("")}
  `:'<div class="empty-state">Sem vendas no período selecionado.</div>';

  renderClientes(valid);

  const filtroVend=$("salesFiltroVendedor")?.value||"",filtroSt=$("salesFiltroStatus")?.value||"",lista=per.filter(v=>(!filtroVend||v.vendedorId===filtroVend)&&(!filtroSt||v.status===filtroSt)).sort((a,b)=>String(b.data||"").localeCompare(String(a.data||""))),tb=$("salesLista");
  setText("salesResumo",`${lista.length} venda(s) no período selecionado`);
  if(tb)tb.innerHTML=lista.length?lista.map(v=>`<tr class="${v.status==="cancelada"?"sales-cancelada":""}"><td><strong>${formatData(v.data)}</strong></td><td>${esc(v.vendedorNome||nomeVend(v.vendedorId))}</td><td><strong>${esc(v.cliente||"—")}</strong><small>Pedido ${esc(v.documento||"—")}</small>${resumoParcelas(v)?`<small>${esc(resumoParcelas(v))}</small>`:""}</td><td><strong>${moeda(v.valor)}</strong></td><td><span class="${v.status==="cancelada"?"status-inativo":"status-ativo"}">${v.status==="cancelada"?"Cancelada":"Confirmada"}</span></td><td><div class="acoes-tabela">${podeEditar()?`<button class="btn-acao" data-sales-edit="${v.id}" type="button">Editar</button>`:""}${podeEditar()&&v.status!=="cancelada"?`<button class="btn-acao" data-sales-cancela="${v.id}" type="button">Cancelar</button>`:""}</div></td></tr>`).join(""):'<tr><td colspan="6">Nenhuma venda no período.</td></tr>';
  document.querySelectorAll("[data-sales-edit]").forEach(b=>b.onclick=()=>abrirVenda(vendas.find(v=>v.id===b.dataset.salesEdit)));document.querySelectorAll("[data-sales-cancela]").forEach(b=>b.onclick=()=>cancelarVenda(b.dataset.salesCancela));
}


async function carregar(){
  if(busy||!podeVer())return;busy=true;
  try{
    const [vr,cfg,vs]=await Promise.all([colaboradoresPorFuncao("VENDEDOR"),listarDocumentos("vendedores"),listarDocumentos("vendas")]);
    vendedoresRh=vr;configs=cfg;vendas=vs;preencherVendedores();render();esconderBotoes();$("salesAviso")?.classList.add("hidden");
  }catch(e){console.error("Vendas:",e);const a=$("salesAviso");if(a){a.textContent="Não foi possível carregar Vendas. Verifique permissões, RH e Firestore Rules.";a.classList.remove("hidden")}}finally{busy=false}
}

export async function abrir(){if(!podeVer())return alert("Seu perfil não possui acesso a Vendas.");montar();abrirPagina("vendas");$("menuVendas")?.classList.add("ativo");esconderBotoes();await carregar()}
montar();
window.addEventListener("sig:empresa-changed",()=>{if(pagina()&&!pagina().classList.contains("hidden"))carregar()});
window.addEventListener("sig:periodo-changed",()=>{if(pagina()&&!pagina().classList.contains("hidden")){sincronizarFiltroDatas(true);render()}});
window.addEventListener("sig:data-changed",e=>{if(["vendas","rh"].includes(e.detail?.modulo)&&pagina()&&!pagina().classList.contains("hidden"))carregar()});
