import { abrirPagina, admin } from "./core.js";
import {
  $, esc, msg, permite, state, listarDocumentos, criarDocumento, atualizarDocumento,
  preencherEmpresaSelect, empresaUnicaSelecionadaId, empresasSelecionadasIds, nomeEmpresa,
  moeda, dataBr, diasAte, hojeIso, mensagemErroDados, emitirAlteracao
} from "./shared.js";
import { contaAnalitica } from "./account-tree.js";
import { raizConta, contaRedutora } from "./account-mask.js";
import { contaAtivaNoExercicio } from "./account-validity.js";

const SENATRAN_URL="https://portalservicos.senatran.serpro.gov.br/";
let veiculos=[],manutencoes=[],plano=[],editVeiculoId=null,editManutId=null,busy=false,tabAtual="visao";

const n=v=>{const x=Number(v||0);return Number.isFinite(x)?x:0};
const uid=()=>state.usuario?.id||"";
const podeVer=()=>admin()||permite("frota","visualizar")||permite("frota","cadastrar")||permite("frota","editar")||permite("frota","manutencao")||permite("frota","obrigacoes");
const podeCadastrar=()=>admin()||permite("frota","cadastrar");
const podeEditar=()=>admin()||permite("frota","editar");
const podeManut=()=>admin()||permite("frota","manutencao")||permite("frota","editar");
const podeObrig=()=>admin()||permite("frota","obrigacoes")||permite("frota","editar");
const podeContabil=()=>admin()||permite("controladoria","editar")||permite("controladoria","imobilizado");
const pagina=()=>$("pagina-frota");
const contextoIds=()=>empresasSelecionadasIds();
const contextoOkGravacao=()=>contextoIds().length===1&&!!empresaUnicaSelecionadaId();

