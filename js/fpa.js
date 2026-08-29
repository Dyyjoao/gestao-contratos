import {
  $, on, esc, msg, permite, state, moeda, numero, empresaAtualId,
  listarDocumentos, criarDocumento, atualizarDocumento
} from "./shared.js";

const pagina=$("pagina-controladoria");
const MESES=[
  ["jan","Jan"],["fev","Fev"],["mar","Mar"],["abr","Abr"],["mai","Mai"],["jun","Jun"],
  ["jul","Jul"],["ago","Ago"],["set","Set"],["out","Out"],["nov","Nov"],["dez","Dez"]
];
const GRUPOS={receita:"Receita Operacional",deducoes:"Deduções da Receita",custos:"Custos",despesas:"Despesas Operacionais",financeiro:"Resultado Financeiro",impostos:"Impostos",outros:"Outros"};
const anoAtual=new Date().getFullYear();
let plano=[],centros=[],premissas=[],realizados=[],budgets=[],forecasts=[];
let carregadoEmpresa="";

function montarTela(){
  if(!pagina)return;
  pagina.innerHTML=`
    <div class="pagina-cabecalho fpa-cabecalho">
      <div><span class="eyebrow">FP&A</span><h2>Controladoria & Planejamento</h2><p>Realizado, Budget, Forecast e DRE gerencial em ambientes separados e integrados.</p></div>
      <span class="fpa-contexto">A empresa ativa é definida no cabeçalho do SIG.</span>
    </div>
    <nav class="fpa-tabs" aria-label="Áreas da Controladoria">
      <button class="fpa-tab ativo" data-fpa-tab="dre" type="button">DRE Gerencial</button>
      <button class="fpa-tab" data-fpa-tab="realizado" type="button">Input Mensal</button>
      <button class="fpa-tab" data-fpa-tab="budget" type="button">Budget</button>
      <button class="fpa-tab" data-fpa-tab="forecast" type="button">Forecast</button>
      <button class="fpa-tab" data-fpa-tab="premissas" type="button">Premissas</button>
      <button class="fpa-tab" data-fpa-tab="plano" type="button">Plano de Contas</button>
      <button class="fpa-tab" data-fpa-tab="centros" type="button">Centros de Custo</button>
    </nav>

    <section class="fpa-view" data-fpa-view="dre">
      <div class="fpa-toolbar">
        <div class="campo"><label for="dreAno">Exercício</label><input id="dreAno" type="number" min="2020" max="2100" value="${anoAtual}"></div>
        <div class="campo"><label for="dreCenario">Cenário</label><select id="dreCenario"><option value="realizado">Realizado</option><option value="budget">Budget</option><option value="forecast">Forecast</option></select></div>
        <div class="campo"><label for="dreCentro">Centro de custo</label><select id="dreCentro"></select></div>
        <button id="btnAtualizarDre" class="btn-secundario" type="button">Atualizar DRE</button>
      </div>
      <section class="lista-card fpa-card"><div class="lista-cabecalho"><div><h3>DRE Gerencial</h3><p>Relatório gerado a partir das bases de Realizado, Budget ou Forecast — sem digitação direta.</p></div></div><div class="fpa-grid-wrap"><table id="tabelaDre" class="fpa-grid fpa-grid-dre"></table></div></section>
    </section>

    <section class="fpa-view hidden" data-fpa-view="realizado">
      <div class="fpa-toolbar">
        <div class="campo"><label for="realizadoAno">Exercício</label><input id="realizadoAno" type="number" min="2020" max="2100" value="${anoAtual}"></div>
        <div class="campo"><label for="realizadoCentro">Centro de custo</label><select id="realizadoCentro"></select></div>
        <button id="btnCarregarRealizado" class="btn-secundario" type="button">Carregar</button>
        <button id="btnSalvarRealizado" class="btn-primario" type="button">Salvar realizado</button>
        <span id="mensagemRealizado" class="mensagem-form"></span>
      </div>
      <div class="modulo-aviso">O Input Mensal é a base do realizado. Depois poderemos incluir importação CSV/XLSX e fechamento de competência; a DRE apenas consome estes dados.</div>
      <section class="lista-card fpa-card"><div class="lista-cabecalho"><div><h3>Realizado mês a mês</h3><p>Valores editáveis por conta e centro de custo.</p></div></div><div class="fpa-grid-wrap"><table id="tabelaRealizado" class="fpa-grid"></table></div></section>
    </section>

    <section class="fpa-view hidden" data-fpa-view="budget">
      <div class="fpa-toolbar fpa-toolbar-budget">
        <div class="campo"><label for="budgetAno">Exercício do Budget</label><input id="budgetAno" type="number" min="2021" max="2100" value="${anoAtual+1}"></div>
        <div class="campo"><label for="budgetVersao">Versão</label><input id="budgetVersao" value="Budget ${anoAtual+1} - V1"></div>
        <div class="campo"><label for="budgetCentro">Centro de custo</label><select id="budgetCentro"></select></div>
        <button id="btnCarregarBudget" class="btn-secundario" type="button">Carregar</button>
        <button id="btnSalvarBudget" class="btn-primario" type="button">Salvar Budget</button>
        <span id="mensagemBudget" class="mensagem-form"></span>
      </div>
      <div class="modulo-aviso">Cada mês mostra <strong>Realizado do ano anterior + projeção do Budget + variação</strong>. A premissa pode preencher automaticamente a projeção, mas todas as células de Budget permanecem editáveis.</div>
      <section class="lista-card fpa-card"><div class="lista-cabecalho"><div><h3>Matriz de Budget</h3><p id="budgetLegenda">Comparativo mensal com o ano anterior.</p></div><button id="btnAplicarTodasPremissas" class="btn-secundario" type="button">Aplicar premissas</button></div><div class="fpa-grid-wrap"><table id="tabelaBudget" class="fpa-grid fpa-grid-budget"></table></div></section>
    </section>

    <section class="fpa-view hidden" data-fpa-view="forecast">
      <div class="fpa-toolbar">
        <div class="campo"><label for="forecastAno">Exercício</label><input id="forecastAno" type="number" min="2021" max="2100" value="${anoAtual}"></div>
        <div class="campo"><label for="forecastVersao">Versão</label><input id="forecastVersao" value="F${String(new Date().getMonth()+1).padStart(2,"0")}"></div>
        <div class="campo"><label for="forecastFechadoAte">Realizado até</label><select id="forecastFechadoAte">${MESES.map(([,n],i)=>`<option value="${i+1}" ${i===new Date().getMonth()?"selected":""}>${n}</option>`).join("")}</select></div>
        <div class="campo"><label for="forecastCentro">Centro de custo</label><select id="forecastCentro"></select></div>
        <button id="btnCarregarForecast" class="btn-secundario" type="button">Carregar</button>
        <button id="btnSalvarForecast" class="btn-primario" type="button">Salvar Forecast</button>
        <span id="mensagemForecast" class="mensagem-form"></span>
      </div>
      <div class="modulo-aviso">Meses já encerrados usam o Realizado e ficam bloqueados. Apenas os meses futuros são projetados no Forecast. Cada versão é preservada.</div>
      <section class="lista-card fpa-card"><div class="lista-cabecalho"><div><h3>Matriz de Forecast</h3><p>Realizado acumulado + projeção dos meses restantes.</p></div></div><div class="fpa-grid-wrap"><table id="tabelaForecast" class="fpa-grid"></table></div></section>
    </section>

    <section class="fpa-view hidden" data-fpa-view="premissas">
      <div class="pagina-cabecalho interno"><div><h3>Premissas de Planejamento</h3><p>Cadastre os direcionadores usados para sugerir valores de Budget e Forecast.</p></div><button id="btnNovaPremissa" class="btn-primario" type="button">+ Nova premissa</button></div>
      <section id="formPremissaContainer" class="form-card hidden"><form id="formPremissa"><div class="form-grid form-grid-3">
        <div class="campo"><label for="premissaNome">Nome</label><input id="premissaNome" required placeholder="Ex.: Reajuste energia 6%"></div>
        <div class="campo"><label for="premissaTipo">Tipo</label><select id="premissaTipo"><option value="crescimento">Crescimento sobre A-1 (%)</option><option value="valor_fixo">Valor mensal fixo</option><option value="repetir_realizado">Repetir realizado A-1</option><option value="manual">Manual / referência</option></select></div>
        <div class="campo"><label for="premissaPercentual">Percentual</label><input id="premissaPercentual" type="number" step="0.01" value="0"></div>
        <div class="campo"><label for="premissaValorFixo">Valor mensal fixo</label><input id="premissaValorFixo" type="number" step="0.01" value="0"></div>
        <div class="campo campo-span-2"><label for="premissaObservacao">Descrição / racional</label><input id="premissaObservacao" placeholder="Explique a hipótese adotada"></div>
      </div><div class="form-acoes"><button id="btnCancelarPremissa" class="btn-secundario" type="button">Cancelar</button><button class="btn-primario" type="submit">Salvar premissa</button></div><p id="mensagemPremissa" class="mensagem-form"></p></form></section>
      <section class="lista-card"><div class="tabela-container"><table class="tabela"><thead><tr><th>Premissa</th><th>Tipo</th><th>Parâmetro</th><th>Racional</th><th>Ações</th></tr></thead><tbody id="listaPremissas"></tbody></table></div></section>
    </section>

    <section class="fpa-view hidden" data-fpa-view="plano">
      <div class="pagina-cabecalho interno"><div><h3>Plano de Contas Gerencial</h3><p>Estrutura hierárquica que alimentará DRE, Budget e Forecast.</p></div><button id="btnNovaContaGerencial" class="btn-primario" type="button">+ Nova conta</button></div>
      <section id="formContaGerencialContainer" class="form-card hidden"><form id="formContaGerencial"><div class="form-grid form-grid-3">
        <div class="campo"><label for="contaGerencialCodigo">Código</label><input id="contaGerencialCodigo" required placeholder="4.01.001"></div>
        <div class="campo"><label for="contaGerencialNome">Conta gerencial</label><input id="contaGerencialNome" required></div>
        <div class="campo"><label for="contaGerencialGrupo">Grupo DRE</label><select id="contaGerencialGrupo">${Object.entries(GRUPOS).map(([v,n])=>`<option value="${v}">${n}</option>`).join("")}</select></div>
        <div class="campo"><label for="contaGerencialNatureza">Natureza</label><select id="contaGerencialNatureza"><option value="receita">Receita</option><option value="despesa">Despesa / custo</option></select></div>
        <div class="campo"><label for="contaGerencialOrdem">Ordem</label><input id="contaGerencialOrdem" type="number" step="1" value="100"></div>
        <div class="campo"><label for="contaGerencialStatus">Status</label><select id="contaGerencialStatus"><option value="ativo">Ativa</option><option value="inativo">Inativa</option></select></div>
      </div><div class="form-acoes"><button id="btnCancelarContaGerencial" class="btn-secundario" type="button">Cancelar</button><button class="btn-primario" type="submit">Salvar conta</button></div><p id="mensagemContaGerencial" class="mensagem-form"></p></form></section>
      <section class="lista-card"><div class="tabela-container"><table class="tabela"><thead><tr><th>Código</th><th>Conta</th><th>Grupo DRE</th><th>Natureza</th><th>Status</th><th>Ações</th></tr></thead><tbody id="listaPlanoGerencial"></tbody></table></div></section>
    </section>

    <section class="fpa-view hidden" data-fpa-view="centros">
      <div class="pagina-cabecalho interno"><div><h3>Centros de Custo</h3><p>Estrutura transversal usada em contratos, solicitações, almoxarifado e FP&A.</p></div><button id="btnNovoCentroCusto" class="btn-primario" type="button">+ Novo centro</button></div>
      <section id="formCentroCustoContainer" class="form-card hidden"><form id="formCentroCusto"><div class="form-grid form-grid-3">
        <div class="campo"><label for="centroCustoCodigo">Código</label><input id="centroCustoCodigo" required placeholder="CC-ADM"></div>
        <div class="campo"><label for="centroCustoNome">Centro de custo</label><input id="centroCustoNome" required></div>
        <div class="campo"><label for="centroCustoResponsavel">Responsável</label><input id="centroCustoResponsavel"></div>
        <div class="campo"><label for="centroCustoStatus">Status</label><select id="centroCustoStatus"><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></div>
      </div><div class="form-acoes"><button id="btnCancelarCentroCusto" class="btn-secundario" type="button">Cancelar</button><button class="btn-primario" type="submit">Salvar centro</button></div><p id="mensagemCentroCusto" class="mensagem-form"></p></form></section>
      <section class="lista-card"><div class="tabela-container"><table class="tabela"><thead><tr><th>Código</th><th>Centro de custo</th><th>Responsável</th><th>Status</th><th>Ações</th></tr></thead><tbody id="listaCentrosCusto"></tbody></table></div></section>
    </section>`;
}

