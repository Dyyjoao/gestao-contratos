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

function css(){if($("sales-css"))return;const l=document.createElement("link");l.id="sales-css";l.rel="stylesheet";l.href="sales.css?v=3";document.head.appendChild(l)}
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
function periodoInclui(data){const a=periodoAno(),idx=new Set(indices()),m=mesData(data);return anoData(data)===a&&idx.has(m)}
function periodoVendas(){return vendas.filter(v=>periodoInclui(v.data))}
function periodoRecebimentos(){return vendas.filter(v=>valida(v)&&dataRecebimento(v)&&periodoInclui(dataRecebimento(v)))}
function statusComLabel(s){return({aguardando_recebimento:"Aguardando recebimento",aguardando_faturamento:"Aguardando recebimento",provisionada:"Provisionada",aprovada:"Aprovada",paga:"Paga"})[s]||"Provisionada"}
function formatData(v){return v?String(v).slice(0,10).split("-").reverse().join("/"):"—"}
function setText(id,v){if($(id))$(id).textContent=v}

function montar(){
  if(pagina())return;
  css();
  const main=document.querySelector("main.conteudo");if(!main)return;
  const s=document.createElement("section");s.id="pagina-vendas";s.className="pagina hidden";s.innerHTML=`
  <div class="pagina-cabecalho">
    <div><span class="eyebrow">COMERCIAL</span><h2>Vendas & Comissões</h2><p>Vendas, recebimentos, metas, comissões e curva ABC por valor vendido.</p></div>
    <div class="acoes-cabecalho"><button id="btnSalesAtualizar" class="btn-secundario" type="button">Atualizar</button><button id="btnSalesItem" class="btn-secundario" type="button">+ Item</button><button id="btnSalesVenda" class="btn-primario" type="button">+ Venda</button></div>
  </div>
  <div id="salesAviso" class="modulo-aviso hidden"></div>

  <div class="kpi-grid sales-kpis">
    <div class="kpi-card"><span>Vendido no período</span><strong id="salesKpiVendas">—</strong><small id="salesKpiQtd">—</small></div>
    <div class="kpi-card"><span>Recebido no período</span><strong id="salesKpiRecebido">—</strong><small id="salesKpiRecQtd">—</small></div>
    <div class="kpi-card"><span>A receber</span><strong id="salesKpiAberto">—</strong><small>vendas válidas do período</small></div>
    <div class="kpi-card"><span>Meta</span><strong id="salesKpiMeta">—</strong><small>equipe comercial RH</small></div>
    <div class="kpi-card"><span>Atingimento</span><strong id="salesKpiAting">—</strong><small id="salesKpiAtingSub">—</small></div>
    <div class="kpi-card"><span>Ticket médio</span><strong id="salesKpiTicket">—</strong><small>por venda válida</small></div>
    <div class="kpi-card"><span>Comissão vendedores</span><strong id="salesKpiComissao">—</strong><small>sobre valores recebidos</small></div>
    <div class="kpi-card"><span>Comissão supervisão</span><strong id="salesKpiSupervisor">Congelada</strong><small>cálculo temporariamente suspenso</small></div>
  </div>

  <section id="salesConfigBox" class="form-card hidden">
    <div class="form-card-titulo"><div><h3>Configuração comercial</h3><p>O colaborador vem do RH. Aqui ficam apenas meta e percentual de comissão.</p></div></div>
    <form id="formSalesConfig">
      <div class="form-grid form-grid-3">
        <div class="campo"><label for="salesCfgNome">Colaborador</label><input id="salesCfgNome" disabled></div>
        <div class="campo"><label for="salesCfgFuncao">Função SIG</label><input id="salesCfgFuncao" disabled></div>
        <div class="campo"><label for="salesCfgMeta">Meta mensal</label><input id="salesCfgMeta" type="number" min="0" step="0.01"></div>
        <div class="campo"><label for="salesCfgPct">Comissão (%)</label><input id="salesCfgPct" type="number" min="0" max="100" step="0.0001" required></div>
        <div class="campo campo-span-2"><label>Base da comissão</label><input id="salesCfgBase" disabled><small id="salesCfgBaseAjuda"></small></div>
      </div>
      <div class="form-acoes"><button id="btnSalesCfgCancelar" class="btn-secundario" type="button">Cancelar</button><button class="btn-primario" type="submit">Salvar configuração</button></div>
      <p id="salesCfgMsg" class="mensagem-form"></p>
    </form>
  </section>

  <section id="salesItemBox" class="form-card hidden">
    <div class="form-card-titulo"><div><h3 id="salesItemTitulo">Novo item comercial</h3><p>Base central de materiais/itens usados nas vendas e na Curva ABC.</p></div></div>
    <form id="formSalesItem"><div class="form-grid form-grid-3">
      <div class="campo"><label for="salesItemCodigo">Código</label><input id="salesItemCodigo" maxlength="40"></div>
      <div class="campo campo-span-2"><label for="salesItemNome">Descrição do item</label><input id="salesItemNome" required></div>
      <div class="campo"><label for="salesItemCategoria">Categoria</label><input id="salesItemCategoria" placeholder="Ex.: Blocos, agregados, serviços"></div>
      <div class="campo"><label for="salesItemUnidade">Unidade</label><input id="salesItemUnidade" placeholder="UN, M³, TON..." maxlength="12"></div>
      <div class="campo"><label for="salesItemStatus">Status</label><select id="salesItemStatus"><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></div>
    </div><div class="form-acoes"><button id="btnSalesItemCancelar" class="btn-secundario" type="button">Cancelar</button><button class="btn-primario" type="submit">Salvar item</button></div><p id="salesItemMsg" class="mensagem-form"></p></form>
  </section>

  <section id="salesVendaBox" class="form-card hidden">
    <div class="form-card-titulo"><div><h3 id="salesVendaTitulo">Nova venda</h3><p>A comissão do vendedor é calculada exclusivamente sobre o valor efetivamente recebido.</p></div></div>
    <form id="formSalesVenda"><div class="form-grid form-grid-3">
      <div class="campo"><label for="salesEmpresa">Empresa</label><input id="salesEmpresa" disabled></div>
      <div class="campo"><label for="salesData">Data da venda</label><input id="salesData" type="date" required></div>
      <div class="campo"><label for="salesVendedor">Vendedor</label><select id="salesVendedor" required></select><small>Origem: RH · admissão/cargo com função Vendedor / Comercial.</small></div>
      <div class="campo campo-span-2"><label for="salesCliente">Cliente</label><input id="salesCliente" required></div>
      <div class="campo"><label for="salesDocumento">Pedido / NF / referência</label><input id="salesDocumento"></div>
      <div class="campo campo-span-3 sales-itens-venda">
        <div class="sales-itens-head"><div><label>Itens da venda</label><small>Uma venda pode conter materiais variados.</small></div><button id="btnSalesAdicionarItemVenda" class="btn-secundario" type="button">+ Adicionar item</button></div>
        <div class="tabela-container"><table class="tabela"><thead><tr><th>Item</th><th>Qtd.</th><th>Unidade</th><th>Valor unitário</th><th>Total</th><th></th></tr></thead><tbody id="salesItensVendaLista"></tbody></table></div>
      </div>
      <div class="campo"><label for="salesValor">Valor total da venda</label><input id="salesValor" type="number" disabled></div>
      <div class="campo"><label for="salesDataRec">Data do recebimento</label><input id="salesDataRec" type="date"></div>
      <div class="campo"><label for="salesValorRec">Valor recebido</label><input id="salesValorRec" type="number" min="0" step="0.01"><small>Admite recebimento parcial.</small></div>
      <div class="campo"><label for="salesPct">Comissão vendedor (%)</label><input id="salesPct" disabled></div>
      <div class="campo"><label for="salesComissao">Comissão calculada</label><input id="salesComissao" disabled></div>
      <div class="campo"><label for="salesStatus">Status da venda</label><select id="salesStatus"><option value="confirmada">Confirmada</option><option value="cancelada">Cancelada</option></select></div>
      <div class="campo"><label for="salesComStatus">Status da comissão</label><select id="salesComStatus"><option value="aguardando_recebimento">Aguardando recebimento</option><option value="provisionada">Provisionada</option><option value="aprovada">Aprovada</option><option value="paga">Paga</option></select></div>
      <div class="campo campo-span-2"><label for="salesObs">Observação</label><input id="salesObs"></div>
    </div><div class="form-acoes"><button id="btnSalesVendaCancelar" class="btn-secundario" type="button">Cancelar</button><button class="btn-primario" type="submit">Salvar venda</button></div><p id="salesVendaMsg" class="mensagem-form"></p></form>
  </section>

  <div class="sales-grid">
    <section class="lista-card">
      <div class="lista-cabecalho sales-chart-head"><div><h3>Evolução mensal</h3><p id="salesContexto">—</p></div><select id="salesModoGrafico"><option value="valor">R$ · valores</option><option value="percentual">% · percentuais</option></select></div>
      <div id="salesChart" class="sales-chart"></div>
    </section>
    <section class="lista-card"><div class="lista-cabecalho"><div><h3>Ranking comercial</h3><p>Venda, recebimento, meta e comissão por vendedor.</p></div></div><div id="salesRanking" class="sales-ranking"></div></section>
  </div>

  <section class="lista-card sales-clientes">
    <div class="lista-cabecalho sales-clientes-head">
      <div><h3>Principais clientes</h3><p>Ranking por valor financeiro no período selecionado.</p></div>
      <div class="sales-clientes-filtros">
        <select id="salesClientesMetrica">
          <option value="vendido">Valor vendido</option>
          <option value="recebido">Valor recebido</option>
        </select>
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
    <div class="tabela-container"><table class="tabela"><thead><tr><th>#</th><th>Cliente</th><th>Vendido</th><th>Recebido</th><th>A receber</th><th>% da métrica</th></tr></thead><tbody id="salesClientesLista"></tbody></table></div>
  </section>

  <section class="lista-card sales-abc">
    <div class="lista-cabecalho"><div><h3>Curva ABC · materiais vendidos</h3><p>Classificação por valor vendido, não por quantidade.</p></div></div>
    <div id="salesAbcResumo" class="sales-abc-resumo"></div>
    <div class="tabela-container"><table class="tabela"><thead><tr><th>Classe</th><th>Material / item</th><th>Valor vendido</th><th>% do total</th><th>% acumulado</th><th>Participação</th></tr></thead><tbody id="salesAbcLista"></tbody></table></div>
  </section>

  <section class="lista-card">
    <div class="lista-cabecalho"><div><h3>Vendas registradas</h3><p id="salesResumo">—</p></div><div class="sales-filtros"><select id="salesFiltroVendedor"><option value="">Todos os vendedores</option></select><select id="salesFiltroStatus"><option value="">Todos os status</option><option value="confirmada">Confirmadas</option><option value="cancelada">Canceladas</option></select></div></div>
    <div class="tabela-container"><table class="tabela sales-table"><thead><tr><th>Venda / recebimento</th><th>Vendedor</th><th>Cliente / item</th><th>Vendido</th><th>Recebido</th><th>Comissão</th><th>Status</th><th>Ações</th></tr></thead><tbody id="salesLista"></tbody></table></div>
  </section>

  <section class="lista-card sales-itens-cadastro">
    <div class="lista-cabecalho"><div><h3>Base de itens comerciais</h3><p>Cadastro único usado no lançamento das vendas e na análise por material.</p></div><input id="salesBuscaItem" class="campo-busca" type="search" placeholder="Buscar item, código ou categoria"></div>
    <div class="tabela-container"><table class="tabela"><thead><tr><th>Código</th><th>Item</th><th>Categoria</th><th>Unidade</th><th>Status</th><th>Ações</th></tr></thead><tbody id="salesItensCadastroLista"></tbody></table></div>
  </section>

  <section class="lista-card">
    <div class="lista-cabecalho"><div><h3>Equipe comercial</h3><p>Colaboradores ativos vindos do RH. Não há cadastro paralelo de vendedor.</p></div></div>
    <div class="tabela-container"><table class="tabela"><thead><tr><th>Colaborador</th><th>Função</th><th>Meta mensal</th><th>Comissão</th><th>Base</th><th>Ações</th></tr></thead><tbody id="salesEquipeLista"></tbody></table></div>
  </section>`;
  main.appendChild(s);

  $("btnSalesAtualizar")?.addEventListener("click",carregar);
  $("btnSalesVenda")?.addEventListener("click",()=>abrirVenda());
  $("btnSalesItem")?.addEventListener("click",()=>abrirItem());
  $("btnSalesAdicionarItemVenda")?.addEventListener("click",()=>adicionarLinhaItem());
  $("btnSalesVendaCancelar")?.addEventListener("click",fecharVenda);
  $("btnSalesItemCancelar")?.addEventListener("click",fecharItem);
  $("btnSalesCfgCancelar")?.addEventListener("click",fecharConfig);
  $("formSalesConfig")?.addEventListener("submit",salvarConfig);
  $("formSalesVenda")?.addEventListener("submit",salvarVenda);
  $("formSalesItem")?.addEventListener("submit",salvarItem);
  $("salesVendedor")?.addEventListener("change",aplicarRegraVendedor);
  ["salesValorRec"].forEach(id=>$(id)?.addEventListener("input",calcularComissao));
  $("salesFiltroVendedor")?.addEventListener("change",render);
  $("salesFiltroStatus")?.addEventListener("change",render);
  $("salesModoGrafico")?.addEventListener("change",render);
  $("salesClientesMetrica")?.addEventListener("change",render);
  $("salesClientesOrdem")?.addEventListener("change",render);
  $("salesBuscaItem")?.addEventListener("input",renderItensCadastro);
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
  if(sel)sel.innerHTML='<option value="">Selecione...</option>'+eq.map(({p,cfg})=>`<option value="${cfg?.id||""}" ${cfg?"":"disabled"}>${esc(p.nome)}${cfg?"":" · configurar comissão"}</option>`).join("");
  if(f){const atual=f.value;f.innerHTML='<option value="">Todos os vendedores</option>'+eq.filter(x=>x.cfg).map(({p,cfg})=>`<option value="${cfg.id}">${esc(p.nome)}</option>`).join("");if([...f.options].some(o=>o.value===atual))f.value=atual}
}

