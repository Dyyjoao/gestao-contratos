import { abrirPagina, admin } from "./core.js";
import { $, esc, msg, permite, state, listarDocumentos, criarDocumento, atualizarDocumento, empresaUnicaSelecionadaId, dataBr, emitirAlteracao } from "./shared.js";
import { confirmarAcaoAdministrativa, atualizarComAuditoria } from "./admin-actions.js";
import { periodoAtual } from "./company-context.js";
import { colaboradoresPorFuncao } from "./hr-role-registry.js?v=6";
import { carregarConfiguracaoModulo, salvarConfiguracaoModulo } from "./module-settings.js";

let abastecimentos=[],compras=[],veiculos=[],motoristas=[],auditoriasTanque=[],configCombustivel={},aba="abastecimentos",editId=null,busy=false,veiculoFiltroId="",auditMesDetalhe="";
const pode=a=>admin()||permite("combustivel",a);
const ver=()=>["visualizar","lancar","editar"].some(pode);
const frotaVer=()=>admin()||permite("frota","visualizar")||permite("frota","cadastrar")||permite("frota","editar")||permite("frota","manutencao")||permite("frota","obrigacoes");
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const fmt=v=>num(v).toLocaleString("pt-BR",{maximumFractionDigits:2});
const money=v=>num(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const localIso=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`};
const emp=()=>empresaUnicaSelecionadaId();
const ativosAbastecimento=()=>abastecimentos.filter(x=>x.status!=="estornado"&&x.tipo!=="recebimento");
const comprasAtivas=()=>compras.filter(x=>x.status!=="estornado");
const nomeVeiculo=v=>[v?.marca,v?.modelo].filter(Boolean).join(" ")||v?.placa||"Veículo";

function periodoCombustivel(){
  const p=periodoAtual(),meses=p.indices.map(i=>String(i+1).padStart(2,"0"));
  const ultimoMes=Number(meses.at(-1)),fimDia=new Date(p.ano,ultimoMes,0).getDate();
  return{...p,meses,inicio:`${p.ano}-${meses[0]}-01`,fim:`${p.ano}-${meses.at(-1)}-${String(fimDia).padStart(2,"0")}`};
}
function dentroPeriodo(x,p){const ym=String(x.data||"").slice(0,7);return p.meses.some(m=>ym===`${p.ano}-${m}`)}
function veiculoPorId(id){return veiculos.find(v=>v.id===id)}
function veiculoPorPlaca(placa){return veiculos.find(v=>v.placa===placa&&v.empresaId===emp())}
function ultimoAbastecimento(veiculoId,{antesData="",ignorarId=""}={}){
  return ativosAbastecimento().filter(x=>x.veiculoId===veiculoId&&x.id!==ignorarId&&(!antesData||x.data<=antesData)&&x.kmAtual!=null)
    .sort((a,b)=>String(b.data).localeCompare(String(a.data))||String(b.criadoEm||"").localeCompare(String(a.criadoEm||"")))[0]||null;
}
function kmBaseVeiculo(v,data="",ignorarId=""){
  const ultimo=ultimoAbastecimento(v?.id,{antesData:data,ignorarId});
  if(ultimo)return num(ultimo.kmAtual);
  return num(v?.quilometragemInicial??v?.quilometragemAtual);
}

function garantirCss(){
  if(document.getElementById("fuel-audit-css"))return;
  const s=document.createElement("style");s.id="fuel-audit-css";s.textContent=`
    .fuel-ranking{display:grid;gap:10px}.fuel-rank-row{display:grid;grid-template-columns:minmax(150px,230px) minmax(160px,1fr) 120px 100px;gap:10px;align-items:center}.fuel-rank-row[data-fuel-veiculo]{cursor:pointer;border:1px solid transparent;border-radius:10px;padding:8px 10px;transition:background .15s ease,border-color .15s ease,box-shadow .15s ease}.fuel-rank-row[data-fuel-veiculo]:hover{background:#f7fafb;border-color:#dce5ea}.fuel-rank-row[data-fuel-veiculo].ativo{background:#eaf7f5;border-color:#20b6a5;box-shadow:0 0 0 2px rgba(32,182,165,.10)}
    .fuel-rank-name{display:grid}.fuel-rank-name small{color:#7b8794}.fuel-rank-track,.fuel-audit-track{height:14px;background:#edf1f4;border-radius:999px;overflow:hidden}.fuel-rank-track i,.fuel-audit-track i{display:block;height:100%;background:#0b1f33;border-radius:999px}
    .fuel-audit-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.fuel-audit-card{padding:14px;border:1px solid #e4e9ed;border-radius:12px;background:#fff}.fuel-audit-card span{display:block;font-size:11px;color:#667085}.fuel-audit-card strong{display:block;margin-top:4px;font-size:20px}
    .fuel-tank{margin-top:16px;border:1px solid #dfe6eb;border-radius:14px;padding:14px}.fuel-tank-bar{height:28px;border-radius:10px;background:#eef2f5;overflow:hidden}.fuel-tank-bar i{display:block;height:100%;background:#0b1f33}.fuel-tank-meta{display:flex;justify-content:space-between;gap:12px;margin-top:7px;font-size:11px;color:#667085}
    .fuel-audit-months{display:grid;gap:11px}.fuel-audit-month{display:grid;grid-template-columns:44px minmax(180px,1fr) 110px 110px 120px;gap:10px;align-items:center}.fuel-audit-bars{display:grid;gap:4px}.fuel-audit-bars .entrada i{background:#0c9488}.fuel-audit-bars .saida i{background:#0b1f33}.fuel-chart-legend{display:flex;gap:16px;flex-wrap:wrap;align-items:center;margin:4px 0 14px;font-size:12px;color:#667085}.fuel-chart-legend span{display:inline-flex;align-items:center;gap:6px}.fuel-chart-legend i{width:12px;height:12px;border-radius:3px;display:inline-block}.fuel-chart-legend i.entrada{background:#0c9488}.fuel-chart-legend i.saida{background:#0b1f33}.fuel-chart-legend i.ajuste{background:#b54708}.fuel-chart-legend i.saldo{background:#98a2b3}
    .fuel-config-form{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;align-items:end}.fuel-config-note{font-size:11px;color:#667085;margin:6px 0 0}.fuel-audit-point-form{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;align-items:end}.fuel-diff-pos{color:#b54708}.fuel-diff-neg{color:#b42318}.fuel-diff-ok{color:#027a48}.fuel-audit-chart{display:grid;gap:9px}.fuel-audit-point-row{display:grid;grid-template-columns:90px minmax(160px,1fr) 110px 110px 110px;gap:10px;align-items:center}.fuel-audit-point-row[data-audit-mes]{cursor:pointer;border:1px solid transparent;border-radius:10px;padding:7px 9px;transition:background .15s ease,border-color .15s ease}.fuel-audit-point-row[data-audit-mes]:hover{background:#f7fafb;border-color:#dce5ea}.fuel-audit-point-row[data-audit-mes].ativo{background:#eef8f6;border-color:#20b6a5}.fuel-diff-track{height:12px;background:#eef2f5;border-radius:999px;overflow:hidden;position:relative}.fuel-diff-track i{display:block;height:100%;background:#b42318;border-radius:999px}.fuel-diff-track i.pos{background:#b54708}.fuel-audit-history{margin-top:14px}
    @media(max-width:850px){.fuel-ranking,.fuel-audit-months,.fuel-audit-chart{overflow-x:auto}.fuel-rank-row{min-width:650px}.fuel-audit-month{min-width:620px}.fuel-audit-point-row{min-width:680px}.fuel-audit-grid{grid-template-columns:1fr 1fr}.fuel-config-form,.fuel-audit-point-form{grid-template-columns:1fr}}
  `;document.head.appendChild(s)
}

function montar(){
  if($("pagina-combustivel"))return;
  const main=document.querySelector("main.conteudo");if(!main)return;garantirCss();
  const s=document.createElement("section");s.id="pagina-combustivel";s.className="pagina hidden production-page";s.innerHTML=`
  <div class="fleet-module-head">
    <div class="pagina-cabecalho production-head">
      <div><span class="eyebrow">FROTA</span><h2>Combustível e Diesel</h2><p>Abastecimentos, compras de diesel e auditoria física do tanque.</p></div>
      <div class="acoes-cabecalho"><button id="fuelNovo" class="btn-primario" type="button">+ Novo abastecimento</button><button id="fuelAtualizar" class="btn-secundario" type="button">Atualizar</button></div>
    </div>
    <div class="fleet-tabs">
      <button id="fuelTabMov" class="fleet-tab" type="button">Abastecimentos</button>
      <button id="fuelTabCusto" class="fleet-tab" type="button">Compra de diesel</button>
      <button id="fuelTabAuditoria" class="fleet-tab" type="button">Auditoria da bomba</button>
    </div>
  </div>
  <div id="fuelAviso" class="modulo-aviso hidden"></div>
  <div id="fuelKpis" class="production-kpis">
    <div class="kpi-card"><span id="fuelLabelA">—</span><strong id="fuelValorA">—</strong></div>
    <div class="kpi-card"><span id="fuelLabelB">—</span><strong id="fuelValorB">—</strong></div>
    <div class="kpi-card"><span id="fuelLabelC">—</span><strong id="fuelValorC">—</strong></div>
  </div>

  <section id="fuelFormBox" class="form-card hidden">
    <div class="form-card-titulo"><h3 id="fuelFormTitulo">Novo abastecimento</h3></div>
    <form id="fuelForm"><div class="form-grid form-grid-3">
      <div class="campo"><label for="fuelData">Data</label><input id="fuelData" type="date" required></div>
      <div class="campo" data-fuel-abastecimento><label for="fuelMotorista">Motorista</label><select id="fuelMotorista"></select></div>
      <div class="campo" data-fuel-abastecimento><label for="fuelPlaca">Veículo / placa</label><select id="fuelPlaca"></select></div>
      <div class="campo" data-fuel-abastecimento><label for="fuelKmAtual">KM atual</label><input id="fuelKmAtual" type="number" min="0" step="1" required><small>O SIG compara internamente com o último KM registrado do veículo.</small></div>
      <div class="campo" data-fuel-abastecimento><label for="fuelQuantidade">Quantidade abastecida (litros)</label><input id="fuelQuantidade" type="number" min="0.01" step="0.01" required></div>

      <div class="campo" data-fuel-compra><label for="fuelNf">NF</label><input id="fuelNf" maxlength="40" placeholder="Número da nota fiscal"></div>
      <div class="campo" data-fuel-compra><label for="fuelLitrosCompra">Quantidade comprada (litros)</label><input id="fuelLitrosCompra" type="number" min="0.01" step="0.01"></div>
      <div class="campo" data-fuel-compra><label for="fuelValor">Valor total da compra (R$)</label><input id="fuelValor" type="number" min="0" step="0.01"></div>
      <div class="campo" data-fuel-compra><label for="fuelCustoLitro">Custo por litro</label><input id="fuelCustoLitro" type="text" readonly placeholder="Calculado automaticamente"></div>
    </div><div class="form-acoes"><button id="fuelCancelar" class="btn-secundario" type="button">Cancelar</button><button class="btn-primario" type="submit">Salvar</button></div><p id="fuelMensagem" class="mensagem-form"></p></form>
  </section>

  <section id="fuelRankingBox" class="lista-card">
    <div class="lista-cabecalho"><div><h3>Consumo por veículo</h3><p id="fuelRankingSub">Ranking de todos os veículos da frota no período geral selecionado. Clique em um veículo para filtrar os abastecimentos.</p></div></div>
    <div id="fuelRanking" class="fuel-ranking"></div>
  </section>

  <section id="fuelHistoricoBox" class="lista-card">
    <div class="lista-cabecalho production-toolbar"><div><h3 id="fuelHistoricoTitulo">Abastecimentos</h3><p id="fuelHistoricoSub">KM anterior é obtido automaticamente e o KM atual atualiza a ficha do veículo.</p></div></div>
    <div class="tabela-container"><table class="tabela"><thead id="fuelCabecalho"></thead><tbody id="fuelLista"></tbody></table></div>
  </section>

  <section id="fuelGraficoComprasBox" class="lista-card hidden">
    <div class="lista-cabecalho"><div><h3>Compras de diesel por mês</h3><p>Valor comprado e custo médio por litro dentro do filtro geral.</p></div></div><div id="fuelGraficoCompras"></div>
  </section>

  <section id="fuelAuditoriaBox" class="hidden">
    <section class="lista-card">
      <div class="lista-cabecalho"><div><h3>Configuração do tanque</h3><p>Estoque inicial e capacidade são parâmetros administrativos.</p></div><span class="badge">Somente ADM</span></div>
      <div id="fuelConfigTanqueCampos" class="fuel-config-form">
        <div class="campo"><label for="fuelEstoqueInicialData">Data do estoque inicial</label><input id="fuelEstoqueInicialData" type="date"></div>
        <div class="campo"><label for="fuelEstoqueInicialLitros">Estoque inicial (litros)</label><input id="fuelEstoqueInicialLitros" type="number" min="0" step="0.01"></div>
        <div class="campo"><label for="fuelCapacidadeTanque">Capacidade do tanque (litros)</label><input id="fuelCapacidadeTanque" type="number" min="0" step="0.01"></div>
      </div>
      <div class="form-acoes"><button id="fuelSalvarTanque" class="btn-primario" type="button">Salvar configuração do tanque</button></div>
      <p class="fuel-config-note">Usuários não administradores apenas consultam estes parâmetros.</p>
    </section>
    <section class="lista-card"><div class="lista-cabecalho"><div><h3>Posição teórica da bomba</h3><p id="fuelAuditoriaPeriodo">—</p></div></div><div id="fuelAuditoriaResumo"></div></section>
    <section class="lista-card">
      <div class="lista-cabecalho"><div><h3>Conferência física do tanque</h3><p>Informe o saldo encontrado na bomba; a diferença vira ajuste de inventário a partir da conferência, sem apagar a falha operacional.</p></div></div>
      <div class="fuel-audit-point-form">
        <div class="campo"><label for="fuelAuditData">Data da conferência</label><input id="fuelAuditData" type="date"></div>
        <div class="campo"><label for="fuelAuditSaldoFisico">Saldo físico encontrado (L)</label><input id="fuelAuditSaldoFisico" type="number" min="0" step="0.01"></div>
        <div class="campo"><label for="fuelAuditObservacao">Observação</label><input id="fuelAuditObservacao" maxlength="160" placeholder="Opcional"></div>
        <div class="campo"><button id="fuelSalvarAuditoria" class="btn-primario" type="button">Registrar conferência</button></div>
      </div>
      <p id="fuelAuditPreview" class="fuel-config-note">Informe a data e o saldo físico para calcular a diferença.</p>
      <div id="fuelAuditoriaHistorico" class="tabela-container fuel-audit-history"></div>
    </section>
    <section class="lista-card"><div class="lista-cabecalho"><div><h3>Movimentação mensal do tanque</h3><p>Entradas = compras de diesel · Saídas = abastecimentos registrados.</p></div></div><div class="fuel-chart-legend"><span><i class="entrada"></i>Entradas / compras</span><span><i class="saida"></i>Saídas / abastecimentos</span><span><i class="ajuste"></i>Ajuste de inventário</span><span><i class="saldo"></i>Saldo teórico ajustado</span></div><div id="fuelAuditoriaMeses" class="fuel-audit-months"></div></section>
    <section class="lista-card"><div class="lista-cabecalho"><div><h3>Diferenças de auditoria</h3><p>Apontamentos físicos consolidados por dia, mês e ano.</p></div></div><div id="fuelAuditGraficoDia" class="fuel-audit-chart"></div><div id="fuelAuditGraficoMes" class="fuel-audit-chart" style="margin-top:18px"></div><div id="fuelAuditGraficoAno" class="fuel-audit-chart" style="margin-top:18px"></div></section>
  </section>`;
  main.appendChild(s);
  $("fuelTabMov").onclick=()=>trocar("abastecimentos");
  $("fuelTabCusto").onclick=()=>trocar("compras");
  $("fuelTabAuditoria").onclick=()=>trocar("auditoria");
  $("fuelNovo").onclick=novo;
  $("fuelAtualizar").onclick=carregar;
  $("fuelCancelar").onclick=()=>{$("fuelFormBox").classList.add("hidden");limpar()};
  $("fuelForm").addEventListener("submit",salvar);
  $("fuelPlaca").addEventListener("change",preencherKm);
  $("fuelData").addEventListener("change",preencherKm);
  ["fuelLitrosCompra","fuelValor"].forEach(id=>$(id)?.addEventListener("input",calcularCustoLitro));
  $("fuelSalvarTanque").onclick=salvarConfiguracaoTanque;
  $("fuelSalvarAuditoria").onclick=salvarAuditoriaTanque;
  ["fuelAuditData","fuelAuditSaldoFisico"].forEach(id=>$(id)?.addEventListener("input",atualizarPreviewAuditoria));
  trocar("abastecimentos");
}
function menu(){const nav=document.querySelector(".sidebar-menu");if(!nav)return;let b=$("menuCombustivel");if(!b){b=document.createElement("button");b.id="menuCombustivel";b.className="menu-item hidden";b.dataset.pagina="combustivel";b.type="button";b.textContent="Combustível e Diesel";const frota=$("menuFrota");if(frota)frota.insertAdjacentElement("afterend",b);else nav.appendChild(b);b.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();if(!ver())return;abrirPagina("combustivel");carregar()},true)}b.classList.toggle("hidden",!ver()||!frotaVer())}

function trocar(k){
  aba=k;editId=null;if(k!=="abastecimentos")veiculoFiltroId="";$("fuelFormBox")?.classList.add("hidden");
  $("fuelTabMov")?.classList.toggle("ativo",k==="abastecimentos");$("fuelTabCusto")?.classList.toggle("ativo",k==="compras");$("fuelTabAuditoria")?.classList.toggle("ativo",k==="auditoria");
  document.querySelectorAll("[data-fuel-abastecimento]").forEach(x=>{x.classList.toggle("hidden",k!=="abastecimentos");x.querySelectorAll("input,select").forEach(i=>i.disabled=k!=="abastecimentos")});
  document.querySelectorAll("[data-fuel-compra]").forEach(x=>{x.classList.toggle("hidden",k!=="compras");x.querySelectorAll("input,select").forEach(i=>i.disabled=k!=="compras")});
  $("fuelHistoricoBox")?.classList.toggle("hidden",k==="auditoria");$("fuelRankingBox")?.classList.toggle("hidden",k!=="abastecimentos");$("fuelGraficoComprasBox")?.classList.toggle("hidden",k!=="compras");$("fuelAuditoriaBox")?.classList.toggle("hidden",k!=="auditoria");$("fuelKpis")?.classList.toggle("hidden",k==="auditoria");
  $("fuelNovo")?.classList.toggle("hidden",k==="auditoria"||!pode("lancar"));
  if(k==="abastecimentos"){$("fuelNovo").textContent="+ Novo abastecimento";$("fuelHistoricoTitulo").textContent="Abastecimentos";$("fuelHistoricoSub").textContent="KM anterior automático, KM atual informado e litros abastecidos."}
  if(k==="compras"){$("fuelNovo").textContent="+ Nova compra";$("fuelHistoricoTitulo").textContent="Compras de diesel";$("fuelHistoricoSub").textContent="Data da compra, NF, litros, valor total e custo por litro."}
  render()
}
function limpar(){editId=null;$("fuelForm").reset();$("fuelData").value=localIso();$("fuelFormTitulo").textContent=aba==="compras"?"Nova compra de diesel":"Novo abastecimento";calcularCustoLitro();preencherMotoristas();preencherVeiculos();preencherKm();msg($("fuelMensagem"),"")}
function calcularCustoLitro(){const litros=num($("fuelLitrosCompra")?.value),total=num($("fuelValor")?.value),el=$("fuelCustoLitro");if(el)el.value=litros>0?money(total/litros):""}
function preencherMotoristas(valor=""){const s=$("fuelMotorista");if(!s)return;const atual=valor||s.value||"";s.innerHTML='<option value="">Selecione...</option>'+motoristas.map(p=>`<option value="${esc(p.nome)}">${esc(p.nome)} · ${esc(p.cargoNome||"Motorista")}</option>`).join("");if(atual&&![...s.options].some(o=>o.value===atual))s.add(new Option(`${atual} · vínculo anterior`,atual));s.value=atual}
function preencherVeiculos(valor=""){const s=$("fuelPlaca");if(!s)return;const atual=valor||s.value||"",empresaId=emp();s.innerHTML='<option value="">Selecione...</option>'+veiculos.filter(x=>x.empresaId===empresaId&&x.status!=="inativo"&&x.status!=="baixado").sort((a,b)=>String(a.placa).localeCompare(String(b.placa))).map(x=>`<option value="${esc(x.placa)}">${esc(x.placa)} · ${esc(nomeVeiculo(x))}</option>`).join("");if(atual)s.value=atual}
function preencherKm(){
  const placa=$("fuelPlaca")?.value,v=veiculoPorPlaca(placa),data=$("fuelData")?.value||localIso(),base=v?kmBaseVeiculo(v,data,editId):0;
  const kmAtual=$("fuelKmAtual"),motorista=$("fuelMotorista");
  if(kmAtual&&v)kmAtual.min=String(Math.trunc(base));
  if(v?.responsavel&&motorista&&!motorista.value){
    if(![...motorista.options].some(o=>o.value===v.responsavel))motorista.add(new Option(`${v.responsavel} · responsável do veículo`,v.responsavel));
    motorista.value=v.responsavel;
  }
}
function novo(){if(!pode("lancar")||aba==="auditoria")return;if(!emp())return alert("Selecione apenas uma empresa no cabeçalho.");limpar();$("fuelFormTitulo").textContent=aba==="compras"?"Nova compra de diesel":"Novo abastecimento";$("fuelFormBox").classList.remove("hidden");$("fuelFormBox").scrollIntoView({behavior:"smooth",block:"start"})}
function editarRegistro(id){if(!pode("editar"))return;const fonte=aba==="compras"?compras:abastecimentos,x=fonte.find(y=>y.id===id);if(!x||x.status!=="ativo"||x.empresaId!==emp())return;editId=id;$("fuelData").value=x.data;if(aba==="abastecimentos"){preencherMotoristas(x.motorista);preencherVeiculos(x.placa);$("fuelKmAtual").value=x.kmAtual??"";$("fuelQuantidade").value=x.quantidade;preencherKm()}else{$("fuelNf").value=x.nf||"";$("fuelLitrosCompra").value=x.quantidade||"";$("fuelValor").value=x.valorTotal??x.valor??"";calcularCustoLitro()}$("fuelFormTitulo").textContent="Editar lançamento";$("fuelFormBox").classList.remove("hidden");$("fuelFormBox").scrollIntoView({behavior:"smooth",block:"start"})}

function alternarFiltroVeiculo(id){veiculoFiltroId=veiculoFiltroId===id?"":id;render()}
function renderRanking(p){
  const host=$("fuelRanking");if(!host)return;
  const empresaId=emp(),ativosFrota=veiculos.filter(v=>v.empresaId===empresaId&&v.status!=="baixado");
  const rows=ativosFrota.map(v=>{const a=ativosAbastecimento().filter(x=>x.veiculoId===v.id&&dentroPeriodo(x,p)),litros=a.reduce((s,x)=>s+num(x.quantidade),0),km=a.reduce((s,x)=>s+(x.kmAtual!=null&&x.kmAnterior!=null?Math.max(0,num(x.kmAtual)-num(x.kmAnterior)):0),0);return{v,litros,km,kml:litros&&km?km/litros:0}}).sort((a,b)=>b.litros-a.litros);
  const max=Math.max(0,...rows.map(x=>x.litros));
  host.innerHTML=rows.map((x,i)=>`<div class="fuel-rank-row ${veiculoFiltroId===x.v.id?"ativo":""}" data-fuel-veiculo="${esc(x.v.id)}" role="button" tabindex="0" aria-pressed="${veiculoFiltroId===x.v.id?"true":"false"}"><div class="fuel-rank-name"><strong>${i+1}. ${esc(x.v.placa||"—")}</strong><small>${esc(nomeVeiculo(x.v))}</small></div><div class="fuel-rank-track"><i style="width:${max?Math.max(x.litros?3:0,x.litros/max*100):0}%"></i></div><strong>${fmt(x.litros)} L</strong><span>${x.kml?fmt(x.kml)+" km/L":"—"}</span></div>`).join("")||'<div class="rh-empty">Nenhum veículo cadastrado.</div>';
  host.querySelectorAll("[data-fuel-veiculo]").forEach(row=>{const go=()=>alternarFiltroVeiculo(row.dataset.fuelVeiculo);row.onclick=go;row.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();go()}}});
  const sub=$("fuelRankingSub"),v=veiculoPorId(veiculoFiltroId);if(sub)sub.textContent=v?`Filtrando abastecimentos de ${v.placa||"veículo"} · ${nomeVeiculo(v)}. Clique novamente para voltar ao geral.`:"Ranking de todos os veículos da frota no período geral selecionado. Clique em um veículo para filtrar os abastecimentos."
}
function renderCompras(p){
  const host=$("fuelGraficoCompras");if(!host)return;const meses=p.indices.map(i=>({mes:i+1,rotulo:new Date(2020,i,1).toLocaleDateString("pt-BR",{month:"short"}).replace(".",""),valor:0,litros:0}));
  comprasAtivas().filter(x=>dentroPeriodo(x,p)).forEach(x=>{const m=Number(String(x.data).slice(5,7)),alvo=meses.find(y=>y.mes===m);if(alvo){alvo.valor+=num(x.valorTotal??x.valor);alvo.litros+=num(x.quantidade)}});
  const max=Math.max(0,...meses.map(x=>x.valor));host.innerHTML='<div class="fuel-ranking">'+meses.map(x=>`<div class="fuel-rank-row"><div class="fuel-rank-name"><strong style="text-transform:capitalize">${esc(x.rotulo)}</strong><small>${fmt(x.litros)} L</small></div><div class="fuel-rank-track"><i style="width:${max?Math.max(x.valor?3:0,x.valor/max*100):0}%"></i></div><strong>${money(x.valor)}</strong><span>${x.litros?money(x.valor/x.litros)+"/L":"—"}</span></div>`).join("")+'</div>'
}

function saldoTeoricoAte(dataFim){
  const dataInicial=String(configCombustivel.estoqueInicialData||""),inicial=num(configCombustivel.estoqueInicialLitros);
  if(!dataInicial||dataFim<dataInicial)return{configurado:false,inicial:0,entradas:0,saidas:0,ajustes:0,saldo:0};
  const entradas=comprasAtivas().filter(x=>x.data>=dataInicial&&x.data<=dataFim).reduce((s,x)=>s+num(x.quantidade),0);
  const saidas=ativosAbastecimento().filter(x=>x.data>=dataInicial&&x.data<=dataFim).reduce((s,x)=>s+num(x.quantidade),0);
  const ajustes=auditoriasAtivas().filter(x=>x.empresaId===emp()&&x.data>=dataInicial&&x.data<=dataFim).reduce((s,x)=>s+num(x.diferenca),0);
  return{configurado:true,inicial,entradas,saidas,ajustes,saldo:inicial+entradas-saidas+ajustes}
}
function classeDiferenca(v){return Math.abs(num(v))<0.005?"fuel-diff-ok":num(v)>0?"fuel-diff-pos":"fuel-diff-neg"}
function auditoriasAtivas(){return auditoriasTanque.filter(x=>x.status!=="estornado")}
function atualizarPreviewAuditoria(){
  const data=$("fuelAuditData")?.value,saldo=Number($("fuelAuditSaldoFisico")?.value),out=$("fuelAuditPreview");if(!out)return;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(data)||!Number.isFinite(saldo)||saldo<0){out.textContent="Informe a data e o saldo físico para calcular a diferença.";out.className="fuel-config-note";return}
  const t=saldoTeoricoAte(data);if(!t.configurado){out.textContent="A data informada é anterior à configuração do estoque inicial.";out.className="fuel-config-note";return}
  const dif=saldo-t.saldo;out.textContent=`Teórico antes do ajuste: ${fmt(t.saldo)} L · Físico: ${fmt(saldo)} L · Ajuste de inventário: ${dif>=0?"+":""}${fmt(dif)} L · o próximo saldo partirá de ${fmt(saldo)} L`;out.className=`fuel-config-note ${classeDiferenca(dif)}`
}
async function salvarAuditoriaTanque(){
  if(!pode("lancar"))return alert("Seu perfil não possui permissão para lançar conferências de combustível.");
  const empresaId=emp(),data=$("fuelAuditData")?.value,saldoFisico=Number($("fuelAuditSaldoFisico")?.value),observacao=String($("fuelAuditObservacao")?.value||"").trim().slice(0,160);
  if(!empresaId)return alert("Selecione apenas uma empresa.");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(data)||!Number.isFinite(saldoFisico)||saldoFisico<0)return alert("Informe data e saldo físico válidos.");
  const pos=saldoTeoricoAte(data);if(!pos.configurado)return alert("A auditoria deve ocorrer a partir da data configurada para o estoque inicial.");
  const diferenca=saldoFisico-pos.saldo;
  try{
    await criarDocumento("auditoriasTanqueDiesel",{empresaId,data,saldoFisico,saldoTeorico:pos.saldo,diferenca,observacao,status:"ativo",origem:"sig",registradoPor:state.usuario?.id||""});
    $("fuelAuditSaldoFisico").value="";$("fuelAuditObservacao").value="";emitirAlteracao("combustivel");await carregar()
  }catch(e){console.error(e);alert(e?.code==="permission-denied"?"Gravação negada pelo Firestore. Publique as Rules atualizadas.":"Não foi possível registrar a conferência do tanque.")}
}
async function estornarAuditoriaTanque(id){
  if(!admin())return;const x=auditoriasTanque.find(a=>a.id===id&&a.status!=="estornado");if(!x)return;
  const ok=await confirmarAcaoAdministrativa({titulo:"Estornar conferência do tanque",descricao:`Conferência de ${dataBr(x.data)} · diferença ${fmt(x.diferenca)} L`,motivoLabel:"Motivo obrigatório",confirmarTexto:"Estornar",perigosa:true});if(!ok)return;
  try{await atualizarComAuditoria({colecao:"auditoriasTanqueDiesel",id,empresaId:x.empresaId,modulo:"combustivel",acao:"estorno",motivo:ok.motivo,resumo:`Estorno auditoria tanque ${x.data}`,snapshotAntes:x,alteracoes:{status:"estornado",motivoEstorno:ok.motivo,estornadoPor:state.usuario?.id||"",estornadoEm:new Date().toISOString()}});emitirAlteracao("combustivel");await carregar()}catch(e){console.error(e);alert("Não foi possível estornar a conferência.")}
}
function renderGraficoDiferencas(p){
  const ativos=auditoriasAtivas().filter(x=>x.empresaId===emp());
  const mesesPermitidos=new Set(p.indices.map(i=>i+1));
  if(auditMesDetalhe&&!mesesPermitidos.has(Number(auditMesDetalhe)))auditMesDetalhe="";

  const meses=p.indices.map(i=>({mes:i+1,dif:0,qtd:0}));
  ativos.filter(x=>String(x.data||"").startsWith(String(p.ano))).forEach(x=>{
    const m=Number(String(x.data).slice(5,7));
    const alvo=meses.find(y=>y.mes===m);
    if(alvo){alvo.dif+=num(x.diferenca);alvo.qtd++}
  });

  const maxMes=Math.max(1,...meses.map(x=>Math.abs(x.dif)));
  const mes=$("fuelAuditGraficoMes");
  if(mes){
    mes.innerHTML='<strong>Por mês · '+p.label+' '+p.ano+'</strong>'+meses.map(x=>{
      const rot=new Date(2020,x.mes-1,1).toLocaleDateString("pt-BR",{month:"short"}).replace(".","");
      return `<div class="fuel-audit-point-row ${Number(auditMesDetalhe)===x.mes?"ativo":""}" data-audit-mes="${x.mes}" role="button" tabindex="0"><span style="text-transform:capitalize">${rot}</span><div class="fuel-diff-track"><i class="${x.dif>0?"pos":""}" style="width:${Math.abs(x.dif)/maxMes*100}%"></i></div><span>${x.qtd} conferência(s)</span><span>Saldo das diferenças</span><strong class="${classeDiferenca(x.dif)}">${x.dif>=0?"+":""}${fmt(x.dif)} L</strong></div>`
    }).join("");
    mes.querySelectorAll("[data-audit-mes]").forEach(row=>{
      const abrir=()=>{const m=Number(row.dataset.auditMes);auditMesDetalhe=Number(auditMesDetalhe)===m?"":String(m);renderGraficoDiferencas(p)};
      row.onclick=abrir;row.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();abrir()}}
    });
  }

  const dia=$("fuelAuditGraficoDia");
  if(dia){
    if(!auditMesDetalhe){
      dia.innerHTML='<strong>Detalhamento diário</strong><p class="fuel-config-note">Clique em um mês acima para abrir as conferências por dia.</p>';
    }else{
      const prefix=`${p.ano}-${String(auditMesDetalhe).padStart(2,"0")}`;
      const periodo=ativos.filter(x=>String(x.data||"").startsWith(prefix)).sort((a,b)=>String(a.data).localeCompare(String(b.data)));
      const maxDia=Math.max(1,...periodo.map(x=>Math.abs(num(x.diferenca))));
      const rot=new Date(p.ano,Number(auditMesDetalhe)-1,1).toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
      dia.innerHTML='<strong>Detalhamento diário · '+rot+'</strong>'+(periodo.length?periodo.map(x=>`<div class="fuel-audit-point-row"><span>${dataBr(x.data)}</span><div class="fuel-diff-track"><i class="${num(x.diferenca)>0?"pos":""}" style="width:${Math.abs(num(x.diferenca))/maxDia*100}%"></i></div><span>Teórico ${fmt(x.saldoTeorico)} L</span><span>Físico ${fmt(x.saldoFisico)} L</span><strong class="${classeDiferenca(x.diferenca)}">${num(x.diferenca)>=0?"+":""}${fmt(x.diferenca)} L</strong></div>`).join(""):'<p class="fuel-config-note">Sem conferências neste mês.</p>');
    }
  }

  const ano=$("fuelAuditGraficoAno");
  if(ano){
    const difPeriodo=meses.reduce((s,x)=>s+x.dif,0),qtdPeriodo=meses.reduce((s,x)=>s+x.qtd,0);
    ano.innerHTML='<strong>Resumo do filtro</strong>'+ `<div class="fuel-audit-point-row"><span>${p.ano}</span><div class="fuel-diff-track"><i class="${difPeriodo>0?"pos":""}" style="width:${Math.abs(difPeriodo)>0?100:0}%"></i></div><span>${qtdPeriodo} conferência(s)</span><span>${p.label}</span><strong class="${classeDiferenca(difPeriodo)}">${difPeriodo>=0?"+":""}${fmt(difPeriodo)} L</strong></div>`;
  }
}
function renderAuditoria(p){
  const dataInicial=String(configCombustivel.estoqueInicialData||""),inicial=num(configCombustivel.estoqueInicialLitros),capacidade=num(configCombustivel.capacidadeTanqueLitros);
  $("fuelEstoqueInicialData").value=dataInicial;$("fuelEstoqueInicialLitros").value=inicial||"";$("fuelCapacidadeTanque").value=capacidade||"";["fuelEstoqueInicialData","fuelEstoqueInicialLitros","fuelCapacidadeTanque","fuelSalvarTanque"].forEach(id=>{if($(id))$(id).disabled=!admin()});$("fuelSalvarTanque")?.classList.toggle("hidden",!admin());
  $("fuelAuditoriaPeriodo").textContent=`Posição acumulada até ${dataBr(p.fim)} · filtro atual: ${p.label} ${p.ano}`;
  const pos=saldoTeoricoAte(p.fim),entradasPeriodo=comprasAtivas().filter(x=>dentroPeriodo(x,p)).reduce((s,x)=>s+num(x.quantidade),0),saidasPeriodo=ativosAbastecimento().filter(x=>dentroPeriodo(x,p)).reduce((s,x)=>s+num(x.quantidade),0),ajustesPeriodo=auditoriasAtivas().filter(x=>x.empresaId===emp()&&dentroPeriodo(x,p)).reduce((s,x)=>s+num(x.diferenca),0),pct=capacidade>0?Math.max(0,Math.min(100,pos.saldo/capacidade*100)):0;
  $("fuelAuditoriaResumo").innerHTML=pos.configurado?`<div class="fuel-audit-grid"><div class="fuel-audit-card"><span>Estoque inicial</span><strong>${fmt(pos.inicial)} L</strong><small>${dataBr(dataInicial)}</small></div><div class="fuel-audit-card"><span>Entradas acumuladas</span><strong>${fmt(pos.entradas)} L</strong><small>Compras desde o estoque inicial</small></div><div class="fuel-audit-card"><span>Saídas acumuladas</span><strong>${fmt(pos.saidas)} L</strong><small>Abastecimentos registrados</small></div><div class="fuel-audit-card"><span>Ajustes de inventário</span><strong class="${classeDiferenca(pos.ajustes)}">${pos.ajustes>=0?"+":""}${fmt(pos.ajustes)} L</strong><small>Diferenças físicas acumuladas</small></div></div><div class="fuel-audit-grid" style="margin-top:12px"><div class="fuel-audit-card"><span>Saldo teórico ajustado</span><strong>${fmt(pos.saldo)} L</strong><small>Base para a próxima conferência</small></div></div><div class="fuel-tank"><strong>Nível teórico do tanque</strong><div class="fuel-tank-bar"><i style="width:${capacidade?pct:0}%"></i></div><div class="fuel-tank-meta"><span>${capacidade?`${fmt(pct)}% da capacidade`:"Cadastre a capacidade para visualizar o nível"}</span><span>${capacidade?`${fmt(pos.saldo)} / ${fmt(capacidade)} L`:`${fmt(pos.saldo)} L`}</span></div></div><div class="fuel-audit-grid" style="margin-top:12px"><div class="fuel-audit-card"><span>Entradas no período</span><strong>${fmt(entradasPeriodo)} L</strong></div><div class="fuel-audit-card"><span>Saídas no período</span><strong>${fmt(saidasPeriodo)} L</strong></div><div class="fuel-audit-card"><span>Ajustes no período</span><strong class="${classeDiferenca(ajustesPeriodo)}">${ajustesPeriodo>=0?"+":""}${fmt(ajustesPeriodo)} L</strong></div><div class="fuel-audit-card"><span>Movimento líquido ajustado</span><strong>${fmt(entradasPeriodo-saidasPeriodo+ajustesPeriodo)} L</strong></div></div>`:'<div class="modulo-aviso">Configure a data e o estoque inicial do tanque para iniciar a auditoria da bomba.</div>';
  const meses=p.indices.map(i=>({mes:i+1,rotulo:new Date(2020,i,1).toLocaleDateString("pt-BR",{month:"short"}).replace(".",""),entrada:0,saida:0,ajuste:0,saldo:0}));
  meses.forEach(m=>{const prefix=`${p.ano}-${String(m.mes).padStart(2,"0")}`;m.entrada=comprasAtivas().filter(x=>String(x.data).startsWith(prefix)).reduce((s,x)=>s+num(x.quantidade),0);m.saida=ativosAbastecimento().filter(x=>String(x.data).startsWith(prefix)).reduce((s,x)=>s+num(x.quantidade),0);m.ajuste=auditoriasAtivas().filter(x=>x.empresaId===emp()&&String(x.data).startsWith(prefix)).reduce((s,x)=>s+num(x.diferenca),0);const fimMes=new Date(p.ano,m.mes,0).getDate();m.saldo=saldoTeoricoAte(`${prefix}-${String(fimMes).padStart(2,"0")}`).saldo});
  const max=Math.max(1,...meses.flatMap(x=>[x.entrada,x.saida,Math.abs(x.ajuste)]));
  $("fuelAuditoriaMeses").innerHTML=meses.map(x=>`<div class="fuel-audit-month"><strong style="text-transform:capitalize">${esc(x.rotulo)}</strong><div class="fuel-audit-bars"><div class="fuel-audit-track entrada"><i style="width:${x.entrada/max*100}%"></i></div><div class="fuel-audit-track saida"><i style="width:${x.saida/max*100}%"></i></div><div class="fuel-audit-track ajuste"><i style="width:${Math.abs(x.ajuste)/max*100}%"></i></div></div><span>+${fmt(x.entrada)} L</span><span>−${fmt(x.saida)} L · ajuste ${x.ajuste>=0?"+":""}${fmt(x.ajuste)} L</span><strong>${pos.configurado?fmt(x.saldo)+" L":"—"}</strong></div>`).join("");
  if($("fuelAuditData")&&!$("fuelAuditData").value)$("fuelAuditData").value=localIso();$("fuelSalvarAuditoria")?.classList.toggle("hidden",!pode("lancar"));atualizarPreviewAuditoria();
  const historico=auditoriasAtivas().filter(x=>x.empresaId===emp()&&dentroPeriodo(x,p)).sort((a,b)=>String(b.data).localeCompare(String(a.data)));$("fuelAuditoriaHistorico").innerHTML=`<table class="tabela"><thead><tr><th>Data</th><th>Teórico</th><th>Físico</th><th>Diferença</th><th>Observação</th><th>Ações</th></tr></thead><tbody>${historico.map(x=>`<tr><td>${dataBr(x.data)}</td><td>${fmt(x.saldoTeorico)} L</td><td>${fmt(x.saldoFisico)} L</td><td class="${classeDiferenca(x.diferenca)}">${num(x.diferenca)>=0?"+":""}${fmt(x.diferenca)} L</td><td>${esc(x.observacao||"—")}</td><td>${admin()?`<button class="btn-acao perigo" data-audit-estorno="${esc(x.id)}">Estornar ADM</button>`:"—"}</td></tr>`).join("")||`<tr><td colspan="6">Nenhuma conferência no período selecionado.</td></tr>`}</tbody></table>`;$("fuelAuditoriaHistorico").querySelectorAll("[data-audit-estorno]").forEach(b=>b.onclick=()=>estornarAuditoriaTanque(b.dataset.auditEstorno));renderGraficoDiferencas(p)
}
async function salvarConfiguracaoTanque(){
  if(!admin())return;const empresaId=emp();if(!empresaId)return alert("Selecione apenas uma empresa.");
  const data=$("fuelEstoqueInicialData").value,estoque=Number($("fuelEstoqueInicialLitros").value),capacidade=Number($("fuelCapacidadeTanque").value||0);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(data)||!Number.isFinite(estoque)||estoque<0||!Number.isFinite(capacidade)||capacidade<0)return alert("Revise a data, o estoque inicial e a capacidade.");
  try{configCombustivel=await salvarConfiguracaoModulo("combustivel",{estoqueInicialData:data,estoqueInicialLitros:estoque,capacidadeTanqueLitros:capacidade},empresaId);render()}catch(e){console.error(e);alert("Não foi possível salvar a configuração do tanque.")}
}

function render(){
  if(!$("fuelLista"))return;const p=periodoCombustivel();
  if(aba==="auditoria"){renderAuditoria(p);return}
  let arr=(aba==="compras"?compras:abastecimentos).filter(x=>x.empresaId===emp()&&x.status!=="estornado"&&dentroPeriodo(x,p));if(aba==="abastecimentos"&&veiculoFiltroId)arr=arr.filter(x=>x.veiculoId===veiculoFiltroId);
  if(aba==="abastecimentos"){
    const litros=arr.reduce((s,x)=>s+num(x.quantidade),0),km=arr.reduce((s,x)=>s+(x.kmAtual!=null&&x.kmAnterior!=null?Math.max(0,num(x.kmAtual)-num(x.kmAnterior)):0),0);
    $("fuelLabelA").textContent=veiculoFiltroId?"Litros · veículo":"Litros abastecidos";$("fuelLabelB").textContent=veiculoFiltroId?"Abastecimentos · veículo":"Abastecimentos";$("fuelLabelC").textContent=veiculoFiltroId?"Média do veículo":"Média geral";$("fuelValorA").textContent=fmt(litros)+" L";$("fuelValorB").textContent=String(arr.length);$("fuelValorC").textContent=litros&&km?fmt(km/litros)+" km/L":"—";
    const vf=veiculoPorId(veiculoFiltroId);$("fuelHistoricoTitulo").textContent=vf?`Abastecimentos · ${vf.placa||"veículo"}`:"Abastecimentos";$("fuelHistoricoSub").textContent=vf?`${nomeVeiculo(vf)} · clique novamente no veículo do gráfico para remover o filtro.`:"KM anterior automático, KM atual informado e litros abastecidos.";$("fuelCabecalho").innerHTML='<tr><th>Data</th><th>Motorista</th><th>Veículo</th><th>KM anterior</th><th>KM atual</th><th>Litros</th><th>KM/L</th><th>Ações</th></tr>';
    $("fuelLista").innerHTML=arr.sort((a,b)=>String(b.data).localeCompare(String(a.data))).map(x=>{const v=veiculoPorId(x.veiculoId),dist=x.kmAtual!=null&&x.kmAnterior!=null?Math.max(0,num(x.kmAtual)-num(x.kmAnterior)):0,kml=x.quantidade&&dist?dist/num(x.quantidade):0;return`<tr><td>${dataBr(x.data)}</td><td>${esc(x.motorista||"—")}</td><td>${esc(x.placa||v?.placa||"—")}</td><td>${fmt(x.kmAnterior)} km</td><td>${fmt(x.kmAtual)} km</td><td>${fmt(x.quantidade)} L</td><td>${kml?fmt(kml):"—"}</td><td>${pode("editar")?`<button class="btn-acao destaque" data-fuel-edit="${esc(x.id)}">Editar</button>`:""}${admin()?`<button class="btn-acao perigo" data-fuel-estorno="${esc(x.id)}">Estornar ADM</button>`:""}</td></tr>`}).join("")||'<tr><td colspan="8">Nenhum abastecimento no período selecionado.</td></tr>';renderRanking(p)
  }else{
    const litros=arr.reduce((s,x)=>s+num(x.quantidade),0),total=arr.reduce((s,x)=>s+num(x.valorTotal??x.valor),0);
    $("fuelLabelA").textContent="Compras no período";$("fuelLabelB").textContent="Litros comprados";$("fuelLabelC").textContent="Custo médio por litro";$("fuelValorA").textContent=money(total);$("fuelValorB").textContent=fmt(litros)+" L";$("fuelValorC").textContent=litros?money(total/litros):"—";
    $("fuelCabecalho").innerHTML='<tr><th>Data da compra</th><th>NF</th><th>Litros</th><th>Valor total</th><th>Custo/L</th><th>Ações</th></tr>';
    $("fuelLista").innerHTML=arr.sort((a,b)=>String(b.data).localeCompare(String(a.data))).map(x=>`<tr><td>${dataBr(x.data)}</td><td>${esc(x.nf||"—")}</td><td>${fmt(x.quantidade)} L</td><td>${money(x.valorTotal??x.valor)}</td><td>${x.quantidade?money(num(x.valorTotal??x.valor)/num(x.quantidade)):"—"}</td><td>${pode("editar")?`<button class="btn-acao destaque" data-fuel-edit="${esc(x.id)}">Editar</button>`:""}${admin()?`<button class="btn-acao perigo" data-fuel-estorno="${esc(x.id)}">Estornar ADM</button>`:""}</td></tr>`).join("")||'<tr><td colspan="6">Nenhuma compra no período selecionado.</td></tr>';renderCompras(p)
  }
  document.querySelectorAll("[data-fuel-edit]").forEach(b=>b.onclick=()=>editarRegistro(b.dataset.fuelEdit));document.querySelectorAll("[data-fuel-estorno]").forEach(b=>b.onclick=()=>estornar(b.dataset.fuelEstorno))
}

async function carregar(){
  if(busy||!ver()||!frotaVer()||!emp())return;busy=true;
  try{
    const empresaId=emp(),[a,c,v,m,at,cfg]=await Promise.all([
      listarDocumentos("abastecimentosFrota"),listarDocumentos("custosDiesel"),listarDocumentos("veiculos"),colaboradoresPorFuncao("MOTORISTA").catch(()=>[]),listarDocumentos("auditoriasTanqueDiesel"),carregarConfiguracaoModulo("combustivel",empresaId).catch(()=>({}))
    ]);
    abastecimentos=a.filter(x=>x.empresaId===empresaId);compras=c.filter(x=>x.empresaId===empresaId);veiculos=v.filter(x=>x.empresaId===empresaId);motoristas=m.filter(x=>x.empresaId===empresaId);auditoriasTanque=at.filter(x=>x.empresaId===empresaId);configCombustivel=cfg||{};
    preencherMotoristas();preencherVeiculos();render();$("fuelAviso").classList.add("hidden")
  }catch(e){console.error(e);$("fuelAviso").textContent="Não foi possível carregar Combustível e Diesel. Confira permissões e regras publicadas.";$("fuelAviso").classList.remove("hidden")}finally{busy=false}
}
async function atualizarKmVeiculo(v,novoKm){
  if(!v||!Number.isFinite(novoKm))return;const maxMov=Math.max(novoKm,...ativosAbastecimento().filter(x=>x.veiculoId===v.id&&x.id!==editId).map(x=>num(x.kmAtual)));if(maxMov>=num(v.quilometragemAtual))await atualizarDocumento("veiculos",v.id,{quilometragemAtual:Math.trunc(maxMov)})
}
async function salvar(e){
  e.preventDefault();const empresaId=emp(),data=$("fuelData").value;if(!empresaId)return alert("Selecione apenas uma empresa no cabeçalho.");if(!/^\d{4}-\d{2}-\d{2}$/.test(data))return msg($("fuelMensagem"),"Informe a data.");
  const d={data};
  if(aba==="abastecimentos"){
    const placa=$("fuelPlaca").value,v=veiculoPorPlaca(placa);d.placa=placa;d.veiculoId=v?.id||"";d.motorista=$("fuelMotorista").value;d.tipo="consumo";d.quantidade=Number($("fuelQuantidade").value);d.kmAnterior=v?Math.trunc(kmBaseVeiculo(v,data,editId)):null;d.kmAtual=Number($("fuelKmAtual").value);
    if(!v)return msg($("fuelMensagem"),"Selecione um veículo válido.");
    if(!d.motorista)return msg($("fuelMensagem"),"Selecione o motorista. Se a lista estiver vazia, confira no RH se o cargo do colaborador está com a função SIG Motorista / Frota.");
    if(!Number.isFinite(d.quantidade)||d.quantidade<=0)return msg($("fuelMensagem"),"Informe uma quantidade de litros válida.");
    if(!Number.isSafeInteger(d.kmAtual)||d.kmAtual<0)return msg($("fuelMensagem"),"Informe o KM atual do veículo.");
    if(d.kmAnterior===null)return msg($("fuelMensagem"),"Não foi possível localizar o KM de referência do veículo. Confira a quilometragem inicial no cadastro do veículo.");
    if(d.kmAtual<d.kmAnterior)return msg($("fuelMensagem"),`O KM atual (${fmt(d.kmAtual)}) não pode ser menor que o último KM registrado (${fmt(d.kmAnterior)}).`)
  }else if(aba==="compras"){
    d.nf=String($("fuelNf").value||"").trim().toUpperCase();d.quantidade=Number($("fuelLitrosCompra").value);d.valorTotal=Number($("fuelValor").value);d.valor=d.valorTotal;d.custoLitro=d.quantidade>0?d.valorTotal/d.quantidade:0;
    if(!d.nf||!Number.isFinite(d.quantidade)||d.quantidade<=0||!Number.isFinite(d.valorTotal)||d.valorTotal<0)return msg($("fuelMensagem"),"Revise NF, litros e valor total.")
  }else return;
  try{
    msg($("fuelMensagem"),"Salvando...");const col=aba==="compras"?"custosDiesel":"abastecimentosFrota";let salvoId=editId||"",avisoKm="";
    if(editId){const fonte=aba==="compras"?compras:abastecimentos,x=fonte.find(v=>v.id===editId);if(!x||!pode("editar")||x.status!=="ativo")throw new Error("Edição não autorizada.");await atualizarDocumento(col,editId,d)}
    else{if(!pode("lancar"))throw new Error("Sem permissão.");salvoId=await criarDocumento(col,{...d,empresaId,status:"ativo",origem:"sig",registradoPor:state.usuario?.id||""})}
    if(aba==="abastecimentos"){
      try{await atualizarKmVeiculo(veiculoPorPlaca(d.placa),d.kmAtual)}
      catch(eKm){console.warn("Abastecimento salvo, mas o KM do veículo não foi sincronizado",eKm);avisoKm=" O abastecimento foi salvo, mas o KM da ficha do veículo não pôde ser atualizado."}
    }
    $("fuelFormBox").classList.add("hidden");limpar();await carregar();
    const confirmado=(aba==="compras"?compras:abastecimentos).some(x=>x.id===salvoId);
    if(!confirmado&&salvoId)console.warn("Registro salvo no Firestore, mas não retornou na consulta atual",salvoId);
    emitirAlteracao("combustivel");emitirAlteracao("frota");
    if(avisoKm)alert(avisoKm.trim());
  }catch(err){console.error(err);msg($("fuelMensagem"),err.message||"Não foi possível salvar.")}
}
async function estornar(id){
  if(!admin())return;const fonte=aba==="compras"?compras:abastecimentos,x=fonte.find(v=>v.id===id);if(!x||x.status!=="ativo")return;
  const ok=await confirmarAcaoAdministrativa({titulo:aba==="compras"?"Estornar compra de diesel":"Estornar abastecimento",descricao:`O lançamento de ${dataBr(x.data)} ficará no histórico.`,motivoLabel:"Motivo obrigatório",confirmarTexto:"Estornar",perigosa:true});if(!ok)return;
  const colecao=aba==="compras"?"custosDiesel":"abastecimentosFrota";
  try{await atualizarComAuditoria({colecao,id,empresaId:x.empresaId,modulo:"combustivel",acao:"estorno",motivo:ok.motivo,resumo:`Estorno combustível ${x.data}`,snapshotAntes:x,alteracoes:{status:"estornado",motivoEstorno:ok.motivo,estornadoPor:state.usuario?.id||"",estornadoEm:new Date().toISOString()}});emitirAlteracao("combustivel");await carregar()}catch(e){console.error(e);alert("Não foi possível estornar.")}
}
function instalar(){if(!document.querySelector('link[href^="production.css"]')){const l=document.createElement("link");l.rel="stylesheet";l.href="production.css?v=1";document.head.appendChild(l)}montar();menu();$("fuelNovo")?.classList.toggle("hidden",!pode("lancar"))}
instalar();
window.addEventListener("sig:ready",()=>{instalar();if(ver()&&frotaVer())carregar()});
window.addEventListener("sig:empresa-contexto",()=>{if(!$("pagina-combustivel")?.classList.contains("hidden"))carregar()});
window.addEventListener("sig:periodo-changed",()=>{if(!$("pagina-combustivel")?.classList.contains("hidden"))render()});
window.addEventListener("sig:data-changed",e=>{if(["combustivel","frota","rh"].includes(e.detail?.modulo)&&!$("pagina-combustivel")?.classList.contains("hidden"))carregar()});