function n(v){const x=Number(v||0);return Number.isFinite(x)?x:0}
function vazioMeses(){return Object.fromEntries(MESES.map(([m])=>[m,0]))}
function total(v){return MESES.reduce((s,[m])=>s+n(v?.[m]),0)}
function pct(atual,base){if(!base)return atual?null:0;return((atual-base)/Math.abs(base))*100}
function pctHtml(atual,base){const p=pct(atual,base);if(p===null)return'<span class="fpa-var neutra">—</span>';const c=p>0?"positiva":p<0?"negativa":"neutra";return`<span class="fpa-var ${c}">${p>0?"+":""}${p.toLocaleString("pt-BR",{maximumFractionDigits:1})}%</span>`}
function fmt(v){return n(v).toLocaleString("pt-BR",{minimumFractionDigits:0,maximumFractionDigits:2})}
function contasAtivas(){return [...plano].filter(x=>x.status!=="inativo").sort((a,b)=>n(a.ordem)-n(b.ordem)||String(a.codigo||"").localeCompare(String(b.codigo||""),"pt-BR"))}
function centroSelecionado(id){return $(id)?.value||""}
function docPor(arr,contaId,centroId,ano,versao=""){return arr.find(x=>x.contaId===contaId&&(x.centroCustoId||"")===(centroId||"")&&Number(x.exercicio)===Number(ano)&&(!versao||x.versao===versao))}