function abrirVenda(v=null){
  if(!(v?podeEditar():podeLancar()))return alert("Seu perfil não possui permissão para esta ação.");
  const emp=contextoUnico();if(!emp)return;
  editVendaId=v?.id||"";$("formSalesVenda")?.reset();$("salesVendaTitulo").textContent=v?"Editar venda":"Nova venda";$("salesEmpresa").value=nomeEmpresa(emp);
  $("salesData").value=v?.data||hoje();$("salesVendedor").value=v?.vendedorId||"";$("salesCliente").value=v?.cliente||"";$("salesDocumento").value=v?.documento||"";
  $("salesDataRec").value=dataRecebimento(v)||"";$("salesValorRec").value=recebido(v)||"";$("salesPct").value=v?n(v.comissaoPct):"";
  $("salesStatus").value=v?.status||"confirmada";$("salesComStatus").value=comStatus(v);$("salesObs").value=v?.observacao||"";
  const tb=$("salesItensVendaLista");if(tb)tb.innerHTML="";
  const itens=Array.isArray(v?.itens)&&v.itens.length?v.itens:[];
  if(itens.length)itens.forEach(adicionarLinhaItem);else adicionarLinhaItem();
  if(v&&!itens.length){const match=itensComerciais.find(x=>String(x.nome||"").trim().toLocaleLowerCase("pt-BR")===String(v.descricao||"").trim().toLocaleLowerCase("pt-BR"));const tr=$("salesItensVendaLista")?.lastElementChild;if(match&&tr){tr.querySelector("[data-item-id]").value=match.id;tr.querySelector("[data-item-qtd]").value=1;tr.querySelector("[data-item-vu]").value=n(v.valor);recalcularLinhaItem(tr)}}
  if(!v)aplicarRegraVendedor();calcularComissao();$("salesComStatus").disabled=!podeComissoes();$("salesVendaBox").classList.remove("hidden");$("salesVendaBox").scrollIntoView({behavior:"smooth",block:"start"});
}
function aplicarRegraVendedor(){if(editVendaId)return;const cfg=cfgVenda($("salesVendedor")?.value);$("salesPct").value=cfg?n(cfg.comissaoPct):"";calcularComissao()}
function calcularComissao(){const valor=n($("salesValorRec")?.value),pct=n($("salesPct")?.value);$("salesComissao").value=moeda(valor*pct/100);if(!editVendaId&&$("salesComStatus"))$("salesComStatus").value=valor>0?"provisionada":"aguardando_recebimento"}