function garantirCss(){
  if(!document.querySelector('link[href^="fleet.css"]')){
    const l=document.createElement("link");l.rel="stylesheet";l.href="fleet.css?v=1";document.head.appendChild(l)
  }
}
function garantirMenu(){
  const nav=document.querySelector(".sidebar-menu");if(!nav)return;
  let b=$("menuFrota");
  if(!b){
    b=document.createElement("button");b.id="menuFrota";b.className="menu-item hidden";b.dataset.pagina="frota";b.type="button";b.textContent="Gestão de Frota";
    const ref=$("menuVendas")||$("menuPermutas")||$("menuConsorcios")||$("menuContratos");
    if(ref)ref.insertAdjacentElement("afterend",b);else nav.querySelector(".menu-separador")?.before(b)
  }
  b.classList.toggle("hidden",!podeVer());
  if(b.dataset.frotaBound!=="1"){
    b.dataset.frotaBound="1";
    b.addEventListener("click",async e=>{e.preventDefault();e.stopImmediatePropagation();if(!podeVer())return;abrirPagina("frota");await carregar()},true)
  }
}
function criarPagina(){
  if(pagina())return;
  const main=document.querySelector("main.conteudo");if(!main)return;
  const s=document.createElement("section");s.id="pagina-frota";s.className="pagina hidden fleet-page";s.innerHTML=`
<div class="pagina-cabecalho">
  <div><span class="eyebrow">OPERAÇÕES</span><h2>Gestão de Frota</h2><p>Veículos, obrigações, infrações, manutenção, custos e integração patrimonial em um único cockpit.</p></div>
  <div class="acoes-cabecalho fleet-actions">
    <button id="btnFrotaConsulta" class="btn-secundario" type="button">Consulta oficial SENATRAN</button>
    <button id="btnNovoVeiculo" class="btn-primario" type="button">+ Novo veículo</button>
    <button id="btnAtualizarFrota" class="btn-secundario" type="button">Atualizar</button>
  </div>
</div>
<div class="fleet-kpis">
  <div class="fleet-kpi"><span>Frota ativa</span><strong id="frotaKpiAtivos">—</strong><small>veículos operacionais</small></div>
  <div class="fleet-kpi"><span>Obrigações vencidas</span><strong id="frotaKpiVencidas">—</strong><small>IPVA, licenciamento e multas</small></div>
  <div class="fleet-kpi"><span>Próximos 30 dias</span><strong id="frotaKpi30">—</strong><small>vencimentos e revisões</small></div>
  <div class="fleet-kpi"><span>Manutenções abertas</span><strong id="frotaKpiManut">—</strong><small>preventivas e corretivas</small></div>
  <div class="fleet-kpi"><span>Custo 12 meses</span><strong id="frotaKpiCusto">—</strong><small>manutenção + obrigações pagas</small></div>
  <div class="fleet-kpi"><span>Saúde da frota</span><strong id="frotaKpiSaude">—</strong><small>score de pendências</small></div>
</div>
<div class="fleet-tabs">
  <button class="fleet-tab ativo" data-fleet-tab="visao" type="button">Visão gerencial</button>
  <button class="fleet-tab" data-fleet-tab="veiculos" type="button">Veículos</button>
  <button class="fleet-tab" data-fleet-tab="obrigacoes" type="button">IPVA, multas & obrigações</button>
  <button class="fleet-tab" data-fleet-tab="manutencoes" type="button">Manutenções</button>
</div>

<section class="fleet-panel" data-fleet-panel="visao">
  <div class="fleet-grid-2">
    <div class="fleet-card"><h3>Alertas prioritários</h3><p>O que exige ação agora ou nos próximos 30 dias.</p><div id="frotaAlertas" class="fleet-alerts"></div></div>
    <div class="fleet-card"><h3>Saúde e custo da frota</h3><p>Leitura rápida de risco operacional, obrigações e vínculo patrimonial.</p><div id="frotaSaude"></div></div>
  </div>
  <div class="fleet-card">
    <div class="fleet-toolbar"><div><h3>Posição por veículo</h3><p>Custos, vencimentos, manutenção e situação contábil.</p></div><input id="buscaFrotaVisao" class="campo-busca" type="search" placeholder="Placa, modelo ou RENAVAM"></div>
    <div class="tabela-container"><table class="tabela fleet-table"><thead><tr><th>Veículo</th><th>Status</th><th>KM</th><th>Próximo vencimento</th><th>Manutenção</th><th>Custo 12m</th><th>Imobilizado</th></tr></thead><tbody id="frotaResumoVeiculos"></tbody></table></div>
  </div>
</section>

<section class="fleet-panel hidden" data-fleet-panel="veiculos">
  <section id="formVeiculoBox" class="form-card hidden"><div class="form-card-titulo"><div><h3 id="tituloFormVeiculo">Novo veículo</h3><p>Cadastre a ficha operacional e, quando autorizado, o vínculo com o Imobilizado.</p></div></div>
    <form id="formVeiculo"><div class="form-grid form-grid-3">
      <div class="campo"><label for="veiculoEmpresa">Empresa</label><select id="veiculoEmpresa" required></select></div>
      <div class="campo"><label for="veiculoPlaca">Placa</label><input id="veiculoPlaca" maxlength="8" required placeholder="ABC1D23"></div>
      <div class="campo"><label for="veiculoRenavam">RENAVAM</label><input id="veiculoRenavam" inputmode="numeric" maxlength="11" required></div>
      <div class="campo"><label for="veiculoMarca">Marca</label><input id="veiculoMarca"></div>
      <div class="campo"><label for="veiculoModelo">Modelo</label><input id="veiculoModelo" required></div>
      <div class="campo"><label for="veiculoAno">Ano/modelo</label><input id="veiculoAno" type="number" min="1900" max="2100"></div>
      <div class="campo"><label for="veiculoStatus">Status</label><select id="veiculoStatus"><option value="ativo">Ativo</option><option value="manutencao">Em manutenção</option><option value="inativo">Inativo</option><option value="baixado">Baixado/Vendido</option></select></div>
      <div class="campo"><label for="veiculoKm">Quilometragem atual</label><input id="veiculoKm" type="number" min="0" step="1"></div>
      <div class="campo"><label for="veiculoDataAquisicao">Data de aquisição</label><input id="veiculoDataAquisicao" type="date"></div>
      <div class="campo"><label for="veiculoValorAquisicao">Valor de aquisição</label><input id="veiculoValorAquisicao" type="number" min="0" step="0.01"></div>
      <div class="campo"><label for="veiculoResponsavel">Responsável / condutor principal</label><input id="veiculoResponsavel"></div>
      <div class="campo"><label for="veiculoCentro">Centro de custo</label><input id="veiculoCentro" placeholder="Opcional"></div>
      <div class="fleet-form-section"><h4>Vínculo contábil e Imobilizado</h4><p>A conta é escolhida manualmente entre contas analíticas já cadastradas. O veículo só sincroniza a ficha patrimonial quando o usuário também possui permissão de Imobilizado.</p></div>
      <div class="campo"><label for="veiculoContaAtivo">Conta patrimonial do veículo</label><select id="veiculoContaAtivo"><option value="">Pendente / selecionar...</option></select></div>
      <div class="campo"><label for="veiculoContaAcum">(-) Depreciação acumulada</label><select id="veiculoContaAcum"><option value="">Selecionar...</option></select></div>
      <div class="campo"><label for="veiculoContaDespesa">Despesa de depreciação</label><select id="veiculoContaDespesa"><option value="">Selecionar...</option></select></div>
      <div class="campo"><label for="veiculoVidaUtil">Vida útil estimada (meses)</label><input id="veiculoVidaUtil" type="number" min="1" value="60"><small>Ajuste conforme política contábil da empresa.</small></div>
      <div class="campo"><label for="veiculoDisponivel">Disponível para uso</label><input id="veiculoDisponivel" type="date"></div>
      <div class="campo"><label><input id="veiculoIntegrarPlanejamento" type="checkbox"> Projetar depreciação no Budget/Forecast</label></div>
      <div class="campo campo-span-3"><label for="veiculoObs">Observações</label><textarea id="veiculoObs" rows="2"></textarea></div>
    </div><div class="form-acoes"><button id="btnCancelarVeiculo" class="btn-secundario" type="button">Cancelar</button><button class="btn-primario" type="submit">Salvar veículo</button></div><p id="msgVeiculo" class="mensagem-form"></p></form>
  </section>
  <div class="lista-card"><div class="lista-cabecalho"><div><h3>Veículos cadastrados</h3><p id="frotaQtdVeiculos">—</p></div><input id="buscaVeiculos" class="campo-busca" type="search" placeholder="Buscar placa, modelo ou RENAVAM"></div><div class="tabela-container"><table class="tabela fleet-table"><thead><tr><th>Veículo</th><th>Empresa</th><th>Status</th><th>KM</th><th>Conta</th><th>Última consulta</th><th>Ações</th></tr></thead><tbody id="listaVeiculos"></tbody></table></div></div>
</section>

<section class="fleet-panel hidden" data-fleet-panel="obrigacoes">
  <section id="formObrigacaoBox" class="form-card hidden"><div class="form-card-titulo"><div><h3>Nova obrigação / infração</h3><p>Controle IPVA, licenciamento, seguro, multas e notificações sem perder histórico.</p></div></div>
    <form id="formObrigacao"><div class="form-grid form-grid-3">
      <div class="campo"><label for="obrigVeiculo">Veículo</label><select id="obrigVeiculo" required></select></div>
      <div class="campo"><label for="obrigTipo">Tipo</label><select id="obrigTipo"><option value="ipva">IPVA</option><option value="licenciamento">Licenciamento</option><option value="multa">Multa / Infração</option><option value="seguro">Seguro</option><option value="recall">Recall</option><option value="outro">Outro</option></select></div>
      <div class="campo"><label for="obrigExercicio">Exercício / parcela</label><input id="obrigExercicio" placeholder="Ex.: 2027 · cota 1"></div>
      <div class="campo"><label for="obrigVencimento">Vencimento</label><input id="obrigVencimento" type="date" required></div>
      <div class="campo"><label for="obrigValor">Valor</label><input id="obrigValor" type="number" min="0" step="0.01"></div>
      <div class="campo"><label for="obrigStatus">Status</label><select id="obrigStatus"><option value="aberto">Aberto</option><option value="em_recurso">Em recurso</option><option value="pago">Pago</option><option value="cancelado">Cancelado</option></select></div>
      <div class="campo"><label for="obrigAuto">Auto / referência</label><input id="obrigAuto"></div>
      <div class="campo"><label for="obrigOrgao">Órgão autuador</label><input id="obrigOrgao"></div>
      <div class="campo"><label for="obrigPontos">Pontos</label><input id="obrigPontos" type="number" min="0" step="1"></div>
      <div class="campo"><label for="obrigCondutor">Condutor / responsável</label><input id="obrigCondutor"></div>
      <div class="campo"><label for="obrigPagamento">Data de pagamento</label><input id="obrigPagamento" type="date"></div>
      <div class="campo"><label for="obrigDescricao">Descrição</label><input id="obrigDescricao"></div>
    </div><div class="form-acoes"><button id="btnCancelarObrig" class="btn-secundario" type="button">Cancelar</button><button class="btn-primario" type="submit">Salvar obrigação</button></div><p id="msgObrig" class="mensagem-form"></p></form>
  </section>
  <div class="fleet-toolbar"><div><button id="btnNovaObrig" class="btn-primario" type="button">+ Nova obrigação</button></div><select id="filtroObrigTipo" class="campo-busca"><option value="">Todos os tipos</option><option value="ipva">IPVA</option><option value="licenciamento">Licenciamento</option><option value="multa">Multas</option><option value="seguro">Seguro</option></select></div>
  <div class="fleet-source-note"><strong>Automação segura:</strong> o SIG registra e agenda as obrigações localmente. A SENATRAN disponibiliza consulta oficial e também uma solução de integração para pessoas jurídicas via Serpro. A integração automática deve ser feita futuramente por backend seguro/Cloud Function — nunca com credenciais ou chaves dentro deste PWA.</div>
  <div class="lista-card"><div class="tabela-container"><table class="tabela"><thead><tr><th>Veículo</th><th>Tipo</th><th>Referência</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Detalhes</th><th>Ações</th></tr></thead><tbody id="listaObrigacoes"></tbody></table></div></div>
</section>

<section class="fleet-panel hidden" data-fleet-panel="manutencoes">
  <section id="formManutBox" class="form-card hidden"><div class="form-card-titulo"><div><h3 id="tituloFormManut">Nova manutenção</h3><p>Preventiva, corretiva e revisões por data ou quilometragem.</p></div></div>
    <form id="formManut"><div class="form-grid form-grid-3">
      <div class="campo"><label for="manutVeiculo">Veículo</label><select id="manutVeiculo" required></select></div>
      <div class="campo"><label for="manutTipo">Tipo</label><select id="manutTipo"><option value="preventiva">Preventiva</option><option value="corretiva">Corretiva</option><option value="revisao">Revisão</option><option value="pneus">Pneus</option><option value="documental">Documental</option><option value="outro">Outro</option></select></div>
      <div class="campo"><label for="manutStatus">Status</label><select id="manutStatus"><option value="planejada">Planejada</option><option value="em_andamento">Em andamento</option><option value="concluida">Concluída</option><option value="cancelada">Cancelada</option></select></div>
      <div class="campo campo-span-2"><label for="manutDescricao">Serviço / descrição</label><input id="manutDescricao" required></div>
      <div class="campo"><label for="manutOficina">Oficina / fornecedor</label><input id="manutOficina"></div>
      <div class="campo"><label for="manutPrevista">Data prevista / vencimento</label><input id="manutPrevista" type="date"></div>
      <div class="campo"><label for="manutKmPrevisto">KM limite</label><input id="manutKmPrevisto" type="number" min="0" step="1"></div>
      <div class="campo"><label for="manutCustoPrev">Custo previsto</label><input id="manutCustoPrev" type="number" min="0" step="0.01"></div>
      <div class="campo"><label for="manutRealizada">Data realizada</label><input id="manutRealizada" type="date"></div>
      <div class="campo"><label for="manutKmReal">KM realizado</label><input id="manutKmReal" type="number" min="0" step="1"></div>
      <div class="campo"><label for="manutCustoReal">Custo realizado</label><input id="manutCustoReal" type="number" min="0" step="0.01"></div>
      <div class="campo"><label for="manutProxima">Próxima revisão</label><input id="manutProxima" type="date"></div>
      <div class="campo"><label for="manutProximoKm">Próximo KM</label><input id="manutProximoKm" type="number" min="0" step="1"></div>
      <div class="campo campo-span-3"><label for="manutObs">Observações</label><textarea id="manutObs" rows="2"></textarea></div>
    </div><div class="form-acoes"><button id="btnCancelarManut" class="btn-secundario" type="button">Cancelar</button><button class="btn-primario" type="submit">Salvar manutenção</button></div><p id="msgManut" class="mensagem-form"></p></form>
  </section>
  <div class="fleet-toolbar"><button id="btnNovaManut" class="btn-primario" type="button">+ Nova manutenção</button><input id="buscaManut" class="campo-busca" type="search" placeholder="Veículo, serviço ou oficina"></div>
  <div class="lista-card"><div class="tabela-container"><table class="tabela"><thead><tr><th>Veículo</th><th>Serviço</th><th>Status</th><th>Prazo / KM</th><th>Custo</th><th>Próxima revisão</th><th>Ações</th></tr></thead><tbody id="listaManutencoes"></tbody></table></div></div>
</section>`;
  main.appendChild(s);garantirCss();bind()
}

