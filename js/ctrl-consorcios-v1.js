import { abrirPagina, admin } from "./core.js";
import {
  $, esc, msg, permite, listarDocumentos, criarDocumento, atualizarDocumento,
  empresaUnicaSelecionadaId, empresasSelecionadasIds, nomeEmpresa, moeda,
  dataBr, mensagemErroDados, emitirAlteracao
} from "./shared.js";
import { calcularConsorcio, statusConsorcioAtivo } from "./consortium-calculations.js";

let consorcios=[],editId=null,busy=false;
const pagina=()=>$("pagina-ctrl-consorcios-v1");
const n=v=>{const x=Number(v||0);return Number.isFinite(x)?x:0};
const podeVisualizar=()=>admin()||permite("controladoria","editar")||permite("controladoria","consorciosVisualizar")||permite("controladoria","consorciosEditar");
const podeEditar=()=>admin()||permite("controladoria","editar")||permite("controladoria","consorciosEditar");

const STATUS={
  ativo:["Ativo","cons-v1-status-ativo"],
  contemplado:["Contemplado","cons-v1-status-contemplado"],
  encerrado:["Encerrado","cons-v1-status-encerrado"],
  cancelado:["Cancelado","cons-v1-status-cancelado"]
};

const MODALIDADES={
  "":"—",
  sorteio:"Sorteio",
  lance_livre:"Lance livre",
  lance_fixo:"Lance fixo",
  outro:"Outro"
};

function contextoNovoOk(){return empresasSelecionadasIds().length===1&&!!empresaUnicaSelecionadaId()}
function pct(v){return `${n(v).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}%`}
function numero(v,d=0){return n(v).toLocaleString("pt-BR",{minimumFractionDigits:d,maximumFractionDigits:d})}
function textoStatus(status){return STATUS[status]?.[0]||status||"—"}
function badgeStatus(status){const [nome,classe]=STATUS[status]||[status||"—","cons-v1-status-neutro"];return `<span class="cons-v1-badge ${classe}">${esc(nome)}</span>`}
function calc(c){return calcularConsorcio(c)}