function preencherCentros(){
  const opts='<option value="">Corporativo / sem centro específico</option>'+centros.filter(x=>x.status!=="inativo").sort((a,b)=>String(a.codigo||"").localeCompare(String(b.codigo||""))).map(x=>`<option value="${esc(x.id)}">${esc(x.codigo)} · ${esc(x.nome)}</option>`).join("");
  ["dreCentro","realizadoCentro","budgetCentro","forecastCentro"].forEach(id=>{const s=$(id);if(!s)return;const atual=s.value;s.innerHTML=opts;if([...s.options].some(o=>o.value===atual))s.value=atual});
}
function preencherPremissasSelect(valor=""){return '<option value="">Sem premissa</option>'+premissas.map(p=>`<option value="${esc(p.id)}" ${p.id===valor?"selected":""}>${esc(p.nome)}</option>`).join("")}

async function carregarBases(){
  if(!empresaAtualId())return;
  const alvo=empresaAtualId();
  try{
    [plano,centros,premissas,realizados,budgets,forecasts]=await Promise.all([
      listarDocumentos("planoContasGerencial"),listarDocumentos("centrosCusto"),listarDocumentos("premissasPlanejamento"),
      listarDocumentos("realizadoMensal"),listarDocumentos("budgetLinhas"),listarDocumentos("forecastLinhas")
    ]);
    carregadoEmpresa=alvo;preencherCentros();renderPlano();renderCentros();renderPremissas();renderRealizado();renderBudget();renderForecast();renderDre();
  }catch(e){
    console.error("Erro ao carregar FP&A",e);
    const avisos=["mensagemRealizado","mensagemBudget","mensagemForecast"];
    avisos.forEach(id=>msg($(id),"As novas bases de FP&A ainda não estão liberadas pelas regras do Firebase."));
  }
}