async function salvarVenda(e){
  e.preventDefault();const nova=!editVendaId;if(nova&&!podeLancar())return;if(!nova&&!podeEditar())return;
  const emp=contextoUnico();if(!emp)return;const cfg=cfgVenda($("salesVendedor").value);if(!cfg)return msg($("salesVendaMsg"),"Selecione um vendedor configurado a partir do RH.");
  const itens=itensVendaForm();if(!itens.length)return msg($("salesVendaMsg"),"Inclua pelo menos um item válido na venda.");
  if(itens.some(x=>x.valorUnitario<=0))return msg($("salesVendaMsg"),"Informe o valor unitário de todos os itens.");
  const valor=itens.reduce((s,x)=>s+n(x.valorTotal),0),valorRec=n($("salesValorRec").value),pct=n($("salesPct").value);
  if(valor<=0)return msg($("salesVendaMsg"),"O valor total da venda deve ser maior que zero.");
  if(valorRec>valor)return msg($("salesVendaMsg"),"O valor recebido não pode superar o valor da venda.");
  if(valorRec>0&&!$("salesDataRec").value)return msg($("salesVendaMsg"),"Informe a data do recebimento.");
  let st=$("salesComStatus").value;if(valorRec<=0)st="aguardando_recebimento";else if(st==="aguardando_recebimento")st="provisionada";
  if(!podeComissoes()&&editVendaId)st=comStatus(vendas.find(x=>x.id===editVendaId));
  const resumoItens=itens.length===1?itens[0].nome:`${itens[0].nome} + ${itens.length-1} item(ns)`;
  const d={data:$("salesData").value,dataRecebimento:$("salesDataRec").value||null,valorRecebido:valorRec,vendedorId:cfg.id,vendedorRhId:cfg.rhColaboradorId||"",vendedorNome:cfg.nome||"",cliente:$("salesCliente").value.trim(),documento:$("salesDocumento").value.trim(),descricao:resumoItens,itens,valor,baseComissao:"recebido",comissaoPct:pct,comissaoBaseValor:valorRec,comissaoValor:valorRec*pct/100,comissaoStatus:st,status:$("salesStatus").value,observacao:$("salesObs").value.trim()};
  try{msg($("salesVendaMsg"),"Salvando...");if(editVendaId){const at=vendas.find(x=>x.id===editVendaId);if(!at||at.empresaId!==emp)throw new Error("empresa-divergente");await atualizarDocumento("vendas",editVendaId,d)}else await criarDocumento("vendas",{...d,empresaId:emp});fecharVenda();await carregar();emitirAlteracao("vendas")}
  catch(err){console.error(err);msg($("salesVendaMsg"),"Não foi possível salvar a venda.")}
}