function criarPagina(){
  if(pagina())return;
  const main=document.querySelector("main.conteudo");
  if(!main)return;
  const s=document.createElement("section");
  s.id="pagina-ctrl-consorcios-v1";
  s.className="pagina hidden";
  s.innerHTML=`
    <div class="pagina-cabecalho">
      <div>
        <span class="eyebrow">CONTROLADORIA & FP&A</span>
        <h2>Consórcios</h2>
        <p>Gestão da carteira, contemplações, parcelas, taxas e saldo estimado dos planos.</p>
      </div>
      <div class="acoes-cabecalho">
        <button id="btnNovoConsorcioV1" class="btn-primario" type="button">Novo consórcio</button>
        <button id="btnAtualizarConsorcioV1" class="btn-secundario" type="button">Atualizar</button>
      </div>
    </div>

    <div class="modulo-aviso cons-v1-aviso">
      <strong>Gestão independente nesta versão:</strong> Consórcios não alimenta DRE, Balanço, Fluxo de Caixa ou Budget/Forecast. A taxa do consórcio é demonstrada separadamente de juros/encargos; consórcio não é tratado como financiamento tradicional e o campo de juros é opcional para contratos que efetivamente possuam esse custo.
    </div>

    <div class="cons-v1-kpis">
      <article class="cons-v1-kpi"><span>Consórcios ativos</span><strong id="consV1KpiAtivos">0</strong><small>Ativos + contemplados</small></article>
      <article class="cons-v1-kpi"><span>Contemplados</span><strong id="consV1KpiContemplados">0</strong><small>Na carteira exibida</small></article>
      <article class="cons-v1-kpi"><span>Crédito atual</span><strong id="consV1KpiCredito">R$ 0,00</strong><small>Somente planos ativos</small></article>
      <article class="cons-v1-kpi"><span>Parcela mensal</span><strong id="consV1KpiParcela">R$ 0,00</strong><small>Atual ou média estimada</small></article>
      <article class="cons-v1-kpi"><span>Saldo teórico</span><strong id="consV1KpiSaldo">R$ 0,00</strong><small>Carteira ativa</small></article>
    </div>

    <section id="formConsorcioV1Box" class="form-card hidden cons-v1-form">
      <div class="form-card-titulo">
        <div><h3 id="consV1Titulo">Novo consórcio</h3><p id="consV1Sub">—</p></div>
      </div>
      <form id="formConsorcioV1">
        <div class="cons-v1-bloco-titulo">Identificação</div>
        <div class="form-grid form-grid-3">
          <div class="campo campo-span-2"><label for="consV1Descricao">Descrição / identificação</label><input id="consV1Descricao" required placeholder="Ex.: Consórcio caminhão operação SP"></div>
          <div class="campo"><label for="consV1Administradora">Administradora</label><input id="consV1Administradora" required placeholder="Ex.: Rodobens"></div>
          <div class="campo"><label for="consV1Grupo">Grupo</label><input id="consV1Grupo"></div>
          <div class="campo"><label for="consV1Cota">Cota</label><input id="consV1Cota"></div>
          <div class="campo"><label for="consV1Categoria">Categoria</label><select id="consV1Categoria"><option value="veiculo">Veículo</option><option value="imovel">Imóvel</option><option value="equipamento">Equipamento</option><option value="servico">Serviço</option><option value="outro">Outro</option></select></div>
          <div class="campo"><label for="consV1Status">Status</label><select id="consV1Status"><option value="ativo">Ativo</option><option value="contemplado">Contemplado</option><option value="encerrado">Encerrado</option><option value="cancelado">Cancelado</option></select></div>
          <div class="campo"><label for="consV1DataInicio">Data de início</label><input id="consV1DataInicio" type="date"></div>
          <div class="campo"><label for="consV1DataFim">Fim previsto</label><input id="consV1DataFim" type="date"></div>
          <div class="campo"><label for="consV1ProximoVencimento">Próximo vencimento</label><input id="consV1ProximoVencimento" type="date"></div>
        </div>

        <div class="cons-v1-bloco-titulo">Crédito, prazo e parcelas</div>
        <div class="form-grid form-grid-3">
          <div class="campo"><label for="consV1CreditoContratado">Carta de crédito contratada</label><input id="consV1CreditoContratado" type="number" min="0" step="0.01" required></div>
          <div class="campo"><label for="consV1CreditoAtual">Carta de crédito atual</label><input id="consV1CreditoAtual" type="number" min="0" step="0.01"><small>Use o valor reajustado vigente. Se vazio, usa a carta contratada.</small></div>
          <div class="campo"><label for="consV1IndiceReajuste">Índice / critério de reajuste</label><input id="consV1IndiceReajuste" placeholder="Ex.: INCC, IPCA, preço do bem"></div>
          <div class="campo"><label for="consV1Prazo">Prazo total (meses)</label><input id="consV1Prazo" type="number" min="1" step="1" required></div>
          <div class="campo"><label for="consV1ParcelasPagas">Parcelas pagas</label><input id="consV1ParcelasPagas" type="number" min="0" step="1" value="0"></div>
          <div class="campo"><label for="consV1ParcelaAtual">Valor da parcela atual</label><input id="consV1ParcelaAtual" type="number" min="0" step="0.01"><small>Mantida separada da parcela média calculada.</small></div>
          <div class="campo"><label for="consV1ValorPago">Valor pago acumulado</label><input id="consV1ValorPago" type="number" min="0" step="0.01"><small>Inclua parcelas e lances já efetivamente pagos para um saldo teórico mais fiel.</small></div>
        </div>

        <div class="cons-v1-bloco-titulo">Taxas e custos</div>
        <div class="form-grid form-grid-4">
          <div class="campo"><label for="consV1TaxaAdm">Taxa de administração (%)</label><input id="consV1TaxaAdm" type="number" min="0" step="0.0001" value="0"></div>
          <div class="campo"><label for="consV1FundoReserva">Fundo de reserva (%)</label><input id="consV1FundoReserva" type="number" min="0" step="0.0001" value="0"></div>
          <div class="campo"><label for="consV1SeguroOutros">Seguro / outros (%)</label><input id="consV1SeguroOutros" type="number" min="0" step="0.0001" value="0"></div>
          <div class="campo"><label for="consV1Juros">Juros / encargos (%)</label><input id="consV1Juros" type="number" min="0" step="0.0001" value="0"><small>Opcional. Informe somente se existir no contrato.</small></div>
        </div>

        <div class="cons-v1-calculadora">
          <div><span>Taxa do consórcio</span><strong id="consV1CalcTaxa">—</strong><small id="consV1CalcTaxaPct">—</small></div>
          <div><span>Juros / encargos</span><strong id="consV1CalcJuros">—</strong><small id="consV1CalcJurosPct">—</small></div>
          <div><span>Total estimado do plano</span><strong id="consV1CalcTotal">—</strong><small>Carta atual + custos informados</small></div>
          <div><span>Parcela média estimada</span><strong id="consV1CalcParcela">—</strong><small id="consV1CalcParcelas">—</small></div>
          <div><span>Saldo teórico</span><strong id="consV1CalcSaldo">—</strong><small>Estimativa gerencial</small></div>
        </div>

        <div class="cons-v1-bloco-titulo">Contemplação</div>
        <div class="form-grid form-grid-3">
          <div class="campo"><label for="consV1DataContemplacao">Data da contemplação</label><input id="consV1DataContemplacao" type="date"></div>
          <div class="campo"><label for="consV1Modalidade">Modalidade</label><select id="consV1Modalidade"><option value="">Não informado</option><option value="sorteio">Sorteio</option><option value="lance_livre">Lance livre</option><option value="lance_fixo">Lance fixo</option><option value="outro">Outro</option></select></div>
          <div class="campo"><label for="consV1Lance">Valor do lance</label><input id="consV1Lance" type="number" min="0" step="0.01"></div>
          <div class="campo"><label for="consV1CreditoUtilizado">Crédito utilizado</label><input id="consV1CreditoUtilizado" type="number" min="0" step="0.01"></div>
          <div class="campo campo-span-2"><label for="consV1BemDestino">Bem / finalidade adquirida</label><input id="consV1BemDestino" placeholder="Ex.: Caminhão Volvo FH 540"></div>
          <div class="campo campo-span-3"><label for="consV1Observacoes">Observações</label><textarea id="consV1Observacoes" rows="3"></textarea></div>
        </div>

        <div class="form-acoes"><button id="btnCancelarConsorcioV1" class="btn-secundario" type="button">Cancelar</button><button class="btn-primario" type="submit">Salvar consórcio</button></div>
        <p id="mensagemConsorcioV1" class="mensagem-form"></p>
      </form>
    </section>

    <section class="lista-card">
      <div class="lista-cabecalho cons-v1-lista-cabecalho">
        <div><h3>Carteira de consórcios</h3><p id="consV1Contexto">—</p></div>
        <div class="cons-v1-filtros">
          <input id="consV1Busca" placeholder="Buscar administradora, grupo, cota ou bem...">
          <select id="consV1FiltroStatus"><option value="ativos">Ativos + contemplados</option><option value="todos">Todos</option><option value="ativo">Ativos</option><option value="contemplado">Contemplados</option><option value="encerrado">Encerrados</option><option value="cancelado">Cancelados</option></select>
        </div>
      </div>
      <div class="tabela-container"><table class="tabela cons-v1-table"><thead><tr><th>Consórcio</th><th>Status</th><th>Crédito atual</th><th>Parcela atual</th><th>Progresso</th><th>Taxa consórcio</th><th>Saldo teórico</th><th>Próx. vencimento</th><th>Ações</th></tr></thead><tbody id="listaConsorciosV1"></tbody></table></div>
    </section>`;
  main.appendChild(s);
  garantirCss();
  $("btnNovoConsorcioV1")?.addEventListener("click",novo);
  $("btnAtualizarConsorcioV1")?.addEventListener("click",carregar);
  $("btnCancelarConsorcioV1")?.addEventListener("click",fecharForm);
  $("formConsorcioV1")?.addEventListener("submit",salvar);
  $("consV1Busca")?.addEventListener("input",render);
  $("consV1FiltroStatus")?.addEventListener("change",render);
  ["consV1CreditoContratado","consV1CreditoAtual","consV1Prazo","consV1ParcelasPagas","consV1ParcelaAtual","consV1ValorPago","consV1TaxaAdm","consV1FundoReserva","consV1SeguroOutros","consV1Juros","consV1CreditoUtilizado"].forEach(id=>$(id)?.addEventListener("input",atualizarCalculadora));
}