function abrirAba(nome){
  document.querySelectorAll(".fpa-tab").forEach(b=>b.classList.toggle("ativo",b.dataset.fpaTab===nome));
  document.querySelectorAll(".fpa-view").forEach(v=>v.classList.toggle("hidden",v.dataset.fpaView!==nome));
  if(nome==="budget")renderBudget();if(nome==="realizado")renderRealizado();if(nome==="forecast")renderForecast();if(nome==="dre")renderDre();
}

function renderPlano(){
  const tbody=$("listaPlanoGerencial");if(!tbody)return;
  const arr=[...plano].sort((a,b)=>n(a.ordem)-n(b.ordem)||String(a.codigo||"").localeCompare(String(b.codigo||""),"pt-BR"));
  tbody.innerHTML=arr.length?arr.map(x=>`<tr><td><strong>${esc(x.codigo)}</strong></td><td>${esc(x.nome)}</td><td>${esc(GRUPOS[x.grupoDre]||x.grupoDre)}</td><td>${x.natureza==="receita"?"Receita":"Despesa / custo"}</td><td><span class="${x.status==="inativo"?"status-inativo":"status-ativo"}">${x.status==="inativo"?"Inativa":"Ativa"}</span></td><td><button type="button" class="btn-acao destaque" data-edit-conta="${x.id}">Editar</button></td></tr>`).join(""):'<tr><td colspan="6">Cadastre o plano gerencial para começar o planejamento.</td></tr>';
  document.querySelectorAll("[data-edit-conta]").forEach(b=>on(b,"click",()=>abrirConta(plano.find(x=>x.id===b.dataset.editConta))));
}
let contaEditId=null;
function abrirConta(x=null){contaEditId=x?.id||null;$("formContaGerencial")?.reset();$("contaGerencialCodigo").value=x?.codigo||"";$("contaGerencialNome").value=x?.nome||"";$("contaGerencialGrupo").value=x?.grupoDre||"despesas";$("contaGerencialNatureza").value=x?.natureza||"despesa";$("contaGerencialOrdem").value=n(x?.ordem||100);$("contaGerencialStatus").value=x?.status||"ativo";$("formContaGerencialContainer")?.classList.remove("hidden")}

function renderCentros(){
  const tbody=$("listaCentrosCusto");if(!tbody)return;
  const arr=[...centros].sort((a,b)=>String(a.codigo||"").localeCompare(String(b.codigo||""),"pt-BR"));
  tbody.innerHTML=arr.length?arr.map(x=>`<tr><td><strong>${esc(x.codigo)}</strong></td><td>${esc(x.nome)}</td><td>${esc(x.responsavel||"-")}</td><td><span class="${x.status==="inativo"?"status-inativo":"status-ativo"}">${x.status==="inativo"?"Inativo":"Ativo"}</span></td><td><button type="button" class="btn-acao destaque" data-edit-centro="${x.id}">Editar</button></td></tr>`).join(""):'<tr><td colspan="5">Nenhum centro de custo cadastrado.</td></tr>';
  document.querySelectorAll("[data-edit-centro]").forEach(b=>on(b,"click",()=>abrirCentro(centros.find(x=>x.id===b.dataset.editCentro))));
}
let centroEditId=null;
function abrirCentro(x=null){centroEditId=x?.id||null;$("formCentroCusto")?.reset();$("centroCustoCodigo").value=x?.codigo||"";$("centroCustoNome").value=x?.nome||"";$("centroCustoResponsavel").value=x?.responsavel||"";$("centroCustoStatus").value=x?.status||"ativo";$("formCentroCustoContainer")?.classList.remove("hidden")}

function tipoPremissa(x){return{crescimento:"Crescimento sobre A-1",valor_fixo:"Valor mensal fixo",repetir_realizado:"Repetir A-1",manual:"Manual"}[x]||x}
function renderPremissas(){
  const tbody=$("listaPremissas");if(!tbody)return;
  tbody.innerHTML=premissas.length?premissas.map(x=>`<tr><td><strong>${esc(x.nome)}</strong></td><td>${esc(tipoPremissa(x.tipo))}</td><td>${x.tipo==="crescimento"?`${fmt(x.percentual)}%`:x.tipo==="valor_fixo"?moeda(x.valorFixo):"-"}</td><td>${esc(x.observacao||"-")}</td><td><button type="button" class="btn-acao destaque" data-edit-premissa="${x.id}">Editar</button></td></tr>`).join(""):'<tr><td colspan="5">Nenhuma premissa cadastrada.</td></tr>';
  document.querySelectorAll("[data-edit-premissa]").forEach(b=>on(b,"click",()=>abrirPremissa(premissas.find(x=>x.id===b.dataset.editPremissa))));
}
let premissaEditId=null;
function abrirPremissa(x=null){premissaEditId=x?.id||null;$("formPremissa")?.reset();$("premissaNome").value=x?.nome||"";$("premissaTipo").value=x?.tipo||"crescimento";$("premissaPercentual").value=n(x?.percentual);$("premissaValorFixo").value=n(x?.valorFixo);$("premissaObservacao").value=x?.observacao||"";$("formPremissaContainer")?.classList.remove("hidden")}