async function mudarComissao(id,status){if(!podeComissoes())return;const v=vendas.find(x=>x.id===id);if(!v)return;if(recebido(v)<=0)return alert("A comissão depende de recebimento. Informe o valor recebido antes de aprovar.");try{await atualizarDocumento("vendas",id,{comissaoStatus:status});await carregar();emitirAlteracao("vendas")}catch(e){console.error(e);alert("Não foi possível atualizar a comissão.")}}
async function cancelarVenda(id){if(!podeEditar())return;const v=vendas.find(x=>x.id===id);if(!v||v.status==="cancelada"||!confirm("Cancelar esta venda? O histórico será preservado e a comissão deixará de compor os totais."))return;try{await atualizarDocumento("vendas",id,{status:"cancelada"});await carregar();emitirAlteracao("vendas")}catch(e){console.error(e);alert("Não foi possível cancelar a venda.")}}

function chart(vendidos,recebidos,metas){
  const el=$("salesChart");if(!el)return;const modo=$("salesModoGrafico")?.value||"valor";
  let a=vendidos,b=recebidos,c=metas,legA="Vendido",legB="Recebido",legC="Meta";
  if(modo==="percentual"){a=vendidos.map((v,i)=>metas[i]?v/metas[i]*100:0);b=recebidos.map((v,i)=>vendidos[i]?v/vendidos[i]*100:0);c=metas.map(v=>v>0?100:0);legA="Venda / meta";legB="Recebido / vendido";legC="Meta = 100%"}
  const max=Math.max(1,...a,...b,...c),w=900,h=265,p=34,x=i=>p+i*((w-p*2)/11),y=v=>h-p-n(v)/max*(h-p*2),path=arr=>arr.map((v,i)=>`${x(i)},${y(v)}`).join(" "),fmt=v=>modo==="percentual"?`${n(v).toLocaleString("pt-BR",{maximumFractionDigits:0})}%`:moeda(v).replace(",00","");
  el.innerHTML=`<div class="sales-legend"><span><i></i>${legA}</span><span class="rec"><i></i>${legB}</span><span class="meta"><i></i>${legC}</span></div><svg viewBox="0 0 ${w} ${h}"><line x1="${p}" y1="${h-p}" x2="${w-p}" y2="${h-p}" class="sales-axis-line"/><polyline class="sales-line" points="${path(a)}"/><polyline class="sales-line rec" points="${path(b)}"/><polyline class="sales-line meta" points="${path(c)}"/>${MESES.map((m,i)=>`<text x="${x(i)}" y="${h-8}" text-anchor="middle">${m}</text>`).join("")}${a.map((v,i)=>v>0?`<text class="sales-value-label" x="${x(i)}" y="${Math.max(10,y(v)-8)}" text-anchor="middle">${fmt(v)}</text>`:"").join("")}</svg>`;
}