function garantirCss(){
  if($("cons-v1-css"))return;
  const s=document.createElement("style");
  s.id="cons-v1-css";
  s.textContent=`
    .cons-v1-aviso{margin-bottom:12px}
    .cons-v1-kpis{display:grid;grid-template-columns:repeat(5,minmax(150px,1fr));gap:10px;margin:12px 0 16px}
    .cons-v1-kpi{border:1px solid #e4e7ec;border-radius:12px;padding:13px 14px;background:#fff;min-width:0}
    .cons-v1-kpi span{display:block;font-size:10px;color:#667085;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
    .cons-v1-kpi strong{display:block;margin-top:5px;font-size:18px;color:#101828;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .cons-v1-kpi small{display:block;margin-top:3px;color:#98a2b3;font-size:9px}
    .cons-v1-bloco-titulo{font-size:11px;font-weight:850;color:#344054;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #eaecf0;padding:14px 0 7px;margin-bottom:10px}
    .cons-v1-calculadora{display:grid;grid-template-columns:repeat(5,minmax(150px,1fr));gap:8px;margin:12px 0 4px;padding:10px;border-radius:12px;background:#f8fafc;border:1px solid #e4e7ec}
    .cons-v1-calculadora>div{padding:8px 9px;background:#fff;border-radius:9px;border:1px solid #eef1f4}
    .cons-v1-calculadora span{display:block;font-size:9px;color:#667085;font-weight:700}
    .cons-v1-calculadora strong{display:block;margin-top:4px;font-size:13px;color:#101828}
    .cons-v1-calculadora small{display:block;margin-top:2px;font-size:8px;color:#98a2b3}
    .cons-v1-lista-cabecalho{gap:12px;align-items:flex-end}
    .cons-v1-filtros{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
    .cons-v1-filtros input{min-width:280px}
    .cons-v1-table td:first-child{min-width:260px}
    .cons-v1-table td{vertical-align:middle}
    .cons-v1-table small{display:block;margin-top:2px;color:#667085;font-size:8px}
    .cons-v1-badge{display:inline-block;padding:3px 7px;border-radius:999px;font-size:8px;font-weight:800;white-space:nowrap}
    .cons-v1-status-ativo{background:#eaf5f3;color:#087a6f}
    .cons-v1-status-contemplado{background:#edf4ff;color:#175cd3}
    .cons-v1-status-encerrado{background:#f2f4f7;color:#475467}
    .cons-v1-status-cancelado{background:#fff0f0;color:#b42318}
    .cons-v1-status-neutro{background:#f2f4f7;color:#475467}
    .cons-v1-progresso{min-width:110px}
    .cons-v1-barra{height:5px;background:#eaecf0;border-radius:99px;overflow:hidden;margin-top:4px}
    .cons-v1-barra>i{display:block;height:100%;background:#0c9488;border-radius:99px}
    .cons-v1-actions{display:flex;gap:5px;flex-wrap:wrap}
    @media(max-width:1100px){.cons-v1-kpis,.cons-v1-calculadora{grid-template-columns:repeat(2,minmax(150px,1fr))}}
    @media(max-width:700px){.cons-v1-kpis,.cons-v1-calculadora{grid-template-columns:1fr}.cons-v1-filtros{width:100%;justify-content:stretch}.cons-v1-filtros input,.cons-v1-filtros select{width:100%;min-width:0}}
  `;
  document.head.appendChild(s);
}