function renderRealizado(){
  const t=$("tabelaRealizado");if(!t)return;
  const ano=Number($("realizadoAno")?.value||anoAtual),cc=centroSelecionado("realizadoCentro"),contas=contasAtivas();
  t.innerHTML=`<thead><tr><th class="sticky-col conta-col">Conta gerencial</th>${MESES.map(([,m])=>`<th>${m}</th>`).join("")}<th>Total</th></tr></thead><tbody>${contas.length?contas.map(c=>{const r=docPor(realizados,c.id,cc,ano),v={...vazioMeses(),...(r?.valores||{})};return`<tr data-realizado-conta="${c.id}"><td class="sticky-col conta-col"><strong>${esc(c.codigo)}</strong><span>${esc(c.nome)}</span></td>${MESES.map(([m])=>`<td><input class="fpa-cell-input" data-realizado-mes="${m}" type="number" step="0.01" value="${n(v[m])}"></td>`).join("")}<td class="fpa-total" data-realizado-total>${moeda(total(v))}</td></tr>`}).join(""):'<tr><td colspan="14">Cadastre contas no Plano de Contas Gerencial.</td></tr>'}</tbody>`;
  t.querySelectorAll("[data-realizado-mes]").forEach(inp=>on(inp,"input",e=>{const tr=e.target.closest("tr");let s=0;tr.querySelectorAll("[data-realizado-mes]").forEach(i=>s+=n(i.value));tr.querySelector("[data-realizado-total]").textContent=moeda(s)}));
}

function linhaBudget(c,cc,ano,versao){
  const ant=docPor(realizados,c.id,cc,ano-1),bud=docPor(budgets,c.id,cc,ano,versao),real={...vazioMeses(),...(ant?.valores||{})},proj={...vazioMeses(),...(bud?.valores||{})};
  return{conta:c,real,proj,premissaId:bud?.premissaId||"",doc:bud};
}
function renderBudget(){
  const t=$("tabelaBudget");if(!t)return;
  const ano=Number($("budgetAno")?.value||anoAtual+1),versao=$("budgetVersao")?.value.trim()||`Budget ${ano} - V1`,cc=centroSelecionado("budgetCentro"),rows=contasAtivas().map(c=>linhaBudget(c,cc,ano,versao));
  if($("budgetLegenda"))$("budgetLegenda").textContent=`Realizado ${ano-1} × Budget ${ano} · ${versao}`;
  const cabMeses=MESES.map(([,m])=>`<th colspan="3" class="mes-grupo">${m}</th>`).join("");
  const subMeses=MESES.map(()=>`<th class="sub-real">R A-1</th><th class="sub-budget">Budget</th><th class="sub-var">Δ%</th>`).join("");
  t.innerHTML=`<thead><tr><th rowspan="2" class="sticky-col conta-col">Conta</th><th rowspan="2" class="sticky-col premissa-col">Premissa</th>${cabMeses}<th colspan="3" class="mes-grupo total-grupo">Total anual</th></tr><tr>${subMeses}<th>R ${ano-1}</th><th>Budget ${ano}</th><th>Δ%</th></tr></thead><tbody>${rows.length?rows.map(r=>`<tr data-budget-conta="${r.conta.id}"><td class="sticky-col conta-col"><strong>${esc(r.conta.codigo)}</strong><span>${esc(r.conta.nome)}</span></td><td class="sticky-col premissa-col"><div class="premissa-cell"><select data-budget-premissa>${preencherPremissasSelect(r.premissaId)}</select><button type="button" class="btn-mini" data-aplicar-premissa title="Aplicar premissa">↻</button></div></td>${MESES.map(([m])=>`<td class="fpa-readonly" data-budget-real="${m}">${fmt(r.real[m])}</td><td><input class="fpa-cell-input budget-editavel" data-budget-mes="${m}" type="number" step="0.01" value="${n(r.proj[m])}"></td><td data-budget-var="${m}">${pctHtml(r.proj[m],r.real[m])}</td>`).join("")}<td class="fpa-total" data-budget-total-real>${moeda(total(r.real))}</td><td class="fpa-total" data-budget-total-proj>${moeda(total(r.proj))}</td><td class="fpa-total" data-budget-total-var>${pctHtml(total(r.proj),total(r.real))}</td></tr>`).join(""):'<tr><td colspan="41">Cadastre o Plano de Contas Gerencial para montar o Budget.</td></tr>'}</tbody>`;
  t.querySelectorAll("[data-budget-mes]").forEach(inp=>on(inp,"input",e=>atualizarLinhaBudget(e.target.closest("tr"))));
  t.querySelectorAll("[data-aplicar-premissa]").forEach(b=>on(b,"click",()=>aplicarPremissaLinha(b.closest("tr"))));
}
function valoresLinhaBudget(tr){return Object.fromEntries(MESES.map(([m])=>[m,n(tr.querySelector(`[data-budget-mes="${m}"]`)?.value)]))}
function reaisLinhaBudget(tr){return Object.fromEntries(MESES.map(([m])=>[m,n(tr.querySelector(`[data-budget-real="${m}"]`)?.textContent)]))}
function atualizarLinhaBudget(tr){if(!tr)return;const proj=valoresLinhaBudget(tr),real=reaisLinhaBudget(tr);MESES.forEach(([m])=>{const c=tr.querySelector(`[data-budget-var="${m}"]`);if(c)c.innerHTML=pctHtml(proj[m],real[m])});tr.querySelector("[data-budget-total-proj]").textContent=moeda(total(proj));tr.querySelector("[data-budget-total-var]").innerHTML=pctHtml(total(proj),total(real))}
function aplicarPremissaLinha(tr){
  if(!tr)return;const id=tr.querySelector("[data-budget-premissa]")?.value,p=premissas.find(x=>x.id===id);if(!p)return;
  const real=reaisLinhaBudget(tr);MESES.forEach(([m])=>{const inp=tr.querySelector(`[data-budget-mes="${m}"]`);if(!inp)return;if(p.tipo==="crescimento")inp.value=(real[m]*(1+n(p.percentual)/100)).toFixed(2);else if(p.tipo==="valor_fixo")inp.value=n(p.valorFixo).toFixed(2);else if(p.tipo==="repetir_realizado")inp.value=n(real[m]).toFixed(2)});atualizarLinhaBudget(tr);
}