function bind(){
  document.querySelectorAll("[data-fleet-tab]").forEach(b=>b.addEventListener("click",()=>trocarTab(b.dataset.fleetTab)));
  $("btnAtualizarFrota")?.addEventListener("click",carregar);
  $("btnFrotaConsulta")?.addEventListener("click",()=>window.open(SENATRAN_URL,"_blank","noopener"));
  $("btnNovoVeiculo")?.addEventListener("click",novoVeiculo);
  $("btnCancelarVeiculo")?.addEventListener("click",()=>fechar("formVeiculoBox","formVeiculo","msgVeiculo"));
  $("formVeiculo")?.addEventListener("submit",salvarVeiculo);
  $("buscaVeiculos")?.addEventListener("input",renderVeiculos);
  $("buscaFrotaVisao")?.addEventListener("input",renderResumoVeiculos);
  $("btnNovaObrig")?.addEventListener("click",novaObrigacao);
  $("btnCancelarObrig")?.addEventListener("click",()=>fechar("formObrigacaoBox","formObrigacao","msgObrig"));
  $("formObrigacao")?.addEventListener("submit",salvarObrigacao);
  $("filtroObrigTipo")?.addEventListener("change",renderObrigacoes);
  $("btnNovaManut")?.addEventListener("click",novaManutencao);
  $("btnCancelarManut")?.addEventListener("click",()=>fechar("formManutBox","formManut","msgManut"));
  $("formManut")?.addEventListener("submit",salvarManutencao);
  $("buscaManut")?.addEventListener("input",renderManutencoes);
}