function dadosForm(){
  return{
    descricao:$("consV1Descricao").value.trim(),
    administradora:$("consV1Administradora").value.trim(),
    grupo:$("consV1Grupo").value.trim(),
    cota:$("consV1Cota").value.trim(),
    categoria:$("consV1Categoria").value,
    status:$("consV1Status").value,
    dataInicio:$("consV1DataInicio").value||"",
    dataFimPrevista:$("consV1DataFim").value||"",
    proximoVencimento:$("consV1ProximoVencimento").value||"",
    creditoContratado:n($("consV1CreditoContratado").value),
    creditoAtual:n($("consV1CreditoAtual").value),
    indiceReajuste:$("consV1IndiceReajuste").value.trim(),
    prazoMeses:Math.trunc(n($("consV1Prazo").value)),
    parcelasPagas:Math.trunc(n($("consV1ParcelasPagas").value)),
    valorParcelaAtual:n($("consV1ParcelaAtual").value),
    valorPagoAcumulado:n($("consV1ValorPago").value),
    taxaAdministracaoPct:n($("consV1TaxaAdm").value),
    fundoReservaPct:n($("consV1FundoReserva").value),
    seguroOutrosPct:n($("consV1SeguroOutros").value),
    jurosEncargosPct:n($("consV1Juros").value),
    dataContemplacao:$("consV1DataContemplacao").value||"",
    modalidadeContemplacao:$("consV1Modalidade").value||"",
    lanceValor:n($("consV1Lance").value),
    creditoUtilizado:n($("consV1CreditoUtilizado").value),
    bemDestino:$("consV1BemDestino").value.trim(),
    observacoes:$("consV1Observacoes").value.trim(),
    versaoRegistro:"consorcios-v1"
  };
}