function renderClientes(validas){
  const metrica=$("salesClientesMetrica")?.value||"vendido",ordem=$("salesClientesOrdem")?.value||"maior",mapa=new Map();
  validas.forEach(v=>{
    const nome=String(v.cliente||"Cliente não informado").trim()||"Cliente não informado";
    const chave=nome.toLocaleLowerCase("pt-BR"),z=mapa.get(chave)||{nome,vendido:0,recebido:0,qtd:0};
    z.vendido+=n(v.valor);z.recebido+=recebido(v);z.qtd++;mapa.set(chave,z);
  });
  let itens=[...mapa.values()].map(x=>({...x,aberto:Math.max(0,x.vendido-x.recebido),valor:metrica==="recebido"?x.recebido:x.vendido}));
  if(ordem==="maior")itens.sort((a,b)=>b.valor-a.valor||a.nome.localeCompare(b.nome,"pt-BR"));
  else if(ordem==="menor")itens.sort((a,b)=>a.valor-b.valor||a.nome.localeCompare(b.nome,"pt-BR"));
  else if(ordem==="az")itens.sort((a,b)=>a.nome.localeCompare(b.nome,"pt-BR"));
  else itens.sort((a,b)=>b.nome.localeCompare(a.nome,"pt-BR"));
  const total=itens.reduce((s,x)=>s+x.valor,0),max=Math.max(1,...itens.map(x=>x.valor)),top=itens.slice(0,12);
  const resumo=$("salesClientesResumo");if(resumo)resumo.innerHTML=`<span><strong>${itens.length}</strong> cliente(s)</span><span>Métrica: <strong>${metrica==="recebido"?"Valor recebido":"Valor vendido"}</strong></span><span>Total: <strong>${moeda(total)}</strong></span>`;
  const graf=$("salesClientesGrafico");if(graf)graf.innerHTML=top.length?top.map((x,i)=>`<div class="sales-cliente-bar"><span class="sales-cliente-pos">${i+1}</span><strong title="${esc(x.nome)}">${esc(x.nome)}</strong><i><b style="width:${Math.max(2,x.valor/max*100)}%"></b></i><em>${moeda(x.valor)}</em><small>${total?(x.valor/total*100).toLocaleString("pt-BR",{maximumFractionDigits:1}):0}%</small></div>`).join(""):'<div class="empty-state">Sem clientes no período.</div>';
  const tb=$("salesClientesLista");if(tb)tb.innerHTML=itens.length?itens.map((x,i)=>`<tr><td>${i+1}</td><td><strong>${esc(x.nome)}</strong><small>${x.qtd} venda(s)</small></td><td>${moeda(x.vendido)}</td><td>${moeda(x.recebido)}</td><td>${moeda(x.aberto)}</td><td>${total?(x.valor/total*100).toLocaleString("pt-BR",{maximumFractionDigits:1}):0}%</td></tr>`).join(""):'<tr><td colspan="6">Sem clientes no período.</td></tr>';
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
  const linhas=[...equipeVendedores().map(x=>({...x,tipo:"vendedor",funcao:"Vendedor / Comercial"})),...equipeSupervisores().map(x=>({...x,tipo:"supervisor",funcao:"Supervisão comercial"}))].sort((a,b)=>String(a.p.nome||"").localeCompare(String(b.p.nome||""),"pt-BR"));
  tb.innerHTML=linhas.length?linhas.map(({p,cfg,tipo,funcao})=>`<tr><td><strong>${esc(p.nome||"—")}</strong><small>${esc(p.cargoNome||"")}</small></td><td>${funcao}</td><td>${tipo==="vendedor"?moeda(n(cfg?.metaMensal)):"—"}</td><td>${tipo==="supervisor"?'<span class="sales-frozen">Congelada</span>':(cfg?n(cfg.comissaoPct).toLocaleString("pt-BR",{maximumFractionDigits:3})+"%":'<span class="status-inativo">Não configurada</span>')}</td><td>${tipo==="supervisor"?"Regra suspensa":"Valor recebido"}</td><td>${tipo==="vendedor"&&podeConfig()?`<button class="btn-acao" data-sales-config="${p.id}" data-sales-tipo="vendedor" type="button">Configurar</button>`:"—"}</td></tr>`).join(""):'<tr><td colspan="6">Nenhum vendedor ou supervisor ativo no RH com função SIG vinculada.</td></tr>';
  document.querySelectorAll("[data-sales-config]").forEach(b=>b.onclick=()=>{const p=vendedoresRh.find(x=>x.id===b.dataset.salesConfig);if(p)abrirConfig(p,"vendedor")});
}