function trocarTab(tab){
  tabAtual=tab||"visao";
  document.querySelectorAll("[data-fleet-tab]").forEach(b=>b.classList.toggle("ativo",b.dataset.fleetTab===tabAtual));
  document.querySelectorAll("[data-fleet-panel]").forEach(p=>p.classList.toggle("hidden",p.dataset.fleetPanel!==tabAtual))
}
function fechar(box,form,mensagem){$(box)?.classList.add("hidden");$(form)?.reset();msg($(mensagem),"");editVeiculoId=null;editManutId=null}
function placa(v){return String(v||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,7)}
function renavam(v){return String(v||"").replace(/\D/g,"").slice(0,11)}
function veiculoNome(v){return `${v.marca||""} ${v.modelo||""}`.trim()||v.placa||"Veículo"}
function vById(id){return veiculos.find(v=>v.id===id)}
function obrigacoes(v){return Array.isArray(v?.obrigacoes)?v.obrigacoes:[]}
function statusObrig(o){if(o.status==="pago"||o.status==="cancelado"||o.status==="em_recurso")return o.status;const d=diasAte(o.vencimento);return d!=null&&d<0?"vencido":"aberto"}
function obrigacoesTodas(){const out=[];for(const v of veiculos)for(const o of obrigacoes(v))out.push({...o,veiculoId:v.id,veiculo:v});return out}
function manutVencida(m){if(["concluida","cancelada"].includes(m.status))return false;const v=vById(m.veiculoId),d=diasAte(m.dataPrevista),porData=d!=null&&d<0,porKm=n(m.kmPrevisto)>0&&n(v?.quilometragemAtual)>=n(m.kmPrevisto);return porData||porKm}
function manutProxima(m){if(["concluida","cancelada"].includes(m.status))return false;const v=vById(m.veiculoId),d=diasAte(m.dataPrevista),km=n(m.kmPrevisto)-n(v?.quilometragemAtual);return (d!=null&&d>=0&&d<=30)||(n(m.kmPrevisto)>0&&km>=0&&km<=1000)}
function dentro12m(data){if(!data)return false;const d=new Date(`${data}T12:00:00`),lim=new Date();lim.setMonth(lim.getMonth()-12);return d>=lim}
function custo12Veiculo(id){const m=manutencoes.filter(x=>x.veiculoId===id&&x.status==="concluida"&&dentro12m(x.dataRealizada||x.dataPrevista)).reduce((t,x)=>t+n(x.custoReal),0);const o=obrigacoes(vById(id)).filter(x=>x.status==="pago"&&dentro12m(x.dataPagamento||x.vencimento)).reduce((t,x)=>t+n(x.valor),0);return m+o}
function proxEvento(v){const arr=[];obrigacoes(v).forEach(o=>{if(!["pago","cancelado"].includes(o.status)&&o.vencimento)arr.push({data:o.vencimento,texto:`${tipoObrig(o.tipo)} ${o.exercicio||""}`.trim()})});manutencoes.filter(m=>m.veiculoId===v.id&&!["concluida","cancelada"].includes(m.status)&&m.dataPrevista).forEach(m=>arr.push({data:m.dataPrevista,texto:m.descricao||"Manutenção"}));arr.sort((a,b)=>String(a.data).localeCompare(String(b.data)));return arr[0]||null}
function tipoObrig(t){return({ipva:"IPVA",licenciamento:"Licenciamento",multa:"Multa/Infração",seguro:"Seguro",recall:"Recall",outro:"Outro"})[t]||t||"Obrigação"}
function classeStatusObrig(o){const s=statusObrig(o);return s==="vencido"?"bad":s==="pago"?"ok":s==="em_recurso"?"warn":"warn"}
function labelStatusObrig(o){const s=statusObrig(o);return({vencido:"Vencido",pago:"Pago",em_recurso:"Em recurso",cancelado:"Cancelado",aberto:"Aberto"})[s]||s}
function scoreSaude(){const venc=obrigacoesTodas().filter(o=>statusObrig(o)==="vencido").length;const mv=manutencoes.filter(m=>manutVencida(m)).length;const pend=veiculos.filter(v=>v.status==="ativo"&&!v.imobilizadoId).length;return Math.max(0,100-Math.min(50,venc*10)-Math.min(35,mv*12)-Math.min(15,pend*5))}
function atualizarKpis(){const obs=obrigacoesTodas(),venc=obs.filter(o=>statusObrig(o)==="vencido"),proxO=obs.filter(o=>{const d=diasAte(o.vencimento);return !["pago","cancelado"].includes(o.status)&&d!=null&&d>=0&&d<=30}),proxM=manutencoes.filter(m=>manutProxima(m));const abertas=manutencoes.filter(m=>!["concluida","cancelada"].includes(m.status));const custo=veiculos.reduce((t,v)=>t+custo12Veiculo(v.id),0),score=scoreSaude();$("frotaKpiAtivos").textContent=veiculos.filter(v=>v.status==="ativo").length;$("frotaKpiVencidas").textContent=venc.length;$("frotaKpi30").textContent=proxO.length+proxM.length;$("frotaKpiManut").textContent=abertas.length;$("frotaKpiCusto").textContent=moeda(custo);$("frotaKpiSaude").textContent=`${score}/100`}
function renderAlertas(){const a=[];obrigacoesTodas().forEach(o=>{const d=diasAte(o.vencimento);if(statusObrig(o)==="vencido")a.push({p:0,c:"vencido",t:`${o.veiculo.placa} · ${tipoObrig(o.tipo)} vencido em ${dataBr(o.vencimento)}`,v:moeda(o.valor)});else if(d!=null&&d>=0&&d<=30&&!["pago","cancelado"].includes(o.status))a.push({p:1,c:"proximo",t:`${o.veiculo.placa} · ${tipoObrig(o.tipo)} vence em ${d} dia(s)`,v:moeda(o.valor)})});manutencoes.forEach(m=>{const v=vById(m.veiculoId);if(manutVencida(m))a.push({p:0,c:"vencido",t:`${v?.placa||"Veículo"} · manutenção vencida: ${m.descricao||"serviço"}`,v:m.dataPrevista?dataBr(m.dataPrevista):`${n(m.kmPrevisto).toLocaleString("pt-BR")} km`});else if(manutProxima(m))a.push({p:1,c:"proximo",t:`${v?.placa||"Veículo"} · próxima manutenção: ${m.descricao||"serviço"}`,v:m.dataPrevista?dataBr(m.dataPrevista):`${n(m.kmPrevisto).toLocaleString("pt-BR")} km`})});a.sort((x,y)=>x.p-y.p);$("frotaAlertas").innerHTML=a.length?a.slice(0,12).map(x=>`<div class="fleet-alert ${x.c}"><span>${esc(x.t)}</span><strong>${esc(x.v)}</strong></div>`).join(""):'<div class="fleet-alert"><span>Nenhuma pendência crítica encontrada.</span><strong>✓</strong></div>'}
function renderSaude(){const score=scoreSaude(),venc=obrigacoesTodas().filter(o=>statusObrig(o)==="vencido").length,mv=manutencoes.filter(m=>manutVencida(m)).length,pend=veiculos.filter(v=>v.status==="ativo"&&!v.imobilizadoId).length;$("frotaSaude").innerHTML=`<div class="fleet-health"><div class="fleet-health-score" style="--score:${score}"><strong>${score}</strong><small>/100</small></div><div class="fleet-mini-grid"><div class="fleet-mini"><span>Obrigações vencidas</span><strong>${venc}</strong></div><div class="fleet-mini"><span>Manutenções vencidas</span><strong>${mv}</strong></div><div class="fleet-mini"><span>Pendência patrimonial</span><strong>${pend}</strong></div><div class="fleet-mini"><span>Integração oficial</span><strong>Assistida</strong></div></div></div>`}
function matchVeiculo(v,termo){const t=String(termo||"").toLowerCase().trim();return !t||[v.placa,v.renavam,v.marca,v.modelo,v.responsavel].some(x=>String(x||"").toLowerCase().includes(t))}
function renderResumoVeiculos(){const t=$("buscaFrotaVisao")?.value||"",arr=veiculos.filter(v=>matchVeiculo(v,t));$("frotaResumoVeiculos").innerHTML=arr.length?arr.map(v=>{const p=proxEvento(v),ab=manutencoes.filter(m=>m.veiculoId===v.id&&!["concluida","cancelada"].includes(m.status)),mv=ab.some(m=>manutVencida(m));return`<tr><td><span class="fleet-vehicle-title">${esc(v.placa||"—")} · ${esc(veiculoNome(v))}</span><span class="fleet-vehicle-sub">${esc(v.renavam||"RENAVAM não informado")} · ${esc(nomeEmpresa(v.empresaId))}</span></td><td><span class="fleet-badge ${v.status==="ativo"?"ok":v.status==="manutencao"?"warn":""}">${esc(v.status||"—")}</span></td><td>${n(v.quilometragemAtual).toLocaleString("pt-BR")} km</td><td>${p?`${dataBr(p.data)}<br><small>${esc(p.texto)}</small>`:"—"}</td><td><span class="fleet-badge ${mv?"bad":ab.length?"warn":"ok"}">${mv?"Vencida":ab.length?`${ab.length} aberta(s)`:"Em dia"}</span></td><td>${moeda(custo12Veiculo(v.id))}</td><td>${v.imobilizadoId?'<span class="fleet-badge ok">Vinculado</span>':'<span class="fleet-badge warn">Pendente</span>'}</td></tr>`}).join(""):'<tr><td colspan="7" class="fleet-empty">Nenhum veículo encontrado.</td></tr>'}
function contaNome(id){const c=plano.find(x=>x.id===id);return c?`${c.codigo||""} · ${c.nome||""}`:"—"}
function renderVeiculos(){const t=$("buscaVeiculos")?.value||"",arr=veiculos.filter(v=>matchVeiculo(v,t));$("frotaQtdVeiculos").textContent=`${arr.length} veículo(s)`;$("listaVeiculos").innerHTML=arr.length?arr.map(v=>`<tr><td><span class="fleet-vehicle-title">${esc(v.placa||"—")} · ${esc(veiculoNome(v))}</span><span class="fleet-vehicle-sub">RENAVAM ${esc(v.renavam||"—")}</span></td><td>${esc(nomeEmpresa(v.empresaId))}</td><td><span class="fleet-badge ${v.status==="ativo"?"ok":v.status==="manutencao"?"warn":""}">${esc(v.status||"—")}</span></td><td>${n(v.quilometragemAtual).toLocaleString("pt-BR")} km</td><td>${v.contaAtivoId?esc(contaNome(v.contaAtivoId)):'<span class="fleet-account-pending">Pendente</span>'}</td><td>${v.ultimaConsultaOficialEm?dataBr(v.ultimaConsultaOficialEm):"—"}</td><td><div class="acoes-tabela">${podeEditar()?`<button class="btn-acao destaque" data-fe="${v.id}" type="button">Editar</button>`:""}${podeObrig()?`<button class="btn-acao" data-fo="${v.id}" type="button">Obrigação</button>`:""}${podeManut()?`<button class="btn-acao" data-fm="${v.id}" type="button">Manutenção</button>`:""}<button class="btn-acao" data-fc="${v.id}" type="button">Consulta hoje</button></div></td></tr>`).join(""):'<tr><td colspan="7" class="fleet-empty">Nenhum veículo cadastrado.</td></tr>';document.querySelectorAll("[data-fe]").forEach(b=>b.addEventListener("click",()=>editarVeiculo(b.dataset.fe)));document.querySelectorAll("[data-fo]").forEach(b=>b.addEventListener("click",()=>novaObrigacao(b.dataset.fo)));document.querySelectorAll("[data-fm]").forEach(b=>b.addEventListener("click",()=>novaManutencao(b.dataset.fm)));document.querySelectorAll("[data-fc]").forEach(b=>b.addEventListener("click",()=>registrarConsulta(b.dataset.fc)))}
function renderObrigacoes(){const filtro=$("filtroObrigTipo")?.value||"",arr=obrigacoesTodas().filter(o=>!filtro||o.tipo===filtro).sort((a,b)=>String(a.vencimento||"").localeCompare(String(b.vencimento||"")));$("listaObrigacoes").innerHTML=arr.length?arr.map(o=>{const s=statusObrig(o),cl=s==="vencido"?"fleet-row-overdue":(diasAte(o.vencimento)??99)<=30&&!["pago","cancelado"].includes(s)?"fleet-row-due":"";return`<tr class="${cl}"><td>${esc(o.veiculo.placa||"—")}<br><small>${esc(veiculoNome(o.veiculo))}</small></td><td>${esc(tipoObrig(o.tipo))}</td><td>${esc(o.exercicio||o.auto||o.descricao||"—")}</td><td>${dataBr(o.vencimento)}</td><td>${moeda(o.valor)}</td><td><span class="fleet-badge ${classeStatusObrig(o)}">${esc(labelStatusObrig(o))}</span></td><td>${o.tipo==="multa"?`${esc(o.orgao||"")} ${o.pontos?`· ${esc(o.pontos)} pt(s)`:""}`:esc(o.descricao||"—")}</td><td>${podeObrig()&&s!=="pago"&&s!=="cancelado"?`<button class="btn-acao destaque" data-op="${o.veiculoId}|${o.id}" type="button">Marcar pago</button>`:"—"}</td></tr>`}).join(""):'<tr><td colspan="8" class="fleet-empty">Nenhuma obrigação cadastrada.</td></tr>';document.querySelectorAll("[data-op]").forEach(b=>b.addEventListener("click",()=>{const [vid,oid]=b.dataset.op.split("|");marcarObrigacaoPaga(vid,oid)}))}
function renderManutencoes(){const t=String($("buscaManut")?.value||"").toLowerCase(),arr=manutencoes.filter(m=>{const v=vById(m.veiculoId);return !t||[v?.placa,v?.modelo,m.descricao,m.oficina].some(x=>String(x||"").toLowerCase().includes(t))}).sort((a,b)=>String(a.dataPrevista||"9999").localeCompare(String(b.dataPrevista||"9999")));$("listaManutencoes").innerHTML=arr.length?arr.map(m=>{const v=vById(m.veiculoId),ven=manutVencida(m);return`<tr class="${ven?"fleet-row-overdue":""}"><td>${esc(v?.placa||"—")}<br><small>${esc(veiculoNome(v||{}))}</small></td><td>${esc(m.descricao||"—")}<br><small>${esc(m.tipo||"")} ${m.oficina?`· ${esc(m.oficina)}`:""}</small></td><td><span class="fleet-badge ${m.status==="concluida"?"ok":ven?"bad":"warn"}">${esc(m.status||"—")}</span></td><td>${m.dataPrevista?dataBr(m.dataPrevista):"—"}${m.kmPrevisto?`<br><small>${n(m.kmPrevisto).toLocaleString("pt-BR")} km</small>`:""}</td><td>${moeda(m.status==="concluida"?m.custoReal:m.custoPrevisto)}</td><td>${m.proximaData?dataBr(m.proximaData):"—"}${m.proximoKm?`<br><small>${n(m.proximoKm).toLocaleString("pt-BR")} km</small>`:""}</td><td>${podeManut()?`<button class="btn-acao destaque" data-me="${m.id}" type="button">Editar</button>`:"—"}</td></tr>`}).join(""):'<tr><td colspan="7" class="fleet-empty">Nenhuma manutenção cadastrada.</td></tr>';document.querySelectorAll("[data-me]").forEach(b=>b.addEventListener("click",()=>editarManutencao(b.dataset.me)))}
function renderTudo(){atualizarKpis();renderAlertas();renderSaude();renderResumoVeiculos();renderVeiculos();renderObrigacoes();renderManutencoes()}