function atualizarCalculadora(){
  if(!$("consV1CalcTotal"))return;
  const r=calc(dadosForm());
  $("consV1CalcTaxa").textContent=moeda(r.taxaConsorcioValor);
  $("consV1CalcTaxaPct").textContent=`${pct(r.taxaConsorcioPct)} sobre a carta atual`;
  $("consV1CalcJuros").textContent=moeda(r.jurosEncargosValor);
  $("consV1CalcJurosPct").textContent=pct(r.jurosEncargosPct);
  $("consV1CalcTotal").textContent=moeda(r.totalEstimadoPlano);
  $("consV1CalcParcela").textContent=moeda(r.parcelaMediaEstimada);
  $("consV1CalcParcelas").textContent=`${r.parcelasRestantes} de ${r.prazoMeses} parcela(s) restantes`;
  $("consV1CalcSaldo").textContent=moeda(r.saldoTeorico);
}

function preencherForm(c=null){
  $("consV1Descricao").value=c?.descricao||"";
  $("consV1Administradora").value=c?.administradora||"";
  $("consV1Grupo").value=c?.grupo||"";
  $("consV1Cota").value=c?.cota||"";
  $("consV1Categoria").value=c?.categoria||"veiculo";
  $("consV1Status").value=c?.status||"ativo";
  $("consV1DataInicio").value=c?.dataInicio||"";
  $("consV1DataFim").value=c?.dataFimPrevista||"";
  $("consV1ProximoVencimento").value=c?.proximoVencimento||"";
  $("consV1CreditoContratado").value=n(c?.creditoContratado)||"";
  $("consV1CreditoAtual").value=n(c?.creditoAtual)||"";
  $("consV1IndiceReajuste").value=c?.indiceReajuste||"";
  $("consV1Prazo").value=Math.trunc(n(c?.prazoMeses))||"";
  $("consV1ParcelasPagas").value=Math.trunc(n(c?.parcelasPagas));
  $("consV1ParcelaAtual").value=n(c?.valorParcelaAtual)||"";
  $("consV1ValorPago").value=n(c?.valorPagoAcumulado)||"";
  $("consV1TaxaAdm").value=n(c?.taxaAdministracaoPct);
  $("consV1FundoReserva").value=n(c?.fundoReservaPct);
  $("consV1SeguroOutros").value=n(c?.seguroOutrosPct);
  $("consV1Juros").value=n(c?.jurosEncargosPct);
  $("consV1DataContemplacao").value=c?.dataContemplacao||"";
  $("consV1Modalidade").value=c?.modalidadeContemplacao||"";
  $("consV1Lance").value=n(c?.lanceValor)||"";
  $("consV1CreditoUtilizado").value=n(c?.creditoUtilizado)||"";
  $("consV1BemDestino").value=c?.bemDestino||"";
  $("consV1Observacoes").value=c?.observacoes||"";
  $("consV1Titulo").textContent=c?"Editar consórcio":"Novo consórcio";
  $("consV1Sub").textContent=c?`${c.administradora||"Administradora"} · Grupo ${c.grupo||"—"} · Cota ${c.cota||"—"}`:`${nomeEmpresa(empresaUnicaSelecionadaId())} · nova ficha`;
  msg($("mensagemConsorcioV1"),"");
  atualizarCalculadora();
  $("formConsorcioV1Box")?.classList.remove("hidden");
  setTimeout(()=>$("consV1Descricao")?.focus(),20);
}

function novo(){
  if(!podeEditar())return alert("Seu perfil não possui permissão para gerenciar consórcios.");
  if(!contextoNovoOk())return alert("Para cadastrar um consórcio, selecione apenas uma empresa no cabeçalho.");
  editId=null;
  preencherForm();
}

function editar(id){
  if(!podeEditar())return;
  const c=consorcios.find(x=>x.id===id);
  if(!c)return;
  editId=id;
  preencherForm(c);
}