function renderForecast(){
  const t=$("tabelaForecast");if(!t)return;
  const ano=Number($("forecastAno")?.value||anoAtual),versao=$("forecastVersao")?.value.trim()||"F01",fechado=Number($("forecastFechadoAte")?.value||0),cc=centroSelecionado("forecastCentro"),contas=contasAtivas();
  t.innerHTML=`<thead><tr><th class="sticky-col conta-col">Conta</th>${MESES.map(([,m],i)=>`<th>${m}<small>${i<fechado?"Real":"Forecast"}</small></th>`).join("")}<th>FY Forecast</th></tr></thead><tbody>${contas.length?contas.map(c=>{const r=docPor(realizados,c.id,cc,ano),f=docPor(forecasts,c.id,cc,ano,versao),rv={...vazioMeses(),...(r?.valores||{})},fv={...vazioMeses(),...(f?.valores||{})};const combinado=Object.fromEntries(MESES.map(([m],i)=>[m,i<fechado?rv[m]:fv[m]]));return`<tr data-forecast-conta="${c.id}"><td class="sticky-col conta-col"><strong>${esc(c.codigo)}</strong><span>${esc(c.nome)}</span></td>${MESES.map(([m],i)=>i<fechado?`<td class="fpa-readonly fechado" data-forecast-real="${m}">${fmt(rv[m])}</td>`:`<td><input class="fpa-cell-input forecast-editavel" data-forecast-mes="${m}" type="number" step="0.01" value="${n(fv[m])}"></td>`).join("")}<td class="fpa-total" data-forecast-total>${moeda(total(combinado))}</td></tr>`}).join(""):'<tr><td colspan="14">Cadastre contas no Plano de Contas Gerencial.</td></tr>'}</tbody>`;
  t.querySelectorAll("[data-forecast-mes]").forEach(inp=>on(inp,"input",e=>{const tr=e.target.closest("tr"),vals={};MESES.forEach(([m],i)=>{vals[m]=i<fechado?n(tr.querySelector(`[data-forecast-real="${m}"]`)?.textContent):n(tr.querySelector(`[data-forecast-mes="${m}"]`)?.value)});tr.querySelector("[data-forecast-total]").textContent=moeda(total(vals))}));
}