async function carregarPlano(){if(!podeContabil()){plano=[];return}try{plano=await listarDocumentos("planoContasGerencial")}catch(e){console.warn("Plano de Contas indisponível para a Frota",e);plano=[]}}
function opcoesConta(filtro){const ano=new Date().getFullYear();return plano.filter(c=>contaAtivaNoExercicio(c,ano)&&contaAnalitica(c)&&filtro(c)).sort((a,b)=>String(a.codigo||"").localeCompare(String(b.codigo||""),"pt-BR")).map(c=>`<option value="${esc(c.id)}">${esc(c.codigo||"")} · ${esc(c.nome||"")}</option>`).join("")}
function preencherContas(){const des=!podeContabil();$("veiculoContaAtivo").innerHTML='<option value="">Pendente / selecionar...</option>'+opcoesConta(c=>raizConta(c)==="1"&&!contaRedutora(c));$("veiculoContaAcum").innerHTML='<option value="">Selecionar...</option>'+opcoesConta(c=>raizConta(c)==="1");$("veiculoContaDespesa").innerHTML='<option value="">Selecionar...</option>'+opcoesConta(c=>raizConta(c)==="4"&&!contaRedutora(c));["veiculoContaAtivo","veiculoContaAcum","veiculoContaDespesa","veiculoVidaUtil","veiculoDisponivel","veiculoIntegrarPlanejamento"].forEach(id=>{if($(id))$(id).disabled=des})}
function preencherVeiculoSelects(){const opts=veiculos.filter(v=>v.status!=="baixado").sort((a,b)=>String(a.placa||"").localeCompare(String(b.placa||""))).map(v=>`<option value="${esc(v.id)}">${esc(v.placa||"—")} · ${esc(veiculoNome(v))}</option>`).join("");["obrigVeiculo","manutVeiculo"].forEach(id=>{if($(id))$(id).innerHTML='<option value="">Selecione...</option>'+opts})}
async function carregar(){if(!podeVer())return;criarPagina();garantirMenu();busy=true;try{const [v,m]=await Promise.all([listarDocumentos("veiculos"),listarDocumentos("manutencoesFrota")]);veiculos=v;manutencoes=m;await carregarPlano();preencherContas();preencherVeiculoSelects();renderTudo()}catch(e){console.error(e);alert(mensagemErroDados(e,"a Gestão de Frota"))}finally{busy=false}}
function novoVeiculo(){if(!podeCadastrar())return alert("Seu perfil não pode cadastrar veículos.");if(!contextoOkGravacao())return alert("Selecione apenas uma empresa no cabeçalho para cadastrar o veículo.");editVeiculoId=null;$("formVeiculo")?.reset();$("veiculoVidaUtil").value=60;$("veiculoStatus").value="ativo";preencherEmpresaSelect($("veiculoEmpresa"),{valorAtual:empresaUnicaSelecionadaId()});preencherContas();$("tituloFormVeiculo").textContent="Novo veículo";$("formVeiculoBox").classList.remove("hidden");$("veiculoPlaca")?.focus();trocarTab("veiculos")}
function editarVeiculo(id){if(!podeEditar())return;const v=vById(id);if(!v)return;editVeiculoId=id;$("formVeiculo")?.reset();preencherEmpresaSelect($("veiculoEmpresa"),{valorAtual:v.empresaId});preencherContas();$("veiculoPlaca").value=v.placa||"";$("veiculoRenavam").value=v.renavam||"";$("veiculoMarca").value=v.marca||"";$("veiculoModelo").value=v.modelo||"";$("veiculoAno").value=v.anoModelo||"";$("veiculoStatus").value=v.status||"ativo";$("veiculoKm").value=n(v.quilometragemAtual);$("veiculoDataAquisicao").value=v.dataAquisicao||"";$("veiculoValorAquisicao").value=n(v.valorAquisicao);$("veiculoResponsavel").value=v.responsavel||"";$("veiculoCentro").value=v.centroCustoDescricao||"";$("veiculoContaAtivo").value=v.contaAtivoId||"";$("veiculoContaAcum").value=v.contaDepreciacaoAcumuladaId||"";$("veiculoContaDespesa").value=v.contaDepreciacaoId||"";$("veiculoVidaUtil").value=n(v.vidaUtilMeses)||60;$("veiculoDisponivel").value=v.dataDisponivelUso||v.dataAquisicao||"";$("veiculoIntegrarPlanejamento").checked=v.integrarPlanejamento===true;$("veiculoObs").value=v.observacoes||"";$("tituloFormVeiculo").textContent=`Editar ${v.placa||"veículo"}`;$("formVeiculoBox").classList.remove("hidden");trocarTab("veiculos");$("formVeiculoBox").scrollIntoView({behavior:"smooth",block:"start"})}
function dadosVeiculo(){const atual=editVeiculoId?vById(editVeiculoId):null;return{empresaId:$("veiculoEmpresa").value,placa:String($("veiculoPlaca").value||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,7),renavam:String($("veiculoRenavam").value||"").replace(/\D/g,"").slice(0,11),marca:$("veiculoMarca").value.trim(),modelo:$("veiculoModelo").value.trim(),anoModelo:Math.trunc(n($("veiculoAno").value))||null,status:$("veiculoStatus").value,quilometragemAtual:Math.trunc(n($("veiculoKm").value)),dataAquisicao:$("veiculoDataAquisicao").value||"",valorAquisicao:n($("veiculoValorAquisicao").value),responsavel:$("veiculoResponsavel").value.trim(),centroCustoDescricao:$("veiculoCentro").value.trim(),contaAtivoId:podeContabil()?$("veiculoContaAtivo").value:(atual?.contaAtivoId||""),contaDepreciacaoAcumuladaId:podeContabil()?$("veiculoContaAcum").value:(atual?.contaDepreciacaoAcumuladaId||""),contaDepreciacaoId:podeContabil()?$("veiculoContaDespesa").value:(atual?.contaDepreciacaoId||""),vidaUtilMeses:podeContabil()?Math.max(1,Math.trunc(n($("veiculoVidaUtil").value)||60)):(atual?.vidaUtilMeses||60),dataDisponivelUso:podeContabil()?($("veiculoDisponivel").value||""):(atual?.dataDisponivelUso||""),integrarPlanejamento:podeContabil()?$("veiculoIntegrarPlanejamento").checked:(atual?.integrarPlanejamento===true),observacoes:$("veiculoObs").value.trim(),obrigacoes:obrigacoes(atual),ultimaConsultaOficialEm:atual?.ultimaConsultaOficialEm||"",proximaConsultaOficialEm:atual?.proximaConsultaOficialEm||"",imobilizadoId:atual?.imobilizadoId||""}}
async function sincronizarImobilizado(veiculoId,d){if(!podeContabil()||!d.contaAtivoId||d.valorAquisicao<=0||!d.dataAquisicao)return "";const payload={descricao:`${d.placa} · ${[d.marca,d.modelo].filter(Boolean).join(" ")}`.trim(),categoria:"Veículos",status:d.status==="baixado"?"baixado":"em_operacao",dataAquisicao:d.dataAquisicao,dataDisponivelUso:d.dataDisponivelUso||d.dataAquisicao,dataBaixa:d.status==="baixado"?hojeIso():"",valorAquisicao:d.valorAquisicao,valorResidual:0,vidaUtilMeses:d.vidaUtilMeses||60,centroCustoId:"",contaAtivoId:d.contaAtivoId,contaDepreciacaoAcumuladaId:d.contaDepreciacaoAcumuladaId||"",contaDepreciacaoId:d.contaDepreciacaoId||"",integrarBalanco:true,integrarPlanejamento:d.integrarPlanejamento===true,observacoes:`Origem: Gestão de Frota · RENAVAM ${d.renavam||"—"} · vínculo automático por veículo.`,tipoInvestimento:"capex",origem:"frota",veiculoId};if(d.imobilizadoId){await atualizarDocumento("imobilizados",d.imobilizadoId,payload);return d.imobilizadoId}return await criarDocumento("imobilizados",{...payload,empresaId:d.empresaId})}
async function salvarVeiculo(e){e.preventDefault();if(busy)return;const d=dadosVeiculo();if(!d.empresaId)return msg($("msgVeiculo"),"Selecione a empresa.");if(d.placa.length!==7)return msg($("msgVeiculo"),"Informe uma placa válida com 7 caracteres.");if(d.renavam.length<9)return msg($("msgVeiculo"),"Informe o RENAVAM.");if(!d.modelo)return msg($("msgVeiculo"),"Informe o modelo.");if(veiculos.some(v=>v.id!==editVeiculoId&&v.empresaId===d.empresaId&&v.placa===d.placa))return msg($("msgVeiculo"),"Já existe veículo com esta placa na empresa.");try{busy=true;msg($("msgVeiculo"),"Salvando...");let id=editVeiculoId;if(id)await atualizarDocumento("veiculos",id,d);else id=await criarDocumento("veiculos",d);let imob=d.imobilizadoId||"";if(podeContabil()&&d.contaAtivoId){imob=await sincronizarImobilizado(id,d);if(imob!==d.imobilizadoId)await atualizarDocumento("veiculos",id,{imobilizadoId:imob})}msg($("msgVeiculo"),imob?"Veículo salvo e sincronizado com o Imobilizado.":"Veículo salvo. Vínculo patrimonial permanece pendente.",true);emitirAlteracao("frota");await carregar();setTimeout(()=>fechar("formVeiculoBox","formVeiculo","msgVeiculo"),650)}catch(err){console.error(err);msg($("msgVeiculo"),mensagemErroDados(err,"o veículo / Imobilizado"))}finally{busy=false}}
function novaObrigacao(veiculoId=""){if(!podeObrig())return alert("Seu perfil não pode gerir obrigações da frota.");$("formObrigacao")?.reset();preencherVeiculoSelects();if(veiculoId)$("obrigVeiculo").value=veiculoId;$("obrigStatus").value="aberto";$("formObrigacaoBox").classList.remove("hidden");trocarTab("obrigacoes");$("obrigVeiculo")?.focus()}
async function salvarObrigacao(e){e.preventDefault();const vid=$("obrigVeiculo").value,v=vById(vid);if(!v)return msg($("msgObrig"),"Selecione o veículo.");const o={id:(globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`),tipo:$("obrigTipo").value,exercicio:$("obrigExercicio").value.trim(),vencimento:$("obrigVencimento").value,valor:n($("obrigValor").value),status:$("obrigStatus").value,auto:$("obrigAuto").value.trim(),orgao:$("obrigOrgao").value.trim(),pontos:Math.trunc(n($("obrigPontos").value)),condutor:$("obrigCondutor").value.trim(),dataPagamento:$("obrigPagamento").value||"",descricao:$("obrigDescricao").value.trim(),criadoPor:uid(),criadoEm:new Date().toISOString(),atualizadoEm:new Date().toISOString()};if(!o.vencimento)return msg($("msgObrig"),"Informe o vencimento.");if(o.status==="pago"&&!o.dataPagamento)o.dataPagamento=hojeIso();try{await atualizarDocumento("veiculos",v.id,{obrigacoes:[...obrigacoes(v),o]});msg($("msgObrig"),"Obrigação registrada.",true);emitirAlteracao("frota");await carregar();setTimeout(()=>fechar("formObrigacaoBox","formObrigacao","msgObrig"),500)}catch(err){console.error(err);msg($("msgObrig"),mensagemErroDados(err,"as obrigações da frota"))}}
async function marcarObrigacaoPaga(vid,oid){const v=vById(vid);if(!v||!podeObrig())return;if(!confirm("Marcar esta obrigação como paga hoje?"))return;const arr=obrigacoes(v).map(o=>o.id===oid?{...o,status:"pago",dataPagamento:hojeIso(),atualizadoEm:new Date().toISOString(),atualizadoPor:uid()}:o);try{await atualizarDocumento("veiculos",vid,{obrigacoes:arr});emitirAlteracao("frota");await carregar()}catch(e){console.error(e);alert(mensagemErroDados(e,"a obrigação"))}}
async function registrarConsulta(vid){const v=vById(vid);if(!v)return;const d=new Date();d.setDate(d.getDate()+30);const proxima=d.toISOString().slice(0,10);try{await atualizarDocumento("veiculos",vid,{ultimaConsultaOficialEm:hojeIso(),proximaConsultaOficialEm:proxima});await carregar();window.open(SENATRAN_URL,"_blank","noopener")}catch(e){console.error(e);alert(mensagemErroDados(e,"o registro da consulta oficial"))}}
function novaManutencao(veiculoId=""){if(!podeManut())return alert("Seu perfil não pode registrar manutenção.");editManutId=null;$("formManut")?.reset();preencherVeiculoSelects();if(veiculoId)$("manutVeiculo").value=veiculoId;$("manutStatus").value="planejada";$("tituloFormManut").textContent="Nova manutenção";$("formManutBox").classList.remove("hidden");trocarTab("manutencoes")}
function editarManutencao(id){const m=manutencoes.find(x=>x.id===id);if(!m||!podeManut())return;editManutId=id;$("formManut")?.reset();preencherVeiculoSelects();$("manutVeiculo").value=m.veiculoId||"";$("manutTipo").value=m.tipo||"preventiva";$("manutStatus").value=m.status||"planejada";$("manutDescricao").value=m.descricao||"";$("manutOficina").value=m.oficina||"";$("manutPrevista").value=m.dataPrevista||"";$("manutKmPrevisto").value=n(m.kmPrevisto)||"";$("manutCustoPrev").value=n(m.custoPrevisto)||"";$("manutRealizada").value=m.dataRealizada||"";$("manutKmReal").value=n(m.kmRealizado)||"";$("manutCustoReal").value=n(m.custoReal)||"";$("manutProxima").value=m.proximaData||"";$("manutProximoKm").value=n(m.proximoKm)||"";$("manutObs").value=m.observacoes||"";$("tituloFormManut").textContent=`Editar manutenção · ${vById(m.veiculoId)?.placa||""}`;$("formManutBox").classList.remove("hidden");trocarTab("manutencoes")}
async function salvarManutencao(e){e.preventDefault();const vid=$("manutVeiculo").value,v=vById(vid);if(!v)return msg($("msgManut"),"Selecione o veículo.");const d={veiculoId:vid,veiculoPlaca:v.placa||"",tipo:$("manutTipo").value,status:$("manutStatus").value,descricao:$("manutDescricao").value.trim(),oficina:$("manutOficina").value.trim(),dataPrevista:$("manutPrevista").value||"",kmPrevisto:Math.trunc(n($("manutKmPrevisto").value)),custoPrevisto:n($("manutCustoPrev").value),dataRealizada:$("manutRealizada").value||"",kmRealizado:Math.trunc(n($("manutKmReal").value)),custoReal:n($("manutCustoReal").value),proximaData:$("manutProxima").value||"",proximoKm:Math.trunc(n($("manutProximoKm").value)),observacoes:$("manutObs").value.trim()};if(!d.descricao)return msg($("msgManut"),"Informe o serviço.");if(d.status==="concluida"&&!d.dataRealizada)d.dataRealizada=hojeIso();try{if(editManutId)await atualizarDocumento("manutencoesFrota",editManutId,d);else await criarDocumento("manutencoesFrota",{...d,empresaId:v.empresaId});if(d.status==="concluida"&&d.kmRealizado>n(v.quilometragemAtual))await atualizarDocumento("veiculos",v.id,{quilometragemAtual:d.kmRealizado});msg($("msgManut"),"Manutenção salva.",true);emitirAlteracao("frota");await carregar();setTimeout(()=>fechar("formManutBox","formManut","msgManut"),500)}catch(err){console.error(err);msg($("msgManut"),mensagemErroDados(err,"a manutenção"))}}

function bootstrap(){garantirCss();garantirMenu();criarPagina();const b=$("btnNovoVeiculo");if(b)b.classList.toggle("hidden",!podeCadastrar());$("btnNovaObrig")?.classList.toggle("hidden",!podeObrig());$("btnNovaManut")?.classList.toggle("hidden",!podeManut())}
bootstrap();
window.addEventListener("sig:ready",()=>{bootstrap();if(podeVer())carregar()});
window.addEventListener("sig:page",e=>{if(e.detail?.pagina==="frota"&&podeVer())carregar()});
window.addEventListener("sig:empresa-contexto",()=>{if(pagina()&&!pagina().classList.contains("hidden"))carregar()});

export { carregar };