function render(){
  if(!pagina())return;
  const ano=periodoAno(),idx=indices(),per=periodoVendas(),valid=per.filter(valida),recPer=periodoRecebimentos(),eq=equipeVendedores(),ativos=eq.filter(x=>x.cfg&&x.cfg.status!=="inativo");
  const total=valid.reduce((s,v)=>s+n(v.valor),0),rec=recPer.reduce((s,v)=>s+recebido(v),0),aberto=Math.max(0,valid.reduce((s,v)=>s+Math.max(0,n(v.valor)-recebido(v)),0)),meta=ativos.reduce((s,x)=>s+n(x.cfg.metaMensal)*idx.length,0),com=recPer.reduce((s,v)=>s+n(v.comissaoValor),0),q=valid.length;
  setText("salesKpiVendas",moeda(total));setText("salesKpiQtd",`${q} venda(s) válida(s)`);setText("salesKpiRecebido",moeda(rec));setText("salesKpiRecQtd",`${recPer.length} recebimento(s)`);setText("salesKpiAberto",moeda(aberto));setText("salesKpiMeta",moeda(meta));setText("salesKpiAting",meta?`${(total/meta*100).toLocaleString("pt-BR",{maximumFractionDigits:1})}%`:"—");setText("salesKpiAtingSub",meta?(total>=meta?"Meta atingida":"Abaixo da meta"):"Meta não configurada");setText("salesKpiTicket",moeda(q?total/q:0));setText("salesKpiComissao",moeda(com));setText("salesKpiSupervisor","Congelada");setText("salesContexto",`${empresasSelecionadasIds().length>1?"Empresas consolidadas":"Empresa selecionada"} · ${ano}`);

  const vals=Array(12).fill(0),recs=Array(12).fill(0);vendas.filter(v=>valida(v)&&anoData(v.data)===ano).forEach(v=>{const m=mesData(v.data);if(m>=0)vals[m]+=n(v.valor)});vendas.filter(v=>valida(v)&&dataRecebimento(v)&&anoData(dataRecebimento(v))===ano).forEach(v=>{const m=mesData(dataRecebimento(v));if(m>=0)recs[m]+=recebido(v)});
  const metaMes=Array(12).fill(ativos.reduce((s,x)=>s+n(x.cfg.metaMensal),0));chart(vals,recs,metaMes);

  const rank=ativos.map(({p,cfg})=>{const vv=valid.filter(x=>x.vendedorId===cfg.id),vr=recPer.filter(x=>x.vendedorId===cfg.id),tot=vv.reduce((s,x)=>s+n(x.valor),0),rr=vr.reduce((s,x)=>s+recebido(x),0),m=n(cfg.metaMensal)*idx.length;return{p,cfg,tot,rec:rr,meta:m,ating:m?tot/m*100:0,com:vr.reduce((s,x)=>s+n(x.comissaoValor),0)}}).sort((a,b)=>b.tot-a.tot);
  const rb=$("salesRanking");if(rb)rb.innerHTML=rank.length?rank.map((r,i)=>`<div class="sales-rank-row"><b>${i+1}</b><span><strong>${esc(r.p.nome)}</strong><small>Vendido ${moeda(r.tot)} · recebido ${moeda(r.rec)}</small></span><span>${r.meta?r.ating.toLocaleString("pt-BR",{maximumFractionDigits:1})+"%":"—"}</span><strong>${moeda(r.com)}</strong></div>`).join(""):'<div class="empty-state">Configure vendedores do RH para iniciar o ranking.</div>';

  renderClientes(valid);renderAbc(valid);renderEquipe();renderItensCadastro();

  const filtroVend=$("salesFiltroVendedor")?.value||"",filtroSt=$("salesFiltroStatus")?.value||"",lista=per.filter(v=>(!filtroVend||v.vendedorId===filtroVend)&&(!filtroSt||v.status===filtroSt)).sort((a,b)=>String(b.data||"").localeCompare(String(a.data||""))),tb=$("salesLista");
  setText("salesResumo",`${lista.length} venda(s) no período selecionado`);
  if(tb)tb.innerHTML=lista.length?lista.map(v=>`<tr class="${v.status==="cancelada"?"sales-cancelada":""}"><td><strong>${formatData(v.data)}</strong><small>${dataRecebimento(v)?`Rec. ${formatData(dataRecebimento(v))}`:"Sem recebimento"}</small></td><td>${esc(v.vendedorNome||nomeVend(v.vendedorId))}</td><td><strong>${esc(v.cliente||"—")}</strong><small>${esc(Array.isArray(v.itens)&&v.itens.length?`${v.itens[0].nome}${v.itens.length>1?` + ${v.itens.length-1} item(ns)`:""}`:(v.descricao||v.documento||""))}</small></td><td>${moeda(v.valor)}</td><td>${recebido(v)>0?moeda(recebido(v)):"—"}</td><td>${v.status==="cancelada"?"—":moeda(v.comissaoValor)}<small>${n(v.comissaoPct).toLocaleString("pt-BR",{maximumFractionDigits:2})}% sobre recebido</small></td><td><span class="sales-status ${esc(comStatus(v))}">${statusComLabel(comStatus(v))}</span><small>${v.status==="cancelada"?"Venda cancelada":"Venda confirmada"}</small></td><td><div class="acoes-tabela">${podeEditar()?`<button class="btn-acao" data-sales-edit="${v.id}" type="button">Editar</button>`:""}${podeComissoes()&&v.status!=="cancelada"&&!["aprovada","paga","aguardando_recebimento","aguardando_faturamento"].includes(v.comissaoStatus)?`<button class="btn-acao destaque" data-sales-aprova="${v.id}" type="button">Aprovar</button>`:""}${podeComissoes()&&v.status!=="cancelada"&&v.comissaoStatus==="aprovada"?`<button class="btn-acao destaque" data-sales-paga="${v.id}" type="button">Pagar</button>`:""}${podeEditar()&&v.status!=="cancelada"?`<button class="btn-acao" data-sales-cancela="${v.id}" type="button">Cancelar</button>`:""}</div></td></tr>`).join(""):'<tr><td colspan="8">Nenhuma venda no período.</td></tr>';
  document.querySelectorAll("[data-sales-edit]").forEach(b=>b.onclick=()=>abrirVenda(vendas.find(v=>v.id===b.dataset.salesEdit)));document.querySelectorAll("[data-sales-aprova]").forEach(b=>b.onclick=()=>mudarComissao(b.dataset.salesAprova,"aprovada"));document.querySelectorAll("[data-sales-paga]").forEach(b=>b.onclick=()=>mudarComissao(b.dataset.salesPaga,"paga"));document.querySelectorAll("[data-sales-cancela]").forEach(b=>b.onclick=()=>cancelarVenda(b.dataset.salesCancela));
}