function fecharForm(){editId=null;$("formConsorcioV1Box")?.classList.add("hidden");msg($("mensagemConsorcioV1"),"")}
function dataDepois(a,b){return a&&b&&String(a)>String(b)}

async function salvar(e){
  e.preventDefault();
  if(busy||!podeEditar())return;
  const d=dadosForm(),r=calc(d),m=$("mensagemConsorcioV1");
  if(!d.descricao)return msg(m,"Informe a descrição/identificação do consórcio.");
  if(!d.administradora)return msg(m,"Informe a administradora.");
  if(d.creditoContratado<=0)return msg(m,"A carta de crédito contratada deve ser maior que zero.");
  if(d.prazoMeses<=0)return msg(m,"Informe um prazo total válido.");
  if(d.parcelasPagas<0||d.parcelasPagas>d.prazoMeses)return msg(m,"Parcelas pagas deve ficar entre zero e o prazo total.");
  if([d.taxaAdministracaoPct,d.fundoReservaPct,d.seguroOutrosPct,d.jurosEncargosPct].some(x=>x<0))return msg(m,"Taxas e encargos não podem ser negativos.");
  if(dataDepois(d.dataInicio,d.dataFimPrevista))return msg(m,"A data de início não pode ser posterior ao fim previsto.");
  if(d.creditoUtilizado>r.creditoBase)return msg(m,"O crédito utilizado não pode ser maior que a carta de crédito atual.");
  if(d.status==="contemplado"&&!d.dataContemplacao)return msg(m,"Informe a data de contemplação para um consórcio contemplado.");
  if(!editId&&!contextoNovoOk())return msg(m,"Selecione apenas uma empresa no cabeçalho antes de cadastrar.");
  try{
    busy=true;msg(m,"Salvando...");
    if(editId)await atualizarDocumento("consorcios",editId,d);
    else await criarDocumento("consorcios",d);
    msg(m,"Consórcio salvo com sucesso.",true);
    emitirAlteracao("consorcios");
    await carregar();
    setTimeout(fecharForm,450);
  }catch(err){
    console.error(err);msg(m,mensagemErroDados(err,"Consórcios"));
  }finally{busy=false}
}

function filtroOk(c){
  const status=$("consV1FiltroStatus")?.value||"ativos";
  if(status==="ativos"&&!statusConsorcioAtivo(c.status))return false;
  if(!["ativos","todos"].includes(status)&&c.status!==status)return false;
  const q=String($("consV1Busca")?.value||"").trim().toLocaleLowerCase("pt-BR");
  if(!q)return true;
  return [c.descricao,c.administradora,c.grupo,c.cota,c.bemDestino,nomeEmpresa(c.empresaId)].some(v=>String(v||"").toLocaleLowerCase("pt-BR").includes(q));
}

function atualizarKpis(){
  const ativos=consorcios.filter(c=>statusConsorcioAtivo(c.status));
  const contemplados=consorcios.filter(c=>c.status==="contemplado");
  const credito=ativos.reduce((t,c)=>t+calc(c).creditoBase,0);
  const parcela=ativos.reduce((t,c)=>t+calc(c).parcelaReferencia,0);
  const saldo=ativos.reduce((t,c)=>t+calc(c).saldoTeorico,0);
  $("consV1KpiAtivos").textContent=String(ativos.length);
  $("consV1KpiContemplados").textContent=String(contemplados.length);
  $("consV1KpiCredito").textContent=moeda(credito);
  $("consV1KpiParcela").textContent=moeda(parcela);
  $("consV1KpiSaldo").textContent=moeda(saldo);
}