function valoresCenario(contaId,cc,ano,cenario){
  if(cenario==="realizado")return{...vazioMeses(),...(docPor(realizados,contaId,cc,ano)?.valores||{})};
  if(cenario==="budget"){const versao=$("budgetVersao")?.value.trim()||`Budget ${ano} - V1`;return{...vazioMeses(),...(docPor(budgets,contaId,cc,ano,versao)?.valores||{})}}
  const versao=$("forecastVersao")?.value.trim()||"F01",fechado=Number($("forecastFechadoAte")?.value||0),r={...vazioMeses(),...(docPor(realizados,contaId,cc,ano)?.valores||{})},f={...vazioMeses(),...(docPor(forecasts,contaId,cc,ano,versao)?.valores||{})};return Object.fromEntries(MESES.map(([m],i)=>[m,i<fechado?r[m]:f[m]]));
}
function renderDre(){
  const t=$("tabelaDre");if(!t)return;const ano=Number($("dreAno")?.value||anoAtual),cenario=$("dreCenario")?.value||"realizado",cc=centroSelecionado("dreCentro"),contas=contasAtivas();
  const linhas=[];for(const [gid,gnome] of Object.entries(GRUPOS)){const gs=contas.filter(c=>c.grupoDre===gid);if(!gs.length)continue;const soma=vazioMeses();gs.forEach(c=>{const v=valoresCenario(c.id,cc,ano,cenario),sinal=c.natureza==="receita"?1:-1;MESES.forEach(([m])=>soma[m]+=sinal*n(v[m]))});linhas.push({nome:gnome,valores:soma,total:total(soma)});gs.forEach(c=>{const v=valoresCenario(c.id,cc,ano,cenario),sinal=c.natureza==="receita"?1:-1;linhas.push({nome:`${c.codigo} · ${c.nome}`,valores:Object.fromEntries(MESES.map(([m])=>[m,sinal*n(v[m])])),total:sinal*total(v),filha:true})})}
  const resultado=vazioMeses();linhas.filter(x=>!x.filha).forEach(x=>MESES.forEach(([m])=>resultado[m]+=n(x.valores[m])));
  t.innerHTML=`<thead><tr><th class="sticky-col conta-col">DRE ${ano}</th>${MESES.map(([,m])=>`<th>${m}</th>`).join("")}<th>Total</th></tr></thead><tbody>${linhas.map(l=>`<tr class="${l.filha?"dre-filha":"dre-grupo"}"><td class="sticky-col conta-col">${esc(l.nome)}</td>${MESES.map(([m])=>`<td class="numero">${moeda(l.valores[m])}</td>`).join("")}<td class="fpa-total">${moeda(l.total)}</td></tr>`).join("")}<tr class="dre-resultado"><td class="sticky-col conta-col"><strong>RESULTADO</strong></td>${MESES.map(([m])=>`<td><strong>${moeda(resultado[m])}</strong></td>`).join("")}<td><strong>${moeda(total(resultado))}</strong></td></tr></tbody>`;
}

async function salvarRealizado(){
  if(!permite("controladoria","editar")&&!permite("controladoria","importar"))return msg($("mensagemRealizado"),"Seu perfil não permite alterar o realizado.");
  const ano=Number($("realizadoAno").value),cc=centroSelecionado("realizadoCentro"),trs=[...$("tabelaRealizado").querySelectorAll("tbody tr[data-realizado-conta]")];msg($("mensagemRealizado"),"Salvando...");
  try{for(const tr of trs){const contaId=tr.dataset.realizadoConta,valores=Object.fromEntries(MESES.map(([m])=>[m,n(tr.querySelector(`[data-realizado-mes="${m}"]`)?.value)])),exist=docPor(realizados,contaId,cc,ano);const d={contaId,centroCustoId:cc,exercicio:ano,valores};if(exist)await atualizarDocumento("realizadoMensal",exist.id,d);else await criarDocumento("realizadoMensal",d)}await carregarBases();msg($("mensagemRealizado"),"Realizado salvo.",true)}catch(e){console.error(e);msg($("mensagemRealizado"),"Não foi possível salvar o realizado.")}
}
async function salvarBudget(){
  if(!permite("controladoria","budget")&&!permite("controladoria","editar"))return msg($("mensagemBudget"),"Seu perfil não permite alterar o Budget.");
  const ano=Number($("budgetAno").value),versao=$("budgetVersao").value.trim()||`Budget ${ano} - V1`,cc=centroSelecionado("budgetCentro"),trs=[...$("tabelaBudget").querySelectorAll("tbody tr[data-budget-conta]")];msg($("mensagemBudget"),"Salvando...");
  try{for(const tr of trs){const contaId=tr.dataset.budgetConta,valores=valoresLinhaBudget(tr),premissaId=tr.querySelector("[data-budget-premissa]")?.value||"",exist=docPor(budgets,contaId,cc,ano,versao),d={contaId,centroCustoId:cc,exercicio:ano,versao,premissaId,valores,status:exist?.status||"rascunho"};if(exist)await atualizarDocumento("budgetLinhas",exist.id,d);else await criarDocumento("budgetLinhas",d)}await carregarBases();msg($("mensagemBudget"),"Budget salvo.",true)}catch(e){console.error(e);msg($("mensagemBudget"),"Não foi possível salvar o Budget.")}
}
async function salvarForecast(){
  if(!permite("controladoria","forecast")&&!permite("controladoria","editar"))return msg($("mensagemForecast"),"Seu perfil não permite alterar o Forecast.");
  const ano=Number($("forecastAno").value),versao=$("forecastVersao").value.trim()||"F01",fechado=Number($("forecastFechadoAte").value||0),cc=centroSelecionado("forecastCentro"),trs=[...$("tabelaForecast").querySelectorAll("tbody tr[data-forecast-conta]")];msg($("mensagemForecast"),"Salvando...");
  try{for(const tr of trs){const contaId=tr.dataset.forecastConta,valores=vazioMeses();MESES.forEach(([m],i)=>{if(i>=fechado)valores[m]=n(tr.querySelector(`[data-forecast-mes="${m}"]`)?.value)});const exist=docPor(forecasts,contaId,cc,ano,versao),d={contaId,centroCustoId:cc,exercicio:ano,versao,realizadoFechadoAte:fechado,valores,status:exist?.status||"rascunho"};if(exist)await atualizarDocumento("forecastLinhas",exist.id,d);else await criarDocumento("forecastLinhas",d)}await carregarBases();msg($("mensagemForecast"),"Forecast salvo.",true)}catch(e){console.error(e);msg($("mensagemForecast"),"Não foi possível salvar o Forecast.")}
}