async function carregar(){
  if(busy||!podeVer())return;busy=true;
  try{
    const [vr,sr,cfg,vs,itens]=await Promise.all([colaboradoresPorFuncao("VENDEDOR"),colaboradoresPorFuncao("SUPERVISOR_VENDAS"),listarDocumentos("vendedores"),listarDocumentos("vendas"),listarDocumentos("itensComerciais")]);
    vendedoresRh=vr;supervisoresRh=sr;configs=cfg;vendas=vs;itensComerciais=itens;preencherVendedores();render();esconderBotoes();$("salesAviso")?.classList.add("hidden");
  }catch(e){console.error("Vendas:",e);const a=$("salesAviso");if(a){a.textContent="Não foi possível carregar Vendas & Comissões. Verifique permissões, RH e Firestore Rules.";a.classList.remove("hidden")}}finally{busy=false}
}

export async function abrir(){if(!podeVer())return alert("Seu perfil não possui acesso a Vendas & Comissões.");montar();abrirPagina("vendas");$("menuVendas")?.classList.add("ativo");esconderBotoes();await carregar()}
montar();
window.addEventListener("sig:empresa-changed",()=>{if(pagina()&&!pagina().classList.contains("hidden"))carregar()});
window.addEventListener("sig:periodo-changed",()=>{if(pagina()&&!pagina().classList.contains("hidden"))render()});
window.addEventListener("sig:data-changed",e=>{if(["vendas","rh"].includes(e.detail?.modulo)&&pagina()&&!pagina().classList.contains("hidden"))carregar()});