function render(){
  atualizarKpis();
  const lista=$("listaConsorciosV1");if(!lista)return;
  const arr=consorcios.filter(filtroOk).sort((a,b)=>{
    const sa=statusConsorcioAtivo(a.status)?0:1,sb=statusConsorcioAtivo(b.status)?0:1;
    return sa-sb||String(a.proximoVencimento||"9999-12-31").localeCompare(String(b.proximoVencimento||"9999-12-31"))||String(a.descricao||"").localeCompare(String(b.descricao||""),"pt-BR");
  });
  if(!arr.length){lista.innerHTML='<tr><td colspan="9">Nenhum consórcio encontrado para os filtros selecionados.</td></tr>';return}
  lista.innerHTML=arr.map(c=>{
    const r=calc(c),parcela=r.valorParcelaAtual>0?r.valorParcelaAtual:r.parcelaMediaEstimada;
    const complemento=[c.grupo?`Grupo ${c.grupo}`:"",c.cota?`Cota ${c.cota}`:"",c.empresaId?nomeEmpresa(c.empresaId):""].filter(Boolean).join(" · ");
    const contemplacao=c.status==="contemplado"&&c.dataContemplacao?`Contemplado em ${dataBr(c.dataContemplacao)}${c.modalidadeContemplacao?` · ${MODALIDADES[c.modalidadeContemplacao]||c.modalidadeContemplacao}`:""}`:"";
    return `<tr>
      <td><strong>${esc(c.descricao||"Consórcio")}</strong><small>${esc(c.administradora||"—")}${complemento?` · ${esc(complemento)}`:""}</small>${contemplacao?`<small>${esc(contemplacao)}</small>`:""}</td>
      <td>${badgeStatus(c.status)}</td>
      <td><strong>${moeda(r.creditoBase)}</strong><small>Contratada ${moeda(r.creditoContratado)}</small></td>
      <td><strong>${moeda(parcela)}</strong><small>${r.valorParcelaAtual>0?`Média estimada ${moeda(r.parcelaMediaEstimada)}`:"Parcela média estimada"}</small></td>
      <td><div class="cons-v1-progresso"><strong>${r.parcelasPagas}/${r.prazoMeses}</strong><small>${numero(r.percentualParcelasPagas,1)}% pago em parcelas</small><div class="cons-v1-barra"><i style="width:${Math.max(0,Math.min(100,r.percentualParcelasPagas))}%"></i></div></div></td>
      <td><strong>${pct(r.taxaConsorcioPct)}</strong><small>${moeda(r.taxaConsorcioValor)}${r.jurosEncargosPct>0?` · + ${pct(r.jurosEncargosPct)} encargos`:""}</small></td>
      <td><strong>${moeda(r.saldoTeorico)}</strong><small>${r.valorPagoAcumulado>0?`Pago acumulado ${moeda(r.valorPagoAcumulado)}`:`${r.parcelasRestantes} parcela(s) restantes`}</small></td>
      <td>${c.proximoVencimento?dataBr(c.proximoVencimento):"—"}${c.dataFimPrevista?`<small>Fim ${dataBr(c.dataFimPrevista)}</small>`:""}</td>
      <td>${podeEditar()?`<div class="cons-v1-actions"><button class="btn-acao destaque" type="button" data-cons-v1-edit="${esc(c.id)}">Editar</button></div>`:'<span class="acao-propria">Consulta</span>'}</td>
    </tr>`;
  }).join("");
  document.querySelectorAll("[data-cons-v1-edit]").forEach(b=>b.addEventListener("click",()=>editar(b.dataset.consV1Edit)));
}

function atualizarContexto(){
  const ids=empresasSelecionadasIds();
  if(!ids.length)$("consV1Contexto").textContent="Empresas acessíveis do perfil.";
  else if(ids.length===1)$("consV1Contexto").textContent=`${nomeEmpresa(ids[0])} · gestão independente`;
  else $("consV1Contexto").textContent=`${ids.length} empresas selecionadas · visão consolidada da carteira`;
  $("btnNovoConsorcioV1")?.classList.toggle("hidden",!podeEditar());
}

async function carregar(){
  criarPagina();
  if(!podeVisualizar())return;
  const lista=$("listaConsorciosV1");if(lista)lista.innerHTML='<tr><td colspan="9">Carregando consórcios...</td></tr>';
  try{
    consorcios=await listarDocumentos("consorcios");
    atualizarContexto();render();
  }catch(e){
    console.error(e);consorcios=[];atualizarKpis();
    if(lista)lista.innerHTML=`<tr><td colspan="9">${esc(mensagemErroDados(e,"Consórcios"))}</td></tr>`;
  }
}

export async function abrir(){
  criarPagina();
  if(!podeVisualizar())return alert("Seu perfil não possui permissão para visualizar consórcios.");
  abrirPagina("ctrl-consorcios-v1");
  const t=$("tituloPagina");if(t)t.textContent="Consórcios";
  atualizarContexto();
  await carregar();
}

window.addEventListener("sig:data-changed",e=>{if(e.detail?.modulo==="consorcios"&&!pagina()?.classList.contains("hidden"))carregar()});