function bind(){
  document.querySelectorAll(".fpa-tab").forEach(b=>on(b,"click",()=>abrirAba(b.dataset.fpaTab)));
  on($("btnNovaContaGerencial"),"click",()=>abrirConta());on($("btnCancelarContaGerencial"),"click",()=>$("formContaGerencialContainer")?.classList.add("hidden"));
  on($("formContaGerencial"),"submit",async e=>{e.preventDefault();const d={codigo:$("contaGerencialCodigo").value.trim(),nome:$("contaGerencialNome").value.trim(),grupoDre:$("contaGerencialGrupo").value,natureza:$("contaGerencialNatureza").value,ordem:n($("contaGerencialOrdem").value),status:$("contaGerencialStatus").value};if(!d.codigo||!d.nome)return msg($("mensagemContaGerencial"),"Informe código e conta.");try{if(contaEditId)await atualizarDocumento("planoContasGerencial",contaEditId,d);else await criarDocumento("planoContasGerencial",d);$("formContaGerencialContainer").classList.add("hidden");await carregarBases()}catch(err){console.error(err);msg($("mensagemContaGerencial"),"Não foi possível salvar a conta.")}});
  on($("btnNovoCentroCusto"),"click",()=>abrirCentro());on($("btnCancelarCentroCusto"),"click",()=>$("formCentroCustoContainer")?.classList.add("hidden"));
  on($("formCentroCusto"),"submit",async e=>{e.preventDefault();const d={codigo:$("centroCustoCodigo").value.trim(),nome:$("centroCustoNome").value.trim(),responsavel:$("centroCustoResponsavel").value.trim(),status:$("centroCustoStatus").value};if(!d.codigo||!d.nome)return msg($("mensagemCentroCusto"),"Informe código e centro de custo.");try{if(centroEditId)await atualizarDocumento("centrosCusto",centroEditId,d);else await criarDocumento("centrosCusto",d);$("formCentroCustoContainer").classList.add("hidden");await carregarBases()}catch(err){console.error(err);msg($("mensagemCentroCusto"),"Não foi possível salvar o centro.")}});
  on($("btnNovaPremissa"),"click",()=>abrirPremissa());on($("btnCancelarPremissa"),"click",()=>$("formPremissaContainer")?.classList.add("hidden"));
  on($("formPremissa"),"submit",async e=>{e.preventDefault();const d={nome:$("premissaNome").value.trim(),tipo:$("premissaTipo").value,percentual:n($("premissaPercentual").value),valorFixo:n($("premissaValorFixo").value),observacao:$("premissaObservacao").value.trim(),ativo:true};if(!d.nome)return msg($("mensagemPremissa"),"Informe o nome da premissa.");try{if(premissaEditId)await atualizarDocumento("premissasPlanejamento",premissaEditId,d);else await criarDocumento("premissasPlanejamento",d);$("formPremissaContainer").classList.add("hidden");await carregarBases()}catch(err){console.error(err);msg($("mensagemPremissa"),"Não foi possível salvar a premissa.")}});
  on($("btnCarregarRealizado"),"click",renderRealizado);on($("btnSalvarRealizado"),"click",salvarRealizado);on($("realizadoAno"),"change",renderRealizado);on($("realizadoCentro"),"change",renderRealizado);
  on($("btnCarregarBudget"),"click",renderBudget);on($("btnSalvarBudget"),"click",salvarBudget);on($("budgetAno"),"change",()=>{if($("budgetVersao").value.startsWith("Budget "))$("budgetVersao").value=`Budget ${$("budgetAno").value} - V1`;renderBudget()});on($("budgetVersao"),"change",renderBudget);on($("budgetCentro"),"change",renderBudget);on($("btnAplicarTodasPremissas"),"click",()=>$("tabelaBudget").querySelectorAll("tbody tr[data-budget-conta]").forEach(aplicarPremissaLinha));
  on($("btnCarregarForecast"),"click",renderForecast);on($("btnSalvarForecast"),"click",salvarForecast);["forecastAno","forecastVersao","forecastFechadoAte","forecastCentro"].forEach(id=>on($(id),"change",renderForecast));
  on($("btnAtualizarDre"),"click",renderDre);["dreAno","dreCenario","dreCentro"].forEach(id=>on($(id),"change",renderDre));
}

montarTela();bind();
window.addEventListener("sig:page",e=>{if(e.detail?.pagina==="controladoria"&&empresaAtualId()&&(carregadoEmpresa!==empresaAtualId()||!plano.length))carregarBases()});
window.addEventListener("sig:empresa-changed",()=>{carregadoEmpresa="";plano=[];centros=[];premissas=[];realizados=[];budgets=[];forecasts=[];if(!pagina?.classList.contains("hidden"))carregarBases()});
